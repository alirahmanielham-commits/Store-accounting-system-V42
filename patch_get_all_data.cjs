const fs = require('fs');
let code = fs.readFileSync('src/db/kv-store.ts', 'utf8');

const regex = /export async function getAllDbData\(\) \{[\s\S]*?return allData;\n  \} else \{/;

const replacement = `export async function getAllDbData() {
  if (isPgActive() && getActivePgPool()) {
    const allData = [];
    const parseJSONFields = (row) => {
       if (!row) return row;
       for (const k in row) {
          if (typeof row[k] === 'string' && (row[k].startsWith('{') || row[k].startsWith('['))) {
             try { row[k] = JSON.parse(row[k]); } catch(e) { }
          }
       }
       return row;
    };
    const client = await getActivePgPool().connect();
    try {
      await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ');
      for (const key of KNOWN_TABLES) {
         const isSoftDeletable = ["checkbooks", "issued_checks", "received_checks"].includes(key);
         const res = await client.query(\`SELECT * FROM "\${key}"\${isSoftDeletable ? ' WHERE deleted_at IS NULL' : ''}\`);
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
           } catch(e) { }
           allData.push({ key, value: cval });
         } else if (key === 'backupConfig') {
           allData.push({ key, value: res.rows.length > 0 ? parseJSONFields(res.rows[0]) : null });
         } else {
           allData.push({ key, value: res.rows.map(parseJSONFields) });
         }
      }
      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
    return allData;
  } else {`;

if (code.match(regex)) {
   code = code.replace(regex, replacement);
   fs.writeFileSync('src/db/kv-store.ts', code);
   console.log('patched successfully');
} else {
   console.log('regex mismatch');
}
