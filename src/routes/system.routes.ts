
import { usePgMap, activePgPools, storeContext, SQLITE_FILE, connectPgDb, getDb, getActivePgPool, isPgActive, DB_CONFIG_FILE, dbs, DATA_FILE } from '../db/connection';
import { KNOWN_TABLES, tableSchemas, syncTableSchema, ensurePostgresTables } from '../db/schema-sync';
import { getDbData, setDbData, getAllDbData, innerGetDbData, innerSetDbData, handleRelations } from '../db/kv-store';
import { migrateSqliteToPostgres } from '../db/migration';

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
import { eq, isNull, sql, desc, asc, inArray, and } from 'drizzle-orm';
import { db } from '../db';
import { checkbooks, issuedChecks, receivedChecks, checkAuditLogs, notifications, accounts, cashboxes } from '../db/schema';
import * as schema from '../db/schema';
import { convertPriceToBaseUnit, convertQuantityToBaseUnit, getUnitRatioDirection } from '../utils/unitConversion';
import { calculateAllWarehouseStocks } from '../utils/stockLogic';
import { compareKardexTransactions } from '../utils/kardexSort';

const router = Router();
router.post('/api/db/recalculate-stocks', async (req, res) => {
    try {
      const products = (await getDbData('products')) || [];
      const warehouses = (await getDbData('warehouses')) || [];
      const persons = (await getDbData('persons')) || [];

      // Fetch from all possible document tables
      const docTableKeys = [
        'invoices',
        'warehouse_receipts',
        'warehouse_remittances',
        'sales_invoices',
        'purchase_invoices',
        'sale_returns',
        'purchase_returns',
        'wastes'
      ];
      const allDocsRaw: any[] = [];
      for (const tKey of docTableKeys) {
        const d = await getDbData(tKey);
        if (Array.isArray(d)) {
          d.forEach((item: any) => {
            if (item && item.id) {
              allDocsRaw.push({ ...item, _originTable: tKey });
            }
          });
        }
      }

      // Deduplicate by ID
      const docsMap = new Map();
      allDocsRaw.forEach(doc => {
        if (!docsMap.has(String(doc.id))) {
          docsMap.set(String(doc.id), doc);
        }
      });
      const allDocs = Array.from(docsMap.values());

      // Calculate stocks with unified logic:
      // Available Stock = Physical Stock - Reserved Stock
      const { stocksList, historyList } = calculateAllWarehouseStocks({
        products,
        warehouses,
        allDocs,
      });

      // Save Kardex ledger into all standard tables
      await setDbData('InventoryTransactions', historyList);
      await setDbData('kardex', historyList);
      await setDbData('inventory_transactions', historyList);
      await setDbData('warehouse_stocks', stocksList);

      return res.json({ success: true, data: stocksList, count: historyList.length });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });



router.get('/api/kardex/:productId?', async (req, res) => {
  try {
    const { productId } = req.params;
    const { warehouseId } = req.query;
    let list = (await getDbData('kardex')) || (await getDbData('InventoryTransactions')) || [];
    if (productId) {
      list = list.filter((item: any) => String(item.productId) === String(productId));
    }
    if (warehouseId && warehouseId !== 'all') {
      list = list.filter((item: any) => String(item.warehouseId) === String(warehouseId));
    }
    list.sort(compareKardexTransactions);
    res.json({ success: true, data: list });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/api/sys/dirs', async (req, res) => {
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

router.post('/api/db/config', async (req, res) => {
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

router.post('/api/db/test', async (req, res) => {
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

router.post('/api/system/update', (req, res) => {
    // In the cloud environment, we don't want to reset the repository as it would overwrite the user's changes.
    res.json({ success: true, message: 'بروزرسانی سیستم در این محیط ابری به صورت خودکار مدیریت می‌شود و نیازی به بروزرسانی دستی نیست.' });
  });

router.post('/api/db/execute', async (req, res) => {
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


export default router;
