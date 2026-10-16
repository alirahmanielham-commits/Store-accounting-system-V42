# Standalone Mobile App & Granular Mobile Permission Manager Specification

A complete architectural blueprint and technical plan for building a standalone, online Mobile App (React Native / PWA) connected in real-time to the central accounting database server, complete with a granular Admin Mobile Access Control Manager in the main system.

---

## User Review & Confirmed Decisions

> [!IMPORTANT]
> The following core architectural decisions were confirmed in Phase 1 clarification:

- **Confirmed Decision 1 (Platform & Framework)**: Modern PWA / React Native mobile app client communicating via REST API / JSON endpoints directly with the central backend server (`server.ts`).
- **Confirmed Decision 2 (Admin Mobile Access Manager)**: A dedicated Mobile Permissions Matrix in the desktop Admin Panel allowing system administrators to grant or revoke specific mobile operations (receipts, check entry, sales invoices, stock check, person ledger, debtor reports) per user and per role.
- **Confirmed Decision 3 (Data Synchronization Policy)**: 100% Real-time Online API architecture with zero local stale state caching, ensuring immediate database consistency across desktop and mobile devices.
- **Confirmed Decision 4 (Authentication & Security)**: Secure JWT token-based authentication paired with Device ID registration and hardware fingerprinting to prevent unauthorized mobile access.

---

## 1. Overview & Core Concept

- **What It Delivers**:
  1. **Central Server API Endpoints (`/api/v1/mobile/*`)**: High-performance RESTful JSON endpoints protected by JWT bearer authentication, role-based middleware, and mobile permission verification.
  2. **Desktop Admin Mobile Permissions Panel (`/admin/mobile-permissions`)**: A matrix interface for system administrators to configure mobile permissions for every user (e.g. enabling sales rep A to issue sales invoices and view debtor lists, but disabling check management or purchasing).
  3. **Standalone Mobile Client Application**: A responsive touch-optimized mobile web client / PWA engineered for high-speed field operations with biometric/JWT login, fast barcode scanning, real-time product search, receipt generation, and customer ledger lookups.

---

## 2. Technical System Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        Standalone Mobile App                            │
│                 (PWA / React Native Mobile Client)                      │
└─────────────────────────────────────────────────────────────────────────┘
                                   │
                                   │ HTTPS / REST API
                                   │ Bearer JWT Token + X-Device-ID
                                   ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                          Central Express Server                         │
│                              (server.ts)                                │
│  ┌────────────────────────┐    ┌─────────────────────────────────────┐  │
│  │ Mobile Auth Middleware │ ──►│ Mobile Access Enforcement Middleware│  │
│  │ (JWT & Device Check)   │    │  (Checks mobile_permissions table)  │  │
│  └────────────────────────┘    └─────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                       Central Database Storage                          │
│               (PostgreSQL / SQLite / Local Store Data)                  │
│   • users                     • mobile_permissions                      │
│   • mobile_registered_devices • invoices, receipts, checks, persons    │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Mobile Permissions Matrix Schema & Admin Interface

### A. Data Schema (`mobile_permissions` & `mobile_registered_devices`)

```typescript
// Mobile Permission Entity Structure
export interface MobileUserPermission {
  userId: string;
  role: "admin" | "accountant" | "cashier" | "sales_rep" | "user";
  
  // Treasury Permissions
  canCreateReceiveReceipt: boolean; // ثبت دریافت وجه
  canCreatePayReceipt: boolean;     // ثبت پرداخت وجه
  canViewReceiptsList: boolean;     // لیست رسیدها
  canUseKeyboardReceipt: boolean;   // ثبت سریع کیبوردی

  // Commercial / Sales Permissions
  canCreateSaleInvoice: boolean;    // صدور فاکتور فروش
  canCreatePurchaseInvoice: boolean;// ثبت فاکتور خرید
  canViewInvoicesList: boolean;     // مشاهده لیست فاکتورها
  canQuickPriceInquiry: boolean;    // استعلام سریع قیمت
  canManageProducts: boolean;       // ثبت و تعریف کالا

  // Checks Permissions
  canReceiveCheck: boolean;         // ثبت چک دریافتی
  canPayCheck: boolean;             // ثبت چک پرداختی
  canViewCheckDashboard: boolean;   // مشاهده داشبورد و کارتابل چک‌ها

  // Persons & Ledger Permissions
  canManagePersons: boolean;        // ثبت و ویرایش طرف‌حساب
  canViewPersonLedger: boolean;     // مشاهده دفتر معین و کارت حساب
  canViewPersonProfile: boolean;    // مشاهده پرونده شخص

  // Reports & CRM
  canViewDebtorsReport: boolean;    // مشاهده گزارش بدهکاران/بستانکاران
  canViewDebtorsShowcase: boolean;  // مشاهده ویترین مطالبات معوق

  // Device & Security Rules
  allowedDeviceIds?: string[];      // شناسه دستگاه‌های مجاز
  maxActiveSessions?: number;       // حداکثر نشست‌های همزمان
  updatedAt: string;
  updatedBy: string;
}
```

