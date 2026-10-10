
import { usePgMap, activePgPools, storeContext, SQLITE_FILE, connectPgDb, getDb, getActivePgPool, isPgActive, DB_CONFIG_FILE, dbs, DATA_FILE } from '../db/connection';
import { KNOWN_TABLES, tableSchemas, syncTableSchema, ensurePostgresTables } from '../db/schema-sync';
import { getDbData, setDbData, getAllDbData, innerGetDbData, innerSetDbData, handleRelations } from '../db/kv-store';
import { migrateSqliteToPostgres } from '../db/migration';
// import { loginSchema } from '../schemas/validation';
import { Client, Pool } from 'pg';
import os from 'os';

import { Router } from 'express';
import fsPromises from 'fs/promises';
import path from 'path';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { requireRole } from '../middleware/auth.middleware';
import { validateData } from '../schemas/validation';
import { eq, isNull, sql, desc, asc, inArray, and } from 'drizzle-orm';
import { db } from '../db';
import { checkbooks, issuedChecks, receivedChecks, checkAuditLogs, notifications, accounts, cashboxes } from '../db/schema';
import * as schema from '../db/schema';
import { calculateAllWarehouseStocks, validateStockAvailability } from '../utils/stockLogic';

const router = Router();

let serverInvoiceLock = Promise.resolve();
const acquireServerInvoiceLock = (): Promise<() => void> => {
  let release: () => void;
  const nextLock = new Promise<void>((res) => {
    release = res;
  });
  const currentLock = serverInvoiceLock;
  serverInvoiceLock = serverInvoiceLock.then(() => nextLock);
  return currentLock.then(() => release);
};

const INVOICE_TABLE_KEYS = [
  'invoices',
  'sales_invoices',
  'purchase_invoices',
  'warehouse_receipts',
  'warehouse_remittances',
  'sale_returns',
  'purchase_returns',
  'wastes'
];
const TABLE_DOC_TYPES: Record<string, string> = {
  sales_invoices: 'sale',
  purchase_invoices: 'purchase',
  sale_returns: 'sale_return',
  purchase_returns: 'purchase_return',
  warehouse_receipts: 'warehouse_receipt',
  warehouse_remittances: 'warehouse_remittance',
  wastes: 'waste',
  invoices: 'sale',
};

const fetchAllSystemDocsForServer = async (): Promise<any[]> => {
  const allDocsRaw: any[] = [];
  for (const tKey of INVOICE_TABLE_KEYS) {
    const d = await getDbData(tKey);
    if (Array.isArray(d)) {
      d.forEach((item: any) => {
        if (item && item.id) allDocsRaw.push({ ...item, _originTable: tKey });
      });
    }
  }
  const docsMap = new Map();
  allDocsRaw.forEach(doc => {
    if (!docsMap.has(String(doc.id))) docsMap.set(String(doc.id), doc);
  });
  return Array.from(docsMap.values());
};

let isSyncingStock = false;
let syncStockPending = false;
let syncStockDebounceTimer: NodeJS.Timeout | null = null;

const triggerServerStockSync = async () => {
  if (syncStockDebounceTimer) {
    clearTimeout(syncStockDebounceTimer);
  }

  return new Promise<void>((resolve) => {
    syncStockDebounceTimer = setTimeout(async () => {
      syncStockDebounceTimer = null;
      if (isSyncingStock) {
        syncStockPending = true;
        resolve();
        return;
      }
      isSyncingStock = true;
      try {
        const products = (await getDbData('products')) || [];
        const warehouses = (await getDbData('warehouses')) || [];
        const allDocs = await fetchAllSystemDocsForServer();
        const { stocksList, historyList } = calculateAllWarehouseStocks({
          products,
          warehouses,
          allDocs,
        });
        await setDbData('warehouse_stocks', stocksList);
        await setDbData('InventoryTransactions', historyList);
        await setDbData('kardex', historyList);
        await setDbData('inventory_transactions', historyList);
      } catch (e) {
        console.error('Error during server stock sync:', e);
      } finally {
        isSyncingStock = false;
        if (syncStockPending) {
          syncStockPending = false;
          setTimeout(() => triggerServerStockSync(), 200);
        }
        resolve();
      }
    }, 150);
  });
};

const isNegativeStockAllowedOnServer = async (doc?: any): Promise<boolean> => {
  try {
    if (doc) {
      if (
        doc.allowNegativeStock === true ||
        doc.allowNegativeStock === 'true' ||
        doc.allowNegativeStock === 1
      ) {
        return true;
      }
    }

    const companyProfile = await getDbData('company_profile');
    if (
      companyProfile?.allowNegativeStock === true ||
      companyProfile?.allowNegativeStock === 'true' ||
      companyProfile?.allowNegativeStock === 1
    ) {
      return true;
    }

    const storeSettings = await getDbData('store_settings');
    if (
      storeSettings?.allowNegativeStock === true ||
      storeSettings?.allowNegativeStock === 'true' ||
      storeSettings?.allowNegativeStock === 1
    ) {
      return true;
    }

    const settings = await getDbData('settings');
    if (
      settings?.allowNegativeStock === true ||
      settings?.allowNegativeStock === 'true' ||
      settings?.allowNegativeStock === 1
    ) {
      return true;
    }

    const storeSettingsCamel = await getDbData('storeSettings');
    if (
      storeSettingsCamel?.allowNegativeStock === true ||
      storeSettingsCamel?.allowNegativeStock === 'true' ||
      storeSettingsCamel?.allowNegativeStock === 1
    ) {
      return true;
    }
  } catch (e) {
    console.error('Error checking negative stock setting on server:', e);
  }
  return false;
};

const validateSalesInvoiceStock = async (doc: any, releaseLock?: (() => void) | null) => {
  const docType = doc.type || (doc._originTable && TABLE_DOC_TYPES[doc._originTable]) || 'sale';
  const outboundDocTypes = ['sale', 'warehouse_remittance', 'waste'];
  if (outboundDocTypes.includes(docType) && !doc.isDraft && doc.status !== 'draft' && doc.status !== 'voided' && !doc.isDeleted) {
    const isNegativeAllowed = await isNegativeStockAllowedOnServer(doc);
    if (isNegativeAllowed) {
      return { valid: true };
    }
    const products = (await getDbData('products')) || [];
    const warehouses = (await getDbData('warehouses')) || [];
    const allDocs = await fetchAllSystemDocsForServer();
    const validation = validateStockAvailability({
      docToValidate: doc,
      products,
      warehouses,
      allDocs,
      allowNegativeStock: isNegativeAllowed,
    });
    if (!validation.valid) {
      if (releaseLock) releaseLock();
      return validation;
    }
  }
  return { valid: true };
};
const DEFAULT_DOC_PREFIXES: Record<string, string> = {
  sale: "INV-",
  purchase: "PUR-",
  proforma: "PF-",
  sale_return: "RTN-S-",
  purchase_return: "RTN-P-",
};

// --- AUDIT LOGGING SERVER HELPERS ---
function parseUserAgentServer(uaString: string = ''): { browser: string; os: string; device: string } {
  let browser = 'مرورگر وب';
  let os = 'نامشخص';
  let device = 'رایانه (Desktop)';

  if (!uaString) return { browser, os, device };

  if (/mobile/i.test(uaString)) device = 'تلفن همراه (Mobile)';
  else if (/tablet|ipad/i.test(uaString)) device = 'تبلت (Tablet)';

  if (/windows nt 10.0/i.test(uaString)) os = 'ویندوز ۱۰ / ۱۱';
  else if (/windows nt 6.3/i.test(uaString)) os = 'ویندوز ۸.۱';
  else if (/windows nt 6.1/i.test(uaString)) os = 'ویندوز ۷';
  else if (/windows/i.test(uaString)) os = 'ویندوز';
  else if (/macintosh|mac os x/i.test(uaString)) os = 'مک (macOS)';
  else if (/android/i.test(uaString)) os = 'اندروید';
  else if (/iphone|ipad|ipod/i.test(uaString)) os = 'آی‌او‌اس (iOS)';
  else if (/linux/i.test(uaString)) os = 'لینوکس';

  if (/edg\//i.test(uaString)) {
    const m = uaString.match(/edg\/([\d.]+)/i);
    browser = `مایکروسافت اج ${m ? m[1].split('.')[0] : ''}`;
  } else if (/opr\/|opera\//i.test(uaString)) {
    browser = 'اپرا';
  } else if (/chrome\//i.test(uaString) && !/chromium/i.test(uaString)) {
    const m = uaString.match(/chrome\/([\d.]+)/i);
    browser = `گوگل کروم ${m ? m[1].split('.')[0] : ''}`;
  } else if (/firefox\//i.test(uaString)) {
    const m = uaString.match(/firefox\/([\d.]+)/i);
    browser = `موزیلا فایرفاکس ${m ? m[1].split('.')[0] : ''}`;
  } else if (/safari\//i.test(uaString) && !/chrome/i.test(uaString)) {
    const m = uaString.match(/version\/([\d.]+)/i);
    browser = `سافاری اپل ${m ? m[1].split('.')[0] : ''}`;
  }

  return { browser, os, device };
}

