const fs = require('fs');
const file = 'src/components/financial/checks/CheckCardPage.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  'import { getIssuedChecks, getReceivedChecks, updateReceivedCheck, getPersons, getCheckAuditLogs, updateIssuedCheck, addCheckHistoryLog, syncCheckAccountingDocument, getTransactions } from "../../../services/dataService";',
  'import { getIssuedChecks, getReceivedChecks, updateReceivedCheck, getPersons, getTransactions } from "../../../services/dataService";\nimport { getCheckAuditLogs, updateIssuedCheck, addCheckHistoryLog, syncCheckAccountingDocument } from "../../../services/accountingService";'
);

fs.writeFileSync(file, content);
