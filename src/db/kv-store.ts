import { getDb, isPgActive, getActivePgPool, storeContext, activePgPools, loadPgPoolForStore } from './connection';
import { KNOWN_TABLES, tableSchemas, syncTableSchema, preparePgItem } from './schema-sync';
import fs from 'fs';
import fsPromises from 'fs/promises';
import path from 'path';

const cachedDbDataMap: Record<string, Record<string, any>> = {};
const saveDebounceTimers: Record<string, NodeJS.Timeout> = {};

function getDbFilePath(storeId?: string): string {
  const currentStore = storeId || storeContext.getStore() || 'default';
  if (currentStore === 'default') {
    return path.join(process.cwd(), 'data.json');
  }
  return path.join(process.cwd(), `data_${currentStore.replace(/[^a-zA-Z0-9_-]/g, '')}.json`);
}

async function getFileData(storeId?: string): Promise<Record<string, any>> {
  const currentStore = storeId || storeContext.getStore() || 'default';
  if (cachedDbDataMap[currentStore]) return cachedDbDataMap[currentStore];
  const dbFile = getDbFilePath(currentStore);
  try {
    const raw = await fsPromises.readFile(dbFile, 'utf8');
    cachedDbDataMap[currentStore] = JSON.parse(raw);
  } catch(e) {
    cachedDbDataMap[currentStore] = {};
  }
  return cachedDbDataMap[currentStore]!;
}

function scheduleFileSave(storeId?: string) {
  const currentStore = storeId || storeContext.getStore() || 'default';
  if (saveDebounceTimers[currentStore]) clearTimeout(saveDebounceTimers[currentStore]);
  saveDebounceTimers[currentStore] = setTimeout(async () => {
    delete saveDebounceTimers[currentStore];
    if (!cachedDbDataMap[currentStore]) return;
    try {
      const dbFile = getDbFilePath(currentStore);
      await fsPromises.writeFile(dbFile, JSON.stringify(cachedDbDataMap[currentStore], null, 2), 'utf8');
    } catch (err) {
      console.error(`Error writing ${getDbFilePath(currentStore)}:`, err);
    }
  }, 100);
}

export const GLOBAL_MAIN_DB_TABLES = ['users', 'roles', 'permissions', 'businesses'];

export function invalidateKvCache(storeId?: string) {
  if (storeId) {
    delete cachedDbDataMap[storeId];
  } else {
    Object.keys(cachedDbDataMap).forEach(k => delete cachedDbDataMap[k]);
  }
}

