# نقشه راه جامع اصلاح و ارتقای پروژه (PROJECT REFACTOR & UPGRADE ROADMAP)

این سند نقشه راه گام‌به‌گام و استاندارد مهندسی برای ارتقا، امن‌سازی، تثبیت داده‌ها و بازمهندسی ساختاری سامانه حسابداری و انبارداری است. تمامی مراحل به صورت دقیق با مشخص کردن فایل‌ها، جداول، APIها، وابستگی‌ها، سطح ریسک و اولویت مستند شده‌اند.

---

## Phase 0 — Critical (مهار بحران و اصلاحات فوری) [COMPLETED / انجام شده]

### هدف:
رفع فوری باگ‌های امنیتی حاد، جلوگیری از تخریب دفاتر مالی و متوقف کردن گلوگاه‌های کرش سرور قبل از هرگونه توسعه دیگر.

- **کارهای لازم:**
  1. افزودن Middleware احراز هویت `authenticateToken` به تمامی روت‌های داده `/api/data/*` و پایگاه داده `/api/database/*`.
  2. حذف فیلد رمز دومرحله‌ای (`code` OTP) از بدنه Response در روت `/api/auth/login-step1` و `/api/auth/login-step2`.
  3. اعمال گارد ریاضی تراز بودن سند دوبل (`sum(debit) === sum(credit)`) در متد `addAccountingDocument` سرور.
  4. حذف فرآیند بارگذاری کل دیتابیس در رم سرور (`triggerServerStockSync`) برای جلوگیری از Heap Out of Memory.
  5. اصلاح متد `getLocalData` در فرانت‌اند تا در خطاهای شبکه و ۵۰۰، خطای صریح پرتاب کند و مقدار پیش‌فرض خالی برنگرداند.
  6. افزودن اعتبارسنجی ممانعت از صدور حواله خروج با موجودی فیزیکی منفی (`availableStock >= qty`).
- **فایل‌های درگیر:**
  - `server.ts`
  - `src/routes/data.routes.ts`
  - `src/routes/auth.routes.ts`
  - `src/services/accountingService.ts`
  - `src/services/coreService.ts`
  - `src/utils/stockLogic.ts`
  - `src/services/inventoryService.ts`
- **Tableهای درگیر:**
  - `accounting_documents`
  - `warehouse_receipts`
  - `warehouse_remittances`
  - `users`
  - `products`
- **APIهای درگیر:**
  - `ALL /api/data/*`
  - `POST /api/auth/login-step1`
  - `POST /api/auth/login-step2`
  - `POST /api/data/accounting_documents`
- **وابستگی‌ها:** ندارد (نقطه شروع).
- **ریسک:** Low (اصلاحات نقطه‌ای و ایزوله).
- **سختی:** Low (کمتر از ۱ روز کاری).
- **تأثیر:** Critical (نجات سیستم از هک، ناترازی مالی و کرش سرور).
- **اولویت:** **P0**

---

## Phase 1 — Data Integrity (صحت اطلاعات و ساختار پایگاه‌داده) [COMPLETED / انجام شده]

### هدف:
تثبیت مدل داده‌ها، اعمال روابط کلید خارجی (FK)، پیاده‌سازی تراکنش‌های ACID و جلوگیری از مغایرت‌های دیتابیس.

- **کارهای لازم:**
  1. تکمیل تعاریف Drizzle Schema در `src/db/schema.ts` با قیدهای کلید خارجی (`FOREIGN KEY ... ON DELETE RESTRICT`).
  2. ایجاد ایندکس‌های ضروری روی ستون‌های کلیدی: `created_at`, `date`, `person_id`, `warehouse_id`, `doc_number`.
  3. کپسوله‌سازی ثبت فاکتور + اسناد انبار + سند حسابداری در یک تراکنش اتمیک (`db.transaction()`).
  4. یکپارچه‌سازی گردش کالا در یک جدول استاندارد `inventory_transactions` و حذف محاسبات دوگانه استاتیک/داینامیک.
  5. پیاده‌سازی مکانیزم Optimistic Locking با فیلد `version` یا `updatedAt` برای جلوگیری از رخداد Race Condition.
- **فایل‌های درگیر:**
  - `src/db/schema.ts`
  - `drizzle.config.ts`
  - `src/routes/data.routes.ts`
  - `src/services/inventoryService.ts`
  - `src/services/invoiceService.ts`
- **Tableهای درگیر:**
  - `invoices`, `invoice_items`
  - `accounting_documents`, `accounting_document_items`
  - `inventory_transactions`
  - `persons`, `products`, `warehouses`
