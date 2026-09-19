const {test}=require('node:test');
const assert=require('node:assert/strict');
const mongoose=require('mongoose');
const {MongoMemoryReplSet}=require('mongodb-memory-server');
const {Coupon,CouponRedemption,CouponUsage}=require('../models/marketing.model');
const {Feature,AuditEvent}=require('../models/system.model');
const {Order}=require('../models/commerce.model');
const {couponPricing,consumeCoupon,releaseCoupon,saveCoupon}=require('../services/coupon.service');

test('coupons enforce dates, totals, per-user concurrency and cancellation reuse',async()=>{
  const replica=await MongoMemoryReplSet.create({replSet:{count:1}});
  try{
    await mongoose.connect(replica.getUri('coupon_test'));
    await Promise.all([Coupon.init(),CouponRedemption.init(),CouponUsage.init(),Order.init()]);
    const owner=new mongoose.Types.ObjectId(),now=Date.now();
    await assert.rejects(couponPricing({owner,code:'SAVE10',subtotalMinor:10000}),error=>error.status===503);
    await Feature.create({key:'coupons',enabled:true});
    const coupon=await Coupon.create({code:'save10',name:'Save ten',discountType:'percent',discountValue:10,maximumDiscountMinor:2000,minimumOrderMinor:5000,startsAt:new Date(now-1000),endAt:new Date(now+86400000),totalLimit:2,perUserLimit:1,enabled:true});
    assert.equal((await couponPricing({owner,code:'save10',subtotalMinor:50000})).discountMinor,2000);
    await assert.rejects(couponPricing({owner,code:'save10',subtotalMinor:4999}),/minimum/);
    const makeOrder=()=>Order.create({user:owner,subtotalMinor:10000,discountMinor:1000,totalMinor:9000,paymentMethod:'cod',sellerOrders:[],lines:[]});
    const [first,second]=await Promise.all([makeOrder(),makeOrder()]);
    const apply=order=>mongoose.connection.transaction(async session=>{
      const offer=await couponPricing({owner,code:'SAVE10',subtotalMinor:10000,session});
      const lockedOrder=await Order.findById(order._id).session(session);
      await consumeCoupon({owner,coupon:offer.coupon,order:lockedOrder,discountMinor:offer.discountMinor,session});
    });
    const concurrent=await Promise.allSettled([apply(first),apply(second)]);
    assert.equal(concurrent.filter(item=>item.status==='fulfilled').length,1);
    assert.equal((await Coupon.findById(coupon.id)).redemptionCount,1);
    assert.equal((await CouponUsage.findOne({coupon:coupon._id,user:owner})).count,1);
    const applied=await CouponRedemption.findOne({status:'applied'});
    const usedOrder=await Order.findById(applied.order);
    await mongoose.connection.transaction(session=>releaseCoupon({order:usedOrder,session}));
    assert.equal((await Coupon.findById(coupon.id)).redemptionCount,0);
    assert.equal((await CouponUsage.findOne({coupon:coupon._id,user:owner})).count,0);
    assert.equal((await CouponRedemption.findById(applied.id)).status,'reversed');
    const remaining=String(first.id)===String(usedOrder.id)?second:first;
    await apply(remaining);
    assert.equal(await CouponRedemption.countDocuments({status:'applied'}),1);
    const actor=new mongoose.Types.ObjectId();
    const created=await saveCoupon({actor,input:{code:'flat100',name:'Flat discount',description:'Admin controlled',discountType:'fixed',discountValue:10000,minimumOrderMinor:50000,startsAt:new Date(now-1000).toISOString(),endAt:new Date(now+86400000).toISOString(),totalLimit:10,perUserLimit:1,enabled:false,reason:'Finance approved campaign'}});
    assert.equal(created.code,'FLAT100');assert.equal(await AuditEvent.countDocuments({target:created.id,action:'coupon.create'}),1);
    await assert.rejects(saveCoupon({id:created.id,actor,input:{...created,enabled:true,version:99,reason:'Stale update attempt'}}),error=>error.code==='CONFLICT');
  }finally{await mongoose.disconnect();await replica.stop();}
});
