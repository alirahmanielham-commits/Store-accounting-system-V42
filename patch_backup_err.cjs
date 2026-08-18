const fs = require('fs');
let code = fs.readFileSync('src/db/kv-store.ts', 'utf8');

code = code.replace(/console\.error\("Error reading table " \+ key, err\);/g, 'console.error("Error reading table " + key, err.message);');

fs.writeFileSync('src/db/kv-store.ts', code);
