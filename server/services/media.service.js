const fs=require('node:fs/promises');
const path=require('node:path');
const crypto=require('node:crypto');
const {cloudinary,configureCloudinary}=require('../config/cloudinary');
const {Media}=require('../models/catalog.model');
const {AppError}=require('../utils/errors');

function detectedImageMime(buffer){
  if(buffer.length>=3&&buffer[0]===0xff&&buffer[1]===0xd8&&buffer[2]===0xff)return 'image/jpeg';
  if(buffer.length>=8&&buffer.subarray(0,8).equals(Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a])))return 'image/png';
  if(buffer.length>=12&&buffer.subarray(0,4).toString('ascii')==='RIFF'&&buffer.subarray(8,12).toString('ascii')==='WEBP')return 'image/webp';
  return null;
}

async function uploadMedia(user,file){
  const mime=detectedImageMime(file.buffer);
  if(!mime)throw new AppError(400,'VALIDATION_ERROR','Upload a valid JPG, PNG or WebP image.');
  let uri,publicId;
  if(configureCloudinary()){
    const result=await new Promise((resolve,reject)=>{const stream=cloudinary.uploader.upload_stream({folder:'loveraf/products',resource_type:'image'},(error,value)=>error?reject(error):resolve(value));stream.end(file.buffer);});
    uri=result.secure_url;publicId=result.public_id;
  }else{
    if(process.env.NODE_ENV==='production'&&process.env.MEDIA_STORAGE!=='local')throw new AppError(503,'PROVIDER_UNAVAILABLE','Image storage is not configured.');
    const extension={"image/jpeg":'.jpg',"image/png":'.png',"image/webp":'.webp'}[mime];
    const name=`${crypto.randomUUID()}${extension}`;const directory=path.resolve(process.env.UPLOAD_DIR||path.join(process.cwd(),'uploads'));await fs.mkdir(directory,{recursive:true});await fs.writeFile(path.join(directory,name),file.buffer,{flag:'wx'});uri=`/uploads/${name}`;
  }
  return Media.create({owner:user._id,publicId,uri,mime,bytes:file.size});
}
module.exports={uploadMedia,detectedImageMime};
