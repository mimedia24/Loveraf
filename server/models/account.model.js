const mongoose=require('mongoose');
const {Schema,model}=mongoose;
const options={timestamps:true,versionKey:'version'};

const User=model('User',new Schema({
  name:{type:String,required:true,trim:true,maxlength:120},
  email:{type:String,trim:true,lowercase:true,sparse:true,unique:true,index:true},
  phone:{type:String,trim:true,sparse:true,unique:true,index:true},
  passwordHash:{type:String,required:true,select:false},
  emailVerified:{type:Boolean,default:false},phoneVerified:{type:Boolean,default:false},
  roles:{type:[String],default:['buyer']},suspended:{type:Boolean,default:false},
  language:{type:String,default:'en'},preferences:{type:Schema.Types.Mixed,default:{}},twoStepEnabled:{type:Boolean,default:false}
},options));
const Session=model('Session',new Schema({user:{type:Schema.Types.ObjectId,ref:'User',required:true,index:true},jtiHash:{type:String,required:true,unique:true},device:{type:Schema.Types.Mixed,default:{}},mfaAt:Date,expiresAt:{type:Date,required:true,index:{expires:0}},revokedAt:Date},options));
const Verification=model('Verification',new Schema({user:{type:Schema.Types.ObjectId,ref:'User',index:true},target:{type:String,required:true,index:true},channel:{type:String,enum:['email','phone'],required:true},purpose:{type:String,enum:['verify','recovery','admin'],required:true},codeHash:{type:String,required:true,select:false},attempts:{type:Number,default:0},expiresAt:{type:Date,required:true,index:{expires:0}},usedAt:Date},options));
const Address=model('Address',new Schema({user:{type:Schema.Types.ObjectId,ref:'User',required:true,index:true},title:String,name:String,mobile:String,division:String,district:String,details:String,isDefault:{type:Boolean,default:false}},options));
const Seller=model('Seller',new Schema({user:{type:Schema.Types.ObjectId,ref:'User',required:true,index:true},name:{type:String,required:true},handle:{type:String,required:true,lowercase:true,unique:true},category:String,status:{type:String,enum:['pending','approved','rejected','suspended'],default:'pending'},moderationReason:String},options));
module.exports={User,Session,Verification,Address,Seller};
