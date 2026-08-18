const fs = require('fs');
let code = fs.readFileSync('src/components/admin/DatabaseDashboard.tsx', 'utf8');

code = code.replace(/window\.open\(\`\/api\/db\/backups\/download\/\$\{filename\}\`, '_blank'\);/, `const storeId = localStorage.getItem('activeStoreId') || 'default';
    window.open(\`/api/db/backups/download/\${filename}?storeId=\${storeId}\`, '_blank');`);

fs.writeFileSync('src/components/admin/DatabaseDashboard.tsx', code);
