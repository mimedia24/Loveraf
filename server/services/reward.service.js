const {BusinessRule,LedgerAccount,LedgerEntry}=require('../models/system.model');
const {AppError,badRequest}=require('../utils/errors');
const {rewardsAvailable,validateBusinessRule}=require('./business-rule.service');

function pagination(query={}){
  const rawLimit=query.limit===undefined?20:Number(query.limit);
  const rawOffset=query.offset===undefined?0:Number(query.offset);
  if(!Number.isInteger(rawLimit)||rawLimit<1||rawLimit>100||!Number.isInteger(rawOffset)||rawOffset<0)throw badRequest('Invalid wallet pagination.');
  return {limit:rawLimit,offset:rawOffset};
}

async function walletSnapshot(owner,query={}){
  if(!await rewardsAvailable())throw new AppError(503,'PROVIDER_UNAVAILABLE','Wallet and rewards are not available yet.');
  const {limit,offset}=pagination(query);
  const [accounts,withdrawalDocument,promoDocument]=await Promise.all([
    LedgerAccount.find({owner}).lean(),
    BusinessRule.findOne({key:'withdrawal',enabled:true}).lean(),
    BusinessRule.findOne({key:'promo_usage',enabled:true}).lean(),
  ]);
  const withdrawal=validateBusinessRule('withdrawal',true,withdrawalDocument.data);
  const promo=validateBusinessRule('promo_usage',true,promoDocument.data);
  const accountIds=accounts.map(item=>item._id);
  const totals=accountIds.length?await LedgerEntry.aggregate([
    {$match:{account:{$in:accountIds}}},
    {$group:{_id:'$account',balanceMinor:{$sum:'$amountMinor'}}},
  ]):[];
  const totalsByAccount=new Map(totals.map(item=>[String(item._id),item.balanceMinor]));
  const balances={promo:0,earnings:0,pending_earnings:0,pending_promo:0};
  for(const account of accounts)balances[account.kind]=(balances[account.kind]||0)+(totalsByAccount.get(String(account._id))||0);
  const rows=accountIds.length?await LedgerEntry.find({account:{$in:accountIds}}).sort({createdAt:-1,_id:-1}).skip(offset).limit(limit+1).lean():[];
  const kindByAccount=new Map(accounts.map(item=>[String(item._id),item.kind]));
  return {
    currency:'BDT',
    balances,
    withdrawal,
    promo,
    entries:rows.slice(0,limit).map(item=>({id:String(item._id),kind:kindByAccount.get(String(item.account)),amountMinor:item.amountMinor,reference:item.reference,metadata:item.metadata||{},createdAt:item.createdAt})),
    nextOffset:rows.length>limit?offset+limit:null,
  };
}

module.exports={walletSnapshot,pagination};
