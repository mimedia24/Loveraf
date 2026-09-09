const crypto=require('node:crypto');
const mongoose=require('mongoose');
const {CartLine,Order,MutationKey}=require('../models/commerce.model');
const {Product,Inventory}=require('../models/catalog.model');
const {Seller,Address}=require('../models/account.model');
const serialize=require('../utils/serializers');
const {badRequest,notFound,conflict}=require('../utils/errors');
const hash=value=>crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');

async function idempotent(user,key,input,action){
  if(!/^[0-9a-f-]{36}$/i.test(key||''))throw badRequest('A valid Idempotency-Key header is required.');const requestHash=hash(input);
  const previous=await MutationKey.findOne({user,key}).lean();if(previous){if(previous.requestHash!==requestHash)throw conflict('Request key reused with different data.');return previous.response;}
  try{return await mongoose.connection.transaction(async session=>{const inside=await MutationKey.findOne({user,key}).session(session).lean();if(inside){if(inside.requestHash!==requestHash)throw conflict('Request key reused with different data.');return inside.response;}const response=await action(session);await MutationKey.create([{user,key,requestHash,response,expiresAt:new Date(Date.now()+7*86400000)}],{session});return response;});}
  catch(error){if(error?.code===11000){const saved=await MutationKey.findOne({user,key}).lean();if(saved?.requestHash===requestHash)return saved.response;}throw error;}
}
class CommerceController{
  cart=async(req,res)=>{const rows=await CartLine.find({user:req.auth.user._id}).populate('product');res.json(rows.filter(row=>row.product).map(row=>({...serialize.product(row.product),lineId:String(row._id),productId:String(row.product._id),qty:row.qty,selectedColor:row.color,selectedSize:row.size})));};
  addCart=async(req,res)=>{const input=req.validated.body,response=await idempotent(req.auth.user._id,req.get('Idempotency-Key'),input,async session=>{const product=await Product.findOne({_id:input.productId,status:'approved'}).session(session);if(!product||!await Seller.exists({_id:product.seller,status:'approved'}).session(session))throw notFound('Product unavailable.');const inventory=await Inventory.findOne({product:product._id,color:input.color,size:input.size}).session(session);if(!inventory)throw badRequest('Select an available size and color.');const line=await CartLine.findOne({user:req.auth.user._id,product:product._id,color:input.color,size:input.size}).session(session);const qty=(line?.qty||0)+input.qty;if(qty>inventory.stock-inventory.reserved)throw badRequest('Requested quantity exceeds available stock.');if(line){line.qty=qty;await line.save({session});}else await CartLine.create([{user:req.auth.user._id,product:product._id,color:input.color,size:input.size,qty}],{session});return {ok:true};});res.status(201).json(response);};
  setCart=async(req,res)=>{const qty=Number(req.body.qty);if(!Number.isInteger(qty)||qty<1||qty>999)throw badRequest('Quantity must be between 1 and 999.');const line=await CartLine.findOne({_id:req.params.id,user:req.auth.user._id});if(!line)throw notFound();const inventory=await Inventory.findOne({product:line.product,color:line.color,size:line.size});if(!inventory||qty>inventory.stock-inventory.reserved)throw badRequest('Insufficient stock.');line.qty=qty;await line.save();res.json({ok:true});};
  removeCart=async(req,res)=>{await CartLine.deleteOne({_id:req.params.id,user:req.auth.user._id});res.json({ok:true});};
  selectedLines=async(user,input,session)=>{if(input.buyNow){const product=await Product.findOne({_id:input.buyNow.productId,status:'approved'}).session(session||null);if(!product||!await Seller.exists({_id:product.seller,status:'approved'}).session(session||null))return [];const inventory=await Inventory.findOne({product:product._id,color:input.buyNow.color,size:input.buyNow.size}).session(session||null);return inventory?[{product,inventory,color:input.buyNow.color,size:input.buyNow.size,qty:input.buyNow.qty}]:[];}
    const cart=await CartLine.find({user}).session(session||null);const result=[];for(const line of cart){const product=await Product.findOne({_id:line.product,status:'approved'}).session(session||null);if(!product||!await Seller.exists({_id:product.seller,status:'approved'}).session(session||null))continue;const inventory=await Inventory.findOne({product:line.product,color:line.color,size:line.size}).session(session||null);if(inventory)result.push({lineId:line._id,product,inventory,color:line.color,size:line.size,qty:line.qty});}return result;};
  quote=async(req,res)=>{const input=req.validated.body,address=await Address.findOne({_id:input.addressId,user:req.auth.user._id});if(!address)throw notFound('Select a valid delivery address.');const lines=await this.selectedLines(req.auth.user._id,input);if(!lines.length)throw badRequest('Your cart is empty or unavailable.');if(lines.some(line=>line.qty>line.inventory.stock-line.inventory.reserved))throw conflict('A selected item is out of stock.');const subtotalMinor=lines.reduce((sum,line)=>sum+line.product.priceMinor*line.qty,0);res.status(201).json({addressId:input.addressId,paymentMethod:input.paymentMethod,items:lines.map(line=>({lineId:line.lineId?String(line.lineId):null,productId:String(line.product._id),title:line.product.title,color:line.color,size:line.size,qty:line.qty,unitMinor:line.product.priceMinor})),currency:'BDT',subtotalMinor,discountMinor:0,deliveryMinor:0,feeMinor:0,totalMinor:subtotalMinor});};
  createOrder=async(req,res)=>{
    const input=req.validated.body;if(input.paymentMethod!=='cod')throw badRequest('Online payment is not available yet.');
    const response=await idempotent(req.auth.user._id,req.get('Idempotency-Key'),input,async session=>{
      const address=await Address.findOne({_id:input.addressId,user:req.auth.user._id}).session(session);if(!address)throw notFound('Delivery address not found.');
      const lines=await this.selectedLines(req.auth.user._id,input,session);if(!lines.length)throw badRequest('Your cart is empty or unavailable.');
      for(const line of lines){const updated=await Inventory.findOneAndUpdate({_id:line.inventory._id,$expr:{$gte:[{$subtract:['$stock','$reserved']},line.qty]}},{$inc:{reserved:line.qty}},{new:true,session});if(!updated)throw conflict('An item is out of stock. Review your selection.');}
      const subtotalMinor=lines.reduce((sum,line)=>sum+line.product.priceMinor*line.qty,0),sellerIds=[...new Set(lines.map(line=>String(line.product.seller)))];
      const documents=await Order.create([{
        user:req.auth.user._id,subtotalMinor,totalMinor:subtotalMinor,address:address.toObject(),paymentMethod:input.paymentMethod,payment:{provider:'cash',status:'pending'},
        lines:lines.map(line=>({seller:line.product.seller,product:line.product._id,inventory:line.inventory._id,title:line.product.title,image:line.product.images?.[0]?.uri,color:line.color,size:line.size,qty:line.qty,unitMinor:line.product.priceMinor})),
        sellerOrders:sellerIds.map(seller=>({seller,status:'confirmed',subtotalMinor:lines.filter(line=>String(line.product.seller)===seller).reduce((sum,line)=>sum+line.product.priceMinor*line.qty,0),shipment:{status:'unbooked'}}))
      }],{session});
      const order=documents[0];if(!input.buyNow)await CartLine.deleteMany({user:req.auth.user._id}).session(session);return {id:String(order._id),status:order.status,totalMinor:order.totalMinor,currency:'BDT'};
    });
    res.status(201).json(response);
  };
  orders=async(req,res)=>res.json((await Order.find({user:req.auth.user._id}).sort({createdAt:-1})).map(order=>({id:String(order._id),status:order.status,currency:order.currency,total_minor:order.totalMinor,address:order.address,payment_method:order.paymentMethod,created_at:order.createdAt})));
  detail=async(req,res)=>{const order=await Order.findOne({_id:req.params.id,user:req.auth.user._id});if(!order)throw notFound();res.json({...order.toObject(),id:String(order._id),total_minor:order.totalMinor,created_at:order.createdAt});};
  cancel=async(req,res)=>{await mongoose.connection.transaction(async session=>{const order=await Order.findOne({_id:req.params.id,user:req.auth.user._id,status:{$in:['confirmed','pending']}}).session(session);if(!order)throw badRequest('This order cannot be cancelled.');for(const line of order.lines)await Inventory.updateOne({_id:line.inventory},{$inc:{reserved:-line.qty}},{session});order.status='cancelled';order.sellerOrders.forEach(item=>item.status='cancelled');await order.save({session});});res.status(201).json({ok:true});};
  sellerOrders=async(req,res)=>{const seller=await Seller.findOne({_id:req.params.id,user:req.auth.user._id});if(!seller)throw notFound();const orders=await Order.find({'sellerOrders.seller':seller._id}).sort({createdAt:-1});res.json(orders.map(order=>({...order.toObject(),id:String(order._id)})));};
}
module.exports=CommerceController;
