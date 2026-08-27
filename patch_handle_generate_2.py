import re

with open('src/components/payroll/PayslipsManager.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

target = """                 const childrenCount = parseInt(person.childrenCount) || 0;
                 formulaStr = formulaStr.replace(/base_salary/g, baseSalaryAmount.toString());"""

replacement = """                 const childrenCount = parseInt(person.childrenCount) || 0;
                 const isMarried = person.maritalStatus === 'married' ? 1 : 0;
                 formulaStr = formulaStr.replace(/base_salary/g, baseSalaryAmount.toString());
                 formulaStr = formulaStr.replace(/is_married/g, isMarried.toString());"""

code = code.replace(target, replacement)
with open('src/components/payroll/PayslipsManager.tsx', 'w', encoding='utf-8') as f:
    f.write(code)
