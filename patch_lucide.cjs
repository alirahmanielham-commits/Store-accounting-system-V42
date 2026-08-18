const fs = require('fs');
let code = fs.readFileSync('src/components/admin/DatabaseDashboard.tsx', 'utf8');

code = code.replace(
`Info, Lock, AlertCircle`,
`Info, Lock, AlertCircle, X`);

fs.writeFileSync('src/components/admin/DatabaseDashboard.tsx', code);
