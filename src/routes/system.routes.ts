
import { usePgMap, activePgPools, storeContext, SQLITE_FILE, connectPgDb, getDb, getActivePgPool, isPgActive, DB_CONFIG_FILE, dbs, DATA_FILE } from '../db/connection';
import { KNOWN_TABLES, tableSchemas, syncTableSchema, ensurePostgresTables } from '../db/schema-sync';
import { getDbData, setDbData, getAllDbData, innerGetDbData, innerSetDbData, handleRelations } from '../db/kv-store';
import { migrateSqliteToPostgres } from '../db/migration';

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
router.post('/api/db/recalculate-stocks', async (req, res) => {
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
