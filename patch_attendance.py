import re

with open('src/components/payroll/DailyAttendanceManager.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update form initialization
content = content.replace(
    "recordType: 'work'\n  });",
    "recordType: 'work',\n    mode: 'both'\n  });"
)

# 2. Update `isTimeOverlap`
old_overlap = """  const isTimeOverlap = (in1: string, out1: string, in2: string, out2: string) => {
    const [h1in, m1in] = in1.split(':').map(Number);
    const [h1out, m1out] = out1.split(':').map(Number);
    const [h2in, m2in] = in2.split(':').map(Number);
    const [h2out, m2out] = out2.split(':').map(Number);

    const t1in = h1in * 60 + m1in;
    const t1out = h1out * 60 + m1out;
    const t2in = h2in * 60 + m2in;
    const t2out = h2out * 60 + m2out;

    return t1in < t2out && t1out > t2in;
  };"""

new_overlap = """  const isTimeOverlap = (in1: string, out1: string, in2: string, out2: string) => {
    if (!in1 || !out1 || !in2 || !out2) return false;
    const [h1in, m1in] = in1.split(':').map(Number);
    const [h1out, m1out] = out1.split(':').map(Number);
    const [h2in, m2in] = in2.split(':').map(Number);
    const [h2out, m2out] = out2.split(':').map(Number);

    const t1in = h1in * 60 + m1in;
    const t1out = h1out * 60 + m1out;
    const t2in = h2in * 60 + m2in;
    const t2out = h2out * 60 + m2out;

    return t1in < t2out && t1out > t2in;
  };"""
content = content.replace(old_overlap, new_overlap)

# 3. Update `calculateHours`
old_calc = """  const calculateHours = (inTime: string, outTime: string) => {
    const [inH, inM] = inTime.split(':').map(Number);
    const [outH, outM] = outTime.split(':').map(Number);
    let diff = (outH + outM/60) - (inH + inM/60);
    return diff > 0 ? diff.toFixed(2) : '0';
  };"""

new_calc = """  const calculateHours = (inTime: string, outTime: string) => {
    if (!inTime || !outTime) return '-';
    const [inH, inM] = inTime.split(':').map(Number);
    const [outH, outM] = outTime.split(':').map(Number);
    let diff = (outH + outM/60) - (inH + inM/60);
    return diff > 0 ? diff.toFixed(2) : '0';
  };"""
content = content.replace(old_calc, new_calc)

# 4. Update handleSaveAttendance
old_save = """  const handleSaveAttendance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.personId) return showNotification('لطفاً کارمند را انتخاب کنید', 'error');
    if (form.checkIn >= form.checkOut) return showNotification('ساعت خروج باید پس از ساعت ورود باشد', 'error');
    if (!currentDayStr) return;

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
    if (personAtts.some(a => isTimeOverlap(form.checkIn, form.checkOut, a.checkIn, a.checkOut))) {
       return showNotification('ساعت ورود و خروج با تردد دیگری در همین روز هم‌پوشانی دارد', 'error');
    }

    try {
      const newRecord = {
        id: generateId(),
        personId: form.personId,
        date: currentDayStr,
        checkIn: form.checkIn,
        checkOut: form.checkOut,
        recordType: form.recordType,
        createdAt: Date.now()
      };
      await addDailyAttendance(newRecord);
      showNotification('تردد با موفقیت ثبت شد', 'success');
      setForm({ ...form, checkIn: '08:00', checkOut: '17:00' });
      setIsAttendanceModalOpen(false);
      fetchData();
    } catch (error) {
      showNotification('خطا در ثبت تردد', 'error');
    }
  };"""

new_save = """  const handleSaveAttendance = async (e: React.FormEvent) => {
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
          // Important: We need updateDailyAttendance to be imported. I'll check that next.
          // Wait, addDailyAttendance, getDailyAttendances, deleteDailyAttendance are imported. We must import updateDailyAttendance.
          // I will use addDailyAttendance for now if update is hard, wait, no, I must update the existing record.
          // I'll make sure it's updated via hrService.
          const { updateDailyAttendance } = require('../../services/hrService');
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
  };"""
content = content.replace(old_save, new_save)

with open('src/components/payroll/DailyAttendanceManager.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

