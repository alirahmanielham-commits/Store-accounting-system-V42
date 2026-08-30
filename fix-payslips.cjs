const fs = require('fs');
let code = fs.readFileSync('src/components/payroll/PayslipsManager.tsx', 'utf8');

const calcLogicMatch = code.match(/const orderItems = order\.items \|\| \[\];([\s\S]*?)const netPayable = totalEarnings - totalDeductions;/);

if (!calcLogicMatch) {
  console.log("Could not find calc logic");
  process.exit(1);
}

const calcBody = calcLogicMatch[1] + "const netPayable = totalEarnings - totalDeductions;\n      return { pItems, totalEarnings, totalDeductions, taxable, insurable, taxAmount, insAmount, netPayable };";

const calculateFunction = `
export const calculatePayslipDetails = (att: any, order: any, person: any) => {
      const orderItems = order.items || [];
${calcBody}
};
`;

code = code.replace(/export default function PayslipsManager/, calculateFunction + '\nexport default function PayslipsManager');

const replacementRecalculate = `const { pItems, totalEarnings, totalDeductions, taxable, insurable, taxAmount, insAmount, netPayable } = calculatePayslipDetails(att, order, person);`;

code = code.replace(/const orderItems = order\.items \|\| \[\];[\s\S]*?const netPayable = totalEarnings - totalDeductions;/g, replacementRecalculate);

fs.writeFileSync('src/components/payroll/PayslipsManager.tsx', code);
console.log("Done");
