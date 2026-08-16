const fs = require('fs');
let code = fs.readFileSync('src/components/financial/checks/useCheckFilters.ts', 'utf8');

const target = `if (!c.payeeId && (!c.amount || Number(c.amount) === 0) && !c.description) {`;
const replacement = `if (!c.amount || Number(c.amount) === 0) {`;

code = code.replace(target, replacement);
fs.writeFileSync('src/components/financial/checks/useCheckFilters.ts', code, 'utf8');
