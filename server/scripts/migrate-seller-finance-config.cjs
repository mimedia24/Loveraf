require('dotenv').config();
const {connectDatabase,disconnectDatabase}=require('../config/database');
const {Seller}=require('../models/account.model');
const {BusinessRule}=require('../models/system.model');
const {validateBusinessRule}=require('../services/business-rule.service');
async function run(){await connectDatabase();const rule=await BusinessRule.findOne({key:'seller_commission',enabled:true}).lean();if(!rule)throw new Error('Enabled seller_commission rule is required.');const data=validateBusinessRule('seller_commission',true,rule.data);const result=await Seller.updateMany({status:'approved','financeConfig.commissionPercent':{$exists:false}},{$set:{financeConfig:{commissionPercent:data.platformFeePercent,configuredAt:new Date()}}});console.log(JSON.stringify({matched:result.matchedCount,updated:result.modifiedCount,commissionPercent:data.platformFeePercent}));}
run().catch(error=>{console.error(error.message);process.exitCode=1;}).finally(()=>disconnectDatabase());
