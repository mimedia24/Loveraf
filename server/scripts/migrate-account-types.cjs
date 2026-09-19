// Run only as a reviewed deployment migration. No personal account is converted to seller.
require('dotenv').config();
const {connectDatabase,disconnectDatabase}=require('../config/database');
const {User}=require('../models/account.model');
async function main(){
 await connectDatabase();
 await User.updateMany({accountType:{$exists:false}},{$set:{accountType:'personal'}});
 await User.collection.createIndex({accountType:1,email:1},{unique:true,partialFilterExpression:{email:{$type:'string'}}});
 await User.collection.createIndex({accountType:1,phone:1},{unique:true,partialFilterExpression:{phone:{$type:'string'}}});
 const indexes=await User.collection.indexes();
 for(const name of ['email_1','phone_1'])if(indexes.some(i=>i.name===name))await User.collection.dropIndex(name);
 console.log('Independent account credential indexes prepared. Existing personal accounts preserved.');
}
main().catch(e=>{console.error(e.message);process.exitCode=1;}).finally(()=>disconnectDatabase());
