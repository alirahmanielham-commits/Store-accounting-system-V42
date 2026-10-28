/**
 * Quick Code (2-Digit Shortcut) Service
 * Allows lightning-fast navigation and action execution throughout the application
 * with fully customizable 2-digit codes and local persistence.
 */

export type QuickCodeType = 'tab' | 'action';

export type QuickCodeCategory = 
  | 'core'
  | 'invoices' 
  | 'treasury' 
  | 'inventory' 
  | 'persons' 
  | 'accounting' 
  | 'messaging' 
  | 'reports' 
  | 'tools' 
  | 'settings';

export interface QuickCodeItem {
  id: string;
  code: string; // 2-digit string ("00" - "99")
  defaultCode: string;
  title: string;
  description: string;
  category: QuickCodeCategory;
  type: QuickCodeType;
  target: string;
  iconName: string;
  enabled: boolean;
  isCustom?: boolean;
}

export const CATEGORY_LABELS: Record<QuickCodeCategory, string> = {
  core: 'اصلی و پیشخوان',
  invoices: 'فاکتورها و بازرگانی',
  treasury: 'خزانه، چک و بانک',
  inventory: 'کالا، خدمات و انبار',
  persons: 'طرف‌حساب‌ها و اشخاص',
  accounting: 'حسابداری و اسناد',
  messaging: 'پیامک و اطلاع‌رسانی',
  reports: 'گزارشات و تحلیل',
  tools: 'ابزارها و میانبرها',
  settings: 'تنظیمات سیستم',
};

