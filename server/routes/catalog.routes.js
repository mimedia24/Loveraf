const express=require('express');
const multer=require('multer');
const validate=require('../middleware/validate');
const asyncHandler=require('../utils/asyncHandler');
const schemas=require('../validation/schemas');
const CatalogController=require('../controllers/catalog.controller');
const {sellerOwner}=require('../middleware/auth');
module.exports=function catalogRoutes(authService,requireAuth,uploadMedia){
  const publicRouter=express.Router(),privateRouter=express.Router(),controller=new CatalogController(authService);controller.uploadMedia=uploadMedia;
  publicRouter.get('/features',asyncHandler(controller.features));publicRouter.get('/products',asyncHandler(controller.list));publicRouter.get('/products/:id',asyncHandler(controller.detail));publicRouter.get('/content/:key',asyncHandler(controller.content));
  privateRouter.use(requireAuth);privateRouter.get('/me/sellers',asyncHandler(controller.sellers));privateRouter.post('/me/sellers',validate(schemas.seller),asyncHandler(controller.createSeller));privateRouter.get('/me/sellers/:id/products',sellerOwner(),asyncHandler(controller.sellerProducts));privateRouter.post('/me/sellers/:id/products',sellerOwner(),validate(schemas.product),asyncHandler(controller.publish));
  const upload=multer({storage:multer.memoryStorage(),limits:{fileSize:8*1024*1024,files:1}});privateRouter.post('/media',upload.single('image'),asyncHandler(controller.upload));
  return {publicRouter,privateRouter};
};
