import re

with open('src/components/payroll/PayslipsManager.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

target = """  const handleRecalculateSingle = async (slipId) => {
     // A simple way is to just call handleGenerate which recalculates all draft slips for this month
     await handleGenerate();
  };"""

replacement = """  const handleRecalculateSingle = async (slipId) => {
    const existing = slips.find(s => s.id === slipId);
    if (!existing || existing.status === 'finalized') return showNotification('این فیش قابل محاسبه مجدد نیست', 'error');

    setLoading(true);
    try {
      const allAtts = await getMonthlyAttendances();
      const att = allAtts.find(a => a.id === existing.attendanceId);
      if (!att) {
         setLoading(false);
         return showNotification('کارکرد مرتبط با این فیش یافت نشد', 'error');
      }
      
      const allOrders = await getEmployeeOrders();
      const order = allOrders.find(o => o.personId === att.personId && o.status === 'active');
      if (!order) {
         setLoading(false);
         return showNotification('حکم فعالی برای این شخص یافت نشد', 'error');
      }

      const allContracts = await getEmployeeContracts();
      const contract = allContracts.find(c => c.id === order.contractId);
      if (!contract) {
         setLoading(false);
         return showNotification('قرارداد یافت نشد', 'error');
      }

      const salComponents = await getSalaryComponents();
      const person = (personsData || []).find(p => p.id === att.personId);
      if (!person) {
         setLoading(false);
         return showNotification('اطلاعات پرسنل یافت نشد', 'error');
      }

      let totalEarnings = 0;
      let totalDeductions = 0;
      let taxable = 0;
      let insurable = 0;

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
           val = (baseNum / 30) * workDays;
        } else if (compDef.calculationType === 'time_based') {
           if (compDef.timeFactor === 'days') val = baseNum * workDays;
           else if (compDef.timeFactor === 'overtime_hours') val = baseNum * parseFloat(att.overtimeHours || 0);
           else if (compDef.timeFactor === 'absence_days') val = baseNum * parseFloat(att.absentDays || 0);
        } else if (compDef.calculationType === 'percentage') {
           const percent = mc.overrideAmount ? parseFloat(mc.overrideAmount) : parseFloat(compDef.basePercentage || 0);
           const proratedBase = (baseSalaryAmount / 30) * workDays;
           val = (proratedBase * percent) / 100;
        } else if (compDef.calculationType === 'formula') {
           let formulaStr = mc.overrideFormula || compDef.formula || '';
           if (formulaStr) {
             try {
               const childrenCount = parseInt(person.childrenCount) || 0;
               const isMarried = person.maritalStatus === 'married' ? 1 : 0;
               formulaStr = formulaStr.replace(/base_salary/g, baseSalaryAmount.toString());
               formulaStr = formulaStr.replace(/is_married/g, isMarried.toString());
               formulaStr = formulaStr.replace(/overtime_hours/g, (att.overtimeHours || 0).toString());
               formulaStr = formulaStr.replace(/absence_days/g, (att.absentDays || 0).toString());
               formulaStr = formulaStr.replace(/work_days/g, workDays.toString());
               formulaStr = formulaStr.replace(/children_count/g, childrenCount.toString());
               formulaStr = formulaStr.replace(/children/g, childrenCount.toString());
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
            componentId: compDef.id,
            title: compDef.title,
            type: compDef.type,
            amount: val.toString()
          });

          if (compDef.type === 'earning') {
            totalEarnings += val;
            if (compDef.isTaxable) taxable += val;
            if (compDef.isInsurable) insurable += val;
          } else {
            totalDeductions += val;
          }
        }
      }

      const taxAmount = taxable > 12000000 ? Math.round((taxable - 12000000) * 0.1) : 0;
      const insAmount = Math.round(insurable * 0.07);

      totalDeductions += taxAmount + insAmount;
      
      if (taxAmount > 0) pItems.push({ id: Date.now().toString() + Math.random().toString(), componentId: 'tax', title: 'مالیات حقوق', type: 'deduction', amount: taxAmount.toString() });
      if (insAmount > 0) pItems.push({ id: Date.now().toString() + Math.random().toString(), componentId: 'ins', title: 'حق بیمه (سهم کارمند)', type: 'deduction', amount: insAmount.toString() });

      const netPayable = totalEarnings - totalDeductions;
      
      const payload = {
        totalEarnings: totalEarnings.toString(),
        totalDeductions: totalDeductions.toString(),
        taxableAmount: taxable.toString(),
        insurableAmount: insurable.toString(),
        taxAmount: taxAmount.toString(),
        insuranceAmount: insAmount.toString(),
        netPayable: netPayable.toString()
      };

      await updatePayslip(slipId, payload);
      await deletePayslipItemsByPayslipId(slipId);

      for (const item of pItems) {
         await addPayslipItem({ payslipId: slipId, ...item });
      }

      showNotification('فیش با موفقیت محاسبه مجدد شد', 'success');
      fetchPayslips();
    } catch (e) {
      console.error(e);
      showNotification('خطا در محاسبه مجدد', 'error');
    } finally {
      setLoading(false);
    }
  };"""

code = code.replace(target, replacement)

with open('src/components/payroll/PayslipsManager.tsx', 'w', encoding='utf-8') as f:
    f.write(code)
