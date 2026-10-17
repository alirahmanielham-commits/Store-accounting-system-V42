# MASTER PROMPT: BUILD STANDALONE REACT NATIVE (EXPO) MOBILE APP FOR TARAZ ACCOUNTING SYSTEM
# پرامپت جامع و مستر برای هوش مصنوعی جهت ساخت اپلیکیشن موبایل تراز

> **راهنمای استفاده:**  
> این پرامپت یک سند مستقل و مهندسی‌شده کامل است. می‌توانید کل متن زیر را کپی کرده و در ابزارهای هوش مصنوعی توسعه نرم‌افزار (مانند Cursor, Claude 3.5 Sonnet, ChatGPT 4o یا Google AI Studio) وارد کنید تا اپلیکیشن موبایل اختصاصی سامانه تراز با React Native و Expo را با تمام ماژول‌ها و جزئیات کدنویسی برای شما ایجاد نماید.

---

```markdown
# TASK: CREATE A STANDALONE REACT NATIVE (EXPO) MOBILE APP FOR TARAZ ACCOUNTING SYSTEM

You are a Senior Full-Stack Mobile Software Architect specializing in React Native, Expo (SDK 51+), TypeScript, and offline-first enterprise applications.
Build a complete, standalone, production-grade mobile app for "سامانه حسابداری تراز (Taraz Accounting System)" designed for field salesmen, warehouse staff, store managers, and executives.

---

## 1. ARCHITECTURE & TECH STACK

- **Platform & Runtime:** React Native with Expo (Managed Workflow, SDK 51+), TypeScript (strict mode enabled).
- **Navigation:** `@react-navigation/native` with `@react-navigation/native-stack` and `@react-navigation/bottom-tabs`.
- **UI Framework & Styling:** NativeWind (Tailwind CSS for React Native) with custom dark mode palette:
  - Deep Canvas: `#090d16` (slate-950)
  - Card/Surface Elevation: `#131b2e` (slate-900)
  - Borders: `#1e293b` (slate-800)
  - Primary Brand Accent: Indigo/Violet (`#6366f1`)
  - Success/Receipts: Emerald (`#10b981`)
  - Warning/Sayad Checks: Amber/Sky (`#0284c7` & `#f59e0b`)
  - Danger/Debtors Alert: Rose (`#f43f5e`)
- **Typography & RTL:**
  - 100% Native RTL Layout: `I18nManager.allowRTL(true)` and `I18nManager.forceRTL(true)`.
  - Persian typography (Vazirmatn or IRANYekanX font loading via `expo-font`).
  - Persian numerals formatter helper (`toPersianDigits(num)`).
  - Tabular digits (`fontVariant: ['tabular-nums']`) for financial sums.
- **Hardware & Device Integrations:**
  - `expo-camera` / `expo-barcode-scanner` for ultra-fast barcode and QR scanning.
  - `expo-device` and `expo-application` for unique hardware fingerprinting (`X-Device-Id`).
  - `expo-secure-store` for safe storage of JWT tokens and server configuration.
  - `@react-native-async-storage/async-storage` or `expo-sqlite` for offline caching and Outbox sync queue.
  - `expo-sharing` & `expo-print` for thermal receipt & standard invoice PDF generation.
  - `react-native-reanimated` (v3) & `react-native-gesture-handler` for smooth fluid gestures.

---

## 2. CONNECTION ARCHITECTURE & RESILIENT OFFLINE OUTBOX PATTERN

The application implements an **Online-First architecture with an Offline Outbox Queue**:
1. **Live Online REST Connection:**
   - Base URL is user-configurable from the login screen (e.g., `https://accounting.yourdomain.ir` or local IP for LAN).
   - Axios client configured with 10-second timeout, Bearer JWT header, and `X-Device-Id` header.
