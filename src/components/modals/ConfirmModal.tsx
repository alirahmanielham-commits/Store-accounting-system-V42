import React from 'react';
import { AlertTriangle, CheckCircle2, Trash2, Info, HelpCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import BeautifulLoading from '../BeautifulLoading';

export interface ConfirmState {
  isOpen: boolean;
  message: string;
  title?: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'success' | 'info';
  confirmButtonClass?: string;
  details?: React.ReactNode;
  onConfirm: () => Promise<void> | void;
  loading?: boolean;
}

export default function ConfirmModal({ confirmState, setConfirmState }: { confirmState: ConfirmState; setConfirmState: any }) {
  if (!confirmState || !confirmState.isOpen) return null;

  const type = confirmState.type || 'warning';

  const getIconAndColors = () => {
    switch (type) {
      case 'success':
        return {
          icon: <CheckCircle2 className="w-6 h-6 text-emerald-600" />,
          iconBg: 'bg-emerald-50 border-emerald-200 text-emerald-600',
          defaultBtn: 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-200',
          title: confirmState.title || 'تایید نهایی عملیات'
        };
      case 'danger':
        return {
          icon: <Trash2 className="w-6 h-6 text-rose-600" />,
          iconBg: 'bg-rose-50 border-rose-200 text-rose-600',
          defaultBtn: 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-200',
          title: confirmState.title || 'تایید حذف / ابطال'
        };
      case 'info':
        return {
          icon: <Info className="w-6 h-6 text-blue-600" />,
          iconBg: 'bg-blue-50 border-blue-200 text-blue-600',
          defaultBtn: 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-200',
          title: confirmState.title || 'اطلاعیه و تایید'
        };
      case 'warning':
      default:
        return {
          icon: <AlertTriangle className="w-6 h-6 text-amber-600" />,
          iconBg: 'bg-amber-50 border-amber-200 text-amber-600',
          defaultBtn: 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-200',
          title: confirmState.title || 'تایید عملیات'
        };
    }
  };

  const { icon, iconBg, defaultBtn, title } = getIconAndColors();
  const confirmBtnClass = confirmState.confirmButtonClass || defaultBtn;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-slate-900/50 z-[99999] flex items-center justify-center p-4 backdrop-blur-sm text-slate-800">
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 10 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          className="relative bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl flex flex-col items-center border border-slate-100 overflow-hidden"
          dir="rtl"
        >
          {confirmState.loading && (
            <div className="absolute inset-0 bg-white/85 backdrop-blur-sm z-[20] flex items-center justify-center">
              <BeautifulLoading text="در حال پردازش عملیات..." />
            </div>
          )}

          {/* Icon Header */}
          <div className={`w-14 h-14 rounded-2xl border flex items-center justify-center mb-4 shrink-0 shadow-sm ${iconBg}`}>
            {icon}
          </div>

          <h3 className="font-black text-slate-900 text-lg mb-2 text-center">
            {title}
          </h3>

          <p className="text-slate-600 text-sm text-center mb-4 leading-relaxed font-medium">
            {confirmState.message}
          </p>

          {confirmState.details && (
            <div className="w-full bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 mb-5 text-xs text-slate-700 max-h-56 overflow-y-auto whitespace-pre-wrap text-right leading-relaxed font-sans">
              {confirmState.details}
            </div>
          )}

          <div className="flex gap-3 w-full mt-1">
            <button
              type="button"
              disabled={confirmState.loading}
              onClick={async () => {
                setConfirmState((prev: any) => ({ ...prev, loading: true }));
                try {
                  await confirmState.onConfirm();
                } finally {
                  setConfirmState((prev: any) => ({ ...prev, isOpen: false, loading: false }));
                }
              }}
              className={`flex-1 py-2.5 px-4 rounded-xl font-black text-sm transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer disabled:opacity-50 ${confirmBtnClass}`}
            >
              {confirmState.loading && (
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              )}
              {confirmState.confirmText || 'بله، تایید'}
            </button>
            <button
              type="button"
              disabled={confirmState.loading}
              onClick={() => setConfirmState((prev: any) => ({ ...prev, isOpen: false }))}
              className="flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-sm transition-colors cursor-pointer disabled:opacity-50"
            >
              {confirmState.cancelText || 'انصراف'}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
