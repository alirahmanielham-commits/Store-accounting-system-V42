import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  CheckCircle, AlertTriangle, AlertCircle, RefreshCw, X, FileText, 
  CheckSquare, CreditCard, Box, BookOpen, AlertOctagon, RotateCcw,
  ArrowRight, ArrowLeft, Calendar, DollarSign, Sparkles, Lock
} from 'lucide-react';
import { 
  getInvoices, 
  getAccountingDocuments, 
  getReceivedChecks, 
  getIssuedChecks, 
  getStocktakings, 
  getProducts, 
  getRefundRequests,
  getLedgerAccounts,
  getStoreSettings,
  executeFiscalYearClosing
} from '../../services/dataService';
import { addCommas, formatDateDisplay } from '../../utils/format';

export default function YearClosingChecklistModal({ isOpen, onClose, onConfirm, year }: any) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [loading, setLoading] = useState(true);
  const [checklist, setChecklist] = useState<any[]>([]);
  const [canProceed, setCanProceed] = useState(false);

  // Accounting Summary States
  const [revenueTotal, setRevenueTotal] = useState(0);
  const [expenseTotal, setExpenseTotal] = useState(0);
  const [netIncome, setNetIncome] = useState(0);
  const [currency, setCurrency] = useState('تومان');

  // Next Year Options
  const [createNextYear, setCreateNextYear] = useState(true);
  const [nextYearName, setNextYearName] = useState('');
  const [nextStartDate, setNextStartDate] = useState('');
  const [nextEndDate, setNextEndDate] = useState('');

  // Processing state
  const [isExecuting, setIsExecuting] = useState(false);

  useEffect(() => {
    if (isOpen && year) {
      setStep(1);
      runChecks();
      prepareNextYearDefaults();
    }
  }, [isOpen, year]);

  const prepareNextYearDefaults = () => {
    if (!year) return;
    const yearEnd = new Date(year.endDate).getTime();
    const nextStart = new Date(yearEnd + 86400000).toISOString();
    const nextEnd = new Date(yearEnd + 365 * 86400000).toISOString();
    
    // Auto guess next year name
    const match = String(year.name || '').match(/(\d+)/);
    let nextName = 'سال مالی جدید';
    if (match) {
      const nextNum = parseInt(match[0], 10) + 1;
      nextName = year.name.replace(match[0], String(nextNum));
    } else {
      nextName = `سال مالی ${new Date(nextStart).getFullYear()}`;
    }

    setNextYearName(nextName);
    setNextStartDate(nextStart);
    setNextEndDate(nextEnd);
  };

  const runChecks = async () => {
    setLoading(true);
    try {
      const [
        invoices,
        accDocs,
        receivedChecks,
        issuedChecks,
        products,
        stocktakings,
        refundRequests,
        ledgerAccounts,
        settings
      ] = await Promise.all([
        getInvoices(),
        getAccountingDocuments(),
        getReceivedChecks(),
        getIssuedChecks(),
        getProducts(),
        getStocktakings(),
        getRefundRequests(),
        getLedgerAccounts(),
        getStoreSettings()
      ]);

      const curr = (settings as any)?.currency || 'تومان';
      setCurrency(curr);

      const checks = [];
      let allPassed = true;
      const yearStart = new Date(year.startDate).getTime();
      const yearEnd = new Date(year.endDate).getTime();

      // 1. Invoices
      const draftInvoices = invoices.filter((inv: any) => {
        const time = new Date(inv.date || inv.jalaliDate || inv.createdAt).getTime();
        return time >= yearStart && time <= yearEnd && (inv.status === 'draft' || inv.status === 'pending');
      });
      const invoicesPassed = draftInvoices.length === 0;
      if (!invoicesPassed) allPassed = false;
      checks.push({
        id: 'invoices',
        title: 'بررسی فاکتورهای پیش‌نویس',
        description: 'کلیه فاکتورهای خرید، فروش و برگشتی باید پیش از بستن سال در وضعیت "تایید نهایی" قرار گیرند.',
        passed: invoicesPassed,
        issues: draftInvoices.length > 0 ? `${draftInvoices.length} فاکتور پیش‌نویس یا معلق در این سال مالی وجود دارد.` : null,
        icon: FileText
      });

      // 2. Accounting Docs
      const tempDocs = accDocs.filter((doc: any) => {
        if (doc.isDeleted) return false;
        const time = new Date(doc.date).getTime();
        return time >= yearStart && time <= yearEnd && doc.status === 'draft';
      });
      const docsPassed = tempDocs.length === 0;
      if (!docsPassed) allPassed = false;
      checks.push({
        id: 'acc_docs',
        title: 'اسناد حسابداری پیش‌نویس',
        description: 'اسناد حسابداری موقت/پیش‌نویس باید نهایی یا حذف شوند.',
        passed: docsPassed,
        issues: tempDocs.length > 0 ? `${tempDocs.length} سند پیش‌نویس در این سال مالی وجود دارد.` : null,
        icon: BookOpen
      });

      // 3. Stocktaking
      const activeStocktakings = stocktakings.filter((st: any) => {
        const time = new Date(st.date).getTime();
        return time >= yearStart && time <= yearEnd && st.status === 'in_progress';
      });
      const stocktakingPassed = activeStocktakings.length === 0;
      if (!stocktakingPassed) allPassed = false;
      checks.push({
        id: 'stocktaking',
        title: 'انبارگردانی‌های باز',
        description: 'پرونده‌های انبارگردانی جاری باید پیش از بستن سال ثبت نهایی شوند.',
        passed: stocktakingPassed,
        issues: activeStocktakings.length > 0 ? `${activeStocktakings.length} انبارگردانی در حال انجام یافت شد.` : null,
        icon: Box
      });

      // 4. Negative Stock
      const negativeStock = products.filter((p: any) => p.type === 'product' && (Number(p.stock) || 0) < 0);
      const stockPassed = negativeStock.length === 0;
      if (!stockPassed) allPassed = false;
      checks.push({
        id: 'negative_stock',
        title: 'کالاهای با موجودی منفی',
        description: 'موجودی کالاهای انبار نباید منفی باشد؛ کسر انبارها باید تسویه شود.',
        passed: stockPassed,
        issues: negativeStock.length > 0 ? `${negativeStock.length} کالا دارای موجودی منفی است.` : null,
        icon: AlertOctagon
      });

      // 5. Unresolved Refunds
      const pendingRefunds = refundRequests.filter((r: any) => {
        const time = new Date(r.requestDate).getTime();
        return time >= yearStart && time <= yearEnd && r.status === 'pending';
      });
      const refundsPassed = pendingRefunds.length === 0;
      if (!refundsPassed) allPassed = false;
      checks.push({
        id: 'refunds',
        title: 'درخواست‌های استرداد وجه',
        description: 'درخواست‌های استرداد در حال انتظار باید تعیین تکلیف شوند.',
        passed: refundsPassed,
        issues: pendingRefunds.length > 0 ? `${pendingRefunds.length} درخواست استرداد معلق وجود دارد.` : null,
        icon: RotateCcw
      });

      // 6. Undetermined Checks (Warning only)
      const unresolvedReceived = receivedChecks.filter((c: any) => {
        const time = new Date(c.dueDate).getTime();
        return time >= yearStart && time <= yearEnd && c.status === 'received';
      });
      const unresolvedIssued = issuedChecks.filter((c: any) => {
        const time = new Date(c.dueDate).getTime();
        return time >= yearStart && time <= yearEnd && c.status === 'issued';
      });
      const checkPassed = unresolvedReceived.length === 0 && unresolvedIssued.length === 0;
      checks.push({
        id: 'checks',
        title: 'چک‌های سررسید شده در انتظار',
        description: 'توصیه می‌شود چک‌های سررسید شده دوره مالی تعیین تکلیف شوند.',
        passed: checkPassed,
        issues: (unresolvedReceived.length > 0 || unresolvedIssued.length > 0) ? `${unresolvedReceived.length} چک دریافتی و ${unresolvedIssued.length} چک پرداختی تعیین وضعیت نشده‌اند.` : null,
        icon: CreditCard,
        isWarning: true
      });

      // Calculate temporary revenues and expenses
      let rev = 0;
      let exp = 0;
      const validDocs = accDocs.filter((d: any) => {
        if (d.isDeleted) return false;
        const time = new Date(d.date).getTime();
        return (time >= yearStart && time <= yearEnd) || (d.fiscalYearId && String(d.fiscalYearId) === String(year.id));
      });

      validDocs.forEach((d: any) => {
        (d.items || []).forEach((it: any) => {
          const acc = ledgerAccounts.find((a: any) => String(a.id) === String(it.ledgerAccountId));
          if (!acc) return;
          const code = String(acc.code || '');
          if (code.startsWith('4')) {
            rev += (Number(it.credit) || 0) - (Number(it.debit) || 0);
          } else if (code.startsWith('5')) {
            exp += (Number(it.debit) || 0) - (Number(it.credit) || 0);
          }
        });
      });

      setRevenueTotal(Math.max(0, rev));
      setExpenseTotal(Math.max(0, exp));
      setNetIncome(rev - exp);

      setChecklist(checks);
      setCanProceed(allPassed);
    } catch (error) {
      console.error('Error running year closing checklist:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFinalSubmit = async () => {
    setIsExecuting(true);
    try {
      const options = {
        createNextYear,
        nextYearName,
        nextYearStartDate: nextStartDate,
        nextYearEndDate: nextEndDate
      };

      const result = await executeFiscalYearClosing(year.id, options);
      if (onConfirm) {
        onConfirm(year.id, result);
      }
      onClose();
    } catch (err: any) {
      alert(err.message || 'خطا در اجرای فرآیند بستن سال مالی');
    } finally {
      setIsExecuting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" dir="rtl">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] border border-slate-200"
        >
          {/* Header */}
          <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/20">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-black text-slate-800">ویزارد استاندارد بستن سال مالی</h2>
                <p className="text-xs text-slate-500 font-bold mt-0.5">
                  سال مالی {year?.name} ({formatDateDisplay(year?.startDate)} تا {formatDateDisplay(year?.endDate)})
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              disabled={isExecuting}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Stepper Tabs */}
          <div className="flex items-center border-b border-slate-100 bg-white px-6 py-3 text-xs font-bold gap-4">
            <div className={`flex items-center gap-1.5 ${step === 1 ? 'text-indigo-600' : 'text-slate-400'}`}>
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
                step === 1 ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'
              }`}>۱</span>
              <span>بررسی پیش‌نیازها</span>
            </div>
            <span className="text-slate-300">/</span>
            <div className={`flex items-center gap-1.5 ${step === 2 ? 'text-indigo-600' : 'text-slate-400'}`}>
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
                step === 2 ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'
              }`}>۲</span>
              <span>سود و زیان و اسناد اختتامیه</span>
            </div>
            <span className="text-slate-300">/</span>
            <div className={`flex items-center gap-1.5 ${step === 3 ? 'text-indigo-600' : 'text-slate-400'}`}>
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
                step === 3 ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'
              }`}>۳</span>
              <span>تعریف سال مالی جدید</span>
            </div>
          </div>

          {/* Content Body */}
          <div className="p-6 overflow-y-auto flex-1 bg-slate-50/50 space-y-4">
            {step === 1 && (
              <div className="space-y-3">
                <div className="bg-indigo-50/70 border border-indigo-100 rounded-xl p-3 text-xs text-indigo-900 font-bold leading-relaxed">
                  پیش از بستن سال مالی، کلیه فاکتورها، پرونده‌های انبارگردانی و اسناد موقت باید تعیین وضعیت شده و موجودی انبارها مثبت باشد.
                </div>

                {loading ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin mb-4" />
                    <p className="text-sm font-bold text-slate-600">در حال ارزیابی هوشمند دفاتر مالی و انبار...</p>
                  </div>
                ) : (
                  checklist.map((item) => {
                    const Icon = item.icon;
                    return (
                      <div 
                        key={item.id} 
                        className={`p-4 rounded-xl border ${
                          item.passed 
                            ? 'bg-emerald-50/50 border-emerald-100' 
                            : (item.isWarning ? 'bg-amber-50/50 border-amber-100' : 'bg-rose-50/50 border-rose-100')
                        }`}
                      >
                        <div className="flex items-start gap-4">
                          <div className={`p-2 rounded-lg mt-0.5 ${
                            item.passed 
                              ? 'bg-emerald-100 text-emerald-600' 
                              : (item.isWarning ? 'bg-amber-100 text-amber-600' : 'bg-rose-100 text-rose-600')
                          }`}>
                            {item.passed ? <CheckCircle className="w-5 h-5" /> : (item.isWarning ? <AlertTriangle className="w-5 h-5" /> : <AlertOctagon className="w-5 h-5" />)}
                          </div>
                          <div className="flex-1">
                            <h3 className={`text-sm font-bold flex items-center gap-2 ${
                              item.passed 
                                ? 'text-emerald-800' 
                                : (item.isWarning ? 'text-amber-800' : 'text-rose-800')
                            }`}>
                              {Icon && <Icon className="w-4 h-4 opacity-50" />}
                              {item.title}
                            </h3>
                            <p className={`text-xs mt-1 ${
                              item.passed 
                                ? 'text-emerald-600/80' 
                                : (item.isWarning ? 'text-amber-700/80' : 'text-rose-700/80')
                            }`}>
                              {item.description}
                            </p>
                            
                            {!item.passed && item.issues && (
                              <div className={`mt-3 p-2.5 rounded-lg text-xs font-bold flex items-center gap-2 ${
                                item.isWarning ? 'bg-amber-100/50 text-amber-800 border border-amber-200/50' : 'bg-rose-100/50 text-rose-800 border border-rose-200/50'
                              }`}>
                                <AlertCircle className="w-4 h-4 shrink-0" />
                                {item.issues}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
                  <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-indigo-600" />
                    خلاصه عملکرد سود و زیان سال مالی ({year?.name})
                  </h3>
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 text-right">
                      <span className="text-xs text-emerald-700 font-bold block">مجموع درآمدهای دوره (گروه ۴)</span>
                      <span className="text-base font-black font-mono text-emerald-900 mt-1 block">
                        {addCommas(revenueTotal)} <span className="text-xs font-sans font-normal">{currency}</span>
                      </span>
                    </div>
                    <div className="p-3 bg-rose-50 rounded-xl border border-rose-100 text-right">
                      <span className="text-xs text-rose-700 font-bold block">مجموع هزینه‌های دوره (گروه ۵)</span>
                      <span className="text-base font-black font-mono text-rose-900 mt-1 block">
                        {addCommas(expenseTotal)} <span className="text-xs font-sans font-normal">{currency}</span>
                      </span>
                    </div>
                  </div>

                  <div className={`p-4 rounded-xl border flex items-center justify-between ${
                    netIncome >= 0 ? 'bg-indigo-50/70 border-indigo-200' : 'bg-amber-50/70 border-amber-200'
                  }`}>
                    <div>
                      <span className="text-xs font-bold text-slate-600 block">
                        {netIncome >= 0 ? 'سود ویژه خالص دوره مالی' : 'زیان ویژه خالص دوره مالی'}
                      </span>
                      <span className="text-xs text-slate-400 font-medium">
                        طبق استاندارد حسابداری به حساب «سود و زیان انباشته» منتقل می‌شود.
                      </span>
                    </div>
                    <span className={`text-lg font-black font-mono ${netIncome >= 0 ? 'text-indigo-800' : 'text-amber-800'}`}>
                      {addCommas(Math.abs(netIncome))} <span className="text-xs font-sans font-normal">{currency}</span>
                    </span>
                  </div>
                </div>

                <div className="bg-slate-100/70 rounded-xl p-4 space-y-2 text-xs text-slate-700 font-medium border border-slate-200">
                  <h4 className="font-black text-slate-800">اسنادی که به صورت اتوماتیک صادر خواهند شد:</h4>
                  <ul className="list-disc list-inside space-y-1 text-slate-600">
                    <li><strong className="text-slate-800">سند بستن حساب‌های موقت:</strong> کلیه حساب‌های درآمد و هزینه صفر شده و به حساب «خلاصه سود و زیان» منتقل می‌شوند.</li>
                    <li><strong className="text-slate-800">سند انتقال سود و زیان:</strong> مانده سود/زیان ویژه به حساب «سود (زیان) انباشته» در حقوق صاحبان سهام واریز می‌گردد.</li>
                    <li><strong className="text-slate-800">سند اختتامیه:</strong> مانده کلیه حساب‌های دائمی (دارایی‌ها، بدهی‌ها و سرمایه) صفر و بسته می‌شود.</li>
                  </ul>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4">
                <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={createNextYear}
                      onChange={(e) => setCreateNextYear(e.target.checked)}
                      className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                    />
                    <span className="text-sm font-black text-slate-800">
                      افتتاح خودکار سال مالی جدید و صدور سند افتتاحیه
                    </span>
                  </label>
                  <p className="text-xs text-slate-500 font-medium pr-6">
                    با فعال‌سازی این گزینه، سال مالی بعد ایجاد شده و مانده نهایی دارایی‌ها و بدهی‌ها در قالب «سند افتتاحیه» به سال جدید منتقل خواهد شد.
                  </p>
                </div>

                {createNextYear && (
                  <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3 text-right">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">عنوان سال مالی جدید</label>
                      <input
                        type="text"
                        value={nextYearName}
                        onChange={(e) => setNextYearName(e.target.value)}
                        placeholder="مثال: سال مالی ۱۴۰۶"
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-bold"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">تاریخ شروع سال جدید</label>
                        <input
                          type="text"
                          value={nextStartDate}
                          onChange={(e) => setNextStartDate(e.target.value)}
                          className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">تاریخ پایان سال جدید</label>
                        <input
                          type="text"
                          value={nextEndDate}
                          onChange={(e) => setNextEndDate(e.target.value)}
                          className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none font-mono"
                        />
                      </div>
                    </div>
                  </div>
                )}

                <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-xs text-rose-800 font-bold flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>
                    توجه: پس از اجرای عملیات، سال مالی جاری قطعی و بسته خواهد شد و امکان ثبت یا تغییر فاکتور در این سال وجود نخواهد داشت.
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Footer Navigation */}
          <div className="p-5 border-t border-slate-100 bg-white flex flex-col sm:flex-row items-center justify-between gap-4">
            {step === 1 ? (
              <button
                onClick={runChecks}
                disabled={loading || isExecuting}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                بررسی مجدد
              </button>
            ) : (
              <button
                onClick={() => setStep((s) => (s - 1) as any)}
                disabled={isExecuting}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
              >
                <ArrowRight className="w-4 h-4" />
                مرحله قبلی
              </button>
            )}

            <div className="w-full sm:w-auto flex flex-col-reverse sm:flex-row items-center gap-3">
              <button
                onClick={onClose}
                disabled={isExecuting}
                className="w-full sm:w-auto px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                انصراف
              </button>

              {step < 3 ? (
                <button
                  onClick={() => setStep((s) => (s + 1) as any)}
                  disabled={!canProceed || loading || isExecuting}
                  className={`w-full sm:w-auto px-6 py-2.5 text-sm font-bold rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer ${
                    canProceed && !loading
                      ? 'bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-indigo-600/20'
                      : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  <span>مرحله بعدی</span>
                  <ArrowLeft className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={handleFinalSubmit}
                  disabled={isExecuting}
                  className="w-full sm:w-auto px-6 py-2.5 text-sm font-bold rounded-xl transition-all shadow-md flex items-center justify-center gap-2 bg-rose-600 text-white hover:bg-rose-700 hover:shadow-rose-600/20 cursor-pointer disabled:opacity-50"
                >
                  {isExecuting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>در حال صدور اسناد و بستن سال...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>تایید قطعی و صدور اسناد بستن سال</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
