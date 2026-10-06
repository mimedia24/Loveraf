/* Idempotent additive migration. Run with the production database explicitly selected. */
const mongoose=require('mongoose');
const {Product,Inventory}=require('../models/catalog.model');
const {keyFor}=require('../services/variant.service');
async function run(){
  await mongoose.connect(process.env.MONGO_URI);
  const cursor=Product.find({}).cursor(); let count=0;
  for await(const product of cursor){
    if(Array.isArray(product.variants)&&product.variants.some(v=>v.id&&v.key))continue;
    const legacy=[]; const colors=product.variants?.length?product.variants:[{name:'Default',swatch:'#081426',imageIds:[]}]; const sizes=product.sizes?.length?product.sizes:['Default'];
    for(const color of colors)for(const size of sizes){const attributes={color:color.name,size};const key=keyFor(attributes);legacy.push({id:new mongoose.Types.ObjectId().toString(),key,attributes,name:color.name,swatch:color.swatch,imageIds:color.imageIds||[],sku:`${product.sku}-${color.name}-${size}`.replace(/[^A-Za-z0-9-]/g,'-').slice(0,120)});}
    product.variants=legacy; product.stock=product.stock||0; await product.save();
    for(const row of legacy){const old=await Inventory.findOne({product:product._id,color:row.name,size:row.attributes.size}); if(old){old.variantId=row.id;old.variantKey=row.key;old.attributes=row.attributes;old.sku=row.sku;await old.save();}else await Inventory.create({product:product._id,variantId:row.id,variantKey:row.key,attributes:row.attributes,sku:row.sku,color:row.name,size:row.attributes.size,stock:product.stockPerCombination||product.stock||0});}
    count++;
  }
  console.log(`Migrated ${count} products`); await mongoose.disconnect();
}
if(require.main===module)run().catch(error=>{console.error(error);process.exitCode=1});
module.exports=run;
