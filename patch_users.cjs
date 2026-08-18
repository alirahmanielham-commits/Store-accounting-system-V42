const fs = require('fs');
let code = fs.readFileSync('src/components/financial/checks/CheckModals.tsx', 'utf8');

code = code.replace(/let userName = h\.userId \|\| h\.user \|\| 'سیستم';\s*if \(userName !== 'سیستم'\) \{[\s\S]*?\n                            \}\n                          \}/g, "let userName = h.userId || h.user || 'سیستم';");

fs.writeFileSync('src/components/financial/checks/CheckModals.tsx', code);
