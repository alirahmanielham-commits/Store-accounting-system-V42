const fs = require('fs');
let code = fs.readFileSync('src/routes/backup.routes.ts', 'utf8');

// 1. In backupStore, we need to throw the error and also log it.
code = code.replace(
`             } catch (err) {
                console.error(\`Backup job failed for store \${storeId}\`, err);
             } finally {`,
`             } catch (err) {
                console.error(\`Backup job failed for store \${storeId}\`, err);
                await appendDbLog('پشتیبان‌گیری', 'error', \`خطا در ایجاد بک‌آپ (\${storeId}): \${err.message}\`);
                throw err;
             } finally {`
);

// 2. In runBackupJob, we need to aggregate errors and throw if any.
code = code.replace(
`const runBackupJob = async () => {
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
};`,
`const runBackupJob = async () => {
    let errors = [];
    try {
        await loadPgPoolForStore('default');
        try { await backupStore('default'); } catch(e) { errors.push(e); }
        const client = getActivePgPool();
        if (client) {
            const res = await client.query('SELECT id FROM businesses WHERE deleted_at IS NULL');
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
};`
);

// 3. Make sure successful backup is logged with path too.
code = code.replace(
`await appendDbLog('بک‌آپ خودکار/دستی', 'success', \`بک‌آپ با حجم \${Buffer.byteLength(fileContent)} بایت ایجاد شد.\`);`,
`await appendDbLog('بک‌آپ خودکار/دستی', 'success', \`بک‌آپ با حجم \${Buffer.byteLength(fileContent)} بایت در مسیر \${filePath} ایجاد شد.\`);`
);

fs.writeFileSync('src/routes/backup.routes.ts', code);
