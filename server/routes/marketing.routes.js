const express=require('express');
const asyncHandler=require('../utils/asyncHandler');
const {listPublicCoupons}=require('../services/coupon.service');
const {listPublicCampaigns}=require('../services/donation.service');
module.exports=function marketingRoutes(){const r=express.Router();r.get('/coupons',asyncHandler(async(_req,res)=>res.json(await listPublicCoupons())));r.get('/donation-campaigns',asyncHandler(async(_req,res)=>res.json(await listPublicCampaigns())));r.post('/affiliate/click/:code',asyncHandler(async(req,res)=>res.status(201).json({accepted:await require('../services/affiliate.service').recordClick(req.params.code)})));return r;};
