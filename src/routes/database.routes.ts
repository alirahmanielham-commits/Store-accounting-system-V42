import { usePgMap, activePgPools, storeContext, connectPgDb, getDb, DB_CONFIG_FILE } from '../db/connection';
import { Client, Pool } from 'pg';
import { Router } from 'express';
import fs from 'fs';
import fsPromises from 'fs/promises';
import path from 'path';
import { requireRole, requireAuth } from '../middleware/auth.middleware';
import { decryptValue } from '../utils/crypto';

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

// GET /api/databases: list all available businesses
router.get('/api/databases', async (req, res) => {
  try {
    let dbsFromTable: any[] = [];
    try {
      if (usePgMap['default'] && activePgPools['default']) {
        await activePgPools['default'].query(`
          CREATE TABLE IF NOT EXISTS businesses (
            id VARCHAR PRIMARY KEY,
            name VARCHAR NOT NULL,
            db_type VARCHAR DEFAULT 'postgres',
            db_host VARCHAR,
            db_port VARCHAR,
            db_name VARCHAR,
            db_user VARCHAR,
            db_password VARCHAR
          )
        `);
        const r = await activePgPools['default'].query("SELECT id, name, db_type, db_name FROM businesses");
        dbsFromTable = r.rows;
      }
    } catch (e) {
      console.warn('Failed querying businesses table from postgres:', e);
    }

    const fileBusinesses = await getStoredBusinesses();
    const mergedMap = new Map<string, any>();

    // 1. Always ensure 'default' business exists
    mergedMap.set('default', {
      id: 'default',
      name: 'کسب و کار اصلی',
      db_type: usePgMap['default'] ? 'postgres' : 'json'
    });

    // Try reading actual default store name from settings
    try {
      if (usePgMap['default'] && activePgPools['default']) {
        const r = await activePgPools['default'].query("SELECT value FROM local_data WHERE key = 'store_settings'");
        if (r.rows.length > 0 && r.rows[0].value) {
          const s = JSON.parse(r.rows[0].value);
          if (s.storeName) mergedMap.get('default')!.name = s.storeName;
        }
      } else {
        const dataFile = path.join(process.cwd(), 'data.json');
        if (fs.existsSync(dataFile)) {
          const raw = await fsPromises.readFile(dataFile, 'utf8');
          const d = JSON.parse(raw);
          if (d.store_settings && d.store_settings.storeName) {
            mergedMap.get('default')!.name = d.store_settings.storeName;
          }
        }
      }
    } catch (_) {}

    // 2. Add Postgres businesses (sanitized without credentials)
    for (const db of dbsFromTable) {
      if (db && db.id) {
        mergedMap.set(db.id, {
          id: db.id,
          name: db.name,
          db_type: db.db_type || 'postgres'
        });
      }
    }

    // 3. Add File-stored businesses
    for (const db of fileBusinesses) {
      if (db && db.id) {
        mergedMap.set(db.id, {
          id: db.id,
          name: db.name,
          db_type: db.db_type || 'json'
        });
      }
    }

    res.json({ success: true, databases: Array.from(mergedMap.values()) });
  } catch (e: any) {
    res.status(500).json({ error: e.message || 'خطا در دریافت لیست کسب و کارها' });
  }
});

// GET /api/databases/:id/test-connection: check if business database is reachable
router.get('/api/databases/:id/test-connection', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    if (id === 'default') {
      return res.json({ success: true });
    }

    // Test Postgres pool if configured
    if (usePgMap['default'] && activePgPools['default']) {
      try {
        const r = await activePgPools['default'].query("SELECT * FROM businesses WHERE id = $1", [id]);
        if (r.rows.length > 0 && r.rows[0].db_type === 'postgres') {
          const configRaw = await fsPromises.readFile(DB_CONFIG_FILE, 'utf-8');
          const config = JSON.parse(configRaw);
          const connectionString = decryptValue(config.connectionString);
          if (connectionString) {
            const url = new URL(connectionString);
            url.pathname = `/${r.rows[0].db_name}`;
            const pool = new Pool({ connectionString: url.toString(), connectionTimeoutMillis: 3000 });
            await pool.query('SELECT 1');
            await pool.end();
            return res.json({ success: true });
          }
        }
      } catch (err: any) {
        console.warn('Postgres connection test failed, checking file fallback:', err?.message);
      }
    }

    // File-based check
    const storeFile = path.join(process.cwd(), `data_${id}.json`);
    const fileList = await getStoredBusinesses();
    const exists = fileList.some((b: any) => b.id === id) || fs.existsSync(storeFile);

    if (exists) {
      return res.json({ success: true });
    }

    return res.status(404).json({ error: 'کسب و کار مورد نظر یافت نشد' });
  } catch (e: any) {
    res.status(500).json({ error: e.message || 'خطا در تست ارتباط با کسب و کار' });
  }
});

