const serialize=require('../utils/serializers');
class AuthController{
  constructor(service){this.service=service;}
  register=async(req,res)=>res.status(201).json(await this.service.register(req.validated.body));
  login=async(req,res)=>res.status(201).json(await this.service.login(req.validated.body));
  logout=async(req,res)=>{req.auth.session.revokedAt=new Date();await req.auth.session.save();res.json({ok:true});};
  me=async(req,res)=>res.json(serialize.user(req.auth.user,req.auth.session));
  challenge=async(req,res)=>res.status(201).json(await this.service.challenge(req.auth.user,req.validated.body));
  recovery=async(req,res)=>res.status(202).json(await this.service.recovery(req.validated.body));
  verify=async(req,res)=>res.status(201).json(await this.service.verify(req.auth.user,{...req.validated.body,sessionId:req.auth.session._id}));
  reset=async(req,res)=>res.json(await this.service.reset(req.validated.body));
  reauthenticate=async(req,res)=>res.json(await this.service.reauthenticate(req.auth.user,req.validated.body.password));
}
module.exports=AuthController;