- **APIهای درگیر:**
  - `POST /api/data/invoices`
  - `POST /api/data/warehouse_receipts`
  - `POST /api/data/warehouse_remittances`
- **وابستگی‌ها:** Phase 0.
- **ریسک:** High (نیازمند مهاجرت ایمن داده‌های موجود بدون از دست رفتن اطلاعات).
- **سختی:** High.
- **تأثیر:** Critical.
- **اولویت:** **P1**

---

## Phase 2 — Security (امنیت، احراز هویت و سطوح دسترسی) [COMPLETED / انجام شده]

### هدف:
استقرار ساختار احراز هویت بدون درز، کنترل دسترسی مبتنی بر نقش (RBAC) و ایمن‌سازی سرور در برابر حملات وب.

- **کارهای انجام‌شده:**
  1. [x] پیاده‌سازی میان‌افزار مستقل `requireRole(['admin', 'accountant', ...])` در لایه روت‌های سرور و اعتبارسنجی نقش‌ها در سطح متدهای دیتابیس و روت‌های حساس.
  2. [x] استخراج قطعی User ID و نقش کاربر منحصراً از توکن تاییدشده JWT و مسدودسازی کامل هرگونه جعل هویت از طریق هدر کلاینت (`x-user-info`).
  3. [x] ایمن‌سازی فایل `db_config.json` و پیاده‌سازی رمزنگاری متقارن مدرن AES-256-GCM برای رشته‌های اتصال به پایگاه‌داده و ماسک‌کردن گذرواژه‌ها در خروجی‌ها.
  4. [x] اعتبارسنجی دقیق فرمت و هدر فایل‌های آپلودی (`.json` و `.sql`) در `backup.routes.ts` و مسدودسازی کامل هرگونه پیمایش غیرمجاز و دسترسی مستقیم به سیستم‌عامل (Path Traversal Protection).
  5. [x] نصب، پیکربندی و فعال‌سازی پکیج‌های امنیتی `helmet`, `cors`, `express-rate-limit` برای ممانعت از حملات Brute-force و اعمال هدرهای امنیتی وب.
- **فایل‌های درگیر:**
  - `server.ts`
  - `src/middleware/auth.ts`
  - `src/routes/auth.routes.ts`
  - `src/routes/backup.routes.ts`
  - `src/routes/data.routes.ts`
- **Tableهای درگیر:**
  - `users`, `roles`, `permissions`, `system_logs`
- **APIهای درگیر:**
  - `ALL /api/*`
- **وابستگی‌ها:** Phase 0.
- **ریسک:** Medium (احتمال خطای دسترسی برای کاربران با نقش ناقص).
- **سختی:** Medium.
- **تأثیر:** High.
- **اولویت:** **P1**

---

## Phase 3 — Accounting (اصلاح و تثبیت منطق مالی) [COMPLETED / انجام شده]

### هدف:
انطباق کامل موتور حسابداری با استانداردهای دوبل، تغییرناپذیری اسناد دائم و تصحیح محاسبات بهای تمام‌شده و سود.

- **کارهای انجام‌شده:**
  1. [x] اعمال قانون تغییرناپذیری (Immutability): مسدودسازی کامل ویرایش و حذف اسناد قطعی‌شده (`permanent`) در لایه روت‌های سرور (`PUT/DELETE/batch`) و متدهای `accountingService` و غیرفعال‌سازی هوشمند دکمه‌ها در فرانت‌اند.
  2. [x] طراحی و پیاده‌سازی متد «صدور سند معکوس / اصلاحی» (`createReversalAccountingDocument` و `reverseInvoiceAccounting`) جهت ابطال قانونی فاکتورها، چک‌های برگشتی و اسناد قطعی بدون تخریب رکوردهای حسابداری.
  3. [x] پیاده‌سازی کامل سیستم بهای تمام‌شده کالای فروش‌رفته (COGS) بر مبنای نرخ میانگین وزنی متحرک (WAC) و روش اولین صادره از اولین وارده (FIFO) همراه با صدور خودکار سند حسابداری بدهکار بهای تمام‌شده (۵۱) و بستانکار موجودی کالا (۱۳).
  4. [x] اعتبارسنجی سلسله‌مراتبی ساختار کدینگ حسابداری (گروه: ۱ رقم، کل: ۲ رقم، معین: ۴ رقم، تفصیلی: ۶ تا ۸ رقم) با تطابق پیشوند والد و ممانعت قطعی از حذف حساب‌های دارای گردش مالی یا حساب‌های فرزند.
  5. [x] پیاده‌سازی کامل ویزارد استاندارد بستن سال مالی (`executeFiscalYearClosing` و `YearClosingChecklistModal`): ارزیابی هوشمند پیش‌نیازها، بستن حساب‌های موقت، انتقال سود/زیان به سود انباشته، صدور سند اختتامیه و صدور سند افتتاحیه سال بعد.
