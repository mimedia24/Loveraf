# Loveraf

Loveraf is organized as a single repository with three applications:

- `Loverap-app/` — React Native Android application
- `server/` — Express, Mongoose and Socket.IO API
- `admin/` — Next.js administration application

Environment files, credentials, dependencies, build output, APKs and backups are intentionally excluded from version control. Use each application's `.env.example` as the configuration contract.

The production API deployment target is `https://api.loveraf.com/api/v1`. Deployment instructions are in `server/deploy/DEPLOYMENT.md`.
