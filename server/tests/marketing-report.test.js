const {test}=require('node:test');
const assert=require('node:assert/strict');
const mongoose=require('mongoose');
const {MongoMemoryServer}=require('mongodb-memory-server');
const {User}=require('../models/account.model');
const {Referral,LoyaltyEntry}=require('../models/marketing.model');
const {listReferrals,listLoyalty}=require('../services/marketing-report.service');
test('finance marketing reports expose referral states and derived loyalty balances',async()=>{const mongo=await MongoMemoryServer.create();try{await mongoose.connect(mongo.getUri('marketing_report_test'));const [inviter,invitee]=await User.create([{name:'Inviter',email:'report-inviter@test.local',passwordHash:'x'},{name:'Invitee',email:'report-invitee@test.local',passwordHash:'x'}]);await Referral.create({inviter:inviter._id,invitee:invitee._id,code:'LR12345678',status:'pending',inviterRewardMinor:10000,inviteePromoMinor:5000});await LoyaltyEntry.create([{owner:invitee._id,points:150,reference:'award:1'},{owner:invitee._id,points:-40,reference:'redeem:1'}]);const referrals=await listReferrals(),loyalty=await listLoyalty();assert.equal(referrals.items[0].status,'pending');assert.equal(referrals.items[0].inviter.name,'Inviter');assert.equal(loyalty.items[0].points,110);assert.equal(loyalty.items[0].earnedPoints,150);assert.equal(loyalty.items[0].redeemedOrReversedPoints,40);}finally{await mongoose.disconnect();await mongo.stop();}});