- **فایل‌های درگیر:**
  - `src/services/accountingService.ts`
  - `src/services/cogsService.ts`
  - `src/services/invoiceService.ts`
  - `src/services/dataService.ts`
  - `src/components/accounting/AccountingDocsList.tsx`
  - `src/components/accounting/AccountLedgerReport.tsx`
  - `src/components/accounting/FinancialYearManager.tsx`
  - `src/components/accounting/YearClosingChecklistModal.tsx`
- **Tableهای درگیر:**
  - `accounting_documents`, `ledger_accounts`, `financial_years`, `invoices`
- **APIهای درگیر:**
  - `POST /api/data/accounting_documents`
  - `PUT /api/data/accounting_documents/:id`
  - `DELETE /api/data/accounting_documents/:id`
- **وابستگی‌ها:** Phase 1.
- **ریسک:** High (تغییر در محاسبات مالی و نیازمند صحت‌سنجی حسابداری).
- **سختی:** High.
- **تأثیر:** Critical.
- **اولویت:** **P1**

---

## Phase 4 — Forms & UX (اصلاح فرم‌ها و تجربه کاربری) [COMPLETED / انجام شده]

### هدف:
ارتقای دقت ورود اطلاعات، یکپارچه‌سازی اعتبارسنجی‌ها و بهینه‌سازی جریان کاری کاربران روی دسکتاپ و موبایل.

- **کارهای انجام‌شده:**
  1. [x] **اعتبارسنجی با Zod:** ایجاد و یکپارچه‌سازی اسکیماهای استاندارد Zod برای فاکتور فروش (`saleInvoiceFormSchema`)، فاکتور خرید (`purchaseInvoiceFormSchema`)، اسناد دوبل حسابداری (`accountingDocFormSchema`)، رسید دریافت/پرداخت سریع (`transactionReceiptFormSchema`)، و چک‌های صیادی با گزارش خطاهای واضح و شفاف به زبان فارسی.
  2. [x] **محافظت از خروج تصادفی (Dirty Form Detection):** تعبیه هوک `useDirtyForm` و مدال اختصاصی `UnsavedChangesPrompt` در فرم‌های صدور فاکتور فروش، خرید، اسناد حسابداری و کیبورد سریع دریافت/پرداخت جهت جلوگیری از پاک شدن ناخواسته فرم‌های پر شده هنگام جابجایی بین تب‌ها یا بستن صفحه.
  3. [x] **استانداردسازی ورودی‌های پولی (`CurrencyInput`):** ارتقای کامل کامپوننت با `forwardRef` (سازگار با React Hook Form)، تبدیل برخط ریال/تومان، جداکننده ارقام سه‌رقمی، تبدیل ارقام فارسی و عربی، درج حروف عدد به فارسی و چیپ‌های سریع مبالغ پرکاربرد.
  4. [x] **تفکیک حالت فروش سریع و فاکتور تجاری:** امکان سوئیچ لحظه‌ای بین حالت فروش سریع فروشگاهی (POS / بارکدی سریع با کلیدهای F2/F4) و حالت فاکتور رسمی تجاری (با ارزش افزوده، شماره اقتصادی و شناسه ملی، کد پستی و مشخصات رسمی مودی و خریدار).
  5. [x] **بهینه‌سازی لمسی و واکنش‌گرا (Mobile & Touch UX):** بهینه‌سازی سایز کلیدهای عملیاتی برای نمایشگرهای لمسی و POS، چینش تراز ستون‌ها و نمایش واکنش‌گرای فیلدهای مالی.
- **فایل‌های درگیر:**
  - `src/components/invoices/SaleInvoiceCreate.tsx`
  - `src/components/invoices/PurchaseInvoiceCreate.tsx`
  - `src/components/accounting/AccountingDocCreate.tsx`
  - `src/components/financial/KeyboardReceiptPage.tsx`
  - `src/components/common/CurrencyInput.tsx`
  - `src/components/common/UnsavedChangesPrompt.tsx`
  - `src/hooks/useDirtyForm.ts`
  - `src/schemas/validation.ts`
- **Tableهای درگیر:**
  - `invoices`, `receipts`, `persons`, `products`, `accounting_documents`
