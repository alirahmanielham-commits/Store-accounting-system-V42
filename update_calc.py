with open('src/components/payroll/MonthlyAttendance.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

old_calc = """        next.forEach(a => {
           if (!idsToCalc.includes(a.personId)) return;
           if (a.status === 'approved') return;"""

new_calc = """        next.forEach(a => {
           if (!idsToCalc.includes(a.personId)) return;
           if (a.status === 'approved') return;
           const hasPayslip = !a.isNew && monthPayslips.some(p => p.attendanceId === a.id);
           if (hasPayslip) return;"""

content = content.replace(old_calc, new_calc)

with open('src/components/payroll/MonthlyAttendance.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Done")
