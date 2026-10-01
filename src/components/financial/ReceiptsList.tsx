import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import * as XLSX from 'xlsx';
import DateObjectModule from "react-date-object";
const DateObject = (DateObjectModule as any).default || DateObjectModule;
import persian from "react-date-object/calendars/persian";
import persian_fa from "react-date-object/locales/persian_fa";
import {
  Search, Plus, FileText, Download, CheckCircle, Edit2, Trash2, Printer, Check, X,
  ArrowUpRight, ArrowDownRight, ArrowRight, CornerDownLeft, Package, User, Clock,
  CheckCircle2, ChevronLeft, ChevronRight, Share2, Eye, Truck, MoreVertical,
  DollarSign, RefreshCw, XCircle, Warehouse, TrendingUp, TrendingDown,
  RotateCcw, AlertCircle, Calendar as CalendarIcon, Tag, Wallet, Ban, Percent,
  ArrowUpDown, Filter, ChevronDown, Landmark, CreditCard, Receipt, ArrowDownLeft,
  FileCheck, Coins
} from 'lucide-react';
import CustomDatePicker from '../ui/CustomDatePicker';
import { convertToGregorian, formatDateDisplay, toPersianDigits, addCommas, formatNumber as formatNumberUtil } from "../../utils/format";
import { safePrint } from "../../utils/printHelper";

type DatePreset = 'today' | 'yesterday' | 'this_week' | 'last_7_days' | 'this_month' | 'last_30_days' | 'this_year' | 'all' | 'custom';

