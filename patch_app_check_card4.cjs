const fs = require('fs');
const file = 'src/App.tsx';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  'storeSettings={storeSettings}',
  `storeSettings={storeSettings}
                             onViewAccountingDoc={(doc) => {
                               setViewingAccountingDoc(doc);
                               setIsAccountingDocModalOpen(true);
                             }}`
);

fs.writeFileSync(file, code);
console.log('patched App.tsx 4');
