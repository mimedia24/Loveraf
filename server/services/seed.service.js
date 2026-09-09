const {Feature,BusinessRule}=require('../models/system.model');
async function seedSystem(){await Feature.bulkWrite(['account','catalog','cart','commerce','chat','online_payment','courier','rewards'].map(key=>({updateOne:{filter:{key},update:{$setOnInsert:{key,enabled:['account','catalog','cart','commerce','chat'].includes(key)}},upsert:true}})));await BusinessRule.bulkWrite(['promo_usage','referral','withdrawal','membership'].map(key=>({updateOne:{filter:{key},update:{$setOnInsert:{key,enabled:false,data:{}}},upsert:true}})));}
module.exports={seedSystem};
