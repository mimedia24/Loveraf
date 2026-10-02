const {Seller}=require('../models/account.model');
const {Order,ReturnRequest}=require('../models/commerce.model');
const {Activity}=require('../models/communication.model');
const {BusinessRule,LedgerAccount,LedgerEntry,WithdrawalRequest}=require('../models/system.model');
const {AppError,conflict,notFound}=require('../utils/errors');
const {validateBusinessRule}=require('./business-rule.service');
const {withdrawalRule,json:withdrawalJson}=require('./withdrawal.service');

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

function payableForPart(order,part,rule){
  const active=order.sellerOrders.filter(item=>item.status!=='cancelled'),gross=active.reduce((sum,item)=>sum+(item.subtotalMinor||0),0),discount=order.discountMinor||0;
  if(!gross||!active.some(item=>String(item.seller)===String(part.seller)))return {grossMinor:0,discountMinor:0,platformFeeMinor:0,payableMinor:0};
  let cumulative=0,allocated=0,discountMinor=0;
  for(const item of active){cumulative+=item.subtotalMinor;const next=Number(BigInt(discount)*BigInt(cumulative)/BigInt(gross));if(String(item.seller)===String(part.seller))discountMinor=next-allocated;allocated=next;}
  const grossMinor=part.subtotalMinor-discountMinor,platformFeeMinor=Math.floor(grossMinor*rule.platformFeePercent/100);
  return {grossMinor,discountMinor,platformFeeMinor,payableMinor:grossMinor-platformFeeMinor};
}

async function pendingCodForSeller(seller,rule,{limit=0}={}){
  let query=Order.find({paymentMethod:'cod','payment.status':'pending',sellerOrders:{$elemMatch:{seller:seller._id,status:'delivered'}}}).sort({updatedAt:-1,_id:-1});if(limit)query=query.limit(limit);const rows=await query.lean();
  const items=rows.map(order=>{
    const part=order.sellerOrders.find(item=>String(item.seller)===String(seller._id)),estimate=payableForPart(order,part,rule);
    return {id:String(order._id),status:part.status,paymentStatus:order.payment?.status||'pending',paymentVersion:order.payment?.version||0,orderTotalMinor:order.totalMinor,ready:order.sellerOrders.every(item=>['delivered','cancelled'].includes(item.status)),subtotalMinor:part.subtotalMinor,...estimate,deliveredAt:part.statusHistory?.filter(event=>event.status==='delivered').at(-1)?.at,updatedAt:order.updatedAt};
  });
  return {items,totalMinor:items.reduce((sum,item)=>sum+item.payableMinor,0),count:items.length};
}

async function financeTotals({seller,account}){
  const [ledger,withdrawals]=await Promise.all([
    account?LedgerEntry.aggregate([{$match:{account:account._id}},{$group:{_id:null,balanceMinor:{$sum:'$amountMinor'},lifetimeCreditedMinor:{$sum:{$cond:[{$regexMatch:{input:'$reference',regex:/^seller-order:/}},'$amountMinor',0]}},lifetimeReversedMinor:{$sum:{$cond:[{$regexMatch:{input:'$reference',regex:/^seller-return:/}},{$abs:'$amountMinor'},0]}}}}]):Promise.resolve([]),
    WithdrawalRequest.aggregate([{$match:{seller:seller._id,sourceKind:'seller_payable'}},{$group:{_id:'$status',amountMinor:{$sum:'$amountMinor'},payoutMinor:{$sum:'$payoutMinor'},count:{$sum:1}}}]),
  ]);
  const byStatus=Object.fromEntries(withdrawals.map(item=>[item._id,item]));
  return {availableMinor:ledger[0]?.balanceMinor||0,lifetimeCreditedMinor:ledger[0]?.lifetimeCreditedMinor||0,lifetimeReversedMinor:ledger[0]?.lifetimeReversedMinor||0,reservedWithdrawalMinor:(byStatus.requested?.amountMinor||0)+(byStatus.approved?.amountMinor||0),paidWithdrawalMinor:byStatus.paid?.payoutMinor||0};
}

