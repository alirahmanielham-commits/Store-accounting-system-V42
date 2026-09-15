import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, CheckCircle2, Clock, Target, ArrowLeft, ArrowRight,
  TrendingDown, Phone, Radio, ChevronDown, ChevronUp, Sparkles, Layers
} from 'lucide-react';
import { toPersianDigits } from '../../utils/format';
import { playHackerDataBeep } from '../../utils/audio';

interface DebtorItem {
  id: string | number;
  name: string;
  phone?: string;
  debtAmount: number;
  lastActivityDate?: string | null;
}

interface CyberDebtorQueueProps {
  debtors: DebtorItem[];
  currentIndex: number;
  simultaneousCount?: number;
  currency: string;
  formatNumber: (num: number) => string;
  isHacker?: boolean;
  onSelectIndex: (index: number) => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  roundNumber?: number;
}

export const CyberDebtorQueue: React.FC<CyberDebtorQueueProps> = ({
  debtors,
  currentIndex,
  currency,
  formatNumber,
  isHacker = true,
  onSelectIndex,
  isCollapsed = false,
  onToggleCollapse,
  roundNumber = 1
}) => {
  if (debtors.length === 0) return null;

  // Active debtor
  const activeDebtor = debtors[currentIndex];

  // Processed / Past debtors (shown so far): added to the left
  const processedDebtors = debtors.slice(0, currentIndex);

  // Upcoming debtors (waiting to be shown): removed from the right
  const upcomingDebtors = debtors.slice(currentIndex + 1);

  // Cycle counter / progress
  const progressPercent = Math.round(((currentIndex + 1) / debtors.length) * 100);

  const handleCardClick = (targetIndex: number) => {
    playHackerDataBeep(0.1);
    onSelectIndex(targetIndex);
  };

  return (
    <div 
      className={`transition-all duration-300 flex flex-col font-['IRANYekanXFaNum','Vazirmatn',sans-serif] ${
        isHacker 
          ? 'bg-black/85 border border-[#00ff41]/30 shadow-[0_0_25px_rgba(0,255,65,0.12)] text-[#00ff41]' 
          : 'bg-white/95 border border-slate-200 shadow-xl text-slate-800'
      } rounded-2xl md:rounded-3xl backdrop-blur-xl overflow-hidden`}
    >
      {/* Header bar */}
      <div 
        className={`p-3 md:p-4 border-b flex items-center justify-between gap-2 select-none ${
          isHacker ? 'border-[#00ff41]/20 bg-black/60' : 'border-slate-100 bg-slate-50/80'
        }`}
      >
        <div className="flex items-center gap-2.5">
          <div className={`p-1.5 rounded-lg ${isHacker ? 'bg-[#00ff41]/20 text-[#00ff41]' : 'bg-emerald-100 text-emerald-700'}`}>
            <Radio className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <div className="text-xs md:text-sm font-black flex items-center gap-1.5">
              <span>رادار صف چرخشی بدهکاران</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                isHacker ? 'bg-[#00ff41]/20 text-[#00ff41] border border-[#00ff41]/40' : 'bg-emerald-100 text-emerald-800'
              }`}>
                حرکت راست به چپ
              </span>
            </div>
            <div className="text-[10px] text-gray-400 font-normal">
              کسر از سمت راست، انتقال به سمت چپ و چرخش خودکار
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Round badge */}
          {roundNumber > 1 && (
            <div className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
              isHacker ? 'bg-[#00ff41]/20 text-[#00ff41] border border-[#00ff41]/40' : 'bg-indigo-50 text-indigo-700'
            }`}>
              دور {toPersianDigits(roundNumber)}
            </div>
          )}

          {/* Progress badge */}
          <div className={`px-2.5 py-1 rounded-lg text-xs font-black ${
            isHacker ? 'bg-black border border-[#00ff41]/40 text-[#00ff41]' : 'bg-white border border-slate-200 text-slate-700'
          }`}>
            <span>{toPersianDigits(currentIndex + 1)}</span>
            <span className="opacity-50 mx-1">/</span>
            <span>{toPersianDigits(debtors.length)}</span>
          </div>

          {onToggleCollapse && (
            <button
              type="button"
              onClick={onToggleCollapse}
              className={`p-1.5 rounded-lg transition-colors ${
                isHacker ? 'hover:bg-[#00ff41]/20 text-[#00ff41]' : 'hover:bg-slate-200 text-slate-600'
              }`}
              title={isCollapsed ? "باز کردن پنل صف" : "بستن پنل صف"}
            >
              {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
            </button>
          )}
        </div>
      </div>

      {/* Progress Line */}
      <div className="w-full bg-gray-800/40 h-1.5 relative overflow-hidden">
        <motion.div 
          className={`h-full ${isHacker ? 'bg-[#00ff41] shadow-[0_0_8px_#00ff41]' : 'bg-rose-500'}`}
          initial={{ width: 0 }}
          animate={{ width: `${progressPercent}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>

      {!isCollapsed && (
        <div className="p-3 md:p-4 flex flex-col gap-3.5">
          {/* Active Target Banner */}
          {activeDebtor && (
            <motion.div 
              key={`active-banner-${activeDebtor.id}-${currentIndex}`}
              initial={{ scale: 0.98, opacity: 0.8 }}
              animate={{ scale: 1, opacity: 1 }}
              className={`p-3 rounded-xl border flex items-center justify-between gap-3 relative overflow-hidden ${
                isHacker 
                  ? 'bg-[#00ff41]/10 border-[#00ff41] shadow-[0_0_15px_rgba(0,255,65,0.25)]' 
                  : 'bg-rose-50/80 border-rose-200 shadow-sm'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                  isHacker ? 'bg-black border border-[#00ff41] text-[#00ff41]' : 'bg-white text-rose-500 shadow-sm'
                }`}>
                  <Target className="w-4 h-4 animate-spin" style={{ animationDuration: '6s' }} />
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] font-bold text-gray-400 flex items-center gap-1">
                    <span>کارت در حال نمایش (هدف فعال)</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-[#00ff41] animate-ping" />
                  </div>
                  <div className="text-sm font-black truncate text-white">
                    {activeDebtor.name}
                  </div>
                </div>
              </div>

              <div className="text-left shrink-0">
                <div className="text-xs font-black text-[#00ff41]">
                  {toPersianDigits(formatNumber(activeDebtor.debtAmount))}
                </div>
                <div className="text-[9px] text-gray-400">{currency}</div>
              </div>
            </motion.div>
          )}

          {/* Horizontal Conveyor Visualizer (Right -> Target -> Left) */}
          <div className={`p-2.5 rounded-xl border flex flex-col gap-1.5 ${
            isHacker ? 'bg-black/50 border-slate-800' : 'bg-slate-50 border-slate-200'
          }`}>
            <div className="flex items-center justify-between text-[11px] font-bold text-gray-400 px-1">
              <span className="flex items-center gap-1 text-emerald-400">
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>سمت چپ: اضافه شده‌ها ({toPersianDigits(processedDebtors.length)})</span>
              </span>
              <span className="flex items-center gap-1 text-amber-400">
                <span>سمت راست: در صف ({toPersianDigits(upcomingDebtors.length)})</span>
                <ArrowLeft className="w-3.5 h-3.5" />
              </span>
            </div>

            {/* Horizontal Mini Track */}
            <div className="relative flex items-center justify-between gap-1 overflow-x-auto py-1 px-1 styled-scrollbar">
              {/* Processed (Left side in Persian RTL) */}
              <div className="flex items-center gap-1 shrink-0">
                {processedDebtors.slice(-3).map((item, pIdx) => {
                  const actualIdx = currentIndex - (processedDebtors.slice(-3).length - pIdx);
                  return (
                    <button
                      key={`left-track-${item.id}-${pIdx}`}
                      type="button"
                      onClick={() => handleCardClick(actualIdx)}
                      className={`px-2 py-1 rounded-md text-[10px] font-bold transition-all truncate max-w-[80px] ${
                        isHacker 
                          ? 'bg-slate-900/90 text-gray-400 border border-slate-700/60 hover:border-[#00ff41]' 
                          : 'bg-white text-slate-600 border border-slate-200 shadow-xs'
                      }`}
                      title={`${item.name} - ${formatNumber(item.debtAmount)} ${currency}`}
                    >
                      ✓ {item.name}
                    </button>
                  );
                })}
              </div>

              {/* Active Chip */}
              {activeDebtor && (
                <div className={`px-2.5 py-1 rounded-md text-[11px] font-black shrink-0 flex items-center gap-1 ${
                  isHacker 
                    ? 'bg-[#00ff41] text-black shadow-[0_0_10px_#00ff41]' 
                    : 'bg-rose-500 text-white shadow-md'
                }`}>
                  <span>🎯</span>
                  <span className="truncate max-w-[90px]">{activeDebtor.name}</span>
                </div>
              )}

              {/* Upcoming (Right side in Persian RTL) */}
              <div className="flex items-center gap-1 shrink-0">
                {upcomingDebtors.slice(0, 3).map((item, uIdx) => {
                  const actualIdx = currentIndex + 1 + uIdx;
                  return (
                    <button
                      key={`right-track-${item.id}-${uIdx}`}
                      type="button"
                      onClick={() => handleCardClick(actualIdx)}
                      className={`px-2 py-1 rounded-md text-[10px] font-bold transition-all truncate max-w-[80px] ${
                        isHacker 
                          ? 'bg-black text-[#00ff41]/80 border border-[#00ff41]/30 hover:bg-[#00ff41]/10' 
                          : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                      }`}
                      title={`${item.name} - ${formatNumber(item.debtAmount)} ${currency}`}
                    >
                      {item.name}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Dual Columns: Right (Decreasing queue) & Left (Increasing processed) */}
          <div className="grid grid-cols-2 gap-2.5">
            {/* RIGHT COLUMN: Upcoming queue (کاهش از راست) */}
            <div className={`flex flex-col rounded-xl border p-2.5 ${
              isHacker ? 'bg-black/60 border-amber-500/30' : 'bg-amber-50/50 border-amber-200'
            }`}>
              <div className="flex items-center justify-between pb-2 border-b border-gray-800/60 mb-2">
                <span className="text-[11px] font-black flex items-center gap-1 text-amber-400">
                  <Clock className="w-3.5 h-3.5" />
                  <span>صف راست (در انتظار)</span>
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300">
                  {toPersianDigits(upcomingDebtors.length)} نفر
                </span>
              </div>

              <div className="space-y-1.5 max-h-56 overflow-y-auto pl-1 styled-scrollbar">
                {upcomingDebtors.length === 0 ? (
                  <div className="text-center py-6 text-gray-500 text-[11px] flex flex-col items-center gap-1">
                    <Sparkles className="w-4 h-4 text-amber-400 animate-spin" />
                    <span>پایان صف!</span>
                    <span className="text-[10px] opacity-75">در حال شروع مجدد از ابتدا...</span>
                  </div>
                ) : (
                  <AnimatePresence mode="popLayout">
                    {upcomingDebtors.map((person, idx) => {
                      const targetIdx = currentIndex + 1 + idx;
                      return (
                        <motion.div
                          key={`upcoming-${person.id}`}
                          layout
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -20 }}
                          transition={{ duration: 0.25 }}
                          onClick={() => handleCardClick(targetIdx)}
                          className={`p-2 rounded-lg border text-right cursor-pointer transition-all ${
                            isHacker
                              ? 'bg-black/80 border-slate-800 hover:border-amber-400 hover:bg-amber-950/20'
                              : 'bg-white border-slate-200 hover:border-amber-400 hover:shadow-xs'
                          }`}
                        >
                          <div className="flex items-center justify-between text-xs font-bold text-gray-200 truncate">
                            <span className="truncate">{person.name}</span>
                            <span className="text-[10px] text-amber-400 shrink-0 font-mono">
                              #{toPersianDigits(targetIdx + 1)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-[10px] text-gray-400 mt-1">
                            <span className="text-amber-400/90 font-black">
                              {toPersianDigits(formatNumber(person.debtAmount))} {currency}
                            </span>
                            {person.phone && (
                              <span dir="ltr" className="text-[9px] opacity-75">
                                {toPersianDigits(person.phone)}
                              </span>
                            )}
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                )}
              </div>
            </div>

            {/* LEFT COLUMN: Processed queue (افزایش در چپ) */}
            <div className={`flex flex-col rounded-xl border p-2.5 ${
              isHacker ? 'bg-black/60 border-emerald-500/30' : 'bg-emerald-50/50 border-emerald-200'
            }`}>
              <div className="flex items-center justify-between pb-2 border-b border-gray-800/60 mb-2">
                <span className="text-[11px] font-black flex items-center gap-1 text-emerald-400">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>صف چپ (اسکن شده)</span>
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300">
                  {toPersianDigits(processedDebtors.length)} نفر
                </span>
              </div>

              <div className="space-y-1.5 max-h-56 overflow-y-auto pl-1 styled-scrollbar">
                {processedDebtors.length === 0 ? (
                  <div className="text-center py-6 text-gray-500 text-[11px]">
                    اولین کارت در حال پردازش است...
                  </div>
                ) : (
                  <AnimatePresence mode="popLayout">
                    {processedDebtors.slice().reverse().map((person, revIdx) => {
                      const targetIdx = processedDebtors.length - 1 - revIdx;
                      return (
                        <motion.div
                          key={`processed-${person.id}`}
                          layout
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 20 }}
                          transition={{ duration: 0.25 }}
                          onClick={() => handleCardClick(targetIdx)}
                          className={`p-2 rounded-lg border text-right cursor-pointer transition-all ${
                            isHacker
                              ? 'bg-black/80 border-slate-800 hover:border-[#00ff41] hover:bg-[#00ff41]/10'
                              : 'bg-white border-slate-200 hover:border-emerald-400 hover:shadow-xs'
                          }`}
                        >
                          <div className="flex items-center justify-between text-xs font-bold text-gray-200 truncate">
                            <span className="truncate flex items-center gap-1">
                              <span className="text-[#00ff41] text-[10px]">✓</span>
                              <span>{person.name}</span>
                            </span>
                            <span className="text-[10px] text-gray-500 shrink-0 font-mono">
                              #{toPersianDigits(targetIdx + 1)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-[10px] text-gray-400 mt-1">
                            <span className="text-[#00ff41]/80 font-black">
                              {toPersianDigits(formatNumber(person.debtAmount))} {currency}
                            </span>
                            {person.phone && (
                              <span dir="ltr" className="text-[9px] opacity-75">
                                {toPersianDigits(person.phone)}
                              </span>
                            )}
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                )}
              </div>
            </div>
          </div>

          {/* Reset / Loop indicator */}
          <div className="flex items-center justify-between text-[10px] text-gray-400 pt-1 border-t border-gray-800/60">
            <span className="flex items-center gap-1 text-[#00ff41]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00ff41] animate-pulse" />
              <span>چرخش بی‌نهایت: فعال</span>
            </span>
            <span>با پایان افراد، لیست خودکار از ابتدا اجرا می‌شود</span>
          </div>
        </div>
      )}
    </div>
  );
};
