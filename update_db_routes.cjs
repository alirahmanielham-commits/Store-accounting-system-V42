const fs = require('fs');
const file = 'src/routes/database.routes.ts';
let content = fs.readFileSync(file, 'utf8');

// Replace the fallback part
const fallbackRegex = /\/\/ SQLite fallback[\s\S]+res\.json\(\{ success: true, database: \{ id, name, db_type: 'sqlite' \} \}\);/;

content = content.replace(fallbackRegex, `
      return res.status(500).json({ error: "PostgreSQL is not properly configured or creation failed." });
`);

fs.writeFileSync(file, content);
console.log('updated routes');
