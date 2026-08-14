import React, { useState, useEffect } from 'react';
import CustomDatePicker from '../ui/CustomDatePicker';
import { globalDateFormatter } from '../../utils/dateFormatter';
import { convertToGregorian } from '../../utils/format';
import { motion, AnimatePresence } from 'motion/react';
import { X, CheckCircle, AlertCircle, AlertTriangle, ArrowLeft } from 'lucide-react';
import { Loan } from '../../types';
import { checkTransitionEligibility, TransitionEligibility, applyTransition } from '../../services/loanStateMachine';
import { startAppProcessing, stopAppProcessing } from '../../utils/processingHelper';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  loan: Loan;
  targetStatus: Loan['status'];
  userRole: string;
  LOAN_STATUS_LABELS: Record<string, string>;
  onSuccess: (updatedLoan: Loan) => void;
  showNotification: (message: string, type: 'success'|'error'|'warning') => void;
}

export default function LoanTransitionModal({ 
  isOpen, 
  onClose, 
  loan, 
  targetStatus, 
  userRole, 
  LOAN_STATUS_LABELS,
  onSuccess,
  showNotification
}: Props) {
  const [eligibility, setEligibility] = useState<TransitionEligibility | null>(null);
  const [loading, setLoading] = useState(true);
  const [reason, setReason] = useState('');
  const [rollbackConfirmed, setRollbackConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [confirmRollback, setConfirmRollback] = useState(false);
  const [paymentDate, setPaymentDate] = useState(globalDateFormatter.formatDateOnly(new Date()));
  const [firstInstallmentDate, setFirstInstallmentDate] = useState(globalDateFormatter.formatDateOnly(new Date()));

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      setEligibility(null);
      setReason('');
      setRollbackConfirmed(false);
      checkTransitionEligibility(loan, targetStatus, userRole)
        .then(res => {
          setEligibility(res);
          setLoading(false);
        })
        .catch(err => {
          console.error(err);
          setLoading(false);
        });
    }
  }, [isOpen, loan, targetStatus, userRole]);

  const handleConfirm = async () => {
    if (!eligibility || !eligibility.allowed) return;
    if (eligibility.requiresReason && !reason.trim()) {
      showNotification('لطفاً دلیل تغییر وضعیت را وارد کنید.', 'error');
      return;
    }

    setSubmitting(true);
    startAppProcessing('در حال اعمال تغییر وضعیت...');
    try {
      let finalPaymentDate = paymentDate;
      let finalFirstInstDate = firstInstallmentDate;
      if (paymentDate && typeof paymentDate === 'string' && !paymentDate.includes('-')) {
        // Assume it's Shamsi and convert? CustomDatePicker might output strings like 1403/05/20
        // We will pass the Jalali strings to applyTransition and it will handle ISO conversions.
      }
      const updated = await applyTransition(loan.id, targetStatus, userRole, reason, undefined, { paymentDate, firstInstallmentDate });
      showNotification('وضعیت وام با موفقیت تغییر کرد.', 'success');
      onSuccess(updated as any);
      onClose();
    } catch (error: any) {
      showNotification(error.message || 'خطا در اعمال تغییر وضعیت', 'error');
    } finally {
      setSubmitting(false);
      stopAppProcessing();
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-white rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
            <h2 className="text-xl font-black text-gray-800 flex items-center gap-3">
              <ArrowLeft className="w-6 h-6 text-indigo-500" />
              تایید تغییر وضعیت وام
            </h2>
            <button onClick={onClose} className="p-2 text-gray-400 hover:bg-gray-100 rounded-xl transition-colors">
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="p-6">
            <div className="flex items-center justify-center gap-4 mb-8">
              <div className="px-4 py-2 bg-gray-100 rounded-xl font-bold text-gray-600">
                {LOAN_STATUS_LABELS[loan.status]}
              </div>
              <ArrowLeft className="w-5 h-5 text-gray-400" />
              <div className="px-4 py-2 bg-indigo-100 rounded-xl font-bold text-indigo-700">
                {LOAN_STATUS_LABELS[targetStatus]}
              </div>
            </div>

            {loading ? (
              <div className="py-12 flex justify-center items-center">
                <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
              </div>
            ) : eligibility ? (
              <div className="space-y-6">
                {!eligibility.allowed && (
                  <div className="bg-rose-50 border border-rose-100 rounded-2xl p-4 flex gap-3 text-rose-700">
                    <AlertTriangle className="w-6 h-6 flex-shrink-0" />
                    <div>
                      <h4 className="font-bold mb-1">امکان تغییر وضعیت وجود ندارد</h4>
                      <ul className="text-sm space-y-1 list-disc list-inside opacity-90">
                        {eligibility.blockingReasons.map((reason, i) => (
                          <li key={i}>{reason}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}

                {eligibility.checks.length > 0 && (
                  <div>
                    <h4 className="font-bold text-gray-700 mb-3 text-sm">بررسی پیش‌نیازها:</h4>
                    <div className="space-y-2">
                      {eligibility.checks.map((check, i) => (
                        <div key={i} className={`flex items-start gap-3 p-3 rounded-xl border ${check.passed ? 'bg-emerald-50/50 border-emerald-100 text-emerald-800' : 'bg-rose-50/50 border-rose-100 text-rose-800'}`}>
                          {check.passed ? <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0" /> : <X className="w-5 h-5 text-rose-500 flex-shrink-0" />}
                          <div>
                            <div className="font-bold text-sm mb-0.5">{check.name}</div>
                            <div className="text-xs opacity-80">{check.detail}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {eligibility.sideEffects.length > 0 && (
                  <div>
                    <h4 className="font-bold text-gray-700 mb-3 text-sm">آثار جانبی سیستم:</h4>
                    <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-4">
                      <ul className="text-sm space-y-2 text-blue-800 list-disc list-inside font-medium">
                        {eligibility.sideEffects.map((effect, i) => (
                          <li key={i}>{effect}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}

                {targetStatus === 'active' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block font-bold text-gray-700 mb-2 text-sm">تاریخ پرداخت</label>
                      <CustomDatePicker
                         value={paymentDate}
                         format="YYYY/MM/DD"
                         onChange={(val: string) => setPaymentDate(val)}
                         inputClass="w-full bg-gray-50 border-2 border-gray-100 focus:border-indigo-500 focus:bg-white rounded-xl px-4 py-3 outline-none transition-all font-medium text-slate-800"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-gray-700 mb-2 text-sm">تاریخ اولین سررسید</label>
                      <CustomDatePicker
                         value={firstInstallmentDate}
                         format="YYYY/MM/DD"
                         onChange={(val: string) => setFirstInstallmentDate(val)}
                         inputClass="w-full bg-gray-50 border-2 border-gray-100 focus:border-indigo-500 focus:bg-white rounded-xl px-4 py-3 outline-none transition-all font-medium text-slate-800"
                      />
                    </div>
                  </div>
                )}
                {eligibility.requiresReason && (
                  <div>
                    <label className="block font-bold text-gray-700 mb-2 text-sm">
                      دلیل بازگشت وضعیت (الزامی) <span className="text-rose-500">*</span>
                    </label>
                    <textarea
                      value={reason}
                      onChange={e => setReason(e.target.value)}
                      placeholder="دلیل ابطال یا بازگشت وضعیت را به صورت واضح ذکر کنید..."
                      className="w-full border-2 border-gray-200 rounded-xl p-3 h-24 focus:border-indigo-500 outline-none text-sm resize-none"
                    />
                  </div>
                )}
              
                {eligibility.direction === 'rollback' && (
                  <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={rollbackConfirmed}
                        onChange={e => setRollbackConfirmed(e.target.checked)}
                        className="mt-1 w-5 h-5 text-amber-600 rounded border-amber-300 focus:ring-amber-500"
                      />
                      <div className="text-sm text-amber-900 font-medium leading-relaxed">
                        تایید می‌کنم که قصد بازگشت وضعیت این وام به مرحله قبل را دارم. با این کار، سیستم به صورت خودکار اسناد حسابداری اصلاحی (معکوس) و تراکنش‌های برگشتی صادر خواهد کرد.
                      </div>
                    </label>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center text-rose-500 py-8">
                خطا در بررسی وضعیت
              </div>
            )}
          </div>

          <div className="p-6 border-t border-gray-100 bg-gray-50 flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 rounded-xl font-bold text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 transition-colors"
            >
              انصراف
            </button>
            <button
              onClick={handleConfirm}
              disabled={submitting || !eligibility?.allowed || (eligibility?.requiresReason && !reason.trim()) || (eligibility?.direction === 'rollback' && !rollbackConfirmed)}
              className="flex-1 px-4 py-3 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors shadow-md"
            >
              {submitting ? 'در حال اعمال...' : 'تایید نهایی'}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
