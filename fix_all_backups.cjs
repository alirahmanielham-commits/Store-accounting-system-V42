const fs = require('fs');
let code = fs.readFileSync('src/routes/backup.routes.ts', 'utf8');

const s3Import = `
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import cron from 'node-cron';
import { loadPgPoolForStore } from '../db/connection';
`;

if (!code.includes('import cron')) {
   code = code.replace("import { Router } from 'express';", "import { Router } from 'express';\n" + s3Import);
}

// Strip out the old runBackupJob and backupInterval completely
const oldBackupStart = code.indexOf('const runBackupJob = async () => {');
const oldBackupEnd = code.indexOf('router.post("/api/db/backups/create"');

if (oldBackupStart !== -1 && oldBackupEnd !== -1) {
   // Also remove let backupInterval = null;
   code = code.replace(/let backupInterval = null;\s*/, '');
   
   const newBackupLogic = `
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
                const fileName = \`backup-\${storeId}-\${getFormattedBackupDate()}.json\`;
                const filePath = path.join(dir, fileName);
                const fileContent = JSON.stringify(backupData);
                await fsPromises.writeFile(filePath, fileContent);
                
                // Upload to S3 if enabled
                if (backupConfig.storageType === 'cloud' || backupConfig.remoteProvider === 's3') {
                    if (backupConfig.cloudAuthUrl && backupConfig.cloudUser && backupConfig.cloudPass) {
                       try {
                           const s3 = new S3Client({
                              region: 'default',
                              endpoint: backupConfig.cloudAuthUrl.startsWith('http') ? backupConfig.cloudAuthUrl : \`https://\${backupConfig.cloudAuthUrl}\`,
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
                           await appendDbLog('بک‌آپ ابری', 'success', \`آپلود موفق به ابری: \${fileName}\`);
                       } catch(s3Err) {
                           console.error('S3 Upload Error:', s3Err);
                           await appendDbLog('بک‌آپ ابری', 'error', \`خطا در آپلود ابری: \${s3Err.message}\`);
                       }
                    }
                }
                
                await appendDbLog('بک‌آپ خودکار/دستی', 'success', \`بک‌آپ با حجم \${Buffer.byteLength(fileContent)} بایت ایجاد شد.\`);
                
                // keep only last N backups per store
                const retentionCount = backupConfig.retention || 20;
                const files = await fsPromises.readdir(dir);
                const jsonFiles = files.filter(f => f.startsWith(\`backup-\${storeId}-\`) && (f.endsWith('.json') || f.endsWith('.sql')));
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
                console.error(\`Backup job failed for store \${storeId}\`, err);
             } finally {
                resolve();
             }
        });
    });
};

const runBackupJob = async () => {
    try {
        await loadPgPoolForStore('default');
        await backupStore('default');

        const client = getActivePgPool();
        if (client) {
            const res = await client.query('SELECT id FROM businesses WHERE deleted_at IS NULL');
            for (const row of res.rows) {
                await loadPgPoolForStore(row.id);
                await backupStore(row.id);
            }
        }
    } catch(e) {
        console.error('Global backup job error', e);
    }
};

const setupBackupSchedule = () => {
    activeCronJobs.forEach(job => job.stop());
    activeCronJobs = [];
    if (!backupConfig.enabled) return;
    
    let cronExpr = backupConfig.cron || '0 2 * * *';
    
    if (backupConfig.frequency === 'daily') {
       const parts = (backupConfig.time || '02:00').split(':');
       cronExpr = \`\${parts[1] || '0'} \${parts[0] || '2'} * * *\`;
    } else if (backupConfig.frequency === 'weekly') {
       const parts = (backupConfig.time || '02:00').split(':');
       cronExpr = \`\${parts[1] || '0'} \${parts[0] || '2'} * * 0\`;
    } else if (backupConfig.frequency === 'monthly') {
       const parts = (backupConfig.time || '02:00').split(':');
       cronExpr = \`\${parts[1] || '0'} \${parts[0] || '2'} 1 * *\`;
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

`;
   code = code.substring(0, oldBackupStart) + newBackupLogic + code.substring(oldBackupEnd);
}

code = code.replace(/if \(backupInterval\) clearInterval\(backupInterval\);/g, 'setupBackupSchedule();');
code = code.replace(/if \(backupConfig\.enabled && backupConfig\.intervalHours > 0\) \{\s*backupInterval = setInterval\(\(\) => runBackupJob\(\)\.catch\(console\.error\), backupConfig\.intervalHours \* 60 \* 60 \* 1000\);\s*\}/g, '');

fs.writeFileSync('src/routes/backup.routes.ts', code);
