const fs = require('fs');
let code = fs.readFileSync('src/components/financial/CheckManagement.tsx', 'utf8');

// Remove checkbooks tab
code = code.replace(/{ id: 'checkbooks', label: 'دسته‌چک‌ها', icon: <BookOpen className="w-4 h-4" \/> },/g, "");

// Remove the condition that renders CheckbooksManager
code = code.replace(/\{activeSubTab === 'checkbooks' && <CheckbooksManager[\s\S]*?\/>\}/g, "");

fs.writeFileSync('src/components/financial/CheckManagement.tsx', code, 'utf8');
