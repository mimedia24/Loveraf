export type RouteName =
  | 'Splash'
  | 'Onboarding'
  | 'Login'
  | 'Register'
  | 'Verification'
  | 'Home'
  | 'Categories'
  | 'Catalog'
  | 'ProductDetails'
  | 'FlashSale'
  | 'Wishlist'
  | 'Compare'
  | 'RecentlyViewed'
  | 'FollowedShops'
  | 'Store'
  | 'Cart'
  | 'Checkout'
  | 'OrderSuccess'
  | 'Orders'
  | 'OrderDetails'
  | 'Tracking'
  | 'ReturnRefund'
  | 'Profile'
  | 'Wallet'
  | 'PromoBalance'
  | 'EarningsBalance'
  | 'Referral'
  | 'Affiliate'
  | 'Coupons'
  | 'Donation'
  | 'Notifications'
  | 'Messages'
  | 'Chat'
  | 'Addresses'
  | 'AddAddress'
  | 'PaymentMethods'
  | 'Help'
  | 'Settings'
  | 'SellerAccess'
  | 'Language'
  | 'Security'
  | 'Loyalty'
  | 'GiftCards'
  | 'Membership'
  | 'SellerDashboard'
  | 'SellerProducts'
  | 'SellerOrders'
  | 'SellerUpload'
  | 'SellerInbox'
  | 'DeliveryDashboard';

export type Route = { name: RouteName; params?: Record<string, unknown> };
export type Navigation = {
  push: (name: RouteName, params?: Route['params']) => void;
  replace: (name: RouteName, params?: Route['params']) => void;
  reset: (name: RouteName, params?: Route['params']) => void;
  back: () => void;
};
export type ScreenProps = {
  navigation: Navigation;
  params?: Route['params'];
  goHome?: () => void;
};
export type ProductArtType =
  | 'headphones'
  | 'hoodie'
  | 'watch'
  | 'chair'
  | 'dress'
  | 'phone'
  | 'shoe'
  | 'beauty'
  | 'grocery';
export type ProductImage = {
  id: string;
  uri?: string;
  art?: ProductArtType;
  color?: string;
  variantName?: string;
};
export type ProductVariant = {
  name: string;
  swatch: string;
  imageIds: string[];
};
export type Product = {
  sellerId?: string;
  status?: string;
  version?: number;
  id: string;
  title: string;
  price: number;
  oldPrice?: number;
  rating: number;
  sold: string;
  art: ProductArtType;
  color: string;
  badge?: string;
  description?: string;
  category?: string;
  sku?: string;
  stock?: number;
  sizes?: string[];
  images?: ProductImage[];
  variants?: ProductVariant[];
  returnDays?: number;
  exchangeDays?: number;
  deliveryMinDays?: number;
  deliveryMaxDays?: number;
  codAvailable?: boolean;
  sellerCreated?: boolean;
};

export type MessageActivityCategory = 'chat' | 'order' | 'alert' | 'promo';
