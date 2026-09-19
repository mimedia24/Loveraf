const { test } = require("node:test");
const assert = require("node:assert/strict");
const mongoose=require('mongoose');
const {MongoMemoryServer}=require('mongodb-memory-server');
const { assertKey, validateContent } = require("../services/content.service");
const schemas=require('../validation/schemas');
const AdminController=require('../controllers/admin.controller');
const {Content,AuditEvent}=require('../models/system.model');
const response=()=>{const result={statusCode:200,body:null};result.status=code=>{result.statusCode=code;return result;};result.json=value=>{result.body=value;return result;};return result;};

test("admin-managed public content accepts only known, bounded structures", () => {
  assert.deepEqual(
    validateContent("categories", [
      { id: "food", name: "Food", art: "grocery", color: "#FFF0DB" },
    ])[0],
    { id: "food", name: "Food", art: "grocery", color: "#FFF0DB" },
  );
  assert.deepEqual(
    validateContent("faq", [
      {
        question: "How do I track an order?",
        answer: "Open the order and select tracking.",
        category: "Orders",
      },
    ]).length,
    1,
  );
  assert.deepEqual(
    validateContent("terms-policies", {
      title: "Terms",
      sections: [{ heading: "Orders", body: "Terms for marketplace orders." }],
    }).title,
    "Terms",
  );
  assert.deepEqual(
    validateContent("home-banners", [
      {
        id: "launch",
        kicker: "NEW",
        title: "Fresh products",
        sub: "Approved sellers",
        art: "watch",
        color: "#FFE4EC",
      },
    ]).length,
    1,
  );
  assert.throws(
    () => validateContent("categories", [{ id: "bad", name: "Bad", art: "unknown" }]),
    /invalid structure/,
  );
  assert.throws(
    () => validateContent("faq", [{ question: "Missing answer" }]),
    /invalid structure/,
  );
  assert.throws(
    () =>
      validateContent("home-banners", [
        {
          id: "x",
          kicker: "X",
          title: "X",
          sub: "X",
          art: "unknown",
          color: "red",
        },
      ]),
    /invalid structure/,
  );
  assert.throws(() => assertKey("secrets"), /not found/);
  assert.equal(schemas.contentPayload.safeParse({body:{data:[],reason:'Seasonal catalogue refresh',version:0},query:{},params:{}}).success,true);
  assert.equal(schemas.contentPayload.safeParse({body:{data:[],reason:'',version:0},query:{},params:{}}).success,false);
});

test('admin content updates reject a stale version and keep an audited reason',async()=>{
  const mongo=await MongoMemoryServer.create();
  try{
    await mongoose.connect(mongo.getUri('content_version_test'));
    await Promise.all([Content.init(),AuditEvent.init()]);
    const controller=new AdminController(),actor=new mongoose.Types.ObjectId();
    const first=response();await controller.content({params:{key:'faq'},auth:{user:{_id:actor}},validated:{body:{data:[{question:'Where is my order?',answer:'Open My Orders.',category:'Orders'}],reason:'Publish first FAQ',version:0}}},first);
    assert.equal(first.body.version,0);
    const second=response();await controller.content({params:{key:'faq'},auth:{user:{_id:actor}},validated:{body:{data:[{question:'How do I track?',answer:'Open My Orders.',category:'Orders'}],reason:'Clarify tracking FAQ',version:0}}},second);
    assert.equal(second.body.version,1);
    await assert.rejects(controller.content({params:{key:'faq'},auth:{user:{_id:actor}},validated:{body:{data:[],reason:'Stale browser update',version:0}}},response()),/Content changed/);
    assert.equal((await AuditEvent.findOne({target:'faq'}).sort({createdAt:-1}).lean()).reason,'Clarify tracking FAQ');
  }finally{await mongoose.disconnect();await mongo.stop();}
});
