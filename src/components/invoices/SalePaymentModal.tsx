import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  X, Save, RefreshCw, CreditCard, Wallet, Banknote, 
  CheckCircle, Clock, AlertTriangle, ArrowRight, Printer, Sparkles, User, Tag
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { addTransaction, updateTransaction } from '../../services/invoiceService';
import { playAudioFeedback as playAudioUtil } from '../../utils/audio';

interface SalePaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  payload: any;
  saveInvoiceData: (payload: any, isDraft?: boolean, isOverride?: boolean) => Promise<any>;
  accounts?: any[];
  cashboxes?: any[];
  transactions?: any[];
  formatCurrency: (val: number | string) => string;
  addCommas: (val: number | string) => string;
  persons?: any[];
  setViewingInvoice?: (inv: any) => void;
  calculatePersonBalance?: (personId: string | number) => { amount: number; status: string; color?: string };
  storeSettings?: any;
  showNotification?: (msg: string, type?: 'success' | 'error' | 'info') => void;
  playAudioFeedback?: (type: 'beep' | 'success' | 'error' | 'delete' | 'scan') => void;
}

export default function SalePaymentModal({
  isOpen,
  onClose,
  payload,
  saveInvoiceData,
  accounts = [],
  cashboxes = [],
  transactions = [],
  formatCurrency,
  addCommas,
  persons = [],
  setViewingInvoice,
  calculatePersonBalance,
  storeSettings,
  showNotification,
  playAudioFeedback
}: SalePaymentModalProps) {
  const playSound = playAudioFeedback || playAudioUtil;
  // Payment methods: 'pos' (کارتخوان), 'cash' (نقد), 'credit' (نسیه), 'partial' (علی‌الحساب)
  const [method, setMethod] = useState<'pos' | 'cash' | 'credit' | 'partial'>('pos');
  const [paidAmount, setPaidAmount] = useState('');
  const [paymentAccountId, setPaymentAccountId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [unallocatedBalance, setUnallocatedBalance] = useState(0);
  const [useUnallocated, setUseUnallocated] = useState(false);
  const [unallocatedAmountToUse, setUnallocatedAmountToUse] = useState('');
  const [autoOpenPrint, setAutoOpenPrint] = useState(false);

  const amountInputRef = useRef<HTMLInputElement>(null);

  const totalAmount = Number(payload?.totalAmount) || 0;
  const currency = payload?.currency || storeSettings?.currency || 'تومان';

  // Customer information
  const customer = useMemo(() => {
    if (!payload?.customerId || !Array.isArray(persons)) return null;
    return persons.find((p: any) => String(p.id) === String(payload.customerId));
  }, [payload?.customerId, persons]);

  // Customer current balance
  const customerBalance = useMemo(() => {
    if (!payload?.customerId || typeof calculatePersonBalance !== 'function') return null;
    return calculatePersonBalance(payload.customerId);
  }, [payload?.customerId, calculatePersonBalance]);

  // Active accounts and cashboxes
  const activeBanks = useMemo(() => {
    return (accounts || []).filter((a: any) => a.isActive !== false);
  }, [accounts]);

  const activeCashboxes = useMemo(() => {
    return (cashboxes || []).filter((c: any) => c.isActive !== false);
  }, [cashboxes]);

  // Initialization & Auto-defaulting
  useEffect(() => {
    if (isOpen && payload?.customerId) {
      setPaidAmount(totalAmount.toString());
      setUseUnallocated(false);
      setUnallocatedAmountToUse('');
      setAutoOpenPrint(false);

      // Determine default payment method & default account
      if (activeBanks.length > 0) {
        setMethod('pos');
        setPaymentAccountId(activeBanks[0].id);
      } else if (activeCashboxes.length > 0) {
        setMethod('cash');
        setPaymentAccountId(activeCashboxes[0].id);
      } else {
        setMethod('credit');
        setPaymentAccountId('');
      }

      // Calculate unallocated balance for customer
      const personTx = (transactions || []).filter((tx: any) => 
        String(tx.personId) === String(payload.customerId) && 
        tx.type === 'receive'
      );
      
      let totalUnalloc = 0;
      personTx.forEach((tx: any) => {
        let allocated = 0;
        if (tx.linkedInvoices) {
          Object.values(tx.linkedInvoices).forEach((amt: any) => {
            allocated += Number(amt) || 0;
          });
        }
        const txAmount = Number(tx.amount) || 0;
        if (txAmount > allocated) {
          totalUnalloc += (txAmount - allocated);
        }
      });
      setUnallocatedBalance(totalUnalloc);
    }
  }, [isOpen, payload?.customerId, totalAmount, transactions, activeBanks, activeCashboxes]);

  // When method changes, synchronize account and paidAmount
  const handleSelectMethod = (newMethod: 'pos' | 'cash' | 'credit' | 'partial') => {
    setMethod(newMethod);
    if (newMethod === 'pos') {
      if (activeBanks.length > 0) {
        setPaymentAccountId(activeBanks[0].id);
      } else if (activeCashboxes.length > 0) {
        setPaymentAccountId(activeCashboxes[0].id);
      }
      setPaidAmount(totalAmount.toString());
    } else if (newMethod === 'cash') {
      if (activeCashboxes.length > 0) {
        setPaymentAccountId(activeCashboxes[0].id);
      } else if (activeBanks.length > 0) {
        setPaymentAccountId(activeBanks[0].id);
      }
      setPaidAmount(totalAmount.toString());
    } else if (newMethod === 'credit') {
      setPaidAmount('0');
      setPaymentAccountId('');
      setUseUnallocated(false);
    } else if (newMethod === 'partial') {
      if (!paymentAccountId) {
        setPaymentAccountId(activeBanks[0]?.id || activeCashboxes[0]?.id || '');
      }
      setTimeout(() => {
        amountInputRef.current?.focus();
        amountInputRef.current?.select();
      }, 50);
    }
  };

  // Keyboard Shortcuts inside Modal
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if modifier keys like Ctrl/Alt are pressed unless Ctrl+Enter
      if (e.ctrlKey && e.key === 'Enter') {
        e.preventDefault();
        handleSubmit(e as any);
        return;
      }

      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }

      const activeTag = document.activeElement?.tagName?.toLowerCase();
      const isInputActive = activeTag === 'input' || activeTag === 'select' || activeTag === 'textarea';

      if (!isInputActive) {
        if (e.key === '1') {
          e.preventDefault();
          handleSelectMethod('pos');
        } else if (e.key === '2') {
          e.preventDefault();
          handleSelectMethod('cash');
        } else if (e.key === '3') {
          e.preventDefault();
          handleSelectMethod('credit');
        } else if (e.key === '4') {
          e.preventDefault();
          handleSelectMethod('partial');
        } else if (e.key === 'Enter') {
          e.preventDefault();
          handleSubmit(e as any);
        }
      } else if (activeTag === 'input' && e.key === 'Enter') {
        e.preventDefault();
        handleSubmit(e as any);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, method, paidAmount, paymentAccountId, useUnallocated, unallocatedAmountToUse, submitting]);

  // Projected Balance Calculation
  const projectedBalance = useMemo(() => {
    if (!customerBalance) return null;
    const currentBalAmount = customerBalance.amount || 0;
    const isDebtor = customerBalance.status === 'بدهکار';
    const isCreditor = customerBalance.status === 'بستانکار';

    let rawBalance = isDebtor ? currentBalAmount : (isCreditor ? -currentBalAmount : 0);
    
    // In sales invoice, total invoice is added to debt (+totalAmount)
    // Paid amount decreases debt (-paid)
    let actualPaid = 0;
    if (method === 'pos' || method === 'cash') {
      actualPaid = totalAmount;
    } else if (method === 'partial') {
      actualPaid = Number(paidAmount.replace(/,/g, '')) || 0;
    }
    const unallocUsed = useUnallocated ? (Number(unallocatedAmountToUse.replace(/,/g, '')) || 0) : 0;
    const totalSettled = actualPaid + unallocUsed;

    const remainingInvoiceDebt = Math.max(0, totalAmount - totalSettled);
    const newRawBalance = rawBalance + remainingInvoiceDebt;

    if (newRawBalance > 0) {
      return { amount: newRawBalance, status: 'بدهکار', color: 'text-rose-600' };
    } else if (newRawBalance < 0) {
      return { amount: Math.abs(newRawBalance), status: 'بستانکار', color: 'text-emerald-600' };
    }
    return { amount: 0, status: 'بی‌حساب', color: 'text-slate-600' };
  }, [customerBalance, totalAmount, method, paidAmount, useUnallocated, unallocatedAmountToUse]);

  if (!isOpen || !payload) return null;

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e && typeof e.preventDefault === 'function') {
      e.preventDefault();
    }
    if (submitting) return;

    // Validate account if needed
    if ((method === 'pos' || method === 'cash') && !paymentAccountId) {
      showNotification?.('لطفاً حساب بانکی یا صندوق دریافت وجه را انتخاب کنید.', 'error');
      return;
    }

    if (method === 'partial') {
      const pAmt = Number(paidAmount.replace(/,/g, '')) || 0;
      if (pAmt > 0 && !paymentAccountId) {
        showNotification?.('لطفاً حساب یا صندوق برای مبلغ علی‌الحساب را انتخاب کنید.', 'error');
        return;
      }
    }

    setSubmitting(true);
    try {
      const finalPayload = { ...payload, isDraft: false, status: 'final' };
      finalPayload.paymentStatus = method === 'credit' ? 'unpaid' : ((method === 'pos' || method === 'cash') ? 'paid' : 'partial');
      
      let newPaidAmount = 0;
      if (method === 'pos' || method === 'cash') newPaidAmount = totalAmount;
      if (method === 'partial') newPaidAmount = Number(paidAmount.replace(/,/g, '')) || 0;

      let unallocUse = useUnallocated ? (Number(unallocatedAmountToUse.replace(/,/g, '')) || 0) : 0;
      if (method === 'credit') unallocUse = 0;
      
      finalPayload.paidAmount = newPaidAmount + unallocUse;
      
      if (finalPayload.paidAmount >= totalAmount) finalPayload.paymentStatus = 'paid';
      if (finalPayload.paidAmount === 0) finalPayload.paymentStatus = 'unpaid';

      // 1. Save invoice
      const savedInvoice = await saveInvoiceData(finalPayload, false, true);
      
      if (savedInvoice) {
        // 2. Register new payment if newPaidAmount > 0
        if (newPaidAmount > 0 && paymentAccountId) {
          const isBank = (accounts || []).some((a: any) => String(a.id) === String(paymentAccountId));
          const payTxPayload = {
            type: 'receive',
            amount: newPaidAmount,
            date: payload.date || new Date().toISOString().split('T')[0],
            personId: payload.customerId,
            resourceType: isBank ? 'bank' : 'cashbox',
            resourceId: paymentAccountId,
            method: isBank ? 'card' : 'cash',
            description: `دریافت وجه بابت تسویه فاکتور فروش شماره ${savedInvoice.invoiceNumber || savedInvoice.id || ''}`,
            currency: payload.currency || currency,
            linkedInvoices: { [savedInvoice.id]: newPaidAmount }
          };
          await addTransaction(payTxPayload);
        }

        // 3. Allocate previous unallocated balance
        if (unallocUse > 0) {
          const personTx = (transactions || []).filter((tx: any) => 
            String(tx.personId) === String(payload.customerId) && 
            tx.type === 'receive'
          );
          
          let remainingToAllocate = unallocUse;
          
          for (const tx of personTx) {
            if (remainingToAllocate <= 0) break;
            let allocated = 0;
            if (tx.linkedInvoices) {
              Object.values(tx.linkedInvoices).forEach((amt: any) => {
                allocated += Number(amt) || 0;
              });
            }
            const txAmount = Number(tx.amount) || 0;
            const available = txAmount - allocated;
            
            if (available > 0) {
              const toUse = Math.min(available, remainingToAllocate);
              const newLinkedInvoices = { ...(tx.linkedInvoices || {}) };
              newLinkedInvoices[savedInvoice.id] = (newLinkedInvoices[savedInvoice.id] || 0) + toUse;
              
              await updateTransaction(tx.id, { ...tx, linkedInvoices: newLinkedInvoices });
              remainingToAllocate -= toUse;
            }
          }
        }

        playSound('success');
        showNotification?.('فاکتور فروش و تسویه با موفقیت ثبت گردید.', 'success');
        
        onClose();
        if (setViewingInvoice && (autoOpenPrint || savedInvoice)) {
          setViewingInvoice(savedInvoice);
        }
      }
    } catch (e: any) {
      console.error('Error settling sale invoice:', e);
      playSound('error');
      showNotification?.(e.message || 'خطا در ثبت فاکتور و تسویه', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-sm" dir="rtl">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[92vh] border border-slate-100"
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 via-indigo-50/30 to-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-200 shrink-0">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-slate-900 text-base flex items-center gap-2">
                تعیین وضعیت تسویه و پرداخت فاکتور فروش
              </h3>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                فاکتور شماره #{payload.invoiceNumber || 'جدید'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer"
            title="بستن (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* Amount and Customer Card */}
          <div className="bg-gradient-to-br from-indigo-900 to-slate-900 rounded-2xl p-5 text-white shadow-md relative overflow-hidden">
            <div className="absolute top-0 left-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
            
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <span className="text-xs font-bold text-indigo-200 block mb-1">مبلغ کل قابل پرداخت فاکتور</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black tracking-tight text-white">{formatCurrency(totalAmount)}</span>
                  <span className="text-sm font-bold text-amber-300">{currency}</span>
                </div>
              </div>

              {/* Customer Pill */}
              {customer && (
                <div className="bg-white/10 backdrop-blur-md px-3.5 py-2 rounded-xl border border-white/10 text-right w-full sm:w-auto">
                  <div className="flex items-center gap-1.5 text-xs text-indigo-200 font-bold mb-1">
                    <User className="w-3.5 h-3.5 text-indigo-300" />
                    <span>طرف حساب: {customer.name}</span>
                  </div>
                  {customerBalance && (
                    <div className="text-[11px] font-bold flex items-center justify-between gap-3 text-slate-300">
                      <span>مانده جاری:</span>
                      <span className={customerBalance.status === 'بدهکار' ? 'text-rose-300 font-black' : (customerBalance.status === 'بستانکار' ? 'text-emerald-300 font-black' : 'text-slate-200')}>
                        {customerBalance.status === 'بی‌حساب' ? 'بی‌حساب' : `${formatCurrency(customerBalance.amount)} ${customerBalance.status}`}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Projected debt glance */}
            {projectedBalance && (
              <div className="mt-4 pt-3 border-t border-white/10 flex flex-wrap items-center justify-between text-xs text-slate-300">
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  <span>پیش‌بینی مانده نهایی پس از ثبت:</span>
                </span>
                <span className={`font-black ${projectedBalance.status === 'بدهکار' ? 'text-rose-300' : (projectedBalance.status === 'بستانکار' ? 'text-emerald-300' : 'text-slate-300')}`}>
                  {projectedBalance.status === 'بی‌حساب' ? 'تسویه کامل (بی‌حساب)' : `${formatCurrency(projectedBalance.amount)} ${currency} (${projectedBalance.status})`}
                </span>
              </div>
            )}
          </div>

          {/* Quick Payment Method Selector (4 Big Channels) */}
          <div>
            <div className="flex justify-between items-center mb-2.5">
              <label className="text-xs font-black text-slate-700">
                روش تسویه / پرداخت:
              </label>
              <span className="text-[11px] text-indigo-600 font-extrabold bg-indigo-50 px-2 py-0.5 rounded-md">
                کلیدهای سریع ۱ تا ۴
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {/* Option 1: POS / Bank Card */}
              <button
                type="button"
                onClick={() => handleSelectMethod('pos')}
                className={`p-3 rounded-2xl border-2 text-right transition-all cursor-pointer relative flex flex-col justify-between h-24 ${
                  method === 'pos'
                    ? 'border-indigo-600 bg-indigo-50/70 text-indigo-950 shadow-sm ring-2 ring-indigo-500/20'
                    : 'border-slate-200/80 bg-white hover:border-slate-300 text-slate-700'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <div className={`p-1.5 rounded-lg ${method === 'pos' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                    <CreditCard className="w-4 h-4" />
                  </div>
                  <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 font-black">
                    1
                  </kbd>
                </div>
                <div>
                  <span className="block font-black text-xs">کارتخوان / پوز</span>
                  <span className="text-[10px] text-slate-500 block leading-tight mt-0.5">تسویه نقدی بانکی</span>
                </div>
              </button>

              {/* Option 2: Cash / Cashbox */}
              <button
                type="button"
                onClick={() => handleSelectMethod('cash')}
                className={`p-3 rounded-2xl border-2 text-right transition-all cursor-pointer relative flex flex-col justify-between h-24 ${
                  method === 'cash'
                    ? 'border-emerald-600 bg-emerald-50/70 text-emerald-950 shadow-sm ring-2 ring-emerald-500/20'
                    : 'border-slate-200/80 bg-white hover:border-slate-300 text-slate-700'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <div className={`p-1.5 rounded-lg ${method === 'cash' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                    <Banknote className="w-4 h-4" />
                  </div>
                  <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 font-black">
                    2
                  </kbd>
                </div>
                <div>
                  <span className="block font-black text-xs">وجه نقد / صندوق</span>
                  <span className="text-[10px] text-slate-500 block leading-tight mt-0.5">تسویه نقدی صندوق</span>
                </div>
              </button>

              {/* Option 3: Credit / Unpaid */}
              <button
                type="button"
                onClick={() => handleSelectMethod('credit')}
                className={`p-3 rounded-2xl border-2 text-right transition-all cursor-pointer relative flex flex-col justify-between h-24 ${
                  method === 'credit'
                    ? 'border-amber-600 bg-amber-50/70 text-amber-950 shadow-sm ring-2 ring-amber-500/20'
                    : 'border-slate-200/80 bg-white hover:border-slate-300 text-slate-700'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <div className={`p-1.5 rounded-lg ${method === 'credit' ? 'bg-amber-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                    <Tag className="w-4 h-4" />
                  </div>
                  <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 font-black">
                    3
                  </kbd>
                </div>
                <div>
                  <span className="block font-black text-xs">نسیه / اعتباری</span>
                  <span className="text-[10px] text-slate-500 block leading-tight mt-0.5">افزودن به بدهی مشتری</span>
                </div>
              </button>

              {/* Option 4: Partial / Split */}
              <button
                type="button"
                onClick={() => handleSelectMethod('partial')}
                className={`p-3 rounded-2xl border-2 text-right transition-all cursor-pointer relative flex flex-col justify-between h-24 ${
                  method === 'partial'
                    ? 'border-violet-600 bg-violet-50/70 text-violet-950 shadow-sm ring-2 ring-violet-500/20'
                    : 'border-slate-200/80 bg-white hover:border-slate-300 text-slate-700'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <div className={`p-1.5 rounded-lg ${method === 'partial' ? 'bg-violet-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 font-black">
                    4
                  </kbd>
                </div>
                <div>
                  <span className="block font-black text-xs">علی‌الحساب</span>
                  <span className="text-[10px] text-slate-500 block leading-tight mt-0.5">مقداری نقد، باقی نسیه</span>
                </div>
              </button>
            </div>
          </div>

          {/* Previous Unallocated Credit Box (If Customer has unallocated balance) */}
          {unallocatedBalance > 0 && method !== 'credit' && (
            <div className="p-4 bg-emerald-50/80 border border-emerald-200 rounded-2xl flex flex-col gap-3">
              <label className="flex items-center justify-between cursor-pointer">
                <div className="flex items-center gap-2.5">
                  <input
                    type="checkbox"
                    checked={useUnallocated}
                    onChange={(e) => {
                      setUseUnallocated(e.target.checked);
                      if (e.target.checked) {
                        const maxUsable = Math.min(unallocatedBalance, totalAmount);
                        setUnallocatedAmountToUse(addCommas(maxUsable));
                      }
                    }}
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-emerald-300 cursor-pointer"
                  />
                  <div>
                    <span className="block text-xs font-black text-emerald-950">
                      استفاده از طلب / بستانکاری قبلی مشتری
                    </span>
                    <span className="block text-[11px] text-emerald-700 mt-0.5">
                      مبلغ در دسترس: {formatCurrency(unallocatedBalance)} {currency}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setUseUnallocated(true);
                    const maxUsable = Math.min(unallocatedBalance, totalAmount);
                    setUnallocatedAmountToUse(addCommas(maxUsable));
                  }}
                  className="px-2.5 py-1 bg-emerald-600 text-white text-[11px] font-bold rounded-lg hover:bg-emerald-700 transition-colors"
                >
                  کسر حداکثری
                </button>
              </label>

              {useUnallocated && (
                <div className="pt-2 border-t border-emerald-200/60 flex items-center gap-2">
                  <span className="text-xs font-bold text-emerald-900 shrink-0">مبلغ کسر از بستانکاری:</span>
                  <input
                    type="text"
                    value={unallocatedAmountToUse}
                    onChange={(e) => {
                      const val = e.target.value.replace(/,/g, '');
                      if (!isNaN(Number(val))) {
                        if (Number(val) > unallocatedBalance) return;
                        if (Number(val) > totalAmount) return;
                        setUnallocatedAmountToUse(addCommas(val));
                      }
                    }}
                    className="w-full p-2 bg-white rounded-xl border border-emerald-300 font-black text-sm text-left focus:ring-2 focus:ring-emerald-500 outline-none"
                    dir="ltr"
                    placeholder="0"
                  />
                  <span className="text-xs text-emerald-700 font-bold">{currency}</span>
                </div>
              )}
            </div>
          )}

          {/* Account / Cashbox Selection (When not credit) */}
          {method !== 'credit' && (
            <div className="space-y-4 bg-slate-50 p-4 rounded-2xl border border-slate-200/70">
              {/* Partial Amount Input & Quick Percentage Buttons */}
              {method === 'partial' && (
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-black text-slate-800">
                      مبلغ پرداختی نقدی / کارتخوان:
                    </label>
                    <span className="text-[11px] text-slate-500 font-bold">
                      باقیمانده به حساب نسیه می‌رود
                    </span>
                  </div>
                  
                  <div className="relative">
                    <input
                      ref={amountInputRef}
                      type="text"
                      value={paidAmount ? addCommas(paidAmount.replace(/,/g, '')) : ''}
                      onChange={(e) => {
                        const val = e.target.value.replace(/,/g, '');
                        if (!isNaN(Number(val))) {
                          setPaidAmount(val);
                        }
                      }}
                      className="w-full p-3 bg-white rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 font-black text-base text-left outline-none"
                      dir="ltr"
                      placeholder="0"
                    />
                    <span className="absolute left-3 top-3.5 text-xs font-bold text-slate-400">
                      {currency}
                    </span>
                  </div>

                  {/* Percentage Presets */}
                  <div className="flex items-center gap-1.5 pt-1">
                    {[
                      { label: '۲۵٪', factor: 0.25 },
                      { label: '۵۰٪', factor: 0.5 },
                      { label: '۷۵٪', factor: 0.75 },
                      { label: '۱۰۰٪ (کل)', factor: 1.0 },
                    ].map((p, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          const amt = Math.round(totalAmount * p.factor);
                          setPaidAmount(amt.toString());
                        }}
                        className="flex-1 py-1 px-1.5 bg-white border border-slate-200 hover:border-indigo-400 text-slate-700 rounded-lg text-xs font-bold transition-all hover:bg-indigo-50"
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Account Dropdown */}
              <div>
                <label className="block text-xs font-black text-slate-800 mb-1.5">
                  {method === 'cash' ? 'صندوق دریافت وجه نقد:' : 'حساب بانکی / دستگاه کارتخوان:'}
                </label>
                <select
                  value={paymentAccountId}
                  onChange={(e) => setPaymentAccountId(e.target.value)}
                  className="w-full p-3 bg-white rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 text-xs font-bold text-slate-800 outline-none cursor-pointer"
                >
                  <option value="">-- لطفاً صندوق یا حساب بانکی را انتخاب کنید --</option>
                  {activeCashboxes.length > 0 && (
                    <optgroup label="صندوق‌های نقدی">
                      {activeCashboxes.map((c: any) => (
                        <option key={c.id} value={c.id}>
                          💵 صندوق: {c.title || c.name}
                        </option>
                      ))}
                    </optgroup>
                  )}
                  {activeBanks.length > 0 && (
                    <optgroup label="حساب‌های بانکی و پوز">
                      {activeBanks.map((a: any) => (
                        <option key={a.id} value={a.id}>
                          💳 {a.title || a.name} - بانک {a.bankName || ''} {a.accountNumber ? `(${a.accountNumber})` : ''}
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
              </div>
            </div>
          )}

          {/* Credit Warning & Info (If method === 'credit') */}
          {method === 'credit' && (
            <div className="p-4 bg-amber-50/80 border border-amber-200 rounded-2xl flex items-start gap-3 text-amber-900">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-xs leading-relaxed">
                <span className="font-bold block text-sm mb-0.5">فروش به صورت نسیه ثبت می‌شود</span>
                کل مبلغ <strong>{formatCurrency(totalAmount)} {currency}</strong> به بدهی حساب مشتری ({customer?.name || 'مشتری'}) افزوده خواهد شد. سند نقدی/بانکی ثبت نمی‌گردد.
              </div>
            </div>
          )}

          {/* Fast Post-Save Options */}
          <div className="flex items-center justify-between pt-1 text-xs font-medium text-slate-600">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={autoOpenPrint}
                onChange={(e) => setAutoOpenPrint(e.target.checked)}
                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 cursor-pointer"
              />
              <span className="flex items-center gap-1 font-bold">
                <Printer className="w-3.5 h-3.5 text-slate-500" />
                مشاهده پیش‌نمایش و چاپ فاکتور بلافاصله پس از ثبت
              </span>
            </label>
          </div>
        </div>

        {/* Modal Footer with Actions and Keyboard Hints */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/80 flex flex-col sm:flex-row items-center gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-3 text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 rounded-2xl font-bold text-xs transition-colors cursor-pointer text-center flex items-center justify-center gap-1.5"
          >
            <span>انصراف</span>
            <kbd className="text-[10px] font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-400 font-bold">Esc</kbd>
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || (method !== 'credit' && !paymentAccountId)}
            className="w-full sm:flex-1 py-3 px-6 text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 disabled:bg-indigo-300 rounded-2xl font-black text-sm transition-all shadow-md shadow-indigo-200 flex justify-center items-center gap-2 cursor-pointer disabled:cursor-not-allowed"
          >
            {submitting ? (
              <RefreshCw className="w-5 h-5 animate-spin" />
            ) : (
              <Save className="w-5 h-5" />
            )}
            <span>تایید نهایی و ثبت فاکتور</span>
            <kbd className="text-[11px] font-mono bg-indigo-800/50 text-indigo-100 px-2 py-0.5 rounded-lg mr-1 font-black">
              Enter ↵
            </kbd>
          </button>
        </div>
      </motion.div>
    </div>
  );
}
