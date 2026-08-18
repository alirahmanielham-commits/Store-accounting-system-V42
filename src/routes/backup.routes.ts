
import { usePgMap, activePgPools, storeContext, SQLITE_FILE, connectPgDb, getDb, getActivePgPool, isPgActive, DB_CONFIG_FILE, dbs, DATA_FILE } from '../db/connection';
import { KNOWN_TABLES, tableSchemas, syncTableSchema, ensurePostgresTables } from '../db/schema-sync';
import { getDbData, setDbData, getAllDbData, innerGetDbData, innerSetDbData, handleRelations } from '../db/kv-store';

const getFormattedBackupDate = () => {
   return new Intl.DateTimeFormat('fa-IR-u-nu-latn', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
      timeZone: 'Asia/Tehran'
   }).format(new Date()).replace(/[\/\s:,]+/g, '-');
};

import { migrateSqliteToPostgres } from '../db/migration';
// import { loginSchema } from '../schemas/validation';
import { Client, Pool } from 'pg';
import os from 'os';

import { Router } from 'express';

import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import cron from 'node-cron';
import { loadPgPoolForStore } from '../db/connection';

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

  const getBackupsDir = async () => {
     let pathConf = backupConfig.path;
     try {
        const data = await getDbData('backupConfig');
        if (data && data.path) pathConf = data.path;
     } catch(e) {}
     return pathConf && pathConf.trim() !== '' 
         ? pathConf 
         : path.join(process.cwd(), 'backups');
  };

  let activeCronJobs: cron.ScheduledTask[] = [];

const backupStore = async (storeId: string) => {
    return new Promise<void>((resolve) => {
        storeContext.run(storeId, async () => {
             console.log("Running backup for store:", storeId);
             try {
                const dir = path.resolve(await getBackupsDir());
                await fsPromises.mkdir(dir, { recursive: true });
                const rows = await getAllDbData();
                const backupData: any = {};
                for (const row of rows) {
                  backupData[row.key] = row.value;
                }
                const fileName = `backup-${storeId}-${getFormattedBackupDate()}.json`;
                const filePath = path.join(dir, fileName);
                const fileContent = JSON.stringify(backupData);
                await fsPromises.writeFile(filePath, fileContent);
                
                // Upload to S3 if enabled
                if (backupConfig.storageType === 'cloud' || backupConfig.remoteProvider === 's3') {
                    if (backupConfig.cloudAuthUrl && backupConfig.cloudUser && backupConfig.cloudPass) {
                       try {
                           const s3 = new S3Client({
                              region: 'default',
                              endpoint: backupConfig.cloudAuthUrl.startsWith('http') ? backupConfig.cloudAuthUrl : `https://${backupConfig.cloudAuthUrl}`,
                              credentials: {
                                 accessKeyId: backupConfig.cloudUser,
                                 secretAccessKey: backupConfig.cloudPass
                              }
                           });
                           await s3.send(new PutObjectCommand({
                               Bucket: 'backups',
                               Key: fileName,
                               Body: fileContent,
                               ContentType: 'application/json'
                           }));
                           await appendDbLog('بک‌آپ ابری', 'success', `آپلود موفق به ابری: ${fileName}`);
                       } catch(s3Err) {
                           console.error('S3 Upload Error:', s3Err);
                           await appendDbLog('بک‌آپ ابری', 'error', `خطا در آپلود ابری: ${s3Err.message}`);
                       }
                    }
                }
                
                await appendDbLog('بک‌آپ خودکار/دستی', 'success', `بک‌آپ با حجم ${Buffer.byteLength(fileContent)} بایت در مسیر ${filePath} ایجاد شد.`);
                
                // keep only last N backups per store
                const retentionCount = backupConfig.retention || 20;
                const files = await fsPromises.readdir(dir);
                const jsonFiles = files.filter(f => f.startsWith(`backup-${storeId}-`) && (f.endsWith('.json') || f.endsWith('.sql')));
                const filesWithStats = await Promise.all(jsonFiles.map(async f => {
                    const stat = await fsPromises.stat(path.join(dir, f));
                    return { file: f, time: stat.mtimeMs };
                }));
                filesWithStats.sort((a,b) => b.time - a.time);
                const sortedJsonFiles = filesWithStats.map(f => f.file);
                
                if (sortedJsonFiles.length > retentionCount) {
                   for (let i = retentionCount; i < sortedJsonFiles.length; i++) {
                      await fsPromises.unlink(path.join(dir, sortedJsonFiles[i])).catch(console.error);
                   }
                }
             } catch (err) {
                console.error(`Backup job failed for store ${storeId}`, err);
                await appendDbLog('پشتیبان‌گیری', 'error', `خطا در ایجاد بک‌آپ (${storeId}): ${err.message}`);
                throw err;
             } finally {
                resolve();
             }
        });
    });
};

