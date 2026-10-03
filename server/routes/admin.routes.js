const express = require("express");
const asyncHandler = require("../utils/asyncHandler");
const validate = require("../middleware/validate");
const schemas = require("../validation/schemas");
const AdminController = require("../controllers/admin.controller");
module.exports = function adminRoutes(requireAuth, role) {
  const r = express.Router(),
    c = new AdminController();
  const {listAdminCoupons,saveCoupon}=require('../services/coupon.service');
  const {issueGiftCard,listGiftCards,revokeGiftCard,grantMembership,listMemberships,revokeMembership}=require('../services/benefit.service');
  const {listAdminCampaigns,saveCampaign}=require('../services/donation.service');
  const {listAdminAffiliates,updateAffiliateLink}=require('../services/affiliate.service');
  const {listCampaigns: listNotificationCampaigns,saveCampaign: saveNotificationCampaign}=require('../services/notification-campaign.service');
  const {listReferrals,listLoyalty}=require('../services/marketing-report.service');
  r.use(requireAuth);
  r.post(
    "/admin/content/:key",
    role(["catalog"]),
    validate(schemas.contentPayload),
    asyncHandler(c.content),
  );
  r.get("/admin/rules", role(["finance"]), asyncHandler(c.rules));
  r.get("/admin/features",role([]),asyncHandler(c.features));
  r.get("/admin/marketing-overview",role(["finance"]),asyncHandler(c.marketingOverview));
  r.patch("/admin/features/:key",role([]),validate(schemas.featureUpdate),asyncHandler(c.updateFeature));
  r.patch('/admin/withdrawals/:id/status',role(['finance']),validate(schemas.withdrawalStatus),asyncHandler(c.updateWithdrawal));
  r.get('/admin/coupons',role(['finance']),asyncHandler(async(req,res)=>res.json(await listAdminCoupons(req.query))));
  r.post('/admin/coupons',role(['finance']),validate(schemas.couponPayload),asyncHandler(async(req,res)=>res.status(201).json(await saveCoupon({input:req.validated.body,actor:req.auth.user._id}))));
  r.patch('/admin/coupons/:id',role(['finance']),validate(schemas.couponPayload),asyncHandler(async(req,res)=>res.json(await saveCoupon({id:req.params.id,input:req.validated.body,actor:req.auth.user._id}))));
  r.get('/admin/gift-cards',role(['finance']),asyncHandler(async(req,res)=>res.json(await listGiftCards(req.query))));
  r.post('/admin/gift-cards',role(['finance']),validate(schemas.giftCardIssue),asyncHandler(async(req,res)=>res.status(201).json(await issueGiftCard({input:req.validated.body,actor:req.auth.user._id,key:req.get('Idempotency-Key')}))));
  r.patch('/admin/gift-cards/:id/revoke',role(['finance']),validate(schemas.auditedVersion),asyncHandler(async(req,res)=>res.json(await revokeGiftCard({id:req.params.id,input:req.validated.body,actor:req.auth.user._id}))));
  r.get('/admin/memberships',role(['support','finance']),asyncHandler(async(req,res)=>res.json(await listMemberships(req.query))));
  r.post('/admin/memberships',role(['finance']),validate(schemas.membershipGrant),asyncHandler(async(req,res)=>res.status(201).json(await grantMembership({input:req.validated.body,actor:req.auth.user._id,key:req.get('Idempotency-Key')}))));
  r.patch('/admin/memberships/:id/revoke',role(['finance']),validate(schemas.auditedVersion),asyncHandler(async(req,res)=>res.json(await revokeMembership({id:req.params.id,input:req.validated.body,actor:req.auth.user._id}))));
  r.get('/admin/affiliates',role(['finance']),asyncHandler(async(req,res)=>res.json(await listAdminAffiliates(req.query))));
  r.patch('/admin/affiliates/:id',role(['finance']),validate(schemas.featureUpdate),asyncHandler(async(req,res)=>res.json(await updateAffiliateLink({id:req.params.id,input:req.validated.body,actor:req.auth.user._id}))));
  r.get('/admin/notification-campaigns',role(['support','finance']),asyncHandler(async(req,res)=>res.json(await listNotificationCampaigns(req.query))));
  r.post('/admin/notification-campaigns',role(['support','finance']),validate(schemas.notificationCampaign),asyncHandler(async(req,res)=>res.status(201).json(await saveNotificationCampaign({input:req.validated.body,actor:req.auth.user._id}))));
  r.patch('/admin/notification-campaigns/:id',role(['support','finance']),validate(schemas.notificationCampaign),asyncHandler(async(req,res)=>res.json(await saveNotificationCampaign({id:req.params.id,input:req.validated.body,actor:req.auth.user._id}))));
  r.get('/admin/referrals',role(['finance']),asyncHandler(async(req,res)=>res.json(await listReferrals(req.query))));
  r.get('/admin/loyalty',role(['finance']),asyncHandler(async(req,res)=>res.json(await listLoyalty(req.query))));
  r.get('/admin/donation-campaigns',role(['finance']),asyncHandler(async(req,res)=>res.json(await listAdminCampaigns(req.query))));
  r.post('/admin/donation-campaigns',role(['finance']),validate(schemas.donationCampaign),asyncHandler(async(req,res)=>res.status(201).json(await saveCampaign({input:req.validated.body,actor:req.auth.user._id}))));
  r.patch('/admin/donation-campaigns/:id',role(['finance']),validate(schemas.donationCampaign),asyncHandler(async(req,res)=>res.json(await saveCampaign({id:req.params.id,input:req.validated.body,actor:req.auth.user._id}))));
  r.get("/admin/finance-summary",role(["finance"]),asyncHandler(c.financeSummary));
  r.get("/admin/seller-finance",role(["finance"]),asyncHandler(c.sellerFinance));
  r.get("/admin/seller-finance/:sellerId",role(["finance"]),asyncHandler(c.sellerFinanceDetail));
  r.patch("/admin/sellers/:sellerId/finance-config",role(["finance"]),validate(schemas.sellerFinanceConfig),asyncHandler(c.updateSellerFinanceConfig));
  r.patch("/admin/sellers/:sellerId/payout-profile/status",role(["finance"]),validate(schemas.payoutProfileReview),asyncHandler(c.reviewSellerPayoutProfile));
  r.get("/admin/operations-summary",role(["operations","support"]),asyncHandler(c.operationsSummary));
  r.get('/admin/system-health',role([]),asyncHandler(c.systemHealth));
  r.patch("/admin/rules/:key", role(["finance"]),validate(schemas.businessRuleUpdate),asyncHandler(c.updateRule));
  r.patch(
    "/admin/orders/:id/status",
    role(["operations", "support"]),
    validate(schemas.orderStatus),
    asyncHandler(c.updateOrder),
  );
  r.patch(
    "/admin/orders/:id/shipment",
    role(["operations", "support"]),
    validate(schemas.shipment),
    asyncHandler(c.updateShipment),
  );
  r.post(
    "/admin/orders/:id/cod-collection",
    role(["finance"]),
    validate(schemas.codSettlement),
    asyncHandler(c.settleCod),
  );
  r.patch(
    "/admin/returns/:id/status",
    role(["support", "finance"]),
    validate(schemas.returnStatus),
    (req, res, next) =>
      role(
        req.validated.body.status === "refunded" ? ["finance"] : ["support"],
      )(req, res, next),
    asyncHandler(c.updateReturn),
  );
  r.patch(
    "/admin/reviews/:id/status",
    role(["catalog"]),
    validate(schemas.reviewStatus),
    asyncHandler(c.updateReview),
  );
  r.patch("/admin/users/:id/roles",role([]),validate(schemas.adminRoles),asyncHandler(c.updateRoles));
  r.get(
    "/admin/:resource",
    (req, res, next) => {
      if (
        ![
          "users",
          "sellers",
          "products",
          "orders",
          "returns",
          "reviews",
          "reports",
          "audit",
          "withdrawals",
        ].includes(req.params.resource)
      )
        return next();
      const roles = ["sellers", "products", "reviews"].includes(
        req.params.resource,
      )
        ? ["catalog"]
        : req.params.resource === "withdrawals"
          ? ["finance"]
        : req.params.resource === "returns"
          ? ["support", "finance"]
          : req.params.resource === "orders"
            ? ["operations", "support", "finance"]
            : ["users", "reports"].includes(req.params.resource)
              ? ["support"]
            : [];
      return role(roles)(req, res, next);
    },
    asyncHandler(c.list),
  );
  r.patch(
    "/admin/:resource/:id",
    (req, res, next) => {
      if (
        !["users", "sellers", "products", "reports"].includes(
          req.params.resource,
        )
      )
        return next();
      return role(
        req.params.resource === "users"
          ? []
          : req.params.resource === "reports"
            ? ["support"]
            : ["catalog"],
      )(req, res, next);
    },
    asyncHandler(c.moderate),
  );
  return r;
};
