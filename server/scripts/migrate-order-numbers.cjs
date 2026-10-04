require('dotenv').config();
const {connectDatabase,disconnectDatabase}=require('../config/database');
const {Order}=require('../models/commerce.model');
async function run(){
  await connectDatabase();
  const rows=await Order.find({$or:[{orderNumber:{$exists:false}},{orderNumber:null},{orderNumber:{$not:/^\d{8}$/}}]}).select('_id orderNumber').lean();
  let updated=0;
  for(const row of rows){
    for(let attempt=0;attempt<12;attempt++){
      const number=String(Math.floor(10000000+Math.random()*90000000));
      try{const result=await Order.updateOne({_id:row._id,$or:[{orderNumber:{$exists:false}},{orderNumber:null},{orderNumber:{$not:/^\d{8}$/}}]},{$set:{orderNumber:number}});if(result.modifiedCount){updated++;break;}break;}catch(error){if(error?.code!==11000)throw error;}
    }
  }
  const statusResult=await Order.updateMany(
    {
      status:'confirmed',
      sellerOrders:{
        $elemMatch:{status:'confirmed','shipment.status':'unbooked'},
        $not:{$elemMatch:{$or:[
          {status:{$nin:['confirmed','cancelled']}},
          {status:'confirmed','shipment.status':{$ne:'unbooked'}},
        ]}},
      },
    },
    {
      $set:{status:'awaiting_confirmation','sellerOrders.$[part].status':'awaiting_confirmation'},
      $inc:{'sellerOrders.$[part].version':1},
      $push:{'sellerOrders.$[part].statusHistory':{status:'awaiting_confirmation',reason:'Queued for Loveraf confirmation during order-flow migration.',at:new Date()}},
    },
    {arrayFilters:[{'part.status':'confirmed','part.shipment.status':'unbooked'}]},
  );
  console.log(JSON.stringify({matched:rows.length,orderNumbersUpdated:updated,ordersQueuedForConfirmation:statusResult.modifiedCount}));
}
run().catch(error=>{console.error(error.message);process.exitCode=1;}).finally(()=>disconnectDatabase());
