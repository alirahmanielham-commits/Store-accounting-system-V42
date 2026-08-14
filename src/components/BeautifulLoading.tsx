import React from 'react';
import { motion } from 'motion/react';
import { LayoutDashboard } from 'lucide-react';

export default function BeautifulLoading({ text = "در حال بارگذاری اطلاعات..." }: { text?: string }) {
  return (
    <div className="flex flex-col items-center justify-center relative overflow-hidden py-16 w-full h-full" dir="rtl">
      {/* Background elements */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[250px] h-[250px] bg-blue-500/5 rounded-full blur-2xl animate-pulse pointer-events-none" />
      
      <div className="relative z-10 flex flex-col items-center">
        {/* Animated Logo/Icon */}
        <div className="relative w-20 h-20 mb-6">
          <motion.div
            className="absolute inset-0 border-4 border-indigo-200 rounded-2xl"
            animate={{ rotate: 180, scale: [1, 1.1, 1] }}
            transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute inset-2 border-4 border-blue-400 rounded-xl"
            animate={{ rotate: -180, scale: [1, 1.2, 1] }}
            transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute inset-4 bg-gradient-to-tr from-indigo-600 to-blue-500 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/30"
            animate={{ scale: [1, 0.9, 1] }}
            transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
          >
            <LayoutDashboard className="w-5 h-5 text-white" />
          </motion.div>
        </div>

        {/* Loading Text */}
        <div className="flex flex-col items-center gap-3">
          <div className="flex items-center gap-3 bg-white px-5 py-2.5 rounded-2xl shadow-sm border border-slate-100">
            <motion.div
               animate={{ rotate: 360 }}
               transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
               className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full"
            />
            <span className="text-sm font-bold text-slate-500">{text}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
