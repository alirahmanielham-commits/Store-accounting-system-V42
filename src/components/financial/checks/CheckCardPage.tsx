
import React, { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import {
  CreditCard, ArrowRight, User, Building2, Calendar, FileText,
  History as HistoryIcon, Clock, CheckCircle, XCircle, RefreshCw,
  AlertTriangle, Save, Printer, ExternalLink, Search, Check, List, Edit3
} from "lucide-react";
import { 
  getIssuedChecks, getReceivedChecks, updateReceivedCheck, getPersons, 
  getCheckAuditLogs, updateIssuedCheck, addCheckHistoryLog, 
  getTransactions, getCheckbooks, getAccounts 
} from "../../../services/dataService";
import { formatDateDisplay } from "../../../utils/format";
import { syncCheckAccountingDocument } from "../../../services/accountingService";
import Num2persian from "num2persian";

export default function CheckCardPage({
  checkId,
  checkType,
  onClose,
  showNotification,
  currentUser,
  storeSettings,
  onViewAccountingDoc
}: {
  checkId: string | number;
  checkType: "issued" | "received";
  onClose: () => void;
  showNotification: any;
  currentUser: string;
  storeSettings: any;
  onViewAccountingDoc?: (doc: any) => void;
}) {
  const [check, setCheck] = useState<any>(null);
  const [allChecks, setAllChecks] = useState<any[]>([]);
  const [persons, setPersons] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [checkbooks, setCheckbooks] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'info' | 'history' | 'actions'>('info');
  const [currentCheckId, setCurrentCheckId] = useState(checkId);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState<any>({});

  useEffect(() => {
    setCurrentCheckId(checkId);
  }, [checkId]);

  // Transitions
  const transitions: Record<string, string[]> = {
    'draft': ['issued'],
    'issued': ['delivered'],
    'delivered': ['in_clearing', 'stop_payment', 'lost', 'overdue'],
    'in_clearing': ['cashed', 'bounced'],
    'bounced': ['re_assigned', 'legal_action', 'settled_other_way', 'cancelled'],
    're_assigned': ['cashed', 'bounced'],
    'legal_action': ['settled_other_way', 'cancelled'],
    'cashed': [],
    'settled_other_way': [],
    'cancelled': [],
    'stop_payment': ['delivered', 'cancelled'],
    'lost': ['delivered', 'cancelled'],
    'overdue': ['in_clearing', 'cashed', 'bounced', 'cancelled'],

    'received': ['deposited', 'assigned', 'cashed'],
    'deposited': ['cashed', 'bounced'],
    'assigned': ['cashed', 'bounced_assigned'],
    'bounced_assigned': ['returned', 'legal_action'],
    'returned': ['cancelled'],
  };

  const stateLabels: any = {
    'draft': 'پیش‌نویس',
    'issued': 'صادر شده / امضا شده',
    'delivered': 'تحویل داده شده',
    'in_clearing': 'در جریان وصول / کلر',
    'cashed': 'پاس شده / وصول شده',
    'bounced': 'برگشت خورده',
    're_assigned': 'واگذار شده (خرج شده)',
    'stop_payment': 'دستور عدم پرداخت',
    'legal_action': 'اقدام حقوقی',
    'settled_other_way': 'تسویه از راه دیگر',
    'cancelled': 'ابطال شده',
    'lost': 'مفقودی',
    'overdue': 'سررسید گذشته',

    'received': 'دریافت شده (نزد صندوق)',
    'deposited': 'واگذار به بانک (در جریان وصول)',
    'assigned': 'واگذار شده (خرج شده)',
    'bounced_assigned': 'برگشت خورده (واگذار شده)',
    'returned': 'عودت داده شده',
  };

  const stateColors: any = {
    'draft': 'bg-slate-100 text-slate-700 border-slate-200',
    'issued': 'bg-sky-100 text-sky-700 border-sky-200',
    'delivered': 'bg-indigo-100 text-indigo-700 border-indigo-200',
    'in_clearing': 'bg-amber-100 text-amber-700 border-amber-200',
    'cashed': 'bg-emerald-100 text-emerald-700 border-emerald-200',
    'bounced': 'bg-rose-100 text-rose-700 border-rose-200',
    're_assigned': 'bg-fuchsia-100 text-fuchsia-700 border-fuchsia-200',
    'legal_action': 'bg-rose-50 text-rose-800 border-rose-300',
    'cancelled': 'bg-slate-200 text-slate-800 border-slate-300',
    
    'received': 'bg-indigo-100 text-indigo-700 border-indigo-200',
    'deposited': 'bg-amber-100 text-amber-700 border-amber-200',
    'assigned': 'bg-fuchsia-100 text-fuchsia-700 border-fuchsia-200',
    'bounced_assigned': 'bg-rose-100 text-rose-700 border-rose-200',
    'returned': 'bg-slate-200 text-slate-800 border-slate-300',
  };

  const financialEffectStates = ['cashed', 'in_clearing', 'bounced', 'assigned'];

  useEffect(() => {
    loadData();
  }, [currentCheckId, checkType]);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = checkType === "issued" ? await getIssuedChecks() : await getReceivedChecks();
      setAllChecks(data);
      const found = data.find((c: any) => String(c.id) === String(currentCheckId));
      setCheck(found);
      
      const [ps, hst, trs, cbs, accs] = await Promise.all([
        getPersons(),
        getCheckAuditLogs(currentCheckId),
        getTransactions(),
        getCheckbooks(),
        getAccounts()
      ]);
      setPersons(ps || []);
      setHistory((hst || []).sort((a:any, b:any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
      setTransactions(trs || []);
      setCheckbooks(cbs || []);
      setAccounts(accs || []);
    } catch (error) {
      console.error(error);
      showNotification('خطا در دریافت اطلاعات چک', 'error');
    }
    setLoading(false);
  };

  const filteredChecks = useMemo(() => {
    if (!searchQuery) return allChecks;
    return allChecks.filter(c => 
      c.checkNumber?.includes(searchQuery) || 
      c.sayadId?.includes(searchQuery) || 
      String(c.amount).includes(searchQuery)
    );
  }, [allChecks, searchQuery]);


  const openEditModal = () => {
    setEditFormData({
      checkNumber: check.checkNumber || '',
      sayadId: check.sayadId || '',
      amount: check.amount || '',
      issueDate: check.issueDate || '',
      dueDate: check.dueDate || '',
      payeeName: check.payeeName || '',
      payeeId: check.payeeId || '',
      reason: check.reason || '',
      description: check.description || ''
    });
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = async () => {
    setSaving(true);
    try {
      const updated = { ...check, ...editFormData };
      if (checkType === 'issued') {
        await updateIssuedCheck(check.id, updated);
      } else {
        await updateReceivedCheck(check.id, updated);
      }
      
      await addCheckHistoryLog({
        checkId: check.id,
        checkType: checkType,
        
        description: 'ویرایش اطلاعات چک',
        userId: currentUser,
      });
      
      showNotification('اطلاعات چک با موفقیت بروزرسانی شد', 'success');
      setIsEditModalOpen(false);
      loadData();
    } catch (e: any) {
      console.error(e);
      showNotification(e.message || 'خطا در بروزرسانی چک', 'error');
    }
    setSaving(false);
  };

  const handleStateChange = async (newState: string) => {
    if (!check) return;
    if (!confirm(`آیا از تغییر وضعیت این چک به "${stateLabels[newState]}" اطمینان دارید؟`)) return;
    
    setSaving(true);
    try {
      const oldState = check.status;
      let updatedCheck = { ...check, status: newState };
      
      if (checkType === 'issued') {
        await updateIssuedCheck(check.id, updatedCheck);
      } else {
        await updateReceivedCheck(check.id, updatedCheck);
      }
      
      await addCheckHistoryLog({
        checkId: check.id,
        checkType: checkType,
        oldStatus: oldState,
        newStatus: newState,
        userId: currentUser,
        
      });
      
      if (financialEffectStates.includes(newState)) {
        await syncCheckAccountingDocument(checkType, updatedCheck);
        showNotification('سند حسابداری مربوط به این وضعیت به صورت خودکار صادر/بروزرسانی شد', 'success');
      }
      
      showNotification('وضعیت چک با موفقیت تغییر یافت', 'success');
      loadData();
    } catch (e: any) {
      console.error(e);
      showNotification(e.message || 'خطا در ثبت وضعیت', 'error');
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 bg-slate-50" dir="rtl">
        <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
        <p className="mt-4 text-slate-500 font-medium">در حال دریافت اطلاعات...</p>
      </div>
    );
  }

  if (!check) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 bg-slate-50 rounded-xl" dir="rtl">
        <AlertTriangle className="w-16 h-16 text-rose-400 mb-4" />
        <h2 className="text-xl font-bold text-slate-700">چک مورد نظر یافت نشد</h2>
        <button onClick={onClose} className="mt-6 px-6 py-2 bg-indigo-600 text-white rounded-lg">بازگشت</button>
      </div>
    );
  }

  const currentStatus = check.status || 'draft';
  const allowedNext = transitions[currentStatus] || [];
  const payee = persons.find(p => p.id === (checkType === "received" ? check.payerId : check.payeeId));
  const isClosed = allowedNext.length === 0;


  const getStaticPreviousStatus = (status: string, type: 'issued'|'received') => {
    if (type === 'issued') {
      if (['cashed', 'bounced', 'returned'].includes(status)) return 'issued';
      if (status === 'issued') return 'draft';
    } else {
      if (['in_clearing', 'deposited', 'assigned'].includes(status)) return 'received';
      if (status === 'bounced') return 'in_clearing';
      if (status === 'bounced_assigned') return 'assigned';
      if (status === 'returned') return 'received'; // typically goes back to received
      if (status === 'received') return 'draft';
    }
    return null;
  };

  const lastStatusChangeLog = history.find(l => l.oldStatus && l.newStatus === check.status);
  const previousStatus = lastStatusChangeLog ? lastStatusChangeLog.oldStatus : getStaticPreviousStatus(currentStatus, checkType);
  const handleRevert = async () => {
    if (!previousStatus) return;
    if (!confirm('آیا از بازگرداندن چک به وضعیت قبلی اطمینان دارید؟ در صورت وجود سند حسابداری، باید آن را به صورت دستی اصلاح یا لغو کنید.')) return;
    
    setSaving(true);
    try {
      const oldState = check.status;
      let updatedCheck = { ...check, status: previousStatus };
      
      if (checkType === 'issued') {
        await updateIssuedCheck(check.id, updatedCheck);
      } else {
        await updateReceivedCheck(check.id, updatedCheck);
      }
      
      await addCheckHistoryLog({
        checkId: check.id,
        checkType: checkType,
        oldStatus: oldState,
        newStatus: previousStatus,
        description: 'بازگردانی به وضعیت قبل',
        userId: currentUser,
        
      });
      
      showNotification('وضعیت چک با موفقیت به حالت قبل بازگردانده شد', 'success');
      loadData();
    } catch (e: any) {
      console.error(e);
      showNotification(e.message || 'خطا در ثبت وضعیت', 'error');
    }
    setSaving(false);
  };
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-4 md:p-8 max-w-[1400px] w-full mx-auto h-full overflow-y-auto" dir="rtl">
      
      {/* Search Header */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 mb-6 flex flex-col sm:flex-row justify-between items-center gap-4 sticky top-0 z-20 print:hidden">
        <div className="flex items-center gap-4 w-full sm:w-auto">
          <button onClick={onClose} className="p-2 text-slate-500 hover:bg-slate-100 rounded-xl transition-colors">
            <ArrowRight className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-black text-slate-800 tracking-tight font-display">
            پرونده چک {checkType === 'issued' ? 'پرداختی' : 'دریافتی'}
          </h1>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto flex-1 max-w-md relative">
          <div className="relative w-full">
            <Search className="w-5 h-5 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text"
              placeholder="جستجوی شماره چک یا مبلغ..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setIsDropdownOpen(true)}
              onBlur={() => setTimeout(() => setIsDropdownOpen(false), 200)}
              className="w-full pl-3 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            />
            {isDropdownOpen && filteredChecks.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-slate-200 max-h-60 overflow-y-auto z-50">
                {filteredChecks.map(c => (
                  <button
                    key={c.id}
                    onMouseDown={() => setCurrentCheckId(c.id)}
                    className={`w-full text-right px-4 py-3 border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors flex flex-col ${c.id === currentCheckId ? 'bg-indigo-50/50' : ''}`}
                  >
                    <span className="font-bold text-slate-700">چک {c.checkNumber}</span>
                    <span className="text-xs text-slate-500">{Number(c.amount).toLocaleString('fa-IR')} ریال - شناسه صیاد: {c.sayadId || 'ندارد'}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <button onClick={() => window.print()} className="p-2.5 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition-colors" title="چاپ کارت">
            <Printer className="w-5 h-5" />
          </button>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden print:shadow-none print:border-none print:rounded-none">
        
        {/* Top Banner (Status + Amount) */}
        <div className="bg-gradient-to-l from-slate-900 to-slate-800 p-8 md:p-12 text-white relative overflow-hidden flex flex-col md:flex-row items-center md:items-start justify-between gap-6">
          <div className="absolute -left-16 -top-16 opacity-5 pointer-events-none">
            <CreditCard className="w-64 h-64 transform -rotate-12" />
          </div>
          
          <div className="relative z-10 flex flex-col items-center md:items-start">
            <span className="text-slate-400 text-sm font-medium mb-1">مبلغ چک</span>
            <div className="flex items-end gap-2 mb-2">
              <span className="text-4xl md:text-5xl font-black tracking-tighter text-white drop-shadow-sm font-sans" dir="ltr">
                {Number(check.amount).toLocaleString('fa-IR')}
              </span>
              <span className="text-xl text-slate-300 font-medium mb-1">ریال</span>
            </div>
            <span className="text-slate-400 text-sm bg-white/10 px-3 py-1 rounded-full">{Num2persian(check.amount)} ریال</span>
          </div>

          <div className="relative z-10 flex flex-col items-center md:items-end">
            <span className="text-slate-400 text-sm font-medium mb-1">وضعیت فعلی</span>
            <div className={`px-6 py-3 rounded-2xl border-2 shadow-sm font-black text-lg ${stateColors[check.status]} bg-white/95 backdrop-blur-sm`}>
              {stateLabels[check.status]}
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="px-8 pt-6 border-b border-slate-100 flex gap-8 overflow-x-auto print:hidden bg-white">
          <button onClick={() => setActiveTab('info')} className={`pb-4 flex items-center gap-2 font-bold text-[15px] whitespace-nowrap border-b-2 transition-colors ${activeTab === 'info' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
            <FileText className="w-5 h-5" /> اطلاعات اصلی
          </button>
          <button onClick={() => setActiveTab('history')} className={`pb-4 flex items-center gap-2 font-bold text-[15px] whitespace-nowrap border-b-2 transition-colors ${activeTab === 'history' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
            <HistoryIcon className="w-5 h-5" /> تاریخچه و سوابق
          </button>
          <button onClick={() => setActiveTab('actions')} className={`pb-4 flex items-center gap-2 font-bold text-[15px] whitespace-nowrap border-b-2 transition-colors ${activeTab === 'actions' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
            <RefreshCw className="w-5 h-5" /> عملیات و فرم وضعیت
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-8 bg-slate-50/50">
          
          {/* INFO TAB */}
          {activeTab === 'info' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                  <span className="flex items-center gap-1.5 text-slate-500 text-sm mb-2"><CreditCard className="w-4 h-4" /> شماره چک</span>
                  <span className="text-xl font-black text-slate-800 font-sans tracking-widest">{check.checkNumber || '---'}</span>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                  <span className="flex items-center gap-1.5 text-slate-500 text-sm mb-2"><List className="w-4 h-4" /> شناسه صیادی</span>
                  <span className="text-xl font-black text-slate-800 font-sans tracking-widest">{check.sayadId || '---'}</span>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                  <span className="flex items-center gap-1.5 text-slate-500 text-sm mb-2"><Calendar className="w-4 h-4" /> {checkType === 'issued' ? 'تاریخ صدور' : 'تاریخ دریافت'}</span>
                  <span className="text-xl font-bold text-slate-800 font-sans">{formatDateDisplay(checkType === 'issued' ? check.issueDate : check.receiveDate, storeSettings?.calendarType)}</span>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-rose-100 bg-rose-50/30 shadow-sm">
                  <span className="flex items-center gap-1.5 text-rose-600 font-medium text-sm mb-2"><Calendar className="w-4 h-4" /> تاریخ سررسید</span>
                  <span className="text-xl font-black text-rose-700 font-sans">{formatDateDisplay(check.dueDate, storeSettings?.calendarType)}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="bg-slate-100/50 p-4 border-b border-slate-200">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2"><User className="w-5 h-5 text-indigo-500"/> طرف حساب</h3>
                  </div>
                  <div className="p-6">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center border border-indigo-100">
                        <User className="w-7 h-7 text-indigo-600"/>
                      </div>
                      <div>
                        <span className="block text-slate-500 text-sm mb-1">{checkType === 'issued' ? 'در وجه (گیرنده)' : 'پرداخت کننده'}</span>
                        <span className="text-lg font-black text-slate-800">
                          {payee ? (payee.firstName + ' ' + payee.lastName) : 'ناشناس'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="bg-slate-100/50 p-4 border-b border-slate-200">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2"><Building2 className="w-5 h-5 text-indigo-500"/> اطلاعات بانکی</h3>
                  </div>
                  <div className="p-6">
                    {checkType === 'issued' ? (
                      <div>
                        <span className="block text-slate-500 text-sm mb-2">دسته چک متصل</span>
                        <span className="text-lg font-black text-slate-800 bg-slate-50 px-4 py-2 rounded-xl inline-block border border-slate-100">
                          {check.checkbookId ? (() => {
                              const cb = checkbooks.find(c => String(c.id) === String(check.checkbookId));
                              if (cb) {
                                const acc = accounts.find(a => String(a.id) === String(cb.accountId));
                                if (acc) return `بانک ${acc.bankName} - ${acc.accountNumber}`;
                                return 'حساب متصل یافت نشد';
                              }
                              return 'دسته چک یافت نشد';
                          })() : '---'}
                        </span>
                      </div>
                    ) : (
                      <div>
                        <span className="block text-slate-500 text-sm mb-2">بانک و شعبه عهده</span>
                        <span className="text-lg font-black text-slate-800 bg-slate-50 px-4 py-2 rounded-xl inline-block border border-slate-100">
                          {check.bankName ? `بانک ${check.bankName} ${check.branchName ? 'شعبه ' + check.branchName : ''}` : '---'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="bg-slate-100/50 p-4 border-b border-slate-200">
                  <h3 className="font-bold text-slate-800 flex items-center gap-2"><FileText className="w-5 h-5 text-indigo-500"/> توضیحات و سوابق</h3>
                </div>
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div>
                    <span className="block text-slate-500 text-sm mb-2">بابت / شرح صدور</span>
                    <p className="text-slate-800 font-medium leading-loose bg-slate-50 p-4 rounded-xl border border-slate-100 min-h-[100px]">{check.reason || 'توضیحی ثبت نشده است.'}</p>
                  </div>
                  <div>
                    <span className="block text-slate-500 text-sm mb-2">یادداشت تکمیلی پرونده</span>
                    <p className="text-slate-700 leading-loose bg-amber-50/50 p-4 rounded-xl border border-amber-100 min-h-[100px]">{check.description || 'توضیحی ثبت نشده است.'}</p>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* HISTORY TAB */}
          {activeTab === 'history' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8 max-w-4xl mx-auto">
                <h3 className="text-xl font-black text-slate-800 mb-8 flex items-center gap-3">
                  <HistoryIcon className="w-6 h-6 text-indigo-500" /> روند تغییرات پرونده
                </h3>
                
                <div className="relative border-r-2 border-indigo-100 pr-8 ml-4 space-y-8">
                  {history.map((log, idx) => {
                     const actionLabel = log.oldStatus ? 'تغییر وضعیت' : (log.description?.includes('ثبت') ? 'ثبت اولیه چک' : 'تغییر وضعیت/عملیات');
                     const nV = log.newStatus;
                     const oV = log.oldStatus;
                     
                     return (
                       <div key={log.id || idx} className="relative">
                         <span className="absolute -right-[41px] bg-white border-4 border-indigo-500 w-5 h-5 rounded-full mt-1.5 shadow-sm ring-4 ring-white"></span>
                         <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                           <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                             <span className="text-lg font-black text-slate-800">{actionLabel}</span>
                             <div className="flex items-center gap-2 text-slate-500 bg-white px-3 py-1.5 rounded-lg border border-slate-200 text-sm">
                               <Clock className="w-4 h-4" />
                               <span className="font-sans" dir="ltr">{new Date(log.createdAt).toLocaleString('fa-IR')}</span>
                             </div>
                           </div>
                           {(nV || oV) && (
                             <div className="flex flex-wrap items-center gap-3 mt-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                               {oV && <span className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg font-bold border border-slate-200">{stateLabels[oV] || oV}</span>}
                               {oV && nV && <ArrowRight className="w-5 h-5 text-slate-300" />}
                               {nV && <span className={`px-3 py-1.5 rounded-lg font-black border ${stateColors[nV] || 'bg-slate-100 text-slate-800'}`}>{stateLabels[nV] || nV}</span>}
                             </div>
                           )}
                           <div className="text-sm text-slate-500 mt-6 flex items-center gap-2 pt-4 border-t border-slate-200 border-dashed">
                             <User className="w-4 h-4" /> کاربر ثبت کننده: <span className="font-bold text-slate-700">{log.userId || 'سیستم'}</span>
                           </div>
                         </div>
                       </div>
                     )
                  })}
                  {history.length === 0 && (
                    <div className="text-slate-400 italic p-8 text-center text-lg bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                      تاکنون سابقه و تاریخچه‌ای برای این پرونده ثبت نشده است.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ACTIONS TAB */}
          {activeTab === 'actions' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="max-w-4xl mx-auto space-y-8">
                
                {isClosed ? (
                  <div className="p-10 bg-emerald-50 text-emerald-800 rounded-3xl border-2 border-emerald-200 flex flex-col items-center justify-center text-center gap-4 shadow-sm">
                    <CheckCircle className="w-16 h-16 text-emerald-500" />
                    <div>
                      <h2 className="font-black text-2xl mb-2 text-emerald-900">پرونده این چک کاملا بسته شده است</h2>
                      <p className="text-emerald-700/80 text-lg">وضعیت فعلی چک نشان‌دهنده پایان چرخه حیات آن است و تغییر وضعیت جدیدی امکان‌پذیر نیست.</p>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8">
                    <h3 className="text-xl font-black text-slate-800 mb-8 flex items-center gap-3">
                      <RefreshCw className="w-6 h-6 text-indigo-500" /> تغییر وضعیت پرونده
                    </h3>
                    <p className="text-slate-500 mb-6 text-lg">با توجه به وضعیت فعلی (<span className="font-bold text-slate-700">{stateLabels[check.status]}</span>)، می‌توانید پرونده را به یکی از وضعیت‌های زیر منتقل کنید:</p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {allowedNext.map(nextState => {
                        const isFinancial = financialEffectStates.includes(nextState);
                        return (
                          <button 
                            key={nextState}
                            onClick={() => handleStateChange(nextState)}
                            disabled={saving}
                            className={`
                              text-right px-6 py-5 rounded-2xl border-2 font-bold flex items-center justify-between group transition-all
                              ${stateColors[nextState]} hover:shadow-md hover:-translate-y-1 active:translate-y-0
                            `}
                          >
                            <div className="flex flex-col gap-2">
                              <span className="text-lg">{stateLabels[nextState]}</span>
                              {isFinancial && (
                                 <span className="text-xs bg-white/80 text-slate-700 px-2 py-1 rounded-md flex items-center gap-1.5 w-max font-medium">
                                   <FileText className="w-3.5 h-3.5 text-indigo-500" /> ثبت سند مالی خودکار
                                 </span>
                              )}
                            </div>
                            <div className="w-10 h-10 rounded-full bg-white/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all transform group-hover:-translate-x-2">
                              <ArrowRight className="w-5 h-5" />
                            </div>
                          </button>
                        );
                      })}
                    </div>
                    {previousStatus && (
                    <button 
                      onClick={handleRevert}
                      disabled={saving}
                      className="mt-6 w-full text-right px-6 py-4 rounded-2xl border-2 font-bold flex items-center justify-between group transition-all bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100 hover:shadow-md hover:-translate-y-1"
                    >
                      <div className="flex flex-col gap-2">
                        <span className="text-lg">بازگردانی به وضعیت قبل ({stateLabels[previousStatus] || previousStatus})</span>
                        <span className="text-xs opacity-80">
                          ممکن است به صورت اشتباه یک وضعیت انتخاب شده باشد. (اسناد مالی مربوطه را دستی بررسی کنید)
                        </span>
                      </div>
                      <div className="w-10 h-10 rounded-full bg-white/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all transform group-hover:translate-x-2">
                         <HistoryIcon className="w-5 h-5" />
                      </div>
                    </button>
                  )}
                  </div>
                )}
                
                <div className="bg-indigo-50/50 rounded-3xl border border-indigo-100 p-8 shadow-sm">
                  <h3 className="font-bold text-indigo-900 mb-4 flex items-center gap-2 text-lg">
                    <FileText className="w-6 h-6 text-indigo-600" /> اسناد مالی مرتبط
                  </h3>
                  <p className="text-indigo-700/80 mb-6 leading-relaxed">
                    در صورتی که این چک دارای سند حسابداری متصل در سیستم است (مانند سند واگذاری، وصول، یا برگشت)، می‌توانید آن را مشاهده کنید.
                  </p>
                  <button onClick={() => {
                    const doc = transactions?.find(t => t.linkedCheckId === check.id || t.items?.some(i => i.description?.includes(check.checkNumber)));
                    if (doc && onViewAccountingDoc) onViewAccountingDoc(doc);
                    else showNotification('سند حسابداری برای این چک یافت نشد.', 'info');
                  }} className="w-full sm:w-auto flex items-center justify-center gap-3 px-8 py-4 bg-white text-indigo-700 border-2 border-indigo-200 hover:border-indigo-400 hover:bg-indigo-50 rounded-xl transition-all font-bold text-lg shadow-sm">
                    <ExternalLink className="w-6 h-6" />
                    مشاهده سند حسابداری متصل
                  </button>
                </div>
                
              </div>
            </div>
          )}

        </div>
      </div>

      {isEditModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 print:hidden">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-3xl shadow-xl border border-slate-200 p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto" dir="rtl">
            <h3 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2">
              <Edit3 className="w-6 h-6 text-indigo-500" />
              ویرایش اطلاعات چک
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">شماره چک</label>
                <input type="text" value={editFormData.checkNumber} onChange={e => setEditFormData({...editFormData, checkNumber: e.target.value})} className="w-full px-3 py-2 border rounded-xl" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">مبلغ (ریال)</label>
                <input type="number" value={editFormData.amount} onChange={e => setEditFormData({...editFormData, amount: e.target.value})} className="w-full px-3 py-2 border rounded-xl" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">شناسه صیاد</label>
                <input type="text" value={editFormData.sayadId} onChange={e => setEditFormData({...editFormData, sayadId: e.target.value})} className="w-full px-3 py-2 border rounded-xl" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">در وجه</label>
                <input type="text" value={editFormData.payeeName} onChange={e => setEditFormData({...editFormData, payeeName: e.target.value})} className="w-full px-3 py-2 border rounded-xl" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">تاریخ صدور</label>
                <input type="date" value={editFormData.issueDate?.split('T')[0] || ''} onChange={e => setEditFormData({...editFormData, issueDate: e.target.value})} className="w-full px-3 py-2 border rounded-xl" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">تاریخ سررسید</label>
                <input type="date" value={editFormData.dueDate?.split('T')[0] || ''} onChange={e => setEditFormData({...editFormData, dueDate: e.target.value})} className="w-full px-3 py-2 border rounded-xl" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-bold text-slate-700 mb-1">بابت</label>
                <input type="text" value={editFormData.reason} onChange={e => setEditFormData({...editFormData, reason: e.target.value})} className="w-full px-3 py-2 border rounded-xl" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-bold text-slate-700 mb-1">توضیحات تکمیلی</label>
                <textarea value={editFormData.description} onChange={e => setEditFormData({...editFormData, description: e.target.value})} className="w-full px-3 py-2 border rounded-xl h-24"></textarea>
              </div>
            </div>
            
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <button onClick={() => setIsEditModalOpen(false)} className="px-6 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold hover:bg-slate-50 transition-colors">
                انصراف
              </button>
              <button onClick={handleSaveEdit} disabled={saving} className="px-6 py-2.5 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 transition-colors flex items-center gap-2">
                {saving && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                ذخیره تغییرات
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}
