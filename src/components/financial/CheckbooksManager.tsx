import React, { useState, useEffect, useMemo } from 'react';
import { getAccounts } from '../../services/dataService';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, Building2, Edit2, Trash2, X, ChevronDown, Calendar, 
  Save, CheckCircle2, AlertCircle, FileText, ExternalLink, 
  Layers, RefreshCw, Search, ArrowRight, ShieldCheck 
} from 'lucide-react';
import CustomDatePicker from '../ui/CustomDatePicker';
const DatePicker = CustomDatePicker;
import persian from 'react-date-object/calendars/persian';
import persian_fa from 'react-date-object/locales/persian_fa';
import { 
  addCheckbook, 
  updateCheckbook, 
  deleteCheckbook, 
  getCheckbooks, 
  ensureCheckbookLeaves, 
  getIssuedChecks 
} from '../../services/accountingService';
import { convertToGregorian, formatDateDisplay } from '../../utils/format';

const toEnDigits = (val: any): string => {
  if (val === null || val === undefined) return '';
  return String(val).replace(/[۰-۹]/g, d => '0123456789'['۰۱۲۳۴۵۶۷۸۹'.indexOf(d)]).replace(/\D/g, '').trim();
};

export default function CheckbooksManager(props: any) {
  const { setIssuedCheckbookFilter, setActiveSubTab, storeSettings, showNotification } = props;

  const [localCheckbooks, setLocalCheckbooks] = useState<any[]>(props.checkbooks || []);
  const [localAccounts, setLocalAccounts] = useState<any[]>(props.accounts || []);
  const [allIssuedChecks, setAllIssuedChecks] = useState<any[]>([]);
  const [loadingChecks, setLoadingChecks] = useState(false);
  
  const checkbooks = props.checkbooks || localCheckbooks;
  const accounts = props.accounts || localAccounts;
  const setCheckbooks = props.setCheckbooks || setLocalCheckbooks;

  const notify = showNotification || ((msg: any, type?: string) => console.log(msg, type));

  const loadData = async () => {
    try {
      setLoadingChecks(true);
      const [cbs, accs, checks] = await Promise.all([
        getCheckbooks(),
        getAccounts(),
        getIssuedChecks()
      ]);
      setLocalCheckbooks(cbs || []);
      setLocalAccounts(accs || []);
      const checksList = Array.isArray(checks) ? checks : (checks?.data || []);
      setAllIssuedChecks(checksList);

      // Auto-backfill any checkbooks that have missing leaves
      if (Array.isArray(cbs) && cbs.length > 0) {
        const updatedChecks = await ensureCheckbookLeaves();
        if (updatedChecks && Array.isArray(updatedChecks)) {
          setAllIssuedChecks(updatedChecks);
        }
      }
    } catch (err) {
      console.error('Error loading checkbooks data:', err);
    } finally {
      setLoadingChecks(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const [isCheckbookModalOpen, setIsCheckbookModalOpen] = useState(false);
  const [editingCheckbookId, setEditingCheckbookId] = useState<string|number|null>(null);
  const [cbAccountId, setCbAccountId] = useState('');
  const [cbStart, setCbStart] = useState('');
  const [cbEnd, setCbEnd] = useState('');
  const [cbIssued, setCbIssued] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Leaves Explorer Modal State
  const [selectedCbForLeaves, setSelectedCbForLeaves] = useState<any | null>(null);
  const [leafSearchQuery, setLeafSearchQuery] = useState('');
  const [leafStatusFilter, setLeafStatusFilter] = useState<'all' | 'blank' | 'issued' | 'cashed' | 'bounced' | 'cancelled'>('all');
  const [isRegeneratingLeaves, setIsRegeneratingLeaves] = useState(false);

  const [confirmModalData, setConfirmModalData] = useState<{isOpen: boolean, title: string, message: string, onConfirm: () => void} | null>(null);

  // Real-time calculation of leaves in form
  const parsedStart = parseInt(toEnDigits(cbStart), 10);
  const parsedEnd = parseInt(toEnDigits(cbEnd), 10);
  const isValidRange = !isNaN(parsedStart) && !isNaN(parsedEnd) && parsedEnd >= parsedStart;
  const calculatedTotalLeaves = isValidRange ? (parsedEnd - parsedStart + 1) : 0;

  const handleOpenAddModal = () => {
    setEditingCheckbookId(null);
    setCbAccountId('');
    setCbStart('');
    setCbEnd('');
    setCbIssued('');
    setFormError('');
    setIsCheckbookModalOpen(true);
  };

  const editCheckbook = (cb: any) => {
    setEditingCheckbookId(cb.id);
    setCbAccountId(cb.accountId || '');
    setCbStart(cb.startNumber || '');
    setCbEnd(cb.endNumber || '');
    setCbIssued(cb.issuedDate || '');
    setFormError('');
    setIsCheckbookModalOpen(true);
  };

  const handleSaveCheckbook = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!cbAccountId) {
      setFormError('لطفاً حساب بانکی متصل را انتخاب نمایید.');
      return;
    }

    const cleanStart = toEnDigits(cbStart);
    const cleanEnd = toEnDigits(cbEnd);

    if (!cleanStart || isNaN(parsedStart)) {
      setFormError('شماره شروع برگه چک نامعتبر است.');
      return;
    }
    if (!cleanEnd || isNaN(parsedEnd)) {
      setFormError('شماره پایان برگه چک نامعتبر است.');
      return;
    }
    if (parsedEnd < parsedStart) {
      setFormError('شماره پایان برگه چک باید بزرگتر یا مساوی شماره شروع باشد.');
      return;
    }
    if (calculatedTotalLeaves > 500) {
      setFormError('تعداد برگه‌های دسته چک نمی‌تواند بیش از ۵۰۰ برگ باشد.');
      return;
    }

    const selectedAcc = accounts.find((a: any) => String(a.id) === String(cbAccountId));

    setConfirmModalData({
      isOpen: true,
      title: editingCheckbookId ? 'ویرایش دسته چک' : 'ثبت دسته چک',
      message: editingCheckbookId 
        ? `آیا از ویرایش دسته چک و تنظیم ${calculatedTotalLeaves} برگه اطمینان دارید؟` 
        : `آیا از ثبت دسته چک جدید با ${calculatedTotalLeaves} برگه از سریال ${cleanStart} تا ${cleanEnd} عهده بانک «${selectedAcc?.bankName || 'نامشخص'}» اطمینان دارید؟`,
      onConfirm: async () => {
        setConfirmModalData(null);
        setIsSubmitting(true);
        const payload = {
          accountId: cbAccountId,
          bankName: selectedAcc?.bankName || '',
          accountNumber: selectedAcc?.accountNumber || selectedAcc?.cardNumber || '',
          startNumber: cleanStart,
          endNumber: cleanEnd,
          totalLeaves: calculatedTotalLeaves,
          issuedDate: cbIssued ? convertToGregorian(cbIssued) : null
        };
        try {
          if (editingCheckbookId) {
            await updateCheckbook(editingCheckbookId.toString(), payload as any);
            notify('دسته چک با موفقیت ویرایش و برگه‌های آن به‌روزرسانی شدند', 'success');
          } else {
            await addCheckbook(payload as any);
            notify(`دسته چک با موفقیت افزوده شد و ${calculatedTotalLeaves} برگه چک آماده صدور ایجاد گردید`, 'success');
          }
          setIsCheckbookModalOpen(false);
          await loadData();
        } catch (error: any) {
          console.error('Error saving checkbook:', error);
          notify(error?.message || 'خطا در ذخیره دسته چک', 'error');
        } finally {
          setIsSubmitting(false);
        }
      }
    });
  };

  const deleteCb = async (cb: any) => {
    setConfirmModalData({
      isOpen: true,
      title: 'حذف دسته چک',
      message: `آیا از حذف دسته چک سریال ${cb.startNumber} تا ${cb.endNumber} عهده بانک «${cb.bankName || 'بانکی'}» مطمئن هستید؟ (برگه‌های صادر شده حفظ خواهند شد و برگه‌های سفید حذف می‌شوند)`,
      onConfirm: async () => {
        setConfirmModalData(null);
        try {
          await deleteCheckbook(cb.id.toString());
          notify('دسته چک با موفقیت حذف شد', 'success');
          await loadData();
          if (selectedCbForLeaves?.id === cb.id) {
            setSelectedCbForLeaves(null);
          }
        } catch (error: any) {
          console.error('Error deleting checkbook:', error);
          notify(error?.message || 'خطا در حذف دسته چک', 'error');
        }
      }
    });
  };

  const handleRegenerateLeaves = async (cbId: string) => {
    try {
      setIsRegeneratingLeaves(true);
      await ensureCheckbookLeaves(cbId);
      notify('برگه‌های دسته چک با موفقیت بررسی و کسری‌ها ایجاد شدند', 'success');
      await loadData();
    } catch (err: any) {
      notify(err?.message || 'خطا در بررسی و ایجاد برگه‌های دسته چک', 'error');
    } finally {
      setIsRegeneratingLeaves(false);
    }
  };

  // Leaves for selected checkbook in modal
  const selectedCbLeaves = useMemo(() => {
    if (!selectedCbForLeaves) return [];
    return allIssuedChecks
      .filter(c => String(c.checkbookId) === String(selectedCbForLeaves.id))
      .sort((a, b) => Number(a.checkNumber) - Number(b.checkNumber));
  }, [allIssuedChecks, selectedCbForLeaves]);

  const filteredLeaves = useMemo(() => {
    return selectedCbLeaves.filter(leaf => {
      if (leafSearchQuery.trim()) {
        const q = toEnDigits(leafSearchQuery.trim());
        if (!String(leaf.checkNumber).includes(q)) return false;
      }
      if (leafStatusFilter !== 'all') {
        const status = leaf.status || 'blank';
        if (leafStatusFilter === 'blank' && status !== 'blank') return false;
        if (leafStatusFilter === 'issued' && status !== 'issued') return false;
        if (leafStatusFilter === 'cashed' && status !== 'cashed') return false;
        if (leafStatusFilter === 'bounced' && status !== 'bounced') return false;
        if (leafStatusFilter === 'cancelled' && status !== 'cancelled') return false;
      }
      return true;
    });
  }, [selectedCbLeaves, leafSearchQuery, leafStatusFilter]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'issued':
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">صادر شده</span>;
      case 'cashed':
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">وصول شده (پاس شده)</span>;
      case 'bounced':
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">برگشت خورده</span>;
      case 'cancelled':
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-300">باطل شده</span>;
      case 'blank':
      default:
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-teal-50 text-teal-700 border border-teal-200">سفید (آماده صدور)</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top action header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
        <div>
          <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-indigo-600" />
            مدیریت دسته‌چک‌ها و برگه‌های چک پرداختنی
          </h2>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            تعریف دسته‌چک‌های بانکی، ایجاد خودکار برگه‌های چک سفید و نظارت بر وضعیت استفاده از آن‌ها در صدور چک
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            disabled={loadingChecks}
            className="p-2.5 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 border border-slate-200 rounded-xl transition-all"
            title="به‌روزرسانی و بارگذاری مجدد"
          >
            <RefreshCw className={`w-4 h-4 ${loadingChecks ? 'animate-spin text-indigo-600' : ''}`} />
          </button>
          <span className="text-xs font-bold text-slate-600 bg-slate-100 px-3.5 py-2 rounded-xl">
            تعداد دسته‌چک‌ها: {(checkbooks || []).length}
          </span>
          <button 
            onClick={handleOpenAddModal} 
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold flex items-center gap-2 shadow-sm shadow-indigo-200 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" /> تعریف دسته چک جدید
          </button>
        </div>
      </div>
      
      {/* Checkbooks Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {(checkbooks || []).map((cb: any) => {
            const bankAccount = accounts.find((a: any) => String(a.id) === String(cb.accountId));
            const bankName = bankAccount?.bankName || cb.bankName || 'حساب بانکی نامشخص';
            const accountNo = bankAccount?.accountNumber ? `حساب: ${bankAccount.accountNumber}` : (cb.accountNumber ? `حساب: ${cb.accountNumber}` : '');
            
            // Statistics for this checkbook
            const cbLeaves = allIssuedChecks.filter(c => String(c.checkbookId) === String(cb.id));
            const blankCount = cbLeaves.filter(c => !c.status || c.status === 'blank').length;
            const issuedCount = cbLeaves.filter(c => c.status === 'issued').length;
            const cashedCount = cbLeaves.filter(c => c.status === 'cashed').length;
            const totalLeavesCount = cb.totalLeaves || cbLeaves.length || 0;

            return (
              <div 
                key={cb.id} 
                className="border border-slate-200/80 rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all bg-white relative overflow-hidden group flex flex-col justify-between"
              >
                <div className="absolute top-0 right-0 left-0 h-1.5 bg-indigo-500"></div>
                
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="text-base font-black text-slate-800 flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold">
                        <Building2 className="w-4 h-4" />
                      </div>
                      <div>
                        <div>{bankName}</div>
                        {accountNo && <div className="text-[11px] font-mono text-slate-500 font-normal">{accountNo}</div>}
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 my-3 space-y-1.5 text-xs">
                    <div className="flex justify-between items-center text-slate-600">
                      <span>شماره شروع برگه:</span>
                      <span className="font-mono text-slate-900 font-bold">{cb.startNumber}</span>
                    </div>
                    <div className="flex justify-between items-center text-slate-600">
                      <span>شماره پایان برگه:</span>
                      <span className="font-mono text-slate-900 font-bold">{cb.endNumber}</span>
                    </div>
                    <div className="flex justify-between items-center text-slate-600 pt-1 border-t border-slate-200/60">
                      <span>کل برگه‌ها:</span>
                      <span className="font-bold text-indigo-700">{totalLeavesCount} برگ</span>
                    </div>
                  </div>

                  {/* Leaf status indicators */}
                  <div className="grid grid-cols-3 gap-2 mb-4 text-center">
                    <div className="bg-teal-50 border border-teal-100 p-2 rounded-xl">
                      <span className="block text-xs font-black text-teal-800">{blankCount}</span>
                      <span className="text-[10px] text-teal-600 font-bold">برگ سفید</span>
                    </div>
                    <div className="bg-blue-50 border border-blue-100 p-2 rounded-xl">
                      <span className="block text-xs font-black text-blue-800">{issuedCount}</span>
                      <span className="text-[10px] text-blue-600 font-bold">صادر شده</span>
                    </div>
                    <div className="bg-emerald-50 border border-emerald-100 p-2 rounded-xl">
                      <span className="block text-xs font-black text-emerald-800">{cashedCount}</span>
                      <span className="text-[10px] text-emerald-600 font-bold">وصول شده</span>
                    </div>
                  </div>

                  {cb.issuedDate && (
                    <div className="text-[11px] text-slate-400 mb-2 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      تاریخ دریافت دسته چک: {formatDateDisplay(cb.issuedDate, storeSettings?.calendarType)}
                    </div>
                  )}
                </div>

                {/* Footer action buttons */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <button 
                    onClick={() => {
                      setSelectedCbForLeaves(cb);
                      setLeafSearchQuery('');
                      setLeafStatusFilter('all');
                    }}
                    className="flex-1 py-2 px-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    title="مشاهده و مدیریت کلیه برگه‌های این دسته چک"
                  >
                    <Layers className="w-3.5 h-3.5" />
                    برگه‌های دسته چک ({cbLeaves.length})
                  </button>

                  <div className="flex items-center gap-1">
                    <button 
                      onClick={() => editCheckbook(cb)} 
                      className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors"
                      title="ویرایش مشخصات دسته چک"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => deleteCb(cb)} 
                      className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-colors"
                      title="حذف دسته چک"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

              </div>
            );
        })}

        {(checkbooks || []).length === 0 && (
          <div className="col-span-full py-16 flex flex-col items-center justify-center bg-white rounded-3xl border-2 border-dashed border-slate-200 p-8 text-center">
            <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-500 flex items-center justify-center mb-4">
              <Building2 className="w-8 h-8" />
            </div>
            <h3 className="text-base font-black text-slate-800 mb-1">هنوز هیچ دسته چکی ثبت نشده است</h3>
            <p className="text-xs text-slate-500 max-w-sm mb-6">
              با ثبت دسته چک متصل به حساب‌های بانکی، برگه‌های سفید چک به صورت خودکار ایجاد شده و در بخش صدور چک در دسترس قرار می‌گیرند.
            </p>
            <button 
              onClick={handleOpenAddModal} 
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold flex items-center gap-2 shadow-md shadow-indigo-200 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" /> ثبت اولین دسته‌چک
            </button>
          </div>
        )}
      </div>

      {/* MODAL 1: Add / Edit Checkbook */}
      <AnimatePresence>
        {isCheckbookModalOpen && (
          <div key="checkbook-form-modal" className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs" dir="rtl">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} 
              animate={{ opacity: 1, scale: 1 }} 
              exit={{ opacity: 0, scale: 0.95 }} 
              className="bg-white rounded-3xl w-full max-w-lg p-6 shadow-2xl border border-slate-100"
            >
              <div className="flex justify-between items-center mb-5 border-b pb-4 border-slate-100">
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-indigo-600" />
                  {editingCheckbookId ? 'ویرایش اطلاعات دسته چک' : 'ثبت و تعریف دسته چک جدید'}
                </h3>
                <button 
                  onClick={() => setIsCheckbookModalOpen(false)} 
                  className="text-slate-400 hover:text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-full p-2 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <form onSubmit={handleSaveCheckbook} className="space-y-4">
                {formError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-bold flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-4">
                  <div>
                    <label className="block text-xs font-black text-slate-700 mb-2 flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-indigo-500" />
                      حساب بانکی متصل <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <select 
                        required 
                        value={cbAccountId} 
                        onChange={e => {
                          setCbAccountId(e.target.value);
                          if (formError) setFormError('');
                        }} 
                        className="w-full border border-slate-200 bg-white rounded-xl px-4 py-2.5 text-sm appearance-none outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-700 font-bold shadow-xs"
                      >
                        <option value="">انتخاب حساب بانکی ...</option>
                        {(accounts || []).map((a: any, idx: number) => (
                          <option key={a.id ? `cbm-acc-${a.id}-${idx}` : `cbm-acc-idx-${idx}`} value={a.id}>
                            {a.bankName} - {a.branchName ? `شعبه ${a.branchName} - ` : ''} {a.accountNumber ? `حساب ${a.accountNumber}` : a.cardNumber}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <label className="block text-xs font-black text-slate-700 mb-2">شماره شروع برگه چک <span className="text-rose-500">*</span></label>
                    <input 
                      required 
                      type="text" 
                      value={cbStart} 
                      onChange={e => {
                        setCbStart(toEnDigits(e.target.value));
                        if (formError) setFormError('');
                      }} 
                      className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-mono text-center outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all bg-white font-bold" 
                      dir="ltr" 
                      placeholder="1001" 
                    />
                  </div>
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <label className="block text-xs font-black text-slate-700 mb-2">شماره پایان برگه چک <span className="text-rose-500">*</span></label>
                    <input 
                      required 
                      type="text" 
                      value={cbEnd} 
                      onChange={e => {
                        setCbEnd(toEnDigits(e.target.value));
                        if (formError) setFormError('');
                      }} 
                      className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-mono text-center outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all bg-white font-bold" 
                      dir="ltr" 
                      placeholder="1050" 
                    />
                  </div>
                </div>

                {/* Real-time Calculation Badge */}
                {cbStart && cbEnd && (
                  <div className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-between ${
                    isValidRange 
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                      : 'bg-rose-50 border-rose-200 text-rose-700'
                  }`}>
                    {isValidRange ? (
                      <>
                        <span className="flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          تعداد برگه‌های محاسبه شده:
                        </span>
                        <span className="font-mono text-sm font-black">{calculatedTotalLeaves} برگه چک</span>
                      </>
                    ) : (
                      <span className="flex items-center gap-1.5">
                        <AlertCircle className="w-4 h-4 text-rose-500" />
                        شماره پایان باید بزرگتر از شماره شروع باشد
                      </span>
                    )}
                  </div>
                )}
                
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <label className="block text-xs font-black text-slate-700 mb-2 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                    تاریخ دریافت دسته چک
                  </label>
                  <div className="relative">
                     <DatePicker
                       value={cbIssued}
                       onChange={(d: any) => setCbIssued((d ? convertToGregorian(d) : ""))}
                       calendar={storeSettings?.calendarType === 'gregorian' ? undefined : persian}
                       locale={storeSettings?.calendarType === 'gregorian' ? undefined : persian_fa}
                       calendarPosition="bottom-right"
                       inputClass="w-full border border-slate-200 bg-white rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-700 font-bold shadow-xs"
                       placeholder="انتخاب تاریخ دریافت..."
                     />
                  </div>
                </div>
              
                <div className="pt-4 flex items-center justify-end gap-3 mt-4 border-t border-slate-100">
                  <button 
                    type="button" 
                    onClick={() => setIsCheckbookModalOpen(false)} 
                    className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-bold transition-colors cursor-pointer"
                  >
                    انصراف
                  </button>
                  <button 
                    disabled={isSubmitting || !isValidRange} 
                    type="submit" 
                    className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white rounded-xl text-sm font-bold flex items-center gap-2 shadow-md shadow-indigo-200 transition-all cursor-pointer"
                  >
                    {isSubmitting ? (
                       <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                       <Save className="w-4 h-4" />
                    )}
                    {editingCheckbookId ? 'ذخیره تغییرات' : 'ثبت و ایجاد برگه‌ها'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 2: Leaves Explorer Modal */}
      <AnimatePresence>
        {selectedCbForLeaves && (
          <div key="leaves-explorer-modal" className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs" dir="rtl">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} 
              animate={{ opacity: 1, scale: 1 }} 
              exit={{ opacity: 0, scale: 0.95 }} 
              className="bg-white rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl border border-slate-100 overflow-hidden"
            >
              {/* Header */}
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                    <Layers className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-800">
                      برگه‌های دسته چک عهده {selectedCbForLeaves.bankName || 'بانک'}
                    </h3>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">
                      سریال {selectedCbForLeaves.startNumber} تا {selectedCbForLeaves.endNumber} ({selectedCbLeaves.length} برگه تعریف شده)
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => handleRegenerateLeaves(selectedCbForLeaves.id)}
                    disabled={isRegeneratingLeaves}
                    className="px-3 py-1.5 text-xs font-bold text-indigo-600 hover:bg-indigo-50 border border-indigo-200 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                    title="بررسی و تولید هرگونه برگه‌ چک جاافتاده یا کسری"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isRegeneratingLeaves ? 'animate-spin' : ''}`} />
                    همگام‌سازی برگه‌ها
                  </button>
                  <button 
                    onClick={() => setSelectedCbForLeaves(null)}
                    className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Filter and Search Bar */}
              <div className="p-4 bg-white border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
                  {[
                    { id: 'all', label: `همه (${selectedCbLeaves.length})` },
                    { id: 'blank', label: `سفید (${selectedCbLeaves.filter(l => !l.status || l.status === 'blank').length})` },
                    { id: 'issued', label: `صادر شده (${selectedCbLeaves.filter(l => l.status === 'issued').length})` },
                    { id: 'cashed', label: `وصول شده (${selectedCbLeaves.filter(l => l.status === 'cashed').length})` },
                    { id: 'bounced', label: `برگشتی (${selectedCbLeaves.filter(l => l.status === 'bounced').length})` },
                    { id: 'cancelled', label: `باطل شده (${selectedCbLeaves.filter(l => l.status === 'cancelled').length})` },
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setLeafStatusFilter(tab.id as any)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                        leafStatusFilter === tab.id
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                <div className="relative w-full sm:w-64">
                  <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={leafSearchQuery}
                    onChange={e => setLeafSearchQuery(e.target.value)}
                    placeholder="جستجوی شماره سریال..."
                    className="w-full pr-9 pl-3 py-1.5 text-xs font-mono border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  />
                </div>
              </div>

              {/* Leaves List / Grid */}
              <div className="p-6 overflow-y-auto flex-1 max-h-[60vh] bg-slate-50/50">
                {filteredLeaves.length === 0 ? (
                  <div className="py-12 text-center">
                    <p className="text-slate-500 text-sm font-bold">هیچ برگه‌ای با این مشخصات یافت نشد.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {filteredLeaves.map((leaf: any) => {
                      const isBlank = !leaf.status || leaf.status === 'blank';
                      return (
                        <div 
                          key={leaf.id} 
                          className={`p-3.5 rounded-2xl border transition-all flex flex-col justify-between ${
                            isBlank 
                              ? 'bg-white border-slate-200/80 hover:border-teal-300 hover:shadow-xs' 
                              : leaf.status === 'issued'
                              ? 'bg-blue-50/40 border-blue-200 hover:shadow-xs'
                              : leaf.status === 'cashed'
                              ? 'bg-emerald-50/40 border-emerald-200 hover:shadow-xs'
                              : leaf.status === 'bounced'
                              ? 'bg-rose-50/40 border-rose-200 hover:shadow-xs'
                              : 'bg-slate-100 border-slate-200'
                          }`}
                        >
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs font-mono font-black text-slate-800">
                                #{leaf.checkNumber}
                              </span>
                              {getStatusBadge(leaf.status)}
                            </div>

                            {!isBlank && leaf.amount > 0 && (
                              <div className="text-xs font-bold text-slate-700 mb-1">
                                مبلغ: {Number(leaf.amount).toLocaleString()} {storeSettings?.currency || 'تومان'}
                              </div>
                            )}

                            {!isBlank && leaf.dueDate && (
                              <div className="text-[11px] text-slate-500 mb-1">
                                سررسید: {formatDateDisplay(leaf.dueDate, storeSettings?.calendarType)}
                              </div>
                            )}

                            {!isBlank && leaf.payeeName && (
                              <div className="text-[11px] text-slate-600 truncate">
                                در وجه: {leaf.payeeName}
                              </div>
                            )}
                          </div>

                          {/* Action button */}
                          <div className="mt-3 pt-2.5 border-t border-slate-200/50 flex items-center justify-end">
                            {isBlank ? (
                              <a
                                href={`/issue_check?checkbookId=${selectedCbForLeaves.id}&checkLeafId=${leaf.id}&checkNumber=${leaf.checkNumber}`}
                                onClick={(e) => {
                                  // If setActiveSubTab is available (e.g. within CheckManagement)
                                  if (setActiveSubTab && setIssuedCheckbookFilter) {
                                    e.preventDefault();
                                    setIssuedCheckbookFilter(selectedCbForLeaves.id.toString());
                                    setActiveSubTab('issued_checks');
                                    setSelectedCbForLeaves(null);
                                  }
                                }}
                                className="w-full py-1.5 px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                              >
                                صدور این برگه چک
                                <ArrowRight className="w-3.5 h-3.5" />
                              </a>
                            ) : (
                              <span className="text-[10px] text-slate-400 font-bold">
                                استفاده شده
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-4 border-t border-slate-100 bg-white flex items-center justify-between">
                <span className="text-xs text-slate-500 font-medium">
                  {selectedCbLeaves.filter(l => !l.status || l.status === 'blank').length} برگه سفید آماده صدور چک
                </span>
                <button 
                  onClick={() => setSelectedCbForLeaves(null)}
                  className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  بستن
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {confirmModalData?.isOpen && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-[100] flex items-center justify-center p-4 print:hidden">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} 
              animate={{ opacity: 1, scale: 1 }} 
              exit={{ opacity: 0, scale: 0.95 }} 
              className="bg-white rounded-3xl shadow-xl border border-slate-200 p-8 max-w-sm w-full" 
              dir="rtl"
            >
              <h3 className="text-lg font-black text-slate-800 mb-3">{confirmModalData.title}</h3>
              <p className="text-slate-600 mb-6 text-sm font-medium leading-relaxed">{confirmModalData.message}</p>
              <div className="flex justify-end gap-3">
                <button 
                  onClick={() => setConfirmModalData(null)} 
                  className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold text-sm hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  انصراف
                </button>
                <button 
                  onClick={confirmModalData.onConfirm} 
                  disabled={isSubmitting} 
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 transition-colors flex items-center gap-2 cursor-pointer"
                >
                  {isSubmitting ? 'در حال ثبت...' : 'بله، تایید میکنم'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
