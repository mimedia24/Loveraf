const {Seller}=require('../models/account.model');
const {ReturnRequest}=require('../models/commerce.model');
const {BusinessRule,LedgerAccount,LedgerEntry}=require('../models/system.model');
const {AppError,conflict}=require('../utils/errors');
const {validateBusinessRule}=require('./business-rule.service');

async function commissionRule({required=true}={}){
  const document=await BusinessRule.findOne({key:'seller_commission',enabled:true}).lean();
  if(!document){if(!required)return null;throw new AppError(503,'PROVIDER_UNAVAILABLE','Seller commission settlement is not configured yet.');}
  return validateBusinessRule('seller_commission',true,document.data);
}

function allocateDiscount(order){
  const active=order.sellerOrders.filter(part=>part.status==='delivered');
  const gross=active.reduce((sum,part)=>sum+(part.subtotalMinor||0),0),discount=order.discountMinor||0;
  if(!Number.isSafeInteger(gross)||gross<1||!Number.isSafeInteger(discount)||discount<0||discount>gross)throw conflict('Seller settlement totals need finance review.');
  let cumulative=0,allocated=0;
  return active.map(part=>{cumulative+=part.subtotalMinor;const next=Number(BigInt(discount)*BigInt(cumulative)/BigInt(gross));const value={part,discountMinor:next-allocated};allocated=next;return value;});
}

async function settleSellerPayables(order,session){
  const rule=await commissionRule({required:false});
  if(!rule)return false;
  const allocations=allocateDiscount(order);
  for(const {part,discountMinor} of allocations){
    const seller=await Seller.findById(part.seller).session(session);if(!seller)throw conflict('Seller settlement owner is unavailable.');
    const grossMinor=part.subtotalMinor-discountMinor,platformFeeMinor=Math.floor(grossMinor*rule.platformFeePercent/100),payableMinor=grossMinor-platformFeeMinor;
    const account=await LedgerAccount.findOneAndUpdate({owner:seller.user,kind:'seller_payable',currency:'BDT'},{$setOnInsert:{owner:seller.user,kind:'seller_payable',currency:'BDT'}},{upsert:true,new:true,session});
    await LedgerEntry.create([{account:account._id,amountMinor:payableMinor,reference:`seller-order:${order._id}:${seller._id}:payable`,metadata:{title:'Delivered order payable',orderId:String(order._id),sellerId:String(seller._id),grossMinor,discountMinor,platformFeeMinor,platformFeePercent:rule.platformFeePercent}}],{session});
  }
  return true;
}

async function reverseSellerPayable({order,request,session}){
  const original=await LedgerEntry.findOne({reference:`seller-order:${order._id}:${request.seller}:payable`}).session(session);
  if(!original)return 0;
  const grossMinor=Number(original.metadata?.grossMinor);
  if(!Number.isSafeInteger(grossMinor)||grossMinor<1||!Number.isSafeInteger(original.amountMinor)||original.amountMinor<0)throw conflict('Seller payable needs finance review before this refund.');
  // Lock this seller ledger so concurrent refunds cannot both calculate from
  // the same balance and over-reverse a payable.
  const account=await LedgerAccount.findOneAndUpdate({_id:original.account},{$inc:{version:1}},{new:true,session});
  if(!account)throw conflict('Seller payable account is unavailable.');
  const [prior]=await ReturnRequest.aggregate([
    {$match:{order:order._id,seller:request.seller,status:'refunded'}},
    {$group:{_id:null,amountMinor:{$sum:'$amountMinor'},reversalMinor:{$sum:'$sellerPayableReversalMinor'}}}
  ]).session(session);
  const cumulativeMinor=(prior?.amountMinor||0)+request.amountMinor;
  if(!Number.isSafeInteger(cumulativeMinor)||cumulativeMinor<1||cumulativeMinor>grossMinor)throw conflict('Seller refund totals exceed the settled merchandise value.');
  const targetReversal=Number(BigInt(original.amountMinor)*BigInt(cumulativeMinor)/BigInt(grossMinor));
  const reversalMinor=targetReversal-(prior?.reversalMinor||0);
  if(!Number.isSafeInteger(reversalMinor)||reversalMinor<0||targetReversal>original.amountMinor)throw conflict('Seller payable reversal needs finance review.');
  if(reversalMinor)await LedgerEntry.create([{account:account._id,amountMinor:-reversalMinor,reference:`seller-return:${request._id}:reverse`,metadata:{title:'Refunded order payable reversal',orderId:String(order._id),sellerId:String(request.seller),returnRequestId:String(request._id),refundMinor:request.amountMinor}}],{session});
  request.sellerPayableReversalMinor=reversalMinor;
  return reversalMinor;
}

async function sellerFinance({seller,query={}}){
  const rule=await commissionRule();
  const limit=Math.min(100,Math.max(1,Number(query.limit)||20)),offset=Math.max(0,Number(query.offset)||0);
  const account=await LedgerAccount.findOne({owner:seller.user,kind:'seller_payable',currency:'BDT'}).lean();
  if(!account)return {currency:'BDT',balanceMinor:0,commission:rule,entries:[],nextOffset:null};
  const [balance]=await LedgerEntry.aggregate([{$match:{account:account._id}},{$group:{_id:null,total:{$sum:'$amountMinor'}}}]);
  const rows=await LedgerEntry.find({account:account._id}).sort({createdAt:-1,_id:-1}).skip(offset).limit(limit+1).lean();
  return {currency:'BDT',balanceMinor:balance?.total||0,commission:rule,entries:rows.slice(0,limit).map(item=>({id:String(item._id),amountMinor:item.amountMinor,reference:item.reference,metadata:item.metadata||{},createdAt:item.createdAt})),nextOffset:rows.length>limit?offset+limit:null};
}

module.exports={commissionRule,allocateDiscount,settleSellerPayables,reverseSellerPayable,sellerFinance};
