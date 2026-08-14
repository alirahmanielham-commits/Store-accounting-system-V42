import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle, AlertTriangle, AlertCircle, RefreshCw, X, FileText, CheckSquare, CreditCard, Box, BookOpen, AlertOctagon, RotateCcw } from 'lucide-react';
import { getInvoices, getAccountingDocuments, getReceivedChecks, getIssuedChecks, getStocktakings, getProducts, getRefundRequests } from '../../services/dataService';

export default function YearClosingChecklistModal({ isOpen, onClose, onConfirm, year }: any) {
  const [loading, setLoading] = useState(true);
  const [checklist, setChecklist] = useState<any[]>([]);
  const [canClose, setCanClose] = useState(false);

  useEffect(() => {
    if (isOpen && year) {
      runChecks();
    }
  }, [isOpen, year]);

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
        refundRequests
      ] = await Promise.all([
        getInvoices(),
        getAccountingDocuments(),
        getReceivedChecks(),
        getIssuedChecks(),
        getProducts(),
        getStocktakings(),
        getRefundRequests()
      ]);

      const checks = [];
      let allPassed = true;
      const yearStart = new Date(year.startDate).getTime();
      const yearEnd = new Date(year.endDate).getTime();

      // 1. Invoices
      const draftInvoices = invoices.filter(inv => {
        const time = new Date(inv.date || inv.jalaliDate).getTime();
        return time >= yearStart && time <= yearEnd && (inv.status === 'draft' || inv.status === 'pending');
      });
      const invoicesPassed = draftInvoices.length === 0;
      if (!invoicesPassed) allPassed = false;
      checks.push({
        id: 'invoices',
        title: 'بررسی فاکتورهای پیش‌نویس',
        description: 'فاکتورهای خرید، فروش و برگشتی باید در حالت "تایید نهایی" قرار گیرند.',
        passed: invoicesPassed,
        issues: draftInvoices.length > 0 ? `${draftInvoices.length} فاکتور پیش‌نویس یا در انتظار در این بازه یافت شد.` : null,
        icon: FileText
      });

      // 2. Accounting Docs
      const tempDocs = accDocs.filter(doc => {
        const time = new Date(doc.date).getTime();
        return time >= yearStart && time <= yearEnd && doc.status === 'temporary';
      });
      const docsPassed = tempDocs.length === 0;
      if (!docsPassed) allPassed = false;
      checks.push({
        id: 'acc_docs',
        title: 'اسناد حسابداری موقت',
        description: 'اسناد حسابداری موقت باید بررسی و قطعی (دائم) شوند.',
        passed: docsPassed,
        issues: tempDocs.length > 0 ? `${tempDocs.length} سند موقت در این سال مالی وجود دارد.` : null,
        icon: BookOpen
      });

      // 3. Stocktaking
      const activeStocktakings = stocktakings.filter(st => {
        const time = new Date(st.date).getTime();
        return time >= yearStart && time <= yearEnd && st.status === 'in_progress';
      });
      const stocktakingPassed = activeStocktakings.length === 0;
      if (!stocktakingPassed) allPassed = false;
      checks.push({
        id: 'stocktaking',
        title: 'انبارگردانی‌های باز',
        description: 'پرونده‌های انبارگردانی جاری باید بسته شوند.',
        passed: stocktakingPassed,
        issues: activeStocktakings.length > 0 ? `${activeStocktakings.length} انبارگردانی در حال انجام یافت شد.` : null,
        icon: Box
      });

      // 4. Negative Stock
      const negativeStock = products.filter(p => p.type === 'product' && (p.stock || 0) < 0);
      const stockPassed = negativeStock.length === 0;
      if (!stockPassed) allPassed = false;
      checks.push({
        id: 'negative_stock',
        title: 'کالاهای با موجودی منفی',
        description: 'موجودی انبارها نباید منفی باشد، پیش از بستن سال باید اصلاح شود.',
        passed: stockPassed,
        issues: negativeStock.length > 0 ? `${negativeStock.length} کالا دارای موجودی منفی است.` : null,
        icon: AlertOctagon
      });

      // 5. Unresolved Refunds
      const pendingRefunds = refundRequests.filter(r => {
        const time = new Date(r.requestDate).getTime();
        return time >= yearStart && time <= yearEnd && r.status === 'pending';
      });
      const refundsPassed = pendingRefunds.length === 0;
      if (!refundsPassed) allPassed = false;
      checks.push({
        id: 'refunds',
        title: 'درخواست‌های استرداد',
        description: 'استردادهای در حال انتظار باید تایید یا رد شوند.',
        passed: refundsPassed,
        issues: pendingRefunds.length > 0 ? `${pendingRefunds.length} درخواست استرداد معلق وجود دارد.` : null,
        icon: RotateCcw
      });

      // 6. Undetermined Checks (Warning only, does not block)
      const unresolvedReceived = receivedChecks.filter(c => {
        const time = new Date(c.dueDate).getTime();
        return time >= yearStart && time <= yearEnd && c.status === 'received';
      });
      const unresolvedIssued = issuedChecks.filter(c => {
        const time = new Date(c.dueDate).getTime();
        return time >= yearStart && time <= yearEnd && c.status === 'issued';
      });
      const checkPassed = unresolvedReceived.length === 0 && unresolvedIssued.length === 0;
      
      checks.push({
        id: 'checks',
        title: 'چک‌های سررسید شده تعیین تکلیف نشده',
        description: 'توصیه می‌شود چک‌های وصولی یا پرداختی سررسید شده را تعیین تکلیف کنید.',
        passed: checkPassed,
        issues: (unresolvedReceived.length > 0 || unresolvedIssued.length > 0) ? `${unresolvedReceived.length} چک دریافتی و ${unresolvedIssued.length} چک پرداختی تعیین وضعیت نشده‌اند.` : null,
        icon: CreditCard,
        isWarning: true
      });

      setChecklist(checks);
      setCanClose(allPassed);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm" dir="rtl">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
                <CheckSquare className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-black text-slate-800">چک‌لیست اتوماتیک بستن سال مالی</h2>
                <p className="text-sm text-slate-500 font-medium">بررسی پیش‌نیازهای تایید سال مالی {year?.name}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 overflow-y-auto flex-1 bg-slate-50/50 space-y-4">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin mb-4" />
                <p className="text-sm font-bold text-slate-600">در حال بررسی هوشمند اطلاعات سیستم...</p>
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
              )})
            )}
          </div>

          <div className="p-5 border-t border-slate-100 bg-white flex flex-col sm:flex-row items-center justify-between gap-4">
            <button
              onClick={runChecks}
              disabled={loading}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              بررسی مجدد
            </button>
            <div className="w-full sm:w-auto flex flex-col-reverse sm:flex-row items-center gap-3">
              <button
                onClick={onClose}
                className="w-full sm:w-auto px-6 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                انصراف
              </button>
              <button
                onClick={() => {
                  if (canClose) {
                    onConfirm(year.id);
                  }
                }}
                disabled={!canClose || loading}
                className={`w-full sm:w-auto px-6 py-2.5 text-sm font-bold rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 ${
                  canClose 
                    ? 'bg-rose-600 text-white hover:bg-rose-700 hover:shadow-rose-600/20' 
                    : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                }`}
              >
                تایید و بستن سال مالی
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
