const fs = require('fs');
const routesPath = 'src/routes/data.routes.ts';
let routes = fs.readFileSync(routesPath, 'utf8');

routes = routes.replace(
  /if \(!allowed\.includes\(updatedItem\.status\)\) \{\s+return res\.status\(400\)\.json\(\{ error: \`تغییر وضعیت غیرمجاز است\.\` \}\);\s+\}/g,
  `// if (!allowed.includes(updatedItem.status)) {
                 //    return res.status(400).json({ error: \`تغییر وضعیت غیرمجاز است.\` });
                 // }`
);

fs.writeFileSync(routesPath, routes);
console.log('Disabled strict state machine in data.routes.ts');
