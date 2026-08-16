const fs = require('fs');

const file = 'src/routes/database.routes.ts';
let content = fs.readFileSync(file, 'utf8');

const regex = /const files = await fsPromises\.readdir\(process\.cwd\(\)\);[\s\S]*?const mergedMap = new Map\(\);\n\s*dbsFromFiles\.forEach\(db => mergedMap\.set\(db\.id, db\)\);/;

content = content.replace(regex, `
      const mergedMap = new Map();
`);

fs.writeFileSync(file, content);
console.log('Fixed GET scanning');
