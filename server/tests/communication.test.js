const {test}=require('node:test');
const assert=require('node:assert/strict');
const mongoose=require('mongoose');
const {MongoMemoryReplSet}=require('mongodb-memory-server');
const {User,Seller}=require('../models/account.model');
const {Media}=require('../models/catalog.model');
const {Conversation,Message,Activity}=require('../models/communication.model');
const {MutationKey}=require('../models/commerce.model');
const CommunicationController=require('../controllers/communication.controller');

const response=()=>{const result={statusCode:200,body:null};result.status=code=>{result.statusCode=code;return result;};result.json=value=>{result.body=value;return result;};return result;};
const fakeIo={to:()=>({emit:()=>{}})};
const requestKey=index=>`${String(index).padStart(8,'0')}-1111-4111-8111-111111111111`;
const messageRequest=(user,id,body,index)=>({auth:{user},params:{id},body,get:name=>name==='Idempotency-Key'?requestKey(index):undefined});
const conversationRequest=(user,body,index)=>({auth:{user},body,get:name=>name==='Idempotency-Key'?requestKey(index):undefined});

test('seller and support conversations enforce membership, unread state and attachment ownership',async()=>{
  const replica=await MongoMemoryReplSet.create({replSet:{count:1}});
  try{
    await mongoose.connect(replica.getUri('communication_test'));
    await Promise.all([User.init(),Seller.init(),Media.init(),Conversation.init(),Message.init(),Activity.init(),MutationKey.init()]);
    const [buyer,sellerUser,support,outsider]=await User.create([
      {name:'Buyer',accountType:'personal',email:'chat-buyer@test.local',passwordHash:'hash',roles:['buyer']},
      {name:'Seller',accountType:'seller',email:'chat-seller@test.local',passwordHash:'hash',roles:['seller']},
      {name:'Support',accountType:'personal',email:'chat-support@test.local',passwordHash:'hash',roles:['support']},
      {name:'Outside',accountType:'personal',email:'chat-outside@test.local',passwordHash:'hash',roles:['buyer']},
    ]);
    const seller=await Seller.create({user:sellerUser._id,name:'Chat Store',handle:'chat-store',status:'approved'});
    const media=await Media.create({owner:buyer._id,uri:'https://cdn.test/chat.png',mime:'image/png'});
    const controller=new CommunicationController(fakeIo);
    const conversationBody={kind:'seller',sellerId:String(seller._id)};
    const createRes=response();await controller.createConversation(conversationRequest(buyer,conversationBody,10),createRes);
    const repeatedCreate=response();await controller.createConversation(conversationRequest(buyer,conversationBody,10),repeatedCreate);
    assert.equal(repeatedCreate.body.id,createRes.body.id);assert.equal(await Conversation.countDocuments({seller:seller._id,members:buyer._id}),1);
    const conversation=await Conversation.findById(createRes.body.id);
    assert.deepEqual(conversation.members.map(String).sort(),[buyer.id,sellerUser.id].sort());
    const firstMessage={body:'Here is the item photo.',attachmentIds:[media.id]};
    const sendRes=response();await controller.send(messageRequest(buyer,conversation.id,firstMessage,1),sendRes);
    assert.equal(sendRes.statusCode,201);assert.equal(sendRes.body.attachments[0].uri,media.uri);
    const repeatedSend=response();await controller.send(messageRequest(buyer,conversation.id,firstMessage,1),repeatedSend);assert.equal(repeatedSend.body.id,sendRes.body.id);assert.equal(await Message.countDocuments({conversation:conversation._id}),1);
    assert.equal(await Activity.countDocuments({user:sellerUser._id,category:'chat'}),1);
    const sellerList=response();await controller.conversations({auth:{user:sellerUser}},sellerList);assert.equal(sellerList.body[0].unread,1);
    const sellerPage=response();await controller.conversations({auth:{user:sellerUser},query:{paginated:'true',limit:'1',offset:'0'}},sellerPage);assert.equal(sellerPage.body.items.length,1);assert.equal(sellerPage.body.nextOffset,null);
    const readRes=response();await controller.readMessages({auth:{user:sellerUser},params:{id:conversation.id}},readRes);
    assert.ok((await Message.findById(sendRes.body.id)).readBy.map(String).includes(String(sellerUser._id)));
    const afterRead=response();await controller.conversations({auth:{user:sellerUser}},afterRead);assert.equal(afterRead.body[0].unread,0);
    await assert.rejects(controller.messages({auth:{user:outsider},params:{id:conversation.id},query:{}},response()),/access denied/);
    await assert.rejects(controller.send(messageRequest(sellerUser,conversation.id,{body:'',attachmentIds:[media.id]},2),response()),/belong to this account/);
    const supportRes=response();await controller.createConversation({auth:{user:buyer},body:{kind:'support'}},supportRes);
    await controller.send(messageRequest(buyer,supportRes.body.id,{body:'I need order help.'},3),response());
    const inbox=response();await controller.adminConversations({auth:{user:support}},inbox);assert.equal(inbox.body.length,1);assert.equal(inbox.body[0].unread,1);
    const reply=response();await controller.adminSend(messageRequest(support,supportRes.body.id,{body:'We are reviewing your order.'},4),reply);assert.equal(reply.statusCode,201);
    await assert.rejects(controller.adminConversations({auth:{user:outsider}},response()),/permission/);
    const buyerMessages=response();await controller.messages({auth:{user:buyer},params:{id:supportRes.body.id},query:{}},buyerMessages);assert.equal(buyerMessages.body.items.length,2);assert.equal(buyerMessages.body.items[1].senderName,'Support');assert.equal(buyerMessages.body.items[1].deliveryStatus,'delivered');
    const timestamp=new Date();await Message.insertMany(Array.from({length:51},(_,index)=>({conversation:supportRes.body.id,sender:buyer._id,body:`Paged ${index}`,readBy:[buyer._id],createdAt:timestamp,updatedAt:timestamp})));
    const firstPage=response();await controller.messages({auth:{user:buyer},params:{id:supportRes.body.id},query:{}},firstPage);assert.equal(firstPage.body.items.length,50);assert.ok(firstPage.body.nextBefore);
    const secondPage=response();await controller.messages({auth:{user:buyer},params:{id:supportRes.body.id},query:{before:firstPage.body.nextBefore}},secondPage);assert.equal(secondPage.body.items.length,3);assert.equal(new Set([...firstPage.body.items,...secondPage.body.items].map(item=>item.id)).size,53);
    await assert.rejects(controller.messages({auth:{user:buyer},params:{id:supportRes.body.id},query:{before:'invalid'}},response()),/Invalid message cursor/);
    await Activity.insertMany(Array.from({length:51},(_,index)=>({user:buyer._id,category:'alert',title:`Activity ${index}`,createdAt:timestamp,updatedAt:timestamp})));
    const firstActivities=response();await controller.activities({auth:{user:buyer},query:{limit:'50'}},firstActivities);assert.equal(firstActivities.body.items.length,50);assert.ok(firstActivities.body.nextBefore);
    const secondActivities=response();await controller.activities({auth:{user:buyer},query:{limit:'50',before:firstActivities.body.nextBefore}},secondActivities);assert.equal(secondActivities.body.items.length,2);assert.equal(new Set([...firstActivities.body.items,...secondActivities.body.items].map(item=>item.id)).size,52);
    await controller.readActivities({auth:{user:buyer},body:{ids:[secondActivities.body.items[0].id,secondActivities.body.items[0].id]}},response());assert.equal(await Activity.countDocuments({_id:secondActivities.body.items[0].id,readAt:{$ne:null}}),1);
    await assert.rejects(controller.activities({auth:{user:buyer},query:{category:'unknown'}},response()),/Invalid activity category/);
    await assert.rejects(controller.activities({auth:{user:buyer},query:{before:'invalid'}},response()),/Invalid activity cursor/);
    await assert.rejects(controller.readActivities({auth:{user:buyer},body:{ids:['invalid']}},response()),/Invalid activity selection/);
  }finally{await mongoose.disconnect();await replica.stop();}
});
