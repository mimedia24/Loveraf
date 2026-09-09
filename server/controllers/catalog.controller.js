const {Seller}=require('../models/account.model');
const {Media,Product,Inventory}=require('../models/catalog.model');
const {AuditEvent,Content,Feature}=require('../models/system.model');
const serialize=require('../utils/serializers');
const {badRequest,forbidden,notFound,conflict}=require('../utils/errors');
const {providerCapabilities}=require('../config/environment');

class CatalogController{
  constructor(authService){this.authService=authService;}
  features=async(_req,res)=>{const rows=await Feature.find().lean();const data=Object.fromEntries(rows.map(row=>[row.key,row.enabled]));res.json({account:true,catalog:true,cart:true,commerce:true,chat:true,...data,...providerCapabilities()});};
  list=async(req,res)=>{const limit=Math.min(100,Math.max(1,Number(req.query.limit)||40)),offset=Math.max(0,Number(req.query.offset)||0);const filter={status:'approved'};
    if(req.query.category)filter.category=String(req.query.category);if(req.query.sellerId)filter.seller=req.query.sellerId;if(req.query.query)filter.$text={$search:String(req.query.query)};
    const sellers=await Seller.find({status:'approved'}).distinct('_id');filter.seller={$in:req.query.sellerId?[req.query.sellerId]:sellers};
    const rows=await Product.find(filter).sort({createdAt:-1,_id:1}).skip(offset).limit(limit+1);res.json({items:rows.slice(0,limit).map(serialize.product),nextOffset:rows.length>limit?offset+limit:null});};
  detail=async(req,res)=>{const product=await Product.findOne({_id:req.params.id,status:'approved'});if(!product||!await Seller.exists({_id:product.seller,status:'approved'}))throw notFound('Product is no longer available.');res.json(serialize.product(product));};
  sellers=async(req,res)=>res.json((await Seller.find({user:req.auth.user._id}).sort({createdAt:1})).map(serialize.seller));
  createSeller=async(req,res)=>{this.authService.requireVerified(req.auth.user);const seller=await Seller.create({user:req.auth.user._id,...req.validated.body});await AuditEvent.create({actor:req.auth.user._id,action:'seller.submit',target:String(seller._id)});res.status(201).json(serialize.seller(seller));};
  sellerProducts=async(req,res)=>res.json((await Product.find({seller:req.seller._id}).sort({createdAt:-1})).map(serialize.product));
  publish=async(req,res)=>{if(req.seller.status!=='approved')throw forbidden('Seller approval is required.');const input=req.validated.body;
    const imageIds=[...new Set(input.images.map(image=>image.id))];const media=await Media.find({_id:{$in:imageIds},owner:req.auth.user._id});if(media.length!==imageIds.length)throw badRequest('Images must belong to this account.');
    const map=new Map(media.map(item=>[String(item._id),item.uri]));const product=await Product.create({seller:req.seller._id,...input,images:input.images.map(image=>({mediaId:image.id,uri:map.get(image.id)})),priceMinor:Math.round(input.price*100),oldPriceMinor:input.oldPrice?Math.round(input.oldPrice*100):undefined,status:'pending'});
    await Inventory.insertMany(input.variants.flatMap(variant=>input.sizes.map(size=>({product:product._id,color:variant.name,size,stock:input.stock}))));await AuditEvent.create({actor:req.auth.user._id,action:'product.submit',target:String(product._id)});res.status(201).json(serialize.product(product));};
  content=async(req,res)=>{const item=await Content.findOne({key:req.params.key}).lean();res.json({key:req.params.key,data:item?.data||[]});};
  upload=async(req,res)=>{if(!req.file)throw badRequest('Select an image.');const b=req.file.buffer;const detected=b[0]===0xff&&b[1]===0xd8?'image/jpeg':b[0]===0x89&&b.slice(1,4).toString()==='PNG'?'image/png':b.slice(0,4).toString()==='RIFF'&&b.slice(8,12).toString()==='WEBP'?'image/webp':'';if(!detected||req.file.size>8*1024*1024)throw badRequest('Use a valid JPG, PNG or WebP image up to 8 MB.');req.file.mimetype=detected;
    const media=await this.uploadMedia(req.auth.user,req.file);const uri=media.uri.startsWith('/')?`${req.protocol}://${req.get('host')}${media.uri}`:media.uri;if(uri!==media.uri){media.uri=uri;await media.save();}res.status(201).json({id:String(media._id),uri});};
}
module.exports=CatalogController;
