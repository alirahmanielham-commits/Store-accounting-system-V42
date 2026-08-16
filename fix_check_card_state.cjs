const fs = require('fs');
const file = 'src/components/financial/checks/CheckCardPage.tsx';
let content = fs.readFileSync(file, 'utf8');

// Add getCheckbooks, getAccounts imports
content = content.replace(
  /getIssuedChecks, getReceivedChecks, updateReceivedCheck, getPersons, getCheckAuditLogs, updateIssuedCheck, addCheckHistoryLog, syncCheckAccountingDocument, getTransactions } from "..\/..\/..\/services\/dataService";/,
  `getIssuedChecks, getReceivedChecks, updateReceivedCheck, getPersons, getCheckAuditLogs, updateIssuedCheck, addCheckHistoryLog, syncCheckAccountingDocument, getTransactions, getCheckbooks, getAccounts } from "../../../services/dataService";`
);

// Add states
content = content.replace(
  /const \[transactions, setTransactions\] = useState<any\[\]>\(\[\]\);/,
  `const [transactions, setTransactions] = useState<any[]>([]);
  const [checkbooks, setCheckbooks] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);`
);

// Update loadData
content = content.replace(
  /const \[checks, prs, logs, txs\] = await Promise\.all\(\[\s*isReceived \? getReceivedChecks\(\) : getIssuedChecks\(\),\s*getIssuedChecks\(\),\s*getPersons\(\),\s*getCheckAuditLogs\(\),\s*getTransactions\(\)\s*\]\);/,
  `const [checks, prs, logs, txs, cbs, accs] = await Promise.all([
        isReceived ? getReceivedChecks() : getIssuedChecks(),
        getPersons(),
        getCheckAuditLogs(),
        getTransactions(),
        getCheckbooks(),
        getAccounts()
      ]);`
);

// Also the Promise.all destructuring needs to match what is returned
content = content.replace(
  /setTransactions\(txs\);/,
  `setTransactions(txs);
      setCheckbooks(cbs || []);
      setAccounts(accs || []);`
);

fs.writeFileSync(file, content);
console.log('Fixed states');
