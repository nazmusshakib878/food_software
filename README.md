# Nur Food POS

Browser based restaurant POS with a static HTML/CSS/JavaScript frontend and a Laravel API.

## Project layout

- `frontend/` - POS pages, styles, scripts, npm/Vite configuration, dependencies and frontend QA/maintenance tools.
- `vercel.json` - Vercel deployment configuration; it stays at the repository root.
- `backend/` - Laravel API, database migrations, seeders and backend tests.
- `api/` - Vercel serverless API proxy entry points. Vercel expects this folder at the repository root.
- `docs/` - production notes, audit reports and deployment environment templates.
- `run-dev.bat` - starts the frontend dev server from `frontend/`.

## Local development

Requirements: Node.js 20+, PHP 8.2+, Composer 2+, and MySQL/MariaDB or SQLite.

1. In `frontend/`, run `npm ci` and copy `.env.example` to `.env.local`. Set `NURPOS_LARAVEL_API_ORIGIN=http://127.0.0.1:8000`.
2. In `backend/`, copy `.env.example` to `.env`, configure a disposable local database, then run `composer install`, `php artisan key:generate`, and `php artisan migrate`.
3. Start Laravel with `php artisan serve` from `backend/`.
4. Start Vite with `npm run dev` from `frontend/`, or launch `run-dev.bat`.

The demo seeder is for non-production development and tests only. Do not run reset/fresh migrations against a database containing business data.

## Checks

- Frontend regression suite: from `frontend/`, run `node tools/qa/verify_pos.js`.
- API proxy checks: from `frontend/`, run `node tools/qa/verify_api_proxy.js`.
- Frontend production build: from `frontend/`, run `npm run build`.
- Backend feature tests: from `backend/`, run `php artisan test`.
- Dependency audits: run `npm audit` in `frontend/` and `composer audit` in `backend/` (network access is required).

See [production readiness notes](docs/PRODUCTION_READINESS.md) and the reports in [docs/reports](docs/reports) for architecture, verification evidence and limitations.