### B. Admin Mobile Control Panel Features (`src/components/admin/MobilePermissionsManager.tsx`)

1. **User Selection Drawer**: Select any registered user from the system.
2. **Preset Role Templates**:
   - *فروشنده میدانی (Field Sales Rep)*: Sale Invoice Creation, Customer Search, Ledger View, Debtors List, Receive Receipt.
   - *تحویل‌دار / صندوق‌دار سیار (Mobile Cashier)*: Cash/Bank Receive & Pay Receipts, Check Entry, Daily Transactions.
   - *انباردار همراه (Mobile Warehouse Operator)*: Product Stock Inquiry, Purchase Invoice Entry, Fast Barcode Scanner.
   - *مدیر کل (Super Admin)*: Full access across all mobile endpoints.
3. **Toggle Matrix UI**: Switch permissions individually with instant visual feedback and audit logs.
4. **Device Registration Hub**: View registered smartphone models, IP addresses, last active timestamps, and option to remotely revoke device access.

---

## 4. Mobile API Endpoints Specification (`/api/v1/mobile`)

### A. Auth & Security Endpoints
- `POST /api/v1/mobile/auth/login`: Validates credentials, checks active device ID, issues JWT token with embedded mobile claims.
- `POST /api/v1/mobile/auth/device-register`: Registers new smartphone hardware fingerprint for admin approval.
- `GET  /api/v1/mobile/auth/my-permissions`: Fetches current user's active mobile permissions.

### B. Core Operational Endpoints
- `GET  /api/v1/mobile/products/search?q=...`: Real-time barcode & title product lookup.
- `GET  /api/v1/mobile/persons/search?q=...`: Instant customer search with live balance.
- `POST /api/v1/mobile/invoices/sale`: Real-time sale invoice issue & automatic stock/account debit.
- `POST /api/v1/mobile/receipts/receive`: Issue cash/POS/bank receive receipt with auto journal entry.
- `POST /api/v1/mobile/checks/receive`: Register incoming Sayad check.
- `GET  /api/v1/mobile/reports/debtors`: Real-time list of customer balances and overdue debts.

---

## 5. Security & Device Binding Specification

1. **JWT Auth Header**: `Authorization: Bearer <jwt_token>` containing user ID, store ID, and signature.
2. **Device Header Verification**: `X-Device-Fingerprint: <sha256_hash>` checked against `allowedDeviceIds` in admin settings.
3. **Session Revocation**: Admin panel includes a 1-tap "خروج اضطراری تمام نشست‌های همراه" (Force Revoke All Mobile Sessions) button.

---

## 6. Implementation Milestones

1. **Milestone 1**: Implement `mobile_permissions` database store and Admin Control Panel component in the main desktop web app (`/admin/mobile-permissions`).
2. **Milestone 2**: Build central backend express router `/api/v1/mobile/*` with JWT authentication and permission enforcement middleware.
3. **Milestone 3**: Create mobile client application structure with touch-optimized forms (Sales Invoice, Receive Receipt, Check Entry, Person Ledger, Debtors Report).
4. **Milestone 4**: Conduct end-to-end testing, compile verification, and generate final deployment package.
