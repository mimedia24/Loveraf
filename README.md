# Loveraf

Loveraf is kept as three separate applications. Do not place the API or admin
source inside the mobile app folder.

## Project structure

```text
LoveRaf/
├─ Loverap-app/   # React Native Android/iOS application
├─ server/        # Express + MongoDB/Mongoose + Socket.IO API
├─ admin/         # Next.js admin panel
├─ release/       # Release artifacts only
└─ backups/       # Recoverable backups; never used as runtime source
```

## Where to work

- Mobile app: `Loverap-app/`
- API: `server/`
- Admin panel: `admin/`

The production API is `https://api.loveraf.com/api/v1`. API deployment
instructions are in `server/deploy/DEPLOYMENT.md`; admin deployment instructions
are in `admin/deploy/README.md`.

Environment files, credentials, dependencies, build output and backups must not
be committed. Each application has its own package manifest and environment
example. Keep their `node_modules` and runtime `.env` files inside that
application only.
