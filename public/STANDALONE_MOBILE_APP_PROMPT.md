# پرامپت کامل و جامع ساخت اپلیکیشن همراه آنلاین حسابداری تراز
## (Master System Prompt for AI Mobile App Builder - React Native / Expo)

> **دستورالعمل برای هوش مصنوعی مجری:**
> شما یک مهندس ارشد توسعه اپلیکیشن‌های موبایل (React Native / Expo) هستید. وظیفه شما ساخت کامل، استاندارد و بدون نقص **اپلیکیشن همراه آنلاین سامانه حسابداری تراز** بر اساس مشخصات و معماری فنی زیر است. تمام کدها باید تولید شده و هماهنگ با API سرور مرکزی باشند.

---

### 1. مشخصات کلی پروژه و معماری (Project Identity & Architecture)

- **نام اپلیکیشن:** اپلیکیشن همراه حسابداری تراز (Taraz Mobile App)
- **پلتفرم:** React Native با Expo CLI (پشتیبانی کامل از Android و iOS)
- **زبان و ابزارها:** TypeScript + React Navigation (Bottom Tabs & Native Stack)
- **استایل و تم visual:** تم تاریک مدرن (Dark Mode با پس‌زمینه `#0f172a` و `#1e293b`)، رنگ‌های آکسان بنفش/ایندیگو (`#6366f1`)، سبز زمردی (`#10b981`) و قرمز (`#f43f5e`)، با فونت فارسی وزیرمتن (Vazirmatn) و پشتیبانی کامل راست‌به‌چپ (RTL).
- **نوع ارتباط:** **۱۰۰٪ آنلاین و زنده (Real-time REST API)** بدون ذخیره‌سازی داده‌های مالی در حافظه آفلاین (به همراه کش موقت Axios/React Query برای سرعت بالاتر).
- **احراز هویت و امنیت:** ورود با نام کاربری و کلمه عبور به همراه توکن JWT، ثبت شناسه سخت‌افزاری دستگاه (Device ID) در هدر `X-Device-Id` و چک زنده سطح دسترسی از پنل مدیریت مرکزی.

---

### 2. ساختار پروژه‌ پیشنهادی (Directory Structure)

```text
taraz-mobile-app/
├── assets/
│   ├── fonts/ (Vazirmatn-Bold.ttf, Vazirmatn-Medium.ttf)
│   └── images/ (logo.png, icon.png, splash.png)
├── src/
│   ├── api/
│   │   ├── client.ts         # پیکربندی Axios با Interceptor هدر JWT و Device-ID
│   │   ├── auth.ts           # سرویس‌های احراز هویت و توکن
│   │   └── services.ts       # API فاکتور، رسید، چک، اشخاص و بدهکاران
│   ├── components/
│   │   ├── common/           # Input, Button, Card, Badge, LoadingSpinner
│   │   └── modals/           # Modal انتخاب کالا، انتخاب شخص، ثبت سریع
│   ├── context/
│   │   ├── AuthContext.tsx   # مدیریت لایف‌سایکل لاگین، توکن و آدرس API
│   │   └── AccessContext.tsx # مدیریت ماتریس دسترسی‌های زنده کاربر
│   ├── navigation/
│   │   ├── RootNavigator.tsx
│   │   ├── AuthStack.tsx
│   │   └── MainTabNavigator.tsx
│   ├── screens/
│   │   ├── auth/
│   │   │   ├── ApiConfigScreen.tsx
│   │   │   └── LoginScreen.tsx
│   │   ├── invoices/
│   │   │   ├── InvoiceListScreen.tsx
│   │   │   └── CreateInvoiceScreen.tsx
│   │   ├── receipts/
│   │   │   └── ReceiptFormScreen.tsx
│   │   ├── checks/
│   │   │   ├── CheckListScreen.tsx
│   │   │   └── CreateCheckScreen.tsx
│   │   ├── persons/
│   │   │   ├── PersonListScreen.tsx
│   │   │   └── PersonLedgerScreen.tsx
│   │   └── debtors/
│   │       └── DebtorsDashboardScreen.tsx
│   └── utils/
│       ├── formatters.ts     # فرمت سه‌رقمی مبالغ و تاریخ شمسی
│       └── storage.ts        # ذخیره امن آدرس API و JWT با Expo SecureStore
├── App.tsx
├── package.json
└── app.json
```

---

### 3. سناریوهای کاربردی و فرم‌های ۵ بخش اصلی (Core Functional Modules)

#### بخش ۱: فاکتور فروش و خرید (Sales & Purchase Invoices)
1. **لیست فاکتورها:** نمایش فاکتورهای اخیر با مشخصات خریدار/فروشنده، مبلغ کل، وضعیت پرداخت و تاریخ شمسی.
2. **ثبت فاکتور جدید:**
   - انتخاب نوع فاکتور (فروش / خرید).
   - جستجوی آنلاین شخص (خریدار/فروشنده) با نمایش بدهی قبلی.
   - جستجوی آنلاین کالا با نمایش موجودی زنده انبار و قیمت پایه.
   - محاسبه خودکار تخفیف، مالیات و مبلغ قابل پرداخت.
   - ارسال آنی به API مرکزی و دریافت شماره فاکتور رسمی.

