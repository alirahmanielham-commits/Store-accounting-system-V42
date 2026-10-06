import { getActivePgPool, isPgActive } from './connection';

export const KNOWN_TABLES = ['notifications', 'customers_risk_profile', 'repayment_transactions', 'repayment_schedules', 'loan_accounts', 'collaterals', 'loan_applications', 'loan_types', 
  'users', 'company_profile', 'financial_years', 'person_groups', 'person_roles',
  'payslips', 'salary_components', 'rent_contracts', 'employee_contracts', 'contract_components', 'monthly_attendance', 'daily_attendance', 'employee_leaves', 'employee_missions', 'payslip_items', 'debtors_trackings',
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
  'warehouse_receipts', 'warehouse_receipt_items', 'warehouse_receipts_item', 'warehouse_receipts_items',
  'warehouse_remittances', 'warehouse_remittance_items', 'warehouse_remittances_item', 'warehouse_remittances_items',
  'proforma_invoices', 'proforma_invoice_items',
  'sale_returns', 'sale_return_items',
  'purchase_returns', 'purchase_return_items',
  'wastes', 'waste_items',
  'receipt_transactions', 'payment_transactions',
  'issued_checks', 'received_checks', 'payslips'
, 'InventoryTransactions', 'inventory_transactions', 'kardex', 'personal_notes',
  'sms_providers', 'sms_provider_settings', 'sms_templates', 'sms_campaigns',
  'sms_delivery_logs', 'sms_retry_logs', 'sms_settings', 'sms_quota_logs', 'sms_audit_logs', 'employee_orders', 'employee_profiles', 'order_templates', 'workplaces'];
export const tableSchemas = new Map<string, Set<string>>();

export async function syncTableSchema(client: any, tableName: string, dataObj: any) {
    if (!dataObj || typeof dataObj !== 'object') return;
    let knownCols = tableSchemas.get(tableName);
    if (!knownCols) {
        knownCols = new Set();
        try {
            const res = await client.query("SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND (table_name = $1 OR table_name = lower($1))", [tableName]);
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
               await client.query(`ALTER TABLE "${tableName}" ADD COLUMN IF NOT EXISTS "${k}" ${colType}`);
               knownCols.add(k);
            } catch (e: any) {
               console.error(`Error adding column ${k} to ${tableName}:`, e?.message);
            }
        }
    }
}
export async function ensurePostgresTables(poolOverride?: any) {
  const p = poolOverride || (isPgActive() ? getActivePgPool() : null);
  if (p) {
    try {
      await p.query('GRANT ALL ON SCHEMA public TO public');
    } catch (e: any) {
      console.warn('Could not grant schema privileges:', e.message);
    }
    for (const key of KNOWN_TABLES) {
      try {
        await p.query(`
          CREATE TABLE IF NOT EXISTS "${key}" (id VARCHAR PRIMARY KEY);
          ALTER TABLE "${key}" ADD COLUMN IF NOT EXISTS "version" DOUBLE PRECISION DEFAULT 1;
          ALTER TABLE "${key}" ADD COLUMN IF NOT EXISTS "createdAt" TEXT;
          ALTER TABLE "${key}" ADD COLUMN IF NOT EXISTS "updatedAt" TEXT;
          ALTER TABLE "${key}" ADD COLUMN IF NOT EXISTS "isDeleted" BOOLEAN DEFAULT FALSE;
          ALTER TABLE "${key}" ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMP;
        `);
      } catch (err: any) {
        console.error(`Error creating/updating table ${key}:`, err.message);
      }
    }
    // Create essential performance indexes
    const essentialIndexes = [
      'CREATE INDEX IF NOT EXISTS idx_invoices_date ON "invoices" ("date")',
      'CREATE INDEX IF NOT EXISTS idx_invoices_person ON "invoices" ("personId")',
      'CREATE INDEX IF NOT EXISTS idx_invoices_warehouse ON "invoices" ("warehouseId")',
      'CREATE INDEX IF NOT EXISTS idx_invoices_num ON "invoices" ("invoiceNumber")',
      'CREATE INDEX IF NOT EXISTS idx_invoices_type ON "invoices" ("type")',
      'CREATE INDEX IF NOT EXISTS idx_invoice_items_inv ON "invoice_items" ("invoiceId")',
      'CREATE INDEX IF NOT EXISTS idx_invoice_items_prod ON "invoice_items" ("productId")',
      'CREATE INDEX IF NOT EXISTS idx_acc_docs_num ON "accounting_documents" ("documentNumber")',
      'CREATE INDEX IF NOT EXISTS idx_acc_docs_date ON "accounting_documents" ("date")',
      'CREATE INDEX IF NOT EXISTS idx_acc_doc_items_doc ON "accounting_document_items" ("documentId")',
      'CREATE INDEX IF NOT EXISTS idx_inv_tx_prod ON "inventory_transactions" ("productId")',
      'CREATE INDEX IF NOT EXISTS idx_inv_tx_wh ON "inventory_transactions" ("warehouseId")',
      'CREATE INDEX IF NOT EXISTS idx_inv_tx_date ON "inventory_transactions" ("date")',
      'CREATE INDEX IF NOT EXISTS idx_inv_tx_doc ON "inventory_transactions" ("documentId")',
      'CREATE INDEX IF NOT EXISTS idx_persons_name ON "persons" ("name")',
      'CREATE INDEX IF NOT EXISTS idx_persons_phone ON "persons" ("phone")',
      'CREATE INDEX IF NOT EXISTS idx_products_code ON "products" ("code")',
      'CREATE INDEX IF NOT EXISTS idx_products_barcode ON "products" ("barcode")',
    ];
    for (const idxQuery of essentialIndexes) {
      try {
        await p.query(idxQuery);
      } catch (e: any) {
        // column may not exist yet until table populated; ignore silently
      }
    }
  }
}
