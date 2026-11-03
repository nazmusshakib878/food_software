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

The frontend remains on the existing Vercel project. The Laravel API is prepared as a Render Docker web service by [`render.yaml`](render.yaml), using the Render-specific Apache image in `backend/Dockerfile.render`; the OCI Docker image remains separate. The Blueprint intentionally requires `DB_CONNECTION` and `DB_URL` to be supplied after a database provider is selected and tested. It does not assume PostgreSQL compatibility, and it does not run migrations automatically. Review the target database, verify its contents, and confirm a recoverable backup before applying migrations.

The Render free web service sleeps after inactivity and has an ephemeral filesystem. Keep all business data, sessions, cache, and queued jobs in the external database. Render's free PostgreSQL expires after 30 days, so it is not a permanent production choice. The health check rejects production SQLite. A database provider must be selected, separately authorized, and tested before its connection is configured. The Render environment also requires `APP_KEY` (generated once by Render), `APP_ENV=production`, `APP_DEBUG=false`, `APP_URL` (derived at startup from Render's hostname), and `SANCTUM_STATEFUL_DOMAINS`; set `FRONTEND_ORIGINS` to the exact Vercel origin. After the API service has a stable HTTPS URL, set the existing Vercel project's server-side `NURPOS_LARAVEL_API_ORIGIN` to that origin and redeploy the same project.

See [production readiness notes](docs/PRODUCTION_READINESS.md), [staging environment example](backend/.env.staging.example), and the reports in [`docs/reports/`](docs/reports/) for deployment details and verification evidence.

## Push the current branch

On Windows, `push-to-github.bat` pushes the currently checked out branch to `origin`. It does not switch branches or push `main` implicitly.
