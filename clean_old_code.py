import re

with open('src/components/payroll/DailyAttendanceManager.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Remove the old unused variables that are generating unused variable warnings, e.g. _oldDeleteAttendance, _oldDeleteLeave, _oldDeleteMission
content = re.sub(r"const _oldDeleteAttendance = async \(id: string\) => \{\s*// replaced\s*try \{\s*await deleteDailyAttendance\(id\);\s*showNotification\('تردد حذف شد', 'success'\);\s*fetchData\(\);\s*\} catch \(error\) \{\s*showNotification\('خطا در حذف تردد', 'error'\);\s*\}\s*\};\s*", "", content)
content = re.sub(r"const _oldDeleteLeave = async \(id: string\) => \{\s*// replaced\s*try \{\s*await deleteLeave\(id\);\s*showNotification\('رکورد حذف شد', 'success'\);\s*fetchData\(\);\s*\} catch \(error\) \{\s*showNotification\('خطا در حذف رکورد', 'error'\);\s*\}\s*\};\s*", "", content)
content = re.sub(r"const _oldDeleteMission = async \(id: string\) => \{\s*// replaced\s*try \{\s*await deleteMission\(id\);\s*showNotification\('رکورد حذف شد', 'success'\);\s*fetchData\(\);\s*\} catch \(error\) \{\s*showNotification\('خطا در حذف رکورد', 'error'\);\s*\}\s*\};\s*", "", content)

with open('src/components/payroll/DailyAttendanceManager.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