2. **Offline Outbox Pattern (صف ایمن اسناد آفلاین):**
   - When the device is offline or the server is temporarily unreachable, any created document (Sale Invoice, Purchase Invoice, Cash/POS Receipt, Stocktaking Count) is assigned a `clientTempId` (UUID v4) and saved to local storage with status: `'pending_sync'`.
   - The user sees a clear, non-intrusive status pill: `«۳ سند در صف ارسال آفلاین»`.
   - A background network listener (`@react-native-community/netinfo`) triggers automatic batch sync (`POST /api/v1/mobile/sync/batch`) as soon as the connection is restored.
   - The server processes records idempotently using `clientTempId` to prevent duplicate ledger or stock entries.

---

## 3. CORE MODULE SPECIFICATIONS

### ماژول ۱: صدور فاکتور فروش و خرید آنلاین با اسکنر بارکد (Sales & Purchase Invoices)
- سوئیچ بین حالت «فاکتور فروش» و «فاکتور خرید».
- انتخاب سریع مشتری/تأمین‌کننده با جستجوی هوشمند بر اساس نام، کد و برچسب‌ها.
- دکمه فعال‌سازی سریع دوربین برای اسکن بارکد کالا و افزودن مستقیم به اقلام فاکتور با صدای بیپ و ویبره سبک هپتیک.
- جستجوی دستی کالا با نمایش موجودی لحظه‌ای انبار و آخرین قیمت فروش/خرید.
- امکان ویرایش تعداد، واحد شمارش، درصد تخفیف، و محاسبه خودکار مالیات بر ارزش افزوده.
- تسویه‌حساب فاکتور (نقد، پوز، نسیه، چک).
- صدور آنی پیش‌نمایش قابل چاپ روی فیش‌پرینتر حرارتی بلوتوثی (عرض ۸۰mm) و اشتراک‌گذاری در واتساپ/تلگرام/ایتا.

### ماژول ۲: خزانه‌داری دوطرفه و کارتابل چک‌های صیادی (Treasury & Sayad Cheques)
- ثبت «دریافت وجه» و «پرداخت وجه»:
  - نقد (صندوقدار / ویزیتور)
  - کارتخوان (دستگاه پوز با شماره پیگیری و ارجاع)
  - حواله بانکی (شماره شبا و تصویر فیش واریزی)
- **کارتابل چک‌های صیادی بنفش:**
  - ثبت چک دریافتی یا پرداختی با شناسه صیادی ۱۶ رقمی
  - ثبت مبلغ، تاریخ سررسید خورشیدی، نام بانک صادرکننده، شعبه، و نام صاحب حساب
  - نمایش وضعیت چک (در جریان وصول، پاس شده، برگشتی، خرج شده)
  - فیلتر سریع چک‌های سررسید هفته جاری.

### ماژول ۳: پرونده هوشمند اشخاص، دفتر معین و برچسب‌گذاری سریع (Persons & Quick Tagging)
- فهرست مشتریان و طرف‌حساب‌ها با نمایش مانده‌حساب زنده (رنگ سبز = بستانکار، رنگ قرمز = بدهکار).
- دکمه‌های اقدام سریع در کارت شخص: تماس تلفنی ۱-کلیکه (`tel:`)، پیامک (`sms:`) و مسیریابی به آدرس شخص.
- **دفتر معین اشخاص (Customer Ledger):**
  - جدول ریز تراکنش‌ها با تاریخ شمسی، شرح سند، بدهکار، بستانکار و مانده سطری.
  - امکان خروجی PDF صورتحساب و اشتراک‌گذاری مستقیم برای طرف‌حساب.
- **سیستم برچسب‌گذاری سریع (Quick Tags System):**
  - مشاهده برچسب‌های فعلی شخص (مانند «همکار»، «خوش‌حساب»، «عمده‌فروش»، «پیگیری تلفنی»، «دارای چک برگشتی»).
  - امکان الصاق یا حذف برچسب‌ها مستقیماً از روی گوشی و فیلتر کردن فهرست مشتریان بر اساس تگ‌ها.

