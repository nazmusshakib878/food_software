# Nur Food POS: Production Readiness Notes

**Status:** Prototype / demonstration MVP with a Laravel persistence foundation. Not production ready.

## Architecture

The user interface is a static HTML/CSS/JavaScript application built with Vite. The UI calls same-origin `/api/*` routes. Vercel serverless handlers in `../api/` proxy an allowlisted set of requests to Laravel configured through `NURPOS_LARAVEL_API_ORIGIN`; the proxy fails closed if the origin is missing. For local development, Vite proxies `/api` to the configured Laravel origin (default `http://127.0.0.1:8000`). The Laravel app is in `../backend/` and owns authentication, tenant-scoped catalog, orders, inventory movements, shifts and reports.

The static application alone is not a complete deployment. A separate Laravel host and persistent SQL database must be provisioned and connected. The Vercel connector returned no accessible projects matching `food-software`, and this checkout has no `.vercel/project.json`. The remote backend was not configured or deployment-tested in this work.

## Setup

1. Install Node.js dependencies with `npm ci` in `../frontend/`.
2. Copy `../frontend/.env.example` to `../frontend/.env.local` and set `NURPOS_LARAVEL_API_ORIGIN` to the HTTPS origin of the Laravel API host. Do not commit secrets.
3. Install PHP dependencies in `../backend/` with `composer install`.
4. Copy `../backend/.env.example` to `../backend/.env`; set a unique `APP_KEY`, production `APP_DEBUG=false`, database connection, trusted `FRONTEND_ORIGINS`, and supported cache/rate-limit stores.
5. Provision and back up the database before running `php artisan migrate --force`. Never use `migrate:fresh` on a business database.
6. Create production users, companies, branches and catalog through an approved provisioning process. Demo seed data is restricted to local/testing environments.
7. Run the front-end build and backend feature tests. Configure Vercel serverless functions and verify API connectivity against an isolated staging database before any production cutover.

Staging templates are `deployment/.env.staging.example` (Vercel Preview API origin) and `../backend/.env.staging.example` (Laravel/database settings). Replace every placeholder in hosting secret managers; do not commit filled files. Apply migrations only to a new isolated staging database after verifying its host and database name.

## Data and API

Laravel uses Eloquent with SQL migrations under `../backend/database/migrations`; Sanctum personal access tokens are persisted in the database and presented to the browser through an HttpOnly `nurpos_session` cookie. The Vercel proxy translates that cookie to a bearer token for Laravel. Authentication is currently four-digit PIN based and rate-limited by source IP. Production-grade account recovery, PIN rotation, device/session administration and identity lifecycle management are not implemented.

Routes include `/api/auth/{login,pin,session,logout}`, `/api/branches`, `/api/catalog/{categories,products}`, `/api/inventory`, `/api/inventory/{movements,adjustments}`, `/api/orders`, `/api/orders/{id}/{status,cancel}`, `/api/shifts`, `/api/shifts/active`, `/api/shifts/{id}/close`, `/api/reports`, and `/api/customers`. Manual payment transaction rows are created atomically with orders; there is not yet a public payment transaction query API. The proxy has a route allowlist in `../api/_proxy.js`; Laravel route and validation behavior is defined in `../backend/routes/api.php` and API controllers.

Orders are calculated from branch catalog prices and VAT rates on the server, stored in database transactions, and retried idempotently using a tenant-scoped client order ID. Manual payment parts are also written to `pos_payment_transactions`. The payment status `recorded_manual` does not mean a payment provider authorized or settled funds. Unconfigured modifiers are rejected. Tracked stock is deducted on sale, movement history is written, and valid cancellation restores it once.

## Access controls and tenancy

