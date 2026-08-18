const fs = require('fs');
let code = fs.readFileSync('src/db/kv-store.ts', 'utf8');

code = code.replace(/const fs = require\('fs'\);/g, 'const fs = await import("fs");');
code = code.replace(/const path = require\('path'\);/g, 'const path = await import("path");');

fs.writeFileSync('src/db/kv-store.ts', code);