export default function ReceiptsList(props: any) {
  const {
    transactions = [],
    activeTab = 'list_receive_receipt',
    persons = [],
    getPersonDisplayName,
    formatCurrency = (v: any) => formatNumberUtil(v, storeSettings),
    formatDateDisplay: propFormatDateDisplay,
    renderPersonLink = (id: any, name: any) => <span>{name || 'نامشخص'}</span>,
    storeSettings = {},
    setActiveTab,
    invoiceSearchQuery = '',
    setInvoiceSearchQuery,
    toPersianDigits: propToPersianDigits = toPersianDigits,
    accounts = [],
    cashboxes = [],
    formatNumber = (v: any) => formatNumberUtil(v, storeSettings),
    numToPersianWords = (v: any) => '',
    openPayslip,
    setPrintingTransaction,
    setEditingReceipt,
    setIsEditReceiptModalOpen,
    confirmAction,
    deleteTransaction,
    fetchTransactions,
    setPreviewReceiptData,
    ...rest
  } = props;

  const isReceive = activeTab === "list_receive_receipt";
  const targetType = isReceive ? "receive" : "pay";
  const currency = storeSettings?.currency || 'تومان';

  // Sub-filter tab (All, Bank, Cashbox, Check, Salary)
  const [resourceTabFilter, setResourceTabFilter] = useState<string>('all');
  const [selectedPersonFilter, setSelectedPersonFilter] = useState<string>('all');
  const [selectedResourceFilter, setSelectedResourceFilter] = useState<string>('all');

  // Date range state
  const [datePreset, setDatePreset] = useState<DatePreset>('all');
  const [startDate, setStartDate] = useState<any>(null);
  const [endDate, setEndDate] = useState<any>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(20);

  // Reset filters on tab change
  React.useEffect(() => {
    setResourceTabFilter('all');
    setSelectedPersonFilter('all');
    setSelectedResourceFilter('all');
    setCurrentPage(1);
  }, [activeTab]);

  // Apply date preset
  const applyDatePreset = (preset: DatePreset) => {
    setDatePreset(preset);
    setCurrentPage(1);
    const now = new Date();
    const dJalali = new DateObject({ date: now, calendar: persian, locale: persian_fa });
    const jYear = dJalali.year;
    const jMonth = dJalali.month.number;
    const jDay = dJalali.day;

    if (preset === 'today') {
      const start = new DateObject({ calendar: persian, locale: persian_fa, year: jYear, month: jMonth, day: jDay }).toDate();
      const end = new DateObject({ calendar: persian, locale: persian_fa, year: jYear, month: jMonth, day: jDay }).toDate();
      end.setHours(23, 59, 59, 999);
      setStartDate(start);
      setEndDate(end);
    } else if (preset === 'yesterday') {
      const d = new DateObject({ calendar: persian, locale: persian_fa, year: jYear, month: jMonth, day: jDay - 1 });
      const start = d.toDate();
      const end = new Date(start);
      end.setHours(23, 59, 59, 999);
      setStartDate(start);
      setEndDate(end);
    } else if (preset === 'this_week') {
      const dayOfWeek = dJalali.weekDay.index;
      const start = new DateObject({ calendar: persian, locale: persian_fa, year: jYear, month: jMonth, day: jDay - dayOfWeek }).toDate();
      start.setHours(0, 0, 0, 0);
      const end = new Date();
      end.setHours(23, 59, 59, 999);
      setStartDate(start);
      setEndDate(end);
    } else if (preset === 'last_7_days') {
      const start = new Date(now.getTime() - 7 * 24 * 3600 * 1000);
      start.setHours(0, 0, 0, 0);
      const end = new Date();
      end.setHours(23, 59, 59, 999);
      setStartDate(start);
      setEndDate(end);
    } else if (preset === 'this_month') {
      const start = new DateObject({ calendar: persian, locale: persian_fa, year: jYear, month: jMonth, day: 1 }).toDate();
      start.setHours(0, 0, 0, 0);
      const end = new Date();
      end.setHours(23, 59, 59, 999);
      setStartDate(start);
      setEndDate(end);
    } else if (preset === 'last_30_days') {
      const start = new Date(now.getTime() - 30 * 24 * 3600 * 1000);
      start.setHours(0, 0, 0, 0);
      const end = new Date();
      end.setHours(23, 59, 59, 999);
      setStartDate(start);
      setEndDate(end);
    } else if (preset === 'this_year') {
      const start = new DateObject({ calendar: persian, locale: persian_fa, year: jYear, month: 1, day: 1 }).toDate();
      start.setHours(0, 0, 0, 0);
      const end = new Date();
      end.setHours(23, 59, 59, 999);
      setStartDate(start);
      setEndDate(end);
    } else if (preset === 'all') {
      setStartDate(null);
      setEndDate(null);
    }
  };

  // Helper to extract timestamp from transaction
  const getTxTimestamp = (tx: any): number => {
    const raw = tx.date || tx.jalaliDate || tx.createdAt;
    if (!raw) return 0;
    try {
      const str = String(raw).trim();
      const iso = convertToGregorian(str);
      const t = new Date(iso).getTime();
      return isNaN(t) ? 0 : t;
    } catch {
      return 0;
    }
  };

  // Helper to get resource label
  const getResourceLabel = (tx: any): string => {
    if (tx.method === "check") {
      return `چک (${toPersianDigits(tx.checkNumber || "")})`;
    }
    if (tx.resourceType === "bank") {
      const acc = accounts.find((a: any) => String(a.id) === String(tx.resourceId));
      return acc ? `بانک: ${acc.bankName || acc.name || 'حساب بانکی'}` : "حساب بانکی";
    }
    if (tx.resourceType === "cashbox" || tx.resourceType === "cash") {
      const cb = cashboxes.find((c: any) => String(c.id) === String(tx.resourceId));
      return cb ? `صندوق: ${cb.name || 'صندوق نقدی'}` : "صندوق نقدی";
    }
    return tx.resourceName || "نامشخص";
  };

  // Base transactions for this tab
  const baseTxs = useMemo(() => {
    return (transactions || []).filter((tx: any) => {
      if (tx.isDeleted) return false;
      return tx.type === targetType;
    });
  }, [transactions, targetType]);

  // Filtered transactions
  const filteredTxs = useMemo(() => {
    return baseTxs.filter((tx: any) => {
      // 1. Sub-filter tab (Resource Tab)
      if (resourceTabFilter === 'bank') {
        if (tx.resourceType !== 'bank' && tx.method !== 'bank') return false;
      } else if (resourceTabFilter === 'cashbox') {
        if (tx.resourceType !== 'cashbox' && tx.resourceType !== 'cash' && tx.method !== 'cash') return false;
      } else if (resourceTabFilter === 'check') {
        if (tx.method !== 'check') return false;
      } else if (resourceTabFilter === 'salary') {
        if (tx.category !== 'salary' && tx.type !== 'salary') return false;
      }

      // 2. Person filter
      if (selectedPersonFilter !== 'all') {
        if (String(tx.personId) !== String(selectedPersonFilter)) return false;
      }

      // 3. Resource filter dropdown
      if (selectedResourceFilter !== 'all') {
        if (selectedResourceFilter === 'bank' && tx.resourceType !== 'bank') return false;
        if (selectedResourceFilter === 'cash' && tx.resourceType !== 'cashbox' && tx.resourceType !== 'cash') return false;
        if (selectedResourceFilter === 'check' && tx.method !== 'check') return false;
      }

      // 4. Date filter
      if (startDate || endDate) {
        const t = getTxTimestamp(tx);
        if (t > 0) {
          if (startDate && t < new Date(startDate).getTime()) return false;
          if (endDate && t > new Date(endDate).getTime()) return false;
        }
      }

      // 5. Search query
      if (invoiceSearchQuery) {
        const term = invoiceSearchQuery.toLowerCase().trim();
        const person = persons.find((p: any) => String(p.id) === String(tx.personId));
        const personName = (person?.alias || person?.name || `${person?.firstName || ''} ${person?.lastName || ''}`).toLowerCase();
        const receiptNum = String(tx.receiptNumber || tx.id || '').toLowerCase();
        const checkNum = String(tx.checkNumber || '').toLowerCase();
        const note = String(tx.note || tx.description || '').toLowerCase();
        const resLabel = getResourceLabel(tx).toLowerCase();

        const matches =
          personName.includes(term) ||
          receiptNum.includes(term) ||
          checkNum.includes(term) ||
          note.includes(term) ||
          resLabel.includes(term);

        if (!matches) return false;
      }

      return true;
    });
  }, [baseTxs, resourceTabFilter, selectedPersonFilter, selectedResourceFilter, startDate, endDate, invoiceSearchQuery, persons, accounts, cashboxes]);

  // KPI Metrics Calculation
  const summaryMetrics = useMemo(() => {
    let totalAmount = 0;
    let bankAmount = 0;
    let bankCount = 0;
    let cashAmount = 0;
    let cashCount = 0;
    let checkAmount = 0;
    let checkCount = 0;

    filteredTxs.forEach((tx: any) => {
      const amt = Number(tx.amount || 0);
      totalAmount += amt;

      if (tx.method === 'check') {
        checkAmount += amt;
        checkCount++;
      } else if (tx.resourceType === 'bank' || tx.method === 'bank') {
        bankAmount += amt;
        bankCount++;
      } else if (tx.resourceType === 'cashbox' || tx.resourceType === 'cash' || tx.method === 'cash') {
        cashAmount += amt;
        cashCount++;
      }
    });

    const count = filteredTxs.length;
    const avgAmount = count > 0 ? totalAmount / count : 0;

    return {
      totalAmount,
      bankAmount,
      bankCount,
      cashAmount,
      cashCount,
      checkAmount,
      checkCount,
      count,
      avgAmount,
    };
  }, [filteredTxs]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredTxs.length / pageSize));
  const safeCurrentPage = Math.max(1, Math.min(currentPage, totalPages));
  const paginatedTxs = useMemo(() => {
    return filteredTxs.slice((safeCurrentPage - 1) * pageSize, safeCurrentPage * pageSize);
  }, [filteredTxs, safeCurrentPage, pageSize]);

  // Export to Excel (.xlsx)
  const exportToExcel = () => {
    try {
      const wb = XLSX.utils.book_new();
      const exportData = filteredTxs.map((tx: any, idx: number) => {
        const person = persons.find((p: any) => String(p.id) === String(tx.personId));
        const personName = person ? (person.alias || person.name || `${person.firstName || ''} ${person.lastName || ''}`) : (tx.personName || 'نامشخص');

        return {
          'ردیف': idx + 1,
          'شماره رسید': tx.receiptNumber || tx.id || '-',
          'نوع سند': isReceive ? 'رسید دریافت' : 'رسید پرداخت',
          'طرف حساب': personName,
          'تاریخ': formatDateDisplay(tx.date || tx.jalaliDate || tx.createdAt),
          'منبع مالی': getResourceLabel(tx),
          'مبلغ (تومان)': Math.round(Number(tx.amount || 0)),
          'مبلغ به حروف': numToPersianWords(tx.amount || 0),
          'شرح / توضیحات': tx.note || tx.description || '-'
        };
      });

      const sheetTitle = isReceive ? 'رسیدهای دریافت' : 'رسیدهای پرداخت';
      const ws = XLSX.utils.json_to_sheet(exportData);
      XLSX.utils.book_append_sheet(wb, ws, sheetTitle);
      XLSX.writeFile(wb, `${sheetTitle}_${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (e) {
      console.error('Excel export error:', e);
    }
  };

  // Print List
  const handlePrintList = () => {
    safePrint('#receipts-table-container', {
      timeoutMs: 3000,
      documentTitle: `${isReceive ? 'لیست رسیدهای دریافت' : 'لیست رسیدهای پرداخت'} - ${storeSettings?.companyName || ''}`
    });
  };

  return (
    <div className="space-y-6 pb-20 font-sans" dir="rtl">
      {/* Top Banner & Title Bar */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200/80 print:hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-2xl bg-gradient-to-tr ${
              isReceive ? 'from-emerald-600 to-teal-500' : 'from-rose-600 to-pink-600'
            } flex items-center justify-center shadow-lg ${
              isReceive ? 'shadow-emerald-500/20' : 'shadow-rose-500/20'
            } shrink-0`}>
              {isReceive ? (
                <ArrowDownLeft className="w-6 h-6 text-white" />
              ) : (
                <ArrowUpRight className="w-6 h-6 text-white" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl md:text-2xl font-black text-slate-800">
                  {isReceive ? "لیست رسیدهای دریافت وجه" : "لیست رسیدهای پرداخت وجه"}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-slate-100 text-slate-700 border border-slate-200">
                  {toPersianDigits(filteredTxs.length)} رسید
                </span>
              </div>
              <p className="text-xs text-slate-500 font-bold mt-1">
                {isReceive
                  ? "مدیریت و بایگانی دریافتی‌های نقدی، بانکی، پوز، چک‌های صیادی و تسویه فاکتورها"
                  : "مدیریت و ثبت پرداخت‌های نقدی، انتقال وجه بانکی، هزینه‌ها و چک‌های صادره"}
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setActiveTab?.(isReceive ? "create_receive_receipt" : "create_pay_receipt")}
              className={`px-4 py-2.5 ${
                isReceive ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20' : 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20'
              } text-white rounded-xl font-bold text-xs transition-all shadow-md flex items-center gap-2 cursor-pointer active:scale-95`}
            >
              <Plus className="w-4 h-4" />
              <span>{isReceive ? "ثبت دریافت جدید" : "ثبت پرداخت جدید"}</span>
            </button>

            {fetchTransactions && (
              <button
                onClick={fetchTransactions}
                className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                title="بروزرسانی تراکنش‌ها"
              >
                <RefreshCw className="w-4 h-4 text-slate-600" />
                <span className="hidden sm:inline">بروزرسانی</span>
              </button>
            )}

            <button
              onClick={handlePrintList}
              className="px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
              title="چاپ لیست جاری"
            >
              <Printer className="w-4 h-4 text-slate-600" />
              <span>چاپ</span>
            </button>

            <button
              onClick={exportToExcel}
              className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
              title="خروجی اکسل"
            >
              <Download className="w-4 h-4 text-emerald-600" />
              <span>اکسل</span>
            </button>
          </div>
        </div>

        {/* Sub-Filters / Segmented Status Tabs */}
        <div className="flex items-center gap-1.5 mt-5 p-1 bg-slate-100/80 rounded-2xl overflow-x-auto">
          {[
            { id: 'all', label: 'همه روش‌ها', count: baseTxs.length },
            { id: 'bank', label: 'واریز به حساب / پوز بانکی', count: baseTxs.filter((t: any) => t.resourceType === 'bank' || t.method === 'bank').length },
            { id: 'cashbox', label: 'صندوق نقدی', count: baseTxs.filter((t: any) => t.resourceType === 'cashbox' || t.resourceType === 'cash' || t.method === 'cash').length },
            { id: 'check', label: 'اسناد دریافتنی / چک', count: baseTxs.filter((t: any) => t.method === 'check').length },
            ...(!isReceive ? [{ id: 'salary', label: 'پرداخت حقوق و دستمزد', count: baseTxs.filter((t: any) => t.category === 'salary' || t.type === 'salary').length }] : []),
          ].map(tab => {
            const isActive = resourceTabFilter === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setResourceTabFilter(tab.id);
                  setCurrentPage(1);
                }}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  isActive
                    ? `${isReceive ? 'bg-white text-emerald-700' : 'bg-white text-rose-700'} shadow-xs`
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                }`}
              >
                <span>{tab.label}</span>
                <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold ${
                  isActive ? (isReceive ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700') : 'bg-slate-200/70 text-slate-600'
                }`}>
                  {toPersianDigits(tab.count)}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* KPI Summary Cards Grid (4 Cards like SalesReport) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 print:hidden">
        {/* Card 1: Total Amount */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-black">{isReceive ? "مجموع کل دریافت‌ها" : "مجموع کل پرداخت‌ها"}</span>
            <div className={`w-8 h-8 rounded-xl ${isReceive ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'} flex items-center justify-center`}>
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className={`text-lg sm:text-2xl font-black ${isReceive ? 'text-emerald-700' : 'text-rose-700'} font-mono tracking-tight`}>
            {toPersianDigits(formatCurrency(summaryMetrics.totalAmount))}
            <span className="text-[10px] sm:text-xs font-bold text-slate-500 mr-1.5">{currency}</span>
          </div>
          <div className="text-[11px] text-slate-500 font-bold mt-2 flex items-center gap-1.5">
            <span>تعداد: {toPersianDigits(summaryMetrics.count)} رسید</span>
            <span>•</span>
            <span>میانگین: {toPersianDigits(formatCurrency(summaryMetrics.avgAmount))} {currency}</span>
          </div>
        </div>

        {/* Card 2: Bank Transfers / POS */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-black">حساب‌های بانکی و پوز</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Landmark className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg sm:text-2xl font-black text-slate-900 font-mono tracking-tight">
            {toPersianDigits(formatCurrency(summaryMetrics.bankAmount))}
            <span className="text-[10px] sm:text-xs font-bold text-slate-500 mr-1.5">{currency}</span>
          </div>
          <div className="text-[11px] text-blue-600 font-bold mt-2 flex items-center gap-1.5">
            <span>تعداد: {toPersianDigits(summaryMetrics.bankCount)} تراکنش بانکی</span>
          </div>
        </div>

        {/* Card 3: Cashbox */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-black">صندوق‌های نقدی</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg sm:text-2xl font-black text-slate-900 font-mono tracking-tight">
            {toPersianDigits(formatCurrency(summaryMetrics.cashAmount))}
            <span className="text-[10px] sm:text-xs font-bold text-slate-500 mr-1.5">{currency}</span>
          </div>
          <div className="text-[11px] text-amber-600 font-bold mt-2 flex items-center gap-1.5">
            <span>تعداد: {toPersianDigits(summaryMetrics.cashCount)} تراکنش نقدی</span>
          </div>
        </div>

        {/* Card 4: Checks & Other */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-black">اسناد دریافتنی / چک</span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <FileCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg sm:text-2xl font-black text-slate-900 font-mono tracking-tight">
            {toPersianDigits(formatCurrency(summaryMetrics.checkAmount))}
            <span className="text-[10px] sm:text-xs font-bold text-slate-500 mr-1.5">{currency}</span>
          </div>
          <div className="text-[11px] text-purple-600 font-bold mt-2 flex items-center gap-1.5">
            <span>تعداد: {toPersianDigits(summaryMetrics.checkCount)} فقره چک</span>
          </div>
        </div>
      </div>

      {/* Advanced Filter Toolbar */}
      <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-200/80 space-y-4 print:hidden">
        {/* Date presets row */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-black text-slate-700 flex items-center gap-1.5">
              <CalendarIcon className="w-3.5 h-3.5 text-indigo-600" />
              بازه زمانی صدور رسید:
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: 'all', label: 'همه زمان‌ها' },
              { id: 'today', label: 'امروز' },
              { id: 'yesterday', label: 'دیروز' },
              { id: 'this_week', label: 'این هفته' },
              { id: 'last_7_days', label: '۷ روز گذشته' },
              { id: 'this_month', label: 'ماه جاری' },
              { id: 'last_30_days', label: '۳۰ روز اخیر' },
              { id: 'this_year', label: 'کل سال' },
              { id: 'custom', label: 'بازه دلخواه...' },
            ].map(p => (
              <button
                key={p.id}
                onClick={() => applyDatePreset(p.id as DatePreset)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  datePreset === p.id
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Custom Date Pickers */}
          {datePreset === 'custom' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap items-center gap-3"
            >
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-600">از تاریخ:</span>
                <div className="w-44">
                  <CustomDatePicker
                    value={startDate}
                    onChange={(val: any) => {
                      setStartDate(val ? new Date(val) : null);
                      setCurrentPage(1);
                    }}
                    placeholder="تاریخ شروع"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-600">تا تاریخ:</span>
                <div className="w-44">
                  <CustomDatePicker
                    value={endDate}
                    onChange={(val: any) => {
                      setEndDate(val ? new Date(val) : null);
                      setCurrentPage(1);
                    }}
                    placeholder="تاریخ پایان"
                  />
                </div>
              </div>
            </motion.div>
          )}
        </div>

        {/* Detailed Filters Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 pt-3 border-t border-slate-100">
          {/* Search Input */}
          <div className="lg:col-span-3 relative">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={invoiceSearchQuery}
              onChange={e => {
                if (setInvoiceSearchQuery) setInvoiceSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="جستجوی شخص، شماره رسید، شماره چک، نام بانک یا صندوق..."
              className="w-full pr-9 pl-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
            />
            {invoiceSearchQuery && (
              <button
                onClick={() => setInvoiceSearchQuery && setInvoiceSearchQuery('')}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <XCircle className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Person Filter */}
          <div className="lg:col-span-2">
            <select
              value={selectedPersonFilter}
              onChange={e => {
                setSelectedPersonFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all cursor-pointer"
            >
              <option value="all">همه اشخاص و طرف‌حساب‌ها</option>
              {(persons || []).map((p: any) => (
                <option key={p.id} value={String(p.id)}>
                  {p.alias || p.name || `${p.firstName || ''} ${p.lastName || ''}`}
                </option>
              ))}
            </select>
          </div>

          {/* Financial Resource Filter */}
          <div>
            <select
              value={selectedResourceFilter}
              onChange={e => {
                setSelectedResourceFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all cursor-pointer"
            >
              <option value="all">همه منابع مالی</option>
              <option value="bank">حساب‌های بانکی</option>
              <option value="cash">صندوق‌های نقدی</option>
              <option value="check">اسناد چک</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Table Card (Desktop & Responsive) */}
      <div id="receipts-table-container" className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        {/* Printable Header */}
        <div className="hidden print:block p-4 border-b border-slate-200 text-center">
          <h2 className="text-lg font-black text-slate-900">{storeSettings?.companyName || 'فروشگاه'}</h2>
          <h3 className="text-sm font-bold text-slate-700 mt-1">
            {isReceive ? 'گزارش رسیدهای دریافت وجه' : 'گزارش رسیدهای پرداخت وجه'}
          </h3>
          <div className="text-xs text-slate-500 mt-2 flex justify-center gap-6">
            <span>تاریخ چاپ: {new DateObject({ calendar: persian, locale: persian_fa }).format("YYYY/MM/DD HH:mm")}</span>
            <span>تعداد کل اقلام: {toPersianDigits(filteredTxs.length)} رسید</span>
          </div>
        </div>

        {/* Mobile View */}
        <div className="md:hidden divide-y divide-slate-100">
          {paginatedTxs.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <Receipt className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <span className="text-sm font-bold">هیچ رسیدی یافت نشد.</span>
            </div>
          ) : (
            paginatedTxs.map((tx: any) => {
              const person = persons.find((p: any) => String(p.id) === String(tx.personId));
              const resLabel = getResourceLabel(tx);

              return (
                <div key={tx.id} className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span
                      onClick={() => tx.type === "salary" && openPayslip ? openPayslip(tx) : (setPrintingTransaction && setPrintingTransaction(tx))}
                      className="font-sans font-black text-xs text-indigo-600 cursor-pointer"
                    >
                      #{toPersianDigits(tx.receiptNumber || tx.id)}
                    </span>
                    <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black ${
                      isReceive ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                    }`}>
                      {isReceive ? 'دریافت' : 'پرداخت'}
                    </span>
                  </div>

                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-black text-slate-800 text-sm">
                        {renderPersonLink(person?.id, person?.name || tx.personName)}
                      </div>
                      <div className="text-[11px] text-slate-500 font-bold mt-0.5">
                        {formatDateDisplay(tx.date || tx.jalaliDate)}
                      </div>
                    </div>
                    <div className="text-left">
                      <div className="font-sans font-black text-slate-900 text-base">
                        {toPersianDigits(formatCurrency(tx.amount))} {currency}
                      </div>
                      <div className="text-[10px] text-slate-500 font-bold mt-0.5">
                        {resLabel}
                      </div>
                    </div>
                  </div>

                  {tx.note && (
                    <div className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      {tx.note}
                    </div>
                  )}

                  <div className="flex items-center justify-end gap-1.5 pt-2 border-t border-slate-100">
                    <button
                      onClick={() => {
                        if (tx.type === "salary" && openPayslip) openPayslip(tx);
                        else if (setPrintingTransaction) setPrintingTransaction(tx);
                      }}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>چاپ رسید</span>
                    </button>

                    <button
                      onClick={() => {
                        if (setEditingReceipt) setEditingReceipt(tx);
                        if (setIsEditReceiptModalOpen) setIsEditReceiptModalOpen(true);
                      }}
                      className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                      title="ویرایش رسید"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => {
                        if (confirmAction && deleteTransaction && fetchTransactions) {
                          confirmAction(
                            "آیا از حذف این رسید اطمینان دارید؟ این عملیات غیرقابل بازگشت است.",
                            () => deleteTransaction(tx.id.toString()).then(fetchTransactions),
                          );
                        }
                      }}
                      className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                      title="حذف رسید"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm text-right">
            <thead className="bg-slate-50/90 text-slate-600 border-b border-slate-200 uppercase font-black text-xs">
              <tr>
                <th className="p-4 whitespace-nowrap">شماره رسید</th>
                <th className="p-4 whitespace-nowrap">نوع سند</th>
                <th className="p-4 whitespace-nowrap">طرف حساب</th>
                <th className="p-4 whitespace-nowrap">تاریخ ثبت</th>
                <th className="p-4 whitespace-nowrap">منبع مالی / روش</th>
                <th className="p-4 whitespace-nowrap text-left">مبلغ تراکنش</th>
                <th className="p-4 text-center whitespace-nowrap print:hidden">عملیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedTxs.map((tx: any, idx: number) => {
                const person = persons.find((p: any) => String(p.id) === String(tx.personId));
                const resLabel = getResourceLabel(tx);

                return (
                  <tr key={tx.id || idx} className="hover:bg-slate-50/80 transition-colors">
                    {/* Number */}
                    <td className="p-4 font-sans font-black text-sm text-slate-800 whitespace-nowrap">
                      <span
                        onClick={() => {
                          if (tx.type === "salary" && openPayslip) openPayslip(tx);
                          else if (setPrintingTransaction) setPrintingTransaction(tx);
                        }}
                        className="cursor-pointer hover:text-indigo-600 hover:underline transition-colors decoration-dashed underline-offset-4"
                        title="مشاهده و چاپ رسید"
                      >
                        #{toPersianDigits(tx.receiptNumber || tx.id)}
                      </span>
                    </td>

                    {/* Type badge */}
                    <td className="p-4 whitespace-nowrap">
                      <span className={`px-2.5 py-1 rounded-lg text-xs font-black border ${
                        isReceive
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : 'bg-rose-50 text-rose-800 border-rose-200'
                      }`}>
                        {isReceive ? 'رسید دریافت' : 'رسید پرداخت'}
                      </span>
                    </td>

                    {/* Person */}
                    <td className="p-4 text-xs font-bold text-slate-800">
                      {renderPersonLink(person?.id, person?.name || tx.personName)}
                    </td>

                    {/* Date */}
                    <td className="p-4 font-sans text-xs font-bold text-slate-700 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <CalendarIcon className="w-3.5 h-3.5 text-indigo-500" />
                        <span>{formatDateDisplay(tx.date || tx.jalaliDate)}</span>
                      </div>
                    </td>

                    {/* Resource / Method */}
                    <td className="p-4 text-xs font-bold text-slate-700">
                      <div className="font-black text-slate-800">{resLabel}</div>
                      {tx.note && (
                        <div className="text-[10px] text-slate-500 font-normal mt-0.5 truncate max-w-xs" title={tx.note}>
                          {tx.note}
                        </div>
                      )}
                    </td>

                    {/* Amount */}
                    <td className="p-4 text-left whitespace-nowrap">
                      <div className="font-sans font-black text-slate-900 text-sm">
                        {toPersianDigits(formatCurrency(tx.amount))}{" "}
                        <span className="text-[10px] text-slate-500 font-bold mr-0.5">{currency}</span>
                      </div>
                      <div className="text-[10px] text-slate-500 font-bold mt-0.5 truncate max-w-xs">
                        {numToPersianWords(tx.amount)} {currency}
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="p-4 print:hidden">
                      <div className="flex items-center justify-center gap-1 bg-slate-50/90 p-1 rounded-xl border border-slate-200/60 w-max mx-auto">
                        <button
                          type="button"
                          onClick={() => {
                            if (tx.type === "salary" && openPayslip) openPayslip(tx);
                            else if (setPrintingTransaction) setPrintingTransaction(tx);
                          }}
                          className="p-1.5 text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg cursor-pointer transition-colors"
                          title="چاپ فیش رسید"
                        >
                          <Printer className="w-4 h-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            if (setEditingReceipt) setEditingReceipt(tx);
                            if (setIsEditReceiptModalOpen) setIsEditReceiptModalOpen(true);
                          }}
                          className="p-1.5 text-slate-400 hover:bg-amber-50 hover:text-amber-600 rounded-lg cursor-pointer transition-colors"
                          title="ویرایش رسید"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            if (confirmAction && deleteTransaction && fetchTransactions) {
                              confirmAction(
                                "آیا از حذف این رسید اطمینان دارید؟ این عملیات غیرقابل بازگشت است.",
                                () => deleteTransaction(tx.id.toString()).then(fetchTransactions),
                              );
                            }
                          }}
                          className="p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 rounded-lg cursor-pointer transition-colors"
                          title="حذف رسید"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {paginatedTxs.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Receipt className="w-8 h-8 text-slate-300" />
                      <span className="text-sm font-bold text-slate-500">هیچ رسیدی با فیلترهای جاری یافت نشد.</span>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {filteredTxs.length > 0 && (
          <div className="px-6 py-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50/70 print:hidden">
            <div className="text-xs text-slate-500 font-bold">
              نمایش ردیف‌های{" "}
              <span className="text-slate-800 font-sans font-black">
                {toPersianDigits((safeCurrentPage - 1) * pageSize + 1)}
              </span>{" "}
              تا{" "}
              <span className="text-slate-800 font-sans font-black">
                {toPersianDigits(Math.min(filteredTxs.length, safeCurrentPage * pageSize))}
              </span>{" "}
              از مجموع{" "}
              <span className="text-indigo-600 font-sans font-black">
                {toPersianDigits(filteredTxs.length)}
              </span>{" "}
              رسید
            </div>

            {totalPages > 1 && (
              <div className="flex items-center gap-1.5" dir="ltr">
                <button
                  disabled={safeCurrentPage === 1}
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  className="p-2 border border-slate-200 hover:bg-slate-100 text-slate-600 bg-white rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center shadow-3xs"
                  title="صفحه قبل"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <div className="flex items-center gap-1 px-2 font-sans font-black text-xs">
                  {Array.from({ length: totalPages })
                    .map((_, i) => i + 1)
                    .filter(
                      p => p === 1 || p === totalPages || Math.abs(p - safeCurrentPage) <= 1,
                    )
                    .map((p, i, arr) => (
                      <React.Fragment key={p}>
                        {i > 0 && arr[i - 1] !== p - 1 && (
                          <span className="text-slate-300 px-1">...</span>
                        )}
                        <button
                          onClick={() => setCurrentPage(p)}
                          className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
                            safeCurrentPage === p
                              ? `${isReceive ? 'bg-emerald-600 shadow-emerald-600/30' : 'bg-rose-600 shadow-rose-600/30'} text-white font-black shadow-xs`
                              : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 font-bold"
                          }`}
                        >
                          {toPersianDigits(p)}
                        </button>
                      </React.Fragment>
                    ))}
                </div>

                <button
                  disabled={safeCurrentPage === totalPages}
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  className="p-2 border border-slate-200 hover:bg-slate-100 text-slate-600 bg-white rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center shadow-3xs"
                  title="صفحه بعد"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-bold">نمایش در صفحه:</span>
              <select
                value={pageSize}
                onChange={e => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="bg-white border border-slate-200 text-slate-700 text-xs font-sans font-bold rounded-lg px-2.5 py-1.5 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none cursor-pointer"
                dir="ltr"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
