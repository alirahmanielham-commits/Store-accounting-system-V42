import fsPromises from 'fs/promises';
import path from 'path';
import { KNOWN_TABLES } from '../db/schema-sync';
import { getAllDbData, getDbData, setDbData } from '../db/kv-store';
import { isPgActive, getActivePgPool, getDb, storeContext } from '../db/connection';
import { encryptBackupData, decryptBackupData, isEncryptedBackup } from '../utils/backupCrypto';

export interface TableDiffComparison {
  table: string;
  label: string;
  moduleId?: string;
  moduleLabel?: string;
  backupCount: number;
  currentCount: number;
  diff: number; // backupCount - currentCount
  status: 'match' | 'added' | 'reduced' | 'new_table' | 'missing_in_backup';
}

export interface ModuleDiffSummary {
  id: string;
  label: string;
  description: string;
  iconName: string;
  tables: string[];
  backupRecords: number;
  currentRecords: number;
  diff: number;
  hasData: boolean;
}

export interface DryRunResult {
  compatible: boolean;
  canRestore: boolean;
  isEncrypted: boolean;
  storeId?: string;
  activeStoreId?: string;
  storeMismatch?: boolean;
  backupDate?: string;
  totalBackupRecords: number;
  totalCurrentRecords: number;
  tablesCount: number;
  comparison: TableDiffComparison[];
  modules: ModuleDiffSummary[];
  warnings: string[];
  recommendations: string[];
  safetySnapshotAvailable: boolean;
}

export interface BackupModuleDefinition {
  id: string;
  label: string;
  description: string;
  iconName: string;
  tables: string[];
}

export const BACKUP_MODULES: BackupModuleDefinition[] = [
  {
    id: 'inventory',
    label: 'کالاها و انبارداری',
    description: 'محصولات، انبارها، دسته‌بندی کالاها، قیمت‌گذاری و گردش انبار',
    iconName: 'Package',
    tables: ['products', 'warehouses', 'product_categories', 'warehouse_stocks', 'inventory_transactions', 'stocktakings', 'stocktaking_items', 'product_price_history', 'kardex']
  },
  {
    id: 'persons',
    label: 'طرف‌حساب‌ها و اشخاص',
    description: 'اشخاص، مانده‌حساب‌های افتتاحیه، اطلاعات تماس، حساب‌های بانکی و سوابق ارتباطی',
    iconName: 'Users',
    tables: ['persons', 'person_contacts', 'person_bank_accounts', 'person_groups', 'person_roles', 'person_categories', 'person_opening_balances', 'debtors_trackings', 'person_follow_ups']
  },
  {
    id: 'invoices',
    label: 'فاکتورها و بازرگانی',
    description: 'فاکتورهای فروش و خرید، پیش‌فاکتورها، برگشت از فروش و خرید و ضایعات',
    iconName: 'FileText',
    tables: ['invoices', 'invoice_items', 'sales_invoices', 'sales_invoice_items', 'purchase_invoices', 'purchase_invoice_items', 'proforma_invoices', 'proforma_invoice_items', 'sale_returns', 'sale_return_items', 'purchase_returns', 'purchase_return_items', 'wastes', 'waste_items', 'sales_invoice_payments', 'purchase_invoice_payments', 'warehouse_receipts', 'warehouse_receipt_items', 'warehouse_remittances', 'warehouse_remittance_items']
  },
  {
    id: 'accounting',
    label: 'اسناد و دفاتر حسابداری',
    description: 'اسناد دوبل حسابداری، آرتیکل‌ها، دفاتر معین، کدینگ و سال‌های مالی',
    iconName: 'BookOpen',
    tables: ['accounting_documents', 'accounting_document_items', 'ledger_accounts', 'financial_years']
  },
  {
    id: 'treasury',
    label: 'خزانه‌داری، چک‌ها و نقدینگی',
    description: 'چک‌های صیادی پرداختی و دریافتی، دسته‌چک‌ها، تراکنش‌ها، صندوق‌ها و بانک‌ها',
    iconName: 'CreditCard',
    tables: ['accounts', 'cashboxes', 'transactions', 'receipt_transactions', 'payment_transactions', 'issued_checks', 'received_checks', 'checkbooks', 'check_history', 'check_audit_logs', 'refundRequests']
  },
  {
    id: 'loans',
    label: 'وام‌ها و اقساط',
    description: 'پرونده‌های تسهیلات، جداول اقساط، وثایق و سوابق بازپرداخت',
    iconName: 'Coins',
    tables: ['loans', 'installments', 'loan_accounts', 'loan_types', 'loan_applications', 'collaterals', 'repayment_schedules', 'repayment_transactions', 'loan_history']
  },
  {
    id: 'settings',
    label: 'تنظیمات و اطلاعات پایه',
    description: 'مشخصات شرکت و کسب‌وکار، تنظیمات فروشگاه، الگوها و کاربران',
    iconName: 'Settings',
    tables: ['store_settings', 'company_profile', 'businesses', 'users', 'roles', 'sms_settings', 'sms_templates', 'sms_providers']
  }
];