- **APIهای درگیر:**
  - فرم‌های ثبت و ویرایش موجودیت‌ها.
- **وابستگی‌ها:** Phase 2, Phase 3.
- **وضعیت:** **تکمیل شده (Completed)**
- **اولویت:** **P2**

---

## Phase 5 — Performance (بهینه‌سازی کارایی و مقیاس‌پذیری) [COMPLETED / انجام شده]

### هدف:
حذف کامل گلوگاه‌های بار پردازشی سرور و مرورگر جهت آمادگی سیستم برای حجم داده‌های ۱۰ برابری.

- **کارهای انجام‌شده:**
  1. [x] **کوئری‌های صفحه‌بندی و فیلترینگ سمت سرور (Server-side Pagination & Filtering):** ارتقای کامل روت `GET /api/data/:key` در `src/routes/data.routes.ts` با پشتیبانی دوگانه از پارامترهای صفحه‌بندی (`page`/`pageSize` و `limit`/`offset`)، فیلتر جستجوی متنی لحظه‌ای روی فیلدهای سطرها، مرتب‌سازی صعودی و نزولی (`sortBy`, `sortOrder`, `sortDir`) و بازگرداندن متادیتاهای استاندارد شامل `total`, `totalPages`, `hasMore`.
  2. [x] **کش‌کردن هوشمند هدرهای HTTP (HTTP Cache-Control):** تنظیم هدرهای `Cache-Control: public, max-age=60, stale-while-revalidate=120` برای جداول پایه و مرجع (`product_categories`, `warehouses`, `store_settings`, `company_profile`, `person_roles`, `person_groups`) جهت به حداقل رساندن درخواست‌های تکراری شبکه در کلاینت.
  3. [x] **مجازی‌سازی لیست‌ها و جداول طولانی (List & Table Virtualization):** ایجاد کامپوننت‌های بهینه `VirtualTableBody` و `VirtualList` با موتور `@tanstack/react-virtual` و ادغام موفق در گزارش کاردکس کالا (`KardexReport.tsx`) با بیش از ۴۰ ردیف گردش، هدر و فوتر چسبنده (`sticky`) و اسکرول روان ۶۰ فریم بر ثانیه بدون افت کارایی مرورگر.
  4. [x] **بهینه‌سازی حافظه و همگام‌سازی انبارداری (RAM & Debounce Optimization):** بهینه‌سازی متد `triggerServerStockSync` با Debounce هوشمند ۱۵۰ میلی‌ثانیه‌ای و ادغام درخواست‌های همزمان جهت جلوگیری از سربار حافظه (Heap Spikes) و کرش سرور در ثبت‌های متوالی اسناد.
  5. [x] **بهینه‌سازی کش و Stale Time در React Query:** تنظیم دقیق `staleTime: 60s` و `gcTime: 5m` برای کالاها، اشخاص و دسته‌بندی‌ها در `usePersonsQuery` و `productService` و پیکربندی مرکزی در `main.tsx`.
  6. [x] **تقسیم کد و بارگذاری تنبل (Code Splitting & Lazy Loading):** تفکیک کامل کامپوننت‌های سنگین مدیریتی و کمکی (`SystemUpdatePage`, `PersonalNotesManager`, `LinkPerson`) با `React.lazy()` و `Suspense` در `App.tsx` و حذف ایمپورت‌های مازاد جهت کاهش سایز اولیه باندل جاوااسکریپت.
  7. [x] **فشرده‌سازی پاسخ‌های HTTP با Gzip/Deflate:** اطمینان از فعال‌سازی میان‌افزار `compression` در Express سرور برای پاسخ‌های بزرگ‌تر از ۱ کیلوبایت.
- **فایل‌های درگیر:**
  - `src/routes/data.routes.ts`
  - `src/components/common/VirtualTableBody.tsx`
  - `src/components/common/VirtualList.tsx`
  - `src/components/reports/KardexReport.tsx`
  - `src/components/invoices/InvoicesList.tsx`
  - `src/hooks/usePersonsQuery.ts`
  - `src/services/productService.ts`
  - `src/App.tsx`
  - `server.ts`
- **Tableهای درگیر:**
  - کلیه جداول دیتابیس (`invoices`, `inventory_transactions`, `persons`, `products`, `accounts`, `warehouse_stocks`).
- **APIهای درگیر:**
  - `GET /api/data/:key`
  - `GET /api/reports/*`
- **وابستگی‌ها:** Phase 1, Phase 4.
- **وضعیت:** **تکمیل شده (Completed)**
- **اولویت:** **P2**

