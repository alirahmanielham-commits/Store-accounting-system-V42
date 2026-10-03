import { SystemLog } from '../types';
import { formatDateDisplay, toPersianDigits } from './format';

/**
 * Parses User-Agent string to extract human-readable browser, OS, and device information.
 */
export function parseUserAgent(uaString: string = ''): { browser: string; os: string; device: string } {
  let browser = 'مرورگر استاندارد وب';
  let os = 'سیستم‌عامل نامشخص';
  let device = 'رایانه (Desktop)';

  if (!uaString) return { browser, os, device };

  // Detect Device
  if (/mobile/i.test(uaString)) {
    device = 'تلفن همراه (Mobile)';
  } else if (/tablet|ipad/i.test(uaString)) {
    device = 'تبلت (Tablet)';
  }

  // Detect OS
  if (/windows nt 10.0/i.test(uaString)) os = 'ویندوز ۱۰ / ۱۱';
  else if (/windows nt 6.3/i.test(uaString)) os = 'ویندوز ۸.۱';
  else if (/windows nt 6.1/i.test(uaString)) os = 'ویندوز ۷';
  else if (/windows/i.test(uaString)) os = 'ویندوز';
  else if (/macintosh|mac os x/i.test(uaString)) os = 'مک (macOS)';
  else if (/android/i.test(uaString)) os = 'اندروید';
  else if (/iphone|ipad|ipod/i.test(uaString)) os = 'آی‌او‌اس (iOS)';
  else if (/linux/i.test(uaString)) os = 'لینوکس';

  // Detect Browser
  if (/edg\//i.test(uaString)) {
    const match = uaString.match(/edg\/([\d.]+)/i);
    browser = `مایکروسافت اج ${match ? 'نسخه ' + match[1].split('.')[0] : ''}`;
  } else if (/opr\/|opera\//i.test(uaString)) {
    browser = 'اپرا (Opera)';
  } else if (/chrome\//i.test(uaString) && !/chromium/i.test(uaString)) {
    const match = uaString.match(/chrome\/([\d.]+)/i);
    browser = `گوگل کروم ${match ? 'نسخه ' + match[1].split('.')[0] : ''}`;
  } else if (/firefox\//i.test(uaString)) {
    const match = uaString.match(/firefox\/([\d.]+)/i);
    browser = `موزیلا فایرفاکس ${match ? 'نسخه ' + match[1].split('.')[0] : ''}`;
  } else if (/safari\//i.test(uaString) && !/chrome/i.test(uaString)) {
    const match = uaString.match(/version\/([\d.]+)/i);
    browser = `سافاری اپل ${match ? 'نسخه ' + match[1].split('.')[0] : ''}`;
  }

  return { browser, os, device };
}

/**
 * Extracts current client-side device and browser information.
 */
export function getClientDeviceInfo() {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return { browser: 'سرور', os: 'سرور', device: 'سیستم' };
  }
  return parseUserAgent(navigator.userAgent);
}

/**
 * Gets currently logged-in user from sessionStorage or localStorage.
 */
export function getCurrentUserForAudit(): { id?: string | number; username: string; name: string; role: string } {
  if (typeof window === 'undefined') {
    return { username: 'system', name: 'سیستم', role: 'admin' };
  }
  try {
    const userStr = window.sessionStorage?.getItem('auth_user') || window.localStorage?.getItem('auth_user');
    if (userStr) {
      const u = JSON.parse(userStr);
      return {
        id: u.id,
        username: u.username || 'unknown',
        name: u.name || u.username || 'کاربر',
        role: u.role || 'user'
      };
    }
  } catch (_) {}
  return { username: 'system', name: 'سیستم', role: 'admin' };
}

/**
 * Formats timestamp to precise Persian date and time.
 */
export function formatAuditDateTime(timestamp: number): string {
  try {
    const d = new Date(timestamp);
    const timeStr = d.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const dateStr = d.toLocaleDateString('fa-IR', { year: 'numeric', month: '2-digit', day: '2-digit' });
    return `${dateStr} - ${timeStr}`;
  } catch (_) {
    return new Date(timestamp).toLocaleString();
  }
}

/**
 * Formats relative time (e.g. «۵ دقیقه پیش»).
 */
