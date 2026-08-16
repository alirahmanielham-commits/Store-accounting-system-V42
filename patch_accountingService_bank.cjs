const fs = require('fs');
const filePath = 'src/services/accountingService.ts';
let code = fs.readFileSync(filePath, 'utf8');

code = code.replace(
  /if \(cb && cb\.accountId\) \{\s+bankAccountId = cb\.accountId;\s+\}/,
  `if (cb && cb.accountId) {
        bankAccountId = cb.accountId;
        const accs = await getLocalData<any[]>('accounts', []);
        const acc = accs.find(a => String(a.id) === String(cb.accountId));
        if (acc) {
           bankName = acc.bankName;
        }
      }`
);

fs.writeFileSync(filePath, code);
console.log('Patched bankName resolution');