---

## Phase 6 — Reports (اصلاح و چابک‌سازی موتور گزارش‌ها) [COMPLETED / انجام شده]

### هدف:
انتقال محاسبات سنگین به دیتابیس و سرور، تصحیح کاردکس کالا، سود و زیان واقعی بر پایه COGS و استانداردسازی خروجی‌های اکسل و PDF.

- **کارهای انجام‌شده:**
  1. [x] **انتقال محاسبه مانده در سطر (Running Balance) کاردکس به سرور:** پیاده‌سازی روت تخصصی `GET /api/reports/kardex` با محاسبه مانده تجمعی هر سطر، مانده اول دوره منقول، گردش دوره و ارزش‌گذاری موجودی با پشتیبانی از فیلتر انبار، تاریخ و صفحه‌بندی سروری.
  2. [x] **موتور سود و زیان واقعی بر پایه بهای تمام‌شده (True COGS & Profitability):** پیاده‌سازی روت `GET /api/reports/sales` با محاسبه خط به خط بهای تمام‌شده کالای فروش‌رفته بر پایه میانگین وزنی متحرک (WAC) و بهای خرید، سود ناخالص (`Gross Profit`) و درصد حاشیه سود (`Gross Margin %`) به همراه تفکیک روزانه، ماهانه و کالاهای پرفروش.
  3. [x] **گزارش تراز و بدهی/طلب اشخاص (`GET /api/reports/balances`):** تجمیع هوشمند مانده تفصیلی اشخاص از روی فاکتورها، تراکنش‌ها و اسناد، تعیین وضعیت بستانکار/بدهکار/بی‌حساب و خلاصه‌های آماری کلان.
  4. [x] **گزارش ارزیابی موجودی و هشدار نقطه سفارش (`GET /api/reports/inventory`):** محاسبه برخط موجودی فیزیکی، رزرو شده و قابل فروش کالاها به تفکیک انبار، ارزیابی ریالی به نرخ خرید و فروش و فیلتر اقلام با موجودی بحرانی (کمتر از حداقل موجودی).
  5. [x] **تولید و دانلود مستقیم خروجی اکسل از سرور (Streaming Excel Export):** پیاده‌سازی روت جامع `GET /api/reports/export/:reportType` برای تولید سمت سرور شیت‌های استاندارد اکسل (`.xlsx`) با فرمت راست‌به‌چپ و نام‌های فارسی و اتصال دکمه‌های دانلود مستقیم سروری در گزارش‌های فروش، موجودی و بدهی/طلب اشخاص جهت ممانعت از فریز شدن کلاینت در حجم داده‌های بالا.
- **فایل‌های درگیر:**
  - `src/routes/reports.routes.ts`
  - `src/components/reports/KardexReport.tsx`
  - `src/components/reports/SalesReport.tsx`
  - `src/components/reports/InventoryReport.tsx`
  - `src/components/reports/DebtsCreditsReport.tsx`
  - `server.ts`
- **Tableهای درگیر:**
  - `inventory_transactions`, `invoices`, `accounting_documents`, `products`, `warehouses`, `persons`, `transactions`
- **APIهای درگیر:**
  - `GET /api/reports/kardex`
  - `GET /api/reports/sales`
  - `GET /api/reports/balances`
  - `GET /api/reports/inventory`
  - `GET /api/reports/export/:reportType`
- **وابستگی‌ها:** Phase 1, Phase 3, Phase 5.
- **وضعیت:** **تکمیل شده (Completed)**
- **اولویت:** **P2**

---

## Phase 7 — Backup & Recovery (پشتیبان‌گیری، تاب‌آوری و ممیزی رویدادها) [COMPLETED / انجام شده]

### هدف:
تضمین صفر شدن احتمال از دست رفتن داده‌ها (RPO < 1h) و ثبت غیرقابل انکار وقایع سیستم.

