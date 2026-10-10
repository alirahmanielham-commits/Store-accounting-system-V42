import 'dotenv/config';
import { AsyncLocalStorage } from 'node:async_hooks';
import path from 'path';
import fs from 'fs';
import fsPromises from 'fs/promises';
import { Client, Pool } from 'pg';
import { ensurePostgresTables, ensureBusinessesTable } from './schema-sync';
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

export async function getDefaultPgConnectionString(): Promise<string | null> {
    try {
        const configRaw = await fsPromises.readFile(DB_CONFIG_FILE, 'utf-8');
        const config = JSON.parse(configRaw);
        if (config.engine === 'postgres') {
            let connectionString = config.connectionString ? decryptValue(config.connectionString) : null;
            if (!connectionString && config.host && config.user) {
                const host = config.host;
                const user = encodeURIComponent(config.user);
                const auth = config.password ? `${user}:${encodeURIComponent(config.password)}` : user;
                const port = config.port || '5432';
                const db = config.dbName || 'store_db';
                connectionString = `postgresql://${auth}@${host}:${port}/${db}`;
            }
            if (connectionString) {
                return connectionString;
            }
        }
    } catch (_) {}

    if (process.env.SQL_HOST && process.env.SQL_USER) {
        const host = process.env.SQL_HOST;
        const user = encodeURIComponent(process.env.SQL_USER);
        const auth = process.env.SQL_PASSWORD ? `${user}:${encodeURIComponent(process.env.SQL_PASSWORD)}` : user;
        const port = process.env.SQL_PORT || '5432';
        const db = process.env.SQL_DB_NAME || 'store_db';
        return `postgresql://${auth}@${host}:${port}/${db}`;
    }

    if (process.env.DATABASE_URL && process.env.DATABASE_URL.startsWith('postgres') && !process.env.DATABASE_URL.includes('user:pass@localhost') && process.env.DATABASE_URL !== '23') {
        return process.env.DATABASE_URL;
    }

    return null;
}

export async function loadPgPoolForStore(storeId: string) {
    if (activePgPools[storeId]) return;
    if (pendingPgPools[storeId]) {
        await pendingPgPools[storeId];
        return;
    }

    pendingPgPools[storeId] = (async () => {
        if (storeId === 'default') {
            const connStr = await getDefaultPgConnectionString();
            if (connStr) {
                try {
                    const pool = await connectPgDb(connStr);
                    activePgPools['default'] = pool;
                    usePgMap['default'] = true;
                    await ensurePostgresTables(pool);
                    return;
                } catch (err: any) {
                    console.error('PostgreSQL connection failed:', err?.message);
                }
            }
            
            activePgPools['default'] = null;
            usePgMap['default'] = false;
            return;
        }
        
        // For other stores: Isolated PostgreSQL database per business
        try {
            if (!activePgPools['default']) {
                await loadPgPoolForStore('default');
            }
            let business: any = null;
            if (usePgMap['default'] && activePgPools['default']) {
                try {
                    await ensureBusinessesTable(activePgPools['default']);
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

            const connStr = await getDefaultPgConnectionString();
            if (connStr) {
                const url = new URL(connStr);
                const cleanId = storeId.replace(/[^a-zA-Z0-9_]/g, '');
                const dbName = (business && business.db_name) || ('store_' + cleanId);
                url.pathname = `/${dbName}`;
                const pool = await connectPgDb(url.toString());
                activePgPools[storeId] = pool;
                usePgMap[storeId] = true;
                await ensurePostgresTables(pool);
                return;
            }
        } catch(e) { 
            console.error('ERROR in loadPgPoolForStore for store ' + storeId + ':', e); 
        }
        
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
