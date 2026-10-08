const mongoose=require('mongoose');
const {Schema,model}=mongoose;
const options={timestamps:true,versionKey:'version'};
const imageSchema=new Schema({mediaId:{type:Schema.Types.ObjectId,ref:'Media'},uri:String},{_id:false});
const productModelSchema=new Schema({id:String,imageId:String,name:String,sortOrder:Number},{_id:false});
const variantSchema=new Schema({
  id:String,key:String,modelId:String,name:String,swatch:String,imageIds:[String],
  attributes:{type:Schema.Types.Mixed},sku:String,
  priceMinor:{type:Number,min:0},oldPriceMinor:{type:Number,min:0},regularPriceMinor:{type:Number,min:0},discountPriceMinor:{type:Number,min:0},active:{type:Boolean,default:true},
},{_id:false});
const Media=model('Media',new Schema({owner:{type:Schema.Types.ObjectId,ref:'User',required:true,index:true},publicId:String,uri:{type:String,required:true},mime:String,bytes:Number},options));
const productSchema=new Schema({seller:{type:Schema.Types.ObjectId,ref:'Seller',required:true,index:true},title:{type:String,required:true},description:String,brand:String,subCategoryId:String,subCategory:String,tags:[String],seo:{slug:String,title:String,description:String},sellerCostMinor:{type:Number,min:0,select:false},taxSnapshot:{enabled:Boolean,mode:String,ratePercent:Number,fixedMinor:Number,categoryId:String},video:{mediaId:{type:Schema.Types.ObjectId,ref:'Media'},uri:String,mime:String},sizeChart:{title:String,unit:String,columns:[String],rows:[Schema.Types.Mixed],imageId:String,imageUri:String},categoryId:{type:String,trim:true,maxlength:100,index:true},category:{type:String,index:true},sku:{type:String,required:true,immutable:true},priceMinor:{type:Number,required:true,min:0},oldPriceMinor:Number,stock:{type:Number,required:true,min:0},stockPerCombination:{type:Number,min:0},sizes:[String],images:[imageSchema],models:[productModelSchema],variants:[variantSchema],returnDays:Number,exchangeDays:Number,deliveryMinDays:Number,deliveryMaxDays:Number,codAvailable:Boolean,status:{type:String,enum:['draft','pending','approved','rejected','archived'],default:'pending',index:true},moderationReason:String,soldUnits:{type:Number,default:0},ratingTotal:{type:Number,default:0},ratingCount:{type:Number,default:0}},options);
productSchema.index({seller:1,sku:1},{unique:true});
productSchema.index({title:'text',description:'text',category:'text',tags:'text'});
const Product=model('Product',productSchema);
Product.schema.index({status:1,createdAt:-1,_id:-1});
Product.schema.index({seller:1,createdAt:-1,_id:-1});
Product.schema.index({status:1,category:1,createdAt:-1,_id:-1});
Product.schema.index({status:1,soldUnits:-1,createdAt:-1,_id:-1});
Product.schema.index({status:1,priceMinor:1,_id:1});
const inventorySchema=new Schema({product:{type:Schema.Types.ObjectId,ref:'Product',required:true,index:true},variantId:String,variantKey:String,modelId:String,attributes:{type:Schema.Types.Mixed},sku:String,color:{type:String,default:''},size:{type:String,default:''},stock:{type:Number,required:true,min:0},reserved:{type:Number,default:0,min:0}},options);
inventorySchema.index({product:1,color:1,size:1});
inventorySchema.index({product:1,variantKey:1},{unique:true,sparse:true});
const Inventory=model('Inventory',inventorySchema);
const engagementSchema=new Schema({user:{type:Schema.Types.ObjectId,ref:'User',required:true,index:true},product:{type:Schema.Types.ObjectId,ref:'Product',required:true,index:true},kind:{type:String,enum:['wishlist','recent','compare'],required:true,index:true}},options);
engagementSchema.index({user:1,product:1,kind:1},{unique:true});const ProductEngagement=model('ProductEngagement',engagementSchema);
ProductEngagement.schema.index({user:1,kind:1,updatedAt:-1});
const followedSellerSchema=new Schema({user:{type:Schema.Types.ObjectId,ref:'User',required:true,index:true},seller:{type:Schema.Types.ObjectId,ref:'Seller',required:true,index:true}},options);
followedSellerSchema.index({user:1,seller:1},{unique:true});const FollowedSeller=model('FollowedSeller',followedSellerSchema);
const reportSchema=new Schema({reporter:{type:Schema.Types.ObjectId,ref:'User',required:true,index:true},product:{type:Schema.Types.ObjectId,ref:'Product',required:true,index:true},reason:{type:String,required:true},status:{type:String,enum:['open','reviewing','resolved','dismissed'],default:'open',index:true}},options);
reportSchema.index({reporter:1,product:1,status:1});const Report=model('Report',reportSchema);
const reviewSchema=new Schema({user:{type:Schema.Types.ObjectId,ref:'User',required:true,index:true},product:{type:Schema.Types.ObjectId,ref:'Product',required:true,index:true},seller:{type:Schema.Types.ObjectId,ref:'Seller',required:true,index:true},order:{type:Schema.Types.ObjectId,ref:'Order',required:true,index:true},rating:{type:Number,required:true,min:1,max:5},body:{type:String,required:true},status:{type:String,enum:['pending','published','rejected'],default:'pending',index:true},moderationReason:String,sellerReply:{body:String,at:Date}},{...options,optimisticConcurrency:true});
reviewSchema.index({user:1,product:1},{unique:true});const Review=model('Review',reviewSchema);
Review.schema.index({seller:1,status:1,createdAt:-1,_id:-1});
Review.schema.index({product:1,status:1,createdAt:-1,_id:-1});
module.exports={Media,Product,Inventory,ProductEngagement,FollowedSeller,Report,Review};
