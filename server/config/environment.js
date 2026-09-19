const {URL}=require('node:url');

function parseOrigins(value=process.env.APP_ORIGINS){
  return String(value||'').split(',').map(origin=>origin.trim()).filter(Boolean);
}

function bridgeDeliveryConfigured(channel){
  const endpoint=channel==='email'?process.env.OTP_EMAIL_ENDPOINT:process.env.OTP_SMS_ENDPOINT;
  return Boolean(endpoint?.startsWith('https://')&&process.env.PROVIDER_BRIDGE_TOKEN);
}

function smtpConfigured(){
  return Boolean(process.env.SMTP_HOST&&process.env.SMTP_USER&&process.env.SMTP_PASSWORD&&process.env.SMTP_FROM&&[465,587].includes(Number(process.env.SMTP_PORT||587)));
}

function pushConfigured(){
  const raw=process.env.PUSH_TOKEN_ENCRYPTION_KEY||'';
  let key;
  try{key=/^[a-f0-9]{64}$/i.test(raw)?Buffer.from(raw,'hex'):Buffer.from(raw,'base64');}catch{key=Buffer.alloc(0);}
  return Boolean(process.env.PUSH_CLIENT_ENABLED==='true'&&process.env.PUSH_BRIDGE_ENDPOINT?.startsWith('https://')&&process.env.PUSH_BRIDGE_TOKEN&&key.length===32);
}

function providerCapabilities(){
  const emailVerification=bridgeDeliveryConfigured('email')||smtpConfigured();
  const mobileVerification=bridgeDeliveryConfigured('phone');
  const mediaUpload=process.env.MEDIA_STORAGE==='local'||Boolean(
    process.env.CLOUDINARY_CLOUD_NAME&&process.env.CLOUDINARY_API_KEY&&process.env.CLOUDINARY_API_SECRET
  );
  const paymentMethods=Boolean(process.env.PAYMENT_METHOD_BRIDGE_ENDPOINT?.startsWith('https://')&&process.env.PAYMENT_METHOD_BRIDGE_TOKEN);
  return {admin_mfa_required:process.env.ADMIN_REQUIRE_MFA==='true',verification:emailVerification||mobileVerification,email_verification:emailVerification,mobile_verification:mobileVerification,password_recovery:emailVerification||mobileVerification,social_login:false,media_upload:mediaUpload,payment_methods:paymentMethods,online_payment:false,courier_automation:false,manual_courier_tracking:true,push_notifications:pushConfigured(),biometric_unlock:true,localization:true};
}

function validateProductionEnvironment(){
  if(process.env.NODE_ENV!=='production')return;
  const errors=[];
  if(!process.env.MONGODB_URI?.startsWith('mongodb'))errors.push('MONGODB_URI must be a MongoDB connection string.');
  if((process.env.JWT_ACCESS_SECRET||'').length<32)errors.push('JWT_ACCESS_SECRET must contain at least 32 characters.');
  if((process.env.OTP_HMAC_SECRET||'').length<32)errors.push('OTP_HMAC_SECRET must contain at least 32 characters.');
  const origins=parseOrigins();
  if(!origins.length)errors.push('APP_ORIGINS must contain at least one HTTPS origin.');
  for(const origin of origins){
    try{const parsed=new URL(origin);if(parsed.protocol!=='https:'||parsed.origin!==origin)throw new Error();}
    catch{errors.push(`APP_ORIGINS contains an invalid HTTPS origin: ${origin}`);}
  }
  const pushValues=[process.env.PUSH_BRIDGE_ENDPOINT,process.env.PUSH_BRIDGE_TOKEN,process.env.PUSH_TOKEN_ENCRYPTION_KEY].filter(Boolean);
  if(pushValues.length&&pushValues.length!==3)errors.push('Push delivery requires PUSH_BRIDGE_ENDPOINT, PUSH_BRIDGE_TOKEN and PUSH_TOKEN_ENCRYPTION_KEY together.');
  if(process.env.PUSH_CLIENT_ENABLED==='true'&&pushValues.length===3&&!pushConfigured())errors.push('Push delivery requires an HTTPS endpoint and a 32-byte hex/base64 encryption key.');
  if(errors.length)throw new Error(`Production environment is invalid:\n- ${errors.join('\n- ')}`);
}

module.exports={parseOrigins,bridgeDeliveryConfigured,smtpConfigured,pushConfigured,providerCapabilities,validateProductionEnvironment};
