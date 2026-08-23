import re

with open('src/components/payroll/DailyAttendanceManager.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("fetchData(); // Make sure to fetch again to update the list", "fetchData(); // Make sure to fetch again to update the list\n                          (e.target as HTMLFormElement).reset();")

with open('src/components/payroll/DailyAttendanceManager.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
