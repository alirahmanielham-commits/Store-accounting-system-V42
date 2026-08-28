import re

with open('src/components/payroll/PayslipsManager.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace childrenCount extraction to prefer order over person profile
old_childrenCount_1 = "const childrenCount = parseInt(person.childrenCount) || 0;"
new_childrenCount_1 = """const childrenCount = parseInt(order.childrenCount !== undefined && order.childrenCount !== '' ? order.childrenCount : person.childrenCount) || 0;
      const experienceYears = parseFloat(order.experienceYears !== undefined && order.experienceYears !== '' ? order.experienceYears : person.experienceYears) || 0;"""

content = content.replace(old_childrenCount_1, new_childrenCount_1)

# Replace formula strings to include experience_years
old_formula_repl_1 = "formulaStr = formulaStr.replace(/children/g, childrenCount.toString());"
new_formula_repl_1 = """formulaStr = formulaStr.replace(/children/g, childrenCount.toString());
             formulaStr = formulaStr.replace(/experience_years/g, experienceYears.toString());"""

content = content.replace(old_formula_repl_1, new_formula_repl_1)

with open('src/components/payroll/PayslipsManager.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
