const {Address,Session}=require('../models/account.model');
const serialize=require('../utils/serializers');
const {notFound}=require('../utils/errors');
class AccountController{
  update=async(req,res)=>{const allowed=['name','language','preferences'];for(const key of allowed)if(req.body[key]!==undefined)req.auth.user[key]=req.body[key];await req.auth.user.save();res.json(serialize.user(req.auth.user,req.auth.session));};
  sessions=async(req,res)=>res.json((await Session.find({user:req.auth.user._id,revokedAt:null}).sort({createdAt:-1})).map(item=>({id:String(item._id),device:item.device,current:String(item._id)===String(req.auth.session._id),createdAt:item.createdAt,expiresAt:item.expiresAt})));
  revoke=async(req,res)=>{await Session.updateOne({_id:req.params.id,user:req.auth.user._id},{revokedAt:new Date()});res.json({ok:true});};
  addresses=async(req,res)=>res.json((await Address.find({user:req.auth.user._id}).sort({createdAt:1})).map(item=>({...item.toObject(),id:String(item._id)})));
  saveAddress=async(req,res)=>{const input=req.validated.body;if(input.isDefault||!await Address.exists({user:req.auth.user._id}))await Address.updateMany({user:req.auth.user._id},{isDefault:false});let address;
    if(req.params.id){address=await Address.findOneAndUpdate({_id:req.params.id,user:req.auth.user._id},input,{new:true});if(!address)throw notFound();}else address=await Address.create({user:req.auth.user._id,...input});res.status(req.params.id?200:201).json({...address.toObject(),id:String(address._id)});};
  deleteAddress=async(req,res)=>{const removed=await Address.findOneAndDelete({_id:req.params.id,user:req.auth.user._id});if(!removed)throw notFound();if(removed.isDefault){const next=await Address.findOne({user:req.auth.user._id}).sort({createdAt:1});if(next){next.isDefault=true;await next.save();}}res.json({ok:true});};
}
module.exports=AccountController;
