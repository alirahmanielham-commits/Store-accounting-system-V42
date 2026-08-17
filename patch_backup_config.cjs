const fs = require('fs');
let code = fs.readFileSync('src/routes/backup.routes.ts', 'utf8');

code = code.replace(/let backupConfig = \{ path: '', intervalHours: 4 \};/, "let backupConfig = { path: '', intervalHours: 4, storageType: 'local', remoteProvider: 's3', remoteConfig: {} };");

fs.writeFileSync('src/routes/backup.routes.ts', code);
console.log('Patched backupConfig defaults.');
