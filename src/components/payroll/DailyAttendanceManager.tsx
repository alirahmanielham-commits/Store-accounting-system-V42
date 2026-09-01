import React, { useState, useEffect, useMemo } from 'react';
import { Clock, Search, Save, X, Trash2, Calendar, Plane, UserX, FileText, Plus } from 'lucide-react';
import { getDailyAttendances, addDailyAttendance, updateDailyAttendance, deleteDailyAttendance, getLeaves, addLeave, deleteLeave, getMissions, getEmployeeContracts, addMission, deleteMission } from '../../services/hrService';
import { generateId, getPersons } from '../../services/dataService';
import { toPersianDigits, formatNumber, convertToGregorian } from '../../utils/format';
import DateObjectModule from 'react-date-object';
const DateObject = (DateObjectModule as any).default || DateObjectModule;

export default function DailyAttendanceManager({ personsData, storeSettings, showNotification, DatePicker, persian, persian_fa }) {
  const [activeTab, setActiveTab] = useState<'attendance' | 'leave' | 'mission' | 'calendar'>('attendance');
  const [calPersonId, setCalPersonId] = useState('');
  const [filterYear, setCalYear] = useState(1403);
  const [filterMonth, setCalMonth] = useState(1);

  useEffect(() => {
    try {
      const today = new DateObject({ calendar: persian, locale: persian_fa });
      setCalYear(today.year);
      setCalMonth(today.month.number);
    } catch (e) {}
  }, [persian, persian_fa]);
  const [loading, setLoading] = useState(false);
  const [isAttendanceModalOpen, setIsAttendanceModalOpen] = useState(false);
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [isMissionModalOpen, setIsMissionModalOpen] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState({ isOpen: false, message: '', onConfirm: () => {} });
  const [isDayModalOpen, setIsDayModalOpen] = useState(false);
  const [selectedDayDate, setSelectedDayDate] = useState<number | null>(null);
  const [selectedDayNum, setSelectedDayNum] = useState<number | null>(null);
  
  // Data
  const [attendances, setAttendances] = useState<any[]>([]);
  const [leaves, setLeaves] = useState<any[]>([]);
  const [missions, setMissions] = useState<any[]>([]);
  const [contracts, setContracts] = useState<any[]>([]);
  
  // Forms
  const [selectedDate, setSelectedDate] = useState<any>(Date.now());
  const [form, setForm] = useState({
    personId: '',
    checkIn: '08:00',
    checkOut: '17:00',
    recordType: 'work',
    mode: 'both'
  });

  const [leaveForm, setLeaveForm] = useState({
    personId: '',
    leaveType: 'paid', // paid, unpaid, sick
    startDate: Date.now(),
    endDate: Date.now(),
    description: ''
  });

  const [missionForm, setMissionForm] = useState({
    personId: '',
    destination: '',
    startDate: Date.now(),
    endDate: Date.now(),
    description: ''
  });

  const RECORD_TYPES = {
    work: 'کارکرد عادی',
    overtime: 'اضافه کاری'
  };

  const LEAVE_TYPES = {
    paid: 'استحقاقی (با حقوق)',
    unpaid: 'بدون حقوق',
    sick: 'استعلاجی'
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [att, lv, mis, cnt] = await Promise.all([
        getDailyAttendances(),
        getLeaves(),
        getMissions(),
        getEmployeeContracts()
      ]);
      setAttendances(att);
      setLeaves(lv);
      setMissions(mis);
      setContracts(cnt);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const getTimestampStr = (dateVal: any) => {
    if (!dateVal) return null;
    try {
      if (typeof dateVal === 'string') {
        const d = new Date(convertToGregorian(dateVal));
        if (!isNaN(d.getTime())) return d.getTime().toString();
      }
      if (typeof dateVal.valueOf === 'function') {
        const val = dateVal.valueOf();
        if (typeof val === 'number' && !isNaN(val)) return val.toString();
      }
      if (typeof dateVal.toUnix === 'function') return (dateVal.toUnix() * 1000).toString();
      if (typeof dateVal.toDate === 'function') return dateVal.toDate().getTime().toString();
      if (dateVal instanceof Date) return dateVal.getTime().toString();
      const parsed = new Date(dateVal).getTime();
      if (!isNaN(parsed)) return parsed.toString();
    } catch(e) {}
    return Date.now().toString();
  };

  const currentDayStr = getTimestampStr(selectedDate);
  const currentDayStrLeave = getTimestampStr(leaveForm.startDate);
  const currentDayStrMission = getTimestampStr(missionForm.startDate);

  const getPersonName = (id: string) => {
    return personsData?.find(p => p.id === id)?.name || 'نامشخص';
  };

  const isDateRangeOverlap = (s1: any, e1: any, s2: any, e2: any) => {
    const start1 = new Date(Number(s1)).setHours(0,0,0,0);
    const end1 = new Date(Number(e1)).setHours(23,59,59,999);
    const start2 = new Date(Number(s2)).setHours(0,0,0,0);
    const end2 = new Date(Number(e2)).setHours(23,59,59,999);
    return start1 <= end2 && end1 >= start2;
  };

  const isDayInRange = (dayTs: any, startTs: any, endTs: any) => {
    const t = new Date(Number(dayTs)).setHours(12,0,0,0);
    const s = new Date(Number(startTs)).setHours(0,0,0,0);
    const e = new Date(Number(endTs)).setHours(23,59,59,999);
    return t >= s && t <= e;
  };

  const isTimeOverlap = (in1: string, out1: string, in2: string, out2: string) => {
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
  };

  // --- ATTENDANCE ---
  const checkTermination = (personId: string, dateIso: string) => {
    const personContracts = contracts.filter(c => c.personId === personId);
    if (personContracts.length === 0) return false;
    // If they have any active contract, they are not terminated.
    if (personContracts.some(c => c.status === 'active')) return false;
    // Find the latest terminated contract
    const terminated = personContracts.filter(c => c.status === 'terminated' && c.terminationDate).sort((a,b) => (new Date(b.terminationDate).getTime()) - (new Date(a.terminationDate).getTime()));
    if (terminated.length > 0) {
      const tDate = new Date(terminated[0].terminationDate);
      tDate.setHours(0,0,0,0);
      const targetDate = new Date(dateIso);
      targetDate.setHours(0,0,0,0);
      if (targetDate.getTime() > tDate.getTime()) {
        return true;
      }
    }
    return false;
  };

  const handleSaveAttendance = async (e: React.FormEvent) => {
    e.preventDefault();
    if(loading) return;
    setLoading(true);
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

  const handleDeleteAttendance = (id: string) => {
    setConfirmConfig({
      isOpen: true,
      message: 'آیا از حذف این تردد مطمئن هستید؟',
      onConfirm: async () => {
        try {
          await deleteDailyAttendance(id);
          showNotification('تردد حذف شد', 'success');
          fetchData();
        } catch (error) {
          showNotification('خطا در حذف تردد', 'error');
        }
      }
    });
  };
  const filteredAttendances = useMemo(() => {
    return attendances.filter(a => {
      const aDate = getTimestampStr(a.date);
      if (!aDate) return false;
      try {
        const dObj = new DateObject({ date: new Date(parseInt(aDate)), calendar: persian });
        return dObj.year === filterYear && dObj.month.number === filterMonth;
      } catch (e) {
        return false;
      }
    });
  }, [attendances, filterYear, filterMonth]);

  const filteredLeaves = useMemo(() => {
    return leaves.filter(l => {
      const ts = getTimestampStr(l.startDate);
      if (!ts) return false;
      try {
        const dObj = new DateObject({ date: new Date(parseInt(ts)), calendar: persian });
        return dObj.year === filterYear && dObj.month.number === filterMonth;
      } catch (e) {
        return false;
      }
    }).sort((a,b) => parseInt(b.createdAt || '0') - parseInt(a.createdAt || '0'));
  }, [leaves, filterYear, filterMonth]);
  
  const filteredMissions = useMemo(() => {
    return missions.filter(m => {
      const ts = getTimestampStr(m.startDate);
      if (!ts) return false;
      try {
        const dObj = new DateObject({ date: new Date(parseInt(ts)), calendar: persian });
        return dObj.year === filterYear && dObj.month.number === filterMonth;
      } catch (e) {
        return false;
      }
    }).sort((a,b) => parseInt(b.createdAt || '0') - parseInt(a.createdAt || '0'));
  }, [missions, filterYear, filterMonth]);

  const calculateHours = (inTime: string, outTime: string) => {
    if (!inTime || !outTime) return '-';
    const [inH, inM] = inTime.split(':').map(Number);
    const [outH, outM] = outTime.split(':').map(Number);
    let diff = (outH + outM/60) - (inH + inM/60);
    return diff > 0 ? diff.toFixed(2) : '0';
  };

  // --- LEAVE ---
  const handleSaveLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    if(loading) return;
    setLoading(true);
    if (!leaveForm.personId) return showNotification('لطفاً کارمند را انتخاب کنید', 'error');
    const tsStart = getTimestampStr(leaveForm.startDate);
    const tsEnd = getTimestampStr(leaveForm.endDate);
    if (!tsStart || !tsEnd || parseInt(tsStart) > parseInt(tsEnd)) return showNotification('تاریخ پایان نمی‌تواند قبل از تاریخ شروع باشد', 'error');
    if (checkTermination(missionForm.personId, tsEnd)) return showNotification('این شخص ترک کار کرده است و امکان ثبت داده بعد از تاریخ ترک کار وجود ندارد', 'error');
    if (checkTermination(leaveForm.personId, tsEnd)) return showNotification('این شخص ترک کار کرده است و امکان ثبت داده بعد از تاریخ ترک کار وجود ندارد', 'error');

    const pLeaves = leaves.filter(l => l.personId === leaveForm.personId);
    const pMissions = missions.filter(m => m.personId === leaveForm.personId);
    const pAtts = attendances.filter(a => a.personId === leaveForm.personId);

    if (pLeaves.some(l => isDateRangeOverlap(tsStart, tsEnd, l.startDate, l.endDate))) {
       return showNotification('این بازه زمانی با مرخصی دیگری هم‌پوشانی دارد', 'error');
    }
    if (pMissions.some(m => isDateRangeOverlap(tsStart, tsEnd, m.startDate, m.endDate))) {
       return showNotification('این بازه زمانی با یک ماموریت هم‌پوشانی دارد', 'error');
    }
    if (pAtts.some(a => isDayInRange(a.date, tsStart, tsEnd))) {
       return showNotification('در این بازه زمانی تردد ثبت شده وجود دارد', 'error');
    }

    try {
      const newRecord = {
        id: generateId(),
        personId: leaveForm.personId,
        leaveType: leaveForm.leaveType,
        startDate: tsStart,
        endDate: tsEnd,
        description: leaveForm.description,
        createdAt: Date.now()
      };
      await addLeave(newRecord);
      showNotification('مرخصی/غیبت با موفقیت ثبت شد', 'success');
      setLeaveForm({ ...leaveForm, description: '' });
      setIsLeaveModalOpen(false);
      fetchData();
    } catch (error) {
      showNotification('خطا در ثبت مرخصی', 'error');
    }
  };

  const handleDeleteLeave = (id: string) => {
    setConfirmConfig({
      isOpen: true,
      message: 'آیا از حذف این رکورد مطمئن هستید؟',
      onConfirm: async () => {
        try {
          await deleteLeave(id);
          showNotification('رکورد با موفقیت حذف شد', 'success');
          fetchData();
        } catch (error) {
          showNotification('خطا در حذف رکورد', 'error');
        }
      }
    });
  };
  // --- MISSION ---
  const handleSaveMission = async (e: React.FormEvent) => {
    e.preventDefault();
    if(loading) return;
    setLoading(true);
    if (!missionForm.personId) return showNotification('لطفاً کارمند را انتخاب کنید', 'error');
    const tsStart = getTimestampStr(missionForm.startDate);
    const tsEnd = getTimestampStr(missionForm.endDate);
    if (!tsStart || !tsEnd || parseInt(tsStart) > parseInt(tsEnd)) return showNotification('تاریخ پایان نمی‌تواند قبل از تاریخ شروع باشد', 'error');
    if (checkTermination(missionForm.personId, tsEnd)) return showNotification('این شخص ترک کار کرده است و امکان ثبت داده بعد از تاریخ ترک کار وجود ندارد', 'error');
    if (checkTermination(leaveForm.personId, tsEnd)) return showNotification('این شخص ترک کار کرده است و امکان ثبت داده بعد از تاریخ ترک کار وجود ندارد', 'error');

    const pLeaves = leaves.filter(l => l.personId === missionForm.personId);
    const pMissions = missions.filter(m => m.personId === missionForm.personId);
    const pAtts = attendances.filter(a => a.personId === missionForm.personId);

    if (pMissions.some(m => isDateRangeOverlap(tsStart, tsEnd, m.startDate, m.endDate))) {
       return showNotification('این بازه زمانی با ماموریت دیگری هم‌پوشانی دارد', 'error');
    }
    if (pLeaves.some(l => isDateRangeOverlap(tsStart, tsEnd, l.startDate, l.endDate))) {
       return showNotification('این بازه زمانی با یک مرخصی هم‌پوشانی دارد', 'error');
    }
    if (pAtts.some(a => isDayInRange(a.date, tsStart, tsEnd))) {
       return showNotification('در این بازه زمانی تردد ثبت شده وجود دارد', 'error');
    }

    try {
      const newRecord = {
        id: generateId(),
        personId: missionForm.personId,
        destination: missionForm.destination,
        startDate: tsStart,
        endDate: tsEnd,
        description: missionForm.description,
        createdAt: Date.now()
      };
      await addMission(newRecord);
      showNotification('ماموریت با موفقیت ثبت شد', 'success');
      setMissionForm({ ...missionForm, description: '', destination: '' });
      setIsMissionModalOpen(false);
      fetchData();
    } catch (error) {
      showNotification('خطا در ثبت ماموریت', 'error');
    }
  };

  const handleDeleteMission = (id: string) => {
    setConfirmConfig({
      isOpen: true,
      message: 'آیا از حذف این رکورد مطمئن هستید؟',
      onConfirm: async () => {
        try {
          await deleteMission(id);
          showNotification('رکورد با موفقیت حذف شد', 'success');
          fetchData();
        } catch (error) {
          showNotification('خطا در حذف رکورد', 'error');
        }
      }
    });
  };
  const activeEmployees = (personsData || []).filter(p => p.role === 'employee' || p.role === 'manager');

  const renderAttendanceTab = () => (
      <div className="lg:col-span-3">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
            <div className="flex items-center gap-4">
              <h3 className="font-bold text-slate-700">تردد‌های ثبت شده در این ماه</h3>
              <button 
                onClick={() => setIsAttendanceModalOpen(true)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg text-sm font-bold flex items-center gap-1 transition-colors"
              >
                <Plus className="w-4 h-4" />
                ثبت تردد
              </button>
            </div>
            <span className="bg-white px-3 py-1 rounded-lg border border-slate-200 text-sm font-bold text-indigo-600 shadow-sm">
              {toPersianDigits(filteredAttendances.length)} رکورد
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead className="bg-white text-slate-500 border-b border-slate-100">
                <tr>
                  <th className="p-4 font-bold">تاریخ</th>
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
                    <td className="p-4 font-bold text-slate-800 font-mono text-sm">{a.date ? new Date(parseInt(getTimestampStr(a.date))).toLocaleDateString('fa-IR') : '-'}</td>
                    <td className="p-4 font-bold text-slate-800">{getPersonName(a.personId)}</td>
                    <td className="p-4 text-xs font-bold text-slate-600 bg-slate-50/50 rounded-lg">
                      {RECORD_TYPES[a.recordType as keyof typeof RECORD_TYPES] || 'کارکرد عادی'}
                    </td>
                    <td className="p-4 text-center font-mono font-bold text-slate-600">{toPersianDigits(a.checkIn || '-')}</td>
                    <td className="p-4 text-center font-mono font-bold text-slate-600">{toPersianDigits(a.checkOut || '-')}</td>
                    <td className="p-4 text-center font-bold text-indigo-600">
                      {toPersianDigits(calculateHours(a.checkIn, a.checkOut))}
                    </td>
                    <td className="p-4 text-center">
                      <button type="button"
                        onClick={() => handleDeleteAttendance(a.id)}
                        className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredAttendances.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-12 text-center text-slate-400 font-medium">
                      در این روز ترددی ثبت نشده است
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
  );


  const renderCalendarTab = () => {
    let daysInMonth = 30;
    let startWeekDay = 0;
    
    try {
      const calDate = new DateObject({ calendar: persian, locale: persian_fa });
      calDate.year = filterYear;
      calDate.month = filterMonth;
      calDate.day = 1;
      daysInMonth = calDate.month.length;
      startWeekDay = calDate.weekDay.index; 
    } catch(e) {}
    
    const personAttendances = attendances.filter(a => {
        if (a.personId !== calPersonId) return false;
        try {
            const d = new DateObject({ date: new Date(Number(a.date)), calendar: persian, locale: persian_fa });
            return d.year === filterYear && d.month.number === filterMonth;
        } catch(e) { return false; }
    });
    
    const personLeaves = leaves.filter(l => l.personId === calPersonId);
    const personMissions = missions.filter(m => m.personId === calPersonId);

    const grid = [];
    // DateObject weekday index: 0 is Saturday
    for (let i = 0; i < startWeekDay; i++) {
        grid.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
        grid.push(i);
    }
    
    const weekDays = ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنج‌شنبه', 'جمعه'];
    
    return (
      <div className="lg:col-span-3">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden p-6">
          <div className="flex flex-wrap gap-4 items-end mb-6">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-bold text-slate-700 mb-1">انتخاب کارمند</label>
              <select 
                value={calPersonId} 
                onChange={e => setCalPersonId(e.target.value)}
                className="w-full border border-slate-200 p-2.5 rounded-xl font-bold bg-slate-50 outline-none focus:border-indigo-500 focus:ring-2"
              >
                <option value="">انتخاب کنید...</option>
                {activeEmployees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">سال</label>
              <input 
                type="number" 
                value={filterYear} 
                onChange={e => setCalYear(Number(e.target.value))}
                className="w-24 border border-slate-200 p-2.5 rounded-xl font-bold text-center bg-slate-50 outline-none focus:border-indigo-500 focus:ring-2"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">ماه</label>
              <select 
                value={filterMonth} 
                onChange={e => setCalMonth(Number(e.target.value))}
                className="w-32 border border-slate-200 p-2.5 rounded-xl font-bold bg-slate-50 outline-none focus:border-indigo-500 focus:ring-2"
              >
                {[
                  'فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
                  'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'
                ].map((m, i) => (
                  <option key={i+1} value={i+1}>{m}</option>
                ))}
              </select>
            </div>
          </div>
          
          {calPersonId ? (
            <div className="border border-slate-200 rounded-xl overflow-hidden mt-6">
               <div className="grid grid-cols-7 bg-slate-100 text-center text-sm font-bold text-slate-600 border-b border-slate-200">
                  {weekDays.map(w => <div key={w} className="py-2 border-l last:border-0 border-slate-200">{w}</div>)}
               </div>
               <div className="grid grid-cols-7 text-center">
                  {grid.map((day, i) => {
                     if (!day) return <div key={i} className="min-h-[100px] bg-slate-50 border-b border-l border-slate-200 last:border-l-0"></div>;
                     
                     let todayAtt = [];
                     let todayLeave = null;
                     let todayMission = null;
                     let dObj = null;
                     
                     try {
                         dObj = new DateObject({ calendar: persian, locale: persian_fa });
                         dObj.year = filterYear;
                         dObj.month = filterMonth;
                         dObj.day = day;
                         
                         todayAtt = personAttendances.filter(a => {
                             const ad = new DateObject({ date: new Date(Number(a.date)), calendar: persian, locale: persian_fa });
                             return ad.day === day;
                         });
                         
                         const t = new Date(dObj.toDate().setHours(12, 0, 0, 0));
                         
                         todayLeave = personLeaves.find(l => {
                             const start = new Date(Number(l.startDate));
                             const end = new Date(Number(l.endDate));
                             return t >= new Date(start.setHours(0,0,0,0)) && t <= new Date(end.setHours(23,59,59,999));
                         });
                         
                         todayMission = personMissions.find(m => {
                             const start = new Date(Number(m.startDate));
                             const end = new Date(Number(m.endDate));
                             return t >= new Date(start.setHours(0,0,0,0)) && t <= new Date(end.setHours(23,59,59,999));
                         });
                     } catch(e) {}
                     
                     let content = null;
                     let bgColor = 'bg-white';
                     
                     if (todayLeave) {
                         bgColor = 'bg-rose-50';
                         content = <div className="text-xs font-bold text-rose-600 mt-1">{LEAVE_TYPES[todayLeave.leaveType as keyof typeof LEAVE_TYPES] || 'مرخصی'}</div>;
                     } else if (todayMission) {
                         bgColor = 'bg-blue-50';
                         content = <div className="text-xs font-bold text-blue-600 mt-1 truncate px-1" title={todayMission.destination}>ماموریت: {todayMission.destination}</div>;
                     } else if (todayAtt.length > 0) {
                         bgColor = 'bg-emerald-50';
                         content = todayAtt.map(a => (
                             <div key={a.id} className="text-xs font-bold text-emerald-700 bg-emerald-100/50 rounded px-1 py-1 mt-1 mx-1 border border-emerald-200">
                               {a.checkIn} تا {a.checkOut}
                               <div className="opacity-75 text-[10px]">{calculateHours(a.checkIn, a.checkOut)} ساعت</div>
                             </div>
                         ));
                     } else {
                         if (dObj && dObj.toDate() < new Date()) {
                             content = <div className="text-[10px] text-slate-400 mt-1">غیبت / ثبت نشده</div>;
                         }
                     }

                     return (
                         <div 
                           key={i} 
                           onClick={() => {
                             if (dObj) {
                               setSelectedDayDate(dObj.toDate().getTime());
                               setSelectedDayNum(day);
                               setIsDayModalOpen(true);
                             }
                           }}
                           className={`min-h-[100px] ${bgColor} border-b border-l border-slate-200 p-1 flex flex-col cursor-pointer hover:bg-slate-100 transition-colors group relative`}
                         >
                           <div className="absolute inset-0 bg-indigo-500/0 group-hover:bg-indigo-500/5 transition-colors pointer-events-none"></div>
                            <div className="text-right text-sm font-bold text-slate-600 pl-1 pt-1">{toPersianDigits(day)}</div>
                            <div className="flex-1 flex flex-col gap-1 items-stretch mt-1">
                               {content}
                            </div>
                         </div>
                     );
                  })}
               </div>
            </div>
          ) : (
            <div className="text-center p-12 border-2 border-dashed border-slate-200 rounded-xl text-slate-400 font-bold mt-6 bg-slate-50">
               لطفاً برای مشاهده تقویم، یک کارمند را انتخاب کنید
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderLeaveTab = () => (
      <div className="lg:col-span-3">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
            <div className="flex items-center gap-4">
              <h3 className="font-bold text-slate-700">لیست مرخصی‌ها و غیبت‌ها</h3>
              <button 
                onClick={() => setIsLeaveModalOpen(true)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg text-sm font-bold flex items-center gap-1 transition-colors"
              >
                <Plus className="w-4 h-4" />
                ثبت مرخصی/غیبت
              </button>
            </div>
            <span className="bg-white px-3 py-1 rounded-lg border border-slate-200 text-sm font-bold text-indigo-600 shadow-sm">
              {toPersianDigits(leaves.length)} رکورد
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead className="bg-white text-slate-500 border-b border-slate-100">
                <tr>
                  <th className="p-4 font-bold">کارمند</th>
                  <th className="p-4 font-bold">نوع</th>
                  <th className="p-4 font-bold">از تاریخ</th>
                  <th className="p-4 font-bold">تا تاریخ</th>
                  <th className="p-4 font-bold">توضیحات</th>
                  <th className="p-4 font-bold text-center w-16">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLeaves.map(l => (
                  <tr key={l.id} className="hover:bg-slate-50/70">
                    <td className="p-4 font-bold text-slate-800">{getPersonName(l.personId)}</td>
                    <td className="p-4 text-xs font-bold text-slate-600">
                      <span className="bg-slate-100 px-2 py-1 rounded">{LEAVE_TYPES[l.leaveType as keyof typeof LEAVE_TYPES] || l.leaveType}</span>
                    </td>
                    <td className="p-4 font-mono font-bold text-slate-600">{new Date(parseInt(l.startDate)).toLocaleDateString('fa-IR')}</td>
                    <td className="p-4 font-mono font-bold text-slate-600">{new Date(parseInt(l.endDate)).toLocaleDateString('fa-IR')}</td>
                    <td className="p-4 text-slate-500 truncate max-w-[150px]">{l.description || '-'}</td>
                    <td className="p-4 text-center">
                      <button type="button"
                        onClick={() => handleDeleteLeave(l.id)}
                        className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredLeaves.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-12 text-center text-slate-400 font-medium">
                      رکوردی ثبت نشده است
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
  );

  const renderMissionTab = () => (
      <div className="lg:col-span-3">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
            <div className="flex items-center gap-4">
              <h3 className="font-bold text-slate-700">لیست ماموریت‌ها</h3>
              <button 
                onClick={() => setIsMissionModalOpen(true)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg text-sm font-bold flex items-center gap-1 transition-colors"
              >
                <Plus className="w-4 h-4" />
                ثبت ماموریت
              </button>
            </div>
            <span className="bg-white px-3 py-1 rounded-lg border border-slate-200 text-sm font-bold text-indigo-600 shadow-sm">
              {toPersianDigits(missions.length)} رکورد
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead className="bg-white text-slate-500 border-b border-slate-100">
                <tr>
                  <th className="p-4 font-bold">کارمند</th>
                  <th className="p-4 font-bold">مقصد</th>
                  <th className="p-4 font-bold">از تاریخ</th>
                  <th className="p-4 font-bold">تا تاریخ</th>
                  <th className="p-4 font-bold">توضیحات</th>
                  <th className="p-4 font-bold text-center w-16">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredMissions.map(m => (
                  <tr key={m.id} className="hover:bg-slate-50/70">
                    <td className="p-4 font-bold text-slate-800">{getPersonName(m.personId)}</td>
                    <td className="p-4 font-bold text-indigo-600">{m.destination}</td>
                    <td className="p-4 font-mono font-bold text-slate-600">{new Date(parseInt(m.startDate)).toLocaleDateString('fa-IR')}</td>
                    <td className="p-4 font-mono font-bold text-slate-600">{new Date(parseInt(m.endDate)).toLocaleDateString('fa-IR')}</td>
                    <td className="p-4 text-slate-500 truncate max-w-[150px]">{m.description || '-'}</td>
                    <td className="p-4 text-center">
                      <button type="button"
                        onClick={() => handleDeleteMission(m.id)}
                        className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredMissions.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-12 text-center text-slate-400 font-medium">
                      ماموریتی ثبت نشده است
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
  );

  return (
    <div className="min-h-full bg-slate-50/50 p-4 md:p-8" dir="rtl">
      <div className="w-full mx-auto">
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-black text-slate-800 flex items-center gap-3">
              <FileText className="w-8 h-8 text-indigo-600" />
              ثبت داده‌های پرسنل
            </h1>
            <p className="text-sm text-slate-500 mt-2 font-medium">مدیریت ورود و خروج، مرخصی، غیبت و ماموریت کارمندان</p>
          </div>
          
          <div className="flex items-center gap-3 bg-white p-3 rounded-2xl shadow-sm border border-slate-100">
            <select
              value={filterYear}
              onChange={(e) => setCalYear(Number(e.target.value))}
              className="bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-xl focus:ring-indigo-500 focus:border-indigo-500 block w-24 p-2.5 font-bold outline-none"
            >
              {[1401, 1402, 1403, 1404, 1405].map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            <select
              value={filterMonth}
              onChange={(e) => setCalMonth(Number(e.target.value))}
              className="bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-xl focus:ring-indigo-500 focus:border-indigo-500 block w-32 p-2.5 font-bold outline-none"
            >
              {[
                'فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
                'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'
              ].map((m, i) => (
                <option key={i+1} value={i+1}>{m}</option>
              ))}
            </select>
          </div>
        </div>


        {/* Tabs */}
        <div className="flex items-center gap-2 mb-8 bg-white p-2 rounded-2xl shadow-sm border border-slate-100 overflow-x-auto">
          <button
            onClick={() => setActiveTab('attendance')}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold whitespace-nowrap transition-all ${
              activeTab === 'attendance'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200'
                : 'text-slate-600 hover:bg-slate-50 hover:text-indigo-600'
            }`}
          >
            <Clock className="w-5 h-5" />
            ورود و خروج روزانه
          </button>
          <button
            onClick={() => setActiveTab('leave')}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold whitespace-nowrap transition-all ${
              activeTab === 'leave'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200'
                : 'text-slate-600 hover:bg-slate-50 hover:text-indigo-600'
            }`}
          >
            <UserX className="w-5 h-5" />
            مرخصی و غیبت
          </button>
          <button
            onClick={() => setActiveTab('mission')}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold whitespace-nowrap transition-all ${
              activeTab === 'mission'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200'
                : 'text-slate-600 hover:bg-slate-50 hover:text-indigo-600'
            }`}
          >
            <Plane className="w-5 h-5" />
            ماموریت
          </button>
          <button
            onClick={() => setActiveTab('calendar')}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold whitespace-nowrap transition-all ${
              activeTab === 'calendar'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200'
                : 'text-slate-600 hover:bg-slate-50 hover:text-indigo-600'
            }`}
          >
            <Calendar className="w-5 h-5" />
            تقویم کارکرد
          </button>
        </div>

        {activeTab === 'attendance' && renderAttendanceTab()}
        {activeTab === 'leave' && renderLeaveTab()}
        {activeTab === 'mission' && renderMissionTab()}
        {activeTab === 'calendar' && renderCalendarTab()}

      {/* Attendance Modal */}
      {isAttendanceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50/50">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <Clock className="w-5 h-5 text-indigo-500" />
                ثبت تردد جدید
              </h3>
              <button onClick={() => setIsAttendanceModalOpen(false)} className="text-slate-400 hover:text-rose-500 hover:bg-rose-50 p-2 rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4">
              <form onSubmit={handleSaveAttendance} className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">تاریخ</label>
                  <DatePicker
                    calendar={storeSettings?.calendarType === 'gregorian' ? undefined : persian}
                    locale={storeSettings?.calendarType === 'gregorian' ? undefined : persian_fa}
                    value={selectedDate}
                    onChange={(date) => setSelectedDate(date)}
                    calendarPosition="bottom-right"
                    inputClass="w-full border border-slate-200 rounded-xl p-2.5 text-center font-bold text-slate-700 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all bg-slate-50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">کارمند</label>
                  <select 
                    value={form.personId}
                    onChange={e => setForm({...form, personId: e.target.value})}
                    className="w-full border border-slate-200 rounded-xl p-2.5 bg-slate-50 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 font-bold"
                  >
                    <option value="">انتخاب کارمند...</option>
                    {activeEmployees.map(emp => (
                      <option key={emp.id} value={emp.id}>{emp.name}</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">ثبت اطلاعات</label>
                    <select 
                      value={form.mode}
                      onChange={e => setForm({...form, mode: e.target.value})}
                      className="w-full border border-slate-200 rounded-xl p-2.5 bg-slate-50 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 font-bold"
                    >
                      <option value="both">ورود و خروج کامل</option>
                      <option value="entry">فقط ثبت ورود</option>
                      <option value="exit">فقط ثبت خروج</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">نوع تردد</label>
                    <select 
                      value={form.recordType}
                      onChange={e => setForm({...form, recordType: e.target.value})}
                      className="w-full border border-slate-200 rounded-xl p-2.5 bg-slate-50 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 font-bold"
                    >
                      {Object.entries(RECORD_TYPES).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {(form.mode === 'both' || form.mode === 'entry') && (
                    <div className={form.mode === 'entry' ? 'col-span-2' : ''}>
                      <label className="block text-sm font-bold text-slate-700 mb-1">ساعت ورود</label>
                      <input 
                        type="time" 
                        value={form.checkIn}
                        onChange={e => setForm({...form, checkIn: e.target.value})}
                        className="w-full border border-slate-200 rounded-xl p-2.5 bg-slate-50 outline-none focus:border-indigo-500 focus:ring-2 font-mono text-center"
                        required={form.mode === 'both' || form.mode === 'entry'}
                      />
                    </div>
                  )}
                  {(form.mode === 'both' || form.mode === 'exit') && (
                    <div className={form.mode === 'exit' ? 'col-span-2' : ''}>
                      <label className="block text-sm font-bold text-slate-700 mb-1">ساعت خروج</label>
                      <input 
                        type="time" 
                        value={form.checkOut}
                        onChange={e => setForm({...form, checkOut: e.target.value})}
                        className="w-full border border-slate-200 rounded-xl p-2.5 bg-slate-50 outline-none focus:border-indigo-500 focus:ring-2 font-mono text-center"
                        required={form.mode === 'both' || form.mode === 'exit'}
                      />
                    </div>
                  )}
                </div>
                <button 
                  type="submit" 
                  className="w-full py-2.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition flex items-center justify-center gap-2 mt-2"
                >
                  <Save className="w-5 h-5" /> ثبت تردد
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

            {/* Day Details Modal */}
      {isDayModalOpen && selectedDayDate && calPersonId && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50/50">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-indigo-500" />
                مدیریت تردد روز {toPersianDigits(selectedDayNum)}
              </h3>
              <button onClick={() => setIsDayModalOpen(false)} className="text-slate-400 hover:text-rose-500 hover:bg-rose-50 p-2 rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto max-h-[70vh]">
              {(() => {
                const t = new Date(new Date(selectedDayDate).setHours(12,0,0,0));
                const pLeaves = leaves.filter(l => l.personId === calPersonId);
                const pMissions = missions.filter(m => m.personId === calPersonId);
                
                const tLeave = pLeaves.find(l => {
                    const start = new Date(Number(l.startDate));
                    const end = new Date(Number(l.endDate));
                    return t >= new Date(start.setHours(0,0,0,0)) && t <= new Date(end.setHours(23,59,59,999));
                });
                
                const tMission = pMissions.find(m => {
                    const start = new Date(Number(m.startDate));
                    const end = new Date(Number(m.endDate));
                    return t >= new Date(start.setHours(0,0,0,0)) && t <= new Date(end.setHours(23,59,59,999));
                });
                
                const tAtt = attendances.filter(a => {
                    if (a.personId !== calPersonId) return false;
                    try {
                        const ad = new DateObject({ date: new Date(Number(a.date)), calendar: persian, locale: persian_fa });
                        const sd = new DateObject({ date: new Date(selectedDayDate), calendar: persian, locale: persian_fa });
                        return ad.year === sd.year && ad.month.number === sd.month.number && ad.day === sd.day;
                    } catch(e) { return false; }
                });

                return (
                  <div className="space-y-4">
                    {tLeave && (
                      <div className="p-3 bg-rose-50 text-rose-700 rounded-xl border border-rose-100 font-bold text-sm">
                        این روز مرخصی ثبت شده است.
                      </div>
                    )}
                    {tMission && (
                      <div className="p-3 bg-blue-50 text-blue-700 rounded-xl border border-blue-100 font-bold text-sm">
                        این روز ماموریت ثبت شده است.
                      </div>
                    )}
                    
                    <div className="border border-slate-200 rounded-xl overflow-hidden">
                      <div className="bg-slate-50 p-2 font-bold text-sm border-b border-slate-200">
                        ترددهای ثبت شده
                      </div>
                      {tAtt.length === 0 ? (
                        <div className="p-4 text-center text-slate-400 text-sm font-bold">هیچ ترددی یافت نشد.</div>
                      ) : (
                        <div className="divide-y divide-slate-100">
                          {tAtt.map(a => (
                            <div key={a.id} className="p-3 flex justify-between items-center bg-white hover:bg-slate-50">
                              <div className="font-bold text-slate-700">
                                <span className="text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">{a.checkIn}</span>
                                <span className="mx-2 text-slate-400">تا</span>
                                <span className="text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">{a.checkOut}</span>
                              </div>
                              <button type="button"
                                onClick={() => handleDeleteAttendance(a.id)}
                                className="p-2 text-rose-500 hover:bg-rose-100 rounded-lg transition-colors"
                                title="حذف"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    <form 
                      className="border border-slate-200 rounded-xl p-4 bg-slate-50"
                      onSubmit={async (e) => {
                        e.preventDefault();
                        const formData = new FormData(e.currentTarget);
                        const checkIn = formData.get('checkIn') as string;
                        const checkOut = formData.get('checkOut') as string;
                        if (checkIn >= checkOut) return showNotification('ساعت خروج باید پس از ساعت ورود باشد', 'error');
                        if (!selectedDayDate) return;

                        const sDateStr = selectedDayDate.toString();
                        const personLeaves = leaves.filter(l => l.personId === calPersonId);
                        const personMissions = missions.filter(m => m.personId === calPersonId);
                        const personAtts = attendances.filter(a => a.personId === calPersonId && isDayInRange(a.date, sDateStr, sDateStr));

                        if (personLeaves.some(l => isDayInRange(sDateStr, l.startDate, l.endDate))) {
                           return showNotification('برای این روز مرخصی ثبت شده است و امکان ثبت تردد وجود ندارد', 'error');
                        }
                        if (personMissions.some(m => isDayInRange(sDateStr, m.startDate, m.endDate))) {
                           return showNotification('برای این روز ماموریت ثبت شده است و امکان ثبت تردد وجود ندارد', 'error');
                        }
                        if (personAtts.some(a => isTimeOverlap(checkIn, checkOut, a.checkIn, a.checkOut))) {
                           return showNotification('ساعت ورود و خروج با تردد دیگری در همین روز هم‌پوشانی دارد', 'error');
                        }
                        
                        try {
                          const newRecord = {
                            id: generateId(),
                            personId: calPersonId,
                            date: selectedDayDate.toString(),
                            checkIn,
                            checkOut,
                            recordType: 'work',
                            createdAt: Date.now()
                          };
                          await addDailyAttendance(newRecord);
                          showNotification('تردد با موفقیت ثبت شد', 'success');
                          fetchData(); // Make sure to fetch again to update the list
                          (e.target as HTMLFormElement).reset();
                        } catch (err) {
                          showNotification('خطا در ثبت تردد', 'error');
                        }
                      }}
                    >
                      <h4 className="font-bold text-slate-700 mb-3 text-sm">ثبت تردد جدید</h4>
                      <div className="grid grid-cols-2 gap-2 mb-3">
                        <div>
                          <label className="block text-xs font-bold text-slate-500 mb-1">ورود</label>
                          <input required name="checkIn" type="time" defaultValue="08:00" className="w-full border p-2 rounded-lg font-bold text-center" />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-500 mb-1">خروج</label>
                          <input required name="checkOut" type="time" defaultValue="17:00" className="w-full border p-2 rounded-lg font-bold text-center" />
                        </div>
                      </div>
                      <button type="submit" className="w-full py-2 bg-indigo-600 text-white rounded-lg font-bold text-sm hover:bg-indigo-700 transition">
                        افزودن تردد
                      </button>
                    </form>

                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Leave Modal */}

      {isLeaveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50/50">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <UserX className="w-5 h-5 text-indigo-500" />
                ثبت مرخصی / غیبت جدید
              </h3>
              <button onClick={() => setIsLeaveModalOpen(false)} className="text-slate-400 hover:text-rose-500 hover:bg-rose-50 p-2 rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4">
              <form onSubmit={handleSaveLeave} className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">کارمند</label>
                  <select 
                    value={leaveForm.personId}
                    onChange={e => setLeaveForm({...leaveForm, personId: e.target.value})}
                    className="w-full border border-slate-200 rounded-xl p-2.5 bg-slate-50 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 font-bold"
                  >
                    <option value="">انتخاب کارمند...</option>
                    {activeEmployees.map(emp => (
                      <option key={emp.id} value={emp.id}>{emp.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">نوع</label>
                  <select 
                    value={leaveForm.leaveType}
                    onChange={e => setLeaveForm({...leaveForm, leaveType: e.target.value})}
                    className="w-full border border-slate-200 rounded-xl p-2.5 bg-slate-50 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 font-bold"
                  >
                    {Object.entries(LEAVE_TYPES).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">از تاریخ</label>
                    <DatePicker
                      calendar={storeSettings?.calendarType === 'gregorian' ? undefined : persian}
                      locale={storeSettings?.calendarType === 'gregorian' ? undefined : persian_fa}
                      value={leaveForm.startDate}
                      onChange={(date) => setLeaveForm({...leaveForm, startDate: date})}
                      calendarPosition="bottom-right"
                      inputClass="w-full border border-slate-200 rounded-xl p-2.5 text-center font-bold text-slate-700 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all bg-slate-50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">تا تاریخ</label>
                    <DatePicker
                      calendar={storeSettings?.calendarType === 'gregorian' ? undefined : persian}
                      locale={storeSettings?.calendarType === 'gregorian' ? undefined : persian_fa}
                      value={leaveForm.endDate}
                      onChange={(date) => setLeaveForm({...leaveForm, endDate: date})}
                      calendarPosition="bottom-right"
                      inputClass="w-full border border-slate-200 rounded-xl p-2.5 text-center font-bold text-slate-700 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all bg-slate-50"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">توضیحات</label>
                  <textarea 
                    value={leaveForm.description}
                    onChange={e => setLeaveForm({...leaveForm, description: e.target.value})}
                    className="w-full border border-slate-200 rounded-xl p-2.5 bg-slate-50 outline-none focus:border-indigo-500 focus:ring-2 resize-none"
                    rows={2}
                  />
                </div>
                <button 
                  type="submit" 
                  className="w-full py-2.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition flex items-center justify-center gap-2 mt-2"
                >
                  <Save className="w-5 h-5" /> ثبت مرخصی/غیبت
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Mission Modal */}
      {isMissionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50/50">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <Plane className="w-5 h-5 text-indigo-500" />
                ثبت ماموریت جدید
              </h3>
              <button onClick={() => setIsMissionModalOpen(false)} className="text-slate-400 hover:text-rose-500 hover:bg-rose-50 p-2 rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4">
              <form onSubmit={handleSaveMission} className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">کارمند</label>
                  <select 
                    value={missionForm.personId}
                    onChange={e => setMissionForm({...missionForm, personId: e.target.value})}
                    className="w-full border border-slate-200 rounded-xl p-2.5 bg-slate-50 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 font-bold"
                  >
                    <option value="">انتخاب کارمند...</option>
                    {activeEmployees.map(emp => (
                      <option key={emp.id} value={emp.id}>{emp.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">مقصد</label>
                  <input 
                    type="text" 
                    value={missionForm.destination}
                    onChange={e => setMissionForm({...missionForm, destination: e.target.value})}
                    className="w-full border border-slate-200 rounded-xl p-2.5 bg-slate-50 outline-none focus:border-indigo-500 focus:ring-2 font-bold"
                    placeholder="مثال: کارخانه تهران"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">از تاریخ</label>
                    <DatePicker
                      calendar={storeSettings?.calendarType === 'gregorian' ? undefined : persian}
                      locale={storeSettings?.calendarType === 'gregorian' ? undefined : persian_fa}
                      value={missionForm.startDate}
                      onChange={(date) => setMissionForm({...missionForm, startDate: date})}
                      calendarPosition="bottom-right"
                      inputClass="w-full border border-slate-200 rounded-xl p-2.5 text-center font-bold text-slate-700 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all bg-slate-50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">تا تاریخ</label>
                    <DatePicker
                      calendar={storeSettings?.calendarType === 'gregorian' ? undefined : persian}
                      locale={storeSettings?.calendarType === 'gregorian' ? undefined : persian_fa}
                      value={missionForm.endDate}
                      onChange={(date) => setMissionForm({...missionForm, endDate: date})}
                      calendarPosition="bottom-right"
                      inputClass="w-full border border-slate-200 rounded-xl p-2.5 text-center font-bold text-slate-700 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all bg-slate-50"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">توضیحات ماموریت</label>
                  <textarea 
                    value={missionForm.description}
                    onChange={e => setMissionForm({...missionForm, description: e.target.value})}
                    className="w-full border border-slate-200 rounded-xl p-2.5 bg-slate-50 outline-none focus:border-indigo-500 focus:ring-2 resize-none"
                    rows={2}
                  />
                </div>
                <button 
                  type="submit" 
                  className="w-full py-2.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition flex items-center justify-center gap-2 mt-2"
                >
                  <Save className="w-5 h-5" /> ثبت ماموریت
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      </div>

      {/* Custom Confirm Modal */}
      {confirmConfig.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden p-6 text-center">
            <h3 className="font-bold text-slate-800 text-lg mb-2">تایید حذف</h3>
            <p className="text-slate-600 mb-6">{confirmConfig.message}</p>
            <div className="flex justify-center gap-3">
              <button 
                type="button"
                onClick={() => setConfirmConfig({ ...confirmConfig, isOpen: false })}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-colors"
              >
                انصراف
              </button>
              <button 
                type="button"
                onClick={() => {
                  setConfirmConfig({ ...confirmConfig, isOpen: false });
                  confirmConfig.onConfirm();
                }}
                className="px-4 py-2 bg-rose-500 text-white rounded-xl font-bold hover:bg-rose-600 transition-colors"
              >
                بله، حذف شود
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

