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
export const tableSchemas = new Map<string, Map<string, string>>();

export const isNumericField = (k: string) => {
  const lower = k.toLowerCase();
  return (
    /^(amount|totalamount|payableamount|paidamount|balance|initialbalance|balanceafter|stockbefore|stockafter|buyprice|sellprice|wholesaleprice|purchaseprice|price|stock|quantity|basequantity|unitprice|baseunitprice|totalprice|discount|discountamount|discountpercent|tax|taxamount|taxrate|taxpercent|netprice|debit|credit|cost|costtotal|interestrate|penaltyrate|unitratio|ratio|version|rate|percent|score|priority|order|sortorder|weight|width|height|length)$/i.test(lower) ||
    lower.endsWith('amount') ||
    lower.endsWith('price') ||
    lower.endsWith('quantity') ||
    lower.endsWith('rate') ||
    lower.endsWith('percent') ||
    lower.endsWith('ratio') ||
    lower.endsWith('balance')
  ) && !/date|time|created|updated|stamp|phone|mobile|code|number|sayad|sheba|card|account/i.test(lower);
};

export const isNonNumericIdentifierOrDateField = (k: string) => {
  if (isNumericField(k)) return false;
  return /date|time|created|updated|deleted|stamp|phone|mobile|tel|fax|postal|national|economic|barcode|invoice|receipt|document|check|sayad|account|card|sheba|number|name|title|unit|status|type|role|note|desc|address|alias|category|group|warehouse|person|customer|supplier|user/i.test(k);
};

