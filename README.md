# Klanvision Billing & Invoice Management SaaS

A production-grade, multi-tenant billing, GST invoicing, client accounting, payments and analytics SaaS platform built for Indian business compliance. Designed with dark navy aesthetics, rich data visualizations, and robust financial arithmetic matching reference designs.

---

## 🌟 Key Features

1. **Brand & Visual Aesthetics (Matching Reference Screenshots)**:
   - **Login Page (Screenshot 1)**: Dark navy hero panel with glowing geometric logo, "Smart Billing. Simple Access.", feature pills ("Secure sign-in", "Password recovery", "Create your account"), and clean white login card.
   - **Dashboard (Screenshot 4)**: "Good Morning, Admin 👋" greeting, 3 top KPI cards (Total Customers, Active Invoices, Pending Payments), Sales Overview curve chart, Invoice Status Donut, Quick Actions, Top Customers leaderboard, and Recent Invoices.
   - **Customer Management (Screenshot 5)**: KPI cards (Total Customers, Active Customers, Total Outstanding), Customer List table with initials badges (`AT`, `SL`, `GT`, `RE`), state filters, status filters, and CSV export.
   - **Reports & Analytics (Screenshot 2)**: Total Sales (₹ 1,85,000.00), Total Tax (₹ 18,500.00), Total Invoices (12), Monthly Sales bar chart, Invoice Status donut, and Additional Details panel (Total GST, Discount, Amount, Avg Invoice Value).
   - **Settings (Screenshot 3)**: Tabbed configuration for Company Profile (Klanvision Technologies Pvt. Ltd., Dwarka New Delhi), GSTIN with "Verified" badge, Invoice Numbering (`INV-2025-`), Payment Methods (UPI, Net Banking, Cards), and Notifications.

2. **Indian GST Compliance & Arithmetic**:
   - Automated detection of **Intra-State Supply** (Delhi to Delhi -> CGST 9% + SGST 9%) vs **Inter-State Supply** (Delhi to other states -> IGST 18%).
   - Itemized HSN/SAC codes, quantity, unit price, discounts, taxable value.
   - Decimal-safe arithmetic (scaled precision) preventing floating point rounding anomalies.
   - Safe round-off adjustment.

3. **Multi-Tenant Security & Role-Based Access**:
   - Normalized relational database models with strict tenant isolation on all queries.
   - Roles: **Owner**, **Admin**, **Accountant**, **Viewer**.
   - Encrypted passwords using `bcryptjs` and session tokens using `jsonwebtoken`.

4. **Invoice Engine & PDF Generator**:
   - Atomic, sequential invoice numbering (e.g., `INV-2025-0012`).
   - High-fidelity Tax Invoice preview matching Indian GST invoice standards with company letterhead, tax schedule, bank details (HDFC Bank, IFSC, A/C #), and UPI QR instructions.
   - Print-ready CSS and PDF export functionality via `jspdf` and `html2canvas`.

5. **Payments & Allocation Engine**:
   - Partial payments, full settlements, and multi-invoice payment allocation.
   - Dynamic invoice status transitions (`DRAFT` → `ISSUED` → `PARTIALLY_PAID` → `PAID` / `OVERDUE`).

---

## 🏗️ Technology Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS, Lucide React, Recharts, jsPDF, html2canvas.
- **Backend**: Node.js, Express, TypeScript, Zod, JWT, bcryptjs.
- **ORM & Database**: Prisma ORM with SQLite for zero-config local development and PostgreSQL compatibility for production.
- **Testing**: Vitest with unit and integration test suites.

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- Node.js v18+ (tested on Node v24.18.0)
- npm v9+

### 2. Installation
Clone the repository and install root and package dependencies:

```bash
# In the project root directory
npm install
npm --prefix server install
npm --prefix client install
```

### 3. Database Setup & Seeding
Set up the Prisma schema and seed initial business data matching the screenshots:

```bash
cd server
npm run prisma:generate
npm run prisma:push
npm run prisma:seed
```

> **Default Admin Credentials**:
> - **Email**: `admin@klanvision.com`
> - **Password**: `Password123!`

### 4. Running Locally
Start both backend API server and frontend client concurrently:

```bash
# From root directory:
npm run dev

# Or run separately:
# Terminal 1: Backend Server (runs on http://localhost:5000)
npm run dev:server

# Terminal 2: Frontend Client (runs on http://localhost:5173)
npm run dev:client
```

---

## 🧪 Running Tests

The test suite validates GST financial arithmetic, JWT authentication, multi-tenant isolation, sequential invoice numbering, and payment allocation:

```bash
cd server
npm test
```

Test coverage includes:
- `gstCalculator.test.ts`: Intra-state vs Inter-state supply detection, CGST/SGST 50/50 split, IGST calculation, discount calculations, and decimal-safe round-off.
- `authAndTenancy.test.ts`: Unauthorized request rejection, authenticated token verification, and multi-tenant isolation.
- `invoicesAndPayments.test.ts`: Sequential invoice numbering, GST tax calculation, partial payments, and full settlement status transitions.

---

## ⚙️ Environment Variables

### Server (`server/.env`)
```env
PORT=5000
DATABASE_URL="file:./dev.db"
JWT_SECRET="klanvision-saas-super-secret-production-jwt-key-2025"
NODE_ENV="development"
FRONTEND_URL="http://localhost:5173"
```

---

## 🏢 Production Deployment Guidance

1. **Database**: Update `server/prisma/schema.prisma` datasource provider from `"sqlite"` to `"postgresql"` and provide a PostgreSQL `DATABASE_URL`.
2. **Build**:
   ```bash
   npm run build
   ```
3. **Environment**: Set `NODE_ENV=production` and generate a cryptographically strong `JWT_SECRET`.
4. **Process Manager**: Use PM2, Docker, or Kubernetes to deploy `server/dist/index.js` and serve `client/dist` via Nginx or Cloudflare Pages.
