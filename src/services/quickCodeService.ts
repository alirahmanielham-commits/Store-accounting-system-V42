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
  code: string; // 2-digit string ("10" - "99")
  defaultCode: string;
  title: string;
  description: string;
  category: QuickCodeCategory;
  type: QuickCodeType;
  target: string;
  iconName: string;
  enabled: boolean;
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

/**
 * Loads current quick codes from localStorage or falls back to defaults.
 */
export function getQuickCodes(): QuickCodeItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_QUICK_CODES;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return DEFAULT_QUICK_CODES;

    // Merge with defaults to ensure newly added features are present
    const map = new Map<string, QuickCodeItem>();
    parsed.forEach((item: QuickCodeItem) => {
      if (item && item.id) map.set(item.id, item);
    });

    return DEFAULT_QUICK_CODES.map((defaultItem) => {
      const existing = map.get(defaultItem.id);
      if (existing) {
        return {
          ...defaultItem,
          code: existing.code || defaultItem.code,
          enabled: existing.enabled !== undefined ? existing.enabled : defaultItem.enabled,
        };
      }
      return defaultItem;
    });
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
