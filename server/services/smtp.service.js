const nodemailer=require('nodemailer');
const {smtpConfigured}=require('../config/environment');

function smtpOptions(){
  if(!smtpConfigured())throw new Error('SMTP is not configured.');
  const port=Number(process.env.SMTP_PORT||587);
  return {host:process.env.SMTP_HOST,port,secure:port===465,requireTLS:true,
    auth:{user:process.env.SMTP_USER,pass:process.env.SMTP_PASSWORD},
    connectionTimeout:10000,greetingTimeout:10000,socketTimeout:15000,
    logger:false,debug:false};
}

async function deliverSmtp(message){
  const transport=nodemailer.createTransport(smtpOptions());
  try{
    const result=await transport.sendMail({from:process.env.SMTP_FROM,to:message.target,
      subject:'Loveraf verification code',
      text:`Your Loveraf code is ${message.code}. It expires in 10 minutes. Do not share this code. If you did not request it, ignore this email.`,
      disableFileAccess:true,disableUrlAccess:true});
    if(!result.accepted?.length)throw new Error('Recipient was not accepted.');
  }finally{transport.close();}
}
module.exports={deliverSmtp,smtpOptions};
