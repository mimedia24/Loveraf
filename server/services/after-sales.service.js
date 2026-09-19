const mongoose=require('mongoose');
const {ReturnRequest,Order}=require('../models/commerce.model');
const {Inventory,Product}=require('../models/catalog.model');
const {AuditEvent}=require('../models/system.model');
const {Activity}=require('../models/communication.model');
const {badRequest,notFound,conflict,forbidden}=require('../utils/errors');
const {releasePromo}=require('./promo.service');
const {reverseSellerPayable}=require('./seller-finance.service');
const {reverseReferral}=require('./referral.service');
const {reverseLoyalty}=require('./benefit.service');
const {reverseAffiliate}=require('./affiliate.service');

const transitions={requested:new Set(['approved','rejected']),approved:new Set(['in_transit']),in_transit:new Set(['received']),received:new Set(['refunded','replaced']),rejected:new Set(),refunded:new Set(),replaced:new Set()};

async function transitionReturn({id,status,reason,version,actor,roles=[],restock,settlement,replacement}){
  if(status==='refunded'&&!roles.some(role=>['finance','super_admin'].includes(role)))throw forbidden('Finance permission is required to record a refund.');
  return mongoose.connection.transaction(async session=>{
    const request=await ReturnRequest.findById(id).session(session);if(!request)throw notFound('Return request not found.');
    if(request.version!==version)throw conflict('This return request changed. Reload before updating.');
    if(!transitions[request.status]?.has(status))throw badRequest(`Return request cannot move from ${request.status} to ${status}.`);
    if(status==='refunded'&&request.type!=='return')throw badRequest('Exchange requests must be completed as replaced.');
    if(status==='replaced'&&request.type!=='exchange')throw badRequest('Return requests must be completed as refunded.');
    if(status==='received'){
      if(typeof restock!=='boolean')throw badRequest('Confirm whether the received items are suitable for resale.');
      if(restock)for(const line of request.lines){
        const inventory=await Inventory.updateOne({_id:line.inventory,product:line.product,color:line.color,size:line.size},{$inc:{stock:line.qty}},{session});
        const product=await Product.updateOne({_id:line.product},{$inc:{stock:line.qty}},{session});
        if(inventory.modifiedCount!==1||product.modifiedCount!==1)throw conflict('The original stock record changed. Review inventory before restocking.');
      }
      request.receipt={restocked:restock,at:new Date(),actor};
    }
    if(status==='refunded'){
      if(!settlement||!['bkash','nagad','bank'].includes(settlement.method)||String(settlement.reference||'').trim().length<3)throw badRequest('Record the completed refund method and payment reference.');
      if(settlement.amountMinor!==request.amountMinor)throw badRequest('The refund amount must match the approved amount.');
      const paidAt=new Date(settlement.paidAt);
      if(!Number.isFinite(paidAt.getTime())||paidAt>new Date()||paidAt<request.createdAt)throw badRequest('Enter the actual refund date after this request was created.');
      if(settlement.method!==request.refundDestination?.method)throw badRequest('Use the refund method selected by the customer.');
      const order=await Order.findById(request.order).session(session);if(!order)throw conflict('The original order is unavailable for payment reconciliation.');
      if(!['paid','partially_refunded'].includes(order.payment?.status))throw badRequest('A completed payment collection is required before recording a refund.');
      const paidMinor=order.payment?.amountMinor??order.totalMinor,previousRefunded=order.payment?.refundedMinor||0,nextRefunded=previousRefunded+request.amountMinor;
      if(!Number.isSafeInteger(paidMinor)||!Number.isSafeInteger(nextRefunded)||request.amountMinor<=0||nextRefunded>paidMinor)throw conflict('Refund totals exceed the collected payment. Finance review is required.');
      request.settlement={method:settlement.method,reference:settlement.reference.trim(),amountMinor:settlement.amountMinor,paidAt,recordedAt:new Date(),actor};
      for(const line of request.lines){
        const product=await Product.updateOne({_id:line.product,soldUnits:{$gte:line.qty}},{$inc:{soldUnits:-line.qty}},{session});
        if(product.modifiedCount!==1)throw conflict('Product sales totals need review before completing the refund.');
      }
      await releasePromo({order,amountMinor:request.promoRestoreMinor||0,reference:`promo:return:${request._id}:restore`,session});
      await reverseSellerPayable({order,request,session});
      order.payment.refundedMinor=nextRefunded;order.payment.status=nextRefunded===paidMinor?'refunded':'partially_refunded';order.payment.version=(order.payment.version||0)+1;await order.save({session});
      if(nextRefunded===paidMinor)await reverseReferral({order,session});
      await reverseLoyalty({order,request,fullRefund:nextRefunded===paidMinor,session});
      await reverseAffiliate({order,request,fullRefund:nextRefunded===paidMinor,session});
    }
    if(status==='replaced'){
      if(!replacement||String(replacement.courier||'').trim().length<2||String(replacement.tracking||'').trim().length<2)throw badRequest('Record the replacement courier and tracking reference.');
      for(const line of request.lines){
        const inventory=await Inventory.updateOne({_id:line.inventory,product:line.product,color:line.color,size:line.size,stock:{$gte:line.qty}},{$inc:{stock:-line.qty}},{session});
        const product=await Product.updateOne({_id:line.product,stock:{$gte:line.qty}},{$inc:{stock:-line.qty}},{session});
        if(inventory.modifiedCount!==1||product.modifiedCount!==1)throw conflict('Replacement stock is unavailable. Review inventory before dispatch.');
      }
      request.replacement={courier:replacement.courier.trim(),tracking:replacement.tracking.trim(),dispatchedAt:new Date(),actor};
    }
    request.status=status;request.history.push({status,reason,actor,at:new Date()});await request.save({session});
    await AuditEvent.create([{actor,action:`return.${status}`,target:String(request._id),reason}],{session});
    await Activity.create([{user:request.user,category:'alert',title:`${request.type==='return'?'Return':'Exchange'} ${status}`,body:reason||`Your request is now ${status}.`,target:{orderId:String(request.order),returnRequestId:String(request._id),status}}],{session});return request;
  });
}
module.exports={transitionReturn};
