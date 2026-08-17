const fs = require('fs');
let code = fs.readFileSync('src/utils/sidebarData.tsx', 'utf8');

code = code.replace(
  '{ id: "check_panel", label: "پنل جامع مدیریت چک", roles: ["admin", "accountant", "manager", "viewer"] },',
  '{ id: "check_panel", label: "پنل جامع مدیریت چک", roles: ["admin", "accountant", "manager", "viewer"] },\n      { id: "checkbooks", label: "دسته چک ها", roles: ["admin", "accountant", "manager"] },'
);

fs.writeFileSync('src/utils/sidebarData.tsx', code, 'utf8');
