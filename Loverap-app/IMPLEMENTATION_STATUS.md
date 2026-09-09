# Loveraf implementation status

Updated: 2026-09-08

## Shipped foundation

| Area | App behaviour | Server/API | Admin control | Status |
|---|---|---|---|---|
| Registration/login | Existing forms call API; secure native session restore | Password hashing, phone/email identity, expiry, rate limits | User list, suspend/reactivate, revoke via suspension | Implemented; provider credentials required for live OTP |
| Verification/recovery | Same design system, phone/email selector, code and reset | Expiring single-use challenges, attempt limits, session revoke | Admin sign-in requires verified contact and MFA challenge | Implemented; delivery adapter required |
| Profile/settings | Server identity shown; language/notification API exists | Owned profile/preferences/sessions | User visibility and audit | API implemented; remaining setting rows are later-phase availability gated |
| Addresses | Existing list/add/edit UI calls owned endpoints | CRUD, one default, owner checks | User record visibility | Implemented |
| Seller identity | Existing switcher and seller form call API | Verified owner, pending/approved/rejected/suspended state | Approval/rejection/suspension with reason | Implemented |
| Catalog | Buyer catalog loads approved server products | Search, category, seller filter, pagination, ownership | Review with version check; categories/content endpoints | Implemented |
| Product upload | Existing gallery/form uploads and submits | Cloudinary/local-dev upload, field validation, color-image mapping | Product approval/rejection/archive and audit | Implemented; Cloudinary credentials required in production |
| Cart | Guest persistence; login merge; variants remain separate | Persistent owned cart, stock checks, idempotent add | Product availability controls cart validity | Implemented |
| Checkout/COD | Existing checkout reads cart/address/server quote; Buy Now uses only the selected variant | Server totals, variant inventory locks, multi-seller split, COD order, retry protection | Data/API foundation | Implemented |
| Orders | Existing list/details can read owned orders | Owned list/detail/cancel and stock release | Data/API foundation | Implemented |
| Online payment | Existing rows show unavailable | Provider-neutral tables only | No live provider controls | Blocked until gateway selected/configured |
| Courier/refunds/reviews | Existing navigation is gated | Durable tables and model foundation | No live courier/provider workflow | Blocked until courier/payment providers are selected |
| Messages | Existing feed/chat calls persistent endpoints | Conversations, membership checks, messages/read/activity | Moderation foundation only | Basic persistence implemented; push/live socket/attachments require provider work |
| Wallet/rewards | Existing financial actions remain gated | Ledger/rule schema and balance/rule endpoints | Rule APIs require Finance+MFA | Foundation implemented; disabled until business rules are approved |
| Admin | Separate responsive web UI | Shared API, RBAC, MFA, audit | Users, sellers, products, reports, content | Implemented foundation |

## Security and integrity rules

- The app never assigns roles, seller approval, sold units, ratings or balances.
- Passwords use salted scrypt hashes. Session and verification tokens are stored as hashes.
- Mobile sessions are stored using Android/iOS secure keychain storage.
- Admin session token is held in an HttpOnly, SameSite cookie and administrator actions require role plus MFA.
- Product media IDs must belong to the submitting account. The server supplies stored media URLs.
- Cart and order mutations use an idempotency key. Inventory reservation and order creation share a database transaction.
- Every approval, rejection, suspension, product submission and content/rule change writes an audit event.
- Financial/provider functionality remains disabled until its real adapter, credentials, reconciliation and acceptance tests exist.

## Deployment gates

1. Install Node 22.11+, Docker/managed MongoDB replica set and Redis; configure Cloudinary for production media.
2. Copy `server/.env.example` to an untracked secret environment and configure `MONGODB_URI`. Transactions require a replica set.
3. Create the first administrator only with `npm run bootstrap-admin --prefix server`; then verify the account and complete admin MFA.
4. Set an HTTPS production API URL in `src/api.ts` before publishing Android; HTTP is development-only.
5. Configure real SMS and email bridge endpoints. Local verification writes secrets to `.local/outbox` and refuses to run outside development/test.
6. Build/deploy API and admin separately, keep admin behind HTTPS, and add managed backups/monitoring at the host.
7. Select payment and courier providers before enabling their feature flags. Sandbox-only integrations are not live acceptance.

## Validation evidence

- Mobile TypeScript and ESLint pass.
- 58 React Native screen/interaction tests pass.
- Express/CommonJS source validation passes.
- MongoDB replica-set integration suite covers password storage, JWT-backed session validation, OTP ownership, MFA, seller/product approval, private-data isolation, persistent cart/address, idempotent COD order and inventory reservation.
- Next.js admin production build passes.
- Android release build passes with native Keychain and AsyncStorage modules.
