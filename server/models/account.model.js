const mongoose=require('mongoose');
const {Schema,model}=mongoose;
const options={timestamps:true,versionKey:'version'};

const User=model('User',new Schema({
  name:{type:String,required:true,trim:true,maxlength:120},
  accountType:{type:String,enum:['personal','seller'],default:'personal',required:true},
  email:{type:String,trim:true,lowercase:true},
  phone:{type:String,trim:true},
  passwordHash:{type:String,required:true,select:false},
  emailVerified:{type:Boolean,default:false},phoneVerified:{type:Boolean,default:false},
  roles:{type:[String],default:['buyer']},suspended:{type:Boolean,default:false},
  referralCode:{type:String,trim:true,uppercase:true},referredBy:{type:Schema.Types.ObjectId,ref:'User'},
  loyaltyVersion:{type:Number,default:0,min:0},
  language:{type:String,default:'en'},preferences:{type:Schema.Types.Mixed,default:{}},twoStepEnabled:{type:Boolean,default:false}
},options));
User.schema.index({accountType:1,email:1},{unique:true,partialFilterExpression:{email:{$type:'string'}}});
User.schema.index({accountType:1,phone:1},{unique:true,partialFilterExpression:{phone:{$type:'string'}}});
User.schema.index({referralCode:1},{unique:true,partialFilterExpression:{referralCode:{$type:'string'}}});
const Session=model('Session',new Schema({user:{type:Schema.Types.ObjectId,ref:'User',required:true,index:true},jtiHash:{type:String,required:true,unique:true},device:{type:Schema.Types.Mixed,default:{}},mfaAt:Date,expiresAt:{type:Date,required:true,index:{expires:0}},revokedAt:Date},options));
Session.schema.index({user:1,revokedAt:1,createdAt:-1});
const Verification=model('Verification',new Schema({user:{type:Schema.Types.ObjectId,ref:'User',index:true},target:{type:String,required:true,index:true},channel:{type:String,enum:['email','phone'],required:true},purpose:{type:String,enum:['verify','recovery','admin'],required:true},codeHash:{type:String,required:true,select:false},attempts:{type:Number,default:0},expiresAt:{type:Date,required:true,index:{expires:0}},usedAt:Date},options));
const Address=model('Address',new Schema({user:{type:Schema.Types.ObjectId,ref:'User',required:true,index:true},title:String,name:String,mobile:String,division:String,district:String,details:String,isDefault:{type:Boolean,default:false}},options));
Address.schema.index({user:1,createdAt:1});
const sellerSchema=new Schema({
  user:{type:Schema.Types.ObjectId,ref:'User',required:true,index:true},
  name:{type:String,required:true},
  storeId:{type:String,match:/^\d{6}$/},
  handle:{type:String,required:true,lowercase:true,unique:true},
  categoryId:{type:String,trim:true,maxlength:100},category:String,
  email:String,phone:String,address:String,
  location:{latitude:{type:Number,min:-90,max:90},longitude:{type:Number,min:-180,max:180},accuracy:{type:Number,min:0,max:100000},address:{type:String,maxlength:500},capturedAt:Date},
  logo:{mediaId:{type:Schema.Types.ObjectId,ref:'Media'},uri:String},status:{type:String,enum:['draft','pending','approved','rejected','suspended'],default:'pending'},moderationReason:String
},options);
sellerSchema.index({storeId:1},{unique:true,partialFilterExpression:{storeId:{$type:'string'}}});
const Seller=model('Seller',sellerSchema);
const paymentMethodSchema=new Schema({user:{type:Schema.Types.ObjectId,ref:'User',required:true,index:true},provider:{type:String,required:true,maxlength:50},providerCustomerRef:{type:String,required:true,maxlength:200},providerMethodRef:{type:String,required:true,maxlength:200},type:{type:String,enum:['card','mobile_wallet'],required:true},brand:{type:String,maxlength:50},lastFour:String,phoneLastFour:String,expiryMonth:{type:Number,min:1,max:12},expiryYear:{type:Number,min:2020,max:2200},isDefault:{type:Boolean,default:false}},options);
paymentMethodSchema.path('lastFour').validate(value=>!value||/^\d{4}$/.test(value),'Invalid masked card digits.');paymentMethodSchema.path('phoneLastFour').validate(value=>!value||/^\d{4}$/.test(value),'Invalid masked phone digits.');paymentMethodSchema.index({user:1,provider:1,providerMethodRef:1},{unique:true});paymentMethodSchema.index({user:1,isDefault:-1,createdAt:-1});
const PaymentMethod=model('PaymentMethod',paymentMethodSchema);
module.exports={User,Session,Verification,Address,Seller,PaymentMethod};
