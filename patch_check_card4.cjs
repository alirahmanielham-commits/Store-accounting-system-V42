const fs = require('fs');
const file = 'src/components/financial/checks/CheckCardPage.tsx';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  'storeSettings: any;',
  'storeSettings: any;\n  onViewAccountingDoc?: (doc: any) => void;'
);

code = code.replace(
  'storeSettings\n}: {',
  'storeSettings,\n  onViewAccountingDoc\n}: {'
);

code = code.replace(
  '<button className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-white text-indigo-600 border-2 border-indigo-100 hover:border-indigo-300 rounded-xl transition-colors font-bold">',
  `<button onClick={() => {
                  const doc = transactions?.find(t => t.linkedCheckId === check.id || t.items?.some(i => i.description?.includes(check.checkNumber)));
                  if (doc && onViewAccountingDoc) onViewAccountingDoc(doc);
                  else showNotification('سند حسابداری برای این وضعیت یافت نشد', 'info');
                }} className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-white text-indigo-600 border-2 border-indigo-100 hover:border-indigo-300 rounded-xl transition-colors font-bold">`
);

fs.writeFileSync(file, code);
console.log('patched check_card 4 for view doc');
