const fs = require('fs');
const file = 'src/App.tsx';
let code = fs.readFileSync(file, 'utf8');

if (!code.includes('import CheckCardPage')) {
  code = code.replace(
    "import IssueCheckStandalone from './components/financial/IssueCheckStandalone';",
    "import IssueCheckStandalone from './components/financial/IssueCheckStandalone';\nimport CheckCardPage from './components/financial/checks/CheckCardPage';"
  );
}

const routeCode = `
<Route path="/check_card" element={<motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="h-full overflow-y-auto bg-gray-50/50"
                      >
                        {viewingCheck ? (
                           <CheckCardPage 
                             checkId={viewingCheck.id}
                             onClose={() => {
                               setViewingCheck(null);
                               setActiveTab('check_panel');
                             }}
                             showNotification={showNotification}
                             currentUser={user?.name || 'سیستم'}
                             storeSettings={storeSettings}
                           />
                        ) : (
                           <div className="h-full flex flex-col items-center justify-center text-gray-500">
                              هیچ چکی انتخاب نشده است. لطفا از لیست چک‌ها اقدام کنید.
                           </div>
                        )}
                      </motion.div>} />
`;

if (!code.includes('path="/check_card"')) {
  code = code.replace(
    '<Route path="/check_panel"',
    routeCode + '\n<Route path="/check_panel"'
  );
}

fs.writeFileSync(file, code);
console.log('patched App.tsx with check_card');
