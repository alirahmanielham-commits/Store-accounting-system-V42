const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// Ensure we import CheckbooksManager if not already imported
if (!code.includes("import CheckbooksManager")) {
  code = code.replace(/import CheckManagement from ".\/components\/financial\/CheckManagement";/, 'import CheckManagement from "./components/financial/CheckManagement";\nimport CheckbooksManager from "./components/financial/CheckbooksManager";');
}

// Add the route for /checkbooks right before /check_panel
code = code.replace(
  '<Route path="/check_panel"', 
  '<Route path="/checkbooks" element={<motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="h-full"><CheckbooksManager storeSettings={storeSettings} showNotification={showNotification} /></motion.div>} />\n<Route path="/check_panel"'
);

fs.writeFileSync('src/App.tsx', code, 'utf8');
