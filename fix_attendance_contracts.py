import re

with open('src/components/payroll/MonthlyAttendance.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

old_filter = """      // Get all active contracts
      const allContracts = await getEmployeeContracts();
      const contracts = allContracts.filter(c => c.status === 'active');
      setActiveContracts(contracts);"""

new_filter = """      // Get all active contracts and appropriately terminated ones
      const allContracts = await getEmployeeContracts();
      const contracts = allContracts.filter(c => {
        if (c.status === 'active') return true;
        if (c.status === 'terminated' && c.terminationDate) {
           const termDateStr = new Intl.DateTimeFormat('fa-IR-u-nu-latn', { year: 'numeric', month: 'numeric' }).format(new Date(c.terminationDate));
           const [termY, termM] = termDateStr.split('/').map(Number);
           const mY = Number(year);
           const mM = Number(month);
           if (termY > mY || (termY === mY && termM >= mM)) {
             return true;
           }
        }
        return false;
      });
      setActiveContracts(contracts);"""

content = content.replace(old_filter, new_filter)

with open('src/components/payroll/MonthlyAttendance.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

