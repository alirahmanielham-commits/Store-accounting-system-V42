const fs = require('fs');
const lines = fs.readFileSync('server.ts', 'utf8').split('\n');

function slice(start, end) {
  return lines.slice(start - 1, end).join('\n');
}

function write(path, content) {
    fs.mkdirSync(path.split('/').slice(0,-1).join('/'), { recursive: true });
    fs.writeFileSync(path, content);
    console.log('Wrote', path);
}

const connectionCode = `import 'dotenv/config';
import { AsyncLocalStorage } from 'node:async_hooks';
import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import fsPromises from 'fs/promises';
import { Client, Pool } from 'pg';
import { ensurePostgresTables } from './schema-sync';

export const storeContext = new AsyncLocalStorage<string>();
const SQLITE_FILE = path.join(process.cwd(), 'database.sqlite');
export const DB_CONFIG_FILE = path.join(process.cwd(), 'db_config.json');
export const dbs: Record<string, any> = {};
export const activePgPools: Record<string, any> = {};
export const usePgMap: Record<string, boolean> = {};
export const pendingPgPools: Record<string, Promise<void>> = {};

${slice(32,41).replace('function getDb', 'export function getDb')}
${slice(47,130).replace('async function loadPgPoolForStore', 'export async function loadPgPoolForStore')}
${slice(131,135).replace('function getActivePgPool', 'export function getActivePgPool')}
${slice(136,140).replace('function isPgActive', 'export function isPgActive')}
${slice(203,224).replace('async function connectPgDb', 'export async function connectPgDb')}
`;

write('src/db/connection.ts', connectionCode);

const schemaSyncCode = `import { getActivePgPool, isPgActive } from './connection';

export const KNOWN_TABLES = [${slice(143,166).replace('const KNOWN_TABLES = [', '')}
export const tableSchemas = new Map<string, Set<string>>();

${slice(172,201).replace('async function syncTableSchema', 'export async function syncTableSchema')}
${slice(497,515).replace('async function ensurePostgresTables', 'export async function ensurePostgresTables')}
`;

write('src/db/schema-sync.ts', schemaSyncCode);

const kvStoreCode = `import { getDb, isPgActive, getActivePgPool } from './connection';
import { KNOWN_TABLES, tableSchemas, syncTableSchema } from './schema-sync';

${slice(227,280).replace('async function innerGetDbData', 'export async function innerGetDbData')}
${slice(281,350).replace('async function innerSetDbData', 'export async function innerSetDbData')}
${slice(351,370).replace('async function handleRelations', 'export async function handleRelations')}
${slice(371,394).replace('async function getDbData', 'export async function getDbData')}
${slice(395,445).replace('async function setDbData', 'export async function setDbData')}
${slice(446,495).replace('async function getAllDbData', 'export async function getAllDbData')}
`;

write('src/db/kv-store.ts', kvStoreCode);

const migrationCode = `import path from 'path';
import fsPromises from 'fs/promises';
import { getDb, loadPgPoolForStore, isPgActive, getActivePgPool, storeContext, DB_CONFIG_FILE } from './connection';
import { KNOWN_TABLES, tableSchemas, syncTableSchema, ensurePostgresTables } from './schema-sync';
import { handleRelations } from './kv-store';

const DATA_FILE = path.join(process.cwd(), 'database.json');

${slice(517,605).replace('async function migrateSqliteToPostgres', 'export async function migrateSqliteToPostgres')}
${slice(606,656).replace('async function initDB', 'export async function initDB')}
`;

write('src/db/migration.ts', migrationCode);

