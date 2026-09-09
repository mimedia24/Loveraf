const {URL}=require('node:url');

function parseOrigins(value=process.env.APP_ORIGINS){
  return String(value||'').split(',').map(origin=>origin.trim()).filter(Boolean);
}

function bridgeDeliveryConfigured(channel){
  const endpoint=channel==='email'?process.env.OTP_EMAIL_ENDPOINT:process.env.OTP_SMS_ENDPOINT;
  return Boolean(endpoint?.startsWith('https://')&&process.env.PROVIDER_BRIDGE_TOKEN);
}

function providerCapabilities(){
  const emailVerification=bridgeDeliveryConfigured('email');
  const mobileVerification=bridgeDeliveryConfigured('phone');
  const mediaUpload=Boolean(
    process.env.CLOUDINARY_CLOUD_NAME&&process.env.CLOUDINARY_API_KEY&&process.env.CLOUDINARY_API_SECRET
  );
  return {verification:emailVerification||mobileVerification,email_verification:emailVerification,mobile_verification:mobileVerification,media_upload:mediaUpload};
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
  if(errors.length)throw new Error(`Production environment is invalid:\n- ${errors.join('\n- ')}`);
}

module.exports={parseOrigins,bridgeDeliveryConfigured,providerCapabilities,validateProductionEnvironment};
