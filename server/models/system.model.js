const mongoose=require('mongoose');
const {Schema,model}=mongoose;
const options={timestamps:true,versionKey:'version'};
const AuditEvent=model('AuditEvent',new Schema({actor:{type:Schema.Types.ObjectId,ref:'User'},action:{type:String,required:true,index:true},target:String,reason:String,metadata:Schema.Types.Mixed},options));
const Feature=model('Feature',new Schema({key:{type:String,required:true,unique:true},enabled:{type:Boolean,default:false}},options));
const Content=model('Content',new Schema({key:{type:String,required:true,unique:true},data:Schema.Types.Mixed},options));
const BusinessRule=model('BusinessRule',new Schema({key:{type:String,required:true,unique:true},enabled:{type:Boolean,default:false},data:Schema.Types.Mixed},options));
const ledgerAccountSchema=new Schema({owner:{type:Schema.Types.ObjectId,ref:'User',required:true},kind:{type:String,required:true,enum:['promo','pending_promo','earnings','pending_earnings','seller_payable']},currency:{type:String,default:'BDT',enum:['BDT']}},options);
ledgerAccountSchema.index({owner:1,kind:1,currency:1},{unique:true});const LedgerAccount=model('LedgerAccount',ledgerAccountSchema);
const ledgerEntrySchema=new Schema({account:{type:Schema.Types.ObjectId,ref:'LedgerAccount',required:true,index:true},amountMinor:{type:Number,required:true,validate:{validator:Number.isSafeInteger,message:'Ledger amount must be an integer minor-unit value.'}},reference:{type:String,required:true,trim:true,maxlength:200},metadata:Schema.Types.Mixed},options);
ledgerEntrySchema.index({account:1,reference:1},{unique:true});
ledgerEntrySchema.index({account:1,createdAt:-1,_id:-1});
const LedgerEntry=model('LedgerEntry',ledgerEntrySchema);
const withdrawalHistorySchema=new Schema({status:String,reason:String,actor:{type:Schema.Types.ObjectId,ref:'User'},at:{type:Date,default:Date.now}},{_id:false});
const withdrawalSchema=new Schema({
  owner:{type:Schema.Types.ObjectId,ref:'User',required:true,index:true},
  account:{type:Schema.Types.ObjectId,ref:'LedgerAccount',required:true},
  sourceKind:{type:String,enum:['earnings','seller_payable'],default:'earnings',required:true,index:true},
  seller:{type:Schema.Types.ObjectId,ref:'Seller'},
  amountMinor:{type:Number,required:true,min:1},feeMinor:{type:Number,required:true,min:0},payoutMinor:{type:Number,required:true,min:1},currency:{type:String,default:'BDT',enum:['BDT']},
  destination:{method:{type:String,enum:['bkash','nagad','bank'],required:true},account:{type:String,required:true,maxlength:100}},
  status:{type:String,enum:['requested','approved','rejected','paid'],default:'requested',index:true},
  history:[withdrawalHistorySchema],
  settlement:{reference:String,paidAt:Date,actor:{type:Schema.Types.ObjectId,ref:'User'}},
},options);
withdrawalSchema.set('optimisticConcurrency',true);
withdrawalSchema.index({owner:1,createdAt:-1,_id:-1});
withdrawalSchema.index({owner:1,sourceKind:1,seller:1,createdAt:-1,_id:-1});
withdrawalSchema.index({status:1,createdAt:-1,_id:-1});
withdrawalSchema.index({'settlement.reference':1},{unique:true,partialFilterExpression:{'settlement.reference':{$type:'string'}}});
const WithdrawalRequest=model('WithdrawalRequest',withdrawalSchema);
const operationalRunSchema=new Schema({kind:{type:String,enum:['backup','restore'],required:true,index:true},status:{type:String,enum:['started','succeeded','failed'],required:true,index:true},startedAt:{type:Date,required:true},completedAt:Date,summary:Schema.Types.Mixed,errorCode:String},options);operationalRunSchema.index({kind:1,status:1,completedAt:-1});
const OperationalRun=model('OperationalRun',operationalRunSchema);
module.exports={AuditEvent,Feature,Content,BusinessRule,LedgerAccount,LedgerEntry,WithdrawalRequest,OperationalRun};
