const fs = require('fs');
let code = fs.readFileSync('src/db/kv-store.ts', 'utf8');

// We will replace the dummy sqlite mock with a simple JSON file store so the app ACTUALLY works without Postgres!
code = code.replace(
`    if (key === 'company_profile') {
        ({ prepare: (...args: any[]) => ({ run: (...a: any[]) => {}, all: (...a: any[]) => [], get: (...a: any[]) => null }) }).prepare('CREATE TABLE IF NOT EXISTS system_settings (setting_key TEXT PRIMARY KEY, setting_value TEXT)').run();
        if (data && typeof data === 'object') {
            const stmt = ({ prepare: (...args: any[]) => ({ run: (...a: any[]) => {}, all: (...a: any[]) => [], get: (...a: any[]) => null }) }).prepare('INSERT INTO system_settings (setting_key, setting_value) VALUES (?, ?) ON CONFLICT(setting_key) DO UPDATE SET setting_value = excluded.setting_value');
            const keys = Object.keys(data);
            for (const k of keys) {
                if (k === 'id') continue;
                let v = data[k];
                const valStr = (v !== null && typeof v === 'object') ? JSON.stringify(v) : String(v);
                stmt.run(k, valStr);
            }
        }
    } else {
        const value = JSON.stringify(data);
        ({ prepare: (...args: any[]) => ({ run: (...a: any[]) => {}, all: (...a: any[]) => [], get: (...a: any[]) => null }) }).prepare('INSERT INTO store (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value').run(key, value);
    }`,
`    const fs = require('fs');
    const path = require('path');
    const dbFile = path.join(process.cwd(), 'data.json');
    let dbData = {};
    if (fs.existsSync(dbFile)) {
        try { dbData = JSON.parse(fs.readFileSync(dbFile, 'utf8')); } catch(e) {}
    }
    dbData[key] = data;
    fs.writeFileSync(dbFile, JSON.stringify(dbData, null, 2));
`
);

code = code.replace(
`      if (key === "company_profile") { try { ({ prepare: (...args: any[]) => ({ run: (...a: any[]) => {}, all: (...a: any[]) => [], get: (...a: any[]) => null }) }).prepare("CREATE TABLE IF NOT EXISTS system_settings (setting_key TEXT PRIMARY KEY, setting_value TEXT)").run(); const rows = ({ prepare: (...args: any[]) => ({ run: (...a: any[]) => {}, all: (...a: any[]) => [], get: (...a: any[]) => null }) }).prepare("SELECT * FROM system_settings").all(); if (!rows || rows.length === 0) return null; const obj = { id: "singleton" }; for (const row of rows as any[]) { try { (obj as any)[row.setting_key] = JSON.parse(row.setting_value); } catch(e) { (obj as any)[row.setting_key] = row.setting_value; } } return obj; } catch (e) { return null; } } else { try { const row = ({ prepare: (...args: any[]) => ({ run: (...a: any[]) => {}, all: (...a: any[]) => [], get: (...a: any[]) => null }) }).prepare("SELECT value FROM store WHERE key = ?").get(key) as any; if (row) { return JSON.parse(row.value); } return null; } catch (e) { return null; } }`,
`    const fs = require('fs');
    const path = require('path');
    const dbFile = path.join(process.cwd(), 'data.json');
    if (fs.existsSync(dbFile)) {
        try { 
            const dbData = JSON.parse(fs.readFileSync(dbFile, 'utf8')); 
            return dbData[key] || null;
        } catch(e) { return null; }
    }
    return null;
`
);

code = code.replace(
`  } else {
    const rows = ({ prepare: (...args: any[]) => ({ run: (...a: any[]) => {}, all: (...a: any[]) => [], get: (...a: any[]) => null }) }).prepare('SELECT key, value FROM store').all();
    return rows.map((r: any) => {
      try {
        return { key: r.key, value: JSON.parse(r.value) };
      } catch (e) {
        return { key: r.key, value: r.value };
      }
    });
  }`,
`  } else {
    const fs = require('fs');
    const path = require('path');
    const dbFile = path.join(process.cwd(), 'data.json');
    if (fs.existsSync(dbFile)) {
        try { 
            const dbData = JSON.parse(fs.readFileSync(dbFile, 'utf8')); 
            return Object.entries(dbData).map(([k, v]) => ({ key: k, value: v }));
        } catch(e) { return []; }
    }
    return [];
  }`
);

fs.writeFileSync('src/db/kv-store.ts', code);