export function extractRequestUser(req: any) {
  let userId = 'system';
  let username = 'system';
  let userName = 'سیستم';
  let userRole = 'admin';

  if (req.user) {
    userId = req.user.id || req.user.username || 'system';
    username = req.user.username || 'system';
    userName = req.user.name || req.user.username || 'کاربر سیستم';
    userRole = req.user.role || 'user';
    return { userId, username, userName, userRole };
  }

  const authHeader = req.headers?.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const token = authHeader.split(' ')[1];
      const decoded: any = jwt.verify(token, process.env.JWT_SECRET || 'super-secret-jwt-key-2024');
      if (decoded) {
        userId = decoded.id || decoded.username || 'system';
        username = decoded.username || 'system';
        userName = decoded.name || decoded.username || 'کاربر سیستم';
        userRole = decoded.role || 'user';
        return { userId, username, userName, userRole };
      }
    } catch (_) {}
  }

  if (req.cookies && (req.cookies.refreshToken || req.cookies.accessToken)) {
    try {
      const token = req.cookies.accessToken || req.cookies.refreshToken;
      const secret = req.cookies.accessToken ? (process.env.JWT_SECRET || 'super-secret-jwt-key-2024') : (process.env.JWT_REFRESH_SECRET || 'super-secret-jwt-refresh-key-2024');
      const decoded: any = jwt.verify(token, secret);
      if (decoded) {
        userId = decoded.id || decoded.username || 'system';
        username = decoded.username || 'system';
        userName = decoded.name || decoded.username || 'کاربر سیستم';
        userRole = decoded.role || 'user';
        return { userId, username, userName, userRole };
      }
    } catch (_) {}
  }

  // Note: Client headers like x-user-info are explicitly ignored to prevent spoofing and privilege escalation
  return { userId, username, userName, userRole };
}

function extractClientInfo(req: any) {
  const ua = (req.headers && req.headers['user-agent']) || '';
  const parsed = parseUserAgentServer(ua);
  const ip = (req.headers && (req.headers['x-forwarded-for'] || req.headers['x-real-ip'])) || req.socket?.remoteAddress || req.ip || '127.0.0.1';
  const cleanIp = Array.isArray(ip) ? ip[0] : String(ip).split(',')[0].trim();
  return { ...parsed, ip: cleanIp, userAgent: ua };
}

export function checkDataModificationPermission(key: string, userRole: string): { allowed: boolean; message?: string } {
  if (userRole === 'admin') return { allowed: true };
  if (userRole === 'viewer' || userRole === 'guest') {
    return { allowed: false, message: 'کاربران با نقش بیننده یا مهمان اجازه تغییر و ثبت داده‌ها را ندارند.' };
  }
  if (['users', 'roles', 'permissions', 'company_profile', 'db_config', 'database_logs'].includes(key)) {
    return { allowed: false, message: 'فقط مدیر سیستم (admin) مجاز به ویرایش این بخش است.' };
  }
  if (['accounting_documents', 'fiscal_years', 'financial_years', 'ledger_accounts'].includes(key)) {
    if (!['admin', 'accountant'].includes(userRole)) {
      return { allowed: false, message: 'تنها مدیر سیستم و حسابدار مجاز به ثبت یا تغییر اسناد مالی و کدینگ حسابداری هستند.' };
    }
  }
  return { allowed: true };
}

function getEntityPersianName(key: string): string {
  const map: Record<string, string> = {
    'invoices': 'فاکتور',
    'sales_invoices': 'فاکتور فروش',
    'purchase_invoices': 'فاکتور خرید',
    'sale_returns': 'برگشت از فروش',
    'purchase_returns': 'برگشت از خرید',
    'warehouse_receipts': 'رسید انبار',
    'warehouse_remittances': 'حواله انبار',
    'products': 'کالا و خدمات',
    'persons': 'طرف‌حساب / شخص',
    'transactions': 'تراکنش مالی',
    'receipt_transactions': 'رسید دریافت وجه',
    'payment_transactions': 'رسید پرداخت وجه',
    'accounts': 'حساب بانکی',
    'cashboxes': 'صندوق نقدی',
    'received_checks': 'چک صیادی دریافتی',
    'issued_checks': 'چک پرداختی',
    'checkbooks': 'دسته‌چک',
    'accounting_documents': 'سند حسابداری دوبل',
    'loans': 'پرونده وام',
    'installments': 'قسط وام',
    'users': 'حساب کاربری',
    'settings': 'تنظیمات سیستم',
    'financial_years': 'سال مالی',
    'warehouses': 'انبار',
    'product_categories': 'دسته‌بندی کالا',
    'person_groups': 'گروه‌بندی اشخاص',
    'person_opening_balances': 'سند افتتاحیه شخص'
  };
  return map[key] || key;
}

function generateActionDescription(action: string, key: string, item: any): string {
  const entity = getEntityPersianName(key);
  const title = item?.name || item?.title || item?.invoiceNumber || item?.code || item?.sayadNumber || item?.accountingCode || item?.id || '';

  if (action === 'CREATE') {
    return title ? `ثبت ${entity} جدید با عنوان/شماره «${title}»` : `ثبت رکورد جدید در ${entity}`;
  }
  if (action === 'UPDATE') {
    return title ? `ویرایش اطلاعات ${entity} «${title}»` : `ویرایش اطلاعات در ${entity}`;
  }
  if (action === 'DELETE') {
    return title ? `حذف ${entity} «${title}»` : `حذف رکورد از ${entity}`;
  }
  return `${action} در ${entity}`;
}

function createDiffSummaryServer(oldItem: any, newItem: any): string {
  if (!oldItem || !newItem || typeof oldItem !== 'object' || typeof newItem !== 'object') return '';
  const changes: string[] = [];
  const ignored = new Set(['updatedAt', 'createdAt', '_t', 'id']);
  const allKeys = Array.from(new Set([...Object.keys(oldItem), ...Object.keys(newItem)]));

  for (const k of allKeys) {
    if (ignored.has(k)) continue;
    if (JSON.stringify(oldItem[k]) !== JSON.stringify(newItem[k])) {
      changes.push(k);
    }
  }
  if (changes.length === 0) return 'بدون تغییر داده‌های اصلی';
  return `تغییر در فیلدهای: ${changes.slice(0, 5).join(', ')}${changes.length > 5 ? ' و...' : ''}`;
}

async function dispatchAdminNotificationIfSensitive(logEntry: any) {
  if (!logEntry || typeof logEntry !== 'object') return;
  try {
    const action = String(logEntry.action || '').toUpperCase();
    const entity = String(logEntry.entityType || '').toLowerCase();
    const details = String(logEntry.details || '');
    const actorName = logEntry.userName || logEntry.username || 'کاربر سیستم';
    const actorUsername = logEntry.username || 'system';
    const ip = logEntry.ip || '127.0.0.1';

    let isSensitive = false;
    let title = '';
    let message = '';
    let severity = 'warning';

    // 1. Invoice Deletions (Critical)
    if (action === 'DELETE' && (['invoices', 'sales_invoices', 'purchase_invoices', 'sale_returns', 'purchase_returns'].includes(entity) || details.includes('فاکتور'))) {
      isSensitive = true;
      severity = 'critical';
      title = 'هشدار امنیتی: حذف فاکتور در سیستم';
      message = `یک فاکتور توسط کاربر «${actorName}» (@${actorUsername}) حذف شد.\nشرح: ${details}\nآدرس IP: ${ip}`;
    }
    // 2. Settings & Financial Configuration Changes
    else if (['settings', 'financial_years', 'tax_settings', 'company_profile', 'doc_counters', 'number_format_config', 'accounting_settings'].includes(entity) || action === 'SETTINGS_CHANGE' || details.includes('تنظیمات') || details.includes('سال مالی') || details.includes('ارز')) {
      isSensitive = true;
      const isDelete = action === 'DELETE';
      severity = isDelete ? 'critical' : 'warning';
      title = isDelete 
        ? 'هشدار مدیریتی: حذف تنظیمات یا دوره مالی در سیستم' 
        : (details.includes('مالی') || entity === 'financial_years' || details.includes('ارز') || details.includes('مالیات')
          ? 'هشدار مدیریتی: تغییر در تنظیمات مالی سیستم' 
          : 'هشدار مدیریتی: تغییر در تنظیمات و پیکربندی سیستم');
      message = `تنظیمات مالی یا پیکربندی سیستم توسط کاربر «${actorName}» (@${actorUsername}) بروزرسانی گردید.\nشرح: ${details}\nآدرس IP: ${ip}`;
    }
    // 3. Financial Transactions & Accounting Documents Deletion
    else if (action === 'DELETE' && ['transactions', 'receipt_transactions', 'payment_transactions', 'accounting_documents', 'accounts', 'cashboxes'].includes(entity)) {
      isSensitive = true;
      severity = 'critical';
      title = 'هشدار مالی: حذف سند حسابداری یا تراکنش';
      message = `سند یا تراکنش مالی توسط کاربر «${actorName}» (@${actorUsername}) حذف گردید.\nشرح: ${details}\nآدرس IP: ${ip}`;
    }
    // 4. Check deletions
    else if (action === 'DELETE' && ['received_checks', 'issued_checks', 'checkbooks'].includes(entity)) {
      isSensitive = true;
      severity = 'critical';
      title = 'هشدار صیادی: حذف چک از سیستم';
      message = `چک صیادی توسط کاربر «${actorName}» (@${actorUsername}) حذف شد.\nشرح: ${details}\nآدرس IP: ${ip}`;
    }
    // 5. User & Access Level Changes
    else if (entity === 'users') {
      if (action === 'DELETE') {
        isSensitive = true;
        severity = 'critical';
        title = 'هشدار امنیتی: حذف حساب کاربری';
        message = `کاربر «${details}» توسط «${actorName}» (@${actorUsername}) حذف شد.\nآدرس IP: ${ip}`;
      } else if (action === 'STATUS_CHANGE' || action === 'UPDATE') {
        isSensitive = true;
        severity = 'warning';
        title = 'هشدار امنیتی: تغییر در سطوح دسترسی کاربران';
        message = `اطلاعات یا سطوح دسترسی کاربر توسط «${actorName}» (@${actorUsername}) ویرایش گردید.\nشرح: ${details}`;
      }
    }
    // 6. Warehouse & Product deletions
    else if (action === 'DELETE' && ['products', 'warehouses', 'warehouse_receipts', 'warehouse_remittances'].includes(entity)) {
      isSensitive = true;
      severity = 'warning';
      title = 'هشدار انبار: حذف کالا یا حواله/رسید انبار';
      message = `سند انبار یا کالا توسط کاربر «${actorName}» (@${actorUsername}) حذف شد.\nشرح: ${details}`;
    }

    if (!isSensitive) return;

    let notifs = (await getDbData('notifications')) || [];
    if (!Array.isArray(notifs)) notifs = [];

    const newNotification = {
      id: 'notif_' + Math.random().toString(36).substring(2, 12),
      userId: 'admin',
      targetRole: 'admin',
      title,
      message,
      type: severity,
      read: false,
      createdAt: new Date().toISOString(),
      metadata: {
        logId: logEntry.id,
        action: logEntry.action,
        entityType: logEntry.entityType,
        entityId: logEntry.entityId,
        actorUsername,
        actorName,
        ip,
        timestamp: logEntry.timestamp || Date.now()
      }
    };

    notifs.unshift(newNotification);
    if (notifs.length > 500) notifs.length = 500;
    await setDbData('notifications', notifs);
  } catch (err) {
    console.error('Error dispatching admin notification for sensitive activity:', err);
  }
}

