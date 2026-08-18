const fs = require('fs');
let code = fs.readFileSync('src/routes/backup.routes.ts', 'utf8');

const replacement = `
import cron from 'node-cron';

let activeCronJobs = [];

const runBackupJob = async () => {
    try {
        // First, backup default
        await backupStore('default');

        // Then backup all other stores
        const client = getActivePgPool();
        if (client) {
            const res = await client.query('SELECT id FROM businesses WHERE deleted_at IS NULL');
            for (const row of res.rows) {
                await backupStore(row.id);
            }
        }
    } catch(e) {
        console.error('Global backup job error', e);
    }
};

const backupStore = async (storeId) => {
    return new Promise((resolve) => {
        storeContext.run(storeId, async () => {
             console.log("Running backup for store:", storeId);
             try {
                const dir = await getBackupsDir();
                await fsPromises.mkdir(dir, { recursive: true });
                const rows = await getAllDbData();
                const backupData = {};
                for (const row of rows) {
                  backupData[row.key] = row.value;
                }
                const fileName = \`backup-\${storeId}-\${getFormattedBackupDate()}.json\`;
                await fsPromises.writeFile(path.join(dir, fileName), JSON.stringify(backupData));
                await appendDbLog('بک‌آپ خودکار/دستی', 'success', \`بک‌آپ با حجم \${Buffer.byteLength(JSON.stringify(backupData))} بایت ایجاد شد.\`);
                
                // keep only last 20 backups per store
                const files = await fsPromises.readdir(dir);
                const jsonFiles = files.filter(f => (f.startsWith(\`backup-\${storeId}-\`)) && (f.endsWith('.json') || f.endsWith('.sql')));
                const filesWithStats = await Promise.all(jsonFiles.map(async f => {
                    const stat = await fsPromises.stat(path.join(dir, f));
                    return { file: f, time: stat.mtimeMs };
                }));
                filesWithStats.sort((a,b) => b.time - a.time);
                const sortedJsonFiles = filesWithStats.map(f => f.file);
                
                if (sortedJsonFiles.length > 20) {
                   for (let i = 20; i < sortedJsonFiles.length; i++) {
                      await fsPromises.unlink(path.join(dir, sortedJsonFiles[i]));
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

const setupBackupSchedule = () => {
    activeCronJobs.forEach(job => job.stop());
    activeCronJobs = [];
    if (!backupConfig.enabled) return;
    
    let cronExpr = backupConfig.cron || '0 2 * * *';
    
    if (backupConfig.frequency === 'daily') {
       const parts = (backupConfig.time || '02:00').split(':');
       cronExpr = \`\${parts[1]} \${parts[0]} * * *\`;
    } else if (backupConfig.frequency === 'weekly') {
       const parts = (backupConfig.time || '02:00').split(':');
       cronExpr = \`\${parts[1]} \${parts[0]} * * 0\`;
    } else if (backupConfig.frequency === 'monthly') {
       const parts = (backupConfig.time || '02:00').split(':');
       cronExpr = \`\${parts[1]} \${parts[0]} 1 * *\`;
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

// we need to replace the old logic
code = code.replace(/let backupInterval: any;\n\s*const runBackupJob = async \(\) => \{[\s\S]*?router\.post\("\/api\/db\/backups\/create"/, replacement + '\n\n  router.post("/api/db/backups/create"');

// And add "import cron from 'node-cron';" at the top if not present
if (!code.includes("import cron from 'node-cron'")) {
    code = code.replace("import fsPromises", "import cron from 'node-cron';\nimport fsPromises");
}

code = code.replace(/backupInterval = setInterval\(\(\) => runBackupJob\(\)\.catch\(console\.error\), backupConfig\.intervalHours \* 60 \* 60 \* 1000\);/g, 'setupBackupSchedule();');
code = code.replace(/if \(backupInterval\) clearInterval\(backupInterval\);/g, '');

fs.writeFileSync('src/routes/backup.routes.ts', code);
