const {z}=require('zod');
const objectId=z.string().regex(/^[a-f\d]{24}$/i);
const uuid=z.string().uuid();
const password=z.string().min(10).max(200);
const body=schema=>z.object({body:schema,query:z.any(),params:z.any()});
const auth={
  register:body(z.object({name:z.string().trim().min(2).max(120),email:z.string().email().optional(),phone:z.string().regex(/^01\d{9}$/).optional(),password,device:z.record(z.string(),z.any()).optional()}).strict()),
  login:body(z.object({login:z.string().trim().min(3).max(200),password,device:z.record(z.string(),z.any()).optional()}).strict()),
  challenge:body(z.object({channel:z.enum(['email','phone']),purpose:z.enum(['verify','admin'])}).strict()),
  recovery:body(z.object({login:z.string().min(3),channel:z.enum(['email','phone']).optional()}).strict()),
  verify:body(z.object({challengeId:objectId,code:z.string().regex(/^\d{6}$/)}).strict()),
  reset:body(z.object({challengeId:objectId,code:z.string().regex(/^\d{6}$/),password}).strict()),
  reauth:body(z.object({password}).strict())
};
const seller=body(z.object({name:z.string().trim().min(2).max(150),handle:z.string().trim().regex(/^[a-z0-9][a-z0-9_-]{2,39}$/i),category:z.string().trim().min(2).max(100)}).strict());
const image=z.object({id:objectId,uri:z.string().optional()}).strict();
const variant=z.object({name:z.string().min(1).max(100),swatch:z.string().regex(/^#[0-9a-f]{6}$/i),imageIds:z.array(objectId).min(1).max(10)}).strict();
const product=body(z.object({title:z.string().trim().min(3).max(240),description:z.string().trim().min(10).max(10000),category:z.string().trim().min(2).max(100),sku:z.string().trim().min(2).max(100),price:z.number().positive(),oldPrice:z.number().positive().optional(),stock:z.number().int().min(0).max(1000000),sizes:z.array(z.string().min(1).max(50)).min(1).max(30),images:z.array(image).min(1).max(20),variants:z.array(variant).min(1).max(30),returnDays:z.number().int().min(0).max(365),exchangeDays:z.number().int().min(0).max(365),deliveryMinDays:z.number().int().min(0).max(90),deliveryMaxDays:z.number().int().min(0).max(90),codAvailable:z.boolean()}).strict().superRefine((value,ctx)=>{
  if(value.oldPrice&&value.oldPrice<value.price)ctx.addIssue({code:'custom',path:['oldPrice'],message:'Regular price must be at least the sale price.'});
  if(value.deliveryMaxDays<value.deliveryMinDays)ctx.addIssue({code:'custom',path:['deliveryMaxDays'],message:'Maximum delivery days cannot be lower.'});
  const ids=new Set(value.images.map(item=>item.id));if(value.variants.some(item=>item.imageIds.some(id=>!ids.has(id))))ctx.addIssue({code:'custom',path:['variants'],message:'Each color image must belong to the uploaded gallery.'});
}));
const address=body(z.object({title:z.string().min(1).max(80),name:z.string().min(2).max(120),mobile:z.string().regex(/^01\d{9}$/),division:z.string().min(2).max(100),district:z.string().min(2).max(100),details:z.string().min(5).max(500),isDefault:z.boolean().optional()}).strict());
const cart=body(z.object({productId:objectId,qty:z.number().int().min(1).max(999),color:z.string().min(1).max(100),size:z.string().min(1).max(100)}).strict());
const buyNow=z.object({productId:objectId,qty:z.number().int().min(1).max(999),color:z.string().min(1).max(100),size:z.string().min(1).max(100)}).strict();
const checkout=body(z.object({addressId:objectId,paymentMethod:z.enum(['cod','bkash','card']),promo:z.boolean().default(false),buyNow:buyNow.optional()}).strict());
module.exports={z,objectId,uuid,body,auth,seller,product,address,cart,checkout};
