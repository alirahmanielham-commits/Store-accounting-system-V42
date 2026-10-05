import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowDownLeft, ArrowUpRight, User, Landmark, Wallet, DollarSign,
  Calendar, Hash, FileText, CheckCircle2, RefreshCw, Printer,
  CornerDownLeft, ArrowLeft, Volume2, VolumeX, ShieldAlert,
  Search, Check, Zap, Sparkles, AlertCircle
} from 'lucide-react';
import DateObject from 'react-date-object';
import persian from 'react-date-object/calendars/persian';
import persian_fa from 'react-date-object/locales/persian_fa';
import num2persian from 'num2persian';
import { addCommas, convertToGregorian, formatDateDisplay, toPersianDigits } from '../../utils/format';
import { addTransaction } from '../../services/dataService';
import ReceiptPrintModal from '../print/ReceiptPrintModal';
import { useDirtyForm } from '../../hooks/useDirtyForm';
import { UnsavedChangesPrompt } from '../common/UnsavedChangesPrompt';
import { transactionReceiptFormSchema } from '../../schemas/validation';

interface Props {
  persons?: any[];
  accounts?: any[];
  cashboxes?: any[];
  storeSettings?: any;
  transactions?: any[];
  fetchTransactions?: () => Promise<void>;
  fetchAccounts?: () => Promise<void>;
  fetchCashboxes?: () => Promise<void>;
  calculatePersonBalance?: (personId: any) => { status: string; amount: number; isDebtor?: boolean; isCreditor?: boolean };
  onClose?: () => void;
  showNotification?: (msg: string, type: 'success' | 'error' | 'info' | 'warning') => void;
}

// Sound effects using Web Audio API
function playSound(type: 'click' | 'step' | 'back' | 'success', muted: boolean) {
  if (muted) return;
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    if (type === 'click' || type === 'step') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(type === 'step' ? 880 : 640, now);
      osc.frequency.exponentialRampToValueAtTime(320, now + 0.04);
      gain.gain.setValueAtTime(0.06, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.04);
    } else if (type === 'back') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(360, now);
      osc.frequency.exponentialRampToValueAtTime(220, now + 0.06);
      gain.gain.setValueAtTime(0.06, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.06);
    } else if (type === 'success') {
      [523.25, 659.25, 783.99, 1046.50].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.07);
        gain.gain.setValueAtTime(0.12, now + idx * 0.07);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.07 + 0.28);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.07);
        osc.stop(now + idx * 0.07 + 0.28);
      });
    }
  } catch {
    // Ignore audio restrictions
  }
}

