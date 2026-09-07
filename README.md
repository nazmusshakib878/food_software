# Food Software - Luxury Restaurant Point of Sale (POS) System

A modern, touch-optimized, bilingual (Arabic & English) Restaurant Point of Sale (POS) and Store Management Software with real-time tax calculation, ZATCA Phase-2 compatible QR receipt generation, multi-channel order dispatching, and comprehensive analytics.

---

## 🌟 Key Features

### 1. Modern Touch Terminal & Fast Checkout
- **8-Column Visual Grid / Dual Mode Catalog:** Toggle between interactive order-builder layout and 8-column visual grid catalog matching food service standards.
- **Dynamic Order Types:** Dine-In (with table assignment), Takeaway, Delivery, Drive-Thru, and Delivery Aggregators (HungerStation, Jahez, Toyou, Mrsool, etc.).
- **Smart Stepper & Fast Numpad:** Rapid quantity modification, quick cash numpad calculation, and discount management (percentage or fixed amount).

### 2. ZATCA Compliant 80mm Simplified Tax Receipts
- **ZATCA TLV Base64 QR Code:** Compliant with Saudi Zakat, Tax and Customs Authority requirements.
- **Bilingual Receipts (Arabic & English):** Dual-language itemized tax invoices with exact VAT breakdown (15%), cashier identity, order type, and payment method details.
- **Thermal Printer Routing:** Direct print routing support for Cashier, Kitchen KDS, and Bar/Beverage stations.

### 3. Strict Language Separation (Arabic & English)
- Pure Arabic mode (`ar`) and Pure English mode (`en`) with zero mixed parentheticals in customer-facing and management UI.
- RTL / LTR layout switching with localized typography and numbers.

### 4. Backoffice & Store Administration
- **KPI Metrics Dashboard:** Real-time revenue, order count, average check size, and open table occupancy.
- **Product & Category CRUD:** Manage products, codes, prices, categories, and preset photos.
- **Inventory & Stock Management:** Stock calculator, damaged items logging, and inventory auditing.
- **End-of-Day Z-Reports & Shifts:** Comprehensive cashier reconciliation, cash balancing, and daily shift summaries.

---

## 🛠️ Technology Stack

- **Frontend:** Vanilla HTML5, Modern CSS3 (CSS Variables, Flexbox, CSS Grid, Glassmorphism, Micro-animations), Vanilla JavaScript (ES6+).
- **Tooling & Dev Server:** Vite 5.
- **PWA Capabilities:** Service Worker registration, Manifest V3 ready, touch and offline support.

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or higher recommended)
- npm

### Installation
```bash
# Clone the repository
git clone https://github.com/nazmusshakib878/food_software.git

# Navigate into the project directory
cd food_software

# Install dependencies
npm install

# Start local development server
npm run dev
```

The application will be accessible at: `http://localhost:3000`

### Build for Production
```bash
npm run build
```

---

## 🧪 Automated Testing
Run the comprehensive 68-step verification test suite:
```bash
node verify_pos.js
```

---

## 📄 License
All rights reserved © 2026.
