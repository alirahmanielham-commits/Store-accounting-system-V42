const fs = require('fs');
let code = fs.readFileSync('src/routes/backup.routes.ts', 'utf8');

code = code.replace(/const runBackupJob = async \(\) => \{[\s\S]*?^};/m,
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
};`);

fs.writeFileSync('src/routes/backup.routes.ts', code);
