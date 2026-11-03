import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  ArrowDownLeft, ArrowUpRight, User, Landmark, Wallet, DollarSign,
  Calendar, Hash, FileText, CheckCircle2, RefreshCw, Printer,
  ArrowRight, Search, Check, Zap, Plus, X, Phone, CreditCard,
  ChevronDown, AlertCircle, Share2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import num2persian from 'num2persian';
import DateObject from 'react-date-object';
import persian from 'react-date-object/calendars/persian';
import persian_fa from 'react-date-object/locales/persian_fa';
import { addCommas, removeCommas, convertToGregorian, formatDateDisplay, toPersianDigits } from '../../utils/format';
import { addTransaction, addPerson, generateId } from '../../services/dataService';
import { playAudioFeedback } from '../../utils/audio';

interface Props {
  initialType?: 'receive' | 'pay';
  persons?: any[];
  accounts?: any[];
  cashboxes?: any[];
  storeSettings?: any;
  transactions?: any[];
  fetchTransactions?: () => Promise<void>;
  fetchAccounts?: () => Promise<void>;
  fetchCashboxes?: () => Promise<void>;
  fetchPersons?: () => Promise<void>;
  calculatePersonBalance?: (personId: any) => { status: string; amount: number; isDebtor?: boolean; isCreditor?: boolean };
  onBack?: () => void;
  showNotification?: (msg: string, type: 'success' | 'error' | 'info' | 'warning') => void;
}

