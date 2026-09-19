const express=require('express');
const asyncHandler=require('../utils/asyncHandler');
const CommunicationController=require('../controllers/communication.controller');
const validate=require('../middleware/validate');
const schemas=require('../validation/schemas');
const push=require('../services/push.service');
module.exports=function communicationRoutes(requireAuth,io,role){
  const r=express.Router(),c=new CommunicationController(io);r.use(requireAuth);
  r.get('/activities',asyncHandler(c.activities));r.post('/activities/read',validate(schemas.activityRead),asyncHandler(c.readActivities));
  r.post('/me/push-devices',validate(schemas.pushDevice),asyncHandler(async(req,res)=>res.status(201).json(await push.register({owner:req.auth.user._id,input:req.validated.body}))));
  r.delete('/me/push-devices/:installationId',asyncHandler(async(req,res)=>res.json(await push.unregister({owner:req.auth.user._id,installationId:String(req.params.installationId||'').slice(0,200)}))));
  const support=role(["support"]);
  r.get('/admin/support/conversations',support,asyncHandler(c.adminConversations));r.get('/admin/support/conversations/:id/messages',support,asyncHandler(c.adminMessages));r.post('/admin/support/conversations/:id/messages',support,validate(schemas.messagePayload),asyncHandler(c.adminSend));r.post('/admin/support/conversations/:id/read',support,asyncHandler(c.adminRead));
  r.get('/conversations',asyncHandler(c.conversations));r.post('/conversations',validate(schemas.conversationCreate),asyncHandler(c.createConversation));r.get('/conversations/:id/messages',asyncHandler(c.messages));r.post('/conversations/:id/messages',validate(schemas.messagePayload),asyncHandler(c.send));r.post('/conversations/:id/read',asyncHandler(c.readMessages));return r;
};