export const DEFAULT_QUICK_CODES: QuickCodeItem[] = [
  // Core & Dashboard
  {
    id: 'dashboard',
    code: '10',
    defaultCode: '10',
    title: 'پیشخوان و داشبورد اصلی',
    description: 'انتقال به صفحه اصلی و پیشخوان سیستم',
    category: 'core',
    type: 'tab',
    target: 'welcome_page',
    iconName: 'LayoutDashboard',
    enabled: true,
  },

  // Invoices & Commercial
  {
    id: 'sale_invoices_list',
    code: '20',
    defaultCode: '20',
    title: 'لیست فاکتورهای فروش',
    description: 'مشاهده لیست تمام فاکتورهای فروش ثبت‌شده',
    category: 'invoices',
    type: 'tab',
    target: 'list_sale',
    iconName: 'ShoppingCart',
    enabled: true,
  },
  {
    id: 'purchase_invoices_list',
    code: '21',
    defaultCode: '21',
    title: 'لیست فاکتورهای خرید',
    description: 'مشاهده لیست تمام فاکتورهای خرید ثبت‌شده',
    category: 'invoices',
    type: 'tab',
    target: 'list_purchase',
    iconName: 'ShoppingBag',
    enabled: true,
  },
  {
    id: 'new_sale_invoice',
    code: '22',
    defaultCode: '22',
    title: 'صدور فاکتور فروش جدید',
    description: 'باز کردن فرم صدور فاکتور فروش کالا و خدمات',
    category: 'invoices',
    type: 'tab',
    target: 'create_sale',
    iconName: 'FilePlus',
    enabled: true,
  },
  {
    id: 'new_purchase_invoice',
    code: '23',
    defaultCode: '23',
    title: 'صدور فاکتور خرید جدید',
    description: 'باز کردن فرم صدور فاکتور خرید کالا',
    category: 'invoices',
    type: 'tab',
    target: 'create_purchase',
    iconName: 'PackagePlus',
    enabled: true,
  },
  {
    id: 'sale_return_invoice',
    code: '25',
    defaultCode: '25',
    title: 'ثبت برگشت از فروش',
    description: 'فرم صدور فاکتور برگشت از فروش کالا',
    category: 'invoices',
    type: 'tab',
    target: 'create_sale_return',
    iconName: 'RotateCcw',
    enabled: true,
  },
  {
    id: 'purchase_return_invoice',
    code: '26',
    defaultCode: '26',
    title: 'ثبت برگشت از خرید',
    description: 'فرم صدور فاکتور برگشت از خرید کالا',
    category: 'invoices',
    type: 'tab',
    target: 'create_purchase_return',
    iconName: 'RotateCw',
    enabled: true,
  },
  {
    id: 'sale_return_list',
    code: '27',
    defaultCode: '27',
    title: 'لیست برگشت از فروش',
    description: 'مشاهده لیست فاکتورهای مرجوعی فروش',
    category: 'invoices',
    type: 'tab',
    target: 'list_sale_return',
    iconName: 'FileText',
    enabled: true,
  },
  {
    id: 'new_consignment_invoice',
    code: '24',
    defaultCode: '24',
    title: 'صدور فاکتور امانی جدید',
    description: 'فرم ثبت کالای امانی پرداختی به دیگران یا دریافتی از تامین‌کنندگان',
    category: 'invoices',
    type: 'tab',
    target: 'create_consignment',
    iconName: 'ShieldPlus',
    enabled: true,
  },
  {
    id: 'purchase_return_list',
    code: '28',
    defaultCode: '28',
    title: 'لیست برگشت از خرید',
    description: 'مشاهده لیست فاکتورهای مرجوعی خرید',
    category: 'invoices',
    type: 'tab',
    target: 'list_purchase_return',
    iconName: 'FileCheck',
    enabled: true,
  },
  {
    id: 'consignment_invoices_list',
    code: '29',
    defaultCode: '29',
    title: 'لیست فاکتورهای امانی کالا',
    description: 'مشاهده کارتابل و لیست اسناد امانت پرداختی و دریافتی',
    category: 'invoices',
    type: 'tab',
    target: 'list_consignment',
    iconName: 'ShieldCheck',
    enabled: true,
  },

  // Treasury, Receipts & Checks
  {
    id: 'receive_receipts_list',
    code: '30',
    defaultCode: '30',
    title: 'لیست رسیدهای دریافت',
    description: 'مشاهده سوابق و لیست دریافتی‌های وجه',
    category: 'treasury',
    type: 'tab',
    target: 'list_receive_receipt',
    iconName: 'ArrowDownLeft',
    enabled: true,
  },
  {
    id: 'new_receive_receipt',
    code: '31',
    defaultCode: '31',
    title: 'ثبت رسید دریافت وجه جدید',
    description: 'فرم ثبت دریافت وجه، واریز بانکی یا پوز',
    category: 'treasury',
    type: 'tab',
    target: 'create_receive_receipt',
    iconName: 'PlusCircle',
    enabled: true,
  },
  {
    id: 'new_pay_receipt',
    code: '32',
    defaultCode: '32',
    title: 'ثبت رسید پرداخت وجه جدید',
    description: 'فرم ثبت پرداخت وجه و خروج نقدینگی',
    category: 'treasury',
    type: 'tab',
    target: 'create_pay_receipt',
    iconName: 'MinusCircle',
    enabled: true,
  },
  {
    id: 'received_checks',
    code: '33',
    defaultCode: '33',
    title: 'مدیریت چک‌های دریافتی',
    description: 'مشاهده و عملیات روی چک‌های دریافتی مشتریان',
    category: 'treasury',
    type: 'tab',
    target: 'received_checks_page',
    iconName: 'CheckSquare',
    enabled: true,
  },
  {
    id: 'issued_checks',
    code: '34',
    defaultCode: '34',
    title: 'مدیریت چک‌های پرداختی',
    description: 'مشاهده و پاس کردن چک‌های صادره به تامین‌کنندگان',
    category: 'treasury',
    type: 'tab',
    target: 'issued_checks_page',
    iconName: 'CreditCard',
    enabled: true,
  },
  {
    id: 'pay_receipts_list',
    code: '35',
    defaultCode: '35',
    title: 'لیست رسیدهای پرداخت',
    description: 'مشاهده سوابق و اسناد پرداختی سیستم',
    category: 'treasury',
    type: 'tab',
    target: 'list_pay_receipt',
    iconName: 'ArrowUpRight',
    enabled: true,
  },
  {
    id: 'new_receive_check',
    code: '36',
    defaultCode: '36',
    title: 'ثبت چک دریافتی جدید',
    description: 'فرم ورود اطلاعات صیادی چک دریافتی',
    category: 'treasury',
    type: 'tab',
    target: 'receive_check_form',
    iconName: 'Plus',
    enabled: true,
  },
  {
    id: 'new_issue_check',
    code: '37',
    defaultCode: '37',
    title: 'ثبت چک پرداختی جدید',
    description: 'فرم صدور چک پرداختی صیادی',
    category: 'treasury',
    type: 'tab',
    target: 'issue_check_form',
    iconName: 'PenTool',
    enabled: true,
  },
  {
    id: 'bank_accounts_cashboxes',
    code: '38',
    defaultCode: '38',
    title: 'حساب‌های بانکی و صندوق‌ها',
    description: 'مدیریت حساب‌ها، کارتخوان‌ها و صندوق‌ها',
    category: 'treasury',
    type: 'tab',
    target: 'accounts',
    iconName: 'Landmark',
    enabled: true,
  },
  {
    id: 'keyboard_receipt',
    code: '39',
    defaultCode: '39',
    title: 'ثبت سریع رسید با کیبورد',
    description: 'ثبت بدون ماوس دریافت، پرداخت و حواله بین‌اشخاص با کلیدهای میانبر کیبورد',
    category: 'treasury',
    type: 'tab',
    target: 'keyboard_receipt',
    iconName: 'Zap',
    enabled: true,
  },

  // Products & Inventory
  {
    id: 'products_list',
    code: '40',
    defaultCode: '40',
    title: 'لیست کالاها و خدمات',
    description: 'مشاهده کاتالوگ و مدیریت موجودی و قیمت کالاها',
    category: 'inventory',
    type: 'tab',
    target: 'products',
    iconName: 'Box',
    enabled: true,
  },
  {
    id: 'new_product_modal',
    code: '41',
    defaultCode: '41',
    title: 'تعریف کالای جدید',
    description: 'باز کردن پنجره تعریف کالا یا خدمات جدید',
    category: 'inventory',
    type: 'action',
    target: 'action_new_product',
    iconName: 'PackagePlus',
    enabled: true,
  },
  {
    id: 'warehouses_view',
    code: '42',
    defaultCode: '42',
    title: 'انبارها و موجودی ریالی',
    description: 'مدیریت انبارهای فیزیکی و کاردکس موجودی',
    category: 'inventory',
    type: 'tab',
    target: 'warehouses',
    iconName: 'Warehouse',
    enabled: true,
  },
  {
    id: 'stocktaking_view',
    code: '43',
    defaultCode: '43',
    title: 'انبارگردانی سریع بارکدی',
    description: 'شمارش موجودی واقعی و ثبت مغایرت انبار',
    category: 'inventory',
    type: 'tab',
    target: 'stocktaking',
    iconName: 'Barcode',
    enabled: true,
  },
  {
    id: 'quick_price_inquiry',
    code: '44',
    defaultCode: '44',
    title: 'استعلام سریع قیمت کالا',
    description: 'جستجو و استعلام آنی قیمت فروش و خرید کالا',
    category: 'inventory',
    type: 'tab',
    target: 'quick_price_inquiry',
    iconName: 'Tag',
    enabled: true,
  },

  // Persons & CRM
  {
    id: 'persons_list',
    code: '50',
    defaultCode: '50',
    title: 'طرف‌حساب‌ها و اشخاص',
    description: 'مدیریت مشتریان، تامین‌کنندگان و همکاران',
    category: 'persons',
    type: 'tab',
    target: 'persons',
    iconName: 'Users',
    enabled: true,
  },
  {
    id: 'new_person_modal',
    code: '51',
    defaultCode: '51',
    title: 'ثبت طرف‌حساب جدید',
    description: 'باز کردن پنجره تعریف مشتری یا تامین‌کننده جدید',
    category: 'persons',
    type: 'action',
    target: 'action_new_person',
    iconName: 'UserPlus',
    enabled: true,
  },
  {
    id: 'rent_contracts_view',
    code: '52',
    defaultCode: '52',
    title: 'قراردادهای اجاره و املاک',
    description: 'مدیریت قراردادهای اجاره و تعهدات دوره‌ای',
    category: 'persons',
    type: 'tab',
    target: 'rent_contracts',
    iconName: 'FileContract',
    enabled: true,
  },
  {
    id: 'person_ledger_view',
    code: '53',
    defaultCode: '53',
    title: 'صورت‌حساب و گردش اشخاص',
    description: 'مشاهده ریز بدهی و بستانکاری طرف‌حساب‌ها',
    category: 'persons',
    type: 'tab',
    target: 'person_ledger',
    iconName: 'BookOpen',
    enabled: true,
  },

  // Messaging & SMS
  {
    id: 'sms_center',
    code: '60',
    defaultCode: '60',
    title: 'مرکز پیامک و پیام‌ها',
    description: 'مشاهده پیامک‌های ارسالی، صف ارسال و الگوها',
    category: 'messaging',
    type: 'tab',
    target: 'sms_messages',
    iconName: 'MessageSquare',
    enabled: true,
  },
  {
    id: 'send_sms_modal',
    code: '61',
    defaultCode: '61',
    title: 'ارسال پیامک جدید',
    description: 'باز کردن پنجره نگارش و ارسال آنی پیامک',
    category: 'messaging',
    type: 'action',
    target: 'action_send_sms',
    iconName: 'Send',
    enabled: true,
  },

  // Reports
  {
    id: 'financial_reports',
    code: '70',
    defaultCode: '70',
    title: 'داشبورد گزارشات مالی',
    description: 'گزارش سود و زیان، تراز و نقدینگی',
    category: 'reports',
    type: 'tab',
    target: 'financial_report',
    iconName: 'TrendingUp',
    enabled: true,
  },
  {
    id: 'sales_report_view',
    code: '71',
    defaultCode: '71',
    title: 'گزارش تحلیلی فروش',
    description: 'آمار فروش دوره‌ای و مقایسه‌ای',
    category: 'reports',
    type: 'tab',
    target: 'sales_report',
    iconName: 'BarChart2',
    enabled: true,
  },
  {
    id: 'kardex_report_view',
    code: '72',
    defaultCode: '72',
    title: 'گزارش کاردکس کالا',
    description: 'گردش مقداری و ریالی اقلام انبار',
    category: 'reports',
    type: 'tab',
    target: 'kardex',
    iconName: 'Layers',
    enabled: true,
  },
  {
    id: 'accounting_docs',
    code: '75',
    defaultCode: '75',
    title: 'دفاتر و اسناد دوبل حسابداری',
    description: 'دفتر روزنامه، کل و تراز آزمایشی',
    category: 'accounting',
    type: 'tab',
    target: 'accounting_docs_list',
    iconName: 'FileSpreadsheet',
    enabled: true,
  },

  // Quick Tools & Actions
  {
    id: 'calculator_action',
    code: '80',
    defaultCode: '80',
    title: 'ماشین حساب سریع',
    description: 'باز کردن ماشین حساب شناور سیستم',
    category: 'tools',
    type: 'action',
    target: 'action_calculator',
    iconName: 'Calculator',
    enabled: true,
  },
  {
    id: 'barcode_scanner_action',
    code: '81',
    defaultCode: '81',
    title: 'اسکنر بارکد شناور',
    description: 'باز کردن پنجره اسکن دوربین/بارکدخوان',
    category: 'tools',
    type: 'action',
    target: 'action_scanner',
    iconName: 'ScanLine',
    enabled: true,
  },
  {
    id: 'sync_backup_action',
    code: '88',
    defaultCode: '88',
    title: 'پشتیبان‌گیری و همگام‌سازی',
    description: 'باز کردن وضعیت همگام‌سازی و پشتیبان ابری',
    category: 'tools',
    type: 'action',
    target: 'action_sync',
    iconName: 'RefreshCw',
    enabled: true,
  },

  // System Settings
  {
    id: 'system_settings',
    code: '90',
    defaultCode: '90',
    title: 'تنظیمات کلی سیستم',
    description: 'مشاهده و پیکربندی پارامترهای جامع نرم‌افزار',
    category: 'settings',
    type: 'tab',
    target: 'settings',
    iconName: 'Settings',
    enabled: true,
  },
  {
    id: 'quick_codes_settings',
    code: '91',
    defaultCode: '91',
    title: 'مدیریت کدهای دسترسی سریع',
    description: 'پیکربندی و ویرایش کدهای ۲ رقمی کیبورد',
    category: 'settings',
    type: 'tab',
    target: 'settings_quick_codes',
    iconName: 'Keyboard',
    enabled: true,
  },
];

