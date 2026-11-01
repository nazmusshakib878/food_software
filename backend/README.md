# Nur Foodes POS — Laravel 11 Backend API

This directory contains the production-ready **Laravel 11 REST API** for Nur Foodes POS.

## 🚀 Quick Start

### 1. Requirements
- PHP 8.2+
- Composer 2.x
- SQLite (default) or MySQL (XAMPP / MariaDB)

### 2. Setup & Database Migration
```bash
cd backend
php artisan migrate:fresh --seed
```
This automatically provisions:
- **Cashier (PIN: 1050)** — Role: `cashier`, `can_open_sidebar: true`, Reports & Shift management permissions.
- **Staff 1 (PIN: 1051)** — Role: `staff`, `can_open_sidebar: false`, standard POS operations only.
- **Staff 2 (PIN: 1052)** — Role: `staff`, `can_open_sidebar: false`, standard POS operations only.
- **10 Canonical Customers/Partners** (`cash`, `hungerstation`, `jahiz`, `ninja`, `keeta`, `mrsool`, `toyou`, `thechefz`, `management`, `mosque`).
- **Initial Active Shift** (`SH-101`).

### 3. Start Development Server
```bash
php artisan serve
```
The API will be live at `http://127.0.0.1:8000`.

### 4. Run Automated Feature Tests
```bash
php artisan test
```

---

## 📡 API Endpoints

### 🔐 Authentication
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/auth/login` | Login using 4-digit PIN (`1050`, `1051`, `1052`). Rate-limited (5 attempts, 15m lockout). |
| `POST` | `/api/auth/pin` | Alias for login endpoint. |
| `GET` | `/api/auth/session` | Get currently authenticated user and permissions (`auth:sanctum`). |
| `POST` | `/api/auth/logout` | Revoke active session token (`auth:sanctum`). |

### 📦 Orders & Customers
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/orders` | Retrieve recent order history (`auth:sanctum`). |
| `POST` | `/api/orders` | Submit and validate new order (`auth:sanctum`). **Enforces RBAC:** Staff is restricted to Cash Customer (`cash`); Cashier can submit Delivery Partner orders. |
| `GET` | `/api/customers` | List canonical customer types and delivery partners. |

### 📊 Reports (RBAC Protected)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/reports` | Management reports telemetry (`auth:sanctum`). **Cashier/Admin only.** Returns `403 Forbidden` for Staff. |

### ⏱ Shifts
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/shifts/active` | Get current active shift (`auth:sanctum`). |
| `POST` | `/api/shifts` | Open a new shift with opening cash balance (`auth:sanctum`). |
| `POST` | `/api/shifts/{id}/close` | Close an active shift (`auth:sanctum`). |

---

## ⚙️ MySQL / XAMPP Configuration (Optional)
If you wish to use MySQL via XAMPP instead of the default SQLite:
1. Open XAMPP Control Panel and start **MySQL**.
2. Create database `nurfoodes_pos` in phpMyAdmin.
3. In `backend/.env`, set:
```env
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=nurfoodes_pos
DB_USERNAME=root
DB_PASSWORD=
```
4. Run:
```bash
php artisan migrate:fresh --seed
```
