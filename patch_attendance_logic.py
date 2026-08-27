import re

with open('src/components/payroll/MonthlyAttendance.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

old_save = """  const handleSave = async () => {
    try {
      for (const a of attendances) {
        if (a.isNew) {
          const payload = { ...a, id: Date.now().toString() + Math.random().toString() };
          delete payload.isNew;
          await addMonthlyAttendance(payload);
        } else {
          await updateMonthlyAttendance(a.id, a);
        }
      }
      showNotification('کارکرد با موفقیت ذخیره شد', 'success');
      fetchAttendance();
    } catch (e) {
      showNotification('خطا در ذخیره سازی', 'error');
    }
  };"""

new_save = """  const handleSave = async (targetIds?: string[]) => {
    const idsToSave = Array.isArray(targetIds) ? targetIds : (selectedPersonIds.length > 0 ? selectedPersonIds : attendances.map(a => a.personId));
    if (idsToSave.length === 0) return showNotification('پرسنلی برای ذخیره یافت نشد (لطفا چک باکس موارد دلخواه را انتخاب کنید)', 'error');

    try {
      const targets = attendances.filter(a => idsToSave.includes(a.personId));
      for (const a of targets) {
        if (a.isNew) {
          const payload = { ...a, id: Date.now().toString() + Math.random().toString() };
          delete payload.isNew;
          await addMonthlyAttendance(payload);
        } else {
          await updateMonthlyAttendance(a.id, a);
        }
      }
      showNotification(`کارکرد ${toPersianDigits(targets.length)} نفر با موفقیت ذخیره شد`, 'success');
      fetchAttendance();
    } catch (e) {
      showNotification('خطا در ذخیره سازی', 'error');
    }
  };"""

code = code.replace(old_save, new_save)


old_calc_header = """  const handleCalculateFromDaily = async () => {
    try {
      const dailyLogs = await getDailyAttendances();"""

new_calc_header = """  const handleCalculateFromDaily = async (targetIds?: string[]) => {
    const idsToCalc = Array.isArray(targetIds) ? targetIds : (selectedPersonIds.length > 0 ? selectedPersonIds : attendances.map(a => a.personId));
    if (idsToCalc.length === 0) return showNotification('پرسنلی برای محاسبه یافت نشد (لطفا چک باکس موارد دلخواه را انتخاب کنید)', 'error');

    try {
      const dailyLogs = await getDailyAttendances();"""

code = code.replace(old_calc_header, new_calc_header)

old_calc_loop = """      setAttendances(prev => {
        const next = [...prev];
        next.forEach(a => {
           if (a.status === 'approved') return;"""

new_calc_loop = """      setAttendances(prev => {
        const next = [...prev];
        next.forEach(a => {
           if (!idsToCalc.includes(a.personId)) return;
           if (a.status === 'approved') return;"""

code = code.replace(old_calc_loop, new_calc_loop)

# Add success message at the end of calc logic
old_calc_footer = """           a.missionDays = missionDays;
        });
        return next;
      });
    } catch (e) {"""

new_calc_footer = """           a.missionDays = missionDays;
        });
        return next;
      });
      showNotification(`محاسبه برای ${toPersianDigits(idsToCalc.length)} نفر انجام شد`, 'success');
    } catch (e) {"""

code = code.replace(old_calc_footer, new_calc_footer)

with open('src/components/payroll/MonthlyAttendance.tsx', 'w', encoding='utf-8') as f:
    f.write(code)
