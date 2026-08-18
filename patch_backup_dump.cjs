const fs = require('fs');
let code = fs.readFileSync('src/routes/backup.routes.ts', 'utf8');

// replace the runBackupJob logic to log rows
code = code.replace(/const backupData = \{\};\n\s*for \(const row of rows\) \{/g, `const backupData = {};
        console.log("Found rows to backup:", rows.length);
        for (const row of rows) {`);

fs.writeFileSync('src/routes/backup.routes.ts', code);
