
import { usePgMap, activePgPools, storeContext, SQLITE_FILE, connectPgDb, getDb, getActivePgPool, isPgActive, DB_CONFIG_FILE, dbs, DATA_FILE } from '../db/connection';
import { KNOWN_TABLES, tableSchemas, syncTableSchema, ensurePostgresTables } from '../db/schema-sync';
import { getDbData, setDbData, getAllDbData, innerGetDbData, innerSetDbData, handleRelations } from '../db/kv-store';
import { migrateSqliteToPostgres } from '../db/migration';
// import { loginSchema } from '../schemas/validation';
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

const appendDbLog = async (action, status, details) => {
  try {
    let logs = [];
    const data = await getDbData('databaseLogs');
    if (data && Array.isArray(data)) logs = data;
    logs.unshift({
      id: Date.now().toString(),
      date: new Intl.DateTimeFormat('fa-IR').format(new Date()) + ' ' + new Date().toLocaleTimeString('fa-IR'),
      action, status, details
    });
    if (logs.length > 200) logs = logs.slice(0, 200);
    await setDbData('databaseLogs', logs);
  } catch(e) {
    console.error('Failed to append db log', e);
  }
};

router.get('/api/db/logs', async (req, res) => {
  try {
    const data = await getDbData('databaseLogs');
    res.json(data || []);
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/api/db/logs', async (req, res) => {
  try {
    const { action, status, details } = req.body;
    await appendDbLog(action, status, details);
    res.json({ success: true });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});


  let backupConfig = { path: '', intervalHours: 4, storageType: 'local', remoteProvider: 's3', remoteConfig: {}, enabled: true, frequency: 'daily', time: '02:00', retention: 5, cron: '0 2 * * *' };
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
        await appendDbLog('بک‌آپ خودکار/دستی', 'success', `بک‌آپ با حجم ${Buffer.byteLength(JSON.stringify(backupData))} بایت ایجاد شد.`);
        
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


  router.post("/api/db/backups/create", async (req, res) => {
     try {
        await runBackupJob();
        res.json({ success: true });
     } catch (err) {
        res.status(500).json({ error: err.message });
     }
  });

router.post('/api/db/backup-config', async (req, res) => {
     backupConfig = { ...backupConfig, ...req.body };
     await setDbData('backupConfig', backupConfig);
     
     if (backupInterval) clearInterval(backupInterval);
     if (backupConfig.enabled && backupConfig.intervalHours > 0) {
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
         await appendDbLog('بازیابی اطلاعات', 'success', `نسخه ${filename} با موفقیت بازیابی شد.`);
         res.json({ success: true });
     } catch(e) {
         await appendDbLog('بازیابی اطلاعات', 'error', `خطا: ${e.message}`);
         console.error('Restore specific backup error:', e);
         res.status(500).json({ success: false, error: e.message });
     }
  });

router.get('/api/db/backups/download/:filename', async (req, res) => {
     try {
         const { filename } = req.params;
         const dir = getBackupsDir();
         const filePath = path.join(dir, filename);
         if (!filePath.startsWith(dir)) return res.status(403).send('Invalid path');
         res.download(filePath);
     } catch(e) {
         res.status(500).json({ error: e.message });
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



router.get('/api/db/health', async (req, res) => {
  try {
    let permissionsOk = true;
    let permissionsError = '';
    const dir = getBackupsDir();
    try {
      await fsPromises.access(dir, fsPromises.constants.W_OK | fsPromises.constants.R_OK);
    } catch(e) { 
      permissionsOk = false;
      permissionsError = e.message;
    }

    let connectionOk = true;
    let connectionError = '';
    if (isPgActive() && getActivePgPool()) {
      try { await getActivePgPool().query('SELECT 1'); } catch(e) { connectionOk = false; connectionError = e.message; }
    } else {
      try { getDb().prepare('SELECT 1').get(); } catch(e) { connectionOk = false; connectionError = e.message; }
    }

    let orphanedRecords = 0;
    if (isPgActive() && getActivePgPool()) {
      try {
        const result = await getActivePgPool().query(`
          SELECT 
            (SELECT count(*) FROM transactions WHERE account_id IS NOT NULL AND account_id NOT IN (SELECT id FROM accounts)) +
            (SELECT count(*) FROM invoice_items WHERE invoice_id IS NOT NULL AND invoice_id NOT IN (SELECT id FROM invoices)) as orphaned_count
        `);
        orphanedRecords = parseInt(result.rows[0].orphaned_count, 10);
      } catch(e) { console.error('Orphan check error', e); }
    }

    res.json({
      permissionsOk,
      permissionsError,
      connectionOk,
      connectionError,
      orphanedRecords
    });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});


router.get('/api/db/table-sizes', async (req, res) => {
  try {
    if (isPgActive() && getActivePgPool()) {
      const result = await getActivePgPool().query(`
        SELECT 
          relname as name, 
          pg_total_relation_size(C.oid) as size,
          n_live_tup as recordCount
        FROM pg_class C
        LEFT JOIN pg_namespace N ON (N.oid = C.relnamespace)
        LEFT JOIN pg_stat_user_tables S ON (S.relid = C.oid)
        WHERE nspname NOT IN ('pg_catalog', 'information_schema')
        AND C.relkind <> 'i'
        AND nspname !~ '^pg_toast'
        AND relname IN ('persons', 'invoices', 'invoice_items', 'transactions', 'accounts', 'products', 'cashboxes')
        ORDER BY pg_total_relation_size(C.oid) DESC;
      `);
      let totalSizeRes = await getActivePgPool().query('SELECT pg_database_size(current_database()) as size');
      let totalSize = parseInt(totalSizeRes.rows[0].size, 10);
      
      const tables = result.rows.map(r => ({
        name: r.name,
        size: parseInt(r.size, 10),
        recordCount: parseInt(r.recordcount || '0', 10)
      }));
      
      res.json({ tables, totalSize });
    } else {
      res.json({ tables: [], totalSize: 0 });
    }
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});


router.post('/api/db/backups/upload', async (req, res) => {
  try {
    const { filename, content } = req.body;
    if (!filename || !content) return res.status(400).json({ error: 'Missing filename or content' });
    const dir = getBackupsDir();
    await fsPromises.mkdir(dir, { recursive: true });
    const safeName = 'uploaded-' + Date.now() + '-' + path.basename(filename);
    const filePath = path.join(dir, safeName);
    
    // Convert base64 or raw text to file. If it's a JSON string, we just write it.
    await fsPromises.writeFile(filePath, content, 'utf-8');
    
    await appendDbLog('آپلود بک‌آپ', 'success', `فایل ${filename} با موفقیت آپلود شد.`);
    res.json({ success: true, file: safeName });
  } catch (err) {
    await appendDbLog('آپلود بک‌آپ', 'error', `خطا در آپلود: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

export default router;
