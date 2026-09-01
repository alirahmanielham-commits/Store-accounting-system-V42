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
          initial={{ opacity: 0, y: -50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.9, transition: { duration: 0.2 } }}
          className="fixed top-6 left-1/2 -translate-x-1/2 bg-white/95 backdrop-blur-md shadow-2xl z-[10000000] flex items-center justify-center py-4 px-6 rounded-full cursor-wait select-none border border-slate-200/50 min-w-[320px] pointer-events-auto"
          dir="rtl"
        >
          <div className="flex items-center gap-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-10 h-10 relative flex items-center justify-center shrink-0"
            >
              <div className="absolute inset-0 rounded-full border-[3px] border-indigo-100"></div>
              <div className="absolute inset-0 rounded-full border-[3px] border-t-indigo-600 animate-spin"></div>
              <RefreshCw className="w-4 h-4 text-indigo-600 animate-pulse" />
            </motion.div>
            
            <motion.h3 
              key={processingStatus}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-sm font-black text-slate-700 font-sans tracking-wide"
            >
              {processingStatus || "در حال پردازش..."}
            </motion.h3>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
