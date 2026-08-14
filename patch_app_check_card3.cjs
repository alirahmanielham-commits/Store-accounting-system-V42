const fs = require('fs');
const file = 'src/App.tsx';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  'checkId={viewingCheck.id}',
  'checkId={viewingCheck.id} checkType={viewingCheck._type}'
);

fs.writeFileSync(file, code);
console.log('patched App.tsx 3');
