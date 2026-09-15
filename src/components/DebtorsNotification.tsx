import React, { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { AlertCircle, X, User, Terminal, ShieldAlert, Skull, Cpu, Crosshair, ArrowLeft } from "lucide-react";
import { addCommas } from "../utils/format";

interface DebtorsNotificationProps {
  settings: any;
  persons: any[];
  calculatePersonBalance: (id: string | number) => any;
  onOpenPersonProfile?: (personId: string | number) => void;
}

export default function DebtorsNotification({
  settings,
  persons,
  calculatePersonBalance,
  onOpenPersonProfile,
}: DebtorsNotificationProps) {
  const [visible, setVisible] = useState(false);
  const [debtorsList, setDebtorsList] = useState<any[]>([]);
  const [dismissedIds, setDismissedIds] = useState<Set<string | number>>(new Set());
  const isVisibleRef = useRef(false);

  useEffect(() => {
    isVisibleRef.current = visible;
  }, [visible]);

  useEffect(() => {
    if (!settings?.debtorNotificationEnabled) {
      setVisible(false);
      return;
    }

    const threshold = Number(settings.debtorNotificationThreshold) || 0;
    const repeatValue = Number(settings.debtorNotificationRepeatValue) || 1;
    const repeatUnit = Number(settings.debtorNotificationRepeatUnit) || 60;
    const redisplayValue = Number(settings.debtorNotificationRedisplayValue) || 1;
    const redisplayUnit = Number(settings.debtorNotificationRedisplayUnit) || 1440;

    const repeatMs = repeatValue * repeatUnit * 60 * 1000;
    const redisplayMs = redisplayValue * redisplayUnit * 60 * 1000;

    // Calculate debtors
    let debtors = persons
      .map((p) => {
        if (!p.isActive) return null;
        const bal = calculatePersonBalance(p.id);
        if (bal.status === "بدهکار" && bal.amount >= threshold) {
          return { ...p, debtAmount: bal.amount };
        }
        return null;
      })
      .filter(Boolean) as any[];

    if (debtors.length === 0) {
      setVisible(false);
      return;
    }

    const order = settings.debtorNotificationOrder || 'largest';
    if (order === 'largest') {
      debtors.sort((a, b) => b.debtAmount - a.debtAmount);
    } else if (order === 'smallest') {
      debtors.sort((a, b) => a.debtAmount - b.debtAmount);
    } else if (order === 'random') {
      debtors.sort(() => Math.random() - 0.5);
    }

    const maxCount = Number(settings.debtorNotificationMaxCount) || 1;
    setDebtorsList(debtors.slice(0, maxCount));

    // If it's already visible, we don't need to check timers to show it again.
    if (isVisibleRef.current) return;

    const checkShow = () => {
      if (isVisibleRef.current) return;
      
      const lastShownStr = localStorage.getItem("lastDebtorNotificationTime");
      const lastClickedStr = localStorage.getItem("lastDebtorNotificationClickTime");
      const now = new Date().getTime();
      const lastShown = lastShownStr ? parseInt(lastShownStr, 10) : 0;
      const lastClicked = lastClickedStr ? parseInt(lastClickedStr, 10) : 0;

      let shouldShow = true;

      if (lastClicked > lastShown) {
        if (now - lastClicked < redisplayMs) {
          shouldShow = false;
        }
      } else if (lastShown > 0) {
        if (now - lastShown < repeatMs) {
          shouldShow = false;
        }
      }

      if (shouldShow) {
        if (order === 'random') {
          debtors.sort(() => Math.random() - 0.5);
          setDebtorsList(debtors.slice(0, maxCount));
        }
        setVisible(true);
        setDismissedIds(new Set()); // Reset dismissed on new show
        localStorage.setItem("lastDebtorNotificationTime", now.toString());
      }
    };

    checkShow();
    const intervalId = setInterval(checkShow, 60000); // Check every minute
    return () => clearInterval(intervalId);
  }, [settings, persons]);

  const handleCloseItem = (e: React.MouseEvent, id: string | number) => {
    e.stopPropagation();
    const newSet = new Set(dismissedIds);
    newSet.add(id);
    setDismissedIds(newSet);
    
    // If all items are dismissed, hide the entire container
    if (newSet.size >= debtorsList.length) {
      setVisible(false);
    }
  };

  const handleCloseAll = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setVisible(false);
  };

  const handleClickItem = (id: string | number) => {
    localStorage.setItem("lastDebtorNotificationClickTime", new Date().getTime().toString());
    if (onOpenPersonProfile) {
      onOpenPersonProfile(id);
    }
    // Optionally close just this one, or all
    // Let's dismiss this one
    const newSet = new Set(dismissedIds);
    newSet.add(id);
    setDismissedIds(newSet);
    
    if (newSet.size >= debtorsList.length) {
      setVisible(false);
    }
  };

  if (!visible || !settings?.debtorNotificationEnabled) return null;

  const location = settings.debtorNotificationLocation || 'top-right';
  const color = settings.debtorNotificationColor || '#ef4444';
  const isHackerTheme = settings?.debtorNotificationTheme === 'hacker' || (!settings?.debtorNotificationTheme && true); // default to hacker theme
  
  const positionClasses: Record<string, string> = {
    'top-right': 'top-4 right-4 items-end',
    'top-left': 'top-4 left-4 items-start',
    'bottom-right': 'bottom-4 right-4 items-end',
    'bottom-left': 'bottom-4 left-4 items-start',
    'top-center': 'top-4 left-1/2 -translate-x-1/2 items-center',
    'bottom-center': 'bottom-4 left-1/2 -translate-x-1/2 items-center',
    'modal': 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 items-center w-[90vw] max-w-md',
  };

  const isModal = location === 'modal';
  const activeDebtors = debtorsList.filter(d => !dismissedIds.has(d.id));

  if (activeDebtors.length === 0) return null;

  return (
    <AnimatePresence>
      {visible && (
        <>
          {isModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/75 backdrop-blur-md z-[99999]"
              onClick={handleCloseAll}
            />
          )}

          <motion.div
            className={`fixed z-[100000] flex flex-col gap-3 pointer-events-none ${positionClasses[location] || positionClasses['top-right']}`}
            style={{ maxHeight: isModal ? '90vh' : '100vh', overflowY: isModal ? 'auto' : 'visible' }}
          >
            <AnimatePresence>
              {activeDebtors.map((debtor) => (
                isHackerTheme ? (
                  /* Hacker Cyberpunk Debtor Notification Card */
                  <motion.div
                    key={debtor.id}
                    initial={{ opacity: 0, scale: 0.88, x: location.includes('left') ? -30 : location.includes('right') ? 30 : 0, y: location.includes('top') || isModal ? -30 : 30 }}
                    animate={{ opacity: 1, scale: 1, x: 0, y: 0 }}
                    exit={{ opacity: 0, scale: 0.85, filter: 'blur(8px)' }}
                    transition={{ type: "spring", stiffness: 450, damping: 26 }}
                    className="relative overflow-hidden rounded-2xl p-4 min-w-[320px] max-w-[420px] cursor-pointer pointer-events-auto shadow-[0_0_30px_rgba(0,255,65,0.25)] border border-[#00ff41]/50 bg-[#080d09]/95 backdrop-blur-xl group hover:border-[#00ff41] transition-all"
                    dir="rtl"
                    onClick={() => handleClickItem(debtor.id)}
                  >
                    {/* Subtle Scanline Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#00ff41]/5 to-transparent h-16 w-full animate-scanline pointer-events-none" />
                    
                    {/* Corner Reticles */}
                    <div className="absolute top-1.5 right-1.5 w-2 h-2 border-t-2 border-r-2 border-[#00ff41]" />
                    <div className="absolute top-1.5 left-1.5 w-2 h-2 border-t-2 border-l-2 border-[#00ff41]" />
                    <div className="absolute bottom-1.5 right-1.5 w-2 h-2 border-b-2 border-r-2 border-[#00ff41]" />
                    <div className="absolute bottom-1.5 left-1.5 w-2 h-2 border-b-2 border-l-2 border-[#00ff41]" />

                    {/* Hacker Header Bar */}
                    <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#00ff41]/20 text-[11px] font-mono text-[#00ff41]/80">
                      <div className="flex items-center gap-1.5">
                        <span className="inline-block w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                        <span className="font-bold tracking-wider text-red-400">DEBTOR_INTERCEPT // مطالبات</span>
                      </div>
                      <div className="flex items-center gap-2 font-mono">
                        <span className="text-[#00ff41]/60 text-[10px]">ID: #{String(debtor.id).padStart(4, '0')}</span>
                        <button
                          onClick={(e) => handleCloseItem(e, debtor.id)}
                          className="p-1 hover:bg-[#00ff41]/20 text-[#00ff41] hover:text-white rounded transition-colors"
                          title="بستن موقت"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex items-start gap-3">
                      <div className="relative p-2.5 rounded-xl bg-black/80 border border-[#00ff41]/30 shrink-0 shadow-[0_0_12px_rgba(0,255,65,0.2)]">
                        <User className="w-6 h-6 text-[#00ff41]" />
                        <div className="absolute -bottom-1 -right-1 bg-red-600 rounded-full p-0.5">
                          <AlertCircle className="w-2.5 h-2.5 text-white" />
                        </div>
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <h3 className="font-black text-white text-base leading-tight truncate group-hover:text-[#00ff41] transition-colors">
                            {debtor.name}
                          </h3>
                        </div>
                        {debtor.phone && (
                          <div className="text-[11px] font-mono text-emerald-400/80 tracking-wider mt-0.5" dir="ltr">
                            TEL: {debtor.phone}
                          </div>
                        )}

                        <div className="mt-2.5 bg-black/70 rounded-xl p-2.5 border border-[#00ff41]/20 flex items-center justify-between">
                          <span className="text-[11px] font-mono text-gray-400">مانده بدهی:</span>
                          <div className="text-left" dir="ltr">
                            <span className="font-black text-lg text-[#ff3333] font-mono tracking-wider hacker-glow-red">
                              {addCommas(debtor.debtAmount)}
                            </span>
                            <span className="text-[10px] text-gray-400 mr-1.5 font-sans">
                              {settings?.currency || "تومان"}
                            </span>
                          </div>
                        </div>

                        <div className="mt-2 flex items-center justify-between text-[10px] text-[#00ff41]/70 font-mono">
                          <span className="flex items-center gap-1">
                            <Crosshair className="w-3 h-3 text-[#00ff41]" /> کلیک جهت ورود به پرونده
                          </span>
                          <span className="text-red-400 font-bold bg-red-950/60 px-1.5 py-0.5 rounded border border-red-800/50">
                            وضعیت: بدهکار
                          </span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  /* Standard Classic Card */
                  <motion.div
                    key={debtor.id}
                    initial={{ opacity: 0, scale: 0.9, x: location.includes('left') ? -20 : location.includes('right') ? 20 : 0, y: location.includes('top') || isModal ? -20 : 20 }}
                    animate={{ opacity: 1, scale: 1, x: 0, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, filter: 'blur(4px)' }}
                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                    className="rounded-2xl shadow-xl overflow-hidden border border-white/20 p-4 min-w-[300px] max-w-[400px] flex items-start gap-4 cursor-pointer pointer-events-auto backdrop-blur-md"
                    style={{ backgroundColor: color, color: '#fff' }}
                    dir="rtl"
                    onClick={() => handleClickItem(debtor.id)}
                  >
                    <div className="bg-white/20 p-2 rounded-full shrink-0 flex items-center justify-center">
                      <User className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1 pt-1 overflow-hidden">
                      <h3 className="font-bold text-lg leading-none mb-2 truncate">
                        {debtor.name}
                      </h3>
                      <div className="text-white/90 text-sm leading-relaxed flex flex-col gap-1">
                        <span className="opacity-80">مبلغ بدهی:</span>
                        <span className="font-black text-xl tracking-tight bg-white/20 px-2 py-1 rounded-lg inline-block w-max">
                          {addCommas(debtor.debtAmount)} {settings?.currency || "تومان"}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={(e) => handleCloseItem(e, debtor.id)}
                      className="p-2 hover:bg-white/20 rounded-xl transition-colors shrink-0"
                      title="بستن موقت"
                    >
                      <X className="w-5 h-5 text-white" />
                    </button>
                  </motion.div>
                )
              ))}
            </AnimatePresence>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
