const fs = require('fs');
let code = fs.readFileSync('src/routes/backup.routes.ts', 'utf8');

code = code.replace(
  /let backupConfig = \{ path: '', intervalHours: 4, storageType: 'local', remoteProvider: 's3', remoteConfig: \{\} \};/,
  "let backupConfig = { path: '', intervalHours: 4, storageType: 'local', remoteProvider: 's3', remoteConfig: {}, enabled: true, frequency: 'daily', time: '02:00', retention: 5, cron: '0 2 * * *' };"
);

// update run job interval logic
const runJobCode = `
     if (backupInterval) clearInterval(backupInterval);
     if (backupConfig.enabled && backupConfig.intervalHours > 0) {
        backupInterval = setInterval(runBackupJob, backupConfig.intervalHours * 60 * 60 * 1000);
     }
`;

code = code.replace(/if \(backupInterval\) clearInterval\(backupInterval\);\s*if \(backupConfig\.intervalHours > 0\) \{\s*backupInterval = setInterval\(runBackupJob, backupConfig\.intervalHours \* 60 \* 60 \* 1000\);\s*\}/g, runJobCode);

fs.writeFileSync('src/routes/backup.routes.ts', code);
console.log('Patched backend for full schedule support.');
