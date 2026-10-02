const {test}=require('node:test');
const assert=require('node:assert/strict');
const mongoose=require('mongoose');
const {MongoMemoryServer}=require('mongodb-memory-server');
const {Feature,BusinessRule}=require('../models/system.model');
const {featureReadiness}=require('../services/business-rule.service');
const {marketingOverview}=require('../services/marketing-overview.service');

test('marketing capabilities are configured separately and published explicitly',async()=>{
  const mongo=await MongoMemoryServer.create();
  try{
    await mongoose.connect(mongo.getUri('marketing_readiness_test'));
    await Feature.insertMany(['rewards','referral','coupons','affiliate','loyalty','gift_cards','membership','online_payment'].map(key=>({key,enabled:false})));
    await BusinessRule.insertMany([
      {key:'promo_usage',enabled:true,data:{maxDiscountPercent:10,minimumOrderMinor:0,expiryDays:90}},
      {key:'withdrawal',enabled:true,data:{minimumMinor:50000,feeMinor:0,allowedMethods:['bkash']}},
      {key:'referral',enabled:true,data:{inviterRewardMinor:10000,inviteePromoMinor:5000,releaseAfterDays:7,requireFirstDeliveredOrder:true}},
    ]);
    assert.equal((await featureReadiness('rewards',{ignoreOwnFeature:true})).ready,true);
    assert.equal((await featureReadiness('rewards')).ready,false);
    await Feature.updateOne({key:'rewards'},{$set:{enabled:true}});
    assert.equal((await featureReadiness('rewards')).ready,true);
    const referral=await featureReadiness('referral',{ignoreOwnFeature:true});
    assert.equal(referral.ready,true);
    assert.equal(referral.missingRequirements.includes('rule:membership'),false);
    const overview=await marketingOverview();
    assert.equal(overview.features.find(item=>item.key==='referral').status,'ready');
    assert.equal(overview.donations.status,'browse_only');
  }finally{await mongoose.disconnect();await mongo.stop();}
});
