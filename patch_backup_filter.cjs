const fs = require('fs');
let code = fs.readFileSync('src/routes/backup.routes.ts', 'utf8');

const targetStr = `const jsonFiles = files.filter(f => f.startsWith('backup-') && (f.endsWith('.json') || f.endsWith('.sql')));`;
const replacementStr = `const jsonFiles = files.filter(f => (f.startsWith('backup-') || f.startsWith('uploaded-')) && (f.endsWith('.json') || f.endsWith('.sql')));`;

code = code.replace(targetStr, replacementStr);
fs.writeFileSync('src/routes/backup.routes.ts', code);
