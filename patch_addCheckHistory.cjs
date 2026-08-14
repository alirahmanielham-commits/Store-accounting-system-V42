const fs = require('fs');
const file = 'src/services/accountingService.ts';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  /await addCheckAuditLog\(\{ checkId: saved.id, checkType: 'issued', action: 'create', newValues: saved, userId: 'system' \}\);/g,
  `await addCheckAuditLog({ checkId: saved.id, checkType: 'issued', action: 'create', newValues: saved, userId: 'system' });\n  await addCheckHistoryLog({ checkId: saved.id, checkType: 'issued', oldStatus: undefined, newStatus: saved.status || 'issued', description: 'ثبت اولیه چک', userId: 'system' });`
);

code = code.replace(
  /await addCheckAuditLog\(\{ checkId: saved.id, checkType: 'received', action: 'create', newValues: saved, userId: 'system' \}\);/g,
  `await addCheckAuditLog({ checkId: saved.id, checkType: 'received', action: 'create', newValues: saved, userId: 'system' });\n  await addCheckHistoryLog({ checkId: saved.id, checkType: 'received', oldStatus: undefined, newStatus: saved.status || 'received', description: 'ثبت اولیه چک', userId: 'system' });`
);

fs.writeFileSync(file, code);
console.log("Patched addCheckHistory");
