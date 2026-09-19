const mongoose=require('mongoose');
const {User}=require('../models/account.model');
const {Referral,LoyaltyEntry}=require('../models/marketing.model');

async function listReferrals(query={}){
  const limit=Math.min(100,Math.max(1,Number(query.limit)||50)),offset=Math.max(0,Number(query.offset)||0),filter={};if(['attributed','pending','released','reversed'].includes(query.status))filter.status=query.status;
  const rows=await Referral.find(filter).populate('inviter','name email phone').populate('invitee','name email phone').sort({createdAt:-1,_id:-1}).skip(offset).limit(limit+1);
  return {items:rows.slice(0,limit).map(row=>({id:String(row._id),name:row.invitee?.name||'Unavailable invitee',email:row.invitee?.email,phone:row.invitee?.phone,inviter:row.inviter?{id:String(row.inviter._id),name:row.inviter.name,email:row.inviter.email,phone:row.inviter.phone}:null,invitee:row.invitee?{id:String(row.invitee._id),name:row.invitee.name,email:row.invitee.email,phone:row.invitee.phone}:null,code:row.code,status:row.status,inviterRewardMinor:row.inviterRewardMinor,inviteePromoMinor:row.inviteePromoMinor,eligibleAt:row.eligibleAt,releasedAt:row.releasedAt,reversedAt:row.reversedAt,createdAt:row.createdAt})),nextOffset:rows.length>limit?offset+limit:null};
}
async function listLoyalty(query={}){
  const limit=Math.min(100,Math.max(1,Number(query.limit)||50)),offset=Math.max(0,Number(query.offset)||0),groups=await LoyaltyEntry.aggregate([{$group:{_id:'$owner',points:{$sum:'$points'},earned:{$sum:{$cond:[{$gt:['$points',0]},'$points',0]}},redeemedOrReversed:{$sum:{$cond:[{$lt:['$points',0]},{$multiply:['$points',-1]},0]}},entryCount:{$sum:1},lastActivityAt:{$max:'$createdAt'}}},{$sort:{lastActivityAt:-1,_id:1}},{$skip:offset},{$limit:limit+1}]);
  const users=await User.find({_id:{$in:groups.slice(0,limit).map(row=>row._id)}}).select('name email phone').lean(),byId=new Map(users.map(user=>[String(user._id),user]));
  return {items:groups.slice(0,limit).map(row=>{const user=byId.get(String(row._id));return {id:String(row._id),name:user?.name||'Unavailable customer',email:user?.email,phone:user?.phone,status:row.points<0?'debt':'current',points:row.points,earnedPoints:row.earned,redeemedOrReversedPoints:row.redeemedOrReversed,entryCount:row.entryCount,lastActivityAt:row.lastActivityAt};}),nextOffset:groups.length>limit?offset+limit:null};
}
module.exports={listReferrals,listLoyalty};
