const { User, Seller, Session } = require("../models/account.model");
const { Media, Product, Report, Review } = require("../models/catalog.model");
const { Order, ReturnRequest } = require("../models/commerce.model");
const {
  AuditEvent,
  Content,
  BusinessRule,
  Feature,
  LedgerAccount,
  LedgerEntry,
  WithdrawalRequest,
  OperationalRun,
} = require("../models/system.model");
const {Activity}=require('../models/communication.model');
const {NotificationCampaign}=require('../models/marketing.model');
const serialize = require("../utils/serializers");
const { badRequest, notFound, conflict } = require("../utils/errors");
const {
  transitionSellerOrder,
  updateShipment,
} = require("../services/order.service");
const { transitionReturn } = require("../services/after-sales.service");
const { moderateReview } = require("../services/review.service");
const { settleCod } = require("../services/payment.service");
const {transitionWithdrawal,json:withdrawalJson}=require('../services/withdrawal.service');
const {adminSellerFinance,adminSellerFinanceDetail,updateSellerFinanceConfig}=require('../services/seller-finance.service');
const {reviewProfile}=require('../services/payout-profile.service');
const {validateBusinessRule,featureReadiness}=require('../services/business-rule.service');
class AdminController {
  sellerFinance=async(req,res)=>res.json(await adminSellerFinance({query:req.query}));
  sellerFinanceDetail=async(req,res)=>res.json(await adminSellerFinanceDetail({sellerId:req.params.sellerId,query:req.query}));
  updateSellerFinanceConfig=async(req,res)=>res.json(await updateSellerFinanceConfig({sellerId:req.params.sellerId,input:req.validated.body,actor:req.auth.user._id}));
  reviewSellerPayoutProfile=async(req,res)=>res.json(await reviewProfile({sellerId:req.params.sellerId,input:req.validated.body,actor:req.auth.user._id}));
  systemHealth=async(_req,res)=>{
    const now=Date.now(),staleCutoff=new Date(now-24*60*60*1000),backupCutoff=new Date(now-26*60*60*1000);
    const [failedPush,failedCampaigns,paymentMismatches,stuckOrders,lastBackup]=await Promise.all([
      Activity.countDocuments({pushStatus:'failed'}),
      NotificationCampaign.countDocuments({status:'failed'}),
      Order.countDocuments({
        'payment.status':{$in:['paid','partially_refunded','refunded']},
        $expr:{$ne:[
          {$ifNull:['$payment.amountMinor',0]},
          {$ifNull:['$pricingSnapshot.totalMinor','$totalMinor']},
        ]},
      }),
      Order.countDocuments({status:{$in:['confirmed','packing']},updatedAt:{$lt:staleCutoff}}),
      OperationalRun.findOne({kind:'backup'}).sort({completedAt:-1,createdAt:-1}).lean(),
    ]);
    const backupHealthy=Boolean(lastBackup?.status==='succeeded'&&lastBackup.completedAt&&lastBackup.completedAt>=backupCutoff),attention=failedPush+failedCampaigns+paymentMismatches+stuckOrders+(backupHealthy?0:1);
    res.json({id:'system-health',name:'System health',status:attention?'attention':'healthy',mongodb:'connected',failedPush,failedCampaigns,paymentMismatches,stuckOrders,backup:{status:lastBackup?.status||'never_recorded',completedAt:lastBackup?.completedAt||null,healthy:backupHealthy},generatedAt:new Date()});
  };
  operationsSummary=async(_req,res)=>{
    const cutoff=new Date(Date.now()-24*60*60*1000);
    const [pendingSellers,pendingProducts,stuckOrders,uncollectedCod,openReturns,openReports]=await Promise.all([
      Seller.countDocuments({status:"pending"}),Product.countDocuments({status:"pending"}),Order.countDocuments({status:{$in:["confirmed","packing"]},updatedAt:{$lt:cutoff}}),Order.countDocuments({paymentMethod:"cod","payment.status":"pending",status:{$in:["delivered","completed"]}}),ReturnRequest.countDocuments({status:{$in:["requested","approved","in_transit","received"]}}),Report.countDocuments({status:{$in:["open","reviewing"]}}),
    ]);
    const attention=pendingSellers+pendingProducts+stuckOrders+uncollectedCod+openReturns+openReports;
    res.json({id:"operations-summary",name:"Marketplace operations",status:attention?"attention":"healthy",pendingSellers,pendingProducts,stuckOrders,uncollectedCod,openReturns,openReports,generatedAt:new Date()});
  };
  financeSummary=async(_req,res)=>{
    const [[summary],ledgerRows,withdrawalRows]=await Promise.all([Order.aggregate([{
      $group:{
        _id:null,
        orderCount:{$sum:1},
        originalOrderMinor:{$sum:{$ifNull:["$pricingSnapshot.totalMinor","$totalMinor"]}},
        currentPayableMinor:{$sum:{$ifNull:["$totalMinor",0]}},
        collectedMinor:{$sum:{$cond:[{$in:["$payment.status",["paid","partially_refunded","refunded"]]},{$ifNull:["$payment.amountMinor",0]},0]}},
        refundedMinor:{$sum:{$ifNull:["$payment.refundedMinor",0]}},
        outstandingCodOrders:{$sum:{$cond:[{$and:[{$eq:["$paymentMethod","cod"]},{$eq:["$payment.status","pending"]}]},1,0]}},
      },
    }]),LedgerEntry.aggregate([
      {$lookup:{from:LedgerAccount.collection.name,localField:"account",foreignField:"_id",as:"accountDocument"}},
      {$unwind:"$accountDocument"},
      {$group:{_id:"$accountDocument.kind",balanceMinor:{$sum:"$amountMinor"}}},
    ]),WithdrawalRequest.aggregate([
      {$group:{_id:"$status",amountMinor:{$sum:"$amountMinor"},payoutMinor:{$sum:"$payoutMinor"},count:{$sum:1}}},
    ])]);
    const data=summary||{orderCount:0,originalOrderMinor:0,currentPayableMinor:0,collectedMinor:0,refundedMinor:0,outstandingCodOrders:0};
    const ledger=Object.fromEntries(ledgerRows.map(row=>[row._id,row.balanceMinor]));
    const withdrawals=Object.fromEntries(withdrawalRows.map(row=>[row._id,row]));
    const openWithdrawalMinor=(withdrawals.requested?.amountMinor||0)+(withdrawals.approved?.amountMinor||0);
    res.json({id:"finance-summary",name:"Marketplace reconciliation",status:"current",currency:"BDT",...data,netCollectedMinor:data.collectedMinor-data.refundedMinor,promoLiabilityMinor:ledger.promo||0,earningsLiabilityMinor:ledger.earnings||0,pendingEarningsMinor:ledger.pending_earnings||0,sellerPayableMinor:ledger.seller_payable||0,openWithdrawalMinor,openWithdrawalCount:(withdrawals.requested?.count||0)+(withdrawals.approved?.count||0),paidWithdrawalMinor:withdrawals.paid?.payoutMinor||0,generatedAt:new Date()});
  };
  list = async (req, res) => {
    let rows;
    const paginated=req.query.paginated==='true';
    const limit=Math.min(100,Math.max(1,Number(req.query.limit)||50));
    const offset=Math.max(0,Number(req.query.offset)||0);
    const page=query=>query.sort({createdAt:-1,_id:-1}).skip(offset).limit(limit+1);
    if (req.params.resource === "users")
      rows = (await page(User.find()).lean()).map(
        (row) => ({
          id: String(row._id),
          name: row.name,
          email: row.email,
          phone: row.phone,
          email_verified: row.emailVerified,
          phone_verified: row.phoneVerified,
          roles: row.roles,
          suspended: row.suspended,
          created_at: row.createdAt,
        }),
      );
    else if (req.params.resource === "sellers")
      rows = (await page(Seller.find())).map(
        item=>serialize.seller(item,{includeLocation:true}),
      );
    else if (req.params.resource === "products")
      rows = (await page(Product.find())).map(
        (item) => ({
          ...serialize.product(item),
          data: { title: item.title, images: item.images },
        }),
      );
    else if (req.params.resource === "orders")
      rows = (
        await page(Order.find()
          .populate("user", "name email phone")
        )
      ).map((order) => ({
        id: String(order._id),
        orderNumber: order.orderNumber || String(order._id).slice(-8),
        name: `Order ${order.orderNumber || String(order._id).slice(-8)}`,
        status: order.status,
        currency: order.currency,
        total: order.totalMinor / 100,
        totalMinor: order.totalMinor,
        pricingSnapshot: order.pricingSnapshot,
        paymentMethod: order.paymentMethod,
        paymentStatus: order.payment?.status,
        paymentVersion: order.payment?.version || 0,
        paymentReference: order.payment?.reference,
        paymentAmountMinor: order.payment?.amountMinor,
        paymentRefundedMinor: order.payment?.refundedMinor || 0,
        paymentCollectedAt: order.payment?.collectedAt,
        buyer: order.user
          ? {
              id: String(order.user._id),
              name: order.user.name,
              email: order.user.email,
              phone: order.user.phone,
            }
          : null,
        address: order.address,
        items: order.lines.length,
        images: order.lines
          .map((line) => line.image)
          .filter(Boolean)
          .slice(0, 4),
        lines: order.lines.map((line) => ({
          sellerId: String(line.seller),
          title: line.title,
          image: line.image,
          color: line.color,
          size: line.size,
          qty: line.qty,
          unitMinor: line.unitMinor,
        })),
        sellerOrders: order.sellerOrders.map((part) => ({
          sellerId: String(part.seller),
          status: part.status,
          version: part.version || 0,
          subtotalMinor: part.subtotalMinor,
          shipment: part.shipment,
          statusHistory: part.statusHistory || [],
        })),
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
      }));
    else if (req.params.resource === "returns")
      rows = (
        await page(ReturnRequest.find()
          .populate("user", "name email phone")
          .populate("seller", "name")
        )
      ).map((item) => ({
        id: String(item._id),
        name: `${item.type === "return" ? "Return" : "Exchange"} ${String(item._id).slice(-8).toUpperCase()}`,
        status: item.status,
        version: item.version,
        type: item.type,
        total: item.amountMinor / 100,
        items: item.lines.length,
        buyer: item.user
          ? {
              name: item.user.name,
              email: item.user.email,
              phone: item.user.phone,
            }
          : null,
        description: item.reason,
        refundDestination: item.refundDestination,
        amountMinor: item.amountMinor,
        receipt: item.receipt,
        settlement: item.settlement,
        replacement: item.replacement,
        sellerName: item.seller?.name,
        images: item.lines
          .map((line) => ({ uri: line.image }))
          .filter((image) => image.uri),
        lines: item.lines,
        history: item.history,
        createdAt: item.createdAt,
      }));
    else if (req.params.resource === "reviews")
      rows = (
        await page(Review.find()
          .populate("user", "name email")
          .populate("product", "title images")
          .populate("seller", "name")
        )
      ).map((item) => ({
        id: String(item._id),
        name: item.product?.title || "Unavailable product",
        status: item.status,
        version: item.version,
        rating: item.rating,
        description: item.body,
        reviewer: item.user
          ? { name: item.user.name, email: item.user.email }
          : null,
        sellerName: item.seller?.name,
        images: item.product?.images || [],
        sellerReply: item.sellerReply,
        createdAt: item.createdAt,
      }));
    else if(req.params.resource==='withdrawals')
      rows=(await page(WithdrawalRequest.find().populate('owner','name email phone').populate('seller','name handle'))).map(item=>{const safe=withdrawalJson(item,{includeSensitive:true});return {id:String(item._id),name:`Withdrawal ${String(item._id).slice(-8).toUpperCase()}`,status:item.status,version:item.version,sourceKind:item.sourceKind||'earnings',seller:item.seller?{id:String(item.seller._id),name:item.seller.name,handle:item.seller.handle}:null,total:item.amountMinor/100,amountMinor:item.amountMinor,feeMinor:item.feeMinor,payoutMinor:item.payoutMinor,currency:item.currency,destination:safe.destination,settlement:item.settlement,history:item.history,buyer:item.owner?{name:item.owner.name,email:item.owner.email,phone:item.owner.phone}:null,createdAt:item.createdAt,updatedAt:item.updatedAt};});
    else if (req.params.resource === "reports")
      rows = (
        await page(Report.find()
          .populate("reporter", "name email phone")
          .populate("product", "title images")
        )
      ).map((row) => ({
        id: String(row._id),
        name: row.product?.title || "Unavailable product",
        title: row.product?.title,
        status: row.status,
        description: row.reason,
        email: row.reporter?.email,
        phone: row.reporter?.phone,
        images: row.product?.images || [],
        createdAt: row.createdAt,
      }));
    else if (req.params.resource === "audit")
      rows = (
        await page(AuditEvent.find()).lean()
      ).map((row) => ({ ...row, id: String(row._id) }));
    else throw notFound();
    if(!paginated)return res.json(rows.slice(0,100));
    res.json({items:rows.slice(0,limit),nextOffset:rows.length>limit?offset+limit:null});
  };
  moderate = async (req, res) => {
    const { resource, id } = req.params,
      { status, reason, version } = req.body;
    if (!reason || String(reason).trim().length < 3)
      throw badRequest("A decision reason is required.");
    let target;
    if (resource === "users") {
      if (!["active", "suspended"].includes(status))
        throw badRequest("Invalid status.");
      if (String(req.auth.user._id) === id)
        throw badRequest("Cannot suspend your own administrator.");
      target = await User.findById(id);
      if (!target) throw notFound();
      target.suspended = status === "suspended";
      if (target.suspended)
        await Session.updateMany(
          { user: target._id, revokedAt: null },
          { revokedAt: new Date() },
        );
    } else if (resource === "sellers") {
      if (!["approved", "rejected", "suspended"].includes(status))
        throw badRequest("Invalid status.");
      target = await Seller.findById(id);
      if (!target) throw notFound();
      if (status === "approved" && target.status === "draft")
        throw badRequest("Store image must be submitted before approval.");
      if(status==='approved'&&!Number.isInteger(target.financeConfig?.commissionPercent)){const rule=await require('../services/seller-finance.service').commissionRule({required:false});if(rule)target.financeConfig={commissionPercent:rule.platformFeePercent,configuredAt:new Date(),configuredBy:req.auth.user._id};}
      target.status = status;
      target.moderationReason = reason;
    } else if (resource === "products") {
      if (!["approved", "rejected", "archived"].includes(status))
        throw badRequest("Invalid status.");
      target = await Product.findById(id);
      if (!target) throw notFound();
      if (version !== undefined && target.version !== version)
        throw conflict("This product changed. Reload before deciding.");
      target.status = status;
      target.moderationReason = reason;
    } else if (resource === "reports") {
      if (!["reviewing", "resolved", "dismissed"].includes(status))
        throw badRequest("Invalid status.");
      target = await Report.findById(id);
      if (!target) throw notFound();
      target.status = status;
    } else throw notFound();
    await target.save();
    await AuditEvent.create({
      actor: req.auth.user._id,
      action: `${resource}.${status}`,
      target: id,
      reason,
    });
    res.json({ ok: true, status, version: target.version });
  };
  updateRoles=async(req,res)=>{
    if(String(req.auth.user._id)===req.params.id)throw badRequest("You cannot change your own administrator roles.");
    const target=await User.findById(req.params.id);if(!target)throw notFound();
    const administrative=[...new Set(req.validated.body.roles)];
    target.roles=["buyer",...administrative];await target.save();
    await Session.updateMany({user:target._id,revokedAt:null},{revokedAt:new Date()});
    await AuditEvent.create({actor:req.auth.user._id,action:"users.roles.update",target:String(target._id),reason:req.validated.body.reason,metadata:{roles:administrative}});
    res.json({ok:true,id:String(target._id),roles:target.roles});
  };
  content = async (req, res) => {
    let data = require("../services/content.service").validateContent(
      req.params.key,
      req.validated.body.data,
    );
    if (req.params.key === "categories") {
      const imageIds = data
        .map((category) => category.image?.id)
        .filter(Boolean);
      if (imageIds.length) {
        const media = await Media.find({ _id: { $in: imageIds } })
          .select("_id uri")
          .lean();
        const uriById = new Map(
          media.map((item) => [String(item._id), item.uri]),
        );
        if (uriById.size !== new Set(imageIds).size)
          throw badRequest("One or more category images no longer exist.");
        data = data.map((category) =>
          category.image
            ? {
                ...category,
                image: {
                  id: category.image.id,
                  uri: uriById.get(category.image.id),
                },
              }
            : category,
        );
      }
    }
    const existing=await Content.findOne({key:req.params.key}).lean();
    let item;
    if(!existing){
      if(req.validated.body.version!==0)throw conflict('Content changed. Reload it before saving.');
      try{item=await Content.create({key:req.params.key,data});}catch(error){if(error?.code===11000)throw conflict('Content changed. Reload it before saving.');throw error;}
    }else{
      item=await Content.findOneAndUpdate({key:req.params.key,version:req.validated.body.version},{$set:{data},$inc:{version:1}},{new:true});
      if(!item)throw conflict('Content changed. Reload it before saving.');
    }
    await AuditEvent.create({
      actor: req.auth.user._id,
      action: "content.update",
      target: item.key,
      reason: req.validated.body.reason,
      metadata:{version:item.version},
    });
    res.status(201).json({ key: item.key, data: item.data,version:item.version });
  };
  rules = async (_req, res) =>
    res.json(
      (await BusinessRule.find().sort({ key: 1 }).lean()).map((row) => ({
        id: row.key,
        key: row.key,
        enabled: row.enabled,
        data: row.data,
        version: row.version,
      })),
    );
  updateRule = async (req, res) => {
    const rule = await BusinessRule.findOne({ key: req.params.key });
    if (!rule) throw notFound();
    const input=req.validated.body;
    if (rule.version !== input.version)
      throw conflict("This rule changed. Reload first.");
    const data=validateBusinessRule(rule.key,input.enabled,input.data);
    const updated=await BusinessRule.findOneAndUpdate({_id:rule._id,version:input.version},{$set:{enabled:input.enabled,data},$inc:{version:1}},{new:true});
    if(!updated)throw conflict("This rule changed. Reload first.");
    await AuditEvent.create({
      actor: req.auth.user._id,
      action: "rule.update",
      target: updated.key,
      reason:input.reason,
      metadata:{enabled:updated.enabled},
    });
    res.json({
      key: updated.key,
      enabled: updated.enabled,
      data: updated.data,
      version: updated.version,
    });
  };
  features=async(_req,res)=>{
    const rows=await Feature.find({key:{$in:['rewards','referral','coupons','loyalty','gift_cards','membership','affiliate']}}).sort({key:1}).lean();
    res.json(await Promise.all(rows.map(async item=>{const readiness=await featureReadiness(item.key,{ignoreOwnFeature:true});return {id:item.key,key:item.key,enabled:item.enabled,ready:readiness.ready,status:item.enabled?(readiness.ready?'live':'setup_required'):(readiness.ready?'ready':'setup_required'),missingRequirements:readiness.missingRequirements,version:item.version};})));
  };
  marketingOverview=async(_req,res)=>res.json(await require('../services/marketing-overview.service').marketingOverview());
  updateFeature=async(req,res)=>{
    if(!['rewards','referral','coupons','loyalty','gift_cards','membership','affiliate'].includes(req.params.key))throw badRequest('This capability is not managed here.');
    const input=req.validated.body;
    if(input.enabled){const readiness=await featureReadiness(req.params.key,{ignoreOwnFeature:true});if(!readiness.ready)throw badRequest(`Complete the required setup first: ${readiness.missingRequirements.join(', ')}.`);}
    const feature=await Feature.findOneAndUpdate({key:req.params.key,version:input.version},{$set:{enabled:input.enabled},$inc:{version:1}},{new:true});
    if(!feature)throw conflict('This capability changed. Reload first.');
    await AuditEvent.create({actor:req.auth.user._id,action:`feature.${feature.key}.update`,target:feature.key,reason:input.reason,metadata:{enabled:feature.enabled}});
    res.json({id:feature.key,key:feature.key,enabled:feature.enabled,status:feature.enabled?'enabled':'disabled',version:feature.version});
  };
  updateWithdrawal=async(req,res)=>res.json(await transitionWithdrawal({id:req.params.id,input:req.validated.body,actor:req.auth.user._id}));
  updateOrder = async (req, res) => {
    const { sellerId, status, reason, version } = req.validated.body;
    if (!sellerId) throw badRequest("Select the seller part of this order.");
    const { order, part } = await transitionSellerOrder({
      orderId: req.params.id,
      sellerId,
      status,
      reason,
      version,
      actor: req.auth.user._id,
      isAdmin: true,
      delivery: req.validated.body.delivery,
    });
    res.json({
      ok: true,
      id: String(order._id),
      status: order.status,
      sellerStatus: part.status,
      version: part.version,
    });
  };
  updateShipment = async (req, res) => {
    const { sellerId, ...shipment } = req.validated.body;
    if (!sellerId) throw badRequest("Select the seller part of this order.");
    const { part } = await updateShipment({
      orderId: req.params.id,
      sellerId,
      shipment,
      version: shipment.version,
      actor: req.auth.user._id,
    });
    res.json({ ok: true, shipment: part.shipment, version: part.version });
  };
  settleCod = async (req, res) => {
    const order = await settleCod({
      orderId: req.params.id,
      input: req.validated.body,
      actor: req.auth.user._id,
    });
    res.json({
      ok: true,
      id: String(order._id),
      paymentStatus: order.payment.status,
      paymentVersion: order.payment.version,
    });
  };
  updateReturn = async (req, res) => {
    const item = await transitionReturn({
      id: req.params.id,
      ...req.validated.body,
      actor: req.auth.user._id,
      roles: req.auth.user.roles,
    });
    res.json({
      ok: true,
      id: String(item._id),
      status: item.status,
      version: item.version,
    });
  };
  updateReview = async (req, res) => {
    const item = await moderateReview({
      id: req.params.id,
      ...req.validated.body,
      actor: req.auth.user._id,
    });
    res.json({
      ok: true,
      id: String(item._id),
      status: item.status,
      version: item.version,
    });
  };
}
module.exports = AdminController;
