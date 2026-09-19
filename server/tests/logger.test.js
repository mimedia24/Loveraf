const {test}=require('node:test');
const assert=require('node:assert/strict');
const {redact}=require('../utils/logger');

test('production logger redacts database credentials and authentication secrets',()=>{
  const output=redact(new Error('mongodb+srv://user:pass@example.mongodb.net/loveraf?token=abc Authorization: Bearer ey.test.secret password=hunter2 otp=123456'));
  for(const secret of ['user:pass','ey.test.secret','hunter2','123456'])assert.equal(output.includes(secret),false);
  assert.match(output,/REDACTED/);
});