export async function innerGetDbData(key: string) {
  const isGlobalTable = GLOBAL_MAIN_DB_TABLES.includes(key);
  const currentStore = storeContext.getStore() || 'default';
  const targetStoreId = isGlobalTable ? 'default' : currentStore;

  if (!activePgPools[targetStoreId]) {
    try {
      await loadPgPoolForStore(targetStoreId);
    } catch (_) {}
  }
  const targetPool = isGlobalTable ? (activePgPools['default'] || null) : (isPgActive() ? getActivePgPool() : (activePgPools[currentStore] || null));

  if (targetPool) {
    if (!KNOWN_TABLES.includes(key)) return null;
    const isSoftDeletable = ["checkbooks", "issued_checks", "received_checks"].includes(key);
    const parseJSONFields = (row: any) => {
         if (!row) return row;
         for (const k in row) {
            if (typeof row[k] === 'string' && (row[k].startsWith('{') || row[k].startsWith('['))) {
               try { row[k] = JSON.parse(row[k]); } catch(e) { }
            }
         }
         return row;
    };
    try {
      if (key === 'company_profile' || key === 'store_settings') {
        try {
            await targetPool.query(`CREATE TABLE IF NOT EXISTS system_settings (setting_key VARCHAR PRIMARY KEY, setting_value TEXT)`);
            const r = await targetPool.query("SELECT * FROM system_settings");
            if (r.rows.length === 0) {
               return null;
            }
            let obj: any = { id: 'singleton' };
            for (const row of r.rows) {
                try { obj[row.setting_key] = JSON.parse(row.setting_value); } catch(e) { obj[row.setting_key] = row.setting_value; }
            }
            if (obj.company_profile && typeof obj.company_profile === 'object') {
                obj = { ...obj.company_profile, ...obj, id: 'singleton' };
            }
            if (obj.store_settings && typeof obj.store_settings === 'object') {
                obj = { ...obj.store_settings, ...obj, id: 'singleton' };
            }
            return obj;
        } catch(e) { return null; }
      } else if (key === 'backupConfig') {
          const res = await targetPool.query(`SELECT * FROM "${key}"`);
          return res.rows.length > 0 ? parseJSONFields(res.rows[0]) : null;
      } else if (key === 'system_logs' || key === 'database_logs') {
          try {
            const res = await targetPool.query(`SELECT * FROM "${key}" ORDER BY "timestamp" DESC LIMIT 3000`);
            return res.rows.map(parseJSONFields);
          } catch (_) {
            const res = await targetPool.query(`SELECT * FROM "${key}" LIMIT 3000`);
            return res.rows.map(parseJSONFields);
          }
      }

      const res = await targetPool.query(`SELECT * FROM "${key}"${isSoftDeletable ? ' WHERE deleted_at IS NULL' : ''}`);
      return res.rows.map(parseJSONFields);
    } catch (e: any) {
      if (e.code === '42P01') { // table does not exist
        return (key === 'company_profile' || key === 'store_settings' || key === 'backupConfig') ? null : [];
      }
      if (e.code === '42703' && isSoftDeletable) {
        // Fallback if deleted_at column doesn't exist
        try {
          const fallbackRes = await targetPool.query(`SELECT * FROM "${key}"`);
          return fallbackRes.rows.map(parseJSONFields);
        } catch (fallbackError) {
          throw fallbackError;
        }
      }
      console.error('innerGetDbData error:', e.message, 'for key:', key);
      throw e;
    }
  } else {
    const fileData = await getFileData(targetStoreId);
    const val = fileData[key];
    if (val === undefined || val === null) {
      return (key === 'company_profile' || key === 'store_settings' || key === 'backupConfig') ? null : [];
    }
    return val;
  }
}

export async function appendLogEntries(key: string, entries: any[]) {
  if (!entries || !Array.isArray(entries) || entries.length === 0) return;
  const isGlobalTable = GLOBAL_MAIN_DB_TABLES.includes(key);
  const currentStore = storeContext.getStore() || 'default';
  const targetStoreId = isGlobalTable ? 'default' : currentStore;

  if (!activePgPools[targetStoreId]) {
    try {
      await loadPgPoolForStore(targetStoreId);
    } catch (_) {}
  }
  const targetPool = isGlobalTable ? (activePgPools['default'] || null) : (isPgActive() ? getActivePgPool() : (activePgPools[currentStore] || null));

  const sanitized = entries.filter(Boolean).map(item => {
    const it = (typeof item === 'object') ? { ...item } : { details: String(item) };
    if (!it.id) it.id = Math.random().toString(36).substring(2, 15);
    if (!it.timestamp) it.timestamp = Date.now();
    return it;
  });

  if (targetPool) {
    const client = await targetPool.connect();
    try {
      await client.query(`CREATE TABLE IF NOT EXISTS "${key}" (id VARCHAR PRIMARY KEY)`);
      if (sanitized.length > 0 && !tableSchemas.has(key)) {
        await syncTableSchema(client, key, sanitized[0]);
      }
      await client.query('BEGIN');
      for (const item of sanitized) {
        if (!tableSchemas.has(key)) {
          await syncTableSchema(client, key, item);
        }
        const { itemKeys: keys, itemVals: vals } = preparePgItem(key, item);
        const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
        const colNames = keys.map(k => `"${k}"`).join(', ');
        await client.query(
          `INSERT INTO "${key}" (${colNames}) VALUES (${placeholders}) ON CONFLICT(id) DO NOTHING`,
          vals
        );
      }
      await client.query('COMMIT');
    } catch (err: any) {
      await client.query('ROLLBACK');
      console.error(`Error appending log entries to ${key}:`, err.message);
    } finally {
      client.release();
    }
  } else {
    const fileData = await getFileData(targetStoreId);
    let list = fileData[key];
    if (!Array.isArray(list)) list = [];
    list = [...sanitized, ...list].slice(0, 3000);
    fileData[key] = list;
    scheduleFileSave(targetStoreId);
  }
}

