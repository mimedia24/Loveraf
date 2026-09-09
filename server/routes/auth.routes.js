const express=require('express');
const validate=require('../middleware/validate');
const asyncHandler=require('../utils/asyncHandler');
const schemas=require('../validation/schemas');
const AuthController=require('../controllers/auth.controller');
module.exports=function authRoutes(authService,requireAuth){
  const router=express.Router(),controller=new AuthController(authService);
  router.post('/register',validate(schemas.auth.register),asyncHandler(controller.register));
  router.post('/login',validate(schemas.auth.login),asyncHandler(controller.login));
  router.post('/recovery',validate(schemas.auth.recovery),asyncHandler(controller.recovery));
  router.post('/reset-password',validate(schemas.auth.reset),asyncHandler(controller.reset));
  router.post('/logout',requireAuth,asyncHandler(controller.logout));
  router.post('/challenge',requireAuth,validate(schemas.auth.challenge),asyncHandler(controller.challenge));
  router.post('/verify',requireAuth,validate(schemas.auth.verify),asyncHandler(controller.verify));
  router.post('/reauthenticate',requireAuth,validate(schemas.auth.reauth),asyncHandler(controller.reauthenticate));
  return router;
};
