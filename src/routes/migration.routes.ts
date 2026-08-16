
import { usePgMap, activePgPools, storeContext, SQLITE_FILE, connectPgDb, getDb, getActivePgPool, isPgActive, DB_CONFIG_FILE, dbs, DATA_FILE } from '../db/connection';
import { KNOWN_TABLES, tableSchemas, syncTableSchema, ensurePostgresTables } from '../db/schema-sync';
import { getDbData, setDbData, getAllDbData, innerGetDbData, innerSetDbData, handleRelations } from '../db/kv-store';
import { migrateSqliteToPostgres } from '../db/migration';
// import { loginSchema } from '../schemas/validation';
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
import { eq, isNull, sql, desc, asc, inArray, and } from 'drizzle-orm';
import { db } from '../db';
import { checkbooks, issuedChecks, receivedChecks, checkAuditLogs, notifications, accounts, cashboxes } from '../db/schema';
import * as schema from '../db/schema';

const router = Router();

  let migrationState = {
    status: 'idle',
    progress: 0,
    total: 0,
    logs: [] as string[],
    error: null as string | null
  };

router.post('/api/migrate-postgres/validate', async (req, res) => {
    const { connectionString } = req.body;
    try {
      const client = await connectPgDb(connectionString);
      await client.query('SELECT NOW()');
      await client.end();
      res.json({ success: true, message: 'اتصال با موفقیت برقرار شد.' });
    } catch (err) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

router.get('/api/migrate-postgres/tables', (req, res) => {
    try {
      const stmt = getDb().prepare('SELECT key FROM store');
      const allRows = stmt.all();
      const tables = allRows.map(r => r.key).filter(k => KNOWN_TABLES.includes(k));
      res.json({ success: true, tables });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

router.post('/api/migrate-postgres/table/:table', async (req, res) => {
    const { table } = req.params;
    const { connectionString } = req.body;
    
    if (!KNOWN_TABLES.includes(table)) {
        return res.status(400).json({ error: 'جدول نامعتبر است' });
    }

    try {
      const client = new Client({ connectionString });
      await client.connect();

      const stmt = getDb().prepare('SELECT value FROM store WHERE key = ?');
      const row = stmt.get(table);
      if (!row) {
         await client.end();
         return res.status(404).json({ error: 'داده‌ای برای این جدول یافت نشد' });
      }

      await client.query(`DROP TABLE IF EXISTS "${table}" CASCADE`);
      await client.query(`CREATE TABLE "${table}" (id VARCHAR PRIMARY KEY)`);
      
      const data = JSON.parse(row.value);
      
      await client.query('BEGIN');
      let migratedCount = 0;
      tableSchemas.clear();

      if (table === 'company_profile' || table === 'backupConfig' || !Array.isArray(data)) {
          if (data && typeof data === 'object') {
              data.id = 'singleton';
              await syncTableSchema(client, table, data);
              const keys = Object.keys(data);
              const vals = Object.values(data).map(v => v === undefined ? null : (v !== null && typeof v === 'object') ? JSON.stringify(v) : v);
              const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
              const colNames = keys.map(k => `"${k}"`).join(', ');
              await client.query(`INSERT INTO "${table}" (${colNames}) VALUES (${placeholders}) ON CONFLICT(id) DO NOTHING`, vals);
              migratedCount = 1;
          }
      } else {
          for (const item of data) {
              if (!item.id) item.id = Math.random().toString(36).substring(2, 15);
              await syncTableSchema(client, table, item);
              const keys = Object.keys(item);
              const vals = Object.values(item).map(v => v === undefined ? null : (v !== null && typeof v === 'object') ? JSON.stringify(v) : v);
              const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
              const colNames = keys.map(k => `"${k}"`).join(', ');
              await client.query(`INSERT INTO "${table}" (${colNames}) VALUES (${placeholders}) ON CONFLICT(id) DO NOTHING`, vals);
              migratedCount++;
          }
      }

      await client.query('COMMIT');
      await client.end();
      res.json({ success: true, count: migratedCount });
    } catch (e) {
      console.error(`Error migrating table ${table}:`, e);
      res.status(500).json({ error: e.message || String(e) });
    }
  });

router.get('/api/migrate-postgres/status', (req, res) => {
    res.json(migrationState);
  });

router.post('/api/migrate-postgres/reset', (req, res) => {
    migrationState = { status: 'idle', progress: 0, total: 0, logs: [], error: null };
    res.json({ success: true });
  });


export default router;
