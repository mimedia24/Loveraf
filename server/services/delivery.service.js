const fs=require('node:fs/promises');
const path=require('node:path');
const nodemailer=require('nodemailer');
const {AppError}=require('../utils/errors');
const {emailDeliveryConfigured,bridgeDeliveryConfigured}=require('../config/environment');

let emailTransport;
function getEmailTransport(){
  if(emailTransport)return emailTransport;
  emailTransport=nodemailer.createTransport({
    host:process.env.SMTP_HOST,
    port:Number(process.env.SMTP_PORT)||465,
    secure:String(process.env.SMTP_SECURE||'true').toLowerCase()==='true',
    auth:{user:process.env.SMTP_USER,password:String(process.env.SMTP_PASS||'').replace(/\s/g,'')},
    disableFileAccess:true,
    disableUrlAccess:true
  });
  return emailTransport;
}

const purposeLabel={verify:'account verification',recovery:'password recovery',admin:'administrator verification'};
async function deliverEmail(message){
  const label=purposeLabel[message.purpose]||'verification';
  await getEmailTransport().sendMail({
    from:process.env.SMTP_FROM,
    to:message.target,
    subject:`Your Loveraf ${label} code`,
    text:`Your Loveraf verification code is ${message.code}. It expires in 10 minutes. Never share this code with anyone.`,
    html:`<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;padding:24px"><h2 style="color:#f4144f">Loveraf</h2><p>Use this code for ${label}:</p><p style="font-size:32px;font-weight:700;letter-spacing:8px;margin:24px 0">${message.code}</p><p>This code expires in 10 minutes. Never share it with anyone.</p></div>`
  });
}

async function deliverBridge(message){
  const endpoint=message.channel==='email'?process.env.OTP_EMAIL_ENDPOINT:process.env.OTP_SMS_ENDPOINT;
  const response=await fetch(endpoint,{method:'POST',headers:{'content-type':'application/json',authorization:`Bearer ${process.env.PROVIDER_BRIDGE_TOKEN}`},body:JSON.stringify(message)});
  if(!response.ok)throw new Error(`Provider returned HTTP ${response.status}.`);
}

async function providerDelivery(message){
  if(process.env.NODE_ENV==='production'){
    try{
      if(message.channel==='email'&&emailDeliveryConfigured())return await deliverEmail(message);
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
