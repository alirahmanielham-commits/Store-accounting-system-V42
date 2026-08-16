const fs = require('fs');

let kv = fs.readFileSync('src/db/kv-store.ts', 'utf8');

// Replace the previous bad mock with one that takes arguments
kv = kv.replace(/\(\{ prepare: \(\) => \(\{ run: \(\) => \{\}, all: \(\) => \[\], get: \(\) => null \}\) \}\)/g, "({ prepare: (...args: any[]) => ({ run: (...a: any[]) => {}, all: (...a: any[]) => [], get: (...a: any[]) => null }) })");

fs.writeFileSync('src/db/kv-store.ts', kv);

console.log('Fixed mock in kv-store.ts');
