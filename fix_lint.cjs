const fs = require('fs');

// Fix auth.routes.ts
let auth = fs.readFileSync('src/routes/auth.routes.ts', 'utf8');
auth = auth.replace(/import \{ getDb, getActivePgPool, isPgActive, DB_CONFIG_FILE, dbs, DATA_FILE \} from '\.\.\/db\/connection';\nimport \{ getDbData, setDbData, getAllDbData, innerGetDbData, innerSetDbData \} from '\.\.\/db\/kv-store';\nimport \{ KNOWN_TABLES, tableSchemas \} from '\.\.\/db\/schema-sync';\n/g, '');

auth = auth.replace(/const decoded = jwt\.verify\(token, process\.env\.JWT_SECRET \|\| 'default_secret'\);/g, "const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default_secret') as any;");

fs.writeFileSync('src/routes/auth.routes.ts', auth);

// Fix data.routes.ts
let data = fs.readFileSync('src/routes/data.routes.ts', 'utf8');
data = data.replace(/return res\.status\(400\)\.json\(\{ error: validationResult\.error\.errors \}\);/g, "return res.status(400).json({ error: (validationResult as any).error?.errors || 'Validation Error' });");
fs.writeFileSync('src/routes/data.routes.ts', data);

console.log('Fixed lint issues');
