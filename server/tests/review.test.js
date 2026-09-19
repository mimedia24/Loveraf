const {test}=require('node:test');
const assert=require('node:assert/strict');
const mongoose=require('mongoose');
const {MongoMemoryReplSet}=require('mongodb-memory-server');
const {Product,Review}=require('../models/catalog.model');
const {Order}=require('../models/commerce.model');
const {AuditEvent}=require('../models/system.model');
const {createReview,moderateReview}=require('../services/review.service');
const CatalogController=require('../controllers/catalog.controller');

test('only delivered purchases publish into product rating totals',async()=>{
  const replica=await MongoMemoryReplSet.create({replSet:{count:1}});
  try{
    await mongoose.connect(replica.getUri('review_test'));
    await Promise.all([Product.init(),Review.init(),Order.init(),AuditEvent.init()]);
    const user=new mongoose.Types.ObjectId(),other=new mongoose.Types.ObjectId(),seller=new mongoose.Types.ObjectId(),actor=new mongoose.Types.ObjectId();
    const product=await Product.create({seller,title:'Delivered item',sku:'REVIEW-1',priceMinor:5000,stock:8,soldUnits:2,status:'archived'});
    const order=await Order.create({user,lines:[{seller,product:product._id,qty:2,unitMinor:5000}],sellerOrders:[{seller,status:'delivered'}]});
    await Order.insertMany(Array.from({length:21},()=>({user,lines:[{seller,product:product._id,qty:1,unitMinor:5000}],sellerOrders:[{seller,status:'confirmed'}]})));
    const input={orderId:String(order._id),rating:4,body:'The delivered item matched its description.'};
    await assert.rejects(createReview({user:other,productId:product._id,input}),/delivered purchase/);
    const review=await createReview({user,productId:product._id,input:{rating:4,body:input.body}});
    assert.equal(review.status,'pending');
    assert.equal((await Product.findById(product.id)).ratingCount,0);
    await assert.rejects(createReview({user,productId:product._id,input}),error=>error.code===11000);
    const publish={id:review.id,status:'published',reason:'Purchase and content checked.',version:0,actor};
    const results=await Promise.allSettled([moderateReview(publish),moderateReview(publish)]);
    assert.equal(results.filter(item=>item.status==='fulfilled').length,1);
    let rated=await Product.findById(product.id);
    assert.equal(rated.ratingCount,1);assert.equal(rated.ratingTotal,4);
    const published=await Review.findById(review.id);
    let replyPayload;
    await new CatalogController().replyReview({params:{reviewId:review.id},seller:{_id:seller},validated:{body:{body:'Thank you for sharing your experience.'}},auth:{user:{_id:actor}}},{json:value=>{replyPayload=value;}});
    assert.equal(replyPayload.sellerReply.body,'Thank you for sharing your experience.');
    await Product.updateOne({_id:product.id},{status:'approved'});
    let publicPayload;
    await new CatalogController().reviews({params:{productId:product.id},query:{},},{json:value=>{publicPayload=value;}});
    assert.equal(publicPayload.items.length,1);assert.equal(publicPayload.items[0].reviewer,undefined);assert.equal(publicPayload.items[0].sellerReply.body,'Thank you for sharing your experience.');
    const replied=await Review.findById(review.id);
    await moderateReview({id:review.id,status:'rejected',reason:'Removed after moderation review.',version:replied.version,actor});
    rated=await Product.findById(product.id);
    assert.equal(rated.ratingCount,0);assert.equal(rated.ratingTotal,0);
    assert.equal(await AuditEvent.countDocuments({target:review.id}),4);
  }finally{
    await mongoose.disconnect();await replica.stop();
  }
});
