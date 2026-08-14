const fs = require('fs');
const file = 'src/utils/sidebarData.tsx';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  '{ id: "issue_check_form", label: "صدور چک", roles: ["admin", "accountant", "manager"] }',
  '{ id: "issue_check_form", label: "صدور چک", roles: ["admin", "accountant", "manager"] },\n      { id: "check_card", label: "کارت/برگه چک", roles: ["admin", "accountant", "manager", "viewer"] }'
);

fs.writeFileSync(file, code);
console.log('patched sidebarData.tsx again');