const TABLE_LABELS: Record<string, string> = {
  invoices: 'فاکتورهای خرید و فروش',
  invoice_items: 'اقلام فاکتورها',
  accounting_documents: 'اسناد حسابداری دوبل',
  accounting_document_items: 'آرتیکل‌های حسابداری',
  inventory_transactions: 'گردش و تراکنش‌های انبار',
  products: 'کالاها و خدمات',
  persons: 'طرف‌حساب‌ها و اشخاص',
  accounts: 'حساب‌های بانکی',
  cashboxes: 'صندوق‌های فروشگاه',
  transactions: 'تراکنش‌های دریافت و پرداخت',
  issued_checks: 'چک‌های صیادی پرداختی',
  received_checks: 'چک‌های صیادی دریافتی',
  checkbooks: 'دسته‌چک‌ها',
  warehouses: 'انبارها و شعب',
  product_categories: 'دسته‌بندی‌های کالا',
  store_settings: 'تنظیمات فروشگاه',
  company_profile: 'مشخصات شرکت',
  financial_years: 'سال‌های مالی',
  users: 'کاربران و سطوح دسترسی',
  system_logs: 'لاگ‌های ممیزی سیستم'
};

/**
 * Returns current counts for all known database tables
 */
export async function getCurrentDatabaseStats(): Promise<Record<string, number>> {
  const stats: Record<string, number> = {};
  
  if (isPgActive() && getActivePgPool()) {
    for (const table of KNOWN_TABLES) {
      try {
        const res = await getActivePgPool().query(`SELECT count(*)::int as count FROM "${table}"`);
        stats[table] = res.rows[0]?.count || 0;
      } catch {
        stats[table] = 0;
      }
    }
  } else {
    for (const table of KNOWN_TABLES) {
      try {
        const data = await getDbData(table);
        stats[table] = Array.isArray(data) ? data.length : (data ? 1 : 0);
      } catch {
        stats[table] = 0;
      }
    }
  }

  return stats;
}

/**
 * Performs deep dry-run analysis on backup data before restoring.
 * Validates schema, checks row count diffs, computes module breakdowns, verifies integrity and flags potential data loss.
 */