- **کارهای انجام‌شده:**
  1. [x] **رمزنگاری معتبر با استاندارد AES-256-GCM:** طراحی و استقرار ماژول جامع رمزنگاری `src/utils/backupCrypto.ts` با مشتق‌سازی کلید ۳۲ بایتی از طریق PBKDF2 و سالت مشخص، تولید بردار اولیه (IV) تصادفی ۱۲ بایتی برای هر فایل، تگ احراز اصالت ۱۶ بایتی (Authentication Tag) و ساختار envelope استاندارد (`taraz_backup_encrypted`). ممانعت قطعی از دستکاری فایل‌ها و پشتیبانی بدون شکست از فایل‌های JSON نسخه‌های قدیمی.
  2. [x] **پشتیبان‌گیری چندگانه و تاب‌آوری ابری/محلی (Dual-Site & Off-Site Cloud):** ایجاد فرآیند ذخیره‌سازی خودکار در آرشیو ثانویه `backups/secondary-replica/` برای تضمین افزونگی دوقلو، و ارسال بسته پشتیبان با حفظ رمزنگاری نقطه به نقطه به فضاهای ابری (Google Drive, OneDrive, S3) جهت تحقق سناریوی بازیابی پس از فاجعه با RPO < 1h.
  3. [x] **موتور پیش‌نمایش تفاوت‌ها و سازگاری اسکیما (Dry-Run Engine):** طراحی ماژول `backupEngine.ts` و پیاده‌سازی روت‌های `/api/db/backups/dry-run/:filename` و `/api/backup/dry-run` جهت ارزیابی دقیق تعداد رکوردها، مغایرت جداول، هشدارهای کاهش داده و اعتبارسنجی توازن اسناد مالی قبل از اعمال Restore در دیتابیس.
  4. [x] **نسخه ایمنی اضطراری خودکار (Safety Snapshot & Rollback):** ایجاد خودکار اسنپ‌شات از وضعیت دیتابیس پیش از بازنویسی با ذخیره در `backups/safety-snapshots/` و تعبیه روت و کلید بازگشت سریع `/api/db/backups/revert-safety` در رابط کاربری جهت بازگردانی لحظه‌ای در صورت بروز خطا.
  5. [x] **ارتقای ممیزی رویدادها (`system_logs`) با Snapshot قبل و بعد:** ثبت مقادیر `oldData`، `newData` و خلاصه تفاوت‌های متنی `diffSummary` در کلیه روت‌های ویرایش (PUT)، حذف (DELETE) و عملیات دسته‌ای (Batch) در هر دو بستر دیتابیس PostgreSQL و SQLite همراه با ثبت شناسه واقعی کاربر از توکن تاییدشده JWT.
  6. [x] **استانداردسازی روت‌های نقشه راه و رابط کاربری:** پیاده‌سازی روت‌های `/api/backup/export`، `/api/backup/import`، `/api/backup/list`، نمایش برچسب امنیتی AES-256-GCM در جدول بکاپ‌ها و ادغام کامل مدال پیش‌نمایش Dry-Run در `DatabaseDashboard.tsx`.
- **فایل‌های درگیر:**
  - `src/utils/backupCrypto.ts`
  - `src/services/backupEngine.ts`
  - `src/routes/backup.routes.ts`
  - `src/routes/data.routes.ts`
  - `src/components/admin/DatabaseDashboard.tsx`
- **Tableهای درگیر:**
  - `system_logs`, `backups`, کلیه جداول دیتابیس
- **APIهای درگیر:**
  - `POST /api/backup/export`
  - `POST /api/backup/import`
  - `GET /api/backup/list`
  - `POST /api/backup/dry-run`
  - `POST /api/db/backups/dry-run/:filename`
  - `POST /api/db/backups/restore/:filename`
  - `POST /api/db/backups/revert-safety`
- **وابستگی‌ها:** Phase 2.
- **وضعیت:** **تکمیل شده (Completed)**
- **اولویت:** **P2**

---

## Phase 8 — Testing (تست خودکار و سنجش سلامت سیستم)

### هدف:
ایجاد چتر تست‌های خودکار برای ایجاد اطمینان ۱۰۰ درصدی از عدم بروز رگرسیون در هنگام بازمهندسی.

- **کارهای لازم:**
  1. راه‌اندازی فریم‌ورک Vitest و افزودن اسکریپت `"test": "vitest"` به فایل `package.json`.
  2. نوشتن Unit Tests جامع برای توابع حساس:
     - تراز بودن سند حسابداری
     - نرخ میانگین وزنی و کاردکس
     - تبدیل واحدهای شمارش
  3. نوشتن Integration Tests برای روت‌های کلیدی سرور با Supertest و دیتابیس آزمایشی ایزوله.
  4. نوشتن تست‌های End-to-End (E2E) با Playwright برای سناریوی اصلی: ورود، صدور فاکتور، تسویه و مشاهده کاردکس.
  5. پیکربندی Git Hooks با Husky جهت اجرای خودکار تست‌ها قبل از Commit.
- **فایل‌های درگیر:**
  - `package.json`
  - `vitest.config.ts`
  - `__tests__/*`
  - `tests/e2e/*`
