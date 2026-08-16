const fs = require('fs');
const file = 'src/routes/database.routes.ts';
let content = fs.readFileSync(file, 'utf8');

// Replace the destructuring
content = content.replace(/const \{ name \} = req\.body;/, "const { name, calendarType } = req.body;\n      const calType = calendarType || 'jalali';");

// For postgres successful creation (before return)
content = content.replace(/return res\.json\(\{ success: true, database: \{ id, name, db_type: 'postgres', db_name: dbNameForBusiness \} \}\);/, `
          try {
             const newUrl = new URL(config.connectionString);
             newUrl.pathname = '/' + dbNameForBusiness;
             const initPool = new Pool({ connectionString: newUrl.toString() });
             await initPool.query('CREATE TABLE IF NOT EXISTS system_settings (setting_key VARCHAR PRIMARY KEY, setting_value TEXT)');
             const initPayload = JSON.stringify({ storeName: name, calendarType: calType });
             await initPool.query('INSERT INTO system_settings (setting_key, setting_value) VALUES ($1, $2) ON CONFLICT(setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value', ['company_profile', initPayload]);
             await initPool.end();
          } catch(e) { console.error("Failed to init postgres system_settings:", e); }
          return res.json({ success: true, database: { id, name, db_type: 'postgres', db_name: dbNameForBusiness } });
`);

// For sqlite successful creation
content = content.replace(/newDb\.exec\(\`\n        CREATE TABLE IF NOT EXISTS store \(\n          key TEXT PRIMARY KEY,\n          value TEXT NOT NULL\n        \)\n      \`\);/, `newDb.exec(\`
        CREATE TABLE IF NOT EXISTS store (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL
        )
      \`);
      try {
         const initPayload = JSON.stringify({ storeName: name, calendarType: calType });
         const stmt = newDb.prepare("INSERT INTO store (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value");
         stmt.run('company_profile', initPayload);
         // Also duplicate in system_settings if required by kv-store
         newDb.exec("CREATE TABLE IF NOT EXISTS system_settings (setting_key TEXT PRIMARY KEY, setting_value TEXT)");
         const stmt2 = newDb.prepare("INSERT INTO system_settings (setting_key, setting_value) VALUES (?, ?) ON CONFLICT(setting_key) DO UPDATE SET setting_value = excluded.setting_value");
         stmt2.run('company_profile', initPayload);
      } catch(e) {}
`);

fs.writeFileSync(file, content);
console.log('Fixed database routes');
