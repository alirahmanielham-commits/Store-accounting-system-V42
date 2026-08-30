import os

with open('src/components/payroll/PayslipsManager.tsx', 'r') as f:
    payslip_content = f.read()

# Replace duplicate line
payslip_content = payslip_content.replace(
"""      const shortageHours = parseFloat(att.shortageHours || 0);
      const dailyWageItem = orderItems.find(i => i.id === 'daily_wage' || i.title === 'دستمزد روزانه');
      const dailyWageValue = dailyWageItem ? (parseFloat(dailyWageItem.amount) || 0) : 0;
      let childAllowanceVal = 0;""",
"""      const shortageHours = parseFloat(att.shortageHours || 0);
      let childAllowanceVal = 0;""")

with open('src/components/payroll/PayslipsManager.tsx', 'w') as f:
    f.write(payslip_content)

with open('src/services/hrService.ts', 'r') as f:
    hr_content = f.read()

hr_content = hr_content.replace('payableAcc2.id', 'payableAcc.id')

with open('src/services/hrService.ts', 'w') as f:
    f.write(hr_content)

