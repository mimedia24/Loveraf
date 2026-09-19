const crypto=require('node:crypto');
const mongoose=require('mongoose');
const {Feature,BusinessRule,LedgerAccount,LedgerEntry,AuditEvent}=require('../models/system.model');
const {LoyaltyEntry,GiftCard,MembershipEntitlement}=require('../models/marketing.model');
const {User}=require('../models/account.model');
const {AppError,badRequest,notFound,conflict}=require('../utils/errors');
const {configuredFeatureAvailable,rewardsAvailable,validateBusinessRule}=require('./business-rule.service');
const idempotent=require('./idempotency.service');

const digest=value=>crypto.createHash('sha256').update(String(value).trim().toUpperCase()).digest('hex');
const publicGift=value=>({id:String(value._id),name:`Gift card ••••${value.lastFour}`,lastFour:value.lastFour,amountMinor:value.amountMinor,status:value.status,expiresAt:value.expiresAt,...(value.redeemedAt?{redeemedAt:value.redeemedAt}:{}),createdAt:value.createdAt});
async function loyaltyRule(required=false){
  if(!await configuredFeatureAvailable('loyalty','loyalty')){if(required)throw new AppError(503,'PROVIDER_UNAVAILABLE','Loyalty points are not available yet.');return null;}
  const row=await BusinessRule.findOne({key:'loyalty',enabled:true}).lean();return validateBusinessRule('loyalty',true,row.data);
}
async function awardLoyalty(order,session){
  const rule=await loyaltyRule(false);if(!rule)return false;
  const points=Math.floor((order.subtotalMinor||0)/rule.spendMinorPerPoint);if(points<1)return false;
  const reference=`order:${order._id}:paid`,result=await LoyaltyEntry.updateOne({owner:order.user,reference},{$setOnInsert:{owner:order.user,points,reference,metadata:{title:'Order points earned',orderId:String(order._id)}}},{upsert:true,session});return result.upsertedCount===1;
}
async function reverseLoyalty({order,request,fullRefund,session}){
  const award=await LoyaltyEntry.findOne({owner:order.user,reference:`order:${order._id}:paid`}).session(session);if(!award)return false;
  const reversals=await LoyaltyEntry.aggregate([{$match:{owner:order.user,'metadata.orderId':String(order._id),reference:{$regex:'^return:'},points:{$lt:0}}},{$group:{_id:null,total:{$sum:'$points'}}}]).session(session);
  const remaining=Math.max(0,award.points+(reversals[0]?.total||0));if(!remaining)return false;
  const paidMinor=order.payment?.amountMinor||order.totalMinor||1;
  const points=fullRefund?remaining:Math.min(remaining,Math.floor(award.points*(request.amountMinor/paidMinor)));if(points<1)return false;
  const reference=`return:${request._id}:loyalty-reversal`,result=await LoyaltyEntry.updateOne({owner:order.user,reference},{$setOnInsert:{owner:order.user,points:-points,reference,metadata:{title:'Refund points reversed',orderId:String(order._id),returnRequestId:String(request._id)}}},{upsert:true,session});return result.upsertedCount===1;
}
async function loyaltySummary(owner,query={}){
  const rule=await loyaltyRule(true),limit=Math.min(100,Math.max(1,Number(query.limit)||20)),offset=Math.max(0,Number(query.offset)||0);
  const [total]=await LoyaltyEntry.aggregate([{$match:{owner:new mongoose.Types.ObjectId(owner)}},{$group:{_id:null,points:{$sum:'$points'}}}]);
  const rows=await LoyaltyEntry.find({owner}).sort({createdAt:-1,_id:-1}).skip(offset).limit(limit+1).lean();
  return {points:total?.points||0,rule,entries:rows.slice(0,limit).map(row=>({id:String(row._id),points:row.points,reference:row.reference,metadata:row.metadata,createdAt:row.createdAt})),nextOffset:rows.length>limit?offset+limit:null};
}
async function redeemLoyalty({owner,points,key}){
  const policy=await loyaltyRule(true);
  return idempotent(owner,key,{points},async session=>{
    await User.updateOne({_id:owner},{$inc:{loyaltyVersion:1}},{session});
    const [total]=await LoyaltyEntry.aggregate([{$match:{owner:new mongoose.Types.ObjectId(owner)}},{$group:{_id:null,points:{$sum:'$points'}}}]).session(session),available=total?.points||0;
    if(points<policy.minimumRedeemPoints)throw badRequest(`Redeem at least ${policy.minimumRedeemPoints} points.`);if(points>available)throw badRequest('You do not have enough loyalty points.');
    const amountMinor=points*policy.redeemMinorPerPoint,reference=`loyalty-redeem:${key}`,account=await LedgerAccount.findOneAndUpdate({owner,kind:'promo',currency:'BDT'},{$setOnInsert:{owner,kind:'promo',currency:'BDT'},$inc:{version:1}},{upsert:true,new:true,session});
    await LoyaltyEntry.create([{owner,points:-points,reference,metadata:{title:'Points redeemed to Promo Balance',amountMinor}}],{session});await LedgerEntry.create([{account:account._id,amountMinor,reference,metadata:{title:'Loyalty points redeemed',points}}],{session});return {pointsRedeemed:points,amountMinor,remainingPoints:available-points};
  });
}
async function issueGiftCard({input,actor,key}){
  if(!await Feature.exists({key:'gift_cards',enabled:true})||!await rewardsAvailable())throw new AppError(503,'PROVIDER_UNAVAILABLE','Gift cards are not available yet.');
  return idempotent(actor,key,{operation:'gift-card.issue',...input},async session=>{
    const raw=crypto.randomBytes(9).toString('hex').toUpperCase(),code=`LR-${raw.slice(0,6)}-${raw.slice(6,12)}-${raw.slice(12)}`;
    const [card]=await GiftCard.create([{codeHash:digest(code),lastFour:raw.slice(-4),amountMinor:input.amountMinor,expiresAt:new Date(input.expiresAt),issuedBy:actor,reason:input.reason}],{session});
    await AuditEvent.create([{actor,action:'gift_card.issue',target:String(card._id),reason:input.reason,metadata:{amountMinor:card.amountMinor,expiresAt:card.expiresAt}}],{session});
    return {...publicGift(card),version:card.version,code};
  });
}
async function redeemGiftCard({owner,code}){
  if(!await Feature.exists({key:'gift_cards',enabled:true})||!await rewardsAvailable())throw new AppError(503,'PROVIDER_UNAVAILABLE','Gift cards are not available yet.');
  return mongoose.connection.transaction(async session=>{
    const card=await GiftCard.findOne({codeHash:digest(code)}).session(session);if(!card)throw badRequest('Gift card code is invalid.');
    if(card.expiresAt<=new Date()){if(card.status==='issued'){card.status='expired';await card.save({session});}throw badRequest('Gift card has expired.');}
    if(card.status!=='issued')throw conflict('Gift card has already been used or is unavailable.');
    const account=await LedgerAccount.findOneAndUpdate({owner,kind:'promo',currency:'BDT'},{$setOnInsert:{owner,kind:'promo',currency:'BDT'},$inc:{version:1}},{upsert:true,new:true,session});
    await LedgerEntry.create([{account:account._id,amountMinor:card.amountMinor,reference:`gift-card:${card._id}:redeem`,metadata:{title:'Gift card redeemed',giftCardId:String(card._id)}}],{session});
    card.status='redeemed';card.redeemedBy=owner;card.redeemedAt=new Date();await card.save({session});return publicGift(card);
  });
}
async function listGiftCards(query={}){const limit=Math.min(100,Math.max(1,Number(query.limit)||50)),offset=Math.max(0,Number(query.offset)||0),rows=await GiftCard.find().sort({createdAt:-1,_id:-1}).skip(offset).limit(limit+1).lean();return {items:rows.slice(0,limit).map(row=>({...publicGift(row),version:row.version})),nextOffset:rows.length>limit?offset+limit:null};}
async function revokeGiftCard({id,input,actor}){
  if(!mongoose.isValidObjectId(id))throw notFound('Gift card not found.');
  return mongoose.connection.transaction(async session=>{
    const card=await GiftCard.findOne({_id:id,version:input.version}).session(session);if(!card)throw conflict('Gift card changed. Refresh and try again.');
    if(card.status!=='issued')throw conflict('Only an unused gift card can be revoked.');
    card.status='revoked';card.reason=input.reason;await card.save({session});
    await AuditEvent.create([{actor,action:'gift_card.revoke',target:String(card._id),reason:input.reason,metadata:{amountMinor:card.amountMinor,lastFour:card.lastFour}}],{session});
    return {...publicGift(card),version:card.version};
  });
}
async function membershipSummary(owner){
  if(!await configuredFeatureAvailable('membership','membership'))throw new AppError(503,'PROVIDER_UNAVAILABLE','Membership is not available yet.');
  const ruleDocument=await BusinessRule.findOne({key:'membership',enabled:true}).lean(),rule=validateBusinessRule('membership',true,ruleDocument.data),now=new Date();
  await MembershipEntitlement.updateMany({user:owner,status:'active',endsAt:{$lte:now}},{$set:{status:'expired'}});
  const entitlement=await MembershipEntitlement.findOne({user:owner,status:'active',startsAt:{$lte:now},endsAt:{$gt:now}}).sort({endsAt:-1}).lean();
  return {rule,entitlement:entitlement?{id:String(entitlement._id),plan:entitlement.plan,status:entitlement.status,startsAt:entitlement.startsAt,endsAt:entitlement.endsAt}:null,purchaseAvailable:false};
}
async function grantMembership({input,actor,key}){
  if(!await configuredFeatureAvailable('membership','membership'))throw new AppError(503,'PROVIDER_UNAVAILABLE','Membership is not available yet.');
  const startsAt=new Date(input.startsAt),endsAt=new Date(input.endsAt);if(endsAt<=startsAt)throw badRequest('Membership end must be after its start.');
  return idempotent(actor,key,{operation:'membership.grant',...input},async session=>{const user=await User.findById(input.userId).session(session);if(!user||user.accountType==='seller')throw notFound('Personal account not found.');await MembershipEntitlement.updateMany({user:user._id,status:'active'},{$set:{status:'revoked',reason:'Replaced by a new entitlement.'}},{session});const [entitlement]=await MembershipEntitlement.create([{user:user._id,plan:input.plan,status:'active',startsAt,endsAt,grantedBy:actor,reason:input.reason}],{session});await AuditEvent.create([{actor,action:'membership.grant',target:String(entitlement._id),reason:input.reason,metadata:{userId:String(user._id),plan:input.plan,startsAt,endsAt}}],{session});return {id:String(entitlement._id),user:{id:String(user._id),name:user.name,email:user.email},plan:entitlement.plan,status:entitlement.status,startsAt,endsAt,version:entitlement.version};});
}
async function listMemberships(query={}){const limit=Math.min(100,Math.max(1,Number(query.limit)||50)),offset=Math.max(0,Number(query.offset)||0),rows=await MembershipEntitlement.find().populate('user','name email phone').sort({createdAt:-1,_id:-1}).skip(offset).limit(limit+1);return {items:rows.slice(0,limit).map(row=>({id:String(row._id),name:row.user?.name||'Unavailable customer',email:row.user?.email,phone:row.user?.phone,user:row.user?{id:String(row.user._id),name:row.user.name,email:row.user.email,phone:row.user.phone}:null,plan:row.plan,status:row.status,startsAt:row.startsAt,endsAt:row.endsAt,reason:row.reason,version:row.version})),nextOffset:rows.length>limit?offset+limit:null};}
async function revokeMembership({id,input,actor}){
  if(!mongoose.isValidObjectId(id))throw notFound('Membership not found.');
  return mongoose.connection.transaction(async session=>{
    const entitlement=await MembershipEntitlement.findOne({_id:id,version:input.version}).session(session);if(!entitlement)throw conflict('Membership changed. Refresh and try again.');
    if(entitlement.status!=='active')throw conflict('Only an active membership can be revoked.');
    entitlement.status='revoked';entitlement.reason=input.reason;await entitlement.save({session});
    await AuditEvent.create([{actor,action:'membership.revoke',target:String(entitlement._id),reason:input.reason,metadata:{userId:String(entitlement.user),plan:entitlement.plan}}],{session});
    return {id:String(entitlement._id),status:entitlement.status,version:entitlement.version};
  });
}
module.exports={awardLoyalty,reverseLoyalty,loyaltySummary,redeemLoyalty,issueGiftCard,redeemGiftCard,listGiftCards,revokeGiftCard,membershipSummary,grantMembership,listMemberships,revokeMembership};
