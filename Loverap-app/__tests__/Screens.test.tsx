import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import {Text, TextInput} from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppNavigator } from '../src/AppNavigator';
import { Navigation, RouteName } from '../src/types';
import { CartProvider } from '../src/cart';
import { SellerProvider } from '../src/seller';
import { CatalogProvider } from '../src/catalog';

const routes: RouteName[] = [
  'Splash',
  'Onboarding',
  'Login',
  'Register',
  'Verification',
  'Home',
  'Categories',
  'Catalog',
  'ProductDetails',
  'FlashSale',
  'Wishlist',
  'Compare',
  'RecentlyViewed',
  'FollowedShops',
  'Store',
  'Cart',
  'Checkout',
  'OrderSuccess',
  'Orders',
  'OrderDetails',
  'Tracking',
  'ReturnRefund',
  'Profile',
  'Wallet',
  'PromoBalance',
  'EarningsBalance',
  'Referral',
  'Affiliate',
  'Coupons',
  'Donation',
  'Notifications',
  'Messages',
  'Chat',
  'Addresses',
  'AddAddress',
  'PaymentMethods',
  'Help',
  'Settings',
  'SellerAccess',
  'Language',
  'Security',
  'Loyalty',
  'GiftCards',
  'Membership',
  'SellerDashboard',
  'SellerProducts',
  'SellerOrders',
  'SellerUpload',
  'SellerInbox',
  'DeliveryDashboard',
];

const navigation: Navigation = {
  push: jest.fn(),
  replace: jest.fn(),
  reset: jest.fn(),
  back: jest.fn(),
};

beforeAll(() => jest.useFakeTimers());
afterAll(() => jest.useRealTimers());

test.each(routes)('%s screen renders', async name => {
  let renderer: ReactTestRenderer.ReactTestRenderer | undefined;
  await ReactTestRenderer.act(() => {
    renderer = ReactTestRenderer.create(
      <SafeAreaProvider initialMetrics={{
        frame: {x: 0, y: 0, width: 360, height: 800},
        insets: {top: 24, bottom: 24, left: 0, right: 0},
      }}>
        <CatalogProvider>
          <CartProvider>
            <SellerProvider>
            <AppNavigator
              route={{ name }}
              navigation={navigation}
              goHome={jest.fn()}
            />
            </SellerProvider>
          </CartProvider>
        </CatalogProvider>
      </SafeAreaProvider>,
    );
  });
  // Ensure the screen actually renders beneath SafeAreaProvider and every
  // native text/input receives the fixed-scale policy (including modal forms).
  const textNodes = renderer!.root.findAllByType(Text);
  expect(textNodes.length).toBeGreaterThan(0);
  for (const node of [...textNodes, ...renderer!.root.findAllByType(TextInput)]) {
    expect(node.props.allowFontScaling).toBe(false);
    expect(node.props.maxFontSizeMultiplier).toBe(1);
  }
  await ReactTestRenderer.act(() => renderer?.unmount());
});
