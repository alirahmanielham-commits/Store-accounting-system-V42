
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
import { requireRole } from '../middleware/auth.middleware';
import { validateData } from '../schemas/validation';
import { eq, isNull, sql, desc, asc, inArray, and } from 'drizzle-orm';
import { db } from '../db';
import { checkbooks, issuedChecks, receivedChecks, checkAuditLogs, notifications, accounts, cashboxes } from '../db/schema';
import * as schema from '../db/schema';
import { encryptBackupData, decryptBackupData, isEncryptedBackup } from '../utils/backupCrypto';
import { performDryRunAnalysis, createSafetySnapshot, saveSecondaryReplica } from '../services/backupEngine';
import { extractRequestUser } from './data.routes';

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


  let backupConfig: any = { 
    path: '', 
    intervalHours: 4, 
    storageType: 'both', 
    remoteProvider: 'gdrive', 
    cloudProvider: 'gdrive',
    autoCloudSync: true,
    remoteConfig: {}, 
    enabled: true, 
    frequency: 'daily', 
    time: '02:00', 
    retention: 10, 
    cron: '0 2 * * *', 
    cloudAuthUrl: '', 
    cloudUser: '', 
    cloudPass: '',
    cloudBucket: 'taraz-backups',
    gdriveToken: '',
    gdriveFolder: 'Taraz_Backups',
    gdriveUser: '',
    onedriveToken: '',
    onedriveFolder: 'Taraz_Backups',
    onedriveUser: ''
  };
  (async () => {
    try {
       const backupData = await getDbData('backupConfig');
       if (backupData) {
          Object.assign(backupConfig, backupData);
       }
    } catch(e) { }
  })();

  const recordCloudBackup = async (entry: { file: string; provider: string; size: number; time: number; url?: string; id?: string }) => {
    try {
      let list: any[] = [];
      const current = await getDbData('cloudBackups');
      if (Array.isArray(current)) list = current;
      list = [entry, ...list.filter((b: any) => b.file !== entry.file)];
      if (list.length > 50) list = list.slice(0, 50);
      await setDbData('cloudBackups', list);
    } catch(e) {
      console.error('Failed to record cloud backup', e);
    }
  };

  const uploadToGoogleDrive = async (fileName: string, fileContent: string, config: any) => {
    const token = config.gdriveToken;
    if (!token) throw new Error('توکن دسترسی گوگل درایو یافت نشد. لطفاً ابتدا حساب گوگل خود را متصل فرمایید.');

    const folderName = config.gdriveFolder || 'Taraz_Backups';
    let folderId = '';
    try {
      const searchRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=name='${encodeURIComponent(folderName)}'+and+mimeType='application/vnd.google-apps.folder'+and+trashed=false&fields=files(id,name)`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (searchRes.ok) {
        const searchData = await searchRes.json();
        if (searchData.files && searchData.files.length > 0) {
          folderId = searchData.files[0].id;
        }
      }
      if (!folderId) {
        const createFolderRes = await fetch('https://www.googleapis.com/drive/v3/files', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            name: folderName,
            mimeType: 'application/vnd.google-apps.folder'
          })
        });
        if (createFolderRes.ok) {
          const folderData = await createFolderRes.json();
          folderId = folderData.id;
        }
      }
    } catch(e) {
      console.warn('Folder check in Google Drive:', e);
    }

    const boundary = '-------TarazBackup' + Date.now();
    const metadata: any = {
      name: fileName,
      mimeType: 'application/json'
    };
    if (folderId) metadata.parents = [folderId];

    const multipartBody = 
      `--${boundary}\r\n` +
      `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
      JSON.stringify(metadata) + `\r\n` +
      `--${boundary}\r\n` +
      `Content-Type: application/json\r\n\r\n` +
      fileContent + `\r\n` +
      `--${boundary}--`;

    const uploadRes = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink,size', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': `multipart/related; boundary=${boundary}`
      },
      body: multipartBody
    });

    if (!uploadRes.ok) {
      const errText = await uploadRes.text();
      throw new Error(`Google Drive API error (${uploadRes.status}): ${errText}`);
    }

    const fileResult = await uploadRes.json();
    await recordCloudBackup({
      file: fileName,
      provider: 'gdrive',
      size: Buffer.byteLength(fileContent),
      time: Date.now(),
      url: fileResult.webViewLink || `https://drive.google.com/file/d/${fileResult.id}/view`,
      id: fileResult.id
    });
    return fileResult;
  };

  const uploadToOneDrive = async (fileName: string, fileContent: string, config: any) => {
    const token = config.onedriveToken;
    if (!token) throw new Error('توکن دسترسی OneDrive یافت نشد. لطفاً ابتدا حساب مایکروسافت را متصل فرمایید.');

    const folder = config.onedriveFolder || 'Taraz_Backups';
    const uploadUrl = `https://graph.microsoft.com/v1.0/me/drive/root:/${encodeURIComponent(folder)}/${encodeURIComponent(fileName)}:/content`;
    
    const res = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: fileContent
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`OneDrive API error (${res.status}): ${errText}`);
    }

    const data = await res.json();
    await recordCloudBackup({
      file: fileName,
      provider: 'onedrive',
      size: Buffer.byteLength(fileContent),
      time: Date.now(),
      url: data.webUrl,
      id: data.id
    });
    return data;
  };

  const uploadToS3 = async (fileName: string, fileContent: string, config: any) => {
    if (!config.cloudAuthUrl || !config.cloudUser || !config.cloudPass) {
      throw new Error('مشخصات اتصال S3 (آدرس سرور، کلید دسترسی یا رمز) کامل نیست.');
    }
    const s3 = new S3Client({
      region: config.region || 'default',
      endpoint: config.cloudAuthUrl.startsWith('http') ? config.cloudAuthUrl : `https://${config.cloudAuthUrl}`,
      credentials: {
        accessKeyId: config.cloudUser,
        secretAccessKey: config.cloudPass
      }
    });
    const bucket = config.cloudBucket || 'taraz-backups';
    await s3.send(new PutObjectCommand({
      Bucket: bucket,
      Key: fileName,
      Body: fileContent,
      ContentType: 'application/json'
    }));
    await recordCloudBackup({
      file: fileName,
      provider: 's3',
      size: Buffer.byteLength(fileContent),
      time: Date.now(),
      url: `${config.cloudAuthUrl}/${bucket}/${fileName}`,
      id: fileName
    });
  };

  const dispatchCloudUpload = async (fileName: string, fileContent: string) => {
    const provider = backupConfig.cloudProvider || backupConfig.remoteProvider || 'gdrive';
    try {
      if (provider === 'gdrive') {
        await uploadToGoogleDrive(fileName, fileContent, backupConfig);
        await appendDbLog('پشتیبان‌گیری ابری گوگل درایو', 'success', `فایل ${fileName} با موفقیت در Google Drive ذخیره شد.`);
      } else if (provider === 'onedrive') {
        await uploadToOneDrive(fileName, fileContent, backupConfig);
        await appendDbLog('پشتیبان‌گیری ابری وان‌درایو', 'success', `فایل ${fileName} با موفقیت در OneDrive ذخیره شد.`);
      } else if (provider === 's3') {
        await uploadToS3(fileName, fileContent, backupConfig);
        await appendDbLog('پشتیبان‌گیری ابری S3', 'success', `فایل ${fileName} با موفقیت در فضای ابری S3 ذخیره شد.`);
      }
    } catch(cloudErr: any) {
      console.error('Cloud auto-upload error:', cloudErr);
      await appendDbLog('پشتیبان‌گیری ابری', 'error', `خطا در ذخیره ابری (${provider}): ${cloudErr.message}`);
    }
  };

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

  let activeCronJobs: any[] = [];

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
                
                // Encrypt backup payload with AES-256-GCM authenticated encryption
                const { jsonString } = encryptBackupData(backupData, storeId);
                await fsPromises.writeFile(filePath, jsonString, 'utf-8');

                // Dual-site local redundancy: Save secondary replica in backups/secondary-replica
                await saveSecondaryReplica(fileName, jsonString).catch(e => console.warn('Secondary replica warning:', e));
                
                // Automatic Cloud Sync (Google Drive, OneDrive, or S3) with encrypted payload
                const shouldCloudSync = backupConfig.autoCloudSync || backupConfig.storageType === "cloud" || backupConfig.storageType === "both";
                if (shouldCloudSync) {
                    await dispatchCloudUpload(fileName, jsonString);
                }
                
                await appendDbLog('پشتیبان‌گیری رمزنگاری‌شده (AES-256-GCM)', 'success', `بک‌آپ امن با حجم ${Buffer.byteLength(jsonString)} بایت در مسیر ${filePath} و آرشیو ثانویه ایجاد شد.`);
                
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

