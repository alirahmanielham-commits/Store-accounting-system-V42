const fs = require('fs');
let code = fs.readFileSync('src/routes/backup.routes.ts', 'utf8');

// For runBackupJob:
code = code.replace(/const jsonFiles = files\.filter\(f => \(f\.startsWith\(\`backup-\$\{storeId\}-\`\) \|\| f\.startsWith\('backup-1'\)\) && \(f\.endsWith\('\.json'\) \|\| f\.endsWith\('\.sql'\)\)\)\.sort\(\(a,b\) => b\.localeCompare\(a\)\);/, `const jsonFiles = files.filter(f => (f.startsWith(\`backup-\${storeId}-\`) || f.startsWith('backup-1')) && (f.endsWith('.json') || f.endsWith('.sql')));
        const filesWithStats = await Promise.all(jsonFiles.map(async f => {
            const stat = await fsPromises.stat(path.join(dir, f));
            return { file: f, time: stat.mtimeMs };
        }));
        filesWithStats.sort((a,b) => b.time - a.time);
        const sortedJsonFiles = filesWithStats.map(f => f.file);`);

code = code.replace(/if \(jsonFiles\.length > 20\) \{[\s\S]*?for \(let i = 0; i < jsonFiles\.length - 20; i\+\+\) \{[\s\S]*?await fsPromises\.unlink\(path\.join\(dir, jsonFiles\[i\]\)\);[\s\S]*?\}[\s\S]*?\}/, `if (sortedJsonFiles.length > 20) {
           for (let i = 20; i < sortedJsonFiles.length; i++) {
              await fsPromises.unlink(path.join(dir, sortedJsonFiles[i]));
           }
        }`);

fs.writeFileSync('src/routes/backup.routes.ts', code);
