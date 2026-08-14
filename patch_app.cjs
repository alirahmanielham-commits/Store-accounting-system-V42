const fs = require('fs');
const file = 'src/App.tsx';
let code = fs.readFileSync(file, 'utf8');

if (!code.includes('import IssueCheckStandalone')) {
  code = code.replace(
    "import CheckManagement from './components/financial/CheckManagement';",
    "import CheckManagement from './components/financial/CheckManagement';\nimport IssueCheckStandalone from './components/financial/IssueCheckStandalone';"
  );
}

const routeCode = `
<Route path="/issue_check_form" element={<motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="h-full overflow-y-auto"
                      >
                        <IssueCheckStandalone />
                      </motion.div>} />
`;

if (!code.includes('path="/issue_check_form"')) {
  code = code.replace(
    '<Route path="/check_panel"',
    routeCode + '\n<Route path="/check_panel"'
  );
}

fs.writeFileSync(file, code);
