const fs = require('fs');
let code = fs.readFileSync('src/routes/backup.routes.ts', 'utf8');

code = code.replace(/const jsonFiles = files\.filter\(f => f\.startsWith\('backup-'\) && \(f\.endsWith\('\.json'\) \|\| f\.endsWith\('\.sql'\)\)\)\.sort\(\(a,b\) => b\.localeCompare\(a\)\);/, `const storeId = storeContext.getStore() || 'default';
        const jsonFiles = files.filter(f => (f.startsWith(\`backup-\${storeId}-\`) || f.startsWith('backup-1')) && (f.endsWith('.json') || f.endsWith('.sql'))).sort((a,b) => b.localeCompare(a));`);

fs.writeFileSync('src/routes/backup.routes.ts', code);
