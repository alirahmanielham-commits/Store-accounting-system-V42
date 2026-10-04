import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  FileText, Plus, Search, Eye, Edit2, Trash2, Download, Printer,
  Filter, ArrowUpDown, ChevronDown, ChevronUp, ChevronRight, CheckCircle2,
  AlertCircle, RefreshCw, X, Calendar, DollarSign, Layers, BookOpen,
  Receipt, ShoppingCart, User, Landmark, Wallet, Check, Sparkles,
  SlidersHorizontal, ArrowRight, ArrowDownLeft, ArrowUpRight, Scale, Info
} from 'lucide-react';
import DateObjectModule from "react-date-object";
const DateObject = (DateObjectModule as any).default || DateObjectModule;
import persian from "react-date-object/calendars/persian";
import persian_fa from "react-date-object/locales/persian_fa";
import CustomDatePicker from "../ui/CustomDatePicker";
const DatePicker = CustomDatePicker;

import {
  formatDateDisplay, toPersianDigits, convertToGregorian, formatNumber, addCommas
} from '../../utils/format';
import {
  getAccountingDocuments, getLedgerAccounts, getPersons, getStoreSettings, deleteAccountingDocument
} from '../../services/dataService';
import { AccountingDocument, LedgerAccount } from '../../types';
import { exportToExcel, formatDecimalForExcel } from '../../utils/exportUtils';
import { safePrint } from '../../utils/printHelper';

interface Props {
  onNavigateToCreate?: () => void;
  onNavigateToView?: (doc: any) => void;
  onNavigateToEdit?: (doc: any) => void;
  showNotification?: (msg: string, type: 'success' | 'error' | 'info' | 'warning') => void;
}

type CategoryType = 'all' | 'invoices' | 'treasury' | 'checks' | 'salary' | 'opening' | 'loans' | 'manual';
type SortField = 'documentNumber' | 'date' | 'amount' | 'itemsCount' | 'createdAt';
type SortDirection = 'asc' | 'desc';
type DatePreset = 'all' | 'today' | 'yesterday' | 'this_week' | 'last_7_days' | 'this_month' | 'last_30_days' | 'this_year' | 'custom';