- **Tableهای درگیر:**
  - دیتابیس موقت تست (In-memory SQLite یا Test Database).
- **APIهای درگیر:**
  - تمامی APIهای اصلی سامانه.
- **وابستگی‌ها:** Phase 0 تا Phase 3.
- **وضعیت:** **تکمیل شده (Completed)** — (شامل ۱۱ سوئیت آزمون و ۶۶ تست خودکار بدون خطا در پوشه‌های unit، integration و e2e).
- **ریسک:** Low.
- **سختی:** Medium.
- **تأثیر:** Very High (زیربنای اصلی فاز بعدی).
- **اولویت:** **P1**

---

## Phase 9 — Refactoring & Clean Architecture (بهبود ساختار و شکستن مونولیت)

### هدف:
پاکسازی بدهی‌های فنی، تفکیک هوک‌های عظیم، ارتقای Type Safety و برقراری اصول Clean Architecture.

- **کارهای لازم:**
  1. تجزیه هوک غول‌پیکر ۷,۳۰۰ خطی `useAppController.tsx` به هوک‌های موضوعی مجزا:
     - `useInvoiceWorkflow.ts`
     - `useWarehouseOps.ts`
     - `useLedgerAccounts.ts`
     - `useReceiptPayment.ts`
  2. انتقال منطق رندرینگ تب‌ها (`renderTabContent`) از داخل هوک به کامپوننت‌های روتینگ تمیز بر پایه `react-router-dom`.
  3. یکپارچه‌سازی کامل مدیریت وضعیت بر بستر اسلایس‌های استاندارد Zustand (`src/store`) و حذف صدها State تکراری.
  4. حذف تدریجی ۴,۵۰۰ مورد استفاده از `any` و تعریف اینترفیس‌های دقیق دامنه در پوشه `src/types/`.
  5. پاکسازی کامل بیش از ۸۰ اسکریپت آزمایشی و پچ‌های پایتون (`fix_*.py`) از ریشه پروژه.
- **فایل‌های درگیر:**
  - `src/hooks/useAppController.tsx`
  - `src/App.tsx`
  - `src/store/*`
  - `src/types/*`
  - ریشه پروژه (فایل‌های پایتون و شل رها شده).
- **Tableهای درگیر:**
  - ندارد (تغییرات صرفاً معماری کلاینت و سازمان‌دهی کد است).
- **APIهای درگیر:**
  - قراردادهای ماژولار داخلی سرویس‌ها.
- **وابستگی‌ها:** **Phase 8 (اجرای ریفکتورینگ بدون وجود تست‌های Phase 8 اکیداً ممنوع است)**.
- **وضعیت:** **تکمیل شده (Completed)** — (تفکیک هوک‌های موضوعی، تعریف تایپ‌های دامنه در src/types/، پاکسازی بیش از ۸۰ اسکریپت رها شده و گذراندن کلیه ۷۱ تست خودکار).
- **ریسک:** High (به دلیل وسعت تغییرات، اما با تست‌های Phase 8 مهار می‌شود).
- **سختی:** Very High.
- **تأثیر:** Very High.
- **اولویت:** **P2**

---

## Phase 10 — Future Features (قابلیت‌های تکمیلی و مزیت رقابتی)

### هدف:
توسعه امکانات پیشرفته تجاری پس از استقرار معماری پایدار و مطمئن.

- **کارهای لازم:**
  1. **ماژول اتصال به سامانه مودیان مالیاتی:** صدور و ارسال خودکار صورتحساب الکترونیکی با کلید خصوصی حافظه مالیاتی.
  2. **انتقال مکانیزه بین انبارها (Inter-warehouse Transfer):** پشتیبانی از کالای در راه و تأیید رسید در انبار مقصد.
  3. **زنجیره واحدهای چندسطحی:** پشتیبانی نامحدود از ضریب واحدهای بسته‌بندی (عدد، کارتن، باکس، پالت).
  4. **اتصال مستقیم سخت‌افزاری:** اتصال به ترازوهای دیجیتال بارکددار و پایانه‌های فروشگاهی POS تحت پروتکل LAN.
  5. **ساختار هلدینگ و چندشعبه‌ای:** مدیریت مجزای موجودی و گزارشات تلفیقی برای چند شعبه فروشگاهی.
- **فایل‌های درگیر:**
  - پوشه‌های جدید در `src/modules/taxModule/`, `src/modules/hardware/` و...
- **Tableهای درگیر:**
  - `tax_invoices`, `branches`, `unit_hierarchies`, `inter_warehouse_transfers`
