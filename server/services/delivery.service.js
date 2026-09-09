const fs=require('node:fs/promises');
const path=require('node:path');
const {AppError}=require('../utils/errors');

async function providerDelivery(message){
  const endpoint=message.channel==='email'?process.env.OTP_EMAIL_ENDPOINT:process.env.OTP_SMS_ENDPOINT;
  if(process.env.NODE_ENV==='production'){
    if(!endpoint?.startsWith('https://')||!process.env.PROVIDER_BRIDGE_TOKEN)throw new AppError(503,'PROVIDER_UNAVAILABLE','Verification delivery is unavailable.');
    const response=await fetch(endpoint,{method:'POST',headers:{'content-type':'application/json',authorization:`Bearer ${process.env.PROVIDER_BRIDGE_TOKEN}`},body:JSON.stringify(message)});
    if(!response.ok)throw new AppError(503,'PROVIDER_UNAVAILABLE','Verification delivery failed.');
    return;
  }
  const directory=path.join(process.cwd(),'.local','outbox');await fs.mkdir(directory,{recursive:true});
  await fs.writeFile(path.join(directory,`${message.id}.json`),JSON.stringify(message,null,2),'utf8');
}
module.exports={providerDelivery};
