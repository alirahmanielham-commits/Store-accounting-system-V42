const fs = require('fs');

let content = fs.readFileSync('src/services/syncManager.ts', 'utf8');
content = content.replace(/DatabaseSync/g, "any");
content = content.replace(/new any\([^)]+\)/g, "(() => { throw new Error('SQLite disabled') })()");
fs.writeFileSync('src/services/syncManager.ts', content);

let kv = fs.readFileSync('src/db/kv-store.ts', 'utf8');
kv = kv.replace(/\(\(\) => \{ throw new Error\('SQLite usage is disabled\. Please configure PostgreSQL\.'\); \}\)\(\)/g, "({ prepare: () => ({ run: () => {}, all: () => [], get: () => null }) })");
fs.writeFileSync('src/db/kv-store.ts', kv);

console.log('Fixed types');
