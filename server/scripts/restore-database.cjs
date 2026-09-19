require('dotenv').config();
const fs=require('node:fs/promises');
const path=require('node:path');
const crypto=require('node:crypto');
const mongoose=require('mongoose');
const {EJSON}=require('bson');

async function main(){
  const directory=path.resolve(process.argv[2]||''),uri=process.env.MONGODB_RESTORE_URI;
  if(!process.argv[2]||!uri)throw new Error('Set MONGODB_RESTORE_URI and pass the backup directory.');
  if(process.env.RESTORE_CONFIRM!=='RESTORE_INTO_EMPTY_NON_PRODUCTION_DATABASE')throw new Error('Set RESTORE_CONFIRM=RESTORE_INTO_EMPTY_NON_PRODUCTION_DATABASE.');
  if(uri===process.env.MONGODB_URI)throw new Error('Restore target must not be the application database URI.');
  const targetName=new URL(uri.replace(/^mongodb\+srv:/,'mongodb:')).pathname.replace(/^\//,'').split('?')[0];
  if(!targetName||!/(restore|rehearsal|test)/i.test(targetName))throw new Error('Restore database name must include restore, rehearsal or test.');
  const manifest=JSON.parse(await fs.readFile(path.join(directory,'manifest.json'),'utf8'));
  await mongoose.connect(uri,{autoIndex:false});const db=mongoose.connection.db;
  const existing=(await db.listCollections({}, {nameOnly:true}).toArray()).filter(item=>!item.name.startsWith('system.'));
  if(existing.length)throw new Error('Restore target must be empty.');
  for(const entry of manifest.collections){
    if(!/^[a-zA-Z0-9_.-]+$/.test(entry.name)||path.basename(entry.file)!==entry.file)throw new Error('Backup manifest contains an invalid collection entry.');
    const payload=await fs.readFile(path.join(directory,entry.file),'utf8'),digest=crypto.createHash('sha256').update(payload).digest('hex');
    if(digest!==entry.sha256)throw new Error(`Checksum mismatch: ${entry.file}`);
    const {documents,indexes}=EJSON.parse(payload);
    await db.createCollection(entry.name);const collection=db.collection(entry.name);
    if(documents.length)await collection.insertMany(documents,{ordered:true});
    const custom=(indexes||[]).filter(index=>index.name!=='_id_').map(({v,ns,...index})=>index);
    if(custom.length)await collection.createIndexes(custom);
    if(await collection.countDocuments({})!==entry.count)throw new Error(`Count mismatch after restoring ${entry.name}.`);
  }
  console.log(`Restore rehearsal complete in ${db.databaseName}: ${manifest.collections.length} collections.`);
}
main().catch(error=>{console.error(error.message);process.exitCode=1;}).finally(()=>mongoose.disconnect());
