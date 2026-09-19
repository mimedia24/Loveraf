require('dotenv').config();
const {connectDatabase,disconnectDatabase}=require('./config/database');
const {createApplication}=require('./app');
const {seedSystem}=require('./services/seed.service');
const {validateProductionEnvironment}=require('./config/environment');
const logger=require('./utils/logger');
const {processDueReferrals}=require('./services/referral.service');
const {processDueAffiliates}=require('./services/affiliate.service');
const {processPushQueue}=require('./services/push.service');
const {processScheduledCampaigns}=require('./services/notification-campaign.service');

async function start(){
  validateProductionEnvironment();
  await connectDatabase();
  await seedSystem();
  const {server,io}=createApplication();
  const port=Number(process.env.PORT)||3001;
  const host=process.env.HOST||'127.0.0.1';
  server.listen(port,host,()=>console.log(`Loveraf API listening on ${host}:${port}`));
  const referralSweep=async()=>{try{const [referrals,affiliates,campaigns,push]=await Promise.all([processDueReferrals(),processDueAffiliates(),processScheduledCampaigns(),processPushQueue()]);if(referrals.failed||affiliates.failed||campaigns.failed||push.failed)logger.warn('Background sweep completed with failures.',{referrals,affiliates,campaigns,push});}catch(error){logger.error('Background sweep failed.',error);}};
  await referralSweep();
  const referralTimer=setInterval(referralSweep,5*60*1000);referralTimer.unref();
  let stopping=false;
  const shutdown=signal=>{
    if(stopping)return;
    stopping=true;
    clearInterval(referralTimer);
    console.log(`${signal} received; shutting down.`);
    const force=setTimeout(()=>process.exit(1),10000);force.unref();
    io.close(async()=>{
      try{await disconnectDatabase();process.exit(0);}catch(error){logger.error('Shutdown failed.',error);process.exit(1);}
    });
  };
  process.once('SIGTERM',()=>shutdown('SIGTERM'));
  process.once('SIGINT',()=>shutdown('SIGINT'));
}

start().catch(error=>{logger.error('Server startup failed.',error);process.exitCode=1;});
