import React, { useState, useEffect, useMemo } from 'react';
import { getAccounts, getPersons } from '../../services/dataService';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, Building2, Edit2, Trash2, X, ChevronDown, Calendar, 
  Save, CheckCircle2, AlertCircle, FileText, ExternalLink, 
  Layers, RefreshCw, Search, ArrowRight, ShieldCheck, Smartphone, 
  Check, Edit3, ArrowLeft, Eye, Clock, Wallet, CheckSquare
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
  getIssuedChecks,
  updateIssuedCheck 
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
  const [persons, setPersons] = useState<any[]>([]);
  const [loadingChecks, setLoadingChecks] = useState(false);
  
  const checkbooks = props.checkbooks || localCheckbooks;
  const accounts = props.accounts || localAccounts;
  const setCheckbooks = props.setCheckbooks || setLocalCheckbooks;

  const notify = showNotification || ((msg: any, type?: string) => console.log(msg, type));

  const loadData = async () => {
    try {
      setLoadingChecks(true);
      const [cbs, accs, checks, ps] = await Promise.all([
        getCheckbooks(),
        getAccounts(),
        getIssuedChecks(),
        getPersons().catch(() => [])
      ]);
      setLocalCheckbooks(cbs || []);
      setLocalAccounts(accs || []);
      setPersons(ps || []);
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

  // Checkbook Add / Edit Form State
  const [isCheckbookModalOpen, setIsCheckbookModalOpen] = useState(false);
  const [editingCheckbookId, setEditingCheckbookId] = useState<string|number|null>(null);
  const [cbAccountId, setCbAccountId] = useState('');
  const [cbType, setCbType] = useState<'paper' | 'digital'>('paper');
  const [cbStart, setCbStart] = useState('');
  const [cbEnd, setCbEnd] = useState('');
  const [cbIssued, setCbIssued] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Dedicated Checkbook Card View Mode (کارت دسته‌چک)
  const [selectedCbForCard, setSelectedCbForCard] = useState<any | null>(null);

  // Leaves Filters & Search State
  const [leafSearchQuery, setLeafSearchQuery] = useState('');
  const [leafStatusFilter, setLeafStatusFilter] = useState<'all' | 'blank' | 'issued' | 'accepted' | 'cashed' | 'bounced' | 'cancelled'>('all');
  const [isRegeneratingLeaves, setIsRegeneratingLeaves] = useState(false);

  // Leaf Edit Modal State
  const [editingLeaf, setEditingLeaf] = useState<any | null>(null);
  const [leafFormData, setLeafFormData] = useState<any>({});
  const [isSavingLeaf, setIsSavingLeaf] = useState(false);
  const [leafFormError, setLeafFormError] = useState('');

  const [confirmModalData, setConfirmModalData] = useState<{isOpen: boolean, title: string, message: string, onConfirm: () => void} | null>(null);

  // Real-time calculation of leaves in form
  const parsedStart = parseInt(toEnDigits(cbStart), 10);
  const parsedEnd = parseInt(toEnDigits(cbEnd), 10);
  const isValidRange = !isNaN(parsedStart) && !isNaN(parsedEnd) && parsedEnd >= parsedStart;
  const calculatedTotalLeaves = isValidRange ? (parsedEnd - parsedStart + 1) : 0;

  const handleOpenAddModal = () => {
    setEditingCheckbookId(null);
    setCbAccountId('');
    setCbType('paper');
    setCbStart('');
    setCbEnd('');
    setCbIssued('');
    setFormError('');
    setIsCheckbookModalOpen(true);
  };

  const editCheckbook = (cb: any) => {
    setEditingCheckbookId(cb.id);
    setCbAccountId(cb.accountId || cb.account_id || '');
    setCbType(cb.type === 'digital' || cb.isDigital ? 'digital' : 'paper');
    setCbStart(cb.startNumber || cb.start_number || '');
    setCbEnd(cb.endNumber || cb.end_number || '');
    setCbIssued(cb.issuedDate || cb.issued_date || '');
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
    const typeLabel = cbType === 'digital' ? 'امن دیجیتال (چکاد)' : 'سنتی کاغذی (صیاد)';

    setConfirmModalData({
      isOpen: true,
      title: editingCheckbookId ? 'ویرایش دسته چک' : 'ثبت دسته چک',
      message: editingCheckbookId 
        ? `آیا از ویرایش دسته چک (${typeLabel}) و تنظیم ${calculatedTotalLeaves} برگه اطمینان دارید؟` 
        : `آیا از ثبت دسته چک جدید ${typeLabel} با ${calculatedTotalLeaves} برگه از سریال ${cleanStart} تا ${cleanEnd} عهده بانک «${selectedAcc?.bankName || 'نامشخص'}» اطمینان دارید؟`,
      onConfirm: async () => {
        setConfirmModalData(null);
        setIsSubmitting(true);
        const payload = {
          accountId: cbAccountId,
          account_id: cbAccountId,
          bankName: selectedAcc?.bankName || selectedAcc?.title || '',
          bank_name: selectedAcc?.bankName || selectedAcc?.title || '',
          accountNumber: selectedAcc?.accountNumber || selectedAcc?.cardNumber || '',
          account_number: selectedAcc?.accountNumber || selectedAcc?.cardNumber || '',
          type: cbType,
          isDigital: cbType === 'digital',
          startNumber: cleanStart,
          start_number: cleanStart,
          endNumber: cleanEnd,
          end_number: cleanEnd,
          totalLeaves: calculatedTotalLeaves,
          total_leaves: calculatedTotalLeaves,
          issuedDate: cbIssued ? convertToGregorian(cbIssued) : null,
          issued_date: cbIssued ? convertToGregorian(cbIssued) : null
        };
        try {
          if (editingCheckbookId) {
            await updateCheckbook(editingCheckbookId.toString(), payload as any);
            notify('دسته چک با موفقیت ویرایش و برگه‌های آن به‌روزرسانی شدند', 'success');
          } else {
            await addCheckbook(payload as any);
            notify(`دسته چک ${typeLabel} با موفقیت افزوده شد و ${calculatedTotalLeaves} برگه چک آماده صدور ایجاد گردید`, 'success');
          }
          setIsCheckbookModalOpen(false);
          await loadData();
          if (selectedCbForCard && String(selectedCbForCard.id) === String(editingCheckbookId)) {
            setSelectedCbForCard({ ...selectedCbForCard, ...payload });
          }
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
    const cbLeaves = allIssuedChecks.filter(c => String(c.checkbookId) === String(cb.id));
    const blankCount = cbLeaves.filter(c => !c.status || c.status === 'blank').length;
    const usedCount = cbLeaves.filter(c => c.status && c.status !== 'blank').length;
    const bankTitle = cb.bankName || cb.bank_name || 'بانک';
    const startNo = cb.startNumber || cb.start_number || '';
    const endNo = cb.endNumber || cb.end_number || '';

    let message = '';
    if (usedCount === 0) {
      message = `این دسته‌چک (از سریال ${startNo} تا ${endNo} عهده بانک «${bankTitle}») دارای ${blankCount} برگه سفید بدون استفاده است. با تایید شما، این دسته‌چک و تمامی ${blankCount} برگه سفید آن به صورت کامل از سیستم حذف خواهند شد. آیا اطمینان دارید؟`;
    } else {
      message = `این دسته‌چک دارای ${usedCount} برگه صادرشده و ${blankCount} برگه سفید بدون استفاده است. با تایید شما، تمامی ${blankCount} برگه سفید بدون استفاده حذف شده و دسته‌چک بایگانی می‌شود (برگه‌های صادرشده برای حفظ اسناد و سوابق مالی باقی می‌مانند). آیا اطمینارید؟`;
    }

    setConfirmModalData({
      isOpen: true,
      title: 'حذف دسته‌چک',
      message,
      onConfirm: async () => {
        setConfirmModalData(null);
        try {
          await deleteCheckbook(cb.id.toString());
          notify('دسته‌چک و برگه‌های بدون استفاده با موفقیت حذف شدند', 'success');
          await loadData();
          if (selectedCbForCard?.id === cb.id) {
            setSelectedCbForCard(null);
          }
        } catch (error: any) {
          console.error('Error deleting checkbook:', error);
          notify(error?.message || 'خطا در حذف دسته‌چک', 'error');
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

  // Leaves for selected checkbook in dedicated Card View
  const activeCheckbookLeaves = useMemo(() => {
    if (!selectedCbForCard) return [];
    return allIssuedChecks
      .filter(c => String(c.checkbookId) === String(selectedCbForCard.id))
      .sort((a, b) => Number(a.checkNumber) - Number(b.checkNumber));
  }, [allIssuedChecks, selectedCbForCard]);

  const filteredCardLeaves = useMemo(() => {
    return activeCheckbookLeaves.filter(leaf => {
      if (leafSearchQuery.trim()) {
        const q = toEnDigits(leafSearchQuery.trim());
        const rawQ = leafSearchQuery.trim().toLowerCase();
        const matchesNum = String(leaf.checkNumber).includes(q) || String(leaf.checkNumber).includes(rawQ);
        const matchesSayad = String(leaf.sayadId || '').includes(q) || String(leaf.sayadId || '').includes(rawQ);
        const matchesPayee = String(leaf.payeeName || '').toLowerCase().includes(rawQ);
        const matchesReason = String(leaf.reason || '').toLowerCase().includes(rawQ);
        if (!matchesNum && !matchesSayad && !matchesPayee && !matchesReason) return false;
      }
      if (leafStatusFilter !== 'all') {
        const status = leaf.status || 'blank';
        if (leafStatusFilter === 'blank' && status !== 'blank') return false;
        if (leafStatusFilter === 'issued' && status !== 'issued') return false;
        if (leafStatusFilter === 'accepted' && status !== 'accepted') return false;
        if (leafStatusFilter === 'cashed' && status !== 'cashed') return false;
        if (leafStatusFilter === 'bounced' && status !== 'bounced') return false;
        if (leafStatusFilter === 'cancelled' && status !== 'cancelled') return false;
      }
      return true;
    });
  }, [activeCheckbookLeaves, leafSearchQuery, leafStatusFilter]);

  // Leaf Edit Handlers
  const handleOpenEditLeafModal = (leaf: any) => {
    setLeafFormError('');
    setEditingLeaf(leaf);
    setLeafFormData({
      checkNumber: leaf.checkNumber || '',
      sayadId: leaf.sayadId && leaf.sayadId !== '0000000000000000' ? leaf.sayadId : '',
      status: leaf.status || 'blank',
      amount: leaf.amount ? Number(leaf.amount) : '',
      payeeId: leaf.payeeId || '',
      payeeName: leaf.payeeName || '',
      issueDate: leaf.issueDate ? String(leaf.issueDate).split('T')[0] : '',
      dueDate: leaf.dueDate ? String(leaf.dueDate).split('T')[0] : '',
      reason: leaf.reason || '',
      description: leaf.description || ''
    });
  };

  const handleSaveLeafEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLeafFormError('');

    if (!editingLeaf) return;

    const cleanSayad = toEnDigits(leafFormData.sayadId);
    if (cleanSayad && cleanSayad.length !== 16) {
      setLeafFormError('شناسه صیادی باید دقیقاً ۱۶ رقم عددی باشد.');
      return;
    }

    const numericAmount = leafFormData.amount ? Number(toEnDigits(leafFormData.amount)) : 0;
    if (leafFormData.status !== 'blank' && leafFormData.status !== 'cancelled' && numericAmount <= 0) {
      setLeafFormError('برای برگه‌های صادرشده یا پاس شده، مبلغ چک باید بزرگتر از صفر باشد.');
      return;
    }

    setIsSavingLeaf(true);
    try {
      const selectedPerson = persons.find(p => String(p.id) === String(leafFormData.payeeId));
      const resolvedPayeeName = leafFormData.payeeName || selectedPerson?.name || '';

      const updatedPayload = {
        ...editingLeaf,
        checkNumber: toEnDigits(leafFormData.checkNumber) || editingLeaf.checkNumber,
        sayadId: cleanSayad || '0000000000000000',
        status: leafFormData.status || 'blank',
        amount: numericAmount,
        payeeId: leafFormData.payeeId || null,
        payeeName: resolvedPayeeName,
        issueDate: leafFormData.issueDate ? convertToGregorian(leafFormData.issueDate) : null,
        dueDate: leafFormData.dueDate ? convertToGregorian(leafFormData.dueDate) : null,
        reason: leafFormData.reason || '',
        description: leafFormData.description || '',
        isDigital: Boolean(selectedCbForCard?.type === 'digital' || selectedCbForCard?.isDigital || editingLeaf.isDigital),
        checkType: (selectedCbForCard?.type === 'digital' || selectedCbForCard?.isDigital || editingLeaf.isDigital) ? 'digital' : 'paper'
      };

      await updateIssuedCheck(editingLeaf.id.toString(), updatedPayload);
      notify('مشخصات برگه چک با موفقیت به‌روزرسانی شد', 'success');
      setEditingLeaf(null);
      await loadData();
    } catch (err: any) {
      console.error('Error updating leaf:', err);
      setLeafFormError(err?.message || 'خطا در ثبت تغییرات برگه چک');
    } finally {
      setIsSavingLeaf(false);
    }
  };

  const getStatusBadge = (status: string, isDigitalCheck?: boolean) => {
    switch (status) {
      case 'issued':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
            <Clock className="w-3 h-3 text-blue-500" />
            {isDigitalCheck ? 'صادر شده در چکاد' : 'صادر شده'}
          </span>
        );
      case 'accepted':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-300">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            تایید گیرنده در چکاد
          </span>
        );
      case 'returned_to_issuer':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-300">
            <AlertCircle className="w-3 h-3 text-amber-600" />
            عودت توسط گیرنده
          </span>
        );
      case 'cashed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
            <Check className="w-3 h-3 text-emerald-600" />
            وصول شده (پاس شده)
          </span>
        );
      case 'bounced':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
            <AlertCircle className="w-3 h-3 text-rose-500" />
            برگشت خورده
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-300">
            <X className="w-3 h-3 text-slate-500" />
            باطل شده
          </span>
        );
      case 'blank':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-teal-50 text-teal-700 border border-teal-200">
            <CheckSquare className="w-3 h-3 text-teal-600" />
            سفید (آماده صدور)
          </span>
        );
    }
  };

  // If a checkbook card is opened, render the dedicated "کارت دسته‌چک" Page!
  if (selectedCbForCard) {
    const cb = selectedCbForCard;
    const bankAccount = accounts.find((a: any) => String(a.id) === String(cb.accountId || cb.account_id));
    const bankName = bankAccount?.bankName || cb.bankName || 'بانک نامشخص';
    const accountNo = bankAccount?.accountNumber || cb.accountNumber || '---';
    const branchName = bankAccount?.branchName || cb.branchName || '';
    const isDigitalCheckbook = Boolean(cb.type === 'digital' || cb.isDigital);

    const blankCount = activeCheckbookLeaves.filter(c => !c.status || c.status === 'blank').length;
    const issuedCount = activeCheckbookLeaves.filter(c => c.status === 'issued' || c.status === 'accepted').length;
    const cashedCount = activeCheckbookLeaves.filter(c => c.status === 'cashed').length;
    const bouncedCount = activeCheckbookLeaves.filter(c => c.status === 'bounced').length;
    const cancelledCount = activeCheckbookLeaves.filter(c => c.status === 'cancelled').length;
    const totalCount = cb.totalLeaves || activeCheckbookLeaves.length || 0;

    const totalIssuedAmount = activeCheckbookLeaves
      .filter(c => c.status && c.status !== 'blank' && c.status !== 'cancelled')
      .reduce((sum, c) => sum + (Number(c.amount) || 0), 0);

    const totalCashedAmount = activeCheckbookLeaves
      .filter(c => c.status === 'cashed')
      .reduce((sum, c) => sum + (Number(c.amount) || 0), 0);

    const usedPercentage = totalCount > 0 ? Math.round(((totalCount - blankCount) / totalCount) * 100) : 0;

    return (
      <div className="space-y-6 animate-in fade-in duration-300" dir="rtl">
        {/* Top Navigation & Toolbar */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSelectedCbForCard(null)}
              className="p-2.5 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 border border-slate-200 rounded-2xl transition-all flex items-center gap-2 text-xs font-bold cursor-pointer"
            >
              <ArrowRight className="w-4 h-4" />
              بازگشت به دسته‌چک‌ها
            </button>
            <div className="h-6 w-px bg-slate-200 hidden sm:block"></div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-black text-slate-800">
                  کارت دسته‌چک {bankName}
                </h1>
                {isDigitalCheckbook ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-50 text-purple-700 border border-purple-200 text-xs font-black">
                    <Smartphone className="w-3.5 h-3.5 text-purple-600" />
                    چک امن دیجیتال (چکاد)
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold">
                    <FileText className="w-3.5 h-3.5 text-slate-500" />
                    چک سنتی کاغذی (صیادی)
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                شماره حساب: <span className="font-mono font-bold text-slate-700">{accountNo}</span> {branchName ? `(شعبه ${branchName})` : ''} - سریال {cb.startNumber} تا {cb.endNumber}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto justify-end">
            <button 
              onClick={() => handleRegenerateLeaves(cb.id)}
              disabled={isRegeneratingLeaves}
              className="px-3.5 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="همگام‌سازی و تولید برگه‌های چک جامانده"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-indigo-600 ${isRegeneratingLeaves ? 'animate-spin' : ''}`} />
              همگام‌سازی برگه‌ها
            </button>
            <button 
              onClick={() => editCheckbook(cb)}
              className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="ویرایش مشخصات دسته‌چک"
            >
              <Edit2 className="w-3.5 h-3.5" />
              ویرایش دسته‌چک
            </button>
            <button 
              onClick={() => deleteCb(cb)}
              className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="حذف دسته‌چک و برگه‌های بدون استفاده"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Realistic Iranian Checkbook Graphic Cover */}
        <div className={`p-6 md:p-8 rounded-3xl relative overflow-hidden border shadow-sm text-white ${
          isDigitalCheckbook 
            ? 'bg-gradient-to-l from-indigo-900 via-purple-900 to-slate-900 border-purple-500/30'
            : 'bg-gradient-to-l from-slate-900 via-slate-800 to-indigo-950 border-slate-700'
        }`}>
          <div className="absolute -left-12 -bottom-12 opacity-5 pointer-events-none">
            <Building2 className="w-64 h-64" />
          </div>

          <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20">
                  {isDigitalCheckbook ? <Smartphone className="w-6 h-6 text-purple-300" /> : <Building2 className="w-6 h-6 text-indigo-300" />}
                </div>
                <div>
                  <span className="text-xs text-white/60 font-bold block">
                    {isDigitalCheckbook ? 'سامانه چک امن دیجیتال (چکاد بانک مرکزی)' : 'سامانه یکپارچه صیاد'}
                  </span>
                  <h2 className="text-xl md:text-2xl font-black tracking-tight">{bankName}</h2>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-4 text-xs text-white/80 pt-1 font-mono">
                <div>شماره حساب: <strong className="text-white font-sans text-sm">{accountNo}</strong></div>
                <div className="h-3 w-px bg-white/20"></div>
                <div>سریال: <strong className="text-white font-sans">{cb.startNumber} الی {cb.endNumber}</strong></div>
                <div className="h-3 w-px bg-white/20"></div>
                <div>ظرفیت: <strong className="text-white font-sans">{totalCount} برگ</strong></div>
                {cb.issuedDate && (
                  <>
                    <div className="h-3 w-px bg-white/20"></div>
                    <div>دریافت: <strong className="text-white font-sans">{formatDateDisplay(cb.issuedDate, storeSettings?.calendarType)}</strong></div>
                  </>
                )}
              </div>

              {isDigitalCheckbook && (
                <div className="mt-2 text-xs bg-white/10 backdrop-blur-md border border-white/15 px-3.5 py-1.5 rounded-xl inline-flex items-center gap-2 text-purple-200">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>بدون نیاز به تحویل فیزیکی - تبادل تمام الکترونیکی در بستر صیاد / چکاد</span>
                </div>
              )}
            </div>

            <div className="flex flex-col items-start md:items-end w-full md:w-auto bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/15 min-w-[220px]">
              <span className="text-xs text-white/70 font-medium mb-1">پیشرفت مصرف دسته‌چک</span>
              <div className="flex items-baseline gap-2 mb-2">
                <span className="text-3xl font-black font-sans">{usedPercentage}٪</span>
                <span className="text-xs text-white/70">مصرف شده</span>
              </div>
              <div className="w-full bg-white/20 h-2.5 rounded-full overflow-hidden">
                <div 
                  className="bg-emerald-400 h-full rounded-full transition-all duration-500" 
                  style={{ width: `${usedPercentage}%` }}
                ></div>
              </div>
              <span className="text-[11px] text-white/60 mt-1.5 font-medium">
                {blankCount} برگ سفید باقی‌مانده از {totalCount} برگ
              </span>
            </div>
          </div>
        </div>

        {/* Analytics KPI Row */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
            <span className="text-[11px] font-bold text-slate-500 block mb-1">کل برگه‌ها</span>
            <span className="text-xl font-black text-slate-800">{totalCount} <span className="text-xs font-normal text-slate-400">برگ</span></span>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-teal-200 bg-teal-50/20 shadow-2xs">
            <span className="text-[11px] font-bold text-teal-700 block mb-1">برگه‌های سفید (آماده)</span>
            <span className="text-xl font-black text-teal-800">{blankCount} <span className="text-xs font-normal text-teal-600/70">برگ</span></span>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-blue-200 bg-blue-50/20 shadow-2xs">
            <span className="text-[11px] font-bold text-blue-700 block mb-1">صادر شده (در جریان)</span>
            <span className="text-xl font-black text-blue-800">{issuedCount} <span className="text-xs font-normal text-blue-600/70">برگ</span></span>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-emerald-200 bg-emerald-50/20 shadow-2xs">
            <span className="text-[11px] font-bold text-emerald-700 block mb-1">پاس شده (وصول)</span>
            <span className="text-xl font-black text-emerald-800">{cashedCount} <span className="text-xs font-normal text-emerald-600/70">برگ</span></span>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-rose-200 bg-rose-50/20 shadow-2xs">
            <span className="text-[11px] font-bold text-rose-700 block mb-1">برگشت خورده</span>
            <span className="text-xl font-black text-rose-800">{bouncedCount} <span className="text-xs font-normal text-rose-600/70">برگ</span></span>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-slate-200 bg-slate-50 shadow-2xs">
            <span className="text-[11px] font-bold text-slate-500 block mb-1">ابطال شده</span>
            <span className="text-xl font-black text-slate-700">{cancelledCount} <span className="text-xs font-normal text-slate-400">برگ</span></span>
          </div>
        </div>

        {/* Financial Commitments Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-slate-500 block mb-1">مجموع مبالغ تعهد شده در این دسته‌چک</span>
              <span className="text-2xl font-black text-slate-800 font-sans tracking-tight">
                {Number(totalIssuedAmount).toLocaleString()} <span className="text-xs font-bold text-slate-500">{storeSettings?.currency || 'تومان'}</span>
              </span>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
              <Wallet className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-slate-500 block mb-1">مجموع مبالغ وصول و کسر شده از حساب</span>
              <span className="text-2xl font-black text-emerald-700 font-sans tracking-tight">
                {Number(totalCashedAmount).toLocaleString()} <span className="text-xs font-bold text-emerald-600/60">{storeSettings?.currency || 'تومان'}</span>
              </span>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <CheckCircle2 className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Complete Leaves Management Panel */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Controls Bar */}
          <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
              {[
                { id: 'all', label: `همه برگه‌ها (${activeCheckbookLeaves.length})` },
                { id: 'blank', label: `سفید (${blankCount})` },
                { id: 'issued', label: `صادر شده (${activeCheckbookLeaves.filter(l => l.status === 'issued').length})` },
                { id: 'accepted', label: `تایید چکاد (${activeCheckbookLeaves.filter(l => l.status === 'accepted').length})` },
                { id: 'cashed', label: `وصول شده (${cashedCount})` },
                { id: 'bounced', label: `برگشتی (${bouncedCount})` },
                { id: 'cancelled', label: `باطل شده (${cancelledCount})` },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setLeafStatusFilter(tab.id as any)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                    leafStatusFilter === tab.id
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="relative w-full md:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={leafSearchQuery}
                onChange={e => setLeafSearchQuery(e.target.value)}
                placeholder="جستجوی سریال، صیاد، گیرنده..."
                className="w-full pr-9 pl-3 py-2 text-xs border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium"
              />
            </div>
          </div>

          {/* Leaves Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-black text-slate-500">
                  <th className="px-4 py-3.5 w-14 text-center">ردیف</th>
                  <th className="px-4 py-3.5">شماره برگه</th>
                  <th className="px-4 py-3.5">شناسه صیادی</th>
                  <th className="px-4 py-3.5">وضعیت</th>
                  <th className="px-4 py-3.5">گیرنده (در وجه)</th>
                  <th className="px-4 py-3.5">مبلغ</th>
                  <th className="px-4 py-3.5">سررسید</th>
                  <th className="px-4 py-3.5">بابت / شرح</th>
                  <th className="px-4 py-3.5 text-center">عملیات و مدیریت</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredCardLeaves.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-400 font-bold">
                      هیچ برگه چکی با این فیلترها در این دسته‌چک یافت نشد.
                    </td>
                  </tr>
                ) : (
                  filteredCardLeaves.map((leaf: any, idx: number) => {
                    const isBlank = !leaf.status || leaf.status === 'blank';
                    const hasSayad = leaf.sayadId && leaf.sayadId !== '0000000000000000';
                    return (
                      <tr 
                        key={leaf.id} 
                        className={`hover:bg-slate-50/70 transition-colors ${
                          !isBlank ? 'bg-indigo-50/10' : ''
                        }`}
                      >
                        <td className="px-4 py-3.5 text-center text-slate-400 font-bold font-mono">
                          {idx + 1}
                        </td>

                        <td className="px-4 py-3.5">
                          <span className="font-mono font-black text-slate-800 text-sm">
                            #{leaf.checkNumber}
                          </span>
                        </td>

                        <td className="px-4 py-3.5">
                          {hasSayad ? (
                            <span className="font-mono text-slate-700 font-bold bg-slate-100 px-2 py-0.5 rounded tracking-wider">
                              {leaf.sayadId}
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[11px]">بدون صیاد</span>
                          )}
                        </td>

                        <td className="px-4 py-3.5">
                          {getStatusBadge(leaf.status, isDigitalCheckbook)}
                        </td>

                        <td className="px-4 py-3.5 font-bold text-slate-700">
                          {leaf.payeeName || (isBlank ? '---' : 'نامشخص')}
                        </td>

                        <td className="px-4 py-3.5">
                          {!isBlank && Number(leaf.amount) > 0 ? (
                            <span className="font-sans font-black text-slate-900">
                              {Number(leaf.amount).toLocaleString()} <span className="text-[10px] text-slate-500 font-normal">{storeSettings?.currency || 'تومان'}</span>
                            </span>
                          ) : (
                            <span className="text-slate-400 font-mono">---</span>
                          )}
                        </td>

                        <td className="px-4 py-3.5 text-slate-600">
                          {leaf.dueDate ? formatDateDisplay(leaf.dueDate, storeSettings?.calendarType) : '---'}
                        </td>

                        <td className="px-4 py-3.5 text-slate-500 max-w-[150px] truncate">
                          {leaf.reason || leaf.description || '---'}
                        </td>

                        <td className="px-4 py-3.5">
                          <div className="flex items-center justify-center gap-1.5">
                            {/* Edit Leaf Details Button */}
                            <button
                              onClick={() => handleOpenEditLeafModal(leaf)}
                              className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                              title="ویرایش مشخصات کامل برگه چک"
                            >
                              <Edit3 className="w-3.5 h-3.5 text-indigo-600" />
                              ویرایش
                            </button>

                            {/* Blank Leaf Issuance Action */}
                            {isBlank && (
                              <a
                                href={`/issue_check?checkbookId=${cb.id}&checkLeafId=${leaf.id}&checkNumber=${leaf.checkNumber}`}
                                onClick={(e) => {
                                  if (setActiveSubTab && setIssuedCheckbookFilter) {
                                    e.preventDefault();
                                    setIssuedCheckbookFilter(cb.id.toString());
                                    setActiveSubTab('issued_checks');
                                  }
                                }}
                                className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
                              >
                                صدور
                                <ArrowLeft className="w-3.5 h-3.5" />
                              </a>
                            )}

                            {/* Issued Leaf Check Card View */}
                            {!isBlank && (
                              <a
                                href={`/check_card?checkId=${leaf.id}&type=issued`}
                                className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                                title="مشاهده پرونده کامل در چک‌کارت"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                پرونده
                              </a>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* MODAL: Edit Leaf Details Modal */}
        <AnimatePresence>
          {editingLeaf && (
            <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs" dir="rtl">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-3xl w-full max-w-xl max-h-[90vh] overflow-y-auto p-6 md:p-8 shadow-2xl border border-slate-100"
              >
                <div className="flex justify-between items-center mb-6 border-b pb-4 border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                      <Edit3 className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-black text-slate-800">
                        ویرایش برگه چک شماره {editingLeaf.checkNumber}
                      </h3>
                      <p className="text-xs text-slate-500 font-medium">
                        عهده بانک {bankName} {isDigitalCheckbook ? '(چک دیجیتال چکاد)' : '(چک صیادی)'}
                      </p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setEditingLeaf(null)}
                    className="text-slate-400 hover:text-slate-600 p-2 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleSaveLeafEdit} className="space-y-4">
                  {leafFormError && (
                    <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-bold flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{leafFormError}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Check Number */}
                    <div>
                      <label className="block text-xs font-black text-slate-700 mb-1.5">
                        شماره برگه چک *
                      </label>
                      <input
                        required
                        type="text"
                        value={leafFormData.checkNumber}
                        onChange={e => setLeafFormData({ ...leafFormData, checkNumber: e.target.value })}
                        className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-mono text-center outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-bold"
                        dir="ltr"
                      />
                    </div>

                    {/* Sayad ID */}
                    <div>
                      <label className="block text-xs font-black text-slate-700 mb-1.5">
                        شناسه صیادی ۱۶ رقمی
                      </label>
                      <input
                        type="text"
                        maxLength={16}
                        value={leafFormData.sayadId}
                        onChange={e => setLeafFormData({ ...leafFormData, sayadId: toEnDigits(e.target.value) })}
                        placeholder="۱۶ رقم عددی صیاد..."
                        className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-mono text-center outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-bold"
                        dir="ltr"
                      />
                    </div>

                    {/* Status Selection */}
                    <div>
                      <label className="block text-xs font-black text-slate-700 mb-1.5">
                        وضعیت برگه چک *
                      </label>
                      <select
                        value={leafFormData.status}
                        onChange={e => setLeafFormData({ ...leafFormData, status: e.target.value })}
                        className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white"
                      >
                        <option value="blank">سفید (آماده صدور)</option>
                        <option value="issued">{isDigitalCheckbook ? 'صادر شده در سامانه چکاد' : 'صادر شده'}</option>
                        {isDigitalCheckbook && <option value="accepted">تایید و دریافت گیرنده در چکاد</option>}
                        {isDigitalCheckbook && <option value="returned_to_issuer">عودت چک دیجیتال توسط گیرنده</option>}
                        <option value="cashed">وصول شده (پاس شده)</option>
                        <option value="bounced">برگشت خورده</option>
                        <option value="cancelled">باطل شده</option>
                      </select>
                    </div>

                    {/* Amount */}
                    <div>
                      <label className="block text-xs font-black text-slate-700 mb-1.5">
                        مبلغ چک ({storeSettings?.currency || 'تومان'})
                      </label>
                      <input
                        type="text"
                        value={leafFormData.amount ? Number(leafFormData.amount).toLocaleString() : ''}
                        onChange={e => setLeafFormData({ ...leafFormData, amount: toEnDigits(e.target.value) })}
                        placeholder="0"
                        className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-mono text-left outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-bold"
                        dir="ltr"
                      />
                    </div>

                    {/* Payee Person Select */}
                    <div>
                      <label className="block text-xs font-black text-slate-700 mb-1.5">
                        انتخاب طرف حساب (گیرنده)
                      </label>
                      <select
                        value={leafFormData.payeeId}
                        onChange={e => {
                          const pId = e.target.value;
                          const found = persons.find(p => String(p.id) === String(pId));
                          setLeafFormData({
                            ...leafFormData,
                            payeeId: pId,
                            payeeName: found?.name || leafFormData.payeeName
                          });
                        }}
                        className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white"
                      >
                        <option value="">-- انتخاب از اشخاص سیستم --</option>
                        {persons.map(p => (
                          <option key={p.id} value={p.id}>
                            {p.name || `${p.firstName || ''} ${p.lastName || ''}`}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Payee Name Text */}
                    <div>
                      <label className="block text-xs font-black text-slate-700 mb-1.5">
                        نام در وجه / گیرنده
                      </label>
                      <input
                        type="text"
                        value={leafFormData.payeeName}
                        onChange={e => setLeafFormData({ ...leafFormData, payeeName: e.target.value })}
                        placeholder="در وجه..."
                        className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                      />
                    </div>

                    {/* Issue Date */}
                    <div>
                      <label className="block text-xs font-black text-slate-700 mb-1.5">
                        تاریخ صدور
                      </label>
                      <input
                        type="date"
                        value={leafFormData.issueDate}
                        onChange={e => setLeafFormData({ ...leafFormData, issueDate: e.target.value })}
                        className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                      />
                    </div>

                    {/* Due Date */}
                    <div>
                      <label className="block text-xs font-black text-slate-700 mb-1.5">
                        تاریخ سررسید
                      </label>
                      <input
                        type="date"
                        value={leafFormData.dueDate}
                        onChange={e => setLeafFormData({ ...leafFormData, dueDate: e.target.value })}
                        className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                      />
                    </div>

                    {/* Reason */}
                    <div className="md:col-span-2">
                      <label className="block text-xs font-black text-slate-700 mb-1.5">
                        بابت / شرح صدور
                      </label>
                      <input
                        type="text"
                        value={leafFormData.reason}
                        onChange={e => setLeafFormData({ ...leafFormData, reason: e.target.value })}
                        placeholder="خرید کالا، پرداخت بدهی و..."
                        className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-medium outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                      />
                    </div>

                    {/* Description */}
                    <div className="md:col-span-2">
                      <label className="block text-xs font-black text-slate-700 mb-1.5">
                        توضیحات و یادداشت تکمیلی پرونده
                      </label>
                      <textarea
                        rows={2}
                        value={leafFormData.description}
                        onChange={e => setLeafFormData({ ...leafFormData, description: e.target.value })}
                        placeholder="توضیحات اختیاری..."
                        className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-medium outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setEditingLeaf(null)}
                      className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-50 transition-colors cursor-pointer"
                    >
                      انصراف
                    </button>
                    <button
                      disabled={isSavingLeaf}
                      type="submit"
                      className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition-all cursor-pointer"
                    >
                      {isSavingLeaf ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Save className="w-4 h-4" />
                      )}
                      ذخیره مشخصات برگه چک
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // DEFAULT VIEW: Checkbooks List
  return (
    <div className="space-y-6" dir="rtl">
      {/* Top action header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
        <div>
          <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-indigo-600" />
            مدیریت دسته‌چک‌ها و کارت‌های چک پرداختنی
          </h2>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            تعریف دسته‌چک‌های بانکی (سنتی کاغذی صیادی یا امن دیجیتال چکاد)، ایجاد خودکار برگه‌های چک و دسترسی به کارت دسته‌چک
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            disabled={loadingChecks}
            className="p-2.5 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 border border-slate-200 rounded-xl transition-all cursor-pointer"
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
            const bankAccount = accounts.find((a: any) => String(a.id) === String(cb.accountId || cb.account_id));
            const bankName = bankAccount?.bankName || cb.bankName || 'حساب بانکی نامشخص';
            const accountNo = bankAccount?.accountNumber ? `حساب: ${bankAccount.accountNumber}` : (cb.accountNumber ? `حساب: ${cb.accountNumber}` : '');
            const isDigitalCb = Boolean(cb.type === 'digital' || cb.isDigital);
            
            // Statistics for this checkbook
            const cbLeaves = allIssuedChecks.filter(c => String(c.checkbookId) === String(cb.id));
            const blankCount = cbLeaves.filter(c => !c.status || c.status === 'blank').length;
            const issuedCount = cbLeaves.filter(c => c.status === 'issued' || c.status === 'accepted').length;
            const cashedCount = cbLeaves.filter(c => c.status === 'cashed').length;
            const totalLeavesCount = cb.totalLeaves || cbLeaves.length || 0;

            return (
              <div 
                key={cb.id} 
                className="border border-slate-200/80 rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all bg-white relative overflow-hidden group flex flex-col justify-between"
              >
                <div className={`absolute top-0 right-0 left-0 h-1.5 ${isDigitalCb ? 'bg-purple-600' : 'bg-indigo-600'}`}></div>
                
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="text-base font-black text-slate-800 flex items-center gap-2">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold ${isDigitalCb ? 'bg-purple-50 text-purple-600' : 'bg-indigo-50 text-indigo-600'}`}>
                        {isDigitalCb ? <Smartphone className="w-4 h-4" /> : <Building2 className="w-4 h-4" />}
                      </div>
                      <div>
                        <div>{bankName}</div>
                        {accountNo && <div className="text-[11px] font-mono text-slate-500 font-normal">{accountNo}</div>}
                      </div>
                    </div>

                    {isDigitalCb ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-purple-50 text-purple-700 border border-purple-200 text-[10px] font-black">
                        <Smartphone className="w-3 h-3 text-purple-600" />
                        دیجیتال (چکاد)
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 border border-slate-200 text-[10px] font-bold">
                        <FileText className="w-3 h-3 text-slate-500" />
                        کاغذی (صیاد)
                      </span>
                    )}
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
                      تاریخ دریافت: {formatDateDisplay(cb.issuedDate, storeSettings?.calendarType)}
                    </div>
                  )}
                </div>

                {/* Footer action buttons */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <button 
                    onClick={() => {
                      setSelectedCbForCard(cb);
                      setLeafSearchQuery('');
                      setLeafStatusFilter('all');
                    }}
                    className="flex-1 py-2 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                    title="مشاهده و مدیریت کامل کارت دسته‌چک و برگه‌ها"
                  >
                    <Layers className="w-3.5 h-3.5" />
                    کارت دسته‌چک ({cbLeaves.length} برگ)
                  </button>

                  <div className="flex items-center gap-1">
                    <button 
                      onClick={() => editCheckbook(cb)} 
                      className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors cursor-pointer"
                      title="ویرایش مشخصات دسته چک"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => deleteCb(cb)} 
                      className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
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

      {/* Checkbook Registration & Edit Modal */}
      <AnimatePresence>
        {isCheckbookModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs" dir="rtl">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} 
              animate={{ opacity: 1, scale: 1 }} 
              exit={{ opacity: 0, scale: 0.95 }} 
              className="bg-white rounded-3xl w-full max-w-lg p-6 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto"
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

                {/* Checkbook Type Selection: Digital (Chakad) vs Traditional Paper (Sayad) */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <label className="block text-xs font-black text-slate-700 mb-2 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-indigo-500" />
                    نوع دسته‌چک <span className="text-rose-500">*</span>
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <label className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition-all ${
                      cbType === 'paper' 
                        ? 'bg-white border-indigo-600 ring-2 ring-indigo-500/10 shadow-xs' 
                        : 'bg-white/60 border-slate-200 hover:bg-white'
                    }`}>
                      <input 
                        type="radio" 
                        name="cbType" 
                        value="paper" 
                        checked={cbType === 'paper'} 
                        onChange={() => setCbType('paper')} 
                        className="mt-0.5 text-indigo-600 focus:ring-indigo-500"
                      />
                      <div>
                        <span className="block text-xs font-black text-slate-800">📄 چک سنتی کاغذی</span>
                        <span className="text-[10px] text-slate-500 leading-tight block mt-0.5">
                          صدور برگه فیزیکی و تحویل دستی به گیرنده (صیاد)
                        </span>
                      </div>
                    </label>

                    <label className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition-all ${
                      cbType === 'digital' 
                        ? 'bg-white border-purple-600 ring-2 ring-purple-500/10 shadow-xs' 
                        : 'bg-white/60 border-slate-200 hover:bg-white'
                    }`}>
                      <input 
                        type="radio" 
                        name="cbType" 
                        value="digital" 
                        checked={cbType === 'digital'} 
                        onChange={() => setCbType('digital')} 
                        className="mt-0.5 text-purple-600 focus:ring-purple-500"
                      />
                      <div>
                        <span className="block text-xs font-black text-purple-900 flex items-center gap-1">
                          📱 چک امن دیجیتال (چکاد)
                        </span>
                        <span className="text-[10px] text-purple-700/80 leading-tight block mt-0.5">
                          الکترونیک بدون تحویل فیزیکی، تایید یا عودت در سامانه چکاد
                        </span>
                      </div>
                    </label>
                  </div>
                </div>

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
                  className={`px-5 py-2.5 rounded-xl text-white font-bold text-sm transition-colors flex items-center gap-2 cursor-pointer shadow-sm ${
                    confirmModalData.title.includes('حذف')
                      ? 'bg-rose-600 hover:bg-rose-700 focus:ring-4 focus:ring-rose-100'
                      : 'bg-indigo-600 hover:bg-indigo-700 focus:ring-4 focus:ring-indigo-100'
                  }`}
                >
                  {isSubmitting 
                    ? 'در حال انجام...' 
                    : (confirmModalData.title.includes('حذف') ? 'بله، حذف شود' : 'بله، تایید میکنم')}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
