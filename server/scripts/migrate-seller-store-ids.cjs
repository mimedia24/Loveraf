require('dotenv').config();
const crypto=require('node:crypto');
const {connectDatabase,disconnectDatabase}=require('../config/database');
const {Seller}=require('../models/account.model');

const nextId=()=>String(crypto.randomInt(100000,1000000));
async function run(){
  await connectDatabase();
  const sellers=await Seller.find({$or:[{storeId:{$exists:false}},{storeId:null},{storeId:''}]}).sort({_id:1});
  let updated=0;
  for(const seller of sellers){
    for(let attempt=0;attempt<20;attempt+=1){
      const storeId=nextId();
      try{const result=await Seller.updateOne({_id:seller._id,$or:[{storeId:{$exists:false}},{storeId:null},{storeId:''}]},{$set:{storeId}});if(result.modifiedCount)updated+=1;break;}
      catch(error){if(!(error?.code===11000&&error?.keyPattern?.storeId))throw error;if(attempt===19)throw error;}
    }
  }
  await Seller.syncIndexes();
  console.log(`Seller Store IDs added: ${updated}`);
}
run().catch(error=>{console.error(error.message);process.exitCode=1;}).finally(()=>disconnectDatabase());