const STORAGE_KEY = 'system_quick_codes_v1';
const QUICK_CODES_EVENT = 'system_quick_codes_updated';

/**
 * Normalizes Persian, Arabic, or English digits and characters into standard 0-9 ASCII.
 */
export function normalizeDigit(char: string): string | null {
  if (!char || char.length !== 1) return null;
  const code = char.charCodeAt(0);

  // ASCII 0-9 (48 - 57)
  if (code >= 48 && code <= 57) {
    return char;
  }
  // Persian ۰-۹ (1776 - 1785 / 0x06F0 - 0x06F9)
  if (code >= 1776 && code <= 1785) {
    return String(code - 1776);
  }
  // Arabic ٠-٩ (1632 - 1641 / 0x0660 - 0x0669)
  if (code >= 1632 && code <= 1641) {
    return String(code - 1632);
  }
  return null;
}

/**
 * Checks if a 2-digit code string is valid format ("00" to "99")
 */
export function isValidQuickCode(code: string): boolean {
  return /^\d{2}$/.test(code);
}

export interface TargetOption {
  target: string;
  title: string;
  category: QuickCodeCategory;
  type: QuickCodeType;
  description: string;
  iconName?: string;
}

export const SYSTEM_TARGET_OPTIONS: TargetOption[] = [
  // Core
  { target: 'welcome_page', title: 'پیشخوان و داشبورد اصلی', category: 'core', type: 'tab', description: 'انتقال به صفحه اصلی و پیشخوان سیستم', iconName: 'LayoutDashboard' },
  { target: 'personal_notes', title: 'یادداشت‌ها و پیگیری‌ها', category: 'core', type: 'tab', description: 'مدیریت چک‌لیست و یادداشت‌های شخصی کاربر', iconName: 'FileText' },
  { target: 'checklist', title: 'چک‌لیست کارهای روزانه', category: 'core', type: 'tab', description: 'چک‌لیست وظایف و تسک‌های روزانه حسابداری', iconName: 'CheckCircle' },

  // Commercial / Invoices
  { target: 'create_sale', title: 'صدور فاکتور فروش جدید', category: 'invoices', type: 'tab', description: 'باز کردن فرم صدور فاکتور فروش کالا و خدمات', iconName: 'FilePlus' },
  { target: 'list_sale', title: 'لیست فاکتورهای فروش', category: 'invoices', type: 'tab', description: 'مشاهده لیست تمام فاکتورهای فروش ثبت‌شده', iconName: 'ShoppingCart' },
  { target: 'create_purchase', title: 'صدور فاکتور خرید جدید', category: 'invoices', type: 'tab', description: 'باز کردن فرم صدور فاکتور خرید کالا', iconName: 'PackagePlus' },
  { target: 'list_purchase', title: 'لیست فاکتورهای خرید', category: 'invoices', type: 'tab', description: 'مشاهده لیست تمام فاکتورهای خرید ثبت‌شده', iconName: 'ShoppingBag' },
  { target: 'create_sale_return', title: 'ثبت برگشت از فروش', category: 'invoices', type: 'tab', description: 'فرم صدور فاکتور برگشت از فروش کالا', iconName: 'RotateCcw' },
  { target: 'list_sale_return', title: 'لیست برگشت از فروش', category: 'invoices', type: 'tab', description: 'مشاهده لیست فاکتورهای مرجوعی فروش', iconName: 'FileText' },
  { target: 'create_purchase_return', title: 'ثبت برگشت از خرید', category: 'invoices', type: 'tab', description: 'فرم صدور فاکتور برگشت از خرید کالا', iconName: 'RotateCw' },
  { target: 'list_purchase_return', title: 'لیست برگشت از خرید', category: 'invoices', type: 'tab', description: 'مشاهده لیست فاکتورهای مرجوعی خرید', iconName: 'FileCheck' },
  { target: 'order_list', title: 'سفارشات خرید (نیازسنجی کالا)', category: 'invoices', type: 'tab', description: 'نیازسنجی و اقلام به نقطه سفارش رسیده', iconName: 'ShoppingBag' },
  { target: 'product_last_prices', title: 'تاریخچه آخرین قیمت‌ها', category: 'invoices', type: 'tab', description: 'آخرین قیمت‌های خرید و فروش کالاها', iconName: 'DollarSign' },

  // Treasury & Receipts
  { target: 'keyboard_receipt', title: 'ثبت سریع رسید با کیبورد', category: 'treasury', type: 'tab', description: 'ثبت بدون ماوس دریافت، پرداخت و حواله بین‌اشخاص با کلیدهای میانبر کیبورد', iconName: 'Zap' },
  { target: 'list_receive_receipt', title: 'لیست رسیدهای دریافت', category: 'treasury', type: 'tab', description: 'مشاهده سوابق و لیست دریافتی‌های وجه', iconName: 'ArrowDownLeft' },
  { target: 'create_receive_receipt', title: 'ثبت رسید دریافت وجه جدید', category: 'treasury', type: 'tab', description: 'فرم ثبت دریافت وجه، واریز بانکی یا پوز', iconName: 'PlusCircle' },
  { target: 'list_pay_receipt', title: 'لیست رسیدهای پرداخت', category: 'treasury', type: 'tab', description: 'مشاهده سوابق و اسناد پرداختی سیستم', iconName: 'ArrowUpRight' },
  { target: 'create_pay_receipt', title: 'ثبت رسید پرداخت وجه جدید', category: 'treasury', type: 'tab', description: 'فرم ثبت پرداخت وجه و خروج نقدینگی', iconName: 'MinusCircle' },
  { target: 'received_checks_page', title: 'مدیریت چک‌های دریافتی', category: 'treasury', type: 'tab', description: 'مشاهده و عملیات روی چک‌های دریافتی مشتریان', iconName: 'CheckSquare' },
  { target: 'issued_checks_page', title: 'مدیریت چک‌های پرداختی', category: 'treasury', type: 'tab', description: 'مشاهده و پاس کردن چک‌های صادره به تامین‌کنندگان', iconName: 'CreditCard' },
  { target: 'receive_check_form', title: 'ثبت چک دریافتی جدید', category: 'treasury', type: 'tab', description: 'فرم ورود اطلاعات صیادی چک دریافتی', iconName: 'Plus' },
  { target: 'issue_check_form', title: 'ثبت چک پرداختی جدید', category: 'treasury', type: 'tab', description: 'فرم صدور چک پرداختی صیادی', iconName: 'PenTool' },
  { target: 'accounts', title: 'حساب‌های بانکی و پوزها', category: 'treasury', type: 'tab', description: 'مدیریت حساب‌ها، کارتخوان‌ها و موجودی بانک', iconName: 'Landmark' },
  { target: 'cashboxes', title: 'مدیریت صندوق‌ها', category: 'treasury', type: 'tab', description: 'مدیریت صندوق‌های نقدی و موجودی صندوقدار', iconName: 'Wallet' },
  { target: 'check_panel', title: 'میز کار چک و صیاد', category: 'treasury', type: 'tab', description: 'داشبورد هشدارهای سررسید چک‌های دریافتی و پرداختی', iconName: 'CreditCard' },

  // Inventory
  { target: 'products', title: 'لیست کالاها و خدمات', category: 'inventory', type: 'tab', description: 'مشاهده کاتالوگ و مدیریت موجودی و قیمت کالاها', iconName: 'Box' },
  { target: 'product_categories', title: 'دسته‌بندی و گروه‌بندی کالاها', category: 'inventory', type: 'tab', description: 'تعریف و ساماندهی دسته‌های کالا', iconName: 'Tag' },
  { target: 'warehouses', title: 'انبارها و موقعیت‌ها', category: 'inventory', type: 'tab', description: 'مدیریت انبارهای فیزیکی و شعب', iconName: 'Warehouse' },
  { target: 'create_warehouse_doc', title: 'صدور رسید و حواله انبار', category: 'inventory', type: 'tab', description: 'ورود، خروج و انتقال بین انبارها', iconName: 'FileText' },
  { target: 'list_warehouse_docs', title: 'لیست اسناد انبار', category: 'inventory', type: 'tab', description: 'بایگانی تمام رسیدها و حواله‌های انبارداری', iconName: 'ClipboardList' },
  { target: 'stocktaking', title: 'انبارگردانی و مغایرت‌گیری', category: 'inventory', type: 'tab', description: 'شمارش موجودی واقعی و ثبت مغایرت انبار', iconName: 'Barcode' },
  { target: 'kardex', title: 'کاردکس کالا (تاریخچه گردش)', category: 'inventory', type: 'tab', description: 'گردش مقداری و ریالی اقلام انبار', iconName: 'Layers' },
  { target: 'quick_price_inquiry', title: 'استعلام سریع قیمت کالا', category: 'inventory', type: 'tab', description: 'جستجو و استعلام آنی قیمت فروش و خرید کالا', iconName: 'Tag' },
  { target: 'bulk_barcode_generator', title: 'تولید و چاپ گروهی بارکد', category: 'inventory', type: 'tab', description: 'طراحی لیبل و چاپ انبوه بارکد محصولات', iconName: 'Barcode' },
  { target: 'online_pipe_pricing', title: 'استعلام آنلاین لوله و اتصالات', category: 'inventory', type: 'tab', description: 'نرخ لحظه‌ای آهن، مس، سپاهان و کچو', iconName: 'TrendingUp' },

  // Persons & CRM
  { target: 'persons', title: 'بانک طرف‌حساب‌ها و اشخاص', category: 'persons', type: 'tab', description: 'مدیریت مشتریان، تامین‌کنندگان و همکاران', iconName: 'Users' },
  { target: 'specialists_directory', title: 'ویترین متخصصین و استادکاران', category: 'persons', type: 'tab', description: 'لیست استادکاران، برق‌کاران و نصابان ماهر', iconName: 'Users' },
  { target: 'person_ledger', title: 'دفتر معین و صورت‌حساب اشخاص', category: 'persons', type: 'tab', description: 'مشاهده ریز بدهی و بستانکاری طرف‌حساب‌ها', iconName: 'BookOpen' },
  { target: 'debts_credits', title: 'گزارش بدهکاران و بستانکاران', category: 'persons', type: 'tab', description: 'صورت کامل طلب‌ها و بدهی‌های تجاری مجموعه', iconName: 'Users' },
  { target: 'debtors_showcase', title: 'ویترین مطالبات و پیگیری معوقات', category: 'persons', type: 'tab', description: 'مدیریت اخطارها و تسویه بدهی‌های سررسید گذشته', iconName: 'AlertCircle' },
  { target: 'rent_contracts', title: 'قراردادهای اجاره و تعهدات', category: 'persons', type: 'tab', description: 'مدیریت قراردادهای اجاره و املاک', iconName: 'FileContract' },
  { target: 'person_opening_balances', title: 'مانده اول دوره طرف‌حساب‌ها', category: 'persons', type: 'tab', description: 'تراز بدهکاری/بستانکاری اولیه اشخاص در شروع سال', iconName: 'Calculator' },

  // Accounting
  { target: 'accounting_docs_list', title: 'دفاتر و اسناد دوبل حسابداری', category: 'accounting', type: 'tab', description: 'دفتر روزنامه، کل، معین و تراز آزمایشی', iconName: 'FileSpreadsheet' },
  { target: 'financial_years', title: 'دوره‌های مالی و بستن سال', category: 'accounting', type: 'tab', description: 'تعریف سال‌های مالی و صدور سند افتتاحیه/اختتامیه', iconName: 'Calendar' },

  // Messaging
  { target: 'sms_messages', title: 'مرکز پیامک و پیام‌ها', category: 'messaging', type: 'tab', description: 'مشاهده پیامک‌های ارسالی، صف ارسال و الگوها', iconName: 'MessageSquare' },

  // Reports
  { target: 'financial_report', title: 'داشبورد گزارشات مالی', category: 'reports', type: 'tab', description: 'گزارش سود و زیان، ترازنامه و نقدینگی', iconName: 'TrendingUp' },
  { target: 'sales_report', title: 'گزارش تحلیلی فروش', category: 'reports', type: 'tab', description: 'آمار فروش دوره‌ای و مقایسه‌ای', iconName: 'BarChart2' },
  { target: 'analytical_dashboard', title: 'داشبورد تحلیلی فروش و سود', category: 'reports', type: 'tab', description: 'نمودارهای مدیریتی و هوش کسب‌وکار', iconName: 'BarChart2' },

  // Settings
  { target: 'settings', title: 'تنظیمات کلی سیستم', category: 'settings', type: 'tab', description: 'مشاهده و پیکربندی پارامترهای جامع نرم‌افزار', iconName: 'Settings' },
  { target: 'settings_quick_codes', title: 'مدیریت کدهای دسترسی سریع', category: 'settings', type: 'tab', description: 'پیکربندی و ویرایش کدهای ۲ رقمی کیبورد', iconName: 'Keyboard' },

  // Actions
  { target: 'action_calculator', title: 'ماشین حساب سریع شناور', category: 'tools', type: 'action', description: 'باز کردن پنجره ماشین حساب محاسبات ارزی و مالی', iconName: 'Calculator' },
  { target: 'action_scanner', title: 'اسکنر بارکد شناور', category: 'tools', type: 'action', description: 'پنجره اسکن سریع با بارکدخوان یا دوربین', iconName: 'ScanLine' },
  { target: 'action_new_product', title: 'تعریف کالای جدید (پاپ‌آپ)', category: 'inventory', type: 'action', description: 'باز کردن پنجره سریع ثبت کالا و بارکد', iconName: 'PackagePlus' },
  { target: 'action_new_person', title: 'ثبت طرف‌حساب جدید (پاپ‌آپ)', category: 'persons', type: 'action', description: 'باز کردن پنجره سریع افزودن شخص/مشتری', iconName: 'UserPlus' },
  { target: 'action_send_sms', title: 'نگارش و ارسال پیامک (پاپ‌آپ)', category: 'messaging', type: 'action', description: 'پنجره ارسال پیامک آنی به مشتری یا گروه', iconName: 'Send' },
  { target: 'action_sync', title: 'پشتیبان‌گیری و همگام‌سازی ابری', category: 'tools', type: 'action', description: 'مشاهده صف ارسال و وضعیت اتصال دیتابیس', iconName: 'RefreshCw' },
];

