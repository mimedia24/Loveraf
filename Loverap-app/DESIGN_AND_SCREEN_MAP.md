# Loveraf UI/UX Map

## Visual direction

- Deep navy creates a premium, trusted frame.
- Loveraf red is reserved for primary actions, active states and rewards.
- Soft gray canvas, rounded white cards and restrained shadows improve scanning.
- All product artwork, icons and the temporary brand mark are code-native, so the prototype has no remote media dependency.

## Customer journey

1. Splash → onboarding → login/register or demo entry
2. Home → categories/catalogue → product details → cart
3. Checkout → order confirmation → order details/tracking
4. Returns/refunds and support remain accessible from order details

## Screens

| Area | Screens |
|---|---|
| Entry | Splash, Onboarding, Login, Register |
| Discovery | Home, Categories, Catalogue, Flash Sale, Product Details, Store |
| Saved activity | Wishlist, Compare, Recently Viewed, Followed Shops |
| Commerce | Cart, Checkout, Order Success, Orders, Order Details, Tracking, Return/Refund |
| Wallet | Wallet, Promo Balance, Earnings Balance, Referral, Affiliate, Coupons, Donation |
| Communication | Notifications, Messages, Chat, Help & Support |
| Account | Profile, Addresses, Payment Methods, Settings, Language, Security |
| Retention | Loyalty, Gift Cards, Loveraf+ Membership |
| Role previews | Seller Dashboard, Seller Products, Seller Orders, Delivery Dashboard |

## Balance rules reflected in UI

| Balance | Meaning | Allowed actions |
|---|---|---|
| Promo Balance | Reward money displayed in Taka | Discount an eligible product by up to 10%; no withdrawal or transfer |
| Earnings Balance | Referral and affiliate earnings | Withdraw, pay with it, or donate after backend integration |

## Implementation boundary

Navigation and sample interactions are local state. Authentication, catalogue, inventory, payments, withdrawals, chat, push notifications, maps and delivery events require server integration in the next phase.
