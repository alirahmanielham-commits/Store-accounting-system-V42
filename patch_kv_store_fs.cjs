const fs = require('fs');
let code = fs.readFileSync('src/db/kv-store.ts', 'utf8');

// Patch innerSetDbData
code = code.replace(/\} else \{\s*if \(key === 'company_profile'\) \{[\s\S]*?\}\s*\}\s*\}/m, 
`} else {
    const fs = require('fs');
    const path = require('path');
    const dbFile = path.join(process.cwd(), 'data.json');
    let dbData = {};
    if (fs.existsSync(dbFile)) {
        try { dbData = JSON.parse(fs.readFileSync(dbFile, 'utf8')); } catch(e) {}
    }
    dbData[key] = data;
    fs.writeFileSync(dbFile, JSON.stringify(dbData, null, 2));
  }
}`);

// Patch innerGetDbData
code = code.replace(/      if \(key === "company_profile"\) \{ try \{ \(\{ prepare:[\s\S]*?return null; \} \}/m,
`    const fs = require('fs');
    const path = require('path');
    const dbFile = path.join(process.cwd(), 'data.json');
    if (fs.existsSync(dbFile)) {
        try { 
            const dbData = JSON.parse(fs.readFileSync(dbFile, 'utf8')); 
            return dbData[key] || null;
        } catch(e) { return null; }
    }
    return null;`);

// Patch getAllDbData
code = code.replace(/  \} else \{\s*const rows = \(\{ prepare:[\s\S]*?return rows\.map\(\(r: any\) => \{[\s\S]*?\}\);\s*\}/m,
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
  }`);

fs.writeFileSync('src/db/kv-store.ts', code);
