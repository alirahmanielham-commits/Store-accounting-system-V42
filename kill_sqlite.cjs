const fs = require('fs');

let conn = fs.readFileSync('src/db/connection.ts', 'utf8');
conn = conn.replace(/import \{ DatabaseSync \} from 'node:sqlite';\n/g, '');
conn = conn.replace(/dbs\[storeId\] = new DatabaseSync\(dbFile\);/g, "throw new Error('SQLite is permanently disabled. Only PostgreSQL must be used.');");
fs.writeFileSync('src/db/connection.ts', conn);

let kv = fs.readFileSync('src/db/kv-store.ts', 'utf8');
kv = kv.replace(/getDb\(\)\.prepare\(/g, "if (true) throw new Error('SQLite usage is disabled. Please configure PostgreSQL.'); getDb().prepare(");
fs.writeFileSync('src/db/kv-store.ts', kv);

console.log('Killed SQLite');
