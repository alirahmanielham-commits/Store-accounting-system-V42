const fs = require('fs');
let code = fs.readFileSync('src/db/kv-store.ts', 'utf8');

code = code.replace(
`         let res;
         try {
             res = await client.query(\`SELECT * FROM "\${key}"\${isSoftDeletable ? ' WHERE deleted_at IS NULL' : ''}\`);
         } catch (err) {
             if (err.code === '42703') {
                 res = await client.query(\`SELECT * FROM "\${key}"\`);
             } else {
                 throw err;
             }
         }
         if (key === 'company_profile') {
           let cval = null;
           try {
              await client.query(\`CREATE TABLE IF NOT EXISTS system_settings (setting_key VARCHAR PRIMARY KEY, setting_value TEXT)\`);
              const cres = await client.query(\`SELECT * FROM system_settings\`);
              if (cres.rows.length > 0) {
                 cval = { id: 'singleton' };
                 for (const r of cres.rows) {
                    try { cval[r.setting_key] = JSON.parse(r.setting_value); }
                    catch(e) { cval[r.setting_key] = r.setting_value; }
                 }
              }
           } catch(e) { }`,
`         let res;
         await client.query(\`SAVEPOINT sp_table\`);
         try {
             res = await client.query(\`SELECT * FROM "\${key}"\${isSoftDeletable ? ' WHERE deleted_at IS NULL' : ''}\`);
             await client.query(\`RELEASE SAVEPOINT sp_table\`);
         } catch (err) {
             await client.query(\`ROLLBACK TO SAVEPOINT sp_table\`);
             if (err.code === '42703') {
                 await client.query(\`SAVEPOINT sp_fallback\`);
                 try {
                     res = await client.query(\`SELECT * FROM "\${key}"\`);
                     await client.query(\`RELEASE SAVEPOINT sp_fallback\`);
                 } catch (errFallback) {
                     await client.query(\`ROLLBACK TO SAVEPOINT sp_fallback\`);
                     res = { rows: [] };
                 }
             } else if (err.code === '42P01') {
                 res = { rows: [] };
             } else {
                 throw err;
             }
         }
         if (key === 'company_profile') {
           let cval = null;
           await client.query(\`SAVEPOINT sp_sysset\`);
           try {
              await client.query(\`CREATE TABLE IF NOT EXISTS system_settings (setting_key VARCHAR PRIMARY KEY, setting_value TEXT)\`);
              const cres = await client.query(\`SELECT * FROM system_settings\`);
              await client.query(\`RELEASE SAVEPOINT sp_sysset\`);
              if (cres.rows.length > 0) {
                 cval = { id: 'singleton' };
                 for (const r of cres.rows) {
                    try { cval[r.setting_key] = JSON.parse(r.setting_value); }
                    catch(e) { cval[r.setting_key] = r.setting_value; }
                 }
              }
           } catch(e) {
              await client.query(\`ROLLBACK TO SAVEPOINT sp_sysset\`);
           }`);

fs.writeFileSync('src/db/kv-store.ts', code);
