const fs = require('fs');
let code = fs.readFileSync('src/db/kv-store.ts', 'utf8');

code = code.replace(
`    return null; else { try { const row = ({ prepare: (...args: any[]) => ({ run: (...a: any[]) => {}, all: (...a: any[]) => [], get: (...a: any[]) => null }) }).prepare("SELECT value FROM store WHERE key = ?").get(key) as any; if (row) { return JSON.parse(row.value); } return null; } catch (e) { return null; } }`,
`    `);

fs.writeFileSync('src/db/kv-store.ts', code);
