const fs=require('node:fs/promises');
const path=require('node:path');
const {AppError}=require('../utils/errors');
const {bridgeDeliveryConfigured}=require('../config/environment');

async function deliverBridge(message){
  const endpoint=message.channel==='email'?process.env.OTP_EMAIL_ENDPOINT:process.env.OTP_SMS_ENDPOINT;
  const response=await fetch(endpoint,{method:'POST',headers:{'content-type':'application/json',authorization:`Bearer ${process.env.PROVIDER_BRIDGE_TOKEN}`},body:JSON.stringify(message)});
  if(!response.ok)throw new Error(`Provider returned HTTP ${response.status}.`);
}

async function providerDelivery(message){
  if(process.env.NODE_ENV==='production'){
    try{
      if(bridgeDeliveryConfigured(message.channel))return await deliverBridge(message);
      throw new AppError(503,'PROVIDER_UNAVAILABLE',`${message.channel==='email'?'Email':'Mobile'} verification is unavailable.`);
    }catch(error){
      if(error instanceof AppError)throw error;
      console.error('Verification delivery failed.',{channel:message.channel,code:error.code||'PROVIDER_ERROR'});
      throw new AppError(503,'PROVIDER_UNAVAILABLE','Verification email could not be sent. Please try again.');
    }
  }
  const directory=path.join(process.cwd(),'.local','outbox');await fs.mkdir(directory,{recursive:true});
  await fs.writeFile(path.join(directory,`${message.id}.json`),JSON.stringify(message,null,2),'utf8');
}
module.exports={providerDelivery};
