const crypto=require('crypto');
const {badRequest,conflict}=require('../utils/errors');

const clean=(v)=>String(v??'').trim();
const keyFor=(attributes)=>Object.keys(attributes||{}).sort().map(k=>`${k}=${clean(attributes[k]).toLowerCase()}`).join('|');
const slug=(v)=>clean(v).replace(/[^a-z0-9]+/gi,'-').replace(/^-|-$/g,'').toUpperCase().slice(0,18)||'VAR';
const variantId=()=>crypto.randomBytes(9).toString('hex');

function categoryAttributes(category){
  return Array.isArray(category?.variantAttributes)?category.variantAttributes.filter(a=>a&&a.key&&a.useInVariants!==false):[];
}
function normalizeVariants(input, category, parentSku){
  const attrs=categoryAttributes(category);
  let rows=Array.isArray(input.variants)?input.variants:[];
  if(rows.length && rows.every(r=>r && r.attributes)){
    rows=rows.map(r=>({...r,attributes:Object.fromEntries(Object.entries(r.attributes).map(([k,v])=>[k,clean(v)]))}));
  } else {
    const colors=(Array.isArray(input.variants)&&input.variants.length?input.variants.map(v=>v.name):[]).filter(Boolean);
    const sizes=(Array.isArray(input.sizes)&&input.sizes.length?input.sizes:['Default']);
    const colorValues=colors.length?colors:['Default'];
    rows=[];
    for(const color of colorValues) for(const size of sizes){
      const attributes={};
      if(attrs.some(a=>a.key==='color')||colors.length) attributes.color=color;
      if(attrs.some(a=>a.key==='size')||input.sizes?.length) attributes.size=size;
      if(!Object.keys(attributes).length) attributes.default='Default';
      const legacy=input.variants?.find(v=>v.name===color);
      rows.push({attributes,name:color,swatch:legacy?.swatch,imageIds:legacy?.imageIds||[]});
    }
  }
  if(!rows.length) rows=[{attributes:{default:'Default'}}];
  const seen=new Set(),skus=new Set();
  return rows.map((row,index)=>{
    const attributes=row.attributes||{};
    const modelId=clean(row.modelId||attributes.modelId);
    if(modelId) delete attributes.modelId;
    const key=modelId?`model=${modelId.toLowerCase()}|${keyFor(attributes)}`:keyFor(attributes);
    for(const preset of attrs){ if(preset.required && !clean(attributes[preset.key])) throw badRequest(`Variant attribute ${preset.label||preset.key} is required.`); if(attributes[preset.key]!==undefined&&Array.isArray(preset.options)&&preset.options.length&&!preset.options.includes(String(attributes[preset.key]))) throw badRequest(`Choose a valid ${preset.label||preset.key}.`); }
    if(seen.has(key)) throw badRequest('Duplicate variant combination.'); seen.add(key);
    const sku=clean(row.sku)||`${parentSku}-${Object.values(attributes).map(slug).join('-')||index+1}`;
    if(skus.has(sku.toLowerCase())) throw conflict('Variant SKU must be unique within this store.'); skus.add(sku.toLowerCase());
    const regular=row.regularPriceMinor!==undefined?Number(row.regularPriceMinor):row.priceMinor!==undefined?Number(row.priceMinor):row.price!==undefined?Math.round(Number(row.price)*100):undefined;
    const sale=row.discountPriceMinor!==undefined?Number(row.discountPriceMinor):row.oldPriceMinor!==undefined?Number(row.oldPriceMinor):row.salePrice!==undefined?Math.round(Number(row.salePrice)*100):undefined;
    if(regular!==undefined&&(!Number.isSafeInteger(regular)||regular<0)) throw badRequest('Invalid variant price.');
    if(sale!==undefined&&regular!==undefined&&sale>=regular) throw badRequest('Discount price must be lower than regular price.');
    return {id:clean(row.id)||variantId(),key,modelId: modelId||undefined,attributes,name:row.name||attributes.color||attributes.default,swatch:row.swatch,imageIds:Array.isArray(row.imageIds)?row.imageIds:[],sku,priceMinor:regular,oldPriceMinor:sale,regularPriceMinor:regular,discountPriceMinor:sale,active:row.active!==false,stock:Number.isInteger(row.stock)?row.stock:undefined};
  });
}
function effectivePrice(product,variant){
  const regular=variant?.regularPriceMinor??variant?.priceMinor??product.priceMinor; const sale=variant?.discountPriceMinor??variant?.oldPriceMinor??product.oldPriceMinor;
  return {unitMinor:sale&&sale<regular?sale:regular,regularMinor:regular,saleMinor:sale&&sale<regular?sale:undefined};
}
module.exports={keyFor,normalizeVariants,effectivePrice,categoryAttributes};
