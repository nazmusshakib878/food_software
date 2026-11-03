# OCI Always Free deployment bundle

This deployment keeps the current Vercel frontend and its `/api/*` proxy. The Oracle VM runs the existing Laravel API, Nginx TLS termination, and MySQL 8.4. MySQL data lives in the Docker volume `nurfood_mysql_data` on the VM boot volume; port 3306 is not published. Laravel keeps its existing MySQL schema and authentication/business logic.

## OCI constraints

The requested A1 Flex resource is generally Always Free within the tenancy's monthly A1 allowance. Oracle currently documents 2 OCPUs and 12 GB RAM as the Always Free equivalent, and combined Always Free boot/block storage is limited to 200 GB in the home region. The requested single 50 GB boot volume fits that general limit. These facts do **not** confirm this account's home region, free quota, current usage, ARM host capacity, network resource eligibility, or that a specific instance is billed at $0. Confirm the console's **Always Free Eligible** label and estimated cost for every resource before creating it. This repository contains no OCI CLI, OCI config, or authenticated OCI session; no cloud resource was inspected or created here.

Use an Ubuntu 24.04 ARM64 image explicitly marked Always Free Eligible, `VM.Standard.A1.Flex`, 2 OCPU, 12 GB RAM, and a 50 GB boot volume only if the console confirms $0. Do not enable account upgrade or create paid resources to work around capacity limits. Create only the required VCN, subnet, internet gateway, route, security list/NSG and ephemeral public IPv4 if each is confirmed included/free. Do not create a paid reserved IP, NAT gateway or load balancer.

## OCI networking and SSH

The OCI subnet ingress rules and host UFW must allow TCP 22 from the operator's trusted IP/CIDR and TCP 80/443 from the internet. Do not allow inbound 3306, 33060, 9000, or 6379. Use the OCI-created SSH key; keep its private key outside this repository. Install and boot Ubuntu, then reconnect over SSH before continuing.

Run `sudo bash deploy/oci/bootstrap-ubuntu.sh <trusted-ssh-ip-or-cidr> ubuntu`. Verify a second SSH connection using the private key. Only after that succeeds, run `sudo env KEY_LOGIN_VERIFIED=YES bash deploy/oci/disable-password-ssh.sh ubuntu`. Keep the verified session open until the new SSH policy is tested. The baseline enables Docker, UFW, Fail2ban, unattended security updates, and bounded Docker logs.

## TLS and application deployment

Point a DNS hostname you control at the VM's public IP. The certificate bootstrap requires public DNS resolution and inbound port 80. The six-day IP-address certificate flow is intentionally not enabled: it requires a Certbot IP-specific short-lived profile and reliable automatic renewal. A stable DNS name permits ordinary Let's Encrypt renewal.

Clone the repository onto the VM using the deploy user's SSH key. In the repository root, copy `deploy/oci/env.example` to `deploy/oci/.env`, then set `APP_URL` to the public HTTPS API hostname, `TLS_EMAIL`, a strong unique `DB_PASSWORD`, and a different strong `MYSQL_ROOT_PASSWORD`. Keep values alphanumeric or quote them using dotenv syntax. Do not commit this file. Create a separate backup encryption passphrase outside the repository at `/root/.config/nurfood/backup-passphrase`, owned by root and mode `0600`; keep an offline recovery copy of that passphrase.

Run `bash deploy/oci/deploy.sh`. It builds the PHP ARM64 image, starts MySQL/app/Nginx, obtains a free Let's Encrypt certificate, caches Laravel config/views, and requests the `/up` health endpoint. It does not run database migrations or seed demo accounts. Verify the deployed host and `APP_URL` before any migration. For a new empty database, run `docker compose --env-file deploy/oci/.env -f docker-compose.oci.yml exec -T app php artisan migrate --force`. For an existing database, first take and verify a backup and inspect `php artisan migrate:status`; never run a destructive reset. Do not run the demo seeder in production.

After the API is healthy, set the Vercel **Production** environment variable `NURPOS_LARAVEL_API_ORIGIN` to the API origin, without `/api`, credentials, query, or path. The existing Vercel proxy maps the browser's HttpOnly `nurpos_session` cookie to Laravel bearer auth and forwards `Set-Cookie` back to the frontend host. No browser localStorage token or cross-site cookie mode is needed. Keep Vercel's current frontend domain and ensure it remains the sole value in `FRONTEND_ORIGINS`; direct cross-origin credentialed access is not part of this deployment design.

Rebuild/redeploy the existing Vercel project only after the Production variable is saved. Confirm its root project and environment selection before changing anything; do not create a new frontend project.

## Migrations and business data

The VM starts an empty MySQL volume. The local `.env` in this checkout points at `127.0.0.1`, not an OCI database. No hosted production database was found or inspected, so existing live records cannot be migrated or preserved by this bundle. If there is an existing business database, export it from its source, verify a restorable backup, transfer it securely, import it to the new private MySQL instance, compare row counts, then apply only pending migrations after review. Never use `migrate:fresh`, `db:wipe`, or truncation.

Production user provisioning is intentionally separate. `DatabaseSeeder` refuses to seed demo accounts in production. Provision the real tenant/user identities through the guarded `pos:provision-tenant` command and a secure operational process; do not publish the PIN values in GitHub or logs. The three local demo/test identities are not evidence that production database users exist.

## Backups and recovery

Install daily root jobs after the API is running and the passphrase file exists: `sudo bash deploy/oci/install-cron.sh`. The encrypted backup script expects that root-only passphrase file:

```bash
sudo bash deploy/oci/backup-mysql.sh
```

It uses a temporary `0600` MySQL client file, makes a transaction-consistent dump, compresses and encrypts it, verifies decryption/gzip integrity, writes a SHA-256 checksum, and retains 14 days in `deploy/oci/backups/`. Run it daily as root with cron, for example at 02:15 UTC. Keep a copy of verified encrypted backups and the passphrase off the VM using storage already available to the owner; this bundle does not create paid object storage. A same-VM backup alone does not protect against VM/boot-volume loss.

Restore into a **new empty database** only. Copy the encrypted backup and checksum to the VM; set both `RESTORE_TARGET_DATABASE` and `RESTORE_CONFIRM_DATABASE` to the exact new database name in the protected environment, then run `deploy/oci/restore-mysql.sh <backup-file>`. The script verifies checksum/decryption and refuses a non-empty target. Test the application against that restored database before any cutover. No restore was run because there is no OCI VM or business database available.

Renew standard Let's Encrypt certificates daily with `deploy/oci/renew-cert.sh`; certbot skips renewals until due and Nginx reloads after a successful run. The cron installer adds the daily renewal job and rotates its logs. Monitor `docker compose ps`, `/up`, `df -h`, `free -h`, and Nginx/Laravel container logs. No production monitoring or external off-host backup has been configured here.

## Verification status

Backend feature tests pass locally, including the existing PIN/session, multi-device, shift, orders, and tenancy tests. Those are not live production tests. OCI quota/eligibility, capacity, SSH, firewall, HTTPS, database persistence, backups/restoration, user accounts, Vercel project environment, and production API connection remain unverified until the authenticated OCI tenancy and Vercel project are available.
