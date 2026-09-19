const {test}=require('node:test');
const assert=require('node:assert/strict');
const request=require('supertest');
const {MongoMemoryReplSet}=require('mongodb-memory-server');

test('wallet is feature-gated, private, paginated and duplicate-safe',async()=>{
  process.env.NODE_ENV='test';
  process.env.JWT_ACCESS_SECRET='wallet-test-access-secret-with-at-least-32-characters';
  process.env.OTP_HMAC_SECRET='wallet-test-otp-secret-with-at-least-32-characters';
  process.env.JWT_ISSUER='loveraf-wallet-test';
  const mongo=await MongoMemoryReplSet.create({replSet:{count:1}});
  process.env.MONGODB_URI=mongo.getUri('loveraf_wallet_test');
  const {connectDatabase,disconnectDatabase}=require('../config/database');
  await connectDatabase();
  const {createApplication}=require('../app');
  const runtime=createApplication({deliver:async()=>{}});
  try{
    const registered=await request(runtime.app).post('/api/v1/auth/register').send({name:'Wallet Buyer',email:'wallet@example.test',password:'CorrectWalletPassword1'});
    assert.equal(registered.status,201);
    const token=registered.body.token,userId=registered.body.user.id;
    const {User}=require('../models/account.model');
    const {Feature,BusinessRule,LedgerAccount,LedgerEntry}=require('../models/system.model');
    await Promise.all([LedgerAccount.syncIndexes(),LedgerEntry.syncIndexes()]);
    await Feature.create({key:'rewards',enabled:false});
    const disabled=await request(runtime.app).get('/api/v1/me/wallet').set('Authorization',`Bearer ${token}`);
    assert.equal(disabled.status,503);
    assert.equal(disabled.body.error.code,'PROVIDER_UNAVAILABLE');

    assert.equal((await request(runtime.app).get('/api/v1/admin/features').set('Authorization',`Bearer ${token}`)).status,403);
    await User.updateOne({_id:userId},{roles:['buyer','super_admin']});
    const incompleteEnable=await request(runtime.app).patch('/api/v1/admin/features/rewards').set('Authorization',`Bearer ${token}`).send({enabled:true,version:0,reason:'Launch rewards'});
    assert.equal(incompleteEnable.status,400);
    assert.equal((await request(runtime.app).get('/api/v1/me/wallet').set('Authorization',`Bearer ${token}`)).status,503);
    await BusinessRule.create([
      {key:'promo_usage',enabled:true,data:{maxDiscountPercent:10,minimumOrderMinor:10000,expiryDays:90}},
      {key:'referral',enabled:true,data:{inviterRewardMinor:10000,inviteePromoMinor:10000,releaseAfterDays:7,requireFirstDeliveredOrder:true}},
      {key:'withdrawal',enabled:true,data:{minimumMinor:50000,feeMinor:1000,allowedMethods:['bkash','bank']}},
      {key:'membership',enabled:true,data:{monthlyMinor:23900,annualMinor:199000,trialDays:7}},
    ]);
    const enabled=await request(runtime.app).patch('/api/v1/admin/features/rewards').set('Authorization',`Bearer ${token}`).send({enabled:true,version:0,reason:'All launch rules approved'});
    assert.equal(enabled.status,200);
    assert.equal(enabled.body.enabled,true);
    assert.equal(enabled.body.version,1);
    assert.equal((await request(runtime.app).patch('/api/v1/admin/features/rewards').set('Authorization',`Bearer ${token}`).send({enabled:false,version:0,reason:'Stale change'})).status,409);
    const outsider=await User.create({name:'Other Buyer',email:'other-wallet@example.test',passwordHash:'not-used'});
    const [promo,earnings,outsiderAccount]=await LedgerAccount.create([
      {owner:userId,kind:'promo'},
      {owner:userId,kind:'earnings'},
      {owner:outsider._id,kind:'promo'},
    ]);
    await LedgerEntry.create([
      {account:promo._id,amountMinor:20000,reference:'welcome:wallet-buyer',metadata:{title:'Welcome reward'}},
      {account:earnings._id,amountMinor:7500,reference:'affiliate:order-1',metadata:{title:'Affiliate commission'}},
      {account:outsiderAccount._id,amountMinor:999999,reference:'private:other-user'},
    ]);
    const page=await request(runtime.app).get('/api/v1/me/wallet?limit=1').set('Authorization',`Bearer ${token}`);
    assert.equal(page.status,200);
    assert.deepEqual(page.body.balances,{promo:20000,earnings:7500,pending_earnings:0,pending_promo:0});
    assert.equal(page.body.entries.length,1);
    assert.equal(page.body.nextOffset,1);
    assert.notEqual(page.body.entries[0].reference,'private:other-user');
    const second=await request(runtime.app).get('/api/v1/me/wallet?limit=1&offset=1').set('Authorization',`Bearer ${token}`);
    assert.equal(second.body.entries.length,1);
    assert.equal(second.body.nextOffset,null);
    assert.equal((await request(runtime.app).get('/api/v1/me/wallet?limit=0').set('Authorization',`Bearer ${token}`)).status,400);
    await assert.rejects(LedgerEntry.create({account:promo._id,amountMinor:1,reference:'welcome:wallet-buyer'}),error=>error.code===11000);
  }finally{
    await new Promise(resolve=>runtime.io.close(resolve));
    await disconnectDatabase();
    await mongo.stop();
  }
});
