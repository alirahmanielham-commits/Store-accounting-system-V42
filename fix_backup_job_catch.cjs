const fs = require('fs');
let code = fs.readFileSync('src/routes/backup.routes.ts', 'utf8');

code = code.replace(/\} catch \(err\) \{\n        console\.error\('Backup job failed', err\);\n     \}/g, `} catch (err) {
        console.error('Backup job failed', err);
        throw err;
     }`);

code = code.replace(/setInterval\(runBackupJob/g, 'setInterval(() => runBackupJob().catch(console.error)');

fs.writeFileSync('src/routes/backup.routes.ts', code);
