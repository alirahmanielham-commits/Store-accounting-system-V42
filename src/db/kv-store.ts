import { getDb, isPgActive, getActivePgPool } from './connection';
import { KNOWN_TABLES, tableSchemas, syncTableSchema } from './schema-sync';

export async function innerGetDbData(key: string) {
  if (isPgActive() && getActivePgPool()) {
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
      const res = await getActivePgPool().query(`SELECT * FROM "${key}"${isSoftDeletable ? ' WHERE deleted_at IS NULL' : ''}`);

      if (key === 'company_profile') {
        try {
            const r = await getActivePgPool().query("SELECT * FROM system_settings");
            if (r.rows.length === 0) {
               const r2 = await getActivePgPool().query("SELECT value FROM store WHERE key = 'company_profile'");
               if (r2.rows.length > 0) return JSON.parse(r2.rows[0].value);
               return null;
            }
            const obj = { id: 'singleton' };
            for (const row of r.rows) {
                try { obj[row.setting_key] = JSON.parse(row.setting_value); } catch(e) { obj[row.setting_key] = row.setting_value; }
            }
            return obj;
        } catch(e) { return null; }
      }
      return res.rows.map(parseJSONFields);
    } catch (e: any) {
      if (e.code === '42P01') { // table does not exist
        return (key === 'company_profile' || key === 'backupConfig') ? null : [];
      }
      if (e.code === '42703' && isSoftDeletable) {
        // Fallback if deleted_at column doesn't exist
        try {
          const fallbackRes = await getActivePgPool().query(`SELECT * FROM "${key}"`);
          return fallbackRes.rows.map(parseJSONFields);
        } catch (fallbackError) {
          throw fallbackError;
        }
      }
      console.error('innerGetDbData error:', e.message, 'for key:', key);
      throw e;
    }
  } else {
    const fs = await import("fs");
    const path = await import("path");
    const dbFile = path.join(process.cwd(), 'data.json');
    if (fs.existsSync(dbFile)) {
        try { 
            const dbData = JSON.parse(fs.readFileSync(dbFile, 'utf8')); 
            return dbData[key] || null;
        } catch(e) { return null; }
    }
    
      return null;
  }
}

