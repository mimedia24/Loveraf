# Independent seller accounts

Implementation ready locally; not deployed as part of the code change.

Seller registration uses /api/v1/auth/seller/register and requires store name, an administrator-managed category ID, address, precise location, email, phone and password. The server atomically creates a separate seller principal, an immutable six-digit Store ID, an internal public handle and a draft store. No personal account ID is accepted. Personal and seller credentials can share an email/phone but use distinct accountType-scoped unique indexes and login endpoints.

The seller uploads a logo through authenticated /media, then submits its ID to /me/sellers/:id/submit. Only that seller's media is accepted. Submission changes draft to pending; admin approval is still required. A failed upload can be resumed after seller login. Existing /me/sellers POST refuses linked-store creation.

Deployment requires owner approval for the following concrete changes:

1. Back up Loveraf API source/environment and the users/sellers collections plus current index definitions. Record all unrelated PM2 process IDs.
2. Stop only loveraf-api during the account-index migration to prevent registrations while old indexes are changed. Upload the reviewed server source, preserving production environment and external upload directory.
3. Run scripts/migrate-account-types.cjs using the Loveraf production configuration. It fills missing personal accountType values, creates scoped unique indexes, then drops only the previous email_1 and phone_1 unique indexes. It does not convert any personal account to seller or delete user/store data.
4. Start only loveraf-api. Verify personal/admin login, independent seller registration/login, image ownership, draft submission and approval using labelled test records. Cancel/archive QA commerce data.
5. Recheck other PM2 process IDs and hand over the new Android APK.

Legacy linked sellers remain preserved for review; they are not automatically assigned new seller passwords or transferred to new owners. Do not blindly roll back to the old unscoped login code after allowing matching identifiers across account types. Any rollback must preserve accountType-aware authentication or reconcile newly created accounts first.

The admin dashboard already displays the returned email, phone, address and logo in each seller's Details. Email/SMS verification stays disabled.