async function settleSellerPayables(order,session){
  const rule=await commissionRule();
  const allocations=allocateDiscount(order);
  for(const {part,discountMinor} of allocations){
    const seller=await Seller.findById(part.seller).session(session);if(!seller)throw conflict('Seller settlement owner is unavailable.');
    const grossMinor=part.subtotalMinor-discountMinor,platformFeeMinor=Math.floor(grossMinor*rule.platformFeePercent/100),payableMinor=grossMinor-platformFeeMinor;
    const account=await LedgerAccount.findOneAndUpdate({owner:seller.user,kind:'seller_payable',currency:'BDT'},{$setOnInsert:{owner:seller.user,kind:'seller_payable',currency:'BDT'}},{upsert:true,new:true,session});
    await LedgerEntry.create([{account:account._id,amountMinor:payableMinor,reference:`seller-order:${order._id}:${seller._id}:payable`,metadata:{title:'Delivered order payable',orderId:String(order._id),sellerId:String(seller._id),grossMinor,discountMinor,platformFeeMinor,platformFeePercent:rule.platformFeePercent}}],{session});
    await Activity.create([{user:seller.user,category:'order',title:'Seller balance credited',body:`BDT ${(payableMinor/100).toFixed(2)} was added after COD collection.`,target:{orderId:String(order._id),sellerId:String(seller._id),status:'paid'}}],{session});
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
  const [rule,payoutRule]=await Promise.all([commissionRule(),withdrawalRule({requireRewards:false}).catch(error=>{
    if(error?.code==='PROVIDER_UNAVAILABLE')return null;
    throw error;
  })]);
  const limit=Math.min(100,Math.max(1,Number(query.limit)||20)),offset=Math.max(0,Number(query.offset)||0);
  const account=await LedgerAccount.findOne({owner:seller.user,kind:'seller_payable',currency:'BDT'}).lean();
  const [totals,pending,rows]=await Promise.all([financeTotals({seller,account}),pendingCodForSeller(seller,rule),account?LedgerEntry.find({account:account._id}).sort({createdAt:-1,_id:-1}).skip(offset).limit(limit+1).lean():[]]);
  return {currency:'BDT',balanceMinor:totals.availableMinor,...totals,pendingCodMinor:pending.totalMinor,pendingCodCount:pending.count,commission:rule,withdrawalAvailable:Boolean(payoutRule),withdrawalRule:payoutRule,entries:rows.slice(0,limit).map(item=>({id:String(item._id),amountMinor:item.amountMinor,reference:item.reference,metadata:item.metadata||{},createdAt:item.createdAt})),nextOffset:rows.length>limit?offset+limit:null};
}

const escapeRegex=value=>String(value||'').replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
async function sellerFinanceOverview(rule){
  const [ledgerRows,withdrawalRows,pendingOrders]=await Promise.all([
    LedgerEntry.aggregate([{$lookup:{from:'ledgeraccounts',localField:'account',foreignField:'_id',as:'accountDocument'}},{$unwind:'$accountDocument'},{$match:{'accountDocument.kind':'seller_payable'}},{$group:{_id:null,balanceMinor:{$sum:'$amountMinor'}}}]),
    WithdrawalRequest.aggregate([{$match:{sourceKind:'seller_payable'}},{$group:{_id:'$status',amountMinor:{$sum:'$amountMinor'},payoutMinor:{$sum:'$payoutMinor'}}}]),
    rule?Order.find({paymentMethod:'cod','payment.status':'pending','sellerOrders.status':'delivered'}).select('discountMinor sellerOrders').lean():[],
  ]);
  const withdrawals=Object.fromEntries(withdrawalRows.map(item=>[item._id,item]));let pendingCodMinor=0;
  if(rule)for(const order of pendingOrders)for(const part of order.sellerOrders.filter(item=>item.status==='delivered'))pendingCodMinor+=payableForPart(order,part,rule).payableMinor;
  return {sellerPayableMinor:ledgerRows[0]?.balanceMinor||0,pendingCodMinor,reservedWithdrawalMinor:(withdrawals.requested?.amountMinor||0)+(withdrawals.approved?.amountMinor||0),paidWithdrawalMinor:withdrawals.paid?.payoutMinor||0};
}
async function adminSellerFinance({query={}}={}){
  const rule=await commissionRule({required:false}),limit=Math.min(100,Math.max(1,Number(query.limit)||25)),offset=Math.max(0,Number(query.offset)||0),search=String(query.search||'').trim(),status=String(query.status||'').trim();
  const filter={...(status?{status}:{}),...(search?{$or:[{name:new RegExp(escapeRegex(search),'i')},{storeId:new RegExp(`^${escapeRegex(search)}`,'i')},{handle:new RegExp(escapeRegex(search),'i')}]}:{})};
  const [sellers,total,overview]=await Promise.all([Seller.find(filter).sort({createdAt:-1,_id:-1}).skip(offset).limit(limit).lean(),Seller.countDocuments(filter),sellerFinanceOverview(rule)]);
  const items=await Promise.all(sellers.map(async seller=>{
    const account=await LedgerAccount.findOne({owner:seller.user,kind:'seller_payable',currency:'BDT'}).lean(),totals=await financeTotals({seller,account}),pending=rule?await pendingCodForSeller(seller,rule):{totalMinor:0,count:0};
    return {sellerId:String(seller._id),storeId:seller.storeId,name:seller.name,handle:seller.handle,status:seller.status,currency:'BDT',...totals,pendingCodMinor:pending.totalMinor,pendingCodCount:pending.count,updatedAt:seller.updatedAt};
  }));
  return {currency:'BDT',ready:Boolean(rule),commission:rule,overview,items,nextOffset:offset+items.length<total?offset+items.length:null,total};
}

async function adminSellerFinanceDetail({sellerId,query={}}){
  const seller=await Seller.findById(sellerId).lean();if(!seller)throw notFound('Seller not found.');
  const rule=await commissionRule(),account=await LedgerAccount.findOne({owner:seller.user,kind:'seller_payable',currency:'BDT'}).lean(),limit=Math.min(100,Math.max(1,Number(query.limit)||50));
  const [totals,pending,entries,withdrawals]=await Promise.all([financeTotals({seller,account}),pendingCodForSeller(seller,rule,{limit}),account?LedgerEntry.find({account:account._id}).sort({createdAt:-1,_id:-1}).limit(limit).lean():[],WithdrawalRequest.find({seller:seller._id,sourceKind:'seller_payable'}).sort({createdAt:-1,_id:-1}).limit(limit)]);
  return {seller:{id:String(seller._id),storeId:seller.storeId,name:seller.name,handle:seller.handle,status:seller.status},currency:'BDT',commission:rule,...totals,pendingCodMinor:pending.totalMinor,pendingCodCount:pending.count,pendingOrders:pending.items,entries:entries.map(item=>({id:String(item._id),amountMinor:item.amountMinor,reference:item.reference,metadata:item.metadata||{},createdAt:item.createdAt})),withdrawals:withdrawals.map(withdrawalJson)};
}

module.exports={commissionRule,allocateDiscount,payableForPart,settleSellerPayables,reverseSellerPayable,sellerFinance,adminSellerFinance,adminSellerFinanceDetail};
