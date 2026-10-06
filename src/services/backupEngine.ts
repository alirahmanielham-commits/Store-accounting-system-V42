import fsPromises from 'fs/promises';
import path from 'path';
import { KNOWN_TABLES } from '../db/schema-sync';
import { getAllDbData, getDbData, setDbData } from '../db/kv-store';
import { isPgActive, getActivePgPool, getDb, storeContext } from '../db/connection';
import { encryptBackupData, decryptBackupData, isEncryptedBackup } from '../utils/backupCrypto';

export interface TableDiffComparison {
  table: string;
  label: string;
  backupCount: number;
  currentCount: number;
  diff: number; // backupCount - currentCount
  status: 'match' | 'added' | 'reduced' | 'new_table' | 'missing_in_backup';
}

export interface DryRunResult {
  compatible: boolean;
  canRestore: boolean;
  isEncrypted: boolean;
  storeId?: string;
  backupDate?: string;
  totalBackupRecords: number;
  totalCurrentRecords: number;
  tablesCount: number;
  comparison: TableDiffComparison[];
  warnings: string[];
  recommendations: string[];
  safetySnapshotAvailable: boolean;
}

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
 * Validates schema, checks row count diffs, verifies integrity and flags potential data loss.
 */
export async function performDryRunAnalysis(backupData: Record<string, any>, isEncrypted: boolean = false): Promise<DryRunResult> {
  const currentStats = await getCurrentDatabaseStats();
  const comparison: TableDiffComparison[] = [];
  const warnings: string[] = [];
  const recommendations: string[] = [];

  const backupTables = Object.keys(backupData);
  let totalBackupRecords = 0;
  let totalCurrentRecords = 0;

  // Track tables in both
  const allTables = Array.from(new Set([...KNOWN_TABLES, ...backupTables]));

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

    // Only include in comparison table if has data in either current or backup
    if (backupCount > 0 || currentCount > 0) {
      comparison.push({
        table,
        label: TABLE_LABELS[table] || table,
        backupCount,
        currentCount,
        diff,
        status
      });
    }

    // Specific critical checks
    if (table === 'invoices' && diff < 0) {
      warnings.push(`هشدار: تعداد فاکتورهای فعلی سیستم (${currentCount}) بیشتر از فایل پشتیبان (${backupCount}) است. بازیابی باعث حذف ${Math.abs(diff)} فاکتور جدیدتر خواهد شد.`);
    }

    if (table === 'accounting_documents' && diff < 0) {
      warnings.push(`هشدار: اسناد حسابداری ثبت‌شده فعلی (${currentCount}) بیشتر از پشتیبان (${backupCount}) است.`);
    }

    if (table === 'users' && backupCount === 0) {
      warnings.push('هشدار مهم: جدول کاربران در فایل پشتیبان یافت نشد؛ جهت عدم قفل شدن دسترسی، کاربران جاری حفظ خواهند شد.');
    }
  }

  // Schema compatibility validation
  const unknownTables = backupTables.filter(t => !KNOWN_TABLES.includes(t) && t !== 'databaseLogs' && t !== 'backupConfig');
  if (unknownTables.length > 0) {
    recommendations.push(`فایل پشتیبان شامل جداول سفارشی یا قدیمی است که در ساختار جدید به صورت کلید/مقدار حفظ می‌شوند: ${unknownTables.join(', ')}`);
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

  recommendations.push('قبل از اجرای قطعی بازیابی، یک نسخه ایمنی (Safety Snapshot) به صورت خودکار از دیتابیس فعلی ذخیره خواهد شد.');

  return {
    compatible: true,
    canRestore: true,
    isEncrypted,
    totalBackupRecords,
    totalCurrentRecords,
    tablesCount: backupTables.length,
    comparison: comparison.sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff)),
    warnings,
    recommendations,
    safetySnapshotAvailable: true
  };
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
