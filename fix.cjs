const fs = require('fs');

let auth = fs.readFileSync('src/middleware/auth.middleware.ts', 'utf8');
auth = auth.replace('  });\n  // ==============================;', '};');
fs.writeFileSync('src/middleware/auth.middleware.ts', auth);

let storeCtx = fs.readFileSync('src/middleware/store-context.middleware.ts', 'utf8');
storeCtx = storeCtx.replace('    });\n  });;', '    });\n};');
fs.writeFileSync('src/middleware/store-context.middleware.ts', storeCtx);
