import fs from 'fs';

let content = fs.readFileSync('src/components/payroll/PayslipsManager.tsx', 'utf8');

const replacement = `
      const orderItems = order.items || [];
      const workDays = parseFloat(att.workDays || 0);
      const overtimeHours = parseFloat(att.overtimeHours || 0);
      const absenceDays = parseFloat(att.absentDays || 0);
      const childrenCount = parseInt(person.childrenCount) || 0;
      const isMarried = person.maritalStatus === 'married' ? 1 : 0;
      
      let totalEarnings = 0;
      let totalDeductions = 0;
      let taxable = 0;
      let insurable = 0;
      let baseWageTotal = 0;
      let taxAmount = 0;
      let insAmount = 0;

      const pItems = [];

      // 1. Calculate all Earnings first
      for (const item of orderItems) {
        if (item.type !== 'earning') continue;
        
        let val = 0;
        let formulaStr = String(item.amount || '0').trim();
        
        if (/^\\d+(\\.\\d+)?$/.test(formulaStr)) {
           val = (parseFloat(formulaStr) / 30) * workDays;
        } else {
           try {
             formulaStr = formulaStr.replace(/children_count/g, childrenCount.toString());
             formulaStr = formulaStr.replace(/children/g, childrenCount.toString());
             formulaStr = formulaStr.replace(/work_days/g, workDays.toString());
             formulaStr = formulaStr.replace(/overtime_hours/g, overtimeHours.toString());
             formulaStr = formulaStr.replace(/absence_days/g, absenceDays.toString());
             formulaStr = formulaStr.replace(/is_married/g, isMarried.toString());
             
             val = Function(\`'use strict'; return (\${formulaStr})\`)();
           } catch(err) {
             console.error("Formula error:", formulaStr, err);
             val = 0;
           }
        }
        
        val = Math.round(val);
        
        if (val > 0 || val < 0) {
          pItems.push({
            id: Date.now().toString() + Math.random().toString(),
            componentId: item.id || Math.random().toString(),
            title: item.title,
            type: 'earning',
            amount: val.toString()
          });

          totalEarnings += val;
          if (!item.isTaxExempt) taxable += val;
          if (!item.isInsuranceExempt) insurable += val;
          if (item.isBaseWage) baseWageTotal += val;
        }
      }

      // Implicit tax & insurance
      const implicitTax = taxable > 120000000 ? Math.round((taxable - 120000000) * 0.1) : 0;
      const implicitIns = Math.round(insurable * 0.07);

      // 2. Calculate Deductions
      for (const item of orderItems) {
        if (item.type !== 'deduction') continue;
        
        let val = 0;
        let formulaStr = String(item.amount || '0').trim();
        
        if (formulaStr === 'tax_formula') {
           val = implicitTax;
           taxAmount = val;
        } else if (/^\\d+(\\.\\d+)?$/.test(formulaStr)) {
           val = parseFloat(formulaStr);
        } else {
           try {
             formulaStr = formulaStr.replace(/base/g, insurable.toString());
             formulaStr = formulaStr.replace(/insurable_earnings/g, insurable.toString());
             formulaStr = formulaStr.replace(/taxable_earnings/g, taxable.toString());
             formulaStr = formulaStr.replace(/base_wage/g, baseWageTotal.toString());
             formulaStr = formulaStr.replace(/children_count/g, childrenCount.toString());
             formulaStr = formulaStr.replace(/children/g, childrenCount.toString());
             formulaStr = formulaStr.replace(/work_days/g, workDays.toString());
             formulaStr = formulaStr.replace(/overtime_hours/g, overtimeHours.toString());
             formulaStr = formulaStr.replace(/absence_days/g, absenceDays.toString());
             formulaStr = formulaStr.replace(/is_married/g, isMarried.toString());
             
             val = Function(\`'use strict'; return (\${formulaStr})\`)();
           } catch(err) {
             console.error("Formula error:", formulaStr, err);
             val = 0;
           }
        }
        
        val = Math.round(val);
        
        if (val > 0) {
          pItems.push({
            id: Date.now().toString() + Math.random().toString(),
            componentId: item.id || Math.random().toString(),
            title: item.title,
            type: 'deduction',
            amount: val.toString()
          });
          totalDeductions += val;

          if (item.title.includes('مالیات') && taxAmount === 0) taxAmount = val;
          if (item.title.includes('بیمه') && insAmount === 0) insAmount = val;
        }
      }

      if (taxAmount === 0 && implicitTax > 0) {
          taxAmount = implicitTax;
          totalDeductions += taxAmount;
          pItems.push({ id: Date.now().toString() + Math.random().toString(), componentId: 'tax_auto', title: 'مالیات حقوق (خودکار)', type: 'deduction', amount: taxAmount.toString() });
      }
      
      if (insAmount === 0 && implicitIns > 0) {
          insAmount = implicitIns;
          totalDeductions += insAmount;
          pItems.push({ id: Date.now().toString() + Math.random().toString(), componentId: 'ins_auto', title: 'حق بیمه (سهم کارمند - خودکار)', type: 'deduction', amount: insAmount.toString() });
      }

      const netPayable = totalEarnings - totalDeductions;`;

// Single recalc block
const pattern1 = /let totalEarnings = 0;[\s\S]*?const netPayable = totalEarnings - totalDeductions;/;
let i = 0;
content = content.replace(pattern1, () => {
    i++;
    return replacement;
});

// Generate block
content = content.replace(pattern1, () => {
    i++;
    return replacement;
});

fs.writeFileSync('src/components/payroll/PayslipsManager.tsx', content, 'utf8');
console.log('Replaced', i, 'occurrences');
