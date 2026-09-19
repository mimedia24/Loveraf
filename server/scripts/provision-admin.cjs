// Run only with explicit owner approval on the Loveraf server.
require('dotenv').config();
const fs=require('node:fs/promises');
const crypto=require('node:crypto');
const bcrypt=require('bcryptjs');
const {connectDatabase,disconnectDatabase}=require('../config/database');
const {User}=require('../models/account.model');
async function main(){
  const email=process.argv[2];
  if(!email||!email.includes('@'))throw new Error('Pass the owner-approved administrator email.');
  await connectDatabase();
  const existing=await User.findOne({email});
  if(existing){
    if(!existing.roles.includes('super_admin'))throw new Error('Existing account found; explicit promotion needs review.');
    console.log('Administrator already exists; password unchanged.');return;
  }
  const password=crypto.randomBytes(24).toString('base64url');
  await fs.mkdir('.local',{recursive:true,mode:0o700});
  await fs.writeFile('.local/admin-credentials.json',JSON.stringify({email,password},null,2),{mode:0o600,flag:'wx'});
  await User.create({name:'Loveraf Administrator',email,passwordHash:await bcrypt.hash(password,12),roles:['super_admin']});
  console.log('Administrator created; credentials saved privately.');
}
main().catch(error=>{console.error(error.message);process.exitCode=1;}).finally(()=>disconnectDatabase());
