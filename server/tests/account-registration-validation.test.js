const {test}=require('node:test');
const assert=require('node:assert/strict');
const schemas=require('../validation/schemas');
const {errorHandler}=require('../middleware/errorHandler');
const {validateContent}=require('../services/content.service');
const serialize=require('../utils/serializers');

const envelope=body=>({body,query:{},params:{}});

test('account passwords require six characters while login accepts existing credentials',()=>{
  const valid=schemas.auth.register.safeParse(envelope({name:'Buyer',email:'buyer@example.test',password:'123456'}));
  assert.equal(valid.success,true);
  const short=schemas.auth.register.safeParse(envelope({name:'Buyer',email:'buyer@example.test',password:'12345'}));
  assert.equal(short.success,false);
  assert.equal(schemas.auth.login.safeParse(envelope({login:'buyer@example.test',password:'x'})).success,true);
});

test('seller registration requires category and precise location and rejects client Store IDs',()=>{
  const body={name:'Test Store',email:'seller@example.test',phone:'01812345678',password:'123456',categoryId:'fashion',address:'Dhaka, Bangladesh',location:{latitude:23.8103,longitude:90.4125,accuracy:10,address:'Dhaka, Bangladesh',capturedAt:new Date().toISOString()}};
  assert.equal(schemas.auth.sellerRegister.safeParse(envelope(body)).success,true);
  assert.equal(schemas.auth.sellerRegister.safeParse(envelope({...body,handle:'client-store-id'})).success,false);
  assert.equal(schemas.auth.sellerRegister.safeParse(envelope({...body,location:{...body.location,latitude:91}})).success,false);
});

test('validation errors expose one string per input field',()=>{
  const result=schemas.auth.register.safeParse(envelope({name:'',email:'bad',password:'1'}));
  assert.equal(result.success,false);
  let payload;
  errorHandler(result.error,null,{status(code){this.code=code;return this;},json(value){payload=value;return value;}},null);
  assert.equal(payload.error.code,'VALIDATION_ERROR');
  assert.equal(typeof payload.fields.name,'string');
  assert.equal(typeof payload.fields.email,'string');
  assert.equal(payload.fields.password,'Password must contain at least 6 characters.');
});

test('category IDs are unique and seller coordinates are private by default',()=>{
  assert.throws(()=>validateContent('categories',[{id:'fashion',name:'Fashion'},{id:'fashion',name:'Duplicate'}]),/invalid structure/);
  const seller={_id:'seller-1',name:'Shop',storeId:'123456',handle:'shop-123456',categoryId:'fashion',category:'Fashion',location:{latitude:23.8,longitude:90.4,accuracy:8,address:'Dhaka',capturedAt:new Date()}};
  assert.equal(serialize.seller(seller).location,undefined);
  assert.equal(serialize.seller(seller,{includeLocation:true}).location.latitude,23.8);
});
