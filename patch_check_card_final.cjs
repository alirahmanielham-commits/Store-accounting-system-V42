const fs = require('fs');

const cardPath = 'src/components/financial/checks/CheckCardPage.tsx';
let card = fs.readFileSync(cardPath, 'utf8');

// 1. Add getAccountingDocuments, getCheckbooks, getAccounts imports
card = card.replace(
  /getPersons, getTransactions } from "\.\.\/\.\.\/\.\.\/services\/dataService";/,
  `getPersons, getTransactions, getCheckbooks, getAccounts, getAccountingDocuments } from "../../../services/dataService";`
);

// 2. Add state variables for checkbooks, accounts, accountingDocuments
card = card.replace(
  /const \[transactions, setTransactions\] = useState<any\[\]>\(\[\]\);/,
  `const [transactions, setTransactions] = useState<any[]>([]);
  const [accountingDocuments, setAccountingDocuments] = useState<any[]>([]);
  const [checkbooks, setCheckbooks] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);`
);

// 3. Update loadData Promise.all
card = card.replace(
  /getTransactions\(\)/,
  `getTransactions(),
        getAccountingDocuments(),
        getCheckbooks(),
        getAccounts()`
);

card = card.replace(
  /const \[checks, prs, logs, txs\] = await Promise.all\(/,
  `const [checks, prs, logs, txs, accDocs, cbs, accs] = await Promise.all(`
);

card = card.replace(
  /setTransactions\(txs\);/,
  `setTransactions(txs);
      setAccountingDocuments(accDocs);
      setCheckbooks(cbs);
      setAccounts(accs);`
);

// 4. Update transitions
card = card.replace(
  /const transitions: Record<string, string\[\]> = \{[\s\S]*?\};/,
  `const transitions = checkType === 'issued' ? {
    'blank': ['issued', 'cancelled'],
    'draft': [], // Must use issue form
    'issued': ['cashed', 'bounced', 'cancelled'],
    'cashed': [],
    'bounced': ['cancelled'],
    'cancelled': []
  } : {
    'received': ['deposited', 'assigned', 'returned'],
    'deposited': ['cashed', 'bounced', 'received'],
    'cashed': [],
    'assigned': ['bounced_assigned'],
    'bounced_assigned': ['returned'],
    'returned': []
  };`
);

// 5. Update Accounting Doc button logic
card = card.replace(
  /const doc = transactions\?\.find\(t => t\.linkedCheckId === check\.id \|\| t\.items\?\.some\(i => i\.description\?\.includes\(check\.checkNumber\)\)\);/,
  `const doc = accountingDocuments?.find(d => String(d.sourceId).startsWith(String(check.id)) && d.sourceType.startsWith('check_'));`
);

// 6. Fix App.tsx missing onViewAccountingDoc prop
const appPath = 'src/App.tsx';
let app = fs.readFileSync(appPath, 'utf8');
app = app.replace(
  /<CheckCardPage\s+checkId=\{viewingCheck\.id\} checkType=\{viewingCheck\._type\}\s+onClose=\{\(\) => \{\s+setViewingCheck\(null\);\s+setActiveTab\('check_panel'\);\s+\}\}\s+showNotification=\{showNotification\}\s+currentUser=\{user\?\.name \|\| 'سیستم'\}\s+storeSettings=\{storeSettings\}\s+\/>/,
  `<CheckCardPage 
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
                           />`
);

fs.writeFileSync(cardPath, card);
fs.writeFileSync(appPath, app);

// 7. Fix bankName and checkNumber logic in accountingService.ts
const accSvcPath = 'src/services/accountingService.ts';
let accSvc = fs.readFileSync(accSvcPath, 'utf8');

accSvc = accSvc.replace(
  /const checkNo = check\.checkNumber \|\| 'نامشخص';\s+const checkBank = check\.bankName \|\| 'نامشخص';/,
  `const checkNo = check.checkNumber || 'نامشخص';
    let checkBank = check.bankName || 'نامشخص';`
);

accSvc = accSvc.replace(
  /if \(cb && cb\.accountId\) \{\s+bankAccountId = cb\.accountId;\s+bankName = cb\.bankName \|\| 'نامشخص';\s+\}/,
  `if (cb && cb.accountId) {
        bankAccountId = cb.accountId;
        bankName = cb.bankName;
        if (!bankName) {
           const accs = await getLocalData<any[]>('accounts', []);
           const acc = accs.find(a => String(a.id) === String(cb.accountId));
           if (acc) { bankName = acc.bankName; checkBank = bankName; }
        }
        if (!bankName) bankName = 'نامشخص';
      }`
);

fs.writeFileSync(accSvcPath, accSvc);

console.log('Patched CheckCardPage, App.tsx, and accountingService');
