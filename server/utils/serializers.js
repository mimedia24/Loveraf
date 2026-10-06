function id(value) {
  return String(value?._id || value?.id || value);
}
function user(value, session) {
  return {
    id: id(value),
    name: value.name,
    email: value.email || "",
    phone: value.phone || "",
    email_verified: value.emailVerified,
    phone_verified: value.phoneVerified,
    roles: value.roles,
    referralCode: value.referralCode,
    preferences: {
      push: true,
      offers: true,
      ...(value.preferences || {}),
      language: value.language || "en",
    },
    mfa: Boolean(
      session?.mfaAt &&
        Date.now() - new Date(session.mfaAt).getTime() < 15 * 60000,
    ),
  };
}
function seller(value, {includeLocation=false}={}) {
  const result = {
    id: id(value),
    name: value.name,
    storeId: value.storeId,
    handle: value.handle,
    categoryId: value.categoryId,
    category: value.category,
    email: value.email,
    phone: value.phone,
    address: value.address,
    logo: value.logo,
    status: value.status,
    version: value.version,
    createdAt: value.createdAt,
  };
  if(includeLocation&&value.location?.latitude!==undefined)result.location={latitude:value.location.latitude,longitude:value.location.longitude,accuracy:value.location.accuracy,address:value.location.address,capturedAt:value.location.capturedAt};
  return result;
}
function product(value) {
  const raw = value.toObject ? value.toObject() : value;
  return {
    id: id(raw),
    sellerId: id(raw.seller),
    title: raw.title,
    description: raw.description,
    brand:raw.brand, subCategoryId:raw.subCategoryId, subCategory:raw.subCategory, tags:raw.tags, seo:raw.seo,
    categoryId: raw.categoryId,
    category: raw.category,
    sku: raw.sku,
    price: raw.priceMinor / 100,
    oldPrice: raw.oldPriceMinor ? raw.oldPriceMinor / 100 : undefined,
    stock: raw.stock,
    stockPerCombination: raw.stockPerCombination ?? raw.stock,
    sizes: raw.sizes,
    images: (raw.images || []).map((image) => ({
      id: id(image.mediaId),
      uri: image.uri,
    })),
    variants: raw.variants,
    sizeChart:raw.sizeChart, video:raw.video?{id:id(raw.video.mediaId),uri:raw.video.uri,mime:raw.video.mime}:undefined,
    tax:raw.taxSnapshot?{enabled:Boolean(raw.taxSnapshot.enabled),mode:raw.taxSnapshot.mode,ratePercent:raw.taxSnapshot.ratePercent,fixedMinor:raw.taxSnapshot.fixedMinor}:undefined,
    returnDays: raw.returnDays,
    exchangeDays: raw.exchangeDays,
    deliveryMinDays: raw.deliveryMinDays,
    deliveryMaxDays: raw.deliveryMaxDays,
    codAvailable: raw.codAvailable,
    status: raw.status,
    version: raw.version,
    rating: raw.ratingCount ? raw.ratingTotal / raw.ratingCount : 0,
    sold: String(raw.soldUnits || 0),
    art: "watch",
    color: `${raw.variants?.[0]?.swatch || "#081426"}20`,
    badge: raw.oldPriceMinor ? "SALE" : "NEW",
    createdAt: raw.createdAt,
  };
}
module.exports = { id, user, seller, product };
