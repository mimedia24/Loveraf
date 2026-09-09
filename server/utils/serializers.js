function id(value){return String(value?._id||value?.id||value);}
function user(value,session){return {id:id(value),name:value.name,email:value.email||'',phone:value.phone||'',email_verified:value.emailVerified,phone_verified:value.phoneVerified,roles:value.roles,preferences:{push:true,offers:true,language:value.language||'en',...(value.preferences||{})},mfa:Boolean(session?.mfaAt)};}
function seller(value){return {id:id(value),name:value.name,handle:value.handle,category:value.category,status:value.status,version:value.version,createdAt:value.createdAt};}
function product(value){
  const raw=value.toObject?value.toObject():value;
  return {id:id(raw),sellerId:id(raw.seller),title:raw.title,description:raw.description,category:raw.category,sku:raw.sku,price:raw.priceMinor/100,oldPrice:raw.oldPriceMinor?raw.oldPriceMinor/100:undefined,stock:raw.stock,sizes:raw.sizes,images:(raw.images||[]).map(image=>({id:id(image.mediaId),uri:image.uri})),variants:raw.variants,returnDays:raw.returnDays,exchangeDays:raw.exchangeDays,deliveryMinDays:raw.deliveryMinDays,deliveryMaxDays:raw.deliveryMaxDays,codAvailable:raw.codAvailable,status:raw.status,version:raw.version,rating:raw.ratingCount?raw.ratingTotal/raw.ratingCount:0,sold:String(raw.soldUnits||0),art:'watch',color:`${raw.variants?.[0]?.swatch||'#081426'}20`,badge:raw.oldPriceMinor?'SALE':'NEW',createdAt:raw.createdAt};
}
module.exports={id,user,seller,product};
