const fs = require('fs');
let code = fs.readFileSync('src/routes/backup.routes.ts', 'utf8');

code = code.replace(/const jsonFiles = files\.filter\(f => f\.startsWith\('backup-'\) && \(f\.endsWith\('\.json'\) \|\| f\.endsWith\('\.sql'\)\)\)\.sort\(\(a,b\) => b\.localeCompare\(a\)\);/, `const jsonFiles = files.filter(f => f.startsWith('backup-') && (f.endsWith('.json') || f.endsWith('.sql')));`);

code = code.replace(/const backupsList = \[\];\n        for \(const file of jsonFiles\) \{[\s\S]*?const stat = await fsPromises\.stat\(path\.join\(dir, file\)\);[\s\S]*?backupsList\.push\(\{ file, size: stat\.size, time: stat\.mtimeMs \}\);[\s\S]*?\}/, `const backupsList = [];
        for (const file of jsonFiles) {
           const stat = await fsPromises.stat(path.join(dir, file));
           backupsList.push({ file, size: stat.size, time: stat.mtimeMs });
        }
        backupsList.sort((a,b) => b.time - a.time);`);

fs.writeFileSync('src/routes/backup.routes.ts', code);
