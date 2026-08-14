import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Activity, Save } from 'lucide-react';
import { Loan } from '../../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  loan: Loan;
  onUpdateStatus: (loanId: string, newStatus: string) => Promise<void>;
}

export default function LoanStatusModal({ isOpen, onClose, loan, onUpdateStatus }: Props) {
  const [status, setStatus] = useState(loan.status);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await onUpdateStatus(loan.id as string, status);
      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100]"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[95%] max-w-md bg-white rounded-3xl shadow-2xl z-[101] overflow-hidden"
          >
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h3 className="text-xl font-black text-gray-800 flex items-center gap-2">
                <Activity className="w-6 h-6 text-indigo-600" />
                تغییر وضعیت وام
              </h3>
              <button
                onClick={onClose}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-200/50 text-gray-500 hover:bg-gray-200 hover:text-gray-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">وضعیت جدید را انتخاب کنید:</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="w-full bg-gray-50 border-2 border-gray-100 rounded-xl px-4 py-3 outline-none focus:border-indigo-500 font-medium"
                >
                  <option value="requested">درخواست (ثبت اولیه)</option>
                  <option value="incomplete">نقص پرونده</option>
                  <option value="completed_dossier">تکمیل پرونده</option>
                  <option value="approved">تایید شده</option>
                  <option value="active">پرداخت شده / در جریان</option>
                  <option value="completed">تسویه شده</option>
                  <option value="overdue">معوق</option>
                </select>
                <p className="mt-3 text-xs text-gray-500 leading-relaxed font-medium">
                  {status === 'active' 
                    ? 'در این مرحله، وام در داشبورد و گزارشات لحاظ می‌شود و سند حسابداری مربوطه باید ثبت شود.' 
                    : status === 'requested' || status === 'incomplete' || status === 'completed_dossier'
                    ? 'در این وضعیت، وام تایید نهایی نشده و در گزارشات یا معوقات نمایش داده نمی‌شود.'
                    : 'با تغییر وضعیت، لاگ سیستم ثبت می‌شود.'}
                </p>
              </div>
            </div>

            <div className="p-6 bg-gray-50 flex justify-end gap-3 rounded-b-3xl">
              <button
                onClick={onClose}
                disabled={isSubmitting}
                className="px-6 py-2.5 rounded-xl font-bold text-gray-600 hover:bg-gray-200 transition-colors"
              >
                انصراف
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSubmitting || status === loan.status}
                className="px-8 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl font-bold transition-all shadow-sm flex items-center gap-2"
              >
                <Save className="w-5 h-5" />
                ثبت تغییرات
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
