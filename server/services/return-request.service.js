const {Order,ReturnRequest}=require('../models/commerce.model');
const {AuditEvent}=require('../models/system.model');
const {Activity}=require('../models/communication.model');
const {badRequest,notFound,conflict}=require('../utils/errors');

// Called inside the same transaction as the idempotency record.
async function createReturnRequest({orderId,user,input,session}){
  // Writing the parent serializes distinct request keys for the same order.
  const order=await Order.findOneAndUpdate({_id:orderId,user},{$inc:{version:1}},{new:true,session});
  if(!order)throw notFound('Order not found.');
  const part=order.sellerOrders.find(item=>String(item.seller)===input.sellerId);
  if(!part||part.status!=='delivered')throw badRequest('Only delivered seller orders can be returned or exchanged.');
  const wanted=new Set(input.lineIds);
  const lines=order.lines.filter(line=>String(line.seller)===input.sellerId&&wanted.has(String(line._id)));
  if(lines.length!==wanted.size||!lines.length)throw badRequest('Select valid items from this seller order.');
  if(await ReturnRequest.exists({order:order._id,'lines.orderLine':{$in:lines.map(line=>line._id)},status:{$ne:'rejected'}}).session(session)){
    throw conflict('A selected item already has an active or completed return or exchange.');
  }
  const delivered=part.statusHistory.filter(event=>event.status==='delivered').at(-1)?.at;
  const policy=lines.map(line=>input.type==='return'?line.returnDays:line.exchangeDays);
  if(!delivered||policy.some(days=>!Number.isInteger(days)))throw badRequest('The saved delivery or return policy is missing. Contact support for review.');
  const elapsedDays=(Date.now()-new Date(delivered).getTime())/86400000;
  if(elapsedDays<0||policy.some(days=>days<=0||elapsedDays>days))throw badRequest(`The ${input.type} window has expired.`);
  // Allocate the order discount by cumulative line value so rounding cannot
  // refund more than the merchandise amount paid across multiple requests.
  const gross=order.lines.reduce((sum,line)=>sum+line.unitMinor*line.qty,0);
  const discount=order.discountMinor||0;
  if(!Number.isSafeInteger(gross)||gross<=0||!Number.isSafeInteger(discount)||discount<0||discount>gross)throw conflict('Order totals need support review.');
  const promoDiscount=order.promo?.usedMinor||0;
  let cumulative=0,allocated=0,allocatedPromo=0,amountMinor=0,promoRestoreMinor=0;
  for(const line of order.lines){
    const value=line.unitMinor*line.qty;
    cumulative+=value;
    const next=Number(BigInt(discount)*BigInt(cumulative)/BigInt(gross));
    const nextPromo=Number(BigInt(promoDiscount)*BigInt(cumulative)/BigInt(gross));
    if(wanted.has(String(line._id))){amountMinor+=value-(next-allocated);if(order.promo?.account)promoRestoreMinor+=nextPromo-allocatedPromo;}
    allocated=next;allocatedPromo=nextPromo;
  }
  const [created]=await ReturnRequest.create([{
    user,order:order._id,seller:part.seller,type:input.type,reason:input.reason,amountMinor,promoRestoreMinor,currency:order.currency,
    refundDestination:input.type==='return'?input.refundDestination:undefined,
    lines:lines.map(line=>({orderLine:line._id,product:line.product,inventory:line.inventory,title:line.title,image:line.image,color:line.color,size:line.size,qty:line.qty,unitMinor:line.unitMinor})),
    history:[{status:'requested',reason:input.reason,actor:user,at:new Date()}]
  }],{session});
  await AuditEvent.create([{actor:user,action:'return.requested',target:String(created._id),reason:input.reason}],{session});
  await Activity.create([{user,category:'alert',title:`${input.type==='return'?'Return':'Exchange'} requested`,body:'Your request was sent for review.',target:{orderId:String(order._id),returnRequestId:String(created._id),status:'requested'}}],{session});
  return created;
}
module.exports={createReturnRequest};
