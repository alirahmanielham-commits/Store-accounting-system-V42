import re

with open('src/components/payroll/DailyAttendanceManager.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

start_idx = content.find("  const handleSaveAttendance = async (e: React.FormEvent) => {")
end_idx = content.find("  const handleDeleteAttendance = (id: string) => {")

replacement = """  const handleSaveAttendance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.personId) return showNotification('لطفاً کارمند را انتخاب کنید', 'error');
    if (!currentDayStr) return;

    if (form.mode === 'both') {
      if (!form.checkIn || !form.checkOut) return showNotification('ساعت ورود و خروج الزامی است', 'error');
      if (form.checkIn >= form.checkOut) return showNotification('ساعت خروج باید پس از ساعت ورود باشد', 'error');
    } else if (form.mode === 'entry') {
      if (!form.checkIn) return showNotification('ساعت ورود الزامی است', 'error');
    } else if (form.mode === 'exit') {
      if (!form.checkOut) return showNotification('ساعت خروج الزامی است', 'error');
    }

    if (checkTermination(form.personId, currentDayStr)) return showNotification('این شخص ترک کار کرده است و امکان ثبت داده بعد از تاریخ ترک کار وجود ندارد', 'error');

    const personLeaves = leaves.filter(l => l.personId === form.personId);
    const personMissions = missions.filter(m => m.personId === form.personId);
    const personAtts = attendances.filter(a => a.personId === form.personId && isDayInRange(a.date, currentDayStr, currentDayStr));

    if (personLeaves.some(l => isDayInRange(currentDayStr, l.startDate, l.endDate))) {
       return showNotification('برای این روز مرخصی ثبت شده است و امکان ثبت تردد وجود ندارد', 'error');
    }
    if (personMissions.some(m => isDayInRange(currentDayStr, m.startDate, m.endDate))) {
       return showNotification('برای این روز ماموریت ثبت شده است و امکان ثبت تردد وجود ندارد', 'error');
    }
    if (form.mode === 'both' && personAtts.some(a => isTimeOverlap(form.checkIn, form.checkOut, a.checkIn, a.checkOut))) {
       return showNotification('ساعت ورود و خروج با تردد دیگری در همین روز هم‌پوشانی دارد', 'error');
    }

    try {
      if (form.mode === 'exit') {
        const openEntry = personAtts.find(a => a.checkIn && (!a.checkOut || a.checkOut === ''));
        if (openEntry) {
          if (form.checkOut <= openEntry.checkIn) return showNotification('ساعت خروج باید پس از ساعت ورود باشد', 'error');
          await updateDailyAttendance(openEntry.id, { ...openEntry, checkOut: form.checkOut });
          showNotification('خروج با موفقیت ثبت شد', 'success');
        } else {
          await addDailyAttendance({
            id: generateId(), personId: form.personId, date: currentDayStr, checkIn: '', checkOut: form.checkOut, recordType: form.recordType, createdAt: Date.now()
          });
          showNotification('تردد خروج با موفقیت ثبت شد', 'success');
        }
      } else {
        const newRecord = {
          id: generateId(),
          personId: form.personId,
          date: currentDayStr,
          checkIn: form.mode === 'entry' ? form.checkIn : form.checkIn,
          checkOut: form.mode === 'entry' ? '' : form.checkOut,
          recordType: form.recordType,
          createdAt: Date.now()
        };
        await addDailyAttendance(newRecord);
        showNotification(form.mode === 'entry' ? 'ورود با موفقیت ثبت شد' : 'تردد با موفقیت ثبت شد', 'success');
      }

      setForm({ ...form, checkIn: '08:00', checkOut: '17:00' });
      setIsAttendanceModalOpen(false);
      fetchData();
    } catch (error) {
      showNotification('خطا در ثبت تردد', 'error');
    }
  };

"""

if start_idx != -1 and end_idx != -1:
    new_content = content[:start_idx] + replacement + content[end_idx:]
    with open('src/components/payroll/DailyAttendanceManager.tsx', 'w', encoding='utf-8') as f:
        f.write(new_content)
    print("handleSaveAttendance patched.")
else:
    print("Could not find start or end index.")
