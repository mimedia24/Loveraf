const {test}=require('node:test');
const assert=require('node:assert/strict');
const mongoose=require('mongoose');
const {MongoMemoryReplSet}=require('mongodb-memory-server');
const {User}=require('../models/account.model');
const {Feature,BusinessRule,LedgerAccount,LedgerEntry}=require('../models/system.model');
const {LoyaltyEntry,GiftCard,MembershipEntitlement,DonationCampaign}=require('../models/marketing.model');
const {MutationKey}=require('../models/commerce.model');
const {awardLoyalty,reverseLoyalty,loyaltySummary,redeemLoyalty,issueGiftCard,redeemGiftCard,revokeGiftCard,membershipSummary,grantMembership,revokeMembership}=require('../services/benefit.service');
const {saveCampaign,listPublicCampaigns,createContribution}=require('../services/donation.service');

test('loyalty, gift-card redemption and membership entitlements use durable guarded records',async()=>{
  const replica=await MongoMemoryReplSet.create({replSet:{count:1}});
  try{
    await mongoose.connect(replica.getUri('benefit_test'));
    await Promise.all([User.init(),Feature.init(),BusinessRule.init(),LedgerAccount.init(),LedgerEntry.init(),LoyaltyEntry.init(),GiftCard.init(),MembershipEntitlement.init(),DonationCampaign.init(),MutationKey.init()]);
    await Feature.insertMany(['rewards','loyalty','gift_cards','membership'].map(key=>({key,enabled:true})));
    await BusinessRule.insertMany([
      {key:'promo_usage',enabled:true,data:{maxDiscountPercent:10,minimumOrderMinor:0,expiryDays:30}},
      {key:'referral',enabled:true,data:{inviterRewardMinor:10000,inviteePromoMinor:5000,releaseAfterDays:7,requireFirstDeliveredOrder:true}},
      {key:'withdrawal',enabled:true,data:{minimumMinor:10000,feeMinor:0,allowedMethods:['bkash']}},
      {key:'membership',enabled:true,data:{monthlyMinor:23900,annualMinor:199000,trialDays:7}},
      {key:'loyalty',enabled:true,data:{spendMinorPerPoint:10000,minimumRedeemPoints:100,redeemMinorPerPoint:100}},
    ]);
    const [user,admin]=await User.create([{name:'Buyer',email:'benefit-buyer@test.local',passwordHash:'x'},{name:'Admin',email:'benefit-admin@test.local',passwordHash:'x',roles:['super_admin']}]);
    const order={_id:new mongoose.Types.ObjectId(),user:user._id,subtotalMinor:2550000,payment:{amountMinor:2550000},totalMinor:2550000};
    await mongoose.connection.transaction(session=>awardLoyalty(order,session));
    await mongoose.connection.transaction(session=>awardLoyalty(order,session));
    assert.equal((await loyaltySummary(user._id)).points,255);
    const redemptionKey='11111111-1111-4111-8111-111111111111',redeemed=await redeemLoyalty({owner:user._id,points:100,key:redemptionKey});assert.equal(redeemed.amountMinor,10000);assert.equal((await loyaltySummary(user._id)).points,155);assert.deepEqual(await redeemLoyalty({owner:user._id,points:100,key:redemptionKey}),redeemed);
    const request={_id:new mongoose.Types.ObjectId(),amountMinor:2550000};
    await mongoose.connection.transaction(session=>reverseLoyalty({order,request,fullRefund:true,session}));
    assert.equal((await loyaltySummary(user._id)).points,-100);
    const giftInput={amountMinor:50000,expiresAt:new Date(Date.now()+86400000).toISOString(),reason:'Customer care award'},giftKey='22222222-2222-4222-8222-222222222222';
    const issued=await issueGiftCard({actor:admin._id,input:giftInput,key:giftKey});
    assert.match(issued.code,/^LR-[A-F0-9]{6}-[A-F0-9]{6}-[A-F0-9]{6}$/);
    assert.deepEqual(await issueGiftCard({actor:admin._id,input:giftInput,key:giftKey}),issued);assert.equal(await GiftCard.countDocuments(),1);
    const attempts=await Promise.allSettled([redeemGiftCard({owner:user._id,code:issued.code}),redeemGiftCard({owner:user._id,code:issued.code})]);
    assert.equal(attempts.filter(item=>item.status==='fulfilled').length,1);
    const promo=await LedgerAccount.findOne({owner:user._id,kind:'promo'}),entries=await LedgerEntry.find({account:promo._id});assert.equal(entries.reduce((sum,row)=>sum+row.amountMinor,0),60000);
    await assert.rejects(revokeGiftCard({id:issued.id,actor:admin._id,input:{version:1,reason:'Cannot revoke redeemed value'}}),error=>error.status===409);
    const unused=await issueGiftCard({actor:admin._id,key:'33333333-3333-4333-8333-333333333333',input:{amountMinor:10000,expiresAt:new Date(Date.now()+86400000).toISOString(),reason:'Lifecycle test'}});
    assert.equal((await revokeGiftCard({id:unused.id,actor:admin._id,input:{version:unused.version,reason:'Issue cancelled'}})).status,'revoked');
    const startsAt=new Date(),endsAt=new Date(Date.now()+30*86400000);
    const membershipInput={userId:String(user._id),plan:'monthly',startsAt:startsAt.toISOString(),endsAt:endsAt.toISOString(),reason:'Controlled membership test'},membershipKey='44444444-4444-4444-8444-444444444444';
    const granted=await grantMembership({actor:admin._id,input:membershipInput,key:membershipKey});
    assert.deepEqual(await grantMembership({actor:admin._id,input:membershipInput,key:membershipKey}),granted);assert.equal(await MembershipEntitlement.countDocuments({user:user._id}),1);
    const membership=await membershipSummary(user._id);assert.equal(membership.entitlement.plan,'monthly');assert.equal(membership.purchaseAvailable,false);
    assert.equal((await revokeMembership({id:granted.id,actor:admin._id,input:{version:granted.version,reason:'Entitlement cancelled'}})).status,'revoked');
    assert.equal((await membershipSummary(user._id)).entitlement,null);
    const campaign=await saveCampaign({actor:admin._id,input:{title:'Verified relief campaign',description:'Transparent support for affected families.',goalMinor:10000000,startsAt:new Date(Date.now()-1000).toISOString(),endsAt:new Date(Date.now()+86400000).toISOString(),status:'active',verified:true,reason:'Campaign documents reviewed'}});
    assert.equal((await listPublicCampaigns())[0].id,campaign.id);
    await assert.rejects(createContribution({owner:user._id,input:{campaignId:campaign.id,amountMinor:10000}}),error=>error.status===503&&error.code==='PROVIDER_UNAVAILABLE');
  }finally{await mongoose.disconnect();await replica.stop();}
});