/**
 * Suggests the next available unused 2-digit code (e.g. "11", "12", ...).
 */
export function getNextAvailableCode(items: QuickCodeItem[] = getQuickCodes()): string {
  const usedCodes = new Set(items.map((i) => i.code));
  for (let num = 10; num <= 99; num++) {
    const codeStr = String(num);
    if (!usedCodes.has(codeStr)) {
      return codeStr;
    }
  }
  return '99';
}

/**
 * Loads current quick codes from localStorage or falls back to defaults.
 * Preserves user modifications, custom additions, and deletions.
 * Injects keyboard_receipt if not already present in an existing stored array.
 */
export function getQuickCodes(): QuickCodeItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_QUICK_CODES;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return DEFAULT_QUICK_CODES;

    // Check if keyboard_receipt is present; if not, inject it
    const hasKeyboardReceipt = parsed.some((item: QuickCodeItem) => item && item.id === 'keyboard_receipt');
    if (!hasKeyboardReceipt) {
      const defaultKb = DEFAULT_QUICK_CODES.find((i) => i.id === 'keyboard_receipt');
      if (defaultKb) {
        const existingCodes = new Set(parsed.map((p: QuickCodeItem) => p.code));
        let codeToUse = defaultKb.code;
        if (existingCodes.has(codeToUse)) {
          codeToUse = getNextAvailableCode(parsed);
        }
        parsed.push({ ...defaultKb, code: codeToUse });
        saveQuickCodes(parsed);
      }
    }

    return parsed;
  } catch {
    return DEFAULT_QUICK_CODES;
  }
}