router.post("/api/db/backups/create", requireRole(['admin']), async (req, res) => {
     try {
        await runBackupJob();
        res.json({ success: true });
     } catch (err: any) {
        res.status(500).json({ error: err.message });
     }
  });

router.post('/api/db/backup-config', requireRole(['admin']), async (req, res) => {
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
        const jsonFiles = files.filter(f => (f.startsWith('backup-') || f.startsWith('uploaded-')) && (f.endsWith('.json') || f.endsWith('.sql')));
        const backupsList = [];
        for (const file of jsonFiles) {
           const fullPath = path.join(dir, file);
           const stat = await fsPromises.stat(fullPath);
           let isEncrypted = false;
           if (file.endsWith('.json')) {
             try {
               const headBuffer = Buffer.alloc(384);
               const fd = await fsPromises.open(fullPath, 'r');
               const { bytesRead } = await fd.read(headBuffer, 0, 384, 0);
               await fd.close();
               const headStr = headBuffer.toString('utf8', 0, bytesRead);
               isEncrypted = headStr.includes('taraz_backup_encrypted');
             } catch (_) {}
           }
           backupsList.push({ 
             file, 
             size: stat.size, 
             time: stat.mtimeMs,
             isEncrypted,
             encryption: isEncrypted ? 'AES-256-GCM' : 'None',
             type: isEncrypted ? 'رمزنگاری‌شده (AES-256)' : 'عادی'
           });
        }
        backupsList.sort((a,b) => b.time - a.time);
        res.json(backupsList);
     } catch(e: any) {
        res.status(500).json({ error: e.message });
     }
  });

