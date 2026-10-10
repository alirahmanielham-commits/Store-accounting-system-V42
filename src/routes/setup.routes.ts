
import { usePgMap, activePgPools, storeContext, SQLITE_FILE, connectPgDb, getDb, getActivePgPool, isPgActive, DB_CONFIG_FILE, dbs, DATA_FILE } from '../db/connection';
import { KNOWN_TABLES, tableSchemas, syncTableSchema, ensurePostgresTables, currentSyncProgress } from '../db/schema-sync';
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

import { requireRole } from '../middleware/auth.middleware';

const router = Router();

// GET /api/setup/sync-progress: Table creation progress reporting
router.get('/api/setup/sync-progress', (req, res) => {
  res.json({
    success: true,
    progress: currentSyncProgress
  });
});

router.get('/api/setup/status', async (req, res) => {
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
       const companyConfigured = !!(profile && (profile.companyName || profile.storeName));
       
       const financialYears = (await getDbData('financial_years')) || [];
       const fiscalYearConfigured = Array.isArray(financialYears) && financialYears.length > 0;

       const dbConfigured = configExists || usingEnvVars || (adminConfigured && companyConfigured);
       
       res.json({ 
         dbConfigured, 
         usingEnvVars,
         adminConfigured,
         companyConfigured,
         fiscalYearConfigured,
         isComplete: dbConfigured && adminConfigured && companyConfigured && fiscalYearConfigured,
         companyProfile: profile,
         adminUser: users.length > 0 ? { username: users[0].username, name: users[0].name || users[0].fullName } : null,
         financialYears
       });
    } catch(e: any) {
       res.status(500).json({ error: e.message });
    }
  });

