const { Seller } = require("../models/account.model");
const {
  Media,
  Product,
  Inventory,
  ProductEngagement,
  FollowedSeller,
  Report,
  Review,
} = require("../models/catalog.model");
const { AuditEvent, Content, Feature } = require("../models/system.model");
const serialize = require("../utils/serializers");
const {
  badRequest,
  forbidden,
  notFound,
  conflict,
} = require("../utils/errors");
const { providerCapabilities } = require("../config/environment");
const mongoose = require("mongoose");
const idempotent = require("../services/idempotency.service");
const { createReview } = require("../services/review.service");
const {rewardsAvailable}=require('../services/business-rule.service');
const reviewJson = (item) => ({
  id: String(item._id),
  productId: String(item.product),
  rating: item.rating,
  body: item.body,
  status: item.status,
  reviewer: item.user && item.user.name ? { name: item.user.name } : undefined,
  sellerReply: item.sellerReply?.body
    ? { body: item.sellerReply.body, at: item.sellerReply.at }
    : undefined,
  createdAt: item.createdAt,
  updatedAt: item.updatedAt,
});

class CatalogController {
  constructor(authService) {
    this.authService = authService;
  }
  features = async (_req, res) => {
    const rows = await Feature.find().lean();
    const data = Object.fromEntries(rows.map((row) => [row.key, row.enabled]));
    data.rewards=await rewardsAvailable();
    res.json({
      account: true,
      catalog: true,
      cart: true,
      commerce: true,
      chat: true,
      ...data,
      ...providerCapabilities(),
    });
  };
  list = async (req, res) => {
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 40)),
      offset = Math.max(0, Number(req.query.offset) || 0);
    const sort = String(req.query.sort || "popular");
    if (!["popular", "newest", "price_asc", "rating"].includes(sort))
      throw badRequest("Invalid product sort.");
    if (req.query.sellerId && !mongoose.isValidObjectId(req.query.sellerId))
      throw badRequest("Invalid seller filter.");
    const search = String(req.query.query || "").trim();
    const category = String(req.query.category || "").trim();
    if (search.length > 200 || category.length > 100)
      throw badRequest("Product filter is too long.");
    const minRating = req.query.minRating === undefined
      ? 0
      : Number(req.query.minRating);
    if (!Number.isFinite(minRating) || minRating < 0 || minRating > 5)
      throw badRequest("Invalid minimum rating.");
    const filter = { status: "approved" };
    if (category) filter.category = category;
    if (req.query.sellerId) filter.seller = req.query.sellerId;
    if (search) filter.$text = { $search: search };
    const sellers = await Seller.find({
      status: "approved",
      ...(req.query.sellerId ? { _id: req.query.sellerId } : {}),
    }).distinct("_id");
    filter.seller = { $in: sellers };
    const sorts = {
      popular: { soldUnits: -1, ratingScore: -1, createdAt: -1, _id: -1 },
      newest: { createdAt: -1, _id: -1 },
      price_asc: { priceMinor: 1, _id: 1 },
      rating: { ratingScore: -1, ratingCount: -1, _id: -1 },
    };
    const pipeline = [
      { $match: filter },
      { $addFields: { ratingScore: { $cond: [
        { $gt: ["$ratingCount", 0] },
        { $divide: ["$ratingTotal", "$ratingCount"] },
        0,
      ] } } },
      ...(minRating ? [{ $match: { ratingScore: { $gte: minRating } } }] : []),
      { $sort: sorts[sort] },
      { $skip: offset },
      { $limit: limit + 1 },
    ];
    const rows = await Product.aggregate(pipeline);
    res.json({
      items: rows.slice(0, limit).map(serialize.product),
      nextOffset: rows.length > limit ? offset + limit : null,
    });
  };
  detail = async (req, res) => {
    const product = await Product.findOne({
      _id: req.params.id,
      status: "approved",
    });
    if (
      !product ||
      !(await Seller.exists({ _id: product.seller, status: "approved" }))
    )
      throw notFound("Product is no longer available.");
    res.json(serialize.product(product));
  };
  sellerDetail = async (req, res) => {
    const seller = await Seller.findOne({
      _id: req.params.id,
      status: "approved",
    });
    if (!seller) throw notFound("Store is no longer available.");
    res.json(serialize.seller(seller));
  };
  sellers = async (req, res) =>
    res.json(
      (
        await Seller.find({
          user:
            req.auth.user.accountType === "seller" ? req.auth.user._id : null,
        }).sort({ createdAt: 1 })
      ).map(serialize.seller),
    );
  createSeller = async () => {
    throw forbidden(
      "Create a separate seller account using Seller registration.",
    );
  };
  completeSeller = async (req, res) => {
    if (req.auth.user.accountType !== "seller" || req.seller.status !== "draft")
      throw forbidden(
        "Only an unfinished seller registration can be submitted.",
      );
    const media = await Media.findOne({
      _id: req.validated.body.logoId,
      owner: req.auth.user._id,
    });
    if (!media) throw badRequest("Store image must belong to this seller.");
    req.seller.logo = { mediaId: media._id, uri: media.uri };
    req.seller.status = "pending";
    await req.seller.save();
    await AuditEvent.create({
      actor: req.auth.user._id,
      action: "seller.submit",
      target: String(req.seller._id),
    });
    res.json(serialize.seller(req.seller));
  };
  sellerProducts = async (req, res) => {
    const query=req.query||{},paginated=query.paginated==='true',limit=Math.min(100,Math.max(1,Number(query.limit)||50)),offset=Math.max(0,Number(query.offset)||0);
    const rows=await Product.find({seller:req.seller._id}).sort({createdAt:-1,_id:-1}).skip(offset).limit(paginated?limit+1:100);
    const items=rows.slice(0,paginated?limit:100).map(serialize.product);
    res.json(paginated?{items,nextOffset:rows.length>limit?offset+limit:null}:items);
  };
  updateProduct = async (req, res) => {
    if (req.seller.status !== "approved")
      throw forbidden("Seller approval is required.");
    const input = req.validated.body;
    if (!Number.isInteger(input.version))
      throw badRequest("Product version is required. Reload and retry.");
    let product;
    await Product.db.transaction(async (session) => {
      product = await Product.findOne({
        _id: req.params.productId,
        seller: req.seller._id,
      }).session(session);
      if (!product) throw notFound();
      if (product.version !== input.version)
        throw conflict("Product changed. Reload it before saving.");
      const inventories = await Inventory.find({
        product: product._id,
      }).session(session);
      if (inventories.some((item) => item.reserved > 0))
        throw conflict(
          "This product has active orders and cannot change variants or inventory yet.",
        );
      const imageIds = [...new Set(input.images.map((image) => image.id))],
        media = await Media.find({
          _id: { $in: imageIds },
          owner: req.auth.user._id,
        }).session(session);
      if (media.length !== imageIds.length)
        throw badRequest("Images must belong to this account.");
      const map = new Map(media.map((item) => [String(item._id), item.uri]));
      const totalStock =
        input.stock * input.variants.length * input.sizes.length;
      const {version: _version, ...details}=input;
      const update = {
        ...details,
        stock: totalStock,
        stockPerCombination: input.stock,
        images: input.images.map((image) => ({
          mediaId: image.id,
          uri: map.get(image.id),
        })),
        priceMinor: Math.round(input.price * 100),
        oldPriceMinor: input.oldPrice
          ? Math.round(input.oldPrice * 100)
          : undefined,
        status: "pending",
        moderationReason: "",
      };
      const locked=await Product.updateOne(
        {_id:product._id,seller:req.seller._id,version:input.version},
        {$set:update,$inc:{version:1}},
        {session},
      );
      if(locked.matchedCount!==1)
        throw conflict("Product changed. Reload it before saving.");
      product=await Product.findById(product._id).session(session);
      const removed = await Inventory.deleteMany(
        { product: product._id, reserved: 0 },
        { session },
      );
      if (removed.deletedCount !== inventories.length)
        throw conflict("Inventory changed. Reload and retry.");
      await Inventory.insertMany(
        input.variants.flatMap((variant) =>
          input.sizes.map((size) => ({
            product: product._id,
            color: variant.name,
            size,
            stock: input.stock,
          })),
        ),
        { session },
      );
      await AuditEvent.create(
        [
          {
            actor: req.auth.user._id,
            action: "product.resubmit",
            target: String(product._id),
          },
        ],
        { session },
      );
    });
    res.json(serialize.product(product));
  };
  archiveProduct = async (req, res) => {
    let product;
    await Product.db.transaction(async (session) => {
      product = await Product.findOne({
        _id: req.params.productId,
        seller: req.seller._id,
      }).session(session);
      if (!product) throw notFound();
      const inventories = await Inventory.find({
        product: product._id,
      }).session(session);
      if (inventories.some((item) => item.reserved > 0))
        throw conflict(
          "This product has active orders and cannot be archived yet.",
        );
      for (const inventory of inventories) {
        const locked = await Inventory.updateOne(
          { _id: inventory._id, reserved: 0 },
          { $currentDate: { updatedAt: true } },
          { session },
        );
        if (locked.matchedCount !== 1)
          throw conflict("Inventory changed. Reload and retry.");
      }
      product.status = "archived";
      await product.save({ session });
      await AuditEvent.create(
        [
          {
            actor: req.auth.user._id,
            action: "product.archive",
            target: String(product._id),
          },
        ],
        { session },
      );
    });
    res.json({ ok: true, id: String(product._id), status: product.status });
  };
  engagementProducts = async (user, kind) => {
    const rows = await ProductEngagement.find({ user, kind })
      .sort({ updatedAt: -1 })
      .limit(100)
      .populate({ path: "product", match: { status: "approved" } });
    const products = rows.map((row) => row.product).filter(Boolean);
    const sellerIds = [
      ...new Set(products.map((product) => String(product.seller))),
    ];
    const allowed = new Set(
      (
        await Seller.find({
          _id: { $in: sellerIds },
          status: "approved",
        }).distinct("_id")
      ).map(String),
    );
    return products
      .filter((product) => allowed.has(String(product.seller)))
      .map(serialize.product);
  };
  wishlist = async (req, res) =>
    res.json(await this.engagementProducts(req.auth.user._id, "wishlist"));
  saveWishlist = async (req, res) => {
    const product = await Product.findOne({
      _id: req.params.productId,
      status: "approved",
    });
    if (
      !product ||
      !(await Seller.exists({ _id: product.seller, status: "approved" }))
    )
      throw notFound("Product is no longer available.");
    await ProductEngagement.findOneAndUpdate(
      { user: req.auth.user._id, product: product._id, kind: "wishlist" },
      { $set: { updatedAt: new Date() } },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
    res.status(201).json(serialize.product(product));
  };
  removeWishlist = async (req, res) => {
    await ProductEngagement.deleteOne({
      user: req.auth.user._id,
      product: req.params.productId,
      kind: "wishlist",
    });
    res.json({ ok: true });
  };
  compare = async (req, res) =>
    res.json(await this.engagementProducts(req.auth.user._id, "compare"));
  saveCompare = async (req, res) => {
    const product=await Product.findOne({_id:req.params.productId,status:"approved"});
    if(!product||!await Seller.exists({_id:product.seller,status:"approved"}))throw notFound("Product is no longer available.");
    const count=await ProductEngagement.countDocuments({user:req.auth.user._id,kind:"compare"});
    if(count>=2&&!await ProductEngagement.exists({user:req.auth.user._id,kind:"compare",product:product._id}))throw badRequest("Compare up to two products at a time. Remove one first.");
    await ProductEngagement.findOneAndUpdate({user:req.auth.user._id,product:product._id,kind:"compare"},{$set:{updatedAt:new Date()}},{upsert:true,new:true,setDefaultsOnInsert:true});
    res.status(201).json(serialize.product(product));
  };
  removeCompare = async (req, res) => {
    await ProductEngagement.deleteOne({user:req.auth.user._id,product:req.params.productId,kind:"compare"});
    res.json({ok:true});
  };
  recentProducts = async (req, res) =>
    res.json(await this.engagementProducts(req.auth.user._id, "recent"));
  saveRecentProduct = async (req, res) => {
    const product = await Product.findOne({
      _id: req.params.productId,
      status: "approved",
    });
    if (!product) throw notFound("Product is no longer available.");
    await ProductEngagement.findOneAndUpdate(
      { user: req.auth.user._id, product: product._id, kind: "recent" },
      { $set: { updatedAt: new Date() } },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
    res.status(201).json({ ok: true });
  };
  clearRecentProducts = async (req, res) => {
    await ProductEngagement.deleteMany({
      user: req.auth.user._id,
      kind: "recent",
    });
    res.json({ ok: true });
  };
  followedSellers = async (req, res) => {
    const rows = await FollowedSeller.find({ user: req.auth.user._id })
      .sort({ updatedAt: -1 })
      .populate({ path: "seller", match: { status: "approved" } });
    res.json(
      rows
        .map((row) => row.seller)
        .filter(Boolean)
        .map(serialize.seller),
    );
  };
  followSeller = async (req, res) => {
    const seller = await Seller.findOne({
      _id: req.params.sellerId,
      status: "approved",
    });
    if (!seller) throw notFound("Store is no longer available.");
    await FollowedSeller.findOneAndUpdate(
      { user: req.auth.user._id, seller: seller._id },
      { $set: { updatedAt: new Date() } },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
    res.status(201).json(serialize.seller(seller));
  };
  unfollowSeller = async (req, res) => {
    await FollowedSeller.deleteOne({
      user: req.auth.user._id,
      seller: req.params.sellerId,
    });
    res.json({ ok: true });
  };
  reportProduct = async (req, res) => {
    const product = await Product.findOne({
      _id: req.params.productId,
      status: "approved",
    });
    if (!product) throw notFound("Product is no longer available.");
    const existing = await Report.exists({
      reporter: req.auth.user._id,
      product: product._id,
      status: { $in: ["open", "reviewing"] },
    });
    if (existing) throw conflict("You already reported this product.");
    const report = await Report.create({
      reporter: req.auth.user._id,
      product: product._id,
      reason: req.validated.body.reason,
    });
    await AuditEvent.create({
      actor: req.auth.user._id,
      action: "product.report",
      target: String(product._id),
      metadata: { reportId: String(report._id) },
    });
    res.status(201).json({ ok: true, id: String(report._id) });
  };
  reviews = async (req, res) => {
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20)),
      offset = Math.max(0, Number(req.query.offset) || 0);
    if (
      !(await Product.exists({ _id: req.params.productId, status: "approved" }))
    )
      throw notFound("Product is no longer available.");
    const rows = await Review.find({
      product: req.params.productId,
      status: "published",
    })
      .populate("user", "name")
      .sort({ createdAt: -1, _id: 1 })
      .skip(offset)
      .limit(limit + 1);
    res.json({
      items: rows.slice(0, limit).map(reviewJson),
      nextOffset: rows.length > limit ? offset + limit : null,
    });
  };
  submitReview = async (req, res) => {
    const review = await createReview({
      user: req.auth.user._id,
      productId: req.params.productId,
      input: req.validated.body,
    });
    res.status(201).json(reviewJson(review));
  };
  sellerReviews = async (req, res) => {
    const query=req.query||{},paginated=query.paginated==='true',limit=Math.min(100,Math.max(1,Number(query.limit)||50)),offset=Math.max(0,Number(query.offset)||0);
    const rows=await Review.find({seller:req.seller._id,status:"published"}).populate("user","name").sort({createdAt:-1,_id:-1}).skip(offset).limit(paginated?limit+1:100);
    const items=rows.slice(0,paginated?limit:100).map(reviewJson);
    res.json(paginated?{items,nextOffset:rows.length>limit?offset+limit:null}:items);
  };
  replyReview = async (req, res) => {
    const review = await Review.findOne({
      _id: req.params.reviewId,
      seller: req.seller._id,
      status: "published",
    });
    if (!review) throw notFound("Published review not found.");
    review.sellerReply = { body: req.validated.body.body, at: new Date() };
    await review.save();
    await AuditEvent.create({
      actor: req.auth.user._id,
      action: "review.seller_reply",
      target: String(review._id),
    });
    res.json(reviewJson(review));
  };
  publish = async (req, res) => {
    if (req.seller.status !== "approved")
      throw forbidden("Seller approval is required.");
    const input = req.validated.body;
    const response = await idempotent(
      req.auth.user._id,
      req.get("Idempotency-Key"),
      { sellerId: String(req.seller._id), ...input },
      async (session) => {
        // Idempotency-Key protects retries from the current client, while this
        // business-level guard also protects older clients or rapid taps that
        // generated a different key for the same seller/SKU.
        const normalizedSku = input.sku.trim();
        const duplicate = await Product.findOne({
          seller: req.seller._id,
          sku: normalizedSku,
          status: { $ne: "archived" },
        }).session(session).select("_id title status").lean();
        if (duplicate) {
          throw conflict(`SKU ${normalizedSku} is already used by this store.`);
        }
        const imageIds = [...new Set(input.images.map((image) => image.id))];
        const media = await Media.find({
          _id: { $in: imageIds },
          owner: req.auth.user._id,
        }).session(session);
        if (media.length !== imageIds.length)
          throw badRequest("Images must belong to this account.");
        const map = new Map(media.map((item) => [String(item._id), item.uri])),
          totalStock = input.stock * input.variants.length * input.sizes.length;
        const documents = await Product.create(
          [
            {
              seller: req.seller._id,
              ...input,
              sku: normalizedSku,
              stock: totalStock,
              stockPerCombination: input.stock,
              images: input.images.map((image) => ({
                mediaId: image.id,
                uri: map.get(image.id),
              })),
              priceMinor: Math.round(input.price * 100),
              oldPriceMinor: input.oldPrice
                ? Math.round(input.oldPrice * 100)
                : undefined,
              status: "pending",
            },
          ],
          { session },
        );
        const product = documents[0];
        await Inventory.insertMany(
          input.variants.flatMap((variant) =>
            input.sizes.map((size) => ({
              product: product._id,
              color: variant.name,
              size,
              stock: input.stock,
            })),
          ),
          { session },
        );
        await AuditEvent.create(
          [
            {
              actor: req.auth.user._id,
              action: "product.submit",
              target: String(product._id),
            },
          ],
          { session },
        );
        return serialize.product(product);
      },
      { required: false },
    );
    res.status(201).json(response);
  };
  content = async (req, res) => {
    require("../services/content.service").assertKey(req.params.key);
    const item = await Content.findOne({ key: req.params.key }).lean();
    res.json({
      key: req.params.key,
      data:
        item?.data ||
        (["home-promotion", "terms-policies", "about"].includes(req.params.key)
          ? {}
          : []),
      version:item?.version||0,
    });
  };
  upload = async (req, res) => {
    if (!req.file) throw badRequest("Select an image.");
    const b = req.file.buffer;
    const detected =
      b[0] === 0xff && b[1] === 0xd8
        ? "image/jpeg"
        : b[0] === 0x89 && b.slice(1, 4).toString() === "PNG"
          ? "image/png"
          : b.slice(0, 4).toString() === "RIFF" &&
              b.slice(8, 12).toString() === "WEBP"
            ? "image/webp"
            : "";
    if (!detected || req.file.size > 8 * 1024 * 1024)
      throw badRequest("Use a valid JPG, PNG or WebP image up to 8 MB.");
    req.file.mimetype = detected;
    const media = await this.uploadMedia(req.auth.user, req.file);
    const uri = media.uri.startsWith("/")
      ? `${req.protocol}://${req.get("host")}${media.uri}`
      : media.uri;
    if (uri !== media.uri) {
      media.uri = uri;
      await media.save();
    }
    res.status(201).json({ id: String(media._id), uri });
  };
}
module.exports = CatalogController;
