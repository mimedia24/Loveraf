const {Conversation,Message,Activity}=require('../models/communication.model');
const {Seller}=require('../models/account.model');
const {badRequest,forbidden,notFound}=require('../utils/errors');
class CommunicationController{
  constructor(io){this.io=io;}
  activities=async(req,res)=>{const filter={user:req.auth.user._id};if(req.query.category)filter.category=req.query.category;const limit=Math.min(100,Math.max(1,Number(req.query.limit)||50));const rows=await Activity.find(filter).sort({createdAt:-1}).limit(limit).lean();res.json({items:rows.map(row=>({...row,id:String(row._id),unread:!row.readAt}))});};
  readActivities=async(req,res)=>{await Activity.updateMany({user:req.auth.user._id,readAt:null},{readAt:new Date()});res.json({ok:true});};
  conversations=async(req,res)=>{const rows=await Conversation.find({members:req.auth.user._id}).sort({lastMessageAt:-1}).lean();res.json(rows.map(row=>({...row,id:String(row._id)})));};
  createConversation=async(req,res)=>{const kind=req.body.kind;if(!['support','seller'].includes(kind))throw badRequest('Conversation type is invalid.');const query={kind,members:req.auth.user._id};if(kind==='seller'){const seller=await Seller.findById(req.body.sellerId);if(!seller||seller.status!=='approved')throw notFound('Seller unavailable.');query.seller=seller._id;}let conversation=await Conversation.findOne(query);if(!conversation)conversation=await Conversation.create({kind,members:[req.auth.user._id],seller:query.seller});res.status(201).json({id:String(conversation._id),kind:conversation.kind});};
  member=async(req)=>{const conversation=await Conversation.findOne({_id:req.params.id,members:req.auth.user._id});if(!conversation)throw forbidden('Conversation access denied.');return conversation;};
  messages=async(req,res)=>{await this.member(req);const before=req.query.before?new Date(String(req.query.before)):new Date();const rows=await Message.find({conversation:req.params.id,createdAt:{$lt:before}}).sort({createdAt:-1}).limit(50).lean();res.json(rows.reverse().map(row=>({...row,id:String(row._id),senderId:String(row.sender)})));};
  send=async(req,res)=>{const conversation=await this.member(req);const body=String(req.body.body||'').trim();if(!body||body.length>4000)throw badRequest('Message must contain 1–4000 characters.');const message=await Message.create({conversation:conversation._id,sender:req.auth.user._id,body,readBy:[req.auth.user._id]});conversation.lastMessageAt=new Date();await conversation.save();const result={id:String(message._id),conversationId:String(conversation._id),senderId:String(message.sender),body:message.body,createdAt:message.createdAt};this.io.to(`conversation:${conversation._id}`).emit('message:new',result);res.status(201).json(result);};
  readMessages=async(req,res)=>{await this.member(req);await Message.updateMany({conversation:req.params.id,readBy:{$ne:req.auth.user._id}},{$addToSet:{readBy:req.auth.user._id}});res.json({ok:true});};
}
module.exports=CommunicationController;