// POST /api/databases: create a new business
router.post('/api/databases', requireAuth, async (req, res) => {
  try {
    const { name, calendarType } = req.body;
    const calType = calendarType || 'jalali';
    if (!name || !String(name).trim()) {
      return res.status(400).json({ error: 'نام کسب و کار الزامی است' });
    }

    const cleanName = String(name).trim();
    const id = 'store_' + Math.random().toString(36).substring(2, 6) + '_' + Date.now().toString(36);
    let actualDbType = 'json';
    let dbNameForBusiness = `store_${id}`.replace(/[^a-zA-Z0-9_]/g, '');

    // 1. Try PostgreSQL provisioning if PostgreSQL is available
    if (usePgMap['default'] && activePgPools['default']) {
      try {
        let connectionString = '';
        try {
          const configRaw = await fsPromises.readFile(DB_CONFIG_FILE, 'utf-8');
          const config = JSON.parse(configRaw);
          connectionString = decryptValue(config.connectionString);
        } catch (_) {}

        if (!connectionString && process.env.DATABASE_URL && process.env.DATABASE_URL.startsWith('postgres')) {
          connectionString = process.env.DATABASE_URL;
        }

        if (connectionString) {
          try {
            const url = new URL(connectionString);
            url.pathname = '/postgres';
            const client = new Client({ connectionString: url.toString(), connectionTimeoutMillis: 4000 });
            await client.connect();
            await client.query(`CREATE DATABASE "${dbNameForBusiness}"`);
            await client.end();
            actualDbType = 'postgres';
          } catch (createErr) {
            console.warn('Could not CREATE DATABASE, using single DB table segregation:', createErr);
          }
        }

        await activePgPools['default'].query(`
          CREATE TABLE IF NOT EXISTS businesses (
            id VARCHAR PRIMARY KEY,
            name VARCHAR NOT NULL,
            db_type VARCHAR DEFAULT 'postgres',
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
        `, [id, cleanName, actualDbType, '', '', actualDbType === 'postgres' ? dbNameForBusiness : '', '', '']);

        if (actualDbType === 'postgres' && connectionString) {
          try {
            const newUrl = new URL(connectionString);
            newUrl.pathname = '/' + dbNameForBusiness;
            const initPool = new Pool({ connectionString: newUrl.toString() });
            await initPool.query('CREATE TABLE IF NOT EXISTS system_settings (setting_key VARCHAR PRIMARY KEY, setting_value TEXT)');
            const initPayload = JSON.stringify({ storeName: cleanName, calendarType: calType });
            await initPool.query(
              'INSERT INTO system_settings (setting_key, setting_value) VALUES ($1, $2) ON CONFLICT(setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value',
              ['company_profile', initPayload]
            );
            await initPool.end();
          } catch (initErr) {
            console.warn('Failed to seed system_settings on new postgres DB:', initErr);
          }
        }
      } catch (pgErr) {
        console.warn('Postgres business setup skipped or encountered error:', pgErr);
      }
    }

    // 2. Persist to file-based registry & isolated data file
    const fileList = await getStoredBusinesses();
    const newEntry = {
      id,
      name: cleanName,
      db_type: actualDbType,
      db_name: actualDbType === 'postgres' ? dbNameForBusiness : undefined,
      calendarType: calType,
      createdAt: new Date().toISOString()
    };
    fileList.push(newEntry);
    await saveStoredBusinesses(fileList);

    // Initialize isolated JSON store file
    const storeDataFile = path.join(process.cwd(), `data_${id}.json`);
    const initialData: Record<string, any> = {
      company_profile: {
        storeName: cleanName,
        calendarType: calType
      },
      store_settings: {
        storeName: cleanName,
        calendarType: calType,
        currency: 'ریال'
      }
    };
    await fsPromises.writeFile(storeDataFile, JSON.stringify(initialData, null, 2), 'utf8');

    return res.json({
      success: true,
      database: {
        id,
        name: cleanName,
        db_type: actualDbType
      }
    });
  } catch (e: any) {
    console.error('Error in POST /api/databases:', e);
    res.status(500).json({ error: e.message || 'خطا در ایجاد کسب و کار جدید' });
  }
});

// PUT /api/databases/:id: rename / update business
router.put('/api/databases/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    if (!name || !String(name).trim()) {
      return res.status(400).json({ error: 'نام کسب و کار الزامی است' });
    }
    const cleanName = String(name).trim();

    // 1. Update in Postgres
    if (usePgMap['default'] && activePgPools['default']) {
      try {
        await activePgPools['default'].query(`UPDATE businesses SET name = $1 WHERE id = $2`, [cleanName, id]);
      } catch (_) {}
    }

    // 2. Update in businesses.json
    const fileList = await getStoredBusinesses();
    const found = fileList.find((b: any) => b.id === id);
    if (found) {
      found.name = cleanName;
      await saveStoredBusinesses(fileList);
    }

    // 3. Update in store settings file
    const storeDataFile = id === 'default' ? path.join(process.cwd(), 'data.json') : path.join(process.cwd(), `data_${id}.json`);
    if (fs.existsSync(storeDataFile)) {
      try {
        const raw = await fsPromises.readFile(storeDataFile, 'utf8');
        const d = JSON.parse(raw);
        if (d.store_settings) d.store_settings.storeName = cleanName;
        if (d.company_profile) d.company_profile.storeName = cleanName;
        await fsPromises.writeFile(storeDataFile, JSON.stringify(d, null, 2), 'utf8');
      } catch (_) {}
    }

    res.json({ success: true, database: { id, name: cleanName } });
  } catch (e: any) {
    res.status(500).json({ error: e.message || 'خطا در بروزرسانی نام کسب و کار' });
  }
});

// DELETE /api/databases/:id: delete a business
router.delete('/api/databases/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    if (id === 'default') {
      return res.status(400).json({ error: 'کسب و کار اصلی قابل حذف نمی‌باشد.' });
    }

    // 1. Delete from Postgres
    if (usePgMap['default'] && activePgPools['default']) {
      try {
        await activePgPools['default'].query("DELETE FROM businesses WHERE id = $1", [id]);
      } catch (_) {}
    }

    // 2. Delete from businesses.json
    let fileList = await getStoredBusinesses();
    fileList = fileList.filter((b: any) => b.id !== id);
    await saveStoredBusinesses(fileList);

    // 3. Delete isolated store file
    const storeDataFile = path.join(process.cwd(), `data_${id}.json`);
    if (fs.existsSync(storeDataFile)) {
      try {
        await fsPromises.unlink(storeDataFile);
      } catch (_) {}
    }

    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message || 'خطا در حذف کسب و کار' });
  }
});

export default router;
