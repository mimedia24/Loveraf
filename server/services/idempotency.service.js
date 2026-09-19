const crypto=require('node:crypto');
const mongoose=require('mongoose');
const {MutationKey}=require('../models/commerce.model');
const {badRequest,conflict}=require('../utils/errors');

const hash=value=>crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');

async function idempotent(user,key,input,action,{required=true}={}){
  if(!key){
    if(required)throw badRequest('A valid Idempotency-Key header is required.');
    return mongoose.connection.transaction(action);
  }
  if(!/^[0-9a-f-]{36}$/i.test(key))throw badRequest('A valid Idempotency-Key header is required.');
  const requestHash=hash(input);
  const previous=await MutationKey.findOne({user,key}).lean();
  if(previous){
    if(previous.requestHash!==requestHash)throw conflict('Request key reused with different data.');
    return previous.response;
  }
  try{
    return await mongoose.connection.transaction(async session=>{
      const inside=await MutationKey.findOne({user,key}).session(session).lean();
      if(inside){
        if(inside.requestHash!==requestHash)throw conflict('Request key reused with different data.');
        return inside.response;
      }
      const response=await action(session);
      await MutationKey.create([{user,key,requestHash,response,expiresAt:new Date(Date.now()+7*86400000)}],{session});
      return response;
    });
  }catch(error){
    if(error?.code===11000){
      const saved=await MutationKey.findOne({user,key}).lean();
      if(saved?.requestHash===requestHash)return saved.response;
    }
    throw error;
  }
}

module.exports=idempotent;
