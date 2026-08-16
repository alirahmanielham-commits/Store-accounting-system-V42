const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const target = `{viewingCheck ? (
                           <CheckCardPage 
                             checkId={viewingCheck.id} checkType={viewingCheck._type}
                             onClose={() => {
                               setViewingCheck(null);
                               setActiveTab('check_panel');
                             }}
                             showNotification={showNotification}
                             currentUser={user?.name || 'سیستم'}
                             storeSettings={storeSettings}
                             onViewAccountingDoc={(doc) => {
                               setViewingAccountingDoc(doc);
                               setIsAccountingDocModalOpen(true);
                             }}
                           />
                        ) : (
                           <div className="h-full flex flex-col items-center justify-center text-gray-500">
                              هیچ چکی انتخاب نشده است. لطفا از لیست چک‌ها اقدام کنید.
                           </div>
                        )}`;

const replacement = `<CheckCardPage 
                             checkId={viewingCheck?.id || null} checkType={viewingCheck?._type || 'issued'}
                             onClose={() => {
                               setViewingCheck(null);
                               setActiveTab('check_panel');
                             }}
                             showNotification={showNotification}
                             currentUser={user?.name || 'سیستم'}
                             storeSettings={storeSettings}
                             onViewAccountingDoc={(doc) => {
                               setViewingAccountingDoc(doc);
                               setIsAccountingDocModalOpen(true);
                             }}
                           />`;

code = code.replace(target, replacement);
fs.writeFileSync('src/App.tsx', code, 'utf8');
