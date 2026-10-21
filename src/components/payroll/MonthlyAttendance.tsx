import React, { useState, useEffect } from 'react';
import { Save, Calendar, Users, XCircle, Search, Clock, Eye, X, FileText } from 'lucide-react';
import { getMonthlyAttendances, addMonthlyAttendance, updateMonthlyAttendance, getEmployeeContracts, getDailyAttendances, getLeaves, getMissions, getPayslips } from '../../services/hrService';
import { toPersianDigits } from '../../utils/format';
import DateObjectModule from 'react-date-object';
import persian from 'react-date-object/calendars/persian';
import persian_fa from 'react-date-object/locales/persian_fa';
const DateObject = (DateObjectModule as any).default || DateObjectModule;

export default function MonthlyAttendance({ personsData, showNotification }) {
  const [year, setYear] = useState(1403);
  const [month, setMonth] = useState(1); // Needs a proper default
  const [attendances, setAttendances] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const [activeContracts, setActiveContracts] = useState<any[]>([]);
  const [viewDetailsPersonId, setViewDetailsPersonId] = useState<string | null>(null);
  const [selectedPersonIds, setSelectedPersonIds] = useState<string[]>([]);
  const [allDailyLogs, setAllDailyLogs] = useState<any[]>([]);
  const [monthPayslips, setMonthPayslips] = useState<any[]>([]);

  useEffect(() => {
    // Basic defaults
    const today = new Intl.DateTimeFormat('fa-IR').format(new Date());
    const [y, m, d] = today.split('/');
    setYear(parseInt(toEng(y)));
    setMonth(parseInt(toEng(m)));
  }, []);

  const toEng = (str) => str.replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d));

  useEffect(() => {
    if (year && month) fetchAttendance();
  }, [year, month]);

  const fetchAttendance = async () => {
    setLoading(true);
    setSelectedPersonIds([]);
    try {
      const dLogs = await getDailyAttendances();
      setAllDailyLogs(dLogs);
      const pSlips = await getPayslips();
      setMonthPayslips(pSlips);

      // Get all active contracts and appropriately terminated ones
      const allContracts = await getEmployeeContracts();
      const contracts = allContracts.filter(c => {
        if (c.status === 'active') return true;
        if (c.status === 'terminated' && c.terminationDate) {
           const termDateStr = new Intl.DateTimeFormat('fa-IR-u-nu-latn', { year: 'numeric', month: 'numeric' }).format(new Date(c.terminationDate));
           const [termY, termM] = termDateStr.split('/').map(Number);
           const mY = Number(year);
           const mM = Number(month);
           if (termY > mY || (termY === mY && termM >= mM)) {
             return true;
           }
        }
        return false;
      });
      setActiveContracts(contracts);

      // Get existing attendance for this period
      const allAttendances = await getMonthlyAttendances();
      const existing = allAttendances.filter(a => Number(a.periodYear) === Number(year) && Number(a.periodMonth) === Number(month));

      // Merge
      const merged = contracts.map(c => {
        const ex = existing.find(e => e.personId === c.personId);
        if (ex) return ex;
        return {
          personId: c.personId,
          periodYear: year,
          periodMonth: month,
          workDays: 0,
          absentDays: 0,
          paidLeaveDays: 0,
          unpaidLeaveDays: 0,
          sickLeaveDays: 0,
          overtimeHours: 0,
          shortageHours: 0,
          missionDays: 0,
          status: 'draft',
          isNew: true
        };
      });
      setAttendances(merged);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const parseDateToPersian = (dateVal: any) => {
    if (!dateVal) return null;
    try {
      if (typeof dateVal === 'number' || (!isNaN(Number(dateVal)) && String(dateVal).trim() !== '')) {
        const ts = Number(dateVal);
        const d = new Date(ts);
        if (!isNaN(d.getTime())) {
          const dObj = new DateObject({ date: d, calendar: persian, locale: persian_fa });
          return { year: dObj.year, month: dObj.month.number, day: dObj.day, timestamp: ts };
        }
      }
      if (typeof dateVal === 'string') {
        const cleaned = dateVal.replace(/[۰-۹]/g, (d: string) => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d).toString()).trim();
        const parts = cleaned.split(/[\/\-]/).map(Number);
        if (parts.length === 3 && parts[0] > 1300 && parts[0] < 1500) {
          return { year: parts[0], month: parts[1], day: parts[2] };
        }
        const gDate = new Date(dateVal);
        if (!isNaN(gDate.getTime())) {
          const dObj = new DateObject({ date: gDate, calendar: persian, locale: persian_fa });
          return { year: dObj.year, month: dObj.month.number, day: dObj.day, timestamp: gDate.getTime() };
        }
      }
    } catch (e) {}
    return null;
  };

  const handleChange = (personId, field, value) => {
    setAttendances(prev => prev.map(a => a.personId === personId ? {...a, [field]: value} : a));
  };

  const handleSave = async (targetIds?: string[]) => {
    if (loading) return;
    setLoading(true);
    try {
      const idsToSave = Array.isArray(targetIds) ? targetIds : (selectedPersonIds.length > 0 ? selectedPersonIds : attendances.map(a => a.personId));
      if (idsToSave.length === 0) {
        showNotification('پرسنلی برای ذخیره یافت نشد (لطفا چک باکس موارد دلخواه را انتخاب کنید)', 'error');
        return;
      }

      const targets = attendances.filter(a => {
        if (!idsToSave.includes(a.personId)) return false;
        const hasPayslip = !a.isNew && monthPayslips.some(p => String(p.attendanceId) === String(a.id));
        if (hasPayslip) return false;
        return true;
      });
      
      if (targets.length === 0) {
        showNotification('رکوردی برای ذخیره یافت نشد (ممکن است فیش صادر شده باشد)', 'error');
        return;
      }

      for (const a of targets) {
        if (a.isNew) {
          const payload = { ...a, id: Date.now().toString() + Math.random().toString().slice(2, 8) };
          delete payload.isNew;
          await addMonthlyAttendance(payload);
        } else {
          await updateMonthlyAttendance(a.id, a);
        }
      }
      showNotification(`کارکرد ${toPersianDigits(targets.length)} نفر با موفقیت ذخیره شد`, 'success');
      await fetchAttendance();
    } catch (e) {
      console.error(e);
      showNotification('خطا در ذخیره سازی', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCalculateFromDaily = async (targetIds?: string[]) => {
    if (loading) return;
    setLoading(true);
    try {
      const idsToCalc = Array.isArray(targetIds) ? targetIds : (selectedPersonIds.length > 0 ? selectedPersonIds : attendances.map(a => a.personId));
      if (idsToCalc.length === 0) {
        showNotification('پرسنلی برای محاسبه یافت نشد (لطفا پرسنل را انتخاب کنید)', 'error');
        return;
      }

      const dailyLogs = await getDailyAttendances();
      const leaves = await getLeaves();
      const missions = await getMissions();
      
      let totalDaysInMonth = 30;
      try {
        const dObjTotal = new DateObject({ calendar: persian, locale: persian_fa, year: Number(year), month: Number(month), day: 1 });
        totalDaysInMonth = dObjTotal.month ? dObjTotal.month.length : (month <= 6 ? 31 : (month <= 11 ? 30 : 29));
      } catch (e) {
        totalDaysInMonth = month <= 6 ? 31 : (month <= 11 ? 30 : 29);
      }

      // Calculate Fridays in the selected month
      let fridays = 0;
      for (let i = 1; i <= totalDaysInMonth; i++) {
        try {
          const fObj = new DateObject({ calendar: persian, locale: persian_fa, year: Number(year), month: Number(month), day: i });
          if (fObj.weekDay && fObj.weekDay.index === 6) {
            fridays++;
          }
        } catch (e) {}
      }

      const updatedAttendances = [...attendances];
      let calculatedCount = 0;

      for (let i = 0; i < updatedAttendances.length; i++) {
        const a = { ...updatedAttendances[i] };
        if (!idsToCalc.includes(a.personId)) continue;
        if (a.status === 'approved') continue;
        const hasPayslip = !a.isNew && monthPayslips.some(p => String(p.attendanceId) === String(a.id));
        if (hasPayslip) continue;

        // 1. Calculate worked days, shortage and overtime from daily logs
        let workDaysCount = 0;
        let overtimeCount = 0;
        let shortageCount = 0;

        const personLogs = dailyLogs.filter(l => {
          if (String(l.personId) !== String(a.personId)) return false;
          const p = parseDateToPersian(l.date);
          return p && Number(p.year) === Number(year) && Number(p.month) === Number(month);
        });

        const logsByDay: { [key: string]: any[] } = {};
        personLogs.forEach(l => {
          const p = parseDateToPersian(l.date);
          const dayKey = p ? `${p.year}-${p.month}-${p.day}` : String(l.date);
          if (!logsByDay[dayKey]) logsByDay[dayKey] = [];
          logsByDay[dayKey].push(l);
        });

        Object.values(logsByDay).forEach((dayLogs: any[]) => {
          let dayWorkH = 0;
          dayLogs.forEach(l => {
            let hrs = 0;
            if (l.checkIn && l.checkOut) {
              const [inH, inM] = l.checkIn.split(':').map(Number);
              const [outH, outM] = l.checkOut.split(':').map(Number);
              let diff = (outH * 60 + outM) - (inH * 60 + inM);
              if (diff < 0) diff += 24 * 60;
              hrs = diff / 60;
            } else if (l.checkIn || l.checkOut) {
              hrs = 7.33;
            }

            const type = l.recordType || 'work';
            if (type === 'work') {
              dayWorkH += hrs;
            } else if (type === 'overtime') {
              overtimeCount += hrs;
            }
          });

          if (dayWorkH >= 7.33) {
            workDaysCount += 1;
            if (dayWorkH > 7.33) {
              overtimeCount += (dayWorkH - 7.33);
            }
          } else if (dayWorkH > 0) {
            workDaysCount += 1;
            shortageCount += (7.33 - dayWorkH);
          }
        });

        // 2. Calculate Leaves
        let pLeave = 0, sLeave = 0, uLeave = 0;
        const personLeaves = leaves.filter(l => String(l.personId) === String(a.personId));
        for (let d = 1; d <= totalDaysInMonth; d++) {
          try {
            const dObj = new DateObject({ calendar: persian, locale: persian_fa, year: Number(year), month: Number(month), day: d });
            const dayTs = dObj.toDate().getTime();
            const dayStart = new Date(dayTs).setHours(0, 0, 0, 0);
            const dayEnd = new Date(dayTs).setHours(23, 59, 59, 999);

            for (const l of personLeaves) {
              let sTs = Number(l.startDate);
              let eTs = Number(l.endDate);
              if (isNaN(sTs)) {
                const sp = parseDateToPersian(l.startDate);
                if (sp) sTs = new DateObject({ calendar: persian, locale: persian_fa, year: sp.year, month: sp.month, day: sp.day }).toDate().getTime();
              }
              if (isNaN(eTs)) {
                const ep = parseDateToPersian(l.endDate);
                if (ep) eTs = new DateObject({ calendar: persian, locale: persian_fa, year: ep.year, month: ep.month, day: ep.day }).toDate().getTime();
              }

              if (!isNaN(sTs) && !isNaN(eTs)) {
                const sNorm = new Date(sTs).setHours(0, 0, 0, 0);
                const eNorm = new Date(eTs).setHours(23, 59, 59, 999);
                if (dayStart <= eNorm && dayEnd >= sNorm) {
                  if (l.leaveType === 'paid') pLeave += 1;
                  else if (l.leaveType === 'sick') sLeave += 1;
                  else if (l.leaveType === 'unpaid') uLeave += 1;
                  break;
                }
              }
            }
          } catch (e) {}
        }

        // 3. Calculate Missions
        let missionDays = 0;
        const personMissions = missions.filter(m => String(m.personId) === String(a.personId));
        for (let d = 1; d <= totalDaysInMonth; d++) {
          try {
            const dObj = new DateObject({ calendar: persian, locale: persian_fa, year: Number(year), month: Number(month), day: d });
            const dayTs = dObj.toDate().getTime();
            const dayStart = new Date(dayTs).setHours(0, 0, 0, 0);
            const dayEnd = new Date(dayTs).setHours(23, 59, 59, 999);

            for (const m of personMissions) {
              let sTs = Number(m.startDate);
              let eTs = Number(m.endDate);
              if (isNaN(sTs)) {
                const sp = parseDateToPersian(m.startDate);
                if (sp) sTs = new DateObject({ calendar: persian, locale: persian_fa, year: sp.year, month: sp.month, day: sp.day }).toDate().getTime();
              }
              if (isNaN(eTs)) {
                const ep = parseDateToPersian(m.endDate);
                if (ep) eTs = new DateObject({ calendar: persian, locale: persian_fa, year: ep.year, month: ep.month, day: ep.day }).toDate().getTime();
              }

              if (!isNaN(sTs) && !isNaN(eTs)) {
                const sNorm = new Date(sTs).setHours(0, 0, 0, 0);
                const eNorm = new Date(eTs).setHours(23, 59, 59, 999);
                if (dayStart <= eNorm && dayEnd >= sNorm) {
                  missionDays += 1;
                  break;
                }
              }
            }
          } catch (e) {}
        }

        a.workDays = parseFloat(workDaysCount.toFixed(2));
        a.overtimeHours = parseFloat(overtimeCount.toFixed(2));
        a.shortageHours = parseFloat(shortageCount.toFixed(2));
        a.paidLeaveDays = pLeave;
        a.sickLeaveDays = sLeave;
        a.unpaidLeaveDays = uLeave;
        a.missionDays = missionDays;

        // Calculate absent days (Total days - everything else)
        const totalRecorded = Math.ceil(a.workDays) + pLeave + sLeave + uLeave + missionDays;
        const remainingDays = totalDaysInMonth - totalRecorded - fridays;
        a.absentDays = remainingDays > 0 ? remainingDays : 0;

        // Auto-save the calculated record immediately to persistence
        if (a.isNew) {
          const payload = { ...a, id: Date.now().toString() + Math.random().toString().slice(2, 8) };
          delete payload.isNew;
          await addMonthlyAttendance(payload);
          updatedAttendances[i] = payload;
        } else {
          await updateMonthlyAttendance(a.id, a);
          updatedAttendances[i] = a;
        }
        calculatedCount++;
      }

      setAttendances(updatedAttendances);
      showNotification(`کارکرد ${toPersianDigits(calculatedCount)} نفر از تردد روزانه، مرخصی و مأموریت محاسبه و ذخیره گردید`, 'success');
    } catch (e) {
      console.error(e);
      showNotification('خطا در محاسبه کارکرد پرسنل', 'error');
    } finally {
      setLoading(false);
    }
  };

  const getPersonnelCode = (id: string) => {
    const p = (personsData || []).find((x: any) => x.id === id);
    return p?.personCode ? p.personCode : id.substring(0, 6);
  };

  const getPersonName = (id: string) => {
    const p = (personsData || []).find((x: any) => String(x.id) === String(id));
    return p ? p.name : 'نامشخص';
  };

  return (
    <div className="p-6 bg-slate-50 min-h-full" dir="rtl">
      <div className="w-full mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">ثبت کارکرد ماهانه پرسنل</h1>
            <p className="text-sm text-slate-500 mt-1">ورود اطلاعات حضور و غیاب جهت محاسبه حقوق</p>
          </div>
          <button onClick={() => handleSave()} className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 shadow-sm font-bold transition-all">
            {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-5 h-5" />}
            ذخیره کارکرد (گروهی)
          </button>
        </div>

        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex gap-4 mb-6 items-end">
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">سال</label>
            <input type="number" value={year} onChange={e=>setYear(parseInt(e.target.value))} className="border p-2 rounded-lg w-24 text-center font-bold" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">ماه</label>
            <select value={month} onChange={e=>setMonth(parseInt(e.target.value))} className="border p-2 rounded-lg w-40 font-bold">
              <option value={1}>فروردین</option><option value={2}>اردیبهشت</option><option value={3}>خرداد</option>
              <option value={4}>تیر</option><option value={5}>مرداد</option><option value={6}>شهریور</option>
              <option value={7}>مهر</option><option value={8}>آبان</option><option value={9}>آذر</option>
              <option value={10}>دی</option><option value={11}>بهمن</option><option value={12}>اسفند</option>
            </select>
          </div>
          <button onClick={fetchAttendance} className="bg-slate-100 px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-slate-200">
            <Search className="w-4 h-4"/> فراخوانی
          </button>
          <button onClick={() => handleCalculateFromDaily()} className="bg-indigo-50 text-indigo-700 px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-indigo-100 border border-indigo-100 mr-auto">
            <Clock className="w-4 h-4"/> محاسبه از تردد روزانه (گروهی)
          </button>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-x-auto">
          {loading ? (
            <div className="p-8 text-center text-slate-500">در حال بارگذاری...</div>
          ) : (
            <table className="w-full text-right text-sm">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-100">
                <tr>
                  <th className="p-3 w-10 text-center">
                    <input type="checkbox" className="rounded text-indigo-600 cursor-pointer" 
                      checked={attendances.length > 0 && selectedPersonIds.length === attendances.length}
                      onChange={e => {
                        if (e.target.checked) {
                          setSelectedPersonIds(attendances.map((a: any) => a.personId));
                        } else {
                          setSelectedPersonIds([]);
                        }
                      }}
                    />
                  </th>
                  <th className="p-3 font-bold whitespace-nowrap">شماره پرسنلی</th>
                  <th className="p-3 font-bold whitespace-nowrap">نام پرسنل</th>
                  <th className="p-3 font-bold whitespace-nowrap text-center">وضعیت</th>
                  <th className="p-3 font-bold whitespace-nowrap text-center w-24">روز کارکرد</th>
                  <th className="p-3 font-bold whitespace-nowrap text-center w-24">اضافه کار (س)</th>
                  <th className="p-3 font-bold whitespace-nowrap text-center w-24">غیبت (ر)</th>
                  <th className="p-3 font-bold whitespace-nowrap text-center w-24">مرخصی استحقاقی</th>
                  <th className="p-3 font-bold whitespace-nowrap text-center w-24">مرخصی استعلاجی</th>
                  <th className="p-3 font-bold whitespace-nowrap text-center w-24">مأموریت (ر)</th>
                  <th className="p-3 font-bold whitespace-nowrap text-center w-16">جزئیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {attendances.map((a: any) => (
                  <tr key={a.personId} className={`hover:bg-slate-50 ${selectedPersonIds.includes(a.personId) ? 'bg-indigo-50/30' : ''}`}>
                    <td className="p-3 text-center">
                      <input type="checkbox" className="rounded text-indigo-600 cursor-pointer" 
                        checked={selectedPersonIds.includes(a.personId)}
                        onChange={e => {
                          if (e.target.checked) {
                            setSelectedPersonIds(prev => [...prev, a.personId]);
                          } else {
                            setSelectedPersonIds(prev => prev.filter(id => id !== a.personId));
                          }
                        }}
                      />
                    </td>
                    <td className="p-3 font-mono text-slate-500 whitespace-nowrap">{getPersonnelCode(a.personId)}</td>
                    <td className="p-3 font-bold text-slate-800 whitespace-nowrap">{getPersonName(a.personId)}</td>
                    {(() => {
                      const hasPayslip = !a.isNew && monthPayslips.some(p => String(p.attendanceId) === String(a.id));
                      const isApproved = a.status === 'approved';
                      const disableInputs = isApproved || hasPayslip;
                      
                      return (
                        <>
                          <td className="p-3 text-center">
                            <select 
                              disabled={hasPayslip} 
                              value={a.status} 
                              onChange={(e) => handleChange(a.personId, 'status', e.target.value)}
                              className={`text-xs p-1 rounded font-bold cursor-pointer ${a.status==='approved'?'bg-emerald-100 text-emerald-700':'bg-amber-100 text-amber-700'} ${hasPayslip ? 'opacity-50 cursor-not-allowed' : ''}`}>
                              <option value="draft">پیشنویس</option>
                              <option value="approved">تایید نهایی</option>
                            </select>
                          </td>
                          <td className="p-3"><input type="number" min="0" value={a.workDays} onChange={(e) => handleChange(a.personId, 'workDays', Number(e.target.value))} className={`w-full border p-1.5 rounded text-center font-mono ${disableInputs ? 'bg-slate-50 text-slate-500 cursor-not-allowed' : 'bg-white text-slate-800'}`} disabled={disableInputs} /></td>
                          <td className="p-3"><input type="number" min="0" value={a.overtimeHours} onChange={(e) => handleChange(a.personId, 'overtimeHours', Number(e.target.value))} className={`w-full border p-1.5 rounded text-center font-mono ${disableInputs ? 'bg-slate-50 text-slate-500 cursor-not-allowed' : 'bg-white text-slate-800'}`} disabled={disableInputs} /></td>
                          <td className="p-3"><input type="number" min="0" value={a.shortageHours || 0} onChange={(e) => handleChange(a.personId, 'shortageHours', Number(e.target.value))} className={`w-full border p-1.5 rounded text-center font-mono ${disableInputs ? 'bg-slate-50 text-slate-500 cursor-not-allowed' : 'bg-white text-slate-800'}`} disabled={disableInputs} /></td>
                          <td className="p-3"><input type="number" min="0" value={a.absentDays} onChange={(e) => handleChange(a.personId, 'absentDays', Number(e.target.value))} className={`w-full border p-1.5 rounded text-center font-mono ${disableInputs ? 'bg-slate-50 text-slate-500 cursor-not-allowed' : 'bg-white text-slate-800'}`} disabled={disableInputs} /></td>
                          <td className="p-3"><input type="number" min="0" value={a.paidLeaveDays} onChange={(e) => handleChange(a.personId, 'paidLeaveDays', Number(e.target.value))} className={`w-full border p-1.5 rounded text-center font-mono ${disableInputs ? 'bg-slate-50 text-slate-500 cursor-not-allowed' : 'bg-white text-slate-800'}`} disabled={disableInputs} /></td>
                          <td className="p-3"><input type="number" min="0" value={a.sickLeaveDays} onChange={(e) => handleChange(a.personId, 'sickLeaveDays', Number(e.target.value))} className={`w-full border p-1.5 rounded text-center font-mono ${disableInputs ? 'bg-slate-50 text-slate-500 cursor-not-allowed' : 'bg-white text-slate-800'}`} disabled={disableInputs} /></td>
                          <td className="p-3"><input type="number" min="0" value={a.missionDays} onChange={(e) => handleChange(a.personId, 'missionDays', Number(e.target.value))} className={`w-full border p-1.5 rounded text-center font-mono ${disableInputs ? 'bg-slate-50 text-slate-500 cursor-not-allowed' : 'bg-white text-slate-800'}`} disabled={disableInputs} /></td>
                        </>
                      )
                    })()}
                    <td className="p-3 text-center flex items-center justify-center gap-1">
                      {(() => {
                        const hasPayslip = !a.isNew && monthPayslips.some(p => String(p.attendanceId) === String(a.id));
                        const isApproved = a.status === 'approved';
                        const disableInputs = isApproved || hasPayslip;
                        return (
                          <>
                            <button onClick={() => !disableInputs && handleCalculateFromDaily([a.personId])} disabled={disableInputs} className={`p-1.5 rounded transition-colors ${disableInputs ? 'text-slate-300 cursor-not-allowed' : 'text-indigo-500 hover:bg-indigo-50'}`} title={disableInputs ? "غیرقابل محاسبه" : "محاسبه کارکرد شخص"}>
                              <Clock className="w-5 h-5" />
                            </button>
                            <button onClick={() => !hasPayslip && handleSave([a.personId])} disabled={hasPayslip} className={`p-1.5 rounded transition-colors ${hasPayslip ? 'text-slate-300 cursor-not-allowed' : 'text-emerald-500 hover:bg-emerald-50'}`} title={hasPayslip ? "فیش صادر شده است" : "ذخیره کارکرد شخص"}>
                              {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-5 h-5" />}
                            </button>
                            <button onClick={() => setViewDetailsPersonId(a.personId)} className="p-1.5 text-slate-500 hover:bg-slate-100 rounded transition-colors" title="مشاهده ریز کارکرد">
                              <Eye className="w-5 h-5" />
                            </button>
                          </>
                        )
                      })()}
                    </td>
                  </tr>
                ))}
                {attendances.length === 0 && (
                  <tr><td colSpan={10} className="p-8 text-center text-slate-500">پرسنل فعالی برای این دوره یافت نشد. (ابتدا قرارداد ثبت کنید)</td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {viewDetailsPersonId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-800/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-3xl shadow-xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-500" />
                ریز کارکرد روزانه: {getPersonName(viewDetailsPersonId)} (دوره {year}/{month})
              </h3>
              <button onClick={() => setViewDetailsPersonId(null)} className="text-slate-400 hover:bg-slate-200 p-2 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto">
              <table className="w-full text-right text-sm">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-100">
                  <tr>
                    <th className="p-3 font-bold">تاریخ</th>
                    <th className="p-3 font-bold">نوع تردد</th>
                    <th className="p-3 font-bold text-center">ورود</th>
                    <th className="p-3 font-bold text-center">خروج</th>
                    <th className="p-3 font-bold text-center">ساعت</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(() => {
                    const personLogs = allDailyLogs.filter(l => {
                      if (String(l.personId) !== String(viewDetailsPersonId)) return false;
                      const p = parseDateToPersian(l.date);
                      return p && Number(p.year) === Number(year) && Number(p.month) === Number(month);
                    }).sort((a, b) => {
                      const pA = parseDateToPersian(a.date);
                      const pB = parseDateToPersian(b.date);
                      return (pA?.day || 0) - (pB?.day || 0);
                    });

                    if (personLogs.length === 0) {
                      return <tr><td colSpan={5} className="p-8 text-center text-slate-500">رکوردی برای این ماه ثبت نشده است</td></tr>;
                    }

                    const RECORD_TYPES = {
                      work: 'کارکرد عادی',
                      overtime: 'اضافه کاری',
                      paid_leave: 'مرخصی استحقاقی',
                      sick_leave: 'مرخصی استعلاجی',
                      unpaid_leave: 'مرخصی بدون حقوق',
                      absent: 'غیبت',
                      mission: 'مأموریت'
                    };

                    return personLogs.map((l, i) => {
                      const p = parseDateToPersian(l.date);
                      const ds = p ? `${p.year}/${String(p.month).padStart(2, '0')}/${String(p.day).padStart(2, '0')}` : '-';
                      let hrs = '0.0';
                      if (l.checkIn && l.checkOut) {
                        const [inH, inM] = l.checkIn.split(':').map(Number);
                        const [outH, outM] = l.checkOut.split(':').map(Number);
                        let diff = (outH * 60 + outM) - (inH * 60 + inM);
                        if (diff < 0) diff += 24 * 60;
                        hrs = (diff / 60).toFixed(1);
                      } else if (l.checkIn || l.checkOut) {
                        hrs = '7.3';
                      }

                      return (
                        <tr key={i} className="hover:bg-slate-50">
                          <td className="p-3 text-slate-800 font-mono">{toPersianDigits(ds)}</td>
                          <td className="p-3 font-bold text-slate-600">{RECORD_TYPES[l.recordType as keyof typeof RECORD_TYPES] || 'کارکرد عادی'}</td>
                          <td className="p-3 text-center font-mono">{toPersianDigits(l.checkIn)}</td>
                          <td className="p-3 text-center font-mono">{toPersianDigits(l.checkOut)}</td>
                          <td className="p-3 text-center font-mono font-bold text-indigo-600">{toPersianDigits(hrs)}</td>
                        </tr>
                      );
                    });
                  })()}
                </tbody>
              </table>
            </div>
            <div className="p-4 border-t border-slate-100 bg-slate-50 text-left">
              <button onClick={() => setViewDetailsPersonId(null)} className="px-6 py-2 bg-slate-200 text-slate-700 rounded-lg font-bold hover:bg-slate-300 transition-colors">
                بستن
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
