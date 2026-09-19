const mongoose=require('mongoose');
const {Order}=require('../models/commerce.model');
const {Inventory,Product}=require('../models/catalog.model');
const {AuditEvent}=require('../models/system.model');
const {Activity}=require('../models/communication.model');
const {badRequest,notFound,conflict}=require('../utils/errors');
const {releasePromo}=require('./promo.service');
const {adjustCouponAfterCancellation}=require('./coupon.service');

const transitions={
  confirmed:new Set(['packing','cancelled']),
  packing:new Set(['shipped','cancelled']),
  shipped:new Set(['delivered']),
  delivered:new Set(),
  cancelled:new Set(),
};

function overallStatus(parts){
  const statuses=parts.map(part=>part.status);
  if(statuses.every(status=>status==='cancelled'))return 'cancelled';
  if(statuses.every(status=>status==='delivered'))return 'delivered';
  if(statuses.every(status=>['delivered','cancelled'].includes(status)))return 'completed';
  if(statuses.some(status=>['shipped','delivered'].includes(status)))return 'shipped';
  if(statuses.some(status=>status==='packing'))return 'packing';
  return 'confirmed';
}

function removeCancelledAmount(order,part){
  const previousSubtotal=order.subtotalMinor||0,removed=part.subtotalMinor||0;
  if(!Number.isSafeInteger(previousSubtotal)||!Number.isSafeInteger(removed)||removed<0||removed>previousSubtotal)throw conflict('Order totals need finance review before cancellation.');
  const nextSubtotal=previousSubtotal-removed,previousDiscount=order.discountMinor||0;
  const currentPromo=Math.max(0,(order.promo?.usedMinor||0)-(order.promo?.refundedMinor||0)),currentCoupon=order.coupon?.discountMinor||0;
  const sourceAware=currentPromo+currentCoupon===previousDiscount;
  const nextPromo=sourceAware&&nextSubtotal?Number(BigInt(currentPromo)*BigInt(nextSubtotal)/BigInt(previousSubtotal)):0;
  const nextCoupon=sourceAware&&nextSubtotal?Number(BigInt(currentCoupon)*BigInt(nextSubtotal)/BigInt(previousSubtotal)):0;
  const nextDiscount=sourceAware?nextPromo+nextCoupon:(nextSubtotal&&previousSubtotal?Number(BigInt(previousDiscount)*BigInt(nextSubtotal)/BigInt(previousSubtotal)):0);
  const hasActive=order.sellerOrders.some(item=>item!==part&&item.status!=='cancelled');
  order.subtotalMinor=nextSubtotal;order.discountMinor=nextDiscount;
  if(!hasActive){order.deliveryMinor=0;order.feeMinor=0;}
  order.totalMinor=nextSubtotal-nextDiscount+(order.deliveryMinor||0)+(order.feeMinor||0);
  return {promoReleaseMinor:currentPromo-nextPromo,couponDiscountMinor:nextCoupon};
}

async function adjustInventory(order,sellerId,status,session){
  const lines=order.lines.filter(line=>String(line.seller)===String(sellerId));
  for(const line of lines){
    if(status==='cancelled'){
      const updated=await Inventory.updateOne({_id:line.inventory,reserved:{$gte:line.qty}},{$inc:{reserved:-line.qty}},{session});
      if(updated.modifiedCount!==1)throw conflict('Reserved stock changed. Reload and retry.');
    }
    if(status==='delivered'){
      const updated=await Inventory.updateOne({_id:line.inventory,reserved:{$gte:line.qty},stock:{$gte:line.qty}},{$inc:{reserved:-line.qty,stock:-line.qty}},{session});
      if(updated.modifiedCount!==1)throw conflict('Inventory changed. Reload and retry.');
      await Product.updateOne({_id:line.product},{$inc:{stock:-line.qty,soldUnits:line.qty}},{session});
    }
  }
}

