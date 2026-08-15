const fs = require('fs');
const file = 'src/components/financial/checks/CheckCardPage.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
`export default function CheckCardPage({
  checkId,
  onClose,
  showNotification,
  currentUser,
  storeSettings,
  onViewAccountingDoc
}: {`,
`export default function CheckCardPage({
  checkId,
  checkType,
  onClose,
  showNotification,
  currentUser,
  storeSettings,
  onViewAccountingDoc
}: {`
);

fs.writeFileSync(file, content);