export default function MobileReceiptForm({
  initialType = 'receive',
  persons = [],
  accounts = [],
  cashboxes = [],
  storeSettings,
  transactions = [],
  fetchTransactions,
  fetchAccounts,
  fetchCashboxes,
  fetchPersons,
  calculatePersonBalance,
  onBack,
  showNotification
}: Props) {
  const currency = storeSettings?.currency || 'تومان';

  // Form State
  const [receiptType, setReceiptType] = useState<'receive' | 'pay'>(initialType);
  const [amountStr, setAmountStr] = useState<string>('');
  const [selectedPerson, setSelectedPerson] = useState<any | null>(null);
  const [resourceType, setResourceType] = useState<'bank' | 'cashbox'>('bank');
  const [selectedResource, setSelectedResource] = useState<any | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'transfer' | 'check'>('card');
  const [trackingNumber, setTrackingNumber] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [dateStr, setDateStr] = useState<string>(() => {
    try {
      return new DateObject({ calendar: persian, locale: persian_fa }).format('YYYY/MM/DD');
    } catch {
      return '';
    }
  });

  // UI Modals & Drawers
  const [isPersonDrawerOpen, setIsPersonDrawerOpen] = useState(false);
  const [isResourceDrawerOpen, setIsResourceDrawerOpen] = useState(false);
  const [isQuickPersonModalOpen, setIsQuickPersonModalOpen] = useState(false);
  const [personSearch, setPersonSearch] = useState('');
  const [newPersonName, setNewPersonName] = useState('');
  const [newPersonMobile, setNewPersonMobile] = useState('');
  const [isSavingNewPerson, setIsSavingNewPerson] = useState(false);

  // Submission State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [savedReceipt, setSavedReceipt] = useState<any | null>(null);

  // Auto-select default bank or cashbox on mount
  useEffect(() => {
    if (resourceType === 'bank') {
      if (accounts && accounts.length > 0 && !selectedResource) {
        setSelectedResource(accounts[0]);
      }
    } else {
      if (cashboxes && cashboxes.length > 0 && !selectedResource) {
        setSelectedResource(cashboxes[0]);
      }
    }
  }, [resourceType, accounts, cashboxes]);

  // Clean parsed amount
  const parsedAmount = useMemo(() => {
    const raw = removeCommas(amountStr || '0');
    const num = Number(raw);
    return isNaN(num) || num < 0 ? 0 : num;
  }, [amountStr]);

  // Amount in Persian words
  const wordsAmount = useMemo(() => {
    if (parsedAmount <= 0) return '';
    try {
      return num2persian(parsedAmount) + ' ' + currency;
    } catch {
      return '';
    }
  }, [parsedAmount, currency]);

  // Filtered persons for drawer
  const filteredPersons = useMemo(() => {
    if (!persons || !Array.isArray(persons)) return [];
    const query = personSearch.trim().toLowerCase();
    if (!query) return persons.slice(0, 50);
    return persons.filter(p => {
      const name = String(p.name || '').toLowerCase();
      const phone = String(p.phone || p.mobile || '');
      const code = String(p.accountingCode || p.code || '');
      return name.includes(query) || phone.includes(query) || code.includes(query);
    }).slice(0, 50);
  }, [persons, personSearch]);

  // Quick Amount Addition
  const handleQuickAdd = (valueToAdd: number) => {
    try { playAudioFeedback('info'); } catch (_) {}
    const newTotal = parsedAmount + valueToAdd;
    setAmountStr(addCommas(newTotal));
  };

  // Quick Person Creation
  const handleCreateQuickPerson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPersonName.trim()) {
      if (showNotification) showNotification('لطفاً نام طرف‌حساب را وارد فرمایید.', 'error');
      return;
    }
    setIsSavingNewPerson(true);
    try {
      const newP = await addPerson({
        name: newPersonName.trim(),
        mobile: newPersonMobile.trim(),
        phone: newPersonMobile.trim(),
        type: 'customer_supplier',
        status: 'active',
        createdAt: Date.now()
      });
      if (fetchPersons) await fetchPersons();
      setSelectedPerson(newP);
      setIsQuickPersonModalOpen(false);
      setIsPersonDrawerOpen(false);
      setNewPersonName('');
      setNewPersonMobile('');
      if (showNotification) showNotification(`طرف‌حساب «${newP.name}» ایجاد و انتخاب شد.`, 'success');
      try { playAudioFeedback('success'); } catch (_) {}
    } catch (err: any) {
      if (showNotification) showNotification('خطا در ثبت طرف‌حساب: ' + (err.message || 'خطای سرور'), 'error');
    } finally {
      setIsSavingNewPerson(false);
    }
  };

  // Reset Form for New Receipt
  const resetForm = () => {
    setAmountStr('');
    setSelectedPerson(null);
    setTrackingNumber('');
    setDescription('');
    setSavedReceipt(null);
    if (accounts && accounts.length > 0) setSelectedResource(accounts[0]);
  };

  // Submit Handler
  const handleSubmitReceipt = async () => {
    if (isSubmitting) return;

    if (!selectedPerson) {
      if (showNotification) showNotification('لطفاً طرف‌حساب را انتخاب فرمایید.', 'error');
      return;
    }
    if (parsedAmount <= 0) {
      if (showNotification) showNotification('لطفاً مبلغ معتبری وارد نمایید.', 'error');
      return;
    }
    if (!selectedResource) {
      if (showNotification) showNotification('لطفاً حساب بانکی یا صندوق را انتخاب فرمایید.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      let convertedDate = '';
      try {
        const cleanDate = dateStr.trim().replace(/[۰-۹]/g, (d) => "۰۱۲۳۴۵۶۷۸۹".indexOf(d).toString());
        const dObj = new DateObject({ date: cleanDate, format: 'YYYY/MM/DD', calendar: persian, locale: persian_fa });
        const now = new Date();
        dObj.setHour(now.getHours() || 12);
        dObj.setMinute(now.getMinutes() || 0);
        dObj.setSecond(now.getSeconds() || 0);
        convertedDate = dObj.toDate().toISOString();
      } catch {
        convertedDate = convertToGregorian(dateStr);
      }

      const nowTimestamp = Date.now();
      const nowDate = new Date(nowTimestamp);
      const nowTimeStr = `${String(nowDate.getHours()).padStart(2, '0')}:${String(nowDate.getMinutes()).padStart(2, '0')}`;
      const personName = selectedPerson.name || 'طرف‌حساب';

      const payload: any = {
        type: receiptType,
        method: paymentMethod === 'card' || paymentMethod === 'transfer' ? 'transfer' : paymentMethod,
        personId: selectedPerson.id,
        personName,
        amount: parsedAmount,
        currency,
        date: convertedDate || new Date().toISOString(),
        time: nowTimeStr,
        createdAt: nowTimestamp,
        rawDate: dateStr,
        displayDate: dateStr,
        description: description || (receiptType === 'receive' ? `دریافت وجه از ${personName}` : `پرداخت وجه به ${personName}`),
        resourceType,
        resourceId: selectedResource.id,
        accountId: resourceType === 'bank' ? selectedResource.id : undefined,
        cashboxId: resourceType === 'cashbox' ? selectedResource.id : undefined,
        trackingNumber: trackingNumber ? trackingNumber.trim() : undefined
      };

      const result = await addTransaction(payload);
      try { playAudioFeedback('success'); } catch (_) {}

      const receiptNumber = result?.receiptNumber || 'ثبت شد';
      const createdObj = {
        ...payload,
        ...result,
        receiptNumber,
        person: selectedPerson,
        resource: selectedResource
      };

      setSavedReceipt(createdObj);

      if (showNotification) {
        showNotification(`رسید ${receiptType === 'receive' ? 'دریافت' : 'پرداخت'} شماره ${receiptNumber} با موفقیت ثبت شد.`, 'success');
      }

      // Refresh in background
      if (fetchTransactions) fetchTransactions().catch(() => {});
      if (fetchAccounts) fetchAccounts().catch(() => {});
      if (fetchCashboxes) fetchCashboxes().catch(() => {});
    } catch (err: any) {
      if (showNotification) {
        showNotification('خطا در ثبت رسید: ' + (err.message || 'خطای شبکه'), 'error');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // If successfully saved, render elegant Mobile Success Card
  if (savedReceipt) {
    const isRec = savedReceipt.type === 'receive';
    return (
      <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-slate-950 p-4 font-sans" dir="rtl">
        <div className="my-auto max-w-sm mx-auto w-full bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-xl border border-slate-100 dark:border-slate-800 text-center">
          <div className={`w-20 h-20 mx-auto rounded-3xl flex items-center justify-center mb-4 ${
            isRec ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
          }`}>
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <h2 className="text-xl font-black text-slate-900 dark:text-white mb-1">
            {isRec ? 'رسید دریافت وجه ثبت شد' : 'رسید پرداخت وجه ثبت شد'}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-6">
            شماره سند / رسید: <span className="font-mono font-black text-indigo-600 dark:text-indigo-400">{savedReceipt.receiptNumber}</span>
          </p>

          <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-4 text-right space-y-3 mb-6 border border-slate-100 dark:border-slate-800 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-500 dark:text-slate-400">طرف‌حساب:</span>
              <span className="font-black text-slate-800 dark:text-white">{savedReceipt.personName}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500 dark:text-slate-400">مبلغ نهایی:</span>
              <span className={`font-black text-sm ${isRec ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                {addCommas(savedReceipt.amount)} {currency}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500 dark:text-slate-400">محل تسویه:</span>
              <span className="font-medium text-slate-700 dark:text-slate-300">
                {savedReceipt.resource?.bankName || savedReceipt.resource?.title || savedReceipt.resource?.name || 'صندوق/بانک'}
              </span>
            </div>
            {savedReceipt.trackingNumber && (
              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400">کد پیگیری:</span>
                <span className="font-mono font-bold text-slate-700 dark:text-slate-300">{savedReceipt.trackingNumber}</span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-slate-500 dark:text-slate-400">تاریخ:</span>
              <span className="font-medium text-slate-700 dark:text-slate-300">{savedReceipt.displayDate || dateStr}</span>
            </div>
          </div>

          <div className="flex flex-col gap-2.5">
            <button
              type="button"
              onClick={resetForm}
              className="w-full h-13 bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white rounded-2xl font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/25 transition-all cursor-pointer"
            >
              <Zap className="w-4 h-4" />
              <span>ثبت رسید بعدی</span>
            </button>

            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="w-full h-12 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <span>بازگشت به داشبورد موبایل</span>
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  const isReceive = receiptType === 'receive';
  const personBalanceInfo = selectedPerson && calculatePersonBalance ? calculatePersonBalance(selectedPerson.id) : null;

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-slate-950 font-sans pb-28" dir="rtl">
      {/* Top App Bar */}
      <header className="sticky top-0 z-30 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95 transition-all cursor-pointer"
              aria-label="بازگشت"
            >
              <ArrowRight className="w-5 h-5" />
            </button>
          )}
          <div>
            <h1 className="text-sm font-black text-slate-900 dark:text-white">
              {isReceive ? 'ثبت رسید دریافت وجه' : 'ثبت رسید پرداخت وجه'}
            </h1>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">پورتال اختصاصی همراه</p>
          </div>
        </div>

        {/* Switch Receive / Pay toggle pill */}
        <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
          <button
            type="button"
            onClick={() => {
              setReceiptType('receive');
              try { playAudioFeedback('info'); } catch (_) {}
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
              isReceive
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            دریافت
          </button>
          <button
            type="button"
            onClick={() => {
              setReceiptType('pay');
              try { playAudioFeedback('info'); } catch (_) {}
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
              !isReceive
                ? 'bg-rose-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            پرداخت
          </button>
        </div>
      </header>

      {/* Main Single-Page Scrollable Form */}
      <main className="p-4 space-y-4 max-w-lg mx-auto w-full">
        {/* 1. Large Amount Card */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 shadow-sm border border-slate-200/70 dark:border-slate-800/80">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
              {isReceive ? 'مبلغ دریافتی' : 'مبلغ پرداختی'}
            </span>
            <span className="text-xs font-black text-indigo-600 dark:text-indigo-400">
              {currency}
            </span>
          </div>

          {/* Huge Numeric Input */}
          <div className="relative flex items-center">
            <input
              type="text"
              inputMode="numeric"
              placeholder="۰"
              value={amountStr}
              onChange={(e) => {
                const clean = removeCommas(e.target.value);
                if (clean === '' || /^\d+$/.test(clean)) {
                  setAmountStr(clean ? addCommas(clean) : '');
                }
              }}
              className={`w-full text-3xl font-black text-right tracking-tight bg-transparent border-0 focus:ring-0 p-0 placeholder-slate-300 dark:placeholder-slate-700 ${
                isReceive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
              }`}
              autoFocus
            />
            {amountStr && (
              <button
                type="button"
                onClick={() => setAmountStr('')}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-600 flex items-center justify-center shrink-0 cursor-pointer ml-2"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Persian Words Indicator */}
          {wordsAmount ? (
            <p className="text-xs font-bold text-slate-600 dark:text-slate-300 mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800 leading-relaxed">
              {wordsAmount}
            </p>
          ) : (
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              مبلغ را به عدد وارد فرمایید تا معادل حروفی نمایش داده شود.
            </p>
          )}

          {/* Quick Add Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-3 mt-1">
            {[100000, 500000, 1000000, 5000000, 10000000].map((step) => (
              <button
                key={step}
                type="button"
                onClick={() => handleQuickAdd(step)}
                className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[11px] font-bold whitespace-nowrap active:scale-95 transition-all cursor-pointer shrink-0 border border-slate-200/50 dark:border-slate-700/50"
              >
                +{step >= 1000000 ? `${step / 1000000} م` : `${step / 1000} ه`}
              </button>
            ))}
          </div>
        </div>

        {/* 2. Party Selection Card (طرف‌حساب) */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 shadow-sm border border-slate-200/70 dark:border-slate-800/80">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5" />
              <span>طرف‌حساب (مشتری / تامین‌کننده)</span>
            </span>
            <button
              type="button"
              onClick={() => setIsQuickPersonModalOpen(true)}
              className="text-[11px] font-black text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3 h-3" />
              <span>شخص جدید</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => setIsPersonDrawerOpen(true)}
            className="w-full p-3.5 rounded-2xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/60 dark:hover:bg-slate-800 border border-slate-200/70 dark:border-slate-700/70 text-right flex items-center justify-between transition-all cursor-pointer"
          >
            {selectedPerson ? (
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-indigo-600/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-black text-sm shrink-0">
                  {selectedPerson.name ? selectedPerson.name.charAt(0) : 'ش'}
                </div>
                <div className="truncate text-right">
                  <p className="text-xs font-black text-slate-900 dark:text-white truncate">
                    {selectedPerson.name}
                  </p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                    {selectedPerson.mobile || selectedPerson.phone || 'بدون شماره تماس'}
                    {personBalanceInfo && (
                      <span className={`mr-2 font-bold ${
                        personBalanceInfo.isDebtor ? 'text-amber-600 dark:text-amber-400' : personBalanceInfo.isCreditor ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'
                      }`}>
                        (مانده: {addCommas(personBalanceInfo.amount)} {currency} {personBalanceInfo.status})
                      </span>
                    )}
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2.5 text-slate-400 dark:text-slate-500">
                <Search className="w-4 h-4" />
                <span className="text-xs font-bold">لمس جهت جستجو و انتخاب شخص...</span>
              </div>
            )}
            <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
          </button>
        </div>

        {/* 3. Settlement Resource (بانک / صندوق) */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 shadow-sm border border-slate-200/70 dark:border-slate-800/80">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Landmark className="w-3.5 h-3.5" />
              <span>محل تسویه وجه</span>
            </span>

            {/* Bank vs Cashbox segmented pill */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
              <button
                type="button"
                onClick={() => {
                  setResourceType('bank');
                  if (accounts && accounts.length > 0) setSelectedResource(accounts[0]);
                }}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-black transition-all cursor-pointer ${
                  resourceType === 'bank' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-xs' : 'text-slate-500'
                }`}
              >
                بانک
              </button>
              <button
                type="button"
                onClick={() => {
                  setResourceType('cashbox');
                  if (cashboxes && cashboxes.length > 0) setSelectedResource(cashboxes[0]);
                }}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-black transition-all cursor-pointer ${
                  resourceType === 'cashbox' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-xs' : 'text-slate-500'
                }`}
              >
                صندوق
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsResourceDrawerOpen(true)}
            className="w-full p-3.5 rounded-2xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/60 dark:hover:bg-slate-800 border border-slate-200/70 dark:border-slate-700/70 text-right flex items-center justify-between transition-all cursor-pointer"
          >
            {selectedResource ? (
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                  {resourceType === 'bank' ? <Landmark className="w-4 h-4" /> : <Wallet className="w-4 h-4" />}
                </div>
                <div>
                  <p className="text-xs font-black text-slate-900 dark:text-white">
                    {selectedResource.bankName || selectedResource.title || selectedResource.name}
                    {selectedResource.branchName && ` - ${selectedResource.branchName}`}
                  </p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                    {selectedResource.accountNumber ? `شماره حساب: ${selectedResource.accountNumber}` : 'صندوق فروشگاه'}
                  </p>
                </div>
              </div>
            ) : (
              <span className="text-xs font-bold text-slate-400">انتخاب حساب یا صندوق...</span>
            )}
            <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
          </button>
        </div>

        {/* 4. Payment Method & Tracking Number */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 shadow-sm border border-slate-200/70 dark:border-slate-800/80 space-y-3">
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <CreditCard className="w-3.5 h-3.5" />
            <span>نحوه پرداخت / تسویه</span>
          </span>

          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'card', title: 'کارتخوان / کارت' },
              { id: 'cash', title: 'وجه نقد' },
              { id: 'check', title: 'چک' }
            ].map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setPaymentMethod(m.id as any)}
                className={`py-2.5 px-2 rounded-xl text-xs font-black transition-all cursor-pointer border text-center ${
                  paymentMethod === m.id
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                    : 'bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 border-slate-200/60 dark:border-slate-700/60 hover:bg-slate-100'
                }`}
              >
                {m.title}
              </button>
            ))}
          </div>

          {/* Reference / Tracking Number */}
          <div className="pt-1">
            <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1 block">
              شماره پیگیری / ارجاع (اختیاری)
            </label>
            <input
              type="text"
              placeholder="مثال: ۴۹۲۸۱۹"
              value={trackingNumber}
              onChange={(e) => setTrackingNumber(e.target.value)}
              className="w-full h-11 px-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/70 text-xs font-mono font-bold text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Note / Description */}
          <div>
            <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1 block">
              توضیحات و بابت (اختیاری)
            </label>
            <input
              type="text"
              placeholder="مثال: تسویه فاکتور شماره ۱۲ یا بیعانه سفارش"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full h-11 px-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/70 text-xs font-medium text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>
      </main>

      {/* Sticky Bottom Action Bar (Thumb Zone) */}
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200/80 dark:border-slate-800/80 p-3 pb-safe max-w-lg mx-auto">
        <button
          type="button"
          disabled={isSubmitting || parsedAmount <= 0 || !selectedPerson}
          onClick={handleSubmitReceipt}
          className={`w-full h-14 rounded-2xl font-black text-sm flex items-center justify-center gap-2 shadow-lg transition-all active:scale-98 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
            isReceive
              ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/30'
              : 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/30'
          }`}
        >
          {isSubmitting ? (
            <>
              <RefreshCw className="w-5 h-5 animate-spin" />
              <span>در حال ثبت تراکنش...</span>
            </>
          ) : (
            <>
              {isReceive ? <ArrowDownLeft className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
              <span>
                {isReceive ? 'ثبت و تایید دریافت' : 'ثبت و تایید پرداخت'}
                {parsedAmount > 0 && ` (${addCommas(parsedAmount)} ${currency})`}
              </span>
            </>
          )}
        </button>
      </div>

      {/* Person Selection Bottom Sheet Drawer */}
      <AnimatePresence>
        {isPersonDrawerOpen && (
          <div className="fixed inset-0 z-50 flex flex-col justify-end">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsPersonDrawerOpen(false)}
              className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 250 }}
              className="relative z-10 bg-white dark:bg-slate-900 rounded-t-3xl p-4 max-h-[85vh] flex flex-col shadow-2xl border-t border-slate-200 dark:border-slate-800"
            >
              <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto mb-3" />
              
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-black text-slate-900 dark:text-white">انتخاب طرف‌حساب</h3>
                <button
                  type="button"
                  onClick={() => setIsQuickPersonModalOpen(true)}
                  className="px-2.5 py-1 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-xl text-xs font-black flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>ثبت شخص جدید</span>
                </button>
              </div>

              {/* Search Box */}
              <div className="relative mb-3">
                <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5" />
                <input
                  type="text"
                  placeholder="جستجو با نام، موبایل یا کد..."
                  value={personSearch}
                  onChange={(e) => setPersonSearch(e.target.value)}
                  className="w-full h-11 pr-10 pl-4 rounded-xl bg-slate-100 dark:bg-slate-800 border-0 text-xs font-medium focus:ring-2 focus:ring-indigo-500 placeholder-slate-400"
                  autoFocus
                />
                {personSearch && (
                  <button
                    type="button"
                    onClick={() => setPersonSearch('')}
                    className="absolute left-3 top-3 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Persons List */}
              <div className="overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 flex-1 -mx-2 px-2">
                {filteredPersons.length === 0 ? (
                  <div className="text-center py-8 text-xs text-slate-400">
                    شخصی با این مشخصات یافت نشد.
                  </div>
                ) : (
                  filteredPersons.map((p) => {
                    const isSelected = selectedPerson?.id === p.id;
                    const bal = calculatePersonBalance ? calculatePersonBalance(p.id) : null;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          setSelectedPerson(p);
                          setIsPersonDrawerOpen(false);
                          setPersonSearch('');
                          try { playAudioFeedback('info'); } catch (_) {}
                        }}
                        className={`w-full py-3 px-2 flex items-center justify-between text-right hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer rounded-xl ${
                          isSelected ? 'bg-indigo-50/70 dark:bg-indigo-950/40' : ''
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs shrink-0 ${
                            isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                          }`}>
                            {p.name ? p.name.charAt(0) : 'ش'}
                          </div>
                          <div>
                            <p className="text-xs font-black text-slate-900 dark:text-white">
                              {p.name}
                            </p>
                            <p className="text-[10px] text-slate-400 mt-0.5">
                              {p.mobile || p.phone || 'بدون شماره'}
                            </p>
                          </div>
                        </div>

                        <div className="text-left">
                          {bal && (
                            <p className={`text-[11px] font-black ${
                              bal.isDebtor ? 'text-amber-600 dark:text-amber-400' : bal.isCreditor ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'
                            }`}>
                              {addCommas(bal.amount)} {bal.status}
                            </p>
                          )}
                          {isSelected && <Check className="w-4 h-4 text-indigo-600 mr-auto mt-0.5" />}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Resource (Bank / Cashbox) Selection Bottom Sheet Drawer */}
      <AnimatePresence>
        {isResourceDrawerOpen && (
          <div className="fixed inset-0 z-50 flex flex-col justify-end">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsResourceDrawerOpen(false)}
              className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 250 }}
              className="relative z-10 bg-white dark:bg-slate-900 rounded-t-3xl p-4 max-h-[70vh] flex flex-col shadow-2xl border-t border-slate-200 dark:border-slate-800"
            >
              <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto mb-3" />
              <h3 className="text-sm font-black text-slate-900 dark:text-white mb-3">
                انتخاب {resourceType === 'bank' ? 'حساب بانکی' : 'صندوق'}
              </h3>

              <div className="overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 flex-1">
                {(resourceType === 'bank' ? accounts : cashboxes).map((res) => {
                  const isSelected = selectedResource?.id === res.id;
                  return (
                    <button
                      key={res.id}
                      type="button"
                      onClick={() => {
                        setSelectedResource(res);
                        setIsResourceDrawerOpen(false);
                        try { playAudioFeedback('info'); } catch (_) {}
                      }}
                      className={`w-full py-3.5 px-3 flex items-center justify-between text-right hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer rounded-2xl ${
                        isSelected ? 'bg-indigo-50/70 dark:bg-indigo-950/40' : ''
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                          isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                        }`}>
                          {resourceType === 'bank' ? <Landmark className="w-4 h-4" /> : <Wallet className="w-4 h-4" />}
                        </div>
                        <div>
                          <p className="text-xs font-black text-slate-900 dark:text-white">
                            {res.bankName || res.title || res.name}
                            {res.branchName && ` - ${res.branchName}`}
                          </p>
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            {res.accountNumber ? `شماره حساب: ${res.accountNumber}` : 'صندوق فروشگاه'}
                          </p>
                        </div>
                      </div>
                      {isSelected && <Check className="w-4 h-4 text-indigo-600" />}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Quick Add Person Modal */}
      <AnimatePresence>
        {isQuickPersonModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsQuickPersonModalOpen(false)}
              className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative z-10 bg-white dark:bg-slate-900 rounded-3xl p-5 max-w-sm w-full shadow-2xl border border-slate-200 dark:border-slate-800"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-black text-slate-900 dark:text-white">ثبت سریع طرف‌حساب جدید</h3>
                <button
                  type="button"
                  onClick={() => setIsQuickPersonModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateQuickPerson} className="space-y-3">
                <div>
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-300 mb-1 block">نام و نام خانوادگی *</label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: علی احمدی"
                    value={newPersonName}
                    onChange={(e) => setNewPersonName(e.target.value)}
                    className="w-full h-11 px-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold focus:ring-2 focus:ring-indigo-500"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-300 mb-1 block">شماره موبایل (اختیاری)</label>
                  <input
                    type="tel"
                    placeholder="۰۹۱۲۳۴۵۶۷۸۹"
                    value={newPersonMobile}
                    onChange={(e) => setNewPersonMobile(e.target.value)}
                    className="w-full h-11 px-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono font-bold focus:ring-2 focus:ring-indigo-500 text-left"
                    dir="ltr"
                  />
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="submit"
                    disabled={isSavingNewPerson || !newPersonName.trim()}
                    className="flex-1 h-11 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isSavingNewPerson ? 'در حال ثبت...' : 'ثبت و انتخاب'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsQuickPersonModalOpen(false)}
                    className="px-4 h-11 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
                  >
                    انصراف
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