const fs = require('fs');
let code = fs.readFileSync('src/middleware/store-context.middleware.ts', 'utf8');

code = code.replace(/const storeId = \(req\.headers\['x-store-id'\] as string\) \|\| 'default';/, `const storeId = (req.headers['x-store-id'] as string) || (req.query.storeId as string) || 'default';`);

fs.writeFileSync('src/middleware/store-context.middleware.ts', code);
