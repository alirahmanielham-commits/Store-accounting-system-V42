
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
import { getDb, getActivePgPool, isPgActive, DB_CONFIG_FILE, dbs, DATA_FILE } from '../db/connection';
import { getDbData, setDbData, getAllDbData, innerGetDbData, innerSetDbData } from '../db/kv-store';
import { KNOWN_TABLES, tableSchemas } from '../db/schema-sync';
import { eq, isNull, sql, desc, asc, inArray, and } from 'drizzle-orm';
import { db } from '../db';
import { checkbooks, issuedChecks, receivedChecks, checkAuditLogs, notifications, accounts, cashboxes } from '../db/schema';
import * as schema from '../db/schema';

const router = Router();
router.get('/api/databases', async (req, res) => {
    try {
      let dbsFromTable = [];
      try {
        if (usePgMap['default'] && activePgPools['default']) {
            await activePgPools['default'].query(`
              CREATE TABLE IF NOT EXISTS businesses (
                id VARCHAR PRIMARY KEY,
                name VARCHAR NOT NULL,
                db_type VARCHAR DEFAULT 'sqlite',
                db_host VARCHAR,
                db_port VARCHAR,
                db_name VARCHAR,
                db_user VARCHAR,
                db_password VARCHAR
              )
            `);
            const r = await activePgPools['default'].query("SELECT * FROM businesses");
            dbsFromTable = r.rows;
        } else {
            const defaultDb = storeContext.run('default', () => getDb());
            const stmt = defaultDb.prepare("SELECT * FROM businesses");
            dbsFromTable = stmt.all();
        }
      } catch (e) {}

      const files = await fsPromises.readdir(process.cwd());
      const dbsFromFiles = files
        .filter(f => f.startsWith('database') && f.endsWith('.sqlite'))
        .map(f => {
          if (f === 'database.sqlite') return { id: 'default', name: 'فروشگاه اصلی', db_type: 'sqlite' };
          const match = f.match(/^database_(.+)\.sqlite$/);
          if (match) return { id: match[1], name: decodeURIComponent(match[1]), db_type: 'sqlite' };
          return null;
        })
        .filter(Boolean);

      const mergedMap = new Map();
      dbsFromFiles.forEach(db => mergedMap.set(db.id, db));
      dbsFromTable.forEach(db => mergedMap.set(db.id, {
         id: db.id, 
         name: db.name, 
         db_type: db.db_type, 
         db_host: db.db_host, 
         db_port: db.db_port, 
         db_name: db.db_name,
         db_user: db.db_user,
         db_password: db.db_password
      }));

      // Ensure 'default' store is correctly represented
      if (!mergedMap.has('default')) {
          mergedMap.set('default', {
              id: 'default',
              name: 'کسب و کار اصلی',
              db_type: usePgMap['default'] ? 'postgres' : 'sqlite'
          });
      } else {
          const def = mergedMap.get('default');
          if (usePgMap['default']) {
              def.db_type = 'postgres';
          }
          
          // Fetch actual storeName from default db if possible
          try {
             if (usePgMap['default'] && activePgPools['default']) {
                 const res = await activePgPools['default'].query("SELECT value FROM local_data WHERE key = 'store_settings'");
                 if (res.rows.length > 0 && res.rows[0].value) {
                     const settings = JSON.parse(res.rows[0].value);
                     if (settings.storeName) def.name = settings.storeName;
                 }
             } else {
                 const defaultDb = storeContext.run('default', () => getDb());
                 const res = defaultDb.prepare("SELECT value FROM local_data WHERE key = 'store_settings'").get();
                 if (res && res.value) {
                     const settings = JSON.parse(res.value);
                     if (settings.storeName) def.name = settings.storeName;
                 }
             }
          } catch(e) {}
          
          if (def.name === 'فروشگاه اصلی') {
              def.name = 'کسب و کار اصلی';
          }
          mergedMap.set('default', def);
      }

      res.json({ success: true, databases: Array.from(mergedMap.values()) });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

router.get('/api/databases/:id/test-connection', async (req, res) => {
    try {
      const { id } = req.params;
      
      let business = null;
      if (usePgMap['default'] && activePgPools['default']) {
          const r = await activePgPools['default'].query("SELECT * FROM businesses WHERE id = $1", [id]);
          if (r.rows.length > 0) business = r.rows[0];
      } else {
          const defaultDb = storeContext.run('default', () => getDb());
          try {
              const stmt = defaultDb.prepare("SELECT * FROM businesses WHERE id = ?");
              business = stmt.get(id);
          } catch(e) {}
      }
      
      // Default store is always valid if we reach here
      if (id === 'default' && !business) {
          return res.json({ success: true });
      }

      if (!business && id !== 'default') {
          // it might be a sqlite file without db entry
          try {
             const stat = await fsPromises.stat(path.join(process.cwd(), `database_${id}.sqlite`));
             return res.json({ success: true });
          } catch(e) {
             return res.status(404).json({ error: 'Business not found' });
          }
      }
      
      if (business && business.db_type === 'postgres') {
          try {
              const configRaw = await fsPromises.readFile(DB_CONFIG_FILE, 'utf-8');
              const config = JSON.parse(configRaw);
              if (config.engine === 'postgres' && config.connectionString) {
                  const url = new URL(config.connectionString);
                  url.pathname = `/${business.db_name}`;
                  const pool = new Pool({ connectionString: url.toString() });
                  await pool.query('SELECT 1');
                  await pool.end();
                  return res.json({ success: true });
              } else {
                  return res.status(500).json({ error: 'Postgres config missing' });
              }
          } catch(e) {
              return res.status(500).json({ error: 'Connection failed: ' + e.message });
          }
      } else {
          return res.json({ success: true });
      }
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

router.put('/api/databases/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { name, db_type, db_host, db_port, db_name, db_user, db_password } = req.body;
      if (!name) return res.status(400).json({ error: 'Name is required' });
            
      let existing = null;
      if (usePgMap['default'] && activePgPools['default']) {
          const r = await activePgPools['default'].query("SELECT * FROM businesses WHERE id = $1", [id]);
          if (r.rows.length > 0) existing = r.rows[0];
      } else { existing = null; }

      if (existing || id === 'default') {
        if (!existing) {
           if (usePgMap['default'] && activePgPools['default']) {
               await activePgPools['default'].query('INSERT INTO businesses (id, name, db_type) VALUES ($1, $2, $3)', [id, name, db_type || 'sqlite']);
           } else { throw new Error("PostgreSQL required to create businesses"); }
        } else {
        if (usePgMap['default'] && activePgPools['default']) {
            await activePgPools['default'].query(`
              UPDATE businesses SET 
                name = $1, 
                db_type = COALESCE($2, db_type), 
                db_host = COALESCE($3, db_host), 
                db_port = COALESCE($4, db_port), 
                db_name = COALESCE($5, db_name), 
                db_user = COALESCE($6, db_user), 
                db_password = COALESCE($7, db_password) 
              WHERE id = $8
            `, [name, db_type, db_host, db_port, db_name, db_user, db_password, id]);
        } else { throw new Error("PostgreSQL required to update businesses"); }
        }
        res.json({ success: true, database: { id, name, db_type: db_type || (existing && existing.db_type) || 'sqlite', db_host, db_port, db_name, db_user, db_password } });
      } else {
        // Fallback for file-only databases being renamed
        const newId = encodeURIComponent(name.replace(/\s+/g, '_'));
        const oldFile = path.join(process.cwd(), `database_${id}.sqlite`);
        const newFile = path.join(process.cwd(), `database_${newId}.sqlite`);
        
        if (dbs[id]) {
          try { dbs[id].close(); } catch(e) { }
          delete dbs[id];
        }
        await fsPromises.rename(oldFile, newFile);
        res.json({ success: true, database: { id: newId, name } });
      }
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

router.delete('/api/databases/:id', async (req, res) => {
    try {
      const { id } = req.params;
      if (id === 'default') return res.status(400).json({ error: 'Cannot delete default store' });
      
      try {
        if (usePgMap['default'] && activePgPools['default']) {
            await activePgPools['default'].query("DELETE FROM businesses WHERE id = $1", [id]);
        } else {
            const defaultDb = storeContext.run('default', () => getDb());
            const stmt = defaultDb.prepare("DELETE FROM businesses WHERE id = ?");
            stmt.run(id);
        }
      } catch(e) { }

      const dbFile = path.join(process.cwd(), `database_${id}.sqlite`);
      if (dbs[id]) {
        try { dbs[id].close(); } catch(e) { }
        delete dbs[id];
      }
      try { await fsPromises.unlink(dbFile); } catch(e) { }
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

router.post('/api/databases', async (req, res) => {
    try {
      const { name } = req.body;
      if (!name) return res.status(400).json({ error: 'Name is required' });
      
      const id = 'store_' + Math.random().toString(36).substring(2, 6) + '_' + Date.now().toString(36);
      let actualDbType = 'sqlite';
      
      try {
        const configRaw = await fsPromises.readFile(DB_CONFIG_FILE, 'utf-8');
        const config = JSON.parse(configRaw);
        if (config.engine === 'postgres' && config.connectionString) {
          actualDbType = 'postgres';
          // Provision a new Postgres database for this business
          const dbNameForBusiness = `store_${id}`.replace(/[^a-zA-Z0-9_]/g, '');
          
          const url = new URL(config.connectionString);
          url.pathname = '/postgres';
          const client = new Client({ connectionString: url.toString() });
          await client.connect();
          await client.query(`CREATE DATABASE "${dbNameForBusiness}"`);
          await client.end();
          
          // Connect to new DB and initialize schema? 
          // We don't have to initialize the schema here because `getDbData` and other APIs handle it dynamically, 
          // but we should probably wait for it.
          // Wait, the client doesn't connect if we just store the connection string.
          // In businesses table, we store the new db_name, the rest we can leave empty 
          // and infer from db_config.json on runtime, or we store the full connection string.
          // For simplicity, we just store the new dbName.
          
          try {
            if (usePgMap['default'] && activePgPools['default']) {
                await activePgPools['default'].query(`
                  CREATE TABLE IF NOT EXISTS businesses (
                    id VARCHAR PRIMARY KEY,
                    name VARCHAR NOT NULL,
                    db_type VARCHAR DEFAULT 'sqlite',
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
                `, [id, name, 'postgres', '', '', dbNameForBusiness, '', '']);
            } else {
                const defaultDb = storeContext.run('default', () => getDb());
                const stmt = defaultDb.prepare(`
                  INSERT INTO businesses (id, name, db_type, db_host, db_port, db_name, db_user, db_password)
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                `);
                stmt.run(id, name, 'postgres', '', '', dbNameForBusiness, '', '');
            }
          } catch(e) { }
          
          return res.json({ success: true, database: { id, name, db_type: 'postgres', db_name: dbNameForBusiness } });
        }
      } catch (e) {
         console.log("Error checking config or creating postgres DB, falling back to sqlite:", e);
      }

      // SQLite fallback
      try {
        if (usePgMap['default'] && activePgPools['default']) {
            await activePgPools['default'].query(`
              CREATE TABLE IF NOT EXISTS businesses (
                id VARCHAR PRIMARY KEY,
                name VARCHAR NOT NULL,
                db_type VARCHAR DEFAULT 'sqlite',
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
            `, [id, name, 'sqlite', '', '', '', '', '']);
        } else {
            const defaultDb = storeContext.run('default', () => getDb());
            const stmt = defaultDb.prepare(`
              INSERT INTO businesses (id, name, db_type, db_host, db_port, db_name, db_user, db_password)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `);
            stmt.run(id, name, 'sqlite', '', '', '', '', '');
        }
      } catch(e) { }

      const dbFile = path.join(process.cwd(), `database_${id}.sqlite`);
      const newDb = new DatabaseSync(dbFile);
      newDb.exec(`
        CREATE TABLE IF NOT EXISTS store (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL
        )
      `);

      res.json({ success: true, database: { id, name, db_type: 'sqlite' } });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });


export default router;
