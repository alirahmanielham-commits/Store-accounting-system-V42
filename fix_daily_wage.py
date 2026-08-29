import re

with open('src/components/payroll/PayslipsManager.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# First we need to extract daily_wage from orderItems before calculating earnings/deductions
# Right after: const shortageHours = parseFloat(att.shortageHours || 0);

# Find exactly where shortageHours is declared
content = content.replace(
    'const shortageHours = parseFloat(att.shortageHours || 0);',
    '''const shortageHours = parseFloat(att.shortageHours || 0);
      const dailyWageItem = orderItems.find(i => i.id === 'daily_wage' || i.title === 'دستمزد روزانه');
      const dailyWageValue = dailyWageItem ? (parseFloat(dailyWageItem.amount) || 0) : 0;'''
)

# In the deduction formula replacement
content = content.replace(
    'formulaStr = formulaStr.replace(/base_wage/g, baseWageTotal.toString());',
    '''formulaStr = formulaStr.replace(/base_wage/g, baseWageTotal.toString());
             formulaStr = formulaStr.replace(/daily_wage/g, dailyWageValue.toString());'''
)

with open('src/components/payroll/PayslipsManager.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
