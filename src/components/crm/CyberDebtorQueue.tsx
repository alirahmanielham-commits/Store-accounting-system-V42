import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, CheckCircle2, Clock, Target, ArrowLeft, ArrowRight,
  TrendingDown, Phone, Radio, ChevronDown, ChevronUp, Sparkles, Layers,
  ChevronRight, ChevronLeft, ShieldCheck, ListOrdered
} from 'lucide-react';
import { toPersianDigits } from '../../utils/format';
import { playHackerDataBeep } from '../../utils/audio';

export interface DebtorItem {
  id: string | number;
  name: string;
  phone?: string;
  debtAmount: number;
  lastActivityDate?: string | null;
}

interface CommonQueueProps {
  debtors: DebtorItem[];
  currentIndex: number;
  currency: string;
  formatNumber: (num: number) => string;
  isHacker?: boolean;
  onSelectIndex: (index: number) => void;
  roundNumber?: number;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

/**
 * صف سمت راست: صف انتظار (کاهش از راست با هر تعویض کارت)
 */
export const CyberDebtorRightQueue: React.FC<CommonQueueProps> = ({
  debtors,
  currentIndex,
  currency,
  formatNumber,
  isHacker = true,
  onSelectIndex,
  roundNumber = 1,
  isCollapsed = false,
  onToggleCollapse,
}) => {
  if (debtors.length === 0) return null;

  // Upcoming debtors (waiting to be shown): sliced from currentIndex + 1
  const upcomingDebtors = debtors.slice(currentIndex + 1);
  const nextDebtor = upcomingDebtors[0];
  const totalUpcomingDebt = upcomingDebtors.reduce((sum, d) => sum + (d.debtAmount || 0), 0);

  const handleCardClick = (targetIndex: number) => {
    playHackerDataBeep(0.1);
    onSelectIndex(targetIndex);
  };

  if (isCollapsed) {
    return (
      <div 
        onClick={onToggleCollapse}
        className={`cursor-pointer transition-all duration-300 py-4 px-2.5 rounded-2xl flex flex-col items-center justify-between gap-4 font-['IRANYekanXFaNum','Vazirmatn',sans-serif] ${
          isHacker 
            ? 'bg-black/80 border border-amber-500/40 text-amber-400 hover:border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.15)]' 
            : 'bg-white/95 border border-amber-200 text-amber-800 hover:border-amber-300 shadow-md'
        }`}
        title="باز کردن صف انتظار (سمت راست)"
      >
        <div className="flex flex-col items-center gap-2">
          <Clock className="w-5 h-5 text-amber-400 animate-pulse" />
          <span className="text-[11px] font-black [writing-mode:vertical-rl] tracking-wider">
            صف انتظار (راست)
          </span>
        </div>
        <div className="px-2 py-1 rounded-full text-xs font-black bg-amber-500/20 border border-amber-500/40 text-amber-300">
          {toPersianDigits(upcomingDebtors.length)}
        </div>
        <ChevronLeft className="w-4 h-4 text-amber-400" />
      </div>
    );
  }

  return (
    <div 
      className={`transition-all duration-300 flex flex-col h-full font-['IRANYekanXFaNum','Vazirmatn',sans-serif] ${
        isHacker 
          ? 'bg-black/85 border border-amber-500/30 shadow-[0_0_25px_rgba(245,158,11,0.12)] text-gray-200' 
          : 'bg-white/95 border border-slate-200 shadow-xl text-slate-800'
      } rounded-2xl md:rounded-3xl backdrop-blur-xl overflow-hidden`}
    >
      {/* Header bar */}
      <div 
        className={`p-3 md:p-3.5 border-b flex items-center justify-between gap-2 select-none ${
          isHacker ? 'border-amber-500/20 bg-amber-950/20' : 'border-amber-100 bg-amber-50/70'
        }`}
      >
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded-lg ${isHacker ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-amber-100 text-amber-800'}`}>
            <Clock className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <div className="text-xs md:text-sm font-black flex items-center gap-1.5 text-amber-400">
              <span>صف انتظار (سمت راست)</span>
              <ArrowLeft className="w-3.5 h-3.5" />
            </div>
            <div className="text-[10px] text-gray-400">
              کاهش از راست و انتقال به مرکز
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {roundNumber > 1 && (
            <div className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
              isHacker ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'bg-amber-100 text-amber-900'
            }`}>
              دور {toPersianDigits(roundNumber)}
            </div>
          )}

          <div className={`px-2 py-0.5 rounded-lg text-xs font-black ${
            isHacker ? 'bg-black border border-amber-500/40 text-amber-300' : 'bg-white border border-amber-200 text-amber-800'
          }`}>
            {toPersianDigits(upcomingDebtors.length)} نفر
          </div>

          {onToggleCollapse && (
            <button
              onClick={onToggleCollapse}
              className={`p-1 rounded-lg transition-colors ${
                isHacker ? 'text-gray-400 hover:text-white hover:bg-white/10' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
              }`}
              title="بستن پنل راست"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Next in line banner */}
      {nextDebtor && (
        <div className={`mx-3 mt-2.5 p-2 rounded-xl border flex items-center justify-between gap-2 ${
          isHacker ? 'bg-amber-950/30 border-amber-500/40 text-amber-200' : 'bg-amber-50 border-amber-200 text-amber-900'
        }`}>
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping shrink-0" />
            <div className="min-w-0">
              <div className="text-[10px] text-amber-400/90 font-bold">نفر بعدی در نوبت اسکن:</div>
              <div className="text-xs font-black truncate">{nextDebtor.name}</div>
            </div>
          </div>
          <button
            onClick={() => handleCardClick(currentIndex + 1)}
            className={`px-2 py-1 rounded-lg text-[10px] font-bold shrink-0 transition-all ${
              isHacker ? 'bg-amber-400 text-black hover:bg-amber-300 shadow-[0_0_8px_#f59e0b]' : 'bg-amber-600 text-white hover:bg-amber-700'
            }`}
          >
            اسکن فوری
          </button>
        </div>
      )}

      {/* Upcoming Debtor Cards List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 styled-scrollbar min-h-0">
        {upcomingDebtors.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center py-10 px-3">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-3 ${
              isHacker ? 'bg-amber-500/10 border border-amber-500/30 text-amber-400' : 'bg-amber-50 text-amber-600'
            }`}>
              <Sparkles className="w-6 h-6 animate-spin" style={{ animationDuration: '4s' }} />
            </div>
            <div className="text-sm font-black text-amber-400 mb-1">
              پایان صف این دور!
            </div>
            <div className="text-[11px] text-gray-400 leading-relaxed max-w-[200px]">
              تمام افراد نمایش داده شدند؛ چرخه به صورت خودکار از ابتدا بازنشانی می‌شود.
            </div>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {upcomingDebtors.map((person, idx) => {
              const targetIdx = currentIndex + 1 + idx;
              return (
                <motion.div
                  key={`upcoming-${person.id}`}
                  layout
                  initial={{ opacity: 0, x: 25 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -25 }}
                  transition={{ duration: 0.2 }}
                  onClick={() => handleCardClick(targetIdx)}
                  className={`p-2.5 rounded-xl border text-right cursor-pointer transition-all ${
                    isHacker
                      ? 'bg-black/70 border-slate-800 hover:border-amber-400 hover:bg-amber-950/20 shadow-xs'
                      : 'bg-white border-slate-200 hover:border-amber-400 hover:shadow-sm'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs font-bold text-gray-100 truncate">
                    <span className="truncate">{person.name}</span>
                    <span className="text-[10px] text-amber-400 shrink-0 font-mono bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                      #{toPersianDigits(targetIdx + 1)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-gray-400 mt-1.5 pt-1 border-t border-gray-800/40">
                    <span className="text-amber-400 font-black">
                      {toPersianDigits(formatNumber(person.debtAmount))} {currency}
                    </span>
                    {person.phone && (
                      <span dir="ltr" className="text-[10px] opacity-75 font-mono">
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

      {/* Footer info */}
      <div className={`p-2.5 border-t text-[10px] flex items-center justify-between ${
        isHacker ? 'border-amber-500/20 bg-black/70 text-gray-400' : 'border-slate-100 bg-slate-50 text-slate-600'
      }`}>
        <span className="text-amber-400/90 font-bold">مجموع در انتظار:</span>
        <span className="font-black text-amber-300">
          {toPersianDigits(formatNumber(totalUpcomingDebt))} {currency}
        </span>
      </div>
    </div>
  );
};

/**
 * صف سمت چپ: صف اسکن‌شده‌ها و تکمیل‌شده (افزایش در چپ گام‌به‌گام)
 */
export const CyberDebtorLeftQueue: React.FC<CommonQueueProps> = ({
  debtors,
  currentIndex,
  currency,
  formatNumber,
  isHacker = true,
  onSelectIndex,
  roundNumber = 1,
  isCollapsed = false,
  onToggleCollapse,
}) => {
  if (debtors.length === 0) return null;

  // Processed debtors (shown so far): slice 0 to currentIndex
  const processedDebtors = debtors.slice(0, currentIndex);
  const totalProcessedDebt = processedDebtors.reduce((sum, d) => sum + (d.debtAmount || 0), 0);
  const progressPercent = Math.round(((currentIndex + 1) / debtors.length) * 100);

  const handleCardClick = (targetIndex: number) => {
    playHackerDataBeep(0.1);
    onSelectIndex(targetIndex);
  };

  if (isCollapsed) {
    return (
      <div 
        onClick={onToggleCollapse}
        className={`cursor-pointer transition-all duration-300 py-4 px-2.5 rounded-2xl flex flex-col items-center justify-between gap-4 font-['IRANYekanXFaNum','Vazirmatn',sans-serif] ${
          isHacker 
            ? 'bg-black/80 border border-[#00ff41]/40 text-[#00ff41] hover:border-[#00ff41] shadow-[0_0_15px_rgba(0,255,65,0.15)]' 
            : 'bg-white/95 border border-emerald-200 text-emerald-800 hover:border-emerald-300 shadow-md'
        }`}
        title="باز کردن صف اسکن‌شده (سمت چپ)"
      >
        <div className="flex flex-col items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-[#00ff41] animate-pulse" />
          <span className="text-[11px] font-black [writing-mode:vertical-rl] tracking-wider">
            صف تکمیل‌شده (چپ)
          </span>
        </div>
        <div className="px-2 py-1 rounded-full text-xs font-black bg-[#00ff41]/20 border border-[#00ff41]/40 text-[#00ff41]">
          {toPersianDigits(processedDebtors.length)}
        </div>
        <ChevronRight className="w-4 h-4 text-[#00ff41]" />
      </div>
    );
  }

  return (
    <div 
      className={`transition-all duration-300 flex flex-col h-full font-['IRANYekanXFaNum','Vazirmatn',sans-serif] ${
        isHacker 
          ? 'bg-black/85 border border-[#00ff41]/30 shadow-[0_0_25px_rgba(0,255,65,0.12)] text-gray-200' 
          : 'bg-white/95 border border-slate-200 shadow-xl text-slate-800'
      } rounded-2xl md:rounded-3xl backdrop-blur-xl overflow-hidden`}
    >
      {/* Header bar */}
      <div 
        className={`p-3 md:p-3.5 border-b flex items-center justify-between gap-2 select-none ${
          isHacker ? 'border-[#00ff41]/20 bg-[#00ff41]/10' : 'border-emerald-100 bg-emerald-50/70'
        }`}
      >
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded-lg ${isHacker ? 'bg-[#00ff41]/20 text-[#00ff41] border border-[#00ff41]/30' : 'bg-emerald-100 text-emerald-800'}`}>
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs md:text-sm font-black flex items-center gap-1.5 text-[#00ff41]">
              <ArrowRight className="w-3.5 h-3.5" />
              <span>صف اسکن‌شده (سمت چپ)</span>
            </div>
            <div className="text-[10px] text-gray-400">
              افزایش در چپ پس از هر اسکن
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <div className={`px-2 py-0.5 rounded-lg text-xs font-black ${
            isHacker ? 'bg-black border border-[#00ff41]/40 text-[#00ff41]' : 'bg-white border border-emerald-200 text-emerald-800'
          }`}>
            {toPersianDigits(processedDebtors.length)} نفر
          </div>

          {onToggleCollapse && (
            <button
              onClick={onToggleCollapse}
              className={`p-1 rounded-lg transition-colors ${
                isHacker ? 'text-gray-400 hover:text-white hover:bg-white/10' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
              }`}
              title="بستن پنل چپ"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Progress meter */}
      <div className={`mx-3 mt-2.5 p-2 rounded-xl border flex flex-col gap-1.5 ${
        isHacker ? 'bg-black/60 border-slate-800' : 'bg-slate-50 border-slate-200'
      }`}>
        <div className="flex items-center justify-between text-[10px] font-bold">
          <span className="text-gray-400">پیشرفت دور جاری:</span>
          <span className="text-[#00ff41] font-mono">{toPersianDigits(progressPercent)}%</span>
        </div>
        <div className={`h-1.5 w-full rounded-full overflow-hidden ${isHacker ? 'bg-gray-800' : 'bg-slate-200'}`}>
          <motion.div 
            className="h-full bg-gradient-to-r from-emerald-500 to-[#00ff41]"
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      {/* Processed Debtor Cards List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 styled-scrollbar min-h-0">
        {processedDebtors.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center py-10 px-3">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-3 ${
              isHacker ? 'bg-[#00ff41]/10 border border-[#00ff41]/30 text-[#00ff41]' : 'bg-emerald-50 text-emerald-600'
            }`}>
              <ShieldCheck className="w-6 h-6 animate-pulse" />
            </div>
            <div className="text-sm font-black text-gray-300 mb-1">
              هنوز کارتی اسکن نشده است
            </div>
            <div className="text-[11px] text-gray-400 leading-relaxed max-w-[200px]">
              به محض عبور کارت فعال مرکز، شخص به این صف سمت چپ منتقل می‌شود.
            </div>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {processedDebtors.slice().reverse().map((person, revIdx) => {
              const targetIdx = processedDebtors.length - 1 - revIdx;
              return (
                <motion.div
                  key={`processed-${person.id}`}
                  layout
                  initial={{ opacity: 0, x: -25 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 25 }}
                  transition={{ duration: 0.2 }}
                  onClick={() => handleCardClick(targetIdx)}
                  className={`p-2.5 rounded-xl border text-right cursor-pointer transition-all ${
                    isHacker
                      ? 'bg-black/70 border-slate-800 hover:border-[#00ff41] hover:bg-[#00ff41]/10 shadow-xs'
                      : 'bg-white border-slate-200 hover:border-emerald-400 hover:shadow-sm'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs font-bold text-gray-100 truncate">
                    <span className="truncate flex items-center gap-1.5">
                      <span className="text-[#00ff41] text-[11px]">✓</span>
                      <span>{person.name}</span>
                    </span>
                    <span className="text-[10px] text-gray-400 shrink-0 font-mono bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                      #{toPersianDigits(targetIdx + 1)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-gray-400 mt-1.5 pt-1 border-t border-gray-800/40">
                    <span className="text-[#00ff41] font-black">
                      {toPersianDigits(formatNumber(person.debtAmount))} {currency}
                    </span>
                    {person.phone && (
                      <span dir="ltr" className="text-[10px] opacity-75 font-mono">
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

      {/* Footer info */}
      <div className={`p-2.5 border-t text-[10px] flex items-center justify-between ${
        isHacker ? 'border-[#00ff41]/20 bg-black/70 text-gray-400' : 'border-slate-100 bg-slate-50 text-slate-600'
      }`}>
        <span className="text-[#00ff41]/90 font-bold">مجموع اسکن‌شده:</span>
        <span className="font-black text-[#00ff41]">
          {toPersianDigits(formatNumber(totalProcessedDebt))} {currency}
        </span>
      </div>
    </div>
  );
};

/**
 * Combined CyberDebtorQueue for backward-compatibility or full display
 */
export const CyberDebtorQueue: React.FC<CommonQueueProps> = (props) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-full">
      <CyberDebtorRightQueue {...props} />
      <CyberDebtorLeftQueue {...props} />
    </div>
  );
};
