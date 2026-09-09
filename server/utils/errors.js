class AppError extends Error {
  constructor(status,code,message,details){super(message);this.status=status;this.code=code;this.details=details;}
}
const badRequest=(message,details)=>new AppError(400,'VALIDATION_ERROR',message,details);
const unauthorized=(message='Authentication required.')=>new AppError(401,'AUTHENTICATION_FAILED',message);
const forbidden=(message='You do not have permission for this action.')=>new AppError(403,'PERMISSION_DENIED',message);
const notFound=(message='Resource not found.')=>new AppError(404,'NOT_FOUND',message);
const conflict=message=>new AppError(409,'CONFLICT',message);
module.exports={AppError,badRequest,unauthorized,forbidden,notFound,conflict};
