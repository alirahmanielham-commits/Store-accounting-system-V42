const fs = require('fs');
let code = fs.readFileSync('src/components/payroll/PayslipsManager.tsx', 'utf8');

const MONTH_NAMES = [
  'فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
  'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'
];

// In the code, month and year are available inside the component as `month` and `year`.
// Wait, `handleFinalizeSlip` is inside the component? Yes.
// Let's replace the addAccountingDocument block.

const oldBlock = `      await addAccountingDocument({
         date: Date.now(),
         description: \`صدور فیش حقوقی شماره \${slip.id} - \${getPersonName(slip.personId)}\`,
         sourceType: 'salary',
         sourceId: slip.id,
         items: docItems
      });`;

const newBlock = `      const monthNames = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'];
      const monthName = monthNames[slip.periodMonth - 1] || slip.periodMonth;
      await addAccountingDocument({
         date: Date.now(),
         description: \`صدور فیش حقوقی \${monthName} \${slip.periodYear} - \${getPersonName(slip.personId)}\`,
         sourceType: 'salary',
         sourceId: slip.id,
         items: docItems,
         status: 'finalized'
      });`;

code = code.replace(oldBlock, newBlock);

fs.writeFileSync('src/components/payroll/PayslipsManager.tsx', code);
console.log('done payslips');