export async function innerSetDbData(key: string, data: any) {
  // CRITICAL: Audit logs must NEVER be truncated under any circumstances!
  if (key === 'system_logs' || key === 'database_logs') {
    const itemsToAppend = Array.isArray(data) ? data.slice(0, 50) : [data];
    await appendLogEntries(key, itemsToAppend);
    return;
  }

  const isGlobalTable = GLOBAL_MAIN_DB_TABLES.includes(key);
  const currentStore = storeContext.getStore() || 'default';
  const targetStoreId = isGlobalTable ? 'default' : currentStore;

  if (!activePgPools[targetStoreId]) {
    try {
      await loadPgPoolForStore(targetStoreId);
    } catch (_) {}
  }
  const targetPool = isGlobalTable ? (activePgPools['default'] || null) : (isPgActive() ? getActivePgPool() : (activePgPools[currentStore] || null));

  if (targetPool) {
    if (!KNOWN_TABLES.includes(key)) return;
    const client = await targetPool.connect();
    try {
       await client.query('BEGIN');
       if (key === 'company_profile' || key === 'store_settings') {
           await client.query(`CREATE TABLE IF NOT EXISTS system_settings (setting_key VARCHAR PRIMARY KEY, setting_value TEXT)`);
           if (data && typeof data === 'object') {
               const valStr = JSON.stringify(data);
               await client.query(`INSERT INTO system_settings (setting_key, setting_value) VALUES ($1, $2) ON CONFLICT(setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value`, ['company_profile', valStr]);
               await client.query(`INSERT INTO system_settings (setting_key, setting_value) VALUES ($1, $2) ON CONFLICT(setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value`, ['store_settings', valStr]);

               const keys = Object.keys(data);
               for (const k of keys) {
                   if (k === 'id' || k === 'company_profile' || k === 'store_settings') continue;
                   let v = data[k];
                   const vStr = (v !== null && typeof v === 'object') ? JSON.stringify(v) : String(v);
                   await client.query(`INSERT INTO system_settings (setting_key, setting_value) VALUES ($1, $2) ON CONFLICT(setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value`, [k, vStr]);
               }
           }
       } else {
           await client.query(`CREATE TABLE IF NOT EXISTS "${key}" (id VARCHAR PRIMARY KEY)`);
           await client.query(`TRUNCATE TABLE "${key}"`);
           const prepareKvItem = (itemObj: any) => {
               const colTypes = tableSchemas.get(key);
               const keys = Object.keys(itemObj);
               const vals = keys.map(k => {
                   let v = itemObj[k];
                   if (v === undefined) return null;
                   if (v instanceof Date) return v.toISOString();
                   if (v !== null && typeof v === 'object') return JSON.stringify(v);
                   const colType = colTypes?.get(k);
                   const isNumCol = colType && ['double precision', 'real', 'numeric', 'integer', 'bigint', 'smallint'].includes(colType);
                   if (isNumCol && typeof v === 'string' && isNaN(Number(v))) return null;
                   return v;
               });
               return { keys, vals };
           };

           if (key === 'backupConfig' || !Array.isArray(data)) {
                if (data && typeof data === 'object') {
                    data.id = 'singleton';
                    await syncTableSchema(client, key, data);
                    const { itemKeys: keys, itemVals: vals } = preparePgItem(key, data);
                    const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
                    const colNames = keys.map(k => `"${k}"`).join(', ');
                    await client.query(`INSERT INTO "${key}" (${colNames}) VALUES (${placeholders}) ON CONFLICT(id) DO UPDATE SET ${keys.map(k => `"${k}" = EXCLUDED."${k}"`).join(', ')}`, vals);
                }
             } else {
                for (const item of data) {
                   if (!item.id) item.id = Math.random().toString(36).substring(2, 15);
                   await syncTableSchema(client, key, item);
                   const { itemKeys: keys, itemVals: vals } = preparePgItem(key, item);
                   const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
                   const colNames = keys.map(k => `"${k}"`).join(', ');
                   await client.query(`INSERT INTO "${key}" (${colNames}) VALUES (${placeholders}) ON CONFLICT(id) DO UPDATE SET ${keys.map(k => `"${k}" = EXCLUDED."${k}"`).join(', ')}`, vals);
                }
             }
       }
       await client.query('COMMIT');
    } catch (err: any) {
       await client.query('ROLLBACK');
       tableSchemas.delete(key);
       console.log("Error in query:", err.message); throw err;
    } finally {
       client.release();
    }
  } else {
     const fileData = await getFileData(targetStoreId);
     fileData[key] = data;
     scheduleFileSave(targetStoreId);
     return true;
  }
}

