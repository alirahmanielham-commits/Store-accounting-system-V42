import React from 'react';
import { User, UserRole, UserSpecialPermissions } from '../types';

export interface PermissionItem {
  id: string;
  label: string;
  description?: string;
  defaultRoles: UserRole[];
}

export interface PermissionModule {
  id: string;
  label: string;
  iconName: string;
  description: string;
  items: PermissionItem[];
}

export const PERMISSION_MODULES: PermissionModule[] = [
  {
    id: 'personal_workspace',
    label: 'میزکار و امور روزمره',
    iconName: 'Home',
    description: 'داشبورد اصلی، یادداشت‌ها و چک‌لیست کارهای روزمره',
    items: [
      { id: 'welcome_page', label: 'صفحه اصلی (داشبورد ورود)', defaultRoles: ['admin', 'manager', 'accountant', 'cashier', 'warehouseman', 'employee', 'viewer', 'guest'] },
      { id: 'personal_notes', label: 'یادداشت‌ها و پیگیری‌ها', defaultRoles: ['admin', 'manager', 'accountant', 'cashier', 'warehouseman', 'employee', 'viewer'] },
      { id: 'checklist', label: 'چک‌لیست کارهای روزانه', defaultRoles: ['admin', 'manager', 'accountant'] },
    ]
  },
  {
    id: 'sales_operations',
    label: 'فروش و بازرگانی',
    iconName: 'ShoppingCart',
    description: 'صدور فاکتور فروش، برگشتی، پیش‌فاکتور و گزارشات سودآوری',
    items: [
      { id: 'create_sale', label: 'ثبت فاکتور فروش جدید', defaultRoles: ['admin', 'manager', 'cashier', 'accountant'] },
      { id: 'list_sale', label: 'فهرست فاکتورهای فروش', defaultRoles: ['admin', 'manager', 'cashier', 'accountant', 'viewer'] },
      { id: 'create_sale_return', label: 'ثبت برگشت از فروش', defaultRoles: ['admin', 'manager', 'cashier', 'accountant'] },
      { id: 'list_sale_return', label: 'فهرست برگشتی‌های فروش', defaultRoles: ['admin', 'manager', 'cashier', 'accountant'] },
      { id: 'sales_report', label: 'گزارش سود و زیان و فروش', defaultRoles: ['admin', 'manager', 'accountant'] },
      { id: 'analytical_dashboard', label: 'داشبورد تحلیلی فروش', defaultRoles: ['admin', 'manager', 'accountant'] },
    ]
  },
  {
    id: 'purchase_operations',
    label: 'خرید و تدارکات',
    iconName: 'PackagePlus',
    description: 'فاکتورهای خرید، برگشت از خرید و لیست سفارشات',
    items: [
      { id: 'create_purchase', label: 'ثبت فاکتور خرید کالا', defaultRoles: ['admin', 'manager', 'accountant'] },
      { id: 'list_purchase', label: 'فهرست فاکتورهای خرید', defaultRoles: ['admin', 'manager', 'accountant'] },
      { id: 'create_purchase_return', label: 'ثبت برگشت از خرید', defaultRoles: ['admin', 'manager', 'accountant'] },
      { id: 'list_purchase_return', label: 'فهرست برگشتی‌های خرید', defaultRoles: ['admin', 'manager', 'accountant'] },
      { id: 'order_list', label: 'لیست سفارشات خرید اقلام', defaultRoles: ['admin', 'manager', 'accountant', 'warehouseman'] },
      { id: 'product_last_prices', label: 'استعلام آخرین نرخ‌های خرید و فروش', defaultRoles: ['admin', 'manager', 'accountant', 'cashier'] },
    ]
  },
  {
    id: 'products_management',
    label: 'کالاها و خدمات',
    iconName: 'Package',
    description: 'تعریف کالاها، دسته‌بندی، قیمت‌گذاری و بارکدها',
    items: [
      { id: 'products', label: 'مدیریت جامع کالاها و خدمات', defaultRoles: ['admin', 'manager', 'accountant', 'cashier', 'warehouseman'] },
      { id: 'product_categories', label: 'دسته‌بندی‌های کالاها', defaultRoles: ['admin', 'manager', 'accountant'] },
      { id: 'quick_price_inquiry', label: 'استعلام سریع قیمت کالا', defaultRoles: ['admin', 'manager', 'cashier', 'accountant', 'viewer'] },
      { id: 'product_view', label: 'مشاهده مشخصات و کاردکس کالا', defaultRoles: ['admin', 'manager', 'cashier', 'accountant', 'warehouseman', 'viewer'] },
      { id: 'bulk_barcode_generator', label: 'تولید گروهی بارکد', defaultRoles: ['admin', 'manager', 'warehouseman'] },
      { id: 'online_pipe_pricing', label: 'استعلام آنلاین نرخ لوله', defaultRoles: ['admin', 'manager', 'accountant'] },
      { id: 'newpipe_pricing', label: 'استعلام لیست قیمت نیوپایپ', defaultRoles: ['admin', 'manager', 'accountant'] },
    ]
  },
  {
    id: 'warehousing',
    label: 'انبارداری و لجستیک',
    iconName: 'Warehouse',
    description: 'رسید و حواله انبار، انبارگردانی، کاردکس و موجودی',
    items: [
      { id: 'warehouses', label: 'مدیریت انبارها و موجودی شعب', defaultRoles: ['admin', 'manager', 'warehouseman', 'accountant'] },
      { id: 'create_warehouse_doc', label: 'ثبت رسید و حواله انبار', defaultRoles: ['admin', 'manager', 'warehouseman'] },
      { id: 'list_warehouse_docs', label: 'فهرست اسناد ورود و خروج انبار', defaultRoles: ['admin', 'manager', 'warehouseman', 'accountant'] },
      { id: 'stocktaking', label: 'انبارگردانی و تطبیق موجودی', defaultRoles: ['admin', 'manager', 'warehouseman', 'accountant'] },
      { id: 'kardex', label: 'کاردکس ریالی و تعدادی کالا', defaultRoles: ['admin', 'manager', 'warehouseman', 'accountant'] },
      { id: 'inventory_report', label: 'گزارش تفصیلی موجودی انبار', defaultRoles: ['admin', 'manager', 'warehouseman', 'accountant'] },
    ]
  },
  {
    id: 'persons',
    label: 'اشخاص و طرف‌حساب‌ها',
    iconName: 'Users',
    description: 'مشتریان، تامین‌کنندگان، گردش معین و مطالبات',
    items: [
      { id: 'persons', label: 'فهرست اشخاص و طرف‌حساب‌ها', defaultRoles: ['admin', 'manager', 'accountant', 'cashier'] },
      { id: 'person_profile', label: 'پروفایل و پرونده شخص', defaultRoles: ['admin', 'manager', 'accountant', 'cashier'] },
      { id: 'person_ledger', label: 'کارت حساب و گردش معین شخص', defaultRoles: ['admin', 'manager', 'accountant'] },
      { id: 'debts_credits', label: 'گزارش بدهکاران و بستانکاران', defaultRoles: ['admin', 'manager', 'accountant'] },
      { id: 'debtors_showcase', label: 'رصد مطالبات و پیگیری بدهکاران', defaultRoles: ['admin', 'manager', 'accountant'] },
      { id: 'crm_dashboard', label: 'داشبورد ارتباط با مشتریان (CRM)', defaultRoles: ['admin', 'manager', 'accountant'] },
      { id: 'person_opening_balances', label: 'مانده اول دوره اشخاص', defaultRoles: ['admin', 'manager', 'accountant'] },
      { id: 'person_groups', label: 'گروه‌بندی اشخاص', defaultRoles: ['admin', 'manager', 'accountant'] },
      { id: 'person_roles', label: 'نقش‌های اشخاص', defaultRoles: ['admin', 'manager', 'accountant'] },
      { id: 'person_categories', label: 'دسته‌بندی‌های اشخاص', defaultRoles: ['admin', 'manager', 'accountant'] },
    ]
  },
  {
    id: 'receipts_payments',
    label: 'خزانه‌داری و دریافت/پرداخت',
    iconName: 'CreditCard',
    description: 'رسیدهای دریافت و پرداخت، حساب‌های بانکی و صندوق‌ها',
    items: [
      { id: 'keyboard_receipt', label: 'ثبت سریع رسید با کیبورد (بدون ماوس)', defaultRoles: ['admin', 'manager', 'cashier', 'accountant'] },
      { id: 'create_receive_receipt', label: 'ثبت رسید دریافت وجه', defaultRoles: ['admin', 'manager', 'cashier', 'accountant'] },
      { id: 'list_receive_receipt', label: 'فهرست رسیدهای دریافت', defaultRoles: ['admin', 'manager', 'cashier', 'accountant'] },
      { id: 'create_pay_receipt', label: 'ثبت رسید پرداخت وجه', defaultRoles: ['admin', 'manager', 'accountant'] },
      { id: 'list_pay_receipt', label: 'فهرست رسیدهای پرداخت', defaultRoles: ['admin', 'manager', 'accountant'] },
      { id: 'accounts', label: 'مدیریت حساب‌های بانکی', defaultRoles: ['admin', 'manager', 'accountant'] },
      { id: 'cashboxes', label: 'مدیریت صندوق‌ها و تنخواه', defaultRoles: ['admin', 'manager', 'cashier', 'accountant'] },
      { id: 'transfer', label: 'انتقال وجه بین حساب‌ها/صندوق‌ها', defaultRoles: ['admin', 'manager', 'accountant'] },
      { id: 'quick_refund', label: 'استرداد وجه سریع', defaultRoles: ['admin', 'manager', 'accountant'] },
      { id: 'invoice_allocation', label: 'تخصیص فاکتور به دریافت‌ها', defaultRoles: ['admin', 'manager', 'accountant'] },
    ]
  },
  {
    id: 'checks_management',
    label: 'مدیریت چک و اسناد',
    iconName: 'BookOpen',
    description: 'چک‌های صیادی دریافتی و پرداختی، دسته‌چک و کارتابل',
    items: [
      { id: 'check_panel', label: 'میز کار و کارتابل چک‌ها', defaultRoles: ['admin', 'manager', 'accountant'] },
      { id: 'receive_check_form', label: 'ثبت چک دریافتی جدید', defaultRoles: ['admin', 'manager', 'cashier', 'accountant'] },
      { id: 'received_checks_page', label: 'لیست چک‌های دریافتی', defaultRoles: ['admin', 'manager', 'accountant'] },
      { id: 'issue_check_form', label: 'صدور چک پرداختی جدید', defaultRoles: ['admin', 'manager', 'accountant'] },
      { id: 'issued_checks_page', label: 'لیست چک‌های پرداختی', defaultRoles: ['admin', 'manager', 'accountant'] },
      { id: 'checkbooks', label: 'مدیریت دسته‌چک‌ها', defaultRoles: ['admin', 'manager', 'accountant'] },
      { id: 'check_card', label: 'کارت و تاریخچه چک', defaultRoles: ['admin', 'manager', 'accountant'] },
    ]
  },
  {
    id: 'loans_management',
    label: 'تسهیلات و وام‌ها',
    iconName: 'Landmark',
    description: 'تعریف وام، پرداخت اقساط و گزارشات معوقات',
    items: [
      { id: 'loans_dashboard', label: 'داشبورد اقساط و وام‌ها', defaultRoles: ['admin', 'manager', 'accountant'] },
      { id: 'loans_create', label: 'ثبت پرونده تسهیلات / وام جدید', defaultRoles: ['admin', 'manager', 'accountant'] },
      { id: 'loans_list', label: 'فهرست وام‌های دریافتی/پرداختی', defaultRoles: ['admin', 'manager', 'accountant'] },
      { id: 'loans_payment', label: 'پرداخت و تسویه اقساط', defaultRoles: ['admin', 'manager', 'accountant'] },
      { id: 'loans_arrears', label: 'اقساط معوقه و سررسید شده', defaultRoles: ['admin', 'manager', 'accountant'] },
      { id: 'loans_reports', label: 'گزارشات آماری و مالی وام‌ها', defaultRoles: ['admin', 'manager', 'accountant'] },
      { id: 'loans_settings', label: 'تنظیمات قوانین و سرفصل وام', defaultRoles: ['admin', 'manager', 'accountant'] },
    ]
  },
  {
    id: 'salary',
    label: 'حقوق و دستمزد و پرسنلی',
    iconName: 'Coins',
    description: 'قراردادها، حضور و غیاب، فیش‌های حقوقی و احکام',
    items: [
      { id: 'employee_profiles', label: 'پرونده پرسنلی کارمندان', defaultRoles: ['admin', 'manager', 'accountant'] },
      { id: 'payslips', label: 'محاسبه و صدور فیش‌های حقوقی', defaultRoles: ['admin', 'manager', 'accountant'] },
      { id: 'monthly_attendance', label: 'کارکرد ماهانه پرسنل', defaultRoles: ['admin', 'manager', 'accountant'] },
      { id: 'daily_attendance', label: 'حضور و غیاب روزانه', defaultRoles: ['admin', 'manager', 'accountant'] },
      { id: 'employee_contracts', label: 'قراردادهای کاری پرسنل', defaultRoles: ['admin', 'manager', 'accountant'] },
      { id: 'rent_contracts', label: 'قراردادهای اجاره و تعهدات', defaultRoles: ['admin', 'manager', 'accountant'] },
      { id: 'employee_orders', label: 'احکام کارگزینی پرسنل', defaultRoles: ['admin', 'manager'] },
      { id: 'workplaces', label: 'کارگاه‌ها و شعب کاری', defaultRoles: ['admin', 'manager'] },
      { id: 'order_templates', label: 'قالب‌های احکام کارگزینی', defaultRoles: ['admin', 'manager'] },
    ]
  },
  {
    id: 'accounting_core',
    label: 'حسابداری دوبل و اسناد',
    iconName: 'Calculator',
    description: 'کدینگ حساب‌ها، صدور سند روزنامه، دفاتر مالی و سال‌های مالی',
    items: [
      { id: 'financial_years', label: 'مدیریت و بستن سال‌های مالی', defaultRoles: ['admin', 'accountant'] },
      { id: 'chart_of_accounts', label: 'درخت و کدینگ حساب‌ها', defaultRoles: ['admin', 'accountant'] },
      { id: 'accounting_doc_create', label: 'صدور سند حسابداری دستی', defaultRoles: ['admin', 'accountant'] },
      { id: 'accounting_docs_list', label: 'فهرست اسناد حسابداری و روزنامه', defaultRoles: ['admin', 'accountant'] },
      { id: 'account_ledger', label: 'دفتر کل و معین حسابداری', defaultRoles: ['admin', 'accountant'] },
      { id: 'accounting_verification', label: 'تطبیق و ممیزی اسناد مالی', defaultRoles: ['admin', 'accountant'] },
      { id: 'accounting_opening_balances', label: 'سند افتتاحیه حساب‌ها', defaultRoles: ['admin', 'accountant'] },
      { id: 'financial_report', label: 'تراز آزمایشی و صورت‌های مالی', defaultRoles: ['admin', 'accountant'] },
    ]
  },
  {
    id: 'messaging_system',
    label: 'پیامک و ارتباط هوشمند',
    iconName: 'MessageSquare',
    description: 'ارسال پیامک تکی و گروهی، قالب‌ها و خطوط ارسال',
    items: [
      { id: 'send_message', label: 'ارسال پیامک و اعلان جدید', defaultRoles: ['admin', 'manager', 'accountant'] },
      { id: 'sms_messages', label: 'آرشیو پیامک‌های ارسالی', defaultRoles: ['admin', 'manager', 'accountant'] },
      { id: 'sms_templates', label: 'قالب‌های خودکار پیامک', defaultRoles: ['admin', 'manager'] },
      { id: 'messaging_channels', label: 'تنظیمات درگاه‌ها و خطوط پیامک', defaultRoles: ['admin'] },
      { id: 'messaging_logs', label: 'لاگ و گزارشات تحویل پیام‌ها', defaultRoles: ['admin', 'manager'] },
    ]
  },
  {
    id: 'admin',
    label: 'تنظیمات، کاربران و پشتیبان',
    iconName: 'Settings',
    description: 'تنظیمات سیستم، سطوح دسترسی، نگهداری دیتابیس و عیب‌یابی',
    items: [
      { id: 'settings', label: 'تنظیمات عمومی، فروشگاه و فاکتور', defaultRoles: ['admin'] },
      { id: 'users_manager', label: 'مدیریت کاربران و سطوح دسترسی', defaultRoles: ['admin'] },
      { id: 'system_diagnostics', label: 'پایش سلامت و عیب‌یابی سیستم', defaultRoles: ['admin'] },
      { id: 'unvouchered_financials', label: 'عیب‌یابی عملیات مالی فاقد سند', defaultRoles: ['admin', 'accountant'] },
      { id: 'sync_manager', label: 'همگام‌سازی ابری و آفلاین', defaultRoles: ['admin'] },
      { id: 'data_reconciliation', label: 'تطبیق و بازسازی هوشمند داده‌ها', defaultRoles: ['admin'] },
      { id: 'database', label: 'پشتیبان‌گیری و دیتابیس', defaultRoles: ['admin'] },
      { id: 'system_logs', label: 'لاگ وقایع کاربران', defaultRoles: ['admin'] },
      { id: 'database_logs', label: 'لاگ وقایع پایگاه داده', defaultRoles: ['admin'] },
      { id: 'system_info', label: 'درباره نرم‌افزار و مشخصات سیستم', defaultRoles: ['admin', 'manager', 'accountant'] },
      { id: 'update', label: 'بروزرسانی و تاریخچه تغییرات', defaultRoles: ['admin'] },
    ]
  },
];

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  admin: 'مدیر کل (دسترسی نامحدود)',
  manager: 'مدیر ارشد',
  accountant: 'حسابدار',
  cashier: 'صندوق‌دار',
  warehouseman: 'انباردار',
  employee: 'کارمند اداری / پرسنل',
  viewer: 'بیننده و گزارش‌گیر',
  customer: 'مشتری',
  guest: 'مهمان'
};

