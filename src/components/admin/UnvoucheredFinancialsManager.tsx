import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  RefreshCw,
  Search,
  Filter,
  CheckCircle,
  AlertTriangle,
  FileText,
  HandCoins,
  CreditCard,
  Building2,
  Users,
  Eye,
  CheckSquare,
  Square,
  Sparkles,
  ArrowUpDown,
  ShieldCheck,
  X,
  ChevronLeft,
  Calendar,
  DollarSign
} from 'lucide-react';
import {
  scanUnvoucheredFinancials,
  buildVoucherJournalPreview,
  issueVoucherForItem,
  issueVouchersBatch,
  UnvoucheredItem,
  UnvoucheredAuditResult
} from '../../services/financialAuditService';
import { formatPrice } from '../../utils/format';

interface UnvoucheredFinancialsManagerProps {
  showNotification: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
  storeSettings?: any;
  onVoucherCreated?: () => void;
}

export default function UnvoucheredFinancialsManager({
  showNotification,
  storeSettings,
  onVoucherCreated
}: UnvoucheredFinancialsManagerProps) {
  const [data, setData] = useState<UnvoucheredAuditResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Action states
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [batchProcessing, setBatchProcessing] = useState(false);
  const [batchProgress, setBatchProgress] = useState<{ current: number; total: number; title: string }>({
    current: 0,
    total: 0,
    title: ''
  });

  // Preview Modal
  const [previewItem, setPreviewItem] = useState<UnvoucheredItem | null>(null);
  const [previewJournal, setPreviewJournal] = useState<any | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  const currency = storeSettings?.currency || 'تومان';

  const loadData = async () => {
    setLoading(true);
    setSelectedIds(new Set());
    try {
      const res = await scanUnvoucheredFinancials();
      setData(res);
    } catch (err: any) {
      console.error(err);
      showNotification('خطا در بررسی اسناد مالی سیستم', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredItems = useMemo(() => {
    if (!data?.items) return [];
    return data.items.filter((item) => {
      const matchCat = selectedCategory === 'all' || item.category === selectedCategory;
      const term = searchTerm.trim().toLowerCase();
      const matchSearch =
        !term ||
        item.title.toLowerCase().includes(term) ||
        (item.subTitle && item.subTitle.toLowerCase().includes(term)) ||
        (item.personName && item.personName.toLowerCase().includes(term)) ||
        item.amount.toString().includes(term) ||
        item.date.includes(term);
      return matchCat && matchSearch;
    });
  }, [data, selectedCategory, searchTerm]);

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredItems.length && filteredItems.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredItems.map((i) => i.id)));
    }
  };

  const toggleSelectItem = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const handleQuickIssue = async (item: UnvoucheredItem) => {
    setProcessingId(item.id);
    try {
      await issueVoucherForItem(item);
      showNotification(`سند حسابداری "${item.title}" با موفقیت صادر و ثبت شد.`, 'success');
      if (onVoucherCreated) onVoucherCreated();
      await loadData();
    } catch (err: any) {
      console.error(err);
      showNotification(`خطا در صدور سند: ${err.message || 'خطای ناشناخته'}`, 'error');
    } finally {
      setProcessingId(null);
    }
  };

  const handleOpenPreview = async (item: UnvoucheredItem) => {
    setPreviewItem(item);
    setLoadingPreview(true);
    try {
      const journal = await buildVoucherJournalPreview(item);
      setPreviewJournal(journal);
    } catch (err: any) {
      console.error(err);
      showNotification('خطا در استخراج پیش‌نمایش آرتیکل‌های سند', 'error');
      setPreviewItem(null);
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleConfirmPreviewVoucher = async () => {
    if (!previewItem) return;
    setProcessingId(previewItem.id);
    try {
      await issueVoucherForItem(previewItem);
      showNotification(`سند حسابداری "${previewItem.title}" با موفقیت صادر گردید.`, 'success');
      setPreviewItem(null);
      setPreviewJournal(null);
      if (onVoucherCreated) onVoucherCreated();
      await loadData();
    } catch (err: any) {
      console.error(err);
      showNotification(`خطا در صدور سند: ${err.message || 'خطای نامشخص'}`, 'error');
    } finally {
      setProcessingId(null);
    }
  };

  const handleBatchIssueSelected = async () => {
    if (selectedIds.size === 0) {
      showNotification('لطفاً حداقل یک مورد را برای صدور سند انتخاب نمایید.', 'warning');
      return;
    }

    const targetItems = filteredItems.filter((i) => selectedIds.has(i.id));
    if (!window.confirm(`آیا از صدور اتوماتیک سند حسابداری برای ${targetItems.length} مورد انتخاب‌شده اطمینان دارید؟`)) {
      return;
    }

    setBatchProcessing(true);
    setBatchProgress({ current: 0, total: targetItems.length, title: '' });

    try {
      const res = await issueVouchersBatch(targetItems, (current, total, title) => {
        setBatchProgress({ current, total, title });
      });

      if (res.failureCount === 0) {
        showNotification(`${res.successCount} سند حسابداری با موفقیت صادر و ثبت شد.`, 'success');
      } else {
        showNotification(
          `${res.successCount} سند با موفقیت صادر شد و ${res.failureCount} مورد با خطا مواجه گردید.`,
          'warning'
        );
      }
      if (onVoucherCreated) onVoucherCreated();
      await loadData();
    } catch (err: any) {
      console.error(err);
      showNotification('خطا در فرآیند صدور گروهی اسناد', 'error');
    } finally {
      setBatchProcessing(false);
    }
  };

  const handleIssueAllCurrentCategory = async () => {
    if (filteredItems.length === 0) return;
    if (!window.confirm(`آیا از صدور خودکار سند برای تمام ${filteredItems.length} مورد این بخش اطمینان دارید؟`)) {
      return;
    }

    setBatchProcessing(true);
    setBatchProgress({ current: 0, total: filteredItems.length, title: '' });

    try {
      const res = await issueVouchersBatch(filteredItems, (current, total, title) => {
        setBatchProgress({ current, total, title });
      });

      if (res.failureCount === 0) {
        showNotification(`تمام ${res.successCount} سند حسابداری با موفقیت صادر گردید.`, 'success');
      } else {
        showNotification(
          `${res.successCount} سند صادر شد و ${res.failureCount} مورد به دلیل نقص حساب معین متوقف شد.`,
          'warning'
        );
      }
      if (onVoucherCreated) onVoucherCreated();
      await loadData();
    } catch (err: any) {
      console.error(err);
      showNotification('خطا در صدور همگانی اسناد', 'error');
    } finally {
      setBatchProcessing(false);
    }
  };

  const categories = [
    { id: 'all', label: 'همه موارد', icon: Filter, count: data?.counts.all || 0 },
    { id: 'transaction', label: 'دریافت و پرداخت', icon: HandCoins, count: data?.counts.transaction || 0 },
    { id: 'invoice', label: 'فاکتورها', icon: FileText, count: data?.counts.invoice || 0 },
    { id: 'payroll', label: 'حقوق و دستمزد', icon: Users, count: data?.counts.payroll || 0 },
    { id: 'check', label: 'چک و بانک', icon: CreditCard, count: data?.counts.check || 0 },
    { id: 'loan', label: 'وام و تسهیلات', icon: Building2, count: data?.counts.loan || 0 },
    { id: 'installment', label: 'اقساط', icon: Calendar, count: data?.counts.installment || 0 },
  ];

  return (
    <div className="space-y-6 text-right" dir="rtl">
      {/* Header & Controls */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-3 mb-1.5">
            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-2xl border border-indigo-100">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900">عیب‌یابی اسناد مالی فاقد سند حسابداری</h2>
              <p className="text-xs font-semibold text-slate-500 mt-0.5">
                شناسایی و صدور مکانیزه اسناد حسابداری برای تمامی دریافت‌ها، پرداخت‌ها، فاکتورها، حقوق، چک‌ها و اقساط
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
          <button
            onClick={loadData}
            disabled={loading || batchProcessing}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 bg-slate-50 hover:bg-slate-100 font-bold text-sm transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-indigo-600' : ''}`} />
            <span>بررسی مجدد</span>
          </button>

          {filteredItems.length > 0 && (
            <>
              <button
                onClick={handleBatchIssueSelected}
                disabled={selectedIds.size === 0 || batchProcessing}
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-sm transition-colors disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed"
              >
                <Sparkles className="w-4 h-4" />
                <span>صدور سند برای موارد انتخابی ({selectedIds.size})</span>
              </button>

              <button
                onClick={handleIssueAllCurrentCategory}
                disabled={batchProcessing}
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-sm transition-colors disabled:opacity-50"
              >
                <CheckCircle className="w-4 h-4" />
                <span>صدور خودکار تمام ({filteredItems.length}) مورد</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500">کل موارد فاقد سند</span>
            <span className="p-2 bg-rose-50 text-rose-600 rounded-xl">
              <AlertTriangle className="w-5 h-5" />
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-rose-600 font-mono">{data?.counts.all || 0}</span>
            <span className="text-xs font-bold text-slate-400">عملیات مالی</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500">ارزش کل ریالی معوقه</span>
            <span className="p-2 bg-amber-50 text-amber-600 rounded-xl">
              <DollarSign className="w-5 h-5" />
            </span>
          </div>
          <div className="flex items-baseline gap-1.5 overflow-hidden">
            <span className="text-xl font-black text-slate-800 font-mono truncate">
              {formatPrice(data?.amounts.all || 0)}
            </span>
            <span className="text-xs font-bold text-slate-400 shrink-0">{currency}</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500">دریافت و پرداخت / فاکتور</span>
            <span className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <HandCoins className="w-5 h-5" />
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-800 font-mono">
              {(data?.counts.transaction || 0) + (data?.counts.invoice || 0)}
            </span>
            <span className="text-xs font-bold text-slate-400">
              ({data?.counts.transaction || 0} دریافت/پرداخت + {data?.counts.invoice || 0} فاکتور)
            </span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500">حقوق، چک و اقساط</span>
            <span className="p-2 bg-purple-50 text-purple-600 rounded-xl">
              <CreditCard className="w-5 h-5" />
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-800 font-mono">
              {(data?.counts.payroll || 0) + (data?.counts.check || 0) + (data?.counts.loan || 0) + (data?.counts.installment || 0)}
            </span>
            <span className="text-xs font-bold text-slate-400">مورد نیازمند سند</span>
          </div>
        </div>
      </div>

      {/* Category Tabs & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        {/* Category Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
          {categories.map((cat) => {
            const Icon = cat.icon;
            const isActive = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => {
                  setSelectedCategory(cat.id);
                  setSelectedIds(new Set());
                }}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{cat.label}</span>
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${
                    isActive ? 'bg-indigo-800 text-indigo-100' : 'bg-white text-slate-600 border border-slate-200'
                  }`}
                >
                  {cat.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search input and selection action */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-slate-100">
          <div className="relative w-full sm:w-96">
            <Search className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="جستجو در شرح، شماره، طرف‌حساب یا مبلغ..."
              className="w-full pr-10 pl-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-indigo-500 focus:bg-white transition-colors"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-4 text-xs font-bold text-slate-500 w-full sm:w-auto justify-between sm:justify-end">
            <span>
              نمایش <span className="font-mono text-slate-800">{filteredItems.length}</span> از{' '}
              <span className="font-mono text-slate-800">{data?.items.length || 0}</span> مورد
            </span>
            {filteredItems.length > 0 && (
              <button
                onClick={toggleSelectAll}
                className="flex items-center gap-1.5 text-indigo-600 hover:text-indigo-800 transition"
              >
                {selectedIds.size === filteredItems.length ? (
                  <CheckSquare className="w-4 h-4" />
                ) : (
                  <Square className="w-4 h-4" />
                )}
                <span>انتخاب همه</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content: List or Empty State */}
      {loading ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center shadow-sm">
          <RefreshCw className="w-10 h-10 text-indigo-500 animate-spin mx-auto mb-4" />
          <h3 className="font-black text-slate-800 text-lg mb-1">در حال پویش تمامی عملیات‌های مالی...</h3>
          <p className="text-xs text-slate-500 font-semibold">
            بررسی تراکنش‌ها، فاکتورها، فیش‌های حقوقی، چک‌ها و اقساط در تطبیق با اسناد حسابداری
          </p>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="bg-white rounded-3xl border border-emerald-100 bg-emerald-50/40 p-12 text-center shadow-sm">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-sm">
            <CheckCircle className="w-8 h-8" />
          </div>
          <h3 className="font-black text-emerald-900 text-lg mb-1">تبریک! هیچ عملیات فاقد سندی در این بخش وجود ندارد</h3>
          <p className="text-xs text-emerald-700 font-bold max-w-md mx-auto">
            تمامی رویدادهای مالی این دسته‌بندی دارای سند حسابداری تراز در سیستم می‌باشند و دفاتر مالی کاملاً با عملیات منطبق هستند.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50/80 text-slate-500 font-bold border-b border-slate-200">
                <tr>
                  <th className="p-4 w-12 text-center">
                    <button onClick={toggleSelectAll} className="text-slate-500 hover:text-indigo-600">
                      {selectedIds.size === filteredItems.length ? (
                        <CheckSquare className="w-4 h-4 text-indigo-600" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>
                  </th>
                  <th className="p-4">نوع و دسته‌بندی</th>
                  <th className="p-4">شرح رویداد مالی</th>
                  <th className="p-4">طرف‌حساب</th>
                  <th className="p-4">تاریخ</th>
                  <th className="p-4 text-left">مبلغ رویداد</th>
                  <th className="p-4 text-center w-48">عملیات اصلاح</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredItems.map((item) => {
                  const isSelected = selectedIds.has(item.id);
                  const isBusy = processingId === item.id || batchProcessing;

                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isSelected ? 'bg-indigo-50/40' : ''
                      }`}
                    >
                      <td className="p-4 text-center">
                        <button
                          onClick={() => toggleSelectItem(item.id)}
                          className="text-slate-400 hover:text-indigo-600"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-indigo-600" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                      </td>

                      <td className="p-4">
                        <div className="flex flex-col gap-1">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-black border w-fit ${item.typeBadge.color}`}
                          >
                            {item.typeBadge.label}
                          </span>
                          <span className="text-[10px] font-bold text-slate-400">{item.categoryLabel}</span>
                        </div>
                      </td>

                      <td className="p-4">
                        <div className="font-black text-slate-800 text-xs mb-0.5">{item.title}</div>
                        {item.subTitle && (
                          <div className="text-[11px] font-semibold text-slate-400">{item.subTitle}</div>
                        )}
                        <div className="text-[10px] text-rose-500 font-semibold mt-0.5 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3 shrink-0" />
                          <span>{item.missingReason}</span>
                        </div>
                      </td>

                      <td className="p-4">
                        <span className="font-bold text-slate-700">{item.personName || '—'}</span>
                      </td>

                      <td className="p-4 font-mono text-slate-600 font-semibold">{item.date || '—'}</td>

                      <td className="p-4 text-left font-mono font-black text-slate-900 text-sm">
                        {formatPrice(item.amount)}{' '}
                        <span className="text-[10px] font-normal text-slate-500">{currency}</span>
                      </td>

                      <td className="p-4">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleOpenPreview(item)}
                            title="مشاهده آرتیکل‌های بدهکار و بستانکار پیشنهادی"
                            className="p-2 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors border border-slate-200"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => handleQuickIssue(item)}
                            disabled={isBusy}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs shadow-sm transition-colors disabled:opacity-50"
                          >
                            {isBusy && processingId === item.id ? (
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Sparkles className="w-3.5 h-3.5" />
                            )}
                            <span>صدور سند</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden divide-y divide-slate-100 p-3 space-y-3">
            {filteredItems.map((item) => {
              const isSelected = selectedIds.has(item.id);
              const isBusy = processingId === item.id || batchProcessing;

              return (
                <div
                  key={item.id}
                  className={`p-4 rounded-2xl border transition-all ${
                    isSelected ? 'bg-indigo-50/40 border-indigo-200' : 'bg-slate-50/50 border-slate-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleSelectItem(item.id)}
                        className="text-slate-400 hover:text-indigo-600"
                      >
                        {isSelected ? (
                          <CheckSquare className="w-4 h-4 text-indigo-600" />
                        ) : (
                          <Square className="w-4 h-4" />
                        )}
                      </button>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-black border ${item.typeBadge.color}`}
                      >
                        {item.typeBadge.label}
                      </span>
                    </div>
                    <span className="font-mono text-xs font-bold text-slate-500">{item.date}</span>
                  </div>

                  <div className="font-black text-slate-900 text-sm mb-1">{item.title}</div>
                  {item.subTitle && <div className="text-xs text-slate-500 mb-2">{item.subTitle}</div>}

                  <div className="flex justify-between items-center bg-white p-2.5 rounded-xl border border-slate-100 mb-3 text-xs">
                    <span className="text-slate-500 font-bold">طرف‌حساب: {item.personName || '—'}</span>
                    <span className="font-mono font-black text-slate-900">
                      {formatPrice(item.amount)} {currency}
                    </span>
                  </div>

                  <div className="text-[11px] text-rose-600 font-semibold mb-3 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3 shrink-0" />
                    <span>{item.missingReason}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleOpenPreview(item)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-white border border-slate-200 hover:bg-slate-100 rounded-xl text-xs font-bold text-slate-700 transition"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>پیش‌نمایش سند</span>
                    </button>
                    <button
                      onClick={() => handleQuickIssue(item)}
                      disabled={isBusy}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition disabled:opacity-50"
                    >
                      {isBusy && processingId === item.id ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Sparkles className="w-3.5 h-3.5" />
                      )}
                      <span>صدور سریع سند</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Batch Processing Overlay */}
      {batchProcessing && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full text-right shadow-2xl border border-slate-200">
            <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <RefreshCw className="w-6 h-6 animate-spin" />
            </div>
            <h3 className="text-lg font-black text-slate-800 text-center mb-1">
              در حال صدور خودکار اسناد حسابداری...
            </h3>
            <p className="text-xs font-bold text-slate-500 text-center mb-6">
              لطفاً تا اتمام صدور اسناد شکیبا باشید
            </p>

            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-xs font-bold text-slate-600">
                <span>
                  مورد {batchProgress.current} از {batchProgress.total}
                </span>
                <span className="font-mono">
                  {Math.round((batchProgress.current / (batchProgress.total || 1)) * 100)}%
                </span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                <div
                  className="bg-indigo-600 h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${Math.round((batchProgress.current / (batchProgress.total || 1)) * 100)}%`
                  }}
                />
              </div>
            </div>

            <div className="text-xs font-semibold text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100 truncate">
              {batchProgress.title || 'آماده‌سازی اطلاعات...'}
            </div>
          </div>
        </div>
      )}

      {/* Voucher Preview Modal */}
      <AnimatePresence>
        {previewItem && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden"
            >
              {/* Modal Header */}
              <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-900 text-base">پیش‌نمایش آرتیکل‌های سند حسابداری</h3>
                    <p className="text-xs text-slate-500 font-semibold">{previewItem.title}</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setPreviewItem(null);
                    setPreviewJournal(null);
                  }}
                  className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 overflow-y-auto space-y-4 flex-1">
                {loadingPreview || !previewJournal ? (
                  <div className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-indigo-500" />
                    <p className="text-xs font-bold">در حال محاسبه آرتیکل‌ها بر اساس کدینگ و سرفصل‌های حسابداری...</p>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs">
                      <div>
                        <span className="text-slate-400 font-bold block mb-0.5">شرح سند:</span>
                        <span className="font-bold text-slate-800">{previewJournal.description}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 font-bold block mb-0.5">تاریخ سند:</span>
                        <span className="font-mono font-bold text-slate-800">{previewJournal.date}</span>
                      </div>
                    </div>

                    <div className="border border-slate-200 rounded-2xl overflow-hidden">
                      <table className="w-full text-right text-xs">
                        <thead className="bg-slate-50 font-bold text-slate-500 border-b border-slate-200">
                          <tr>
                            <th className="p-3">کد حساب</th>
                            <th className="p-3">سرفصل معین / شرح آرتیکل</th>
                            <th className="p-3 text-left">بدهکار ({currency})</th>
                            <th className="p-3 text-left">بستانکار ({currency})</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {previewJournal.items?.map((it: any, idx: number) => (
                            <tr key={idx} className="hover:bg-slate-50/50">
                              <td className="p-3 font-mono font-bold text-indigo-600">{it.accountCode || '—'}</td>
                              <td className="p-3">
                                <div className="font-bold text-slate-800">{it.accountTitle}</div>
                                <div className="text-[11px] text-slate-500">{it.description}</div>
                              </td>
                              <td className="p-3 text-left font-mono font-bold text-slate-800">
                                {it.debit > 0 ? formatPrice(it.debit) : '۰'}
                              </td>
                              <td className="p-3 text-left font-mono font-bold text-slate-800">
                                {it.credit > 0 ? formatPrice(it.credit) : '۰'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="bg-slate-50/80 font-black text-xs border-t border-slate-200">
                          <tr>
                            <td colSpan={2} className="p-3 text-slate-700">
                              جمع کل (کنترل تراز سند)
                            </td>
                            <td className="p-3 text-left font-mono text-indigo-700">
                              {formatPrice(
                                previewJournal.items?.reduce((s: number, i: any) => s + (Number(i.debit) || 0), 0)
                              )}
                            </td>
                            <td className="p-3 text-left font-mono text-indigo-700">
                              {formatPrice(
                                previewJournal.items?.reduce((s: number, i: any) => s + (Number(i.credit) || 0), 0)
                              )}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>

                    <div className="flex items-center gap-2 p-3 bg-emerald-50 text-emerald-800 rounded-xl text-xs font-bold border border-emerald-200">
                      <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600" />
                      <span>
                        سند کاملاً تراز بوده و آماده ثبت قطعی در سرفصل‌های رسمی حسابداری و ترازنامه است.
                      </span>
                    </div>
                  </>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-4 border-t border-slate-100 flex items-center justify-end gap-2.5 bg-slate-50">
                <button
                  onClick={() => {
                    setPreviewItem(null);
                    setPreviewJournal(null);
                  }}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition"
                >
                  انصراف
                </button>
                <button
                  onClick={handleConfirmPreviewVoucher}
                  disabled={loadingPreview || processingId === previewItem.id}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm transition flex items-center gap-1.5 disabled:opacity-50"
                >
                  {processingId === previewItem.id ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5" />
                  )}
                  <span>تایید و صدور قطعی سند</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
