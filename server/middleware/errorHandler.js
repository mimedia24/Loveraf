const {AppError}=require('../utils/errors');
const logger=require('../utils/logger');
function notFoundHandler(req,_res,next){next(new AppError(404,'NOT_FOUND',`Cannot ${req.method} ${req.originalUrl}`));}
const firstMessages=values=>Object.fromEntries(Object.entries(values||{}).flatMap(([key,value])=>{const message=Array.isArray(value)?value[0]:value;return typeof message==='string'&&message?[[key,message]]:[];}));
const zodFields=error=>{const fields={};for(const issue of error.issues||[]){const path=issue.path.filter(item=>!['body','query','params'].includes(String(item))),key=String(path[0]||'form');if(!fields[key])fields[key]=issue.message;}return fields;};
function errorHandler(error,_req,res,_next){
  if(error?.name==='ZodError'){const fields=zodFields(error),message='Check the highlighted information.';return res.status(400).json({message,fields,error:{code:'VALIDATION_ERROR',message,fields}});}
  if(error?.name==='MongoServerError'&&error.code===11000){const keys=Object.keys(error.keyPattern||{}),key=keys.find(item=>['email','phone','storeId','handle'].includes(item))||keys[0],fields=key?{[key]:`This ${key==='phone'?'mobile number':key==='storeId'?'Store ID':key} is already in use.`}:{},message=Object.values(fields)[0]||'This information is already in use.';return res.status(409).json({message,fields,error:{code:'CONFLICT',message,fields}});}
  const status=error instanceof AppError?error.status:500;
  if(status===500&&process.env.NODE_ENV!=='test')logger.error('Unhandled request error.',error);
  const message=status===500?'Something went wrong.':error.message,fields=firstMessages(error.details?.fields);return res.status(status).json({message,...(Object.keys(fields).length?{fields}:{}),details:error.details,error:{code:error.code||'SERVER_ERROR',message,...(Object.keys(fields).length?{fields}:{}),details:error.details}});
}
module.exports={notFoundHandler,errorHandler};