export default function AccountingDocsList({
  onNavigateToCreate,
  onNavigateToView,
  onNavigateToEdit,
  showNotification
}: Props) {
  // Primary data states
  const [docs, setDocs] = useState<AccountingDocument[]>([]);
  const [accounts, setAccounts] = useState<LedgerAccount[]>([]);
  const [persons, setPersons] = useState<any[]>([]);
  const [storeSettings, setStoreSettings] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Filters state
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<CategoryType>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'approved' | 'draft'>('all');
  const [balanceFilter, setBalanceFilter] = useState<'all' | 'balanced' | 'unbalanced'>('all');
  const [filterAccountId, setFilterAccountId] = useState('');
  
  // Date filters
  const [datePreset, setDatePreset] = useState<DatePreset>('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // Amount range filters
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');

  // Advanced filters drawer visibility
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Sorting state
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Expanded rows for viewing articles inline
  const [expandedDocIds, setExpandedDocIds] = useState<Set<string | number>>(new Set());

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(25);

  const currency = storeSettings?.currency || 'تومان';

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [fetchedDocs, fetchedAccs, fetchedPersons, fetchedSettings] = await Promise.all([
        getAccountingDocuments(),
        getLedgerAccounts(),
        getPersons(),
        getStoreSettings()
      ]);
      setDocs(fetchedDocs || []);
      setAccounts(fetchedAccs || []);
      setPersons(fetchedPersons || []);
      setStoreSettings(fetchedSettings || null);
    } catch (err: any) {
      console.error('Failed to load accounting documents:', err);
      if (showNotification) showNotification('خطا در بارگذاری اسناد حسابداری', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Fast Account and Person Lookups
  const accountMap = useMemo(() => {
    const map = new Map<string, LedgerAccount>();
    accounts.forEach(acc => {
      map.set(String(acc.id), acc);
    });
    return map;
  }, [accounts]);

  const personMap = useMemo(() => {
    const map = new Map<string, any>();
    persons.forEach(p => {
      map.set(String(p.id), p);
    });
    return map;
  }, [persons]);

  // Clean description display for JSON or payslip payloads
  const formatDocDescription = (desc?: string): string => {
    if (!desc) return '-';
    if (typeof desc === 'string') {
      try {
        if (desc.startsWith('{') && desc.endsWith('}')) {
          const parsed = JSON.parse(desc);
          if (parsed.isPayslip) {
            const months = ["فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور", "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند"];
            const m = parsed.periodMonth ? months[parseInt(parsed.periodMonth, 10) - 1] : "";
            return `سند حقوق ${m} ماه ${parsed.periodYear || ''}`;
          }
          if (parsed.description) return parsed.description;
        }
      } catch {}
    }
    return desc;
  };

  // Helper to categorize document source
  const getDocCategory = (st?: string, desc?: string): CategoryType => {
    const s = (st || '').toLowerCase();
    const d = (desc || '').toLowerCase();

    if (['invoice_sale', 'invoice_purchase', 'sale_return', 'purchase_return', 'sale', 'purchase'].includes(s) || d.includes('فاکتور')) {
      return 'invoices';
    }
    if (['receipt', 'payment', 'receive_receipt', 'pay_receipt', 'receive', 'pay', 'transfer'].includes(s) || d.includes('رسید دریافت') || d.includes('رسید پرداخت') || d.includes('انتقال وجه')) {
      return 'treasury';
    }
    if (['issued_check', 'received_check', 'check_cashing', 'check_bounce', 'check'].includes(s) || d.includes('چک شماره') || d.includes('چک صیادی')) {
      return 'checks';
    }
    if (['salary', 'payroll', 'payslip'].includes(s) || d.includes('حقوق') || d.includes('دستمزد') || d.includes('فیش حقوق')) {
      return 'salary';
    }
    if (['opening_balance', 'closing_balance', 'opening', 'closing'].includes(s) || d.includes('افتتاحیه') || d.includes('اختتامیه')) {
      return 'opening';
    }
    if (['loan', 'installment', 'loan_given', 'loan_received'].includes(s) || d.includes('وام') || d.includes('قسط')) {
      return 'loans';
    }
    return 'manual';
  };

  const getSourceTypeBadge = (st?: string, desc?: string) => {
    const cat = getDocCategory(st, desc);
    switch (cat) {
      case 'invoices':
        return {
          label: st === 'invoice_sale' ? 'فروش کالا' : st === 'invoice_purchase' ? 'خرید کالا' : 'فاکتور',
          color: 'bg-emerald-50 text-emerald-800 border-emerald-200'
        };
      case 'treasury':
        return {
          label: st === 'receipt' ? 'دریافت نقد/بانک' : st === 'payment' ? 'پرداخت نقد/بانک' : 'خزانه‌داری',
          color: 'bg-teal-50 text-teal-800 border-teal-200'
        };
      case 'checks':
        return {
          label: st === 'issued_check' ? 'چک پرداختی' : st === 'received_check' ? 'چک دریافتی' : 'سند چک',
          color: 'bg-sky-50 text-sky-800 border-sky-200'
        };
      case 'salary':
        return {
          label: 'حقوق و دستمزد',
          color: 'bg-purple-50 text-purple-800 border-purple-200'
        };
      case 'opening':
        return {
          label: 'سند افتتاحیه',
          color: 'bg-indigo-50 text-indigo-800 border-indigo-200'
        };
      case 'loans':
        return {
          label: st === 'loan' ? 'تسهیلات وام' : 'اقساط وام',
          color: 'bg-amber-50 text-amber-800 border-amber-200'
        };
      case 'manual':
      default:
        return {
          label: 'سند عمومی/دستی',
          color: 'bg-slate-100 text-slate-800 border-slate-200'
        };
    }
  };

  // Date preset selector handler
  const handleDatePresetChange = (preset: DatePreset) => {
    setDatePreset(preset);
    if (preset === 'all') {
      setFromDate('');
      setToDate('');
      return;
    }

    try {
      const today = new DateObject({ calendar: persian, locale: persian_fa });
      today.setHour(12);
      today.setMinute(0);
      today.setSecond(0);

      if (preset === 'today') {
        const iso = today.toDate().toISOString();
        setFromDate(iso);
        setToDate(iso);
      } else if (preset === 'yesterday') {
        const yesterday = new DateObject(today).subtract(1, 'day');
        yesterday.setHour(12);
        const iso = yesterday.toDate().toISOString();
        setFromDate(iso);
        setToDate(iso);
      } else if (preset === 'this_week') {
        // First day of current Persian week (Saturday = day of week 0)
        const dayOfWeek = today.weekDay.index; // 0 for Saturday in Persian calendar
        const startOfWeek = new DateObject(today).subtract(dayOfWeek, 'day');
        startOfWeek.setHour(0);
        startOfWeek.setMinute(0);
        setFromDate(startOfWeek.toDate().toISOString());
        setToDate(today.toDate().toISOString());
      } else if (preset === 'last_7_days') {
        const sevenDaysAgo = new DateObject(today).subtract(6, 'days');
        sevenDaysAgo.setHour(0);
        setFromDate(sevenDaysAgo.toDate().toISOString());
        setToDate(today.toDate().toISOString());
      } else if (preset === 'this_month') {
        const startOfMonth = new DateObject(today);
        startOfMonth.setDay(1);
        startOfMonth.setHour(0);
        setFromDate(startOfMonth.toDate().toISOString());
        setToDate(today.toDate().toISOString());
      } else if (preset === 'last_30_days') {
        const thirtyDaysAgo = new DateObject(today).subtract(29, 'days');
        thirtyDaysAgo.setHour(0);
        setFromDate(thirtyDaysAgo.toDate().toISOString());
        setToDate(today.toDate().toISOString());
      } else if (preset === 'this_year') {
        const startOfYear = new DateObject(today);
        startOfYear.setMonth(1);
        startOfYear.setDay(1);
        startOfYear.setHour(0);
        setFromDate(startOfYear.toDate().toISOString());
        setToDate(today.toDate().toISOString());
      }
    } catch (e) {
      console.error('Date preset calculation error:', e);
    }
  };

  // Reset all filters
  const handleResetFilters = () => {
    setSearchTerm('');
    setCategoryFilter('all');
    setStatusFilter('all');
    setBalanceFilter('all');
    setFilterAccountId('');
    setDatePreset('all');
    setFromDate('');
    setToDate('');
    setMinAmount('');
    setMaxAmount('');
    setCurrentPage(1);
  };

  const isAnyFilterActive = useMemo(() => {
    return (
      Boolean(searchTerm) ||
      categoryFilter !== 'all' ||
      statusFilter !== 'all' ||
      balanceFilter !== 'all' ||
      Boolean(filterAccountId) ||
      datePreset !== 'all' ||
      Boolean(fromDate) ||
      Boolean(toDate) ||
      Boolean(minAmount) ||
      Boolean(maxAmount)
    );
  }, [searchTerm, categoryFilter, statusFilter, balanceFilter, filterAccountId, datePreset, fromDate, toDate, minAmount, maxAmount]);

  // Enhanced Filter & Sort Pipeline
  const { filteredAndSortedDocs, categoryCounts, totalDebitSum, totalCreditSum, unbalancedCount } = useMemo(() => {
    let list = [...docs];

    // Compute category counts across ALL docs before category filter is applied
    const counts: Record<CategoryType, number> = {
      all: docs.length,
      invoices: 0,
      treasury: 0,
      checks: 0,
      salary: 0,
      opening: 0,
      loans: 0,
      manual: 0
    };

    let totalDeb = 0;
    let totalCred = 0;
    let unbalCount = 0;

    docs.forEach(d => {
      const cat = getDocCategory(d.sourceType, d.description);
      counts[cat] = (counts[cat] || 0) + 1;
    });

    // 1. Text Search Filter (normalized digits + deep search inside articles and accounts)
    if (searchTerm.trim()) {
      const q = searchTerm.trim().toLowerCase();
      const qLatin = q.replace(/[۰-۹]/g, (d) => "۰۱۲۳۴۵۶۷۸۹".indexOf(d).toString());

      list = list.filter(d => {
        const docNumStr = (d.documentNumber || '').toString().toLowerCase();
        const docNumLatin = docNumStr.replace(/[۰-۹]/g, (d) => "۰۱۲۳۴۵۶۷۸۹".indexOf(d).toString());
        const desc = (d.description || '').toLowerCase();
        const srcId = (d.sourceId || '').toString().toLowerCase();

        if (
          docNumStr.includes(q) ||
          docNumLatin.includes(qLatin) ||
          desc.includes(q) ||
          srcId.includes(q)
        ) {
          return true;
        }

        // Search within line articles
        if (d.items && Array.isArray(d.items)) {
          return d.items.some(item => {
            const itemDesc = (item.description || '').toLowerCase();
            const acc = accountMap.get(String(item.ledgerAccountId));
            const accTitle = (acc?.title || '').toLowerCase();
            const accCode = (acc?.code || '').toLowerCase();
            const person = personMap.get(String(item.detailedAccountId));
            const personName = (person?.name || person?.alias || '').toLowerCase();

            return (
              itemDesc.includes(q) ||
              accTitle.includes(q) ||
              accCode.includes(q) ||
              personName.includes(q)
            );
          });
        }
        return false;
      });
    }

    // 2. Category Filter
    if (categoryFilter !== 'all') {
      list = list.filter(d => getDocCategory(d.sourceType, d.description) === categoryFilter);
    }

    // 3. Status Filter (approved / draft)
    if (statusFilter !== 'all') {
      list = list.filter(d => d.status === statusFilter);
    }

    // 4. Balance Filter (balanced / unbalanced)
    if (balanceFilter !== 'all') {
      list = list.filter(d => {
        const deb = (d.items || []).reduce((s, it) => s + (Number(it.debit) || 0), 0);
        const cred = (d.items || []).reduce((s, it) => s + (Number(it.credit) || 0), 0);
        const isBal = Math.abs(deb - cred) < 0.001;
        return balanceFilter === 'balanced' ? isBal : !isBal;
      });
    }

    // 5. Account ID Filter
    if (filterAccountId) {
      list = list.filter(d =>
        (d.items || []).some(
          it =>
            String(it.ledgerAccountId) === String(filterAccountId) ||
            String(it.detailedAccountId) === String(filterAccountId)
        )
      );
    }

    // 6. Date Range Filter
    if (fromDate || toDate) {
      const fromTimestamp = fromDate ? new Date(fromDate).getTime() : -Infinity;
      let toTimestamp = Infinity;
      if (toDate) {
        const toD = new Date(toDate);
        toD.setHours(23, 59, 59, 999);
        toTimestamp = toD.getTime();
      }

      list = list.filter(d => {
        const docTime = new Date(d.date).getTime();
        if (isNaN(docTime)) return true;
        return docTime >= fromTimestamp && docTime <= toTimestamp;
      });
    }

    // 7. Amount Range Filter
    const parsedMin = minAmount ? parseInt(minAmount.replace(/,/g, ''), 10) : 0;
    const parsedMax = maxAmount ? parseInt(maxAmount.replace(/,/g, ''), 10) : Infinity;

    if (parsedMin > 0 || (parsedMax !== Infinity && !isNaN(parsedMax))) {
      list = list.filter(d => {
        const totalDebit = (d.items || []).reduce((s, it) => s + (Number(it.debit) || 0), 0);
        if (parsedMin > 0 && totalDebit < parsedMin) return false;
        if (parsedMax !== Infinity && totalDebit > parsedMax) return false;
        return true;
      });
    }

    // Compute sums on the filtered set
    list.forEach(d => {
      const dDeb = (d.items || []).reduce((s, it) => s + (Number(it.debit) || 0), 0);
      const dCred = (d.items || []).reduce((s, it) => s + (Number(it.credit) || 0), 0);
      totalDeb += dDeb;
      totalCred += dCred;
      if (Math.abs(dDeb - dCred) >= 0.001) {
        unbalCount++;
      }
    });

    // 8. Sorting
    list.sort((a, b) => {
      let valA: any = 0;
      let valB: any = 0;

      if (sortField === 'documentNumber') {
        valA = Number(a.documentNumber || 0);
        valB = Number(b.documentNumber || 0);
      } else if (sortField === 'date') {
        valA = new Date(a.date).getTime() || 0;
        valB = new Date(b.date).getTime() || 0;
      } else if (sortField === 'amount') {
        valA = (a.items || []).reduce((s, it) => s + (Number(it.debit) || 0), 0);
        valB = (b.items || []).reduce((s, it) => s + (Number(it.debit) || 0), 0);
      } else if (sortField === 'itemsCount') {
        valA = a.items?.length || 0;
        valB = b.items?.length || 0;
      } else if (sortField === 'createdAt') {
        valA = a.createdAt || 0;
        valB = b.createdAt || 0;
      }

      if (valA === valB) {
        // Fallback secondary sort by createdAt or id
        return ((b.createdAt || 0) - (a.createdAt || 0));
      }

      return sortDirection === 'asc' ? (valA > valB ? 1 : -1) : (valA < valB ? 1 : -1);
    });

    return {
      filteredAndSortedDocs: list,
      categoryCounts: counts,
      totalDebitSum: totalDeb,
      totalCreditSum: totalCred,
      unbalancedCount: unbalCount
    };
  }, [
    docs,
    searchTerm,
    categoryFilter,
    statusFilter,
    balanceFilter,
    filterAccountId,
    fromDate,
    toDate,
    minAmount,
    maxAmount,
    sortField,
    sortDirection,
    accountMap,
    personMap
  ]);

  // Paginated records
  const paginatedDocs = useMemo(() => {
    if (pageSize === -1) return filteredAndSortedDocs;
    const start = (currentPage - 1) * pageSize;
    return filteredAndSortedDocs.slice(start, start + pageSize);
  }, [filteredAndSortedDocs, currentPage, pageSize]);

  const totalPages = pageSize === -1 ? 1 : Math.ceil(filteredAndSortedDocs.length / pageSize) || 1;

  // Toggle sort field or direction
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  // Toggle single document accordion row
  const toggleDocExpand = (id: string | number) => {
    setExpandedDocIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Expand / collapse all rows
  const toggleExpandAll = () => {
    if (expandedDocIds.size === paginatedDocs.length && paginatedDocs.length > 0) {
      setExpandedDocIds(new Set());
    } else {
      setExpandedDocIds(new Set(paginatedDocs.map(d => d.id)));
    }
  };

  // Delete document handler
  const handleDelete = async (id: string | number) => {
    if (window.confirm('آیا از حذف این سند حسابداری و آرتیکل‌های مرتبط با آن اطمینان کامل دارید؟')) {
      try {
        await deleteAccountingDocument(id);
        if (showNotification) showNotification('سند حسابداری با موفقیت حذف گردید.', 'success');
        loadData();
      } catch (err: any) {
        if (showNotification) showNotification(err.message || 'خطا در حذف سند.', 'error');
      }
    }
  };

  // Comprehensive Excel export (Documents + Articles)
  const handleExportExcel = () => {
    try {
      const curr = currency;
      const excelRows = filteredAndSortedDocs.map((d, idx) => {
        const totalDebit = (d.items || []).reduce((sum, item) => sum + (Number(item.debit) || 0), 0);
        const totalCredit = (d.items || []).reduce((sum, item) => sum + (Number(item.credit) || 0), 0);
        const isBal = Math.abs(totalDebit - totalCredit) < 0.001;
        const badge = getSourceTypeBadge(d.sourceType, d.description);

        return {
          'ردیف': idx + 1,
          'شماره سند': d.documentNumber || '-',
          'تاریخ سند': formatDateDisplay(d.date, storeSettings?.calendarType),
          'دسته‌بندی': badge.label,
          'شرح کلی سند': formatDocDescription(d.description),
          'تعداد آرتیکل': d.items?.length || 0,
          [`مجموع بدهکار (${curr})`]: formatDecimalForExcel(totalDebit, storeSettings),
          [`مجموع بستانکار (${curr})`]: formatDecimalForExcel(totalCredit, storeSettings),
          'وضعیت تراز': isBal ? 'تراز' : 'ناهمخوان',
          'وضعیت ثبت': d.status === 'approved' ? 'تایید شده (قطعی)' : 'پیش‌نویس'
        };
      });

      const todayStr = new Date().toLocaleDateString('fa-IR').replace(/\//g, '-');
      const filename = `اسناد_حسابداری_${todayStr}`;

      exportToExcel({
        filename,
        sheetName: 'دفتر اسناد حسابداری',
        data: excelRows,
        storeSettings
      });

      if (showNotification) showNotification('خروجی اکسل اسناد حسابداری با موفقیت تولید شد', 'success');
    } catch (e) {
      console.error(e);
      if (showNotification) showNotification('خطا در صدور فایل اکسل', 'error');
    }
  };

  // Print filtered documents report
  const handlePrintList = () => {
    safePrint();
  };

  return (
    <div className="space-y-5 font-sans" dir="rtl">
      {/* Top Header Bar */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-indigo-600/20">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl md:text-2xl font-black text-slate-900">
                دفتر اسناد حسابداری
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-black bg-indigo-50 text-indigo-700 border border-indigo-200">
                {toPersianDigits(filteredAndSortedDocs.length)} سند
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              مدیریت اسناد دوبل، روزنامه مالی، فیلترهای تحلیلی و تراز بودن سرفصل‌ها
            </p>
          </div>
        </div>

        {/* Top Actions */}
        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
          {onNavigateToCreate && (
            <button
              type="button"
              onClick={onNavigateToCreate}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 shadow-md shadow-indigo-600/20 transition-all cursor-pointer active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>صدور سند جدید</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleExportExcel}
            className="px-3.5 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl font-bold text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
            title="خروجی اکسل با فرمت دقیق ریالی/تومانی"
          >
            <Download className="w-4 h-4 text-emerald-600" />
            <span>خروجی اکسل</span>
          </button>

          <button
            type="button"
            onClick={handlePrintList}
            className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
            title="چاپ جدول اسناد"
          >
            <Printer className="w-4 h-4 text-slate-600" />
            <span>چاپ</span>
          </button>

          <button
            type="button"
            onClick={loadData}
            disabled={isLoading}
            className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            title="بروزرسانی داده‌ها"
          >
            <RefreshCw className={`w-4 h-4 text-slate-600 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* KPI Stats Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Total Documents */}
        <div className="p-4 bg-white rounded-2xl border border-slate-200/90 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 font-bold block mb-1">تعداد کل اسناد</span>
            <div className="text-xl font-black text-slate-900 font-mono">
              {toPersianDigits(filteredAndSortedDocs.length)} <span className="text-xs font-sans text-slate-400 font-normal">سند</span>
            </div>
            <div className="text-[11px] text-slate-400 font-medium mt-1">
              کل اسناد موجود: {toPersianDigits(docs.length)}
            </div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <FileText className="w-5 h-5" />
          </div>
        </div>

        {/* Total Debit / Credit Volume */}
        <div className="p-4 bg-white rounded-2xl border border-slate-200/90 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 font-bold block mb-1">گردش بدهکار / بستانکار</span>
            <div className="text-lg font-black text-slate-900 font-mono" dir="ltr">
              <span className="text-xs font-sans text-slate-500 font-bold ml-1">{currency}</span>
              {addCommas(totalDebitSum)}
            </div>
            <div className="text-[11px] text-emerald-600 font-bold mt-1 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>مجموع بستانکار: {addCommas(totalCreditSum)} {currency}</span>
            </div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>

        {/* Balance Status */}
        <div className="p-4 bg-white rounded-2xl border border-slate-200/90 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 font-bold block mb-1">وضعیت تراز اسناد</span>
            <div className="flex items-center gap-2">
              <div className="text-lg font-black font-mono">
                {unbalancedCount === 0 ? (
                  <span className="text-emerald-700 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>۱۰۰٪ اسناد تراز هستند</span>
                  </span>
                ) : (
                  <span className="text-rose-600 flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4" />
                    <span>{toPersianDigits(unbalancedCount)} سند ناهمخوان</span>
                  </span>
                )}
              </div>
            </div>
            <div className="text-[11px] text-slate-400 font-medium mt-1">
              اختلاف بدهکار و بستانکار: {addCommas(Math.abs(totalDebitSum - totalCreditSum))} {currency}
            </div>
          </div>
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
            unbalancedCount === 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
          }`}>
            <Scale className="w-5 h-5" />
          </div>
        </div>

        {/* Average Document Amount */}
        <div className="p-4 bg-white rounded-2xl border border-slate-200/90 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 font-bold block mb-1">میانگین مبلغ هر سند</span>
            <div className="text-lg font-black text-slate-900 font-mono" dir="ltr">
              <span className="text-xs font-sans text-slate-500 font-bold ml-1">{currency}</span>
              {addCommas(
                filteredAndSortedDocs.length > 0
                  ? Math.round(totalDebitSum / filteredAndSortedDocs.length)
                  : 0
              )}
            </div>
            <div className="text-[11px] text-slate-400 font-medium mt-1">
              مجموع آرتیکل‌ها: {toPersianDigits(filteredAndSortedDocs.reduce((s, d) => s + (d.items?.length || 0), 0))} سطر
            </div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
            <Layers className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Category Pills Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {[
          { id: 'all', label: 'همه اسناد', icon: Layers, count: categoryCounts.all },
          { id: 'invoices', label: 'فاکتورها (خرید/فروش)', icon: ShoppingCart, count: categoryCounts.invoices },
          { id: 'treasury', label: 'خزانه‌داری (دریافت/پرداخت)', icon: Receipt, count: categoryCounts.treasury },
          { id: 'checks', label: 'اسناد چک', icon: BookOpen, count: categoryCounts.checks },
          { id: 'salary', label: 'حقوق و دستمزد', icon: User, count: categoryCounts.salary },
          { id: 'opening', label: 'افتتاحیه/اختتامیه', icon: Landmark, count: categoryCounts.opening },
          { id: 'loans', label: 'وام و تسهیلات', icon: Wallet, count: categoryCounts.loans },
          { id: 'manual', label: 'اسناد دستی/اصلاحی', icon: FileText, count: categoryCounts.manual },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = categoryFilter === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setCategoryFilter(tab.id as CategoryType);
                setCurrentPage(1);
              }}
              className={`px-3.5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer border ${
                isActive
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm shadow-indigo-600/20'
                  : 'bg-white hover:bg-slate-50 text-slate-600 border-slate-200'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
              <span>{tab.label}</span>
              <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full ${
                isActive ? 'bg-indigo-700 text-white' : 'bg-slate-100 text-slate-500'
              }`}>
                {toPersianDigits(tab.count || 0)}
              </span>
            </button>
          );
        })}
      </div>

      {/* Main Filter & Search Suite */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-4 shadow-xs">
        {/* Search input and Quick Filters row */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-5 h-5 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="جستجوی هوشمند در شماره سند، شرح کلی، شرح آرتیکل، نام طرف‌حساب یا کد حساب..."
              className="w-full pr-11 pl-10 py-3 bg-slate-50 hover:bg-slate-100/60 focus:bg-white border border-slate-200 focus:border-indigo-600 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all placeholder:text-slate-400 placeholder:font-normal"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Quick Date Presets Dropdown */}
          <div className="w-full md:w-48 shrink-0">
            <select
              value={datePreset}
              onChange={(e) => handleDatePresetChange(e.target.value as DatePreset)}
              className="w-full px-3 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-indigo-500 cursor-pointer"
            >
              <option value="all">📅 همه بازه‌های زمانی</option>
              <option value="today">امروز</option>
              <option value="yesterday">دیروز</option>
              <option value="this_week">هفته جاری</option>
              <option value="last_7_days">۷ روز گذشته</option>
              <option value="this_month">ماه جاری</option>
              <option value="last_30_days">۳۰ روز اخیر</option>
              <option value="this_year">سال مالی جاری</option>
              <option value="custom">بازه زمانی دلخواه...</option>
            </select>
          </div>

          {/* Sort Selector Dropdown */}
          <div className="w-full md:w-52 shrink-0">
            <select
              value={`${sortField}_${sortDirection}`}
              onChange={(e) => {
                const [f, d] = e.target.value.split('_');
                setSortField(f as SortField);
                setSortDirection(d as SortDirection);
              }}
              className="w-full px-3 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-indigo-500 cursor-pointer"
            >
              <option value="date_desc">مرتب‌سازی: تاریخ (جدیدترین)</option>
              <option value="date_asc">مرتب‌سازی: تاریخ (قدیمی‌ترین)</option>
              <option value="documentNumber_desc">شماره سند (بزرگتر به کوچکتر)</option>
              <option value="documentNumber_asc">شماره سند (کوچکتر به بزرگتر)</option>
              <option value="amount_desc">مبلغ سند (بیشترین به کمترین)</option>
              <option value="amount_asc">مبلغ سند (کمترین به بیشترین)</option>
              <option value="itemsCount_desc">تعداد سطرها (بیشترین)</option>
              <option value="createdAt_desc">زمان ثبت در سیستم</option>
            </select>
          </div>

          {/* Toggle Advanced Filters Button */}
          <button
            type="button"
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className={`px-3.5 py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border transition-all cursor-pointer ${
              showAdvancedFilters || isAnyFilterActive
                ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
            }`}
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span>فیلترهای پیشرفته</span>
            {isAnyFilterActive && (
              <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse"></span>
            )}
          </button>

          {/* Clear Filters Button */}
          {isAnyFilterActive && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="px-3.5 py-3 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              title="پاک کردن همه فیلترها"
            >
              <X className="w-4 h-4" />
              <span>حذف فیلترها</span>
            </button>
          )}
        </div>

        {/* Collapsible Advanced Filters Section */}
        <AnimatePresence>
          {showAdvancedFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="pt-4 border-t border-slate-100 overflow-hidden"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* From Date */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">از تاریخ</label>
                  <DatePicker
                    value={fromDate}
                    onChange={(date: any) => {
                      setFromDate(date ? convertToGregorian(date) : '');
                      setDatePreset('custom');
                      setCurrentPage(1);
                    }}
                    calendar={storeSettings?.calendarType === "gregorian" ? undefined : persian}
                    locale={storeSettings?.calendarType === "gregorian" ? undefined : persian_fa}
                    calendarPosition="bottom-right"
                    inputClass="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-800 outline-none focus:border-indigo-500"
                  />
                </div>

                {/* To Date */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">تا تاریخ</label>
                  <DatePicker
                    value={toDate}
                    onChange={(date: any) => {
                      setToDate(date ? convertToGregorian(date) : '');
                      setDatePreset('custom');
                      setCurrentPage(1);
                    }}
                    calendar={storeSettings?.calendarType === "gregorian" ? undefined : persian}
                    locale={storeSettings?.calendarType === "gregorian" ? undefined : persian_fa}
                    calendarPosition="bottom-right"
                    inputClass="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-800 outline-none focus:border-indigo-500"
                  />
                </div>

                {/* Filter by Specific Account */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">حساب کل یا معین</label>
                  <select
                    value={filterAccountId}
                    onChange={(e) => {
                      setFilterAccountId(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-800 outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    <option value="">همه حساب‌های کل و معین</option>
                    {(accounts || []).map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.code} - {a.title} ({a.type === 'general' ? 'کل' : a.type === 'subsidiary' ? 'معین' : 'تفصیلی'})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Status Filter */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">وضعیت سند</label>
                  <select
                    value={statusFilter}
                    onChange={(e) => {
                      setStatusFilter(e.target.value as any);
                      setCurrentPage(1);
                    }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-800 outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    <option value="all">همه وضعیت‌ها</option>
                    <option value="approved">ثبت قطعی (تایید شده)</option>
                    <option value="draft">موقت (پیش‌نویس)</option>
                  </select>
                </div>

                {/* Balance Filter */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">وضعیت تراز</label>
                  <select
                    value={balanceFilter}
                    onChange={(e) => {
                      setBalanceFilter(e.target.value as any);
                      setCurrentPage(1);
                    }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-800 outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    <option value="all">همه اسناد (تراز و ناهمخوان)</option>
                    <option value="balanced">فقط اسناد تراز (بدهکار = بستانکار)</option>
                    <option value="unbalanced">فقط اسناد ناهمخوان (دارای اختلاف)</option>
                  </select>
                </div>

                {/* Minimum Amount */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">حداقل مبلغ سند ({currency})</label>
                  <input
                    type="text"
                    value={minAmount}
                    onChange={(e) => {
                      const clean = e.target.value.replace(/[^0-9]/g, '');
                      setMinAmount(clean ? addCommas(clean) : '');
                      setCurrentPage(1);
                    }}
                    placeholder="۰"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold text-left outline-none focus:border-indigo-500"
                    dir="ltr"
                  />
                </div>

                {/* Maximum Amount */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">حداکثر مبلغ سند ({currency})</label>
                  <input
                    type="text"
                    value={maxAmount}
                    onChange={(e) => {
                      const clean = e.target.value.replace(/[^0-9]/g, '');
                      setMaxAmount(clean ? addCommas(clean) : '');
                      setCurrentPage(1);
                    }}
                    placeholder="نامحدود"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold text-left outline-none focus:border-indigo-500"
                    dir="ltr"
                  />
                </div>

                {/* Quick actions in filter box */}
                <div className="flex items-end gap-2">
                  <button
                    type="button"
                    onClick={toggleExpandAll}
                    className="w-full py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer text-center"
                  >
                    {expandedDocIds.size === paginatedDocs.length && paginatedDocs.length > 0
                      ? 'بستن ریز آرتیکل‌ها'
                      : 'مشاهده ریز تمام آرتیکل‌ها'}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Main Table Container */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 text-xs font-black select-none">
              <tr>
                <th className="p-3.5 w-10 text-center">
                  <span className="sr-only">جزئیات</span>
                </th>

                {/* Document Number */}
                <th
                  onClick={() => handleSort('documentNumber')}
                  className="p-3.5 cursor-pointer hover:bg-slate-100/80 transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span>شماره سند</span>
                    {sortField === 'documentNumber' ? (
                      sortDirection === 'asc' ? <ChevronUp className="w-3.5 h-3.5 text-indigo-600" /> : <ChevronDown className="w-3.5 h-3.5 text-indigo-600" />
                    ) : (
                      <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                    )}
                  </div>
                </th>

                {/* Date */}
                <th
                  onClick={() => handleSort('date')}
                  className="p-3.5 cursor-pointer hover:bg-slate-100/80 transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span>تاریخ سند</span>
                    {sortField === 'date' ? (
                      sortDirection === 'asc' ? <ChevronUp className="w-3.5 h-3.5 text-indigo-600" /> : <ChevronDown className="w-3.5 h-3.5 text-indigo-600" />
                    ) : (
                      <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                    )}
                  </div>
                </th>

                {/* Source Badge / Category */}
                <th className="p-3.5">دسته‌بندی و منبع</th>

                {/* Description */}
                <th className="p-3.5">شرح سند حسابداری</th>

                {/* Article Count */}
                <th
                  onClick={() => handleSort('itemsCount')}
                  className="p-3.5 text-center cursor-pointer hover:bg-slate-100/80 transition-colors"
                >
                  <div className="flex items-center justify-center gap-1.5">
                    <span>سطرها</span>
                    {sortField === 'itemsCount' ? (
                      sortDirection === 'asc' ? <ChevronUp className="w-3.5 h-3.5 text-indigo-600" /> : <ChevronDown className="w-3.5 h-3.5 text-indigo-600" />
                    ) : (
                      <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                    )}
                  </div>
                </th>

                {/* Status & Balance */}
                <th className="p-3.5 text-center">وضعیت تراز</th>

                {/* Total Amount */}
                <th
                  onClick={() => handleSort('amount')}
                  className="p-3.5 cursor-pointer hover:bg-slate-100/80 transition-colors text-left"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>مبلغ سند ({currency})</span>
                    {sortField === 'amount' ? (
                      sortDirection === 'asc' ? <ChevronUp className="w-3.5 h-3.5 text-indigo-600" /> : <ChevronDown className="w-3.5 h-3.5 text-indigo-600" />
                    ) : (
                      <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                    )}
                  </div>
                </th>

                {/* Actions */}
                <th className="p-3.5 text-center w-28">عملیات</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 text-xs">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="p-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <div className="w-9 h-9 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                      <span className="font-bold">در حال بارگذاری اسناد حسابداری...</span>
                    </div>
                  </td>
                </tr>
              ) : paginatedDocs.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-16 text-center text-slate-400">
                    <FileText className="w-14 h-14 mx-auto mb-3 opacity-25" />
                    <p className="font-black text-slate-700 text-sm">هیچ سندی با معیارهای انتخابی یافت نشد</p>
                    <p className="text-xs text-slate-400 mt-1">عبارت جستجو یا فیلترهای اعمال شده را تغییر دهید.</p>
                    {isAnyFilterActive && (
                      <button
                        type="button"
                        onClick={handleResetFilters}
                        className="mt-4 px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                      >
                        پاک کردن همه فیلترها
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                paginatedDocs.map((doc, idx) => {
                  const totalDebit = (doc.items || []).reduce((sum, item) => sum + Number(item.debit || 0), 0);
                  const totalCredit = (doc.items || []).reduce((sum, item) => sum + Number(item.credit || 0), 0);
                  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.001;
                  const isExpanded = expandedDocIds.has(doc.id);
                  const badge = getSourceTypeBadge(doc.sourceType, doc.description);

                  return (
                    <React.Fragment key={`${doc.id}-${idx}`}>
                      <tr
                        className={`hover:bg-slate-50/80 transition-colors ${
                          isExpanded ? 'bg-indigo-50/30' : ''
                        }`}
                      >
                        {/* Expand toggle */}
                        <td className="p-3 text-center">
                          <button
                            type="button"
                            onClick={() => toggleDocExpand(doc.id)}
                            className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                            title={isExpanded ? 'بستن آرتیکل‌ها' : 'مشاهده آرتیکل‌های سند'}
                          >
                            <ChevronDown
                              className={`w-4 h-4 transition-transform duration-200 ${
                                isExpanded ? 'rotate-180 text-indigo-600' : ''
                              }`}
                            />
                          </button>
                        </td>

                        {/* Document Number */}
                        <td className="p-3 font-mono font-black text-slate-900 text-sm">
                          <span className="inline-block px-2 py-0.5 rounded bg-slate-100 border border-slate-200/80">
                            {doc.documentNumber || '-'}
                          </span>
                        </td>

                        {/* Date */}
                        <td className="p-3 font-bold text-slate-700">
                          <div className="flex flex-col">
                            <span>{formatDateDisplay(doc.date, storeSettings?.calendarType)}</span>
                            {doc.createdAt && (
                              <span className="text-[10px] text-slate-400 font-mono mt-0.5" dir="ltr">
                                {new Date(doc.createdAt).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Category Badge */}
                        <td className="p-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-[11px] font-bold border ${badge.color}`}>
                            {badge.label}
                          </span>
                        </td>

                        {/* Description */}
                        <td className="p-3 font-medium text-slate-800 max-w-xs md:max-w-sm truncate" title={doc.description}>
                          {formatDocDescription(doc.description)}
                        </td>

                        {/* Articles Count */}
                        <td className="p-3 text-center font-mono font-bold text-slate-600">
                          <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-xs">
                            {toPersianDigits(doc.items?.length || 0)} سطر
                          </span>
                        </td>

                        {/* Balance & Status */}
                        <td className="p-3 text-center">
                          <div className="flex flex-col items-center gap-1">
                            {isBalanced ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                                <Check className="w-3 h-3 text-emerald-600" />
                                <span>تراز</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
                                <AlertCircle className="w-3 h-3 text-rose-600" />
                                <span>ناهمخوان</span>
                              </span>
                            )}
                            {doc.status === 'draft' && (
                              <span className="text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                                پیش‌نویس
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Total Amount */}
                        <td className="p-3 text-left font-mono font-black text-slate-900 text-sm whitespace-nowrap" dir="ltr">
                          <span className="text-xs font-sans text-slate-400 font-bold ml-1.5">{currency}</span>
                          {addCommas(totalDebit)}
                        </td>

                        {/* Action buttons */}
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {onNavigateToView && (
                              <button
                                type="button"
                                onClick={() => onNavigateToView(doc)}
                                className="p-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg transition-colors cursor-pointer"
                                title="مشاهده کامل و صدور چاپی سند"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                            )}

                            {onNavigateToEdit && (
                              <button
                                type="button"
                                onClick={() => onNavigateToEdit(doc)}
                                className="p-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg transition-colors cursor-pointer"
                                title="ویرایش سند حسابداری"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => handleDelete(doc.id)}
                              className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg transition-colors cursor-pointer"
                              title="حذف سند"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Expandable Inline Articles Accordion */}
                      {isExpanded && (
                        <tr className="bg-slate-50/70 border-b-2 border-indigo-100">
                          <td colSpan={9} className="p-4 sm:p-5">
                            <div className="bg-white rounded-xl border border-slate-200 p-3 sm:p-4 shadow-2xs space-y-3">
                              <div className="flex items-center justify-between pb-2 border-b border-slate-100 text-xs">
                                <div className="flex items-center gap-2">
                                  <BookOpen className="w-4 h-4 text-indigo-600" />
                                  <span className="font-black text-slate-800">
                                    ریز آرتیکل‌های سند شماره {doc.documentNumber}
                                  </span>
                                  <span className="text-slate-400 font-mono text-[11px]">
                                    ({doc.items?.length || 0} آرتیکل)
                                  </span>
                                </div>
                                <span className={`text-[11px] font-bold ${
                                  isBalanced ? 'text-emerald-600' : 'text-rose-600'
                                }`}>
                                  {isBalanced ? 'سند کاملاً تراز و متعادل است' : `اختلاف تراز: ${addCommas(Math.abs(totalDebit - totalCredit))} ${currency}`}
                                </span>
                              </div>

                              <div className="overflow-x-auto">
                                <table className="w-full text-right text-xs">
                                  <thead>
                                    <tr className="border-b border-slate-200 text-slate-500 font-bold bg-slate-50/80">
                                      <th className="p-2 text-center w-10">ردیف</th>
                                      <th className="p-2">کد و عنوان حساب</th>
                                      <th className="p-2">طرف‌حساب / تفصیل</th>
                                      <th className="p-2">شرح آرتیکل</th>
                                      <th className="p-2 text-left">بدهکار ({currency})</th>
                                      <th className="p-2 text-left">بستانکار ({currency})</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100 font-medium">
                                    {(doc.items || []).map((item, itemIdx) => {
                                      const acc = accountMap.get(String(item.ledgerAccountId));
                                      const person = personMap.get(String(item.detailedAccountId));
                                      return (
                                        <tr key={itemIdx} className="hover:bg-slate-50">
                                          <td className="p-2 text-center text-slate-400 font-mono">
                                            {itemIdx + 1}
                                          </td>
                                          <td className="p-2">
                                            <span className="font-bold text-slate-800">
                                              {acc?.title || 'نامشخص'}
                                            </span>
                                            {acc?.code && (
                                              <span className="mr-1.5 font-mono text-[11px] text-slate-400 bg-slate-100 px-1 py-0.5 rounded">
                                                {acc.code}
                                              </span>
                                            )}
                                          </td>
                                          <td className="p-2 text-slate-600 font-bold">
                                            {person?.name || person?.alias || (item.detailedAccountId ? String(item.detailedAccountId) : '-')}
                                          </td>
                                          <td className="p-2 text-slate-700">
                                            {item.description || '-'}
                                          </td>
                                          <td className="p-2 text-left font-mono font-bold text-emerald-700" dir="ltr">
                                            {Number(item.debit) > 0 ? addCommas(item.debit) : '-'}
                                          </td>
                                          <td className="p-2 text-left font-mono font-bold text-rose-700" dir="ltr">
                                            {Number(item.credit) > 0 ? addCommas(item.credit) : '-'}
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                  <tfoot className="border-t-2 border-slate-200 bg-slate-100/60 font-black">
                                    <tr>
                                      <td colSpan={4} className="p-2 text-right">
                                        جمع کل سند:
                                      </td>
                                      <td className="p-2 text-left font-mono text-emerald-800" dir="ltr">
                                        {addCommas(totalDebit)}
                                      </td>
                                      <td className="p-2 text-left font-mono text-rose-800" dir="ltr">
                                        {addCommas(totalCredit)}
                                      </td>
                                    </tr>
                                  </tfoot>
                                </table>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer with Pagination Controls */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-3 text-slate-600 font-medium">
            <span>
              نمایش{' '}
              <strong className="font-mono text-slate-900">
                {filteredAndSortedDocs.length > 0 ? toPersianDigits((currentPage - 1) * (pageSize === -1 ? filteredAndSortedDocs.length : pageSize) + 1) : 0}
              </strong>{' '}
              تا{' '}
              <strong className="font-mono text-slate-900">
                {toPersianDigits(
                  pageSize === -1
                    ? filteredAndSortedDocs.length
                    : Math.min(currentPage * pageSize, filteredAndSortedDocs.length)
                )}
              </strong>{' '}
              از{' '}
              <strong className="font-mono text-slate-900">
                {toPersianDigits(filteredAndSortedDocs.length)}
              </strong>{' '}
              سند
            </span>

            {/* Page Size Selector */}
            <div className="flex items-center gap-1.5 mr-2">
              <span className="text-slate-400">تعداد در صفحه:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold outline-none cursor-pointer"
              >
                <option value={10}>۱۰</option>
                <option value={25}>۲۵</option>
                <option value={50}>۵۰</option>
                <option value={100}>۱۰۰</option>
                <option value={-1}>همه اسناد</option>
              </select>
            </div>
          </div>

          {/* Pagination Navigation Buttons */}
          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(1)}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:pointer-events-none font-bold cursor-pointer"
                title="صفحه اول"
              >
                ابتدا
              </button>
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:pointer-events-none font-bold cursor-pointer"
              >
                قبلی
              </button>

              <div className="flex items-center gap-1 px-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum = currentPage - 2 + i;
                  if (pageNum < 1) pageNum += Math.abs(pageNum) + 1;
                  if (pageNum > totalPages) return null;
                  return (
                    <button
                      key={pageNum}
                      type="button"
                      onClick={() => setCurrentPage(pageNum)}
                      className={`w-7 h-7 rounded-lg text-xs font-mono font-bold flex items-center justify-center transition-colors cursor-pointer ${
                        currentPage === pageNum
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                      }`}
                    >
                      {toPersianDigits(pageNum)}
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:pointer-events-none font-bold cursor-pointer"
              >
                بعدی
              </button>
              <button
                type="button"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(totalPages)}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:pointer-events-none font-bold cursor-pointer"
                title="صفحه آخر"
              >
                انتها ({toPersianDigits(totalPages)})
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
