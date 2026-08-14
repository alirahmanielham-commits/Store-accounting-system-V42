import React, { useState, useRef, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, CheckCircle, AlertCircle, ArrowRight, Printer, CreditCard, Banknote, Calendar, User, FileText, ArrowLeft, RotateCcw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { lookupInstallmentByCode, lookupNextInstallmentByLoanId, calculatePaymentPreview, registerInstallmentPayment, PaymentPreview } from '../../services/installmentPaymentService';
import { getAccounts } from '../../services/dataService';
import { getCashboxes } from '../../services/accountingService';
import { Account, Cashbox } from '../../types';

interface Props {
  showNotification: (msg: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
  formatCurrency: (val: number) => string;
  onBack: () => void;
  userId: string;
  storeSettings?: any;
}

export default function InstallmentPaymentTerminal({ showNotification, formatCurrency, onBack, userId, storeSettings }: Props) {
  const currencyUnit = storeSettings?.currency || "";
  const [searchParams] = useSearchParams();
  const initialCode = searchParams.get('code') || '';
  const initialLoanId = searchParams.get('loanId') || '';
  const [step, setStep] = useState<'search' | 'form' | 'confirm' | 'success'>('search');
  const [searchCode, setSearchCode] = useState(initialCode);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  
  const [installmentData, setInstallmentData] = useState<any>(null);
  const [amountEntered, setAmountEntered] = useState<number | ''>('');
  const [paymentPreview, setPaymentPreview] = useState<PaymentPreview | null>(null);
  
  const [paymentMethodType, setPaymentMethodType] = useState<'account' | 'cashbox'>('account');
  const [paymentMethodId, setPaymentMethodId] = useState<string>('');
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [cashboxes, setCashboxes] = useState<Cashbox[]>([]);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successResult, setSuccessResult] = useState<any>(null);
  
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadPaymentMethods();
    if (searchInputRef.current) {
        searchInputRef.current.focus();
    }
  }, []);

  useEffect(() => {
     if (step === 'search' && searchInputRef.current) {
         searchInputRef.current.focus();
     }
  }, [step]);

  const loadPaymentMethods = async () => {
    try {
      const accs = await getAccounts();
      const cbs = await getCashboxes();
      setAccounts(accs);
      setCashboxes(cbs);
      if (accs.length > 0) setPaymentMethodId(accs[0].id.toString());
      else if (cbs.length > 0) {
        setPaymentMethodType('cashbox');
        setPaymentMethodId(cbs[0].id.toString());
      }
    } catch (e) {}
  };

    useEffect(() => {
    if (initialCode && step === 'search') {
      handleSearch(undefined, initialCode);
    } else if (initialLoanId && step === 'search') {
      handleSearchByLoanId(initialLoanId);
    }
  }, [initialCode, initialLoanId]);

  const handleSearchByLoanId = async (loanIdStr: string) => {
    setIsSearching(true);
    setSearchError('');
    try {
        const data = await lookupNextInstallmentByLoanId(loanIdStr);
        setInstallmentData(data);
        if (data.installment?.installmentCode) {
            setSearchCode(data.installment.installmentCode);
        }
        setAmountEntered(data.amountRemaining);
        updatePreview(data.installment.installmentCode, data.amountRemaining);
        setStep('form');
    } catch (err: any) {
        setSearchError(err.message || 'قسط پرداخت نشده‌ای برای این وام یافت نشد');
    } finally {
        setIsSearching(false);
    }
  };

  const handleSearch = async (e?: React.FormEvent, codeToSearch?: string) => {
    if (e) e.preventDefault();
    const code = codeToSearch || searchCode;
    if (!code.trim()) return;
    
    setIsSearching(true);
    setSearchError('');
    
    try {
        const data = await lookupInstallmentByCode(code.trim());
        setInstallmentData(data);
        setAmountEntered(data.amountRemaining);
        updatePreview(code.trim(), data.amountRemaining);
        setStep('form');
    } catch (err: any) {
        setSearchError(err.message || 'کد قسط یافت نشد');
    } finally {
        setIsSearching(false);
    }
  };

  const updatePreview = async (code: string, amount: number) => {
      try {
          const preview = await calculatePaymentPreview(code, amount || 0);
          setPaymentPreview(preview);
      } catch (err) {}
  };

  const handleAmountChange = (val: string) => {
      const num = Number(val);
      setAmountEntered(num === 0 && val !== '0' ? '' : num);
      if (num > 0) {
          updatePreview(installmentData.installment.installmentCode, num);
      } else {
          setPaymentPreview(null);
      }
  };

  const handleGoToConfirm = () => {
      if (!amountEntered || amountEntered <= 0) {
          showNotification('لطفاً مبلغ معتبر وارد کنید', 'error');
          return;
      }
      if (!paymentMethodId) {
          showNotification('روش پرداخت انتخاب نشده است', 'error');
          return;
      }
      setStep('confirm');
  };

  const handleFinalSubmit = async () => {
      setIsSubmitting(true);
      try {
          const res = await registerInstallmentPayment(
              installmentData.installment.installmentCode,
              Number(amountEntered),
              paymentMethodType,
              paymentMethodId,
              userId
          );
          setSuccessResult(res);
          showNotification('پرداخت با موفقیت ثبت شد', 'success');
          setStep('success');
      } catch (err: any) {
          showNotification(err.message || 'خطا در ثبت پرداخت', 'error');
      } finally {
          setIsSubmitting(false);
      }
  };

  const resetTerminal = () => {
      setSearchCode('');
      setInstallmentData(null);
      setAmountEntered('');
      setPaymentPreview(null);
      setSuccessResult(null);
      setStep('search');
  };

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8" dir="rtl">
        <div className="flex items-center justify-between mb-8">
            <div>
                <h1 className="text-2xl font-black text-gray-900">پایانه دریافت اقساط</h1>
                <p className="text-gray-500 text-sm mt-1">جستجوی سریع با شماره یکتا و ثبت پرداخت</p>
            </div>
            <button onClick={onBack} className="flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors">
                <ArrowRight className="w-4 h-4" />
                <span>بازگشت</span>
            </button>
        </div>

        <div className="bg-white rounded-3xl shadow-xl shadow-indigo-100/40 border border-gray-100 overflow-hidden">
            <AnimatePresence mode="wait">
                {step === 'search' && (
                    <motion.div 
                        key="search"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="p-8 md:p-12 text-center"
                    >
                        <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Search className="w-10 h-10 text-indigo-600" />
                        </div>
                        <h2 className="text-xl font-bold text-gray-800 mb-2">اسکن یا ورود کد قسط</h2>
                        <p className="text-gray-500 text-sm mb-8">کد یکتای چاپ شده روی رسید یا دفترچه قسط را وارد کنید</p>

                        <form onSubmit={handleSearch} className="max-w-md mx-auto">
                            <div className="relative">
                                <input
                                    ref={searchInputRef}
                                    type="text"
                                    value={searchCode}
                                    onChange={(e) => setSearchCode(e.target.value.toUpperCase())}
                                    placeholder="مثال: 1234567"
                                    className="w-full text-center text-2xl font-black tracking-widest py-4 px-6 border-2 border-gray-200 rounded-2xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 transition-all uppercase placeholder:text-gray-300 placeholder:text-lg placeholder:font-normal placeholder:tracking-normal"
                                    dir="ltr"
                                    disabled={isSearching}
                                />
                            </div>
                            {searchError && (
                                <div className="mt-4 flex items-center justify-center gap-2 text-red-600 bg-red-50 py-2 px-4 rounded-lg">
                                    <AlertCircle className="w-4 h-4" />
                                    <span className="text-sm font-bold">{searchError}</span>
                                </div>
                            )}
                            <button
                                type="submit"
                                disabled={!searchCode.trim() || isSearching}
                                className="mt-6 w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-2xl shadow-lg shadow-indigo-200 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {isSearching ? (
                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                ) : (
                                    <>
                                        <Search className="w-5 h-5" />
                                        <span>جستجو و بررسی</span>
                                    </>
                                )}
                            </button>
                        </form>
                    </motion.div>
                )}

                {step === 'form' && installmentData && (
                    <motion.div 
                        key="form"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="p-6 md:p-10"
                    >
                        <div className="flex items-center justify-between mb-8">
                            <h2 className="text-xl font-black text-gray-800">جزئیات پرداخت</h2>
                            <button onClick={() => setStep('search')} className="text-sm text-indigo-600 font-bold flex items-center gap-1 hover:text-indigo-800">
                                <Search className="w-4 h-4" />
                                تغییر کد
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-6">
                                <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
                                    <div className="text-sm text-gray-500 mb-4 font-bold flex items-center gap-2">
                                        <User className="w-4 h-4" />
                                        اطلاعات مشتری
                                    </div>
                                    <div className="text-lg font-black text-gray-900 mb-1">{installmentData.person?.name}</div>
                                    <div className="text-sm text-gray-500">شماره وام: {installmentData.loan?.loanNumber || installmentData.loan?.id}</div>
                                </div>

                                <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
                                    <div className="text-sm text-gray-500 mb-4 font-bold flex items-center gap-2">
                                        <FileText className="w-4 h-4" />
                                        وضعیت قسط (کد: {installmentData.installment.installmentCode})
                                    </div>
                                    
                                    <div className="flex justify-between items-center mb-3">
                                        <span className="text-gray-600">سررسید:</span>
                                        <span className="font-bold text-gray-900" dir="ltr">{installmentData.installment.dueDate}</span>
                                    </div>
                                    
                                    <div className="flex justify-between items-center mb-3">
                                        <span className="text-gray-600">شماره قسط:</span>
                                        <span className="font-bold text-gray-900">{installmentData.installment.installmentNumber} از {installmentData.loan?.totalInstallments}</span>
                                    </div>

                                    <div className="flex justify-between items-center mb-3 pt-3 border-t border-gray-100">
                                        <span className="text-gray-600">مبلغ اصلی قسط:</span>
                                        <span className="font-bold text-gray-900">{formatCurrency(installmentData.installment.amount)}</span>
                                    </div>
                                    {installmentData.installment.paidAmount > 0 && (
                                        <div className="flex justify-between items-center mb-3">
                                            <span className="text-emerald-600">پرداخت شده تاکنون:</span>
                                            <span className="font-bold text-emerald-600">{formatCurrency(installmentData.installment.paidAmount)}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between items-center pt-3 border-t border-gray-100">
                                        <span className="text-gray-800 font-bold">باقیمانده جهت تسویه:</span>
                                        <span className="font-black text-indigo-600 text-lg">{formatCurrency(installmentData.amountRemaining)}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">مبلغ پرداختی مشتری ()</label>
                                    <input 
                                        type="number"
                                        value={amountEntered}
                                        onChange={(e) => handleAmountChange(e.target.value)}
                                        className="w-full text-2xl font-black text-gray-900 py-4 px-4 border-2 border-gray-300 rounded-xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 text-left"
                                        dir="ltr"
                                    />
                                    {paymentPreview && (
                                        <motion.div 
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            className={`mt-3 p-3 rounded-lg text-sm font-bold flex items-start gap-2 ${paymentPreview.isFullPayment ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : paymentPreview.isPartial ? 'bg-amber-50 text-amber-700 border border-amber-100' : 'bg-indigo-50 text-indigo-700 border border-indigo-100'}`}
                                        >
                                            <CheckCircle className="w-5 h-5 shrink-0 mt-0.5" />
                                            <div>
                                                {paymentPreview.isFullPayment && 'پرداخت کامل: این قسط کاملاً تسویه خواهد شد.'}
                                                {paymentPreview.isPartial && 'پرداخت جزئی: این قسط به صورت جزئی تسویه می‌شود و مبلغی باقی می‌ماند.'}
                                                {paymentPreview.isOverpayment && `پرداخت مازاد: قسط فعلی تسویه شده و ${formatCurrency(paymentPreview.overpaymentAmount)}  به اقساط بعدی تخصیص می‌یابد.`}
                                            </div>
                                        </motion.div>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-3">روش پرداخت</label>
                                    <div className="grid grid-cols-2 gap-3 mb-4">
                                        <button
                                            type="button"
                                            onClick={() => setPaymentMethodType('account')}
                                            className={`p-3 rounded-xl border-2 flex items-center justify-center gap-2 font-bold transition-all ${paymentMethodType === 'account' ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                                        >
                                            <CreditCard className="w-5 h-5" />
                                            فیش بانکی / کارت
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setPaymentMethodType('cashbox')}
                                            className={`p-3 rounded-xl border-2 flex items-center justify-center gap-2 font-bold transition-all ${paymentMethodType === 'cashbox' ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                                        >
                                            <Banknote className="w-5 h-5" />
                                            وجه نقد / صندوق
                                        </button>
                                    </div>
                                    <select
                                        value={paymentMethodId}
                                        onChange={(e) => setPaymentMethodId(e.target.value)}
                                        className="w-full p-3 border border-gray-300 rounded-xl bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                                    >
                                        <option value="">انتخاب کنید...</option>
                                        {paymentMethodType === 'account' && accounts.map(a => (
                                            <option key={a.id} value={a.id}>{a.bankName} - {a.accountNumber}</option>
                                        ))}
                                        {paymentMethodType === 'cashbox' && cashboxes.map(c => (
                                            <option key={c.id} value={c.id}>{c.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <button
                                    onClick={handleGoToConfirm}
                                    disabled={!amountEntered || amountEntered <= 0 || !paymentMethodId}
                                    className="w-full py-4 bg-gray-900 hover:bg-gray-800 text-white font-bold rounded-xl shadow-lg transition-all disabled:opacity-50"
                                >
                                    ادامه و تایید پرداخت
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}

                {step === 'confirm' && paymentPreview && (
                    <motion.div 
                        key="confirm"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="p-6 md:p-10"
                    >
                        <div className="max-w-xl mx-auto">
                            <div className="text-center mb-8">
                                <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-4 text-amber-600">
                                    <FileText className="w-8 h-8" />
                                </div>
                                <h2 className="text-2xl font-black text-gray-900">تایید نهایی پرداخت</h2>
                                <p className="text-gray-500 mt-2">لطفاً اطلاعات زیر را پیش از ثبت قطعی بررسی کنید</p>
                            </div>

                            <div className="bg-white border-2 border-gray-200 rounded-2xl p-6 mb-8 space-y-4 shadow-sm">
                                <div className="flex justify-between items-center pb-4 border-b border-gray-100">
                                    <span className="text-gray-600">مشتری:</span>
                                    <span className="font-bold text-gray-900">{installmentData.person?.name}</span>
                                </div>
                                <div className="flex justify-between items-center pb-4 border-b border-gray-100">
                                    <span className="text-gray-600">مبلغ دریافتی:</span>
                                    <span className="text-xl font-black text-emerald-600">{formatCurrency(Number(amountEntered))} </span>
                                </div>
                                
                                <div>
                                    <span className="text-gray-600 text-sm mb-2 block">نحوه تخصیص این مبلغ:</span>
                                    <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                                        {paymentPreview.allocations.map((alloc, idx) => (
                                            <div key={idx} className="flex justify-between items-center text-sm font-bold">
                                                <span className="text-gray-700">
                                                    {alloc.installmentId === installmentData.installment.id ? 'بابت همین قسط' : 'بابت اقساط بعدی (مازاد)'}
                                                    {alloc.isPenalty && ' (جریمه)'}
                                                </span>
                                                <span className="text-gray-900">{formatCurrency(alloc.amount)}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-4">
                                <button
                                    onClick={() => setStep('form')}
                                    disabled={isSubmitting}
                                    className="flex-1 py-4 bg-white border-2 border-gray-200 hover:border-gray-300 text-gray-700 font-bold rounded-xl transition-all"
                                >
                                    انصراف و اصلاح
                                </button>
                                <button
                                    onClick={handleFinalSubmit}
                                    disabled={isSubmitting}
                                    className="flex-1 py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg shadow-emerald-200 transition-all flex items-center justify-center gap-2"
                                >
                                    {isSubmitting ? (
                                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                        <>
                                            <CheckCircle className="w-5 h-5" />
                                            تایید و ثبت قطعی
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}

                {step === 'success' && successResult && (
                    <motion.div 
                        key="success"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="p-8 md:p-16 text-center"
                    >
                        <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6 text-emerald-600">
                            <CheckCircle className="w-12 h-12" />
                        </div>
                        <h2 className="text-3xl font-black text-gray-900 mb-2">پرداخت با موفقیت ثبت شد</h2>
                        <p className="text-gray-500 mb-8">شماره رسید: <span className="font-bold text-gray-800" dir="ltr">{successResult.receiptNumber}</span></p>

                        {successResult.newLoanStatus === 'completed' && (
                            <div className="bg-indigo-50 border border-indigo-200 text-indigo-800 p-4 rounded-xl mb-8 font-bold flex items-center justify-center gap-2">
                                <CheckCircle className="w-5 h-5" />
                                تبریک! با این پرداخت، وام به صورت کامل تسویه شد.
                            </div>
                        )}
                        {successResult.newLoanStatus === 'active' && installmentData.loan?.status === 'overdue' && (
                            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-xl mb-8 font-bold flex items-center justify-center gap-2">
                                <CheckCircle className="w-5 h-5" />
                                اقساط معوق تسویه شد و وام به وضعیت فعال بازگشت.
                            </div>
                        )}

                        <div className="flex flex-col sm:flex-row justify-center gap-4">
                            <button
                                onClick={resetTerminal}
                                className="py-4 px-8 bg-gray-900 hover:bg-gray-800 text-white font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
                            >
                                <RotateCcw className="w-5 h-5" />
                                پرداخت قسط بعدی
                            </button>
                            {/* In a real app, wire up a print template */}
                            <button
                                className="py-4 px-8 bg-white border-2 border-gray-200 hover:border-gray-300 text-gray-700 font-bold rounded-xl transition-all flex items-center justify-center gap-2"
                            >
                                <Printer className="w-5 h-5" />
                                چاپ رسید
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    </div>
  );
}
