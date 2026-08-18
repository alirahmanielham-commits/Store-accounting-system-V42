const fs = require('fs');
let code = fs.readFileSync('src/routes/backup.routes.ts', 'utf8');

code = code.replace('const runBackupJob = async ()let activeCronJobs', 'let activeCronJobs');

code = code.replace('setupBackupSchedule();\n\ncreate", async (req, res)', 'setupBackupSchedule();\n\nrouter.post("/api/db/backups/create", async (req, res)');

fs.writeFileSync('src/routes/backup.routes.ts', code);
