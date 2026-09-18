
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

      // Sort invoices by date / createdAt to process chronologically
      const sortedInvoices = [...allDocs].sort((a: any, b: any) => {
        const tA = a.createdAt ? new Date(a.createdAt).getTime() : (a.timestamp || 0);
        const tB = b.createdAt ? new Date(b.createdAt).getTime() : (b.timestamp || 0);
        return tA - tB;
      });

      const stocksMap: Record<string, any> = {};
      const historyList: any[] = [];
      const generateId = () => Math.random().toString(36).substring(2, 15);

      // 1. Initial stocks from products definition
      products.forEach((p: any) => {
        if (p.type === 'service') return;
        const baseStock = Number(p.stock) || 0;
        const defaultWhId = (p.warehouseId || (warehouses[0]?.id) || 'unknown').toString();
        const key = `${p.id}_${defaultWhId}`;
        
        const targetWhId = (p.initialStockWarehouseId || p.warehouseId || (warehouses[0]?.id) || 'unknown').toString();
        const targetKey = `${p.id}_${targetWhId}`;
        
        if (!stocksMap[targetKey]) {
          stocksMap[targetKey] = { productId: p.id, warehouseId: targetWhId, physicalStock: 0, reservedStock: 0, availableStock: 0 };
        }
        
        if (baseStock > 0) {
           const before = stocksMap[targetKey].physicalStock;
           stocksMap[targetKey].physicalStock += baseStock;
           const docNum = p.initialStockDocNumber || (p.code ? `OPN-${p.code}` : 'موجودی اولیه');
           const docDate = p.initialStockDate || (p.createdAt ? new Date(p.createdAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);
           const docDesc = p.initialStockDescription || 'سند موجودی اول دوره و افتتاحیه انبار';
           const docTs = p.initialStockTimestamp || (p.createdAt ? new Date(p.createdAt).getTime() : 1);
           
           historyList.push({
             id: generateId(),
             productId: p.id,
             warehouseId: targetWhId,
             date: docDate,
             type: 'in',
             quantity: baseStock,
             unitPrice: Number(p.purchasePrice || p.price || 0),
             totalPrice: baseStock * Number(p.purchasePrice || p.price || 0),
             documentType: 'initial_stock',
             documentId: p.id,
             documentNumber: docNum,
             description: docDesc,
             personId: '',
             personName: 'سیستم (سند افتتاحیه انبار)',
             balanceBefore: before,
             balanceAfter: stocksMap[targetKey].physicalStock,
             timestamp: docTs,
           });
        }
      });

      const saleQtysMap: Record<string, number> = {};
      const remittedSaleQtysMap: Record<string, number> = {};

      sortedInvoices.forEach((inv: any) => {
        if (inv.isDraft || inv.status === 'draft' || inv.status === 'voided' || inv.isDeleted) return;
        if (!inv.items || !Array.isArray(inv.items)) return;

        // Resolve document type
        const docType = inv.type || (inv._originTable === 'warehouse_receipts' ? 'warehouse_receipt' : inv._originTable === 'warehouse_remittances' ? 'warehouse_remittance' : 'sale');
        const person = persons.find((per: any) => String(per.id) === String(inv.personId || inv.customerId));
        const personName = person?.name || inv.customerName || inv.personName || '';

        inv.items.forEach((i: any) => {
          const prodId = i.productId;
          if (!prodId) return;
          const product = products.find((p: any) => p.id?.toString() === prodId.toString());
          if (!product || product.type === 'service') return;

          const dir = product.unitRatioDirection || getUnitRatioDirection(product);
          const isSec = Boolean(i.isSecondaryUnit);
          const ratio = Number(i.unitRatio || product.unitRatio || 1);
          const q = i.baseQuantity !== undefined && i.baseQuantity !== null && !isNaN(Number(i.baseQuantity))
            ? Number(i.baseQuantity)
            : convertQuantityToBaseUnit(Number(i.quantity) || 0, isSec, ratio, dir);

          const defaultWhId = (product.warehouseId || (warehouses[0]?.id) || 'unknown').toString();
          const whId = (i.warehouseId || inv.warehouseId || defaultWhId).toString();
          const key = `${prodId}_${whId}`;

          if (!stocksMap[key]) stocksMap[key] = { productId: prodId, warehouseId: whId, physicalStock: 0, reservedStock: 0, availableStock: 0 };

          const rawPrice = Number(i.unitPrice || i.price || product.purchasePrice || 0);
          const uPrice = i.baseUnitPrice !== undefined && i.baseUnitPrice !== null && !isNaN(Number(i.baseUnitPrice))
            ? Number(i.baseUnitPrice)
            : convertPriceToBaseUnit(rawPrice, isSec, ratio, dir);

          const tPrice = Number(i.totalPrice) > 0 ? Number(i.totalPrice) : q * uPrice;
          const docNum = inv.invoiceNumber || inv.documentNumber || inv.number || '';
          const docDate = inv.date || (inv.createdAt ? new Date(inv.createdAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);
          const docTs = inv.createdAt ? new Date(inv.createdAt).getTime() : (inv.timestamp || Date.now());

          if (docType === 'warehouse_receipt' || docType === 'sales_return') {
            const before = stocksMap[key].physicalStock;
            stocksMap[key].physicalStock += q;
            historyList.push({
               id: generateId(),
               productId: prodId,
               warehouseId: whId,
               date: docDate,
               type: 'in',
               quantity: q,
               originalQuantity: Number(i.quantity) || 0,
               originalUnitPrice: rawPrice,
               isSecondaryUnit: isSec,
               selectedUnit: i.selectedUnit || (isSec ? product.secondaryUnit : product.unit),
               unitPrice: uPrice,
               totalPrice: tPrice,
               documentType: docType,
               documentId: inv.id,
               documentNumber: docNum,
               description: inv.description || (docType === 'warehouse_receipt' ? `رسید انبار ${docNum}` : `برگشت از فروش ${docNum}`),
               personId: inv.personId || inv.customerId || '',
               personName: personName,
               balanceBefore: before,
               balanceAfter: stocksMap[key].physicalStock,
               timestamp: docTs,
            });
          } else if (docType === 'warehouse_remittance' || docType === 'purchase_return' || docType === 'waste') {
            const before = stocksMap[key].physicalStock;
            stocksMap[key].physicalStock -= q;
            historyList.push({
               id: generateId(),
               productId: prodId,
               warehouseId: whId,
               date: docDate,
               type: 'out',
               quantity: q,
               originalQuantity: Number(i.quantity) || 0,
               originalUnitPrice: rawPrice,
               isSecondaryUnit: isSec,
               selectedUnit: i.selectedUnit || (isSec ? product.secondaryUnit : product.unit),
               unitPrice: uPrice,
               totalPrice: tPrice,
               documentType: docType,
               documentId: inv.id,
               documentNumber: docNum,
               description: inv.description || (docType === 'warehouse_remittance' ? `حواله انبار ${docNum}` : docType === 'waste' ? `ضایعات انبار ${docNum}` : `برگشت از خرید ${docNum}`),
               personId: inv.personId || inv.customerId || '',
               personName: personName,
               balanceBefore: before,
               balanceAfter: stocksMap[key].physicalStock,
               timestamp: docTs,
            });

            if (inv.sourceInvoiceId) {
              const sourceInv = allDocs.find((sinv: any) => sinv.id?.toString() === inv.sourceInvoiceId?.toString());
              if (sourceInv && (sourceInv.type === 'sale' || sourceInv._originTable === 'sales_invoices')) {
                remittedSaleQtysMap[key] = (remittedSaleQtysMap[key] || 0) + q;
              }
            } else {
              remittedSaleQtysMap[key] = (remittedSaleQtysMap[key] || 0) + q;
            }
          } else if (docType === 'sale') {
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

      // Save Kardex ledger into all standard tables
      await setDbData('InventoryTransactions', historyList);
      await setDbData('kardex', historyList);
      await setDbData('inventory_transactions', historyList);
      await setDbData('warehouse_stocks', finalStocksList);

      res.json({ success: true, data: finalStocksList, count: historyList.length });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
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
    list.sort((a: any, b: any) => (a.timestamp || 0) - (b.timestamp || 0));
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
