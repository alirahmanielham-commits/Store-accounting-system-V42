const fs = require('fs');
const files = [
  'src/routes/misc.routes.ts',
  'src/routes/reports.routes.ts',
  'src/routes/setup.routes.ts',
  'src/routes/system.routes.ts'
];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');
  
  // We'll just remove lines 19 to 21 or anything that matches these exact imports if they are already imported.
  // Actually, let's just grep the file line by line and if it's a known duplicate, remove it.
  
  let newLines = [];
  let connectionImports = 0;
  let kvStoreImports = 0;
  let schemaSyncImports = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    if (line.includes("from '../db/connection'")) {
       connectionImports++;
       if (connectionImports > 1) continue; // skip duplicate
    }
    else if (line.includes("from '../db/kv-store'")) {
       kvStoreImports++;
       if (kvStoreImports > 1) continue; // skip duplicate
    }
    else if (line.includes("from '../db/schema-sync'")) {
       schemaSyncImports++;
       if (schemaSyncImports > 1) continue; // skip duplicate
    }
    
    newLines.push(line);
  }
  
  fs.writeFileSync(file, newLines.join('\n'));
}
console.log('Fixed duplicate imports');
