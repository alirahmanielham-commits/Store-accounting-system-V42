
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
router.get('/api/reports/analytical', async (req, res) => {
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


export default router;
