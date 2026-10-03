const crypto=require('node:crypto');
const {Seller,PayoutProfile}=require('../models/account.model');
const {WithdrawalRequest,AuditEvent}=require('../models/system.model');
const {badRequest,conflict,notFound}=require('../utils/errors');

function key(){
  const secret=process.env.PAYOUT_DATA_ENCRYPTION_KEY||(process.env.NODE_ENV==='test'?'loveraf-test-payout-encryption-key-only':'');
  if(secret.length<32)throw new Error('PAYOUT_DATA_ENCRYPTION_KEY must contain at least 32 characters.');
  return crypto.createHash('sha256').update(secret).digest();
}
function seal(value){const iv=crypto.randomBytes(12),cipher=crypto.createCipheriv('aes-256-gcm',key(),iv),ciphertext=Buffer.concat([cipher.update(JSON.stringify(value),'utf8'),cipher.final()]);return {ciphertext:ciphertext.toString('base64'),iv:iv.toString('base64'),tag:cipher.getAuthTag().toString('base64')};}
function open(encrypted){const decipher=crypto.createDecipheriv('aes-256-gcm',key(),Buffer.from(encrypted.iv,'base64'));decipher.setAuthTag(Buffer.from(encrypted.tag,'base64'));return JSON.parse(Buffer.concat([decipher.update(Buffer.from(encrypted.ciphertext,'base64')),decipher.final()]).toString('utf8'));}
const mask=value=>{const clean=String(value||'');return clean.length<=4?'••••':`${'•'.repeat(Math.min(7,clean.length-4))}${clean.slice(-4)}`;};
function profileJson(profile,{sensitive=false}={}){if(!profile)return null;const details=sensitive?open(profile.encrypted):null;return {id:String(profile._id),sellerId:String(profile.seller),method:profile.method,accountMasked:`••••${profile.accountLast4}`,accountLast4:profile.accountLast4,status:profile.status,reviewReason:profile.reviewReason||'',verifiedAt:profile.verifiedAt,version:profile.version,updatedAt:profile.updatedAt,...(details?details:{})};}
function destinationJson(destination,{sensitive=false}={}){if(!destination)return undefined;if(destination.encrypted?.ciphertext){const details=sensitive?open(destination.encrypted):null;return {method:destination.method,account:sensitive?details.account:`••••${destination.accountLast4}`,accountMasked:`••••${destination.accountLast4}`,accountName:details?.accountName,bankName:details?.bankName};}return {method:destination.method,account:sensitive?destination.account:mask(destination.account),accountMasked:mask(destination.account)};}
async function ownerSeller(owner,sellerId){const seller=await Seller.findOne({_id:sellerId,user:owner});if(!seller)throw notFound('Seller account not found.');return seller;}
async function getProfile({owner,sellerId,sensitive=false}){await ownerSeller(owner,sellerId);return profileJson(await PayoutProfile.findOne({seller:sellerId}),{sensitive});}
async function saveProfile({owner,sellerId,input}){
  const seller=await ownerSeller(owner,sellerId),existing=await PayoutProfile.findOne({seller:seller._id});
  if(existing&&input.version!==existing.version)throw conflict('This payout account changed. Reload first.');
  if(existing&&await WithdrawalRequest.exists({seller:seller._id,sourceKind:'seller_payable',status:{$in:['requested','approved']}}))throw conflict('Complete or reject the open withdrawal before changing the payout account.');
  const account=input.account.replace(/\s+/g,''),details={account,accountName:input.accountName.trim(),...(input.method==='bank'?{bankName:input.bankName.trim()}:{})};
  if(existing){existing.method=input.method;existing.accountLast4=account.slice(-4);existing.encrypted=seal(details);existing.status='pending';existing.reviewReason='';existing.verifiedAt=undefined;existing.verifiedBy=undefined;await existing.save();return profileJson(existing);}
  return profileJson(await PayoutProfile.create({seller:seller._id,owner,method:input.method,accountLast4:account.slice(-4),encrypted:seal(details),status:'pending'}));
}
async function reviewProfile({sellerId,input,actor}){const profile=await PayoutProfile.findOne({seller:sellerId,version:input.version});if(!profile)throw conflict('This payout account changed. Reload first.');profile.status=input.status;profile.reviewReason=input.reason;profile.verifiedAt=input.status==='verified'?new Date():undefined;profile.verifiedBy=input.status==='verified'?actor:undefined;await profile.save();await AuditEvent.create({actor,action:`seller-payout-profile.${input.status}`,target:String(profile._id),reason:input.reason,metadata:{sellerId:String(sellerId),method:profile.method,last4:profile.accountLast4}});return profileJson(profile,{sensitive:true});}
async function verifiedDestination({sellerId,version,legacy}){const profile=await PayoutProfile.findOne({seller:sellerId,status:'verified'});if(!profile)throw badRequest('Add a payout account and wait for Finance verification before withdrawing.');if(version!==undefined&&profile.version!==version)throw conflict('Your payout account changed. Reload before requesting withdrawal.');const details=open(profile.encrypted);if(legacy&&(legacy.method!==profile.method||String(legacy.account).replace(/\s+/g,'')!==details.account))throw badRequest('Withdrawal destination must match the verified payout account.');return {profile:profile._id,profileVersion:profile.version,method:profile.method,accountLast4:profile.accountLast4,encrypted:seal(details)};}
async function adminProfile(sellerId){return profileJson(await PayoutProfile.findOne({seller:sellerId}),{sensitive:true});}
module.exports={getProfile,saveProfile,reviewProfile,verifiedDestination,adminProfile,profileJson,destinationJson};
