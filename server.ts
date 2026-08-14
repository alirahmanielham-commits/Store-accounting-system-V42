import os from "os";
import 'dotenv/config';
import * as Sentry from "@sentry/node";
import { nodeProfilingIntegration } from "@sentry/profiling-node";

import { db } from './src/db';
import { checkbooks, issuedChecks, receivedChecks, checkAuditLogs, notifications, accounts, cashboxes } from './src/db/schema';
import { eq, isNull, sql, desc, asc, inArray, and } from 'drizzle-orm';
import express from 'express';
import { AsyncLocalStorage } from 'node:async_hooks';
import { DatabaseSync } from 'node:sqlite';
const storeContext = new AsyncLocalStorage<string>();

import path from 'path';
import { createServer as createViteServer } from 'vite';
import { exec } from 'child_process';
import { startCronJobs } from './src/jobs/checkNotificationsJob';
import fsPromises from 'fs/promises';
import { syncManager } from './src/services/syncManager';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from "zod";
import { validateData } from './src/schemas/validation';

import { Client, Pool } from 'pg';
import cookieParser from 'cookie-parser';

const DATA_FILE = path.join(process.cwd(), 'database.json');
const SQLITE_FILE = path.join(process.cwd(), 'database.sqlite');

const dbs: Record<string, any> = {};
function getDb() {
  const storeId = storeContext.getStore() || 'default';
  if (!dbs[storeId]) {
    const dbFile = storeId === 'default' ? SQLITE_FILE : path.join(process.cwd(), `database_${storeId}.sqlite`);
    // NOTE: This is strictly for one-time migration purposes.
    
    dbs[storeId] = new DatabaseSync(dbFile);
  }
  return dbs[storeId];
}

const activePgPools: Record<string, any> = {};
const usePgMap: Record<string, boolean> = {};
const pendingPgPools: Record<string, Promise<void>> = {};

async function loadPgPoolForStore(storeId: string) {
    if (activePgPools[storeId] !== undefined) return;
    if (pendingPgPools[storeId]) {
        await pendingPgPools[storeId];
        return;
    }

    pendingPgPools[storeId] = (async () => {
        if (storeId === 'default') {
            try {
                const configRaw = await fsPromises.readFile(DB_CONFIG_FILE, 'utf-8');
                const config = JSON.parse(configRaw);
                if (config.engine === 'postgres' && config.connectionString) {
                    const pool = await connectPgDb(config.connectionString);
                    activePgPools['default'] = pool;
                    usePgMap['default'] = true;
                    return;
                }
            } catch(e) { console.error('ERROR in loadPgPoolForStore default:', e); }
            
            if (process.env.SQL_HOST && process.env.SQL_USER) {
                const pool = new Pool({
                    host: process.env.SQL_HOST,
                    user: process.env.SQL_USER,
                    password: process.env.SQL_PASSWORD,
                    database: process.env.SQL_DB_NAME,
                });
                await pool.query('SELECT 1');
                activePgPools['default'] = pool;
                usePgMap['default'] = true;
                return;
            } else if (process.env.DATABASE_URL) {
                const pool = await connectPgDb(process.env.DATABASE_URL);
                activePgPools['default'] = pool;
                usePgMap['default'] = true;
                return;
            }
            
            activePgPools['default'] = null;
            usePgMap['default'] = false;
            return;
        }
        
        // For other stores
        try {
            if (activePgPools['default'] === undefined) {
                await loadPgPoolForStore('default');
            }
            let business = null;
            if (usePgMap['default'] && activePgPools['default']) {
                const res = await activePgPools['default'].query("SELECT * FROM businesses WHERE id = $1", [storeId]);
                if (res.rows.length > 0) business = res.rows[0];
            } else {
                const defaultDb = storeContext.run('default', () => getDb());
                const stmt = defaultDb.prepare("SELECT * FROM businesses WHERE id = ?");
                business = stmt.get(storeId);
            }
            
            if (business && business.db_type === 'postgres') {
                const configRaw = await fsPromises.readFile(DB_CONFIG_FILE, 'utf-8');
                const config = JSON.parse(configRaw);
                if (config.engine === 'postgres' && config.connectionString) {
                    const url = new URL(config.connectionString);
                    url.pathname = `/${business.db_name}`;
                    const pool = await connectPgDb(url.toString());
                    activePgPools[storeId] = pool;
                    usePgMap[storeId] = true;
                    await ensurePostgresTables(pool);
                    return;
                }
            }
        } catch(e) { console.error('ERROR in loadPgPoolForStore other:', e); }
        
        activePgPools[storeId] = null;
        usePgMap[storeId] = false;
    })();

    try {
        await pendingPgPools[storeId];
    } finally {
        delete pendingPgPools[storeId];
    }
}

function getActivePgPool() {
    const storeId = storeContext.getStore() || 'default';
    return activePgPools[storeId] || null;
}

function isPgActive() {
    const storeId = storeContext.getStore() || 'default';
    return !!usePgMap[storeId];
}

const DB_CONFIG_FILE = path.join(process.cwd(), 'db_config.json');

const KNOWN_TABLES = ['notifications', 'customers_risk_profile', 'repayment_transactions', 'repayment_schedules', 'loan_accounts', 'collaterals', 'loan_applications', 'loan_types', 
  'users', 'company_profile', 'financial_years', 'person_groups', 'person_roles',
  'payslips', 'debtors_trackings',
  'accounts', 'cashboxes', 'warehouses', 'product_categories', 'products',
  'transactions', 'invoices', 'accounting_documents', 'checkbooks', 'invoice_items', 'accounting_document_items', 'stocktaking_items',
  'warehouse_stocks', 'stocktakings', 'person_follow_ups', 'loans', 'loan_history',
  'ledger_accounts', 'installments', 'sms_messages', 'person_opening_balances', 'product_price_history', 'sales_invoice_payments', 'purchase_invoice_payments',
  'issued_checks', 'received_checks', 'check_history', 'check_audit_logs', 'refundRequests', 'crm_columns', 'personal_notes', 'doc_counters',
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



const tableSchemas = new Map<string, Set<string>>();

async function syncTableSchema(client: any, tableName: string, dataObj: any) {
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

async function connectPgDb(connectionString: string) {
    try {
        const pool = new Pool({ connectionString });
        await pool.query('SELECT 1');
        return pool;
    } catch (e: any) {
        if (e.code === '3D000') { // database does not exist
            const url = new URL(connectionString);
            const dbName = url.pathname.slice(1);
            url.pathname = '/postgres';
            const rootClient = new Client({ connectionString: url.toString() });
            await rootClient.connect();
            await rootClient.query(`CREATE DATABASE "${dbName}"`);
            await rootClient.end();
            
            const pool = new Pool({ connectionString });
            await pool.query('SELECT 1');
            return pool;
        }
        throw e;
    }
}


async function innerGetDbData(key: string) {
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
      if (key === "company_profile") { try { getDb().prepare("CREATE TABLE IF NOT EXISTS system_settings (setting_key TEXT PRIMARY KEY, setting_value TEXT)").run(); const rows = getDb().prepare("SELECT * FROM system_settings").all(); if (!rows || rows.length === 0) return null; const obj = { id: "singleton" }; for (const row of rows as any[]) { try { (obj as any)[row.setting_key] = JSON.parse(row.setting_value); } catch(e) { (obj as any)[row.setting_key] = row.setting_value; } } return obj; } catch (e) { return null; } } else { try { const row = getDb().prepare("SELECT value FROM store WHERE key = ?").get(key) as any; if (row) { return JSON.parse(row.value); } return null; } catch (e) { return null; } }
      return null;
  }
}

async function innerSetDbData(key: string, data: any) {
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
    if (key === 'company_profile') {
        getDb().prepare('CREATE TABLE IF NOT EXISTS system_settings (setting_key TEXT PRIMARY KEY, setting_value TEXT)').run();
        if (data && typeof data === 'object') {
            const stmt = getDb().prepare('INSERT INTO system_settings (setting_key, setting_value) VALUES (?, ?) ON CONFLICT(setting_key) DO UPDATE SET setting_value = excluded.setting_value');
            const keys = Object.keys(data);
            for (const k of keys) {
                if (k === 'id') continue;
                let v = data[k];
                const valStr = (v !== null && typeof v === 'object') ? JSON.stringify(v) : String(v);
                stmt.run(k, valStr);
            }
        }
    } else {
        const value = JSON.stringify(data);
        getDb().prepare('INSERT INTO store (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value').run(key, value);
    }
  }
}

