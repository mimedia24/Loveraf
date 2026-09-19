const {test}=require('node:test');
const assert=require('node:assert/strict');
const mongoose=require('mongoose');
const {MongoMemoryReplSet}=require('mongodb-memory-server');

test('promo discount is rule-bounded, concurrent-safe and restored on cancellation',async()=>{
  process.env.NODE_ENV='test';
  process.env.JWT_ACCESS_SECRET='promo-test-access-secret-with-at-least-32-characters';
  process.env.OTP_HMAC_SECRET='promo-test-otp-secret-with-at-least-32-characters';
  process.env.JWT_ISSUER='loveraf-promo-test';
  const replica=await MongoMemoryReplSet.create({replSet:{count:1}});
  process.env.MONGODB_URI=replica.getUri('loveraf_promo_test');
  const {connectDatabase,disconnectDatabase}=require('../config/database');
  await connectDatabase();
  try{
    const {Feature,BusinessRule,LedgerAccount,LedgerEntry}=require('../models/system.model');
    const {Order}=require('../models/commerce.model');
    const {promoPricing,consumePromo,releasePromo,aggregateBalance}=require('../services/promo.service');
    await Promise.all([LedgerAccount.syncIndexes(),LedgerEntry.syncIndexes()]);
    const owner=new mongoose.Types.ObjectId();
    const lines=[{product:{priceMinor:100000},qty:1}];
    await Feature.create({key:'rewards',enabled:false});
    await assert.rejects(promoPricing({owner,lines,requested:true}),error=>error.status===503);
    await BusinessRule.create([
      {key:'promo_usage',enabled:true,data:{maxDiscountPercent:10,minimumOrderMinor:50000,expiryDays:90}},
      {key:'referral',enabled:true,data:{inviterRewardMinor:10000,inviteePromoMinor:10000,releaseAfterDays:7,requireFirstDeliveredOrder:true}},
      {key:'withdrawal',enabled:true,data:{minimumMinor:50000,feeMinor:1000,allowedMethods:['bkash']}},
      {key:'membership',enabled:true,data:{monthlyMinor:23900,annualMinor:199000,trialDays:7}},
    ]);
    await Feature.updateOne({key:'rewards'},{enabled:true});
    const account=await LedgerAccount.create({owner,kind:'promo'});
    await LedgerEntry.create({account:account._id,amountMinor:15000,reference:'promo:test:grant'});
    assert.equal((await promoPricing({owner,lines,requested:false})).totals.discountMinor,0);
    assert.equal((await promoPricing({owner,lines:[{product:{priceMinor:49999},qty:1}],requested:true})).totals.discountMinor,0);
    assert.equal((await promoPricing({owner,lines,requested:true})).totals.discountMinor,10000);

    const buy=()=>mongoose.connection.transaction(async session=>{
      const {totals,account:locked}=await promoPricing({owner,lines,requested:true,session,lock:true});
      const [order]=await Order.create([{user:owner,...totals,pricingSnapshot:{...totals},paymentMethod:'cod',payment:{provider:'cash',status:'pending'},lines:[],sellerOrders:[]}],{session});
      await consumePromo({order,account:locked,session});
      return String(order._id);
    });
    const orderIds=await Promise.all([buy(),buy()]);
    const orders=await Order.find({_id:{$in:orderIds}}).sort({discountMinor:-1});
    assert.deepEqual(orders.map(item=>item.discountMinor),[10000,5000]);
    assert.equal(await aggregateBalance(account),0);
    await mongoose.connection.transaction(async session=>{
      const order=await Order.findById(orders[0]._id).session(session);
      await releasePromo({order,amountMinor:order.discountMinor,reference:`promo:order:${order._id}:test-cancel`,session});
      await order.save({session});
    });
    assert.equal(await aggregateBalance(account),10000);
    await assert.rejects(mongoose.connection.transaction(async session=>{
      const order=await Order.findById(orders[0]._id).session(session);
      await releasePromo({order,amountMinor:order.discountMinor,reference:`promo:order:${order._id}:test-cancel-again`,session});
    }),error=>error.code==='CONFLICT');
    const CommerceController=require('../controllers/commerce.controller');
    const controller=new CommerceController();
    let responseStatus,responseBody;
    const cancellationKey='11111111-1111-4111-8111-111111111111';
    await controller.cancel(
      {params:{id:String(orders[1]._id)},auth:{user:{_id:owner}},get:name=>name==='Idempotency-Key'?cancellationKey:undefined},
      {status(value){responseStatus=value;return this;},json(value){responseBody=value;return this;}},
    );
    assert.equal(responseStatus,201);
    assert.deepEqual(responseBody,{ok:true});
    assert.equal((await Order.findById(orders[1]._id)).status,'cancelled');
    assert.equal(await aggregateBalance(account),15000);
    await controller.cancel(
      {params:{id:String(orders[1]._id)},auth:{user:{_id:owner}},get:name=>name==='Idempotency-Key'?cancellationKey:undefined},
      {status(value){responseStatus=value;return this;},json(value){responseBody=value;return this;}},
    );
    assert.equal(responseStatus,201);
    assert.deepEqual(responseBody,{ok:true});
    assert.equal(await aggregateBalance(account),15000);
  }finally{
    await disconnectDatabase();
    await replica.stop();
  }
});
