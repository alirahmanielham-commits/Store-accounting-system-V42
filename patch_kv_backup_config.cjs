const fs = require('fs');
let code = fs.readFileSync('src/db/kv-store.ts', 'utf8');

code = code.replace(
`      if (key === 'company_profile') {
        try {
            const r = await getActivePgPool().query("SELECT * FROM system_settings");
            if (r.rows.length === 0) {
               const r2 = await getActivePgPool().query("SELECT value FROM store WHERE key = 'company_profile'");
               if (r2.rows.length > 0) return JSON.parse(r2.rows[0].value);
               return null;
            }
            const obj = { id: 'singleton' };
            for (const row of r.rows) {
                try { obj[row.setting_key] = JSON.parse(row.setting_value); } catch(e) { obj[row.setting_key] = row.setting_value; }
            }
            return obj;
        } catch(e) { return null; }
      }
      return res.rows.map(parseJSONFields);`,
`      if (key === 'company_profile') {
        try {
            const r = await getActivePgPool().query("SELECT * FROM system_settings");
            if (r.rows.length === 0) {
               const r2 = await getActivePgPool().query("SELECT value FROM store WHERE key = 'company_profile'");
               if (r2.rows.length > 0) return JSON.parse(r2.rows[0].value);
               return null;
            }
            const obj = { id: 'singleton' };
            for (const row of r.rows) {
                try { obj[row.setting_key] = JSON.parse(row.setting_value); } catch(e) { obj[row.setting_key] = row.setting_value; }
            }
            return obj;
        } catch(e) { return null; }
      } else if (key === 'backupConfig') {
          return res.rows.length > 0 ? parseJSONFields(res.rows[0]) : null;
      }
      return res.rows.map(parseJSONFields);`);

fs.writeFileSync('src/db/kv-store.ts', code);
