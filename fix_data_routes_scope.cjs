const fs = require('fs');
const routesPath = 'src/routes/data.routes.ts';
let routes = fs.readFileSync(routesPath, 'utf8');

routes = routes.replace(
  /const { key, id } = req\.params;\s+const updatedItem = req\.body;\s+try \{/,
  `const { key, id } = req.params;
    const updatedItem = req.body;
    try {
      let mergedItem = { ...updatedItem, id };`
);

routes = routes.replace(
  /const newItem = \{ \.\.\.oldItem, \.\.\.updatedItem, id \}; \/\/ ensure id is preserved/g,
  `const newItem = { ...oldItem, ...updatedItem, id }; // ensure id is preserved
         mergedItem = newItem;`
);

routes = routes.replace(
  /const newItem = \{ \.\.\.oldItem, \.\.\.updatedItem \};/g,
  `const newItem = { ...oldItem, ...updatedItem };
             mergedItem = newItem;`
);

routes = routes.replace(
  /res\.json\(\{ success: true, data: newItem \}\);/g,
  `res.json({ success: true, data: mergedItem });`
);

fs.writeFileSync(routesPath, routes);
console.log('Fixed data.routes.ts scope');
