const fs = require('fs');
const file = 'src/services/accountingService.ts';
let code = fs.readFileSync(file, 'utf8');

const logFn = `
export const addCheckHistoryLog = async (record: { checkId: string | number, checkType: 'issued' | 'received', oldStatus?: string, newStatus?: string, description?: string, userId?: string }) => {
  const now = new Date().toISOString();
  const newItem = { ...record, id: Math.random().toString(36).substring(2, 15), createdAt: now };
  await appendLocalData('check_history', newItem);
  return newItem;
};
`;

code = code.replace("export const addCheckAuditLog = async (record", logFn + "\nexport const addCheckAuditLog = async (record");

code = code.replace(
  "await addCheckAuditLog({ checkId: saved.id, checkType: 'issued', action: 'update', oldValues: previous, newValues: saved, userId: 'system' });",
  `await addCheckAuditLog({ checkId: saved.id, checkType: 'issued', action: 'update', oldValues: previous, newValues: saved, userId: 'system' });
     if (previous && previous.status !== saved.status) {
       await addCheckHistoryLog({ checkId: saved.id, checkType: 'issued', oldStatus: previous.status, newStatus: saved.status, userId: 'system' });
     }`
);

code = code.replace(
  "await addCheckAuditLog({ checkId: saved.id, checkType: 'received', action: 'update', oldValues: previous, newValues: saved, userId: 'system' });",
  `await addCheckAuditLog({ checkId: saved.id, checkType: 'received', action: 'update', oldValues: previous, newValues: saved, userId: 'system' });
     if (previous && previous.status !== saved.status) {
       await addCheckHistoryLog({ checkId: saved.id, checkType: 'received', oldStatus: previous.status, newStatus: saved.status, userId: 'system' });
     }`
);

fs.writeFileSync(file, code);
console.log('Patched accountingService.ts');
