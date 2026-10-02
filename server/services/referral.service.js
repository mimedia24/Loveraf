const crypto=require('node:crypto');
const {User}=require('../models/account.model');
const {Order}=require('../models/commerce.model');
const {Referral}=require('../models/marketing.model');
const {BusinessRule,LedgerAccount,LedgerEntry}=require('../models/system.model');
const {Activity}=require('../models/communication.model');
const {AppError,badRequest,conflict}=require('../utils/errors');
const {featureReadiness,validateBusinessRule}=require('./business-rule.service');

const newCode=()=>`LR${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
async function referralRule(){
  if(!(await featureReadiness('referral')).ready)throw new AppError(503,'PROVIDER_UNAVAILABLE','Referrals are not available yet.');
  const document=await BusinessRule.findOne({key:'referral',enabled:true}).lean();
  return validateBusinessRule('referral',true,document?.data);
}
async function assignReferralCode(user,session){
  if(user.referralCode)return user.referralCode;
  for(let attempt=0;attempt<5;attempt++){
    const referralCode=newCode(),updated=await User.findOneAndUpdate({_id:user._id,referralCode:{$exists:false}},{$set:{referralCode}},{new:true,session});
    if(updated){user.referralCode=referralCode;return referralCode;}
    const current=await User.findById(user._id).session(session);if(current?.referralCode){user.referralCode=current.referralCode;return current.referralCode;}
  }
  throw conflict('A referral code could not be reserved. Try again.');
}
async function attributeReferral({invitee,code,session}){
  if(!code)return null;const rule=await referralRule();
  const inviter=await User.findOne({referralCode:String(code).trim().toUpperCase(),accountType:{$ne:'seller'},suspended:false}).session(session);
  if(!inviter)throw badRequest('Referral code is invalid.');
  if(String(inviter._id)===String(invitee._id))throw badRequest('You cannot use your own referral code.');
  invitee.referredBy=inviter._id;await invitee.save({session});
  const [referral]=await Referral.create([{inviter:inviter._id,invitee:invitee._id,code:inviter.referralCode,status:'attributed',inviterRewardMinor:rule.inviterRewardMinor,inviteePromoMinor:rule.inviteePromoMinor,releaseAfterDays:rule.releaseAfterDays}],{session});
  return referral;
}
async function ledger(owner,kind,session){return LedgerAccount.findOneAndUpdate({owner,kind,currency:'BDT'},{$setOnInsert:{owner,kind,currency:'BDT'},$inc:{version:1}},{upsert:true,new:true,session});}
async function qualifyReferral(order,session){
  const referral=await Referral.findOne({invitee:order.user,status:'attributed'}).session(session);if(!referral)return false;
  const prior=await Order.exists({_id:{$ne:order._id},user:order.user,'payment.status':{$in:['paid','partially_refunded','refunded']}}).session(session);
  if(prior)return false;
  const returnDays=Math.max(0,...order.lines.map(line=>Number(line.returnDays)||0)),eligibleAt=new Date(Date.now()+Math.max(referral.releaseAfterDays||0,returnDays)*86400000);
  referral.status='pending';referral.qualifyingOrder=order._id;referral.eligibleAt=eligibleAt;await referral.save({session});
  if(referral.inviterRewardMinor){const account=await ledger(referral.inviter,'pending_earnings',session);await LedgerEntry.create([{account:account._id,amountMinor:referral.inviterRewardMinor,reference:`referral:${referral._id}:inviter:pending`,metadata:{title:'Referral reward pending',referralId:String(referral._id),orderId:String(order._id)}}],{session});}
  if(referral.inviteePromoMinor){const account=await ledger(referral.invitee,'pending_promo',session);await LedgerEntry.create([{account:account._id,amountMinor:referral.inviteePromoMinor,reference:`referral:${referral._id}:invitee:pending`,metadata:{title:'Referral promo pending',referralId:String(referral._id),orderId:String(order._id)}}],{session});}
  return true;
}
async function moveReward({owner,pendingKind,finalKind,amountMinor,referral,session}){
  if(!amountMinor)return;const pending=await ledger(owner,pendingKind,session),final=await ledger(owner,finalKind,session);
  await LedgerEntry.create([{account:pending._id,amountMinor:-amountMinor,reference:`referral:${referral._id}:${pendingKind}:release`,metadata:{title:'Referral reward released'}},{account:final._id,amountMinor,reference:`referral:${referral._id}:${finalKind}:release`,metadata:{title:'Referral reward available'}}],{session,ordered:true});
}
async function releaseReferral(id){
  const mongoose=require('mongoose');return mongoose.connection.transaction(async session=>{
    const referral=await Referral.findOne({_id:id,status:'pending',eligibleAt:{$lte:new Date()}}).session(session);if(!referral)return false;
    const order=await Order.findById(referral.qualifyingOrder).session(session);if(!order||order.payment?.status==='refunded')return reverseReferral({order,session,referral});
    await moveReward({owner:referral.inviter,pendingKind:'pending_earnings',finalKind:'earnings',amountMinor:referral.inviterRewardMinor,referral,session});
    await moveReward({owner:referral.invitee,pendingKind:'pending_promo',finalKind:'promo',amountMinor:referral.inviteePromoMinor,referral,session});
    referral.status='released';referral.releasedAt=new Date();await referral.save({session});
    await Activity.create([{user:referral.inviter,category:'promo',title:'Referral reward available',body:'Your referral reward is now available.',target:{referralId:String(referral._id)}},{user:referral.invitee,category:'promo',title:'Referral promo available',body:'Your referral promo is now available.',target:{referralId:String(referral._id)}}],{session,ordered:true});return true;
  });
}
async function reverseAmount({owner,kind,amountMinor,reference,title,session}){if(!amountMinor)return;const account=await ledger(owner,kind,session);await LedgerEntry.create([{account:account._id,amountMinor:-amountMinor,reference,metadata:{title}}],{session});}
async function reverseReferral({order,session,referral:provided}){
  const referral=provided||await Referral.findOne({qualifyingOrder:order._id,status:{$in:['pending','released']}}).session(session);if(!referral)return false;
  if(referral.status==='pending'){
    await reverseAmount({owner:referral.inviter,kind:'pending_earnings',amountMinor:referral.inviterRewardMinor,reference:`referral:${referral._id}:pending_earnings:reverse`,title:'Referral reward reversed',session});
    await reverseAmount({owner:referral.invitee,kind:'pending_promo',amountMinor:referral.inviteePromoMinor,reference:`referral:${referral._id}:pending_promo:reverse`,title:'Referral promo reversed',session});
  }else{
    await reverseAmount({owner:referral.inviter,kind:'earnings',amountMinor:referral.inviterRewardMinor,reference:`referral:${referral._id}:earnings:reverse`,title:'Referral reward reversed',session});
    await reverseAmount({owner:referral.invitee,kind:'promo',amountMinor:referral.inviteePromoMinor,reference:`referral:${referral._id}:promo:reverse`,title:'Referral promo reversed',session});
  }
  referral.status='reversed';referral.reversedAt=new Date();await referral.save({session});return true;
}
async function processDueReferrals(){const ids=await Referral.find({status:'pending',eligibleAt:{$lte:new Date()}}).select('_id').limit(100).lean();let processed=0,failed=0;for(const row of ids){try{if(await releaseReferral(row._id))processed+=1;}catch{failed+=1;}}return {processed,failed};}
async function referralSummary(user){const rule=await referralRule(),code=await assignReferralCode(user),rows=await Referral.find({inviter:user._id}).sort({createdAt:-1}).limit(100).lean();return {code,rule,invited:rows.length,released:rows.filter(row=>row.status==='released').length,pending:rows.filter(row=>row.status==='pending').length,referrals:rows.map(row=>({id:String(row._id),status:row.status,rewardMinor:row.inviterRewardMinor,eligibleAt:row.eligibleAt,createdAt:row.createdAt}))};}
module.exports={assignReferralCode,attributeReferral,qualifyReferral,releaseReferral,reverseReferral,processDueReferrals,referralSummary};
