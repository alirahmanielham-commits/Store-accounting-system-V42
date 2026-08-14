import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';
import BeautifulLoading from '../BeautifulLoading';

export default function ConfirmModal({ confirmState, setConfirmState }: any) {
  if (!confirmState.isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/40 z-[99999] flex items-center justify-center p-4 backdrop-blur-sm text-slate-800">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative bg-white rounded-2xl p-6 w-full max-w-md shadow-xl flex flex-col items-center border border-gray-100 overflow-hidden"
        dir="rtl"
      >
        {confirmState.loading && (
          <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-[10] flex items-center justify-center">
            <BeautifulLoading text="در حال انجام عملیات..." />
          </div>
        )}
        <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mb-4 shrink-0">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <h3 className="font-extrabold text-lg mb-2">تایید عملیات</h3>
        <p className="text-gray-500 text-sm text-center mb-4">
          {confirmState.message}
        </p>
        {confirmState.details && (
            <div className="w-full bg-slate-50 border border-slate-100 rounded-xl p-4 mb-6 text-sm text-slate-700 max-h-48 overflow-y-auto whitespace-pre-wrap text-right">
              {confirmState.details}
            </div>
        )}
        <div className="flex gap-3 w-full">
          <button
            disabled={confirmState.loading}
            onClick={async () => {
              setConfirmState({ ...confirmState, loading: true });
              try {
                await confirmState.onConfirm();
              } finally {
                setConfirmState({ ...confirmState, isOpen: false, loading: false });
              }
            }}
            className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl font-bold transition-colors flex items-center justify-center gap-2"
          >
            {confirmState.loading && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
            بله، تایید
          </button>
          <button
            disabled={confirmState.loading}
            onClick={() =>
              setConfirmState({ ...confirmState, isOpen: false })
            }
            className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 text-gray-700 rounded-xl font-bold transition-colors"
          >
            انصراف
          </button>
        </div>
      </motion.div>
    </div>
  );
}
