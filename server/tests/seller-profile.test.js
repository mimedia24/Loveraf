const { test } = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");
const CatalogController = require("../controllers/catalog.controller");
const schemas = require("../validation/schemas");
const { User, Seller } = require("../models/account.model");
const { Media } = require("../models/catalog.model");
const { AuditEvent } = require("../models/system.model");

const response = () => {
  const result = { statusCode: 200, body: null };
  result.status = (code) => { result.statusCode = code; return result; };
  result.json = (value) => { result.body = value; return result; };
  return result;
};

test("seller profile validates, updates owned media and rejects stale or foreign changes", async () => {
  assert.equal(
    schemas.sellerProfile.safeParse({
      body: {
        logoId: "507f1f77bcf86cd799439011",
        name: "Updated Store",
        address: "Dhaka, Bangladesh",
        version: 0,
      },
      query: {},
      params: {},
    }).success,
    true,
  );
  const mongo = await MongoMemoryServer.create();
  try {
    await mongoose.connect(mongo.getUri("seller_profile_test"));
    const [owner, other] = await User.create([
      { name: "Seller", accountType: "seller", email: "seller@test.local", passwordHash: "hash", roles: ["seller"] },
      { name: "Other", accountType: "seller", email: "other@test.local", passwordHash: "hash", roles: ["seller"] },
    ]);
    const seller = await Seller.create({
      user: owner._id,
      name: "Old Store",
      storeId: "123456",
      handle: "old-store-123456",
      category: "Fashion",
      address: "Old address",
      status: "approved",
    });
    const [ownedLogo, foreignLogo] = await Media.create([
      { owner: owner._id, uri: "https://cdn.test/owned.webp", mime: "image/webp" },
      { owner: other._id, uri: "https://cdn.test/foreign.webp", mime: "image/webp" },
    ]);
    const controller = new CatalogController();
    const res = response();
    await controller.updateSellerProfile({
      auth: { user: owner },
      seller,
      validated: { body: { logoId: String(ownedLogo._id), name: "Updated Store", address: "Dhaka, Bangladesh", version: 0 } },
    }, res);
    assert.equal(res.body.name, "Updated Store");
    assert.equal(res.body.logo.uri, ownedLogo.uri);
    assert.equal(res.body.version, 1);
    assert.equal((await AuditEvent.findOne({ target: String(seller._id) }).lean()).action, "seller.profile.update");
    await assert.rejects(
      controller.updateSellerProfile({
        auth: { user: owner }, seller,
        validated: { body: { logoId: String(ownedLogo._id), name: "Stale Store", address: "Dhaka, Bangladesh", version: 0 } },
      }, response()),
      /changed/i,
    );
    await assert.rejects(
      controller.updateSellerProfile({
        auth: { user: owner }, seller,
        validated: { body: { logoId: String(foreignLogo._id), name: "Wrong Logo", address: "Dhaka, Bangladesh", version: 1 } },
      }, response()),
      /belong/i,
    );
  } finally {
    await mongoose.disconnect();
    await mongo.stop();
  }
});
