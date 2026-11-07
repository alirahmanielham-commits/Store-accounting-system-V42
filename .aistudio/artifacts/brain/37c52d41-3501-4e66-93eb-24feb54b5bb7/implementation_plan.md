# سیستم جامع یادداشت‌ها و کامنت‌گذاری سازمانی (Universal Entity Comments & Timeline System)

طرح پیاده‌سازی سیستم یکپارچه، امن و بلادرنگ برای ثبت یادداشت‌ها و کامنت‌ها به همراه تاریخ، ساعت شمسی، شناسه کاربری و نام ثبت‌کننده بر روی تمامی بخش‌های کلیدی نرم‌افزار.

---

### وضعیت نهایی: تکمیل و تأیید شد ✅ (Completed & Verified)

> [!IMPORTANT]
> تمامی نیازمندی‌های درخواستی پیاده‌سازی و راستی‌آزمایی شدند:
> - **رابط کاربری**: کشوی کناری (Side Drawer) با انیمیشن مدرن و پنجره خط زمانی (Timeline Modal) فشرده با تاریخ و ساعت دقیق شمسی و مشخصات نویسنده.
> - **سطح دسترسی**: تمامی کاربران احراز هویت‌شده سیستم اجازه ثبت و مشاهده یادداشت‌ها را دارند (با امکان حذف یادداشت توسط خود نویسنده یا مدیر سیستم).
> - **نشانگر در لیست‌ها و جداول**: اضافه شدن نشانگر اختصاصی شمارنده کامنت‌ها (Badge Counter) در ردیف عملیات سریع جداول و کارت‌ها جهت اطلاع آنی از وجود یادداشت برای هر آیتم.

---

### ۱. حوزه شمول (بخش‌های تحت پوشش سیستم کامنت)

1. ✅ **پروفایل اشخاص و مشتریان (`person`)**: پیاده‌سازی شده در `PersonsManager.tsx` و `PersonProfileView.tsx`.
2. ✅ **فاکتورها (`invoice`)**: پیاده‌سازی شده در `InvoicesList.tsx` (نمای جدول و کارت‌ها)، `InvoiceRowActionsDropdown.tsx` و `PreviewModals.tsx`.
3. ✅ **کالاها و محصولات (`product`)**: پیاده‌سازی شده در `ProductsTab.tsx` (ردیف جدول، منوی عملیات کالا و کشوی اختصاصی).
4. ✅ **اسناد حسابداری (`accounting_doc`)**: پیاده‌سازی شده در `AccountingDocsList.tsx` و `AccountingDocView.tsx`.
5. ✅ **رسیدها و تراکنش‌ها (`receipt`)**: پیاده‌سازی شده در `ReceiptsList.tsx` (نمای جدول و کارت‌های موبایل).
6. ✅ **چک‌ها (`check`)**: پیاده‌سازی شده در `ReceivedChecksList.tsx`، `IssuedChecksList.tsx` و `CheckCardPage.tsx`.

---

### ۲. معماری داده و ساختار کامنت (`EntityComment`)

```ts
export interface EntityComment {
  id: string;
  entityType: 'person' | 'invoice' | 'product' | 'accounting_doc' | 'receipt' | 'check';
  entityId: string;
  text: string;
  authorId?: string;
  authorName: string;
  authorRole?: string;
  createdAt: string;
  shamsiDate: string; // تاریخ شمسی (مثال: ۱۴۰۵/۰۸/۱۶)
  timeStr: string;   // ساعت ثانیه‌ای (مثال: ۱۴:۲۵:۱۰)
  storeId?: string;
}
```

- منبع داده: جدول `entity_comments` همراه با ثبت در `KNOWN_TABLES` و موتور پشتیبان‌گیری سیستم.
- همگام‌سازی بلادرنگ: رویداد سفارشی `entity_comments_changed` جهت به‌روزرسانی فوری نشان‌ها بدون نیاز به رفرش صفحه.

---

### ۳. نتایج اعتبارسنجی و تست‌ها
- **تست‌های واحد و یکپارچگی**: ۷۹ تست از ۷۹ تست در ۱۵ فایل آزمون با موفقیت پاس شدند (`vitest run`).
- **کامپایل پروژه (`compile_applet`)**: بیلد کامل پروژه با موفقیت انجام شد.
- **تایپ‌اسکریپت و لینت (`lint_applet`)**: تمامی خطاها برطرف شده و بدون خطا اجرا گردید.
