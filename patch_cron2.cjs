const fs = require('fs');
let code = fs.readFileSync('src/routes/backup.routes.ts', 'utf8');

code = code.replace(/await backupStore\('default'\);/, 'await loadPgPoolForStore("default");\n        await backupStore("default");');
code = code.replace(/await backupStore\(row\.id\);/g, 'await loadPgPoolForStore(row.id);\n                await backupStore(row.id);');
if (!code.includes('loadPgPoolForStore')) {
   code = code.replace(/import \{ usePgMap, activePgPools, storeContext/, "import { loadPgPoolForStore, usePgMap, activePgPools, storeContext");
}

fs.writeFileSync('src/routes/backup.routes.ts', code);
