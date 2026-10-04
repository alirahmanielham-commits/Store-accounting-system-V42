import React, { useState, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid
} from 'recharts';
import {
  BarChart3, Calendar, Filter, ArrowDownLeft, ArrowUpRight,
  CheckCircle2, AlertOctagon, Clock, Table, ChevronDown, ChevronUp,
  Download, Eye, DollarSign, Layers
} from 'lucide-react';
import DateObject from "react-date-object";
import persian from "react-date-object/calendars/persian";
import persian_fa from "react-date-object/locales/persian_fa";

interface CheckItem {
  id: string | number;
  type?: 'issued' | 'received';
  amount: number | string;
  dueDate: string;
  status: string;
  checkNumber?: string | number;
  payeeId?: string | number;
  payerId?: string | number;
  bankName?: string;
  description?: string;
  [key: string]: any;
}

interface Props {
  issuedChecks?: CheckItem[];
  receivedChecks?: CheckItem[];
  storeSettings?: any;
  formatNumber?: (n: number | string) => string;
  toPersianDigits?: (s: string | number) => string;
  persons?: any[];
  onViewCheck?: (check: any) => void;
  className?: string;
}

const PERSIAN_MONTH_NAMES = [
  "فروردین", "اردیبهشت", "خرداد",
  "تیر", "مرداد", "شهریور",
  "مهر", "آبان", "آذر",
  "دی", "بهمن", "اسفند"
];

const SEASON_NAMES: Record<number, string> = {
  1: "بهار",
  2: "تابستان",
  3: "پاییز",
  4: "زمستان"
};

// Helper: normalize any date string to Jalali { year, month (1-12), day, rawJalaliStr }
export function parseDateToJalali(dateStr: string | null | undefined): {
  year: number;
  month: number;
  day: number;
  quarter: number;
  monthName: string;
  seasonName: string;
  formatted: string;
} | null {
  if (!dateStr) return null;
  const raw = String(dateStr).trim();
  if (!raw) return null;

  // Convert Persian/Arabic digits to English
  const eng = raw
    .replace(/[۰-۹]/g, d => '0123456789'['۰۱۲۳۴۵۶۷۸۹'.indexOf(d)])
    .replace(/[٠-٩]/g, d => '0123456789'['٠١٢٣٤٥٦٧٨٩'.indexOf(d)]);

  // If ISO string with T
  if (eng.includes('T') || (eng.includes('-') && parseInt(eng.split('-')[0], 10) > 1900)) {
    try {
      const d = new Date(eng);
      if (!isNaN(d.getTime())) {
        const obj = new DateObject({ date: d, calendar: persian });
        const y = obj.year;
        const m = obj.month.number;
        const dNum = obj.day;
        const q = Math.ceil(m / 3);
        return {
          year: y,
          month: m,
          day: dNum,
          quarter: q,
          monthName: PERSIAN_MONTH_NAMES[m - 1] || `ماه ${m}`,
          seasonName: SEASON_NAMES[q] || `فصل ${q}`,
          formatted: `${y}/${String(m).padStart(2, '0')}/${String(dNum).padStart(2, '0')}`
        };
      }
    } catch (e) {
      // fallback
    }
  }

  // Parse YYYY/MM/DD or YYYY-MM-DD
  const parts = eng.split(/[/.-]/).map(p => p.trim()).filter(Boolean);
  if (parts.length >= 3) {
    let y = parseInt(parts[0], 10);
    let m = parseInt(parts[1], 10);
    let d = parseInt(parts[2], 10);

    // If day and year were swapped
    if (y < 31 && d > 1300) {
      const temp = y;
      y = d;
      d = temp;
    }

    if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
      // If Gregorian year
      if (y > 1900) {
        try {
          const gDate = new Date(y, m - 1, d);
          const obj = new DateObject({ date: gDate, calendar: persian });
          y = obj.year;
          m = obj.month.number;
          d = obj.day;
        } catch (e) {
          // ignore
        }
      }
      
      const q = Math.ceil(Math.min(Math.max(m, 1), 12) / 3);
      return {
        year: y,
        month: m,
        day: d,
        quarter: q,
        monthName: PERSIAN_MONTH_NAMES[m - 1] || `ماه ${m}`,
        seasonName: SEASON_NAMES[q] || `فصل ${q}`,
        formatted: `${y}/${String(m).padStart(2, '0')}/${String(d).padStart(2, '0')}`
      };
    }
  }

  return null;
}

