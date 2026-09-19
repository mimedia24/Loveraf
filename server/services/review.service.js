const mongoose=require('mongoose');
const {Review,Product}=require('../models/catalog.model');
const {Order}=require('../models/commerce.model');
const {AuditEvent}=require('../models/system.model');
const {badRequest,notFound,conflict}=require('../utils/errors');

async function createReview({user,productId,input}){
  const product=await Product.findById(productId);
  if(!product)throw notFound('Purchased product no longer exists.');
  const order=await Order.findOne({user,'lines.product':product._id,sellerOrders:{$elemMatch:{seller:product.seller,status:'delivered'}},...(input.orderId?{_id:input.orderId}:{})}).sort({createdAt:-1});
  const part=order?.sellerOrders.find(item=>String(item.seller)===String(product.seller));
  if(!order||part?.status!=='delivered')throw badRequest('Only a delivered purchase can be reviewed.');
  const review=await Review.create({user,product:product._id,seller:product.seller,order:order._id,rating:input.rating,body:input.body});
  await AuditEvent.create({actor:user,action:'review.submit',target:String(review._id),metadata:{productId:String(product._id)}});
  return review;
}

async function moderateReview({id,status,reason,version,actor}){
  return mongoose.connection.transaction(async session=>{
    const review=await Review.findById(id).session(session);
    if(!review)throw notFound('Review not found.');
    if(review.version!==version)throw conflict('This review changed. Reload before deciding.');
    const wasPublished=review.status==='published',willPublish=status==='published';
    if(review.status===status)throw badRequest(`Review is already ${status}.`);
    const updated=await Review.updateOne({_id:review._id,version},{$set:{status,moderationReason:reason},$inc:{version:1}},{session});
    if(updated.modifiedCount!==1)throw conflict('This review changed. Reload before deciding.');
    if(wasPublished!==willPublish){
      const direction=willPublish?1:-1;
      const product=await Product.updateOne({_id:review.product,...(!willPublish?{ratingCount:{$gte:1},ratingTotal:{$gte:review.rating}}:{})},{$inc:{ratingCount:direction,ratingTotal:direction*review.rating}},{session});
      if(product.modifiedCount!==1)throw conflict('Product rating totals need review.');
    }
    await AuditEvent.create([{actor,action:`review.${status}`,target:String(review._id),reason}],{session});
    return Review.findById(review._id).session(session);
  });
}
module.exports={createReview,moderateReview};
