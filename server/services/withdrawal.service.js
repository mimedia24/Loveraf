const mongoose=require('mongoose');
const idempotent=require('./idempotency.service');
const {BusinessRule,LedgerAccount,LedgerEntry,WithdrawalRequest,AuditEvent}=require('../models/system.model');
const {Activity}=require('../models/communication.model');
const {rewardsAvailable,validateBusinessRule}=require('./business-rule.service');
const {AppError,badRequest,notFound,conflict}=require('../utils/errors');
const {verifiedDestination,destinationJson}=require('./payout-profile.service');

const json=(item,{includeSensitive=false}={})=>({id:String(item._id),sourceKind:item.sourceKind||'earnings',sellerId:item.seller?String(item.seller._id||item.seller):undefined,sellerName:item.seller?.name,amountMinor:item.amountMinor,feeMinor:item.feeMinor,payoutMinor:item.payoutMinor,currency:item.currency,destination:destinationJson(item.destination,{sensitive:includeSensitive}),status:item.status,version:item.version,history:item.history||[],settlement:item.settlement?.reference?item.settlement:undefined,createdAt:item.createdAt,updatedAt:item.updatedAt});

async function withdrawalRule({requireRewards=true}={}){
  if(requireRewards&&!await rewardsAvailable())throw new AppError(503,'PROVIDER_UNAVAILABLE','Withdrawals are not available yet.');
  const rule=await BusinessRule.findOne({key:'withdrawal',enabled:true}).lean();
  if(!rule)throw new AppError(503,'PROVIDER_UNAVAILABLE','Withdrawals are not available yet.');
  return validateBusinessRule('withdrawal',true,rule.data);
}

async function createWithdrawal({owner,input,key,sourceKind='earnings',seller}){
  const rule=await withdrawalRule({requireRewards:sourceKind!=='seller_payable'});
  if(input.amountMinor<rule.minimumMinor)throw badRequest(`Minimum withdrawal is BDT ${(rule.minimumMinor/100).toFixed(2)}.`);
  if(input.amountMinor<=rule.feeMinor)throw badRequest('Withdrawal amount must be greater than the fee.');
  if(!['earnings','seller_payable'].includes(sourceKind)||(sourceKind==='seller_payable'&&!seller))throw badRequest('Select a valid withdrawal balance.');
  const destination=sourceKind==='seller_payable'?await verifiedDestination({sellerId:seller,version:input.payoutProfileVersion,legacy:input.destination}):input.destination;
  if(!rule.allowedMethods.includes(destination.method))throw badRequest('This withdrawal method is not enabled.');
  const idempotencyInput={...input,sourceKind,sellerId:seller?String(seller):undefined};
  return idempotent(owner,key,idempotencyInput,async session=>{
    const account=await LedgerAccount.findOneAndUpdate({owner,kind:sourceKind,currency:'BDT'},{$setOnInsert:{owner,kind:sourceKind,currency:'BDT'},$inc:{version:1}},{upsert:true,new:true,session});
    const [total]=await LedgerEntry.aggregate([{$match:{account:account._id}},{$group:{_id:null,balance:{$sum:'$amountMinor'}}}]).session(session);
    if((total?.balance||0)<input.amountMinor)throw badRequest(`Available ${sourceKind==='seller_payable'?'seller payable':'earnings'} balance is too low for this withdrawal.`);
    const id=new mongoose.Types.ObjectId(),now=new Date();
    const [request]=await WithdrawalRequest.create([{_id:id,owner,account:account._id,sourceKind,seller,amountMinor:input.amountMinor,feeMinor:rule.feeMinor,payoutMinor:input.amountMinor-rule.feeMinor,destination,status:'requested',history:[{status:'requested',actor:owner,at:now}]}],{session});
    await LedgerEntry.create([{account:account._id,amountMinor:-input.amountMinor,reference:`withdrawal:${id}:reserve`,metadata:{title:'Withdrawal reserved',withdrawalId:String(id)}}],{session});
    await Activity.create([{user:owner,category:'alert',title:'Withdrawal requested',body:`Your ${sourceKind==='seller_payable'?'seller payable':'earnings'} balance has been reserved for review.`,target:{withdrawalId:String(id),status:'requested'}}],{session});
    return json(request);
  });
}

async function listWithdrawals(owner,query={},filter={sourceKind:'earnings'}){
  await withdrawalRule({requireRewards:filter.sourceKind!=='seller_payable'});
  const limit=Math.min(100,Math.max(1,Number(query.limit)||20)),offset=Math.max(0,Number(query.offset)||0);
  const rows=await WithdrawalRequest.find({owner,...filter}).sort({createdAt:-1,_id:-1}).skip(offset).limit(limit+1);
  return {items:rows.slice(0,limit).map(json),nextOffset:rows.length>limit?offset+limit:null};
}

const transitions={requested:new Set(['approved','rejected']),approved:new Set(['paid','rejected']),rejected:new Set(),paid:new Set()};
async function transitionWithdrawal({id,input,actor}){
  return mongoose.connection.transaction(async session=>{
    const item=await WithdrawalRequest.findOne({_id:id,version:input.version}).session(session);
    if(!item)throw conflict('This withdrawal changed. Reload first.');
    if(!transitions[item.status]?.has(input.status))throw badRequest(`Withdrawal cannot move from ${item.status} to ${input.status}.`);
    if(input.status==='rejected')await LedgerEntry.create([{account:item.account,amountMinor:item.amountMinor,reference:`withdrawal:${item._id}:release`,metadata:{title:'Withdrawal released',withdrawalId:String(item._id)}}],{session});
    item.status=input.status;item.history.push({status:input.status,reason:input.reason,actor,at:new Date()});
    if(input.status==='paid')item.settlement={reference:input.settlement.reference,paidAt:new Date(input.settlement.paidAt),actor};
    await item.save({session});
    await AuditEvent.create([{actor,action:`withdrawal.${input.status}`,target:String(item._id),reason:input.reason,metadata:input.status==='paid'?{reference:input.settlement.reference}:undefined}],{session});
    await Activity.create([{user:item.owner,category:'alert',title:`Withdrawal ${input.status}`,body:input.reason,target:{withdrawalId:String(item._id),status:input.status}}],{session});
    return json(item);
  });
}

module.exports={withdrawalRule,createWithdrawal,listWithdrawals,transitionWithdrawal,json};