export function getChildTableCandidates(key: string): string[] {
    if (key === "warehouse_receipts") return ["warehouse_receipt_items", "warehouse_receipts_item", "warehouse_receipts_items"];
    if (key === "warehouse_remittances") return ["warehouse_remittance_items", "warehouse_remittances_item", "warehouse_remittances_items"];
    if (key === "accounting_documents") return ["accounting_document_items"];
    if (key === "stocktakings") return ["stocktaking_items"];
    if (key === "invoices") return ["invoice_items", "purchase_invoice_items", "sales_invoice_items", "warehouse_receipt_items", "warehouse_remittance_items", "proforma_invoice_items", "sale_return_items", "purchase_return_items", "waste_items"];
    if (key.endsWith('s')) return [key.substring(0, key.length - 1) + "_items"];
    return [key + "_items"];
}

export async function handleRelations(key: string, data: any) {
    if ((key === "invoices" || key === "sales_invoices" || key === "purchase_invoices" || key === "warehouse_receipts" || key === "warehouse_remittances" || key === "proforma_invoices" || key === "sale_returns" || key === "purchase_returns" || key === "wastes") && data && data.items) {
       const childCandidates = getChildTableCandidates(key);
       const childTable = childCandidates[0];
       const items = data.items.map((it: any) => ({...it, invoiceId: data.id, id: it.id || Math.random().toString(36).substring(2,15)}));
       delete data.items;
       return { strippedData: data, childTable, items, allChildTables: childCandidates };
    }
    if (key === "accounting_documents" && data && data.items) {
       const items = data.items.map((it: any) => ({...it, documentId: data.id, id: it.id || Math.random().toString(36).substring(2,15)}));
       delete data.items;
       return { strippedData: data, childTable: "accounting_document_items", items, allChildTables: ["accounting_document_items"] };
    }
    if (key === "stocktakings" && data && data.items) {
       const items = data.items.map((it: any) => ({...it, stocktakingId: data.id, id: it.id || Math.random().toString(36).substring(2,15)}));
       delete data.items;
       return { strippedData: data, childTable: "stocktaking_items", items, allChildTables: ["stocktaking_items"] };
    }
    return { strippedData: data, childTable: null, items: [], allChildTables: [] };
}

