const fs = require('fs');

const files = [
  'src/routes/database.routes.ts',
  'src/routes/migration.routes.ts',
  'src/routes/backup.routes.ts',
  'src/routes/data.routes.ts'
];

for (const file of files) {
  if (!fs.existsSync(file)) continue;
  let content = fs.readFileSync(file, 'utf8');
  
  content = content.replace(/import \{ getDb, getActivePgPool, isPgActive, DB_CONFIG_FILE, dbs, DATA_FILE \} from '\.\.\/db\/connection';\nimport \{ getDbData, setDbData, getAllDbData, innerGetDbData, innerSetDbData \} from '\.\.\/db\/kv-store';\nimport \{ KNOWN_TABLES, tableSchemas \} from '\.\.\/db\/schema-sync';\n/g, '');
  
  fs.writeFileSync(file, content);
}
console.log('Fixed imports');