async function transitionSellerOrder({orderId,sellerId,status,reason,actor,version}){
  return mongoose.connection.transaction(async session=>{
    const order=await Order.findById(orderId).session(session);
    if(!order)throw notFound('Order not found.');
    const part=order.sellerOrders.find(item=>String(item.seller)===String(sellerId));
    if(!part)throw notFound('Seller order not found.');
    if(version!==undefined&&part.version!==version)throw conflict('This order changed. Refresh before updating.');
    if(!transitions[part.status]?.has(status))throw badRequest(`Order cannot move from ${part.status} to ${status}.`);
    if(status==='cancelled'&&String(reason||'').trim().length<3)throw badRequest('A cancellation reason is required.');
    await adjustInventory(order,sellerId,status,session);
    if(status==='cancelled'){
      const adjustment=removeCancelledAmount(order,part);
      await releasePromo({order,amountMinor:adjustment.promoReleaseMinor,reference:`promo:order:${order._id}:seller:${sellerId}:cancel`,session});
      await adjustCouponAfterCancellation({order,nextDiscountMinor:adjustment.couponDiscountMinor,session});
    }
    part.status=status;part.version+=1;part.statusHistory.push({status,reason:String(reason||'').trim(),actor,at:new Date()});
    if(status==='packing')part.shipment.status='packing';
    if(status==='shipped')part.shipment.status='in_transit';
    if(status==='delivered')part.shipment.status='delivered';
    if(status==='cancelled')part.shipment.status='cancelled';
    order.status=overallStatus(order.sellerOrders);
    await order.save({session});
    await AuditEvent.create([{actor,action:`order.${status}`,target:String(order._id),reason:String(reason||'').trim()}],{session});
    await Activity.create([{user:order.user,category:'order',title:`Order ${status}`,body:status==='cancelled'?String(reason||'').trim():`Your order is now ${status}.`,target:{orderId:String(order._id),sellerId:String(sellerId),status}}],{session});
    return {order,part};
  });
}

async function updateShipment({orderId,sellerId,shipment,actor,version}){
  return mongoose.connection.transaction(async session=>{
    const order=await Order.findById(orderId).session(session);
    if(!order)throw notFound('Order not found.');
    const part=order.sellerOrders.find(item=>String(item.seller)===String(sellerId));
    if(!part)throw notFound('Seller order not found.');
    if(part.version!==version)throw conflict('This order changed. Refresh before updating.');
    if(!['packing','shipped'].includes(part.status))throw badRequest('Tracking can only be updated while an order is packing or shipped.');
    // Delivery must use the order transition, which also settles reserved stock.
    if(!['booked','picked_up','in_transit','failed','rto'].includes(shipment.status))throw badRequest('Confirm delivery through the order status action.');
    if(part.status==='shipped'&&shipment.status==='booked')throw badRequest('A shipped order cannot return to booked.');
    part.shipment={courier:shipment.courier,tracking:shipment.tracking,status:shipment.status};
    if(['picked_up','in_transit'].includes(shipment.status)&&part.status==='packing'){
      part.status='shipped';
      part.statusHistory.push({status:'shipped',reason:'Courier handover recorded.',actor,at:new Date()});
      order.status=overallStatus(order.sellerOrders);
    }
    part.version+=1;
    part.statusHistory.push({status:`shipment.${shipment.status}`,reason:`${shipment.courier}: ${shipment.tracking}`,actor,at:new Date()});
    await order.save({session});
    await AuditEvent.create([{actor,action:'shipment.update',target:String(order._id),metadata:{sellerId:String(sellerId),courier:shipment.courier,tracking:shipment.tracking,status:shipment.status}}],{session});
    await Activity.create([{user:order.user,category:'alert',title:'Shipment updated',body:`${shipment.courier}: ${shipment.status.replace('_',' ')}`,target:{orderId:String(order._id),sellerId:String(sellerId),tracking:shipment.tracking,status:shipment.status}}],{session});
    return {order,part};
  });
}

module.exports={overallStatus,transitionSellerOrder,updateShipment,removeCancelledAmount};
