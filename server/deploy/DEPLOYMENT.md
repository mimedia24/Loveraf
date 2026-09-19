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

Fill `.env` on the VPS with production values. Generate new independent JWT and OTP HMAC secrets. The MongoDB password must be URL encoded. Keep verification provider variables empty until configured. With `MEDIA_STORAGE=local`, preserve and back up the configured uploads directory across releases.

Install `deploy/nginx-api.loveraf.com.conf` as `/etc/nginx/sites-available/api.loveraf.com`, enable it, validate with `nginx -t`, then reload Nginx. Start the API with:

```sh
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
```

Install bounded PM2 log rotation once on the VPS (this is shared PM2 infrastructure, so inspect the existing module first):

```sh
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 14
pm2 set pm2-logrotate:compress true
pm2 save
```

Restart only `loveraf-api`; never use `pm2 restart all` on this shared VPS.

## Backup and restore rehearsal

Create a new private backup directory; never reuse or overwrite an earlier backup:

```sh
install -d -m 700 /var/backups/loveraf
npm run backup -- /var/backups/loveraf/$(date -u +%Y%m%dT%H%M%SZ)
tar -C /var/www/loveraf-server -czf /var/backups/loveraf/uploads-$(date -u +%Y%m%dT%H%M%SZ).tar.gz uploads
```

Test the database backup against a separate, empty Atlas database whose name includes `restore`, `rehearsal` or `test`:

```sh
MONGODB_RESTORE_URI='mongodb+srv://.../loveraf_restore_rehearsal?...' \
RESTORE_CONFIRM=RESTORE_INTO_EMPTY_NON_PRODUCTION_DATABASE \
npm run restore:rehearsal -- /var/backups/loveraf/BACKUP_DIRECTORY
```

The restore tool refuses the live application URI, refuses non-test-like database names, verifies SHA-256 checksums and counts, and refuses a non-empty target. Delete the rehearsal database only after manually checking users, sellers, products, orders, payments, returns and messages. Keep backup files outside the release directory with restricted permissions.

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

`verification`, `online_payment`, `courier_automation`, `rewards` and `push_notifications` must remain `false` until their production providers or business rules are configured. `media_upload` is `true` when the persistent local upload directory or Cloudinary is configured. After a reboot, repeat the health checks and confirm PM2 restored the process.