router.post('/api/setup/wizard-complete', async (req: any, res) => {
  try {
    const {
      dbConfig,
      admin,
      business,
      fiscalYear,
      bankAccount,
      cashbox,
      warehouse,
      starterPack,
      customPerson,
      customProduct,
    } = req.body;

    // 1. Configure DB if PostgreSQL is chosen
    if (dbConfig && dbConfig.engine === 'postgres') {
      try {
        const auth = dbConfig.password ? `${dbConfig.user}:${encodeURIComponent(dbConfig.password)}` : dbConfig.user;
        const targetDb = (dbConfig.dbName || 'store_db').trim();
        const safeDbName = targetDb.replace(/[^a-zA-Z0-9_]/g, '') || 'store_db';
        const connStr = `postgresql://${auth}@${dbConfig.host}:${dbConfig.port}/${safeDbName}`;
        const adminConnStr = `postgresql://${auth}@${dbConfig.host}:${dbConfig.port}/postgres`;

        // Check and auto-create database if not exists
        try {
          const adminClient = new Client({ connectionString: adminConnStr, connectionTimeoutMillis: 5000 });
          await adminClient.connect();
          const checkRes = await adminClient.query('SELECT 1 FROM pg_database WHERE datname = $1', [safeDbName]);
          if (checkRes.rowCount === 0) {
            await adminClient.query(`CREATE DATABASE "${safeDbName}"`);
          }
          await adminClient.end();
        } catch (dbCreateErr: any) {
          console.warn('Postgres database auto-create notice:', dbCreateErr?.message);
        }

        await fsPromises.writeFile(DB_CONFIG_FILE, JSON.stringify({
          engine: 'postgres',
          connectionString: connStr,
          dbName: safeDbName
        }, null, 2), 'utf-8');

        // Connect and activate pool in-memory so subsequent setDbData writes directly to PostgreSQL!
        try {
          const pool = await connectPgDb(connStr);
          activePgPools['default'] = pool;
          usePgMap['default'] = true;
          await ensurePostgresTables(pool);
        } catch (connectErr: any) {
          console.error('Failed to connect and initialize PostgreSQL tables:', connectErr?.message);
        }
      } catch (err: any) {
        console.warn('Could not save DB_CONFIG_FILE:', err?.message);
      }
    } else {
      activePgPools['default'] = null;
      usePgMap['default'] = false;
      try {
        await fsPromises.writeFile(DB_CONFIG_FILE, JSON.stringify({
          engine: 'json',
          storage: 'local_file'
        }, null, 2), 'utf-8');
      } catch (_) {}
    }

    // 2. Admin user creation
    const username = admin?.username?.trim() || 'admin';
    const rawPassword = admin?.password || 'admin';
    const fullName = admin?.fullName?.trim() || 'مدیر سیستم';
    const hashed = await bcrypt.hash(rawPassword, 10);

    let users = (await getDbData('users')) || [];
    if (!Array.isArray(users)) users = [];
    const adminIdx = users.findIndex((u: any) => u.username === username || u.role === 'admin');
    const adminObj = {
      id: adminIdx >= 0 ? users[adminIdx].id : 'admin-default',
      username,
      name: fullName,
      fullName,
      password: hashed,
      role: 'admin',
      createdAt: Date.now(),
      isActive: true,
    };
    if (adminIdx >= 0) {
      users[adminIdx] = { ...users[adminIdx], ...adminObj };
    } else {
      users.unshift(adminObj);
    }
    await setDbData('users', users);

    // 3. Business profile & store_settings
    const storeName = business?.storeName?.trim() || 'فروشگاه و کسب‌وکار من';
    const companyName = business?.companyName?.trim() || storeName;
    const currency = business?.currency || 'تومان';
    const calendarType = business?.calendarType || 'jalali';
    const phone = business?.phone?.trim() || '';
    const address = business?.address?.trim() || '';
    const activityField = business?.activityField || 'خرده‌فروشی و بازرگانی';

    const companyProfile = {
      storeName,
      companyName,
      currency,
      calendarType,
      phone,
      address,
      activityField,
      taxPercent: Number(business?.taxPercent) || 0,
      invoicePrintFormat: 'standard',
      printPaperSize: 'A4',
      printHasHeader: true,
      printHasFooter: true,
      requireWarehouse: true,
      isSetup: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    await setDbData('company_profile', companyProfile);
    await setDbData('store_settings', companyProfile);

    // Sync business to database businesses table & businesses.json
    try {
      const defEntry = {
        id: 'default',
        name: storeName,
        companyName,
        company_name: companyName,
        calendarType,
        calendar_type: calendarType,
        currency,
        phone,
        address,
        activityField,
        activity_field: activityField,
        taxPercent: Number(business?.taxPercent) || 0,
        tax_percent: Number(business?.taxPercent) || 0,
        db_type: dbConfig && dbConfig.engine === 'postgres' ? 'postgres' : 'json',
        db_name: dbConfig && dbConfig.engine === 'postgres' ? (dbConfig.dbName || 'store_db') : '',
        updatedAt: new Date().toISOString()
      };

      // 1. In Postgres businesses table if available
      if (usePgMap['default'] && activePgPools['default']) {
        try {
          await activePgPools['default'].query(`
            CREATE TABLE IF NOT EXISTS businesses (
              id VARCHAR PRIMARY KEY,
              name VARCHAR NOT NULL,
              company_name VARCHAR,
              calendar_type VARCHAR,
              currency VARCHAR,
              phone VARCHAR,
              address VARCHAR,
              activity_field VARCHAR,
              tax_percent NUMERIC,
              db_type VARCHAR DEFAULT 'postgres',
              db_host VARCHAR,
              db_port VARCHAR,
              db_name VARCHAR,
              db_user VARCHAR,
              db_password VARCHAR,
              created_at VARCHAR,
              updated_at VARCHAR
            )
          `);
          await activePgPools['default'].query(`
            INSERT INTO businesses (id, name, company_name, calendar_type, currency, phone, address, activity_field, tax_percent, db_type, db_name, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            ON CONFLICT (id) DO UPDATE SET
              name = EXCLUDED.name,
              company_name = EXCLUDED.company_name,
              calendar_type = EXCLUDED.calendar_type,
              currency = EXCLUDED.currency,
              phone = EXCLUDED.phone,
              address = EXCLUDED.address,
              activity_field = EXCLUDED.activity_field,
              tax_percent = EXCLUDED.tax_percent,
              db_type = EXCLUDED.db_type,
              db_name = EXCLUDED.db_name,
              updated_at = EXCLUDED.updated_at
          `, [
            defEntry.id, defEntry.name, defEntry.companyName, defEntry.calendarType,
            defEntry.currency, defEntry.phone, defEntry.address, defEntry.activityField,
            defEntry.taxPercent, defEntry.db_type, defEntry.db_name, defEntry.updatedAt
          ]);
        } catch (pgErr) {
          console.warn('Postgres businesses table sync notice:', pgErr);
        }
      }

      // 2. In KV store businesses table
      try {
        let existingB = (await getDbData('businesses')) || [];
        if (!Array.isArray(existingB)) existingB = [];
        const dIdx = existingB.findIndex((b: any) => b.id === 'default');
        if (dIdx >= 0) existingB[dIdx] = { ...existingB[dIdx], ...defEntry };
        else existingB.unshift(defEntry);
        await setDbData('businesses', existingB);
      } catch (kvErr) {
        console.warn('KV store businesses sync notice:', kvErr);
      }

      // 3. Mirror in businesses.json
      const bFile = path.join(process.cwd(), 'businesses.json');
      let bList: any[] = [];
      try {
        const raw = await fsPromises.readFile(bFile, 'utf8');
        bList = JSON.parse(raw);
        if (!Array.isArray(bList)) bList = [];
      } catch (_) {
        bList = [];
      }
      const defIdx = bList.findIndex(b => b.id === 'default');
      if (defIdx >= 0) {
        bList[defIdx] = { ...bList[defIdx], ...defEntry };
      } else {
        bList.unshift(defEntry);
      }
      await fsPromises.writeFile(bFile, JSON.stringify(bList, null, 2), 'utf8');
    } catch (e) {
      console.warn('Could not sync businesses during setup:', e);
    }

    // 4. Financial Year
    const fyName = fiscalYear?.name?.trim() || 'سال مالی ۱۴۰۴';
    const fyCode = fiscalYear?.code?.trim() || 'FY-1404';
    const fyStartDate = fiscalYear?.startDate?.trim() || '1404/01/01';
    const fyEndDate = fiscalYear?.endDate?.trim() || '1404/12/29';
    const newFiscalYear = {
      id: 'fy-' + Date.now(),
      name: fyName,
      code: fyCode,
      startDate: fyStartDate,
      endDate: fyEndDate,
      description: fiscalYear?.description || 'سال مالی افتتاحیه',
      status: 'open',
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    let financialYears = (await getDbData('financial_years')) || [];
    if (!Array.isArray(financialYears)) financialYears = [];
    if (financialYears.length === 0) {
      financialYears.push(newFiscalYear);
    } else {
      financialYears[0].status = 'open';
    }
    await setDbData('financial_years', financialYears);

    // 5. Initial Warehouse
    let warehouses = (await getDbData('warehouses')) || [];
    if (!Array.isArray(warehouses)) warehouses = [];
    let defaultWh = warehouses.find((w: any) => w.isDefault);
    if (!defaultWh) {
      defaultWh = {
        id: 'wh-main',
        name: warehouse?.name?.trim() || 'انبار مرکزی',
        code: warehouse?.code?.trim() || 'WH-01',
        address: warehouse?.address?.trim() || address || 'دفتر مرکزی',
        isDefault: true,
        createdAt: Date.now()
      };
      warehouses.push(defaultWh);
      await setDbData('warehouses', warehouses);
    }

    // 6. Initial Bank Account
    let accountsList = (await getDbData('accounts')) || [];
    if (!Array.isArray(accountsList)) accountsList = [];
    const bankName = bankAccount?.bankName?.trim() || 'حساب بانکی اصلی';
    const bankBal = Number(bankAccount?.initialBalance) || 0;
    if (bankAccount?.bankName || bankAccount?.accountNumber || accountsList.length === 0) {
      const bankId = 'acc-main-' + Date.now();
      accountsList.push({
        id: bankId,
        title: bankAccount?.title?.trim() || bankName,
        bankName,
        branchName: bankAccount?.branchName?.trim() || bankAccount?.branch?.trim() || '',
        accountNumber: bankAccount?.accountNumber?.trim() || '',
        cardNumber: bankAccount?.cardNumber?.trim() || '',
        shebaNumber: bankAccount?.shebaNumber?.trim() || '',
        sheba: bankAccount?.shebaNumber?.trim() || '',
        accountHolder: bankAccount?.accountHolder?.trim() || bankAccount?.owner?.trim() || companyName,
        balance: bankBal,
        initialBalance: bankBal,
        isDefault: true,
        status: 'active',
        createdAt: Date.now()
      });
      await setDbData('accounts', accountsList);
    }

    // 7. Initial Cashbox
    let cashboxesList = (await getDbData('cashboxes')) || [];
    if (!Array.isArray(cashboxesList)) cashboxesList = [];
    const cashName = cashbox?.name?.trim() || 'صندوق مرکزی';
    const cashBal = Number(cashbox?.initialBalance) || 0;
    if (cashbox?.name || cashboxesList.length === 0) {
      cashboxesList.push({
        id: 'cb-main-' + Date.now(),
        name: cashName,
        manager: cashbox?.manager?.trim() || fullName,
        accountNumber: cashbox?.accountNumber?.trim() || '101',
        description: `صندوق پیش‌فرض سیستم مالی - مسئول: ${cashbox?.manager?.trim() || fullName}`,
        balance: cashBal,
        initialBalance: cashBal,
        isDefault: true,
        status: 'active',
        createdAt: Date.now()
      });
      await setDbData('cashboxes', cashboxesList);
    }

    // 8. Starter Pack or Custom Person / Product
    let personsList = (await getDbData('persons')) || [];
    if (!Array.isArray(personsList)) personsList = [];

    let categoriesList = (await getDbData('product_categories')) || [];
    if (!Array.isArray(categoriesList)) categoriesList = [];

    let productsList = (await getDbData('products')) || [];
    if (!Array.isArray(productsList)) productsList = [];

    if (starterPack) {
      if (!personsList.some((p: any) => p.name === 'مشتری عمومی (نقدی)')) {
        personsList.push({
          id: 'person-retail-cash',
          name: 'مشتری عمومی (نقدی)',
          alias: 'مشتری نقدی',
          personType: 'individual',
          role: 'customer',
          personCode: '1001',
          phone: '09120000000',
          initialBalance: 0,
          initialBalanceType: 'settled',
          createdAt: Date.now()
        });
      }
      if (!personsList.some((p: any) => p.name === 'تامین‌کننده نمونه')) {
        personsList.push({
          id: 'person-supplier-default',
          name: 'تامین‌کننده نمونه',
          alias: 'تامین‌کننده اصلی',
          personType: 'company',
          role: 'supplier',
          personCode: '2001',
          phone: '02188888888',
          initialBalance: 0,
          initialBalanceType: 'settled',
          createdAt: Date.now()
        });
      }
      await setDbData('persons', personsList);

      let generalCat = categoriesList.find((c: any) => c.name === 'کالاهای عمومی');
      if (!generalCat) {
        generalCat = { id: 'cat-general', name: 'کالاهای عمومی', code: 'CAT-01', createdAt: Date.now() };
        categoriesList.push(generalCat);
      }
      let serviceCat = categoriesList.find((c: any) => c.name === 'خدمات');
      if (!serviceCat) {
        serviceCat = { id: 'cat-service', name: 'خدمات', code: 'CAT-02', createdAt: Date.now() };
        categoriesList.push(serviceCat);
      }
      await setDbData('product_categories', categoriesList);

      if (productsList.length === 0) {
        productsList.push({
          id: 'prod-sample-1',
          code: '101',
          barcode: '626000000101',
          name: 'کالای نمونه شماره ۱',
          categoryId: generalCat.id,
          unit: 'عدد',
          type: 'goods',
          purchasePrice: 120000,
          sellPrice: 180000,
          currentStock: 50,
          initialStock: 50,
          warehouseId: defaultWh.id,
          createdAt: Date.now()
        });
        productsList.push({
          id: 'prod-sample-2',
          code: '102',
          barcode: '626000000102',
          name: 'کالای نمونه شماره ۲',
          categoryId: generalCat.id,
          unit: 'عدد',
          type: 'goods',
          purchasePrice: 250000,
          sellPrice: 340000,
          currentStock: 30,
          initialStock: 30,
          warehouseId: defaultWh.id,
          createdAt: Date.now()
        });
        productsList.push({
          id: 'prod-sample-service',
          code: '201',
          name: 'خدمات نصب و راه‌اندازی',
          categoryId: serviceCat.id,
          unit: 'ساعت',
          type: 'service',
          purchasePrice: 0,
          sellPrice: 150000,
          currentStock: 0,
          createdAt: Date.now()
        });
        await setDbData('products', productsList);
      }
    } else {
      if (customPerson && customPerson.name?.trim()) {
        const isLegal = customPerson.personType === 'legal' || customPerson.personType === 'company';
        personsList.push({
          id: 'person-' + Date.now(),
          name: customPerson.name.trim(),
          alias: customPerson.alias?.trim() || customPerson.name.trim(),
          personType: isLegal ? 'legal' : 'real',
          role: customPerson.role || 'customer',
          roles: [customPerson.role || 'customer'],
          personCode: customPerson.personCode?.trim() || '1001',
          nationalId: customPerson.nationalId?.trim() || '',
          economicCode: customPerson.economicCode?.trim() || '',
          registrationNumber: customPerson.registrationNumber?.trim() || '',
          phone: customPerson.phone?.trim() || '',
          mobile: customPerson.mobile?.trim() || customPerson.phone?.trim() || '',
          province: customPerson.province?.trim() || '',
          city: customPerson.city?.trim() || '',
          address: customPerson.address?.trim() || '',
          bankName: customPerson.bankName?.trim() || '',
          accountNumber: customPerson.accountNumber?.trim() || '',
          cardNumber: customPerson.cardNumber?.trim() || '',
          shebaNumber: customPerson.shebaNumber?.trim() || '',
          initialBalance: Number(customPerson.initialBalance) || 0,
          balance: Number(customPerson.initialBalance) || 0,
          initialBalanceType: customPerson.initialBalanceType || 'settled',
          status: 'active',
          createdAt: Date.now()
        });
        await setDbData('persons', personsList);
      }

      if (customProduct && customProduct.name?.trim()) {
        let catId = 'cat-1';
        if (customProduct.categoryName?.trim()) {
          let foundCat = categoriesList.find((c: any) => c.name === customProduct.categoryName.trim());
          if (!foundCat) {
            foundCat = { id: 'cat-' + Date.now(), name: customProduct.categoryName.trim(), code: 'CAT-01', createdAt: Date.now() };
            categoriesList.push(foundCat);
            await setDbData('product_categories', categoriesList);
          }
          catId = foundCat.id;
        }

        productsList.push({
          id: 'prod-' + Date.now(),
          code: customProduct.code?.trim() || '101',
          name: customProduct.name.trim(),
          categoryId: catId,
          unit: customProduct.unit || 'عدد',
          type: customProduct.type || 'goods',
          purchasePrice: Number(customProduct.purchasePrice) || 0,
          sellPrice: Number(customProduct.salePrice) || 0,
          currentStock: Number(customProduct.initialStock) || 0,
          initialStock: Number(customProduct.initialStock) || 0,
          warehouseId: defaultWh.id,
          createdAt: Date.now()
        });
        await setDbData('products', productsList);
      }
    }

    // 9. Generate JWT access token
    const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-jwt-key-2024';
    const payload = {
      id: adminObj.id,
      username: adminObj.username,
      name: adminObj.name,
      role: 'admin'
    };
    const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });

    res.cookie('accessToken', accessToken, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    return res.json({
      success: true,
      message: 'پیکربندی اولیه سیستم با موفقیت به پایان رسید.',
      accessToken,
      user: {
        id: adminObj.id,
        username: adminObj.username,
        name: adminObj.name,
        role: 'admin'
      }
    });

  } catch (err: any) {
    console.error('Error in POST /api/setup/wizard-complete:', err);
    res.status(500).json({ error: err.message || 'خطا در تکمیل راه‌اندازی اولیه سیستم' });
  }
});

router.get('/api/system/info', requireRole(['admin']), (req, res) => {
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

router.post('/api/setup/admin', async (req: any, res) => {
    try {
      const { username, password } = req.body;
      if (!username || !password) return res.status(400).json({ error: 'نام کاربری و کلمه عبور الزامی است.' });
      const users = (await getDbData('users')) || [];

      // If users already exist, only authenticated admin can update admin credentials
      if (Array.isArray(users) && users.length > 0) {
        const currentUserRole = req.user?.role;
        if (currentUserRole !== 'admin') {
          return res.status(403).json({ error: 'سیستم قبلاً راه‌اندازی شده است. تغییر مشخصات مدیر تنها با دسترسی مدیر سیستم امکان‌پذیر است.' });
        }
      }

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

router.post('/api/setup/company', requireRole(['admin']), async (req, res) => {
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


export default router;
