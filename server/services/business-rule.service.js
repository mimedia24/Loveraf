const {z}=require('zod');
const {badRequest}=require('../utils/errors');
const {BusinessRule,Feature}=require('../models/system.model');

const money=z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
const schemas={
  promo_usage:z.object({maxDiscountPercent:z.number().int().min(1).max(100),minimumOrderMinor:money,expiryDays:z.number().int().min(1).max(3650)}).strict(),
  referral:z.object({inviterRewardMinor:money,inviteePromoMinor:money,releaseAfterDays:z.number().int().min(0).max(365),requireFirstDeliveredOrder:z.boolean()}).strict().refine(value=>value.inviterRewardMinor>0||value.inviteePromoMinor>0,{message:'At least one referral reward must be positive.'}),
  withdrawal:z.object({minimumMinor:money,feeMinor:money,allowedMethods:z.array(z.enum(['bkash','nagad','bank'])).min(1).max(3)}).strict(),
  membership:z.object({monthlyMinor:money,annualMinor:money,trialDays:z.number().int().min(0).max(90)}).strict().refine(value=>value.monthlyMinor>0||value.annualMinor>0,{message:'At least one membership price must be positive.'}),
  loyalty:z.object({spendMinorPerPoint:z.number().int().min(1).max(Number.MAX_SAFE_INTEGER),minimumRedeemPoints:z.number().int().min(1).max(1000000),redeemMinorPerPoint:z.number().int().min(1).max(1000000)}).strict(),
  affiliate:z.object({commissionPercent:z.number().int().min(1).max(100),releaseAfterDays:z.number().int().min(0).max(365)}).strict(),
  seller_commission:z.object({platformFeePercent:z.number().int().min(0).max(100)}).strict(),
};
const rewardRuleKeys=['promo_usage','withdrawal'];
const featureRules={rewards:rewardRuleKeys,referral:['referral'],affiliate:['affiliate'],loyalty:['loyalty'],membership:['membership']};

async function configuredFeatureAvailable(featureKey,ruleKey){
  if(!await Feature.exists({key:featureKey,enabled:true}))return false;
  const row=await BusinessRule.findOne({key:ruleKey,enabled:true}).lean();
  if(!row)return false;
  try{validateBusinessRule(ruleKey,true,row.data);return true;}catch{return false;}
}

function validateBusinessRule(key,enabled,data){
  const schema=schemas[key];
  if(!schema)throw badRequest('Unknown business rule.');
  if(!enabled&&Object.keys(data||{}).length===0)return {};
  const result=schema.safeParse(data);
  if(!result.success)throw badRequest('Complete every required business rule value before saving.',result.error.flatten().fieldErrors);
  return result.data;
}

async function rewardConfigurationReady(){
  return rulesReady(rewardRuleKeys);
}

async function rulesReady(keys){
  const rows=await BusinessRule.find({key:{$in:keys}}).lean(),byKey=new Map(rows.map(row=>[row.key,row]));
  return keys.every(key=>{const row=byKey.get(key);if(!row?.enabled)return false;try{validateBusinessRule(key,true,row.data);return true;}catch{return false;}});
}

async function featureReadiness(key,{ignoreOwnFeature=false}={}){
  const own=await Feature.findOne({key}).lean(),missing=[];
  if(!ignoreOwnFeature&&!own?.enabled)missing.push(`feature:${key}`);
  const dependencies={referral:['rewards'],affiliate:['rewards'],loyalty:['rewards'],gift_cards:['rewards']}[key]||[];
  for(const dependency of dependencies){if(!await Feature.exists({key:dependency,enabled:true})||!await rulesReady(featureRules[dependency]||[]))missing.push(`feature:${dependency}`);}
  for(const ruleKey of featureRules[key]||[]){const row=await BusinessRule.findOne({key:ruleKey}).lean();let valid=Boolean(row?.enabled);if(valid){try{validateBusinessRule(ruleKey,true,row.data);}catch{valid=false;}}if(!valid)missing.push(`rule:${ruleKey}`);}
  const ready=missing.length===0;
  return {key,enabled:Boolean(own?.enabled),ready,status:Boolean(own?.enabled)&&ready?'live':ready?'ready':'setup_required',missingRequirements:missing,version:own?.version||0};
}

async function rewardsAvailable(){
  return Boolean(await Feature.exists({key:'rewards',enabled:true}))&&await rewardConfigurationReady();
}

module.exports={validateBusinessRule,rewardConfigurationReady,rewardsAvailable,configuredFeatureAvailable,featureReadiness,rulesReady,schemas,rewardRuleKeys};
