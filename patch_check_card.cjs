const fs = require('fs');
const file = 'src/components/financial/checks/CheckCardPage.tsx';
let code = fs.readFileSync(file, 'utf8');

code = code.replace('getIssuedChecks', 'getIssuedChecks, getReceivedChecks, updateReceivedCheck');

code = code.replace(
  'const [checks, prs, logs, txs] = await Promise.all([',
  `const isReceived = checkId.toString().startsWith('r_');
      const idToFind = checkId.toString().replace('r_', '');
      const [checks, prs, logs, txs] = await Promise.all([
        isReceived ? getReceivedChecks() : getIssuedChecks(),`
);

code = code.replace(
  'const found = checks.find(c => String(c.id) === String(checkId));',
  'const found = checks.find(c => String(c.id) === String(idToFind));'
);

code = code.replace(
  "const checkLogs = logs.filter((l: any) => String(l.checkId) === String(checkId) && l.checkType === 'issued');",
  "const checkLogs = logs.filter((l: any) => String(l.checkId) === String(idToFind) && l.checkType === (isReceived ? 'received' : 'issued'));"
);

code = code.replace(
  'await updateIssuedCheck(String(check.id), updatedCheck);',
  `const isReceived = checkId.toString().startsWith('r_');
      if (isReceived) {
        await updateReceivedCheck(String(check.id), updatedCheck);
      } else {
        await updateIssuedCheck(String(check.id), updatedCheck);
      }`
);

code = code.replace(
  "await syncCheckAccountingDocument('issued', updatedCheck, oldCheck);",
  "await syncCheckAccountingDocument(isReceived ? 'received' : 'issued', updatedCheck, oldCheck);"
);

code = code.replace(
  'const payee = persons.find(p => p.id === check.payeeId);',
  'const payee = persons.find(p => p.id === (checkId.toString().startsWith("r_") ? check.payerId : check.payeeId));'
);

fs.writeFileSync(file, code);
console.log('patched check_card');
