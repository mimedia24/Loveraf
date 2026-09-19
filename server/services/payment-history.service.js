const {Order,ReturnRequest}=require('../models/commerce.model');

const orderEntry=row=>({id:`order:${row._id}`,type:'purchase',direction:'debit',orderId:String(row._id),method:row.paymentMethod||row.payment?.provider||'unknown',status:row.payment?.status||'pending',amountMinor:row.payment?.amountMinor??row.totalMinor??0,currency:row.currency||'BDT',reference:row.payment?.reference||'',occurredAt:row.payment?.recordedAt||row.payment?.collectedAt||row.createdAt});
const refundEntry=row=>({id:`refund:${row._id}`,type:'refund',direction:'credit',orderId:String(row.order),method:row.settlement?.method||'unknown',status:'paid',amountMinor:row.settlement?.amountMinor??row.amountMinor??0,currency:row.currency||'BDT',reference:row.settlement?.reference||'',occurredAt:row.settlement?.paidAt||row.updatedAt});

async function paymentHistory(owner,query={}){
  const limit=Math.min(100,Math.max(1,Number(query.limit)||20)),offset=Math.min(10000,Math.max(0,Number(query.offset)||0)),take=offset+limit+1;
  const [orders,refunds]=await Promise.all([Order.find({user:owner}).sort({createdAt:-1}).limit(take).lean(),ReturnRequest.find({user:owner,status:'refunded','settlement.reference':{$type:'string'}}).sort({'settlement.paidAt':-1}).limit(take).lean()]);
  const combined=[...orders.map(orderEntry),...refunds.map(refundEntry)].sort((a,b)=>new Date(b.occurredAt).getTime()-new Date(a.occurredAt).getTime());
  return {items:combined.slice(offset,offset+limit),nextOffset:combined.length>offset+limit?offset+limit:null};
}
module.exports={paymentHistory};