export async function hydrateChildItemsForParents(key: string, parents: any[]) {
  if (!Array.isArray(parents) || parents.length === 0) return parents;
  const parentIds = new Set(parents.map(p => p && p.id ? String(p.id) : '').filter(Boolean));
  if (parentIds.size === 0) return parents;

  const isGlobalTable = GLOBAL_MAIN_DB_TABLES.includes(key);
  const currentStore = storeContext.getStore() || 'default';
  const targetStoreId = isGlobalTable ? 'default' : currentStore;
  const targetPool = isGlobalTable ? (activePgPools['default'] || null) : (isPgActive() ? getActivePgPool() : (activePgPools[currentStore] || null));
  const parentIdArray = Array.from(parentIds);

  if (['invoices', 'sales_invoices', 'purchase_invoices', 'warehouse_receipts', 'warehouse_remittances', 'proforma_invoices', 'sale_returns', 'purchase_returns', 'wastes'].includes(key)) {
      const candidates = getChildTableCandidates(key);
      let items: any[] = [];
      if (targetPool) {
        for (const cand of candidates) {
          try {
            const res = await targetPool.query(
              `SELECT * FROM "${cand}" WHERE ("invoiceId" = ANY($1) OR "invoice_id" = ANY($1))`,
              [parentIdArray]
            );
            if (res.rows && res.rows.length > 0) {
              items = items.concat(res.rows);
            }
          } catch (_) {}
        }
      } else {
        for (const cand of candidates) {
          const candItems = (await innerGetDbData(cand)) || [];
          if (Array.isArray(candItems)) {
            const matched = candItems.filter((it: any) => parentIds.has(String(it.invoiceId || it.invoice_id)));
            items = items.concat(matched);
          }
        }
      }

      // Deduplicate items by id
      const uniqueItemsMap = new Map();
      items.forEach(it => { if (it && it.id) uniqueItemsMap.set(it.id, it); });
      const finalItems = Array.from(uniqueItemsMap.values());

      parents.forEach((inv: any) => {
          if (!inv) return;
          inv.customerId = inv.customerId || inv.personId || inv.supplierId || '';
          inv.personId = inv.personId || inv.customerId || inv.supplierId || '';
          if (inv.payableAmount === undefined && inv.totalAmount !== undefined) {
            inv.payableAmount = inv.totalAmount;
          }
          inv.items = finalItems.filter((it: any) => String(it.invoiceId || it.invoice_id) === String(inv.id));
      });
  } else if (key === 'accounting_documents') {
      let items: any[] = [];
      if (targetPool) {
        try {
          const res = await targetPool.query(
            `SELECT * FROM "accounting_document_items" WHERE ("documentId" = ANY($1) OR "document_id" = ANY($1))`,
            [parentIdArray]
          );
          items = res.rows || [];
        } catch (_) {}
      } else {
        const allItems = (await innerGetDbData('accounting_document_items')) || [];
        items = Array.isArray(allItems) ? allItems.filter((it: any) => parentIds.has(String(it.documentId || it.document_id))) : [];
      }
      parents.forEach((doc: any) => {
          if (!doc) return;
          doc.items = items.filter((it: any) => String(it.documentId || it.document_id) === String(doc.id));
      });
  } else if (key === 'stocktakings') {
      let items: any[] = [];
      if (targetPool) {
        try {
          const res = await targetPool.query(
            `SELECT * FROM "stocktaking_items" WHERE ("stocktakingId" = ANY($1) OR "stocktaking_id" = ANY($1))`,
            [parentIdArray]
          );
          items = res.rows || [];
        } catch (_) {}
      } else {
        const allItems = (await innerGetDbData('stocktaking_items')) || [];
        items = Array.isArray(allItems) ? allItems.filter((it: any) => parentIds.has(String(it.stocktakingId || it.stocktaking_id))) : [];
      }
      parents.forEach((st: any) => {
          if (!st) return;
          st.items = items.filter((it: any) => String(it.stocktakingId || it.stocktaking_id) === String(st.id));
      });
  } else if (key === 'persons') {
      let contacts: any[] = [];
      let bankAccounts: any[] = [];
      if (targetPool) {
        try {
          const resC = await targetPool.query(`SELECT * FROM "person_contacts" WHERE ("personId" = ANY($1) OR "person_id" = ANY($1))`, [parentIdArray]);
          contacts = resC.rows || [];
        } catch (_) {}
        try {
          const resB = await targetPool.query(`SELECT * FROM "person_bank_accounts" WHERE ("personId" = ANY($1) OR "person_id" = ANY($1))`, [parentIdArray]);
          bankAccounts = resB.rows || [];
        } catch (_) {}
      } else {
        const allC = (await innerGetDbData('person_contacts')) || [];
        const allB = (await innerGetDbData('person_bank_accounts')) || [];
        contacts = Array.isArray(allC) ? allC.filter((c: any) => parentIds.has(String(c.personId || c.person_id))) : [];
        bankAccounts = Array.isArray(allB) ? allB.filter((b: any) => parentIds.has(String(b.personId || b.person_id))) : [];
      }
      parents.forEach((p: any) => {
        if (!p) return;
        p.contacts = contacts.filter((c: any) => String(c.personId || c.person_id) === String(p.id));
        p.bankAccounts = bankAccounts.filter((b: any) => String(b.personId || b.person_id) === String(p.id));
      });
  }
  return parents;
}

export async function getDbData(key: string, options: { skipChildHydration?: boolean } = {}) {
  let data: any = null;
  if (key === 'invoices') {
    const rawMain = (await innerGetDbData('invoices')) || [];
    let allInvoices: any[] = Array.isArray(rawMain) ? [...rawMain] : [];
    const specializedTables = ['sales_invoices', 'purchase_invoices', 'warehouse_receipts', 'warehouse_remittances', 'proforma_invoices', 'sale_returns', 'purchase_returns', 'wastes'];
    for (const specTable of specializedTables) {
      try {
        const specData = await innerGetDbData(specTable);
        if (Array.isArray(specData) && specData.length > 0) {
          allInvoices = allInvoices.concat(specData);
        }
      } catch (_) {}
    }
    const uniqueMap = new Map<string, any>();
    allInvoices.forEach(inv => {
      if (inv && inv.id) {
        const existing = uniqueMap.get(String(inv.id));
        if (!existing || (inv.updatedAt || 0) > (existing.updatedAt || 0)) {
          uniqueMap.set(String(inv.id), inv);
        }
      }
    });
    data = Array.from(uniqueMap.values());
  } else {
    data = await innerGetDbData(key);
  }
  if (!data) return data;
  
  if (options.skipChildHydration) {
    return data;
  }

  if (Array.isArray(data)) {
    await hydrateChildItemsForParents(key, data);
  }
  return data;
}

