import os

with open('src/components/payroll/PayslipsManager.tsx', 'r') as f:
    content = f.read()

content = content.replace(
"""      let taxAmount = 0;
      let insAmount = 0;

      const pItems = [];""",
"""      let taxAmount = 0;
      let insAmount = 0;

      const dailyWageItem = orderItems.find(i => i.id === 'daily_wage' || i.title === 'دستمزد روزانه');
      const dailyWageValue = dailyWageItem ? (parseFloat(dailyWageItem.amount) || 0) : 0;

      const pItems = [];"""
)

with open('src/components/payroll/PayslipsManager.tsx', 'w') as f:
    f.write(content)

