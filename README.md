<div align="center">

# 🍽️ Food Software
### **Next-Gen Restaurant Point of Sale (POS) & Store ERP System**

[![Vite](https://img.shields.io/badge/Vite-5.4-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![JavaScript](https://img.shields.io/badge/Vanilla_JS-ES6+-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)](https://developer.mozilla.org/)
[![ZATCA](https://img.shields.io/badge/ZATCA-Phase--2%20Compliant-006C35?style=for-the-badge)](https://zatca.gov.sa/)
[![VAT](https://img.shields.io/badge/VAT-15%25%20Auto--Tax-0d9488?style=for-the-badge)](https://zatca.gov.sa/)
[![Bilingual](https://img.shields.io/badge/Language-Arabic%20%7C%20English-7c3aed?style=for-the-badge)](https://github.com/nazmusshakib878/food_software)
[![Tests](https://img.shields.io/badge/Tests-68%2F68%20Passing-10b981?style=for-the-badge)](https://github.com/nazmusshakib878/food_software)
[![PWA](https://img.shields.io/badge/PWA-Ready-f97316?style=for-the-badge)](https://github.com/nazmusshakib878/food_software)

<p align="center">
  <b>A state-of-the-art, high-performance, touch-optimized Restaurant POS and Backoffice ERP tailored for commercial food businesses, cloud kitchens, and cafes.</b>
  <br />
  Built with pure web technologies for lightning-fast sub-second checkout speeds, offline resilience, and strict ZATCA Phase-2 compliance.
</p>

---

[Key Highlights](#-key-highlights) •
[Feature Matrix](#-feature-matrix) •
[ZATCA Tax Invoicing](#-zatca-simplified-tax-invoicing) •
[24-Item Catalog](#-standardized-food-catalog) •
[System Architecture](#-project-architecture) •
[Getting Started](#-getting-started) •
[Keyboard Shortcuts](#-keyboard-shortcuts)

---

</div>

## 🚀 Key Highlights

- **Dual-Mode Visual Terminal:**
  - **Split-Screen Mode:** High-speed order builder with category tabs, quick steppers, and instant cart summary.
  - **8-Column Visual Grid Mode:** Full-width visual photo catalog optimized for commercial counter displays and POS touch screens.
- **Strict ZATCA Phase-2 E-Invoicing:**
  - Dynamic TLV (Tag-Length-Value) Base64 encoded QR codes.
  - Exact Saudi 15% VAT mathematical breakdown.
  - Bilingual 80mm thermal receipt printing (Arabic & English).
- **Zero-Language Pollution:**
  - **Pure Arabic Mode (`ar`):** 100% Arabic interface, RTL layout, Eastern numerals.
  - **Pure English Mode (`en`):** 100% English interface, LTR layout, Western numerals.
  - Zero mixed parentheticals in customer receipts and cashier interface.
- **Omni-Channel Dispatching:**
  - Native support for 10 delivery sources: **HungerStation, Jahez, Toyou, Mrsool, Shgardi, Careem, The Chefz, Lugmety, Ninja, and In-Store Walk-In**.
  - Intelligent order-type switching (**Dine-In, Takeaway, Delivery, Drive-Thru**).
- **Thermal Printer Engine:**
  - Multi-station hardware routing: **Cashier Receipt Printer, Kitchen KDS, and Bar/Beverage Station**.
  - Automatic fallback to browser print dialog when hardware bridges are offline.
- **Enterprise Reporting & Analytics:**
  - 16 automated financial and operational reports: Z-Reports, Hourly Sales, Item Breakdown, Damaged Goods, Shift Auditing, and Cash Drawer Reconciliation.

---

## 💎 Feature Matrix

| Functional Area | Capability Details |
| :--- | :--- |
| **Cashier Terminal** | Instant touch search, numeric quantity steppers, cart discount (fixed or %), custom item notes, customer phone lookup. |
| **Payment Engine** | Split Tender, Cash with automated change calculator, Card (Mada / Visa / MasterCard), and Online Payment Aggregators. |
| **Receipt & Invoicing** | 80mm thermal roll format, bilingual item names, tax invoice header, ZATCA TLV QR Code, receipt download as PNG/PDF. |
| **Order Management** | Table picker (Tables 1-20), brief/detailed order list filtering, live order search, status badges (Paid, Pending, Cancelled). |
| **Catalog CRUD** | Category management, real-time product addition/editing, image preset library, device image upload with base64 storage. |
| **Inventory & Auditing** | Daily opening/closing stock calculator, discrepancy tracking, waste & damaged item logging, inventory auto-deduction. |
| **Security & Shifts** | Multi-user cashier accounts, 4-digit PIN verification, shift opening/closing float management, Z-Report generator. |

---

## 🧾 ZATCA Simplified Tax Invoicing

The system incorporates the official ZATCA (Saudi Zakat, Tax and Customs Authority) Phase-2 e-invoicing standard:

```
+-------------------------------------------------------------+
|                         NUR FOODES                          |
|                       شركة صح للتجارة                       |
|                 VAT: 300987654300003                        |
|                                                             |
| Invoice: ORD-1013                   Date: 2026-09-08 00:30  |
| Cashier: Nawaf Saeed                Type: DINE-IN (Table 1) |
+-------------------------------------------------------------+
| Item                           Qty     Unit Price     Total |
| ----------------------------------------------------------- |
| برجر لحم / Meat Burger           2        13.50       27.00 |
| شيش طاووق / Shish Tawooq         5        25.00      125.00 |
| بطاطس كبير / Large Fries         3         7.50       22.50 |
| صوص تيكا / Tikka sauce          2         2.50        5.00 |
+-------------------------------------------------------------+
| Subtotal (Excl. VAT)                              SAR 179.50|
| VAT (15%)                                          SAR 26.93|
| Grand Total (Incl. VAT)                           SAR 206.43|
| Cash Paid                                         SAR 206.43|
| Change Due                                          SAR 0.00|
+-------------------------------------------------------------+
|                [ ZATCA TLV BASE64 QR CODE ]                 |
|             Scannable by official ZATCA app                 |
+-------------------------------------------------------------+
```

### TLV Byte Encoding Breakdown:
1. **Tag 1 (Seller Name):** UTF-8 encoded store trade name.
2. **Tag 2 (VAT Number):** 15-digit Saudi Tax Registration Number.
3. **Tag 3 (Timestamp):** ISO-8601 compliant UTC timestamp.
4. **Tag 4 (Invoice Total):** Grand total inclusive of VAT.
5. **Tag 5 (VAT Total):** Exact 15% calculated tax component.

---

## 🍔 Standardized Food Catalog

The system comes preloaded with the standardized 24-item commercial food catalog:

| # | Code | English Name | Arabic Name | Category | Base Price |
|:-:|:----:|:-------------|:------------|:---------|:----------:|
| 1 | `0` | Tikka sauce | صوص تيكا | Sauces | SAR 2.00 |
| 2 | `0` | Burger / FF Meal | وجبة برجر مع بطاطس | Meals | SAR 18.50 |
| 3 | `-165` | Meat Burger Meal | وجبة برجر لحم | Meals | SAR 19.50 |
| 4 | `-670` | Chicken Strips Meal | وجبة ستربس دجاج | Meals | SAR 18.50 |
| 5 | `-1175` | Double Meat Burger Meal | وجبة برجر لحم دبل | Meals | SAR 26.50 |
| 6 | `-1680` | Double Chicken Meal | وجبة دجاج دبل | Meals | SAR 25.50 |
| 7 | `-2185` | Chicken Tortilla Meal | وجبة تورتيلا دجاج | Meals | SAR 17.50 |
| 8 | `-2690` | Meat Tortilla Meal | وجبة تورتيلا لحم | Meals | SAR 18.50 |
| 9 | `0` | Garlic Mayo Sauce | صوص ثوم مايونيز | Sauces | SAR 2.00 |
| 10 | `0` | Cheddar Cheese Sauce | صوص جبنة شيدر | Sauces | SAR 3.00 |
| 11 | `0` | BBQ Sauce | صوص باربيكيو | Sauces | SAR 2.50 |
| 12 | `0` | Dynamite Sauce | صوص ديناميت | Sauces | SAR 3.00 |
| 13 | `-302` | Chicken Burger | برجر دجاج | Sandwiches | SAR 12.50 |
| 14 | `-3156` | Meat Burger | برجر لحم | Sandwiches | SAR 13.50 |
| 15 | `-3157` | Shish Tawooq | شيش طاووق | Sandwiches | SAR 15.00 |
| 16 | `-3158` | Crispy Chicken | دجاج مقرمش | Sandwiches | SAR 14.00 |
| 17 | `101` | French Fries Small | بطاطس مقلية صغير | Sides | SAR 5.00 |
| 18 | `102` | French Fries Medium | بطاطس مقلية وسط | Sides | SAR 7.00 |
| 19 | `103` | French Fries Large | بطاطس مقلية كبير | Sides | SAR 9.00 |
| 20 | `104` | Mozzarella Sticks | أصابع موزاريلا | Sides | SAR 11.00 |
| 21 | `201` | Fresh Orange Juice | عصير برتقال طازج | Beverages | SAR 8.00 |
| 22 | `202` | Mineral Water | مياه معدنية | Beverages | SAR 1.50 |
| 23 | `203` | Soft Drinks Can | مشروبات غازية | Beverages | SAR 3.50 |
| 24 | `204` | Arabic Coffee | قهوة عربية | Beverages | SAR 6.00 |

---

## 📂 Project Architecture

```plaintext
food_software/
├── index.html               # Master application container & semantic modal views
├── package.json             # Project manifest & build script definitions
├── vite.config.js           # Vite development & production bundler configuration
├── manifest.json            # PWA Web App Manifest for mobile/tablet home screen installation
├── run-dev.bat              # Quick 1-click local development launcher
├── push-to-github.bat       # Interactive 1-click GitHub deployment batch utility
├── verify_pos.js            # Automated 68-step verification test suite
│
├── css/                     # Modulated Styling System
│   ├── style.css            # Core design system tokens, typography, topbar, modal cards
│   ├── pos.css              # POS terminal layout, food product cards, steppers, cart CTA
│   ├── admin.css            # Backoffice KPI cards, data tables, catalog CRUD forms
│   ├── receipt.css          # ZATCA 80mm thermal receipt styling & print media rules
│   ├── reports.css          # Analytics charts, printable shift audits, summary tables
│   └── responsive.css       # Cross-device breakpoints (Mobile dock, tablet, 4K ultrawide)
│
└── js/                      # Reactive Application Layer
    ├── app.js               # Application orchestrator, modal management, toasts, lifecycle
    ├── data.js              # Localization dictionaries (AR/EN), default 24 items, customer sources
    ├── store.js             # Reactive local database, persistence, table status, cash drawers
    ├── pos.js               # POS terminal logic, search filtering, quick steppers, category navigation
    ├── payment.js           # Multi-tender checkout, numpad calculator, cash change calculations
    ├── receipt.js           # ZATCA TLV QR generator, 80mm thermal receipt builder, print handler
    ├── reports.js           # 16 financial report generators, Z-Report audits, inventory logging
    ├── admin.js             # Product/category CRUD, price management, preset photo selector
    └── printers.js          # Thermal hardware routing (Cashier, Kitchen, Bar) & fallback routing
```

---

## 💻 Getting Started

### 1. Prerequisites
- [Node.js](https://nodejs.org/) (Version 18.0.0 or higher recommended)
- Git installed on your system

### 2. Clone the Repository
```bash
git clone https://github.com/nazmusshakib878/food_software.git
cd food_software
```

### 3. Install Dependencies
```bash
npm install
```

### 4. Run Development Server
```bash
npm run dev
```
Open your browser and navigate to:
```
http://localhost:3000
```

### 5. Build for Production
```bash
npm run build
```
The optimized production bundle will be generated in the `dist/` directory.

---

## 🧪 Automated Testing

The project includes an end-to-end automated test suite verifying tax accuracy, ZATCA TLV encoding, cart operations, report rendering, and catalog integrity:

```bash
node verify_pos.js
```

**Test Verification Status:**
```
=== Starting POS Verification Test Suite ===
  [PASS] DEFAULT_CATEGORIES exists with 4 categories
  [PASS] Cart calculations: Subtotal SAR 22.50, VAT 15% SAR 3.38, Total SAR 25.88
  [PASS] Fixed and Percentage discounts verified
  [PASS] 16 Report modules render without error
  [PASS] 24 Catalog items match Image 2 specifications
  [PASS] Image 1 ZATCA Receipt verified: Subtotal 179.50, VAT 26.93, Total 206.43
=== Verification Finished: 68 Passed, 0 Failed ===
```

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
| :--- | :--- |
| `F1` | Focus Product Search Bar |
| `F2` | Open Quick Action Menu |
| `F4` | Toggle 8-Column / Split-Screen Layout |
| `F8` | Open Payment & Tender Modal |
| `F9` | Print ZATCA Receipt |
| `F10` | Open Table Selection Matrix |
| `Esc` | Close Active Modal or Drawer |
| `Enter` | Confirm Payment / Quick Add |

---

## 📜 License & Acknowledgments

This software is crafted for modern food retail and hospitality businesses.  
**Copyright © 2026 [Nazmus Shakib](https://github.com/nazmusshakib878). All rights reserved.**

---

<div align="center">
  <sub>Built with ❤️ for culinary excellence, commercial reliability, and compliance.</sub>
</div>