const TAB_ALIASES: Record<string, string> = {
  'sale_invoice_create': 'create_sale',
  'purchase_invoice_create': 'create_purchase',
  'receipt_create': 'create_receive_receipt',
  'payment_create': 'create_pay_receipt',
  'invoices': 'list_sale',
  'financial_years_setup': 'financial_years',
  'order_list': 'order_list',
  'fast_product_create': 'products',
};

/**
 * Resolves a tab title in Persian.
 */
export function getPageTitle(tabId: string): string {
  const clean = normalizeTabId(tabId);
  for (const mod of PERMISSION_MODULES) {
    const itm = mod.items.find(i => i.id === clean);
    if (itm) return itm.label;
  }
  return tabId;
}

function normalizeTabId(tabId: string): string {
  let clean = (tabId || '').replace(/^\//, '');
  if (clean.includes('?')) clean = clean.split('?')[0];
  if (clean.includes('#')) clean = clean.split('#')[0];

  // Route parameters normalization
  if (clean.startsWith('loan/')) return 'loans_list';
  if (clean.startsWith('person_profile/')) return 'person_profile';
  if (clean.startsWith('person_ledger/')) return 'person_ledger';
  if (clean.startsWith('account_ledger/')) return 'account_ledger';
  if (clean.startsWith('check_card/')) return 'check_card';

  // Check aliases
  if (TAB_ALIASES[clean]) {
    return TAB_ALIASES[clean];
  }

  return clean;
}

/**
 * Returns the default allowed tab IDs for a given UserRole.
 */
export function getDefaultTabsForRole(role: UserRole): string[] {
  if (role === 'admin') {
    // Admin has access to all tabs
    const allTabs: string[] = [];
    PERMISSION_MODULES.forEach(mod => {
      mod.items.forEach(item => {
        allTabs.push(item.id);
      });
    });
    return allTabs;
  }

  const allowedTabs: string[] = ['welcome_page', 'personal_notes'];
  PERMISSION_MODULES.forEach(mod => {
    mod.items.forEach(item => {
      if (item.defaultRoles.includes(role)) {
        if (!allowedTabs.includes(item.id)) {
          allowedTabs.push(item.id);
        }
      }
    });
  });

  return allowedTabs;
}

/**
 * Checks whether a user has permission to access a specific page/tab.
 */
export function hasPagePermission(user: User | null | undefined, tabId: string): boolean {
  if (!user) return false;
  if (user.isActive === false) return false;

  const cleanTab = normalizeTabId(tabId);

  // Welcome page is accessible to all logged-in active users
  if (cleanTab === 'welcome_page' || cleanTab === '') {
    return true;
  }

  // Admin has full access by default, unless explicitly denied in deniedTabs
  if (user.role === 'admin') {
    if (user.deniedTabs && Array.isArray(user.deniedTabs) && user.deniedTabs.includes(cleanTab)) {
      return false;
    }
    return true;
  }

  // Check explicit denied list first
  if (user.deniedTabs && Array.isArray(user.deniedTabs) && user.deniedTabs.includes(cleanTab)) {
    return false;
  }

  // If user has custom permissions enabled or explicit allowedTabs configured:
  if (user.customPermissionsEnabled || (user.allowedTabs && Array.isArray(user.allowedTabs) && user.allowedTabs.length > 0)) {
    const userAllowed = user.allowedTabs || [];
    return userAllowed.includes(cleanTab);
  }

  // Fallback to role-based default permissions
  const roleDefaultTabs = getDefaultTabsForRole(user.role);
  return roleDefaultTabs.includes(cleanTab);
}

/**
 * Checks a granular special action permission.
 */
export function canUserPerform(
  user: User | null | undefined,
  action: keyof UserSpecialPermissions
): boolean {
  if (!user) return false;
  if (user.role === 'admin') return true;

  if (user.specialPermissions && user.specialPermissions[action] !== undefined) {
    return Boolean(user.specialPermissions[action]);
  }

  // Role defaults for specific actions
  switch (action) {
    case 'canManageUsers':
    case 'canManageSettings':
    case 'canManageDatabase':
      return false;
    case 'canViewCostAndProfit':
      return ['admin', 'manager', 'accountant'].includes(user.role);
    case 'canDeleteInvoices':
      return ['admin', 'manager'].includes(user.role);
    case 'canEditPrices':
      return ['admin', 'manager'].includes(user.role);
    case 'canGiveDiscounts':
      return ['admin', 'manager', 'cashier'].includes(user.role);
    case 'canApproveChecks':
      return ['admin', 'manager', 'accountant'].includes(user.role);
    case 'canAccessAllWarehouses':
      return ['admin', 'manager', 'accountant'].includes(user.role);
    default:
      return false;
  }
}