export function formatRelativeTime(timestamp: number): string {
  const diffSec = Math.floor((Date.now() - timestamp) / 1000);
  if (diffSec < 10) return 'هم‌اکنون';
  if (diffSec < 60) return `${diffSec} ثانیه پیش`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} دقیقه پیش`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours} ساعت پیش`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) return `${diffDays} روز پیش`;
  return formatAuditDateTime(timestamp);
}

export const ENTITY_NAMES_MAP: Record<string, string> = {
  'invoices': 'فاکتورها و اسناد تجاری',
  'sales_invoices': 'فاکتورهای فروش',
  'purchase_invoices': 'فاکتورهای خرید',
  'sale_returns': 'برگشتی‌های فروش',
  'purchase_returns': 'برگشتی‌های خرید',
  'warehouse_receipts': 'رسیدهای انبار',
  'warehouse_remittances': 'حواله‌های انبار',
  'products': 'کالاها و خدمات',
  'persons': 'طرف‌حساب‌ها و اشخاص',
  'transactions': 'تراکنش‌های مالی',
  'receipt_transactions': 'رسیدهای دریافت وجه',
  'payment_transactions': 'رسیدهای پرداخت وجه',
  'accounts': 'حساب‌های بانکی',
  'cashboxes': 'صندوق‌ها',
  'received_checks': 'چک‌های صیادی دریافتی',
  'issued_checks': 'چک‌های پرداختی',
  'checkbooks': 'دسته‌چک‌ها',
  'accounting_documents': 'اسناد حسابداری دوبل',
  'loans': 'پرونده‌های تسهیلات و وام',
  'installments': 'اقساط وام‌ها',
  'users': 'کاربران و سطوح دسترسی',
  'settings': 'تنظیمات عمومی فروشگاه',
  'financial_years': 'سال‌های مالی',
  'warehouses': 'انبارها و شعبات',
  'product_categories': 'دسته‌بندی‌های کالا',
  'person_groups': 'گروه‌بندی اشخاص',
  'person_opening_balances': 'اسناد افتتاحیه اشخاص',
  'auth': 'احراز هویت و نشست‌ها'
};

