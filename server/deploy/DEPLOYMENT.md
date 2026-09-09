# Production deployment: api.loveraf.com

Target VPS: `72.61.245.50`. The application listens only on `127.0.0.1:3001`; Nginx terminates public HTTPS traffic.

## External prerequisites

1. Add an `A` record named `api` pointing to `72.61.245.50` with TTL `300`. Do not edit the root or `www` records.
2. Add `72.61.245.50/32` to the Atlas project IP access list.
3. Create a dedicated Atlas application user with `readWrite` access only to the `loveraf` database. Do not use an Atlas administrator account.

## VPS installation

Install Node.js 22 LTS, Nginx, Certbot, UFW and PM2. Create an application account and `/var/www/loveraf-server`, then transfer this directory without `node_modules`, `.env`, `.local`, `uploads` or log files.

Inside `/var/www/loveraf-server`:

```sh
npm ci --omit=dev
npm run build
cp .env.example .env
chmod 600 .env
```

Fill `.env` on the VPS with production values. Generate new independent JWT and OTP HMAC secrets. The MongoDB password must be URL encoded. For Gmail email verification, set `SMTP_HOST=smtp.gmail.com`, port `465`, secure mode, the Gmail address, its dedicated App Password and a matching `SMTP_FROM`. Keep SMS and media provider variables empty until configured.

Install `deploy/nginx-api.loveraf.com.conf` as `/etc/nginx/sites-available/api.loveraf.com`, enable it, validate with `nginx -t`, then reload Nginx. Start the API with:

```sh
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
```

Allow only OpenSSH and `Nginx Full` through UFW. Do not open port 3001. Once DNS resolves, issue and install the certificate:

```sh
certbot --nginx -d api.loveraf.com --redirect
```

## Acceptance checks

```sh
curl --fail https://api.loveraf.com/health/live
curl --fail https://api.loveraf.com/health/ready
curl --fail https://api.loveraf.com/api/v1/features
pm2 status loveraf-api
```

`verification` and `media_upload` must be `false` until their production providers are configured. After a reboot, repeat the health checks and confirm PM2 restored the process.
