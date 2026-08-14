const fs = require('fs');
const file = 'src/components/financial/checks/CheckCardPage.tsx';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  'checkId: string | number;',
  'checkId: string | number;\n  checkType: "issued" | "received";'
);

code = code.replace(
  `const isReceived = checkId.toString().startsWith('r_');
      const idToFind = checkId.toString().replace('r_', '');`,
  `const isReceived = checkType === 'received';
      const idToFind = checkId;`
);

code = code.replace(
  `const isReceived = checkId.toString().startsWith('r_');
      if (isReceived) {`,
  `const isReceived = checkType === 'received';
      if (isReceived) {`
);

code = code.replace(
  `checkId.toString().startsWith("r_") ? check.payerId : check.payeeId`,
  `checkType === "received" ? check.payerId : check.payeeId`
);

fs.writeFileSync(file, code);
console.log('patched check_card2');
