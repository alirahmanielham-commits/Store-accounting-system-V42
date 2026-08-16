const fs = require('fs');
const file = 'src/services/accountingService.ts';
let content = fs.readFileSync(file, 'utf8');

// We need to inject formatDateDisplay
if (!content.includes('import { formatDateDisplay }')) {
   content = content.replace(/import \{ checkFinancialYear, getActiveFinancialYear, getStoreSettings \} from '\.\/settingsService';/, "import { checkFinancialYear, getActiveFinancialYear, getStoreSettings } from './settingsService';\nimport { formatDateDisplay } from '../utils/format';");
}

// In syncCheckAccountingDocument:
content = content.replace(/const dueDate = check\.dueDate \|\| check\.checkDueDate \|\| 'نامشخص';/, `
    const rawDueDate = check.dueDate || check.checkDueDate;
    const dueDate = rawDueDate ? formatDateDisplay(rawDueDate, sysSettings?.calendarType) : 'نامشخص';
`);

fs.writeFileSync(file, content);
console.log('Fixed accounting service');
