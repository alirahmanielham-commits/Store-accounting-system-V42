
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

  let backupConfig = { path: '', intervalHours: 4 };
  (async () => {
    try {
       const backupData = await getDbData('backupConfig');
       if (backupData) {
          Object.assign(backupConfig, backupData);
       }
    } catch(e) { }
  })();

  const getBackupsDir = () => {
     return backupConfig.path && backupConfig.path.trim() !== '' 
        ? backupConfig.path 
        : path.join(process.cwd(), 'backups');
  };

  let backupInterval = null;
  const runBackupJob = async () => {
     try {
        const dir = getBackupsDir();
        await fsPromises.mkdir(dir, { recursive: true });
        const rows = await getAllDbData();
        const backupData = {};
        for (const row of rows) {
          backupData[row.key] = row.value;
        }
        const fileName = `backup-${Date.now()}.json`;
        await fsPromises.writeFile(path.join(dir, fileName), JSON.stringify(backupData));
        
        // keep only last 20 backups
        const files = await fsPromises.readdir(dir);
        const jsonFiles = files.filter(f => f.startsWith('backup-') && (f.endsWith('.json') || f.endsWith('.sql'))).sort((a,b) => b.localeCompare(a));
        if (jsonFiles.length > 20) {
           for (let i = 0; i < jsonFiles.length - 20; i++) {
              await fsPromises.unlink(path.join(dir, jsonFiles[i]));
           }
        }
     } catch (err) {
        console.error('Backup job failed', err);
     }
  };

  if (backupConfig.intervalHours > 0) {
     backupInterval = setInterval(runBackupJob, backupConfig.intervalHours * 60 * 60 * 1000);
  }


router.post('/api/db/backup-config', async (req, res) => {
     backupConfig = { ...backupConfig, ...req.body };
     await setDbData('backupConfig', backupConfig);
     if (backupInterval) clearInterval(backupInterval);
     if (backupConfig.intervalHours > 0) {
        backupInterval = setInterval(runBackupJob, backupConfig.intervalHours * 60 * 60 * 1000);
     }
     res.json({ success: true, config: backupConfig });
  });

router.get('/api/db/backup-config', (req, res) => {
      res.json(backupConfig);
  });

router.get('/api/db/backups', async (req, res) => {
     try {
        const dir = getBackupsDir();
        await fsPromises.mkdir(dir, { recursive: true });
        const files = await fsPromises.readdir(dir);
        const jsonFiles = files.filter(f => f.startsWith('backup-') && (f.endsWith('.json') || f.endsWith('.sql'))).sort((a,b) => b.localeCompare(a));
        const backupsList = [];
        for (const file of jsonFiles) {
           const stat = await fsPromises.stat(path.join(dir, file));
           backupsList.push({ file, size: stat.size, time: stat.mtimeMs });
        }
        res.json(backupsList);
     } catch(e) {
        res.status(500).json({ error: e.message });
     }
  });

router.post('/api/db/backups/restore/:filename', async (req, res) => {
     try {
         const { filename } = req.params;
         const dir = getBackupsDir();
         const filePath = path.join(dir, filename);
         if (!filePath.startsWith(dir)) return res.status(403).send('Invalid path');
         
         if (filename.endsWith('.sql') && isPgActive() && getActivePgPool()) {
             const fileContent = await fsPromises.readFile(filePath, 'utf-8');
             // Split by statements or just execute the whole block if memory allows. 
             // getActivePgPool().query handles multiple statements separated by ';'
             await getActivePgPool().query(fileContent);
         } else {
             const fileContent = await fsPromises.readFile(filePath, 'utf-8');
             const backupData = JSON.parse(fileContent);
             
             if (isPgActive() && getActivePgPool()) {
               for (const key of KNOWN_TABLES) {
                 try {
                   await getActivePgPool().query(`TRUNCATE TABLE "${key}" CASCADE`);
                 } catch (e) {}
               }
             } else {
               try { getDb().prepare('DELETE FROM store').run(); } catch(e) { }
             }

             for (const [key, value] of Object.entries(backupData)) {
                 if (KNOWN_TABLES.includes(key)) {
                    await setDbData(key, value);
                 }
             }
         }
         res.json({ success: true });
     } catch(e) {
         console.error('Restore specific backup error:', e);
         res.status(500).json({ success: false, error: e.message });
     }
  });

router.delete('/api/db/backups/:filename', async (req, res) => {
      try {
         const { filename } = req.params;
         const dir = getBackupsDir();
         const filePath = path.join(dir, filename);
         if (!filePath.startsWith(dir)) return res.status(403).send('Invalid path');
         await fsPromises.unlink(filePath);
         res.json({ success: true });
      } catch(e) {
         res.status(500).json({ error: e.message });
      }
  });

router.get('/api/db/stats', async (req, res) => {
    try {
      let totalSize = 0;
      try {
        if (!isPgActive()) {
           const stats = await fsPromises.stat(SQLITE_FILE);
           totalSize = stats.size;
        } else {
           // mock size for PG or fetch from pg_database size
           const res = await getActivePgPool().query('SELECT pg_database_size(current_database()) as size');
           if (res.rows.length > 0) totalSize = parseInt(res.rows[0].size, 10);
        }
      } catch(e) { }
      
      const rows = await getAllDbData();
      const collections = [];
      
      for (const row of rows) {
        const value = row.value;
        const sizeBytes = Buffer.byteLength(JSON.stringify(value) || '', 'utf8');
        let recordCount = Array.isArray(value) ? value.length : (value ? Object.keys(value).length : 0);
        collections.push({ name: row.key, size: sizeBytes, recordCount });
      }
      
      res.json({ totalSize, collections });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

router.get('/api/db/backup', async (req, res) => {
    try {
      const rows = await getAllDbData();
      const backupData: any = {};
      for (const row of rows) {
        backupData[row.key] = row.value;
      }
      
      const fileName = `backup-${Date.now()}.json`;
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);
      res.send(JSON.stringify(backupData, null, 2));
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });


export default router;
