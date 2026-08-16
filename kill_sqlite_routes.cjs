const fs = require('fs');
const glob = require('glob');

const files = glob.sync('src/**/*.ts');

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  let changed = false;
  if (content.includes("import { DatabaseSync } from 'node:sqlite';")) {
    content = content.replace(/import \{ DatabaseSync \} from 'node:sqlite';\n?/g, '');
    changed = true;
  }
  if (content.includes("new DatabaseSync(")) {
    content = content.replace(/new DatabaseSync\([^)]*\)/g, "(() => { throw new Error('SQLite usage is disabled.') })()");
    changed = true;
  }
  if (changed) {
    fs.writeFileSync(file, content);
  }
}
console.log('Killed SQLite in routes');
