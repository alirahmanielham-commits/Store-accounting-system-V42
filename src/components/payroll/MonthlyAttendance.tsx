import React, { useState, useEffect } from 'react';
import { Save, Calendar, Users, XCircle, Search } from 'lucide-react';
import { db } from '../../db';
import { monthlyAttendance, employeeContracts } from '../../db/schema';
import { eq, and } from 'drizzle-orm';

export default function MonthlyAttendance({ personsData, showNotification }) {
  const [year, setYear] = useState(1403);
  const [month, setMonth] = useState(1); // Needs a proper default
  const [attendances, setAttendances] = useState([]);
  const [loading, setLoading] = useState(false);

  const [activeContracts, setActiveContracts] = useState([]);

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
      // Get all active contracts
      const contracts = await db.select().from(employeeContracts).where(eq(employeeContracts.status, 'active'));
      setActiveContracts(contracts);

      // Get existing attendance for this period
      const existing = await db.select().from(monthlyAttendance)
        .where(and(eq(monthlyAttendance.periodYear, year), eq(monthlyAttendance.periodMonth, month)));

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
          await db.insert(monthlyAttendance).values(payload);
        } else {
          await db.update(monthlyAttendance).set(a).where(eq(monthlyAttendance.id, a.id));
        }
      }
      showNotification('کارکرد با موفقیت ذخیره شد', 'success');
      fetchAttendance();
    } catch (e) {
      showNotification('خطا در ذخیره سازی', 'error');
    }
  };

  const getPersonName = (id) => {
    const p = (personsData || []).find(x => x.id === id);
    return p ? p.name : 'نامشخص';
  };

  return (
    <div className="p-6 bg-slate-50 min-h-full" dir="rtl">
      <div className="max-w-7xl mx-auto">
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
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {attendances.map(a => (
                  <tr key={a.personId} className="hover:bg-slate-50">
                    <td className="p-3 font-bold text-slate-800 whitespace-nowrap">{getPersonName(a.personId)}</td>
                    <td className="p-3 text-center">
                      <select disabled value={a.status} className={`text-xs p-1 rounded font-bold ${a.status==='approved'?'bg-emerald-100 text-emerald-700':'bg-amber-100 text-amber-700'}`}>
                        <option value="draft">پیشنویس</option>
                        <option value="approved">تایید نهایی</option>
                      </select>
                    </td>
                    <td className="p-3"><input type="number" min="0" value={a.workDays} onChange={e=>handleChange(a.personId, 'workDays', e.target.value)} className="w-full border p-1.5 rounded text-center" disabled={a.status==='approved'} /></td>
                    <td className="p-3"><input type="number" min="0" value={a.overtimeHours} onChange={e=>handleChange(a.personId, 'overtimeHours', e.target.value)} className="w-full border p-1.5 rounded text-center" disabled={a.status==='approved'} /></td>
                    <td className="p-3"><input type="number" min="0" value={a.absentDays} onChange={e=>handleChange(a.personId, 'absentDays', e.target.value)} className="w-full border p-1.5 rounded text-center" disabled={a.status==='approved'} /></td>
                    <td className="p-3"><input type="number" min="0" value={a.paidLeaveDays} onChange={e=>handleChange(a.personId, 'paidLeaveDays', e.target.value)} className="w-full border p-1.5 rounded text-center" disabled={a.status==='approved'} /></td>
                    <td className="p-3"><input type="number" min="0" value={a.sickLeaveDays} onChange={e=>handleChange(a.personId, 'sickLeaveDays', e.target.value)} className="w-full border p-1.5 rounded text-center" disabled={a.status==='approved'} /></td>
                    <td className="p-3"><input type="number" min="0" value={a.missionDays} onChange={e=>handleChange(a.personId, 'missionDays', e.target.value)} className="w-full border p-1.5 rounded text-center" disabled={a.status==='approved'} /></td>
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
    </div>
  );
}
