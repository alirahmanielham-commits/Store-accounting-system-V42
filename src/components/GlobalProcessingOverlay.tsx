import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { RefreshCw } from 'lucide-react';
import { useStore } from '../store';

export default function GlobalProcessingOverlay() {
  const { isProcessing, processingStatus, startProcessing, updateProcessingStatus, stopProcessing } = useStore();

  useEffect(() => {
    const handleStart = (e: any) => startProcessing(e.detail?.msg || 'در حال پردازش...');
    const handleUpdate = (e: any) => updateProcessingStatus(e.detail?.msg);
    const handleStop = () => stopProcessing();

    window.addEventListener('app:start-processing', handleStart);
    window.addEventListener('app:update-processing', handleUpdate);
    window.addEventListener('app:stop-processing', handleStop);

    return () => {
      window.removeEventListener('app:start-processing', handleStart);
      window.removeEventListener('app:update-processing', handleUpdate);
      window.removeEventListener('app:stop-processing', handleStop);
    };
  }, [startProcessing, updateProcessingStatus, stopProcessing]);

  return (
    <AnimatePresence>
      {isProcessing && (
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50, transition: { duration: 0.2 } }}
          className="fixed bottom-6 right-6 bg-slate-900 shadow-2xl z-[10000000] flex flex-col items-start justify-center p-6 rounded-2xl cursor-wait select-none w-80 border border-slate-700 pointer-events-auto"
          dir="rtl"
        >
          <div className="flex items-center gap-4 mb-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-10 h-10 relative flex items-center justify-center shrink-0"
            >
              <div className="absolute inset-0 rounded-full border-2 border-indigo-500/20"></div>
              <div className="absolute inset-0 rounded-full border-2 border-t-indigo-500 animate-spin"></div>
              <RefreshCw className="w-4 h-4 text-indigo-400 animate-pulse" />
            </motion.div>
            
            <motion.h3 
              key={processingStatus}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-sm font-black text-white"
            >
              {processingStatus || "در حال پردازش..."}
            </motion.h3>
          </div>
          <p className="text-slate-400 text-xs leading-relaxed mb-4 font-bold text-right">
            لطفاً منتظر بمانید. اطلاعات به صورت یکپارچه و امن در حال ثبت است.
          </p>

          <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden relative">
            <div className="absolute h-full bg-indigo-500 rounded-full animate-loading-bar w-1/2"></div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
