const fs = require('fs');

const extraImports = `
import { usePgMap, activePgPools, storeContext, SQLITE_FILE, connectPgDb, getDb, getActivePgPool, isPgActive, DB_CONFIG_FILE, dbs, DATA_FILE } from '../db/connection';
import { KNOWN_TABLES, tableSchemas, syncTableSchema, ensurePostgresTables } from '../db/schema-sync';
import { getDbData, setDbData, getAllDbData, innerGetDbData, innerSetDbData, handleRelations } from '../db/kv-store';
import { migrateSqliteToPostgres } from '../db/migration';
import { loginSchema } from '../schemas/validation';
import { DatabaseSync } from 'node:sqlite';
import { Client, Pool } from 'pg';
import os from 'os';
`;

const files = fs.readdirSync('src/routes');
for (const file of files) {
  if (file.endsWith('.ts')) {
    let content = fs.readFileSync('src/routes/' + file, 'utf8');
    // Remove the old import block of db stuff if it exists, or just prepend
    // It's safer to just prepend, TS will complain about duplicates but let's check duplicates
    content = extraImports + '\n' + content;
    fs.writeFileSync('src/routes/' + file, content);
  }
}
