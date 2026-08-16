const fs = require('fs');

const file = 'src/routes/database.routes.ts';
let content = fs.readFileSync(file, 'utf8');

// In GET /api/databases: Remove the else block for getDb
content = content.replace(/} else \{\n\s*const defaultDb = storeContext\.run\('default', \(\) => getDb\(\)\);\n\s*const stmt = defaultDb\.prepare\("SELECT \* FROM businesses"\);\n\s*dbsFromTable = stmt\.all\(\);\n\s*\}/, '} else { throw new Error("PostgreSQL not configured for default pool"); }');

// In POST /api/databases: Remove the else block for getDb
content = content.replace(/} else \{\n\s*const defaultDb = storeContext\.run\('default', \(\) => getDb\(\)\);\n\s*const stmt = defaultDb\.prepare\([\s\S]+?stmt\.run\([\s\S]+?\);\n\s*\}/, '} else { throw new Error("PostgreSQL not configured for default pool"); }');

// Remove the scanning for .sqlite files in GET /api/databases
content = content.replace(/const files = await fsPromises\.readdir\(process\.cwd\(\)\);[\s\S]+?const combined = \[/, 'const combined = [');

fs.writeFileSync(file, content);
console.log('Fixed GET/POST SQLite references');
