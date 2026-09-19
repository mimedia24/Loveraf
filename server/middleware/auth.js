const {unauthorized,forbidden}=require('../utils/errors');
function authMiddleware(authService){return async(req,_res,next)=>{try{const header=req.headers.authorization||'';if(!header.startsWith('Bearer '))throw unauthorized();req.auth=await authService.authenticate(header.slice(7));next();}catch(error){next(error);}};}
function roleMiddleware(authService,roles=[]){return(req,_res,next)=>{try{authService.requireAdmin(req.auth,roles);next();}catch(error){next(error);}};}
function sellerOwner(){return async(req,_res,next)=>{try{if(req.auth.user.accountType!=='seller')throw forbidden('Sign in with a separate seller account.');const {Seller}=require('../models/account.model');const seller=await Seller.findOne({_id:req.params.id,user:req.auth.user._id});if(!seller)throw forbidden('Seller account not owned by this user.');req.seller=seller;next();}catch(error){next(error);}};}
module.exports={authMiddleware,roleMiddleware,sellerOwner};
