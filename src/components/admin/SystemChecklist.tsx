import React, { useState, useEffect } from 'react';
import { CheckSquare, Save, CheckCircle2, RefreshCw } from 'lucide-react';
import { motion } from 'motion/react';

const checklistData = [
  {
    id: 'migration',
    title: 'مهاجرت پردازش‌ها به سمت سرور (Server-Side Migration)',
    color: 'rose',
    items: [
      { id: 'mig_1', title: "ایجاد API برای داشبورد تحلیلی", desc: "ایجاد اندپوینت /api/reports/analytical در سرور برای محاسبه متریک‌های داشبورد (فروش کل، ارزش انبار و چارت‌ها).", priority: "high" },
      { id: 'mig_2', title: "ایجاد API برای گزارش انبار", desc: "ایجاد اندپوینت /api/reports/inventory جهت محاسبه ارزش ریالی موجودی‌ها و مغایرت‌ها.", priority: "medium" },
      { id: 'mig_3', title: "ایجاد API برای اشخاص و بدهی‌ها", desc: "ایجاد اندپوینت /api/reports/debts برای محاسبه تراز اشخاص و جمع مطالبات/بدهی‌ها.", priority: "high" },
      { id: 'mig_4', title: "ایجاد API برای حساب کل و تفصیلی", desc: "ایجاد /api/accounting/ledger/:personId برای محاسبه مانده‌گیری در لحظه.", priority: "high" },
      { id: 'mig_5', title: "محاسبه فاکتور در سمت سرور", desc: "انتقال محاسبات مبلغ کل و تخفیفات فاکتور به Backend در زمان ثبت (POST/PUT).", priority: "high" },
      { id: 'mig_6', title: "آپدیت خودکار موجودی انبار در بک‌اند", desc: "آپدیت موجودی و رسید انبار مستقیما درون تراکنش‌های ذخیره فاکتور در سرور.", priority: "high" },
      { id: 'mig_7', title: "تولید خودکار اسناد حسابداری", desc: "ایجاد ردیف‌های بدهکار و بستانکار حسابداری هنگام صدور فاکتور در سمت سرور.", priority: "high" },
      { id: 'mig_8', title: "بهینه‌سازی کوئری‌های SQL", desc: "استفاده از SUM, JOIN, GROUP BY در سرور به جای مپ زدن حلقه‌های طولانی در فرانت‌اند.", priority: "high" }
    ]
  },

  {
    id: 'db',
    title: 'زیرساخت و پایگاه داده (Backend & Database)',
    color: 'blue',
    items: [
      { id: 'db_1', title: "طراحی معماری دیتابیس (SQL/NoSQL)", desc: "طراحی دقیق جداول (اشخاص، کالاها، حساب‌ها، فاکتورها، انبار، چک‌ها، اسناد مالی) با رعایت اصول نرمال‌سازی در PostgreSQL یا معادل آن.", priority: "high" },
      { id: 'db_2', title: "پیاده‌سازی API‌های RESTful/GraphQL", desc: "ایجاد اندپوینت‌های امن برای تمامی عملیات CRUD همراه با مستندسازی Swagger و مدیریت استاتوس کدها.", priority: "high" },
      { id: 'db_3', title: "احراز هویت و امنیت (Auth & Security)", desc: "پیاده‌سازی Login با JWT، رفرش توکن، ورود دو مرحله‌ای (OTP) و هش کردن پسوردها.", priority: "high" },
      { id: 'db_4', title: "مدیریت سطح دسترسی (RBAC/ACL)", desc: "تعریف Roleهای مختلف (مدیر، حسابدار، انباردار، فروشنده) و اعمال دسترسی روی تمام ماژول‌ها.", priority: "high" },
      { id: 'db_5', title: "مدیریت تراکنش‌ها (Database Transactions)", desc: "تضمین ذخیره یکپارچه موجودیت‌های چندگانه (موجودی انبار + فاکتور + سندحسابداری) جهت جلوگیری از مغایرت دیتا.", priority: "high" },
      { id: 'db_6', title: "سیستم کش و بهینه‌سازی (Caching)", desc: "استفاده از Redis برای کش کردن گزارشات سنگین و لیست‌های پایه برای افزایش چشمگیر سرعت لود.", priority: "medium" },
      { id: 'db_7', title: "بکاپ‌گیری و بازیابی ابری (Cloud Backup)", desc: "سرویس Job زمان‌بندی شده برای اکسپورت دیتابیس به صورت روزانه/هفتگی و ارسال به فضای ابری.", priority: "medium" },
      { id: 'db_8', title: "تست‌نویسی جامع (Unit & Integration Tests)", desc: "نوشتن تست‌های خودکار برای منطق‌های کلیدی حسابداری (مثل محاسبه سود/زیان، بالانس بودن اسناد دستی).", priority: "low" }
    ]
  },
  {
    id: 'base',
    title: 'اطلاعات پایه و تعاریف (Base Data)',
    color: 'purple',
    items: [
      { id: 'base_1', title: "ساختار درختی حساب‌ها (کدینگ)", desc: "تعریف گروه حساب، حساب کل، حساب معین و جزئیات تفصیلی (سطح ۴ و ۵ در صورت نیاز).", priority: "high" },
      { id: 'base_2', title: "تعریف انبارهای چندگانه", desc: "قابلیت ایجاد چندین انبار (انبار مرکزی، فروشگاه، ضایعات) و تعیین انبار پیش‌فرض برای کاربران.", priority: "medium" },
      { id: 'base_3', title: "دسته‌بندی ویژگی‌دار کالاها", desc: "تعریف سوپرگروه، زیرگروه و مدل برای کالاها با امکان افزودن لیبل‌ها و تگ‌های دلخواه.", priority: "medium" },
      { id: 'base_4', title: "ثبت کالا با ابعاد تجاری کامل", desc: "بارکد دوبعدی، نقطه سفارش، حداقل موجودی، کد فنی سازنده، ۲ واحد سنجش، و نسبت تبدیل واحدها.", priority: "high" },
      { id: 'base_5', title: "تعریف جامع اشخاص (CRM اولیه)", desc: "مدیریت مشتریان، تامین‌کنندگان و ویزیتورها با ثبت کد ملی، کد اقتصادی، شماره شبا، حد اعتبار نقدی/چکی.", priority: "high" },
      { id: 'base_6', title: "تعریف انواع بازاریاب‌ها و پورسانت‌ها", desc: "ثبت بازاریاب و تعیین درصد یا مبلغ ثابت پورسانت بر اساس گروه‌کالایی یا فاکتور.", priority: "low" },
      { id: 'base_7', title: "ثبت مانده اول دوره جامع", desc: "ثبت موجودی تعدادی انبار، مانده ریالی صندوق/بانک‌ها، چک‌های در جریان، و مانده حساب اشخاص قبل از شروع سیستم.", priority: "high" }
    ]
  },
  {
    id: 'trade',
    title: 'آیتم‌های فاکتور، خرید و فروش (Trade Management)',
    color: 'emerald',
    items: [
      { id: 'trade_1', title: "صدور انواع فرم‌های تجاری", desc: "پیش‌فاکتور (با تاریخ انقضا)، فاکتور فروش رسمی/غیررسمی، فاکتور خرید، مرجوعی فروش و مرجوعی خرید.", priority: "high" },
      { id: 'trade_2', title: "جزئیات حرفه‌ای اقلام فاکتور", desc: "محاسبه ارزش افزوده تفکیک‌شده، تخفیف درصدی و مبلغی به ازای هر کالا، و اضافه کسورات کل فاکتور.", priority: "high" },
      { id: 'trade_3', title: "تخصیص بازاریاب به فاکتور", desc: "امکان انتخاب کاربر بازاریاب روی فاکتور فروش برای محاسبه اتوماتیک پورسانت فروش در پایان دوره.", priority: "medium" },
      { id: 'trade_4', title: "پشتیبانی از سخت‌افزارهای فروشگاهی", desc: "سازگاری کامل فرانت‌اند با بارکداسکنر، دستگاه فیش‌پرینتر، کالاخوان (Price Checker) و ترازو دیجیتال.", priority: "medium" },
      { id: 'trade_5', title: "حواله و رسید انبار مستند", desc: "جدا کردن فرایند مالی (صدور فاکتور) از فرایند فیزیکی (خروج جنس از انبار) با ثبت حواله‌های تفکیک‌شده.", priority: "low" },
      { id: 'trade_6', title: "قیمت‌گذاری پویا و تیپ قیمت", desc: "تعیین لیست قیمت دلخواه نظیر عمده، همکار، مصرف‌کننده و اعمال اتوماتیک روی فاکتور اشخاص.", priority: "medium" },
      { id: 'trade_7', title: "مدیریت نقطه سفارش و هشدارها", desc: "سیستم کنترل اتوماتیک موجودی کالا برای جلوگیری از صدور فاکتور منفی یا اخطار برای کالای رو به اتمام.", priority: "high" }
    ]
  },
  {
    id: 'finance',
    title: 'خزانه‌داری، چک و امور مالی (Treasury & Finance)',
    color: 'rose',
    items: [
      { id: 'fin_1', title: "عملیات دریافت و پرداخت نقدی", desc: "ثبت رسیدهای دریافت/پرداخت با امکان انتخاب حساب بانکی، صندوق، یا دستگاه کارت‌خوان مشخص.", priority: "high" },
      { id: 'fin_2', title: "تسویه فاکتور چندگانه", desc: "امکان تسویه یک فاکتور از طریق ترکیبی از نقد، چک، کارتخوان و تخفیف نقدی روی یک فرم تسویه.", priority: "high" },
      { id: 'fin_3', title: "مدیریت جامع چرخه چک‌های دریافتی", desc: "ثبت، واگذاری به بانک (خواباندن چک)، وصول، برگشت چک، مسترد کردن به مشتری یا خرج کردن به شخص ثالث.", priority: "high" },
      { id: 'fin_4', title: "مدیریت اسناد و چک‌های پرداختی", desc: "صدور چک پرداختی، پاس شدن چک در بانک، عودت چک پرداخت شده یا ابطال چک.", priority: "medium" },
      { id: 'fin_5', title: "ارتباط با کارت‌خوان‌ها (PC-POS)", desc: "همگام‌سازی فاکتور نرم‌افزار با دستگاه کارت‌خوان روی میز صندوق‌دار برای جلوگیری از خطای ورود مبلغ.", priority: "low" },
      { id: 'fin_6', title: "ثبت اسناد دستی (ژورنال)", desc: "فرم مخصوص حسابداران سنتی برای نوشتن آرتیکل‌های حسابداری بدهکار و بستانکار جهت اصلاح حساب‌ها.", priority: "high" },
      { id: 'fin_7', title: "مدیریت اقساط و دفترچه اقساط", desc: "قابلیت تقسیط بدهی فاکتور فروش، محاسبه فرمول سود فروش قسطی، و چاپ دفترچه پرداخت با سررسیدها.", priority: "medium" }
    ]
  },
  {
    id: 'hr',
    title: 'مدیریت حقوق، دستمزد و منابع انسانی (HR)',
    color: 'pink',
    items: [
      { id: 'hr_1', title: "پرونده پرسنلی", desc: "مدیریت قراردادها، حقوق پایه، ساعت کاری و بیمه پرسنل مجموعه با محاسبه روزهای کارکرد.", priority: "medium" },
      { id: 'hr_2', title: "ایجاد لیست حقوق (Payroll)", desc: "صدور دوره‌ای فیش حقوقی با امکان محاسبه اضافه‌کار، کسر بیمه و مالیات، مساعده، و پاداش‌ها اتوماتیک.", priority: "high" },
      { id: 'hr_3', title: "صدور سند حسابداری حقوق", desc: "نگهداشتن هزینه حقوق پرداختی در سرفصل هزینه‌های جاری و ثبت بستانکاری در حساب کارمند به صورت خودکار.", priority: "high" },
      { id: 'hr_4', title: "مساعده و وام کارکنان", desc: "پرداخت وام/مساعده و لحاظ کردن فرمول کسر اقساط وام در فیش حقوقی ماه‌های آینده کارمندان.", priority: "low" }
    ]
  },
  {
    id: 'reports',
    title: 'گزارشات مدیریتی، مالیاتی و نمودارها (Reports)',
    color: 'amber',
    items: [
      { id: 'rep_1', title: "گزارش سود و زیان دقیق", desc: "نمایش سود ناخالص و خالص در بازه تاریخ انتخابی با تفکیک هزینه‌ها با قابلیت‌های میانگین قیمت خرید کالاها.", priority: "high" },
      { id: 'rep_2', title: "ترازنامه، تراز آزمایشی و دفاتر", desc: "دریافت خروجی ترازنامه‌های استاندارد حسابداری شامل تراز دو، چهار و شش ستونه برای تاییدیه مالیاتی.", priority: "high" },
      { id: 'rep_3', title: "صورتحساب و صورت‌وضعیت اشخاص", desc: "ریز کامل از تمامی تراکنش‌های یک شخص مشخص شامل خرید، فروش، برگشتی‌ها، پرداختی‌ها و دریافتی‌ها.", priority: "high" },
      { id: 'rep_4', title: "کاردکس موجودی و ریالی انبار", desc: "تاریخچه ورود و خروج مقداری کالاها (رسید و حواله) به همراه محاسبات ریالی موجودی انبارها.", priority: "high" },
      { id: 'rep_5', title: "گزارشات مرور فروش و پرفروش‌ترین‌ها", desc: "تحلیل سریع‌ترین کالاهای در حال گردش، مشتریان برتر (VIP)، بازاریابان برتر و رکود کالاها.", priority: "medium" },
      { id: 'rep_6', title: "گزارش مالیات بر ارزش افزوده (TTMS)", desc: "اکسپورت قالب اختصاصی و مورد تایید نرم‌افزار دارایی برای گزارشات فصلی مالیاتی خرید و فروش.", priority: "medium" },
      { id: 'rep_7', title: "داشبورد تحلیلی و نمودارها", desc: "داشبورد مرکزی دارای گراف خطی فروش، چارت دایره‌ای تفکیک هزینه‌ها، و جدول چک‌های سررسید نزدیک.", priority: "high" }
    ]
  },
  {
    id: 'ux',
    title: 'توسعه تجربه کاربری و امکانات سیستم (UX Engine & Tools)',
    color: 'cyan',
    items: [
      { id: 'ux_1', title: "ابزار چاپ پیشرفته (Print Studio)", desc: "سیستم تولید PDF در برگه A4، A5 و قالب فیش پرینتر رولی به صورت اتوماتیک برای تمامی فرم‌ها و فاکتورها.", priority: "high" },
      { id: 'ux_2', title: "خروجی اطلاعات (Excel/CSV Export)", desc: "کلیدهای گرفتن اکسپورت اکسل از دیتاتیل‌ها نظیر لیست اشخاص، لیست محصولات یا گزارشات با استایل تمیز.", priority: "high" },
      { id: 'ux_3', title: "جستجوگر کالاها با PWA", desc: "بهینه‌سازی وب‌اپلیکیشن برای نصب روی گوشی (PWA) تا فروشندگان با دوربین موبایل بارکد کالا را استعلام بگیرند.", priority: "low" },
      { id: 'ux_4', title: "کلیدهای میانبر در فرم‌ها (Hotkeys)", desc: "ذخیره فاکتور با (Ctrl+S)، شخص حدید با (F3) جهت کار سریع‌تر اپراتوری که تسلط روی کیبورد دارد.", priority: "medium" },
      { id: 'ux_5', title: "عملیات بستن پایان سال مالی (Closing)", desc: "جابجایی مانده حساب‌های تفکیک شده، صفر کردن حساب‌های موقت(درآمد/هزینه)، صدور اتوماتیک اسناد اختتامیه و افتتاحیه.", priority: "high" },
      { id: 'ux_6', title: "اطلاع‌رسانی پیامکی (SMS Gateway)", desc: "اتصال به پنل پیامکی برای ارسال اتوماتیک متن فاکتور خرید برای مشتری یا یادآوری تسویه فاکتور و سررسید چک.", priority: "medium" },
      { id: 'ux_7', title: "امضای دیجیتال و لوگوی سربرگ", desc: "آپلود کردن تصویر شخصی برای چاپ روی سربرگ اسناد، امضای دیجیتال برای مدیر و استامپ پای فرم‌ها.", priority: "low" },
      { id: 'ux_8', title: "شخصی‌سازی فرم‌ها و منوها (Customization)", desc: "امکان تغییر رنگ‌بندی تم سیستم توسط کاربر، تنظیم منوهای دلخواه در صفحه داشبورد برای دسترسی سریع.", priority: "low" },
      { id: 'ux_9', title: "همگام‌سازی ابری و آفلاین (Offline Sync)", desc: "ذخیره تغییرات در صورت قطعی اینترنت در مرورگر و سینک کردن اتوماتیک ریکوئست‌ها پس از اتصال مجدد.", priority: "high" }
    ]
  },
  {
    id: 'req_new',
    title: 'موارد و نیازمندی‌های جدید کاربر (User Request)',
    color: 'amber',
    items: [
      { id: 'req_1', title: "جستجوی جامع اشخاص", desc: "در انتخاب نام مشتری یا شخص در همه فرم‌ها، جستجو بر اساس نام، شماره همراه، کد ملی و کد شخص امکان‌پذیر باشد.", priority: "high" },
      { id: 'req_2', title: "نمایش حروف و فرمت مبالغ", desc: "در زمان تایپ مبلغ در همه فرم‌ها، فرمت‌بندی مبالغ (جداکننده هزارگان) و همچنین حروف مبلغ به صورت خودکار نوشته شود.", priority: "high" },
      { id: 'req_3', title: "تاییدیه عملیات‌های حساس", desc: "در زمان انجام عملیات مهم نظیر ثبت، حذف و ویرایش اطلاعات در تمامی فرم‌ها یک پیام تایید (Confirm) از کاربر دریافت گردد.", priority: "high" },
      { id: 'req_4', title: "ثبت سابقه قیمتی کالا", desc: "با توجه به فاکتورهای خرید و فاکتورهای فروش، برای هر کالا تاریخچه و سابقه قیمتی آن ثبت و نگهداری شود.", priority: "high" },
      { id: 'req_5', title: "نمایش کارت کالا و سوابق", desc: "کارت کالا طراحی شود که علاوه بر نمایش مشخصات کامل کالا، تمام سوابق و فعالیت‌های مربوط به آن بررسی و نمایش داده شود.", priority: "high" },
      { id: 'req_6', title: "مدیریت لیست قیمت‌ها", desc: "قابلیت ثبت و به‌روزرسانی لیست قیمت برای کالاها به‌صورت تکی و گروهی/دسته‌بندی (اعلام تغییر درصدی یا مبلغی ثابت) وجود داشته باشد.", priority: "high" },
      { id: 'req_7', title: "ثبت اطلاعات تکمیلی اشخاص", desc: "فرمی طراحی گردد تا بتوان اطلاعات اضافی برای اشخاص اعم از شماره حساب، شماره کارت، آدرس‌های متعدد و ... را ثبت کرد.", priority: "high" },
      { id: 'req_8', title: "مدیریت دریافت و پرداخت چکی و دسته چک", desc: "بخش مدیریت دسته چک‌ها اضافه گردد و امکان دریافت و یا پرداخت مبالغ به‌صورت چکی فراهم شود.", priority: "high" },
      { id: 'req_9', title: "انتقال وجه بین سرفصل‌ها", desc: "امکان انتقال منابع مالی (مبالغ) بین حساب‌های بانکی، صندوق‌ها و افراد مجموعه وجود داشته باشد.", priority: "high" }
    ]
  },
  {
    id: 'sys_verification',
    title: 'بررسی و صحت‌سنجی عملکرد سیستم',
    color: 'emerald',
    items: [
      { id: 'ver_1', title: "صحت ثبت و ویرایش اشخاص", desc: "بررسی کامل صحت اطلاعات ثبتی اشخاص، امکان ویرایش صحیح تمامی فیلدها و عدم حذف فیزیکی شخص در صورت داشتن سند مالی.", priority: "high" },
      { id: 'ver_2', title: "تاثیر صحیح دریافت و پرداخت‌ها", desc: "بررسی تاثیر مستقیم و صحیح اسناد دریافت و پرداخت بر حساب اشخاص و صدور خودکار سند حسابداری تراز و بی‌نقص.", priority: "high" },
      { id: 'ver_3', title: "عملکرد صحیح فاکتورها", desc: "بررسی صحت عملکرد فاکتورهای خرید و فروش در محاسبه مبالغ و تخفیفات.", priority: "high" },
      { id: 'ver_4', title: "صدور صحیح اسناد مرتبط با فاکتور", desc: "ایجاد صحیح و خودکار اسناد حسابداری فروش/خرید و حواله/رسید انبار در هنگام تایید فاکتور.", priority: "high" },
      { id: 'ver_5', title: "صحت اسناد انبار", desc: "بررسی صدور صحیح اسناد فیزیکی انبار (رسید و حواله) متناسب با عملیات فاکتور و بررسی صحت موجودی مقداری کالا.", priority: "high" },
      { id: 'ver_6', title: "ممنوعیت حذف فیزیکی (Soft Delete)", desc: "هیچ موجودیت اصلی (شخص، کالا، فاکتور، سند) که با بخش‌های دیگر ارتباط دارد به صورت فیزیکی حذف نگردد.", priority: "high" },
      { id: 'ver_7', title: "جلوگیری از حذف فاکتور و اسناد دارای ارتباط", desc: "فاکتورها و اسنادی که حواله/رسید انبار یا سند حسابداری برایشان صادر شده به هیچ عنوان قابل حذف نباشند.", priority: "high" },
      { id: 'ver_8', title: "تاییدیه و لاگ ویرایش اسناد", desc: "در صورت ویرایش فاکتور یا سند، حتما از کاربر تاییدیه گرفته شود، اثرات آن در بخش‌های مرتبط آپدیت شود و در لاگ سیستم ثبت گردد.", priority: "high" },
      { id: 'ver_9', title: "پروفایل کاربر و خروج خودکار", desc: "امکان ویرایش اطلاعات پروفایل، اتصال به شخص در سیستم و خروج خودکار کاربر پس از زمان قابل تنظیم در صورت عدم فعالیت.", priority: "high" }
    ]
  }
];

