require('dotenv').config();
const {connectDatabase,disconnectDatabase}=require('./config/database');
const {createApplication}=require('./app');
const {seedSystem}=require('./services/seed.service');
const {validateProductionEnvironment}=require('./config/environment');

async function start(){
  validateProductionEnvironment();
  await connectDatabase();
  await seedSystem();
  const {server,io}=createApplication();
  const port=Number(process.env.PORT)||3001;
  const host=process.env.HOST||'127.0.0.1';
  server.listen(port,host,()=>console.log(`Loveraf API listening on ${host}:${port}`));
  let stopping=false;
  const shutdown=signal=>{
    if(stopping)return;
    stopping=true;
    console.log(`${signal} received; shutting down.`);
    const force=setTimeout(()=>process.exit(1),10000);force.unref();
    io.close(async()=>{
      try{await disconnectDatabase();process.exit(0);}catch(error){console.error(error);process.exit(1);}
    });
  };
  process.once('SIGTERM',()=>shutdown('SIGTERM'));
  process.once('SIGINT',()=>shutdown('SIGINT'));
}

start().catch(error=>{console.error(error);process.exitCode=1;});
