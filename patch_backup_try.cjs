const fs = require('fs');
let code = fs.readFileSync('src/db/kv-store.ts', 'utf8');

// Replace the loop in getAllDbData to properly catch table not found errors
code = code.replace(/for \(const key of KNOWN_TABLES\) \{[\s\S]*?return allData;/, `for (const key of KNOWN_TABLES) {
       try {
           const isSoftDeletable = ["checkbooks", "issued_checks", "received_checks"].includes(key);
           const res = await getActivePgPool().query(\`SELECT * FROM "\${key}"\${isSoftDeletable ? ' WHERE deleted_at IS NULL' : ''}\`);
           if (key === 'company_profile') {
             let cval = null;
             try {
                await getActivePgPool().query(\`CREATE TABLE IF NOT EXISTS system_settings (setting_key VARCHAR PRIMARY KEY, setting_value TEXT)\`);
                const cres = await getActivePgPool().query(\`SELECT * FROM system_settings\`);
                if (cres.rows.length > 0) {
                   cval = { id: 'singleton' };
                   for (const r of cres.rows) {
                      try { cval[r.setting_key] = JSON.parse(r.setting_value); }
                      catch(e) { cval[r.setting_key] = r.setting_value; }
                   }
                }
             } catch(e) { }
             allData.push({ key, value: cval });
           } else if (key === 'backupConfig') {
             allData.push({ key, value: res.rows.length > 0 ? parseJSONFields(res.rows[0]) : null });
           } else {
             allData.push({ key, value: res.rows.map(parseJSONFields) });
           }
       } catch (err) {
           console.error("Error reading table " + key, err);
           allData.push({ key, value: (key === 'company_profile' || key === 'backupConfig') ? null : [] });
       }
    }
    return allData;`);

fs.writeFileSync('src/db/kv-store.ts', code);
