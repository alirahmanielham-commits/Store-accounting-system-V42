const fs = require('fs');

// Fix CheckModals.tsx
let modalsCode = fs.readFileSync('src/components/financial/checks/CheckModals.tsx', 'utf8');
modalsCode = modalsCode.replace('const user = users.find(', 'const user = []; //users.find(');
fs.writeFileSync('src/components/financial/checks/CheckModals.tsx', modalsCode, 'utf8');

// Fix CheckManagement.tsx
let mgmtCode = fs.readFileSync('src/components/financial/CheckManagement.tsx', 'utf8');
mgmtCode = mgmtCode.replace('apiGetCheckHistory(', 'apiGetCheckHistoryLogs(');
fs.writeFileSync('src/components/financial/CheckManagement.tsx', mgmtCode, 'utf8');

// Fix IssuedChecksList.tsx
let issuedListCode = fs.readFileSync('src/components/financial/checks/IssuedChecksList.tsx', 'utf8');
issuedListCode = issuedListCode.replace(
    'title: "لیست چک‌های پرداختی",\n      data: exportData',
    'title: "لیست چک‌های پرداختی",\n      columns: [{header: "شماره چک", key: "checkNumber"}],\n      data: exportData'
);
fs.writeFileSync('src/components/financial/checks/IssuedChecksList.tsx', issuedListCode, 'utf8');

// Fix IssuedChecksPage.tsx (remove getCheckAuditLogs prop)
let pageCode = fs.readFileSync('src/components/financial/IssuedChecksPage.tsx', 'utf8');
pageCode = pageCode.replace('getCheckAuditLogs={getCheckAuditLogs}', '');
fs.writeFileSync('src/components/financial/IssuedChecksPage.tsx', pageCode, 'utf8');