export async function performDryRunAnalysis(
  backupData: Record<string, any>, 
  isEncrypted: boolean = false,
  envelopeStoreId?: string,
  backupDateStr?: string
): Promise<DryRunResult> {
  const currentStats = await getCurrentDatabaseStats();
  const comparison: TableDiffComparison[] = [];
  const warnings: string[] = [];
  const recommendations: string[] = [];

  const activeStoreId = storeContext.getStore() || 'default';
  const storeMismatch = !!(envelopeStoreId && envelopeStoreId !== activeStoreId);
  if (storeMismatch) {
    warnings.push(`توجه مهم: این فایل متعلق به فروشگاه «${envelopeStoreId}» است، اما شما در حال حاضر در شعبه «${activeStoreId}» قرار دارید. در صورت بازیابی، داده‌های این شعبه بازنویسی خواهند شد.`);
  }

  const backupTables = Object.keys(backupData);
  let totalBackupRecords = 0;
  let totalCurrentRecords = 0;

  // Track tables in both
  const allTables = Array.from(new Set([...KNOWN_TABLES, ...backupTables]));

  // Helper map from table to module
  const tableToModuleMap = new Map<string, { id: string; label: string }>();
  BACKUP_MODULES.forEach(mod => {
    mod.tables.forEach(tbl => tableToModuleMap.set(tbl, { id: mod.id, label: mod.label }));
  });

  for (const table of allTables) {
    const backupVal = backupData[table];
    const backupCount = Array.isArray(backupVal) 
      ? backupVal.length 
      : (backupVal && typeof backupVal === 'object' ? Object.keys(backupVal).length : 0);

    const currentCount = currentStats[table] || 0;
    const diff = backupCount - currentCount;
    totalBackupRecords += backupCount;
    totalCurrentRecords += currentCount;

    let status: TableDiffComparison['status'] = 'match';
    if (!backupVal && currentCount > 0) {
      status = 'missing_in_backup';
    } else if (backupVal && currentCount === 0) {
      status = 'new_table';
    } else if (diff > 0) {
      status = 'added';
    } else if (diff < 0) {
      status = 'reduced';
    }

    const modInfo = tableToModuleMap.get(table);

    // Only include in comparison table if has data in either current or backup
    if (backupCount > 0 || currentCount > 0) {
      comparison.push({
        table,
        label: TABLE_LABELS[table] || table,
        moduleId: modInfo?.id || 'other',
        moduleLabel: modInfo?.label || 'سایر موارد',
        backupCount,
        currentCount,
        diff,
        status
      });
    }

    // Specific critical checks
    if (table === 'invoices' && diff < 0) {
      warnings.push(`هشدار: تعداد فاکتورهای فعلی سیستم (${currentCount}) بیشتر از فایل پشتیبان (${backupCount}) است. بازیابی کامل باعث حذف ${Math.abs(diff)} فاکتور جدیدتر خواهد شد.`);
    }

    if (table === 'accounting_documents' && diff < 0) {
      warnings.push(`هشدار: اسناد حسابداری ثبت‌شده فعلی (${currentCount}) بیشتر از پشتیبان (${backupCount}) است.`);
    }

    if (table === 'users' && backupCount === 0) {
      warnings.push('هشدار مهم: جدول کاربران در فایل پشتیبان یافت نشد؛ جهت عدم قفل شدن دسترسی، کاربران جاری حفظ خواهند شد.');
    }
  }

  // Calculate Module summaries for Selective Restore
  const modulesSummary: ModuleDiffSummary[] = BACKUP_MODULES.map(mod => {
    let bCount = 0;
    let cCount = 0;
    mod.tables.forEach(t => {
      const bVal = backupData[t];
      const count = Array.isArray(bVal) ? bVal.length : (bVal && typeof bVal === 'object' ? Object.keys(bVal).length : 0);
      bCount += count;
      cCount += (currentStats[t] || 0);
    });
    return {
      id: mod.id,
      label: mod.label,
      description: mod.description,
      iconName: mod.iconName,
      tables: mod.tables,
      backupRecords: bCount,
      currentRecords: cCount,
      diff: bCount - cCount,
      hasData: bCount > 0 || cCount > 0
    };
  });

  // Schema compatibility validation
  const unknownTables = backupTables.filter(t => !KNOWN_TABLES.includes(t) && t !== 'databaseLogs' && t !== 'backupConfig');
  if (unknownTables.length > 0) {
    recommendations.push(`فایل پشتیبان شامل جداول سفارشی است که در ساختار سیستم به صورت کلید/مقدار حفظ می‌شوند: ${unknownTables.join(', ')}`);
  }

  // Check financial double-entry balance in backup accounting docs
  if (Array.isArray(backupData.accounting_documents)) {
    let unbalancedCount = 0;
    for (const doc of backupData.accounting_documents) {
      if (doc && doc.items && Array.isArray(doc.items) && doc.items.length >= 2) {
        const d = doc.items.reduce((s: number, i: any) => s + (Number(i.debit) || 0), 0);
        const c = doc.items.reduce((s: number, i: any) => s + (Number(i.credit) || 0), 0);
        if (Math.abs(d - c) > 0.01) unbalancedCount++;
      }
    }
    if (unbalancedCount > 0) {
      warnings.push(`توجه: تعداد ${unbalancedCount} سند حسابداری در فایل پشتیبان تراز ریاضی ندارند.`);
    }
  }

  recommendations.push('قبل از اجرای قطعی بازیابی (کامل یا انتخابی)، یک نسخه ایمنی خودکار (Safety Snapshot) از دیتابیس فعلی ذخیره خواهد شد.');

  return {
    compatible: true,
    canRestore: true,
    isEncrypted,
    storeId: envelopeStoreId,
    activeStoreId,
    storeMismatch,
    backupDate: backupDateStr,
    totalBackupRecords,
    totalCurrentRecords,
    tablesCount: backupTables.length,
    comparison: comparison.sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff)),
    modules: modulesSummary,
    warnings,
    recommendations,
    safetySnapshotAvailable: true
  };
}

