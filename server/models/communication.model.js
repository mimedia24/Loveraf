const mongoose=require('mongoose');
const {Schema,model}=mongoose;
const options={timestamps:true,versionKey:'version'};
const Conversation=model('Conversation',new Schema({kind:{type:String,enum:['support','seller'],required:true},members:[{type:Schema.Types.ObjectId,ref:'User'}],seller:{type:Schema.Types.ObjectId,ref:'Seller'},lastMessageAt:{type:Date,default:Date.now}},options));
const Message=model('Message',new Schema({conversation:{type:Schema.Types.ObjectId,ref:'Conversation',required:true,index:true},sender:{type:Schema.Types.ObjectId,ref:'User',required:true},body:{type:String,required:true,maxlength:4000},attachments:[{uri:String,mime:String}],readBy:[{type:Schema.Types.ObjectId,ref:'User'}]},options));
const Activity=model('Activity',new Schema({user:{type:Schema.Types.ObjectId,ref:'User',required:true,index:true},category:{type:String,enum:['chat','order','alert','promo'],required:true},title:String,body:String,target:Schema.Types.Mixed,readAt:Date},options));
module.exports={Conversation,Message,Activity};
