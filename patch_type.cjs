const fs = require('fs');
let code = fs.readFileSync('src/components/admin/DatabaseDashboard.tsx', 'utf8');

const targetStr = `          size: (b.size / 1024 / 1024).toFixed(2) + ' MB',
          type: 'کامل (Full)',`;
const replacementStr = `          size: (b.size / 1024 / 1024).toFixed(2) + ' MB',
          type: b.file.startsWith('uploaded-') ? 'آپلود شده' : 'کامل (Full)',`;

code = code.replace(targetStr, replacementStr);
fs.writeFileSync('src/components/admin/DatabaseDashboard.tsx', code);
