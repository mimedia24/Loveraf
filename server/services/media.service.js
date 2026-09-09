const fs=require('node:fs/promises');
const path=require('node:path');
const crypto=require('node:crypto');
const {cloudinary,configureCloudinary}=require('../config/cloudinary');
const {Media}=require('../models/catalog.model');
const {AppError}=require('../utils/errors');

async function uploadMedia(user,file){
  let uri,publicId;
  if(configureCloudinary()){
    const result=await new Promise((resolve,reject)=>{const stream=cloudinary.uploader.upload_stream({folder:'loveraf/products',resource_type:'image'},(error,value)=>error?reject(error):resolve(value));stream.end(file.buffer);});
    uri=result.secure_url;publicId=result.public_id;
  }else{
    if(process.env.NODE_ENV==='production')throw new AppError(503,'PROVIDER_UNAVAILABLE','Image storage is not configured.');
    const extension={"image/jpeg":'.jpg',"image/png":'.png',"image/webp":'.webp'}[file.mimetype];const name=`${crypto.randomUUID()}${extension}`;const directory=path.join(process.cwd(),'uploads');await fs.mkdir(directory,{recursive:true});await fs.writeFile(path.join(directory,name),file.buffer);uri=`/uploads/${name}`;
  }
  return Media.create({owner:user._id,publicId,uri,mime:file.mimetype,bytes:file.size});
}
module.exports={uploadMedia};