export const ACTION_NAMES_MAP: Record<string, { label: string; color: string }> = {
  'CREATE': { label: 'ثبت جدید', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  'ADD': { label: 'ثبت جدید', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  'UPDATE': { label: 'ویرایش', color: 'bg-sky-50 text-sky-700 border-sky-200' },
  'EDIT': { label: 'ویرایش', color: 'bg-sky-50 text-sky-700 border-sky-200' },
  'DELETE': { label: 'حذف', color: 'bg-rose-50 text-rose-700 border-rose-200' },
  'LOGIN': { label: 'ورود به سیستم', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  'LOGOUT': { label: 'خروج از سیستم', color: 'bg-slate-100 text-slate-700 border-slate-200' },
  'SESSION_TIMEOUT': { label: 'انقضای عدم فعالیت', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  'LOGIN_FAILED': { label: 'ورود ناموفق', color: 'bg-rose-50 text-rose-700 border-rose-200' },
  'STATUS_CHANGE': { label: 'تغییر وضعیت', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  'SETTINGS_CHANGE': { label: 'تغییر تنظیمات', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  'EXPORT': { label: 'خروجی اکسل/گزارش', color: 'bg-teal-50 text-teal-700 border-teal-200' }
};

/**
 * Creates human-readable summary of modified fields between oldData and newData.
 */
export function createDiffSummary(oldData: any, newData: any): { diffSummary: string; changesObj: Record<string, { old: any; new: any }> } {
  const changesObj: Record<string, { old: any; new: any }> = {};
  const fieldDescriptions: string[] = [];

  if (!oldData || !newData || typeof oldData !== 'object' || typeof newData !== 'object') {
    return { diffSummary: '', changesObj };
  }

  const FIELD_TRANSLATIONS: Record<string, string> = {
    'name': 'نام',
    'title': 'عنوان',
    'username': 'نام کاربری',
    'role': 'نقش',
    'price': 'قیمت',
    'buyPrice': 'قیمت خرید',
    'salePrice': 'قیمت فروش',
    'quantity': 'تعداد',
    'stock': 'موجودی',
    'amount': 'مبلغ',
    'totalPrice': 'مبلغ کل',
    'discount': 'تخفیف',
    'phone': 'تلفن',
    'status': 'وضعیت',
    'description': 'توضیحات',
    'isActive': 'وضعیت فعال/غیرفعال',
    'autoLogoutMinutes': 'مدت نشست عدم فعالیت',
    'allowedTabs': 'صفحات مجاز',
    'customPermissionsEnabled': 'دسترسی سفارشی',
    'accountingCode': 'کد حسابداری',
    'code': 'کد',
    'warehouseId': 'انبار',
    'dueDate': 'تاریخ سررسید',
    'date': 'تاریخ',
    'bankName': 'نام بانک',
    'sayadNumber': 'شماره صیاد',
    'checkNumber': 'شماره چک'
  };

  const ignoredKeys = new Set(['updatedAt', 'createdAt', '_t', 'id']);

  const allKeys = Array.from(new Set([...Object.keys(oldData), ...Object.keys(newData)]));

  for (const k of allKeys) {
    if (ignoredKeys.has(k)) continue;
    const oldVal = oldData[k];
    const newVal = newData[k];

    if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
      changesObj[k] = { old: oldVal, new: newVal };
      const fieldName = FIELD_TRANSLATIONS[k] || k;
      
      if (oldVal === undefined || oldVal === null || oldVal === '') {
        fieldDescriptions.push(`تعیین «${fieldName}» به «${String(newVal)}»`);
      } else if (newVal === undefined || newVal === null || newVal === '') {
        fieldDescriptions.push(`حذف مقدار «${fieldName}»`);
      } else if (typeof newVal === 'boolean') {
        fieldDescriptions.push(`تغییر «${fieldName}» به ${newVal ? 'فعال' : 'غیرفعال'}`);
      } else {
        fieldDescriptions.push(`تغییر «${fieldName}» از «${String(oldVal)}» به «${String(newVal)}»`);
      }
    }
  }

  const diffSummary = fieldDescriptions.slice(0, 5).join(' | ') + (fieldDescriptions.length > 5 ? ` و ${fieldDescriptions.length - 5} تغییر دیگر` : '');
  return { diffSummary, changesObj };
}

/**
 * Dispatches an audit log event to the backend.
 */
export async function logActivity(entry: Partial<SystemLog>): Promise<boolean> {
  try {
    const user = getCurrentUserForAudit();
    const device = getClientDeviceInfo();
    const now = Date.now();

    const payload: Partial<SystemLog> = {
      id: Math.random().toString(36).substring(2, 15),
      timestamp: now,
      dateStr: formatAuditDateTime(now),
      action: entry.action || 'CUSTOM',
      userId: entry.userId || user.id || user.username,
      username: entry.username || user.username,
      userName: entry.userName || user.name,
      userRole: entry.userRole || user.role,
      details: entry.details || 'انجام عملیات در سامانه',
      entityType: entry.entityType || 'system',
      entityId: entry.entityId,
      browser: entry.browser || device.browser,
      os: entry.os || device.os,
      device: entry.device || device.device,
      changes: entry.changes || (entry.oldData || entry.newData ? JSON.stringify({ old: entry.oldData, new: entry.newData }) : undefined),
      diffSummary: entry.diffSummary
    };

    const token = typeof window !== 'undefined' 
      ? (window.sessionStorage?.getItem('access_token') || window.localStorage?.getItem('access_token') || '')
      : '';
    const storeId = typeof window !== 'undefined'
      ? (window.sessionStorage?.getItem('activeStoreId') || window.localStorage?.getItem('activeStoreId') || 'default')
      : 'default';

    await fetch('/api/system_logs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token,
        'x-store-id': storeId
      },
      body: JSON.stringify(payload)
    });

    return true;
  } catch (err) {
    console.error('Failed to dispatch audit log:', err);
    return false;
  }
}

/**
 * Convenience logger for auth events.
 */
export async function logAuthEvent(action: 'LOGIN' | 'LOGOUT' | 'SESSION_TIMEOUT' | 'LOGIN_FAILED', details: string, userInfo?: any) {
  const user = userInfo || getCurrentUserForAudit();
  return logActivity({
    action,
    entityType: 'auth',
    entityId: user.id || user.username,
    userId: user.id || user.username,
    username: user.username,
    userName: user.name || user.username,
    userRole: user.role,
    details
  });
}
