# Loveraf MongoDB API

Food Verse Server09-এর পরিচিত structure অনুসরণ করে তৈরি Express/Mongoose API। Mobile ও admin-এর existing `/api/v1` contract রাখা হয়েছে।

## Structure

- `models/` — Mongoose schemas and indexes
- `controllers/` — account, catalog, commerce, communication and admin business logic
- `routes/` — Express routers
- `middleware/` — JWT session authentication, validation and errors
- `services/` — OTP delivery, Cloudinary/local media and system seed
- `socket/` — authenticated Socket.IO rooms
- `tests/` — MongoDB integration tests

## Local run

1. Copy `.env.example` to `.env` and replace every secret.
2. Start MongoDB as a replica set (transactions are required for order/cart integrity).
3. Run `npm install`, then `npm run dev`.
4. API: `http://127.0.0.1:3001/api/v1`; health: `/health`.

Production OTP refuses to run without a configured HTTPS provider bridge or SMTP provider. Images use local server storage when `MEDIA_STORAGE=local`; Cloudinary can be configured later without changing the app contract. Online payment, courier automation, rewards, push and biometric unlock remain disabled until their real providers and business rules exist. Never commit `.env`, `secret.js`, Firebase keys or provider credentials.

The machine-readable API contract is available at `/api/v1/openapi.json`.
