const {test}=require('node:test');
const assert=require('node:assert/strict');
const mongoose=require('mongoose');
const {MongoMemoryReplSet}=require('mongodb-memory-server');
const {Order,ReturnRequest,MutationKey}=require('../models/commerce.model');
const {AuditEvent}=require('../models/system.model');
const {createReturnRequest}=require('../services/return-request.service');
const {Seller}=require('../models/account.model');
const CommerceController=require('../controllers/commerce.controller');

test('returns protect purchased lines across concurrent requests and completed refunds',async()=>{
  const replica=await MongoMemoryReplSet.create({replSet:{count:1}});
  try{
    await mongoose.connect(replica.getUri('return_test'));
    await Promise.all([Order.init(),ReturnRequest.init(),MutationKey.init(),AuditEvent.init()]);
    const user=new mongoose.Types.ObjectId(),seller=new mongoose.Types.ObjectId();
    await Seller.create({_id:seller,user,name:'Private seller',handle:'private-seller'});
    const order=await Order.create({user,discountMinor:101,currency:'BDT',lines:[
      {seller,title:'First',qty:1,unitMinor:10000,returnDays:3,exchangeDays:3},
      {seller,title:'Second',qty:1,unitMinor:10000,returnDays:3,exchangeDays:3}
    ],sellerOrders:[{seller,status:'delivered',statusHistory:[{status:'delivered',at:new Date()}]}]});
    const input={sellerId:String(seller),type:'return',reason:'Item arrived damaged',lineIds:[String(order.lines[0]._id)],refundDestination:{method:'bank',account:'test-account'}};
    const submit=(body=input,owner=user,id=order.id)=>mongoose.connection.transaction(session=>createReturnRequest({orderId:id,user:owner,input:body,session}));
    const results=await Promise.allSettled([submit(),submit()]);
    assert.equal(results.filter(item=>item.status==='fulfilled').length,1);
    const first=results.find(item=>item.status==='fulfilled').value;
    assert.equal(first.amountMinor,9950);
    assert.equal(await ReturnRequest.countDocuments({order:order.id}),1);
    assert.equal(await AuditEvent.countDocuments({action:'return.requested'}),1);
    await ReturnRequest.updateOne({_id:first.id},{status:'refunded'});
    let sellerQueue;
    await new CommerceController().sellerReturns({auth:{user:{_id:user,accountType:'seller'}},params:{id:String(seller)}},{json:value=>{sellerQueue=value;}});
    assert.ok(sellerQueue.length);
    assert.equal(sellerQueue[0].refundDestination,undefined);
    await assert.rejects(submit(),/active or completed/);
    await assert.rejects(submit({...input,type:'exchange'}),/active or completed/);
    await assert.rejects(submit(input,new mongoose.Types.ObjectId()),/Order not found/);
    const second=await submit({...input,lineIds:[String(order.lines[1]._id)]});
    assert.equal(second.amountMinor,9949);
    assert.equal(first.amountMinor+second.amountMinor,20000-101);
    await ReturnRequest.updateOne({_id:second.id},{status:'rejected'});
    assert.ok(await submit({...input,lineIds:[String(order.lines[1]._id)]}));
    const legacy=await Order.create({user,lines:[{seller,qty:1,unitMinor:1000}],sellerOrders:[{seller,status:'delivered',statusHistory:[{status:'delivered',at:new Date()}]}]});
    await assert.rejects(submit({...input,lineIds:[String(legacy.lines[0]._id)]},user,legacy.id),/policy is missing/);
    assert.equal(await ReturnRequest.countDocuments({order:legacy.id}),0);
  }finally{
    await mongoose.disconnect();
    await replica.stop();
  }
});
