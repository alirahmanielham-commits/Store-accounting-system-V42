import re

with open('src/components/payroll/PayslipsManager.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# We need to replace the earning loop and deduction loop
start_marker = "      // 1. Calculate all Earnings first"
end_marker = "      if (taxAmount === 0 && implicitTax > 0) {"

replacement = """      // 1. Calculate Earnings (Custom + Defaults)
      const shortageHours = parseFloat(att.shortageHours || 0);
      let childAllowanceVal = 0;

      for (const item of orderItems) {
        if (item.type !== 'earning') continue;
        
        let val = 0;
        let baseAmount = parseFloat(item.amount) || 0;
        
        if (item.id === 'daily_wage' || item.title === 'دستمزد روزانه') {
          val = baseAmount * workDays;
        } else if (item.id === 'housing' || item.title === 'حق مسکن') {
          val = (baseAmount / 31) * workDays;
        } else if (item.id === 'marriage' || item.title === 'حق تاهل') {
          val = (baseAmount / 31) * workDays;
        } else if (item.id === 'grocery' || item.title === 'خوار بار') {
          val = (baseAmount / 31) * workDays;
        } else if (item.id === 'child' || item.title === 'حق اولاد') {
          val = (baseAmount * childrenCount / 31) * workDays;
          childAllowanceVal = Math.round(val);
        } else {
          // Normal fallback
          let formulaStr = String(item.amount || '0').trim();
          if (/^\d+(\.\d+)?$/.test(formulaStr)) {
             val = (parseFloat(formulaStr) / 30) * workDays;
          } else {
             try {
               formulaStr = formulaStr.replace(/children_count/g, childrenCount.toString());
               formulaStr = formulaStr.replace(/children/g, childrenCount.toString());
               formulaStr = formulaStr.replace(/experience_years/g, experienceYears.toString());
               formulaStr = formulaStr.replace(/work_days/g, workDays.toString());
               formulaStr = formulaStr.replace(/overtime_hours/g, overtimeHours.toString());
               formulaStr = formulaStr.replace(/absence_days/g, absenceDays.toString());
               formulaStr = formulaStr.replace(/is_married/g, isMarried.toString());
               val = Function(`'use strict'; return (${formulaStr})`)();
             } catch(err) {
               console.error("Formula error:", formulaStr, err);
               val = 0;
             }
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

      // Add Overtime based on user formula: ((Q2/220)*1.4)*O2 where Q2 = Taxable Earnings
      // User says: "جمع حقوق و مزایای مشمول برابر است با جمع حقوق و مزایا - جمع حق اولاد"
      taxable = totalEarnings - childAllowanceVal;
      
      const overtimeVal = Math.round(((taxable / 220) * 1.4) * overtimeHours);
      if (overtimeVal > 0) {
        pItems.push({
          id: Date.now().toString() + Math.random().toString(),
          componentId: 'overtime_auto',
          title: 'اضافه کاری',
          type: 'earning',
          amount: overtimeVal.toString()
        });
        totalEarnings += overtimeVal;
        taxable += overtimeVal; // usually overtime is taxable
        insurable += overtimeVal;
      }

      // Add Shortage of work deduction: ((P2 / 7.33)*(R2/G2) ) where P2=shortage, R2=TotalEarnings, G2=workDays
      const shortageVal = workDays > 0 ? Math.round((shortageHours / 7.33) * (totalEarnings / workDays)) : 0;
      if (shortageVal > 0) {
        pItems.push({
          id: Date.now().toString() + Math.random().toString(),
          componentId: 'shortage_auto',
          title: 'کسر کار',
          type: 'deduction',
          amount: shortageVal.toString()
        });
        totalDeductions += shortageVal;
        taxable -= shortageVal; // deductions reduce taxable
        insurable -= shortageVal;
      }

      // Implicit tax & insurance
      const implicitTax = taxable > 120000000 ? Math.round((taxable - 120000000) * 0.1) : 0;
      const implicitIns = Math.round(insurable * 0.07);

      // 2. Calculate Deductions (Custom items)
      for (const item of orderItems) {
        if (item.type !== 'deduction') continue;
        
        let val = 0;
        let formulaStr = String(item.amount || '0').trim();
        
        if (formulaStr === 'tax_formula') {
           val = implicitTax;
           taxAmount = val;
        } else if (/^\d+(\.\d+)?$/.test(formulaStr)) {
           val = parseFloat(formulaStr);
        } else {
           try {
             formulaStr = formulaStr.replace(/base/g, insurable.toString());
             formulaStr = formulaStr.replace(/insurable_earnings/g, insurable.toString());
             formulaStr = formulaStr.replace(/taxable_earnings/g, taxable.toString());
             formulaStr = formulaStr.replace(/base_wage/g, baseWageTotal.toString());
             formulaStr = formulaStr.replace(/children_count/g, childrenCount.toString());
             formulaStr = formulaStr.replace(/children/g, childrenCount.toString());
             formulaStr = formulaStr.replace(/experience_years/g, experienceYears.toString());
             formulaStr = formulaStr.replace(/work_days/g, workDays.toString());
             formulaStr = formulaStr.replace(/overtime_hours/g, overtimeHours.toString());
             formulaStr = formulaStr.replace(/absence_days/g, absenceDays.toString());
             formulaStr = formulaStr.replace(/is_married/g, isMarried.toString());
             
             val = Function(`'use strict'; return (${formulaStr})`)();
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

      """

idx1 = content.find(start_marker)
idx2 = content.find(end_marker)

if idx1 != -1 and idx2 != -1:
    new_content = content[:idx1] + replacement + content[idx2:]
    with open('src/components/payroll/PayslipsManager.tsx', 'w', encoding='utf-8') as f:
        f.write(new_content)
    print("Success replacing block.")
else:
    print("Could not find markers.")
