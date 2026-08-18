const fs = require('fs');
let code = fs.readFileSync('src/routes/backup.routes.ts', 'utf8');

code = code.replace(/const runBackupJob = async \(\) => \{/g, `const runBackupJob = async () => {
     const storeId = storeContext.getStore() || 'default';
     console.log("Running backup for store:", storeId);`);
     
code = code.replace(/const fileName = \`backup-\$\{Date\.now\(\)\}\.json\`;/g, 'const fileName = `backup-${storeId}-${Date.now()}.json`;');

fs.writeFileSync('src/routes/backup.routes.ts', code);
