const { test } = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const request = require("supertest");
const { MongoMemoryReplSet } = require("mongodb-memory-server");

test("Express and MongoDB foundation", async (t) => {
  process.env.NODE_ENV = "test";
  process.env.ADMIN_REQUIRE_MFA = "true";
  delete process.env.MEDIA_STORAGE;
  process.env.JWT_ACCESS_SECRET =
    "test-access-secret-with-at-least-32-characters";
  process.env.OTP_HMAC_SECRET = "test-otp-secret-with-at-least-32-characters";
  process.env.JWT_ISSUER = "loveraf-test";
  const replica = await MongoMemoryReplSet.create({
    replSet: { count: 1, storageEngine: "wiredTiger" },
  });
  process.env.MONGODB_URI = replica.getUri("loveraf_test");
  const { connectDatabase, disconnectDatabase } = require("../config/database");
  await connectDatabase();
  const deliveries = {};
  const { createApplication } = require("../app");
  const runtime = createApplication({
    deliver: async (message) => {
      deliveries[message.id] = message;
    },
  });
  const api = request(runtime.app);
  const { User } = require("../models/account.model");
  const { Media, Product, Inventory } = require("../models/catalog.model");
  const call = (method, path, token, body, key) => {
    let r = api[method](path);
    if (token) r = r.set("Authorization", `Bearer ${token}`);
    if (key) r = r.set("Idempotency-Key", key);
    if (body !== undefined) r = r.send(body);
    return r;
  };
  try {
    await t.test(
      "liveness, database readiness and provider capabilities",
      async () => {
        assert.equal((await api.get("/health/live")).status, 200);
        const ready = await api.get("/health/ready");
        assert.equal(ready.status, 200);
        assert.equal(ready.body.checks.mongodb, "connected");
        const features = await api.get("/api/v1/features");
        assert.equal(features.body.verification, false);
        assert.equal(features.body.media_upload, false);
        assert.equal(features.body.online_payment, false);
        assert.equal(features.body.courier_automation, false);
        assert.equal(features.body.rewards, false);
        const contract=await api.get('/api/v1/openapi.json');
        assert.equal(contract.status,200);
        assert.equal(contract.body.openapi,'3.1.0');
        assert.ok(contract.body.paths['/orders']);
      },
    );
    const sellerRegistration = await call(
        "post",
        "/api/v1/auth/register",
        null,
        {
          name: "Seller One",
          email: "seller@example.test",
          phone: "01712345678",
          password: "CorrectLongPassword1",
        },
      ),
      buyerRegistration = await call("post", "/api/v1/auth/register", null, {
        name: "Buyer Two",
        email: "buyer@example.test",
        phone: "01812345678",
        password: "CorrectLongPassword2",
      });
    const sellerToken = sellerRegistration.body.token,
      buyerToken = buyerRegistration.body.token;
    await t.test(
      "password and session authentication without account verification",
      async () => {
        assert.equal(sellerRegistration.status, 201);
        const emailOnly = await call("post", "/api/v1/auth/register", null, {
          name: "Email Only",
          email: "email-only@example.test",
          phone: "",
          password: "CorrectLongPassword3",
        });
        assert.equal(emailOnly.status, 201);
        assert.equal(emailOnly.body.user.email_verified, false);
        const sellerWithoutVerification = await call(
          "post",
          "/api/v1/me/sellers",
          buyerToken,
          { name: "Buyer Store", handle: "buyer-store", category: "Women" },
        );
        assert.equal(sellerWithoutVerification.status, 403);
        const stored = await User.findOne({
          email: "seller@example.test",
        }).select("+passwordHash");
        assert.notEqual(stored.passwordHash, "CorrectLongPassword1");
        assert.equal(
          (
            await call("post", "/api/v1/auth/login", null, {
              login: "seller@example.test",
              password: "wrong-password",
            })
          ).status,
          401,
        );
        assert.equal(
          (await call("get", "/api/v1/me", sellerToken)).body.email,
          "seller@example.test",
        );
        const profile=await call("patch","/api/v1/me",buyerToken,{name:"Buyer Updated",preferences:{offers:false}});
        assert.equal(profile.status,200);assert.equal(profile.body.name,"Buyer Updated");assert.equal(profile.body.preferences.offers,false);
        assert.equal((await call("patch","/api/v1/me",buyerToken,{email:"changed@example.test"})).status,400);
      },
    );
    await t.test(
      "OTP ownership, verification and administrator MFA",
      async () => {
        const challenge = await call(
          "post",
          "/api/v1/auth/challenge",
          sellerToken,
          { channel: "email", purpose: "verify" },
        );
        assert.equal(challenge.status, 201);
        assert.equal(
          (
            await call("post", "/api/v1/auth/verify", buyerToken, {
              challengeId: challenge.body.challengeId,
              code: deliveries[challenge.body.challengeId].code,
            })
          ).status,
          400,
        );
        assert.equal(
          (
            await call("post", "/api/v1/auth/verify", sellerToken, {
              challengeId: challenge.body.challengeId,
              code: deliveries[challenge.body.challengeId].code,
            })
          ).status,
          201,
        );
        await User.updateOne(
          { email: "seller@example.test" },
          { roles: ["super_admin"], accountType: "seller" },
        );
        assert.equal(
          (await call("get", "/api/v1/admin/sellers", sellerToken)).status,
          403,
        );
        const adminChallenge = await call(
          "post",
          "/api/v1/auth/challenge",
          sellerToken,
          { channel: "email", purpose: "admin" },
        );
        await call("post", "/api/v1/auth/verify", sellerToken, {
          challengeId: adminChallenge.body.challengeId,
          code: deliveries[adminChallenge.body.challengeId].code,
        });
        assert.equal(
          (await call("get", "/api/v1/admin/sellers", sellerToken)).status,
          200,
        );
      },
    );
    await t.test("administrator lists are paginated without duplicate records",async()=>{
      await User.insertMany(Array.from({length:52},(_,index)=>({name:`Paged User ${index}`,email:`paged-${index}@example.test`,passwordHash:"not-used",roles:["buyer"]})));
      const first=await call("get","/api/v1/admin/users?paginated=true&limit=20&offset=0",sellerToken);
      assert.equal(first.status,200);assert.equal(first.body.items.length,20);assert.equal(first.body.nextOffset,20);
      const second=await call("get","/api/v1/admin/users?paginated=true&limit=20&offset=20",sellerToken);
      assert.equal(second.body.items.length,20);assert.equal(new Set([...first.body.items,...second.body.items].map(item=>item.id)).size,40);
    });
    await t.test("operations and finance order permissions stay separated",async()=>{
      const [operator,finance,support]=await User.create([{name:"Operator",email:"operations@example.test",passwordHash:"not-used",roles:["operations"]},{name:"Finance",email:"finance@example.test",passwordHash:"not-used",roles:["finance"]},{name:"Support",email:"support@example.test",passwordHash:"not-used",roles:["support"]}]);
      const operatorIssue=await runtime.authService.issue(operator),financeIssue=await runtime.authService.issue(finance),supportIssue=await runtime.authService.issue(support);
      const {Session}=require("../models/account.model");
      assert.equal((await call("get","/api/v1/admin/support/conversations",supportIssue.token)).status,403);
      await Session.updateMany({user:{$in:[operator._id,finance._id,support._id]}},{mfaAt:new Date()});
      assert.equal((await call("get","/api/v1/admin/orders?paginated=true",operatorIssue.token)).status,200);
      const operationsSummary=await call("get","/api/v1/admin/operations-summary",operatorIssue.token);assert.equal(operationsSummary.status,200);assert.equal(typeof operationsSummary.body.stuckOrders,"number");
      assert.equal((await call("get","/api/v1/admin/reports?paginated=true",operatorIssue.token)).status,403);
      assert.equal((await call("get","/api/v1/admin/orders?paginated=true",financeIssue.token)).status,200);
      const financeSummary=await call("get","/api/v1/admin/finance-summary",financeIssue.token);assert.equal(financeSummary.status,200);assert.equal(financeSummary.body.currency,"BDT");
      assert.equal((await call("get","/api/v1/admin/finance-summary",operatorIssue.token)).status,403);
      assert.equal((await call("get","/api/v1/admin/operations-summary",financeIssue.token)).status,403);
      assert.equal((await call("get","/api/v1/admin/support/conversations",supportIssue.token)).status,200);
      assert.equal((await call("get","/api/v1/admin/support/conversations",financeIssue.token)).status,403);
      assert.equal((await call("patch",`/api/v1/admin/orders/${new (require("mongoose").Types.ObjectId)()}/status`,financeIssue.token,{sellerId:String(new (require("mongoose").Types.ObjectId)()),status:"packing",version:0})).status,403);
    });
    await t.test("only super administrators assign roles and active sessions are revoked",async()=>{
      const target=await User.create({name:"Role Target",email:"role-target@example.test",passwordHash:"not-used",roles:["buyer"]});
      const issued=await runtime.authService.issue(target);
      assert.equal((await call("patch",`/api/v1/admin/users/${target.id}/roles`,buyerToken,{roles:["catalog"],reason:"Catalog team assignment"})).status,403);
      const updated=await call("patch",`/api/v1/admin/users/${target.id}/roles`,sellerToken,{roles:["catalog","operations"],reason:"Approved team responsibilities"});
      assert.equal(updated.status,200);assert.deepEqual(updated.body.roles,["buyer","catalog","operations"]);
      assert.equal((await call("get","/api/v1/me",issued.token)).status,401);
      assert.equal(await require("../models/system.model").AuditEvent.countDocuments({action:"users.roles.update",target:target.id}),1);
    });
    const legacySeller = await require("../models/account.model").Seller.create(
      {
        user: sellerRegistration.body.user.id,
        name: "Store",
        handle: "store",
        category: "Men",
      },
    );
    const seller = { status: 201, body: { id: String(legacySeller._id) } };
    let productId, addressId, orderId;
    await t.test(
      "seller and product require approval, while repeated submissions are idempotent",
      async () => {
        assert.equal(seller.status, 201);
        const user = await User.findOne({ email: "seller@example.test" });
        const media = await Media.create({
          owner: user._id,
          uri: "https://cdn.example.test/watch.png",
          mime: "image/png",
        });
        const product = {
            title: "Smart Watch",
            description: "A verified product listing for integration tests.",
            category: "Men",
            sku: "WATCH-1",
            price: 100.25,
            stock: 10,
            sizes: ["M", "L"],
            images: [{ id: String(media._id) }],
            variants: [
              {
                name: "Black",
                swatch: "#081426",
                imageIds: [String(media._id)],
              },
            ],
            returnDays: 3,
            exchangeDays: 3,
            deliveryMinDays: 2,
            deliveryMaxDays: 3,
            codAvailable: true,
          },
          submissionKey = crypto.randomUUID();
        assert.equal(
          (
            await call(
              "post",
              `/api/v1/me/sellers/${seller.body.id}/products`,
              sellerToken,
              product,
              submissionKey,
            )
          ).status,
          403,
        );
        await call(
          "patch",
          `/api/v1/admin/sellers/${seller.body.id}`,
          sellerToken,
          { status: "approved", reason: "Identity reviewed" },
        );
        const created = await call(
            "post",
            `/api/v1/me/sellers/${seller.body.id}/products`,
            sellerToken,
            product,
            submissionKey,
          ),
          repeated = await call(
            "post",
            `/api/v1/me/sellers/${seller.body.id}/products`,
            sellerToken,
            product,
            submissionKey,
          );
        assert.equal(created.status, 201);
        assert.equal(repeated.status, 201);
        assert.equal(repeated.body.id, created.body.id);
        assert.equal(
          await Product.countDocuments({
            seller: seller.body.id,
            sku: product.sku,
          }),
          1,
        );
        productId = created.body.id;
        assert.equal(
          (await call("get", "/api/v1/products")).body.items.length,
          0,
        );
        await call(
          "patch",
          `/api/v1/admin/products/${productId}`,
          sellerToken,
          {
            status: "approved",
            version: created.body.version,
            reason: "Listing checked",
          },
        );
        assert.equal(
          (await call("get", "/api/v1/products")).body.items.length,
          1,
        );
      },
    );
    await t.test("catalog sorting and rating filters apply before pagination",async()=>{
      const extras=await Product.create([
        {seller:seller.body.id,title:"Budget item",description:"Catalog sort test",category:"Men",sku:"SORT-CHEAP",priceMinor:100,stock:5,status:"approved",soldUnits:2,ratingTotal:9,ratingCount:2},
        {seller:seller.body.id,title:"Popular item",description:"Catalog sort test",category:"Men",sku:"SORT-POPULAR",priceMinor:20000,stock:5,status:"approved",soldUnits:10,ratingTotal:5,ratingCount:1},
      ]);
      try{
        const price=await call("get",`/api/v1/products?sellerId=${seller.body.id}&sort=price_asc&limit=2`);
        assert.equal(price.status,200);assert.deepEqual(price.body.items.map(item=>item.title),["Budget item","Smart Watch"]);assert.notEqual(price.body.nextOffset,null);
        const popular=await call("get",`/api/v1/products?sellerId=${seller.body.id}&sort=popular&limit=1`);
        assert.equal(popular.body.items[0].title,"Popular item");
        const rated=await call("get",`/api/v1/products?sellerId=${seller.body.id}&sort=rating&minRating=4.5`);
        assert.deepEqual(rated.body.items.map(item=>item.title),["Popular item","Budget item"]);
        assert.equal((await call("get","/api/v1/products?sellerId=invalid")).status,400);
        assert.equal((await call("get","/api/v1/products?sort=unknown")).status,400);
      }finally{await Product.deleteMany({_id:{$in:extras.map(item=>item._id)}});}
    });
    await t.test("persistent address and idempotent variant cart", async () => {
      const address = await call("post", "/api/v1/me/addresses", buyerToken, {
        title: "Home",
        name: "Buyer",
        mobile: "01812345678",
        division: "Dhaka",
        district: "Dhaka",
        details: "House 10, Road 4",
        isDefault: true,
      });
      assert.equal(address.status, 201);
      addressId = address.body.id;
      const key = crypto.randomUUID(),
        line = { productId, qty: 2, color: "Black", size: "M" };
      assert.equal(
        (await call("post", "/api/v1/me/cart", buyerToken, line, key)).status,
        201,
      );
      assert.equal(
        (await call("post", "/api/v1/me/cart", buyerToken, line, key)).status,
        201,
      );
      const cart = await call("get", "/api/v1/me/cart", buyerToken);
      assert.equal(cart.body.length, 1);
      assert.equal(cart.body[0].qty, 2);
    });
    await t.test(
      "wishlist, comparison, recently viewed, followed shops and product reports are private and persistent",
      async () => {
        assert.equal(
          (await call("put", `/api/v1/me/wishlist/${productId}`, buyerToken))
            .status,
          201,
        );
        assert.equal(
          (await call("put", `/api/v1/me/wishlist/${productId}`, buyerToken))
            .status,
          201,
        );
        assert.equal(
          (await call("get", "/api/v1/me/wishlist", buyerToken)).body.length,
          1,
        );
        const summary=await call("get","/api/v1/me/summary",buyerToken);
        assert.equal(summary.status,200);assert.equal(summary.body.wishlist,1);assert.equal(summary.body.orders,0);
        assert.equal(
          (await call("get", "/api/v1/me/wishlist", sellerToken)).body.length,
          0,
        );
        assert.equal((await call("put",`/api/v1/me/compare/${productId}`,buyerToken)).status,201);
        assert.equal((await call("put",`/api/v1/me/compare/${productId}`,buyerToken)).status,201);
        assert.equal((await call("get","/api/v1/me/compare",buyerToken)).body.length,1);
        assert.equal((await call("get","/api/v1/me/compare",sellerToken)).body.length,0);
        assert.equal((await call("delete",`/api/v1/me/compare/${productId}`,buyerToken)).status,200);
        assert.equal((await call("get","/api/v1/me/compare",buyerToken)).body.length,0);
        assert.equal(
          (
            await call(
              "put",
              `/api/v1/me/recent-products/${productId}`,
              buyerToken,
            )
          ).status,
          201,
        );
        assert.equal(
          (await call("get", "/api/v1/me/recent-products", buyerToken)).body[0]
            .id,
          productId,
        );
        assert.equal(
          (
            await call(
              "put",
              `/api/v1/me/followed-sellers/${seller.body.id}`,
              buyerToken,
            )
          ).status,
          201,
        );
        assert.equal(
          (await call("get", "/api/v1/me/followed-sellers", buyerToken)).body[0]
            .id,
          seller.body.id,
        );
        const report = await call(
          "post",
          `/api/v1/products/${productId}/report`,
          buyerToken,
          { reason: "The listing information needs review." },
        );
        assert.equal(report.status, 201);
        assert.equal(
          (
            await call(
              "post",
              `/api/v1/products/${productId}/report`,
              buyerToken,
              { reason: "Submitting the same report again." },
            )
          ).status,
          409,
        );
        assert.equal(
          (
            await call(
              "patch",
              `/api/v1/admin/reports/${report.body.id}`,
              sellerToken,
              {
                status: "resolved",
                reason: "Listing reviewed and report resolved.",
              },
            )
          ).status,
          200,
        );
        assert.equal(
          (await call("delete", `/api/v1/me/wishlist/${productId}`, buyerToken))
            .status,
          200,
        );
        assert.equal(
          (await call("get", "/api/v1/me/wishlist", buyerToken)).body.length,
          0,
        );
      },
    );
    await t.test(
      "seller product edits return to review and active inventory is protected",
      async () => {
        const current = await Product.findById(productId);
        const media = current.images[0];
        const input = {
          title: "Smart Watch",
          description:
            "An updated verified product listing for integration tests.",
          category: "Men",
          sku: "WATCH-1",
          price: 100.25,
          stock: 10,
          sizes: ["M", "L"],
          images: [{ id: String(media.mediaId) }],
          variants: [
            {
              name: "Black",
              swatch: "#081426",
              imageIds: [String(media.mediaId)],
            },
          ],
          returnDays: 3,
          exchangeDays: 3,
          deliveryMinDays: 2,
          deliveryMaxDays: 3,
          codAvailable: true,
          version: current.version,
        };
        const updated = await call(
          "patch",
          `/api/v1/me/sellers/${seller.body.id}/products/${productId}`,
          sellerToken,
          input,
        );
        assert.equal(updated.status, 200);
        assert.equal(updated.body.status, "pending");
        assert.equal(
          (
            await call(
              "patch",
              `/api/v1/me/sellers/${seller.body.id}/products/${productId}`,
              sellerToken,
              input,
            )
          ).status,
          409,
        );
        assert.equal(
          (await call("get", `/api/v1/products/${productId}`)).status,
          404,
        );
        assert.equal(
          (
            await call(
              "patch",
              `/api/v1/admin/products/${productId}`,
              sellerToken,
              {
                status: "approved",
                version: updated.body.version,
                reason: "Updated listing checked",
              },
            )
          ).status,
          200,
        );
      },
    );
    await t.test(
      "password change verifies the current password and revokes other sessions",
      async () => {
        const second = await call("post", "/api/v1/auth/login", null, {
          login: "buyer@example.test",
          password: "CorrectLongPassword2",
        });
        assert.equal(second.status, 201);
        assert.equal(
          (
            await call("patch", "/api/v1/me/password", buyerToken, {
              currentPassword: "incorrect-password",
              newPassword: "NewLongPasswordBuyer2",
            })
          ).status,
          401,
        );
        assert.equal(
          (
            await call("patch", "/api/v1/me/password", buyerToken, {
              currentPassword: "CorrectLongPassword2",
              newPassword: "NewLongPasswordBuyer2",
            })
          ).status,
          200,
        );
        assert.equal(
          (await call("get", "/api/v1/me", second.body.token)).status,
          401,
        );
        assert.equal((await call("get", "/api/v1/me", buyerToken)).status, 200);
        assert.equal(
          (
            await call("post", "/api/v1/auth/login", null, {
              login: "buyer@example.test",
              password: "CorrectLongPassword2",
            })
          ).status,
          401,
        );
        assert.equal(
          (
            await call("post", "/api/v1/auth/login", null, {
              login: "buyer@example.test",
              password: "NewLongPasswordBuyer2",
            })
          ).status,
          201,
        );
      },
    );
    await t.test(
      "server quote, transaction order and retry protection",
      async () => {
        const input = { addressId, paymentMethod: "cod", promo: false };
        const quote = await call(
          "post",
          "/api/v1/checkout/quote",
          buyerToken,
          input,
        );
        assert.equal(quote.body.subtotalMinor, 20050);
        assert.equal(quote.body.feeMinor, 4000);
        assert.equal(quote.body.totalMinor, 24050);
        const key = crypto.randomUUID(),
          first = await call("post", "/api/v1/orders", buyerToken, input, key),
          retry = await call("post", "/api/v1/orders", buyerToken, input, key);
        assert.equal(first.status, 201);
        orderId = first.body.id;
        assert.equal(first.body.totalMinor, quote.body.totalMinor);
        assert.equal(retry.body.id, first.body.id);
        const detail = await call(
          "get",
          `/api/v1/orders/${first.body.id}`,
          buyerToken,
        );
        assert.equal(detail.body.subtotal_minor, quote.body.subtotalMinor);
        assert.equal(detail.body.fee_minor, quote.body.feeMinor);
        assert.equal(detail.body.total_minor, quote.body.totalMinor);
        assert.deepEqual(detail.body.pricing_snapshot, {
          subtotal_minor: quote.body.subtotalMinor,
          discount_minor: quote.body.discountMinor,
          delivery_minor: quote.body.deliveryMinor,
          fee_minor: quote.body.feeMinor,
          total_minor: quote.body.totalMinor,
        });
        assert.equal(detail.body.lines[0].title, "Smart Watch");
        const orderPage=await call("get","/api/v1/orders?paginated=true&limit=1",buyerToken);
        assert.equal(orderPage.status,200);assert.equal(orderPage.body.items[0].id,first.body.id);assert.equal(orderPage.body.nextOffset,null);
        assert.equal(
          (await call("get", "/api/v1/me/cart", buyerToken)).body.length,
          0,
        );
        assert.equal(
          (
            await Inventory.findOne({
              product: productId,
              color: "Black",
              size: "M",
            })
          ).reserved,
          2,
        );
        assert.equal(
          (await call("get", `/api/v1/orders/${first.body.id}`, sellerToken))
            .status,
          404,
        );
        const activities = await call(
          "get",
          "/api/v1/activities?category=order",
          buyerToken,
        );
        assert.equal(activities.body.items.length, 1);
        assert.equal(activities.body.items[0].target.orderId, orderId);
      },
    );
    await t.test(
      "seller and admin advance a real order with optimistic version and inventory settlement",
      async () => {
        const listed = await call(
          "get",
          `/api/v1/me/sellers/${seller.body.id}/orders`,
          sellerToken,
        );
        assert.equal(listed.status, 200);
        assert.equal(listed.body[0].buyer.name, "Buyer Updated");
        assert.equal(listed.body[0].lines[0].qty, 2);
        assert.equal(listed.body[0].status, "confirmed");
        assert.equal(
          (
            await call(
              "delete",
              `/api/v1/me/sellers/${seller.body.id}/products/${productId}`,
              sellerToken,
            )
          ).status,
          409,
        );
        assert.equal(
          (
            await call(
              "patch",
              `/api/v1/me/sellers/${seller.body.id}/orders/${orderId}`,
              sellerToken,
              { status: "delivered", version: 0 },
            )
          ).status,
          400,
        );
        const packing = await call(
          "patch",
          `/api/v1/me/sellers/${seller.body.id}/orders/${orderId}`,
          sellerToken,
          { status: "packing", version: 0 },
        );
        assert.equal(packing.body.status, "packing");
        assert.equal(packing.body.version, 1);
        const shipped = await call(
          "patch",
          `/api/v1/admin/orders/${orderId}/status`,
          sellerToken,
          {
            sellerId: seller.body.id,
            status: "shipped",
            version: 1,
            reason: "Courier handover verified",
          },
        );
        assert.equal(shipped.status, 200);
        assert.equal(shipped.body.sellerStatus, "shipped");
        const delivered = await call(
          "patch",
          `/api/v1/me/sellers/${seller.body.id}/orders/${orderId}`,
          sellerToken,
          { status: "delivered", version: 2 },
        );
        assert.equal(delivered.body.status, "delivered");
        assert.equal(
          (
            await call(
              "patch",
              `/api/v1/me/sellers/${seller.body.id}/orders/${orderId}`,
              sellerToken,
              { status: "delivered", version: 3 },
            )
          ).status,
          400,
        );
        const detail = await call(
          "get",
          `/api/v1/orders/${orderId}`,
          buyerToken,
        );
        assert.equal(detail.body.status, "delivered");
        assert.equal(detail.body.seller_orders[0].status, "delivered");
        const inventory = await Inventory.findOne({
          product: productId,
          color: "Black",
          size: "M",
        });
        assert.equal(inventory.reserved, 0);
        assert.equal(inventory.stock, 8);
        const product = await Product.findById(productId).select("+soldUnits");
      assert.equal(product.stock, 18);
        assert.equal(product.soldUnits, 2);
        assert.equal(
          (
            await call(
              "post",
              `/api/v1/orders/${orderId}/cancel`,
              buyerToken,
              {},
            )
          ).status,
          400,
        );
        assert.equal(
          (
            await call(
              "delete",
              `/api/v1/me/sellers/${seller.body.id}/products/${productId}`,
              sellerToken,
            )
          ).body.status,
          "archived",
        );
        const activities = await call(
          "get",
          "/api/v1/activities?category=order",
          buyerToken,
        );
        assert.equal(activities.body.items.length, 4);
        assert.equal(activities.body.items[0].target.status, "delivered");
        assert.equal(
          (
            await call("post", "/api/v1/activities/read", buyerToken, {
              ids: ["invalid"],
            })
          ).status,
          400,
        );
      },
    );
    await t.test("persistent chat membership and read state", async () => {
      const conversation = await call(
        "post",
        "/api/v1/conversations",
        buyerToken,
        { kind: "support" },
      );
      assert.equal(conversation.status, 201);
      assert.equal(
        (
          await call(
            "post",
            `/api/v1/conversations/${conversation.body.id}/messages`,
            buyerToken,
            { body: "I need help." },
            crypto.randomUUID(),
          )
        ).status,
        201,
      );
      assert.equal(
        (
          await call(
            "get",
            `/api/v1/conversations/${conversation.body.id}/messages`,
            sellerToken,
          )
        ).status,
        403,
      );
      assert.equal(
        (
          await call(
            "post",
            `/api/v1/conversations/${conversation.body.id}/read`,
            buyerToken,
            {},
          )
        ).status,
        200,
      );
    });
    await t.test(
      "suspended seller products are hidden even with an explicit store filter",
      async () => {
        assert.equal(
          (
            await call(
              "patch",
              `/api/v1/admin/sellers/${seller.body.id}`,
              sellerToken,
              { status: "suspended", reason: "Review required" },
            )
          ).status,
          200,
        );
        assert.equal(
          (await call("get", `/api/v1/products?sellerId=${seller.body.id}`))
            .body.items.length,
          0,
        );
        assert.equal(
          (await call("get", `/api/v1/products/${productId}`)).status,
          404,
        );
      },
    );
    await t.test(
      "buyer cannot moderate and expired MFA is reflected in the session response",
      async () => {
        assert.equal(
          (
            await call(
              "patch",
              `/api/v1/admin/sellers/${seller.body.id}`,
              buyerToken,
              { status: "approved", reason: "Unauthorized decision" },
            )
          ).status,
          403,
        );
        const { Session } = require("../models/account.model");
        await Session.updateMany(
          { user: sellerRegistration.body.user.id },
          { mfaAt: new Date(Date.now() - 16 * 60000) },
        );
        assert.equal(
          (await call("get", "/api/v1/me", sellerToken)).body.mfa,
          false,
        );
        assert.equal(
          (await call("get", "/api/v1/admin/sellers", sellerToken)).status,
          403,
        );
      },
    );
    await t.test(
      "password-only admin still requires an administrator role",
      async () => {
        process.env.ADMIN_REQUIRE_MFA = "false";
        assert.equal(
          (await call("get", "/api/v1/admin/sellers", sellerToken)).status,
          200,
        );
        assert.equal(
          (await call("get", "/api/v1/admin/sellers", buyerToken)).status,
          403,
        );
        assert.equal(
          (await call("get", "/api/v1/features")).body.admin_mfa_required,
          false,
        );
      },
    );
    await t.test(
      "production local image upload and retrieval without an external provider",
      async () => {
        const fs = require("node:fs/promises"),
          os = require("node:os"),
          path = require("node:path");
        const directory = await fs.mkdtemp(
          path.join(os.tmpdir(), "loveraf-media-test-"),
        );
        process.env.NODE_ENV = "production";
        process.env.MEDIA_STORAGE = "local";
        process.env.UPLOAD_DIR = directory;
        const imageRuntime = createApplication({ deliver: async () => {} });
        try {
          const png = Buffer.from(
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aX1cAAAAASUVORK5CYII=",
            "base64",
          );
          const uploaded = await request(imageRuntime.app)
            .post("/api/v1/media")
            .set("Authorization", `Bearer ${sellerToken}`)
            .attach("image", png, {
              filename: "product.png",
              contentType: "image/png",
            });
          assert.equal(uploaded.status, 201);
          assert.ok(uploaded.body.id);
          const fetched = await request(imageRuntime.app).get(
            new URL(uploaded.body.uri).pathname,
          );
          assert.equal(fetched.status, 200);
          assert.deepEqual(fetched.body, png);
          assert.equal(
            (
              await request(imageRuntime.app)
                .post("/api/v1/media")
                .set("Authorization", `Bearer ${sellerToken}`)
                .attach("image", Buffer.from("bad"), {
                  filename: "fake.png",
                  contentType: "image/png",
                })
            ).status,
            400,
          );
        } finally {
          await new Promise((resolve) => imageRuntime.io.close(resolve));
          await fs.rm(directory, { recursive: true, force: true });
          process.env.NODE_ENV = "test";
          delete process.env.MEDIA_STORAGE;
          delete process.env.UPLOAD_DIR;
        }
      },
    );
    await t.test(
      "independent seller credentials, required store details and resumable logo submission",
      async () => {
        const input = {
          name: "Separate Shop",
          email: "buyer@example.test",
          phone: "01812345678",
          password: "SeparateSellerPassword1",
          handle: "separate-shop",
          category: "Men",
          address: "Shop 12, Dhaka Road",
        };
        const registered = await call(
          "post",
          "/api/v1/auth/seller/register",
          null,
          input,
        );
        assert.equal(registered.status, 201);
        assert.notEqual(
          registered.body.user.id,
          buyerRegistration.body.user.id,
        );
        assert.deepEqual(registered.body.user.roles, ["seller"]);
        const token = registered.body.token;
        assert.equal(
          (
            await call("post", "/api/v1/auth/login", null, {
              login: input.email,
              password: input.password,
            })
          ).status,
          401,
        );
        assert.equal(
          (
            await call("post", "/api/v1/auth/seller/login", null, {
              login: input.phone,
              password: input.password,
            })
          ).status,
          201,
        );
        assert.equal(
          (
            await call("post", "/api/v1/auth/seller/login", null, {
              login: input.email,
              password: "CorrectLongPassword2",
            })
          ).status,
          401,
        );
        assert.equal(
          (await call("post", "/api/v1/auth/seller/register", null, input))
            .status,
          409,
        );
        const stores = await call("get", "/api/v1/me/sellers", token),
          store = stores.body[0];
        assert.equal(store.status, "draft");
        assert.equal(store.address, input.address);
        assert.equal(
          (
            await call(
              "patch",
              `/api/v1/admin/sellers/${store.id}`,
              sellerToken,
              { status: "approved", reason: "Review incomplete" },
            )
          ).status,
          400,
        );
        const media = await Media.create({
          owner: registered.body.user.id,
          uri: "https://cdn.example.test/shop.png",
          mime: "image/png",
        });
        assert.equal(
          (
            await call(
              "post",
              `/api/v1/me/sellers/${store.id}/submit`,
              buyerToken,
              { logoId: String(media._id) },
            )
          ).status,
          403,
        );
        const submitted = await call(
          "post",
          `/api/v1/me/sellers/${store.id}/submit`,
          token,
          { logoId: String(media._id) },
        );
        assert.equal(submitted.status, 200);
        assert.equal(submitted.body.status, "pending");
        assert.equal(submitted.body.logo.uri, media.uri);
        assert.equal(
          (
            await call(
              "patch",
              `/api/v1/admin/sellers/${store.id}`,
              sellerToken,
              { status: "approved", reason: "Complete shop reviewed" },
            )
          ).status,
          200,
        );
      },
    );
  } finally {
    await new Promise((resolve) => runtime.io.close(resolve));
    await disconnectDatabase();
    await replica.stop();
  }
});
