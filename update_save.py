with open('src/components/payroll/MonthlyAttendance.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Modify handleSave
old_save = """    try {
      const targets = attendances.filter(a => idsToSave.includes(a.personId));
      for (const a of targets) {"""

new_save = """    try {
      const targets = attendances.filter(a => {
        if (!idsToSave.includes(a.personId)) return false;
        const hasPayslip = !a.isNew && monthPayslips.some(p => p.attendanceId === a.id);
        if (hasPayslip) return false;
        return true;
      });
      
      if (targets.length === 0) return showNotification('رکوردی برای ذخیره یافت نشد (ممکن است فیش صادر شده باشد)', 'error');

      for (const a of targets) {"""

content = content.replace(old_save, new_save)

with open('src/components/payroll/MonthlyAttendance.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Done")
