const { z } = require("zod");
const objectId = z.string().regex(/^[a-f\d]{24}$/i);
const uuid = z.string().uuid();
const password = z.string().min(6, "Password must contain at least 6 characters.").max(200);
const loginPassword = z.string().min(1, "Enter your password.").max(200);
const sellerLocation = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracy: z.number().min(0).max(100000),
  address: z.string().trim().min(5).max(500),
  capturedAt: z.iso.datetime(),
}).strict();
const optionalEmail = z.preprocess(
  (value) => (typeof value === "string" && !value.trim() ? undefined : value),
  z.string().trim().email().optional(),
);
const optionalPhone = z.preprocess(
  (value) => (typeof value === "string" && !value.trim() ? undefined : value),
  z
    .string()
    .trim()
    .regex(/^01\d{9}$/)
    .optional(),
);
const body = (schema) =>
  z.object({ body: schema, query: z.any(), params: z.any() });
const auth = {
  sellerRegister: body(
    z
      .object({
        name: z.string().trim().min(2).max(150),
        email: z.string().trim().email(),
        phone: z
          .string()
          .trim()
          .regex(/^01\d{9}$/),
        password,
        categoryId: z.string().trim().min(1).max(100),
        address: z.string().trim().min(5).max(500),
        location: sellerLocation,
      })
      .strict(),
  ),
  register: body(
    z
      .object({
        name: z.string().trim().min(2).max(120),
        email: optionalEmail,
        phone: optionalPhone,
        password,
        referralCode: z.string().trim().toUpperCase().regex(/^LR[A-F0-9]{8}$/).optional(),
        device: z.record(z.string(), z.any()).optional(),
      })
      .strict()
      .refine((value) => value.email || value.phone, {
        message: "Email or mobile number is required.",
        path: ["email"],
      }),
  ),
  login: body(
    z
      .object({
        login: z.string().trim().min(3).max(200),
        password: loginPassword,
        device: z.record(z.string(), z.any()).optional(),
      })
      .strict(),
  ),
  challenge: body(
    z
      .object({
        channel: z.enum(["email", "phone"]),
        purpose: z.enum(["verify", "admin"]),
      })
      .strict(),
  ),
  recovery: body(
    z
      .object({
        login: z.string().min(3),
        channel: z.enum(["email", "phone"]).optional(),
      })
      .strict(),
  ),
  verify: body(
    z
      .object({ challengeId: objectId, code: z.string().regex(/^\d{6}$/) })
      .strict(),
  ),
  reset: body(
    z
      .object({
        challengeId: objectId,
        code: z.string().regex(/^\d{6}$/),
        password,
      })
      .strict(),
  ),
  reauth: body(z.object({ password: loginPassword }).strict()),
  changePassword: body(
    z
      .object({ currentPassword: loginPassword, newPassword: password })
      .strict()
      .refine((value) => value.currentPassword !== value.newPassword, {
        message: "Choose a different new password.",
        path: ["newPassword"],
      }),
  ),
};
const seller = body(
  z
    .object({
      name: z.string().trim().min(2).max(150),
      handle: z
        .string()
        .trim()
        .regex(/^[a-z0-9][a-z0-9_-]{2,39}$/i),
      category: z.string().trim().min(2).max(100),
    })
    .strict(),
);
const image = z.object({ id: objectId, uri: z.string().optional() }).strict();
const variant = z
  .object({
    name: z.string().min(1).max(100),
    swatch: z.string().regex(/^#[0-9a-f]{6}$/i),
    imageIds: z.array(objectId).min(1).max(10),
  })
  .strict();
const product = body(
  z
    .object({
      title: z.string().trim().min(3).max(240),
      description: z.string().trim().min(10).max(10000),
      categoryId: z.string().trim().min(1).max(100),
      price: z.number().positive(),
      oldPrice: z.number().positive().optional(),
      stock: z.number().int().min(0).max(1000000),
      sizes: z.array(z.string().min(1).max(50)).min(1).max(30),
      images: z.array(image).min(1).max(20),
      variants: z.array(variant).min(1).max(30),
      returnDays: z.number().int().min(0).max(365),
      exchangeDays: z.number().int().min(0).max(365),
      deliveryMinDays: z.number().int().min(0).max(90),
      deliveryMaxDays: z.number().int().min(0).max(90),
      codAvailable: z.boolean(),
      version: z.number().int().min(0).optional(),
    })
    .strict()
    .superRefine((value, ctx) => {
      if (value.oldPrice && value.oldPrice < value.price)
        ctx.addIssue({
          code: "custom",
          path: ["oldPrice"],
          message: "Regular price must be at least the sale price.",
        });
      if (value.deliveryMaxDays < value.deliveryMinDays)
        ctx.addIssue({
          code: "custom",
          path: ["deliveryMaxDays"],
          message: "Maximum delivery days cannot be lower.",
        });
      if (
        new Set(value.sizes.map((item) => item.toLowerCase())).size !==
        value.sizes.length
      )
        ctx.addIssue({
          code: "custom",
          path: ["sizes"],
          message: "Each size must be unique.",
        });
      if (
        new Set(value.variants.map((item) => item.name.toLowerCase())).size !==
        value.variants.length
      )
        ctx.addIssue({
          code: "custom",
          path: ["variants"],
          message: "Each color must be unique.",
        });
      if (value.stock * value.sizes.length * value.variants.length > 1000000)
        ctx.addIssue({
          code: "custom",
          path: ["stock"],
          message:
            "Total stock across all size and color combinations is too large.",
        });
      const ids = new Set(value.images.map((item) => item.id));
      if (
        value.variants.some((item) => item.imageIds.some((id) => !ids.has(id)))
      )
        ctx.addIssue({
          code: "custom",
          path: ["variants"],
          message: "Each color image must belong to the uploaded gallery.",
        });
    }),
);
const address = body(
  z
    .object({
      title: z.string().min(1).max(80),
      name: z.string().min(2).max(120),
      mobile: z.string().regex(/^01\d{9}$/),
      division: z.string().min(2).max(100),
      district: z.string().min(2).max(100),
      details: z.string().min(5).max(500),
      isDefault: z.boolean().optional(),
    })
    .strict(),
);
const profileUpdate = body(
  z.object({
    name: z.string().trim().min(2).max(120).optional(),
    preferences: z.object({
      push: z.boolean().optional(),
      offers: z.boolean().optional(),
      language: z.enum(['en','bn']).optional(),
    }).strict().optional(),
  }).strict().refine(value=>value.name!==undefined||value.preferences!==undefined,{message:"Choose profile information to update."}),
);
const cart = body(
  z
    .object({
      productId: objectId,
      qty: z.number().int().min(1).max(999),
      color: z.string().min(1).max(100),
      size: z.string().min(1).max(100),
    })
    .strict(),
);
const buyNow = z
  .object({
    productId: objectId,
    qty: z.number().int().min(1).max(999),
    color: z.string().min(1).max(100),
    size: z.string().min(1).max(100),
  })
  .strict();
const checkout = body(
  z
    .object({
      addressId: objectId,
      paymentMethod: z.enum(["cod", "bkash", "card"]),
      promo: z.boolean().default(false),
      couponCode: z.string().trim().toUpperCase().regex(/^[A-Z0-9_-]{3,30}$/).optional(),
      affiliateCode:z.string().trim().toUpperCase().regex(/^AF[A-F0-9]{12}$/).optional(),
      buyNow: buyNow.optional(),
    })
    .strict(),
);
const orderStatus = body(
  z
    .object({
      status: z.enum(["packing", "shipped", "delivered", "cancelled"]),
      reason: z.string().trim().max(500).optional(),
      version: z.number().int().min(0).optional(),
      sellerId: objectId.optional(),
    })
    .strict(),
);
const productReport = body(
  z.object({ reason: z.string().trim().min(5).max(500) }).strict(),
);
const productReview = body(
  z
    .object({
      orderId: objectId.optional(),
      rating: z.number().int().min(1).max(5),
      body: z.string().trim().min(10).max(1000),
    })
    .strict(),
);
const sellerReviewReply = body(
  z.object({ body: z.string().trim().min(2).max(1000) }).strict(),
);
const reviewStatus = body(
  z
    .object({
      status: z.enum(["published", "rejected"]),
      reason: z.string().trim().min(3).max(500),
      version: z.number().int().min(0),
    })
    .strict(),
);
const returnRequest = body(
  z
    .object({
      sellerId: objectId,
      type: z.enum(["return", "exchange"]),
      reason: z.string().trim().min(5).max(500),
      lineIds: z.array(objectId).min(1).max(50),
      refundDestination: z
        .object({
          method: z.enum(["bkash", "nagad", "bank"]),
          account: z.string().trim().min(5).max(100),
        })
        .strict()
        .optional(),
    })
    .strict()
    .superRefine((value, ctx) => {
      if (value.type === "return" && !value.refundDestination)
        ctx.addIssue({
          code: "custom",
          path: ["refundDestination"],
          message: "Select where the COD refund should be sent.",
        });
    }),
);
const returnStatus = body(
  z
    .object({
      status: z.enum([
        "approved",
        "rejected",
        "in_transit",
        "received",
        "refunded",
        "replaced",
      ]),
      reason: z.string().trim().min(3).max(500),
      version: z.number().int().min(0),
      restock: z.boolean().optional(),
      settlement: z
        .object({
          method: z.enum(["bkash", "nagad", "bank"]),
          reference: z.string().trim().min(3).max(150),
          amountMinor: z.number().int().nonnegative(),
          paidAt: z.iso.datetime(),
        })
        .strict()
        .optional(),
      replacement: z
        .object({
          courier: z.string().trim().min(2).max(100),
          tracking: z.string().trim().min(2).max(150),
        })
        .strict()
        .optional(),
    })
    .strict()
    .superRefine((value, ctx) => {
      if (value.status === "received" && value.restock === undefined)
        ctx.addIssue({
          code: "custom",
          path: ["restock"],
          message: "Confirm whether these items can be restocked.",
        });
      if (value.status === "refunded" && !value.settlement)
        ctx.addIssue({
          code: "custom",
          path: ["settlement"],
          message: "Completed refund evidence is required.",
        });
      if (value.status !== "received" && value.restock !== undefined)
        ctx.addIssue({
          code: "custom",
          path: ["restock"],
          message: "Restocking is recorded when receiving items.",
        });
      if (value.status !== "refunded" && value.settlement)
        ctx.addIssue({
          code: "custom",
          path: ["settlement"],
          message: "Refund evidence is only accepted when completing a refund.",
        });
      if (value.status === "replaced" && !value.replacement)
        ctx.addIssue({
          code: "custom",
          path: ["replacement"],
          message: "Replacement tracking evidence is required.",
        });
      if (value.status !== "replaced" && value.replacement)
        ctx.addIssue({
          code: "custom",
          path: ["replacement"],
          message: "Replacement tracking is only accepted for an exchange.",
        });
    }),
);
const shipment = body(
  z
    .object({
      sellerId: objectId.optional(),
      courier: z.string().trim().min(2).max(100),
      tracking: z.string().trim().min(2).max(150),
      status: z.enum([
        "booked",
        "picked_up",
        "in_transit",
        "delivered",
        "failed",
        "rto",
      ]),
      version: z.number().int().min(0),
    })
    .strict(),
);
const codSettlement = body(
  z
    .object({
      reference: z.string().trim().min(3).max(150),
      amountMinor: z.number().int().nonnegative(),
      collectedAt: z.iso.datetime(),
      version: z.number().int().min(0),
    })
    .strict(),
);
const contentPayload = body(
  z
    .object({
      data: z.union([
        z.array(z.unknown()).max(100),
        z.record(z.string(), z.unknown()),
      ]),
      reason: z.string().trim().min(3).max(500),
      version: z.number().int().min(0),
    })
    .strict(),
);
const adminRoles = body(
  z.object({
    roles:z.array(z.enum(["catalog","operations","support","finance"])).max(4),
    reason:z.string().trim().min(3).max(500),
  }).strict(),
);
const businessRuleUpdate=body(
  z.object({
    enabled:z.boolean(),
    version:z.number().int().min(0),
    data:z.record(z.string(),z.unknown()),
    reason:z.string().trim().min(3).max(500),
  }).strict(),
);
const featureUpdate=body(
  z.object({enabled:z.boolean(),version:z.number().int().min(0),reason:z.string().trim().min(3).max(500)}).strict(),
);
const withdrawalRequest=body(z.object({amountMinor:z.number().int().positive().max(Number.MAX_SAFE_INTEGER),destination:z.object({method:z.enum(['bkash','nagad','bank']),account:z.string().trim().min(5).max(100)}).strict()}).strict());
const withdrawalStatus=body(z.object({status:z.enum(['approved','rejected','paid']),version:z.number().int().min(0),reason:z.string().trim().min(3).max(500),settlement:z.object({reference:z.string().trim().min(3).max(150),paidAt:z.iso.datetime()}).strict().optional()}).strict().superRefine((value,ctx)=>{
  if(value.status==='paid'&&!value.settlement)ctx.addIssue({code:'custom',path:['settlement'],message:'Payout evidence is required.'});
  if(value.status!=='paid'&&value.settlement)ctx.addIssue({code:'custom',path:['settlement'],message:'Payout evidence is accepted only when marking paid.'});
}));
const couponPayload=body(z.object({
  code:z.string().trim().toUpperCase().regex(/^[A-Z0-9_-]{3,30}$/),name:z.string().trim().min(2).max(100),description:z.string().trim().max(300).default(''),
  discountType:z.enum(['percent','fixed']),discountValue:z.number().int().positive().max(Number.MAX_SAFE_INTEGER),minimumOrderMinor:z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER).default(0),maximumDiscountMinor:z.number().int().positive().max(Number.MAX_SAFE_INTEGER).optional(),
  startsAt:z.iso.datetime(),endAt:z.iso.datetime(),totalLimit:z.number().int().min(1).max(1000000),perUserLimit:z.number().int().min(1).max(1000),enabled:z.boolean(),version:z.number().int().min(0).optional(),reason:z.string().trim().min(3).max(500),
}).strict().superRefine((value,ctx)=>{
  if(value.discountType==='percent'&&value.discountValue>100)ctx.addIssue({code:'custom',path:['discountValue'],message:'Percentage discount cannot exceed 100.'});
  if(value.discountType==='percent'&&!value.maximumDiscountMinor)ctx.addIssue({code:'custom',path:['maximumDiscountMinor'],message:'Set a maximum discount for percentage coupons.'});
  if(value.discountType==='fixed'&&value.maximumDiscountMinor)ctx.addIssue({code:'custom',path:['maximumDiscountMinor'],message:'Fixed coupons do not use a maximum discount.'});
}));
const giftCardRedeem=body(z.object({code:z.string().trim().toUpperCase().regex(/^LR-[A-F0-9]{6}-[A-F0-9]{6}-[A-F0-9]{6}$/)}).strict());
const loyaltyRedeem=body(z.object({points:z.number().int().positive().max(100000000)}).strict());
const giftCardIssue=body(z.object({amountMinor:z.number().int().positive().max(Number.MAX_SAFE_INTEGER),expiresAt:z.iso.datetime(),reason:z.string().trim().min(3).max(500)}).strict());
const auditedVersion=body(z.object({version:z.number().int().min(0),reason:z.string().trim().min(3).max(500)}).strict());
const membershipGrant=body(z.object({userId:objectId,plan:z.enum(['monthly','annual']),startsAt:z.iso.datetime(),endsAt:z.iso.datetime(),reason:z.string().trim().min(3).max(500)}).strict());
const donationCampaign=body(z.object({title:z.string().trim().min(3).max(160),description:z.string().trim().min(10).max(1000),goalMinor:z.number().int().positive().max(Number.MAX_SAFE_INTEGER),startsAt:z.iso.datetime(),endsAt:z.iso.datetime(),status:z.enum(['draft','active','closed']),verified:z.boolean(),version:z.number().int().min(0).optional(),reason:z.string().trim().min(3).max(500)}).strict());
const donationContribution=body(z.object({campaignId:objectId,amountMinor:z.number().int().positive().max(Number.MAX_SAFE_INTEGER)}).strict());
const affiliateLink=body(z.object({productId:objectId}).strict());
const paymentMethodAttach=body(z.object({providerToken:z.string().trim().min(8).max(2000),isDefault:z.boolean().optional()}).strict());
const pushDevice=body(z.object({installationId:z.string().trim().min(8).max(200),platform:z.enum(['android','ios']),token:z.string().trim().min(16).max(4096),appBuild:z.string().trim().min(1).max(50).optional()}).strict());
const notificationCampaign=body(z.object({title:z.string().trim().min(3).max(160),body:z.string().trim().min(3).max(1000),category:z.enum(['alert','promo']),audience:z.enum(['all','personal','seller']),targetType:z.enum(['none','product','store']).default('none'),targetId:objectId.optional(),scheduledAt:z.iso.datetime().optional(),action:z.enum(['save','schedule','send','cancel']),version:z.number().int().min(0).optional(),reason:z.string().trim().min(3).max(500)}).strict().superRefine((value,ctx)=>{if(value.targetType!=='none'&&!value.targetId)ctx.addIssue({code:'custom',path:['targetId'],message:'Choose a target record.'});if(value.targetType==='none'&&value.targetId)ctx.addIssue({code:'custom',path:['targetId'],message:'Remove the target ID when no target is selected.'});}));
const sellerSubmission=body(z.object({logoId:objectId}).strict());
const cartQuantity=body(z.object({qty:z.number().int().min(1).max(999)}).strict());
const activityRead=body(z.object({ids:z.array(objectId).max(100).optional()}).strict());
const conversationCreate=body(z.object({kind:z.enum(['support','seller']),sellerId:objectId.optional()}).strict().superRefine((value,ctx)=>{if(value.kind==='seller'&&!value.sellerId)ctx.addIssue({code:'custom',path:['sellerId'],message:'Select a seller.'});if(value.kind==='support'&&value.sellerId)ctx.addIssue({code:'custom',path:['sellerId'],message:'Seller is not used for support chat.'});}));
const messagePayload=body(z.object({body:z.string().trim().max(4000).optional(),attachmentIds:z.array(objectId).max(4).optional()}).strict().superRefine((value,ctx)=>{if(!value.body?.length&&!value.attachmentIds?.length)ctx.addIssue({code:'custom',path:['body'],message:'Write a message or attach an image.'});}));
module.exports = {
  z,
  objectId,
  uuid,
  body,
  auth,
  seller,
  product,
  address,
  profileUpdate,
  cart,
  checkout,
  orderStatus,
  productReport,
  productReview,
  sellerReviewReply,
  reviewStatus,
  returnRequest,
  returnStatus,
  shipment,
  codSettlement,
  contentPayload,
  adminRoles,
  businessRuleUpdate,
  featureUpdate,
  withdrawalRequest,
  withdrawalStatus,
  couponPayload,
  giftCardRedeem,
  loyaltyRedeem,
  giftCardIssue,
  auditedVersion,
  membershipGrant,
  donationCampaign,
  donationContribution,
  affiliateLink,
  paymentMethodAttach,
  pushDevice,
  notificationCampaign,
  sellerSubmission,
  cartQuantity,
  activityRead,
  conversationCreate,
  messagePayload,
};