### ماژول ۴: ویترین مطالبات، بدهکاران و پیگیری سریع پیامکی (Receivables Showcase & SMS)
- داشبورد تحلیلی سرجمع مطالبات بازار، تعداد بدهکاران فعال، و مطالبات سررسیدگذشته.
- دسته‌بندی بدهکاران بر اساس میزان بدهی یا دیرکرد (بیش از ۳۰ روز، بیش از ۶۰ روز).
- **قالب‌های پیامک هوشمند پیگیری:**
  - دکمه «ارسال پیامک یادآوری» با متن‌های آماده و متغیرهای پویا:
    `«مشتری گرامی {نام}، مانده بدهی شما مبلغ {مبلغ} تومان می‌باشد. خواهشمند است جهت تسویه اقدام فرمایید.»`
  - ثبت سابقه آخرین پیگیری تلفنی یا پیامکی با ذکر تاریخ و توضیحات ویزیتور.

### ماژول ۵: انبارگردانی سریع موبایلی و استعلام قیمت زنده (Stocktaking & Live Price Inquiry)
- **استعلام زنده کالا (Price Checker):**
  - اسکن بارکد کارتن یا تک محصول و مشاهده آنی: نام کالا، موجودی در تمام انبارها، قیمت مصرف‌کننده، قیمت همکار، و نقطه سفارش.
- **انبارگردانی سریع بارکدی (Fast Stocktaking):**
  - انتخاب انبار هدف (انبار مرکزی، انبار فروشگاه، انبار ضایعات).
  - شمارش پیوسته کالاها با اسکنر بارکد (با هر بار اسکن یک عدد به شمارش اضافه می‌شود یا پنجره ورود تعداد باز می‌شود).
  - محاسبه آنی مغایرت (کسری/اضافی) نسبت به موجودی دفتری سیستم.
  - ثبت نهایی کاربرگ انبارگردانی و ارسال به سرور مرکزی جهت اعمال سند تعدیل انبار.

---

## 4. REST API CONTRACTS (Endpoints Expected from Server)

The app interacts with the following backend endpoints prefixed with `/api/v1/mobile`:

### Auth & Device Security
- `POST /api/v1/mobile/auth/login`: Body: `{ username, password, deviceId, deviceModel }` -> Response: `{ token, user, permissions }`
- `GET /api/v1/mobile/auth/my-permissions`: Returns mobile permission flags (canIssueInvoice, canReceiveCash, maxDiscountPercent, etc.)

### Invoices (Sales & Purchase)
- `GET /api/v1/mobile/invoices`: List recent invoices.
- `POST /api/v1/mobile/invoices/sale`: Create sale invoice.
- `POST /api/v1/mobile/invoices/purchase`: Create purchase invoice.

### Products, Prices & Stocktaking
- `GET /api/v1/mobile/products/search?q={query}`: Search products.
- `GET /api/v1/mobile/products/quick-price?barcode={barcode}`: Fast price & stock check by barcode.
- `POST /api/v1/mobile/inventory/stocktaking`: Submit counted items for a stocktaking session.

### Persons, Ledger & Tags
- `GET /api/v1/mobile/persons?q={query}&tagId={tagId}`: List persons with balance and active tags.
- `GET /api/v1/mobile/persons/:id/ledger`: Fetch ledger entries (دفتر معین).
- `GET /api/v1/mobile/tags`: Fetch all available tags.
- `POST /api/v1/mobile/persons/:id/tags`: Attach/detach tags for a person: `{ tagIds: string[] }`.

### Treasury & Checks
- `POST /api/v1/mobile/receipts/receive`: Submit receive receipt (Cash / POS / Bank).
- `POST /api/v1/mobile/receipts/pay`: Submit payment receipt.
- `POST /api/v1/mobile/checks/receive`: Register incoming Sayad check.
- `GET /api/v1/mobile/checks`: List active checks and due dates.

