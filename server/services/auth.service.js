const crypto=require('node:crypto');
const bcrypt=require('bcryptjs');
const jwt=require('jsonwebtoken');
const {User,Session,Verification}=require('../models/account.model');
const {AppError,badRequest,unauthorized,forbidden,notFound}=require('../utils/errors');
const serialize=require('../utils/serializers');

const normalize=value=>String(value||'').trim().toLowerCase();
const digest=value=>crypto.createHash('sha256').update(value).digest('hex');
const otpDigest=(challenge,code)=>crypto.createHmac('sha256',process.env.OTP_HMAC_SECRET||'test-only-otp-secret').update(`${challenge}:${code}`).digest('hex');
const safeEqual=(left,right)=>left?.length===right?.length&&crypto.timingSafeEqual(Buffer.from(left),Buffer.from(right));

class AuthService{
  constructor(deliver){this.deliver=deliver;}
  secret(){const secret=process.env.JWT_ACCESS_SECRET;if(!secret||secret.length<32)throw new Error('JWT_ACCESS_SECRET must contain at least 32 characters.');return secret;}
  async issue(user,device={}){
    const jti=crypto.randomUUID(),expiresAt=new Date(Date.now()+30*86400000);
    await Session.create({user:user._id,jtiHash:digest(jti),device,expiresAt});
    const token=jwt.sign({sub:String(user._id),jti},this.secret(),{algorithm:'HS256',issuer:process.env.JWT_ISSUER||'loveraf-api',expiresIn:'30d'});
    return {token,user:serialize.user(user)};
  }
  async register(input){
    if(!input.email&&!input.phone)throw badRequest('Email or phone is required.');
    const passwordHash=await bcrypt.hash(input.password,12);
    const user=await User.create({name:input.name,email:input.email?normalize(input.email):undefined,phone:input.phone?.trim(),passwordHash});
    return this.issue(user,input.device);
  }
  async login(input){
    const login=normalize(input.login);const user=await User.findOne({$or:[{email:login},{phone:input.login.trim()}]}).select('+passwordHash');
    if(!user||!await bcrypt.compare(input.password,user.passwordHash))throw unauthorized('Incorrect login or password.');
    if(user.suspended)throw forbidden('This account is suspended.');
    return this.issue(user,input.device);
  }
  async authenticate(token){
    let payload;try{payload=jwt.verify(token,this.secret(),{algorithms:['HS256'],issuer:process.env.JWT_ISSUER||'loveraf-api'});}catch{throw unauthorized('Session expired. Sign in again.');}
    const session=await Session.findOne({user:payload.sub,jtiHash:digest(payload.jti),revokedAt:null,expiresAt:{$gt:new Date()}});
    if(!session)throw unauthorized('Session is no longer active.');
    const user=await User.findById(payload.sub);if(!user||user.suspended)throw unauthorized('Account unavailable.');
    return {user,session};
  }
  async challenge(user,input){
    const target=input.channel==='email'?user.email:user.phone;if(!target)throw badRequest(`Add a ${input.channel} first.`);
    return this.createChallenge(user,target,input.channel,input.purpose);
  }
  async recovery(input){
    const login=normalize(input.login);const user=await User.findOne({$or:[{email:login},{phone:input.login.trim()}]});
    if(!user)return {accepted:true,challengeId:new (require('mongoose').Types.ObjectId)().toString(),expiresInSeconds:600};
    const channel=input.channel||(login.includes('@')?'email':'phone'),target=channel==='email'?user.email:user.phone;
    if(!target||(channel==='email'&&!user.emailVerified)||(channel==='phone'&&!user.phoneVerified))return {accepted:true,challengeId:new (require('mongoose').Types.ObjectId)().toString(),expiresInSeconds:600};
    return {...await this.createChallenge(user,target,channel,'recovery'),accepted:true};
  }
  async createChallenge(user,target,channel,purpose){
    const recent=await Verification.exists({user:user._id,target,channel,purpose,createdAt:{$gte:new Date(Date.now()-60000)}});
    if(recent)throw new AppError(429,'RATE_LIMITED','Please wait one minute before requesting another code.');
    const code=String(crypto.randomInt(100000,1000000));
    const challenge=new Verification({user:user._id,target,channel,purpose,codeHash:'pending',expiresAt:new Date(Date.now()+10*60000)});
    challenge.codeHash=otpDigest(String(challenge._id),code);await challenge.save();
    try{await this.deliver({id:String(challenge._id),target,channel,purpose,code});}
    catch(error){await Verification.deleteOne({_id:challenge._id});throw error;}
    return {challengeId:String(challenge._id),expiresInSeconds:600};
  }
  async verify(user,input){
    const challenge=await Verification.findById(input.challengeId).select('+codeHash');
    if(!challenge||String(challenge.user)!==String(user._id)||challenge.usedAt||challenge.expiresAt<=new Date())throw badRequest('Verification code is invalid or expired.');
    if(challenge.attempts>=5)throw badRequest('Too many attempts. Request a new code.');
    if(!safeEqual(challenge.codeHash,otpDigest(String(challenge._id),input.code))){challenge.attempts+=1;await challenge.save();throw badRequest('Verification code is incorrect.');}
    challenge.usedAt=new Date();await challenge.save();
    if(challenge.purpose==='verify'){if(challenge.channel==='email')user.emailVerified=true;else user.phoneVerified=true;await user.save();}
    if(challenge.purpose==='admin'){if(!user.roles.some(role=>role!=='buyer'))throw forbidden();user.twoStepEnabled=true;await user.save();await Session.updateOne({_id:input.sessionId},{mfaAt:new Date()});}
    return {ok:true,user:serialize.user(user,challenge.purpose==='admin'?{mfaAt:new Date()}:undefined)};
  }
  async reset(input){
    const challenge=await Verification.findById(input.challengeId).select('+codeHash');
    if(!challenge||challenge.purpose!=='recovery'||challenge.usedAt||challenge.expiresAt<=new Date()||!safeEqual(challenge.codeHash,otpDigest(String(challenge._id),input.code)))throw badRequest('Verification code is invalid or expired.');
    const user=await User.findById(challenge.user).select('+passwordHash');if(!user)throw notFound();
    user.passwordHash=await bcrypt.hash(input.password,12);challenge.usedAt=new Date();await Promise.all([user.save(),challenge.save(),Session.updateMany({user:user._id,revokedAt:null},{revokedAt:new Date()})]);return {ok:true};
  }
  async reauthenticate(user,password){const withHash=await User.findById(user._id).select('+passwordHash');if(!await bcrypt.compare(password,withHash.passwordHash))throw unauthorized('Password is incorrect.');return {ok:true};}
  requireVerified(user){if(!user.emailVerified&&!user.phoneVerified)throw forbidden('Verify your email or mobile number first.');}
  requireAdmin(auth,roles=[]){if(!auth.user.roles.some(role=>role==='super_admin'||roles.includes(role)))throw forbidden();if(!auth.session.mfaAt||Date.now()-auth.session.mfaAt.getTime()>15*60000)throw forbidden('Administrator MFA is required.');}
}
module.exports={AuthService,digest};