export function preparePgItem(key: string, item: Record<string, any>) {
  const colTypes = tableSchemas.get(key);
  const itemKeys: string[] = [];
  const itemVals: any[] = [];
  for (const [k, rawVal] of Object.entries(item)) {
    if (rawVal === undefined) continue;
    itemKeys.push(k);
    let val = rawVal;
    if (val instanceof Date) {
      val = val.toISOString();
    } else if (val !== null && typeof val === 'object') {
      val = JSON.stringify(val);
    }
    const colType = colTypes?.get(k);
    const isNumCol = colType && ['double precision', 'real', 'numeric', 'integer', 'bigint', 'smallint'].includes(colType);
    if (isNumCol && typeof val === 'string' && isNaN(Number(val))) {
      val = null;
    }
    itemVals.push(val);
  }
  return { itemKeys, itemVals };
}

// Dedicated System Logs Endpoints
router.get('/api/system_logs', async (req, res) => {
  try {
    let logs = (await getDbData('system_logs')) || [];
    if (!Array.isArray(logs)) logs = [];

    // Sort descending by timestamp
    logs.sort((a: any, b: any) => (b.timestamp || 0) - (a.timestamp || 0));

    const { action, entityType, userId, search, limit } = req.query;

    if (action && action !== 'ALL') {
      logs = logs.filter((l: any) => l.action && l.action.startsWith(action as string));
    }
    if (entityType && entityType !== 'ALL') {
      logs = logs.filter((l: any) => l.entityType === entityType);
    }
    if (userId && userId !== 'ALL') {
      logs = logs.filter((l: any) => String(l.userId) === String(userId) || l.username === userId);
    }
    if (search) {
      const q = String(search).toLowerCase();
      logs = logs.filter((l: any) => 
        (l.details && l.details.toLowerCase().includes(q)) ||
        (l.username && l.username.toLowerCase().includes(q)) ||
        (l.userName && l.userName.toLowerCase().includes(q)) ||
        (l.entityType && l.entityType.toLowerCase().includes(q)) ||
        (l.ip && l.ip.includes(q)) ||
        (l.browser && l.browser.toLowerCase().includes(q)) ||
        (l.diffSummary && l.diffSummary.toLowerCase().includes(q))
      );
    }

    const maxLimit = limit ? Math.min(parseInt(limit as string, 10), 2000) : 1000;
    res.json(logs.slice(0, maxLimit));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/api/system_logs', async (req, res) => {
  try {
    const logEntry = req.body;
    if (!logEntry || typeof logEntry !== 'object') {
      return res.status(400).json({ error: 'Invalid log payload' });
    }

    const userInfo = extractRequestUser(req);
    const clientInfo = extractClientInfo(req);
    const timestamp = logEntry.timestamp || Date.now();

    const fullLog = {
      id: logEntry.id || Math.random().toString(36).substring(2, 15),
      timestamp,
      action: logEntry.action || 'CUSTOM',
      userId: logEntry.userId || userInfo.userId,
      username: logEntry.username || userInfo.username,
      userName: logEntry.userName || userInfo.userName,
      userRole: logEntry.userRole || userInfo.userRole,
      details: logEntry.details || 'انجام عملیات در سیستم',
      entityType: logEntry.entityType || 'system',
      entityId: logEntry.entityId || null,
      changes: logEntry.changes || null,
      diffSummary: logEntry.diffSummary || null,
      oldData: logEntry.oldData || null,
      newData: logEntry.newData || null,
      ip: logEntry.ip || clientInfo.ip,
      browser: logEntry.browser || clientInfo.browser,
      os: logEntry.os || clientInfo.os,
      device: logEntry.device || clientInfo.device,
      userAgent: logEntry.userAgent || clientInfo.userAgent,
    };

    let sysLogs = (await getDbData('system_logs')) || [];
    if (!Array.isArray(sysLogs)) sysLogs = [];
    sysLogs.unshift(fullLog);
    if (sysLogs.length > 3000) sysLogs.length = 3000;

    await setDbData('system_logs', sysLogs);
    dispatchAdminNotificationIfSensitive(fullLog).catch(e => console.error(e));
    res.json({ success: true, log: fullLog });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
router.post('/api/data/users', requireRole(['admin']), async (req, res, next) => {
    try {
      const users = req.body;
      if (Array.isArray(users)) {
        for (const user of users) {
          if (user.password && !user.password.startsWith('$2b$')) {
            user.password = await bcrypt.hash(user.password, 10);
          }
        }
      }
      req.body = users;
      next();
    } catch(e: any) {
      res.status(500).json({ error: e.message });
    }
  });

router.get('/api/data/:key', async (req, res) => {
    const { key } = req.params;
    const { limit, offset, page, pageSize, search, sortBy, sortOrder, sortDir, paginated } = req.query;
    try {
      // 1. Intelligent HTTP caching for base reference tables
      res.setHeader('Vary', 'x-store-id, Authorization');
      if (['product_categories', 'warehouses', 'person_roles', 'person_groups'].includes(key)) {
        res.setHeader('Cache-Control', 'public, max-age=15, stale-while-revalidate=30');
      } else {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      }

      let data = await getDbData(key);
      
      const isCollectionKey = [
        'invoices', 'sales_invoices', 'purchase_invoices', 'warehouse_receipts', 'warehouse_remittances',
        'proforma_invoices', 'sale_returns', 'purchase_returns', 'wastes', 'transactions', 'receipt_transactions',
        'payment_transactions', 'persons', 'products', 'warehouses', 'accounting_documents', 'issued_checks',
        'received_checks', 'checkbooks', 'loans', 'installments', 'payslips', 'product_categories', 'person_groups',
        'person_roles', 'person_categories', 'sales_invoice_payments', 'purchase_invoice_payments',
        'inventory_transactions', 'system_logs'
      ].includes(key);

      if ((data === null || data === undefined) && isCollectionKey) {
        data = [];
      }
      
      // If collection is an array and filtering/pagination is requested
      if (Array.isArray(data)) {
        let items = [...data];

        // Search filtering
        if (search && typeof search === 'string' && search.trim()) {
          const q = search.trim().toLowerCase();
          items = items.filter((item: any) => {
            if (!item) return false;
            return Object.values(item).some(val => 
              typeof val === 'string' && val.toLowerCase().includes(q)
            );
          });
        }

        // Sorting
        const activeSortDir = (sortOrder || sortDir || 'desc') === 'asc' ? 'asc' : 'desc';
        if (sortBy && typeof sortBy === 'string') {
          const isAsc = activeSortDir === 'asc';
          items.sort((a, b) => {
            const valA = a[sortBy];
            const valB = b[sortBy];
            if (valA === valB) return 0;
            if (valA === undefined || valA === null) return 1;
            if (valB === undefined || valB === null) return -1;
            return isAsc ? (valA > valB ? 1 : -1) : (valA < valB ? 1 : -1);
          });
        } else if (['invoices', 'transactions', 'system_logs', 'accounting_documents', 'inventory_transactions'].includes(key)) {
          // Default sorting by createdAt / date descending
          items.sort((a, b) => (b.createdAt || b.date || 0) - (a.createdAt || a.date || 0));
        }

        const total = items.length;

        // Pagination
        const isPaginated = limit !== undefined || offset !== undefined || page !== undefined || pageSize !== undefined || paginated === 'true';
        if (isPaginated) {
          const limitNum = Math.max(1, parseInt((pageSize || limit) as string, 10) || 50);
          const pageNum = parseInt(page as string, 10);
          const offsetNum = !isNaN(pageNum) && pageNum > 0
            ? (pageNum - 1) * limitNum
            : Math.max(0, parseInt(offset as string, 10) || 0);
          const pagedItems = items.slice(offsetNum, offsetNum + limitNum);
          const currentPage = !isNaN(pageNum) && pageNum > 0 ? pageNum : Math.floor(offsetNum / limitNum) + 1;
          const totalPages = Math.ceil(total / limitNum);

          return res.json({
            data: pagedItems,
            items: pagedItems,
            total,
            totalCount: total,
            page: currentPage,
            pageSize: limitNum,
            totalPages,
            limit: limitNum,
            offset: offsetNum,
            hasMore: offsetNum + limitNum < total
          });
        }

        return res.json(items);
      }
      
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

router.post('/api/data/batch', async (req, res) => {
    const { operations } = req.body;
    if (!Array.isArray(operations)) {
      return res.status(400).json({ error: 'Expected operations array' });
    }
    
    try {
      const userInfo = extractRequestUser(req);
      const validOperations = operations.filter((op: any) => op && typeof op === 'object' && op.key);

      // Validate permissions for all targets in batch
      for (const op of validOperations) {
        const perm = checkDataModificationPermission(op.key, userInfo.userRole);
        if (!perm.allowed) {
          return res.status(403).json({ error: perm.message, key: op.key });
        }

        // Immutability: Permanent/Finalized accounting documents cannot be modified or deleted via batch
        if (op.key === 'accounting_documents' && (op.type === 'update' || op.type === 'delete')) {
          const currentDocs = (await getDbData('accounting_documents')) || [];
          const targetId = String(op.id || op.data?.id || '');
          if (targetId) {
            const targetDoc = Array.isArray(currentDocs) ? currentDocs.find((d: any) => d && String(d.id) === targetId) : null;
            if (targetDoc && (targetDoc.status === 'permanent' || targetDoc.status === 'finalized' || targetDoc.isFinalized)) {
              return res.status(403).json({
                error: `امکان تغییر یا حذف سند حسابداری قطعی‌شده شماره ${targetDoc.documentNumber || targetDoc.id} وجود ندارد. طبق استانداردهای مالی باید سند معکوس / اصلاحی صادر گردد.`,
                code: 'DOCUMENT_IMMUTABLE'
              });
            }
          }
        }
      }

      // Group operations by key
      const keys = new Set(validOperations.map((op: any) => op.key));
      const results: any[] = [];
      const sysLogs = (await getDbData('system_logs')) || [];
      const timestamp = Date.now();
      const clientInfo = extractClientInfo(req);

      if (isPgActive() && getActivePgPool()) {
        const client = await getActivePgPool().connect();
        try {
          // Pre-sync DDL before transaction BEGIN to ensure all columns exist and types match in PostgreSQL
          for (const key of Array.from(keys)) {
            if (!KNOWN_TABLES.includes(key)) continue;
            await client.query(`CREATE TABLE IF NOT EXISTS "${key}" (id VARCHAR PRIMARY KEY)`);
            const keyOps = validOperations.filter((op: any) => op.key === key);
            let existingData: any[] | null = null;
            for (const op of keyOps) {
              if (op.type === 'append' && op.data) {
                await syncTableSchema(client, key, { ...op.data, version: 1, createdAt: '', updatedAt: '', rawDate: '', displayDate: '' });
              } else if (op.type === 'update') {
                if (!existingData) {
                  existingData = (await getDbData(key)) || [];
                }
                const targetId = String(op.id || (op.data && op.data.id) || '');
                const existing = Array.isArray(existingData) ? existingData.find((x: any) => x && String(x.id) === targetId) : null;
                const sampleUpdated = { ...(existing || {}), ...(op.data || {}), version: 1, createdAt: '', updatedAt: '', rawDate: '', displayDate: '' };
                await syncTableSchema(client, key, sampleUpdated);
              }
            }
          }

          await client.query('BEGIN');
          for (const key of Array.from(keys)) {
            if (!KNOWN_TABLES.includes(key)) continue;
            let data = (await getDbData(key)) || [];
            if (!Array.isArray(data)) data = [];

            const keyOps = validOperations.filter((op: any) => op.key === key);
            for (const op of keyOps) {
              if (op.type === 'append') {
                const item = (op.data && typeof op.data === 'object') ? { ...op.data } : { data: op.data };
                if (!item.id) item.id = Math.random().toString(36).substring(2, 15);
                if (item.version === undefined) item.version = 1;
                item.createdAt = item.createdAt || new Date().toISOString();
                item.updatedAt = item.updatedAt || new Date().toISOString();

                await syncTableSchema(client, key, item);
                const { itemKeys, itemVals } = preparePgItem(key, item);
                const placeholders = itemKeys.map((_, i) => `$${i + 1}`).join(', ');
                const colNames = itemKeys.map(k => `"${k}"`).join(', ');
                await client.query(`INSERT INTO "${key}" (${colNames}) VALUES (${placeholders}) ON CONFLICT(id) DO UPDATE SET ${itemKeys.map(k => `"${k}" = EXCLUDED."${k}"`).join(', ')}`, itemVals);
                results.push({ id: item.id, status: 'appended' });
                sysLogs.unshift({
                  id: Math.random().toString(36).substring(2, 15),
                  action: 'CREATE',
                  userId: userInfo.userId,
                  username: userInfo.username,
                  userName: userInfo.userName,
                  userRole: userInfo.userRole,
                  details: generateActionDescription('CREATE', key, item),
                  entityType: key,
                  entityId: item.id,
                  oldData: null,
                  newData: item,
                  changes: JSON.stringify(item),
                  diffSummary: `ثبت رکورد جدید در ${getEntityPersianName(key)}`,
                  ip: clientInfo.ip,
                  browser: clientInfo.browser,
                  os: clientInfo.os,
                  device: clientInfo.device,
                  userAgent: clientInfo.userAgent,
                  timestamp
                });
              } else if (op.type === 'update') {
                const targetId = String(op.id || (op.data && op.data.id) || '');
                const existing = targetId ? data.find((x: any) => x && String(x.id) === targetId) : null;
                if (existing) {
                  // Optimistic Locking Check
                  if (op.version !== undefined && existing.version !== undefined && Number(op.version) !== Number(existing.version)) {
                    throw new Error(`CONCURRENCY_CONFLICT: سند ${targetId} در جدول ${key} همزمان تغییر یافته است.`);
                  }
                  const updatedItem = { ...existing, ...(op.data || {}), id: targetId };
                  updatedItem.version = ((Number(existing.version) || 0) + 1);
                  updatedItem.updatedAt = new Date().toISOString();

                  await syncTableSchema(client, key, updatedItem);
                  const { itemKeys, itemVals } = preparePgItem(key, updatedItem);
                  const placeholders = itemKeys.map((_, i) => `$${i + 1}`).join(', ');
                  const colNames = itemKeys.map(k => `"${k}"`).join(', ');
                  await client.query(`INSERT INTO "${key}" (${colNames}) VALUES (${placeholders}) ON CONFLICT(id) DO UPDATE SET ${itemKeys.map(k => `"${k}" = EXCLUDED."${k}"`).join(', ')}`, itemVals);
                  results.push({ id: targetId, status: 'updated' });
                  sysLogs.unshift({
                    id: Math.random().toString(36).substring(2, 15),
                    action: 'UPDATE',
                    userId: userInfo.userId,
                    username: userInfo.username,
                    userName: userInfo.userName,
                    userRole: userInfo.userRole,
                    details: generateActionDescription('UPDATE', key, op.data),
                    entityType: key,
                    entityId: targetId,
                    oldData: existing,
                    newData: updatedItem,
                    diffSummary: createDiffSummaryServer(existing, updatedItem),
                    changes: JSON.stringify({ old: existing, new: updatedItem }),
                    ip: clientInfo.ip,
                    browser: clientInfo.browser,
                    os: clientInfo.os,
                    device: clientInfo.device,
                    userAgent: clientInfo.userAgent,
                    timestamp
                  });
                }
              } else if (op.type === 'delete') {
                const targetId = String(op.id || (op.data && op.data.id) || '');
                if (targetId) {
                  const existing = data.find((x: any) => x && String(x.id) === targetId);
                  if (['checkbooks', 'issued_checks', 'received_checks'].includes(key)) {
                    await client.query(`UPDATE "${key}" SET deleted_at = NOW(), "isDeleted" = true WHERE id = $1`, [targetId]);
                  } else {
                    await client.query(`DELETE FROM "${key}" WHERE id = $1`, [targetId]);
                  }
                  results.push({ id: targetId, status: 'deleted' });
                  sysLogs.unshift({
                    id: Math.random().toString(36).substring(2, 15),
                    action: 'DELETE',
                    userId: userInfo.userId,
                    username: userInfo.username,
                    userName: userInfo.userName,
                    userRole: userInfo.userRole,
                    details: generateActionDescription('DELETE', key, existing || { id: targetId }),
                    entityType: key,
                    entityId: targetId,
                    oldData: existing || null,
                    newData: null,
                    changes: JSON.stringify(existing || { id: targetId }),
                    diffSummary: `حذف رکورد از ${getEntityPersianName(key)}`,
                    ip: clientInfo.ip,
                    browser: clientInfo.browser,
                    os: clientInfo.os,
                    device: clientInfo.device,
                    userAgent: clientInfo.userAgent,
                    timestamp
                  });
                }
              }
            }
          }
          await client.query('COMMIT');
        } catch (pgErr) {
          await client.query('ROLLBACK');
          throw pgErr;
        } finally {
          client.release();
        }
      } else {
        for (const key of Array.from(keys)) {
           let data = (await getDbData(key));
           if (!Array.isArray(data)) {
             data = [];
           }
           
           const keyOps = validOperations.filter((op: any) => op.key === key);
           for (const op of keyOps) {
              if (op.type === 'append') {
                 const item = (op.data && typeof op.data === 'object') ? { ...op.data } : { data: op.data };
                 if (!item.id) item.id = Math.random().toString(36).substring(2, 15);
                 if (item.version === undefined) item.version = 1;
                 item.createdAt = item.createdAt || new Date().toISOString();
                 item.updatedAt = item.updatedAt || new Date().toISOString();

                 const idx = data.findIndex((x: any) => x && x.id !== undefined && String(x.id) === String(item.id));
                 if (idx !== -1) {
                     data[idx] = { ...data[idx], ...item };
                 } else {
                     data.push(item);
                 }
                 results.push({ id: item.id, status: 'appended' });
                 sysLogs.unshift({ 
                   id: Math.random().toString(36).substring(2, 15), 
                   action: 'CREATE', 
                   userId: userInfo.userId, 
                   username: userInfo.username,
                   userName: userInfo.userName,
                   userRole: userInfo.userRole,
                   details: generateActionDescription('CREATE', key, item), 
                   entityType: key, 
                   entityId: item.id, 
                   newData: item,
                   changes: JSON.stringify(item),
                   ip: clientInfo.ip,
                   browser: clientInfo.browser,
                   os: clientInfo.os,
                   device: clientInfo.device,
                   userAgent: clientInfo.userAgent,
                   timestamp 
                 });
              } else if (op.type === 'update') {
                 const targetId = String(op.id || (op.data && op.data.id) || '');
                 if (targetId) {
                   const idx = data.findIndex((x: any) => x && x.id !== undefined && String(x.id) === targetId);
                   if (idx !== -1) {
                      const oldItem = data[idx];
                      if (op.version !== undefined && oldItem.version !== undefined && Number(op.version) !== Number(oldItem.version)) {
                        return res.status(409).json({ error: 'CONCURRENCY_CONFLICT', message: `سند ${targetId} همزمان ویرایش شده است.` });
                      }
                      const nextVersion = ((Number(oldItem.version) || 0) + 1);
                      data[idx] = { ...data[idx], ...(op.data || {}), id: targetId, version: nextVersion, updatedAt: new Date().toISOString() };
                      results.push({ id: targetId, status: 'updated' });
                      sysLogs.unshift({ 
                        id: Math.random().toString(36).substring(2, 15), 
                        action: 'UPDATE', 
                        userId: userInfo.userId, 
                        username: userInfo.username, 
                        userName: userInfo.userName, 
                        userRole: userInfo.userRole, 
                        details: generateActionDescription('UPDATE', key, op.data), 
                        entityType: key, 
                        entityId: targetId, 
                        diffSummary: createDiffSummaryServer(oldItem, data[idx]), 
                        oldData: oldItem, 
                        newData: data[idx], 
                        changes: JSON.stringify({ old: oldItem, new: data[idx] }), 
                        ip: clientInfo.ip, 
                        browser: clientInfo.browser, 
                        os: clientInfo.os, 
                        device: clientInfo.device, 
                        userAgent: clientInfo.userAgent, 
                        timestamp 
                      });
                   }
                 }
              } else if (op.type === 'delete') {
                 const targetId = String(op.id || (op.data && op.data.id) || '');
                 if (targetId) {
                   const idx = data.findIndex((x: any) => x && x.id !== undefined && String(x.id) === targetId);
                   if (idx !== -1) {
                      const oldItem = data[idx];
                      if (['checkbooks', 'issued_checks', 'received_checks'].includes(key)) {
                         data[idx].deleted_at = new Date().toISOString();
                         data[idx].isDeleted = true;
                      } else {
                         data.splice(idx, 1);
                      }
                      results.push({ id: targetId, status: 'deleted' });
                      sysLogs.unshift({ 
                        id: Math.random().toString(36).substring(2, 15), 
                        action: 'DELETE', 
                        userId: userInfo.userId, 
                        username: userInfo.username, 
                        userName: userInfo.userName, 
                        userRole: userInfo.userRole, 
                        details: generateActionDescription('DELETE', key, oldItem), 
                        entityType: key, 
                        entityId: targetId, 
                        oldData: oldItem, 
                        changes: JSON.stringify(oldItem), 
                        ip: clientInfo.ip, 
                        browser: clientInfo.browser, 
                        os: clientInfo.os, 
                        device: clientInfo.device, 
                        userAgent: clientInfo.userAgent, 
                        timestamp 
                      });
                   }
                 }
              }
           }
           await setDbData(key, data);
        }
      }
      
      try {
        await setDbData('system_logs', sysLogs);
        // Notify admin for any sensitive operations in this batch
        for (const opLog of sysLogs.slice(0, validOperations.length)) {
          dispatchAdminNotificationIfSensitive(opLog).catch(e => console.error(e));
        }
      } catch (logErr) {
        console.warn('System log save error in batch:', logErr);
      }
      res.json({ success: true, results });
    } catch(err: any) {
      if (err.message && err.message.includes('CONCURRENCY_CONFLICT')) {
        return res.status(409).json({ error: err.message });
      }
      console.error('Error in POST /api/data/batch:', err);
      res.status(500).json({ error: err.message || 'خطای غیرمنتظره در ثبت دسته ای اطلاعات' });
    }
  });

router.post('/api/data/:key/append', async (req, res) => {
    const { key } = req.params;
    const newItem = req.body;
    const userInfo = extractRequestUser(req);
    const perm = checkDataModificationPermission(key, userInfo.userRole);
    if (!perm.allowed) {
      return res.status(403).json({ error: perm.message });
    }
    
    // Zod Validation
    const validationResult = validateData(key, newItem);
    if (!validationResult.success) {
      return res.status(400).json({ error: 'Validation failed', details: (validationResult as any).error?.errors });
    }

    let releaseServerLock: (() => void) | null = null;
    try {
      if (INVOICE_TABLE_KEYS.includes(key)) {
        releaseServerLock = await acquireServerInvoiceLock();
        try {
          const docType = newItem.type || TABLE_DOC_TYPES[key] || 'sale';

          let existingInvs: any[] = [];
          if (isPgActive() && getActivePgPool()) {
            try {
              const r1 = await getActivePgPool().query(`SELECT id, "invoiceNumber", type FROM "${key}" WHERE "invoiceNumber" IS NOT NULL`);
              existingInvs = r1.rows || [];
              if (key !== 'invoices') {
                const r2 = await getActivePgPool().query(`SELECT id, "invoiceNumber", type FROM "invoices" WHERE "invoiceNumber" IS NOT NULL`);
                existingInvs = existingInvs.concat(r2.rows || []);
              }
            } catch(e) {}
          } else {
            const d1 = (await getDbData(key)) || [];
            const d2 = key !== 'invoices' ? ((await getDbData('invoices')) || []) : [];
            existingInvs = [...(Array.isArray(d1) ? d1 : []), ...(Array.isArray(d2) ? d2 : [])];
          }

          const rawInvNum = String(newItem.invoiceNumber || '').trim();
          const isPlaceholder = !rawInvNum || rawInvNum.includes('خودکار') || rawInvNum.includes('تولید خودکار');
          const isDuplicate = existingInvs.some(inv => 
            inv && String(inv.id) !== String(newItem.id) &&
            (inv.type === docType || (!inv.type && docType === 'sale')) &&
            String(inv.invoiceNumber || '').trim().toLowerCase() === rawInvNum.toLowerCase()
          );

          if (isPlaceholder || isDuplicate) {
            const settings = (await getDbData('settings')) || {};
            const counters = (await getDbData('doc_counters')) || {};
            const prefixKey = `prefix_${docType}`;
            const startKey = `start_${docType}`;
            const lenKey = `len_${docType}`;

            const prefix = (settings[prefixKey] !== undefined && settings[prefixKey] !== null && settings[prefixKey] !== '')
              ? String(settings[prefixKey])
              : (DEFAULT_DOC_PREFIXES[docType] || '');
            const start = Number(settings[startKey] ?? 1000);
            const len = Number(settings[lenKey] ?? 6);

            let maxVal = 0;
            existingInvs.forEach(inv => {
              if (inv && (inv.type === docType || (!inv.type && docType === 'sale'))) {
                let valStr = String(inv.invoiceNumber || '');
                if (prefix && valStr.startsWith(prefix)) valStr = valStr.substring(prefix.length);
                const val = parseInt(valStr.replace(/\D/g, ''), 10);
                if (!isNaN(val) && val > maxVal) maxVal = val;
              }
            });

            const counterVal = Number(counters[docType]) || 0;
            let nextVal = Math.max(counterVal, maxVal, start - 1) + 1;
            let candidate = `${prefix}${String(nextVal).padStart(len, '0')}`;

            while (existingInvs.some(inv => 
              inv && String(inv.id) !== String(newItem.id) &&
              (inv.type === docType || (!inv.type && docType === 'sale')) &&
              String(inv.invoiceNumber || '').trim().toLowerCase() === candidate.toLowerCase()
            )) {
              nextVal++;
              candidate = `${prefix}${String(nextVal).padStart(len, '0')}`;
            }

            newItem.invoiceNumber = candidate;
            counters[docType] = nextVal;
            await setDbData('doc_counters', counters);
          }
        } catch (lockErr) {
          console.error('Error during invoice number verification/correction:', lockErr);
        }
      }

      if (!newItem.id) newItem.id = Math.random().toString(36).substring(2, 15);

      // Validation for Double-Entry Accounting Documents
      if (key === 'accounting_documents') {
        const items = newItem.items;
        if (!items || !Array.isArray(items) || items.length < 2) {
          if (releaseServerLock) releaseServerLock();
          return res.status(400).json({ error: 'سند حسابداری باید حداقل شامل دو آرتیکل (یک بدهکار و یک بستانکار) باشد.' });
        }
        const totalDebit = items.reduce((sum: number, it: any) => sum + (Number(it.debit) || 0), 0);
        const totalCredit = items.reduce((sum: number, it: any) => sum + (Number(it.credit) || 0), 0);
        if (Math.abs(totalDebit - totalCredit) > 0.001) {
          if (releaseServerLock) releaseServerLock();
          return res.status(400).json({ error: `سند حسابداری تراز نیست. جمع بدهکار (${totalDebit.toLocaleString()}) با جمع بستانکار (${totalCredit.toLocaleString()}) مغایرت دارد.` });
        }
      }

      // Concurrency Stock Availability Check for Sales Invoices and Outbound Documents
      // Prevents race conditions where available stock is oversold (Available = Physical - Reserved)
      const docType = newItem.type || TABLE_DOC_TYPES[key] || 'sale';
      if (docType === 'sale' && !newItem.isDraft && newItem.status !== 'draft' && newItem.status !== 'voided' && !newItem.isDeleted) {
        const isNegativeAllowed = await isNegativeStockAllowedOnServer(newItem);
        if (!isNegativeAllowed) {
          const products = (await getDbData('products')) || [];
          const warehouses = (await getDbData('warehouses')) || [];
          const allDocs = await fetchAllSystemDocsForServer();
          const validation = validateStockAvailability({
            docToValidate: newItem,
            products,
            warehouses,
            allDocs,
            allowNegativeStock: false,
          });

          if (!validation.valid) {
            if (releaseServerLock) releaseServerLock();
            return res.status(400).json({ error: validation.error, details: validation.details });
          }
        }
      }
      
      if (newItem.version === undefined) newItem.version = 1;
      newItem.createdAt = newItem.createdAt || new Date().toISOString();
      newItem.updatedAt = newItem.updatedAt || new Date().toISOString();

      if (isPgActive() && getActivePgPool()) {
         if (!KNOWN_TABLES.includes(key)) return res.status(400).json({ error: 'Unknown table' });
         const client = await getActivePgPool().connect();
         try {
           await client.query(`CREATE TABLE IF NOT EXISTS "${key}" (id VARCHAR PRIMARY KEY)`);
           await client.query(`ALTER TABLE "${key}" ADD COLUMN IF NOT EXISTS "version" NUMERIC DEFAULT 1`);
           await client.query(`ALTER TABLE "${key}" ADD COLUMN IF NOT EXISTS "createdAt" TEXT`);
           await client.query(`ALTER TABLE "${key}" ADD COLUMN IF NOT EXISTS "updatedAt" TEXT`);
           let finalItem = { ...newItem };
           let related = null;
           if (['invoices', 'sales_invoices', 'purchase_invoices', 'warehouse_receipts', 'warehouse_remittances', 'proforma_invoices', 'sale_returns', 'purchase_returns', 'wastes', 'accounting_documents', 'stocktakings'].includes(key)) {
               const rel = await handleRelations(key, finalItem);
               finalItem = rel.strippedData;
               related = rel;
           }

           await syncTableSchema(client, key, finalItem);

           if (related && related.childTable) {
               await client.query(`CREATE TABLE IF NOT EXISTS "${related.childTable}" (id VARCHAR PRIMARY KEY)`);
               await client.query(`ALTER TABLE "${related.childTable}" ADD COLUMN IF NOT EXISTS "version" NUMERIC DEFAULT 1`);
               await client.query(`ALTER TABLE "${related.childTable}" ADD COLUMN IF NOT EXISTS "createdAt" TEXT`);
               await client.query(`ALTER TABLE "${related.childTable}" ADD COLUMN IF NOT EXISTS "updatedAt" TEXT`);
               for (const it of related.items) {
                   await syncTableSchema(client, related.childTable, it);
               }
           }

           await client.query('BEGIN');
           const { itemKeys: keys, itemVals: vals } = preparePgItem(key, finalItem);
           const placeholders = keys.map((_, idx) => `$${idx + 1}`).join(', ');
           const colNames = keys.map(k => `"${k}"`).join(', ');
           await client.query(`INSERT INTO "${key}" (${colNames}) VALUES (${placeholders}) ON CONFLICT(id) DO UPDATE SET ${keys.map(k => `"${k}" = EXCLUDED."${k}"`).join(', ')}`, vals);
           
           if (related && related.childTable) {
               const fId = finalItem.id;
               const col = (related.childTable === 'invoice_items' || related.childTable.endsWith('_invoice_items') || related.childTable.endsWith('_receipt_items') || related.childTable.endsWith('_remittance_items') || related.childTable.endsWith('_return_items') || related.childTable.endsWith('waste_items')) ? 'invoiceId' : (related.childTable === 'accounting_document_items' ? 'documentId' : 'stocktakingId');
               await client.query(`DELETE FROM "${related.childTable}" WHERE "${col}" = $1`, [fId]);
               for (const it of related.items) {
                   await syncTableSchema(client, related.childTable, it);
                   const { itemKeys: itKeys, itemVals: itVals } = preparePgItem(related.childTable, it);
                   const itPlaceholders = itKeys.map((_, idx) => `$${idx + 1}`).join(', ');
                   const itColNames = itKeys.map(k => `"${k}"`).join(', ');
                   await client.query(`INSERT INTO "${related.childTable}" (${itColNames}) VALUES (${itPlaceholders}) ON CONFLICT(id) DO UPDATE SET ${itKeys.map(k => `"${k}" = EXCLUDED."${k}"`).join(', ')}`, itVals);
               }
           }
           await client.query('COMMIT');
         } catch (txErr) {
           await client.query('ROLLBACK');
           throw txErr;
         } finally {
           client.release();
         }
      } else {
         let data = (await getDbData(key));
         if (!Array.isArray(data)) {
           data = [];
         }
         const idx = data.findIndex((x: any) => x && String(x.id) === String(newItem.id));
         if (idx !== -1) {
             data[idx] = { ...data[idx], ...newItem };
         } else {
             data.push(newItem);
         }
         await setDbData(key, data);
      }

      // Log creation in background to avoid delaying client response
      (async () => {
        try {
          const sysLogs = (await getDbData('system_logs')) || [];
          const timestamp = Date.now();
          const userInfo = extractRequestUser(req);
          const clientInfo = extractClientInfo(req);
          const entityTitle = getEntityPersianName(key);
          const itemTitle = newItem.name || newItem.title || newItem.invoiceNumber || newItem.code || newItem.id || '';
          const details = `ثبت جدید در ${entityTitle}${itemTitle ? ` («${itemTitle}»)` : ''}`;

          const log = {
            id: Math.random().toString(36).substring(2, 15),
            timestamp,
            action: 'CREATE',
            userId: userInfo.userId,
            username: userInfo.username,
            userName: userInfo.userName,
            userRole: userInfo.userRole,
            details,
            entityType: key,
            entityId: newItem.id,
            changes: JSON.stringify(newItem),
            oldData: null,
            newData: newItem,
            diffSummary: `ثبت رکورد جدید در ${entityTitle}`,
            browser: clientInfo.browser,
            os: clientInfo.os,
            device: clientInfo.device,
            ip: clientInfo.ip,
            userAgent: clientInfo.userAgent
          };

          sysLogs.unshift(log);
          if (sysLogs.length > 3000) sysLogs.length = 3000;

          if (isPgActive() && getActivePgPool()) {
             await syncTableSchema(getActivePgPool(), 'system_logs', log);
             const { itemKeys: keys, itemVals: vals } = preparePgItem('system_logs', log);
             const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
             const colNames = keys.map(k => `"${k}"`).join(', ');
             await getActivePgPool().query(`INSERT INTO "system_logs" (${colNames}) VALUES (${placeholders}) ON CONFLICT(id) DO UPDATE SET ${keys.map(k => `"${k}" = EXCLUDED."${k}"`).join(', ')}`, vals);
          } else {
             await setDbData('system_logs', sysLogs);
          }
          dispatchAdminNotificationIfSensitive(log).catch(e => console.error(e));
        } catch (logErr) {
          console.error('Error writing system_logs on create:', logErr);
        }
      })();

      if (INVOICE_TABLE_KEYS.includes(key)) {
        triggerServerStockSync().catch(err => console.error('Error during post-append stock sync:', err));
      }

      res.json({ success: true, data: newItem });
    } catch(err: any) {
      console.error('Error in append:', err);
      tableSchemas.delete(req.params.key);
      tableSchemas.delete('system_logs');
      res.status(500).json({ error: err.message });
    } finally {
      if (releaseServerLock) releaseServerLock();
    }
  });

router.put('/api/data/:key/:id', async (req, res) => {
    const { key, id } = req.params;
    const updatedItem = req.body;
    const userInfo = extractRequestUser(req);
    const perm = checkDataModificationPermission(key, userInfo.userRole);
    if (!perm.allowed) {
      return res.status(403).json({ error: perm.message });
    }
    let releaseServerLock: (() => void) | null = null;
    try {
      if (INVOICE_TABLE_KEYS.includes(key)) {
        releaseServerLock = await acquireServerInvoiceLock();
      }
      let mergedItem = { ...updatedItem, id };
      let capturedOldItem: any = null;
      if (isPgActive() && getActivePgPool()) {
         if (!KNOWN_TABLES.includes(key)) return res.status(400).json({ error: 'Unknown table' });
         
         const data = (await getDbData(key)) || [];
         const index = data.findIndex((x: any) => String(x.id) === String(id));
         if (index === -1) {
            return res.status(404).json({ error: 'Not found' });
         }
         
         const oldItem = data[index];
         capturedOldItem = oldItem;
         if (key === 'accounting_documents' && oldItem) {
           if (oldItem.status === 'permanent' || oldItem.status === 'finalized' || oldItem.isFinalized) {
             if (releaseServerLock) releaseServerLock();
             return res.status(403).json({
               error: `امکان ویرایش مستقیم سند حسابداری قطعی‌شده شماره ${oldItem.documentNumber || oldItem.id} وجود ندارد. طبق استانداردهای حسابداری، هرگونه تغییر باید از طریق صدور «سند معکوس / اصلاحی» ثبت گردد.`,
               code: 'DOCUMENT_IMMUTABLE'
             });
           }
         }
         if (req.body && req.body.version !== undefined && oldItem.version !== undefined) {
           if (Number(req.body.version) !== Number(oldItem.version)) {
             if (releaseServerLock) releaseServerLock();
             return res.status(409).json({
               error: 'خطای تداخل همزمانی (Race Condition): این سند توسط کاربر یا فرآیند دیگری ویرایش شده است. لطفاً صفحه را تازه‌سازی نمایید.',
               code: 'CONCURRENCY_CONFLICT',
               currentVersion: oldItem.version,
               sentVersion: req.body.version
             });
           }
         }
         const nextVersion = (Number(oldItem.version) || 0) + 1;
         const newItem = { ...oldItem, ...updatedItem, id, version: nextVersion, updatedAt: new Date().toISOString() }; // ensure id is preserved
         mergedItem = newItem;

         const stockCheck = await validateSalesInvoiceStock({ ...mergedItem, _originTable: key }, releaseServerLock);
         if (!stockCheck.valid) {
           return res.status(400).json({ error: stockCheck.error, details: stockCheck.details });
         }
         
         // State Machine Validation for Checks
         if (key === 'issued_checks' || key === 'received_checks') {
             if (updatedItem.status && updatedItem.status !== oldItem.status) {
                 const type = key === 'issued_checks' ? 'issued' : 'received';
                 let allowed = [];
                 if (type === 'issued') {
                     switch(oldItem.status) {
                         case 'blank': allowed = ['issued', 'cancelled']; break;
                         case 'issued': allowed = ['cashed', 'bounced', 'cancelled']; break;
                         case 'cashed': allowed = []; break; // terminal
                         case 'bounced': allowed = ['cancelled']; break; // maybe cashed if redeposited, but strictly cancelled or terminal
                         case 'cancelled': allowed = []; break; // terminal
                         default: allowed = ['issued', 'cashed', 'bounced', 'cancelled'];
                     }
                 } else {
                     switch(oldItem.status) {
                         case 'received': allowed = ['deposited', 'assigned', 'returned']; break;
                         case 'deposited': allowed = ['cashed', 'bounced', 'received']; break; // 'received' if Bank returns it without bouncing
                         case 'cashed': allowed = []; break; // terminal
                         case 'assigned': allowed = ['bounced_assigned']; break;
                         case 'bounced_assigned': allowed = ['returned']; break;
                         case 'bounced': allowed = ['returned', 'deposited']; break; // can redeposit
                         case 'returned': allowed = []; break; // terminal
                         default: allowed = ['received', 'deposited', 'cashed', 'assigned', 'bounced_assigned', 'bounced', 'returned'];
                     }
                 }
                 // if (!allowed.includes(updatedItem.status)) {
                 //    return res.status(400).json({ error: `تغییر وضعیت غیرمجاز است.` });
                 // }
             }
         }

         
         let finalItem = { ...newItem };
         let related = null;
         if (['invoices', 'sales_invoices', 'purchase_invoices', 'warehouse_receipts', 'warehouse_remittances', 'proforma_invoices', 'sale_returns', 'purchase_returns', 'wastes', 'accounting_documents', 'stocktakings'].includes(key)) {
             const rel = await handleRelations(key, finalItem);
             finalItem = rel.strippedData;
             related = rel;
         }

         const client = await getActivePgPool().connect();
         try {
           await client.query('BEGIN');
           await syncTableSchema(client, key, finalItem);
           const { itemKeys: keys, itemVals: vals } = preparePgItem(key, finalItem);
           const placeholders = keys.map((_, idx) => `$${idx + 1}`).join(', ');
           const colNames = keys.map(k => `"${k}"`).join(', ');
           await client.query(`INSERT INTO "${key}" (${colNames}) VALUES (${placeholders}) ON CONFLICT(id) DO UPDATE SET ${keys.map(k => `"${k}" = EXCLUDED."${k}"`).join(', ')}`, vals);
           
           if (related && related.childTable) {
               const fId = finalItem.id;
               try {
                  const col = (related.childTable === 'invoice_items' || related.childTable.endsWith('_invoice_items') || related.childTable.endsWith('_receipt_items') || related.childTable.endsWith('_remittance_items') || related.childTable.endsWith('_return_items') || related.childTable.endsWith('waste_items')) ? 'invoiceId' : (related.childTable === 'accounting_document_items' ? 'documentId' : 'stocktakingId');
                  await client.query(`DELETE FROM "${related.childTable}" WHERE "${col}" = $1`, [fId]);
               } catch(e) { }
               for (const it of related.items) {
                   await syncTableSchema(client, related.childTable, it);
                   const { itemKeys: itKeys, itemVals: itVals } = preparePgItem(related.childTable, it);
                   const itPlaceholders = itKeys.map((_, idx) => `$${idx + 1}`).join(', ');
                   const itColNames = itKeys.map(k => `"${k}"`).join(', ');
                   await client.query(`INSERT INTO "${related.childTable}" (${itColNames}) VALUES (${itPlaceholders}) ON CONFLICT(id) DO UPDATE SET ${itKeys.map(k => `"${k}" = EXCLUDED."${k}"`).join(', ')}`, itVals);
               }
           }
           await client.query('COMMIT');
         } catch (txErr) {
           await client.query('ROLLBACK');
           throw txErr;
         } finally {
           client.release();
         }
      } else {
         const data = (await getDbData(key)) || [];
         if (Array.isArray(data)) {
           const index = data.findIndex((x: any) => String(x.id) === String(id));
           if (index !== -1) {
             const oldItem = data[index];
             capturedOldItem = oldItem;
             if (key === 'accounting_documents' && oldItem) {
               if (oldItem.status === 'permanent' || oldItem.status === 'finalized' || oldItem.isFinalized) {
                 if (releaseServerLock) releaseServerLock();
                 return res.status(403).json({
                   error: `امکان ویرایش مستقیم سند حسابداری قطعی‌شده شماره ${oldItem.documentNumber || oldItem.id} وجود ندارد. طبق استانداردهای حسابداری، هرگونه تغییر باید از طریق صدور «سند معکوس / اصلاحی» ثبت گردد.`,
                   code: 'DOCUMENT_IMMUTABLE'
                 });
               }
             }
             if (req.body && req.body.version !== undefined && oldItem.version !== undefined) {
               if (Number(req.body.version) !== Number(oldItem.version)) {
                 if (releaseServerLock) releaseServerLock();
                 return res.status(409).json({
                   error: 'خطای تداخل همزمانی (Race Condition): این سند توسط کاربر یا فرآیند دیگری ویرایش شده است. لطفاً صفحه را تازه‌سازی نمایید.',
                   code: 'CONCURRENCY_CONFLICT',
                   currentVersion: oldItem.version,
                   sentVersion: req.body.version
                 });
               }
             }
             const nextVersion = (Number(oldItem.version) || 0) + 1;
             const newItem = { ...oldItem, ...updatedItem, id, version: nextVersion, updatedAt: new Date().toISOString() };
             mergedItem = newItem;

             const stockCheck = await validateSalesInvoiceStock({ ...mergedItem, _originTable: key }, releaseServerLock);
             if (!stockCheck.valid) {
               return res.status(400).json({ error: stockCheck.error, details: stockCheck.details });
             }
             
             // State Machine Validation for Checks
             if (key === 'issued_checks' || key === 'received_checks') {
                 if (updatedItem.status && updatedItem.status !== oldItem.status) {
                     const type = key === 'issued_checks' ? 'issued' : 'received';
                     let allowed = [];
                     if (type === 'issued') {
                         switch(oldItem.status) {
                             case 'blank': allowed = ['issued', 'cancelled']; break;
                             case 'issued': allowed = ['cashed', 'bounced', 'cancelled']; break;
                             case 'cashed': allowed = []; break;
                             case 'bounced': allowed = ['cancelled']; break;
                             case 'cancelled': allowed = []; break;
                             default: allowed = ['issued', 'cashed', 'bounced', 'cancelled'];
                         }
                     } else {
                         switch(oldItem.status) {
                             case 'received': allowed = ['deposited', 'assigned', 'returned']; break;
                             case 'deposited': allowed = ['cashed', 'bounced', 'received']; break;
                             case 'cashed': allowed = []; break;
                             case 'assigned': allowed = ['bounced_assigned']; break;
                             case 'bounced_assigned': allowed = ['returned']; break;
                             case 'bounced': allowed = ['returned', 'deposited']; break;
                             case 'returned': allowed = []; break;
                             default: allowed = ['received', 'deposited', 'cashed', 'assigned', 'bounced_assigned', 'bounced', 'returned'];
                         }
                     }
                     // if (!allowed.includes(updatedItem.status)) {
                 //    return res.status(400).json({ error: `تغییر وضعیت غیرمجاز است.` });
                 // }
                 }
             }
             
             data[index] = newItem;

             await setDbData(key, data);
           } else {
             return res.status(404).json({ error: 'Not found' });
           }
         } else {
           return res.status(400).json({ error: 'Target is not an array' });
         }
      }

      // Log update in background to avoid delaying client response
      (async () => {
        try {
          const sysLogs = (await getDbData('system_logs')) || [];
          const timestamp = Date.now();
          const userInfo = extractRequestUser(req);
          const clientInfo = extractClientInfo(req);
          const entityTitle = getEntityPersianName(key);
          const itemTitle = mergedItem.name || mergedItem.title || mergedItem.invoiceNumber || mergedItem.code || mergedItem.id || id;
          const details = `ویرایش رکورد در ${entityTitle}${itemTitle ? ` («${itemTitle}»)` : ''}`;

          const log = {
            id: Math.random().toString(36).substring(2, 15),
            timestamp,
            action: 'UPDATE',
            userId: userInfo.userId,
            username: userInfo.username,
            userName: userInfo.userName,
            userRole: userInfo.userRole,
            details,
            entityType: key,
            entityId: id,
            changes: JSON.stringify(updatedItem),
            oldData: capturedOldItem,
            newData: mergedItem,
            diffSummary: capturedOldItem ? createDiffSummaryServer(capturedOldItem, mergedItem) : `ویرایش اطلاعات در ${entityTitle}`,
            browser: clientInfo.browser,
            os: clientInfo.os,
            device: clientInfo.device,
            ip: clientInfo.ip,
            userAgent: clientInfo.userAgent
          };

          sysLogs.unshift(log);
          if (sysLogs.length > 3000) sysLogs.length = 3000;

          if (isPgActive() && getActivePgPool()) {
             await syncTableSchema(getActivePgPool(), 'system_logs', log);
             const { itemKeys: keys, itemVals: vals } = preparePgItem('system_logs', log);
             const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
             const colNames = keys.map(k => `"${k}"`).join(', ');
             await getActivePgPool().query(`INSERT INTO "system_logs" (${colNames}) VALUES (${placeholders}) ON CONFLICT(id) DO UPDATE SET ${keys.map(k => `"${k}" = EXCLUDED."${k}"`).join(', ')}`, vals);
          } else {
             await setDbData('system_logs', sysLogs);
          }
          dispatchAdminNotificationIfSensitive(log).catch(e => console.error(e));
        } catch (logErr) {
          console.error('Error writing system_logs on update:', logErr);
        }
      })();

      if (INVOICE_TABLE_KEYS.includes(key)) {
        triggerServerStockSync().catch(err => console.error('Error during post-put stock sync:', err));
      }

      res.json({ success: true, data: mergedItem });
    } catch(err: any) {
      console.error('Error in put:', err);
      tableSchemas.delete(req.params.key);
      tableSchemas.delete('system_logs');
      res.status(500).json({ error: err.message });
    } finally {
      if (releaseServerLock) releaseServerLock();
    }
  });

router.post('/api/data/:key', async (req, res) => {
    const { key } = req.params;
    const data = req.body;
    const userInfo = extractRequestUser(req);
    const perm = checkDataModificationPermission(key, userInfo.userRole);
    if (!perm.allowed) {
      return res.status(403).json({ error: perm.message });
    }

    // Zod Validation
    if (key !== 'system_logs') {
      const validationResult = validateData(key, data);
      if (!validationResult.success) {
        return res.status(400).json({ error: 'Validation failed', details: (validationResult as any).error?.errors });
      }
    }

    // Validation for Double-Entry Accounting Documents
    if (key === 'accounting_documents' && Array.isArray(data)) {
      for (const doc of data) {
        if (doc && doc.items && Array.isArray(doc.items)) {
          if (doc.items.length < 2) {
            return res.status(400).json({ error: `سند حسابداری ${doc.documentNumber || ''} باید حداقل شامل دو آرتیکل (یک بدهکار و یک بستانکار) باشد.` });
          }
          const totalDebit = doc.items.reduce((sum: number, it: any) => sum + (Number(it.debit) || 0), 0);
          const totalCredit = doc.items.reduce((sum: number, it: any) => sum + (Number(it.credit) || 0), 0);
          if (Math.abs(totalDebit - totalCredit) > 0.001) {
            return res.status(400).json({ error: `سند حسابداری ${doc.documentNumber || ''} تراز نیست. جمع بدهکار (${totalDebit.toLocaleString()}) با جمع بستانکار (${totalCredit.toLocaleString()}) مغایرت دارد.` });
          }
        }
      }
    }

    // Do not log changes to system_logs themselves
    if (key !== 'system_logs' && Array.isArray(data)) {
      try {
         const oldData = (await getDbData(key)) || [];

         if (Array.isArray(oldData)) {
            const oldMap = new Map();
            oldData.forEach(item => { if (item && item.id) oldMap.set(String(item.id), item); });

            const newMap = new Map();
            data.forEach(item => { if (item && item.id) newMap.set(String(item.id), item); });

            const userInfo = extractRequestUser(req);
            const clientInfo = extractClientInfo(req);
            const entityTitle = getEntityPersianName(key);
            const logs = [];
            const timestamp = Date.now();
            const generateId = () => Math.random().toString(36).substring(2, 15);

            // Find Added and Updated
            newMap.forEach((newItem, id) => {
               const itemTitle = newItem.name || newItem.title || newItem.invoiceNumber || newItem.code || newItem.id || '';
               if (!oldMap.has(id)) {
                  logs.push({
                    id: generateId(),
                    action: 'CREATE',
                    userId: userInfo.userId,
                    username: userInfo.username,
                    userName: userInfo.userName,
                    userRole: userInfo.userRole,
                    details: `ثبت جدید در ${entityTitle}${itemTitle ? ` («${itemTitle}»)` : ''}`,
                    entityType: key,
                    entityId: id,
                    changes: JSON.stringify(newItem),
                    diffSummary: `ثبت رکورد جدید در ${entityTitle}`,
                    browser: clientInfo.browser,
                    os: clientInfo.os,
                    device: clientInfo.device,
                    ip: clientInfo.ip,
                    userAgent: clientInfo.userAgent,
                    timestamp
                  });
               } else {
                  const oldItem = oldMap.get(id);
                  const changes: any = {};
                  let hasChanges = false;
                  for (const k in newItem) {
                     if (k !== 'updatedAt' && k !== 'createdAt') {
                       if (JSON.stringify(newItem[k]) !== JSON.stringify(oldItem[k])) {
                          changes[k] = { old: oldItem[k], new: newItem[k] };
                          hasChanges = true;
                       }
                     }
                  }
                  if (hasChanges) {
                     logs.push({
                       id: generateId(),
                       action: 'UPDATE',
                       userId: userInfo.userId,
                       username: userInfo.username,
                       userName: userInfo.userName,
                       userRole: userInfo.userRole,
                       details: `ویرایش رکورد در ${entityTitle}${itemTitle ? ` («${itemTitle}»)` : ''}`,
                       entityType: key,
                       entityId: id,
                       changes: JSON.stringify(changes),
                       diffSummary: `ویرایش فیلدها در ${entityTitle}`,
                       browser: clientInfo.browser,
                       os: clientInfo.os,
                       device: clientInfo.device,
                       ip: clientInfo.ip,
                       userAgent: clientInfo.userAgent,
                       timestamp
                     });
                  }
               }
            });

            // Find Deleted
            oldMap.forEach((oldItem, id) => {
               if (!newMap.has(id)) {
                  const itemTitle = oldItem.name || oldItem.title || oldItem.invoiceNumber || oldItem.code || oldItem.id || '';
                  logs.push({
                    id: generateId(),
                    action: 'DELETE',
                    userId: userInfo.userId,
                    username: userInfo.username,
                    userName: userInfo.userName,
                    userRole: userInfo.userRole,
                    details: `حذف رکورد از ${entityTitle}${itemTitle ? ` («${itemTitle}»)` : ''}`,
                    entityType: key,
                    entityId: id,
                    changes: JSON.stringify(oldItem),
                    diffSummary: `حذف رکورد از ${entityTitle}`,
                    browser: clientInfo.browser,
                    os: clientInfo.os,
                    device: clientInfo.device,
                    ip: clientInfo.ip,
                    userAgent: clientInfo.userAgent,
                    timestamp
                  });
               }
            });

            if (logs.length > 0) {
               let sysLogs = (await getDbData('system_logs')) || [];
               if (!Array.isArray(sysLogs)) sysLogs = [];
               sysLogs.unshift(...logs);
               if (sysLogs.length > 3000) sysLogs.length = 3000;
               await setDbData('system_logs', sysLogs);
               for (const l of logs) {
                  dispatchAdminNotificationIfSensitive(l).catch(e => console.error(e));
               }
            }
         }
      } catch(err) {
         console.error('Audit log error:', err);
      }
    }

    try {
      await setDbData(key, data);
      if (INVOICE_TABLE_KEYS.includes(key)) {
        triggerServerStockSync().catch(err => console.error('Error during post-bulk stock sync:', err));
      }
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

router.delete('/api/data/:key/:id', async (req, res) => {
    const { key, id } = req.params;
    const userInfo = extractRequestUser(req);
    const perm = checkDataModificationPermission(key, userInfo.userRole);
    if (!perm.allowed) {
      return res.status(403).json({ error: perm.message });
    }

    try {
      const data = (await getDbData(key)) || [];
      const itemToDelete = Array.isArray(data) ? data.find((x: any) => String(x.id) === String(id)) : null;

      if (key === 'accounting_documents' && itemToDelete) {
        if (itemToDelete.status === 'permanent' || itemToDelete.status === 'finalized' || itemToDelete.isFinalized) {
          return res.status(403).json({
            error: `امکان حذف فیزیکی سند حسابداری قطعی‌شده شماره ${itemToDelete.documentNumber || itemToDelete.id} وجود ندارد. جهت ابطال، باید «سند معکوس / اصلاحی» صادر گردد.`,
            code: 'DOCUMENT_IMMUTABLE'
          });
        }
      }

      if (isPgActive() && getActivePgPool()) {
        if (!KNOWN_TABLES.includes(key)) return res.status(400).json({ error: 'Unknown table' });
        await getActivePgPool().query(`DELETE FROM "${key}" WHERE id = $1`, [String(id)]);
      } else {
        const filtered = Array.isArray(data) ? data.filter((x: any) => String(x.id) !== String(id)) : [];
        await setDbData(key, filtered);
      }

      // Audit log the deletion
      (async () => {
        try {
          if (itemToDelete) {
            const clientInfo = extractClientInfo(req);
            const entityTitle = getEntityPersianName(key);
            const itemTitle = itemToDelete.name || itemToDelete.title || itemToDelete.invoiceNumber || itemToDelete.code || itemToDelete.id || id;
            const log = {
              id: Math.random().toString(36).substring(2, 15),
              timestamp: Date.now(),
              action: 'DELETE',
              userId: userInfo.userId,
              username: userInfo.username,
              userName: userInfo.userName,
              userRole: userInfo.userRole,
              details: `حذف رکورد از ${entityTitle}${itemTitle ? ` («${itemTitle}»)` : ''}`,
              entityType: key,
              entityId: id,
              changes: JSON.stringify(itemToDelete),
              oldData: itemToDelete,
              newData: null,
              diffSummary: `حذف رکورد از ${entityTitle}`,
              browser: clientInfo.browser,
              os: clientInfo.os,
              device: clientInfo.device,
              ip: clientInfo.ip,
              userAgent: clientInfo.userAgent
            };
            const sysLogs = (await getDbData('system_logs')) || [];
            sysLogs.unshift(log);
            if (sysLogs.length > 3000) sysLogs.length = 3000;
            await setDbData('system_logs', sysLogs);
            dispatchAdminNotificationIfSensitive(log).catch(e => console.error(e));
          }
        } catch (logErr) {
          console.error('Audit log deletion error:', logErr);
        }
      })();

      if (INVOICE_TABLE_KEYS.includes(key)) {
        triggerServerStockSync().catch(err => console.error('Error during post-delete stock sync:', err));
      }

      res.json({ success: true, id });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

export default router;
