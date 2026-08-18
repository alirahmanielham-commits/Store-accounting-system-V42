const fs = require('fs');
let code = fs.readFileSync('src/db/kv-store.ts', 'utf8');

code = code.replace(
`  } else {
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
} else {
        const value = JSON.stringify(data);
        ({ prepare: (...args: any[]) => ({ run: (...a: any[]) => {}, all: (...a: any[]) => [], get: (...a: any[]) => null }) }).prepare('INSERT INTO store (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value').run(key, value);
    }
  }
}`,
`  } else {
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

fs.writeFileSync('src/db/kv-store.ts', code);