#### بخش ۲: رسید دریافت و پرداخت (Cash Receipts & Payments)
1. **فرم دریافت سریع:**
   - ثبت دریافت نقدی، کارتخوان (POS) یا حواله بانکی.
   - کیبورد عددی بزرگ اختصاصی لمسی با فرمت خودکار سه‌رقمی.
   - تخصیص وجه دریافت شده به شخص یا فاکتور خاص.
   - بروزرسانی زنده مانده حساب طرف‌حساب و صندوق.

#### بخش ۳: ثبت و کارتابل چک (Check Management)
1. **ثبت چک جدید:** ثبت چک‌های دریافتی/پرداختی (صیادی و عادی) با شماره چک، نام بانک، شعبه، تاریخ سررسید و مبلغ.
2. **کارتابل چک‌ها:** فیلتر چک‌ها بر اساس وضعیت (نزد صندوق، واگذاری به بانک، وصول شده، برگشتی) و سررسیدهای روزهای آینده.

#### بخش ۴: بانک اشخاص و مشتریان (Person Directory)
1. **لیست اشخاص:** جستجو بر اساس نام، کد ملی یا شماره تلفن.
2. **نشانگر بدهکار/بستانکار:** نمایش وضعیت حساب با رنگ سبز (طلبکار) و قرمز (بدهکار).
3. **دفتر معین شخص:** مشاهده ریز گردش دریافت‌ها، پرداخت‌ها و فاکتورهای شخص.
4. **دکمه‌های اقدام سریع:** تماس تلفنی مستقیم، ارسال پیامک و صدور فاکتور جدید برای شخص.

#### بخش ۵: ویترین بدهکاران و بستانکاران (Debtors & Creditors Dashboard)
1. **خلاصه مطالبات و دیون:** کارت‌های آماری مجموع بدهکاران و بستانکاران.
2. **لیست اولویت‌بندی شده:** رتبه‌بندی بدهکاران بر اساس بیشترین مبلغ بدهی و طول زمان سررسید.
3. **گزارش سریع:** قابلیت ارسال پیامک یادآوری بدهی یا پیش‌فاکتور.

---

### 4. مشخصات فنی APIهای سرور مرکزی (API Specifications)

تمام درخواست‌ها باید شامل هدرهای زیر باشند:
```http
Authorization: Bearer <JWT_TOKEN>
X-Device-Id: <UNIQUE_HARDWARE_DEVICE_ID>
Content-Type: application/json
```

#### اندپویندهای اصلی API:
1. **احراز هویت:** `POST /api/v1/mobile/auth/login`
   - **بدنه درخواست:** `{ "username": "...", "password": "...", "deviceId": "..." }`
   - **پاسخ:** `{ "token": "...", "user": { "id": 1, "name": "...", "role": "..." } }`

2. **دریافت دسترسی‌های زنده:** `GET /api/v1/mobile/permissions`
   - **پاسخ:** `{ "allowedModules": ["invoices", "receipts", "checks", "persons", "debtors"], "permissions": { "canCreateInvoice": true, "canViewDebtors": true } }`

3. **جستجوی کالاها:** `GET /api/v1/mobile/products/search?q=کالا`
   - **پاسخ:** `[{ "id": "P1", "name": "کالای نمونه", "price": 150000, "stock": 42 }]`

4. **جستجوی اشخاص:** `GET /api/v1/mobile/persons/search?q=رضایی`
   - **پاسخ:** `[{ "id": "PERS1", "name": "علی رضایی", "phone": "09123456789", "balance": -2500000 }]`

5. **ثبت فاکتور:** `POST /api/v1/mobile/invoices`
   - **بدنه درخواست:** `{ "type": "sale", "personId": "PERS1", "items": [{ "productId": "P1", "quantity": 2, "unitPrice": 150000 }], "discount": 0, "tax": 0 }`

6. **ثبت رسید:** `POST /api/v1/mobile/receipts`
   - **بدنه درخواست:** `{ "type": "receive", "personId": "PERS1", "amount": 300000, "method": "pos", "description": "تصفیه فاکتور" }`

---

### 5. اصول کنترل دسترسی توسط پنل دسکتاپ (Access Control Policy)

1. اپلیکیشن موبایل در هر بار باز شدن یا فراخوانی API، سطح دسترسی کاربر را از اندپوینت `/api/v1/mobile/permissions` استعلام می‌گیرد.
2. در صورتی که مدیر سیستم در پنل دسکتاپ (بخش «مدیریت دسترسی‌های اپلیکیشن همراه») دسترسی کاربر را به بخشی (مثلاً ثبت چک یا ویترین بدهکاران) غیرفعال کرده باشد، آیکون آن بخش در منوی موبایل غیرفعال یا مخفی شده و در صورت تلاش برای ورود، صفحه «دسترسی توسط مدیر غیرفعال شده است» نمایش داده می‌شود.

---

### 6. دستور اجرای کد توسط هوش مصنوعی مجری (Execution Directive)

لطفاً همین الان ساختار کامل پروژه Expo با TypeScript را ایجاد کرده، کامپوننت‌های اصلی navigation، context احراز هویت، سرویس‌های Axios و ۵ صفحه اصلی ذکر شده را با تم تاریک فوق‌العاده شیک و فونت فارسی وزیرمتن تولید نمایید.
