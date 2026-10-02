const {Feature,LedgerAccount,LedgerEntry}=require('../models/system.model');
const {Coupon,Referral,LoyaltyEntry,GiftCard,MembershipEntitlement,DonationCampaign,AffiliateLink,AffiliateAttribution}=require('../models/marketing.model');
const {featureReadiness}=require('./business-rule.service');

async function status(key){
  const [feature,configuration]=await Promise.all([Feature.findOne({key}).lean(),featureReadiness(key,{ignoreOwnFeature:true})]);
  const enabled=Boolean(feature?.enabled),ready=configuration.ready;
  return {key,enabled,ready,status:enabled?(ready?'live':'setup_required'):(ready?'ready':'setup_required'),missingRequirements:configuration.missingRequirements,version:feature?.version||0};
}

async function marketingOverview(){
  const keys=['rewards','referral','coupons','affiliate','loyalty','gift_cards','membership'];
  const [states,coupons,referrals,links,attributions,loyaltyEntries,giftCards,memberships,donations,onlinePayment,walletBalance]=await Promise.all([
    Promise.all(keys.map(status)),
    Coupon.aggregate([{$group:{_id:null,total:{$sum:1},enabled:{$sum:{$cond:['$enabled',1,0]}},redemptions:{$sum:'$redemptionCount'}}}]),
    Referral.aggregate([{$group:{_id:'$status',count:{$sum:1}}}]),
    AffiliateLink.countDocuments(),AffiliateAttribution.aggregate([{$group:{_id:'$status',count:{$sum:1},amountMinor:{$sum:'$commissionMinor'}}}]),
    LoyaltyEntry.countDocuments(),GiftCard.aggregate([{$group:{_id:'$status',count:{$sum:1},amountMinor:{$sum:'$amountMinor'}}}]),
    MembershipEntitlement.aggregate([{$group:{_id:'$status',count:{$sum:1}}}]),DonationCampaign.aggregate([{$group:{_id:'$status',count:{$sum:1}}}]),
    Feature.exists({key:'online_payment',enabled:true}),
    LedgerEntry.aggregate([{$lookup:{from:LedgerAccount.collection.name,localField:'account',foreignField:'_id',as:'account'}},{$unwind:'$account'},{$match:{'account.kind':{$in:['promo','earnings','pending_earnings']}}},{$group:{_id:'$account.kind',amountMinor:{$sum:'$amountMinor'}}}]),
  ]);
  const countMap=rows=>Object.fromEntries(rows.map(row=>[row._id,{count:row.count,amountMinor:row.amountMinor||0}]));
  const byKey=Object.fromEntries(states.map(item=>[item.key,item]));
  byKey.coupons.metrics={total:coupons[0]?.total||0,enabled:coupons[0]?.enabled||0,redemptions:coupons[0]?.redemptions||0};
  byKey.referral.metrics=countMap(referrals);
  byKey.affiliate.metrics={links,attributions:countMap(attributions)};
  byKey.rewards.metrics={balances:Object.fromEntries(walletBalance.map(row=>[row._id,row.amountMinor]))};
  byKey.loyalty.metrics={entries:loyaltyEntries};
  byKey.gift_cards.metrics=countMap(giftCards);
  byKey.membership.metrics=countMap(memberships);
  return {features:states.map(item=>byKey[item.key]),donations:{status:onlinePayment?'available':'browse_only',paymentAvailable:Boolean(onlinePayment),metrics:countMap(donations)},generatedAt:new Date()};
}

module.exports={marketingOverview};
