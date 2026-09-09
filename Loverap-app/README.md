# Loveraf Mobile UI

A complete, UI-only marketplace prototype built with **React Native Community CLI 0.87.0**. It is a native Android/iOS project—Expo is not used.

## What is included

- Premium navy, white and Loveraf-red design system
- Code-native demo logo, icons and product illustrations
- 46 navigable screens with local demo interactions
- Customer shopping, checkout, order, wallet and account flows
- Seller and delivery-partner dashboard previews
- No API, server, authentication service or external image dependency

## August 2026 UI update

- Shorter Home search and thin auto-sliding promotional banners
- Two-row Top Categories grid
- Sticky For You, Men, Women, Kids and Baby product filters
- Redesigned product detail actions, pricing, reviews and size/color/quantity selector
- Thinner Daraz-inspired Store, Chat, Add to Cart and Buy Now action bar
- Functional report menu and a dedicated seller storefront
- Separate Add/Edit Address page with dynamic Bangladesh division/district fields
- Working in-app and Android hardware back navigation

### Important wallet model

- **Promo Balance** is reward money for discounts. It is not withdrawable or transferable and can cover at most **10% of an eligible product value**.
- **Earnings Balance** contains referral/affiliate income and can be withdrawn, used for payment or donated when backend services are connected.

## Requirements

- Node.js 22.11 or newer
- JDK 17
- Android Studio with an Android SDK and emulator/device
- macOS + Xcode + CocoaPods for iOS

## Run on Android

From this project folder:

```bash
npm install
npm start
```

Keep Metro open. In a second terminal:

```bash
npm run android
```

You can also open the `android` directory in Android Studio and run the app from there.

## Create a debug APK

On macOS/Linux:

```bash
cd android
./gradlew assembleDebug
```

On Windows:

```bat
cd android
gradlew.bat assembleDebug
```

The APK is generated at `android/app/build/outputs/apk/debug/app-debug.apk`.

## Run on iOS

```bash
npm install
cd ios
bundle install
bundle exec pod install
cd ..
npm run ios
```

## Test routes

Start at the splash screen, proceed through onboarding and use **Explore demo without login**. Every visible card or button that represents a destination is wired to local navigation. From Profile you can also open Seller Panel and Delivery Panel previews.

## Project structure

```text
App.tsx                         Local stack navigation state
src/AppNavigator.tsx            Route-to-screen registry
src/components/                 Logo, icons, product art and shared UI
src/screens/AuthScreens.tsx     Splash, onboarding and authentication
src/screens/ShopScreens.tsx     Home, catalogue, product and discovery
src/screens/CommerceScreens.tsx Cart, checkout, orders and returns
src/screens/AccountScreens.tsx  Wallet, rewards, profile and support
src/screens/RoleScreens.tsx     Seller and delivery dashboards
src/data.ts                     Local demo products and categories
src/theme.ts                    Color, spacing, radius and shadow tokens
```

## Current scope

This package intentionally contains presentation and local interaction logic only. Connect API clients, persistent authentication, payments, notifications and real media in the next development phase. Replace `src/components/BrandLogo.tsx` when the final logo is ready.
