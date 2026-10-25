import React, { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  AlertCircle, 
  X, 
  User, 
  Phone, 
  MessageSquare, 
  FileText, 
  Clock, 
  Calendar, 
  ExternalLink, 
  Volume2, 
  VolumeX, 
  Settings, 
  ShieldAlert, 
  CheckCircle2, 
  Pause, 
  Play,
  RotateCcw,
  Sparkles,
  ChevronDown
} from "lucide-react";
import { addCommas, toPersianDigits, formatDateDisplay } from "../utils/format";
import { playHackerAlertSound } from "../utils/audio";
import { 
  getUnifiedDebtorsList, 
  snoozeDebtorAlert, 
  UnifiedDebtorInfo 
} from "../services/debtorAnalyticsService";

interface DebtorsNotificationProps {
  settings: any;
  persons: any[];
  accountingDocuments?: any[];
  calculatePersonBalance?: (id: string | number) => any;
  onOpenPersonProfile?: (personId: string | number) => void;
  onOpenPersonLedger?: (personId: string | number) => void;
  onSendSms?: (phone: string, text: string) => void;
  onOpenSettings?: () => void;
}

export default function DebtorsNotification({
  settings,
  persons,
  accountingDocuments = [],
  calculatePersonBalance,
  onOpenPersonProfile,
  onOpenPersonLedger,
  onSendSms,
  onOpenSettings,
}: DebtorsNotificationProps) {
  const [visible, setVisible] = useState(false);
  const [debtorsList, setDebtorsList] = useState<UnifiedDebtorInfo[]>([]);
  const [dismissedIds, setDismissedIds] = useState<Set<string | number>>(new Set());
  const [snoozeMenuOpenId, setSnoozeMenuOpenId] = useState<string | number | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [progressPercent, setProgressPercent] = useState(100);

  const isVisibleRef = useRef(false);
  const progressTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    isVisibleRef.current = visible;
  }, [visible]);

  // Duration settings
  const autoCloseSeconds = Number(settings?.debtorNotificationAutoCloseDuration ?? 12);
  const isAutoCloseEnabled = autoCloseSeconds > 0 && settings?.debtorNotificationAutoClose !== false;

  // Sound setting
  const isSoundEnabled = settings?.debtorNotificationSound !== false;

  // Load and refresh debtors
  const refreshDebtors = useCallback(() => {
    if (!settings?.debtorNotificationEnabled) {
      setVisible(false);
      return [];
    }

    const threshold = Number(settings.debtorNotificationThreshold) || 0;
    const minOverdueDays = Number(settings.debtorNotificationMinOverdueDays) || 0;

    let debtors = getUnifiedDebtorsList({
      persons,
      accountingDocuments,
      calculatePersonBalance,
      threshold,
      minOverdueDays,
      filterSnoozed: true,
    });

    if (debtors.length === 0) {
      setVisible(false);
      return [];
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
    const selected = debtors.slice(0, maxCount);
    setDebtorsList(selected);
    return selected;
  }, [settings, persons, accountingDocuments, calculatePersonBalance]);

  // Periodic interval & timing checks
  useEffect(() => {
    if (!settings?.debtorNotificationEnabled) {
      setVisible(false);
      return;
    }

    const repeatValue = Number(settings.debtorNotificationRepeatValue) || 1;
    const repeatUnit = Number(settings.debtorNotificationRepeatUnit) || 60;
    const redisplayValue = Number(settings.debtorNotificationRedisplayValue) || 1;
    const redisplayUnit = Number(settings.debtorNotificationRedisplayUnit) || 1440;

    const repeatMs = repeatValue * repeatUnit * 60 * 1000;
    const redisplayMs = redisplayValue * redisplayUnit * 60 * 1000;

    const checkShow = () => {
      if (isVisibleRef.current) return;

      const lastShownStr = localStorage.getItem("lastDebtorNotificationTime");
      const lastClickedStr = localStorage.getItem("lastDebtorNotificationClickTime");
      const now = Date.now();
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
        const found = refreshDebtors();
        if (found.length > 0) {
          setVisible(true);
          setDismissedIds(new Set());
          setProgressPercent(100);
          localStorage.setItem("lastDebtorNotificationTime", now.toString());

          if (isSoundEnabled) {
            try {
              playHackerAlertSound(0.18);
            } catch (e) {}
          }
        }
      }
    };

    checkShow();
    const intervalId = setInterval(checkShow, 60000);
    return () => clearInterval(intervalId);
  }, [settings, refreshDebtors, isSoundEnabled]);

  // Auto-close progress countdown bar
  useEffect(() => {
    if (!visible || !isAutoCloseEnabled || isPaused) {
      if (progressTimerRef.current) clearInterval(progressTimerRef.current);
      return;
    }

    const totalMs = autoCloseSeconds * 1000;
    const intervalMs = 100;
    const stepPercent = (intervalMs / totalMs) * 100;

    progressTimerRef.current = setInterval(() => {
      setProgressPercent((prev) => {
        if (prev <= stepPercent) {
          clearInterval(progressTimerRef.current!);
          setVisible(false);
          return 0;
        }
        return prev - stepPercent;
      });
    }, intervalMs);

    return () => {
      if (progressTimerRef.current) clearInterval(progressTimerRef.current);
    };
  }, [visible, isAutoCloseEnabled, isPaused, autoCloseSeconds]);

  // Actions
  const handleCloseItem = (e: React.MouseEvent, id: string | number) => {
    e.stopPropagation();
    const newSet = new Set(dismissedIds);
    newSet.add(id);
    setDismissedIds(newSet);

    if (newSet.size >= debtorsList.length) {
      setVisible(false);
    }
  };

  const handleCloseAll = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setVisible(false);
  };

  const handleSnooze = (e: React.MouseEvent, id: string | number, hours: number) => {
    e.stopPropagation();
    snoozeDebtorAlert(id, hours);
    setSnoozeMenuOpenId(null);
    handleCloseItem(e, id);
  };

  const handleDirectCall = (e: React.MouseEvent, phone?: string) => {
    e.stopPropagation();
    if (phone) {
      window.location.href = `tel:${phone}`;
    }
  };

  const handleQuickSms = (e: React.MouseEvent, debtor: UnifiedDebtorInfo) => {
    e.stopPropagation();
    localStorage.setItem("lastDebtorNotificationClickTime", Date.now().toString());
    const storeName = settings?.storeName || "مجموعه";
    const formattedAmount = addCommas(debtor.debtAmount);
    const currency = settings?.currency || "تومان";
    const message = `همکار گرامی جناب ${debtor.name}، احتراماً مانده بدهی سررسید شده شما به مبلغ ${formattedAmount} ${currency} می‌باشد. خواهشمند است جهت تسویه اقدام فرمایید. باتشکر، ${storeName}`;

    if (onSendSms && debtor.phone) {
      onSendSms(debtor.phone, message);
    } else if (onOpenPersonProfile) {
      onOpenPersonProfile(debtor.id);
    }
    handleCloseItem(e, debtor.id);
  };

  const handleOpenLedger = (e: React.MouseEvent, id: string | number) => {
    e.stopPropagation();
    localStorage.setItem("lastDebtorNotificationClickTime", Date.now().toString());
    if (onOpenPersonLedger) {
      onOpenPersonLedger(id);
    } else if (onOpenPersonProfile) {
      onOpenPersonProfile(id);
    }
    handleCloseItem(e, id);
  };

  if (!visible || !settings?.debtorNotificationEnabled) return null;

  const location = settings.debtorNotificationLocation || 'top-right';
  const positionClasses: Record<string, string> = {
    'top-right': 'top-4 right-4 items-end',
    'top-left': 'top-4 left-4 items-start',
    'bottom-right': 'bottom-4 right-4 items-end',
    'bottom-left': 'bottom-4 left-4 items-start',
    'top-center': 'top-4 left-1/2 -translate-x-1/2 items-center',
    'bottom-center': 'bottom-4 left-1/2 -translate-x-1/2 items-center',
    'modal': 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 items-center w-[92vw] max-w-md',
  };

  const isModal = location === 'modal';
  const activeDebtors = debtorsList.filter((d) => !dismissedIds.has(d.id));

  if (activeDebtors.length === 0) return null;

  return (
    <AnimatePresence>
      {visible && (
        <>
          {/* Modal Overlay if centered */}
          {isModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-950/70 backdrop-blur-md z-[99999]"
              onClick={handleCloseAll}
            />
          )}

          {/* Floating Container */}
          <motion.div
            className={`fixed z-[100000] flex flex-col gap-3 pointer-events-none ${
              positionClasses[location] || positionClasses['top-right']
            }`}
            style={{ maxHeight: isModal ? '90vh' : '100vh', overflowY: isModal ? 'auto' : 'visible' }}
            dir="rtl"
          >
            <AnimatePresence>
              {activeDebtors.map((debtor) => {
                const isCritical = debtor.riskLevel === 'critical';
                const isWarning = debtor.riskLevel === 'warning';

                return (
                  <motion.div
                    key={debtor.id}
                    initial={{
                      opacity: 0,
                      scale: 0.92,
                      x: location.includes('left') ? -30 : location.includes('right') ? 30 : 0,
                      y: location.includes('top') || isModal ? -25 : 25,
                    }}
                    animate={{ opacity: 1, scale: 1, x: 0, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, filter: 'blur(6px)' }}
                    transition={{ type: "spring", stiffness: 420, damping: 28 }}
                    onMouseEnter={() => setIsPaused(true)}
                    onMouseLeave={() => setIsPaused(false)}
                    className="relative overflow-hidden rounded-3xl p-4 sm:p-5 min-w-[320px] max-w-[430px] w-full cursor-default pointer-events-auto shadow-2xl transition-all font-sans border backdrop-blur-xl bg-white/95 dark:bg-slate-900/95 border-slate-200/90 dark:border-slate-800 shadow-slate-900/15 dark:shadow-black/60 group"
                  >
                    {/* Top Glow Indicator */}
                    <div
                      className={`absolute top-0 right-0 left-0 h-1 ${
                        isCritical
                          ? 'bg-gradient-to-r from-rose-500 via-red-500 to-rose-600'
                          : isWarning
                          ? 'bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600'
                          : 'bg-gradient-to-r from-indigo-500 to-sky-500'
                      }`}
                    />

                    {/* Header Bar */}
                    <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100 dark:border-slate-800/80 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="relative flex h-2.5 w-2.5">
                          <span
                            className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                              isCritical ? 'bg-rose-500' : 'bg-amber-500'
                            }`}
                          />
                          <span
                            className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                              isCritical ? 'bg-rose-600' : 'bg-amber-600'
                            }`}
                          />
                        </span>
                        <span
                          className={`font-black text-xs tracking-tight ${
                            isCritical
                              ? 'text-rose-600 dark:text-rose-400'
                              : 'text-amber-600 dark:text-amber-400'
                          }`}
                        >
                          هشدار مطالبه سررسید شده
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-black border ${
                            isCritical
                              ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-900'
                              : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-900'
                          }`}
                        >
                          {debtor.riskLabel}
                        </span>
                      </div>

                      {/* Header Actions (Settings & Close) */}
                      <div className="flex items-center gap-1">
                        {onOpenSettings && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenSettings();
                            }}
                            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
                            title="تنظیمات پاپ‌آپ بدهی"
                          >
                            <Settings className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          onClick={(e) => handleCloseItem(e, debtor.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition"
                          title="بستن موقت این اعلان"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Person Information Box */}
                    <div className="flex items-start gap-3.5">
                      <div
                        className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border shadow-xs ${
                          isCritical
                            ? 'bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 border-rose-200/80 dark:border-rose-900/60'
                            : 'bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 border-amber-200/80 dark:border-amber-900/60'
                        }`}
                      >
                        <User className="w-6 h-6" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <h4 className="font-black text-slate-900 dark:text-white text-base leading-snug truncate">
                            {debtor.name}
                          </h4>
                          {debtor.overdueDays > 0 && (
                            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 shrink-0 flex items-center gap-1">
                              <Clock className="w-3 h-3 text-slate-400" />
                              {toPersianDigits(debtor.overdueDays)} روز معوق
                            </span>
                          )}
                        </div>

                        {debtor.phone && (
                          <div className="text-xs font-mono font-bold text-slate-600 dark:text-slate-400 mt-0.5" dir="ltr">
                            {toPersianDigits(debtor.phone)}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Debt Amount Display Box */}
                    <div className="mt-3.5 p-3 rounded-2xl bg-slate-50/90 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                        <ShieldAlert className="w-4 h-4 text-rose-500" />
                        مانده بدهی قطعی:
                      </span>
                      <div className="text-left" dir="ltr">
                        <span className="font-mono text-xl font-black text-rose-600 dark:text-rose-400 tracking-tight">
                          {addCommas(debtor.debtAmount)}
                        </span>
                        <span className="text-xs font-bold text-slate-500 dark:text-slate-400 mr-1.5 font-sans">
                          {settings?.currency || "تومان"}
                        </span>
                      </div>
                    </div>

                    {/* Quick Action Buttons */}
                    <div className="mt-3.5 grid grid-cols-3 gap-2">
                      {/* Direct Call Button */}
                      {debtor.phone ? (
                        <button
                          onClick={(e) => handleDirectCall(e, debtor.phone)}
                          className="px-2.5 py-2 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/80 rounded-xl text-xs font-extrabold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-3xs active:scale-95"
                          title="تماس تلفنی مستقیم با طرف‌حساب"
                        >
                          <Phone className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                          <span>تماس</span>
                        </button>
                      ) : (
                        <button
                          disabled
                          className="px-2.5 py-2 bg-gray-100 dark:bg-slate-800 text-gray-400 rounded-xl text-xs font-bold cursor-not-allowed opacity-50 flex items-center justify-center gap-1"
                        >
                          <Phone className="w-3.5 h-3.5" />
                          <span>بدون شماره</span>
                        </button>
                      )}

                      {/* Quick SMS Button */}
                      <button
                        onClick={(e) => handleQuickSms(e, debtor)}
                        className="px-2.5 py-2 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/50 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/80 rounded-xl text-xs font-extrabold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-3xs active:scale-95"
                        title="نگارش و ارسال پیامک یادآوری بدهی"
                      >
                        <MessageSquare className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                        <span>پیامک</span>
                      </button>

                      {/* Ledger / Profile Button */}
                      <button
                        onClick={(e) => handleOpenLedger(e, debtor.id)}
                        className="px-2.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-extrabold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-3xs active:scale-95"
                        title="مشاهده صورت‌حساب معین و گردش‌های مالی"
                      >
                        <FileText className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
                        <span>معین حساب</span>
                      </button>
                    </div>

                    {/* Bottom Snooze & Footer Toolbar */}
                    <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                      <div className="relative">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSnoozeMenuOpenId(snoozeMenuOpenId === debtor.id ? null : debtor.id);
                          }}
                          className="px-2 py-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition font-bold flex items-center gap-1 text-[11px] cursor-pointer text-slate-600 dark:text-slate-300"
                        >
                          <Clock className="w-3 h-3 text-amber-500" />
                          <span>به تعویق انداختن</span>
                          <ChevronDown className="w-3 h-3 text-slate-400" />
                        </button>

                        {/* Snooze Dropdown */}
                        <AnimatePresence>
                          {snoozeMenuOpenId === debtor.id && (
                            <motion.div
                              initial={{ opacity: 0, y: 5, scale: 0.95 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{ opacity: 0, y: 5, scale: 0.95 }}
                              className="absolute right-0 bottom-full mb-1.5 w-44 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl p-1.5 z-20"
                            >
                              <button
                                onClick={(e) => handleSnooze(e, debtor.id, 1)}
                                className="w-full text-right px-2.5 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-700/70 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 transition flex items-center justify-between"
                              >
                                <span>۱ ساعت بعد</span>
                                <span className="text-[10px] text-slate-400">یک ساعت</span>
                              </button>
                              <button
                                onClick={(e) => handleSnooze(e, debtor.id, 24)}
                                className="w-full text-right px-2.5 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-700/70 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 transition flex items-center justify-between"
                              >
                                <span>۲۴ ساعت بعد</span>
                                <span className="text-[10px] text-slate-400">فردا</span>
                              </button>
                              <button
                                onClick={(e) => handleCloseItem(e, debtor.id)}
                                className="w-full text-right px-2.5 py-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400 transition"
                              >
                                بستن در این نشست
                              </button>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                      {/* Pause / Resume Indicator */}
                      {isAutoCloseEnabled && (
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                          {isPaused ? (
                            <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-bold">
                              <Pause className="w-2.5 h-2.5" /> توقف تایمر
                            </span>
                          ) : (
                            <span className="flex items-center gap-1">
                              بستن خودکار
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Countdown Progress Bar */}
                    {isAutoCloseEnabled && (
                      <div className="absolute bottom-0 right-0 left-0 h-1 bg-slate-100 dark:bg-slate-800 overflow-hidden">
                        <motion.div
                          className={`h-full ${
                            isCritical
                              ? 'bg-rose-500'
                              : isWarning
                              ? 'bg-amber-500'
                              : 'bg-indigo-500'
                          }`}
                          style={{ width: `${progressPercent}%` }}
                          transition={{ ease: "linear" }}
                        />
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