### Debtors & Follow-up
- `GET /api/v1/mobile/reports/debtors`: Overdue debtor list with contact info and days past due.
- `POST /api/v1/mobile/debtors/send-sms`: Trigger server SMS dispatch: `{ personId, templateId, customNote }`.

### Offline Outbox Sync Batch
- `POST /api/v1/mobile/sync/batch`: Body:
  ```json
  {
    "deviceId": "UUID",
    "syncedAt": "2026-10-17T08:00:00Z",
    "items": [
      {
        "clientTempId": "local-uuid-1",
        "entityType": "sale_invoice" | "receipt" | "stocktaking",
        "payload": { ... }
      }
    ]
  }
  ```
  Response: `{ success: true, processedTempIds: ["local-uuid-1"] }`

---

## 5. COMPLETE PROJECT STRUCTURE TO GENERATE

```text
taraz-mobile-app/
├── package.json
├── app.json
├── tsconfig.json
├── tailwind.config.js
├── babel.config.js
├── App.tsx
└── src/
    ├── api/
    │   ├── client.ts             # Axios with token, headers, and interceptors
    │   ├── auth.api.ts           # Login, hardware lock verification
    │   ├── invoices.api.ts       # Sales & Purchase invoices
    │   ├── persons.api.ts        # Persons, ledger, tags
    │   ├── treasury.api.ts       # Receipts, payments & Sayad checks
    │   ├── inventory.api.ts      # Price lookup & stocktaking
    │   └── sync.api.ts           # Offline Outbox batch sync
    ├── database/
    │   ├── storage.ts            # Local key-value & SecureStore wrapper
    │   └── outbox.ts             # Queue management for offline pending items
    ├── navigation/
    │   ├── RootNavigator.tsx     # Auth vs App stack
    │   └── BottomTabNavigator.tsx# 5 primary modules bottom tabs
    ├── screens/
    │   ├── auth/
    │   │   ├── ServerConfigModal.tsx
    │   │   └── LoginScreen.tsx
    │   ├── invoices/
    │   │   ├── InvoiceCreateScreen.tsx
    │   │   └── BarcodeScannerModal.tsx
    │   ├── treasury/
    │   │   ├── ReceiptCreateScreen.tsx
    │   │   └── SayadCheckListScreen.tsx
    │   ├── persons/
    │   │   ├── PersonsListScreen.tsx
    │   │   ├── PersonLedgerScreen.tsx
    │   │   └── PersonTagsModal.tsx
    │   ├── debtors/
    │   │   ├── DebtorsReportScreen.tsx
    │   │   └── SendSmsModal.tsx
    │   └── inventory/
    │       ├── QuickPriceCheckScreen.tsx
    │       └── StocktakingScreen.tsx
    ├── components/
    │   ├── common/
    │   │   ├── PersianText.tsx
    │   │   ├── CurrencyInput.tsx
    │   │   ├── SyncStatusBanner.tsx
    │   │   └── ActionButton.tsx
    │   └── cards/
    │       ├── PersonCard.tsx
    │       └── ProductItemRow.tsx
    ├── types/
    │   └── models.ts             # Strict TypeScript definitions
    └── utils/
        ├── formatters.ts         # toPersianDigits, formatToman, jalaliDate
        └── sound.ts              # Haptic & scan feedback
```

---

## 6. IMPLEMENTATION REQUIREMENTS & CODING STANDARDS

1. Write complete, copy-paste ready code without ellipsis (`// ... rest of code`) for all critical screens and state stores.
2. Ensure full Persian RTL compatibility across all screens.
3. Handle empty states, loading indicators, and network offline transitions gracefully.
4. Provide realistic mock data fallback when the live server is unreachable during initial local prototyping.
5. Provide a quick-start guide in `README.md` explaining how to run `npx expo start` and connect with Expo Go on Android or iOS.
```
