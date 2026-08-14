const fs = require('fs');
const file = 'src/utils/sidebarData.tsx';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  '{ id: "check_panel", label: "پنل جامع مدیریت چک", roles: ["admin", "accountant", "manager", "viewer"] }',
  '{ id: "check_panel", label: "پنل جامع مدیریت چک", roles: ["admin", "accountant", "manager", "viewer"] },\n      { id: "issue_check_form", label: "صدور چک", roles: ["admin", "accountant", "manager"] }'
);

fs.writeFileSync(file, code);
console.log('patched sidebarData.tsx');