// Alias for Roadmap specification
router.get('/api/backup/list', requireRole(['admin']), async (req, res) => {
   try {
      const dir = await getBackupsDir();
      await fsPromises.mkdir(dir, { recursive: true });
      const files = await fsPromises.readdir(dir);
      const jsonFiles = files.filter(f => (f.startsWith('backup-') || f.startsWith('uploaded-')) && (f.endsWith('.json') || f.endsWith('.sql')));
      const backupsList = [];
      for (const file of jsonFiles) {
         const fullPath = path.join(dir, file);
         const stat = await fsPromises.stat(fullPath);
         let isEncrypted = false;
         if (file.endsWith('.json')) {
           try {
             const headBuffer = Buffer.alloc(384);
             const fd = await fsPromises.open(fullPath, 'r');
             const { bytesRead } = await fd.read(headBuffer, 0, 384, 0);
             await fd.close();
             isEncrypted = headBuffer.toString('utf8', 0, bytesRead).includes('taraz_backup_encrypted');
           } catch (_) {}
         }
         backupsList.push({ file, size: stat.size, time: stat.mtimeMs, isEncrypted, encryption: isEncrypted ? 'AES-256-GCM' : 'None' });
      }
      backupsList.sort((a,b) => b.time - a.time);
      res.json(backupsList);
   } catch(e: any) {
      res.status(500).json({ error: e.message });
   }
});

