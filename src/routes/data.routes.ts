
import { usePgMap, activePgPools, storeContext, SQLITE_FILE, connectPgDb, getDb, getActivePgPool, isPgActive, DB_CONFIG_FILE, dbs, DATA_FILE } from '../db/connection';
import { KNOWN_TABLES, tableSchemas, syncTableSchema, ensurePostgresTables } from '../db/schema-sync';
import { getDbData, setDbData, getAllDbData, innerGetDbData, innerSetDbData, handleRelations } from '../db/kv-store';
import { migrateSqliteToPostgres } from '../db/migration';
// import { loginSchema } from '../schemas/validation';
import { DatabaseSync } from 'node:sqlite';
import { Client, Pool } from 'pg';
import os from 'os';

import { Router } from 'express';
import fsPromises from 'fs/promises';
import path from 'path';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { exec } from 'child_process';
import { validateData } from '../schemas/validation';
import { getDb, getActivePgPool, isPgActive, DB_CONFIG_FILE, dbs, DATA_FILE } from '../db/connection';
import { getDbData, setDbData, getAllDbData, innerGetDbData, innerSetDbData } from '../db/kv-store';
import { KNOWN_TABLES, tableSchemas } from '../db/schema-sync';
import { eq, isNull, sql, desc, asc, inArray, and } from 'drizzle-orm';
import { db } from '../db';
import { checkbooks, issuedChecks, receivedChecks, checkAuditLogs, notifications, accounts, cashboxes } from '../db/schema';
import * as schema from '../db/schema';

const router = Router();
router.post('/api/data/users', async (req, res, next) => {
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

router.get('/api/data/:key', async (req, res) => {
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

router.post('/api/data/batch', async (req, res) => {
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

router.post('/api/data/:key/append', async (req, res) => {
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

router.put('/api/data/:key/:id', async (req, res) => {
    const { key, id } = req.params;
    const updatedItem = req.body;
    try {
      let mergedItem = { ...updatedItem, id };
      if (isPgActive() && getActivePgPool()) {
         if (!KNOWN_TABLES.includes(key)) return res.status(400).json({ error: 'Unknown table' });
         
         const data = (await getDbData(key)) || [];
         const index = data.findIndex((x: any) => String(x.id) === String(id));
         if (index === -1) {
            return res.status(404).json({ error: 'Not found' });
         }
         
         const oldItem = data[index];
         const newItem = { ...oldItem, ...updatedItem, id }; // ensure id is preserved
         mergedItem = newItem;
         
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
             mergedItem = newItem;
             
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

      res.json({ success: true, data: mergedItem });
    } catch(err: any) {
      console.error('Error in put:', err);
      tableSchemas.delete(req.params.key);
      tableSchemas.delete('system_logs');
      res.status(500).json({ error: err.message });
    }
  });

router.post('/api/data/:key', async (req, res) => {
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


export default router;
