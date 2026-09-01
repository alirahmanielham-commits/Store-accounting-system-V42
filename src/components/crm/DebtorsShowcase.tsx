import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Settings, Users, MonitorPlay, Maximize2, X, Phone, UserCircle, HandCoins, CalendarClock, TrendingDown } from 'lucide-react';
import { Person } from '../../types';
import { globalDateFormatter } from '../../utils/dateFormatter';

interface DebtorsShowcaseProps {
  persons: Person[];
  accountingDocuments: any[];
  storeSettings: any;
  formatNumber: (num: number) => string;
  isScreensaverMode?: boolean;
  onCloseScreensaver?: () => void;
}

const DebtorsShowcase: React.FC<DebtorsShowcaseProps> = ({ persons, accountingDocuments, storeSettings, formatNumber, isScreensaverMode, onCloseScreensaver }) => {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // Settings state
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
        if (parsed.duration) setDuration(parsed.duration);
        if (parsed.displayType) setDisplayType(parsed.displayType);
        if (parsed.cardSize) setCardSize(parsed.cardSize);
        if (parsed.simultaneousCount) setSimultaneousCount(parsed.simultaneousCount);
        if (parsed.idleTimeout !== undefined) setIdleTimeout(parsed.idleTimeout);
      }
    } catch (e) {}
  }, []);

  const saveSettings = () => {
    const settings = { duration, displayType, cardSize, simultaneousCount, idleTimeout };
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

  // Main loop
  useEffect(() => {
    if (debtors.length === 0) return;

    const timer = setInterval(() => {
      setCurrentIndex((prevIndex) => {
        const nextIndex = prevIndex + simultaneousCount;
        return nextIndex >= debtors.length ? 0 : nextIndex;
      });
    }, duration * 1000);

    return () => clearInterval(timer);
  }, [debtors, duration, simultaneousCount]);

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
          transition: { duration: 0.5 }
        };
      case 'zoom':
        return {
          initial: { opacity: 0, scale: 0.8 },
          animate: { opacity: 1, scale: 1 },
          exit: { opacity: 0, scale: 1.1 },
          transition: { duration: 0.5 }
        };
      case 'fade':
      default:
        return {
          initial: { opacity: 0 },
          animate: { opacity: 1 },
          exit: { opacity: 0 },
          transition: { duration: 0.5 }
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
        <MonitorPlay className="w-24 h-24 text-gray-200 mb-4" />
        <h2 className="text-2xl font-black text-slate-800">هیچ شخص بدهکاری یافت نشد</h2>
        <p className="text-gray-500 mt-2">لیست بدهکاران در حال حاضر خالی است.</p>
      </div>
    );
  }

  return (
    <div className={`relative flex flex-col font-sans ${isFullscreen || isScreensaverMode ? 'fixed inset-0 z-50 bg-slate-900 h-screen w-screen p-8' : 'h-full p-4'}`} dir="rtl">
      {/* Controls */}
      <div className={`flex justify-between items-center mb-8 ${isFullscreen || isScreensaverMode ? 'text-white/50 hover:text-white transition-colors' : 'text-slate-800'}`}>
        <div className="flex items-center gap-3">
          <MonitorPlay className="w-8 h-8" />
          <div>
            <h1 className="text-2xl font-black">نمایشگر بدهکاران</h1>
            <p className="text-sm opacity-70">نمایش تصادفی اشخاص بدهکار</p>
          </div>
        </div>
        <div className="flex gap-2">
          {!isScreensaverMode && (
            <button
              onClick={() => setIsSettingsOpen(true)}
              className={`p-3 rounded-xl transition-all ${isFullscreen ? 'bg-white/10 hover:bg-white/20' : 'bg-white shadow-sm border border-gray-100 hover:bg-gray-50'}`}
            >
              <Settings className="w-5 h-5" />
            </button>
          )}
          <button
            onClick={isScreensaverMode ? onCloseScreensaver : toggleFullscreen}
            className={`p-3 rounded-xl transition-all ${isFullscreen || isScreensaverMode ? 'bg-white/10 hover:bg-white/20' : 'bg-white shadow-sm border border-gray-100 hover:bg-gray-50'}`}
          >
            {isFullscreen || isScreensaverMode ? <X className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Main Display Area */}
      <div className="flex-1 flex items-center justify-center overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            className={`grid gap-6 w-full ${getGridClasses()}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {currentDebtors.map((person, idx) => (
              <motion.div
                key={`${person.id}-${idx}`}
                {...getAnimationProps()}
                className={`mx-auto w-full bg-gradient-to-br from-white to-rose-50/50 backdrop-blur-lg rounded-[2rem] shadow-[0_20px_60px_-15px_rgba(225,29,72,0.2)] border border-rose-100 flex flex-col relative overflow-hidden ${getCardSizeClasses()}`}
              >
                {/* Decorative Background Elements */}
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
                  
                  <div className="mt-10 w-full bg-white/60 backdrop-blur-md rounded-3xl p-6 border border-white shadow-sm flex flex-col items-center justify-center">
                    <div className="text-sm font-bold text-slate-500 mb-2 flex items-center justify-center gap-2">
                      <TrendingDown className="w-5 h-5 text-rose-500" />
                      مانده بدهی
                    </div>
                    <div className="font-black text-rose-600 tracking-tight truncate drop-shadow-sm" style={{ fontSize: cardSize === 'xl' ? '3.5rem' : cardSize === 'lg' ? '2.8rem' : '2rem' }}>
                      {formatNumber(person.debtAmount)}
                    </div>
                    <div className="text-lg font-bold text-rose-400 mt-2">{storeSettings?.currency}</div>
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
            className="fixed inset-0 z-[60] bg-slate-900/40 backdrop-blur-sm flex justify-center items-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl shadow-2xl p-6 md:p-8 w-full max-w-lg text-right"
              dir="rtl"
            >
              <div className="flex justify-between items-center mb-8 pb-4 border-b border-gray-100">
                <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
                  <Settings className="w-6 h-6 text-indigo-500" />
                  تنظیمات نمایشگر
                </h3>
                <button onClick={() => setIsSettingsOpen(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              <div className="space-y-6 max-h-[60vh] overflow-y-auto pl-2">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">زمان فعال‌سازی خودکار اسکرین‌سیور (ثانیه)</label>
                  <input
                    type="range"
                    min="0"
                    max="300"
                    step="10"
                    value={idleTimeout}
                    onChange={(e) => setIdleTimeout(Number(e.target.value))}
                    className="w-full accent-indigo-600"
                  />
                  <div className="text-center font-bold text-indigo-600 mt-2">
                    {idleTimeout === 0 ? 'غیرفعال' : `${idleTimeout} ثانیه`}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">مدت زمان نمایش هر کارت (ثانیه)</label>
                  <input
                    type="range"
                    min="2"
                    max="30"
                    value={duration}
                    onChange={(e) => setDuration(Number(e.target.value))}
                    className="w-full accent-indigo-600"
                  />
                  <div className="text-center font-bold text-indigo-600 mt-2">{duration} ثانیه</div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">نوع انیمیشن ورود/خروج</label>
                  <div className="grid grid-cols-3 gap-2">
                    {['fade', 'slide', 'zoom'].map(type => (
                      <button
                        key={type}
                        onClick={() => setDisplayType(type as any)}
                        className={`py-3 rounded-xl font-bold text-sm transition-all ${displayType === type ? 'bg-indigo-600 text-white shadow-md' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}
                      >
                        {type === 'fade' ? 'محو شدن' : type === 'slide' ? 'اسلاید' : 'بزرگ‌نمایی'}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">اندازه کارت مشتری</label>
                  <div className="grid grid-cols-4 gap-2">
                    {['sm', 'md', 'lg', 'xl'].map(size => (
                      <button
                        key={size}
                        onClick={() => setCardSize(size as any)}
                        className={`py-3 rounded-xl font-bold text-sm transition-all ${cardSize === size ? 'bg-indigo-600 text-white shadow-md' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}
                      >
                        {size === 'sm' ? 'کوچک' : size === 'md' ? 'متوسط' : size === 'lg' ? 'بزرگ' : 'خیلی بزرگ'}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">تعداد نمایش همزمان</label>
                  <div className="flex items-center gap-4">
                    <input
                      type="range"
                      min="1"
                      max="6"
                      value={simultaneousCount}
                      onChange={(e) => setSimultaneousCount(Number(e.target.value))}
                      className="flex-1 accent-indigo-600"
                    />
                    <div className="w-12 text-center font-bold text-indigo-600 bg-indigo-50 py-1 rounded-lg">{simultaneousCount}</div>
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-4 border-t border-gray-100">
                <button
                  onClick={saveSettings}
                  className="w-full py-4 bg-slate-800 text-white font-bold rounded-xl hover:bg-slate-700 transition-colors"
                >
                  تایید و اعمال
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
