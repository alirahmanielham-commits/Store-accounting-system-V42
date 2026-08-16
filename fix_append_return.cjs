const fs = require('fs');
const routesPath = 'src/routes/data.routes.ts';
let routes = fs.readFileSync(routesPath, 'utf8');

// The append handler's try/catch ends around line 208
// We can just find the append handler definition and replace the FIRST `mergedItem` inside it.
// Or just replace the line directly.

const lines = routes.split('\n');
for (let i = 120; i < 210; i++) {
  if (lines[i] && lines[i].includes('res.json({ success: true, data: mergedItem });')) {
     lines[i] = lines[i].replace('mergedItem', 'newItem');
     break;
  }
}

fs.writeFileSync(routesPath, lines.join('\n'));
console.log('Fixed return in append route');
