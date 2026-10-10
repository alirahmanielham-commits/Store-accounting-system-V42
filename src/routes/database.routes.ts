import { usePgMap, activePgPools, storeContext, connectPgDb, getDb, DB_CONFIG_FILE, invalidateStorePgPool, getDefaultPgConnectionString, loadPgPoolForStore } from '../db/connection';
import { Client, Pool } from 'pg';
import { Router } from 'express';
import fs from 'fs';
import fsPromises from 'fs/promises';
import path from 'path';
import { requireRole, requireAuth } from '../middleware/auth.middleware';
import { decryptValue } from '../utils/crypto';
import { getDbData, setDbData, invalidateKvCache } from '../db/kv-store';
import { ensurePostgresTables, ensureBusinessesTable } from '../db/schema-sync';

const router = Router();
const BUSINESSES_FILE = path.join(process.cwd(), 'businesses.json');

async function getStoredBusinesses(): Promise<any[]> {
  try {
    if (fs.existsSync(BUSINESSES_FILE)) {
      const raw = await fsPromises.readFile(BUSINESSES_FILE, 'utf8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.warn('Error reading businesses.json:', e);
  }
  return [];
}

async function saveStoredBusinesses(list: any[]): Promise<void> {
  try {
    await fsPromises.writeFile(BUSINESSES_FILE, JSON.stringify(list, null, 2), 'utf8');
  } catch (e) {
    console.error('Error saving businesses.json:', e);
  }
}

// GET /api/databases: list all available businesses directly from database (businesses table)
router.get('/api/databases', async (req, res) => {
  try {
    let dbsFromTable: any[] = [];
    
    // 1. Check PostgreSQL businesses table if active
    try {
      if (usePgMap['default'] && activePgPools['default']) {
        await ensureBusinessesTable(activePgPools['default']);
        const r = await activePgPools['default'].query("SELECT * FROM businesses ORDER BY created_at ASC");
        dbsFromTable = r.rows;
      }
    } catch (e) {
      console.warn('Failed querying businesses table from postgres:', e);
    }

    // 2. Check Database KV Store 'businesses'
    let dbBusinesses: any[] = [];
    try {
      const kvList = await getDbData('businesses');
      if (Array.isArray(kvList)) dbBusinesses = kvList;
    } catch (_) {}

    // 3. Check filesystem fallback
    const fileBusinesses = await getStoredBusinesses();

    const mergedMap = new Map<string, any>();

    // Always ensure 'default' business exists
    mergedMap.set('default', {
      id: 'default',
      name: 'کسب و کار اصلی',
      companyName: 'کسب و کار اصلی',
      calendarType: 'jalali',
      currency: 'تومان',
      db_type: usePgMap['default'] ? 'postgres' : 'json'
    });

    // Try reading actual default store name from settings
    try {
      if (usePgMap['default'] && activePgPools['default']) {
        const r = await activePgPools['default'].query("SELECT setting_value FROM system_settings WHERE setting_key = 'store_settings' OR setting_key = 'company_profile'");
        if (r.rows.length > 0 && r.rows[0].setting_value) {
          const s = JSON.parse(r.rows[0].setting_value);
          if (s.storeName) mergedMap.get('default')!.name = s.storeName;
          if (s.companyName) mergedMap.get('default')!.companyName = s.companyName;
          if (s.currency) mergedMap.get('default')!.currency = s.currency;
          if (s.calendarType) mergedMap.get('default')!.calendarType = s.calendarType;
        }
      } else {
        const dataFile = path.join(process.cwd(), 'data.json');
        if (fs.existsSync(dataFile)) {
          const raw = await fsPromises.readFile(dataFile, 'utf8');
          const d = JSON.parse(raw);
          if (d.store_settings && d.store_settings.storeName) {
            mergedMap.get('default')!.name = d.store_settings.storeName;
            mergedMap.get('default')!.companyName = d.store_settings.companyName || d.store_settings.storeName;
            if (d.store_settings.currency) mergedMap.get('default')!.currency = d.store_settings.currency;
            if (d.store_settings.calendarType) mergedMap.get('default')!.calendarType = d.store_settings.calendarType;
          }
        }
      }
    } catch (_) {}

    // Add Postgres businesses table records
    for (const db of dbsFromTable) {
      if (db && db.id) {
        mergedMap.set(db.id, {
          id: db.id,
          name: db.name,
          companyName: db.company_name || db.companyName || db.name,
          calendarType: db.calendar_type || db.calendarType || 'jalali',
          currency: db.currency || 'تومان',
          phone: db.phone || '',
          address: db.address || '',
          activityField: db.activity_field || db.activityField || '',
          taxPercent: Number(db.tax_percent) || 0,
          db_type: db.db_type || 'postgres',
          db_name: db.db_name
        });
      }
    }

    // Add Database KV Store businesses
    for (const db of dbBusinesses) {
      if (db && db.id) {
        const existing = mergedMap.get(db.id) || {};
        mergedMap.set(db.id, {
          ...existing,
          id: db.id,
          name: db.name || existing.name,
          companyName: db.companyName || db.company_name || existing.companyName || db.name,
          calendarType: db.calendarType || db.calendar_type || existing.calendarType || 'jalali',
          currency: db.currency || existing.currency || 'تومان',
          phone: db.phone || existing.phone || '',
          address: db.address || existing.address || '',
          activityField: db.activityField || db.activity_field || existing.activityField || '',
          taxPercent: Number(db.taxPercent || db.tax_percent || existing.taxPercent) || 0,
          db_type: db.db_type || existing.db_type || 'json',
          db_name: db.db_name || existing.db_name
        });
      }
    }

    // Add File-stored businesses
    for (const db of fileBusinesses) {
      if (db && db.id) {
        const existing = mergedMap.get(db.id) || {};
        mergedMap.set(db.id, {
          ...existing,
          id: db.id,
          name: db.name || existing.name,
          companyName: db.companyName || db.company_name || existing.companyName || db.name,
          calendarType: db.calendarType || db.calendar_type || existing.calendarType || 'jalali',
          currency: db.currency || existing.currency || 'تومان',
          phone: db.phone || existing.phone || '',
          address: db.address || existing.address || '',
          activityField: db.activityField || db.activity_field || existing.activityField || '',
          taxPercent: Number(db.taxPercent || db.tax_percent || existing.taxPercent) || 0,
          db_type: db.db_type || existing.db_type || 'json',
          db_name: db.db_name || existing.db_name
        });
      }
    }

    const fullList = Array.from(mergedMap.values());

    // Backfill into database businesses table if empty
    if (usePgMap['default'] && activePgPools['default'] && dbsFromTable.length === 0) {
      await ensureBusinessesTable(activePgPools['default']);
      for (const item of fullList) {
        try {
          await activePgPools['default'].query(`
            INSERT INTO businesses (id, name, company_name, calendar_type, currency, phone, address, activity_field, tax_percent, db_type, db_name, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
            ON CONFLICT (id) DO NOTHING
          `, [
            item.id, item.name, item.companyName, item.calendarType, item.currency,
            item.phone, item.address, item.activityField, item.taxPercent,
            item.db_type, item.db_name || '', new Date().toISOString(), new Date().toISOString()
          ]);
        } catch (_) {}
      }
    }

    // Sync to KV store and businesses.json
    try {
      await setDbData('businesses', fullList);
      await saveStoredBusinesses(fullList);
    } catch (_) {}

    res.json({ success: true, databases: fullList });
  } catch (e: any) {
    res.status(500).json({ error: e.message || 'خطا در دریافت لیست کسب و کارها' });
  }
});

// GET /api/databases/:id/test-connection: check if business database is reachable
router.get('/api/databases/:id/test-connection', async (req, res) => {
  try {
    const { id } = req.params;
    if (!activePgPools['default']) {
      await loadPgPoolForStore('default');
    }

    if (id === 'default') {
      if (activePgPools['default']) {
        await activePgPools['default'].query('SELECT 1');
        return res.json({ success: true, message: 'ارتباط با پایگاه داده اصلی PostgreSQL برقرار است.' });
      }
      return res.status(500).json({ error: 'ارتباط با پایگاه داده اصلی برقرار نمی‌باشد.' });
    }

    let targetDbName = '';
    if (activePgPools['default']) {
      try {
        const r = await activePgPools['default'].query("SELECT * FROM businesses WHERE id = $1", [id]);
        if (r.rows.length > 0) {
          targetDbName = r.rows[0].db_name;
        }
      } catch (_) {}
    }

    if (!targetDbName) {
      const cleanId = id.replace(/[^a-zA-Z0-9_]/g, '');
      targetDbName = `store_${cleanId}`;
    }

    const connectionString = await getDefaultPgConnectionString();
    if (connectionString) {
      const url = new URL(connectionString);
      url.pathname = `/${targetDbName}`;
      const pool = new Pool({ connectionString: url.toString(), connectionTimeoutMillis: 4000 });
      await pool.query('SELECT 1');
      await pool.end();
      return res.json({ success: true, message: `ارتباط با دیتابیس «${targetDbName}» با موفقیت برقرار شد.` });
    }

    return res.status(500).json({ error: 'تنظیمات اتصال به PostgreSQL در سیستم یافت نشد.' });
  } catch (e: any) {
    res.status(500).json({ error: e.message || 'خطا در تست ارتباط با کسب و کار' });
  }
});

// POST /api/databases: create a new business
router.post('/api/databases', async (req, res) => {
  try {
    const { 
      name, 
      companyName, 
      activityField, 
      currency, 
      calendarType, 
      phone, 
      address, 
      taxPercent, 
      fiscalYear, 
      bankAccount, 
      cashbox, 
      warehouse, 
      starterPack, 
      customPerson, 
      customProduct 
    } = req.body;
    const calType = calendarType || 'jalali';
    if (!name || !String(name).trim()) {
      return res.status(400).json({ error: 'نام کسب و کار الزامی است' });
    }

    const cleanName = String(name).trim();
    const cleanCompanyName = (companyName && String(companyName).trim()) || cleanName;
    const cleanCurrency = currency || (calType === 'jalali' ? 'تومان' : 'USD');
    const id = 'store_' + Math.random().toString(36).substring(2, 6) + '_' + Date.now().toString(36);
    const cleanId = id.replace(/[^a-zA-Z0-9_]/g, '');
    let actualDbType = 'postgres';
    let dbNameForBusiness = `store_${cleanId}`;

    // Prepare default fiscal year based on calendar type
    const now = new Date();
    const defaultYear = calType === 'jalali' ? (now.getFullYear() - 621) : now.getFullYear();
    const fyStartDate = fiscalYear?.startDate?.trim() || (calType === 'jalali' ? `${defaultYear}/01/01` : `${defaultYear}-01-01`);
    const fyEndDate = fiscalYear?.endDate?.trim() || (calType === 'jalali' ? `${defaultYear}/12/29` : `${defaultYear}-12-31`);
    const fyName = fiscalYear?.name?.trim() || (calType === 'jalali' ? `سال مالی ${defaultYear}` : `Fiscal Year ${defaultYear}`);
    const fyCode = fiscalYear?.code?.trim() || `FY-${defaultYear}`;
    const fyDesc = fiscalYear?.description?.trim() || 'سال مالی افتتاحیه کسب و کار';

    const defaultFiscalYear = {
      id: 'fy-' + Date.now(),
      name: fyName,
      code: fyCode,
      startDate: fyStartDate,
      endDate: fyEndDate,
      description: fyDesc,
      status: 'open',
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    const defaultWh = {
      id: 'wh-main',
      name: warehouse?.name?.trim() || 'انبار مرکزی',
      code: warehouse?.code?.trim() || 'WH-01',
      address: warehouse?.address?.trim() || address || 'دفتر و انبار مرکزی',
      isDefault: true,
      createdAt: Date.now()
    };

    const bankBal = Number(bankAccount?.initialBalance) || 0;
    const defaultBank = {
      id: 'acc-main-' + Date.now(),
      title: bankAccount?.title?.trim() || bankAccount?.bankName?.trim() || 'حساب بانکی اصلی',
      bankName: bankAccount?.bankName?.trim() || 'بانک ملت',
      branchName: bankAccount?.branchName?.trim() || bankAccount?.branch?.trim() || '',
      accountNumber: bankAccount?.accountNumber?.trim() || '',
      cardNumber: bankAccount?.cardNumber?.trim() || '',
      shebaNumber: bankAccount?.shebaNumber?.trim() || '',
      sheba: bankAccount?.shebaNumber?.trim() || '',
      accountHolder: bankAccount?.accountHolder?.trim() || bankAccount?.owner?.trim() || cleanCompanyName,
      balance: bankBal,
      initialBalance: bankBal,
      isDefault: true,
      status: 'active',
      createdAt: Date.now()
    };

    const cashBal = Number(cashbox?.initialBalance) || 0;
    const defaultCashbox = {
      id: 'cb-main-' + Date.now(),
      name: cashbox?.name?.trim() || 'صندوق مرکزی',
      manager: cashbox?.manager?.trim() || '',
      accountNumber: cashbox?.accountNumber?.trim() || '101',
      description: `صندوق پیش‌فرض کسب و کار ${cleanName}`,
      balance: cashBal,
      initialBalance: cashBal,
      isDefault: true,
      status: 'active',
      createdAt: Date.now()
    };

    const initialCategories = [
      { id: 'cat-general', name: 'کالاهای عمومی', code: 'CAT-01', createdAt: Date.now() },
      { id: 'cat-service', name: 'خدمات', code: 'CAT-02', createdAt: Date.now() }
    ];

    const initialPersons: any[] = [];
    const initialProducts: any[] = [];

    if (starterPack) {
      initialPersons.push({
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
      initialPersons.push({
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

      initialProducts.push({
        id: 'prod-sample-1',
        code: '101',
        barcode: '626000000101',
        name: 'کالای نمونه شماره ۱',
        categoryId: 'cat-general',
        unit: 'عدد',
        type: 'goods',
        purchasePrice: 120000,
        sellPrice: 180000,
        currentStock: 50,
        initialStock: 50,
        warehouseId: defaultWh.id,
        createdAt: Date.now()
      });
    } else {
      if (customPerson && customPerson.name?.trim()) {
        const isLegal = customPerson.personType === 'legal' || customPerson.personType === 'company';
        initialPersons.push({
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
      }
      if (customProduct && customProduct.name?.trim()) {
        initialProducts.push({
          id: 'prod-' + Date.now(),
          code: '101',
          name: customProduct.name.trim(),
          categoryId: 'cat-general',
          unit: customProduct.unit || 'عدد',
          type: 'goods',
          purchasePrice: Number(customProduct.purchasePrice) || 0,
          sellPrice: Number(customProduct.salePrice) || 0,
          currentStock: Number(customProduct.initialStock) || 0,
          initialStock: Number(customProduct.initialStock) || 0,
          warehouseId: defaultWh.id,
          createdAt: Date.now()
        });
      }
    }

    // 1. Provision separate PostgreSQL database for the business
    const connectionString = await getDefaultPgConnectionString();
    if (!connectionString) {
      return res.status(500).json({ error: 'اتصال به سرور PostgreSQL یافت نشد. سیستم فقط با اتصال به PostgreSQL کار می‌کند.' });
    }

    try {
      const rootUrl = new URL(connectionString);
      rootUrl.pathname = '/postgres';
      const rootClient = new Client({ connectionString: rootUrl.toString(), connectionTimeoutMillis: 5000 });
      await rootClient.connect();
      try {
        await rootClient.query(`CREATE DATABASE "${dbNameForBusiness}"`);
      } catch (createErr: any) {
        if (createErr.code !== '42P04') {
          console.warn('CREATE DATABASE notice:', createErr.message);
        }
      }
      await rootClient.end();
      actualDbType = 'postgres';
    } catch (createErr) {
      console.warn('Could not CREATE DATABASE, attempting direct pool connect:', createErr);
    }

    // Ensure default pool is active
    if (!activePgPools['default']) {
      await loadPgPoolForStore('default');
    }

    // 2. Register business in the central businesses table in the MAIN database
    if (activePgPools['default']) {
      await ensureBusinessesTable(activePgPools['default']);

      await activePgPools['default'].query(`
        INSERT INTO businesses (id, name, company_name, calendar_type, currency, phone, address, activity_field, tax_percent, db_type, db_name, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
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
        id, cleanName, cleanCompanyName, calType, cleanCurrency,
        phone || '', address || '', activityField || 'خرده‌فروشی و بازرگانی',
        Number(taxPercent) || 0, 'postgres', dbNameForBusiness,
        new Date().toISOString(), new Date().toISOString()
      ]);
    }

    // 3. Connect to the isolated new PostgreSQL database and seed all initial business structures
    try {
      const newDbUrl = new URL(connectionString);
      newDbUrl.pathname = '/' + dbNameForBusiness;
      const initPool = await connectPgDb(newDbUrl.toString());
      await ensurePostgresTables(initPool);

      await initPool.query('CREATE TABLE IF NOT EXISTS system_settings (setting_key VARCHAR PRIMARY KEY, setting_value TEXT)');
      const initPayload = JSON.stringify({ 
        storeName: cleanName, 
        companyName: cleanCompanyName,
        activityField: activityField || 'خرده‌فروشی و بازرگانی',
        currency: cleanCurrency,
        calendarType: calType,
        phone: phone || '',
        address: address || '',
        taxPercent: Number(taxPercent) || 0,
        isSetup: true,
        createdAt: Date.now(),
        updatedAt: Date.now()
      });
      await initPool.query(
        'INSERT INTO system_settings (setting_key, setting_value) VALUES ($1, $2) ON CONFLICT(setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value',
        ['company_profile', initPayload]
      );
      await initPool.query(
        'INSERT INTO system_settings (setting_key, setting_value) VALUES ($1, $2) ON CONFLICT(setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value',
        ['store_settings', initPayload]
      );

      // Seed initial fiscal year
      try {
        await initPool.query(`
          INSERT INTO financial_years (id, name, code, start_date, end_date, description, status, created_at, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          ON CONFLICT(id) DO NOTHING
        `, [
          defaultFiscalYear.id, defaultFiscalYear.name, defaultFiscalYear.code,
          defaultFiscalYear.startDate, defaultFiscalYear.endDate, defaultFiscalYear.description,
          defaultFiscalYear.status, defaultFiscalYear.createdAt, defaultFiscalYear.updatedAt
        ]);
      } catch (_) {}

      // Seed default warehouse
      try {
        await initPool.query(`
          INSERT INTO warehouses (id, name, code, address, is_default, created_at)
          VALUES ($1, $2, $3, $4, $5, $6)
          ON CONFLICT(id) DO NOTHING
        `, [defaultWh.id, defaultWh.name, defaultWh.code, defaultWh.address, true, defaultWh.createdAt]);
      } catch (_) {}

      // Seed bank account
      try {
        await initPool.query(`
          INSERT INTO accounts (id, title, bank_name, branch_name, account_number, card_number, sheba_number, account_holder, balance, initial_balance, is_default, status, created_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
          ON CONFLICT(id) DO NOTHING
        `, [
          defaultBank.id, defaultBank.title, defaultBank.bankName, defaultBank.branchName,
          defaultBank.accountNumber, defaultBank.cardNumber, defaultBank.shebaNumber,
          defaultBank.accountHolder, defaultBank.balance, defaultBank.initialBalance,
          true, defaultBank.status, defaultBank.createdAt
        ]);
      } catch (_) {}

      // Seed cashbox
      try {
        await initPool.query(`
          INSERT INTO cashboxes (id, name, manager, account_number, description, balance, initial_balance, is_default, status, created_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          ON CONFLICT(id) DO NOTHING
        `, [
          defaultCashbox.id, defaultCashbox.name, defaultCashbox.manager, defaultCashbox.accountNumber,
          defaultCashbox.description, defaultCashbox.balance, defaultCashbox.initialBalance,
          true, defaultCashbox.status, defaultCashbox.createdAt
        ]);
      } catch (_) {}

      // Seed categories
      for (const cat of initialCategories) {
        try {
          await initPool.query(`
            INSERT INTO product_categories (id, name, code, created_at)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT(id) DO NOTHING
          `, [cat.id, cat.name, cat.code, cat.createdAt]);
        } catch (_) {}
      }

      // Seed persons
      for (const p of initialPersons) {
        try {
          await initPool.query(`
            INSERT INTO persons (id, name, alias, person_type, role, person_code, phone, initial_balance, initial_balance_type, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            ON CONFLICT(id) DO NOTHING
          `, [p.id, p.name, p.alias, p.personType, p.role, p.personCode, p.phone, p.initialBalance, p.initialBalanceType, p.createdAt]);
        } catch (_) {}
      }

      // Seed products
      for (const pr of initialProducts) {
        try {
          await initPool.query(`
            INSERT INTO products (id, code, barcode, name, category_id, unit, type, purchase_price, sell_price, current_stock, initial_stock, warehouse_id, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
            ON CONFLICT(id) DO NOTHING
          `, [
            pr.id, pr.code, pr.barcode || '', pr.name, pr.categoryId, pr.unit, pr.type,
            pr.purchasePrice, pr.sellPrice, pr.currentStock, pr.initialStock, pr.warehouseId, pr.createdAt
          ]);
        } catch (_) {}
      }

      await initPool.end();
    } catch (initErr) {
      console.warn('Seeding isolated postgres DB error:', initErr);
    }

    // 4. Update memory registry
    const newEntry = {
      id,
      name: cleanName,
      companyName: cleanCompanyName,
      company_name: cleanCompanyName,
      db_type: 'postgres',
      db_name: dbNameForBusiness,
      calendarType: calType,
      calendar_type: calType,
      currency: cleanCurrency,
      phone: phone || '',
      address: address || '',
      activityField: activityField || 'خرده‌فروشی و بازرگانی',
      activity_field: activityField || 'خرده‌فروشی و بازرگانی',
      taxPercent: Number(taxPercent) || 0,
      tax_percent: Number(taxPercent) || 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    try {
      let kvBusinesses = (await getDbData('businesses')) || [];
      if (!Array.isArray(kvBusinesses)) kvBusinesses = [];
      const exIdx = kvBusinesses.findIndex((b: any) => b.id === id);
      if (exIdx >= 0) kvBusinesses[exIdx] = { ...kvBusinesses[exIdx], ...newEntry };
      else kvBusinesses.push(newEntry);
      await setDbData('businesses', kvBusinesses);
    } catch (_) {}

    const fileList = await getStoredBusinesses();
    const flIdx = fileList.findIndex((b: any) => b.id === id);
    if (flIdx >= 0) fileList[flIdx] = { ...fileList[flIdx], ...newEntry };
    else fileList.push(newEntry);
    await saveStoredBusinesses(fileList);

    // Invalidate cached pool so it connects fresh on selection
    invalidateStorePgPool(id);
    invalidateKvCache(id);

    return res.json({
      success: true,
      message: 'کسب و کار با سال مالی و پایگاه داده مجزای PostgreSQL با موفقیت ایجاد شد.',
      database: {
        id,
        name: cleanName,
        companyName: cleanCompanyName,
        db_type: 'postgres',
        db_name: dbNameForBusiness,
        calendarType: calType,
        currency: cleanCurrency,
        fiscalYear: defaultFiscalYear
      }
    });
  } catch (e: any) {
    console.error('Error in POST /api/databases:', e);
    res.status(500).json({ error: e.message || 'خطا در ایجاد کسب و کار جدید' });
  }
});

// PUT /api/databases/:id: rename / update business
router.put('/api/databases/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, companyName, activityField, currency, calendarType, phone, address, taxPercent } = req.body;
    if (!name || !String(name).trim()) {
      return res.status(400).json({ error: 'نام کسب و کار الزامی است' });
    }
    const cleanName = String(name).trim();
    const cleanCompanyName = companyName ? String(companyName).trim() : cleanName;

    // 1. Update in Postgres businesses table
    if (usePgMap['default'] && activePgPools['default']) {
      try {
        await activePgPools['default'].query(`
          UPDATE businesses 
          SET name = $1, company_name = $2, updated_at = $3
          WHERE id = $4
        `, [cleanName, cleanCompanyName, new Date().toISOString(), id]);
      } catch (_) {}
    }

    // 2. Update in KV Store 'businesses'
    try {
      let kvList = (await getDbData('businesses')) || [];
      if (Array.isArray(kvList)) {
        kvList = kvList.map((b: any) => b.id === id ? { 
          ...b, 
          name: cleanName, 
          companyName: cleanCompanyName,
          company_name: cleanCompanyName,
          updatedAt: new Date().toISOString() 
        } : b);
        await setDbData('businesses', kvList);
      }
    } catch (_) {}

    // 3. Update in businesses.json
    const fileList = await getStoredBusinesses();
    const found = fileList.find((b: any) => b.id === id);
    if (found) {
      found.name = cleanName;
      found.companyName = cleanCompanyName;
      found.updatedAt = new Date().toISOString();
      await saveStoredBusinesses(fileList);
    }

    // 4. Update in store settings file or Postgres DB
    const storeDataFile = id === 'default' ? path.join(process.cwd(), 'data.json') : path.join(process.cwd(), `data_${id}.json`);
    if (fs.existsSync(storeDataFile)) {
      try {
        const raw = await fsPromises.readFile(storeDataFile, 'utf8');
        const d = JSON.parse(raw);
        if (d.store_settings) {
          d.store_settings.storeName = cleanName;
          d.store_settings.companyName = cleanCompanyName;
        }
        if (d.company_profile) {
          d.company_profile.storeName = cleanName;
          d.company_profile.companyName = cleanCompanyName;
        }
        await fsPromises.writeFile(storeDataFile, JSON.stringify(d, null, 2), 'utf8');
      } catch (_) {}
    }

    res.json({ success: true, database: { id, name: cleanName, companyName: cleanCompanyName } });
  } catch (e: any) {
    res.status(500).json({ error: e.message || 'خطا در بروزرسانی نام کسب و کار' });
  }
});

// DELETE /api/databases/:id: delete a business
router.delete('/api/databases/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (id === 'default') {
      return res.status(400).json({ error: 'کسب و کار اصلی قابل حذف نمی‌باشد.' });
    }

    // 1. Delete from Postgres businesses table
    if (usePgMap['default'] && activePgPools['default']) {
      try {
        await activePgPools['default'].query("DELETE FROM businesses WHERE id = $1", [id]);
      } catch (_) {}
    }

    // 2. Delete from KV Store 'businesses'
    try {
      let kvList = (await getDbData('businesses')) || [];
      if (Array.isArray(kvList)) {
        kvList = kvList.filter((b: any) => b.id !== id);
        await setDbData('businesses', kvList);
      }
    } catch (_) {}

    // 3. Delete from businesses.json
    let fileList = await getStoredBusinesses();
    fileList = fileList.filter((b: any) => b.id !== id);
    await saveStoredBusinesses(fileList);

    // 4. Delete isolated store file
    const storeDataFile = path.join(process.cwd(), `data_${id}.json`);
    if (fs.existsSync(storeDataFile)) {
      try {
        await fsPromises.unlink(storeDataFile);
      } catch (_) {}
    }

    // Invalidate any loaded pool
    invalidateStorePgPool(id);

    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message || 'خطا در حذف کسب و کار' });
  }
});

export default router;
