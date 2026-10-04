require('dotenv').config();
const {connectDatabase,disconnectDatabase}=require('../config/database');
const {Seller}=require('../models/account.model');
const {BusinessRule}=require('../models/system.model');
const {validateBusinessRule}=require('../services/business-rule.service');
async function run(){await connectDatabase();const rule=await BusinessRule.findOne({key:'seller_commission',enabled:true}).lean();const commissionPercent=rule?validateBusinessRule('seller_commission',true,rule.data).platformFeePercent:0;const result=await Seller.updateMany({status:'approved','financeConfig.commissionPercent':{$exists:false}},{$set:{financeConfig:{commissionPercent,configuredAt:new Date()}}});console.log(JSON.stringify({matched:result.matchedCount,updated:result.modifiedCount,commissionPercent,source:rule?'published-rule':'default'}));}
run().catch(error=>{console.error(error.message);process.exitCode=1;}).finally(()=>disconnectDatabase());
