const mongoose=require('mongoose');
const {User}=require('../models/account.model');
const {Seller}=require('../models/account.model');
const {Product}=require('../models/catalog.model');
const {Activity}=require('../models/communication.model');
const {NotificationCampaign}=require('../models/marketing.model');
const {AuditEvent}=require('../models/system.model');
const {badRequest,conflict,notFound}=require('../utils/errors');

const output=row=>({id:String(row._id),name:row.title,title:row.title,body:row.body,category:row.category,audience:row.audience,targetType:row.targetType||'none',targetId:row.targetId?String(row.targetId):undefined,status:row.status,scheduledAt:row.scheduledAt,sentAt:row.sentAt,recipientCount:row.recipientCount,reason:row.reason,lastError:row.lastError,version:row.version,createdAt:row.createdAt});
async function listCampaigns(query={}){const limit=Math.min(100,Math.max(1,Number(query.limit)||50)),offset=Math.max(0,Number(query.offset)||0),rows=await NotificationCampaign.find().sort({createdAt:-1,_id:-1}).skip(offset).limit(limit+1).lean();return {items:rows.slice(0,limit).map(output),nextOffset:rows.length>limit?offset+limit:null};}
async function dispatchCampaign(id,{manual=false}={}){
  const now=new Date(),claim=manual?{_id:id,status:{$in:['draft','scheduled','failed']}}:{_id:id,status:'scheduled',scheduledAt:{$lte:now}};
  const campaign=await NotificationCampaign.findOneAndUpdate(claim,{$set:{status:'processing',lastError:''}},{new:true});if(!campaign)return false;
  try{
    const users={suspended:false,...(campaign.audience==='all'?{}:{accountType:campaign.audience})};let operations=[],recipients=0;
    for await(const user of User.find(users).select('_id preferences').lean().cursor()){
      if(campaign.category==='promo'&&user.preferences?.offers===false)continue;
      const target={campaignId:String(campaign._id),...(campaign.targetType==='product'?{productId:String(campaign.targetId)}:campaign.targetType==='store'?{sellerId:String(campaign.targetId)}:{})};operations.push({updateOne:{filter:{user:user._id,campaign:campaign._id},update:{$setOnInsert:{user:user._id,campaign:campaign._id,category:campaign.category,title:campaign.title,body:campaign.body,target}},upsert:true}});recipients++;
      if(operations.length===500){await Activity.bulkWrite(operations,{ordered:false});operations=[];}
    }
    if(operations.length)await Activity.bulkWrite(operations,{ordered:false});campaign.status='sent';campaign.sentAt=new Date();campaign.recipientCount=recipients;await campaign.save();return true;
  }catch(error){campaign.status='failed';campaign.lastError='Delivery job failed. Retry from the admin panel.';await campaign.save().catch(()=>{});throw error;}
}
async function saveCampaign({id,input,actor}){
  const action=input.action,scheduledAt=input.scheduledAt?new Date(input.scheduledAt):undefined;if(action==='schedule'&&(!scheduledAt||scheduledAt<=new Date()))throw badRequest('Choose a future delivery time.');
  if(input.targetType==='product'&&!await Product.exists({_id:input.targetId,status:'approved'}))throw badRequest('Choose an approved product target.');
  if(input.targetType==='store'&&!await Seller.exists({_id:input.targetId,status:'approved'}))throw badRequest('Choose an approved store target.');
  let row;
  if(id){if(!mongoose.isValidObjectId(id))throw notFound('Notification campaign not found.');row=await NotificationCampaign.findOne({_id:id,version:input.version});if(!row)throw conflict('Campaign changed. Refresh and try again.');if(['sent','processing'].includes(row.status))throw conflict('A delivered campaign cannot be edited.');Object.assign(row,{title:input.title,body:input.body,category:input.category,audience:input.audience,targetType:input.targetType,targetId:input.targetId,scheduledAt:action==='schedule'?scheduledAt:undefined,status:action==='schedule'?'scheduled':action==='cancel'?'cancelled':'draft',updatedBy:actor,reason:input.reason});await row.save();}
  else{if(action==='cancel')throw badRequest('A new campaign cannot be cancelled.');row=await NotificationCampaign.create({title:input.title,body:input.body,category:input.category,audience:input.audience,targetType:input.targetType,targetId:input.targetId,scheduledAt:action==='schedule'?scheduledAt:undefined,status:action==='schedule'?'scheduled':'draft',createdBy:actor,updatedBy:actor,reason:input.reason});}
  await AuditEvent.create({actor,action:`notification_campaign.${action}`,target:String(row._id),reason:input.reason,metadata:{audience:row.audience,category:row.category,scheduledAt:row.scheduledAt}});
  if(action==='send')await dispatchCampaign(row._id,{manual:true});return output(await NotificationCampaign.findById(row._id).lean());
}
async function processScheduledCampaigns(){const rows=await NotificationCampaign.find({status:'scheduled',scheduledAt:{$lte:new Date()}}).sort({scheduledAt:1}).limit(20).select('_id').lean();let processed=0,failed=0;for(const row of rows){try{if(await dispatchCampaign(row._id))processed++;}catch{failed++;}}return {processed,failed};}
module.exports={listCampaigns,saveCampaign,dispatchCampaign,processScheduledCampaigns};
