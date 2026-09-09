# Loveraf admin

Responsive Next.js administration shell for users, seller/product moderation, reports, content and audit history. The browser never receives the backend bearer token; the Next.js proxy stores it in an HttpOnly cookie. Admin access requires a server role and a completed MFA challenge.

Copy `.env.example` to an untracked environment, point `API_URL` at the private/HTTPS API endpoint, then run `npm install` and `npm run dev`. Production deployment must set the exact public `ADMIN_ORIGIN`, HTTPS and a supported Node runtime.
