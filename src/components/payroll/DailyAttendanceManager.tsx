import React, { useState, useEffect, useMemo } from 'react';
import { Clock, Search, Save, X, Trash2, Calendar } from 'lucide-react';
import { getDailyAttendances, addDailyAttendance, updateDailyAttendance, deleteDailyAttendance } from '../../services/hrService';
import { generateId, getPersons } from '../../services/dataService';
import { toPersianDigits, formatNumber } from '../../utils/format';

export default function DailyAttendanceManager({ personsData, storeSettings, showNotification, DatePicker, persian, persian_fa }) {
  const [attendances, setAttendances] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState<any>(new Date());
  
  const [form, setForm] = useState({
    personId: '',
    checkIn: '08:00',
    checkOut: '17:00',
    recordType: 'work'
  });

  const fetchAttendances = async () => {
    setLoading(true);
    try {
      const data = await getDailyAttendances();
      setAttendances(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendances();
  }, []);

  const getTimestampStr = (dateVal: any) => {
    if (!dateVal) return null;
    try {
      if (typeof dateVal.valueOf === 'function') {
        const val = dateVal.valueOf();
        if (typeof val === 'number' && !isNaN(val)) return val.toString();
      }
      if (typeof dateVal.toUnix === 'function') return (dateVal.toUnix() * 1000).toString();
      if (typeof dateVal.toDate === 'function') return dateVal.toDate().getTime().toString();
      if (dateVal instanceof Date) return dateVal.getTime().toString();
      const parsed = new Date(dateVal).getTime();
      if (!isNaN(parsed)) return parsed.toString();
      return null;
    } catch(e) {
      return null;
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.personId) {
      showNotification('لطفا کارمند را انتخاب کنید', 'error');
      return;
    }
    const timestamp = getTimestampStr(selectedDate);
    if (!timestamp) {
      showNotification('تاریخ نامعتبر است', 'error');
      return;
    }

    try {
      await addDailyAttendance({
        id: generateId(),
        personId: form.personId,
        date: timestamp,
        checkIn: form.checkIn,
        checkOut: form.checkOut,
        recordType: form.recordType,
        createdAt: Date.now()
      });
      showNotification('تردد با موفقیت ثبت شد', 'success');
      
      setForm({ ...form, personId: '' });
      fetchAttendances();
    } catch (err) {
      console.error(err);
      showNotification('خطا در ثبت تردد', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('آیا از حذف این تردد اطمینان دارید؟')) return;
    try {
      await deleteDailyAttendance(id);
      showNotification('تردد با موفقیت حذف شد', 'success');
      fetchAttendances();
    } catch (err) {
      showNotification('خطا در حذف تردد', 'error');
    }
  };

  const filteredAttendances = useMemo(() => {
    const timestamp = getTimestampStr(selectedDate);
    if (!timestamp) return [];
    
    // Create Date objects to compare the same day (ignoring time)
    const targetDate = new Date(Number(timestamp));
    const targetYear = targetDate.getFullYear();
    const targetMonth = targetDate.getMonth();
    const targetDay = targetDate.getDate();

    return attendances.filter(a => {
      const aDate = new Date(Number(a.date));
      return aDate.getFullYear() === targetYear && 
             aDate.getMonth() === targetMonth && 
             aDate.getDate() === targetDay;
    });
  }, [attendances, selectedDate]);

  const RECORD_TYPES = {
    work: 'کارکرد عادی',
    paid_leave: 'مرخصی استحقاقی',
    sick_leave: 'مرخصی استعلاجی',
    unpaid_leave: 'مرخصی بدون حقوق',
    absent: 'غیبت',
    mission: 'مأموریت'
  };

  const getPersonName = (id: string) => {
    const p = (personsData || []).find(x => x.id === id);
    return p ? p.name : 'نامشخص';
  };

  const calculateHours = (inTime: string, outTime: string) => {
    if (!inTime || !outTime) return 0;
    const [inH, inM] = inTime.split(':').map(Number);
    const [outH, outM] = outTime.split(':').map(Number);
    let diff = (outH * 60 + outM) - (inH * 60 + inM);
    if (diff < 0) diff += 24 * 60; // handle overnight if any
    return (diff / 60).toFixed(1);
  };

  const activeEmployees = (personsData || []).filter(p => p.role === 'employee' || p.role === 'manager');

  return (
    <div className="min-h-full bg-slate-50/50 p-4 md:p-8" dir="rtl">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-black text-slate-800 flex items-center gap-3">
              <Clock className="w-8 h-8 text-indigo-600" />
              ورود و خروج روزانه
            </h1>
            <p className="text-sm text-slate-500 mt-2 font-medium">ثبت ساعت ورود و خروج کارمندان</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 sticky top-6">
              <h2 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-indigo-500" />
                ثبت تردد جدید
              </h2>
              <form onSubmit={handleSave} className="space-y-5">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">تاریخ</label>
                  <DatePicker
                    calendar={storeSettings?.calendarType === 'gregorian' ? undefined : persian}
                    locale={storeSettings?.calendarType === 'gregorian' ? undefined : persian_fa}
                    value={selectedDate}
                    onChange={(date) => setSelectedDate(date?.toDate?.() || (date ? new Date(date) : new Date()))}
                    calendarPosition="bottom-right"
                    inputClass="w-full border border-slate-200 rounded-xl p-3 text-center font-bold text-slate-700 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all bg-slate-50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">کارمند</label>
                  <select 
                    value={form.personId}
                    onChange={e => setForm({...form, personId: e.target.value})}
                    className="w-full border border-slate-200 rounded-xl p-3 bg-slate-50 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 font-bold"
                  >
                    <option value="">انتخاب کارمند...</option>
                    {activeEmployees.map(emp => (
                      <option key={emp.id} value={emp.id}>{emp.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">نوع تردد</label>
                  <select 
                    value={form.recordType}
                    onChange={e => setForm({...form, recordType: e.target.value})}
                    className="w-full border border-slate-200 rounded-xl p-3 bg-slate-50 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 font-bold"
                  >
                    {Object.entries(RECORD_TYPES).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">ساعت ورود</label>
                    <input 
                      type="time" 
                      value={form.checkIn}
                      onChange={e => setForm({...form, checkIn: e.target.value})}
                      className="w-full border border-slate-200 rounded-xl p-3 bg-slate-50 outline-none focus:border-indigo-500 focus:ring-2 font-mono text-center"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">ساعت خروج</label>
                    <input 
                      type="time" 
                      value={form.checkOut}
                      onChange={e => setForm({...form, checkOut: e.target.value})}
                      className="w-full border border-slate-200 rounded-xl p-3 bg-slate-50 outline-none focus:border-indigo-500 focus:ring-2 font-mono text-center"
                      required
                    />
                  </div>
                </div>
                <button 
                  type="submit" 
                  className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition flex items-center justify-center gap-2 shadow-lg shadow-indigo-200 mt-2"
                >
                  <Save className="w-5 h-5" /> ثبت تردد
                </button>
              </form>
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                <h3 className="font-bold text-slate-700">تردد‌های ثبت شده در این روز</h3>
                <span className="bg-white px-3 py-1 rounded-lg border border-slate-200 text-sm font-bold text-indigo-600 shadow-sm">
                  {toPersianDigits(filteredAttendances.length)} رکورد
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-right text-sm">
                  <thead className="bg-white text-slate-500 border-b border-slate-100">
                    <tr>
                      <th className="p-4 font-bold">کارمند</th>
                      <th className="p-4 font-bold">نوع</th>
                      <th className="p-4 font-bold text-center">ورود</th>
                      <th className="p-4 font-bold text-center">خروج</th>
                      <th className="p-4 font-bold text-center">مدت زمان (ساعت)</th>
                      <th className="p-4 font-bold text-center w-16">عملیات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredAttendances.map(a => (
                      <tr key={a.id} className="hover:bg-slate-50/70">
                        <td className="p-4 font-bold text-slate-800">{getPersonName(a.personId)}</td>
                        <td className="p-4 text-xs font-bold text-slate-600 bg-slate-50/50 rounded-lg">
                          {RECORD_TYPES[a.recordType as keyof typeof RECORD_TYPES] || 'کارکرد عادی'}
                        </td>
                        <td className="p-4 text-center font-mono font-bold text-slate-600">{toPersianDigits(a.checkIn)}</td>
                        <td className="p-4 text-center font-mono font-bold text-slate-600">{toPersianDigits(a.checkOut)}</td>
                        <td className="p-4 text-center font-bold text-indigo-600">
                          {toPersianDigits(calculateHours(a.checkIn, a.checkOut))}
                        </td>
                        <td className="p-4 text-center">
                          <button 
                            onClick={() => handleDelete(a.id)}
                            className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {filteredAttendances.length === 0 && (
                      <tr>
                        <td colSpan={6} className="p-12 text-center text-slate-400 font-medium">
                          در این روز ترددی ثبت نشده است
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