export async function setDbData(key: string, data: any) {
  if (key === 'system_logs' || key === 'database_logs') {
    const itemsToAppend = Array.isArray(data) ? data.slice(0, 50) : [data];
    await appendLogEntries(key, itemsToAppend);
    return;
  }
  if ((key === 'invoices' || key === 'sales_invoices' || key === 'purchase_invoices' || key === 'warehouse_receipts' || key === 'warehouse_remittances' || key === 'proforma_invoices' || key === 'sale_returns' || key === 'purchase_returns' || key === 'wastes') && Array.isArray(data)) {
      const childCandidates = getChildTableCandidates(key);
      const childTable = childCandidates[0];
      let hasItemsKey = data.some((inv: any) => 'items' in inv);
      const items: any[] = [];
      const strippedData = data.map((inv: any) => {
          if (inv.items) {
              inv.items.forEach((it: any) => {
                  items.push({
                    ...it,
                    invoiceId: inv.id,
                    id: it.id || Math.random().toString(36).substring(2, 15),
                    netPrice: it.netPrice !== undefined ? it.netPrice : (it.totalPrice !== undefined ? it.totalPrice : ((Number(it.quantity) || 0) * (Number(it.unitPrice) || 0))),
                    totalPrice: it.totalPrice !== undefined ? it.totalPrice : ((Number(it.quantity) || 0) * (Number(it.unitPrice) || 0))
                  });
              });
          }
          const { items: _, ...rest } = inv;
          rest.customerId = rest.customerId || rest.personId || rest.supplierId || '';
          rest.personId = rest.personId || rest.customerId || rest.supplierId || '';
          if (rest.payableAmount === undefined && rest.totalAmount !== undefined) {
            rest.payableAmount = rest.totalAmount;
          }
          return rest;
      });
      if (hasItemsKey) {
        await innerSetDbData(childTable, items);
        if (key !== 'invoices') {
          try {
            let masterItems = (await innerGetDbData('invoice_items')) || [];
            if (Array.isArray(masterItems)) {
              const itemIds = new Set(items.map(it => String(it.id)));
              masterItems = masterItems.filter(it => !itemIds.has(String(it.id)));
              masterItems.push(...items);
              await innerSetDbData('invoice_items', masterItems);
            }
          } catch (_) {}
        }
      }
      await innerSetDbData(key, strippedData);
      if (key !== 'invoices') {
        try {
          let masterInvoices = (await innerGetDbData('invoices')) || [];
          if (Array.isArray(masterInvoices)) {
            const strippedIds = new Set(strippedData.map(inv => String(inv.id)));
            masterInvoices = masterInvoices.filter(inv => !strippedIds.has(String(inv.id)));
            masterInvoices.push(...strippedData);
            await innerSetDbData('invoices', masterInvoices);
          }
        } catch (_) {}
      }
      return;
  } else if (key === 'accounting_documents' && Array.isArray(data)) {
      let hasItemsKey = data.some((doc: any) => 'items' in doc);
      const items: any[] = [];
      const strippedData = data.map((doc: any) => {
          if (doc.items) {
              doc.items.forEach((it: any) => {
                  items.push({ ...it, documentId: doc.id, id: it.id || Math.random().toString(36).substring(2, 15) });
              });
          }
          const { items: _, ...rest } = doc;
          return rest;
      });
      if (hasItemsKey) await innerSetDbData('accounting_document_items', items);
      await innerSetDbData(key, strippedData);
      return;
  } else if (key === 'stocktakings' && Array.isArray(data)) {
      let hasItemsKey = data.some((st: any) => 'items' in st);
      const items: any[] = [];
      const strippedData = data.map((st: any) => {
          if (st.items) {
              st.items.forEach((it: any) => {
                  items.push({ ...it, stocktakingId: st.id, id: it.id || Math.random().toString(36).substring(2, 15) });
              });
          }
          const { items: _, ...rest } = st;
          return rest;
      });
      if (hasItemsKey) await innerSetDbData('stocktaking_items', items);
      await innerSetDbData(key, strippedData);
      return;
  }
  await innerSetDbData(key, data);
}

