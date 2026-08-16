const fs = require('fs');

let code = fs.readFileSync('src/components/print/CheckReceiptPrintTemplate.tsx', 'utf8');

if (!code.includes('formatDateDisplay')) {
  code = code.replace(
    "import { toPersianDigits } from '../financial/checks/utils';",
    "import { toPersianDigits } from '../financial/checks/utils';\nimport { formatDateDisplay } from '../../utils/format';"
  );
}

code = code.replace(
  "{check.dueDate}",
  "{formatDateDisplay(check.dueDate, storeSettings?.calendarType)}"
);

fs.writeFileSync('src/components/print/CheckReceiptPrintTemplate.tsx', code);
console.log('Patched print template');
