import re

with open('src/components/payroll/PayslipsManager.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(
    "title: item.id === 'daily_wage' || item.title === 'دستمزد روزانه' ? 'مزد مبنای ماهیانه' : item.title,",
    "title: item.id === 'daily_wage' || item.title === 'دستمزد روزانه' ? `مزد مبنای ماهیانه (روزانه ${toPersianDigits(formatNumber(baseAmount))})` : item.title,"
)

with open('src/components/payroll/PayslipsManager.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
