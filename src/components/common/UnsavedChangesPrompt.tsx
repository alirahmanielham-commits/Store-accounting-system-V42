import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, X } from 'lucide-react';

export interface UnsavedChangesPromptProps {
  isOpen: boolean;
  onStay: () => void;
  onDiscard: () => void;
  title?: string;
  description?: string;
}

export const UnsavedChangesPrompt: React.FC<UnsavedChangesPromptProps> = ({
  isOpen,
  onStay,
  onDiscard,
  title = 'تغییرات ذخیره‌نشده',
  description = 'اطلاعات وارد شده در این فرم هنوز ذخیره نشده‌اند. در صورت خروج، تغییرات اعمال شده از بین خواهند رفت. آیا مطمئنید؟'
}) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div 
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
        dir="rtl"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200"
        >
          <div className="p-5 flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-200">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <h3 className="text-base font-black text-slate-800">{title}</h3>
              <p className="text-xs text-slate-600 font-medium mt-1.5 leading-relaxed">
                {description}
              </p>
            </div>
            <button
              onClick={onStay}
              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onStay}
              className="px-4 py-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 rounded-xl border border-slate-200 shadow-2xs transition-colors cursor-pointer"
            >
              ادامه ویرایش (ماندن)
            </button>
            <button
              type="button"
              onClick={onDiscard}
              className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              خروج بدون ذخیره
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default UnsavedChangesPrompt;
