const {test}=require('node:test');
const assert=require('node:assert/strict');
const nodemailer=require('nodemailer');
const {providerCapabilities}=require('../config/environment');
const {providerDelivery}=require('../services/delivery.service');
const {smtpOptions}=require('../services/smtp.service');

test('SMTP capability, encrypted transport and provider failure handling',async()=>{
  const keys=['NODE_ENV','SMTP_HOST','SMTP_PORT','SMTP_USER','SMTP_PASSWORD','SMTP_FROM','OTP_EMAIL_ENDPOINT','PROVIDER_BRIDGE_TOKEN'];
  const previous=Object.fromEntries(keys.map(key=>[key,process.env[key]]));
  const original=nodemailer.createTransport;
  let closed=0,mail;
  try{
    for(const key of keys)delete process.env[key];
    process.env.NODE_ENV='production';
    assert.equal(providerCapabilities().email_verification,false);
    await assert.rejects(providerDelivery({channel:'email'}),error=>error.code==='PROVIDER_UNAVAILABLE');
    Object.assign(process.env,{SMTP_HOST:'smtp.example.test',SMTP_USER:'test',SMTP_PASSWORD:'test-secret',SMTP_FROM:'noreply@example.test',SMTP_PORT:'587'});
    assert.equal(providerCapabilities().email_verification,true);
    assert.equal(smtpOptions().requireTLS,true);
    assert.equal(smtpOptions().secure,false);
    process.env.SMTP_PORT='465';assert.equal(smtpOptions().secure,true);
    nodemailer.createTransport=()=>({sendMail:async value=>{mail=value;return {accepted:['buyer@example.test']};},close:()=>{closed++;}});
    await providerDelivery({channel:'email',target:'buyer@example.test',code:'123456'});
    assert.equal(mail.to,'buyer@example.test');assert.match(mail.text,/123456/);assert.equal(closed,1);
    nodemailer.createTransport=()=>({sendMail:async()=>{throw new Error('private provider diagnostic');},close:()=>{closed++;}});
    await assert.rejects(providerDelivery({channel:'email',target:'buyer@example.test',code:'123456'}),error=>error.code==='PROVIDER_UNAVAILABLE'&&!error.message.includes('private'));
    assert.equal(closed,2);
    process.env.SMTP_PORT='25';assert.equal(providerCapabilities().email_verification,false);
  }finally{
    nodemailer.createTransport=original;
    for(const key of keys){if(previous[key]===undefined)delete process.env[key];else process.env[key]=previous[key];}
  }
});