export async function getAllDbData() {
  if (isPgActive() && getActivePgPool()) {
    const allData = [];
    const parseJSONFields = (row) => {
       if (!row) return row;
       for (const k in row) {
          if (typeof row[k] === 'string' && (row[k].startsWith('{') || row[k].startsWith('['))) {
             try { row[k] = JSON.parse(row[k]); } catch(e) { }
          }
       }
       return row;
    };
    const client = await getActivePgPool().connect();
    try {
      await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ');
      for (const key of KNOWN_TABLES) {
         const isGlobal = GLOBAL_MAIN_DB_TABLES.includes(key);
         const isSoftDeletable = ["checkbooks", "issued_checks", "received_checks"].includes(key);
         let res;
         
         if (isGlobal && activePgPools['default'] && activePgPools['default'] !== getActivePgPool()) {
           try {
             const gRes = await activePgPools['default'].query(`SELECT * FROM "${key}"`);
             allData.push({ key, value: gRes.rows.map(parseJSONFields) });
             continue;
           } catch (_) {}
         }

         await client.query(`SAVEPOINT sp_table`);
         try {
             res = await client.query(`SELECT * FROM "${key}"${isSoftDeletable ? ' WHERE deleted_at IS NULL' : ''}`);
             await client.query(`RELEASE SAVEPOINT sp_table`);
         } catch (err) {
             await client.query(`ROLLBACK TO SAVEPOINT sp_table`);
             if (err.code === '42703') {
                 await client.query(`SAVEPOINT sp_fallback`);
                 try {
                     res = await client.query(`SELECT * FROM "${key}"`);
                     await client.query(`RELEASE SAVEPOINT sp_fallback`);
                 } catch (errFallback) {
                     await client.query(`ROLLBACK TO SAVEPOINT sp_fallback`);
                     res = { rows: [] };
                 }
             } else if (err.code === '42P01') {
                 res = { rows: [] };
             } else {
                 throw err;
             }
         }
         if (key === 'company_profile' || key === 'store_settings') {
           let cval: any = null;
           await client.query(`SAVEPOINT sp_sysset`);
           try {
              await client.query(`CREATE TABLE IF NOT EXISTS system_settings (setting_key VARCHAR PRIMARY KEY, setting_value TEXT)`);
              const cres = await client.query(`SELECT * FROM system_settings`);
              await client.query(`RELEASE SAVEPOINT sp_sysset`);
              if (cres.rows.length > 0) {
                 cval = { id: 'singleton' };
                 for (const r of cres.rows) {
                    try { cval[r.setting_key] = JSON.parse(r.setting_value); }
                    catch(e) { cval[r.setting_key] = r.setting_value; }
                 }
                 if (cval.company_profile && typeof cval.company_profile === 'object') {
                    cval = { ...cval.company_profile, ...cval, id: 'singleton' };
                 }
                 if (cval.store_settings && typeof cval.store_settings === 'object') {
                    cval = { ...cval.store_settings, ...cval, id: 'singleton' };
                 }
              }
           } catch(e) {
              await client.query(`ROLLBACK TO SAVEPOINT sp_sysset`);
           }
           allData.push({ key, value: cval });
         } else if (key === 'backupConfig') {
           allData.push({ key, value: res.rows.length > 0 ? parseJSONFields(res.rows[0]) : null });
         } else {
           allData.push({ key, value: res.rows.map(parseJSONFields) });
         }
      }
      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
    return allData;
  } else {
    const fs = await import("fs");
    const dbFile = getDbFilePath();
    if (fs.existsSync(dbFile)) {
        try { 
            const dbData = JSON.parse(fs.readFileSync(dbFile, 'utf8')); 
            return Object.entries(dbData).map(([k, v]) => ({ key: k, value: v }));
        } catch(e) { return []; }
    }
    return [];
  }
}
