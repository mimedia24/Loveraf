const {test}=require('node:test');
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const mongoose=require('mongoose');
const {MongoMemoryReplSet}=require('mongodb-memory-server');
const {User}=require('../models/account.model');
const {Activity,DeviceToken}=require('../models/communication.model');
const push=require('../services/push.service');

test('push device tokens are encrypted and queued activities respect preferences',async()=>{
  const replica=await MongoMemoryReplSet.create({replSet:{count:1}}),originalFetch=global.fetch;
  const names=['PUSH_BRIDGE_ENDPOINT','PUSH_BRIDGE_TOKEN','PUSH_TOKEN_ENCRYPTION_KEY','PUSH_CLIENT_ENABLED'];
  const old=Object.fromEntries(names.map(name=>[name,process.env[name]]));
  try{
    await mongoose.connect(replica.getUri('push_test'));
    const user=await User.create({name:'Push User',email:'push@example.com',passwordHash:'test',preferences:{push:true}});
    await assert.rejects(push.register({owner:user._id,input:{installationId:'installation-01',platform:'android',token:'provider-device-token-123'}}),error=>error.status===503);
    process.env.PUSH_BRIDGE_ENDPOINT='https://push.test/send';
    process.env.PUSH_BRIDGE_TOKEN='bridge-secret';
    process.env.PUSH_TOKEN_ENCRYPTION_KEY=crypto.randomBytes(32).toString('hex');
    process.env.PUSH_CLIENT_ENABLED='true';
    let payload;
    global.fetch=async(_url,options)=>{payload=JSON.parse(options.body);return {ok:true};};
    await push.register({owner:user._id,input:{installationId:'installation-01',platform:'android',token:'provider-device-token-123'}});
    const stored=await DeviceToken.findOne({user:user._id}).select('+tokenCiphertext').lean();
    assert.notEqual(stored.tokenCiphertext,'provider-device-token-123');
    const activity=await Activity.create({user:user._id,category:'order',title:'Order update',body:'Packed'});
    assert.deepEqual(await push.processPushQueue(),{processed:1,failed:0});
    assert.deepEqual(payload.tokens,['provider-device-token-123']);
    assert.equal((await Activity.findById(activity._id)).pushStatus,'sent');
    await User.updateOne({_id:user._id},{$set:{'preferences.push':false}});
    const muted=await Activity.create({user:user._id,category:'promo',title:'Offer'});
    await push.processPushQueue();
    assert.equal((await Activity.findById(muted._id)).pushStatus,'skipped');
    await push.unregister({owner:user._id,installationId:'installation-01'});
    assert.equal(await DeviceToken.countDocuments(),0);
  }finally{
    global.fetch=originalFetch;
    for(const name of names){if(old[name]===undefined)delete process.env[name];else process.env[name]=old[name];}
    await mongoose.disconnect();await replica.stop();
  }
});