export function findMatchingColumn(knownCols: Map<string, string>, propKey: string): { dbColName: string; colType: string } | null {
  if (!knownCols || knownCols.size === 0) return null;
  // 1. Exact match
  if (knownCols.has(propKey)) {
    return { dbColName: propKey, colType: knownCols.get(propKey) || '' };
  }
  // 2. Lowercase match
  const lowerProp = propKey.toLowerCase();
  if (knownCols.has(lowerProp)) {
    return { dbColName: lowerProp, colType: knownCols.get(lowerProp) || '' };
  }
  for (const [colName, colType] of knownCols.entries()) {
    if (colName.toLowerCase() === lowerProp) {
      return { dbColName: colName, colType };
    }
  }
  // 3. Snake case conversion: e.g. createdAt -> created_at
  const snakeProp = propKey.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`).toLowerCase();
  if (knownCols.has(snakeProp)) {
    return { dbColName: snakeProp, colType: knownCols.get(snakeProp) || '' };
  }
  for (const [colName, colType] of knownCols.entries()) {
    if (colName.toLowerCase() === snakeProp) {
      return { dbColName: colName, colType };
    }
  }
  // 4. Camel case conversion: e.g. created_at -> createdAt
  const camelProp = propKey.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase()).toLowerCase();
  for (const [colName, colType] of knownCols.entries()) {
    if (colName.toLowerCase() === camelProp) {
      return { dbColName: colName, colType };
    }
  }
  return null;
}

export function preparePgItem(key: string, item: Record<string, any>) {
  const colMap = tableSchemas.get(key);
  const itemKeys: string[] = [];
  const itemVals: any[] = [];
  
  for (const [k, rawVal] of Object.entries(item)) {
    if (rawVal === undefined) continue;
    let targetCol = k;
    let colType = '';

    if (colMap) {
      const matched = findMatchingColumn(colMap, k);
      if (matched) {
        targetCol = matched.dbColName;
        colType = matched.colType;
      }
    }

    itemKeys.push(targetCol);
    let val = rawVal;
    if (val instanceof Date) {
      val = val.toISOString();
    } else if (val !== null && typeof val === 'object') {
      val = JSON.stringify(val);
    }

    const isNumCol = colType && ['double precision', 'real', 'numeric', 'integer', 'bigint', 'smallint'].includes(colType);
    if (isNumCol) {
      if (typeof val === 'string') {
        const trimmed = val.trim();
        if (trimmed === '' || isNaN(Number(trimmed))) {
          // Never pass a date string or non-numeric text into a double precision / numeric column
          val = null;
        } else {
          val = Number(trimmed);
        }
      } else if (typeof val !== 'number') {
        val = null;
      }
    }
    itemVals.push(val);
  }
  return { itemKeys, itemVals };
}

export async function syncTableSchema(client: any, tableName: string, dataObj: any) {
    if (!dataObj || typeof dataObj !== 'object') return;
    let knownCols = tableSchemas.get(tableName);
    if (!knownCols) {
        knownCols = new Map<string, string>();
        try {
            const res = await client.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_schema = 'public' AND (table_name = $1 OR table_name = lower($1))", [tableName]);
            for (const row of res.rows) {
                const colType = (row.data_type || '').toLowerCase();
                knownCols.set(row.column_name, colType);
                knownCols.set(row.column_name.toLowerCase(), colType);
            }
        } catch (e) {}
        tableSchemas.set(tableName, knownCols);
    }
    
    // Ensure base metadata columns exist on the table
    if (!knownCols.has('version') && !knownCols.has('version'.toLowerCase())) {
        try {
            await client.query(`ALTER TABLE "${tableName}" ADD COLUMN IF NOT EXISTS "version" NUMERIC DEFAULT 1`);
            knownCols.set('version', 'numeric');
            knownCols.set('version'.toLowerCase(), 'numeric');
        } catch (e) {}
    }
    if (!knownCols.has('createdAt') && !knownCols.has('createdat')) {
        try {
            await client.query(`ALTER TABLE "${tableName}" ADD COLUMN IF NOT EXISTS "createdAt" TEXT`);
            knownCols.set('createdAt', 'text');
            knownCols.set('createdat', 'text');
        } catch (e) {}
    }
    if (!knownCols.has('updatedAt') && !knownCols.has('updatedat')) {
        try {
            await client.query(`ALTER TABLE "${tableName}" ADD COLUMN IF NOT EXISTS "updatedAt" TEXT`);
            knownCols.set('updatedAt', 'text');
            knownCols.set('updatedat', 'text');
        } catch (e) {}
    }

    for (const [k, v] of Object.entries(dataObj)) {
        if (v === undefined) continue;
        const matched = findMatchingColumn(knownCols, k);

        if (!matched) {
            let colType = 'TEXT';
            if (v === null) colType = 'TEXT';
            else if (typeof v === 'boolean') colType = 'BOOLEAN';
            else if (typeof v === 'object') colType = 'JSONB';
            else if (typeof v === 'number') {
                colType = isNumericField(k) ? 'DOUBLE PRECISION' : 'TEXT';
            }
            
            try {
               await client.query(`ALTER TABLE "${tableName}" ADD COLUMN IF NOT EXISTS "${k}" ${colType}`);
               knownCols.set(k, colType.toLowerCase());
               knownCols.set(k.toLowerCase(), colType.toLowerCase());
            } catch (e: any) {
               console.error(`Error adding column ${k} to ${tableName}:`, e?.message);
            }
        } else {
            // Check if existing column is numeric/double precision but receiving a date or string value
            const { dbColName, colType: existingType } = matched;
            const isNumericType = ['double precision', 'real', 'numeric', 'integer', 'bigint', 'smallint'].includes(existingType);
            const isIncomingNonNumericString = typeof v === 'string' && (v.trim() === '' || isNaN(Number(v)));
            const isDateField = isNonNumericIdentifierOrDateField(k) || isNonNumericIdentifierOrDateField(dbColName);
            
            if (isNumericType && (isDateField || isIncomingNonNumericString)) {
                try {
                    await client.query(`ALTER TABLE "${tableName}" ALTER COLUMN "${dbColName}" TYPE TEXT USING "${dbColName}"::TEXT`);
                    knownCols.set(dbColName, 'text');
                    knownCols.set(dbColName.toLowerCase(), 'text');
                } catch (alterErr: any) {
                    try {
                        const lowerName = dbColName.toLowerCase();
                        await client.query(`ALTER TABLE "${tableName}" ALTER COLUMN ${lowerName} TYPE TEXT USING ${lowerName}::TEXT`);
                        knownCols.set(lowerName, 'text');
                    } catch (e2) {}
                }
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

    // Automated schema correction: convert any date/time/code/identifier columns
    // that were accidentally created as numeric/double precision to TEXT
    try {
      await p.query(`
        DO $$
        DECLARE
            r RECORD;
        BEGIN
            FOR r IN
                SELECT table_name, column_name, data_type
                FROM information_schema.columns
                WHERE table_schema = 'public'
                  AND data_type IN ('double precision', 'real', 'numeric', 'integer', 'bigint', 'smallint')
                  AND (
                    column_name ILIKE '%created%'
                    OR column_name ILIKE '%updated%'
                    OR column_name ILIKE '%deleted%'
                    OR column_name ILIKE '%date%'
                    OR column_name ILIKE '%time%'
                    OR column_name ILIKE '%stamp%'
                    OR column_name ILIKE '%code%'
                    OR column_name ILIKE '%phone%'
                    OR column_name ILIKE '%mobile%'
                    OR column_name ILIKE '%tel%'
                    OR column_name ILIKE '%fax%'
                    OR column_name ILIKE '%postal%'
                    OR column_name ILIKE '%national%'
                    OR column_name ILIKE '%economic%'
                    OR column_name ILIKE '%barcode%'
                    OR column_name ILIKE '%sayad%'
                    OR column_name ILIKE '%sheba%'
                    OR column_name ILIKE '%account%'
                    OR column_name ILIKE '%card%'
                    OR column_name ILIKE '%check%'
                    OR column_name ILIKE '%receipt%'
                    OR column_name ILIKE '%invoice%'
                    OR column_name ILIKE '%number%'
                    OR column_name ILIKE '%status%'
                    OR column_name ILIKE '%type%'
                    OR column_name ILIKE '%role%'
                    OR column_name ILIKE '%name%'
                    OR column_name ILIKE '%title%'
                    OR column_name ILIKE '%desc%'
                    OR column_name ILIKE '%note%'
                    OR column_name ILIKE '%address%'
                    OR column_name ILIKE '%unit%'
                    OR column_name IN ('rawDate', 'displayDate', 'rawCheckDueDate', 'displayCheckDueDate', 'phone', 'mobile', 'tel', 'fax', 'code', 'barcode', 'personCode', 'invoiceNumber', 'receiptNumber', 'documentNumber', 'checkNumber', 'sayadNumber', 'accountNumber', 'cardNumber', 'shebaNumber', 'postalCode', 'nationalId', 'economicCode', 'birthDate', 'expiryDate', 'productionDate', 'priceChangeDate', 'issueDate', 'dueDate')
                  )
                  AND column_name NOT IN ('amount', 'totalAmount', 'payableAmount', 'paidAmount', 'balance', 'initialBalance', 'balanceAfter', 'stockBefore', 'stockAfter', 'buyPrice', 'sellPrice', 'wholesalePrice', 'purchasePrice', 'price', 'stock', 'quantity', 'baseQuantity', 'baseUnitPrice', 'unitPrice', 'totalPrice', 'discount', 'discountAmount', 'discountPercent', 'tax', 'taxAmount', 'taxRate', 'taxPercent', 'netPrice', 'debit', 'credit', 'cost', 'costTotal', 'interestRate', 'penaltyRate', 'unitRatio', 'version')
            LOOP
                BEGIN
                    EXECUTE format('ALTER TABLE %I ALTER COLUMN %I TYPE TEXT USING %I::TEXT', r.table_name, r.column_name, r.column_name);
                EXCEPTION WHEN OTHERS THEN
                    -- Ignore if table or column is locked or cannot be altered
                END;
            END LOOP;
        END $$;
      `);
    } catch (migErr: any) {
      console.warn('Could not run automated date column migration:', migErr?.message);
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
          ALTER TABLE "${key}" ADD COLUMN IF NOT EXISTS "rawDate" TEXT;
          ALTER TABLE "${key}" ADD COLUMN IF NOT EXISTS "displayDate" TEXT;
        `);
      } catch (err: any) {
        console.error(`Error creating/updating table ${key}:`, err.message);
      }
      for (const col of ['createdAt', 'updatedAt', 'created_at', 'updated_at', 'rawDate', 'displayDate', 'rawCheckDueDate', 'displayCheckDueDate', 'date', 'birthDate', 'expiryDate', 'productionDate', 'issueDate', 'dueDate']) {
        try {
          await p.query(`ALTER TABLE "${key}" ALTER COLUMN "${col}" TYPE TEXT USING "${col}"::TEXT`);
        } catch (e: any) {}
        try {
          await p.query(`ALTER TABLE "${key}" ALTER COLUMN ${col.toLowerCase()} TYPE TEXT USING ${col.toLowerCase()}::TEXT`);
        } catch (e: any) {}
      }
    }
    tableSchemas.clear();
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
