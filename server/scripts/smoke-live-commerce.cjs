// Explicit live test: creates labelled QA records and cancels/archives them afterward.
const fs=require('node:fs/promises');
const crypto=require('node:crypto');
const assert=require('node:assert/strict');
const base='https://api.loveraf.com/api/v1';
async function main(){
  const credentials=JSON.parse(await fs.readFile('.local/admin-credentials.json','utf8'));
  const run=Date.now().toString(36),report={run,checks:[],records:{}};
  let admin,buyer,product,seller,order,cookie;
  async function api(path,method='GET',body,token,key){
    const form=body instanceof FormData;
    const r=await fetch(base+path,{method,headers:{...(!form?{'Content-Type':'application/json'}:{}),...(token?{Authorization:'Bearer '+token}:{}),...(key?{'Idempotency-Key':key}:{})},body:body===undefined?undefined:form?body:JSON.stringify(body),signal:AbortSignal.timeout(30000)});
    const data=await r.json();if(!r.ok)throw new Error(`${method} ${path}: ${r.status} ${data.message||data.code}`);return data;
  }
  async function adminProxy(path,method='GET',body){
    const r=await fetch('http://127.0.0.1:3101/api/'+path,{method,headers:{Origin:'https://admin.loveraf.com','Content-Type':'application/json',...(cookie?{Cookie:cookie}:{})},body:body===undefined?undefined:JSON.stringify(body)});
    const set=r.headers.get('set-cookie');if(set)cookie=set.split(';')[0];
    const data=await r.json();assert.ok(r.ok,JSON.stringify({path,status:r.status,message:data.message}));return data;
  }
  try{
    const features=await api('/features');assert.equal(features.admin_mfa_required,false);assert.equal(features.media_upload,true);
    const session=await api('/auth/login','POST',{login:credentials.email,password:credentials.password});admin=session.token;
    const panel=await adminProxy('auth/login','POST',{login:credentials.email,password:credentials.password});assert.ok(!panel.token);assert.ok(cookie);
    await adminProxy('admin/sellers');report.checks.push('Admin password login, HttpOnly session proxy and approval access');
    const b=await api('/auth/register','POST',{name:'Loveraf QA Buyer',email:`qa-${run}@example.test`,password:crypto.randomBytes(24).toString('base64url')});buyer=b.token;report.records.buyer=b.user.id;
    const denied=await fetch(base+'/admin/sellers',{headers:{Authorization:'Bearer '+buyer}});assert.equal(denied.status,403);
    seller=await api('/me/sellers','POST',{name:'Loveraf QA Store - NOT FOR SALE',handle:'qa-'+run,category:'Men'},admin);report.records.seller=seller.id;
    await adminProxy(`admin/sellers/${seller.id}`,'PATCH',{status:'approved',reason:'Owner-authorized QA test store'});
    const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aX1cAAAAASUVORK5CYII=','base64');
    const form=new FormData();form.append('image',new Blob([png],{type:'image/png'}),'qa-image.png');
    const media=await api('/media','POST',form,admin);report.records.media=media.id;
    assert.equal(new URL(media.uri).origin,'https://api.loveraf.com');assert.equal((await fetch(media.uri)).status,200);report.checks.push('Image upload and public HTTPS retrieval');
    product=await api(`/me/sellers/${seller.id}/products`,'POST',{title:'QA Test Product - NOT FOR SALE',description:'Owner-authorized integration test, archived after testing. Not a real item for sale.',categoryId:'men',price:100.25,stock:10,sizes:['M','L'],images:[{id:media.id}],variants:[{name:'Black',swatch:'#000000',imageIds:[media.id]}],returnDays:3,exchangeDays:3,deliveryMinDays:2,deliveryMaxDays:3,codAvailable:true},admin);report.records.product=product.id;
    assert.equal((await api(`/products?sellerId=${seller.id}`)).items.length,0);
    await adminProxy(`admin/products/${product.id}`,'PATCH',{status:'approved',version:product.version,reason:'Owner-authorized QA product approval'});
    assert.equal((await api(`/products?sellerId=${seller.id}`)).items.length,1);report.checks.push('Seller approval, product approval and buyer catalog visibility');
    const address=await api('/me/addresses','POST',{title:'QA - Do not deliver',name:'QA Buyer',mobile:'01700000000',division:'Dhaka',district:'Dhaka',details:'Integration test only. Do not fulfil.',isDefault:true},buyer);report.records.address=address.id;
    const input={productId:product.id,qty:1,color:'Black',size:'M'},key=crypto.randomUUID();
    await api('/me/cart','POST',input,buyer,key);await api('/me/cart','POST',input,buyer,key);
    await api('/me/cart','POST',input,buyer,crypto.randomUUID());await api('/me/cart','POST',{...input,size:'L'},buyer,crypto.randomUUID());
    const cart=await api('/me/cart','GET',undefined,buyer);assert.equal(cart.length,2);assert.equal(cart.find(l=>l.selectedSize==='M').qty,2);
    const checkout={addressId:address.id,paymentMethod:'cod',promo:false};const quote=await api('/checkout/quote','POST',checkout,buyer);assert.equal(quote.totalMinor,30075);
    const orderKey=crypto.randomUUID();order=await api('/orders','POST',checkout,buyer,orderKey);report.records.order=order.id;
    assert.equal((await api('/orders','POST',checkout,buyer,orderKey)).id,order.id);assert.equal((await api('/me/cart','GET',undefined,buyer)).length,0);
    assert.ok((await api(`/me/sellers/${seller.id}/orders`,'GET',undefined,admin)).some(o=>o.id===order.id));report.checks.push('Variant quantities, duplicate request protection, server total and COD order');
    await api(`/orders/${order.id}/cancel`,'POST',{},buyer);assert.equal((await api(`/orders/${order.id}`,'GET',undefined,buyer)).status,'cancelled');report.checks.push('COD cancellation');
    await adminProxy('auth/logout','POST',{});report.checks.push('Admin logout');
  }finally{
    if(order&&buyer){try{await api(`/orders/${order.id}/cancel`,'POST',{},buyer);}catch{}}
    if(product&&admin)await api(`/admin/products/${product.id}`,'PATCH',{status:'archived',reason:'QA finished; not a real sale listing'},admin);
    if(seller&&admin)await api(`/admin/sellers/${seller.id}`,'PATCH',{status:'suspended',reason:'QA finished; not a trading seller'},admin);
    if(buyer)await api('/auth/logout','POST',{},buyer);
    if(admin)await api('/auth/logout','POST',{},admin);
    await fs.writeFile('.local/live-commerce-report.json',JSON.stringify(report,null,2),{mode:0o600});
    console.log(JSON.stringify(report,null,2));
  }
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
