const {Feature,AuditEvent}=require('../models/system.model');
const {Coupon,CouponRedemption,CouponUsage}=require('../models/marketing.model');
const {AppError,badRequest,conflict,notFound}=require('../utils/errors');

const normalizeCode=value=>String(value||'').trim().toUpperCase();
const json=item=>({id:String(item._id),code:item.code,name:item.name,description:item.description||'',discountType:item.discountType,discountValue:item.discountValue,minimumOrderMinor:item.minimumOrderMinor||0,maximumDiscountMinor:item.maximumDiscountMinor,startsAt:item.startsAt,endAt:item.endAt,totalLimit:item.totalLimit,perUserLimit:item.perUserLimit,redemptionCount:item.redemptionCount||0,enabled:item.enabled,version:item.version,createdAt:item.createdAt,updatedAt:item.updatedAt});

async function couponsAvailable(){return Boolean(await Feature.exists({key:'coupons',enabled:true}));}
async function requireCoupons(){if(!await couponsAvailable())throw new AppError(503,'PROVIDER_UNAVAILABLE','Coupons are not available yet.');}

function discountFor(coupon,subtotalMinor){
  let amount=coupon.discountType==='percent'?Math.floor(subtotalMinor*coupon.discountValue/100):coupon.discountValue;
  if(coupon.maximumDiscountMinor)amount=Math.min(amount,coupon.maximumDiscountMinor);
  return Math.min(subtotalMinor,amount);
}

async function eligibleCoupon({owner,code,subtotalMinor,session}){
  await requireCoupons();
  const now=new Date(),coupon=await Coupon.findOne({code:normalizeCode(code),enabled:true,startsAt:{$lte:now},endAt:{$gt:now}}).session(session||null);
  if(!coupon)throw badRequest('This coupon is invalid or inactive.');
  if(subtotalMinor<(coupon.minimumOrderMinor||0))throw badRequest('Your order does not meet this coupon minimum.');
  if(coupon.redemptionCount>=coupon.totalLimit)throw badRequest('This coupon has reached its usage limit.');
  const usage=await CouponUsage.findOne({coupon:coupon._id,user:owner}).session(session||null).lean();
  if((usage?.count||0)>=coupon.perUserLimit)throw badRequest('You have already used this coupon the maximum number of times.');
  const discountMinor=discountFor(coupon,subtotalMinor);
  if(discountMinor<1)throw badRequest('This coupon cannot discount the selected order.');
  return {coupon,discountMinor};
}

async function couponPricing({owner,code,subtotalMinor,session}){
  if(!code)return {coupon:null,discountMinor:0};
  return eligibleCoupon({owner,code,subtotalMinor,session});
}

async function consumeCoupon({owner,coupon,order,discountMinor,session}){
  if(!coupon||!discountMinor)return;
  const usage=await CouponUsage.findOneAndUpdate({coupon:coupon._id,user:owner},{$setOnInsert:{coupon:coupon._id,user:owner,count:0}},{upsert:true,new:true,session});
  const usageResult=await CouponUsage.updateOne({_id:usage._id,count:{$lt:coupon.perUserLimit}},{$inc:{count:1}},{session});
  if(usageResult.modifiedCount!==1)throw conflict('This coupon usage limit changed. Refresh checkout.');
  const couponResult=await Coupon.updateOne({_id:coupon._id,enabled:true,redemptionCount:{$lt:coupon.totalLimit},startsAt:{$lte:new Date()},endAt:{$gt:new Date()}},{$inc:{redemptionCount:1}},{session});
  if(couponResult.modifiedCount!==1)throw conflict('This coupon is no longer available. Refresh checkout.');
  await CouponRedemption.create([{coupon:coupon._id,user:owner,order:order._id,discountMinor,status:'applied'}],{session});
  order.coupon={coupon:coupon._id,code:coupon.code,discountMinor};
  await order.save({session});
}

async function releaseCoupon({order,session}){
  if(!order.coupon?.coupon)return false;
  const redemption=await CouponRedemption.findOneAndUpdate({coupon:order.coupon.coupon,order:order._id,status:'applied'},{$set:{status:'reversed',reversedAt:new Date()}},{new:true,session});
  if(!redemption)return false;
  const [couponResult,usageResult]=await Promise.all([
    Coupon.updateOne({_id:redemption.coupon,redemptionCount:{$gte:1}},{$inc:{redemptionCount:-1}},{session}),
    CouponUsage.updateOne({coupon:redemption.coupon,user:redemption.user,count:{$gte:1}},{$inc:{count:-1}},{session}),
  ]);
  if(couponResult.modifiedCount!==1||usageResult.modifiedCount!==1)throw conflict('Coupon reconciliation needs review.');
  return true;
}

async function adjustCouponAfterCancellation({order,nextDiscountMinor,session}){
  if(!order.coupon?.coupon)return false;
  if(nextDiscountMinor===0)return releaseCoupon({order,session});
  const redemption=await CouponRedemption.findOneAndUpdate({coupon:order.coupon.coupon,order:order._id,status:'applied'},{$set:{discountMinor:nextDiscountMinor}},{new:true,session});
  if(!redemption)throw conflict('Coupon redemption changed. Reload and retry.');
  order.coupon.discountMinor=nextDiscountMinor;
  return true;
}

async function listPublicCoupons(){
  await requireCoupons();const now=new Date();
  return (await Coupon.find({enabled:true,startsAt:{$lte:now},endAt:{$gt:now},$expr:{$lt:['$redemptionCount','$totalLimit']}}).sort({endAt:1,_id:1}).limit(100).lean()).map(json);
}

async function listAdminCoupons(query={}){
  const limit=Math.min(100,Math.max(1,Number(query.limit)||50)),offset=Math.max(0,Number(query.offset)||0);
  const rows=await Coupon.find().sort({createdAt:-1,_id:-1}).skip(offset).limit(limit+1).lean(),items=rows.slice(0,limit).map(json);
  return query.paginated==='true'?{items,nextOffset:rows.length>limit?offset+limit:null}:items;
}

async function saveCoupon({id,input,actor}){
  const {reason,version,...values}=input;
  const startsAt=new Date(values.startsAt),endAt=new Date(values.endAt);
  if(endAt<=startsAt)throw badRequest('Coupon end date must be after its start date.');
  if(values.discountType==='percent'&&values.discountValue>100)throw badRequest('Percentage discount cannot exceed 100%.');
  if(values.discountType==='fixed'&&values.maximumDiscountMinor)throw badRequest('Fixed coupons do not need a maximum discount.');
  if(id){
    const current=await Coupon.findById(id);if(!current)throw notFound();if(current.version!==version)throw conflict('This coupon changed. Reload first.');
    const updated=await Coupon.findOneAndUpdate({_id:id,version},{$set:{...values,startsAt,endAt,code:normalizeCode(values.code),updatedBy:actor},$inc:{version:1}},{new:true,runValidators:true});
    if(!updated)throw conflict('This coupon changed. Reload first.');
    await AuditEvent.create({actor,action:'coupon.update',target:String(updated._id),reason,metadata:{code:updated.code,enabled:updated.enabled}});return json(updated);
  }
  const created=await Coupon.create({...values,startsAt,endAt,code:normalizeCode(values.code),createdBy:actor,updatedBy:actor});
  await AuditEvent.create({actor,action:'coupon.create',target:String(created._id),reason,metadata:{code:created.code,enabled:created.enabled}});return json(created);
}

module.exports={json,couponsAvailable,couponPricing,consumeCoupon,releaseCoupon,adjustCouponAfterCancellation,listPublicCoupons,listAdminCoupons,saveCoupon,discountFor};
