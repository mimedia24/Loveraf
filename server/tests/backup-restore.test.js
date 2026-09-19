const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {spawnSync}=require('node:child_process');
const mongoose=require('mongoose');
const {MongoMemoryReplSet}=require('mongodb-memory-server');

test('database backup verifies and restores into a separate empty rehearsal database',async()=>{
  const replica=await MongoMemoryReplSet.create({replSet:{count:1}}),directory=fs.mkdtempSync(path.join(os.tmpdir(),'loveraf-backup-'));
  const source=replica.getUri('loveraf_backup_source'),target=replica.getUri('loveraf_restore_rehearsal');
  try{
    await mongoose.connect(source);await mongoose.connection.db.collection('proof').insertMany([{value:1},{value:2}]);await mongoose.disconnect();
    const backup=spawnSync(process.execPath,['scripts/backup-database.cjs',path.join(directory,'snapshot')],{cwd:process.cwd(),env:{...process.env,MONGODB_URI:source},encoding:'utf8'});
    assert.equal(backup.status,0,backup.stderr||backup.stdout);
    const restore=spawnSync(process.execPath,['scripts/restore-database.cjs',path.join(directory,'snapshot')],{cwd:process.cwd(),env:{...process.env,MONGODB_URI:source,MONGODB_RESTORE_URI:target,RESTORE_CONFIRM:'RESTORE_INTO_EMPTY_NON_PRODUCTION_DATABASE'},encoding:'utf8'});
    assert.equal(restore.status,0,restore.stderr||restore.stdout);
    await mongoose.connect(target);assert.equal(await mongoose.connection.db.collection('proof').countDocuments({}),2);await mongoose.disconnect();
    const refuse=spawnSync(process.execPath,['scripts/restore-database.cjs',path.join(directory,'snapshot')],{cwd:process.cwd(),env:{...process.env,MONGODB_URI:source,MONGODB_RESTORE_URI:source,RESTORE_CONFIRM:'RESTORE_INTO_EMPTY_NON_PRODUCTION_DATABASE'},encoding:'utf8'});
    assert.notEqual(refuse.status,0);assert.match(refuse.stderr,/must not be the application database URI/);
  }finally{await mongoose.disconnect();await replica.stop();fs.rmSync(directory,{recursive:true,force:true});}
});
