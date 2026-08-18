const fs = require('fs');
let code = fs.readFileSync('src/components/admin/DatabaseDashboard.tsx', 'utf8');

// replace fetch('/api/db/...
code = code.replace(/await fetch\('\/api\/db\//g, "await fetch('/api/db/");