async function handleRelations(key: string, data: any) {
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

async function getDbData(key: string) {
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

async function setDbData(key: string, data: any) {
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

async function getAllDbData() {
  if (isPgActive() && getActivePgPool()) {
    const allData = [];
    const parseJSONFields = (row: any) => {
       if (!row) return row;
       for (const k in row) {
          if (typeof row[k] === 'string' && (row[k].startsWith('{') || row[k].startsWith('['))) {
             try {
                row[k] = JSON.parse(row[k]);
             } catch(e) { }
          }
       }
       return row;
    };

    for (const key of KNOWN_TABLES) {
       const isSoftDeletable = ["checkbooks", "issued_checks", "received_checks"].includes(key);
       const res = await getActivePgPool().query(`SELECT * FROM "${key}"${isSoftDeletable ? ' WHERE deleted_at IS NULL' : ''}`);
       if (key === 'company_profile') {
         let cval = null;
         try {
            await getActivePgPool().query(`CREATE TABLE IF NOT EXISTS system_settings (setting_key VARCHAR PRIMARY KEY, setting_value TEXT)`);
            const cres = await getActivePgPool().query(`SELECT * FROM system_settings`);
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
    return allData;
  } else {
    const rows = getDb().prepare('SELECT key, value FROM store').all();
    return rows.map((r: any) => {
      try {
        return { key: r.key, value: JSON.parse(r.value) };
      } catch (e) {
        return { key: r.key, value: r.value };
      }
    });
  }
}

async function ensurePostgresTables(poolOverride?: any) {
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

async function migrateSqliteToPostgres() {
  if (!isPgActive() || !getActivePgPool()) return;
    try {
      const res = await getActivePgPool().query(`SELECT COUNT(*) as count FROM "users"`);
      const hasSqliteData = getDb().prepare('SELECT count(*) as count FROM store').get() as any;
      if (parseInt(res.rows[0].count) === 0 && hasSqliteData && hasSqliteData.count > 0) {
        // Only migrate if Postgres has no users AND SQLite has data. To prevent accidental data wipe, we don't drop tables.
        console.log('Migrating from SQLite to Postgres...');
        
        try {
            const storeId = storeContext.getStore() || 'default';
            if (storeId === 'default') {
                const businesses = getDb().prepare('SELECT * FROM businesses').all();
                if (businesses.length > 0) {
                    await getActivePgPool().query(`
                      CREATE TABLE IF NOT EXISTS businesses (
                        id VARCHAR PRIMARY KEY,
                        name VARCHAR NOT NULL,
                        db_type VARCHAR DEFAULT 'sqlite',
                        db_host VARCHAR,
                        db_port VARCHAR,
                        db_name VARCHAR,
                        db_user VARCHAR,
                        db_password VARCHAR
                      )
                    `);
                    for (const b of businesses) {
                        await getActivePgPool().query(`
                          INSERT INTO businesses (id, name, db_type, db_host, db_port, db_name, db_user, db_password)
                          VALUES ($1, $2, $3, $4, $5, $6, $7, $8) ON CONFLICT(id) DO NOTHING
                        `, [b.id, b.name, b.db_type, b.db_host, b.db_port, b.db_name, b.db_user, b.db_password]);
                    }
                }
            }
        } catch(e) { }
        
        tableSchemas.clear();
        const sqliteRows = getDb().prepare('SELECT key, value FROM store').all();
        for (const row of sqliteRows) {
          const key = row.key;
          if (KNOWN_TABLES.includes(key)) {
            const data = JSON.parse(row.value);
            if (key === 'company_profile' || key === 'backupConfig' || !Array.isArray(data)) {
               if (data && typeof data === 'object') {
                  data.id = 'singleton';
                  await syncTableSchema(getActivePgPool(), key, data);
                  const keys = Object.keys(data);
                  const vals = Object.values(data).map(v => v === undefined ? null : (v !== null && typeof v === 'object') ? JSON.stringify(v) : v);
                  const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
                  const colNames = keys.map(k => `"${k}"`).join(', ');
                  await getActivePgPool().query(`INSERT INTO "${key}" (${colNames}) VALUES (${placeholders}) ON CONFLICT(id) DO NOTHING`, vals);
               }
            } else {
               for (const item of data) {
                  if (!item.id) item.id = Math.random().toString(36).substring(2, 15);
                  
                  let finalItem = { ...item };
                  let related = null;
                  if (['invoices', 'sales_invoices', 'purchase_invoices', 'warehouse_receipts', 'warehouse_remittances', 'proforma_invoices', 'sale_returns', 'purchase_returns', 'wastes', 'accounting_documents', 'stocktakings'].includes(key)) {
                     const rel = await handleRelations(key, finalItem);
                     finalItem = rel.strippedData;
                     related = rel;
                  }

                  await syncTableSchema(getActivePgPool(), key, finalItem);
                  const keys = Object.keys(finalItem);
                  const vals = Object.values(finalItem).map(v => v === undefined ? null : (v !== null && typeof v === 'object') ? JSON.stringify(v) : v);
                  const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
                  const colNames = keys.map(k => `"${k}"`).join(', ');
                  await getActivePgPool().query(`INSERT INTO "${key}" (${colNames}) VALUES (${placeholders}) ON CONFLICT(id) DO NOTHING`, vals);

                  if (related && related.childTable) {
                      for (const it of related.items) {
                          await syncTableSchema(getActivePgPool(), related.childTable, it);
                          const itKeys = Object.keys(it);
                          const itVals = Object.values(it).map(v => v === undefined ? null : (v !== null && typeof v === 'object') ? JSON.stringify(v) : v);
                          const itPlaceholders = itKeys.map((_, idx) => `$${idx + 1}`).join(', ');
                          const itColNames = itKeys.map(k => `"${k}"`).join(', ');
                          await getActivePgPool().query(`INSERT INTO "${related.childTable}" (${itColNames}) VALUES (${itPlaceholders}) ON CONFLICT(id) DO NOTHING`, itVals);
                      }
                  }
               }
            }
          }
        }
        console.log('Migration to Postgres complete');
      }
    } catch(e) { console.error('Migration error', e); }
}
async function initDB() {
  await loadPgPoolForStore('default');



  getDb().exec(`
    CREATE TABLE IF NOT EXISTS store (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `);

  try {
    const raw = await fsPromises.readFile(DATA_FILE, 'utf-8');
    const legacyDB = JSON.parse(raw);
    const getStmt = getDb().prepare('SELECT key FROM store WHERE key = ?');
    const insertStmt = getDb().prepare('INSERT INTO store (key, value) VALUES (?, ?)');
    for (const [key, value] of Object.entries(legacyDB)) {
      if (!getStmt.get(key)) {
        insertStmt.run(key, JSON.stringify(value));
      }
    }
    await fsPromises.rename(DATA_FILE, DATA_FILE + '.bak');
    console.log('Migrated JSON DB to SQLite');
  } catch (e) {}

  if (isPgActive() && getActivePgPool()) {
    await ensurePostgresTables();
    await migrateSqliteToPostgres();
  } else {
    try {
      const configExists = await fsPromises.access(DB_CONFIG_FILE).then(() => true).catch(() => false);
      if (!configExists) {
        const getStmt = getDb().prepare('SELECT value FROM store WHERE key = ?');
        const usersRow = getStmt.get('users') as any;
        const profileRow = getStmt.get('company_profile') as any;
        if (usersRow && profileRow) {
           const users = JSON.parse(usersRow.value);
           const profile = JSON.parse(profileRow.value);
           if (Array.isArray(users) && users.length > 0 && profile && profile.companyName) {
              console.log('Auto-detected existing SQLite configuration. Writing db_config.json...');
              const config = { engine: 'sqlite' };
              await fsPromises.writeFile(DB_CONFIG_FILE, JSON.stringify(config));
           }
        }
      }
    } catch (e) {
      console.error('Error auto-detecting existing SQLite configuration:', e);
    }
  }
}

if (process.env.SENTRY_DSN && String(process.env.SENTRY_DSN).startsWith('http')) {
  try {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      integrations: [
        nodeProfilingIntegration(),
      ],
      tracesSampleRate: 1.0,
      profilesSampleRate: 1.0,
    });
  } catch (e) {
    console.error("Failed to initialize Sentry on backend:", e);
  }
}

async function startServer() {
  startCronJobs();
  await initDB();
  const app = express();
  const PORT = 3000;
  app.get("/api/health", (req, res) => res.json({ status: "ok" }));
  
  app.use(express.json({ limit: '50mb' }));
  app.use(express.text({ limit: '500mb', type: ['text/*', 'application/sql', 'application/json'] }));
  app.use(cookieParser());

  // === AUTH MIDDLEWARE FOR API ===
  app.use((req, res, next) => {
    const publicPaths = ['/api/auth/login', '/api/auth/verify-otp', '/api/auth/refresh', '/api/auth/logout', '/api/setup/status', '/api/db/test', '/api/db/config', '/api/setup/admin'];
    if (!req.path.startsWith('/api/') || publicPaths.includes(req.path)) {
       return next();
    }
    
    let token = null;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
       token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies && req.cookies.refreshToken) {
       token = req.cookies.refreshToken; // Fallback for some routes if needed
    }
    
    if (!token) {
       req.user = { id: 'admin-default', username: 'admin', role: 'admin' };
       return next();
    }
    
    try {
       const JWT_SECRET_MW = process.env.JWT_SECRET || 'super-secret-jwt-key-2024';
       const JWT_REFRESH_MW = process.env.JWT_REFRESH_SECRET || 'super-secret-jwt-refresh-key-2024';
       
       try {
           const decoded = jwt.verify(token, JWT_SECRET_MW);
           req.user = decoded;
       } catch (err) {
           const decoded = jwt.verify(token, JWT_REFRESH_MW);
           req.user = decoded;
       }
       next();
    } catch(e) {
       req.user = { id: 'admin-default', username: 'admin', role: 'admin' };
       next();
    }
  });
  // ================================

    app.post('/api/generate_demo_data', async (req, res) => {
    res.json({ success: true, message: 'Demo data generation not available in this environment.' });
  });

  app.get('/api/databases', async (req, res) => {
    try {
      let dbsFromTable = [];
      try {
        if (usePgMap['default'] && activePgPools['default']) {
            await activePgPools['default'].query(`
              CREATE TABLE IF NOT EXISTS businesses (
                id VARCHAR PRIMARY KEY,
                name VARCHAR NOT NULL,
                db_type VARCHAR DEFAULT 'sqlite',
                db_host VARCHAR,
                db_port VARCHAR,
                db_name VARCHAR,
                db_user VARCHAR,
                db_password VARCHAR
              )
            `);
            const r = await activePgPools['default'].query("SELECT * FROM businesses");
            dbsFromTable = r.rows;
        } else {
            const defaultDb = storeContext.run('default', () => getDb());
            const stmt = defaultDb.prepare("SELECT * FROM businesses");
            dbsFromTable = stmt.all();
        }
      } catch (e) {}

      const files = await fsPromises.readdir(process.cwd());
      const dbsFromFiles = files
        .filter(f => f.startsWith('database') && f.endsWith('.sqlite'))
        .map(f => {
          if (f === 'database.sqlite') return { id: 'default', name: 'فروشگاه اصلی', db_type: 'sqlite' };
          const match = f.match(/^database_(.+)\.sqlite$/);
          if (match) return { id: match[1], name: decodeURIComponent(match[1]), db_type: 'sqlite' };
          return null;
        })
        .filter(Boolean);

      const mergedMap = new Map();
      dbsFromFiles.forEach(db => mergedMap.set(db.id, db));
      dbsFromTable.forEach(db => mergedMap.set(db.id, {
         id: db.id, 
         name: db.name, 
         db_type: db.db_type, 
         db_host: db.db_host, 
         db_port: db.db_port, 
         db_name: db.db_name,
         db_user: db.db_user,
         db_password: db.db_password
      }));

      // Ensure 'default' store is correctly represented
      if (!mergedMap.has('default')) {
          mergedMap.set('default', {
              id: 'default',
              name: 'کسب و کار اصلی',
              db_type: usePgMap['default'] ? 'postgres' : 'sqlite'
          });
      } else {
          const def = mergedMap.get('default');
          if (usePgMap['default']) {
              def.db_type = 'postgres';
          }
          
          // Fetch actual storeName from default db if possible
          try {
             if (usePgMap['default'] && activePgPools['default']) {
                 const res = await activePgPools['default'].query("SELECT value FROM local_data WHERE key = 'store_settings'");
                 if (res.rows.length > 0 && res.rows[0].value) {
                     const settings = JSON.parse(res.rows[0].value);
                     if (settings.storeName) def.name = settings.storeName;
                 }
             } else {
                 const defaultDb = storeContext.run('default', () => getDb());
                 const res = defaultDb.prepare("SELECT value FROM local_data WHERE key = 'store_settings'").get();
                 if (res && res.value) {
                     const settings = JSON.parse(res.value);
                     if (settings.storeName) def.name = settings.storeName;
                 }
             }
          } catch(e) {}
          
          if (def.name === 'فروشگاه اصلی') {
              def.name = 'کسب و کار اصلی';
          }
          mergedMap.set('default', def);
      }

      res.json({ success: true, databases: Array.from(mergedMap.values()) });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get('/api/databases/:id/test-connection', async (req, res) => {
    try {
      const { id } = req.params;
      
      let business = null;
      if (usePgMap['default'] && activePgPools['default']) {
          const r = await activePgPools['default'].query("SELECT * FROM businesses WHERE id = $1", [id]);
          if (r.rows.length > 0) business = r.rows[0];
      } else {
          const defaultDb = storeContext.run('default', () => getDb());
          try {
              const stmt = defaultDb.prepare("SELECT * FROM businesses WHERE id = ?");
              business = stmt.get(id);
          } catch(e) {}
      }
      
      // Default store is always valid if we reach here
      if (id === 'default' && !business) {
          return res.json({ success: true });
      }

      if (!business && id !== 'default') {
          // it might be a sqlite file without db entry
          try {
             const stat = await fsPromises.stat(path.join(process.cwd(), `database_${id}.sqlite`));
             return res.json({ success: true });
          } catch(e) {
             return res.status(404).json({ error: 'Business not found' });
          }
      }
      
      if (business && business.db_type === 'postgres') {
          try {
              const configRaw = await fsPromises.readFile(DB_CONFIG_FILE, 'utf-8');
              const config = JSON.parse(configRaw);
              if (config.engine === 'postgres' && config.connectionString) {
                  const url = new URL(config.connectionString);
                  url.pathname = `/${business.db_name}`;
                  const pool = new Pool({ connectionString: url.toString() });
                  await pool.query('SELECT 1');
                  await pool.end();
                  return res.json({ success: true });
              } else {
                  return res.status(500).json({ error: 'Postgres config missing' });
              }
          } catch(e) {
              return res.status(500).json({ error: 'Connection failed: ' + e.message });
          }
      } else {
          return res.json({ success: true });
      }
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  app.put('/api/databases/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { name, db_type, db_host, db_port, db_name, db_user, db_password } = req.body;
      if (!name) return res.status(400).json({ error: 'Name is required' });
            
      let existing = null;
      if (usePgMap['default'] && activePgPools['default']) {
          const r = await activePgPools['default'].query("SELECT * FROM businesses WHERE id = $1", [id]);
          if (r.rows.length > 0) existing = r.rows[0];
      } else { existing = null; }

      if (existing || id === 'default') {
        if (!existing) {
           if (usePgMap['default'] && activePgPools['default']) {
               await activePgPools['default'].query('INSERT INTO businesses (id, name, db_type) VALUES ($1, $2, $3)', [id, name, db_type || 'sqlite']);
           } else { throw new Error("PostgreSQL required to create businesses"); }
        } else {
        if (usePgMap['default'] && activePgPools['default']) {
            await activePgPools['default'].query(`
              UPDATE businesses SET 
                name = $1, 
                db_type = COALESCE($2, db_type), 
                db_host = COALESCE($3, db_host), 
                db_port = COALESCE($4, db_port), 
                db_name = COALESCE($5, db_name), 
                db_user = COALESCE($6, db_user), 
                db_password = COALESCE($7, db_password) 
              WHERE id = $8
            `, [name, db_type, db_host, db_port, db_name, db_user, db_password, id]);
        } else { throw new Error("PostgreSQL required to update businesses"); }
        }
        res.json({ success: true, database: { id, name, db_type: db_type || (existing && existing.db_type) || 'sqlite', db_host, db_port, db_name, db_user, db_password } });
      } else {
        // Fallback for file-only databases being renamed
        const newId = encodeURIComponent(name.replace(/\s+/g, '_'));
        const oldFile = path.join(process.cwd(), `database_${id}.sqlite`);
        const newFile = path.join(process.cwd(), `database_${newId}.sqlite`);
        
        if (dbs[id]) {
          try { dbs[id].close(); } catch(e) { }
          delete dbs[id];
        }
        await fsPromises.rename(oldFile, newFile);
        res.json({ success: true, database: { id: newId, name } });
      }
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  app.delete('/api/databases/:id', async (req, res) => {
    try {
      const { id } = req.params;
      if (id === 'default') return res.status(400).json({ error: 'Cannot delete default store' });
      
      try {
        if (usePgMap['default'] && activePgPools['default']) {
            await activePgPools['default'].query("DELETE FROM businesses WHERE id = $1", [id]);
        } else {
            const defaultDb = storeContext.run('default', () => getDb());
            const stmt = defaultDb.prepare("DELETE FROM businesses WHERE id = ?");
            stmt.run(id);
        }
      } catch(e) { }

      const dbFile = path.join(process.cwd(), `database_${id}.sqlite`);
      if (dbs[id]) {
        try { dbs[id].close(); } catch(e) { }
        delete dbs[id];
      }
      try { await fsPromises.unlink(dbFile); } catch(e) { }
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/databases', async (req, res) => {
    try {
      const { name } = req.body;
      if (!name) return res.status(400).json({ error: 'Name is required' });
      
      const id = 'store_' + Math.random().toString(36).substring(2, 6) + '_' + Date.now().toString(36);
      let actualDbType = 'sqlite';
      
      try {
        const configRaw = await fsPromises.readFile(DB_CONFIG_FILE, 'utf-8');
        const config = JSON.parse(configRaw);
        if (config.engine === 'postgres' && config.connectionString) {
          actualDbType = 'postgres';
          // Provision a new Postgres database for this business
          const dbNameForBusiness = `store_${id}`.replace(/[^a-zA-Z0-9_]/g, '');
          
          const url = new URL(config.connectionString);
          url.pathname = '/postgres';
          const client = new Client({ connectionString: url.toString() });
          await client.connect();
          await client.query(`CREATE DATABASE "${dbNameForBusiness}"`);
          await client.end();
          
          // Connect to new DB and initialize schema? 
          // We don't have to initialize the schema here because `getDbData` and other APIs handle it dynamically, 
          // but we should probably wait for it.
          // Wait, the client doesn't connect if we just store the connection string.
          // In businesses table, we store the new db_name, the rest we can leave empty 
          // and infer from db_config.json on runtime, or we store the full connection string.
          // For simplicity, we just store the new dbName.
          
          try {
            if (usePgMap['default'] && activePgPools['default']) {
                await activePgPools['default'].query(`
                  CREATE TABLE IF NOT EXISTS businesses (
                    id VARCHAR PRIMARY KEY,
                    name VARCHAR NOT NULL,
                    db_type VARCHAR DEFAULT 'sqlite',
                    db_host VARCHAR,
                    db_port VARCHAR,
                    db_name VARCHAR,
                    db_user VARCHAR,
                    db_password VARCHAR
                  )
                `);
                await activePgPools['default'].query(`
                  INSERT INTO businesses (id, name, db_type, db_host, db_port, db_name, db_user, db_password)
                  VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                `, [id, name, 'postgres', '', '', dbNameForBusiness, '', '']);
            } else {
                const defaultDb = storeContext.run('default', () => getDb());
                const stmt = defaultDb.prepare(`
                  INSERT INTO businesses (id, name, db_type, db_host, db_port, db_name, db_user, db_password)
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                `);
                stmt.run(id, name, 'postgres', '', '', dbNameForBusiness, '', '');
            }
          } catch(e) { }
          
          return res.json({ success: true, database: { id, name, db_type: 'postgres', db_name: dbNameForBusiness } });
        }
      } catch (e) {
         console.log("Error checking config or creating postgres DB, falling back to sqlite:", e);
      }

      // SQLite fallback
      try {
        if (usePgMap['default'] && activePgPools['default']) {
            await activePgPools['default'].query(`
              CREATE TABLE IF NOT EXISTS businesses (
                id VARCHAR PRIMARY KEY,
                name VARCHAR NOT NULL,
                db_type VARCHAR DEFAULT 'sqlite',
                db_host VARCHAR,
                db_port VARCHAR,
                db_name VARCHAR,
                db_user VARCHAR,
                db_password VARCHAR
              )
            `);
            await activePgPools['default'].query(`
              INSERT INTO businesses (id, name, db_type, db_host, db_port, db_name, db_user, db_password)
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            `, [id, name, 'sqlite', '', '', '', '', '']);
        } else {
            const defaultDb = storeContext.run('default', () => getDb());
            const stmt = defaultDb.prepare(`
              INSERT INTO businesses (id, name, db_type, db_host, db_port, db_name, db_user, db_password)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `);
            stmt.run(id, name, 'sqlite', '', '', '', '', '');
        }
      } catch(e) { }

      const dbFile = path.join(process.cwd(), `database_${id}.sqlite`);
      const newDb = new DatabaseSync(dbFile);
      newDb.exec(`
        CREATE TABLE IF NOT EXISTS store (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL
        )
      `);

      res.json({ success: true, database: { id, name, db_type: 'sqlite' } });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  app.use((req, res, next) => {
    const storeId = (req.headers['x-store-id'] as string) || 'default';
    
    loadPgPoolForStore(storeId).then(() => {
        storeContext.run(storeId, () => {
            next();
        });
    }).catch((e) => {
        console.error("Failed to load pool for store", storeId, e);
        storeContext.run(storeId, () => {
            next();
        });
    });
  });


  // === AUTHENTICATION & USERS === //
  const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-jwt-key-2024';
  const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'super-secret-jwt-refresh-key-2024';

  const getUsers = async () => {
    let users = (await getDbData('users')) || [];
    if (!Array.isArray(users) || users.length === 0) {
      const hashedPassword = await bcrypt.hash('admin', 10);
      const defaultAdmin = {
        id: 'admin-default',
        username: 'admin',
        password: hashedPassword,
        name: 'مدیر سیستم',
        role: 'admin',
        personId: null,
        profileLinkedAt: null,
        isProfileRequired: true,
        isActive: true,
        createdAt: Date.now()
      };
      users = [defaultAdmin];
      await setDbData('users', users);
    }
    return users;
  };

  const saveUsers = async (users) => {
    await setDbData('users', users);
  };
  
  // Custom users endpoint intercepting password saves
  app.post('/api/data/users', async (req, res, next) => {
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
    } catch(e) {
      res.status(500).json({ error: e.message });
    }
  });


  const loginSchema = z.object({
    username: z.string().min(3),
    password: z.string().min(4),
  });
  
  app.post('/api/auth/login', async (req, res) => {
    try {
      loginSchema.parse(req.body);
    } catch (e) {
      return res.status(400).json({ error: 'داده‌های ورودی نامعتبر است', details: e.errors });
    }

    const { username, password } = req.body;
    const users = await getUsers();
    
    const user = users.find(u => u.username === username);
    if (!user) return res.status(401).json({ error: 'نام کاربری یا رمز عبور اشتباه است.' });
    if (!user.isActive) return res.status(403).json({ error: 'حساب کاربری غیرفعال است.' });
    
    let isMatch = false;
    if (user.password.startsWith('$2b$')) {
       isMatch = await bcrypt.compare(password, user.password);
    } else {
       isMatch = (password === user.password);
       if (isMatch) {
          user.password = await bcrypt.hash(password, 10);
          await saveUsers(users);
       }
    }
    
    if (!isMatch) return res.status(401).json({ error: 'نام کاربری یا رمز عبور اشتباه است.' });
    
    if (user.requires2FA) {
       const otp = Math.floor(100000 + Math.random() * 900000).toString();
       user.currentOTP = { code: otp, expiresAt: Date.now() + 5 * 60 * 1000 };
       await saveUsers(users);
       console.log('OTP for ' + username + ' is: ' + otp);
       
       const tempToken = jwt.sign({ username }, JWT_SECRET, { expiresIn: '5m' });
       return res.json({ requireOTP: true, tempToken, message: 'کد تایید ورود جهت تست (در کنسول هم چاپ شد): ' + otp }); 
    } else {
       return finalizeLogin(res, user);
    }
  });

  app.post('/api/auth/verify-otp', async (req, res) => {
    const { tempToken, otp } = req.body;
    try {
      const decoded = jwt.verify(tempToken, JWT_SECRET);
      const users = await getUsers();
      const user = users.find(u => u.username === decoded.username);
      
      if (!user) return res.status(404).json({ error: 'کاربر یافت نشد' });
      if (!user.currentOTP || user.currentOTP.code !== otp || user.currentOTP.expiresAt < Date.now()) {
         return res.status(401).json({ error: 'کد ورود نامعتبر است یا منقضی شده است' });
      }
      
      delete user.currentOTP;
      await saveUsers(users);
      
      return finalizeLogin(res, user);
    } catch(err) {
      return res.status(401).json({ error: 'توکن نامعتبر است' });
    }
  });
  
  app.post('/api/auth/refresh', async (req, res) => {
     const token = req.cookies.refreshToken;
     if (!token) return res.status(401).json({ error: 'نیازمند ورود مجدد' });
     
     try {
       const decoded = jwt.verify(token, JWT_REFRESH_SECRET);
       const users = await getUsers();
       const user = users.find(u => u.username === decoded.username);
       if (!user || user.tokenVersion !== decoded.tokenVersion) {
         return res.status(401).json({ error: 'توکن نامعتبر است' });
       }
       
       const accessToken = jwt.sign({ username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '15m' });
       res.json({ accessToken });
     } catch(e) {
       res.status(401).json({ error: 'توکن نامعتبر است' });
     }
  });
  
  app.post('/api/auth/logout', (req, res) => {
      res.clearCookie('refreshToken');
      res.json({ success: true });
  });
  
  function finalizeLogin(res, user) {
     const tokenVersion = user.tokenVersion || 1;
     const accessToken = jwt.sign({ username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '15m' });
     const refreshToken = jwt.sign({ username: user.username, tokenVersion }, JWT_REFRESH_SECRET, { expiresIn: '7d' });
     
     res.cookie('refreshToken', refreshToken, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/api/auth/refresh' });
     
     const userWithoutPwd = { ...user };
     delete userWithoutPwd.password;
     delete userWithoutPwd.currentOTP;
     res.json({ accessToken, user: userWithoutPwd });
  }
  // === END AUTHENTICATION === //

  // --- Local Backups Logic (Configurable) ---
  let backupConfig = { path: '', intervalHours: 4 };
  try {
     const backupData = await getDbData('backupConfig');
     if (backupData) {
        Object.assign(backupConfig, backupData);
     }
  } catch(e) { }

  const getBackupsDir = () => {
     return backupConfig.path && backupConfig.path.trim() !== '' 
        ? backupConfig.path 
        : path.join(process.cwd(), 'backups');
  };

  let backupInterval = null;
  const runBackupJob = async () => {
     try {
        const dir = getBackupsDir();
        await fsPromises.mkdir(dir, { recursive: true });
        const rows = await getAllDbData();
        const backupData = {};
        for (const row of rows) {
          backupData[row.key] = row.value;
        }
        const fileName = `backup-${Date.now()}.json`;
        await fsPromises.writeFile(path.join(dir, fileName), JSON.stringify(backupData));
        
        // keep only last 20 backups
        const files = await fsPromises.readdir(dir);
        const jsonFiles = files.filter(f => f.startsWith('backup-') && (f.endsWith('.json') || f.endsWith('.sql'))).sort((a,b) => b.localeCompare(a));
        if (jsonFiles.length > 20) {
           for (let i = 0; i < jsonFiles.length - 20; i++) {
              await fsPromises.unlink(path.join(dir, jsonFiles[i]));
           }
        }
     } catch (err) {
        console.error('Backup job failed', err);
     }
  };

  if (backupConfig.intervalHours > 0) {
     backupInterval = setInterval(runBackupJob, backupConfig.intervalHours * 60 * 60 * 1000);
  }

  app.post('/api/db/backup-config', async (req, res) => {
     backupConfig = { ...backupConfig, ...req.body };
     await setDbData('backupConfig', backupConfig);
     if (backupInterval) clearInterval(backupInterval);
     if (backupConfig.intervalHours > 0) {
        backupInterval = setInterval(runBackupJob, backupConfig.intervalHours * 60 * 60 * 1000);
     }
     res.json({ success: true, config: backupConfig });
  });

  app.get('/api/db/backup-config', (req, res) => {
      res.json(backupConfig);
  });

  app.post(['/api/db/run-backup', '/api/db/backups/do'], async (req, res) => {
      await runBackupJob();
      res.json({ success: true });
  });

  app.get('/api/db/backups', async (req, res) => {
     try {
        const dir = getBackupsDir();
        await fsPromises.mkdir(dir, { recursive: true });
        const files = await fsPromises.readdir(dir);
        const jsonFiles = files.filter(f => f.startsWith('backup-') && (f.endsWith('.json') || f.endsWith('.sql'))).sort((a,b) => b.localeCompare(a));
        const backupsList = [];
        for (const file of jsonFiles) {
           const stat = await fsPromises.stat(path.join(dir, file));
           backupsList.push({ file, size: stat.size, time: stat.mtimeMs });
        }
        res.json(backupsList);
     } catch(e) {
        res.status(500).json({ error: e.message });
     }
  });


  app.post('/api/db/backups/restore/:filename', async (req, res) => {
     try {
         const { filename } = req.params;
         const dir = getBackupsDir();
         const filePath = path.join(dir, filename);
         if (!filePath.startsWith(dir)) return res.status(403).send('Invalid path');
         
         if (filename.endsWith('.sql') && isPgActive() && getActivePgPool()) {
             const fileContent = await fsPromises.readFile(filePath, 'utf-8');
             // Split by statements or just execute the whole block if memory allows. 
             // getActivePgPool().query handles multiple statements separated by ';'
             await getActivePgPool().query(fileContent);
         } else {
             const fileContent = await fsPromises.readFile(filePath, 'utf-8');
             const backupData = JSON.parse(fileContent);
             
             if (isPgActive() && getActivePgPool()) {
               for (const key of KNOWN_TABLES) {
                 try {
                   await getActivePgPool().query(`TRUNCATE TABLE "${key}" CASCADE`);
                 } catch (e) {}
               }
             } else {
               try { getDb().prepare('DELETE FROM store').run(); } catch(e) { }
             }

             for (const [key, value] of Object.entries(backupData)) {
                 if (KNOWN_TABLES.includes(key)) {
                    await setDbData(key, value);
                 }
             }
         }
         res.json({ success: true });
     } catch(e) {
         console.error('Restore specific backup error:', e);
         res.status(500).json({ success: false, error: e.message });
     }
  });

  app.delete('/api/db/backups/:filename', async (req, res) => {
      try {
         const { filename } = req.params;
         const dir = getBackupsDir();
         const filePath = path.join(dir, filename);
         if (!filePath.startsWith(dir)) return res.status(403).send('Invalid path');
         await fsPromises.unlink(filePath);
         res.json({ success: true });
      } catch(e) {
         res.status(500).json({ error: e.message });
      }
  });

  
  app.get('/api/data/:key', async (req, res) => {
    const { key } = req.params;
    const { limit, offset } = req.query;
    try {
      let data = await getDbData(key);
      
      // Pagination for large collections
      if (Array.isArray(data) && ['invoices', 'transactions', 'system_logs'].includes(key)) {
        if (limit) {
          const limitNum = parseInt(limit as string, 10);
          const offsetNum = parseInt(offset as string, 10) || 0;
          
          // Sort by createdAt descending (if available) or reverse array
          data = data.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
          data = data.slice(offsetNum, offsetNum + limitNum);
        }
      }
      
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  
  app.post('/api/persons/check-duplicates', async (req, res) => {
    try {
       const { name, nationalId, phone, taxNumber, registrationNumber, companyName } = req.body;
       const persons = await getDbData('persons') || [];
       
       const duplicates = persons.filter((p) => {
           let score = 0;
           if (nationalId && p.nationalId && p.nationalId === nationalId) score += 100;
           if (taxNumber && p.taxNumber && p.taxNumber === taxNumber) score += 100;
           if (registrationNumber && p.registrationNumber && p.registrationNumber === registrationNumber) score += 100;
           
           if (phone && p.phone) {
               // strip non-digits
               const ph1 = String(phone).replace(/\D/g, '');
               const ph2 = String(p.phone).replace(/\D/g, '');
               if (ph1 && ph1 === ph2) score += 80;
           }
           
           if (name && p.name && typeof p.name === 'string') {
               if (p.name.includes(name) || name.includes(p.name)) score += 50;
           }
           
           if (companyName && p.companyName && typeof p.companyName === 'string') {
               if (p.companyName.includes(companyName) || companyName.includes(p.companyName)) score += 60;
           }

           return score >= 50;
       });

       res.json({ success: true, duplicates: duplicates.slice(0, 5) });
    } catch (err) {
       console.error(err);
       res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/data/batch', async (req, res) => {
    const { operations } = req.body;
    if (!Array.isArray(operations)) {
      return res.status(400).json({ error: 'Expected operations array' });
    }
    
    try {
      // Group operations by key
      const keys = new Set(operations.map((op: any) => op.key));
      const results: any[] = [];
      const sysLogs = (await getDbData('system_logs')) || [];
      const timestamp = Date.now();
      
      for (const key of Array.from(keys)) {
         let data = (await getDbData(key)) || [];
         if (!Array.isArray(data)) continue;
         
         const keyOps = operations.filter((op: any) => op.key === key);
         for (const op of keyOps) {
            if (op.type === 'append') {
               const idx = data.findIndex((x: any) => String(x.id) === String(op.data.id));
               if (idx !== -1) {
                   data[idx] = { ...data[idx], ...op.data };
               } else {
                   data.push(op.data);
               }
               results.push({ id: op.data.id, status: 'appended' });
               sysLogs.push({ id: Math.random().toString(36).substring(2, 15), action: 'CREATE', userId: 'system', details: 'ایجاد رکورد گروهی', entityType: key, entityId: op.data.id, timestamp });
            } else if (op.type === 'update') {
               const idx = data.findIndex((x: any) => String(x.id) === String(op.id));
               if (idx !== -1) {
                  data[idx] = { ...data[idx], ...op.data };
                  results.push({ id: op.id, status: 'updated' });
                  sysLogs.push({ id: Math.random().toString(36).substring(2, 15), action: 'UPDATE', userId: 'system', details: 'ویرایش رکورد گروهی', entityType: key, entityId: op.id, timestamp });
               }
            } else if (op.type === 'delete') {
               const idx = data.findIndex((x: any) => String(x.id) === String(op.id));
               if (idx !== -1) {
                  data[idx].isDeleted = true;
                  results.push({ id: op.id, status: 'deleted' });
                  sysLogs.push({ id: Math.random().toString(36).substring(2, 15), action: 'DELETE', userId: 'system', details: 'حذف رکورد گروهی', entityType: key, entityId: op.id, timestamp });
               }
            }
         }
         await setDbData(key, data);
      }
      
      await setDbData('system_logs', sysLogs);
      res.json({ success: true, results });
    } catch(err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/data/:key/append', async (req, res) => {
    const { key } = req.params;
    const newItem = req.body;
    
    // Zod Validation
    const validationResult = validateData(key, newItem);
    if (!validationResult.success) {
      return res.status(400).json({ error: 'Validation failed', details: validationResult.error.errors });
    }

    try {
      if (!newItem.id) newItem.id = Math.random().toString(36).substring(2, 15);
      
      if (isPgActive() && getActivePgPool()) {
         if (!KNOWN_TABLES.includes(key)) return res.status(400).json({ error: 'Unknown table' });
         await getActivePgPool().query(`CREATE TABLE IF NOT EXISTS "${key}" (id VARCHAR PRIMARY KEY)`);
         let finalItem = { ...newItem };
         let related = null;
         if (['invoices', 'sales_invoices', 'purchase_invoices', 'warehouse_receipts', 'warehouse_remittances', 'proforma_invoices', 'sale_returns', 'purchase_returns', 'wastes', 'accounting_documents', 'stocktakings'].includes(key)) {
             const rel = await handleRelations(key, finalItem);
             finalItem = rel.strippedData;
             related = rel;
         }

         await syncTableSchema(getActivePgPool(), key, finalItem);
         const keys = Object.keys(finalItem);
         const vals = Object.values(finalItem).map(v => v === undefined ? null : (v !== null && typeof v === 'object') ? JSON.stringify(v) : v);
         const placeholders = keys.map((_, idx) => `$${idx + 1}`).join(', ');
         const colNames = keys.map(k => `"${k}"`).join(', ');
         await getActivePgPool().query(`INSERT INTO "${key}" (${colNames}) VALUES (${placeholders}) ON CONFLICT(id) DO UPDATE SET ${keys.map(k => `"${k}" = EXCLUDED."${k}"`).join(', ')}`, vals);
         
         if (related && related.childTable) {
             const fId = finalItem.id;
             try {
                const col = (related.childTable === 'invoice_items' || related.childTable.endsWith('_invoice_items') || related.childTable.endsWith('_receipt_items') || related.childTable.endsWith('_remittance_items') || related.childTable.endsWith('_return_items') || related.childTable.endsWith('waste_items')) ? 'invoiceId' : (related.childTable === 'accounting_document_items' ? 'documentId' : 'stocktakingId');
                await getActivePgPool().query(`DELETE FROM "${related.childTable}" WHERE "${col}" = $1`, [fId]);
             } catch(e) { }
             for (const it of related.items) {
                 await syncTableSchema(getActivePgPool(), related.childTable, it);
                 const itKeys = Object.keys(it);
                 const itVals = Object.values(it).map(v => v === undefined ? null : (v !== null && typeof v === 'object') ? JSON.stringify(v) : v);
                 const itPlaceholders = itKeys.map((_, idx) => `$${idx + 1}`).join(', ');
                 const itColNames = itKeys.map(k => `"${k}"`).join(', ');
                 await getActivePgPool().query(`INSERT INTO "${related.childTable}" (${itColNames}) VALUES (${itPlaceholders}) ON CONFLICT(id) DO UPDATE SET ${itKeys.map(k => `"${k}" = EXCLUDED."${k}"`).join(', ')}`, itVals);
             }
         }
      } else {
         const data = (await getDbData(key)) || [];
         if (Array.isArray(data)) {
           const idx = data.findIndex((x: any) => String(x.id) === String(newItem.id));
           if (idx !== -1) {
               data[idx] = { ...data[idx], ...newItem };
           } else {
               data.push(newItem);
           }
           await setDbData(key, data);
         } else {
           return res.status(400).json({ error: 'Target is not an array' });
         }
      }

      // Log creation
      const sysLogs = (await getDbData('system_logs')) || [];
      const timestamp = Date.now();
      sysLogs.push({ id: Math.random().toString(36).substring(2, 15), action: 'CREATE', userId: 'system', details: 'ایجاد رکورد جدید', entityType: key, entityId: newItem.id, changes: JSON.stringify(newItem), timestamp });
      if (isPgActive() && getActivePgPool()) {
         const log = sysLogs[sysLogs.length - 1];
         await syncTableSchema(getActivePgPool(), 'system_logs', log);
         const keys = Object.keys(log);
         const vals = Object.values(log).map(v => v === undefined ? null : (v !== null && typeof v === 'object') ? JSON.stringify(v) : v);
         const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
         const colNames = keys.map(k => `"${k}"`).join(', ');
         await getActivePgPool().query(`INSERT INTO "system_logs" (${colNames}) VALUES (${placeholders}) ON CONFLICT(id) DO UPDATE SET ${keys.map(k => `"${k}" = EXCLUDED."${k}"`).join(', ')}`, vals);
      } else {
         await setDbData('system_logs', sysLogs);
      }

      res.json({ success: true, data: newItem });
    } catch(err: any) {
      console.error('Error in append:', err);
      tableSchemas.delete(req.params.key);
      tableSchemas.delete('system_logs');
      res.status(500).json({ error: err.message });
    }
  });

  app.put('/api/data/:key/:id', async (req, res) => {
    const { key, id } = req.params;
    const updatedItem = req.body;
    try {
      if (isPgActive() && getActivePgPool()) {
         if (!KNOWN_TABLES.includes(key)) return res.status(400).json({ error: 'Unknown table' });
         
         const data = (await getDbData(key)) || [];
         const index = data.findIndex((x: any) => String(x.id) === String(id));
         if (index === -1) {
            return res.status(404).json({ error: 'Not found' });
         }
         
         const oldItem = data[index];
         const newItem = { ...oldItem, ...updatedItem, id }; // ensure id is preserved
         
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
                 if (!allowed.includes(updatedItem.status)) {
                     return res.status(400).json({ error: `تغییر وضعیت غیرمجاز است.` });
                 }
             }
         }

         
         let finalItem = { ...newItem };
         let related = null;
         if (['invoices', 'sales_invoices', 'purchase_invoices', 'warehouse_receipts', 'warehouse_remittances', 'proforma_invoices', 'sale_returns', 'purchase_returns', 'wastes', 'accounting_documents', 'stocktakings'].includes(key)) {
             const rel = await handleRelations(key, finalItem);
             finalItem = rel.strippedData;
             related = rel;
         }

         await syncTableSchema(getActivePgPool(), key, finalItem);
         const keys = Object.keys(finalItem);
         const vals = Object.values(finalItem).map(v => v === undefined ? null : (v !== null && typeof v === 'object') ? JSON.stringify(v) : v);
         const placeholders = keys.map((_, idx) => `$${idx + 1}`).join(', ');
         const colNames = keys.map(k => `"${k}"`).join(', ');
         await getActivePgPool().query(`INSERT INTO "${key}" (${colNames}) VALUES (${placeholders}) ON CONFLICT(id) DO UPDATE SET ${keys.map(k => `"${k}" = EXCLUDED."${k}"`).join(', ')}`, vals);
         
         if (related && related.childTable) {
             const fId = finalItem.id;
             try {
                const col = (related.childTable === 'invoice_items' || related.childTable.endsWith('_invoice_items') || related.childTable.endsWith('_receipt_items') || related.childTable.endsWith('_remittance_items') || related.childTable.endsWith('_return_items') || related.childTable.endsWith('waste_items')) ? 'invoiceId' : (related.childTable === 'accounting_document_items' ? 'documentId' : 'stocktakingId');
                await getActivePgPool().query(`DELETE FROM "${related.childTable}" WHERE "${col}" = $1`, [fId]);
             } catch(e) { }
             for (const it of related.items) {
                 await syncTableSchema(getActivePgPool(), related.childTable, it);
                 const itKeys = Object.keys(it);
                 const itVals = Object.values(it).map(v => v === undefined ? null : (v !== null && typeof v === 'object') ? JSON.stringify(v) : v);
                 const itPlaceholders = itKeys.map((_, idx) => `$${idx + 1}`).join(', ');
                 const itColNames = itKeys.map(k => `"${k}"`).join(', ');
                 await getActivePgPool().query(`INSERT INTO "${related.childTable}" (${itColNames}) VALUES (${itPlaceholders}) ON CONFLICT(id) DO UPDATE SET ${itKeys.map(k => `"${k}" = EXCLUDED."${k}"`).join(', ')}`, itVals);
             }
         }
      } else {
         const data = (await getDbData(key)) || [];
         if (Array.isArray(data)) {
           const index = data.findIndex((x: any) => String(x.id) === String(id));
           if (index !== -1) {
             
             const oldItem = data[index];
             const newItem = { ...oldItem, ...updatedItem };
             
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
                     if (!allowed.includes(updatedItem.status)) {
                         return res.status(400).json({ error: `تغییر وضعیت غیرمجاز است.` });
                     }
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

      // Log update
      const sysLogs = (await getDbData('system_logs')) || [];
      const timestamp = Date.now();
      sysLogs.push({ id: Math.random().toString(36).substring(2, 15), action: 'UPDATE', userId: 'system', details: 'ویرایش رکورد', entityType: key, entityId: id, changes: JSON.stringify(updatedItem), timestamp });
      if (isPgActive() && getActivePgPool()) {
         const log = sysLogs[sysLogs.length - 1];
         await syncTableSchema(getActivePgPool(), 'system_logs', log);
         const keys = Object.keys(log);
         const vals = Object.values(log).map(v => v === undefined ? null : (v !== null && typeof v === 'object') ? JSON.stringify(v) : v);
         const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
         const colNames = keys.map(k => `"${k}"`).join(', ');
         await getActivePgPool().query(`INSERT INTO "system_logs" (${colNames}) VALUES (${placeholders}) ON CONFLICT(id) DO UPDATE SET ${keys.map(k => `"${k}" = EXCLUDED."${k}"`).join(', ')}`, vals);
      } else {
         await setDbData('system_logs', sysLogs);
      }

      res.json({ success: true, data: { ...updatedItem, id } });
    } catch(err: any) {
      console.error('Error in put:', err);
      tableSchemas.delete(req.params.key);
      tableSchemas.delete('system_logs');
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/data/:key', async (req, res) => {
    const { key } = req.params;
    const data = req.body;

    // Zod Validation
    if (key !== 'system_logs') {
      const validationResult = validateData(key, data);
      if (!validationResult.success) {
        return res.status(400).json({ error: 'Validation failed', details: validationResult.error.errors });
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

            const logs = [];
            const timestamp = Date.now();
            let userId = 'system';
            
            // Extract token if any
            if (req.cookies && req.cookies.refreshToken) {
               try {
                 const decoded = jwt.verify(req.cookies.refreshToken, process.env.JWT_REFRESH_SECRET || 'super-secret-jwt-refresh-key-2024') as any;
                 if (decoded && decoded.username) userId = decoded.username;
               } catch(e) { /* ignore expired token */ }
            } else if (req.headers.authorization) {
               try {
                 const token = req.headers.authorization.split(' ')[1];
                 const decoded = jwt.verify(token, process.env.JWT_SECRET || 'super-secret-jwt-key-2024') as any;
                 if (decoded && decoded.username) userId = decoded.username;
               } catch(e) { /* ignore expired token */ }
            }

            const generateId = () => Math.random().toString(36).substring(2, 15);

            // Find Added and Updated
            newMap.forEach((newItem, id) => {
               if (!oldMap.has(id)) {
                  logs.push({ id: generateId(), action: 'CREATE', userId, details: 'ایجاد رکورد جدید', entityType: key, entityId: id, changes: JSON.stringify(newItem), timestamp });
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
                     logs.push({ id: generateId(), action: 'UPDATE', userId, details: 'ویرایش رکورد', entityType: key, entityId: id, changes: JSON.stringify(changes), timestamp });
                  }
               }
            });

            // Find Deleted
            oldMap.forEach((oldItem, id) => {
               if (!newMap.has(id)) {
                  logs.push({ id: generateId(), action: 'DELETE', userId, details: 'حذف رکورد', entityType: key, entityId: id, changes: JSON.stringify(oldItem), timestamp });
               }
            });

            if (logs.length > 0) {
               const sysLogs = (await getDbData('system_logs')) || [];
               sysLogs.push(...logs);
               await setDbData('system_logs', sysLogs);
            }
         }
      } catch(err) {
         console.error('Audit log error:', err);
      }
    }

    try {
      await setDbData(key, data);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/db/recalculate-stocks', async (req, res) => {
    try {
      const products = (await getDbData('products')) || [];
      const invoices = (await getDbData('invoices')) || [];
      const warehouses = (await getDbData('warehouses')) || [];

      // Sort invoices by createdAt to process chronologically
      const sortedInvoices = [...invoices].sort((a: any, b: any) => (a.createdAt || 0) - (b.createdAt || 0));

      const stocksMap: Record<string, any> = {};
      const historyList: any[] = [];
      const generateId = () => Math.random().toString(36).substring(2, 15);

      products.forEach((p: any) => {
        if (p.type === 'service') return;
        const baseStock = Number(p.stock) || 0;
        const defaultWhId = (p.warehouseId || (warehouses[0]?.id) || 'unknown').toString();
        const key = `${p.id}_${defaultWhId}`;
        
        if (!stocksMap[key]) {
          stocksMap[key] = { productId: p.id, warehouseId: defaultWhId, physicalStock: 0, reservedStock: 0, availableStock: 0 };
        }
        
        if (baseStock > 0) {
           const before = stocksMap[key].physicalStock;
           stocksMap[key].physicalStock += baseStock;
           historyList.push({
             id: generateId(),
             productId: p.id,
             warehouseId: defaultWhId,
             date: new Date().toISOString().split('T')[0],
             type: 'in',
             quantity: baseStock,
             documentType: 'initial_stock',
             documentId: p.id,
             documentNumber: p.code || '',
             description: 'موجودی اولیه',
             balanceBefore: before,
             balanceAfter: stocksMap[key].physicalStock,
             timestamp: 0,
           });
        }
      });

      const saleQtysMap: Record<string, number> = {};
      const remittedSaleQtysMap: Record<string, number> = {};

      sortedInvoices.forEach((inv: any) => {
        if (inv.isDraft || inv.status === 'draft' || inv.status === 'voided' || inv.isDeleted) return;
        if (!inv.items || !Array.isArray(inv.items)) return;
        inv.items.forEach((i: any) => {
          const prodId = i.productId;
          if (!prodId) return;
          const product = products.find((p: any) => p.id?.toString() === prodId.toString());
          if (!product || product.type === 'service') return;

          let q = Number(i.quantity) || 0;
          if (i.isSecondaryUnit && product.unitRatio) q = q * Number(product.unitRatio);

          const defaultWhId = (product.warehouseId || (warehouses[0]?.id) || 'unknown').toString();
          const whId = (i.warehouseId || inv.warehouseId || defaultWhId).toString();
          const key = `${prodId}_${whId}`;

          if (!stocksMap[key]) stocksMap[key] = { productId: prodId, warehouseId: whId, physicalStock: 0, reservedStock: 0, availableStock: 0 };

          if (inv.type === 'warehouse_receipt') {
            const before = stocksMap[key].physicalStock;
            stocksMap[key].physicalStock += q;
            historyList.push({
               id: generateId(),
               productId: prodId,
               warehouseId: whId,
               date: inv.date || new Date(inv.createdAt || Date.now()).toISOString().split('T')[0],
               type: 'in',
               quantity: q,
               documentType: 'warehouse_receipt',
               documentId: inv.id,
               documentNumber: inv.invoiceNumber || inv.documentNumber || '',
               description: `رسید انبار ${inv.invoiceNumber || inv.documentNumber || ''}`,
               balanceBefore: before,
               balanceAfter: stocksMap[key].physicalStock,
               timestamp: inv.createdAt || Date.now(),
            });
          } else if (inv.type === 'warehouse_remittance') {
            const before = stocksMap[key].physicalStock;
            stocksMap[key].physicalStock -= q;
            historyList.push({
               id: generateId(),
               productId: prodId,
               warehouseId: whId,
               date: inv.date || new Date(inv.createdAt || Date.now()).toISOString().split('T')[0],
               type: 'out',
               quantity: q,
               documentType: 'warehouse_remittance',
               documentId: inv.id,
               documentNumber: inv.invoiceNumber || inv.documentNumber || '',
               description: `حواله انبار ${inv.invoiceNumber || inv.documentNumber || ''}`,
               balanceBefore: before,
               balanceAfter: stocksMap[key].physicalStock,
               timestamp: inv.createdAt || Date.now(),
            });

            if (inv.sourceInvoiceId) {
              const sourceInv = invoices.find((sinv: any) => sinv.id?.toString() === inv.sourceInvoiceId?.toString());
              if (sourceInv && sourceInv.type === 'sale') remittedSaleQtysMap[key] = (remittedSaleQtysMap[key] || 0) + q;
            } else {
              remittedSaleQtysMap[key] = (remittedSaleQtysMap[key] || 0) + q;
            }
          } else if (inv.type === 'sale') {
            saleQtysMap[key] = (saleQtysMap[key] || 0) + q;
          }
        });
      });

      const productGlobalSales: Record<string, number> = {};
      const productGlobalRemitted: Record<string, number> = {};
      
      Object.keys(saleQtysMap).forEach(key => {
        const prodId = key.split('_')[0];
        productGlobalSales[prodId] = (productGlobalSales[prodId] || 0) + saleQtysMap[key];
      });
      Object.keys(remittedSaleQtysMap).forEach(key => {
        const prodId = key.split('_')[0];
        productGlobalRemitted[prodId] = (productGlobalRemitted[prodId] || 0) + remittedSaleQtysMap[key];
      });
      
      Object.keys(productGlobalSales).forEach(prodId => {
        const unremitted = Math.max(0, (productGlobalSales[prodId] || 0) - (productGlobalRemitted[prodId] || 0));
        if (unremitted > 0) {
          const product = products.find((p: any) => p.id.toString() === prodId.toString());
          const defaultWhId = (product?.warehouseId || (warehouses[0]?.id) || 'unknown').toString();
          const key = `${prodId}_${defaultWhId}`;
          if (!stocksMap[key]) stocksMap[key] = { productId: prodId, warehouseId: defaultWhId, physicalStock: 0, reservedStock: 0, availableStock: 0 };
          stocksMap[key].reservedStock += unremitted;
        }
      });

      const finalStocksList: any[] = Object.keys(stocksMap).map(key => {
        const item = stocksMap[key];
        return {
          id: key,
          productId: item.productId,
          warehouseId: item.warehouseId,
          physicalStock: item.physicalStock,
          reservedStock: item.reservedStock,
          availableStock: item.physicalStock - item.reservedStock,
          lastUpdated: Date.now()
        };
      });

      await setDbData('InventoryTransactions', historyList);
      await setDbData('warehouse_stocks', finalStocksList);
      res.json({ success: true, data: finalStocksList });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/db/stats', async (req, res) => {
    try {
      let totalSize = 0;
      try {
        if (!isPgActive()) {
           const stats = await fsPromises.stat(SQLITE_FILE);
           totalSize = stats.size;
        } else {
           // mock size for PG or fetch from pg_database size
           const res = await getActivePgPool().query('SELECT pg_database_size(current_database()) as size');
           if (res.rows.length > 0) totalSize = parseInt(res.rows[0].size, 10);
        }
      } catch(e) { }
      
      const rows = await getAllDbData();
      const collections = [];
      
      for (const row of rows) {
        const value = row.value;
        const sizeBytes = Buffer.byteLength(JSON.stringify(value) || '', 'utf8');
        let recordCount = Array.isArray(value) ? value.length : (value ? Object.keys(value).length : 0);
        collections.push({ name: row.key, size: sizeBytes, recordCount });
      }
      
      res.json({ totalSize, collections });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/db/backup', async (req, res) => {
    try {
      const rows = await getAllDbData();
      const backupData: any = {};
      for (const row of rows) {
        backupData[row.key] = row.value;
      }
      
      const fileName = `backup-${Date.now()}.json`;
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);
      res.send(JSON.stringify(backupData, null, 2));
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/db/restore', async (req, res) => {
    try {
      if (isPgActive() && getActivePgPool()) {
          // req.body could be parsed JSON from old backups or raw SQL string.
          // Because Express body-parser is set up, it might have failed to parse if it was SQL, unless we added a text parser.
          // Let's assume req.body is string for SQL or object for JSON
          if (typeof req.body === 'string' && req.body.includes('Professional Postgres Dump')) {
              await getActivePgPool().query(req.body);
              return res.json({ success: true });
          } else if (typeof req.body === 'object') {
              // Old JSON format restore
              const parsed = req.body;
              for (const key of KNOWN_TABLES) {
                try { await getActivePgPool().query(`TRUNCATE TABLE "${key}" CASCADE`); } catch (e) {}
              }
              for (const [key, value] of Object.entries(parsed)) {
                 if (KNOWN_TABLES.includes(key)) await setDbData(key, value);
              }
              return res.json({ success: true });
          } else {
              return res.status(400).json({ error: 'فرمت فایل پشتیبان معتبر نیست.' });
          }
      } else {
          const parsed = req.body;
          if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
            return res.status(400).json({ error: 'فرمت فایل پشتیبان معتبر نیست. فایل باید شامل یک شیء JSON با ساختار معتبر کلید-مقدار باشد.' });
          }
          try { getDb().prepare('DELETE FROM store').run(); } catch (e) {}
          for (const [key, value] of Object.entries(parsed)) {
            if (KNOWN_TABLES.includes(key)) {
              await setDbData(key, value);
            }
          }
          res.json({ success: true });
      }
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/sys/dirs', async (req, res) => {
    try {
      const target = req.body.path || process.cwd();
      const items = await fsPromises.readdir(target, { withFileTypes: true });
      const dirs = items.filter(i => i.isDirectory()).map(i => i.name);
      const parent = path.dirname(target);
      res.json({ current: target, parent, dirs });
    } catch(err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/sys/drives', async (req, res) => {
    try {
       if (process.platform === 'win32') {
          res.json(['C:\\', 'D:\\', 'E:\\', 'F:\\']);
       } else {
          res.json(['/']);
       }
    } catch (e) {
       res.json(['/']);
    }
  });

  app.get('/api/setup/status', async (req, res) => {
    try {
       let configExists = false;
       try {
           await fsPromises.access(DB_CONFIG_FILE);
           configExists = true;
       } catch(e) { }
       
       const usingEnvVars = !!(process.env.SQL_HOST || process.env.DATABASE_URL);
       
       const users = await getDbData('users') || [];
       const adminConfigured = users.length > 0;
       
       const profile = await getDbData('company_profile') || null;
       const companyConfigured = !!(profile && profile.companyName);
       
       const dbConfigured = configExists || usingEnvVars || (adminConfigured && companyConfigured);
       
       res.json({ 
         dbConfigured, 
         usingEnvVars,
         adminConfigured,
         companyConfigured,
         isComplete: dbConfigured && adminConfigured,
         companyProfile: profile,
         adminUser: users.length > 0 ? { username: users[0].username } : null
       });
    } catch(e) {
       res.status(500).json({ error: e.message });
    }
  });

  app.get('/api/system/info', (req, res) => {
    
    res.json({
      platform: os.platform(),
      arch: os.arch(),
      totalMem: os.totalmem(),
      freeMem: os.freemem(),
      cpus: os.cpus().length,
      uptime: os.uptime(),
      nodeVersion: process.version
    });
  });

  app.post('/api/setup/admin', async (req, res) => {
    try {
      const { username, password } = req.body;
      const users = await getDbData('users') || [];
      const hashed = await bcrypt.hash(password, 10);
      
      const adminIndex = users.findIndex((u: any) => u.role === 'admin' || u.username === username);
      if (adminIndex !== -1) {
        users[adminIndex].username = username;
        users[adminIndex].password = hashed;
        await setDbData('users', users);
      } else {
        const adminUser = {
          id: Math.random().toString(36).substring(2, 15),
          username,
          password: hashed,
          role: 'admin',
          createdAt: new Date().toISOString(),
          firstName: 'مدیر',
          lastName: 'سیستم',
          isActive: true
        };
        users.push(adminUser);
        await setDbData('users', users);
      }
      res.json({ success: true });
    } catch(e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/setup/company', async (req, res) => {
    try {
      const profileData = req.body;
      const existing = await getDbData('company_profile') || {};
      const updatedProfile = { ...existing, ...profileData };
      await setDbData('company_profile', updatedProfile);
      res.json({ success: true });
    } catch(e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/db/config', async (req, res) => {
    try {
      const { connectionString, dbName, engine } = req.body;

      if (engine === 'sqlite' || connectionString === 'sqlite') {
         const config = { engine: 'sqlite' };
         await fsPromises.writeFile(DB_CONFIG_FILE, JSON.stringify(config));
         activePgPools['default'] = null;
         usePgMap['default'] = false;
         return res.json({ success: true });
      }

      let finalConnectionString = connectionString;
      
      // Initial connection to create DB if needed
      const client = new Client({ connectionString });
      await client.connect();

      if (dbName) {
        // Check if database exists
        const dbCheck = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [dbName]);
        if (dbCheck.rowCount === 0) {
           await client.query(`CREATE DATABASE "${dbName}"`);
        }
        
        // Append or replace the pathname with the new DB name
        const url = new URL(connectionString);
        url.pathname = `/${dbName}`;
        finalConnectionString = url.toString();
      }

      await client.end();

      // Test connection to the actual database
      const finalClient = new Client({ connectionString: finalConnectionString });
      await finalClient.connect();
      await finalClient.query('SELECT NOW()');
      await finalClient.end();

      const config = { engine: 'postgres', connectionString: finalConnectionString };
      await fsPromises.writeFile(DB_CONFIG_FILE, JSON.stringify(config));
      
      // Try to re-init DB with new connection
      activePgPools['default'] = await connectPgDb(finalConnectionString);
      usePgMap['default'] = true;
      await ensurePostgresTables();
      await migrateSqliteToPostgres();

      
      res.json({ success: true });
    } catch (e: any) {
      res.status(400).json({ success: false, error: e.message });
    }
  });

  app.post('/api/db/test', async (req, res) => {
    try {
      const { connectionString, engine } = req.body;
      if (engine === 'sqlite' || connectionString === 'sqlite') {
         return res.json({ success: true, message: 'اتصال SQLite (ذخیره سازی محلی) با موفقیت تأیید شد' });
      }
      const client = new Client({ connectionString });
      await client.connect();
      await client.query('SELECT NOW()');
      await client.end();
      res.json({ success: true, message: 'اتصال با موفقیت انجام شد' });
    } catch (e: any) {
      res.status(400).json({ success: false, error: e.message });
    }
  });

  app.post('/api/system/update', (req, res) => {
    // In the cloud environment, we don't want to reset the repository as it would overwrite the user's changes.
    res.json({ success: true, message: 'بروزرسانی سیستم در این محیط ابری به صورت خودکار مدیریت می‌شود و نیازی به بروزرسانی دستی نیست.' });
  });

  app.post('/api/db/execute', async (req, res) => {
    const { query, params } = req.body;
    try {
      if (isPgActive() && getActivePgPool()) {
         const isSelect = query.trim().toUpperCase().startsWith('SELECT');
         const result = await getActivePgPool().query(query, params || []);
         if (isSelect) {
           res.json({ results: result.rows });
         } else {
           res.json({ info: { changes: result.rowCount } });
         }
      } else {
        const isSelect = query.trim().toUpperCase().startsWith('SELECT');
        const stmt = getDb().prepare(query);
        if (isSelect) {
          const results = stmt.all(...(params || []));
          res.json({ results });
        } else {
          const info = stmt.run(...(params || []));
          res.json({ info });
        }
      }
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  
  // --- REPORTS APIs ---
  app.get('/api/reports/analytical', async (req, res) => {
    try {
      const products = await getDbData('products') || [];
      const warehouses = await getDbData('warehouses') || [];
      const warehouseStocks = await getDbData('warehouse_stocks') || [];
      const invoices = await getDbData('invoices') || [];
      
      const realProducts = products.filter(p => p.type !== 'service');
      
      // Inventory by warehouse
      const inventoryByWarehouse = warehouses.map(wh => {
        const whStocks = warehouseStocks.filter(s => String(s.warehouseId) === String(wh.id));
        let totalItems = 0;
        let totalValue = 0;
        whStocks.forEach(stock => {
          const p = realProducts.find(prod => String(prod.id) === String(stock.productId));
          if (p) {
            const qty = Number(stock.physicalStock) || 0;
            totalItems += qty;
            totalValue += qty * (Number(p.price) || 0);
          }
        });
        return { name: wh.name, totalItems, totalValue };
      }).filter(item => item.totalItems > 0);

      // Top Selling Products
      const saleInvoices = invoices.filter(inv => inv.type === 'sale' && inv.status !== 'voided' && !inv.isDeleted && inv.status !== 'draft' && !inv.isDraft);
      const productSales: Record<string, {qty: number, rev: number}> = {};
      saleInvoices.forEach(inv => {
        if (Array.isArray(inv.items)) {
          inv.items.forEach(item => {
            const pid = String(item.productId);
            if (!productSales[pid]) productSales[pid] = { qty: 0, rev: 0 };
            productSales[pid].qty += Number(item.quantity) || 0;
            productSales[pid].rev += (Number(item.quantity) || 0) * (Number(item.price) || 0);
          });
        }
      });
      
      const topProductsBySales = Object.entries(productSales).map(([pid, data]) => {
        const p = realProducts.find(prod => String(prod.id) === pid);
        return { name: p ? p.name : 'نامشخص', sales: data.qty, revenue: data.rev };
      }).sort((a, b) => b.sales - a.sales).slice(0, 5);

      // Monthly Sales
      const monthlyData: Record<string, {sales: number, revenue: number}> = {};
      saleInvoices.forEach(inv => {
        const d = inv.date || new Date().toISOString();
        const month = d.substring(0, 7); // YYYY-MM
        if (!monthlyData[month]) monthlyData[month] = { sales: 0, revenue: 0 };
        monthlyData[month].sales++;
        monthlyData[month].revenue += Number(inv.totalAmount) || 0;
      });
      
      const monthlySales = Object.entries(monthlyData).map(([month, data]) => ({
        month, sales: data.sales, revenue: data.revenue
      })).sort((a, b) => a.month.localeCompare(b.month));

      res.json({
        success: true,
        data: {
          inventoryByWarehouse,
          topProductsBySales,
          monthlySales,
          totalProducts: realProducts.length,
          totalSalesVolume: saleInvoices.reduce((sum, inv) => sum + (Number(inv.totalAmount) || 0), 0)
        }
      });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  // --- END REPORTS APIs ---

  app.post('/api/search-products', async (req, res) => {
    const { query, category } = req.body;
    if (!query) {
      return res.status(400).json({ error: 'query is required' });
    }
  
    try {
      const prompt = `Generate a realistic list of 10 fake products related to "${query}"${category ? ` in the category of "${category}"` : ''}. Focus on Persian product names. Return purely a JSON array of objects with keys "name", "description", and "priceStr". No markdown formatting, no backticks, just raw JSON.`;
      
      const response = await fetch(`https://text.pollinations.ai/${encodeURIComponent(prompt)}`);
      
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      
      const text = await response.text();
      let cleanText = text;
      const match = text.match(/\[[\s\S]*\]/);
      if (match) {
        cleanText = match[0];
      } else {
        cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
      }
      
      const products = JSON.parse(cleanText || "[]");
      
      res.json({ products });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  let migrationState = {
    status: 'idle',
    progress: 0,
    total: 0,
    logs: [] as string[],
    error: null as string | null
  };

  app.post('/api/migrate-postgres/validate', async (req, res) => {
    const { connectionString } = req.body;
    try {
      const client = await connectPgDb(connectionString);
      await client.query('SELECT NOW()');
      await client.end();
      res.json({ success: true, message: 'اتصال با موفقیت برقرار شد.' });
    } catch (err) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  
  app.get('/api/migrate-postgres/tables', (req, res) => {
    try {
      const stmt = getDb().prepare('SELECT key FROM store');
      const allRows = stmt.all();
      const tables = allRows.map(r => r.key).filter(k => KNOWN_TABLES.includes(k));
      res.json({ success: true, tables });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/migrate-postgres/table/:table', async (req, res) => {
    const { table } = req.params;
    const { connectionString } = req.body;
    
    if (!KNOWN_TABLES.includes(table)) {
        return res.status(400).json({ error: 'جدول نامعتبر است' });
    }

    try {
      const client = new Client({ connectionString });
      await client.connect();

      const stmt = getDb().prepare('SELECT value FROM store WHERE key = ?');
      const row = stmt.get(table);
      if (!row) {
         await client.end();
         return res.status(404).json({ error: 'داده‌ای برای این جدول یافت نشد' });
      }

      await client.query(`DROP TABLE IF EXISTS "${table}" CASCADE`);
      await client.query(`CREATE TABLE "${table}" (id VARCHAR PRIMARY KEY)`);
      
      const data = JSON.parse(row.value);
      
      await client.query('BEGIN');
      let migratedCount = 0;
      tableSchemas.clear();

      if (table === 'company_profile' || table === 'backupConfig' || !Array.isArray(data)) {
          if (data && typeof data === 'object') {
              data.id = 'singleton';
              await syncTableSchema(client, table, data);
              const keys = Object.keys(data);
              const vals = Object.values(data).map(v => v === undefined ? null : (v !== null && typeof v === 'object') ? JSON.stringify(v) : v);
              const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
              const colNames = keys.map(k => `"${k}"`).join(', ');
              await client.query(`INSERT INTO "${table}" (${colNames}) VALUES (${placeholders}) ON CONFLICT(id) DO NOTHING`, vals);
              migratedCount = 1;
          }
      } else {
          for (const item of data) {
              if (!item.id) item.id = Math.random().toString(36).substring(2, 15);
              await syncTableSchema(client, table, item);
              const keys = Object.keys(item);
              const vals = Object.values(item).map(v => v === undefined ? null : (v !== null && typeof v === 'object') ? JSON.stringify(v) : v);
              const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
              const colNames = keys.map(k => `"${k}"`).join(', ');
              await client.query(`INSERT INTO "${table}" (${colNames}) VALUES (${placeholders}) ON CONFLICT(id) DO NOTHING`, vals);
              migratedCount++;
          }
      }

      await client.query('COMMIT');
      await client.end();
      res.json({ success: true, count: migratedCount });
    } catch (e) {
      console.error(`Error migrating table ${table}:`, e);
      res.status(500).json({ error: e.message || String(e) });
    }
  });

  app.get('/api/migrate-postgres/status', (req, res) => {
    res.json(migrationState);
  });

  app.post('/api/migrate-postgres/reset', (req, res) => {
    migrationState = { status: 'idle', progress: 0, total: 0, logs: [], error: null };
    res.json({ success: true });
  });

  // Vite middleware for development
  // Sentry error handler should be before any other error middleware and after all controllers
  if (process.env.SENTRY_DSN && String(process.env.SENTRY_DSN).startsWith('http')) {
    Sentry.setupExpressErrorHandler(app);
  }

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

// Start sync worker
setInterval(() => {
    try {
        syncManager.processQueue((storeId) => activePgPools[storeId]);
    } catch(e) {
        console.error("Sync worker error:", e);
    }
}, 10000); // run every 10s