/**
 * Validates integrity of a backup file content string without touching the database
 */
export function verifyBackupIntegrity(content: string): {
  valid: boolean;
  isEncrypted: boolean;
  storeId?: string;
  date?: string;
  tablesCount?: number;
  totalRecords?: number;
  format?: string;
  error?: string;
} {
  try {
    const decryptResult = decryptBackupData(content);
    if (!decryptResult.success || !decryptResult.data) {
      return {
        valid: false,
        isEncrypted: isEncryptedBackup(content),
        error: decryptResult.error || 'رمزگشایی یا بازخوانی ساختار فایل ناموفق بود.'
      };
    }

    const data = decryptResult.data;
    const tables = Object.keys(data);
    let totalRecords = 0;
    tables.forEach(t => {
      const val = data[t];
      totalRecords += Array.isArray(val) ? val.length : (val && typeof val === 'object' ? Object.keys(val).length : 0);
    });

    let storeId: string | undefined = undefined;
    let date: string | undefined = undefined;
    if (decryptResult.isEncrypted) {
      try {
        const parsed = JSON.parse(content.trim());
        storeId = parsed.storeId;
        date = parsed.dateStr || (parsed.timestamp ? new Date(parsed.timestamp).toISOString() : undefined);
      } catch {}
    }

    return {
      valid: true,
      isEncrypted: decryptResult.isEncrypted,
      storeId,
      date,
      tablesCount: tables.length,
      totalRecords,
      format: decryptResult.isEncrypted ? 'AES-256-GCM Envelope' : 'Plain JSON'
    };
  } catch (err: any) {
    return {
      valid: false,
      isEncrypted: false,
      error: err.message || 'خطا در ارزیابی سلامت فایل'
    };
  }
}

/**
 * Creates an emergency pre-restore safety snapshot of the active database.
 * Stored in `backups/safety-snapshots/` with AES-256-GCM encryption.
 */
export async function createSafetySnapshot(storeId: string = 'default'): Promise<{ filePath: string; fileName: string; size: number }> {
  const dir = path.join(process.cwd(), 'backups', 'safety-snapshots');
  await fsPromises.mkdir(dir, { recursive: true });

  const rows = await getAllDbData();
  const currentData: Record<string, any> = {};
  for (const row of rows) {
    currentData[row.key] = row.value;
  }

  const { jsonString } = encryptBackupData(currentData, storeId);
  const fileName = `safety-pre-restore-${storeId}-${Date.now()}.json`;
  const filePath = path.join(dir, fileName);

  await fsPromises.writeFile(filePath, jsonString, 'utf-8');
  const stat = await fsPromises.stat(filePath);

  // Retain only last 5 safety snapshots
  try {
    const files = await fsPromises.readdir(dir);
    const safetyFiles = files.filter(f => f.startsWith('safety-pre-restore-'));
    if (safetyFiles.length > 5) {
      const withStats = await Promise.all(safetyFiles.map(async f => ({
        file: f,
        time: (await fsPromises.stat(path.join(dir, f))).mtimeMs
      })));
      withStats.sort((a, b) => b.time - a.time);
      for (let i = 5; i < withStats.length; i++) {
        await fsPromises.unlink(path.join(dir, withStats[i].file)).catch(() => {});
      }
    }
  } catch {}

  return { filePath, fileName, size: stat.size };
}

/**
 * Replicates backup to a secondary offsite/local-replica directory for dual-site resilience.
 */
export async function saveSecondaryReplica(fileName: string, content: string): Promise<string> {
  const replicaDir = path.join(process.cwd(), 'backups', 'secondary-replica');
  await fsPromises.mkdir(replicaDir, { recursive: true });
  const replicaPath = path.join(replicaDir, fileName);
  await fsPromises.writeFile(replicaPath, content, 'utf-8');
  return replicaPath;
}
