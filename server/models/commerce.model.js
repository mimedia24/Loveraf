const mongoose = require("mongoose");
const { Schema, model } = mongoose;
const options = { timestamps: true, versionKey: "version" };
const cartLineSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    color: { type: String, required: true },
    size: { type: String, required: true },
    qty: { type: Number, required: true, min: 1, max: 999 },
  },
  options,
);
cartLineSchema.index(
  { user: 1, product: 1, color: 1, size: 1 },
  { unique: true },
);
const CartLine = model("CartLine", cartLineSchema);
const lineSchema = new Schema(
  {
    seller: { type: Schema.Types.ObjectId, ref: "Seller" },
    product: { type: Schema.Types.ObjectId, ref: "Product" },
    inventory: { type: Schema.Types.ObjectId, ref: "Inventory" },
    title: String,
    image: String,
    color: String,
    size: String,
    qty: Number,
    unitMinor: Number,
    returnDays: Number,
    exchangeDays: Number,
  },
  { _id: true },
);
const statusEventSchema = new Schema(
  {
    status: String,
    reason: String,
    actor: { type: Schema.Types.ObjectId, ref: "User" },
    at: { type: Date, default: Date.now },
  },
  { _id: false },
);
const sellerOrderSchema = new Schema(
  {
    seller: { type: Schema.Types.ObjectId, ref: "Seller" },
    status: {
      type: String,
      enum: ["awaiting_confirmation", "confirmed", "packing", "shipped", "delivered", "cancelled"],
      default: "awaiting_confirmation",
    },
    version: { type: Number, default: 0 },
    subtotalMinor: Number,
    shipment: {
      courier: String,
      tracking: String,
      status: { type: String, enum: ["unbooked", "pickup_requested", "booked", "picked_up", "in_transit", "delivered", "failed", "rto", "cancelled"], default: "unbooked" },
      pickupRequestedAt: Date,
    },
    statusHistory: [statusEventSchema],
  },
  { _id: true },
);
const pricingSnapshotSchema = new Schema(
  {
    subtotalMinor: Number,
    discountMinor: Number,
    deliveryMinor: Number,
    feeMinor: Number,
    totalMinor: Number,
  },
  { _id: false },
);
const Order = model(
  "Order",
  new Schema(
    {
      user: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true,
      },
      orderNumber: { type: String, match: /^\d{8}$/, immutable: true },
      status: { type: String, default: "confirmed" },
      currency: { type: String, default: "BDT" },
      subtotalMinor: Number,
      discountMinor: { type: Number, default: 0 },
      deliveryMinor: { type: Number, default: 0 },
      feeMinor: { type: Number, default: 0 },
      totalMinor: Number,
      pricingSnapshot: { type: pricingSnapshotSchema, immutable: true },
      promo: {
        account: { type: Schema.Types.ObjectId, ref: "LedgerAccount" },
        usedMinor: { type: Number, default: 0 },
        refundedMinor: { type: Number, default: 0 },
      },
      coupon: {
        coupon: { type: Schema.Types.ObjectId, ref: "Coupon" },
        code: String,
        discountMinor: { type: Number, default: 0 },
      },
      address: Schema.Types.Mixed,
      paymentMethod: String,
      payment: {
        provider: String,
        status: {
          type: String,
          enum: ["pending", "paid", "failed", "partially_refunded", "refunded"],
          default: "pending",
        },
        reference: String,
        amountMinor: Number,
        refundedMinor: { type: Number, default: 0 },
        collectedAt: Date,
        recordedAt: Date,
        actor: { type: Schema.Types.ObjectId, ref: "User" },
        version: { type: Number, default: 0 },
      },
      lines: [lineSchema],
      sellerOrders: [sellerOrderSchema],
    },
    options,
  ),
);
Order.schema.pre('validate', function(next){
  if(this.isNew){
    if(!this.orderNumber)this.orderNumber=String(Math.floor(10000000+Math.random()*90000000));
  }
  next();
});
Order.schema.index(
  { "payment.reference": 1 },
  {
    unique: true,
    partialFilterExpression: { "payment.reference": { $type: "string" } },
  },
);
Order.schema.index({user:1,createdAt:-1,_id:-1});
Order.schema.index({"sellerOrders.seller":1,createdAt:-1,_id:-1});
Order.schema.index({orderNumber:1},{unique:true,sparse:true});
const mutationKeySchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    key: { type: String, required: true },
    requestHash: { type: String, required: true },
    response: Schema.Types.Mixed,
    expiresAt: { type: Date, index: { expires: 0 } },
  },
  options,
);
mutationKeySchema.index({ user: 1, key: 1 }, { unique: true });
const MutationKey = model("MutationKey", mutationKeySchema);
const returnLineSchema = new Schema(
  {
    orderLine: { type: Schema.Types.ObjectId, required: true },
    product: { type: Schema.Types.ObjectId, ref: "Product" },
    inventory: { type: Schema.Types.ObjectId, ref: "Inventory" },
    title: String,
    image: String,
    color: String,
    size: String,
    qty: Number,
    unitMinor: Number,
  },
  { _id: false },
);
const returnRequestSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    order: {
      type: Schema.Types.ObjectId,
      ref: "Order",
      required: true,
      index: true,
    },
    seller: {
      type: Schema.Types.ObjectId,
      ref: "Seller",
      required: true,
      index: true,
    },
    type: { type: String, enum: ["return", "exchange"], required: true },
    reason: { type: String, required: true },
    status: {
      type: String,
      enum: [
        "requested",
        "approved",
        "rejected",
        "in_transit",
        "received",
        "refunded",
        "replaced",
      ],
      default: "requested",
      index: true,
    },
    amountMinor: { type: Number, required: true, min: 0 },
    promoRestoreMinor: { type: Number, default: 0, min: 0 },
    sellerPayableReversalMinor: { type: Number, default: 0, min: 0 },
    currency: { type: String, default: "BDT" },
    refundDestination: {
      method: { type: String, enum: ["bkash", "nagad", "bank"] },
      account: String,
    },
    lines: [returnLineSchema],
    history: [statusEventSchema],
  },
  options,
);
returnRequestSchema.add({
  receipt: {
    restocked: Boolean,
    at: Date,
    actor: { type: Schema.Types.ObjectId, ref: "User" },
  },
  settlement: {
    method: String,
    reference: String,
    amountMinor: Number,
    paidAt: Date,
    recordedAt: Date,
    actor: { type: Schema.Types.ObjectId, ref: "User" },
  },
  replacement: {
    courier: String,
    tracking: String,
    dispatchedAt: Date,
    actor: { type: Schema.Types.ObjectId, ref: "User" },
  },
});
returnRequestSchema.set("optimisticConcurrency", true);
returnRequestSchema.index(
  { "settlement.method": 1, "settlement.reference": 1 },
  {
    unique: true,
    partialFilterExpression: { "settlement.reference": { $type: "string" } },
  },
);
returnRequestSchema.index({ user: 1, order: 1, seller: 1, status: 1 });
returnRequestSchema.index({seller:1,createdAt:-1,_id:-1});
returnRequestSchema.index({user:1,createdAt:-1,_id:-1});
const ReturnRequest = model("ReturnRequest", returnRequestSchema);
module.exports = { CartLine, Order, MutationKey, ReturnRequest };
