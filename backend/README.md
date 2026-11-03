# Laravel API

This is the Laravel 12 API used by Nur Food POS. It stores companies, branches, users, Sanctum access tokens, shifts, orders, catalog, inventory movements and manual payment transaction records in the configured database.

## Setup for development

Requirements: PHP 8.2+, Composer 2+, and MySQL/MariaDB or SQLite.

1. Copy `.env.example` to `.env` and configure a **disposable local development database**.
2. Run `composer install` and `php artisan key:generate`.
3. Apply additive schema migrations with `php artisan migrate`.
4. For non-production development only, run `php artisan db:seed`. The demo seeder throws when `APP_ENV=production`.
5. Start the API with `php artisan serve`.
6. Run tests with `php artisan test`.

Never use `migrate:fresh` or a database reset against an existing business database. The demo seeder is not a production provisioning mechanism. For controlled provisioning, `php artisan pos:provision-tenant` creates a company, initial branch and administrator PIN account through an interactive command. Review the target DB before proceeding, securely deliver the PIN, and require credential rotation through an approved process. This does not replace backup, identity lifecycle or security controls.

For staging, start from `.env.staging.example` in this folder, put actual values in the host secret manager, and use an isolated database. In Vercel Preview settings, set `NURPOS_LARAVEL_API_ORIGIN` from `../docs/deployment/.env.staging.example`. Never commit completed environment files. Run `php artisan migrate --force` only after verifying the host/database name and confirming a recoverable backup. Test the tenant migration against a copy of existing data before production application.

## API overview

All business endpoints require Sanctum authentication. The Vercel/Vite frontend proxy sends the HttpOnly `nurpos_session` cookie to Laravel as a bearer token, so browser JavaScript does not receive the token.

- `POST /api/auth/login`, `GET /api/auth/session`, `POST /api/auth/logout`
- `GET/POST /api/orders`, `PATCH /api/orders/{id}/status`, `POST /api/orders/{id}/cancel`
- `GET /api/catalog/categories`, `POST /api/catalog/categories`, `DELETE /api/catalog/categories/{categoryId}`
- `GET /api/catalog/products`, `POST /api/catalog/products`, `PATCH /api/catalog/products/{productId}`
- `GET /api/branches`, `POST /api/branches` (company-scoped; create requires admin or `branches_manage`)
- `GET /api/inventory`, `GET /api/inventory/movements`, `POST /api/inventory/adjustments`
- `GET /api/reports?period=day|week|month&date=YYYY-MM-DD` or a custom `from`/`to` date range
- `GET /api/shifts`, `GET /api/shifts/active`, `POST /api/shifts`, `POST /api/shifts/{id}/close`

The seeded canonical customer records represent order channels, not a customer management system. See `../docs/PRODUCTION_READINESS.md` for unresolved limitations and deployment requirements.

## Backup and restore runbook

No backup schedule or provider integration is configured in this repository. For MySQL/MariaDB, configure a restricted DB account and encrypted off-host storage through the hosting platform. A DBA can take a consistent logical backup using `mysqldump --single-transaction --routines --triggers --hex-blob --defaults-extra-file=<protected-client-config> <database>`. Do not put a password on the command line or in source control. Record timestamp, schema migration version, checksum and retention expiry; encrypt before transfer.

For a restore drill, provision a new isolated database with a matching engine/version, restore the backup there using the protected client configuration, then verify `php artisan migrate:status`, tenant/branch counts, representative order lines/payment rows, and API reads. Keep the restore network-isolated from live systems. No restore test was run in this assessment because no staging database was provided.

## First owner setup

The existing POS owner bootstrap is a one-time HTTPS form at `/owner-setup.html`. It is disabled unless `OWNER_SETUP_TOKEN` is configured with a cryptographically random secret of at least 43 characters and the `users` table is empty. Generate a fresh 32-byte secret in a password manager or cryptographic secret generator and set it only in Render's service environment; never commit it or put it in a URL. The owner submits their own name, email, staff ID, existing company/branch and a new 4-digit PIN. PINs previously disclosed in project messages are rejected. The backend uses the same PBKDF2-SHA256 format as POS login, locks the selected existing company row during the empty-table check, and creates no company or branch. After the first user is created the setup endpoints return unavailable even if the token remains configured; remove `OWNER_SETUP_TOKEN` from Render after confirming owner login.

Do not set the token or use the setup form until the TiDB password has been rotated and the Render database secret updated. The local database dump/restore verification must also be completed first. This code does not create an owner automatically.

Prefer a forward corrective migration for an applied production schema. `php artisan migrate:rollback --step=1` can remove data; use it only after reviewing the latest migration's `down()` method, confirming backup/recovery, and rehearsing against an isolated copy. Never use `migrate:fresh` against business data.
