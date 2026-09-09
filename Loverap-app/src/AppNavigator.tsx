import React from 'react';
import {VerificationScreen} from './screens/VerificationScreen';
import {useCatalog} from './catalog';
import {fixtureMode} from './api';
import {Screen,Header} from './components/UI';
import {Text} from './components/Typography';
import { Route, RouteName, ScreenProps } from './types';
import {
  LoginScreen,
  OnboardingScreen,
  RegisterScreen,
  SplashScreen,
} from './screens/AuthScreens';
import {
  CatalogScreen,
  CategoriesScreen,
  CompareScreen,
  FlashSaleScreen,
  FollowedShopsScreen,
  HomeScreen,
  ProductDetailsScreen,
  RecentlyViewedScreen,
  StoreScreen,
  WishlistScreen,
} from './screens/ShopScreens';
import {
  CartScreen,
  CheckoutScreen,
  OrderDetailsScreen,
  OrdersScreen,
  OrderSuccessScreen,
  ReturnRefundScreen,
  TrackingScreen,
} from './screens/CommerceScreens';
import {
  AddAddressScreen,
  AddressesScreen,
  AffiliateScreen,
  ChatScreen,
  CouponsScreen,
  DonationScreen,
  EarningsBalanceScreen,
  GiftCardsScreen,
  HelpScreen,
  LanguageScreen,
  LoyaltyScreen,
  MembershipScreen,
  MessagesScreen,
  NotificationsScreen,
  PaymentMethodsScreen,
  ProfileScreen,
  PromoBalanceScreen,
  ReferralScreen,
  SecurityScreen,
  SellerAccessScreen,
  SettingsScreen,
  WalletScreen,
} from './screens/AccountScreens';
import {
  DeliveryDashboardScreen,
  SellerDashboardScreen,
  SellerInboxScreen,
  SellerOrdersScreen,
  SellerProductsScreen,
  SellerUploadScreen,
} from './screens/RoleScreens';

const screens: Record<RouteName, React.ComponentType<ScreenProps>> = {
  Splash: SplashScreen,
  Onboarding: OnboardingScreen,
  Login: LoginScreen,
  Register: RegisterScreen,
  Verification: VerificationScreen,
  Home: HomeScreen,
  Categories: CategoriesScreen,
  Catalog: CatalogScreen,
  ProductDetails: ProductDetailsScreen,
  FlashSale: FlashSaleScreen,
  Wishlist: WishlistScreen,
  Compare: CompareScreen,
  RecentlyViewed: RecentlyViewedScreen,
  FollowedShops: FollowedShopsScreen,
  Store: StoreScreen,
  Cart: CartScreen,
  Checkout: CheckoutScreen,
  OrderSuccess: OrderSuccessScreen,
  Orders: OrdersScreen,
  OrderDetails: OrderDetailsScreen,
  Tracking: TrackingScreen,
  ReturnRefund: ReturnRefundScreen,
  Profile: ProfileScreen,
  Wallet: WalletScreen,
  PromoBalance: PromoBalanceScreen,
  EarningsBalance: EarningsBalanceScreen,
  Referral: ReferralScreen,
  Affiliate: AffiliateScreen,
  Coupons: CouponsScreen,
  Donation: DonationScreen,
  Notifications: NotificationsScreen,
  Messages: MessagesScreen,
  Chat: ChatScreen,
  Addresses: AddressesScreen,
  AddAddress: AddAddressScreen,
  PaymentMethods: PaymentMethodsScreen,
  Help: HelpScreen,
  Settings: SettingsScreen,
  SellerAccess: SellerAccessScreen,
  Language: LanguageScreen,
  Security: SecurityScreen,
  Loyalty: LoyaltyScreen,
  GiftCards: GiftCardsScreen,
  Membership: MembershipScreen,
  SellerDashboard: SellerDashboardScreen,
  SellerProducts: SellerProductsScreen,
  SellerOrders: SellerOrdersScreen,
  SellerUpload: SellerUploadScreen,
  SellerInbox: SellerInboxScreen,
  DeliveryDashboard: DeliveryDashboardScreen,
};

export function AppNavigator({
  route,
  navigation,
  goHome,
}: {
  route: Route;
  navigation: ScreenProps['navigation'];
  goHome: () => void;
}) {
  const ActiveScreen = screens[route.name];
  const catalog=useCatalog();
  if(!fixtureMode && route.name==='ProductDetails' && !catalog.products.some(p=>p.id===route.params?.productId)) {
    return <Screen><Header title="Product" navigation={navigation}/><Text>Product is unavailable. Please refresh the catalog.</Text></Screen>;
  }
  return (
    <ActiveScreen
      navigation={navigation}
      params={route.params}
      goHome={goHome}
    />
  );
}
