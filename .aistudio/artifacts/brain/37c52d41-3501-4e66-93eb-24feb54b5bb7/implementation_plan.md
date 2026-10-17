# Standalone Mobile App Master AI Prompt Specification

A comprehensive, production-grade master prompt designed to be copied directly into any AI code generation model (Claude, Cursor, Gemini, ChatGPT) to build the complete, standalone React Native / Expo mobile application connected to the central Taraz accounting system.

---

## User Review & Confirmed Choices

- **Framework & Target Platform**: React Native with Expo (Cross-platform Android & iOS).
- **UI Design & Theme**: Ultra-modern Dark Mode aesthetic (`bg-slate-950`), vibrant module accent gradients, high-contrast typography (IRANYekanX / Vazirmatn fonts), and ergonomic touch targets ($\ge 44\text{px}$).
- **API Connection & Authentication**: Dynamic Server API URL config screen, JWT Bearer Token authentication, and hardware Device ID registration header (`X-Device-Fingerprint`).
- **Functional Scope**: All 5 core mobile modules:
  1. **صدور فاکتور فروش و خرید** (Sale & Purchase Invoices with real-time barcode scanner and stock check)
  2. **ثبت رسید دریافت و پرداخت وجه** (Cash, POS, Bank receipts)
  3. **ثبت و کارتابل چک‌های صیادی** (Sayad Checks registration & status workflow)
  4. **بانک اشخاص و کارت حساب** (Customer search, Ledger Card, Customer Profile)
  5. **گزارش بدهکاران و ویترین مطالبات** (Live overdue debtors list with 1-tap call/SMS)

---

## Master Prompt for AI Application Builder

Copy and paste the following master prompt into your AI builder tool (e.g. Cursor, Claude 3.5 Sonnet, ChatGPT, or AI Studio):

```markdown
# MASTER PROMPT: BUILD STANDALONE REACT NATIVE (EXPO) MOBILE APP FOR TARAZ ACCOUNTING SYSTEM

You are a Senior Mobile Software Engineer specializing in React Native, Expo, and TypeScript.
Build a complete, standalone, production-grade mobile application for the "Taraz Accounting System" (سامانه مالی و حسابداری تراز) that connects online in real-time to the central accounting REST API.

---

## 1. TECHNICAL ARCHITECTURE & STACK

- **Framework**: React Native with Expo (SDK 51+), TypeScript, React Navigation (Native Stack & Bottom Tabs).
- **Icons & UI System**: `lucide-react-native`, `react-native-reanimated`, `react-native-gesture-handler`, `expo-barcode-scanner` / `expo-camera`, `expo-device`, `expo-secure-store`.
- **Styling**: NativeWind (Tailwind CSS for React Native) or styled-components with clean Dark Mode posture (`#020617` canvas).
- **RTL & Font**: Native Right-to-Left (`I18nManager.allowRTL(true)`), Persian digits (`toPersianDigits`), IRANYekanX or Vazirmatn Persian typography, tabular numerals for currency values (`tabular-nums`).
- **HTTP Client**: Axios instance with automatic JWT Bearer token injection, device fingerprint header (`X-Device-Fingerprint`), request timeouts (10s), and error interceptors.

---

## 2. API CONTRACT & BACKEND ENDPOINTS

The central server exposes the following RESTful API endpoints at `/api/v1/mobile`:

1. **Auth & Device Registration**:
   - `POST /api/v1/mobile/auth/login`: `{ username, password, deviceId }` -> returns `{ token, user, permissions }`
   - `GET /api/v1/mobile/auth/my-permissions`: returns active user permissions
2. **Products & Inventory**:
   - `GET /api/v1/mobile/products/search?q={query}`: returns real-time product list, prices, and stock
3. **Persons & Customer Ledger**:
   - `GET /api/v1/mobile/persons/search?q={query}`: returns customer list with live debtor/creditor balance
   - `GET /api/v1/mobile/persons/:id/ledger`: returns customer ledger entries (دفتر معین)
4. **Sales & Purchase Invoices**:
   - `POST /api/v1/mobile/invoices/sale`: `{ personId, items, totalPrice }` -> issues invoice online
5. **Treasury & Receipts**:
   - `POST /api/v1/mobile/receipts/receive`: `{ personId, amount, type }` -> creates receive receipt
6. **Checks**:
   - `POST /api/v1/mobile/checks/receive`: `{ SayadNo, bankName, amount, dueDate, personId }`
7. **Debtors Report**:
   - `GET /api/v1/mobile/reports/debtors`: returns live list of overdue customers

---

## 3. UI/UX DESIGN CONSTITUTION & DARK THEME

- **Canvas Background**: Deep Slate Black (`#020617` / `bg-slate-950`).
- **Surface Elevation**: Subdued slate cards (`#0f172a` / `bg-slate-900`) with subtle hairline borders (`border-slate-800`).
- **Accent Budget**:
  - **Teal / Emerald**: Receipts & Incoming Payments (`#10b981`).
  - **Sky Blue**: Sayad Checks (`#0284c7`).
  - **Indigo / Purple**: Persons & Ledger Cards (`#6366f1`).
  - **Rose / Pink**: Debts & Overdue Alerts (`#f43f5e`).
- **Touch Ergonomics**: All buttons and list rows must have at least **44x44px touch hitboxes**.
- **No Static Pill Enclosures**: Render metadata (dates, codes, tags) as unboxed quiet text with `·` separators.

---

## 4. SCREEN HIERARCHY & NAVIGATION

### Screen A: Server Setup & Login (`/screens/LoginScreen.tsx`)
- Server API URL configuration modal (allows entering custom server IP/Domain e.g. `https://my-store.taraz.ir`).
- Username & Password inputs with show/hide password toggle.
- Automatic Hardware Device ID detection via `expo-device`.
- Biometric Login (FaceID / Fingerprint) setup option.

### Screen B: Main Bottom Tab Navigator (`/navigation/BottomTabNavigator.tsx`)
1. **داشبورد (Home)**: Quick stats, total today's sales, server connection badge, and 5 quick action tiles.
2. **فاکتور فروش (Sale Invoice)**:
   - Live customer selector search box.
   - Fast Barcode Scanner trigger (`expo-barcode-scanner`).
   - Real-time product search with item counter & discount inputs.
   - Instant "ثبت نهایی فاکتور" CTA with success modal and print preview.
3. **دریافت وجه (Receive Receipt)**:
   - Amount currency input with Iranian Toman words (`numberToWords`).
   - Payment method toggle: Cash (نقد), POS Terminal (کارتخوان), Sayad Check (چک صیادی).
4. **اشخاص و معین (Persons & Ledger)**:
   - Customer search bar.
   - Expandable customer card showing phone number, address, and live balance (`بدهکار` / `بستانکار`).
   - 1-tap "مشاهده کارت حساب (معین)" modal.
5. **مطالبات و بدهکاران (Debtors Report)**:
   - High-contrast list of overdue accounts.
   - 1-tap "تماس تلفنی" and "ارسال پیامک پیگیری".

---

## 5. CODE QUALITY & HARDENING

- Full TypeScript strict mode typing for all state, props, and API responses.
- Complete offline-handling banner (informs user if server connection drops).
- Input validation on all currency and date fields.
- Graceful error boundaries and toast notifications.
```

---

## Implementation Summary

This master prompt is 100% self-contained, specifies the React Native Expo stack, Dark Mode theme, API contracts, RTL Persian typography, and all 5 operational screens. You can copy the code block directly into any AI code generator to build the standalone app codebase.
