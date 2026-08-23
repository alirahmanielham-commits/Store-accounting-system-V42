const fs = require('fs');
let code = fs.readFileSync('src/components/payroll/MonthlyAttendance.tsx', 'utf-8');

code = code.replace(
  "import { toPersianDigits } from '../../utils/format';",
  `import { toPersianDigits } from '../../utils/format';\nimport DateObjectModule from 'react-date-object';\nimport persian from 'react-date-object/calendars/persian';\nimport persian_fa from 'react-date-object/locales/persian_fa';\nconst DateObject = (DateObjectModule as any).default || DateObjectModule;`
);

code = code.replace(
  /const getPersonName = \(id\) => \{[\s\S]*?return p \? p\.name : 'نامشخص';\n  \};/,
  `const getPersonName = (id: string) => {\n    const p = (personsData || []).find((x: any) => String(x.id) === String(id));\n    return p ? p.name : 'نامشخص';\n  };`
);

code = code.replace(
  /const handleCalculateFromDaily = async \(\) => \{[\s\S]*?showNotification\('کارکرد از فرم‌های تردد، مرخصی و ماموریت با موفقیت محاسبه شد', 'success'\);\n    \} catch \(e\) \{/,
  `const handleCalculateFromDaily = async () => {
    try {
      const dailyLogs = await getDailyAttendances();
      const leaves = await getLeaves();
      const missions = await getMissions();
      
      const dObjTotal = new DateObject({ calendar: persian, locale: persian_fa });
      dObjTotal.year = year;
      dObjTotal.month = month;
      const totalDaysInMonth = dObjTotal.month.length;

      setAttendances(prev => {
        const next = [...prev];
        next.forEach(a => {
           if (a.status === 'approved') return;
           
           // 1. Calculate work days and overtime from daily logs
           let workDaysCount = 0;
           let overtimeCount = 0;
           
           const personLogs = dailyLogs.filter(l => {
              if (String(l.personId) !== String(a.personId)) return false;
              if (!l.date) return false;
              
              try {
                  const dObj = new DateObject({ date: new Date(Number(l.date)), calendar: persian, locale: persian_fa });
                  return dObj.year === year && dObj.month.number === month;
              } catch(e) { return false; }
           });
           
           const logsByDay = personLogs.reduce((acc: any, log: any) => {
             const d = new Date(Number(log.date)).toLocaleDateString('en-US');
             if (!acc[d]) acc[d] = [];
             acc[d].push(log);
             return acc;
           }, {});
           
           Object.values(logsByDay).forEach((dayLogs: any) => {
             let dayWorkH = 0;
             dayLogs.forEach((l: any) => {
               const [inH, inM] = (l.checkIn || '00:00').split(':').map(Number);
               const [outH, outM] = (l.checkOut || '00:00').split(':').map(Number);
               let diff = (outH * 60 + outM) - (inH * 60 + inM);
               if (diff < 0) diff += 24 * 60;
               let hrs = diff / 60;
               const type = l.recordType || 'work';
               if (type === 'work') dayWorkH += hrs;
             });
             
             if (dayWorkH >= 8) {
               workDaysCount += 1;
               overtimeCount += (dayWorkH - 8);
             } else if (dayWorkH > 0) {
               workDaysCount += (dayWorkH / 8);
             }
           });
           
           // 2. Calculate Leaves
           let pLeave = 0, sLeave = 0, uLeave = 0;
           const personLeaves = leaves.filter(l => String(l.personId) === String(a.personId));
           personLeaves.forEach(l => {
             const start = new Date(Number(l.startDate));
             const end = new Date(Number(l.endDate));
             
             let curr = new Date(start);
             curr.setHours(0,0,0,0);
             const endDay = new Date(end);
             endDay.setHours(23,59,59,999);
             
             while (curr <= endDay) {
               try {
                   const dObj = new DateObject({ date: curr, calendar: persian, locale: persian_fa });
                   if (dObj.year === year && dObj.month.number === month) {
                     if (l.leaveType === 'paid') pLeave += 1;
                     else if (l.leaveType === 'sick') sLeave += 1;
                     else if (l.leaveType === 'unpaid') uLeave += 1;
                   }
               } catch(e) {}
               curr.setDate(curr.getDate() + 1);
               curr.setHours(0,0,0,0);
             }
           });
           
           // 3. Calculate Missions
           let missionDays = 0;
           const personMissions = missions.filter(m => String(m.personId) === String(a.personId));
           personMissions.forEach(m => {
             const start = new Date(Number(m.startDate));
             const end = new Date(Number(m.endDate));
             
             let curr = new Date(start);
             curr.setHours(0,0,0,0);
             const endDay = new Date(end);
             endDay.setHours(23,59,59,999);
             
             while (curr <= endDay) {
               try {
                   const dObj = new DateObject({ date: curr, calendar: persian, locale: persian_fa });
                   if (dObj.year === year && dObj.month.number === month) {
                     missionDays += 1;
                   }
               } catch(e) {}
               curr.setDate(curr.getDate() + 1);
               curr.setHours(0,0,0,0);
             }
           });

           a.workDays = parseFloat(workDaysCount.toFixed(2));
           a.overtimeHours = parseFloat(overtimeCount.toFixed(2));
           a.paidLeaveDays = pLeave;
           a.sickLeaveDays = sLeave;
           a.unpaidLeaveDays = uLeave;
           a.missionDays = missionDays;

           // Calculate absent days (Total days - everything else)
           let totalRecorded = Math.ceil(a.workDays) + pLeave + sLeave + uLeave + missionDays;
           
           // Typically, Friday is a weekend. If we want to be exact, we should count fridays.
           let fridays = 0;
           for (let i = 1; i <= totalDaysInMonth; i++) {
               try {
                   let fObj = new DateObject({ calendar: persian, locale: persian_fa });
                   fObj.year = year;
                   fObj.month = month;
                   fObj.day = i;
                   if (fObj.weekDay.index === 6) { // Friday in persian calendar index is 6 (starts Saturday=0)
                       fridays++;
                   }
               } catch(e){}
           }
           
           let remainingDays = totalDaysInMonth - totalRecorded - fridays;
           a.absentDays = remainingDays > 0 ? remainingDays : 0;
        });
        return next;
      });
      showNotification('کارکرد از فرم‌های تردد، مرخصی و ماموریت با موفقیت محاسبه شد', 'success');
    } catch (e) {`
);

code = code.replace(
  /const personLogs = allDailyLogs\.filter\(l => \{[\s\S]*?\}\)\.sort/g,
  `const personLogs = allDailyLogs.filter(l => {
                      if (String(l.personId) !== String(viewDetailsPersonId)) return false;
                      if (!l.date) return false;
                      try {
                          const dObj = new DateObject({ date: new Date(Number(l.date)), calendar: persian, locale: persian_fa });
                          return dObj.year === year && dObj.month.number === month;
                      } catch(e) { return false; }
                    }).sort`
);


fs.writeFileSync('src/components/payroll/MonthlyAttendance.tsx', code);
