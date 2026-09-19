const {test}=require('node:test');
const assert=require('node:assert/strict');
const {validateBusinessRule}=require('../services/business-rule.service');
const {providerCapabilities}=require('../config/environment');
const schemas=require('../validation/schemas');

test('reward rules require complete bounded values and an audited update reason',()=>{
  assert.deepEqual(validateBusinessRule('promo_usage',false,{}),{});
  assert.deepEqual(validateBusinessRule('promo_usage',true,{maxDiscountPercent:10,minimumOrderMinor:10000,expiryDays:90}),{maxDiscountPercent:10,minimumOrderMinor:10000,expiryDays:90});
  assert.deepEqual(validateBusinessRule('referral',true,{inviterRewardMinor:10000,inviteePromoMinor:10000,releaseAfterDays:7,requireFirstDeliveredOrder:true}).releaseAfterDays,7);
  assert.deepEqual(validateBusinessRule('withdrawal',true,{minimumMinor:50000,feeMinor:1000,allowedMethods:['bkash','bank']}).allowedMethods,['bkash','bank']);
  assert.equal(validateBusinessRule('membership',true,{monthlyMinor:23900,annualMinor:199000,trialDays:7}).trialDays,7);
  assert.throws(()=>validateBusinessRule('promo_usage',true,{maxDiscountPercent:101}),error=>error.code==='VALIDATION_ERROR');
  assert.throws(()=>validateBusinessRule('referral',true,{inviterRewardMinor:0,inviteePromoMinor:0,releaseAfterDays:0,requireFirstDeliveredOrder:true}),error=>error.code==='VALIDATION_ERROR');
  assert.throws(()=>validateBusinessRule('withdrawal',true,{minimumMinor:50000,feeMinor:0,allowedMethods:['cash']}),error=>error.code==='VALIDATION_ERROR');
  assert.throws(()=>validateBusinessRule('unknown',false,{}),error=>error.code==='VALIDATION_ERROR');
  assert.equal(schemas.businessRuleUpdate.safeParse({body:{enabled:false,version:0,data:{},reason:'Reviewed configuration'},query:{},params:{}}).success,true);
  assert.equal(schemas.businessRuleUpdate.safeParse({body:{enabled:true,version:0,data:{},reason:''},query:{},params:{}}).success,false);
  assert.equal(Object.hasOwn(providerCapabilities(),'rewards'),false);
  assert.equal(providerCapabilities().localization,true);
  assert.equal(schemas.profileUpdate.safeParse({body:{preferences:{language:'bn'}},query:{},params:{}}).success,true);
  assert.equal(schemas.profileUpdate.safeParse({body:{preferences:{language:'hi'}},query:{},params:{}}).success,false);
});
