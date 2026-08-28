import re
with open('src/components/payroll/DailyAttendanceManager.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Add getEmployeeContracts to the imports if it's missing or fix the one I broke
if 'getEmployeeContracts' not in content:
    content = content.replace("getLeaves, getMissions", "getLeaves, getMissions, getEmployeeContracts")

with open('src/components/payroll/DailyAttendanceManager.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