// Alias for Roadmap export specification
router.post('/api/backup/export', requireRole(['admin']), async (req, res) => {
  try {
    await runBackupJob();
    res.json({ success: true, message: 'نسخه پشتیبان رمزنگاری‌شده AES-256-GCM با موفقیت ایجاد شد.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Dry-run preview endpoint for verifying schema compatibility and row diffs before restoring
router.post('/api/db/backups/dry-run/:filename', requireRole(['admin']), async (req, res) => {
    try {
        const { filename } = req.params;
        if (!/^[a-zA-Z0-9_\-\.]+$/.test(filename) || filename.includes('..')) {
          return res.status(400).json({ success: false, error: 'نام فایل نامعتبر است.' });
        }
        const dir = path.resolve(await getBackupsDir());
        const filePath = path.resolve(dir, filename);
        if (!filePath.startsWith(dir)) return res.status(403).json({ success: false, error: 'مسیر غیرمجاز' });

        const fileContent = await fsPromises.readFile(filePath, 'utf-8');
        const decryptResult = decryptBackupData(fileContent);
        if (!decryptResult.success || !decryptResult.data) {
          return res.status(400).json({
            success: false,
            error: decryptResult.error || 'رمزگشایی یا بازخوانی فایل پشتیبان ناموفق بود.'
          });
        }

        const analysis = await performDryRunAnalysis(decryptResult.data, decryptResult.isEncrypted);
        res.json({
          success: true,
          filename,
          isEncrypted: decryptResult.isEncrypted,
          ...analysis
        });
    } catch(err: any) {
        res.status(500).json({ success: false, error: err.message });
    }
});

router.post('/api/backup/dry-run', requireRole(['admin']), async (req, res) => {
    try {
        const { content, filename } = req.body;
        if (!content && !filename) {
          return res.status(400).json({ success: false, error: 'محتوای فایل یا نام فایل الزامی است.' });
        }

        let fileContent = content;
        if (!fileContent && filename) {
          const dir = path.resolve(await getBackupsDir());
          const filePath = path.resolve(dir, filename);
          fileContent = await fsPromises.readFile(filePath, 'utf-8');
        }

        const decryptResult = decryptBackupData(fileContent);
        if (!decryptResult.success || !decryptResult.data) {
          return res.status(400).json({
            success: false,
            error: decryptResult.error || 'رمزگشایی فایل ناموفق بود.'
          });
        }

        const analysis = await performDryRunAnalysis(decryptResult.data, decryptResult.isEncrypted);
        res.json({
          success: true,
          isEncrypted: decryptResult.isEncrypted,
          ...analysis
        });
    } catch (err: any) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Restore backup with automatic safety snapshot & decryption
router.post('/api/db/backups/restore/:filename', requireRole(['admin']), async (req, res) => {
     try {
         const { filename } = req.params;
         if (!/^[a-zA-Z0-9_\-\.]+$/.test(filename) || filename.includes('..')) {
           return res.status(400).json({ success: false, error: 'نام فایل پشتیبان نامعتبر است' });
         }
         const dir = path.resolve(await getBackupsDir());
         const filePath = path.resolve(dir, filename);
         if (!filePath.startsWith(dir)) return res.status(403).json({ success: false, error: 'مسیر غیرمجاز' });
         
         const storeId = storeContext.getStore() || 'default';
         
         // 1. Take automatic safety snapshot of current database before any alteration
         const safetySnapshot = await createSafetySnapshot(storeId);

         if (filename.endsWith('.sql') && isPgActive() && getActivePgPool()) {
             const fileContent = await fsPromises.readFile(filePath, 'utf-8');
             await getActivePgPool().query(fileContent);
         } else {
             const fileContent = await fsPromises.readFile(filePath, 'utf-8');
             const decryptResult = decryptBackupData(fileContent);
             if (!decryptResult.success || !decryptResult.data) {
               return res.status(400).json({
                 success: false,
                 error: decryptResult.error || 'رمزگشایی یا اعتبارسنجی فایل پشتیبان ناموفق بود. داده‌های فعلی بدون تغییر باقی ماندند.'
               });
             }
             const backupData = decryptResult.data;
             
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
                 if (KNOWN_TABLES.includes(key) || key === 'store_settings' || key === 'company_profile') {
                    await setDbData(key, value);
                 }
             }
         }
         
         const userInfo = extractRequestUser(req);
         await appendDbLog('بازیابی اطلاعات', 'success', `نسخه ${filename} با موفقیت توسط کاربر «${userInfo.userName || userInfo.username}» بازیابی شد. نسخه ایمنی: ${safetySnapshot.fileName}`);
         
         // Record in system_logs
         try {
           const sysLogs = (await getDbData('system_logs')) || [];
           sysLogs.unshift({
             id: Math.random().toString(36).substring(2, 15),
             timestamp: Date.now(),
             action: 'RESTORE_BACKUP',
             userId: userInfo.userId,
             username: userInfo.username,
             userName: userInfo.userName,
             userRole: userInfo.userRole,
             details: `بازیابی کامل اطلاعات از فایل پشتیبان «${filename}» با ایجاد خودکار نسخه ایمنی ${safetySnapshot.fileName}`,
             entityType: 'backup',
             entityId: filename,
             changes: JSON.stringify({ restoredFile: filename, safetySnapshot: safetySnapshot.fileName })
           });
           if (sysLogs.length > 3000) sysLogs.length = 3000;
           await setDbData('system_logs', sysLogs);
         } catch (_) {}

         res.json({ 
           success: true, 
           safetySnapshot: safetySnapshot.fileName,
           message: `نسخه ${filename} با موفقیت بازیابی شد.` 
         });
     } catch(e: any) {
         await appendDbLog('بازیابی اطلاعات', 'error', `خطا در بازیابی: ${e.message}`);
         console.error('Restore specific backup error:', e);
         res.status(500).json({ success: false, error: e.message });
     }
  });

// Alias for Roadmap import specification
router.post('/api/backup/import', requireRole(['admin']), async (req, res) => {
  try {
    const { filename, content } = req.body;
    let fileToRestore = filename;

    if (content) {
      const dir = await getBackupsDir();
      await fsPromises.mkdir(dir, { recursive: true });
      const safeName = `uploaded-${Date.now()}-${(filename || 'backup.json').replace(/[^a-zA-Z0-9_\-\.]/g, '_')}`;
      await fsPromises.writeFile(path.join(dir, safeName), content, 'utf-8');
      fileToRestore = safeName;
    }

    if (!fileToRestore) {
      return res.status(400).json({ success: false, error: 'نام فایل پشتیبان یا محتوای آن الزامی است.' });
    }

    // Execute restore logic
    const storeId = storeContext.getStore() || 'default';
    const safetySnapshot = await createSafetySnapshot(storeId);

    const dir = path.resolve(await getBackupsDir());
    const filePath = path.resolve(dir, fileToRestore);
    const fileContent = await fsPromises.readFile(filePath, 'utf-8');
    const decryptResult = decryptBackupData(fileContent);
    if (!decryptResult.success || !decryptResult.data) {
      return res.status(400).json({ success: false, error: decryptResult.error || 'رمزگشایی فایل ناموفق بود.' });
    }

    if (isPgActive() && getActivePgPool()) {
      for (const key of KNOWN_TABLES) {
        try { await getActivePgPool().query(`TRUNCATE TABLE "${key}" CASCADE`); } catch (e) {}
      }
    } else {
      try { getDb().prepare('DELETE FROM store').run(); } catch(e) {}
    }

    for (const [key, value] of Object.entries(decryptResult.data)) {
      if (KNOWN_TABLES.includes(key) || key === 'store_settings' || key === 'company_profile') {
        await setDbData(key, value);
      }
    }

    const userInfo = extractRequestUser(req);
    await appendDbLog('بازیابی اطلاعات', 'success', `فایل ${fileToRestore} بازیابی شد.`);
    res.json({ success: true, file: fileToRestore, safetySnapshot: safetySnapshot.fileName });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Revert to emergency safety snapshot
router.post('/api/db/backups/revert-safety', requireRole(['admin']), async (req, res) => {
    try {
        const safetyDir = path.join(process.cwd(), 'backups', 'safety-snapshots');
        const files = await fsPromises.readdir(safetyDir).catch(() => []);
        const safetyFiles = files.filter(f => f.startsWith('safety-pre-restore-') && f.endsWith('.json'));
        if (safetyFiles.length === 0) {
          return res.status(404).json({ success: false, error: 'هیچ نسخه ایمنی اضطراری برای بازگشت یافت نشد.' });
        }

        const stats = await Promise.all(safetyFiles.map(async f => ({
          file: f,
          time: (await fsPromises.stat(path.join(safetyDir, f))).mtimeMs
        })));
        stats.sort((a,b) => b.time - a.time);
        const latestSafety = stats[0].file;

        const content = await fsPromises.readFile(path.join(safetyDir, latestSafety), 'utf-8');
        const decrypted = decryptBackupData(content);
        if (!decrypted.success || !decrypted.data) {
          return res.status(500).json({ success: false, error: 'رمزگشایی نسخه ایمنی با خطا مواجه شد.' });
        }

        if (isPgActive() && getActivePgPool()) {
          for (const key of KNOWN_TABLES) {
            try { await getActivePgPool().query(`TRUNCATE TABLE "${key}" CASCADE`); } catch (e) {}
          }
        } else {
          try { getDb().prepare('DELETE FROM store').run(); } catch(e) {}
        }

        for (const [key, value] of Object.entries(decrypted.data)) {
          if (KNOWN_TABLES.includes(key) || key === 'store_settings' || key === 'company_profile') {
            await setDbData(key, value);
          }
        }

        const userInfo = extractRequestUser(req);
        await appendDbLog('بازگشت اضطراری به نسخه ایمنی', 'success', `سیستم با موفقیت به آخرین نسخه ایمنی (${latestSafety}) بازگردانی شد.`);
        res.json({ success: true, restoredFile: latestSafety, message: 'سیستم با موفقیت به نسخه ایمنی قبل از بازیابی بازگردانده شد.' });
    } catch(err: any) {
        res.status(500).json({ success: false, error: err.message });
    }
});

router.get('/api/db/backups/download/:filename', requireRole(['admin']), async (req, res) => {
     try {
         const { filename } = req.params;
         const { decrypt } = req.query;
         if (!/^[a-zA-Z0-9_\-\.]+$/.test(filename) || filename.includes('..')) {
           return res.status(400).json({ error: 'نام فایل نامعتبر است' });
         }
         const dir = path.resolve(await getBackupsDir());
         const filePath = path.resolve(dir, filename);
         if (!filePath.startsWith(dir)) return res.status(403).json({ error: 'مسیر غیرمجاز' });

         if (decrypt === 'true' && filename.endsWith('.json')) {
           const fileContent = await fsPromises.readFile(filePath, 'utf-8');
           const dec = decryptBackupData(fileContent);
           if (dec.success && dec.data) {
             res.setHeader('Content-Type', 'application/json');
             res.setHeader('Content-Disposition', `attachment; filename=decrypted-${filename}`);
             return res.send(JSON.stringify(dec.data, null, 2));
           }
         }

         res.download(filePath);
     } catch(e: any) {
         res.status(500).json({ error: e.message });
     }
  });

  router.delete('/api/db/backups/:filename', requireRole(['admin']), async (req, res) => {
      try {
         const { filename } = req.params;
         if (!/^[a-zA-Z0-9_\-\.]+$/.test(filename) || filename.includes('..')) {
           return res.status(400).json({ error: 'نام فایل نامعتبر است' });
         }
         const dir = path.resolve(await getBackupsDir());
         const filePath = path.resolve(dir, filename);
         if (!filePath.startsWith(dir)) return res.status(403).json({ error: 'مسیر غیرمجاز' });
         await fsPromises.unlink(filePath);
         res.json({ success: true });
      } catch(e: any) {
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
      
      const storeId = storeContext.getStore() || 'default';
      const fileName = `backup-${storeId}-${getFormattedBackupDate()}.json`;
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);

      if (req.query.decrypt === 'true') {
        res.send(JSON.stringify(backupData, null, 2));
      } else {
        const { jsonString } = encryptBackupData(backupData, storeId);
        res.send(jsonString);
      }
    } catch (err: any) {
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
        let tCount = 0;
        let iCount = 0;
        try {
           const tres = await getActivePgPool().query(`SELECT count(*) FROM transactions WHERE account_id IS NOT NULL AND account_id NOT IN (SELECT id FROM accounts)`);
           tCount = parseInt(tres.rows[0].count, 10);
        } catch(e) {}
        try {
           const ires = await getActivePgPool().query(`SELECT count(*) FROM invoice_items WHERE invoice_id IS NOT NULL AND invoice_id NOT IN (SELECT id FROM invoices)`);
           iCount = parseInt(ires.rows[0].count, 10);
        } catch(e) {}
        orphanedRecords = tCount + iCount;
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


router.post('/api/db/backups/upload', requireRole(['admin']), async (req, res) => {
  try {
    const { filename, content } = req.body;
    if (!filename || !content) return res.status(400).json({ error: 'نام فایل و محتوا الزامی است.' });
    
    // Strict filename validation and path traversal prevention
    const baseName = path.basename(filename);
    const ext = path.extname(baseName).toLowerCase();
    if (!['.json', '.sql'].includes(ext)) {
      return res.status(400).json({ error: 'فرمت فایل مجاز نیست. فقط فایل‌های .json و .sql به عنوان فایل پشتیبان پذیرفته می‌شوند.' });
    }

    // Header & Format Validation: verify the uploaded file is indeed a valid backup
    if (ext === '.json') {
      try {
        const parsed = JSON.parse(content);
        if (typeof parsed !== 'object' || parsed === null) {
          return res.status(400).json({ error: 'فرمت داده‌های فایل JSON پشتیبان نامعتبر است.' });
        }
      } catch (jsonErr: any) {
        return res.status(400).json({ error: 'محتوای فایل JSON معتبر نبوده و قابل پردازش نیست.' });
      }
    } else if (ext === '.sql') {
      const trimmed = content.trim();
      const validSqlStart = /^(--|\/\*|CREATE|INSERT|SET|BEGIN|SELECT|DROP|ALTER)/i.test(trimmed);
      const dangerousPatterns = /\b(exec\s+xp_|\\!|COPY\s+.*\s+PROGRAM|cmd\.exe|\/bin\/sh|\/bin\/bash)\b/i.test(trimmed);
      if (!validSqlStart || dangerousPatterns) {
        return res.status(400).json({ error: 'محتوای فایل SQL دارای خطای ساختاری یا دستورات اجرایی غیرمجاز است.' });
      }
    }

    const dir = await getBackupsDir();
    await fsPromises.mkdir(dir, { recursive: true });
    const cleanBase = baseName.replace(/[^a-zA-Z0-9_\-\.]/g, '_');
    const safeName = 'uploaded-' + Date.now() + '-' + cleanBase;
    const filePath = path.join(dir, safeName);
    
    await fsPromises.writeFile(filePath, content, 'utf-8');
    
    await appendDbLog('آپلود بک‌آپ', 'success', `فایل ${filename} با موفقیت آپلود و اعتبارسنجی شد.`);
    res.json({ success: true, file: safeName });
  } catch (err: any) {
    await appendDbLog('آپلود بک‌آپ', 'error', `خطا در آپلود: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

router.post('/api/db/explore-folders', requireRole(['admin']), async (req, res) => {
  try {
    const appRoot = path.resolve(process.cwd());
    const backupsRoot = path.resolve(await getBackupsDir());
    const allowedRoots = [appRoot, backupsRoot];

    let targetPath = req.body.path ? path.resolve(req.body.path) : appRoot;
    // Security check: block path traversal and direct OS filesystem exploration
    const isAllowed = allowedRoots.some(allowed => targetPath.startsWith(allowed));
    if (!isAllowed) {
      targetPath = appRoot;
    }

    try {
      await fsPromises.access(targetPath, fsPromises.constants.R_OK);
    } catch(e) {
      targetPath = appRoot;
    }
    const items = await fsPromises.readdir(targetPath, { withFileTypes: true });
    const folders = items.filter(i => i.isDirectory()).map(i => i.name).sort();
    const parent = path.dirname(targetPath);
    const parentAllowed = allowedRoots.some(allowed => parent.startsWith(allowed));
    res.json({ current: targetPath, parent: parentAllowed && parent !== targetPath ? parent : null, folders });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/api/db/cloud/backups', async (req, res) => {
  try {
    const list = await getDbData('cloudBackups');
    res.json(Array.isArray(list) ? list : []);
  } catch(e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/api/db/cloud/test-connection', requireRole(['admin']), async (req, res) => {
  const { provider, config } = req.body;
  const cfg = { ...backupConfig, ...(config || {}) };
  const targetProvider = provider || cfg.cloudProvider || cfg.remoteProvider || 'gdrive';

  try {
    if (targetProvider === 'gdrive') {
      const token = cfg.gdriveToken;
      if (!token) return res.status(400).json({ success: false, error: 'توکن Google Drive تنظیم نشده است.' });
      
      const gRes = await fetch('https://www.googleapis.com/drive/v3/about?fields=user,storageQuota', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!gRes.ok) {
        const text = await gRes.text();
        return res.status(400).json({ success: false, error: `خطای گوگل: ${text}` });
      }
      const data = await gRes.json();
      return res.json({
        success: true,
        provider: 'gdrive',
        user: data.user?.displayName || data.user?.emailAddress || 'Google User',
        email: data.user?.emailAddress,
        quota: data.storageQuota,
        message: 'اتصال به Google Drive با موفقیت تأیید شد.'
      });
    } else if (targetProvider === 'onedrive') {
      const token = cfg.onedriveToken;
      if (!token) return res.status(400).json({ success: false, error: 'توکن Microsoft OneDrive تنظیم نشده است.' });

      const oRes = await fetch('https://graph.microsoft.com/v1.0/me/drive', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!oRes.ok) {
        const text = await oRes.text();
        return res.status(400).json({ success: false, error: `خطای OneDrive: ${text}` });
      }
      const data = await oRes.json();
      return res.json({
        success: true,
        provider: 'onedrive',
        user: data.owner?.user?.displayName || 'Microsoft User',
        quota: data.quota,
        message: 'اتصال به Microsoft OneDrive با موفقیت تأیید شد.'
      });
    } else if (targetProvider === 's3') {
      if (!cfg.cloudAuthUrl || !cfg.cloudUser || !cfg.cloudPass) {
        return res.status(400).json({ success: false, error: 'مشخصات سرور S3 کامل نیست.' });
      }
      const s3 = new S3Client({
        region: cfg.region || 'default',
        endpoint: cfg.cloudAuthUrl.startsWith('http') ? cfg.cloudAuthUrl : `https://${cfg.cloudAuthUrl}`,
        credentials: {
          accessKeyId: cfg.cloudUser,
          secretAccessKey: cfg.cloudPass
        }
      });
      const bucket = cfg.cloudBucket || 'taraz-backups';
      const { ListObjectsV2Command } = await import('@aws-sdk/client-s3');
      await s3.send(new ListObjectsV2Command({ Bucket: bucket, MaxKeys: 1 }));
      return res.json({
        success: true,
        provider: 's3',
        message: `اتصال به فضای ابری S3 (باکت ${bucket}) با موفقیت تأیید شد.`
      });
    }

    res.status(400).json({ success: false, error: 'ارائه‌دهنده ابری نامعتبر است.' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'خطا در برقراری ارتباط' });
  }
});

router.post('/api/db/cloud/upload-backup', requireRole(['admin']), async (req, res) => {
  try {
    const { filename } = req.body;
    if (!filename) return res.status(400).json({ error: 'نام فایل الزامی است.' });
    if (!/^[a-zA-Z0-9_\-\.]+$/.test(filename) || filename.includes('..')) {
      return res.status(400).json({ error: 'نام فایل نامعتبر است.' });
    }
    
    const dir = path.resolve(await getBackupsDir());
    const filePath = path.resolve(dir, filename);
    if (!filePath.startsWith(dir)) return res.status(403).json({ error: 'مسیر غیرمجاز' });
    
    const fileContent = await fsPromises.readFile(filePath, 'utf-8');
    await dispatchCloudUpload(filename, fileContent);
    
    res.json({ success: true, message: `فایل ${filename} با موفقیت به فضای ابری ارسال گردید.` });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/api/db/cloud/sync-now', requireRole(['admin']), async (req, res) => {
  try {
    await runBackupJob();
    res.json({ success: true, message: 'پشتیبان‌گیری انجام و نسخه در فضای ابری همگام‌سازی شد.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/api/db/cloud/backups/:filename', requireRole(['admin']), async (req, res) => {
  try {
    const { filename } = req.params;
    let list: any[] = [];
    const current = await getDbData('cloudBackups');
    if (Array.isArray(current)) list = current;
    list = list.filter((b: any) => b.file !== filename);
    await setDbData('cloudBackups', list);
    res.json({ success: true });
  } catch(e: any) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
