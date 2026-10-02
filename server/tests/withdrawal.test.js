const {test}=require('node:test');
const assert=require('node:assert/strict');
const request=require('supertest');
const {MongoMemoryReplSet}=require('mongodb-memory-server');

test('withdrawals reserve earnings once and require finance evidence to settle',async()=>{
  process.env.NODE_ENV='test';
  process.env.JWT_ACCESS_SECRET='withdrawal-test-access-secret-with-at-least-32-characters';
  process.env.OTP_HMAC_SECRET='withdrawal-test-otp-secret-with-at-least-32-characters';
  process.env.JWT_ISSUER='loveraf-withdrawal-test';
  const replica=await MongoMemoryReplSet.create({replSet:{count:1}});
  process.env.MONGODB_URI=replica.getUri('loveraf_withdrawal_test');
  const {connectDatabase,disconnectDatabase}=require('../config/database');
  await connectDatabase();
  const {createApplication}=require('../app');
  const runtime=createApplication({deliver:async()=>{}});
  const auth=token=>({Authorization:`Bearer ${token}`});
  const key=value=>`00000000-0000-4000-8000-${String(value).padStart(12,'0')}`;
  try{
    const buyerRegistration=await request(runtime.app).post('/api/v1/auth/register').send({name:'Withdrawal Buyer',email:'withdrawal@example.test',password:'CorrectWithdrawalPassword1'});
    const financeRegistration=await request(runtime.app).post('/api/v1/auth/register').send({name:'Finance Admin',email:'finance-withdrawal@example.test',password:'CorrectWithdrawalPassword2'});
    assert.equal(buyerRegistration.status,201);
    assert.equal(financeRegistration.status,201);
    const buyerToken=buyerRegistration.body.token,financeToken=financeRegistration.body.token;
    const buyerId=buyerRegistration.body.user.id,financeId=financeRegistration.body.user.id;
    const {User}=require('../models/account.model');
    const {Feature,BusinessRule,Content,LedgerAccount,LedgerEntry,WithdrawalRequest}=require('../models/system.model');
    const {MutationKey}=require('../models/commerce.model');
    await Promise.all([LedgerAccount.syncIndexes(),LedgerEntry.syncIndexes(),WithdrawalRequest.syncIndexes(),MutationKey.syncIndexes()]);
    await User.updateOne({_id:financeId},{roles:['buyer','finance']});
    await Content.create({key:'categories',data:[{id:'men',name:'Men',art:'hoodie',color:'#DDE7FF'}]});
    await Feature.create({key:'rewards',enabled:true});
    await BusinessRule.create([
      {key:'promo_usage',enabled:true,data:{maxDiscountPercent:10,minimumOrderMinor:10000,expiryDays:90}},
      {key:'referral',enabled:true,data:{inviterRewardMinor:10000,inviteePromoMinor:10000,releaseAfterDays:7,requireFirstDeliveredOrder:true}},
      {key:'withdrawal',enabled:true,data:{minimumMinor:50000,feeMinor:1000,allowedMethods:['bkash','bank']}},
      {key:'seller_commission',enabled:true,data:{platformFeePercent:10}},
      {key:'membership',enabled:true,data:{monthlyMinor:23900,annualMinor:199000,trialDays:7}},
    ]);
    const sellerRegistration=await request(runtime.app).post('/api/v1/auth/seller/register').send({name:'Payout Shop',email:'seller-payout@example.test',phone:'01811112222',password:'CorrectSellerPayoutPassword1',categoryId:'men',address:'Dhaka',location:{latitude:23.8103,longitude:90.4125,accuracy:10,address:'Dhaka',capturedAt:new Date().toISOString()}});
    assert.equal(sellerRegistration.status,201);
    const sellerToken=sellerRegistration.body.token;
    const {Seller}=require('../models/account.model');
    const seller=await Seller.findOneAndUpdate({user:sellerRegistration.body.user.id},{status:'approved'},{new:true});
    const payable=await LedgerAccount.create({owner:sellerRegistration.body.user.id,kind:'seller_payable'});
    await LedgerEntry.create({account:payable._id,amountMinor:90000,reference:'seller-order:payout-test:payable'});
    const earnings=await LedgerAccount.create({owner:buyerId,kind:'earnings'});
    await LedgerEntry.create({account:earnings._id,amountMinor:150000,reference:'commission:withdrawal-test',metadata:{title:'Seller commission'}});
    const input={amountMinor:60000,destination:{method:'bkash',account:'01800000000'}};

    assert.equal((await request(runtime.app).post('/api/v1/me/withdrawals').set(auth(buyerToken)).send(input)).status,400);
    assert.equal((await request(runtime.app).post('/api/v1/me/withdrawals').set(auth(buyerToken)).set('Idempotency-Key',key(1)).send({...input,amountMinor:49999})).status,400);
    assert.equal((await request(runtime.app).post('/api/v1/me/withdrawals').set(auth(buyerToken)).set('Idempotency-Key',key(2)).send({...input,destination:{method:'nagad',account:'01800000000'}})).status,400);

    const first=await request(runtime.app).post('/api/v1/me/withdrawals').set(auth(buyerToken)).set('Idempotency-Key',key(3)).send(input);
    assert.equal(first.status,201);
    assert.equal(first.body.status,'requested');
    assert.equal(first.body.feeMinor,1000);
    assert.equal(first.body.payoutMinor,59000);
    const repeated=await request(runtime.app).post('/api/v1/me/withdrawals').set(auth(buyerToken)).set('Idempotency-Key',key(3)).send(input);
    assert.equal(repeated.status,201);
    assert.equal(repeated.body.id,first.body.id);
    assert.equal(await WithdrawalRequest.countDocuments({owner:buyerId}),1);
    assert.equal(await LedgerEntry.countDocuments({reference:`withdrawal:${first.body.id}:reserve`}),1);
    assert.equal((await request(runtime.app).post('/api/v1/me/withdrawals').set(auth(buyerToken)).set('Idempotency-Key',key(3)).send({...input,amountMinor:70000})).status,409);

    const wallet=await request(runtime.app).get('/api/v1/me/wallet').set(auth(buyerToken));
    assert.equal(wallet.body.balances.earnings,90000);
    const ownList=await request(runtime.app).get('/api/v1/me/withdrawals').set(auth(buyerToken));
    assert.equal(ownList.status,200);
    assert.equal(ownList.body.items.length,1);
    assert.equal(ownList.body.items[0].sourceKind,'earnings');
    assert.equal((await request(runtime.app).get('/api/v1/admin/seller-finance').set(auth(buyerToken))).status,403);
    const sellerFinanceOverview=await request(runtime.app).get('/api/v1/admin/seller-finance').set(auth(financeToken));
    assert.equal(sellerFinanceOverview.status,200);
    assert.ok(sellerFinanceOverview.body.items.some(item=>item.sellerId===seller.id&&item.availableMinor===90000));
    assert.equal((await request(runtime.app).get(`/api/v1/admin/seller-finance/${seller.id}`).set(auth(financeToken))).status,200);
    await Feature.updateOne({key:'rewards'},{$set:{enabled:false}});
    const sellerPayout=await request(runtime.app).post(`/api/v1/me/sellers/${seller.id}/withdrawals`).set(auth(sellerToken)).set('Idempotency-Key',key(10)).send(input);
    assert.equal(sellerPayout.status,201);
    assert.equal(sellerPayout.body.sourceKind,'seller_payable');
    assert.equal(sellerPayout.body.sellerId,seller.id);
    const repeatedSellerPayout=await request(runtime.app).post(`/api/v1/me/sellers/${seller.id}/withdrawals`).set(auth(sellerToken)).set('Idempotency-Key',key(10)).send(input);
    assert.equal(repeatedSellerPayout.body.id,sellerPayout.body.id);
    const sellerPayouts=await request(runtime.app).get(`/api/v1/me/sellers/${seller.id}/withdrawals`).set(auth(sellerToken));
    assert.equal(sellerPayouts.status,200);
    assert.equal(sellerPayouts.body.items.length,1);
    assert.equal((await request(runtime.app).get(`/api/v1/me/sellers/${seller.id}/withdrawals`).set(auth(buyerToken))).status,404);
    await Feature.updateOne({key:'rewards'},{$set:{enabled:true}});
    assert.equal((await request(runtime.app).get('/api/v1/me/withdrawals').set(auth(sellerToken))).body.items.length,0);
    assert.equal((await request(runtime.app).get('/api/v1/admin/withdrawals').set(auth(buyerToken))).status,403);
    const adminList=await request(runtime.app).get('/api/v1/admin/withdrawals?paginated=true&limit=20').set(auth(financeToken));
    assert.equal(adminList.status,200);
    assert.ok(adminList.body.items.some(item=>item.id===first.body.id&&item.sourceKind==='earnings'));
    assert.ok(adminList.body.items.some(item=>item.id===sellerPayout.body.id&&item.sourceKind==='seller_payable'&&item.seller.id===seller.id));

    const approve=await request(runtime.app).patch(`/api/v1/admin/withdrawals/${first.body.id}/status`).set(auth(financeToken)).send({status:'approved',version:0,reason:'Identity and balance checked'});
    assert.equal(approve.status,200);
    assert.equal(approve.body.status,'approved');
    assert.equal((await request(runtime.app).patch(`/api/v1/admin/withdrawals/${first.body.id}/status`).set(auth(financeToken)).send({status:'paid',version:1,reason:'Paid by finance'})).status,400);
    const paid=await request(runtime.app).patch(`/api/v1/admin/withdrawals/${first.body.id}/status`).set(auth(financeToken)).send({status:'paid',version:1,reason:'Paid by finance',settlement:{reference:'BKASH-TXN-0001',paidAt:new Date().toISOString()}});
    assert.equal(paid.status,200);
    assert.equal(paid.body.status,'paid');
    assert.equal(paid.body.settlement.reference,'BKASH-TXN-0001');
    assert.equal((await request(runtime.app).patch(`/api/v1/admin/withdrawals/${first.body.id}/status`).set(auth(financeToken)).send({status:'rejected',version:1,reason:'Stale finance action'})).status,409);

    const second=await request(runtime.app).post('/api/v1/me/withdrawals').set(auth(buyerToken)).set('Idempotency-Key',key(4)).send(input);
    assert.equal(second.status,201);
    const rejected=await request(runtime.app).patch(`/api/v1/admin/withdrawals/${second.body.id}/status`).set(auth(financeToken)).send({status:'rejected',version:0,reason:'Destination could not be verified'});
    assert.equal(rejected.status,200);
    assert.equal(rejected.body.status,'rejected');
    assert.equal((await request(runtime.app).get('/api/v1/me/wallet').set(auth(buyerToken))).body.balances.earnings,90000);
    assert.equal(await LedgerEntry.countDocuments({reference:`withdrawal:${second.body.id}:release`}),1);
    const financeSummary=await request(runtime.app).get('/api/v1/admin/finance-summary').set(auth(financeToken));
    assert.equal(financeSummary.status,200);
    assert.equal(financeSummary.body.earningsLiabilityMinor,90000);
    assert.equal(financeSummary.body.sellerPayableMinor,30000);
    assert.equal(financeSummary.body.openWithdrawalCount,1);
    assert.equal(financeSummary.body.openWithdrawalMinor,60000);
    assert.equal(financeSummary.body.paidWithdrawalMinor,59000);
  }finally{
    await new Promise(resolve=>runtime.io.close(resolve));
    await disconnectDatabase();
    await replica.stop();
  }
});
