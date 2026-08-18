import { getActivePgPool, isPgActive } from './connection';

export const KNOWN_TABLES = ['notifications', 'customers_risk_profile', 'repayment_transactions', 'repayment_schedules', 'loan_accounts', 'collaterals', 'loan_applications', 'loan_types', 
  'users', 'company_profile', 'financial_years', 'person_groups', 'person_roles',
  'payslips', 'salary_components', 'contract_types', 'employee_contracts', 'contract_components', 'monthly_attendance', 'payslip_items', 'debtors_trackings',
  'accounts', 'cashboxes', 'warehouses', 'product_categories', 'products',
  'transactions', 'invoices', 'accounting_documents', 'checkbooks', 'invoice_items', 'accounting_document_items', 'stocktaking_items',
  'warehouse_stocks', 'stocktakings', 'person_follow_ups', 'loans', 'loan_history',
  'ledger_accounts', 'installments', 'sms_messages', 'person_opening_balances', 'product_price_history', 'sales_invoice_payments', 'purchase_invoice_payments',
  'issued_checks', 'received_checks', 'check_history', 'check_audit_logs', 'refundRequests', 'crm_columns', 'personal_notes', 'doc_counters', 'backupConfig', 'databaseLogs',
  'persons', 'person_contacts', 'person_bank_accounts', 'system_logs',
  'person_categories', 'person_category_mappings', 'person_roles_mapping',
  'roles', 'database_logs', 'backupConfig',
  'purchase_invoices', 'purchase_invoice_items',
  'sales_invoices', 'sales_invoice_items',
  'warehouse_receipts', 'warehouse_receipt_items',
  'warehouse_remittances', 'warehouse_remittance_items',
  'proforma_invoices', 'proforma_invoice_items',
  'sale_returns', 'sale_return_items',
  'purchase_returns', 'purchase_return_items',
  'wastes', 'waste_items',
  'receipt_transactions', 'payment_transactions',
  'issued_checks', 'received_checks', 'payslips'
, 'InventoryTransactions', 'personal_notes',
  'sms_providers', 'sms_provider_settings', 'sms_templates', 'sms_campaigns',
  'sms_delivery_logs', 'sms_retry_logs', 'sms_settings', 'sms_quota_logs', 'sms_audit_logs'];
export const tableSchemas = new Map<string, Set<string>>();

export async function syncTableSchema(client: any, tableName: string, dataObj: any) {
    if (!dataObj || typeof dataObj !== 'object') return;
    let knownCols = tableSchemas.get(tableName);
    if (!knownCols) {
        knownCols = new Set();
        try {
            const res = await client.query('SELECT column_name FROM information_schema.columns WHERE table_name = $1', [tableName]);
            for (const row of res.rows) knownCols.add(row.column_name);
        } catch (e) {}
        tableSchemas.set(tableName, knownCols);
    }
    
    for (const [k, v] of Object.entries(dataObj)) {
        if (v === undefined) continue;
        if (!knownCols.has(k)) {
            let colType = 'TEXT';
            if (v === null) colType = 'TEXT';
            else if (typeof v === 'number') colType = 'DOUBLE PRECISION';
            else if (typeof v === 'boolean') colType = 'BOOLEAN';
            else if (typeof v === 'object') colType = 'JSONB';
            
            try {
               console.log(`Adding column ${k} to ${tableName}`); await client.query(`ALTER TABLE "${tableName}" ADD COLUMN "${k}" ${colType}`);
               knownCols.add(k);
            } catch (e) {
               console.error(`Error adding column ${k} to ${tableName}`, e.message);
            }
        }
    }
}
export async function ensurePostgresTables(poolOverride?: any) {
  const p = poolOverride || (isPgActive() ? getActivePgPool() : null);
  if (p) {
    try {
      await p.query('GRANT ALL ON SCHEMA public TO public');
    } catch (e) {
      console.warn('Could not grant schema privileges:', e.message);
    }
    for (const key of KNOWN_TABLES) {
      try {
        await p.query(`
          CREATE TABLE IF NOT EXISTS "${key}" (id VARCHAR PRIMARY KEY)
        `);
      } catch (err: any) {
        console.error(`Error creating table ${key}:`, err.message);
      }
    }
  }
}
