import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Terminal, ShieldAlert, Cpu, Crosshair, AlertTriangle, 
  Activity, Phone, CalendarClock, DollarSign, Database, 
  Fingerprint, Radio, Zap
} from 'lucide-react';
import { Person } from '../../types';
import { globalDateFormatter } from '../../utils/dateFormatter';

interface HackerDebtorCardProps {
  person: Person & { debtAmount: number; lastActivityDate?: string | null };
  currency?: string;
  formatNumber: (num: number) => string;
  cardSize?: 'sm' | 'md' | 'lg' | 'xl';
  animationProps?: any;
}

export const HackerDebtorCard: React.FC<HackerDebtorCardProps> = ({
  person,
  currency = 'تومان',
  formatNumber,
  cardSize = 'lg',
  animationProps = {}
}) => {
  // Random cyber matrix glitch effect on digits
  const [glitchCode, setGlitchCode] = useState('0x7F4A');
  const [pulseBinary, setPulseBinary] = useState('10110010');

  useEffect(() => {
    const interval = setInterval(() => {
      const hex = Math.floor(Math.random() * 0xFFFF).toString(16).toUpperCase().padStart(4, '0');
      setGlitchCode(`0x${hex}`);
      
      const bin = Array.from({ length: 8 }, () => Math.round(Math.random())).join('');
      setPulseBinary(bin);
    }, 2800);

    return () => clearInterval(interval);
  }, []);

  const getContainerSize = () => {
    switch (cardSize) {
      case 'sm': return 'max-w-sm p-4';
      case 'md': return 'max-w-md p-6';
      case 'xl': return 'max-w-4xl p-10 md:p-14';
      case 'lg':
      default: return 'max-w-2xl p-6 md:p-9';
    }
  };

  const getHeadingSize = () => {
    switch (cardSize) {
      case 'sm': return 'text-xl';
      case 'md': return 'text-2xl';
      case 'xl': return 'text-4xl md:text-5xl';
      case 'lg':
      default: return 'text-2xl md:text-3xl';
    }
  };

  const getAmountSize = () => {
    switch (cardSize) {
      case 'sm': return 'text-2xl';
      case 'md': return 'text-3xl';
      case 'xl': return 'text-5xl md:text-6xl';
      case 'lg':
      default: return 'text-3xl md:text-4xl';
    }
  };

  return (
    <motion.div
      {...animationProps}
      className={`mx-auto w-full relative overflow-hidden rounded-3xl bg-[#050906] text-[#00ff41] border-2 border-[#00ff41]/50 shadow-[0_0_50px_rgba(0,255,65,0.25)] flex flex-col font-mono hacker-grid-pattern transition-all duration-300 group hover:border-[#00ff41] hover:shadow-[0_0_70px_rgba(0,255,65,0.4)] ${getContainerSize()}`}
      dir="rtl"
    >
      {/* Laser Scanning Line */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#00ff41]/10 to-transparent h-24 w-full animate-scanline pointer-events-none" />

      {/* Cyber Reticles / Corner Accents */}
      <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-[#00ff41] pointer-events-none" />
      <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-[#00ff41] pointer-events-none" />
      <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-[#00ff41] pointer-events-none" />
      <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-[#00ff41] pointer-events-none" />

      {/* Background Decorative Circuits */}
      <div className="absolute -right-20 -top-20 w-48 h-48 rounded-full bg-[#00ff41]/5 blur-3xl pointer-events-none" />
      <div className="absolute -left-20 -bottom-20 w-48 h-48 rounded-full bg-red-600/10 blur-3xl pointer-events-none" />

      {/* Terminal Top Navigation Bar */}
      <div className="relative z-10 flex items-center justify-between pb-3 mb-4 border-b border-[#00ff41]/25 text-xs text-[#00ff41]/80">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-[#00ff41] animate-pulse" />
          <span className="font-bold tracking-widest text-[#00ff41]">SYS://DEBTOR_INTERCEPT</span>
          <span className="hidden sm:inline-block px-1.5 py-0.5 rounded text-[10px] bg-[#00ff41]/15 text-[#00ff41] border border-[#00ff41]/30">
            ACTIVE_TRACKING
          </span>
        </div>

        <div className="flex items-center gap-3 font-mono text-[11px]">
          <span className="text-gray-400 hidden sm:inline-block">HASH: {glitchCode}</span>
          <div className="flex items-center gap-1 text-red-400 font-bold bg-red-950/80 px-2 py-0.5 rounded border border-red-800">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-ping inline-block" />
            <span>بدهکار قطعی</span>
          </div>
        </div>
      </div>

      {/* Main Body */}
      <div className="relative z-10 flex flex-col items-center text-center">
        {/* Avatar / Target HUD */}
        <div className="relative my-2">
          <div className="w-24 h-24 md:w-28 md:h-28 rounded-2xl bg-black/80 border-2 border-[#00ff41] flex items-center justify-center p-2 shadow-[0_0_25px_rgba(0,255,65,0.35)] relative overflow-hidden group-hover:shadow-[0_0_35px_rgba(0,255,65,0.5)] transition-all">
            {/* HUD Target Crosshairs */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-40">
              <div className="w-full h-[1px] bg-[#00ff41]" />
              <div className="h-full w-[1px] bg-[#00ff41] absolute" />
            </div>

            <Fingerprint className="w-14 h-14 md:w-16 md:h-16 text-[#00ff41] relative z-10 stroke-[1.5]" />

            {/* Sub text badge */}
            <div className="absolute bottom-1 text-[9px] font-mono tracking-tighter text-[#00ff41]/70 bg-black/90 px-1 rounded border border-[#00ff41]/30">
              TARGET_LOCKED
            </div>
          </div>

          <div className="absolute -top-1 -right-1 bg-red-600 border border-black text-white p-1 rounded-full shadow-lg">
            <ShieldAlert className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* Debtor Name */}
        <div className="mt-3 w-full px-2">
          <div className="text-[11px] font-mono text-[#00ff41]/60 tracking-wider mb-1">
            &gt; IDENTIFIED_PERSON:
          </div>
          <h3 className={`font-black text-white tracking-tight truncate w-full filter drop-shadow-[0_2px_10px_rgba(0,255,65,0.4)] ${getHeadingSize()}`}>
            {person.name}
          </h3>

          {/* Phone & ID Pills */}
          <div className="flex flex-wrap items-center justify-center gap-2 mt-2">
            {person.phone && (
              <div className="flex items-center gap-1.5 text-xs text-[#00ff41] bg-black/70 px-3 py-1.5 rounded-lg border border-[#00ff41]/30 shadow-inner">
                <Phone className="w-3.5 h-3.5 text-[#00ff41]" />
                <span dir="ltr" className="tracking-widest font-mono">{person.phone}</span>
              </div>
            )}
            <div className="flex items-center gap-1.5 text-xs text-gray-400 bg-black/70 px-3 py-1.5 rounded-lg border border-gray-800">
              <Database className="w-3.5 h-3.5 text-emerald-500" />
              <span>کد سیستم: #{String(person.id).padStart(4, '0')}</span>
            </div>
          </div>
        </div>

        {/* Debt Amount Display HUD (Hacker Red Box) */}
        <div className="mt-6 w-full relative overflow-hidden rounded-2xl bg-black/80 border border-red-500/50 p-5 md:p-6 shadow-[0_0_35px_rgba(239,68,68,0.25)] group-hover:border-red-500 transition-all">
          <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-r from-red-600 via-rose-500 to-red-600" />
          
          <div className="flex items-center justify-between text-xs font-mono text-red-400/90 mb-2 border-b border-red-950 pb-2">
            <span className="flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-red-500 animate-bounce" />
              مبلغ کل بدهی معوقه (OVERDUE BALANCE)
            </span>
            <span className="text-[10px] text-gray-500 font-mono hidden sm:inline">BIT:{pulseBinary}</span>
          </div>

          <div className="flex flex-col items-center justify-center my-1" dir="ltr">
            <span className={`font-black text-[#ff3333] font-mono tracking-tight hacker-glow-red ${getAmountSize()}`}>
              {formatNumber(person.debtAmount)}
            </span>
            <div className="text-sm md:text-base font-bold text-red-400 mt-1 font-sans">
              {currency}
            </div>
          </div>

          <div className="mt-2 text-[10px] text-gray-400 font-mono flex items-center justify-between pt-2 border-t border-red-950/60">
            <span className="text-emerald-500 flex items-center gap-1">
              <Zap className="w-3 h-3" /> اولویت پیگیری مالی: بالا
            </span>
            <span className="text-gray-500">REALTIME_ACC</span>
          </div>
        </div>

        {/* Last Activity HUD Pill */}
        {person.lastActivityDate && (
          <div className="mt-4 flex items-center justify-center gap-2 text-xs text-[#00ff41]/90 bg-black/70 px-4 py-2 rounded-xl border border-[#00ff41]/25 shadow-sm">
            <CalendarClock className="w-4 h-4 text-[#00ff41]" />
            <span className="text-gray-400">آخرین تراکنش ثبت‌شده:</span>
            <span className="text-white font-bold font-sans">
              {globalDateFormatter.formatDateOnly(person.lastActivityDate)}
            </span>
          </div>
        )}

        {/* Footer Status Stream */}
        <div className="w-full mt-4 pt-3 border-t border-[#00ff41]/15 flex items-center justify-between text-[10px] text-gray-500 font-mono">
          <span className="flex items-center gap-1 text-[#00ff41]/60">
            <Radio className="w-3 h-3 text-[#00ff41] animate-pulse" /> SCANNER_ONLINE
          </span>
          <span className="tracking-widest">
            NODE_SYNC // OK
          </span>
        </div>
      </div>
    </motion.div>
  );
};
