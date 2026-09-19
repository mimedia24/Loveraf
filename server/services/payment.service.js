const mongoose=require('mongoose');
const {Order}=require('../models/commerce.model');
const {AuditEvent}=require('../models/system.model');
const {Activity}=require('../models/communication.model');
const {badRequest,notFound,conflict}=require('../utils/errors');
const {settleSellerPayables}=require('./seller-finance.service');
const {qualifyReferral}=require('./referral.service');
const {awardLoyalty}=require('./benefit.service');
const {qualifyAffiliate}=require('./affiliate.service');

async function settleCod({orderId,input,actor}){
  return mongoose.connection.transaction(async session=>{
    const order=await Order.findById(orderId).session(session);
    if(!order)throw notFound('Order not found.');
    if(order.paymentMethod!=='cod')throw badRequest('Only cash-on-delivery collection can be recorded here.');
    if(!order.sellerOrders.length||order.sellerOrders.some(part=>!['delivered','cancelled'].includes(part.status))||!order.sellerOrders.some(part=>part.status==='delivered'))throw badRequest('Record collection only after every seller part is delivered or cancelled.');
    if(order.payment?.status!=='pending')throw badRequest('This order payment is already resolved.');
    const version=order.payment?.version||0;
    if(version!==input.version)throw conflict('This payment changed. Reload before recording collection.');
    if(input.amountMinor!==order.totalMinor)throw badRequest('Collected amount must match the current payable order total.');
    const collectedAt=new Date(input.collectedAt);
    if(!Number.isFinite(collectedAt.getTime())||collectedAt>new Date()||collectedAt<order.createdAt)throw badRequest('Enter the actual collection time after the order was created.');
    const reference=input.reference.trim();
    const updated=await Order.updateOne({_id:order._id,'payment.status':'pending',$or:[{'payment.version':version},...(!order.payment?.version?[{'payment.version':{$exists:false}}]:[])]},{$set:{'payment.status':'paid','payment.reference':reference,'payment.amountMinor':input.amountMinor,'payment.collectedAt':collectedAt,'payment.recordedAt':new Date(),'payment.actor':actor},$inc:{'payment.version':1}},{session});
    if(updated.modifiedCount!==1)throw conflict('This payment changed. Reload before recording collection.');
    await settleSellerPayables(order,session);
    await qualifyReferral(order,session);
    await awardLoyalty(order,session);
    await qualifyAffiliate(order,session);
    await AuditEvent.create([{actor,action:'payment.cod_collected',target:String(order._id),metadata:{reference,amountMinor:input.amountMinor,collectedAt}}],{session});
    await Activity.create([{user:order.user,category:'order',title:'COD payment received',body:'Cash-on-delivery collection was recorded.',target:{orderId:String(order._id),status:'paid'}}],{session});
    return Order.findById(order._id).session(session);
  });
}

module.exports={settleCod};