- **APIهای درگیر:**
  - `/api/tax/*`, `/api/branches/*`
- **وابستگی‌ها:** تکمیل فازهای ۰ تا ۹.
- **ریسک:** Medium.
- **سختی:** High.
- **تأثیر:** High.
- **اولویت:** **P3 / P4**

---

## ترتیب دقیق و گام‌به‌گام برای شروع اجرای Roadmap (Action Plan)

برای اینکه برنامه‌نویس بدون سردرگمی و بدون ایجاد شکستگی در سیستم کار را جلو ببرد، مراحل دقیقاً باید به این ترتیب اجرا شوند:

```
[ گام ۱ تا ۵: مهار فوری بحران‌های P0 ]
                    │
                    ▼
[ گام ۶ تا ۹: ایجاد زیرساخت آزمون و بهداشت مخزن ]
                    │
                    ▼
[ گام ۱۰ تا ۱۳: ارتقای دیتابیس و اعتبارسنجی‌ها ]
                    │
                    ▼
[ گام ۱۴ تا ۱۶: انطباق موتور حسابداری و انبار ]
                    │
                    ▼
[ گام ۱۷ تا ۲۰: بهینه‌سازی، بکاپ و بازمهندسی نهایی ]
```

1. **ابتدا:** فعال‌سازی Middleware احراز هویت JWT روی روت‌های `/api/data/*` و `/api/database/*` در `server.ts` و `data.routes.ts`.
2. **سپس:** حذف فیلد رمز دومرحله‌ای (`code`) از بدنه Response لاگین در `auth.routes.ts`.
3. **سپس:** درج شرط تراز بودن اجباری بدهکار و بستانکار در متد `addAccountingDocument` در `accountingService.ts`.
4. **سپس:** حذف بارگذاری کل دیتابیس در رم سرور از درون تابع `triggerServerStockSync` در `data.routes.ts`.
5. **سپس:** اصلاح متد `getLocalData` در `coreService.ts` تا در صورت خطای شبکه مقدار پیش‌فرض خالی برنگرداند و پرتاب خطا کند.
6. **سپس:** افزودن گارد ممانعت از صدور حواله خروج با موجودی فیزیکی ناکافی در `stockLogic.ts`.
7. **سپس:** پاکسازی بیش از ۸۰ اسکریپت موقت پایتون (`fix_*.py`) از ریشه پروژه و انتقال اسکریپت‌های حیاتی به `scripts/`.
8. **سپس:** راه‌اندازی Vitest در پروژه، افزودن اسکریپت `"test"` به `package.json` و نوشتن تست توازن سند دوبل.
9. **سپس:** نوشتن تست‌های پوششی پایه برای محاسبات کاردکس، قیمت‌گذاری و سود فاکتور.
10. **سپس:** اعمال کلیدهای خارجی و ایندکس‌های ستون‌های کلیدی در اسکیماهای Drizzle پایگاه داده.
11. **سپس:** کپسوله‌سازی ثبت فاکتور، اسناد انبار و سند مالی در یک تراکنش اتمیک دیتابیس.
12. **سپس:** پیاده‌سازی گارد تغییرناپذیری (Immutability) برای اسناد حسابداری قطعی‌شده.
13. **سپس:** پیاده‌سازی سیستم بهای تمام‌شده واقعی (WAC) و تصحیح محاسبه سود در گزارش فروش.
14. **سپس:** رمزنگاری متقارن فایل‌های پشتیبان با AES-256 قبل از نوشتن روی دیسک.
15. **سپس:** انتقال محاسبات مانده کاردکس کالا به Window Functions کوئری‌های SQL سرور.
16. **سپس:** افزودن Virtualization به جدول لیست فاکتورها و کاردکس کالا در فرانت‌اند با `@tanstack/react-virtual`.
17. **سپس:** استانداردسازی فرم‌های ثبت با Zod و React Hook Form جهت اعتبارسنجی یکپارچه ورودی‌ها.
18. **سپس:** تفکیک هوک ۷,۳۰۰ خطی `useAppController.tsx` به ۴ هوک موضوعی مجزا (`useInvoices`, `useWarehouse`, ...).
19. **سپس:** خروج منطق رندرینگ تب‌ها از هوک و اتصال به کامپوننت‌های روتینگ استاندارد `react-router-dom`.
20. **سپس:** جایگزینی تایپ‌های `any` با تایپ‌های دقیق دامنه‌ای و حرکت به سمت پیاده‌سازی ماژول‌های سامانه مودیان مالیاتی.
