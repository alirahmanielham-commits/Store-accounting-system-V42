import React, { useState, useEffect, useRef } from 'react';
import { ShieldAlert, AlertTriangle, X, ExternalLink, Volume2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { getAuthHeaders } from '../../services/coreService';

interface LiveAdminAlertToastProps {
  user?: any;
  setActiveTab?: (tab: string) => void;
}

export default function LiveAdminAlertToast({ user, setActiveTab }: LiveAdminAlertToastProps) {
  const [activeAlert, setActiveAlert] = useState<any | null>(null);
  const seenIdsRef = useRef<Set<string>>(new Set());
  const initialLoadRef = useRef(true);

  // Only show live popups to admins and managers
  const isAdmin = user && (user.role === 'admin' || user.role === 'manager');

  useEffect(() => {
    if (!isAdmin) return;

    const checkNewAlerts = async () => {
      try {
        const res = await fetch('/api/data/notifications', {
          headers: getAuthHeaders()
        });
        if (res.ok) {
          const raw = await res.json();
          const items: any[] = Array.isArray(raw) ? raw : (raw?.data && Array.isArray(raw.data) ? raw.data : []);
          
          if (initialLoadRef.current) {
            // Populate seen IDs on first boot so we don't spam old notifications
            items.forEach(item => seenIdsRef.current.add(String(item.id)));
            initialLoadRef.current = false;
            return;
          }

          // Check if there are new unread sensitive alerts
          const newAlerts = items.filter(n => 
            !seenIdsRef.current.has(String(n.id)) && 
            !n.read &&
            (n.type === 'critical' || n.type === 'warning' || n.title?.includes('هشدار'))
          );

          if (newAlerts.length > 0) {
            const latest = newAlerts[0];
            seenIdsRef.current.add(String(latest.id));
            setActiveAlert(latest);

            // Auto dismiss after 9 seconds
            setTimeout(() => {
              setActiveAlert((current: any) => current?.id === latest.id ? null : current);
            }, 9000);
          }
        }
      } catch (_) {}
    };

    const interval = setInterval(checkNewAlerts, 8000);
    return () => clearInterval(interval);
  }, [isAdmin]);

  if (!isAdmin || !activeAlert) return null;

  const isCritical = activeAlert.type === 'critical' || activeAlert.title?.includes('حذف');

  return (
    <div className="fixed bottom-6 left-6 z-[200] max-w-md w-full pointer-events-none" dir="rtl">
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.92 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          className={`pointer-events-auto p-4 rounded-3xl shadow-2xl border flex flex-col gap-2.5 backdrop-blur-md transition-all ${
            isCritical 
              ? 'bg-rose-900/95 text-white border-rose-700 shadow-rose-900/30' 
              : 'bg-amber-900/95 text-white border-amber-700 shadow-amber-900/30'
          }`}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-xl bg-white/20 text-white animate-pulse">
                {isCritical ? <ShieldAlert className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
              </span>
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-white/70 block">
                  اعلان فوری به مدیر سیستم
                </span>
                <h4 className="text-xs sm:text-sm font-black text-white">
                  {activeAlert.title}
                </h4>
              </div>
            </div>

            <button
              onClick={() => setActiveAlert(null)}
              className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <p className="text-xs text-white/90 font-bold leading-relaxed whitespace-pre-line bg-black/20 p-2.5 rounded-2xl">
            {activeAlert.message}
          </p>

          <div className="flex items-center justify-between pt-1 text-xs">
            <span className="text-[10px] text-white/60 font-bold">
              ثبت‌شده در لاگ وقایع
            </span>

            {setActiveTab && (
              <button
                onClick={() => {
                  setActiveAlert(null);
                  setActiveTab('system_logs');
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white text-slate-900 hover:bg-slate-100 font-black text-[11px] shadow-sm transition-all cursor-pointer active:scale-95"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>بررسی در لاگ سیستم</span>
              </button>
            )}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
