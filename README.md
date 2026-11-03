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

Vercel builds the frontend using the root `vercel.json` configuration. Configure `NURPOS_LARAVEL_API_ORIGIN` as a server-side Vercel environment variable pointing to the deployed Laravel API. Production origins must use HTTPS. Configure the Laravel environment, database, and allowed frontend origins separately in the backend host.

See [production readiness notes](docs/PRODUCTION_READINESS.md), [staging environment example](backend/.env.staging.example), and the reports in [`docs/reports/`](docs/reports/) for deployment details and verification evidence.

## Push the current branch

On Windows, `push-to-github.bat` pushes the currently checked out branch to `origin`. It does not switch branches or push `main` implicitly.