export async function innerSetDbData(key: string, data: any) {
  if (isPgActive() && getActivePgPool()) {
    if (!KNOWN_TABLES.includes(key)) return;
    const client = await getActivePgPool().connect();
    try {
       await client.query('BEGIN');
       if (key === 'company_profile') {
           await client.query(`CREATE TABLE IF NOT EXISTS system_settings (setting_key VARCHAR PRIMARY KEY, setting_value TEXT)`);
           if (data && typeof data === 'object') {
               const keys = Object.keys(data);
               for (const k of keys) {
                   if (k === 'id') continue;
                   let v = data[k];
                   const valStr = (v !== null && typeof v === 'object') ? JSON.stringify(v) : String(v);
                   await client.query(`INSERT INTO system_settings (setting_key, setting_value) VALUES ($1, $2) ON CONFLICT(setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value`, [k, valStr]);
               }
           }
       } else {
           await client.query(`CREATE TABLE IF NOT EXISTS "${key}" (id VARCHAR PRIMARY KEY)`);
           await client.query(`TRUNCATE TABLE "${key}"`);
           if (key === 'backupConfig' || !Array.isArray(data)) {
                if (data && typeof data === 'object') {
                    data.id = 'singleton';
                    await syncTableSchema(client, key, data);
                    const keys = Object.keys(data);
                    const vals = Object.values(data).map(v => v === undefined ? null : (v !== null && typeof v === 'object') ? JSON.stringify(v) : v);
                    const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
                    const colNames = keys.map(k => `"${k}"`).join(', ');
                    await client.query(`INSERT INTO "${key}" (${colNames}) VALUES (${placeholders}) ON CONFLICT(id) DO UPDATE SET ${keys.map(k => `"${k}" = EXCLUDED."${k}"`).join(', ')}`, vals);
                }
             } else {
                for (const item of data) {
                   if (!item.id) item.id = Math.random().toString(36).substring(2, 15);
                   await syncTableSchema(client, key, item);
                   const keys = Object.keys(item);
                   const vals = Object.values(item).map(v => v === undefined ? null : (v !== null && typeof v === 'object') ? JSON.stringify(v) : v);
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
    const fs = await import("fs");
    const path = await import("path");
    const dbFile = path.join(process.cwd(), 'data.json');
    let dbData = {};
    if (fs.existsSync(dbFile)) {
        try { dbData = JSON.parse(fs.readFileSync(dbFile, 'utf8')); } catch(e) {}
    }
    dbData[key] = data;
    fs.writeFileSync(dbFile, JSON.stringify(dbData, null, 2));
  }
}

export async function handleRelations(key: string, data: any) {
    if ((key === "invoices" || key === "sales_invoices" || key === "purchase_invoices" || key === "warehouse_receipts" || key === "warehouse_remittances" || key === "proforma_invoices" || key === "sale_returns" || key === "purchase_returns" || key === "wastes") && data && data.items) {
       const childTable = key === "invoices" ? "invoice_items" : (key.endsWith('s') ? key.substring(0, key.length - 1) + "_items" : key + "_items");
       const items = data.items.map((it: any) => ({...it, invoiceId: data.id, id: it.id || Math.random().toString(36).substring(2,15)}));
       delete data.items;
       return { strippedData: data, childTable, items };
    }
    if (key === "accounting_documents" && data && data.items) {
       const items = data.items.map((it: any) => ({...it, documentId: data.id, id: it.id || Math.random().toString(36).substring(2,15)}));
       delete data.items;
       return { strippedData: data, childTable: "accounting_document_items", items };
    }
    if (key === "stocktakings" && data && data.items) {
       const items = data.items.map((it: any) => ({...it, stocktakingId: data.id, id: it.id || Math.random().toString(36).substring(2,15)}));
       delete data.items;
       return { strippedData: data, childTable: "stocktaking_items", items };
    }
    return { strippedData: data, childTable: null, items: [] };
}

export async function getDbData(key: string) {
  let data = await innerGetDbData(key);
  if (!data) return data;
  
  if ((key === 'invoices' || key === 'sales_invoices' || key === 'purchase_invoices' || key === 'warehouse_receipts' || key === 'warehouse_remittances' || key === 'proforma_invoices' || key === 'sale_returns' || key === 'purchase_returns' || key === 'wastes') && Array.isArray(data)) {
      const childTable = key === "invoices" ? "invoice_items" : (key.endsWith('s') ? key.substring(0, key.length - 1) + "_items" : key + "_items");
      const items = await innerGetDbData(childTable) || [];
      data.forEach((inv: any) => {
          inv.items = items.filter((it: any) => String(it.invoiceId) === String(inv.id));
      });
  } else if (key === 'accounting_documents' && Array.isArray(data)) {
      const items = await innerGetDbData('accounting_document_items') || [];
      data.forEach((doc: any) => {
          doc.items = items.filter((it: any) => String(it.documentId) === String(doc.id));
      });
  } else if (key === 'stocktakings' && Array.isArray(data)) {
      const items = await innerGetDbData('stocktaking_items') || [];
      data.forEach((st: any) => {
          st.items = items.filter((it: any) => String(it.stocktakingId) === String(st.id));
      });
  }
  return data;
}

export async function setDbData(key: string, data: any) {
  if ((key === 'invoices' || key === 'sales_invoices' || key === 'purchase_invoices' || key === 'warehouse_receipts' || key === 'warehouse_remittances' || key === 'proforma_invoices' || key === 'sale_returns' || key === 'purchase_returns' || key === 'wastes') && Array.isArray(data)) {
      const childTable = key === "invoices" ? "invoice_items" : (key.endsWith('s') ? key.substring(0, key.length - 1) + "_items" : key + "_items");
      let hasItemsKey = data.some((inv: any) => 'items' in inv);
      const items: any[] = [];
      const strippedData = data.map((inv: any) => {
          if (inv.items) {
              inv.items.forEach((it: any) => {
                  items.push({ ...it, invoiceId: inv.id, id: it.id || Math.random().toString(36).substring(2, 15) });
              });
          }
          const { items: _, ...rest } = inv;
          return rest;
      });
      if (hasItemsKey) await innerSetDbData(childTable, items);
      await innerSetDbData(key, strippedData);
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
         const isSoftDeletable = ["checkbooks", "issued_checks", "received_checks"].includes(key);
         let res;
         try {
             res = await client.query(`SELECT * FROM "${key}"${isSoftDeletable ? ' WHERE deleted_at IS NULL' : ''}`);
         } catch (err) {
             if (err.code === '42703') {
                 res = await client.query(`SELECT * FROM "${key}"`);
             } else {
                 throw err;
             }
         }
         if (key === 'company_profile') {
           let cval = null;
           try {
              await client.query(`CREATE TABLE IF NOT EXISTS system_settings (setting_key VARCHAR PRIMARY KEY, setting_value TEXT)`);
              const cres = await client.query(`SELECT * FROM system_settings`);
              if (cres.rows.length > 0) {
                 cval = { id: 'singleton' };
                 for (const r of cres.rows) {
                    try { cval[r.setting_key] = JSON.parse(r.setting_value); }
                    catch(e) { cval[r.setting_key] = r.setting_value; }
                 }
              }
           } catch(e) { }
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
    const path = await import("path");
    const dbFile = path.join(process.cwd(), 'data.json');
    if (fs.existsSync(dbFile)) {
        try { 
            const dbData = JSON.parse(fs.readFileSync(dbFile, 'utf8')); 
            return Object.entries(dbData).map(([k, v]) => ({ key: k, value: v }));
        } catch(e) { return []; }
    }
    return [];
  }
}