export function CheckStatusAnalyticsReport({
  issuedChecks = [],
  receivedChecks = [],
  storeSettings,
  formatNumber: customFormatNumber,
  toPersianDigits: customToPersianDigits,
  persons = [],
  onViewCheck,
  className = ""
}: Props) {
  // Helper for numbers
  const toDigits = customToPersianDigits || ((s: string | number) => {
    if (s === null || s === undefined) return '';
    const pDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
    return String(s).replace(/\d/g, x => pDigits[parseInt(x, 10)]);
  });

  const fmtNum = customFormatNumber || ((n: number | string) => {
    const val = Number(n) || 0;
    return toDigits(val.toLocaleString('fa-IR'));
  });

  const currencyUnit = storeSettings?.currency || 'تومان';

  // State
  const [timeframe, setTimeframe] = useState<'monthly' | 'quarterly' | 'yearly'>('monthly');
  const [metricType, setMetricType] = useState<'amount' | 'count'>('amount');
  const [checkTypeFilter, setCheckTypeFilter] = useState<'all' | 'received' | 'issued'>('all');
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [showTable, setShowTable] = useState<boolean>(true);
  const [selectedPeriodDetail, setSelectedPeriodDetail] = useState<any | null>(null);

  // Combine and categorize all checks
  const allCategorizedChecks = useMemo(() => {
    const list: Array<{
      check: CheckItem;
      type: 'issued' | 'received';
      category: 'cashed' | 'bounced' | 'pending';
      parsedDate: ReturnType<typeof parseDateToJalali>;
      amount: number;
    }> = [];

    // Helper to determine status category:
    // 1. cashed: 'cashed'
    // 2. bounced: 'bounced', 'bounced_assigned', 'returned'
    // 3. pending: 'received', 'deposited', 'assigned', 'issued', 'blank', or undefined
    const categorizeStatus = (status: string): 'cashed' | 'bounced' | 'pending' => {
      const s = (status || '').toLowerCase();
      if (s === 'cashed') return 'cashed';
      if (['bounced', 'bounced_assigned', 'returned'].includes(s)) return 'bounced';
      return 'pending'; // In collection / Pending / Not settled yet
    };

    (receivedChecks || []).forEach(c => {
      if (c.status === 'cancelled') return;
      const parsed = parseDateToJalali(c.dueDate);
      list.push({
        check: c,
        type: 'received',
        category: categorizeStatus(c.status),
        parsedDate: parsed,
        amount: Number(c.amount) || 0
      });
    });

    (issuedChecks || []).forEach(c => {
      if (c.status === 'cancelled') return;
      const parsed = parseDateToJalali(c.dueDate);
      list.push({
        check: c,
        type: 'issued',
        category: categorizeStatus(c.status),
        parsedDate: parsed,
        amount: Number(c.amount) || 0
      });
    });

    return list;
  }, [issuedChecks, receivedChecks]);

  // Detected years
  const availableYears = useMemo(() => {
    const yearsSet = new Set<number>();
    allCategorizedChecks.forEach(item => {
      if (item.parsedDate?.year) {
        yearsSet.add(item.parsedDate.year);
      }
    });
    return Array.from(yearsSet).sort((a, b) => b - a);
  }, [allCategorizedChecks]);

  // Filtered checks according to type & year
  const filteredChecks = useMemo(() => {
    return allCategorizedChecks.filter(item => {
      if (checkTypeFilter !== 'all' && item.type !== checkTypeFilter) {
        return false;
      }
      if (selectedYear !== 'all') {
        const yr = parseInt(selectedYear, 10);
        if (item.parsedDate?.year !== yr) return false;
      }
      return true;
    });
  }, [allCategorizedChecks, checkTypeFilter, selectedYear]);

  // Group by Timeframe: monthly, quarterly, yearly
  const chartData = useMemo(() => {
    const groupsMap = new Map<string, {
      key: string;
      label: string;
      sortOrder: number;
      year: number;
      cashedAmount: number;
      cashedCount: number;
      bouncedAmount: number;
      bouncedCount: number;
      pendingAmount: number;
      pendingCount: number;
      totalAmount: number;
      totalCount: number;
      checks: any[];
    }>();

    filteredChecks.forEach(item => {
      if (!item.parsedDate) return;
      const { year, month, quarter, monthName, seasonName } = item.parsedDate;

      let key = "";
      let label = "";
      let sortOrder = 0;

      if (timeframe === 'monthly') {
        // e.g. "1403/05"
        key = `${year}/${String(month).padStart(2, '0')}`;
        label = `${monthName} ${year}`;
        sortOrder = year * 100 + month;
      } else if (timeframe === 'quarterly') {
        // e.g. "1403-Q2"
        key = `${year}-Q${quarter}`;
        label = `${seasonName} ${year}`;
        sortOrder = year * 10 + quarter;
      } else {
        // yearly
        key = `${year}`;
        label = `سال ${year}`;
        sortOrder = year;
      }

      if (!groupsMap.has(key)) {
        groupsMap.set(key, {
          key,
          label,
          sortOrder,
          year,
          cashedAmount: 0,
          cashedCount: 0,
          bouncedAmount: 0,
          bouncedCount: 0,
          pendingAmount: 0,
          pendingCount: 0,
          totalAmount: 0,
          totalCount: 0,
          checks: []
        });
      }

      const g = groupsMap.get(key)!;
      g.checks.push(item);
      g.totalAmount += item.amount;
      g.totalCount += 1;

      if (item.category === 'cashed') {
        g.cashedAmount += item.amount;
        g.cashedCount += 1;
      } else if (item.category === 'bounced') {
        g.bouncedAmount += item.amount;
        g.bouncedCount += 1;
      } else {
        g.pendingAmount += item.amount;
        g.pendingCount += 1;
      }
    });

    const list = Array.from(groupsMap.values()).sort((a, b) => a.sortOrder - b.sortOrder);

    // Map into Recharts friendly format
    return list.map(item => ({
      ...item,
      // Bar values based on selected metric
      cashedVal: metricType === 'amount' ? item.cashedAmount : item.cashedCount,
      bouncedVal: metricType === 'amount' ? item.bouncedAmount : item.bouncedCount,
      pendingVal: metricType === 'amount' ? item.pendingAmount : item.pendingCount,
      // Success and bounce percentages
      collectionRate: item.totalAmount > 0 ? ((item.cashedAmount / item.totalAmount) * 100).toFixed(1) : '0',
      bounceRate: item.totalAmount > 0 ? ((item.bouncedAmount / item.totalAmount) * 100).toFixed(1) : '0'
    }));
  }, [filteredChecks, timeframe, metricType]);

  // Overall KPIs
  const overallKPIs = useMemo(() => {
    let cashedAmt = 0;
    let cashedCnt = 0;
    let bouncedAmt = 0;
    let bouncedCnt = 0;
    let pendingAmt = 0;
    let pendingCnt = 0;
    let totalAmt = 0;
    let totalCnt = 0;

    filteredChecks.forEach(c => {
      totalAmt += c.amount;
      totalCnt += 1;
      if (c.category === 'cashed') {
        cashedAmt += c.amount;
        cashedCnt += 1;
      } else if (c.category === 'bounced') {
        bouncedAmt += c.amount;
        bouncedCnt += 1;
      } else {
        pendingAmt += c.amount;
        pendingCnt += 1;
      }
    });

    const collectionPct = totalAmt > 0 ? ((cashedAmt / totalAmt) * 100).toFixed(1) : '0';
    const bouncePct = totalAmt > 0 ? ((bouncedAmt / totalAmt) * 100).toFixed(1) : '0';
    const pendingPct = totalAmt > 0 ? ((pendingAmt / totalAmt) * 100).toFixed(1) : '0';

    return {
      cashedAmt, cashedCnt, collectionPct,
      bouncedAmt, bouncedCnt, bouncePct,
      pendingAmt, pendingCnt, pendingPct,
      totalAmt, totalCnt
    };
  }, [filteredChecks]);

  // Custom Recharts Tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;
    const itemData = payload[0]?.payload;
    if (!itemData) return null;

    return (
      <div className="bg-slate-900/95 text-white p-4 rounded-xl shadow-xl border border-slate-700 text-right min-w-[240px] text-xs font-sans backdrop-blur-md" dir="rtl">
        <div className="font-black text-sm text-slate-100 border-b border-slate-700/80 pb-2 mb-2 flex items-center justify-between">
          <span>{itemData.label}</span>
          <span className="text-[11px] text-slate-400 font-normal">
            مجموع: {fmtNum(itemData.totalAmount)} {currencyUnit} ({toDigits(itemData.totalCount)} فقره)
          </span>
        </div>

        <div className="space-y-2 mt-2">
          {/* Cashed */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
              <span className="text-emerald-300 font-medium">پاس شده / وصول شده:</span>
            </div>
            <div className="text-left font-bold text-emerald-400">
              {metricType === 'amount'
                ? `${fmtNum(itemData.cashedAmount)} ${currencyUnit}`
                : `${toDigits(itemData.cashedCount)} فقره`}
              <span className="text-[10px] text-slate-400 mr-1.5 font-normal">
                ({toDigits(itemData.collectionRate)}٪)
              </span>
            </div>
          </div>

          {/* Bounced */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
              <span className="text-rose-300 font-medium">برگشتی:</span>
            </div>
            <div className="text-left font-bold text-rose-400">
              {metricType === 'amount'
                ? `${fmtNum(itemData.bouncedAmount)} ${currencyUnit}`
                : `${toDigits(itemData.bouncedCount)} فقره`}
              <span className="text-[10px] text-slate-400 mr-1.5 font-normal">
                ({toDigits(itemData.bounceRate)}٪)
              </span>
            </div>
          </div>

          {/* Pending */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-sky-400"></span>
              <span className="text-sky-300 font-medium">در جریان وصول:</span>
            </div>
            <div className="text-left font-bold text-sky-400">
              {metricType === 'amount'
                ? `${fmtNum(itemData.pendingAmount)} ${currencyUnit}`
                : `${toDigits(itemData.pendingCount)} فقره`}
            </div>
          </div>
        </div>

        <div className="mt-3 pt-2 border-t border-slate-700/60 text-[10px] text-slate-400 text-center">
          برای مشاهده ریز چک‌های این دوره روی ستون یا جدول کلیک کنید
        </div>
      </div>
    );
  };

  return (
    <div className={`bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 md:p-6 text-right ${className}`} dir="rtl">
      {/* Header & Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-5 mb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 tracking-tight">
                گزارش تحلیلی وضعیت چک‌ها (پاس شده، برگشتی، در جریان)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5 font-medium">
                تحلیل آماری و مقایسه‌ای وضعیت اسناد تجاری بر اساس بازه‌های زمانی ماهانه، فصلی و سالانه
              </p>
            </div>
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Timeframe Segmented Control (ماهانه / فصلی / سالانه) */}
          <div className="flex items-center bg-slate-100/90 p-1 rounded-xl border border-slate-200/70">
            <button
              type="button"
              onClick={() => setTimeframe('monthly')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                timeframe === 'monthly'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              ماهانه
            </button>
            <button
              type="button"
              onClick={() => setTimeframe('quarterly')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                timeframe === 'quarterly'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              فصلی (۳ ماهه)
            </button>
            <button
              type="button"
              onClick={() => setTimeframe('yearly')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                timeframe === 'yearly'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              سالانه
            </button>
          </div>

          {/* Metric Selector: Amount vs Count */}
          <div className="flex items-center bg-slate-100/90 p-1 rounded-xl border border-slate-200/70">
            <button
              type="button"
              onClick={() => setMetricType('amount')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                metricType === 'amount'
                  ? 'bg-white text-emerald-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="نمایش مقادیر بر اساس مبلغ به تومان/ریال"
            >
              مبلغی ({currencyUnit})
            </button>
            <button
              type="button"
              onClick={() => setMetricType('count')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                metricType === 'count'
                  ? 'bg-white text-emerald-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="نمایش مقادیر بر اساس تعداد فقره چک"
            >
              تعدادی (فقره)
            </button>
          </div>

          {/* Type Filter: All vs Received vs Issued */}
          <select
            value={checkTypeFilter}
            onChange={(e) => setCheckTypeFilter(e.target.value as any)}
            className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          >
            <option value="all">همه چک‌ها (دریافتی و پرداختی)</option>
            <option value="received">فقط چک‌های دریافتی</option>
            <option value="issued">فقط چک‌های پرداختی</option>
          </select>

          {/* Year Filter */}
          {availableYears.length > 1 && (
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="all">همه سال‌ها</option>
              {availableYears.map(yr => (
                <option key={yr} value={yr}>سال {toDigits(yr)}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 mb-6">
        {/* Total Checks */}
        <div className="bg-slate-50/70 border border-slate-200/70 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-500 block mb-1">
              کل گردش اسناد تجاری دوره
            </span>
            <span className="text-lg font-black text-slate-900 block" dir="ltr">
              {fmtNum(overallKPIs.totalAmt)} <span className="text-xs font-semibold text-slate-500">{currencyUnit}</span>
            </span>
            <span className="text-[11px] text-slate-500 mt-1 block">
              {toDigits(overallKPIs.totalCnt)} فقره چک ثبت شده
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-200/60 text-slate-700 flex items-center justify-center font-bold">
            <Layers className="w-5 h-5" />
          </div>
        </div>

        {/* Cashed (پاس شده) */}
        <div className="bg-emerald-50/60 border border-emerald-200/70 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-emerald-800 block mb-1">
              پاس شده / وصول شده
            </span>
            <span className="text-lg font-black text-emerald-700 block" dir="ltr">
              {fmtNum(overallKPIs.cashedAmt)} <span className="text-xs font-semibold text-emerald-600">{currencyUnit}</span>
            </span>
            <span className="text-[11px] text-emerald-700 font-bold mt-1 block">
              {toDigits(overallKPIs.cashedCnt)} فقره ({toDigits(overallKPIs.collectionPct)}٪ از کل)
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        {/* Bounced (برگشتی) */}
        <div className="bg-rose-50/60 border border-rose-200/70 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-rose-800 block mb-1">
              برگشت خورده (نکول)
            </span>
            <span className="text-lg font-black text-rose-700 block" dir="ltr">
              {fmtNum(overallKPIs.bouncedAmt)} <span className="text-xs font-semibold text-rose-600">{currencyUnit}</span>
            </span>
            <span className="text-[11px] text-rose-700 font-bold mt-1 block">
              {toDigits(overallKPIs.bouncedCnt)} فقره (نرخ برگشت: {toDigits(overallKPIs.bouncePct)}٪)
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center font-bold">
            <AlertOctagon className="w-5 h-5" />
          </div>
        </div>

        {/* Pending (در جریان وصول) */}
        <div className="bg-sky-50/60 border border-sky-200/70 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-sky-800 block mb-1">
              در جریان وصول / تسویه نشده
            </span>
            <span className="text-lg font-black text-sky-700 block" dir="ltr">
              {fmtNum(overallKPIs.pendingAmt)} <span className="text-xs font-semibold text-sky-600">{currencyUnit}</span>
            </span>
            <span className="text-[11px] text-sky-700 font-bold mt-1 block">
              {toDigits(overallKPIs.pendingCnt)} فقره ({toDigits(overallKPIs.pendingPct)}٪ از کل)
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center font-bold">
            <Clock className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Main Bar Chart Container */}
      <div className="bg-slate-50/50 rounded-2xl border border-slate-100 p-4 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-600"></span>
            <h3 className="text-sm font-extrabold text-slate-800">
              نمودار ستونی وضعیت چک‌ها ({timeframe === 'monthly' ? 'ماهانه' : timeframe === 'quarterly' ? 'فصلی' : 'سالانه'})
            </h3>
            <span className="text-xs text-slate-400 font-medium">
              - بر اساس {metricType === 'amount' ? 'ارزش ریالی' : 'تعداد فقره'}
            </span>
          </div>

          <div className="flex items-center gap-4 text-xs font-bold">
            <div className="flex items-center gap-1.5 text-emerald-700">
              <span className="w-3 h-3 rounded-md bg-emerald-500"></span>
              <span>پاس شده / وصول</span>
            </div>
            <div className="flex items-center gap-1.5 text-rose-700">
              <span className="w-3 h-3 rounded-md bg-rose-500"></span>
              <span>برگشتی</span>
            </div>
            <div className="flex items-center gap-1.5 text-sky-700">
              <span className="w-3 h-3 rounded-md bg-sky-400"></span>
              <span>در جریان وصول</span>
            </div>
          </div>
        </div>

        {chartData.length === 0 ? (
          <div className="h-72 flex flex-col items-center justify-center text-slate-400 text-xs font-bold gap-2">
            <BarChart3 className="w-8 h-8 opacity-30" />
            <span>هیچ رکوردی برای نمایش با فیلترهای انتخابی یافت نشد.</span>
          </div>
        ) : (
          <div className="h-80 w-full" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 15, right: 15, left: -10, bottom: 25 }}
                onClick={(e: any) => {
                  if (e && e.activePayload && e.activePayload.length) {
                    setSelectedPeriodDetail(e.activePayload[0].payload);
                  }
                }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: '#475569', fontWeight: 600 }}
                  tickLine={false}
                  axisLine={{ stroke: '#cbd5e1' }}
                  interval={0}
                  angle={chartData.length > 8 ? -25 : 0}
                  textAnchor={chartData.length > 8 ? 'end' : 'middle'}
                  height={chartData.length > 8 ? 55 : 30}
                />
                <YAxis
                  tickFormatter={(val) => {
                    if (val >= 1000000000) return `${(val / 1000000000).toFixed(1)}B`;
                    if (val >= 1000000) return `${(val / 1000000).toFixed(0)}M`;
                    if (val >= 1000) return `${(val / 1000).toFixed(0)}K`;
                    return String(val);
                  }}
                  tick={{ fontSize: 10, fill: '#64748b' }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar
                  dataKey="cashedVal"
                  name="پاس شده / وصول شده"
                  fill="#10b981"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={40}
                  className="cursor-pointer hover:opacity-85 transition-opacity"
                />
                <Bar
                  dataKey="bouncedVal"
                  name="برگشتی"
                  fill="#f43f5e"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={40}
                  className="cursor-pointer hover:opacity-85 transition-opacity"
                />
                <Bar
                  dataKey="pendingVal"
                  name="در جریان وصول"
                  fill="#38bdf8"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={40}
                  className="cursor-pointer hover:opacity-85 transition-opacity"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Breakdown Data Table Toggle & View */}
      <div className="border border-slate-200/80 rounded-2xl overflow-hidden">
        <button
          type="button"
          onClick={() => setShowTable(!showTable)}
          className="w-full bg-slate-50 hover:bg-slate-100/80 px-4 py-3 flex items-center justify-between text-xs font-black text-slate-700 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Table className="w-4 h-4 text-indigo-600" />
            <span>جدول ریز آمار و نرخ‌های تحلیلی دوره‌ها ({toDigits(chartData.length)} دوره)</span>
          </div>
          <div className="flex items-center gap-1 text-slate-500">
            <span>{showTable ? 'بستن جدول' : 'مشاهده جدول'}</span>
            {showTable ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </button>

        {showTable && (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs text-slate-700">
              <thead className="bg-slate-100/70 border-b border-slate-200 text-slate-800 font-extrabold">
                <tr>
                  <th className="p-3">دوره زمانی</th>
                  <th className="p-3 text-emerald-700">پاس شده (مبلغ / تعداد)</th>
                  <th className="p-3 text-rose-700">برگشتی (مبلغ / تعداد)</th>
                  <th className="p-3 text-sky-700">در جریان وصول (مبلغ / تعداد)</th>
                  <th className="p-3">مجموع دوره</th>
                  <th className="p-3 text-center">نرخ وصول</th>
                  <th className="p-3 text-center">نرخ برگشت</th>
                  <th className="p-3 text-center">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {chartData.map((row) => (
                  <tr key={row.key} className="hover:bg-indigo-50/30 transition-colors">
                    <td className="p-3 font-bold text-slate-900">{row.label}</td>

                    {/* Cashed */}
                    <td className="p-3 text-emerald-700 font-bold">
                      <div>{fmtNum(row.cashedAmount)} {currencyUnit}</div>
                      <div className="text-[10px] text-emerald-600 font-normal">{toDigits(row.cashedCount)} فقره</div>
                    </td>

                    {/* Bounced */}
                    <td className="p-3 text-rose-700 font-bold">
                      <div>{fmtNum(row.bouncedAmount)} {currencyUnit}</div>
                      <div className="text-[10px] text-rose-600 font-normal">{toDigits(row.bouncedCount)} فقره</div>
                    </td>

                    {/* Pending */}
                    <td className="p-3 text-sky-700 font-bold">
                      <div>{fmtNum(row.pendingAmount)} {currencyUnit}</div>
                      <div className="text-[10px] text-sky-600 font-normal">{toDigits(row.pendingCount)} فقره</div>
                    </td>

                    {/* Total */}
                    <td className="p-3 font-bold text-slate-800">
                      <div>{fmtNum(row.totalAmount)} {currencyUnit}</div>
                      <div className="text-[10px] text-slate-500 font-normal">{toDigits(row.totalCount)} فقره</div>
                    </td>

                    {/* Collection Rate */}
                    <td className="p-3 text-center">
                      <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-black bg-emerald-100 text-emerald-800">
                        {toDigits(row.collectionRate)}٪
                      </span>
                    </td>

                    {/* Bounce Rate */}
                    <td className="p-3 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-black ${
                        Number(row.bounceRate) > 10 ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {toDigits(row.bounceRate)}٪
                      </span>
                    </td>

                    {/* Action */}
                    <td className="p-3 text-center">
                      <button
                        type="button"
                        onClick={() => setSelectedPeriodDetail(row)}
                        className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-[11px] inline-flex items-center gap-1 transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>مشاهده چک‌ها</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Drill-down Modal for a specific period */}
      {selectedPeriodDetail && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs" dir="rtl">
          <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col shadow-2xl border border-slate-200">
            {/* Modal Header */}
            <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-black text-slate-800 text-base flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-indigo-600" />
                  ریز چک‌های دوره: {selectedPeriodDetail.label}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  تعداد کل: {toDigits(selectedPeriodDetail.checks.length)} فقره | مجموع: {fmtNum(selectedPeriodDetail.totalAmount)} {currencyUnit}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPeriodDetail(null)}
                className="p-1.5 rounded-xl hover:bg-slate-200 text-slate-500 transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
              <table className="w-full text-right text-xs text-slate-700">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-800 font-extrabold sticky top-0">
                  <tr>
                    <th className="p-2.5">نوع</th>
                    <th className="p-2.5">شماره چک</th>
                    <th className="p-2.5">طرف‌حساب</th>
                    <th className="p-2.5">سررسید</th>
                    <th className="p-2.5">مبلغ ({currencyUnit})</th>
                    <th className="p-2.5">وضعیت</th>
                    <th className="p-2.5">بانک</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {selectedPeriodDetail.checks.map((item: any, idx: number) => {
                    const c = item.check;
                    const person = persons.find(p => String(p.id) === String(c.payeeId || c.payerId));
                    const personName = person?.name || person?.companyName || (item.type === 'issued' ? 'تامین‌کننده' : 'مشتری');

                    const statusBadge = item.category === 'cashed'
                      ? 'bg-emerald-100 text-emerald-800'
                      : item.category === 'bounced'
                      ? 'bg-rose-100 text-rose-800'
                      : 'bg-sky-100 text-sky-800';

                    const statusText = item.category === 'cashed'
                      ? 'پاس شده'
                      : item.category === 'bounced'
                      ? 'برگشتی'
                      : 'در جریان وصول';

                    return (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="p-2.5">
                          <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                            item.type === 'received' ? 'bg-teal-50 text-teal-700' : 'bg-rose-50 text-rose-700'
                          }`}>
                            {item.type === 'received' ? 'دریافتی' : 'پرداختی'}
                          </span>
                        </td>
                        <td className="p-2.5 font-bold text-slate-900">{toDigits(c.checkNumber || '---')}</td>
                        <td className="p-2.5">{personName}</td>
                        <td className="p-2.5 font-mono text-slate-600">{toDigits(c.dueDate || '---')}</td>
                        <td className="p-2.5 font-bold text-slate-900">{fmtNum(c.amount)}</td>
                        <td className="p-2.5">
                          <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${statusBadge}`}>
                            {statusText}
                          </span>
                        </td>
                        <td className="p-2.5 text-slate-500">{c.bankName || '---'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Modal Footer */}
            <div className="p-3 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedPeriodDetail(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-bold transition-colors"
              >
                بستن
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
export default CheckStatusAnalyticsReport;
