import re

with open('src/components/payroll/PayslipsManager.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

target = """        const pItems = [];
        const myComps = contract.selectedComponents || [];
        const allComps = salComponents || [];
        
        // 1. Identify base salary
        let baseSalaryAmount = 0;
        for (const mc of myComps) {
          const compDef = allComps.find(c => c.id === mc.componentId);
          if (!compDef) continue;
          if (compDef.type === 'earning' && compDef.calculationType === 'fixed') {
            const v = mc.overrideAmount ? parseFloat(mc.overrideAmount) : 0;
            if (compDef.isBaseSalary || compDef.code === 'base_salary' || compDef.code === 'base') {
              baseSalaryAmount = v;
              break;
            }
            if (v > baseSalaryAmount) baseSalaryAmount = v;
          }
        }

        // 2. Calculate components
        for (const mc of myComps) {
          const compDef = allComps.find(c => c.id === mc.componentId);
          if (!compDef) continue;

          let val = 0;
          const baseNum = mc.overrideAmount ? parseFloat(mc.overrideAmount) : 0; 
          
          if (compDef.calculationType === 'fixed') {
             val = baseNum;
          } else if (compDef.calculationType === 'time_based') {
             if (compDef.timeFactor === 'days') val = baseNum * parseFloat(att.workDays || 0);
             else if (compDef.timeFactor === 'overtime_hours') val = baseNum * parseFloat(att.overtimeHours || 0);
             else if (compDef.timeFactor === 'absence_days') val = baseNum * parseFloat(att.absentDays || 0);
          } else if (compDef.calculationType === 'percentage') {
             const percent = mc.overrideAmount ? parseFloat(mc.overrideAmount) : parseFloat(compDef.basePercentage || 0);
             val = (baseSalaryAmount * percent) / 100;
          } else if (compDef.calculationType === 'formula') {
             let formulaStr = mc.overrideFormula || compDef.formula || '';
             if (formulaStr) {
               try {
                 formulaStr = formulaStr.replace(/base_salary/g, baseSalaryAmount.toString());
                 formulaStr = formulaStr.replace(/overtime_hours/g, (att.overtimeHours || 0).toString());
                 formulaStr = formulaStr.replace(/absence_days/g, (att.absentDays || 0).toString());
                 formulaStr = formulaStr.replace(/work_days/g, (att.workDays || 0).toString());
                 
                 // Safe evaluation
                 val = Function(`'use strict'; return (${formulaStr})`)();
               } catch(err) {
                 console.error("Formula error:", formulaStr, err);
                 val = 0;
               }
             }
          }"""

replacement = """        const person = (personsData || []).find(p => p.id === att.personId);
        if (!person) continue;

        const pItems = [];
        const myComps = contract.selectedComponents || [];
        const allComps = salComponents || [];
        
        // 1. Identify base salary
        let baseSalaryAmount = 0;
        for (const mc of myComps) {
          const compDef = allComps.find(c => c.id === mc.componentId);
          if (!compDef) continue;
          if (compDef.type === 'earning' && compDef.calculationType === 'fixed') {
            const v = mc.overrideAmount ? parseFloat(mc.overrideAmount) : 0;
            if (compDef.isBaseSalary || compDef.code === 'base_salary' || compDef.code === 'base') {
              baseSalaryAmount = v;
              break;
            }
            if (v > baseSalaryAmount) baseSalaryAmount = v;
          }
        }

        // 2. Calculate components
        for (const mc of myComps) {
          const compDef = allComps.find(c => c.id === mc.componentId);
          if (!compDef) continue;

          let val = 0;
          const baseNum = mc.overrideAmount ? parseFloat(mc.overrideAmount) : 0; 
          const workDays = parseFloat(att.workDays || 0);
          
          if (compDef.calculationType === 'fixed') {
             // Prorate fixed amounts based on work days (assuming 30-day month standard)
             val = (baseNum / 30) * workDays;
          } else if (compDef.calculationType === 'time_based') {
             if (compDef.timeFactor === 'days') val = baseNum * workDays;
             else if (compDef.timeFactor === 'overtime_hours') val = baseNum * parseFloat(att.overtimeHours || 0);
             else if (compDef.timeFactor === 'absence_days') val = baseNum * parseFloat(att.absentDays || 0);
          } else if (compDef.calculationType === 'percentage') {
             const percent = mc.overrideAmount ? parseFloat(mc.overrideAmount) : parseFloat(compDef.basePercentage || 0);
             // Base salary already prorated in some contexts, but usually percentage is off the prorated base
             const proratedBase = (baseSalaryAmount / 30) * workDays;
             val = (proratedBase * percent) / 100;
          } else if (compDef.calculationType === 'formula') {
             let formulaStr = mc.overrideFormula || compDef.formula || '';
             if (formulaStr) {
               try {
                 const childrenCount = parseInt(person.childrenCount) || 0;
                 formulaStr = formulaStr.replace(/base_salary/g, baseSalaryAmount.toString());
                 formulaStr = formulaStr.replace(/overtime_hours/g, (att.overtimeHours || 0).toString());
                 formulaStr = formulaStr.replace(/absence_days/g, (att.absentDays || 0).toString());
                 formulaStr = formulaStr.replace(/work_days/g, workDays.toString());
                 formulaStr = formulaStr.replace(/children_count/g, childrenCount.toString());
                 formulaStr = formulaStr.replace(/children/g, childrenCount.toString());
                 
                 // Safe evaluation
                 val = Function(`'use strict'; return (${formulaStr})`)();
               } catch(err) {
                 console.error("Formula error:", formulaStr, err);
                 val = 0;
               }
             }
          }"""

code = code.replace(target, replacement)
with open('src/components/payroll/PayslipsManager.tsx', 'w', encoding='utf-8') as f:
    f.write(code)
