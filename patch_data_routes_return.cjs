const fs = require('fs');
const routesPath = 'src/routes/data.routes.ts';
let routes = fs.readFileSync(routesPath, 'utf8');

routes = routes.replace(
  /res\.json\(\{ success: true, data: \{ \.\.\.updatedItem, id \} \}\);/g,
  `res.json({ success: true, data: newItem });`
);

fs.writeFileSync(routesPath, routes);
console.log('Patched data.routes.ts');
