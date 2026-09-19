require('dotenv').config();
const fs=require('node:fs/promises');
const path=require('node:path');
const crypto=require('node:crypto');
const mongoose=require('mongoose');
const {EJSON}=require('bson');
let runCollection,runId;

async function main(){
  const directory=path.resolve(process.argv[2]||'');
  if(!process.argv[2])throw new Error('Usage: node scripts/backup-database.cjs <new-backup-directory>');
  await fs.mkdir(directory,{recursive:false,mode:0o700});
  await mongoose.connect(process.env.MONGODB_URI,{autoIndex:false});
  const db=mongoose.connection.db;runCollection=db.collection('operationalruns');runId=new mongoose.Types.ObjectId();await runCollection.insertOne({_id:runId,kind:'backup',status:'started',startedAt:new Date(),createdAt:new Date(),updatedAt:new Date(),version:0});const collections=(await db.listCollections({}, {nameOnly:true}).toArray()).map(item=>item.name).filter(name=>!name.startsWith('system.')).sort();
  const manifest={format:1,database:db.databaseName,createdAt:new Date().toISOString(),collections:[]};
  for(const name of collections){
    const collection=db.collection(name),documents=await collection.find({}).toArray(),indexes=await collection.indexes();
    const payload=EJSON.stringify({documents,indexes},{relaxed:false}),file=`${name}.ejson`,digest=crypto.createHash('sha256').update(payload).digest('hex');
    await fs.writeFile(path.join(directory,file),payload,{encoding:'utf8',mode:0o600,flag:'wx'});
    manifest.collections.push({name,file,count:documents.length,sha256:digest});
  }
  await fs.writeFile(path.join(directory,'manifest.json'),JSON.stringify(manifest,null,2),{encoding:'utf8',mode:0o600,flag:'wx'});
  await runCollection.updateOne({_id:runId},{$set:{status:'succeeded',completedAt:new Date(),summary:{collections:manifest.collections.length,database:manifest.database},updatedAt:new Date()}});
  console.log(`Backup complete: ${manifest.collections.length} collections from ${manifest.database}.`);
}
main().catch(async error=>{if(runCollection&&runId)await runCollection.updateOne({_id:runId},{$set:{status:'failed',completedAt:new Date(),errorCode:'BACKUP_FAILED',updatedAt:new Date()}}).catch(()=>{});console.error(error.message);process.exitCode=1;}).finally(()=>mongoose.disconnect());
