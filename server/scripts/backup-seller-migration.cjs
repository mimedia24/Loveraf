require('dotenv').config();
const fs=require('node:fs/promises');
const {EJSON}=require('bson');
const {connectDatabase,disconnectDatabase}=require('../config/database');
async function main(){
 const db=(await connectDatabase()).db;
 const directory=process.argv[2];if(!directory?.startsWith('/var/backups/loveraf/'))throw new Error('Invalid backup path');
 await fs.mkdir(directory,{recursive:true,mode:0o700});
 for(const name of ['users','sellers']){
  const collection=db.collection(name),documents=await collection.find().toArray(),indexes=await collection.indexes();
  await fs.writeFile(`${directory}/${name}.ejson`,EJSON.stringify({documents,indexes},{relaxed:false}),{mode:0o600,flag:'wx'});
  console.log(`Backed up ${name}: ${documents.length} records`);
 }
}
main().catch(e=>{console.error(e.message);process.exitCode=1;}).finally(()=>disconnectDatabase());
