import re

with open('src/components/payroll/DailyAttendanceManager.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("<button \n                        onClick={() => handleDeleteLeave(l.id)}", "<button type=\"button\"\n                        onClick={() => handleDeleteLeave(l.id)}")
content = content.replace("<button \n                        onClick={() => handleDeleteMission(m.id)}", "<button type=\"button\"\n                        onClick={() => handleDeleteMission(m.id)}")

with open('src/components/payroll/DailyAttendanceManager.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
