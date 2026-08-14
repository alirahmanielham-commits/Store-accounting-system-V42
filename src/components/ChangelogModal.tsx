import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import * as lucide from 'lucide-react';
import changelogData from '../data/changelog.json';

const { X, GitCommit, Star, Rocket, Wrench, CheckCircle } = lucide as any;

interface ChangelogModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ChangelogModal({ isOpen, onClose }: ChangelogModalProps) {
  if (!isOpen) return null;

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'release': return <Rocket className="w-5 h-5 text-indigo-500" />;
      case 'feature': return <Star className="w-5 h-5 text-amber-500" />;
      case 'fix': return <Wrench className="w-5 h-5 text-emerald-500" />;
      default: return <GitCommit className="w-5 h-5 text-gray-500" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'release': return 'bg-indigo-50 border-indigo-200 text-indigo-700';
      case 'feature': return 'bg-amber-50 border-amber-200 text-amber-700';
      case 'fix': return 'bg-emerald-50 border-emerald-200 text-emerald-700';
      default: return 'bg-gray-50 border-gray-200 text-gray-700';
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm"
        />
        
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center shadow-sm">
                <Rocket className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-800">تغییرات سیستم</h2>
                <p className="text-sm text-gray-500 mt-0.5">تاریخچه بروزرسانی‌ها و نسخه‌ها</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content Timeline */}
          <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
            <div className="relative border-r-2 border-gray-100 pr-6 space-y-8 my-2 mr-4">
              {changelogData.map((log, index) => (
                <motion.div 
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  key={index} 
                  className="relative"
                >
                  {/* Timeline Dot */}
                  <div className="absolute -right-[35px] top-1 w-8 h-8 rounded-full bg-white border-2 border-gray-100 flex items-center justify-center shadow-sm">
                    {getTypeIcon(log.type)}
                  </div>

                  {/* Card */}
                  <div className={`p-5 rounded-2xl border ${getTypeColor(log.type)}`}>
                    <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                      <div className="flex items-center gap-3">
                        <span className="text-lg font-bold">نسخه {log.version}</span>
                        {index === 0 && (
                          <span className="px-2.5 py-1 text-xs font-semibold bg-white rounded-full shadow-sm">
                            جدید
                          </span>
                        )}
                      </div>
                      <span className="text-sm font-medium opacity-80 flex items-center gap-1.5">
                        <lucide.Calendar className="w-4 h-4" />
                        {log.date}
                      </span>
                    </div>

                    <h3 className="font-bold text-base mb-3 opacity-90">{log.title}</h3>

                    <ul className="space-y-2.5">
                      {log.changes.map((change, idx) => (
                        <li key={idx} className="flex items-start gap-2.5 text-sm opacity-80 leading-relaxed">
                          <CheckCircle className="w-4 h-4 mt-0.5 shrink-0 opacity-70" />
                          <span>{change}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
