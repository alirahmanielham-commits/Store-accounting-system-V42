import React, { useState, useEffect } from 'react';
import { Save, Calendar, Users, XCircle, Search, Clock, Eye, X, FileText } from 'lucide-react';
import { getMonthlyAttendances, addMonthlyAttendance, updateMonthlyAttendance, getEmployeeContracts, getDailyAttendances } from '../../services/hrService';
import { toPersianDigits } from '../../utils/format';

export default function MonthlyAttendance({ personsData, showNotification }) {
  const [year, setYear] = useState(1403);
  const [month, setMonth] = useState(1); // Needs a proper default
  const [attendances, setAttendances] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const [activeContracts, setActiveContracts] = useState<any[]>([]);
  const [viewDetailsPersonId, setViewDetailsPersonId] = useState<string | null>(null);
  const [allDailyLogs, setAllDailyLogs] = useState<any[]>([]);

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
    try {
      const dLogs = await getDailyAttendances();
      setAllDailyLogs(dLogs);

      // Get all active contracts
      const allContracts = await getEmployeeContracts();
      const contracts = allContracts.filter(c => c.status === 'active');
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

  const handleChange = (personId, field, value) => {
    setAttendances(prev => prev.map(a => a.personId === personId ? {...a, [field]: value} : a));
  };

  const handleSave = async () => {
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
  };

  const handleCalculateFromDaily = async () => {
    try {
      const dailyLogs = await getDailyAttendances();
      
      setAttendances(prev => {
        const next = [...prev];
        next.forEach(a => {
           if (a.status === 'approved') return;
           
           const personLogs = dailyLogs.filter(l => {
              if (l.personId !== a.personId) return false;
              if (!l.date) return false;
              const d = new Date(Number(l.date));
              const formatter = new Intl.DateTimeFormat('fa-IR-u-nu-latn', { year: 'numeric', month: 'numeric' });
              const parts = formatter.formatToParts(d);
              const pYear = parseInt(parts.find(p => p.type === 'year')?.value || '0');
              const pMonth = parseInt(parts.find(p => p.type === 'month')?.value || '0');
              return pYear === year && pMonth === month;
           });
           
           if (personLogs.length > 0) {
             const logsByDay: Record<string, any[]> = {};
             personLogs.forEach(l => {
               const dayStr = new Date(Number(l.date)).toDateString();
               if (!logsByDay[dayStr]) logsByDay[dayStr] = [];
               logsByDay[dayStr].push(l);
             });

             let workDaysCount = 0;
             let overtimeCount = 0;
             let pLeave = 0, sLeave = 0, uLeave = 0, absentH = 0, mission = 0;

             Object.values(logsByDay).forEach(dayLogs => {
               let dayWorkH = 0;
               dayLogs.forEach(l => {
                 const [inH, inM] = (l.checkIn || '00:00').split(':').map(Number);
                 const [outH, outM] = (l.checkOut || '00:00').split(':').map(Number);
                 let diff = (outH * 60 + outM) - (inH * 60 + inM);
                 if (diff < 0) diff += 24 * 60;
                 let hrs = diff / 60;

                 const type = l.recordType || 'work';
                 if (type === 'work') dayWorkH += hrs;
                 else if (type === 'paid_leave') pLeave += hrs;
                 else if (type === 'sick_leave') sLeave += hrs;
                 else if (type === 'unpaid_leave') uLeave += hrs;
                 else if (type === 'absent') absentH += hrs;
                 else if (type === 'mission') mission += hrs;
               });

               if (dayWorkH >= 8) {
                 workDaysCount += 1;
                 overtimeCount += (dayWorkH - 8);
               } else if (dayWorkH > 0) {
                 workDaysCount += (dayWorkH / 8);
               }
             });
             
             a.workDays = parseFloat(workDaysCount.toFixed(2));
             a.overtimeHours = parseFloat(overtimeCount.toFixed(2));
             a.paidLeaveDays = parseFloat((pLeave / 8).toFixed(2));
             a.sickLeaveDays = parseFloat((sLeave / 8).toFixed(2));
             a.unpaidLeaveDays = parseFloat((uLeave / 8).toFixed(2));
             a.absentDays = parseFloat((absentH / 8).toFixed(2));
             a.missionDays = parseFloat((mission / 8).toFixed(2));
           } else {
             a.workDays = 0;
             a.overtimeHours = 0;
             a.paidLeaveDays = 0;
             a.sickLeaveDays = 0;
             a.unpaidLeaveDays = 0;
             a.absentDays = 0;
             a.missionDays = 0;
           }
        });
        return next;
      });
      showNotification('کارکرد از فرم ورود و خروج با موفقیت محاسبه شد', 'success');
    } catch (e) {
      console.error(e);
      showNotification('خطا در محاسبه از تردد روزانه', 'error');
    }
  };

  const getPersonName = (id) => {
    const p = (personsData || []).find(x => x.id === id);
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
          <button onClick={handleSave} className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 shadow-sm font-bold transition-all">
            <Save className="w-5 h-5" />
            ذخیره کارکرد
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
          <button onClick={handleCalculateFromDaily} className="bg-indigo-50 text-indigo-700 px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-indigo-100 border border-indigo-100 mr-auto">
            <Clock className="w-4 h-4"/> محاسبه از تردد روزانه
          </button>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-x-auto">
          {loading ? (
            <div className="p-8 text-center text-slate-500">در حال بارگذاری...</div>
          ) : (
            <table className="w-full text-right text-sm">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-100">
                <tr>
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
                  <tr key={a.personId} className="hover:bg-slate-50">
                    <td className="p-3 font-bold text-slate-800 whitespace-nowrap">{getPersonName(a.personId)}</td>
                    <td className="p-3 text-center">
                      <select disabled value={a.status} className={`text-xs p-1 rounded font-bold ${a.status==='approved'?'bg-emerald-100 text-emerald-700':'bg-amber-100 text-amber-700'}`}>
                        <option value="draft">پیشنویس</option>
                        <option value="approved">تایید نهایی</option>
                      </select>
                    </td>
                    <td className="p-3"><input type="number" min="0" value={a.workDays} className="w-full border p-1.5 rounded text-center bg-slate-50 text-slate-500 font-mono" disabled title="محاسبه خودکار از فرم ورود و خروج" /></td>
                    <td className="p-3"><input type="number" min="0" value={a.overtimeHours} className="w-full border p-1.5 rounded text-center bg-slate-50 text-slate-500 font-mono" disabled title="محاسبه خودکار از فرم ورود و خروج" /></td>
                    <td className="p-3"><input type="number" min="0" value={a.absentDays} className="w-full border p-1.5 rounded text-center bg-slate-50 text-slate-500 font-mono" disabled title="محاسبه خودکار از فرم ورود و خروج" /></td>
                    <td className="p-3"><input type="number" min="0" value={a.paidLeaveDays} className="w-full border p-1.5 rounded text-center bg-slate-50 text-slate-500 font-mono" disabled title="محاسبه خودکار از فرم ورود و خروج" /></td>
                    <td className="p-3"><input type="number" min="0" value={a.sickLeaveDays} className="w-full border p-1.5 rounded text-center bg-slate-50 text-slate-500 font-mono" disabled title="محاسبه خودکار از فرم ورود و خروج" /></td>
                    <td className="p-3"><input type="number" min="0" value={a.missionDays} className="w-full border p-1.5 rounded text-center bg-slate-50 text-slate-500 font-mono" disabled title="محاسبه خودکار از فرم ورود و خروج" /></td>
                    <td className="p-3 text-center">
                      <button onClick={() => setViewDetailsPersonId(a.personId)} className="p-1.5 text-indigo-500 hover:bg-indigo-50 rounded transition-colors" title="مشاهده ریز کارکرد">
                        <Eye className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))}
                {attendances.length === 0 && (
                  <tr><td colSpan={8} className="p-8 text-center text-slate-500">پرسنل فعالی برای این دوره یافت نشد. (ابتدا قرارداد ثبت کنید)</td></tr>
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
                      if (l.personId !== viewDetailsPersonId) return false;
                      if (!l.date) return false;
                      const d = new Date(Number(l.date));
                      const formatter = new Intl.DateTimeFormat('fa-IR-u-nu-latn', { year: 'numeric', month: 'numeric' });
                      const parts = formatter.formatToParts(d);
                      const pYear = parseInt(parts.find(p => p.type === 'year')?.value || '0');
                      const pMonth = parseInt(parts.find(p => p.type === 'month')?.value || '0');
                      return pYear === year && pMonth === month;
                    }).sort((a, b) => Number(a.date) - Number(b.date));

                    if (personLogs.length === 0) {
                      return <tr><td colSpan={5} className="p-8 text-center text-slate-500">رکوردی برای این ماه ثبت نشده است</td></tr>;
                    }

                    const RECORD_TYPES = {
                      work: 'کارکرد عادی',
                      paid_leave: 'مرخصی استحقاقی',
                      sick_leave: 'مرخصی استعلاجی',
                      unpaid_leave: 'مرخصی بدون حقوق',
                      absent: 'غیبت',
                      mission: 'مأموریت'
                    };

                    return personLogs.map((l, i) => {
                      const d = new Date(Number(l.date));
                      const ds = new Intl.DateTimeFormat('fa-IR', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
                      const [inH, inM] = (l.checkIn || '00:00').split(':').map(Number);
                      const [outH, outM] = (l.checkOut || '00:00').split(':').map(Number);
                      let diff = (outH * 60 + outM) - (inH * 60 + inM);
                      if (diff < 0) diff += 24 * 60;
                      let hrs = (diff / 60).toFixed(1);

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
