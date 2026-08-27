import re

with open('src/components/payroll/PayslipsManager.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Pattern for the block of consts:
pattern = re.compile(r'^\s*const orderItems = order\.items \|\| \[\];\n^\s*const workDays = parseFloat\(att\.workDays \|\| 0\);\n^\s*const overtimeHours = parseFloat\(att\.overtimeHours \|\| 0\);\n^\s*const absenceDays = parseFloat\(att\.absentDays \|\| 0\);\n^\s*const childrenCount = parseInt\(person\.childrenCount\) \|\| 0;\n^\s*const isMarried = person\.maritalStatus === \'married\' \? 1 : 0;\n+', re.MULTILINE)

# Remove all occurrences!
content = pattern.sub('', content)

# Now, we need to inject it back ONCE right before `let totalEarnings = 0;`
inject = """      const orderItems = order.items || [];
      const workDays = parseFloat(att.workDays || 0);
      const overtimeHours = parseFloat(att.overtimeHours || 0);
      const absenceDays = parseFloat(att.absentDays || 0);
      const childrenCount = parseInt(person.childrenCount) || 0;
      const isMarried = person.maritalStatus === 'married' ? 1 : 0;

"""

content = content.replace("let totalEarnings = 0;", inject + "      let totalEarnings = 0;")

with open('src/components/payroll/PayslipsManager.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
