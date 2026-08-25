import re

with open('src/components/payroll/RentContractsManager.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

save_logic_old = """      const payload = {
        personId: form.personId.value,
        contractNumber: form.contractNumber,
        startDate: startDateIso,
        endDate: endDateIso,
        monthlyAmount: Number(form.monthlyAmount),
        depositAmount: Number(form.depositAmount),
        paymentDay: Number(form.paymentDay),
        description: form.description,
        status: form.status
      };"""

save_logic_new = """      let pDay = Number(form.paymentDay);
      if (!pDay) {
        const jd = new Intl.DateTimeFormat('fa-IR-u-nu-latn', {day: 'numeric'}).format(new Date(startDateIso));
        pDay = parseInt(jd, 10) || 1;
      }

      const payload = {
        personId: form.personId.value,
        contractNumber: form.contractNumber,
        startDate: startDateIso,
        endDate: endDateIso,
        monthlyAmount: Number(form.monthlyAmount),
        depositAmount: Number(form.depositAmount),
        paymentDay: pDay,
        description: form.description,
        status: form.status
      };"""

code = code.replace(save_logic_old, save_logic_new)

with open('src/components/payroll/RentContractsManager.tsx', 'w', encoding='utf-8') as f:
    f.write(code)