Companies and branches now have directory tables. The new migration backfills existing tenant identifiers and adds composite `(company_id, branch_id)` foreign keys for users, shifts, orders, catalog and inventory movements. Branch administration is company scoped at `/api/branches`; `php artisan pos:provision-tenant` creates a company, initial branch and administrator through a guarded interactive command. API queries continue deriving tenant scope from the authenticated user. Tests exercise cross-tenant order, shift, product, inventory and report visibility. Product-category and order-line relationships are not all enforced with tenant-composite foreign keys, and no deployed multi-tenant penetration test has been performed.

Roles/permissions exist as user fields and controller checks. Production role design, least-privilege review, user administration UI and real-world deployment policy require further work.

## Data operations, backup and recovery

Database migrations define schema changes. No scheduled backup job, off-site backup policy, restore drill, recovery-point objective or recovery-time objective is configured or verified. A restore runbook is provided in `../backend/README.md`; no restore was executed because no staging database was available. Before commercial use, choose a managed database or documented backup system, encrypt backups, restrict access, and rehearse restoration against an isolated environment. Never point restore procedures at production without explicit operational controls.

## Integrations and limitations

- No payment gateway or terminal integration; cash/card/bank method choices record manual tender declarations.
- Browser print output is available; receipt/kitchen printer discovery, health checks and hardware bridges are not integrated.
- Product images accept HTTPS URLs; persistent upload storage is not configured.
- Customer support is limited to order customer labels and fixed channel metadata; there is no customer CRM.
- Main sales/order/product summaries use persisted API data. Other report panels, shift cash reconciliation, damage, service-duration, application commission, internal order and some inventory audit flows remain incomplete or local/demo-derived.
- No actual Vercel/Laravel staging deployment was performed. No production secrets, remote database, hardware or third-party gateway credentials were available.
- Saudi e-invoicing/ZATCA behavior and certification have not been independently validated.

## Verification performed

- `node tools/qa/verify_pos.js` in `../frontend/`: 576 passed, 0 failed.
- `node tools/qa/verify_api_proxy.js` in `../frontend/`: passed fail-closed configuration, route allowlist, cookie-to-bearer translation, cookie non-forwarding and no-store checks.
- `php artisan test --testdox` in `../backend/`: 19 tests, 101 assertions passed.
- After tenant directory, constraints, branch administration and payment transaction changes, backend tests pass: 21 tests and 113 assertions. Coverage includes company-scoped branch creation, cross-tenant API reads and persisted manual split tender parts.
- `npm run build` in `../frontend/`: successful with Vite 5.4.21. Vite reports classic script tags it cannot bundle and a deprecated CommonJS Node API warning; output builds to `../frontend/dist/`.
- npm and Composer vulnerability audits could not reach their package registries in this environment. Dependency vulnerability status is unknown, not clean.
- No deployed API, staging environment, real database, browser hardware, or restoration operation was tested.

## Dependencies and ownership

Direct npm packages are Vite (MIT), jsdom (MIT), and Puppeteer (Apache-2.0). The Laravel dependency set is managed through Composer; installed licenses include MIT and BSD-family licenses. Run package-manager license and vulnerability inventories in a network-enabled release environment and review notices. Source repository access does not establish copyright ownership or exclusive transfer rights; obtain contributor, employer and third-party asset documentation and legal review before acquisition.

## Deployment cost assumptions

Illustrative low-traffic starting estimate (not a quote or observed bill): Vercel Pro at approximately $20/month, a 2 GiB app VM at approximately $12/month, and a managed 1 GiB database at approximately $15.15/month, or about $47.15/month before tax, domain, backups, monitoring, overages and support. Staging may require additional services. See [Vercel pricing](https://vercel.com/pricing), [DigitalOcean Droplets](https://www.digitalocean.com/pricing/droplets), and [DigitalOcean managed databases](https://www.digitalocean.com/pricing/managed-databases). Actual provider prices and account terms can change.

## Production gate

Do not classify this build as commercially deployable until production identity/tenant provisioning, security hardening, live staging integration, persistent database operations, backups and restore drills, vulnerability review, operational monitoring, supported payment and printer requirements, and full acceptance testing are completed and documented.
