const fs = require('fs');
let code = fs.readFileSync('src/components/financial/checks/CheckCardPage.tsx', 'utf8');

code = code.replace(
    'checkId: string | number;',
    'checkId: string | number | null;'
);

fs.writeFileSync('src/components/financial/checks/CheckCardPage.tsx', code, 'utf8');
