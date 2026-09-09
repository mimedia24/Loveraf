const {AppError}=require('../utils/errors');
function notFoundHandler(req,_res,next){next(new AppError(404,'NOT_FOUND',`Cannot ${req.method} ${req.originalUrl}`));}
function errorHandler(error,_req,res,_next){
  if(error?.name==='ZodError'){const fields=error.flatten().fieldErrors,message='Check the highlighted information.';return res.status(400).json({message,fields,error:{code:'VALIDATION_ERROR',message,fields}});}
  if(error?.name==='MongoServerError'&&error.code===11000){const message='This information is already in use.';return res.status(409).json({message,fields:error.keyPattern,error:{code:'CONFLICT',message,fields:error.keyPattern}});}
  const status=error instanceof AppError?error.status:500;
  if(status===500&&process.env.NODE_ENV!=='test')console.error(error);
  const message=status===500?'Something went wrong.':error.message;return res.status(status).json({message,details:error.details,error:{code:error.code||'SERVER_ERROR',message,details:error.details}});
}
module.exports={notFoundHandler,errorHandler};
