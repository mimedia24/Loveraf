const {test}=require('node:test');
const assert=require('node:assert/strict');
const mongoose=require('mongoose');
const {MongoMemoryReplSet}=require('mongodb-memory-server');

test('COD settlement creates isolated rule-based seller payables once',async()=>{
  const replica=await MongoMemoryReplSet.create({replSet:{count:1}});
  try{
    await mongoose.connect(replica.getUri('seller_finance_test'));
    const {User,Seller}=require('../models/account.model');
    const {Order}=require('../models/commerce.model');
    const {BusinessRule,LedgerAccount,LedgerEntry,AuditEvent}=require('../models/system.model');
    const {Activity}=require('../models/communication.model');
    const {settleCod}=require('../services/payment.service');
    const {sellerFinance,settleSellerPayables}=require('../services/seller-finance.service');
    await Promise.all([Order.init(),LedgerAccount.init(),LedgerEntry.init(),AuditEvent.init(),Activity.init()]);
    const [ownerA,ownerB]=await User.create([{name:'Seller A',email:'seller-a-finance@example.test',passwordHash:'not-used',accountType:'seller',roles:['seller']},{name:'Seller B',email:'seller-b-finance@example.test',passwordHash:'not-used',accountType:'seller',roles:['seller']}]);
    const [sellerA,sellerB]=await Seller.create([{user:ownerA._id,name:'Seller A',handle:'seller-a-finance',status:'approved'},{user:ownerB._id,name:'Seller B',handle:'seller-b-finance',status:'approved'}]);
    const skippedOrder=await Order.create({user:new mongoose.Types.ObjectId(),paymentMethod:'cod',discountMinor:0,totalMinor:10000,sellerOrders:[{seller:sellerA._id,status:'delivered',subtotalMinor:10000}],lines:[]});
    assert.equal(await settleSellerPayables(skippedOrder,null),false);
    assert.equal(await LedgerEntry.countDocuments(),0);
    await BusinessRule.create({key:'seller_commission',enabled:true,data:{platformFeePercent:10}});
    const order=await Order.create({user:new mongoose.Types.ObjectId(),status:'completed',subtotalMinor:30000,discountMinor:3000,deliveryMinor:0,feeMinor:4000,totalMinor:31000,paymentMethod:'cod',payment:{provider:'cash',status:'pending'},sellerOrders:[{seller:sellerA._id,status:'delivered',subtotalMinor:10000},{seller:sellerB._id,status:'delivered',subtotalMinor:20000},{seller:new mongoose.Types.ObjectId(),status:'cancelled',subtotalMinor:5000}],lines:[]});
    await settleCod({orderId:order.id,actor:new mongoose.Types.ObjectId(),input:{reference:'COD-SELLER-FINANCE-1',amountMinor:31000,collectedAt:new Date().toISOString(),version:0}});
    const financeA=await sellerFinance({seller:sellerA}),financeB=await sellerFinance({seller:sellerB});
    assert.equal(financeA.balanceMinor,8100);
    assert.equal(financeB.balanceMinor,16200);
    assert.equal(financeA.commission.platformFeePercent,10);
    assert.equal(financeA.entries[0].metadata.discountMinor,1000);
    assert.equal(financeB.entries[0].metadata.discountMinor,2000);
    assert.equal(await LedgerEntry.countDocuments({reference:{$regex:`^seller-order:${order.id}:`}}),2);
    await assert.rejects(settleCod({orderId:order.id,actor:new mongoose.Types.ObjectId(),input:{reference:'COD-SELLER-FINANCE-2',amountMinor:31000,collectedAt:new Date().toISOString(),version:1}}),/already resolved/);
    assert.equal((await sellerFinance({seller:sellerA})).balanceMinor,8100);
  }finally{await mongoose.disconnect();await replica.stop();}
});