export default function SystemChecklist() {
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [showSavedMsg, setShowSavedMsg] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('system-checklist');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Ensure the newly verified items are checked off if they haven't been recorded yet
        const verifiedItems = ['ver_1', 'ver_2', 'ver_3', 'ver_4', 'ver_5', 'ver_6', 'ver_7', 'ver_8', 'ver_9'];
        let updated = false;
        verifiedItems.forEach(id => {
          if (parsed[id] === undefined) {
            parsed[id] = true;
            updated = true;
          }
        });
        setCheckedItems(parsed);
        if (updated) {
          localStorage.setItem('system-checklist', JSON.stringify(parsed));
        }
      } catch(e) {}
    } else {
      // If no saved checklist, set the verified ones to true
      const initialChecked: Record<string, boolean> = {};
      const verifiedItems = ['ver_1', 'ver_2', 'ver_3', 'ver_4', 'ver_5', 'ver_6', 'ver_7', 'ver_8', 'ver_9'];
      verifiedItems.forEach(id => {
        initialChecked[id] = true;
      });
      setCheckedItems(initialChecked);
      localStorage.setItem('system-checklist', JSON.stringify(initialChecked));
    }
  }, []);

  const toggleCheck = (id: string) => {
    setCheckedItems(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleSave = () => {
    setIsSaving(true);
    setTimeout(() => {
      localStorage.setItem('system-checklist', JSON.stringify(checkedItems));
      setIsSaving(false);
      setShowSavedMsg(true);
      setTimeout(() => setShowSavedMsg(false), 3000);
    }, 600);
  };

  const calculateProgress = () => {
    const totalItems = checklistData.reduce((sum, category) => sum + category.items.length, 0);
    const checkedCount = Object.values(checkedItems).filter(Boolean).length;
    return Math.round((checkedCount / totalItems) * 100) || 0;
  };

  let globalIndex = 0;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden max-w-5xl mx-auto"
      dir="rtl"
    >
      <div className="bg-gradient-to-r from-teal-50 to-emerald-50 px-6 py-8 border-b border-teal-100 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="bg-teal-500 text-white p-3 rounded-2xl shadow-sm shadow-teal-200">
            <CheckSquare className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-xl md:text-2xl font-black text-teal-950">چک‌لیست جامع سیستم حسابداری فروشگاهی</h2>
            <p className="text-xs md:text-sm font-semibold text-teal-700 mt-1">مراحل و نیازمندی‌های دقیق و ریز برای توسعه یک نرم‌افزار حسابداری کامل و بدون نقص</p>
          </div>
        </div>
        
        <div className="flex flex-col items-center sm:items-end gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-teal-800">پیشرفت:</span>
            <div className="w-32 h-3 bg-teal-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-teal-500 transition-all duration-500" 
                style={{ width: `${calculateProgress()}%` }}
              ></div>
            </div>
            <span className="text-xs font-black text-teal-900 border border-teal-200 px-2 py-0.5 rounded-md bg-white">% {calculateProgress()}</span>
          </div>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white rounded-xl flex items-center justify-center gap-2 transition-all shadow-sm font-bold w-full md:w-auto"
          >
            {isSaving ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : showSavedMsg ? (
              <CheckCircle2 className="w-4 h-4" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {isSaving ? 'در حال ثبت...' : showSavedMsg ? 'با موفقیت ثبت شد!' : 'ذخیره تغییرات و پیشرفت'}
          </button>
        </div>
      </div>
      
      <div className="p-6 md:p-8 space-y-10">
        {checklistData.map((category, catIdx) => {
          const colorClass = category.color;

          let catColor = "";
          let focusColor = "";
          let hoverText = "";
          
          if (colorClass === 'blue') { catColor = "bg-blue-100 text-blue-700"; focusColor = "text-blue-600 focus:ring-blue-500"; hoverText = "group-hover:text-blue-700"; }
          if (colorClass === 'purple') { catColor = "bg-purple-100 text-purple-700"; focusColor = "text-purple-600 focus:ring-purple-500"; hoverText = "group-hover:text-purple-700"; }
          if (colorClass === 'emerald') { catColor = "bg-emerald-100 text-emerald-700"; focusColor = "text-emerald-600 focus:ring-emerald-500"; hoverText = "group-hover:text-emerald-700"; }
          if (colorClass === 'rose') { catColor = "bg-rose-100 text-rose-700"; focusColor = "text-rose-600 focus:ring-rose-500"; hoverText = "group-hover:text-rose-700"; }
          if (colorClass === 'pink') { catColor = "bg-pink-100 text-pink-700"; focusColor = "text-pink-600 focus:ring-pink-500"; hoverText = "group-hover:text-pink-700"; }
          if (colorClass === 'amber') { catColor = "bg-amber-100 text-amber-700"; focusColor = "text-amber-600 focus:ring-amber-500"; hoverText = "group-hover:text-amber-700"; }
          if (colorClass === 'cyan') { catColor = "bg-cyan-100 text-cyan-700"; focusColor = "text-cyan-600 focus:ring-cyan-500"; hoverText = "group-hover:text-cyan-700"; }

          return (
            <div key={category.id}>
              <div className="flex items-center justify-between border-b-2 border-gray-100 pb-3 mb-5">
                <h3 className="text-lg font-black text-gray-800 flex items-center gap-2">
                  <span className={`w-8 h-8 rounded-full ${catColor} flex items-center justify-center text-sm`}>
                    {catIdx + 1}
                  </span>
                  {category.title}
                </h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {category.items.map((item) => {
                  globalIndex++;
                  const isChecked = checkedItems[item.id] || false;
                  
                  return (
                    <div 
                      key={item.id} 
                      onClick={() => toggleCheck(item.id)}
                      className={`flex items-start gap-3 p-3.5 rounded-xl border transition-all shadow-sm group cursor-pointer ${
                        isChecked 
                          ? 'border-emerald-300 bg-emerald-50/60' 
                          : 'border-gray-200 bg-gray-50/50 hover:bg-white hover:border-gray-300'
                      }`}
                    >
                      <input 
                        type="checkbox" 
                        checked={isChecked}
                        onChange={() => toggleCheck(item.id)}
                        onClick={e => e.stopPropagation()} 
                        className={`mt-1 w-5 h-5 rounded border-gray-300 cursor-pointer ${focusColor}`} 
                      />
                      <div className={`flex-1 ${isChecked ? 'opacity-70 line-through' : ''}`}>
                        <div className="flex items-center justify-between mb-1">
                          <h4 className={`font-extrabold text-[13px] transition-colors ${isChecked ? 'text-gray-500' : 'text-gray-800 ' + hoverText}`}>
                            <span className="text-gray-400 font-normal ml-1">{globalIndex}.</span> {item.title}
                          </h4>
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md border text-center min-w-[70px] ${
                            item.priority === 'high' ? 'bg-red-50 text-red-600 border-red-200' : 
                            item.priority === 'medium' ? 'bg-orange-50 text-orange-600 border-orange-200' : 
                            'bg-slate-100 text-slate-600 border-slate-200'
                          }`}>
                            {item.priority === 'high' ? 'بالا/فوری' : item.priority === 'medium' ? 'اولویت متوسط' : 'اولویت پایین'}
                          </span>
                        </div>
                        <p className={`text-[11px] font-medium leading-relaxed ${isChecked ? 'text-gray-400' : 'text-gray-500'}`}>
                          {item.desc}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
