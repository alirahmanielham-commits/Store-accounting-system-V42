const fs = require('fs');
let code = fs.readFileSync('src/routes/backup.routes.ts', 'utf8');

code = code.replace(/const runBackupJob = async \(\)\nlet activeCronJobs/g, 'let activeCronJobs');
code = code.replace(/const runBackupJob = async \(\)\s*let activeCronJobs/g, 'let activeCronJobs');

fs.writeFileSync('src/routes/backup.routes.ts', code);