export default function KeyboardReceiptPage({
  persons = [],
  accounts = [],
  cashboxes = [],
  storeSettings = {},
  transactions = [],
  fetchTransactions,
  fetchAccounts,
  fetchCashboxes,
  calculatePersonBalance,
  onClose,
  showNotification
}: Props) {
  // Step 1: Type (receive = 1, pay = 2)
  // Step 2: Person selection (search by name, select with 1-9)
  // Step 3: Resource Type (bank = 1, cashbox = 2)
  // Step 4: Specific Account / Cashbox (1-9)
  // Step 5: Amount (number typing + enter)
  // Step 6: Date & Note (enter to advance)
  // Step 7: Confirmation & Save (1/Enter = Save, 2/P = Print, 3/N = Next)
  const [step, setStep] = useState<number>(1);

  // Form State
  const [receiptType, setReceiptType] = useState<'receive' | 'pay'>('receive');
  const [selectedPerson, setSelectedPerson] = useState<any>(null);
  const [personSearch, setPersonSearch] = useState<string>('');
  const [resourceType, setResourceType] = useState<'bank' | 'cashbox'>('bank');
  const [selectedAccount, setSelectedAccount] = useState<any>(null);
  const [selectedCashbox, setSelectedCashbox] = useState<any>(null);
  const [amountStr, setAmountStr] = useState<string>('');
  
  // Today's Persian Date
  const defaultJalaliDate = useMemo(() => {
    try {
      const d = new DateObject({ calendar: persian, locale: persian_fa });
      return d.format('YYYY/MM/DD');
    } catch {
      return '';
    }
  }, []);

  const [dateStr, setDateStr] = useState<string>(defaultJalaliDate);
  const [trackingNumber, setTrackingNumber] = useState<string>('');
  const [noteStr, setNoteStr] = useState<string>('');
  const [step6SubIndex, setStep6SubIndex] = useState<number>(0); // 0: Date, 1: Tracking, 2: Note

  // Execution & UI State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [savedReceipt, setSavedReceipt] = useState<any>(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [soundMuted, setSoundMuted] = useState(false);
  const [recentSavedList, setRecentSavedList] = useState<any[]>([]);

  // Dirty Form Detection
  const isDirty = useMemo(() => {
    return Boolean((selectedPerson || Number(amountStr) > 0 || step > 1) && !savedReceipt);
  }, [selectedPerson, amountStr, step, savedReceipt]);

  const { showPrompt, guardNavigation, confirmDiscard, cancelDiscard } = useDirtyForm({
    isDirty,
    message: 'عملیات ثبت رسید مالی تکمیل نشده است. در صورت خروج اطلاعات از بین خواهد رفت.'
  });

  const handleSafeClose = () => {
    if (onClose) {
      guardNavigation(() => {
        onClose();
      });
    }
  };

  // Input Refs for autofocus
  const personInputRef = useRef<HTMLInputElement>(null);
  const amountInputRef = useRef<HTMLInputElement>(null);
  const dateInputRef = useRef<HTMLInputElement>(null);
  const trackingInputRef = useRef<HTMLInputElement>(null);
  const noteInputRef = useRef<HTMLInputElement>(null);

  const currency = storeSettings?.currency || 'تومان';

  // Filtered persons for Step 2
  const filteredPersons = useMemo(() => {
    const q = personSearch.trim().toLowerCase();
    if (!q) {
      return persons.slice(0, 9);
    }
    return persons.filter((p: any) => {
      const name = (p.name || '').toLowerCase();
      const code = (p.code || p.personCode || '').toString();
      const phone = (p.phone || p.mobile || '').toString();
      return name.includes(q) || code.includes(q) || phone.includes(q);
    }).slice(0, 9);
  }, [persons, personSearch]);

  // Active bank accounts
  const activeBankAccounts = useMemo(() => {
    return accounts.filter((a: any) => a.status !== 'inactive');
  }, [accounts]);

  // Active cashboxes
  const activeCashboxes = useMemo(() => {
    return cashboxes.filter((c: any) => c.status !== 'inactive');
  }, [cashboxes]);

  // Person balance helper
  const getBalanceInfo = (personId: any) => {
    if (!personId) return null;
    if (calculatePersonBalance) {
      return calculatePersonBalance(personId);
    }
    const p = persons.find((x: any) => String(x.id) === String(personId));
    if (!p) return null;
    const b = Number(p.balance || 0);
    return {
      status: b > 0 ? 'بدهکار' : b < 0 ? 'بستانکار' : 'بی‌حساب',
      amount: Math.abs(b),
      isDebtor: b > 0,
      isCreditor: b < 0
    };
  };

  // Convert raw amount string to number
  const parsedAmount = useMemo(() => {
    const clean = amountStr.replace(/,/g, '').trim();
    const num = parseInt(clean, 10);
    return isNaN(num) ? 0 : num;
  }, [amountStr]);

  // Persian words for amount
  const wordsAmount = useMemo(() => {
    if (parsedAmount <= 0) return '';
    try {
      return num2persian(parsedAmount) + ' ' + currency;
    } catch {
      return '';
    }
  }, [parsedAmount, currency]);

  // Focus management on step change
  useEffect(() => {
    if (step === 2) {
      setTimeout(() => personInputRef.current?.focus(), 60);
    } else if (step === 5) {
      setTimeout(() => amountInputRef.current?.focus(), 60);
    } else if (step === 6) {
      if (step6SubIndex === 0) setTimeout(() => dateInputRef.current?.focus(), 60);
      else if (step6SubIndex === 1) setTimeout(() => trackingInputRef.current?.focus(), 60);
      else if (step6SubIndex === 2) setTimeout(() => noteInputRef.current?.focus(), 60);
    }
  }, [step, step6SubIndex]);

  // Auto-generate default description when reaching Step 6
  useEffect(() => {
    if (step === 6 && !noteStr) {
      const typeText = receiptType === 'receive' ? 'دریافت وجه از' : 'پرداخت وجه به';
      const targetName = selectedPerson?.name || 'طرف‌حساب';
      const resourceName = resourceType === 'bank'
        ? (selectedAccount?.bankName || selectedAccount?.title || 'بانک')
        : (selectedCashbox?.name || 'صندوق');
      setNoteStr(`${typeText} ${targetName} - ${resourceName}`);
    }
  }, [step]);

  // Step Reset function
  const resetToStepOne = (keepType = false) => {
    playSound('step', soundMuted);
    setStep(1);
    if (!keepType) setReceiptType('receive');
    setSelectedPerson(null);
    setPersonSearch('');
    setResourceType('bank');
    setSelectedAccount(null);
    setSelectedCashbox(null);
    setAmountStr('');
    setDateStr(defaultJalaliDate);
    setTrackingNumber('');
    setNoteStr('');
    setStep6SubIndex(0);
    setSavedReceipt(null);
  };

  // Step Navigator
  const goToNextStep = () => {
    playSound('step', soundMuted);
    setStep(prev => Math.min(prev + 1, 7));
  };

  const goToPrevStep = () => {
    playSound('back', soundMuted);
    if (step === 6 && step6SubIndex > 0) {
      setStep6SubIndex(prev => prev - 1);
      return;
    }
    setStep(prev => Math.max(prev - 1, 1));
  };

  // Submit Receipt to Backend
  const handleFinalSave = async (autoPrint = false, thenNew = false) => {
    if (isSubmitting) return;
    if (!selectedPerson || parsedAmount <= 0) return;
    if (resourceType === 'bank' && !selectedAccount) return;
    if (resourceType === 'cashbox' && !selectedCashbox) return;

    setIsSubmitting(true);
    try {
      const resourceId = resourceType === 'bank' ? selectedAccount.id : selectedCashbox.id;
      const personName = selectedPerson.name || 'طرف‌حساب';

      // Precise Persian date conversion without day rollback
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

      const payload: any = {
        type: receiptType,
        method: 'cash',
        personId: selectedPerson.id,
        personName,
        amount: parsedAmount,
        date: convertedDate || new Date().toISOString(),
        rawDate: dateStr,
        displayDate: dateStr,
        description: noteStr || (receiptType === 'receive' ? `دریافت وجه از ${personName}` : `پرداخت وجه به ${personName}`),
        note: noteStr,
        resourceType,
        resourceId,
        trackingNumber: trackingNumber || undefined
      };

      const validationResult = transactionReceiptFormSchema.safeParse({
        type: receiptType,
        personId: selectedPerson.id,
        amount: parsedAmount,
        date: convertedDate || new Date().toISOString(),
        resourceType,
        resourceId,
        trackingNumber: trackingNumber || undefined,
        description: noteStr || undefined
      });

      if (!validationResult.success) {
        const issues = (validationResult.error as any).issues || (validationResult.error as any).errors || [];
        const errMsg = issues.map((err: any) => `• ${err.message}`).join('\n');
        if (showNotification) {
          showNotification(`خطا در اعتبارسنجی رسید مالی:\n${errMsg}`, 'error');
        } else {
          alert(`خطا در اعتبارسنجی رسید مالی:\n${errMsg}`);
        }
        return;
      }

      const result = await addTransaction(payload);
      playSound('success', soundMuted);
      
      const receiptNumber = result?.receiptNumber || 'ثبت شد';
      const createdObj = {
        ...payload,
        ...result,
        receiptNumber,
        person: selectedPerson,
        account: selectedAccount,
        cashbox: selectedCashbox
      };

      setSavedReceipt(createdObj);
      setRecentSavedList(prev => [createdObj, ...prev.slice(0, 9)]);

      if (showNotification) {
        showNotification(`رسید ${receiptType === 'receive' ? 'دریافت' : 'پرداخت'} شماره ${receiptNumber} با موفقیت ثبت شد.`, 'success');
      }

      // Refresh global states
      if (fetchTransactions) fetchTransactions();
      if (fetchAccounts) fetchAccounts();
      if (fetchCashboxes) fetchCashboxes();

      if (autoPrint) {
        setIsPrintModalOpen(true);
      }

      if (thenNew) {
        setTimeout(() => {
          resetToStepOne(true);
        }, 300);
      }
    } catch (err: any) {
      if (showNotification) {
        showNotification('خطا در ثبت رسید: ' + (err.message || 'خطای سرور'), 'error');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Global Keyboard Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if print modal is open
      if (isPrintModalOpen) return;

      const key = e.key;

      // F2: Reset new receipt
      if (key === 'F2') {
        e.preventDefault();
        resetToStepOne();
        return;
      }

      // F4: Back / Close
      if (key === 'F4') {
        e.preventDefault();
        handleSafeClose();
        return;
      }

      // M: Toggle audio
      if (key.toLowerCase() === 'm' && e.altKey) {
        e.preventDefault();
        setSoundMuted(prev => !prev);
        return;
      }

      // --- STEP 1: Type Selection (1: Receive, 2: Pay) ---
      if (step === 1) {
        if (key === '1') {
          e.preventDefault();
          setReceiptType('receive');
          playSound('click', soundMuted);
          setStep(2);
        } else if (key === '2') {
          e.preventDefault();
          setReceiptType('pay');
          playSound('click', soundMuted);
          setStep(2);
        } else if (key === 'Escape') {
          e.preventDefault();
          handleSafeClose();
        }
        return;
      }

      // --- STEP 2: Person Selection ---
      if (step === 2) {
        // Digits 1-9 to pick from filtered list
        if (/^[1-9]$/.test(key) && !e.ctrlKey && !e.altKey) {
          const index = parseInt(key, 10) - 1;
          if (filteredPersons[index]) {
            e.preventDefault();
            setSelectedPerson(filteredPersons[index]);
            playSound('click', soundMuted);
            setStep(3);
            return;
          }
        }
        // Esc or Backspace when input is empty returns to Step 1
        if (key === 'Escape') {
          e.preventDefault();
          goToPrevStep();
          return;
        }
        if (key === 'Backspace' && !personSearch) {
          e.preventDefault();
          goToPrevStep();
          return;
        }
        // Enter picks first match if available
        if (key === 'Enter') {
          e.preventDefault();
          if (filteredPersons.length > 0) {
            setSelectedPerson(filteredPersons[0]);
            playSound('click', soundMuted);
            setStep(3);
          }
          return;
        }
        return;
      }

      // --- STEP 3: Resource Type Selection (1: Bank, 2: Cashbox) ---
      if (step === 3) {
        if (key === '1') {
          e.preventDefault();
          setResourceType('bank');
          playSound('click', soundMuted);
          setStep(4);
        } else if (key === '2') {
          e.preventDefault();
          setResourceType('cashbox');
          playSound('click', soundMuted);
          setStep(4);
        } else if (key === 'Escape' || key === 'Backspace') {
          e.preventDefault();
          goToPrevStep();
        }
        return;
      }

      // --- STEP 4: Specific Account / Cashbox Selection ---
      if (step === 4) {
        if (/^[1-9]$/.test(key)) {
          const index = parseInt(key, 10) - 1;
          if (resourceType === 'bank') {
            if (activeBankAccounts[index]) {
              e.preventDefault();
              setSelectedAccount(activeBankAccounts[index]);
              playSound('click', soundMuted);
              setStep(5);
            }
          } else {
            if (activeCashboxes[index]) {
              e.preventDefault();
              setSelectedCashbox(activeCashboxes[index]);
              playSound('click', soundMuted);
              setStep(5);
            }
          }
          return;
        }
        if (key === 'Escape' || key === 'Backspace') {
          e.preventDefault();
          goToPrevStep();
        }
        return;
      }

      // --- STEP 5: Amount ---
      if (step === 5) {
        if (key === 'Escape') {
          e.preventDefault();
          goToPrevStep();
          return;
        }
        if (key === 'Backspace' && !amountStr) {
          e.preventDefault();
          goToPrevStep();
          return;
        }
        if (key === 'Enter') {
          e.preventDefault();
          if (parsedAmount > 0) {
            goToNextStep();
          }
          return;
        }
        // Quick thousand multiplier: Space or '+' appends 000
        if (key === ' ' || key === '+') {
          e.preventDefault();
          if (amountStr) {
            setAmountStr(prev => addCommas(prev.replace(/,/g, '') + '000'));
          }
          return;
        }
        return;
      }

      // --- STEP 6: Date & Details ---
      if (step === 6) {
        if (key === 'Escape') {
          e.preventDefault();
          if (step6SubIndex > 0) {
            setStep6SubIndex(prev => prev - 1);
          } else {
            setStep(5);
          }
          return;
        }
        if (key === 'Enter') {
          e.preventDefault();
          if (step6SubIndex === 0) {
            setStep6SubIndex(1);
          } else if (step6SubIndex === 1) {
            setStep6SubIndex(2);
          } else {
            goToNextStep();
          }
          return;
        }
        return;
      }

      // --- STEP 7: Confirmation & Save ---
      if (step === 7) {
        if (key === 'Escape' || key === 'Backspace') {
          e.preventDefault();
          if (savedReceipt) {
            resetToStepOne();
          } else {
            goToPrevStep();
          }
          return;
        }
        if (key === 'Enter' || key === '1') {
          e.preventDefault();
          if (savedReceipt) {
            resetToStepOne(true);
          } else {
            handleFinalSave(false, false);
          }
          return;
        }
        if (key.toLowerCase() === 'p' || key === '2') {
          e.preventDefault();
          if (savedReceipt) {
            setIsPrintModalOpen(true);
          } else {
            handleFinalSave(true, false);
          }
          return;
        }
        if (key.toLowerCase() === 'n' || key === '3') {
          e.preventDefault();
          if (savedReceipt) {
            resetToStepOne(true);
          } else {
            handleFinalSave(false, true);
          }
          return;
        }
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    step,
    step6SubIndex,
    personSearch,
    filteredPersons,
    activeBankAccounts,
    activeCashboxes,
    resourceType,
    parsedAmount,
    amountStr,
    isPrintModalOpen,
    savedReceipt,
    isSubmitting,
    selectedPerson,
    selectedAccount,
    selectedCashbox,
    receiptType,
    dateStr,
    noteStr,
    trackingNumber,
    soundMuted
  ]);

  const personBalance = useMemo(() => {
    return selectedPerson ? getBalanceInfo(selectedPerson.id) : null;
  }, [selectedPerson]);

  return (
    <div
      className="min-h-[calc(100vh-4rem)] bg-slate-100 flex flex-col justify-between font-sans selection:bg-indigo-500 selection:text-white p-3 sm:p-6"
      dir="rtl"
    >
      {/* Top Header / Status Bar */}
      <div className="w-full max-w-5xl mx-auto flex items-center justify-between bg-white border border-slate-200/90 rounded-2xl px-5 py-3.5 shadow-xs mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold shadow-xs">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-black text-slate-900 flex items-center gap-2">
              <span>ثبت سریع رسید با کیبورد</span>
              <span className="text-[11px] font-mono font-bold bg-amber-100 text-amber-900 px-2 py-0.5 rounded-md">
                بدون نیاز به موس
              </span>
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              با فشردن کلیدهای عددی مرحله به مرحله فرم را تکمیل و ثبت کنید.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Mute Toggle */}
          <button
            type="button"
            onClick={() => setSoundMuted(!soundMuted)}
            className={`p-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
              soundMuted
                ? 'bg-slate-50 text-slate-400 border-slate-200'
                : 'bg-indigo-50 text-indigo-700 border-indigo-200'
            }`}
            title="کلید Alt+M: خاموش/روشن کردن صدای کلیدها"
          >
            {soundMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            <span className="hidden sm:inline">{soundMuted ? 'صدا: خاموش' : 'صدا: روشن'}</span>
          </button>

          {/* Reset / New Receipt [F2] */}
          <button
            type="button"
            onClick={() => resetToStepOne()}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-200"
            title="کلید میانبر F2: شروع مجدد رسید"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">شروع مجدد</span>
            <kbd className="font-mono text-[10px] bg-white px-1.5 py-0.5 rounded border border-slate-300">F2</kbd>
          </button>

          {/* Close [F4 / Esc] */}
          {onClose && (
            <button
              type="button"
              onClick={handleSafeClose}
              className="px-3 py-2 bg-white hover:bg-slate-50 text-slate-600 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-200"
              title="کلید میانبر F4: بازگشت به لیست"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>خروج</span>
              <kbd className="font-mono text-[10px] bg-slate-100 px-1.5 py-0.5 rounded border border-slate-300">F4</kbd>
            </button>
          )}
        </div>
      </div>

      {/* Stepper Progress */}
      <div className="w-full max-w-5xl mx-auto mb-4">
        <div className="grid grid-cols-7 gap-1 sm:gap-2">
          {[
            { num: 1, label: 'نوع رسید' },
            { num: 2, label: 'طرف‌حساب' },
            { num: 3, label: 'روش وجه' },
            { num: 4, label: 'حساب/صندوق' },
            { num: 5, label: 'مبلغ' },
            { num: 6, label: 'تاریخ و شرح' },
            { num: 7, label: 'تأیید و ثبت' },
          ].map((s) => {
            const isDone = step > s.num;
            const isCurrent = step === s.num;
            return (
              <div
                key={s.num}
                onClick={() => {
                  if (s.num < step) {
                    playSound('back', soundMuted);
                    setStep(s.num);
                  }
                }}
                className={`py-2 px-1 text-center rounded-xl border transition-all cursor-pointer ${
                  isCurrent
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-md font-black ring-2 ring-indigo-300'
                    : isDone
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200 font-bold hover:bg-emerald-100'
                    : 'bg-white text-slate-400 border-slate-200 font-medium opacity-60'
                }`}
              >
                <div className="text-[11px] font-mono leading-none">مرحله {s.num}</div>
                <div className="text-[10px] sm:text-xs truncate mt-0.5">{s.label}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Interactive Stage */}
      <div className="w-full max-w-5xl mx-auto flex-1 flex flex-col justify-center">
        <motion.div
          key={step}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.18 }}
          className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-9 shadow-xl relative overflow-hidden"
        >
          {/* ========================================================================= */}
          {/* STEP 1: Operation Type (Receive = 1, Pay = 2) */}
          {/* ========================================================================= */}
          {step === 1 && (
            <div className="space-y-6">
              <div className="text-center max-w-md mx-auto">
                <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">
                  مرحله ۱: انتخاب نوع سند
                </span>
                <h2 className="text-2xl font-black text-slate-900 mt-3">
                  نوع رسید را انتخاب کنید
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  کلید <kbd className="font-mono font-bold bg-slate-100 border border-slate-300 px-1.5 py-0.5 rounded text-slate-800">1</kbd> برای دریافت یا <kbd className="font-mono font-bold bg-slate-100 border border-slate-300 px-1.5 py-0.5 rounded text-slate-800">2</kbd> برای پرداخت را روی کیبورد فشار دهید.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 max-w-2xl mx-auto pt-3">
                {/* 1: Receive */}
                <button
                  type="button"
                  onClick={() => {
                    setReceiptType('receive');
                    playSound('click', soundMuted);
                    setStep(2);
                  }}
                  className={`p-7 rounded-2xl border-2 text-right transition-all flex flex-col justify-between group cursor-pointer relative ${
                    receiptType === 'receive'
                      ? 'border-emerald-500 bg-emerald-50/50 shadow-lg shadow-emerald-500/10'
                      : 'border-slate-200 hover:border-emerald-300 bg-white'
                  }`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center font-bold shadow-md shadow-emerald-500/25">
                      <ArrowDownLeft className="w-6 h-6" />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-slate-400 font-bold">کلید میانبر:</span>
                      <kbd className="w-8 h-8 rounded-xl bg-emerald-600 text-white font-mono font-black text-base flex items-center justify-center shadow-xs">
                        1
                      </kbd>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-emerald-950">
                      دریافت وجه (رسید دریافت)
                    </h3>
                    <p className="text-xs text-slate-600 font-medium mt-1.5 leading-relaxed">
                      دریافت وجه از طرف‌حساب، مشتری یا سایر منابع و واریز به بانک یا صندوق.
                    </p>
                  </div>
                </button>

                {/* 2: Pay */}
                <button
                  type="button"
                  onClick={() => {
                    setReceiptType('pay');
                    playSound('click', soundMuted);
                    setStep(2);
                  }}
                  className={`p-7 rounded-2xl border-2 text-right transition-all flex flex-col justify-between group cursor-pointer relative ${
                    receiptType === 'pay'
                      ? 'border-rose-500 bg-rose-50/50 shadow-lg shadow-rose-500/10'
                      : 'border-slate-200 hover:border-rose-300 bg-white'
                  }`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-rose-500 text-white flex items-center justify-center font-bold shadow-md shadow-rose-500/25">
                      <ArrowUpRight className="w-6 h-6" />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-slate-400 font-bold">کلید میانبر:</span>
                      <kbd className="w-8 h-8 rounded-xl bg-rose-600 text-white font-mono font-black text-base flex items-center justify-center shadow-xs">
                        2
                      </kbd>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-rose-950">
                      پرداخت وجه (رسید پرداخت)
                    </h3>
                    <p className="text-xs text-slate-600 font-medium mt-1.5 leading-relaxed">
                      پرداخت وجه به تأمین‌کننده، بستانکار یا هزینه‌ها از محل بانک یا صندوق.
                    </p>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 2: Person Selection (Type to search, press 1-9 to pick) */}
          {/* ========================================================================= */}
          {step === 2 && (
            <div className="space-y-5">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                <div>
                  <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-100">
                    مرحله ۲: انتخاب طرف‌حساب ({receiptType === 'receive' ? 'دریافت از' : 'پرداخت به'})
                  </span>
                  <h2 className="text-xl font-black text-slate-900 mt-1">
                    شخص مورد نظر را با تایپ نام یا کلید عددی انتخاب کنید
                  </h2>
                </div>
                <div className="text-xs text-slate-400 font-bold flex items-center gap-1.5">
                  <kbd className="font-mono bg-slate-100 border border-slate-300 px-1.5 py-0.5 rounded text-slate-700">1-9</kbd>
                  <span>انتخاب سریع</span>
                  <span>•</span>
                  <kbd className="font-mono bg-slate-100 border border-slate-300 px-1.5 py-0.5 rounded text-slate-700">Esc</kbd>
                  <span>مرحله قبل</span>
                </div>
              </div>

              {/* Search Box */}
              <div className="relative">
                <Search className="w-5 h-5 absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  ref={personInputRef}
                  type="text"
                  value={personSearch}
                  onChange={(e) => setPersonSearch(e.target.value)}
                  placeholder="نام طرف‌حساب، کد یا شماره تماس را تایپ کنید..."
                  className="w-full pr-12 pl-4 py-3.5 bg-slate-50 hover:bg-slate-100/70 focus:bg-white border-2 border-slate-200 focus:border-indigo-600 rounded-2xl text-base font-bold text-slate-900 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all placeholder:text-slate-400"
                />
              </div>

              {/* List of Persons with Key Numbers 1-9 */}
              <div className="space-y-2 pt-1 max-h-[360px] overflow-y-auto">
                {filteredPersons.map((p: any, idx: number) => {
                  const num = idx + 1;
                  const bal = getBalanceInfo(p.id);
                  return (
                    <div
                      key={p.id}
                      onClick={() => {
                        setSelectedPerson(p);
                        playSound('click', soundMuted);
                        setStep(3);
                      }}
                      className="p-3.5 bg-white hover:bg-indigo-50/70 border border-slate-200 hover:border-indigo-300 rounded-2xl flex items-center justify-between transition-all cursor-pointer group"
                    >
                      <div className="flex items-center gap-3">
                        <kbd className="w-8 h-8 rounded-xl bg-slate-800 group-hover:bg-indigo-600 text-white font-mono font-black text-sm flex items-center justify-center transition-colors shadow-xs shrink-0">
                          {num}
                        </kbd>
                        <div>
                          <div className="font-black text-slate-900 text-sm flex items-center gap-2">
                            <span>{p.name || 'بدون نام'}</span>
                            {p.code && (
                              <span className="text-[11px] font-mono text-slate-400 font-normal">
                                (کد: {p.code})
                              </span>
                            )}
                          </div>
                          {(p.phone || p.mobile) && (
                            <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                              {p.phone || p.mobile}
                            </div>
                          )}
                        </div>
                      </div>

                      {bal && (
                        <div className="text-left">
                          <div className={`text-xs font-black ${
                            bal.isDebtor ? 'text-rose-600' : bal.isCreditor ? 'text-emerald-600' : 'text-slate-400'
                          }`}>
                            {bal.status}: {addCommas(bal.amount)} {currency}
                          </div>
                          <span className="text-[10px] text-slate-400">مانده فعلی طرف‌حساب</span>
                        </div>
                      )}
                    </div>
                  );
                })}

                {filteredPersons.length === 0 && (
                  <div className="text-center py-10 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                    <User className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                    <p className="font-bold text-slate-600 text-sm">شخصی با این مشخصات یافت نشد</p>
                    <p className="text-xs text-slate-400 mt-1">
                      نام را تصحیح کنید یا کلید <kbd className="font-mono bg-white px-1 border rounded">Esc</kbd> را بزنید.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 3: Resource Type Selection (1: Bank, 2: Cashbox) */}
          {/* ========================================================================= */}
          {step === 3 && (
            <div className="space-y-6">
              <div className="text-center max-w-md mx-auto">
                <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">
                  مرحله ۳: محل و روش وجه
                </span>
                <h2 className="text-2xl font-black text-slate-900 mt-3">
                  بانک یا صندوق؟
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  کلید <kbd className="font-mono font-bold bg-slate-100 border border-slate-300 px-1.5 py-0.5 rounded text-slate-800">1</kbd> برای بانک یا <kbd className="font-mono font-bold bg-slate-100 border border-slate-300 px-1.5 py-0.5 rounded text-slate-800">2</kbd> برای صندوق را فشار دهید.
                </p>
              </div>

              {selectedPerson && (
                <div className="max-w-md mx-auto p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs flex items-center justify-between">
                  <span className="text-slate-500 font-bold">طرف‌حساب انتخابی:</span>
                  <span className="font-black text-slate-900">{selectedPerson.name}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 max-w-2xl mx-auto pt-2">
                {/* 1: Bank */}
                <button
                  type="button"
                  onClick={() => {
                    setResourceType('bank');
                    playSound('click', soundMuted);
                    setStep(4);
                  }}
                  className="p-7 rounded-2xl border-2 border-slate-200 hover:border-blue-500 bg-white hover:bg-blue-50/40 text-right transition-all flex flex-col justify-between cursor-pointer group"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-bold shadow-md shadow-blue-500/25">
                      <Landmark className="w-6 h-6" />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-slate-400 font-bold">کلید میانبر:</span>
                      <kbd className="w-8 h-8 rounded-xl bg-blue-600 text-white font-mono font-black text-base flex items-center justify-center shadow-xs">
                        1
                      </kbd>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-900">
                      حساب‌های بانکی (بانک)
                    </h3>
                    <p className="text-xs text-slate-600 font-medium mt-1.5 leading-relaxed">
                      واریز/برداشت از حساب‌های بانکی، پوز، کارت‌خوان، حواله ساتنا یا پایا.
                    </p>
                  </div>
                </button>

                {/* 2: Cashbox */}
                <button
                  type="button"
                  onClick={() => {
                    setResourceType('cashbox');
                    playSound('click', soundMuted);
                    setStep(4);
                  }}
                  className="p-7 rounded-2xl border-2 border-slate-200 hover:border-amber-500 bg-white hover:bg-amber-50/40 text-right transition-all flex flex-col justify-between cursor-pointer group"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center font-bold shadow-md shadow-amber-500/25">
                      <Wallet className="w-6 h-6" />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-slate-400 font-bold">کلید میانبر:</span>
                      <kbd className="w-8 h-8 rounded-xl bg-amber-600 text-white font-mono font-black text-base flex items-center justify-center shadow-xs">
                        2
                      </kbd>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-900">
                      صندوق نقدی (صندوق)
                    </h3>
                    <p className="text-xs text-slate-600 font-medium mt-1.5 leading-relaxed">
                      دریافت یا پرداخت وجه نقد، اسکناس فیزیکی از طریق صندوق‌های فروشگاه.
                    </p>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 4: Specific Account / Cashbox Selection */}
          {/* ========================================================================= */}
          {step === 4 && (
            <div className="space-y-5">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                <div>
                  <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-100">
                    مرحله ۴: انتخاب {resourceType === 'bank' ? 'حساب بانکی' : 'صندوق نقدی'}
                  </span>
                  <h2 className="text-xl font-black text-slate-900 mt-1">
                    شماره {resourceType === 'bank' ? 'حساب بانک' : 'صندوق'} را با کلید عددی انتخاب کنید
                  </h2>
                </div>
                <div className="text-xs text-slate-400 font-bold flex items-center gap-1.5">
                  <kbd className="font-mono bg-slate-100 border border-slate-300 px-1.5 py-0.5 rounded text-slate-700">1-9</kbd>
                  <span>انتخاب</span>
                  <span>•</span>
                  <kbd className="font-mono bg-slate-100 border border-slate-300 px-1.5 py-0.5 rounded text-slate-700">Esc</kbd>
                  <span>مرحله قبل</span>
                </div>
              </div>

              {/* Items List */}
              <div className="space-y-2.5 pt-1 max-h-[380px] overflow-y-auto">
                {resourceType === 'bank' ? (
                  activeBankAccounts.map((acc: any, idx: number) => {
                    const num = idx + 1;
                    return (
                      <div
                        key={acc.id}
                        onClick={() => {
                          setSelectedAccount(acc);
                          playSound('click', soundMuted);
                          setStep(5);
                        }}
                        className="p-4 bg-white hover:bg-blue-50/70 border-2 border-slate-200 hover:border-blue-400 rounded-2xl flex items-center justify-between transition-all cursor-pointer group"
                      >
                        <div className="flex items-center gap-3.5">
                          <kbd className="w-9 h-9 rounded-xl bg-slate-900 group-hover:bg-blue-600 text-white font-mono font-black text-base flex items-center justify-center transition-colors shadow-xs shrink-0">
                            {num}
                          </kbd>
                          <div>
                            <div className="font-black text-slate-900 text-sm">
                              {acc.bankName || acc.title || 'حساب بانکی'}
                              {acc.accountNumber && (
                                <span className="font-mono font-normal text-xs text-slate-500 mr-2" dir="ltr">
                                  {acc.accountNumber}
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-slate-500 mt-0.5">
                              {acc.title || acc.branch || 'حساب جاری / پس‌انداز'}
                            </div>
                          </div>
                        </div>

                        <div className="text-left">
                          <div className="text-xs font-black text-slate-800">
                            {addCommas(acc.balance || 0)} {currency}
                          </div>
                          <span className="text-[10px] text-slate-400">موجودی فعلی حساب</span>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  activeCashboxes.map((cb: any, idx: number) => {
                    const num = idx + 1;
                    return (
                      <div
                        key={cb.id}
                        onClick={() => {
                          setSelectedCashbox(cb);
                          playSound('click', soundMuted);
                          setStep(5);
                        }}
                        className="p-4 bg-white hover:bg-amber-50/70 border-2 border-slate-200 hover:border-amber-400 rounded-2xl flex items-center justify-between transition-all cursor-pointer group"
                      >
                        <div className="flex items-center gap-3.5">
                          <kbd className="w-9 h-9 rounded-xl bg-slate-900 group-hover:bg-amber-600 text-white font-mono font-black text-base flex items-center justify-center transition-colors shadow-xs shrink-0">
                            {num}
                          </kbd>
                          <div>
                            <div className="font-black text-slate-900 text-sm">
                              {cb.name || `صندوق شماره ${num}`}
                            </div>
                            <div className="text-xs text-slate-500 mt-0.5">
                              صندوق نقدی فعال
                            </div>
                          </div>
                        </div>

                        <div className="text-left">
                          <div className="text-xs font-black text-slate-800">
                            {addCommas(cb.balance || 0)} {currency}
                          </div>
                          <span className="text-[10px] text-slate-400">موجودی صندوق</span>
                        </div>
                      </div>
                    );
                  })
                )}

                {((resourceType === 'bank' && activeBankAccounts.length === 0) ||
                  (resourceType === 'cashbox' && activeCashboxes.length === 0)) && (
                  <div className="text-center py-10 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                    <AlertCircle className="w-10 h-10 mx-auto text-amber-500 mb-2" />
                    <p className="font-bold text-slate-700 text-sm">
                      {resourceType === 'bank' ? 'حساب بانکی فعالی ثبت نشده است' : 'صندوق نقدی فعالی ثبت نشده است'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 5: Amount Entry */}
          {/* ========================================================================= */}
          {step === 5 && (
            <div className="space-y-6">
              <div className="text-center max-w-md mx-auto">
                <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">
                  مرحله ۵: مبلغ رسید
                </span>
                <h2 className="text-2xl font-black text-slate-900 mt-3">
                  مبلغ {receiptType === 'receive' ? 'دریافتی' : 'پرداختی'} را وارد کنید
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  مبلغ را تایپ کرده و برای رفتن به مرحله بعد کلید <kbd className="font-mono font-bold bg-slate-100 border border-slate-300 px-1.5 py-0.5 rounded text-slate-800">Enter ↵</kbd> را بزنید.
                </p>
              </div>

              {/* Amount Input */}
              <div className="max-w-xl mx-auto">
                <div className="relative">
                  <input
                    ref={amountInputRef}
                    type="text"
                    value={amountStr}
                    onChange={(e) => {
                      const clean = e.target.value.replace(/[^0-9]/g, '');
                      setAmountStr(clean ? addCommas(clean) : '');
                    }}
                    placeholder="۰"
                    className="w-full text-center py-5 px-4 text-3xl sm:text-4xl font-black font-mono tracking-wider bg-slate-50 focus:bg-white border-2 border-slate-200 focus:border-indigo-600 rounded-3xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all text-slate-900"
                    dir="ltr"
                  />
                  <span className="absolute left-6 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-sm">
                    {currency}
                  </span>
                </div>

                {/* Amount in Persian Words */}
                <div className="mt-3 min-h-[28px] text-center">
                  {wordsAmount ? (
                    <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-emerald-50 text-emerald-800 text-xs font-black border border-emerald-200/80">
                      <span>حروف:</span>
                      <span>{wordsAmount}</span>
                    </div>
                  ) : (
                    <span className="text-xs text-slate-400">
                      راهنمای کیبورد: با زدن کلید <kbd className="font-mono bg-slate-100 px-1 border rounded">Space</kbd> یا <kbd className="font-mono bg-slate-100 px-1 border rounded">+</kbd> سه صفر (۰۰۰) به مبلغ اضافه می‌شود.
                    </span>
                  )}
                </div>

                {/* Quick Presets / Balance Clear Button */}
                {personBalance && personBalance.amount > 0 && (
                  <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setAmountStr(addCommas(personBalance.amount.toString()));
                        playSound('click', soundMuted);
                      }}
                      className="px-3.5 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold border border-indigo-200 transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>تکمیل با کل مانده طرف‌حساب: {addCommas(personBalance.amount)} {currency}</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 6: Date & Details */}
          {/* ========================================================================= */}
          {step === 6 && (
            <div className="space-y-6 max-w-xl mx-auto">
              <div className="text-center">
                <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">
                  مرحله ۶: تاریخ، پیگیری و شرح
                </span>
                <h2 className="text-2xl font-black text-slate-900 mt-2">
                  تکمیل جزئیات سند
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  با فشردن کلید <kbd className="font-mono font-bold bg-slate-100 border border-slate-300 px-1.5 py-0.5 rounded text-slate-800">Enter ↵</kbd> بین فیلدها جابجا شوید.
                </p>
              </div>

              <div className="space-y-4">
                {/* 1. Date */}
                <div className={`p-4 rounded-2xl border-2 transition-all ${step6SubIndex === 0 ? 'border-indigo-600 bg-indigo-50/30' : 'border-slate-200'}`}>
                  <label className="block text-xs font-black text-slate-700 mb-1.5">
                    ۱. تاریخ رسید (شمسی)
                  </label>
                  <input
                    ref={dateInputRef}
                    type="text"
                    value={dateStr}
                    onChange={(e) => setDateStr(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-mono font-bold text-slate-900 focus:outline-none focus:border-indigo-600"
                    placeholder="1405/07/14"
                    dir="ltr"
                  />
                </div>

                {/* 2. Tracking Number */}
                <div className={`p-4 rounded-2xl border-2 transition-all ${step6SubIndex === 1 ? 'border-indigo-600 bg-indigo-50/30' : 'border-slate-200'}`}>
                  <label className="block text-xs font-black text-slate-700 mb-1.5">
                    ۲. شماره پیگیری / شماره ارجاع بانکی (اختیاری)
                  </label>
                  <input
                    ref={trackingInputRef}
                    type="text"
                    value={trackingNumber}
                    onChange={(e) => setTrackingNumber(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-mono font-bold text-slate-900 focus:outline-none focus:border-indigo-600"
                    placeholder="مثال: 984512"
                    dir="ltr"
                  />
                </div>

                {/* 3. Note */}
                <div className={`p-4 rounded-2xl border-2 transition-all ${step6SubIndex === 2 ? 'border-indigo-600 bg-indigo-50/30' : 'border-slate-200'}`}>
                  <label className="block text-xs font-black text-slate-700 mb-1.5">
                    ۳. بابت / شرح سند
                  </label>
                  <input
                    ref={noteInputRef}
                    type="text"
                    value={noteStr}
                    onChange={(e) => setNoteStr(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:border-indigo-600"
                    placeholder="بابت تسویه حساب فاکتور..."
                  />
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 7: Confirmation & Action */}
          {/* ========================================================================= */}
          {step === 7 && (
            <div className="space-y-6 max-w-2xl mx-auto">
              {!savedReceipt ? (
                <>
                  <div className="text-center">
                    <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">
                      مرحله ۷: پیش‌نمایش و ثبت نهایی
                    </span>
                    <h2 className="text-2xl font-black text-slate-900 mt-2">
                      مشخصات رسید را بازبینی فرمایید
                    </h2>
                    <p className="text-xs text-slate-500 mt-1">
                      برای ثبت قطعی کلید <kbd className="font-mono font-bold bg-slate-100 border border-slate-300 px-1.5 py-0.5 rounded text-slate-800">Enter ↵</kbd> یا <kbd className="font-mono font-bold bg-slate-100 border border-slate-300 px-1.5 py-0.5 rounded text-slate-800">1</kbd> را فشار دهید.
                    </p>
                  </div>

                  {/* Summary Voucher Card */}
                  <div className="bg-slate-50/80 border-2 border-slate-200 rounded-3xl p-6 space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                      <div className="flex items-center gap-2">
                        <span className={`px-3 py-1 rounded-xl text-xs font-black ${
                          receiptType === 'receive' ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'
                        }`}>
                          {receiptType === 'receive' ? 'رسید دریافت وجه' : 'رسید پرداخت وجه'}
                        </span>
                        <span className="text-xs font-bold text-slate-500">تاریخ: {dateStr}</span>
                      </div>
                      {trackingNumber && (
                        <span className="text-xs font-mono font-bold text-slate-600">
                          شماره پیگیری: {trackingNumber}
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                      <div className="p-3 bg-white rounded-xl border border-slate-200">
                        <span className="text-slate-400 block mb-1">طرف‌حساب:</span>
                        <span className="font-black text-slate-900 text-sm">{selectedPerson?.name}</span>
                        {personBalance && (
                          <div className="mt-1 text-[11px] text-slate-500">
                            مانده فعلی: {addCommas(personBalance.amount)} {currency} ({personBalance.status})
                          </div>
                        )}
                      </div>

                      <div className="p-3 bg-white rounded-xl border border-slate-200">
                        <span className="text-slate-400 block mb-1">محل و روش وجه:</span>
                        <span className="font-black text-slate-900 text-sm">
                          {resourceType === 'bank'
                            ? (selectedAccount?.bankName || selectedAccount?.title || 'حساب بانکی')
                            : (selectedCashbox?.name || 'صندوق نقدی')}
                        </span>
                        <div className="mt-1 text-[11px] text-slate-500">
                          نوع منبع: {resourceType === 'bank' ? 'بانک' : 'صندوق'}
                        </div>
                      </div>
                    </div>

                    {/* Amount Big Box */}
                    <div className="p-4 bg-indigo-600 text-white rounded-2xl text-center shadow-md shadow-indigo-600/20">
                      <span className="text-xs text-indigo-200 block">مبلغ قطعی سند:</span>
                      <div className="text-3xl font-black font-mono tracking-wider mt-1">
                        {addCommas(parsedAmount)} {currency}
                      </div>
                      {wordsAmount && (
                        <div className="text-xs text-indigo-100 font-bold mt-1">
                          {wordsAmount}
                        </div>
                      )}
                    </div>

                    {noteStr && (
                      <div className="text-xs text-slate-600 bg-white p-3 rounded-xl border border-slate-200">
                        <span className="text-slate-400 font-bold ml-1">بابت:</span>
                        <span>{noteStr}</span>
                      </div>
                    )}
                  </div>

                  {/* Actions Grid with Hotkeys */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                    {/* 1 / Enter: Confirm Save */}
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => handleFinalSave(false, false)}
                      className="py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-2xl text-sm font-black flex items-center justify-center gap-2 shadow-md shadow-emerald-600/25 transition-all cursor-pointer group"
                    >
                      {isSubmitting ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <Check className="w-4 h-4" />
                      )}
                      <span>ثبت قطعی رسید</span>
                      <kbd className="font-mono text-xs bg-emerald-800 text-emerald-100 px-2 py-0.5 rounded-lg group-hover:bg-emerald-900 transition-colors">
                        Enter / 1
                      </kbd>
                    </button>

                    {/* 2 / P: Save & Print */}
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => handleFinalSave(true, false)}
                      className="py-3.5 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-2xl text-sm font-black flex items-center justify-center gap-2 shadow-md shadow-indigo-600/25 transition-all cursor-pointer group"
                    >
                      <Printer className="w-4 h-4" />
                      <span>ثبت و چاپ رسید</span>
                      <kbd className="font-mono text-xs bg-indigo-800 text-indigo-100 px-2 py-0.5 rounded-lg group-hover:bg-indigo-900 transition-colors">
                        P / 2
                      </kbd>
                    </button>

                    {/* 3 / N: Save & New */}
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => handleFinalSave(false, true)}
                      className="py-3.5 px-4 bg-slate-800 hover:bg-slate-900 disabled:opacity-50 text-white rounded-2xl text-sm font-black flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer group"
                    >
                      <Zap className="w-4 h-4" />
                      <span>ثبت و رسید بعدی</span>
                      <kbd className="font-mono text-xs bg-slate-700 text-slate-200 px-2 py-0.5 rounded-lg group-hover:bg-slate-800 transition-colors">
                        N / 3
                      </kbd>
                    </button>
                  </div>
                </>
              ) : (
                /* Success Screen */
                <div className="text-center py-6 space-y-5">
                  <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-md shadow-emerald-500/10">
                    <CheckCircle2 className="w-10 h-10" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-slate-900">
                      رسید با موفقیت در سیستم ثبت گردید
                    </h3>
                    <p className="text-sm font-mono font-black text-indigo-600 mt-1">
                      شماره سند: {savedReceipt.receiptNumber}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center justify-center gap-3 pt-3">
                    <button
                      type="button"
                      onClick={() => setIsPrintModalOpen(true)}
                      className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
                    >
                      <Printer className="w-4 h-4" />
                      <span>چاپ رسید [کلید P]</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => resetToStepOne(true)}
                      className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
                    >
                      <Zap className="w-4 h-4" />
                      <span>ثبت رسید جدید [کلید Enter یا N]</span>
                    </button>

                    {onClose && (
                      <button
                        type="button"
                        onClick={handleSafeClose}
                        className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                      >
                        بازگشت به فهرست [کلید Esc]
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </motion.div>
      </div>

      {/* Sticky Bottom Keyboard Instructions & Navigation Bar */}
      <div className="w-full max-w-5xl mx-auto mt-4 bg-white/95 border border-slate-200/90 rounded-2xl p-3 px-5 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-3 text-slate-600 font-bold">
          <div className="flex items-center gap-1.5">
            <kbd className="font-mono text-[11px] bg-slate-100 border border-slate-300 px-2 py-0.5 rounded text-slate-800 font-black">
              1-9
            </kbd>
            <span>انتخاب مستقیم گزینه</span>
          </div>

          <span className="text-slate-300">•</span>

          <div className="flex items-center gap-1.5">
            <kbd className="font-mono text-[11px] bg-slate-100 border border-slate-300 px-2 py-0.5 rounded text-slate-800 font-black">
              Enter ↵
            </kbd>
            <span>تأیید و مرحله بعد</span>
          </div>

          <span className="text-slate-300">•</span>

          <div className="flex items-center gap-1.5">
            <kbd className="font-mono text-[11px] bg-slate-100 border border-slate-300 px-2 py-0.5 rounded text-slate-800 font-black">
              Esc / ⌫
            </kbd>
            <span>مرحله قبل</span>
          </div>
        </div>

        {step > 1 && (
          <button
            type="button"
            onClick={goToPrevStep}
            className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5 rotate-180" />
            <span>بازگشت به مرحله قبل</span>
            <kbd className="font-mono text-[10px] bg-white px-1.5 py-0.5 rounded border border-slate-300">Esc</kbd>
          </button>
        )}
      </div>

      {/* Print Modal Integration */}
      {isPrintModalOpen && savedReceipt && (
        <ReceiptPrintModal
          isOpen={isPrintModalOpen}
          onClose={() => setIsPrintModalOpen(false)}
          data={savedReceipt}
          storeSettings={storeSettings}
          persons={persons}
          accounts={accounts}
          cashboxes={cashboxes}
          formatCurrency={(val) => addCommas(val) + ' ' + currency}
        />
      )}

      {/* Dirty Form Exit Protection Modal */}
      <UnsavedChangesPrompt
        isOpen={showPrompt}
        onStay={cancelDiscard}
        onDiscard={confirmDiscard}
        title="ثبت رسید مالی ناتمام"
        description="اطلاعات وارد شده در این رسید مالی هنوز نهایی نشده‌اند. آیا از خروج اطمینان دارید؟"
      />
    </div>
  );
}
