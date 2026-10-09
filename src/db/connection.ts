import 'dotenv/config';
import { AsyncLocalStorage } from 'node:async_hooks';
import path from 'path';
import fsPromises from 'fs/promises';
import { Client, Pool } from 'pg';
import { ensurePostgresTables } from './schema-sync';
import { decryptValue } from '../utils/crypto';

export const storeContext = new AsyncLocalStorage<string>();
export const SQLITE_FILE = path.join(process.cwd(), 'database.sqlite');
export const DB_CONFIG_FILE = path.join(process.cwd(), 'db_config.json');
export const DATA_FILE = path.join(process.cwd(), 'database.json');
export const dbs: Record<string, any> = {};
export const activePgPools: Record<string, any> = {};
export const usePgMap: Record<string, boolean> = {};
export const pendingPgPools: Record<string, Promise<void>> = {};

export function getDb() {
  const storeId = storeContext.getStore() || 'default';
  if (!dbs[storeId]) {
    const dbFile = storeId === 'default' ? SQLITE_FILE : path.join(process.cwd(), `database_${storeId}.sqlite`);
    // NOTE: This is strictly for one-time migration purposes.
    
    throw new Error('SQLite is permanently disabled. Only PostgreSQL must be used.');
  }
  return dbs[storeId];
}
export function invalidateStorePgPool(storeId?: string) {
    if (storeId) {
        delete activePgPools[storeId];
        delete usePgMap[storeId];
        delete pendingPgPools[storeId];
    } else {
        Object.keys(activePgPools).forEach(k => delete activePgPools[k]);
        Object.keys(usePgMap).forEach(k => delete usePgMap[k]);
        Object.keys(pendingPgPools).forEach(k => delete pendingPgPools[k]);
    }
}

export async function loadPgPoolForStore(storeId: string) {
    if (activePgPools[storeId]) return;
    if (pendingPgPools[storeId]) {
        await pendingPgPools[storeId];
        return;
    }

    pendingPgPools[storeId] = (async () => {
        if (storeId === 'default') {
            try {
                const configRaw = await fsPromises.readFile(DB_CONFIG_FILE, 'utf-8');
                const config = JSON.parse(configRaw);
                const connectionString = decryptValue(config.connectionString);
                if (config.engine === 'postgres' && connectionString) {
                    const pool = await connectPgDb(connectionString);
                    activePgPools['default'] = pool;
                    usePgMap['default'] = true;
                    await ensurePostgresTables(pool);
                    return;
                }
            } catch(e) { /* ignore config file error */ }
            
            if (process.env.SQL_HOST && process.env.SQL_USER) {
                try {
                    const pool = new Pool({
                        host: process.env.SQL_HOST,
                        user: process.env.SQL_USER,
                        password: process.env.SQL_PASSWORD,
                        database: process.env.SQL_DB_NAME,
                        connectionTimeoutMillis: 2000,
                    });
                    await pool.query('SELECT 1');
                    activePgPools['default'] = pool;
                    usePgMap['default'] = true;
                    await ensurePostgresTables(pool);
                    return;
                } catch(err) {
                    console.warn('Postgres connection via SQL_HOST failed, using local database storage:', (err as any)?.message);
                }
            } else if (process.env.DATABASE_URL && process.env.DATABASE_URL.startsWith('postgres') && !process.env.DATABASE_URL.includes('user:pass@localhost')) {
                try {
                    const pool = await connectPgDb(process.env.DATABASE_URL);
                    activePgPools['default'] = pool;
                    usePgMap['default'] = true;
                    await ensurePostgresTables(pool);
                    return;
                } catch(err) {
                    console.warn('Postgres connection via DATABASE_URL failed, using local database storage:', (err as any)?.message);
                }
            }
            
            activePgPools['default'] = null;
            usePgMap['default'] = false;
            return;
        }
        
        // For other stores
        try {
            if (!activePgPools['default']) {
                await loadPgPoolForStore('default');
            }
            let business = null;
            if (usePgMap['default'] && activePgPools['default']) {
                try {
                    const res = await activePgPools['default'].query("SELECT * FROM businesses WHERE id = $1", [storeId]);
                    if (res.rows.length > 0) business = res.rows[0];
                } catch (_) {}
            }
            
            if (!business) {
                try {
                    const businessesFile = path.join(process.cwd(), 'businesses.json');
                    const raw = await fsPromises.readFile(businessesFile, 'utf8');
                    const list = JSON.parse(raw);
                    if (Array.isArray(list)) {
                        business = list.find((b: any) => b.id === storeId);
                    }
                } catch (_) {}
            }

            if (!business) {
                try {
                    const dataFile = path.join(process.cwd(), 'data.json');
                    if (fs.existsSync(dataFile)) {
                        const raw = await fsPromises.readFile(dataFile, 'utf8');
                        const d = JSON.parse(raw);
                        if (Array.isArray(d.businesses)) {
                            business = d.businesses.find((b: any) => b.id === storeId);
                        }
                    }
                } catch (_) {}
            }
            
            if (business && business.db_type === 'postgres') {
                const configRaw = await fsPromises.readFile(DB_CONFIG_FILE, 'utf-8');
                const config = JSON.parse(configRaw);
                const connectionString = decryptValue(config.connectionString);
                if (config.engine === 'postgres' && connectionString) {
                    const url = new URL(connectionString);
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

export function getActivePgPool() {
    const storeId = storeContext.getStore() || 'default';
    return activePgPools[storeId] || null;
}

export function isPgActive() {
    const storeId = storeContext.getStore() || 'default';
    return !!usePgMap[storeId];
}

export async function connectPgDb(connectionString: string) {
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