const runBackupJob = async () => {
    let errors = [];
    try {
        await loadPgPoolForStore('default');
        try { await backupStore('default'); } catch(e) { errors.push(e); }
        const client = getActivePgPool();
        if (client) {
            let res;
            try {
                res = await client.query('SELECT id FROM businesses WHERE deleted_at IS NULL');
            } catch (err) {
                if (err.code === '42703') {
                    res = await client.query('SELECT id FROM businesses');
                } else {
                    throw err;
                }
            }
            for (const row of res.rows) {
                await loadPgPoolForStore(row.id);
                try { await backupStore(row.id); } catch(e) { errors.push(e); }
            }
        }
    } catch(e) {
        console.error('Global backup job error', e);
        errors.push(e);
    }
    if (errors.length > 0) throw new Error(errors.map(e => e.message).join(', '));
};

const setupBackupSchedule = () => {
    activeCronJobs.forEach(job => job.stop());
    activeCronJobs = [];
    if (!backupConfig.enabled) return;
    
    let cronExpr = backupConfig.cron || '0 2 * * *';
    
    if (backupConfig.frequency === 'daily') {
       const parts = (backupConfig.time || '02:00').split(':');
       cronExpr = `${parts[1] || '0'} ${parts[0] || '2'} * * *`;
    } else if (backupConfig.frequency === 'weekly') {
       const parts = (backupConfig.time || '02:00').split(':');
       cronExpr = `${parts[1] || '0'} ${parts[0] || '2'} * * 0`;
    } else if (backupConfig.frequency === 'monthly') {
       const parts = (backupConfig.time || '02:00').split(':');
       cronExpr = `${parts[1] || '0'} ${parts[0] || '2'} 1 * *`;
    }
    
    try {
        const job = cron.schedule(cronExpr, () => {
            runBackupJob();
        });
        activeCronJobs.push(job);
    } catch(e) {
        console.error('Invalid cron expression', e);
    }
};
setupBackupSchedule();

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
     
     setupBackupSchedule();
     

     res.json({ success: true, config: backupConfig });
  });

router.get('/api/db/backup-config', (req, res) => {
      res.json(backupConfig);
  });

router.get('/api/db/backups', async (req, res) => {
     try {
        const dir = await getBackupsDir();
        await fsPromises.mkdir(dir, { recursive: true });
        const files = await fsPromises.readdir(dir);
        const jsonFiles = files.filter(f => f.startsWith('backup-') && (f.endsWith('.json') || f.endsWith('.sql')));
        const backupsList = [];
        for (const file of jsonFiles) {
           const stat = await fsPromises.stat(path.join(dir, file));
           backupsList.push({ file, size: stat.size, time: stat.mtimeMs });
        }
        backupsList.sort((a,b) => b.time - a.time);
        res.json(backupsList);
     } catch(e) {
        res.status(500).json({ error: e.message });
     }
  });

router.post('/api/db/backups/restore/:filename', async (req, res) => {
     try {
         const { filename } = req.params;
         const dir = await getBackupsDir();
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
         const dir = await getBackupsDir();
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
         const dir = await getBackupsDir();
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
      const backupData = {};
      for (const row of rows) {
        backupData[row.key] = row.value;
      }
      
      const storeId = storeContext.getStore() || 'default';
      const fileName = `backup-${storeId}-${getFormattedBackupDate()}.json`;
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
    const dir = await getBackupsDir();
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
    const dir = await getBackupsDir();
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
