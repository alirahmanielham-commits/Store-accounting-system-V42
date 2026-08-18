const fs = require('fs');
let code = fs.readFileSync('src/routes/backup.routes.ts', 'utf8');

code = code.replace(/const dir = await getBackupsDir\(\);\s*const filePath = path\.join\(dir, filename\);\s*if \(!filePath\.startsWith\(dir\)\) return res\.status\(403\)\.send\('Invalid path'\);/g, 
  "const dir = path.resolve(await getBackupsDir());\n         const filePath = path.resolve(dir, filename);\n         if (!filePath.startsWith(dir)) return res.status(403).send('Invalid path');");

fs.writeFileSync('src/routes/backup.routes.ts', code);
