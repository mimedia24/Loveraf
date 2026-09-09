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

Production OTP and image uploads refuse to run without HTTPS provider bridge and Cloudinary credentials. Never commit `.env`, `secret.js`, Firebase keys or provider credentials.
