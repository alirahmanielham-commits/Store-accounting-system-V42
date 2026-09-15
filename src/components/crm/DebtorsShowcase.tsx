import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Settings, Users, MonitorPlay, Maximize2, X, Phone, 
  UserCircle, CalendarClock, TrendingDown, Terminal, 
  Sparkles, RefreshCw, Radio, Play, Pause, ChevronLeft, ChevronRight
} from 'lucide-react';
import { Person } from '../../types';
import { globalDateFormatter } from '../../utils/dateFormatter';
import { HackerDebtorCard } from './HackerDebtorCard';

interface DebtorsShowcaseProps {
  persons: Person[];
  accountingDocuments: any[];
  storeSettings: any;
  formatNumber: (num: number) => string;
  isScreensaverMode?: boolean;
  onCloseScreensaver?: () => void;
}

const DebtorsShowcase: React.FC<DebtorsShowcaseProps> = ({ 
  persons, 
  accountingDocuments, 
  storeSettings, 
  formatNumber, 
  isScreensaverMode, 
  onCloseScreensaver 
}) => {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  
  // Settings state
  const [theme, setTheme] = useState<'hacker' | 'standard'>('hacker');
  const [duration, setDuration] = useState<number>(5); // seconds
  const [displayType, setDisplayType] = useState<'fade' | 'slide' | 'zoom'>('fade');
  const [cardSize, setCardSize] = useState<'sm' | 'md' | 'lg' | 'xl'>('lg');
  const [simultaneousCount, setSimultaneousCount] = useState<number>(1);
  const [idleTimeout, setIdleTimeout] = useState<number>(60); // seconds, 0 = disabled
  const [currentIndex, setCurrentIndex] = useState(0);

  // Load settings
  useEffect(() => {
    try {
      const saved = localStorage.getItem('debtors_showcase_settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.theme) setTheme(parsed.theme);
        if (parsed.duration) setDuration(parsed.duration);
        if (parsed.displayType) setDisplayType(parsed.displayType);
        if (parsed.cardSize) setCardSize(parsed.cardSize);
        if (parsed.simultaneousCount) setSimultaneousCount(parsed.simultaneousCount);
        if (parsed.idleTimeout !== undefined) setIdleTimeout(parsed.idleTimeout);
      }
    } catch (e) {}
  }, []);

  const saveSettings = () => {
    const settings = { theme, duration, displayType, cardSize, simultaneousCount, idleTimeout };
    localStorage.setItem('debtors_showcase_settings', JSON.stringify(settings));
    window.dispatchEvent(new CustomEvent('debtors_settings_updated', { detail: settings }));
    setIsSettingsOpen(false);
  };

  // Calculate balances
  const debtors = useMemo(() => {
    return persons.map(person => {
      let balance = 0;
      let lastActivityDate: string | null = null;
      (accountingDocuments || []).forEach(doc => {
        if (doc.status === 'draft' || doc.isDeleted) return;
        if (doc.items && Array.isArray(doc.items)) {
          let hasActivity = false;
          doc.items.forEach((item: any) => {
            if (item.detailedAccountId?.toString() === person.id.toString()) {
              balance += (Number(item.debit) || 0) - (Number(item.credit) || 0);
              hasActivity = true;
            }
          });
          if (hasActivity && doc.date) {
             if (!lastActivityDate || new Date(doc.date) > new Date(lastActivityDate)) {
                 lastActivityDate = doc.date;
             }
          }
        }
      });
      return { ...person, debtAmount: balance, lastActivityDate };
    }).filter(p => p.debtAmount > 0)
      .sort(() => Math.random() - 0.5); // Randomize order
  }, [persons, accountingDocuments]);

  // Main slideshow loop
  useEffect(() => {
    if (debtors.length === 0 || isPaused) return;

    const timer = setInterval(() => {
      setCurrentIndex((prevIndex) => {
        const nextIndex = prevIndex + simultaneousCount;
        return nextIndex >= debtors.length ? 0 : nextIndex;
      });
    }, duration * 1000);

    return () => clearInterval(timer);
  }, [debtors, duration, simultaneousCount, isPaused]);

  const handleNext = () => {
    setCurrentIndex((prev) => {
      const next = prev + simultaneousCount;
      return next >= debtors.length ? 0 : next;
    });
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => {
      const next = prev - simultaneousCount;
      return next < 0 ? Math.max(0, debtors.length - simultaneousCount) : next;
    });
  };

  const handleShuffle = () => {
    if (debtors.length > 1) {
      setCurrentIndex(Math.floor(Math.random() * debtors.length));
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
        setIsFullscreen(false);
      }
    }
  };

  const getAnimationProps = () => {
    switch (displayType) {
      case 'slide':
        return {
          initial: { opacity: 0, y: 50 },
          animate: { opacity: 1, y: 0 },
          exit: { opacity: 0, y: -50 },
          transition: { duration: 0.4 }
        };
      case 'zoom':
        return {
          initial: { opacity: 0, scale: 0.8 },
          animate: { opacity: 1, scale: 1 },
          exit: { opacity: 0, scale: 1.08 },
          transition: { duration: 0.4 }
        };
      case 'fade':
      default:
        return {
          initial: { opacity: 0 },
          animate: { opacity: 1 },
          exit: { opacity: 0 },
          transition: { duration: 0.4 }
        };
    }
  };

  const getCardSizeClasses = () => {
    switch (cardSize) {
      case 'sm': return 'p-4 max-w-sm';
      case 'md': return 'p-6 max-w-md';
      case 'xl': return 'p-12 max-w-4xl text-2xl';
      case 'lg':
      default: return 'p-8 max-w-2xl text-lg';
    }
  };

  const getGridClasses = () => {
    switch (simultaneousCount) {
      case 1: return 'grid-cols-1';
      case 2: return 'grid-cols-1 md:grid-cols-2';
      case 3: return 'grid-cols-1 md:grid-cols-3';
      case 4: return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4';
      default: return 'grid-cols-1 flex-wrap justify-center';
    }
  };

  const currentDebtors = debtors.slice(currentIndex, currentIndex + simultaneousCount);

  if (debtors.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] text-center" dir="rtl">
        <MonitorPlay className="w-24 h-24 text-gray-300 mb-4" />
        <h2 className="text-2xl font-black text-slate-800">هیچ شخص بدهکاری یافت نشد</h2>
        <p className="text-gray-500 mt-2">لیست بدهکاران در حال حاضر خالی است.</p>
      </div>
    );
  }

  const isHacker = theme === 'hacker';

  return (
    <div 
      className={`relative flex flex-col font-sans transition-colors duration-500 select-none ${
        isFullscreen || isScreensaverMode 
          ? `fixed inset-0 z-50 h-screen w-screen p-6 md:p-8 ${isHacker ? 'bg-[#020502]' : 'bg-slate-900'}` 
          : `min-h-[85vh] p-4 md:p-6 rounded-3xl ${isHacker ? 'bg-[#030704] text-[#00ff41]' : 'bg-slate-50 text-slate-800'}`
      }`} 
      dir="rtl"
    >
      {/* Top Header & Interactive Navigation Bar */}
      <div className={`flex flex-wrap gap-4 justify-between items-center mb-6 pb-4 border-b ${
        isHacker 
          ? 'border-[#00ff41]/20 text-[#00ff41]' 
          : isFullscreen || isScreensaverMode 
            ? 'border-white/10 text-white' 
            : 'border-slate-200 text-slate-800'
      }`}>
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-2xl ${
            isHacker 
              ? 'bg-black/80 border border-[#00ff41]/40 shadow-[0_0_15px_rgba(0,255,65,0.3)]' 
              : 'bg-white shadow-sm border border-slate-200'
          }`}>
            {isHacker ? <Terminal className="w-7 h-7 text-[#00ff41] animate-pulse" /> : <MonitorPlay className="w-7 h-7 text-indigo-600" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black tracking-tight">
                {isHacker ? 'کنسول ره‌گیری بدهکاران' : 'نمایشگر بدهکاران'}
              </h1>
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full font-mono ${
                isHacker 
                  ? 'bg-[#00ff41]/20 text-[#00ff41] border border-[#00ff41]/40' 
                  : 'bg-rose-100 text-rose-700'
              }`}>
                {isHacker ? 'CYBER_HACKER_MODE' : 'ویترین خودکار'}
              </span>
            </div>
            <p className="text-xs opacity-75 mt-0.5">
              نمایش تصادفی اشخاص بدهکار • کل بدهکاران: {debtors.length} نفر (قلم {currentIndex + 1} از {debtors.length})
            </p>
          </div>
        </div>

        {/* Quick Actions & Controls */}
        <div className="flex items-center gap-2">
          {/* Theme Switcher Button */}
          <button
            onClick={() => setTheme(isHacker ? 'standard' : 'hacker')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm ${
              isHacker
                ? 'bg-[#00ff41]/15 text-[#00ff41] border border-[#00ff41]/50 hover:bg-[#00ff41]/25 shadow-[0_0_10px_rgba(0,255,65,0.2)]'
                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
            }`}
            title="تغییر تم (هکری / استاندارد)"
          >
            {isHacker ? <Sparkles className="w-4 h-4 text-[#00ff41]" /> : <Terminal className="w-4 h-4 text-emerald-600" />}
            <span>{isHacker ? 'تم هکری فعال است' : 'تغییر به تم هکری'}</span>
          </button>

          {/* Pause / Resume Slideshow */}
          <button
            onClick={() => setIsPaused(!isPaused)}
            className={`p-2.5 rounded-xl transition-all shadow-sm ${
              isHacker
                ? 'bg-black/60 border border-[#00ff41]/40 text-[#00ff41] hover:bg-[#00ff41]/20'
                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
            }`}
            title={isPaused ? 'ادامه اسلایدشو' : 'توقف موقت اسلایدشو'}
          >
            {isPaused ? <Play className="w-4 h-4 text-emerald-400" /> : <Pause className="w-4 h-4" />}
          </button>

          {/* Shuffle / Random Next */}
          <button
            onClick={handleShuffle}
            className={`p-2.5 rounded-xl transition-all shadow-sm ${
              isHacker
                ? 'bg-black/60 border border-[#00ff41]/40 text-[#00ff41] hover:bg-[#00ff41]/20'
                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
            }`}
            title="شخص تصادفی بعدی"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          {/* Prev / Next controls */}
          <div className="flex items-center gap-1">
            <button
              onClick={handlePrev}
              className={`p-2.5 rounded-xl transition-all shadow-sm ${
                isHacker
                  ? 'bg-black/60 border border-[#00ff41]/40 text-[#00ff41] hover:bg-[#00ff41]/20'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
              title="کارت قبلی"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              onClick={handleNext}
              className={`p-2.5 rounded-xl transition-all shadow-sm ${
                isHacker
                  ? 'bg-black/60 border border-[#00ff41]/40 text-[#00ff41] hover:bg-[#00ff41]/20'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
              title="کارت بعدی"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>

          {!isScreensaverMode && (
            <button
              onClick={() => setIsSettingsOpen(true)}
              className={`p-2.5 rounded-xl transition-all shadow-sm ${
                isHacker
                  ? 'bg-black/60 border border-[#00ff41]/40 text-[#00ff41] hover:bg-[#00ff41]/20'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
              title="تنظیمات نمایشگر"
            >
              <Settings className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={isScreensaverMode ? onCloseScreensaver : toggleFullscreen}
            className={`p-2.5 rounded-xl transition-all shadow-sm ${
              isHacker
                ? 'bg-black/60 border border-[#00ff41]/40 text-[#00ff41] hover:bg-[#00ff41]/20'
                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
            }`}
            title={isFullscreen || isScreensaverMode ? "خروج از تمام صفحه" : "تمام صفحه"}
          >
            {isFullscreen || isScreensaverMode ? <X className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Main Display Area */}
      <div className="flex-1 flex items-center justify-center overflow-hidden py-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            className={`grid gap-6 w-full ${getGridClasses()}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {currentDebtors.map((person, idx) => (
              isHacker ? (
                /* Hacker Terminal Cyberpunk Card */
                <HackerDebtorCard
                  key={`${person.id}-${idx}`}
                  person={person as any}
                  currency={storeSettings?.currency || 'تومان'}
                  formatNumber={formatNumber}
                  cardSize={cardSize}
                  animationProps={getAnimationProps()}
                />
              ) : (
                /* Classic Light Card */
                <motion.div
                  key={`${person.id}-${idx}`}
                  {...getAnimationProps()}
                  className={`mx-auto w-full bg-gradient-to-br from-white to-rose-50/50 backdrop-blur-lg rounded-[2rem] shadow-[0_20px_60px_-15px_rgba(225,29,72,0.2)] border border-rose-100 flex flex-col relative overflow-hidden ${getCardSizeClasses()}`}
                >
                  <div className="absolute top-0 right-0 w-full h-3 bg-gradient-to-r from-rose-400 via-red-500 to-rose-600"></div>
                  <div className="absolute -top-24 -right-24 w-48 h-48 bg-rose-200 rounded-full blur-3xl opacity-40"></div>
                  <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-red-200 rounded-full blur-3xl opacity-40"></div>
                  
                  <div className="relative z-10 flex flex-col items-center text-center">
                    <div className="w-28 h-28 bg-gradient-to-br from-rose-100 to-white rounded-full flex items-center justify-center mb-6 shadow-[0_8px_16px_rgba(225,29,72,0.1)] border border-white">
                       <UserCircle className="w-14 h-14 text-rose-500" strokeWidth={1.5} />
                    </div>
                    
                    <h3 className="font-black text-slate-800 mb-3 truncate w-full tracking-tight" style={{ fontSize: cardSize === 'xl' ? '3rem' : cardSize === 'lg' ? '2.2rem' : '1.5rem' }}>
                      {person.name}
                    </h3>
                    
                    {person.phone && (
                      <div className="flex items-center gap-2 text-slate-600 mt-2 font-bold bg-white/80 backdrop-blur-md px-5 py-2.5 rounded-2xl shadow-sm border border-slate-100">
                        <Phone className="w-4 h-4 text-slate-400" />
                        <span dir="ltr" className="tracking-wider">{person.phone}</span>
                      </div>
                    )}
                    
                    <div className="mt-8 w-full bg-white/60 backdrop-blur-md rounded-3xl p-6 border border-white shadow-sm flex flex-col items-center justify-center">
                      <div className="text-sm font-bold text-slate-500 mb-2 flex items-center justify-center gap-2">
                        <TrendingDown className="w-5 h-5 text-rose-500" />
                        مانده بدهی
                      </div>
                      <div className="font-black text-rose-600 tracking-tight truncate drop-shadow-sm" style={{ fontSize: cardSize === 'xl' ? '3.5rem' : cardSize === 'lg' ? '2.8rem' : '2rem' }}>
                        {formatNumber(person.debtAmount)}
                      </div>
                      <div className="text-lg font-bold text-rose-400 mt-2">{storeSettings?.currency || 'تومان'}</div>
                    </div>

                    {(person as any).lastActivityDate && (
                      <div className="mt-6 flex items-center justify-center gap-2 text-sm font-bold text-slate-500 bg-white/50 px-4 py-2.5 rounded-xl border border-slate-100/50">
                        <CalendarClock className="w-5 h-5 text-slate-400" />
                        <span>آخرین فعالیت مالی:</span>
                        <span className="text-slate-800 font-black">{globalDateFormatter.formatDateOnly((person as any).lastActivityDate)}</span>
                      </div>
                    )}
                  </div>
                </motion.div>
              )
            ))}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Settings Modal */}
      <AnimatePresence>
        {isSettingsOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex justify-center items-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-slate-700 text-white rounded-3xl shadow-2xl p-6 md:p-8 w-full max-w-lg text-right"
              dir="rtl"
            >
              <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-800">
                <h3 className="text-xl font-black text-white flex items-center gap-2">
                  <Settings className="w-6 h-6 text-[#00ff41]" />
                  تنظیمات نمایشگر بدهکاران
                </h3>
                <button onClick={() => setIsSettingsOpen(false)} className="p-2 hover:bg-slate-800 rounded-full transition-colors">
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              <div className="space-y-6 max-h-[60vh] overflow-y-auto pl-2 styled-scrollbar">
                {/* Theme Selector */}
                <div>
                  <label className="block text-sm font-bold text-gray-200 mb-2">طراحی و استایل کارت</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setTheme('hacker')}
                      className={`p-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all border ${
                        theme === 'hacker'
                          ? 'bg-[#00ff41]/20 text-[#00ff41] border-[#00ff41] shadow-[0_0_15px_rgba(0,255,65,0.3)]'
                          : 'bg-slate-800/60 text-gray-400 border-slate-700 hover:bg-slate-800'
                      }`}
                    >
                      <Terminal className="w-4 h-4" />
                      🟢 تم هکری سایبرپانک
                    </button>
                    <button
                      type="button"
                      onClick={() => setTheme('standard')}
                      className={`p-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all border ${
                        theme === 'standard'
                          ? 'bg-indigo-600 text-white border-indigo-500 shadow-md'
                          : 'bg-slate-800/60 text-gray-400 border-slate-700 hover:bg-slate-800'
                      }`}
                    >
                      <UserCircle className="w-4 h-4" />
                      کلاسیک سفید
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-300 mb-2">زمان فعال‌سازی خودکار اسکرین‌سیور (ثانیه)</label>
                  <input
                    type="range"
                    min="0"
                    max="300"
                    step="10"
                    value={idleTimeout}
                    onChange={(e) => setIdleTimeout(Number(e.target.value))}
                    className="w-full accent-[#00ff41]"
                  />
                  <div className="text-center font-bold text-[#00ff41] mt-2">
                    {idleTimeout === 0 ? 'غیرفعال' : `${idleTimeout} ثانیه`}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-300 mb-2">مدت زمان نمایش هر کارت (ثانیه)</label>
                  <input
                    type="range"
                    min="2"
                    max="30"
                    value={duration}
                    onChange={(e) => setDuration(Number(e.target.value))}
                    className="w-full accent-[#00ff41]"
                  />
                  <div className="text-center font-bold text-[#00ff41] mt-2">{duration} ثانیه</div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-300 mb-2">نوع انیمیشن ورود/خروج</label>
                  <div className="grid grid-cols-3 gap-2">
                    {['fade', 'slide', 'zoom'].map(type => (
                      <button
                        key={type}
                        onClick={() => setDisplayType(type as any)}
                        className={`py-3 rounded-xl font-bold text-sm transition-all border ${
                          displayType === type 
                            ? 'bg-[#00ff41]/20 text-[#00ff41] border-[#00ff41]' 
                            : 'bg-slate-800 text-gray-400 border-slate-700 hover:bg-slate-750'
                        }`}
                      >
                        {type === 'fade' ? 'محو شدن' : type === 'slide' ? 'اسلاید' : 'بزرگ‌نمایی'}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-300 mb-2">اندازه کارت مشتری</label>
                  <div className="grid grid-cols-4 gap-2">
                    {['sm', 'md', 'lg', 'xl'].map(size => (
                      <button
                        key={size}
                        onClick={() => setCardSize(size as any)}
                        className={`py-3 rounded-xl font-bold text-sm transition-all border ${
                          cardSize === size 
                            ? 'bg-[#00ff41]/20 text-[#00ff41] border-[#00ff41]' 
                            : 'bg-slate-800 text-gray-400 border-slate-700 hover:bg-slate-750'
                        }`}
                      >
                        {size === 'sm' ? 'کوچک' : size === 'md' ? 'متوسط' : size === 'lg' ? 'بزرگ' : 'خیلی بزرگ'}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-300 mb-2">تعداد نمایش همزمان</label>
                  <div className="flex items-center gap-4">
                    <input
                      type="range"
                      min="1"
                      max="6"
                      value={simultaneousCount}
                      onChange={(e) => setSimultaneousCount(Number(e.target.value))}
                      className="flex-1 accent-[#00ff41]"
                    />
                    <div className="w-12 text-center font-bold text-[#00ff41] bg-black/50 border border-[#00ff41]/30 py-1 rounded-lg">
                      {simultaneousCount}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-4 border-t border-slate-800">
                <button
                  onClick={saveSettings}
                  className="w-full py-4 bg-[#00ff41] text-black font-black rounded-xl hover:bg-[#00ff41]/90 shadow-[0_0_20px_rgba(0,255,65,0.4)] transition-all"
                >
                  ذخیره و اعمال تنظیمات
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DebtorsShowcase;
