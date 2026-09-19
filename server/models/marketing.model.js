const {Schema,model}=require('mongoose');
const options={timestamps:true,versionKey:'version'};

const couponSchema=new Schema({
  code:{type:String,required:true,trim:true,uppercase:true,minlength:3,maxlength:30,unique:true},
  name:{type:String,required:true,trim:true,maxlength:100},
  description:{type:String,default:'',trim:true,maxlength:300},
  discountType:{type:String,required:true,enum:['percent','fixed']},
  discountValue:{type:Number,required:true,min:1},
  minimumOrderMinor:{type:Number,default:0,min:0},
  maximumDiscountMinor:{type:Number,min:1},
  startsAt:{type:Date,required:true},endAt:{type:Date,required:true},
  totalLimit:{type:Number,required:true,min:1},perUserLimit:{type:Number,required:true,min:1},
  redemptionCount:{type:Number,default:0,min:0},enabled:{type:Boolean,default:false,index:true},
  createdBy:{type:Schema.Types.ObjectId,ref:'User'},updatedBy:{type:Schema.Types.ObjectId,ref:'User'},
},options);
couponSchema.set('optimisticConcurrency',true);
couponSchema.index({enabled:1,startsAt:1,endAt:1});

const couponRedemptionSchema=new Schema({
  coupon:{type:Schema.Types.ObjectId,ref:'Coupon',required:true,index:true},
  user:{type:Schema.Types.ObjectId,ref:'User',required:true,index:true},
  order:{type:Schema.Types.ObjectId,ref:'Order',required:true,index:true},
  discountMinor:{type:Number,required:true,min:1},
  status:{type:String,enum:['applied','reversed'],default:'applied',index:true},
  reversedAt:Date,
},options);
couponRedemptionSchema.index({coupon:1,user:1,order:1},{unique:true});
couponRedemptionSchema.index({coupon:1,user:1,status:1});
const couponUsageSchema=new Schema({coupon:{type:Schema.Types.ObjectId,ref:'Coupon',required:true},user:{type:Schema.Types.ObjectId,ref:'User',required:true},count:{type:Number,default:0,min:0}},options);
couponUsageSchema.index({coupon:1,user:1},{unique:true});
const referralSchema=new Schema({
  inviter:{type:Schema.Types.ObjectId,ref:'User',required:true,index:true},invitee:{type:Schema.Types.ObjectId,ref:'User',required:true,unique:true},code:{type:String,required:true},
  status:{type:String,enum:['attributed','pending','released','reversed'],default:'attributed',index:true},
  qualifyingOrder:{type:Schema.Types.ObjectId,ref:'Order'},inviterRewardMinor:{type:Number,default:0,min:0},inviteePromoMinor:{type:Number,default:0,min:0},releaseAfterDays:{type:Number,default:0,min:0},eligibleAt:Date,releasedAt:Date,reversedAt:Date,
},options);
referralSchema.index({status:1,eligibleAt:1});
const loyaltyEntrySchema=new Schema({owner:{type:Schema.Types.ObjectId,ref:'User',required:true,index:true},points:{type:Number,required:true,validate:{validator:value=>Number.isSafeInteger(value)&&value!==0,message:'Points must be a non-zero integer.'}},reference:{type:String,required:true,trim:true},metadata:{type:Schema.Types.Mixed,default:{}}},options);
loyaltyEntrySchema.index({owner:1,reference:1},{unique:true});loyaltyEntrySchema.index({owner:1,createdAt:-1,_id:-1});
const giftCardSchema=new Schema({codeHash:{type:String,required:true,unique:true,select:false},lastFour:{type:String,required:true},amountMinor:{type:Number,required:true,min:1},status:{type:String,enum:['issued','redeemed','expired','revoked'],default:'issued',index:true},expiresAt:{type:Date,required:true,index:true},issuedBy:{type:Schema.Types.ObjectId,ref:'User',required:true},redeemedBy:{type:Schema.Types.ObjectId,ref:'User'},redeemedAt:Date,reason:String},options);
giftCardSchema.set('optimisticConcurrency',true);
const membershipEntitlementSchema=new Schema({user:{type:Schema.Types.ObjectId,ref:'User',required:true,index:true},plan:{type:String,enum:['monthly','annual'],required:true},status:{type:String,enum:['active','expired','revoked'],default:'active',index:true},startsAt:{type:Date,required:true},endsAt:{type:Date,required:true,index:true},grantedBy:{type:Schema.Types.ObjectId,ref:'User'},reason:String},options);
membershipEntitlementSchema.set('optimisticConcurrency',true);
membershipEntitlementSchema.index({user:1,status:1,endsAt:-1});
const donationCampaignSchema=new Schema({title:{type:String,required:true,trim:true,maxlength:160},description:{type:String,required:true,trim:true,maxlength:1000},goalMinor:{type:Number,required:true,min:1},raisedMinor:{type:Number,default:0,min:0},startsAt:{type:Date,required:true},endsAt:{type:Date,required:true},status:{type:String,enum:['draft','active','closed'],default:'draft',index:true},verified:{type:Boolean,default:false},createdBy:{type:Schema.Types.ObjectId,ref:'User'},updatedBy:{type:Schema.Types.ObjectId,ref:'User'}},options);donationCampaignSchema.set('optimisticConcurrency',true);donationCampaignSchema.index({status:1,startsAt:1,endsAt:1});
const affiliateLinkSchema=new Schema({owner:{type:Schema.Types.ObjectId,ref:'User',required:true,index:true},product:{type:Schema.Types.ObjectId,ref:'Product',required:true,index:true},code:{type:String,required:true,unique:true,uppercase:true},clicks:{type:Number,default:0,min:0},enabled:{type:Boolean,default:true,index:true}},options);affiliateLinkSchema.index({owner:1,product:1},{unique:true});
affiliateLinkSchema.set('optimisticConcurrency',true);
const affiliateAttributionSchema=new Schema({link:{type:Schema.Types.ObjectId,ref:'AffiliateLink',required:true},owner:{type:Schema.Types.ObjectId,ref:'User',required:true,index:true},buyer:{type:Schema.Types.ObjectId,ref:'User',required:true,index:true},order:{type:Schema.Types.ObjectId,ref:'Order',required:true,unique:true},code:{type:String,required:true},grossMinor:{type:Number,required:true,min:1},commissionMinor:{type:Number,required:true,min:1},reversedMinor:{type:Number,default:0,min:0},ratePercent:{type:Number,required:true,min:1,max:100},releaseAfterDays:{type:Number,required:true,min:0,max:365},status:{type:String,enum:['attributed','pending','released','reversed'],default:'attributed',index:true},eligibleAt:Date,releasedAt:Date,reversedAt:Date},options);affiliateAttributionSchema.index({status:1,eligibleAt:1});affiliateAttributionSchema.index({owner:1,createdAt:-1,_id:-1});
const notificationCampaignSchema=new Schema({title:{type:String,required:true,trim:true,maxlength:160},body:{type:String,required:true,trim:true,maxlength:1000},category:{type:String,enum:['alert','promo'],required:true},audience:{type:String,enum:['all','personal','seller'],required:true},targetType:{type:String,enum:['none','product','store'],default:'none'},targetId:{type:Schema.Types.ObjectId},status:{type:String,enum:['draft','scheduled','processing','sent','cancelled','failed'],default:'draft',index:true},scheduledAt:Date,sentAt:Date,recipientCount:{type:Number,default:0,min:0},createdBy:{type:Schema.Types.ObjectId,ref:'User'},updatedBy:{type:Schema.Types.ObjectId,ref:'User'},reason:String,lastError:String},options);notificationCampaignSchema.set('optimisticConcurrency',true);notificationCampaignSchema.index({status:1,scheduledAt:1});
const Coupon=model('Coupon',couponSchema),CouponRedemption=model('CouponRedemption',couponRedemptionSchema),CouponUsage=model('CouponUsage',couponUsageSchema),Referral=model('Referral',referralSchema),LoyaltyEntry=model('LoyaltyEntry',loyaltyEntrySchema),GiftCard=model('GiftCard',giftCardSchema),MembershipEntitlement=model('MembershipEntitlement',membershipEntitlementSchema),DonationCampaign=model('DonationCampaign',donationCampaignSchema),AffiliateLink=model('AffiliateLink',affiliateLinkSchema),AffiliateAttribution=model('AffiliateAttribution',affiliateAttributionSchema),NotificationCampaign=model('NotificationCampaign',notificationCampaignSchema);
module.exports={Coupon,CouponRedemption,CouponUsage,Referral,LoyaltyEntry,GiftCard,MembershipEntitlement,DonationCampaign,AffiliateLink,AffiliateAttribution,NotificationCampaign};