/**
 * Saves quick codes to localStorage and broadcasts change event.
 */
export function saveQuickCodes(items: QuickCodeItem[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    window.dispatchEvent(new CustomEvent(QUICK_CODES_EVENT, { detail: items }));
  } catch (e) {
    console.error('Failed to save quick codes:', e);
  }
}

/**
 * Resets quick codes back to factory default mapping.
 */
export function resetQuickCodes(): QuickCodeItem[] {
  try {
    localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new CustomEvent(QUICK_CODES_EVENT, { detail: DEFAULT_QUICK_CODES }));
  } catch (e) {
    console.error('Failed to reset quick codes:', e);
  }
  return DEFAULT_QUICK_CODES;
}

/**
 * Adds a new quick code shortcut and persists.
 */
export function addQuickCodeItem(item: Omit<QuickCodeItem, 'id' | 'defaultCode'> & { id?: string; defaultCode?: string }): QuickCodeItem[] {
  const current = getQuickCodes();
  const newItem: QuickCodeItem = {
    id: item.id || `custom_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    code: item.code,
    defaultCode: item.defaultCode || item.code,
    title: item.title,
    description: item.description || '',
    category: item.category,
    type: item.type,
    target: item.target,
    iconName: item.iconName || (item.type === 'action' ? 'Zap' : 'FileText'),
    enabled: item.enabled ?? true,
    isCustom: true,
  };
  const updated = [newItem, ...current];
  saveQuickCodes(updated);
  return updated;
}

/**
 * Deletes a quick code shortcut by ID and persists.
 */
export function deleteQuickCodeItem(id: string): QuickCodeItem[] {
  const current = getQuickCodes();
  const updated = current.filter((item) => item.id !== id);
  saveQuickCodes(updated);
  return updated;
}

/**
 * Updates a quick code item and persists.
 */
export function updateQuickCodeItem(id: string, updates: Partial<QuickCodeItem>): QuickCodeItem[] {
  const current = getQuickCodes();
  const updated = current.map((item) => {
    if (item.id === id) {
      return { ...item, ...updates };
    }
    return item;
  });
  saveQuickCodes(updated);
  return updated;
}

/**
 * Finds an enabled action/tab item corresponding to a 2-digit code.
 */
export function findItemByCode(code: string, items = getQuickCodes()): QuickCodeItem | undefined {
  const normalized = code.trim();
  return items.find((item) => item.enabled && item.code === normalized);
}

/**
 * Check if a code already exists (excluding the specified item ID if editing).
 */
export function checkDuplicateCode(code: string, excludeId?: string, items = getQuickCodes()): QuickCodeItem | undefined {
  const normalized = code.trim();
  return items.find((item) => item.code === normalized && item.id !== excludeId);
}

/**
 * Subscribe to changes in quick codes.
 */
export function subscribeToQuickCodes(listener: (items: QuickCodeItem[]) => void): () => void {
  const handler = (e: Event) => {
    const custom = e as CustomEvent<QuickCodeItem[]>;
    listener(custom.detail || getQuickCodes());
  };
  window.addEventListener(QUICK_CODES_EVENT, handler);
  return () => window.removeEventListener(QUICK_CODES_EVENT, handler);
}
