const {BusinessRule,LedgerAccount,LedgerEntry}=require('../models/system.model');
const {AppError,conflict}=require('../utils/errors');
const {rewardsAvailable,validateBusinessRule}=require('./business-rule.service');
const {calculateOrderTotals}=require('./pricing.service');

async function aggregateBalance(account,session){
  if(!account)return 0;
  const query=LedgerEntry.aggregate([{$match:{account:account._id}},{$group:{_id:null,balance:{$sum:'$amountMinor'}}}]);
  if(session)query.session(session);
  const [row]=await query;
  return row?.balance||0;
}

async function promoPricing({owner,lines,requested,session,lock=false,baseDiscountMinor=0}){
  const base=calculateOrderTotals(lines,baseDiscountMinor);
  if(!requested)return {totals:base,account:null};
  if(!await rewardsAvailable())throw new AppError(503,'PROVIDER_UNAVAILABLE','Promo Balance is not available yet.');
  const ruleDocument=await BusinessRule.findOne({key:'promo_usage',enabled:true}).session(session||null).lean();
  const rule=validateBusinessRule('promo_usage',true,ruleDocument?.data);
  if(base.subtotalMinor<rule.minimumOrderMinor)return {totals:base,account:null};
  const filter={owner,kind:'promo',currency:'BDT'};
  const account=lock
    ? await LedgerAccount.findOneAndUpdate(filter,{$inc:{version:1}},{new:true,session})
    : await LedgerAccount.findOne(filter).session(session||null);
  const balance=Math.max(0,await aggregateBalance(account,session));
  const limit=Math.floor(base.subtotalMinor*rule.maxDiscountPercent/100);
  const promoDiscountMinor=Math.min(balance,limit,base.subtotalMinor-baseDiscountMinor);
  return {totals:calculateOrderTotals(lines,baseDiscountMinor+promoDiscountMinor),account:promoDiscountMinor?account:null,promoDiscountMinor};
}

async function consumePromo({order,account,amountMinor,session}){
  const promoMinor=amountMinor??order.discountMinor;if(!account||!promoMinor)return;
  await LedgerEntry.create([{account:account._id,amountMinor:-promoMinor,reference:`promo:order:${order._id}:consume`,metadata:{title:'Order promo discount',orderId:String(order._id)}}],{session});
  order.promo={account:account._id,usedMinor:promoMinor,refundedMinor:0};
  await order.save({session});
}

async function releasePromo({order,amountMinor,reference,session}){
  if(!amountMinor)return;
  if(!order.promo?.account||!Number.isSafeInteger(amountMinor)||amountMinor<1)throw conflict('Order promo balance needs finance review.');
  const remaining=(order.promo.usedMinor||0)-(order.promo.refundedMinor||0);
  if(amountMinor>remaining)throw conflict('Order promo balance changed. Reload and retry.');
  await LedgerEntry.create([{account:order.promo.account,amountMinor,reference,metadata:{title:'Order promo restored',orderId:String(order._id)}}],{session});
  order.promo.refundedMinor=(order.promo.refundedMinor||0)+amountMinor;
}

module.exports={promoPricing,consumePromo,releasePromo,aggregateBalance};
