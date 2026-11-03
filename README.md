# Nur Food POS

Nur Food POS is a browser based point of sale application for restaurant teams. The repository contains a Vite frontend, a Laravel API, and Vercel serverless routes that proxy API requests to Laravel.

## Project structure

| Path | Purpose |
| --- | --- |
| `frontend/` | POS pages, styles, JavaScript, Vite configuration, and frontend QA tools |
| `backend/` | Laravel API, migrations, seeders, and feature tests |
| `api/` | Vercel serverless API proxy entry points |
| `docs/` | Production readiness notes, deployment examples, and audit reports |
| `vercel.json` | Root-level Vercel build and routing configuration |

## Run locally

Prerequisites: Node.js 20 or later, PHP 8.2 or later, Composer 2, and MySQL/MariaDB or SQLite.

1. In `frontend/`, install dependencies and create the local environment file:

   ```bash
   npm ci
   cp .env.example .env.local
   ```

   Set `NURPOS_LARAVEL_API_ORIGIN=http://127.0.0.1:8000` in `frontend/.env.local`.

2. In `backend/`, copy `.env.example` to `.env`, configure a local database, then install and initialize Laravel:

   ```bash
   composer install
   php artisan key:generate
   php artisan migrate
   ```

3. Start the API from `backend/`:

   ```bash
   php artisan serve
   ```

4. Start the frontend from `frontend/` in another terminal:

   ```bash
   npm run dev
   ```

   Open the local address printed by Vite (normally `http://localhost:3000`). On Windows, `run-dev.bat` starts the frontend server.

The seeder contains demo data for local development and tests. Do not run destructive reset or fresh migrations against a database containing business data.

## Checks

Run frontend commands from `frontend/`:

```bash
npm run build
node tools/qa/verify_pos.js
node tools/qa/verify_api_proxy.js
```

Run backend feature tests from `backend/`:

```bash
php artisan test
```

## Deployment

The frontend remains on the existing Vercel project. The Laravel API is prepared as a Render Docker web service by [`render.yaml`](render.yaml), using the Render-specific Apache image in `backend/Dockerfile.render`; the OCI Docker image remains separate. TiDB Cloud Starter is the current MySQL-compatible free-tier candidate: its official quota is 5 GiB row storage and 50 million request units/month, and its $0 spending limit throttles usage beyond quota. Its free MySQL-compatible plan keeps daily backups for one day and supports data export. TLS is required on its public endpoint. The application uses Laravel's MySQL driver and enforces verified TLS; migrations do not run automatically. No TiDB instance has been provisioned or integration-tested; before connecting, create it with $0 spending limit, verify it is empty, test migrations and POS transactions on it, and export a recoverable backup before any migration that touches existing data. ([TiDB free plan](https://docs.pingcap.com/tidbcloud/select-cluster-tier/), [backups and restore](https://docs.pingcap.com/tidbcloud/backup-and-restore-serverless/), [MySQL compatibility](https://docs.pingcap.com/tidb/stable/mysql-compatibility/))

Render's free web service sleeps after inactivity, has an ephemeral filesystem, and Render says free instances should not be used for production. The health check requires a live MySQL-driver connection and rejects SQLite/PostgreSQL. Product image uploads are stored as bounded data URIs in the database (up to 2 MB; raster formats only), not on Render's temporary disk. The required additive image-column migration must be reviewed and backed up before use on any existing database. TiDB's plan and database connection must be authorized and integration-tested before deployment. Set `DB_CONNECTION=mysql` and the five `DB_HOST`, `DB_PORT`, `DB_DATABASE`, `DB_USERNAME`, and secret `DB_PASSWORD` values from the database console; do not put credentials in Git. Render also requires `APP_KEY` (generated once by Render), `APP_ENV=production`, `APP_DEBUG=false`, `APP_URL` (derived at startup from Render's hostname), and `SANCTUM_STATEFUL_DOMAINS`; set `FRONTEND_ORIGINS` to the exact Vercel origin. After the API service has a stable HTTPS URL, set the existing Vercel project's server-side `NURPOS_LARAVEL_API_ORIGIN` to that origin and redeploy the same project. ([Render free plan limitations](https://render.com/docs/free))

See [production readiness notes](docs/PRODUCTION_READINESS.md), [staging environment example](backend/.env.staging.example), and the reports in [`docs/reports/`](docs/reports/) for deployment details and verification evidence.

## Push the current branch

On Windows, `push-to-github.bat` pushes the currently checked out branch to `origin`. It does not switch branches or push `main` implicitly.
