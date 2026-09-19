const {test}=require('node:test');
const assert=require('node:assert/strict');
const mongoose=require('mongoose');
const {MongoMemoryReplSet}=require('mongodb-memory-server');
const {Order}=require('../models/commerce.model');
const {AuditEvent}=require('../models/system.model');
const {updateShipment,transitionSellerOrder}=require('../services/order.service');

test('manual shipment updates are atomic and delivery does not imply COD collection',async()=>{
  const replica=await MongoMemoryReplSet.create({replSet:{count:1}});
  try{
    await mongoose.connect(replica.getUri('shipment_test'));
    await Promise.all([Order.init(),AuditEvent.init()]);
    const actor=new mongoose.Types.ObjectId(),seller=new mongoose.Types.ObjectId();
    const order=await Order.create({user:actor,status:'packing',paymentMethod:'cod',payment:{status:'pending'},sellerOrders:[{seller,status:'packing',version:0}],lines:[]});
    const input={orderId:order.id,sellerId:seller,actor,version:0,shipment:{courier:'Manual courier',tracking:'TRACK-123',status:'in_transit'}};
    const results=await Promise.allSettled([updateShipment(input),updateShipment(input)]);
    assert.equal(results.filter(result=>result.status==='fulfilled').length,1);
    const saved=await Order.findById(order.id);
    assert.equal(saved.status,'shipped');
    assert.equal(saved.sellerOrders[0].version,1);
    assert.equal(await AuditEvent.countDocuments({target:order.id,action:'shipment.update'}),1);
    await assert.rejects(updateShipment({...input,version:1,shipment:{...input.shipment,status:'delivered'}}),/order status/);
    await assert.rejects(updateShipment({...input,version:1,shipment:{...input.shipment,status:'booked'}}),/cannot return to booked/);
    await transitionSellerOrder({orderId:order.id,sellerId:seller,actor,version:1,status:'delivered'});
    const delivered=await Order.findById(order.id);
    assert.equal(delivered.status,'delivered');
    assert.equal(delivered.payment.status,'pending');
    assert.equal(delivered.sellerOrders[0].shipment.status,'delivered');
  }finally{
    await mongoose.disconnect();
    await replica.stop();
  }
});
