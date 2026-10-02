const {test}=require('node:test');
const assert=require('node:assert/strict');
const mongoose=require('mongoose');
const {MongoMemoryReplSet}=require('mongodb-memory-server');
const {User}=require('../models/account.model');
const {Order}=require('../models/commerce.model');
const {Referral}=require('../models/marketing.model');
const {Feature,BusinessRule,LedgerAccount,LedgerEntry}=require('../models/system.model');
const {assignReferralCode,attributeReferral,qualifyReferral,releaseReferral,reverseReferral}=require('../services/referral.service');

async function balance(owner,kind){
  const account=await LedgerAccount.findOne({owner,kind});
  if(!account)return 0;
  const [row]=await LedgerEntry.aggregate([{$match:{account:account._id}},{$group:{_id:null,total:{$sum:'$amountMinor'}}}]);
  return row?.total||0;
}

test('referral is attributed once, qualifies on first paid order, releases and reverses safely',async()=>{
  const replica=await MongoMemoryReplSet.create({replSet:{count:1}});
  try{
    await mongoose.connect(replica.getUri('referral_test'));
    await Promise.all([User.init(),Order.init(),Referral.init(),LedgerAccount.init(),LedgerEntry.init(),Feature.init(),BusinessRule.init()]);
    await Feature.insertMany([{key:'rewards',enabled:true},{key:'referral',enabled:true}]);
    await BusinessRule.insertMany([
      {key:'promo_usage',enabled:true,data:{maxDiscountPercent:10,minimumOrderMinor:0,expiryDays:30}},
      {key:'referral',enabled:true,data:{inviterRewardMinor:10000,inviteePromoMinor:5000,releaseAfterDays:0,requireFirstDeliveredOrder:true}},
      {key:'withdrawal',enabled:true,data:{minimumMinor:10000,feeMinor:0,allowedMethods:['bkash']}},
      {key:'membership',enabled:true,data:{monthlyMinor:10000,annualMinor:100000,trialDays:0}},
    ]);
    const [inviter,invitee]=await User.create([{name:'Inviter',email:'inviter@test.local',passwordHash:'x'},{name:'Invitee',email:'invitee@test.local',passwordHash:'x'}]);
    await mongoose.connection.transaction(async session=>{
      await assignReferralCode(inviter,session);
      await attributeReferral({invitee,code:inviter.referralCode,session});
    });
    assert.equal(String((await User.findById(invitee.id)).referredBy),String(inviter.id));
    await assert.rejects(mongoose.connection.transaction(session=>attributeReferral({invitee,code:'LR00000000',session})),/invalid/);
    const order=await Order.create({user:invitee._id,totalMinor:20000,paymentMethod:'cod',payment:{status:'paid',amountMinor:20000},lines:[{returnDays:0}],sellerOrders:[]});
    await mongoose.connection.transaction(session=>qualifyReferral(order,session));
    const pending=await Referral.findOne({invitee:invitee._id});
    assert.equal(pending.status,'pending');
    assert.equal(await balance(inviter._id,'pending_earnings'),10000);
    assert.equal(await balance(invitee._id,'pending_promo'),5000);
    pending.eligibleAt=new Date(Date.now()-1000);await pending.save();
    assert.equal(await releaseReferral(pending._id),true);
    assert.equal(await balance(inviter._id,'pending_earnings'),0);
    assert.equal(await balance(inviter._id,'earnings'),10000);
    await mongoose.connection.transaction(session=>reverseReferral({order,session}));
    assert.equal((await Referral.findById(pending._id)).status,'reversed');
    assert.equal(await balance(inviter._id,'earnings'),0);
    assert.equal(await balance(invitee._id,'promo'),0);
    await mongoose.connection.transaction(session=>reverseReferral({order,session}));
    assert.equal(await balance(inviter._id,'earnings'),0);
  }finally{await mongoose.disconnect();await replica.stop();}
});
