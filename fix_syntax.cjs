const fs = require('fs');

let kv = fs.readFileSync('src/db/kv-store.ts', 'utf8');

// The simplest way to fix this is to just completely wipe out the `else` blocks containing SQLite
// or replace the inner text. Let's just redefine `getDb()` to throw an error inside `kv-store.ts` 
// if it tries to use it. But wait, `getDb` is imported.

kv = kv.replace(/if \(true\) throw new Error\('SQLite usage is disabled\. Please configure PostgreSQL\.'\); /g, '');

// Then replace `getDb()` with `(() => { throw new Error("SQLite disabled") })()`
kv = kv.replace(/getDb\(\)\.prepare\(/g, "(() => { throw new Error('SQLite usage is disabled. Please configure PostgreSQL.'); })().prepare(");

fs.writeFileSync('src/db/kv-store.ts', kv);

console.log('Fixed syntax error');
