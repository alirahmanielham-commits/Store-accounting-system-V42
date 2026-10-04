import React, { useState, useMemo, useEffect } from 'react';
import {
  AlertTriangle, Clock, Calendar, CheckCircle, AlertOctagon,
  Search, ArrowDownLeft, ArrowUpRight, Filter, Bell, BellRing,
  Volume2, VolumeX, Eye, Send, Printer, RefreshCw, FileText,
  ChevronDown, ChevronUp, Check, X, ShieldAlert
} from 'lucide-react';
import DatePicker from "../../ui/CustomDatePicker";
import DateObject from "react-date-object";
import persian from "react-date-object/calendars/persian";
import persian_fa from "react-date-object/locales/persian_fa";
import { getDaysRemaining, toPersianDigits, normalizeDateForSort } from './utils';

interface Props {
  issuedChecks?: any[];
  receivedChecks?: any[];
  persons?: any[];
  accounts?: any[];
  checkbooks?: any[];
  storeSettings?: any;
  showNotification?: (msg: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
  sendNotification?: any;
  setViewingCheck?: (check: any) => void;
  onStatusChange?: (checkId: any, type: 'issued' | 'received', newStatus: string) => void;
  onEditReceiptByCheck?: any;
}

export function CheckDueReminderPanel({
  issuedChecks = [],
  receivedChecks = [],
  persons = [],
  accounts = [],
  checkbooks = [],
  storeSettings,
  showNotification,
  sendNotification,
  setViewingCheck,
  onStatusChange,
  onEditReceiptByCheck
}: Props) {
  // Helpers
  const currencyUnit = storeSettings?.currency || 'تومان';
  const toDigits = toPersianDigits || ((s: any) => String(s));
  const fmtNum = (val: number | string) => {
    const n = Number(val) || 0;
    return toDigits(n.toLocaleString('fa-IR'));
  };

  // Sound alert state
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Filters state
  // Filter preset: 'all_active' | 'overdue' | 'today' | 'next_3_days' | 'next_7_days' | 'this_month' | 'custom'
  const [dateFilterPreset, setDateFilterPreset] = useState<string>('overdue');
  const [customDateRange, setCustomDateRange] = useState<any[]>([]);
  const [checkTypeFilter, setCheckTypeFilter] = useState<'all' | 'received' | 'issued'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'urgency' | 'dueDate' | 'amount'>('urgency');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  // Audio chime generator using Web Audio API
  const playAlertChime = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
      osc.frequency.setValueAtTime(880, audioCtx.currentTime + 0.1); // A5
      gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.4);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.4);
    } catch (e) {
      // Audio not allowed or unavailable
    }
  };

  // Compile active/unsettled checks with calculated remaining days
  const activeChecks = useMemo(() => {
    const list: any[] = [];

    // Helper: is settled?
    const isSettled = (status: string) => {
      return ['cashed', 'cancelled', 'returned'].includes((status || '').toLowerCase());
    };

    // Process Received Checks
    (receivedChecks || []).forEach(c => {
      if (isSettled(c.status)) return;
      if (!c.dueDate) return;
      const days = getDaysRemaining(c.dueDate);
      const payer = persons.find(p => String(p.id) === String(c.payerId));
      const personName = payer?.name || payer?.companyName || 'مشتری نامشخص';
      const personPhone = payer?.phone || payer?.mobile || '';

      list.push({
        ...c,
        _type: 'received',
        typeLabel: 'دریافتی (طلب ما)',
        daysRemaining: days,
        isOverdue: days < 0,
        isDueToday: days === 0,
        isNearingDue: days > 0 && days <= 3,
        personName,
        personPhone,
        amountNum: Number(c.amount) || 0
      });
    });

    // Process Issued Checks
    (issuedChecks || []).forEach(c => {
      if (isSettled(c.status)) return;
      if (!c.dueDate) return;
      const days = getDaysRemaining(c.dueDate);
      const payee = persons.find(p => String(p.id) === String(c.payeeId));
      const personName = payee?.name || payee?.companyName || 'تامین‌کننده / شخص';
      const personPhone = payee?.phone || payee?.mobile || '';

      list.push({
        ...c,
        _type: 'issued',
        typeLabel: 'پرداختی (تعهد ما)',
        daysRemaining: days,
        isOverdue: days < 0,
        isDueToday: days === 0,
        isNearingDue: days > 0 && days <= 3,
        personName,
        personPhone,
        amountNum: Number(c.amount) || 0
      });
    });

    return list;
  }, [issuedChecks, receivedChecks, persons]);

  // Overall counters
  const stats = useMemo(() => {
    let overdueCount = 0;
    let overdueAmount = 0;
    let todayCount = 0;
    let todayAmount = 0;
    let nearingCount = 0;
    let nearingAmount = 0;
    let totalActiveAmount = 0;

    activeChecks.forEach(c => {
      totalActiveAmount += c.amountNum;
      if (c.daysRemaining < 0) {
        overdueCount += 1;
        overdueAmount += c.amountNum;
      } else if (c.daysRemaining === 0) {
        todayCount += 1;
        todayAmount += c.amountNum;
      } else if (c.daysRemaining <= 3) {
        nearingCount += 1;
        nearingAmount += c.amountNum;
      }
    });

    return {
      overdueCount, overdueAmount,
      todayCount, todayAmount,
      nearingCount, nearingAmount,
      totalActiveCount: activeChecks.length,
      totalActiveAmount
    };
  }, [activeChecks]);

  // Play audio alert once on mount if overdue checks exist and sound is enabled
  useEffect(() => {
    if (stats.overdueCount > 0 && soundEnabled) {
      playAlertChime();
    }
  }, [stats.overdueCount]);

  // Filter & Sort checks
  const filteredList = useMemo(() => {
    return activeChecks.filter(c => {
      // Type Filter
      if (checkTypeFilter !== 'all' && c._type !== checkTypeFilter) {
        return false;
      }

      // Date Presets
      if (dateFilterPreset === 'overdue') {
        if (c.daysRemaining >= 0) return false;
      } else if (dateFilterPreset === 'today') {
        if (c.daysRemaining !== 0) return false;
      } else if (dateFilterPreset === 'next_3_days') {
        if (c.daysRemaining < 0 || c.daysRemaining > 3) return false;
      } else if (dateFilterPreset === 'next_7_days') {
        if (c.daysRemaining < 0 || c.daysRemaining > 7) return false;
      } else if (dateFilterPreset === 'this_month') {
        if (c.daysRemaining < 0 || c.daysRemaining > 30) return false;
      } else if (dateFilterPreset === 'custom' && customDateRange.length === 2) {
        const start = normalizeDateForSort(customDateRange[0]);
        const end = normalizeDateForSort(customDateRange[1]);
        const d = normalizeDateForSort(c.dueDate);
        if (d < start || d > end) return false;
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const numStr = String(c.checkNumber || '').toLowerCase();
        const nameStr = String(c.personName || '').toLowerCase();
        const bankStr = String(c.bankName || '').toLowerCase();
        const descStr = String(c.description || '').toLowerCase();
        const amtStr = String(c.amount || '');
        const dateStr = String(c.dueDate || '');
        if (
          !numStr.includes(q) &&
          !nameStr.includes(q) &&
          !bankStr.includes(q) &&
          !descStr.includes(q) &&
          !amtStr.includes(q) &&
          !dateStr.includes(q)
        ) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === 'urgency') {
        // Overdue first (most overdue first), then today, then upcoming
        return a.daysRemaining - b.daysRemaining;
      }
      if (sortBy === 'dueDate') {
        const dateA = normalizeDateForSort(a.dueDate);
        const dateB = normalizeDateForSort(b.dueDate);
        return sortDir === 'asc' ? dateA - dateB : dateB - dateA;
      }
      if (sortBy === 'amount') {
        return sortDir === 'asc' ? a.amountNum - b.amountNum : b.amountNum - a.amountNum;
      }
      return 0;
    });
  }, [activeChecks, checkTypeFilter, dateFilterPreset, customDateRange, searchQuery, sortBy, sortDir]);

  // Handler for quick SMS reminder
  const handleSendSmsReminder = (check: any) => {
    if (!check.personPhone) {
      showNotification?.(`شماره همراه برای ${check.personName} ثبت نشده است.`, 'warning');
      return;
    }
    const msg = `با سلام و احترام، یادآوری سررسید چک شماره ${check.checkNumber} به مبلغ ${fmtNum(check.amount)} ${currencyUnit} به تاریخ ${toDigits(check.dueDate)}. با تشکر، فروشگاه ${storeSettings?.storeName || ''}`;
    if (sendNotification) {
      sendNotification({
        title: 'ارسال پیامک یادآوری چک',
        body: msg,
        recipient: check.personPhone
      });
    }
    showNotification?.(`پیامک یادآوری سررسید چک به شماره ${check.personPhone} ارسال شد.`, 'success');
  };

  return (
    <div className="space-y-6 text-right font-sans" dir="rtl">
      {/* Top Banner Alert: Automatic reminder banner */}
      <div className="bg-gradient-to-l from-slate-900 to-slate-800 text-white rounded-3xl p-6 shadow-md border border-slate-700/80 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-2 h-full bg-amber-500"></div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
              <BellRing className="w-6 h-6 animate-bounce" />
            </div>
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h2 className="text-xl font-black text-white tracking-tight">
                  پنل هوشمند یادآوری و مدیریت سررسید چک‌ها
                </h2>
                {stats.overdueCount > 0 && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-rose-500 text-white animate-pulse">
                    {toDigits(stats.overdueCount)} چک معوق و پاس‌نشده!
                  </span>
                )}
                {stats.todayCount > 0 && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-500 text-slate-950">
                    {toDigits(stats.todayCount)} سررسید امروز
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-300 mt-1 font-medium max-w-2xl leading-relaxed">
                سیستم به صورت خودکار چک‌های در شرف سررسید و اسناد معوق پاس‌نشده را پایش کرده و بر اساس فوریت دسته‌بندی می‌نماید.
              </p>
            </div>
          </div>

          {/* Sound Toggle & Print Button */}
          <div className="flex items-center gap-2 self-end md:self-center shrink-0">
            <button
              type="button"
              onClick={() => {
                setSoundEnabled(!soundEnabled);
                if (!soundEnabled) playAlertChime();
              }}
              className={`p-2.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-colors ${
                soundEnabled
                  ? 'bg-amber-500/20 border-amber-500/40 text-amber-300 hover:bg-amber-500/30'
                  : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'
              }`}
              title={soundEnabled ? 'هشدار صوتی فعال است' : 'هشدار صوتی غیرفعال است'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              <span>{soundEnabled ? 'صدا روشن' : 'صدا خاموش'}</span>
            </button>

            <button
              type="button"
              onClick={() => window.print()}
              className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-colors"
              title="چاپ لیست چک‌ها"
            >
              <Printer className="w-4 h-4" />
              <span>چاپ گزارش</span>
            </button>
          </div>
        </div>

        {/* Quick Summary Urgency Cards inside Banner */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-6 pt-5 border-t border-slate-700/80">
          {/* Overdue */}
          <button
            type="button"
            onClick={() => setDateFilterPreset('overdue')}
            className={`p-3.5 rounded-2xl border text-right transition-all cursor-pointer ${
              dateFilterPreset === 'overdue'
                ? 'bg-rose-500/30 border-rose-400 ring-2 ring-rose-400/40 text-white'
                : 'bg-slate-800/80 hover:bg-rose-500/10 border-rose-500/30 text-rose-200'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-rose-300">سررسید گذشته (پاس‌نشده)</span>
              <ShieldAlert className="w-4 h-4 text-rose-400" />
            </div>
            <span className="text-lg font-black block text-rose-100" dir="ltr">
              {fmtNum(stats.overdueAmount)} <span className="text-xs font-normal text-rose-300">{currencyUnit}</span>
            </span>
            <span className="text-[11px] text-rose-300 font-bold block mt-1">
              {toDigits(stats.overdueCount)} فقره نیازمند پیگیری فوری
            </span>
          </button>

          {/* Today */}
          <button
            type="button"
            onClick={() => setDateFilterPreset('today')}
            className={`p-3.5 rounded-2xl border text-right transition-all cursor-pointer ${
              dateFilterPreset === 'today'
                ? 'bg-amber-500/30 border-amber-400 ring-2 ring-amber-400/40 text-white'
                : 'bg-slate-800/80 hover:bg-amber-500/10 border-amber-500/30 text-amber-200'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-amber-300">سررسید امروز</span>
              <Calendar className="w-4 h-4 text-amber-400" />
            </div>
            <span className="text-lg font-black block text-amber-100" dir="ltr">
              {fmtNum(stats.todayAmount)} <span className="text-xs font-normal text-amber-300">{currencyUnit}</span>
            </span>
            <span className="text-[11px] text-amber-300 font-bold block mt-1">
              {toDigits(stats.todayCount)} فقره اقدام امروز
            </span>
          </button>

          {/* Nearing Due (3 days) */}
          <button
            type="button"
            onClick={() => setDateFilterPreset('next_3_days')}
            className={`p-3.5 rounded-2xl border text-right transition-all cursor-pointer ${
              dateFilterPreset === 'next_3_days'
                ? 'bg-orange-500/30 border-orange-400 ring-2 ring-orange-400/40 text-white'
                : 'bg-slate-800/80 hover:bg-orange-500/10 border-orange-500/30 text-orange-200'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-orange-300">در شرف سررسید (تا ۳ روز)</span>
              <Clock className="w-4 h-4 text-orange-400" />
            </div>
            <span className="text-lg font-black block text-orange-100" dir="ltr">
              {fmtNum(stats.nearingAmount)} <span className="text-xs font-normal text-orange-300">{currencyUnit}</span>
            </span>
            <span className="text-[11px] text-orange-300 font-bold block mt-1">
              {toDigits(stats.nearingCount)} فقره چک نزدیک
            </span>
          </button>

          {/* Total Active */}
          <button
            type="button"
            onClick={() => setDateFilterPreset('all_active')}
            className={`p-3.5 rounded-2xl border text-right transition-all cursor-pointer ${
              dateFilterPreset === 'all_active'
                ? 'bg-indigo-500/30 border-indigo-400 ring-2 ring-indigo-400/40 text-white'
                : 'bg-slate-800/80 hover:bg-indigo-500/10 border-indigo-500/30 text-indigo-200'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-indigo-300">کل تعهدات / مطالبات باز</span>
              <Bell className="w-4 h-4 text-indigo-400" />
            </div>
            <span className="text-lg font-black block text-indigo-100" dir="ltr">
              {fmtNum(stats.totalActiveAmount)} <span className="text-xs font-normal text-indigo-300">{currencyUnit}</span>
            </span>
            <span className="text-[11px] text-indigo-300 font-bold block mt-1">
              {toDigits(stats.totalActiveCount)} فقره کل چک‌های فعال
            </span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-4 flex flex-col gap-4">
        {/* Date Presets Segmented Control */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200/60">
            {[
              { id: 'overdue', label: '🔴 معوق (سررسید گذشته)', count: stats.overdueCount },
              { id: 'today', label: '🟡 سررسید امروز', count: stats.todayCount },
              { id: 'next_3_days', label: '🟠 در شرف سررسید (۳ روز)', count: stats.nearingCount },
              { id: 'next_7_days', label: 'هفته جاری (۷ روز)' },
              { id: 'this_month', label: 'ماه جاری (۳۰ روز)' },
              { id: 'all_active', label: 'همه فعال‌ها', count: stats.totalActiveCount },
              { id: 'custom', label: 'بازه دلخواه 📅' }
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setDateFilterPreset(tab.id)}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                  dateFilterPreset === tab.id
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>{tab.label}</span>
                {tab.count !== undefined && tab.count > 0 && (
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                    tab.id === 'overdue' ? 'bg-rose-100 text-rose-700' : 'bg-slate-200 text-slate-700'
                  }`}>
                    {toDigits(tab.count)}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Custom Date Range Picker when 'custom' is active */}
          {dateFilterPreset === 'custom' && (
            <div className="flex items-center gap-2 bg-indigo-50/60 border border-indigo-200 p-1.5 rounded-xl">
              <span className="text-xs font-bold text-indigo-900">بازه سررسید:</span>
              <DatePicker
                range
                value={customDateRange}
                onChange={setCustomDateRange}
                calendar={persian}
                locale={persian_fa}
                format="YYYY/MM/DD"
                placeholder="انتخاب بازه تاریخ سررسید..."
                inputClass="px-2.5 py-1 text-xs font-bold rounded-lg border border-indigo-200 bg-white text-slate-800"
              />
            </div>
          )}
        </div>

        {/* Search, Type Filter & Sorting */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
          <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[260px]">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="جستجو شماره چک، طرف‌حساب، بانک یا مبلغ..."
                className="w-full pr-9 pl-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-white"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Check Type Filter */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/60 text-xs font-bold">
              <button
                type="button"
                onClick={() => setCheckTypeFilter('all')}
                className={`px-3 py-1.5 rounded-lg transition-colors ${
                  checkTypeFilter === 'all' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600'
                }`}
              >
                همه
              </button>
              <button
                type="button"
                onClick={() => setCheckTypeFilter('received')}
                className={`px-3 py-1.5 rounded-lg transition-colors ${
                  checkTypeFilter === 'received' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-600'
                }`}
              >
                فقط دریافتی (طلب)
              </button>
              <button
                type="button"
                onClick={() => setCheckTypeFilter('issued')}
                className={`px-3 py-1.5 rounded-lg transition-colors ${
                  checkTypeFilter === 'issued' ? 'bg-white text-rose-700 shadow-xs' : 'text-slate-600'
                }`}
              >
                فقط پرداختی (بدهی)
              </button>
            </div>
          </div>

          {/* Sort By */}
          <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
            <span>مرتب‌سازی:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
            >
              <option value="urgency">میزان فوریت (معوق به آینده)</option>
              <option value="dueDate">تاریخ سررسید</option>
              <option value="amount">مبلغ چک</option>
            </select>
            <button
              type="button"
              onClick={() => setSortDir(sortDir === 'asc' ? 'desc' : 'asc')}
              className="px-2 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-700 text-xs font-bold"
              title="تغییر جهت مرتب‌سازی"
            >
              {sortDir === 'asc' ? '↑ صعودی' : '↓ نزولی'}
            </button>
          </div>
        </div>
      </div>

      {/* List of Checks */}
      <div className="space-y-3">
        {filteredList.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center flex flex-col items-center justify-center gap-3 shadow-xs">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle className="w-7 h-7" />
            </div>
            <h4 className="text-base font-black text-slate-800">
              هیچ چکی در این دسته‌بندی یافت نشد
            </h4>
            <p className="text-xs text-slate-500 max-w-sm">
              با فیلترهای انتخابی فعلی رکوردی موجود نیست. می‌توانید فیلترها را ریست کنید یا بازه زمانی دیگری را انتخاب نمایید.
            </p>
            <button
              type="button"
              onClick={() => {
                setDateFilterPreset('all_active');
                setSearchQuery('');
                setCheckTypeFilter('all');
              }}
              className="mt-2 px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold transition-colors"
            >
              نمایش همه چک‌های فعال
            </button>
          </div>
        ) : (
          filteredList.map((item) => {
            const isReceived = item._type === 'received';
            const isOverdue = item.daysRemaining < 0;
            const isToday = item.daysRemaining === 0;
            const isNearing = item.daysRemaining > 0 && item.daysRemaining <= 3;

            // Card border & badge colors based on urgency
            let borderClass = "border-slate-200/90";
            let statusBadge = "bg-slate-100 text-slate-700";
            let daysLabel = "";

            if (isOverdue) {
              borderClass = "border-rose-300 ring-1 ring-rose-200 bg-rose-50/20";
              statusBadge = "bg-rose-100 text-rose-800 font-black animate-pulse";
              daysLabel = `${toDigits(Math.abs(item.daysRemaining))} روز از سررسید گذشته (معوق)!`;
            } else if (isToday) {
              borderClass = "border-amber-300 ring-1 ring-amber-200 bg-amber-50/20";
              statusBadge = "bg-amber-100 text-amber-900 font-black";
              daysLabel = "سررسید امروز است!";
            } else if (isNearing) {
              borderClass = "border-orange-200 bg-orange-50/10";
              statusBadge = "bg-orange-100 text-orange-800 font-bold";
              daysLabel = `${toDigits(item.daysRemaining)} روز مانده تا سررسید`;
            } else {
              daysLabel = `${toDigits(item.daysRemaining)} روز تا موعد سررسید`;
            }

            return (
              <div
                key={`${item._type}-${item.id}`}
                className={`bg-white rounded-2xl border p-4.5 shadow-xs transition-all hover:shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 ${borderClass}`}
              >
                {/* Check details */}
                <div className="flex items-start gap-4">
                  {/* Indicator Icon */}
                  <div
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                      isOverdue
                        ? 'bg-rose-100 text-rose-700'
                        : isToday
                        ? 'bg-amber-100 text-amber-700'
                        : isReceived
                        ? 'bg-emerald-50 text-emerald-600'
                        : 'bg-rose-50 text-rose-600'
                    }`}
                  >
                    {isOverdue ? (
                      <AlertOctagon className="w-6 h-6" />
                    ) : isToday ? (
                      <AlertTriangle className="w-6 h-6" />
                    ) : isReceived ? (
                      <ArrowDownLeft className="w-6 h-6" />
                    ) : (
                      <ArrowUpRight className="w-6 h-6" />
                    )}
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-md ${
                        isReceived ? 'bg-teal-50 text-teal-700' : 'bg-rose-50 text-rose-700'
                      }`}>
                        {item.typeLabel}
                      </span>
                      <span className="font-extrabold text-sm text-slate-900">
                        شماره چک: {toDigits(item.checkNumber || '---')}
                      </span>
                      <span className={`text-[11px] px-2.5 py-0.5 rounded-full ${statusBadge}`}>
                        {daysLabel}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-slate-600 flex-wrap pt-1 font-medium">
                      <div>
                        <span className="text-slate-400">طرف‌حساب: </span>
                        <strong className="text-slate-800">{item.personName}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400">بانک: </span>
                        <strong className="text-slate-700">{item.bankName || '---'}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400">تاریخ سررسید: </span>
                        <strong className="font-mono text-slate-800">{toDigits(item.dueDate)}</strong>
                      </div>
                      {item.description && (
                        <div className="text-slate-500 text-[11px] line-clamp-1">
                          «{item.description}»
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Amount & Actions */}
                <div className="flex items-center justify-between md:justify-end gap-5 pt-3 md:pt-0 border-t md:border-t-0 border-slate-100">
                  <div className="text-right md:text-left">
                    <span className="text-[10px] font-bold text-slate-400 block">مبلغ برگه چک</span>
                    <span className={`text-lg font-black block ${isReceived ? 'text-emerald-700' : 'text-rose-700'}`} dir="ltr">
                      {fmtNum(item.amount)} <span className="text-xs font-semibold text-slate-500">{currencyUnit}</span>
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Quick SMS Reminder */}
                    {item.personPhone && (
                      <button
                        type="button"
                        onClick={() => handleSendSmsReminder(item)}
                        className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
                        title={`ارسال پیامک یادآوری به ${item.personPhone}`}
                      >
                        <Send className="w-4 h-4 text-sky-600" />
                      </button>
                    )}

                    {/* View Card */}
                    {setViewingCheck && (
                      <button
                        type="button"
                        onClick={() => setViewingCheck(item)}
                        className="px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>پرونده چک</span>
                      </button>
                    )}

                    {/* Quick Status Change */}
                    {onStatusChange && (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => onStatusChange(item.id, item._type, 'cashed')}
                          className="px-2.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 transition-colors shadow-3xs"
                          title="ثبت پاس شد / وصول شد"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>پاس شد</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => onStatusChange(item.id, item._type, 'bounced')}
                          className="px-2.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition-colors"
                          title="ثبت برگشت خورد"
                        >
                          برگشت
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
export default CheckDueReminderPanel;
