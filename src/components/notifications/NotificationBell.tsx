import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  Bell, Check, X, BellDot, ShieldAlert, AlertTriangle, 
  Trash2, Settings, ExternalLink, Volume2, VolumeX, 
  CheckCheck, RefreshCw, Sparkles, Clock, User as UserIcon,
  Shield, Globe, Database, FileText
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { getAuthHeaders } from '../../services/coreService';
import { formatAuditDateTime, formatRelativeTime } from '../../utils/auditLogger';

interface NotificationBellProps {
  setActiveTab?: (tab: string) => void;
  user?: any;
}

export default function NotificationBell({ setActiveTab, user }: NotificationBellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveFilterTab] = useState<'sensitive' | 'all'>('sensitive');
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    try {
      return localStorage.getItem('taraz_notif_sound') !== 'false';
    } catch {
      return true;
    }
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const prevCountRef = useRef<number>(0);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Play gentle two-tone chime for critical sensitive activity
  const playChime = () => {
    if (!soundEnabled || typeof window === 'undefined') return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioCtx();
      }
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const now = ctx.currentTime;
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(587.33, now); // D5
      osc1.frequency.exponentialRampToValueAtTime(880, now + 0.15); // A5

      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(440, now);
      osc2.frequency.exponentialRampToValueAtTime(659.25, now + 0.15);

      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.4);
      osc2.stop(now + 0.4);
    } catch (_) {}
  };

  const toggleSound = () => {
    setSoundEnabled(prev => {
      const next = !prev;
      try {
        localStorage.setItem('taraz_notif_sound', String(next));
      } catch {}
      return next;
    });
  };

  const fetchNotifications = async () => {
    try {
      const res = await fetch('/api/data/notifications', {
        headers: getAuthHeaders()
      });
      if (res.ok) {
        const raw = await res.json();
        const items = Array.isArray(raw) ? raw : (raw?.data && Array.isArray(raw.data) ? raw.data : []);
        // Sort newest first
        const sorted = items.sort((a: any, b: any) => {
          const tA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const tB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return tB - tA;
        });

        // Detect new unread sensitive items and trigger chime
        const unreadSensitive = sorted.filter(n => !n.read && (n.type === 'critical' || n.type === 'warning' || n.metadata?.action));
        if (prevCountRef.current > 0 && unreadSensitive.length > prevCountRef.current) {
          playChime();
        }
        prevCountRef.current = unreadSensitive.length;

        setNotifications(sorted);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 10000); // Check every 10 seconds for real-time alerts

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      clearInterval(interval);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [soundEnabled]);

  const markAsRead = async (id: string) => {
    try {
      const notif = notifications.find(n => n.id === id);
      if (!notif) return;

      const updated = { ...notif, read: true };
      setNotifications(prev => prev.map(n => n.id === id ? updated : n));

      await fetch(`/api/data/notifications/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify(updated)
      });
    } catch (err) {
      console.error('Error marking as read:', err);
    }
  };

  const markAllAsRead = async () => {
    try {
      const unreadList = notifications.filter(n => !n.read);
      if (unreadList.length === 0) return;

      setNotifications(prev => prev.map(n => ({ ...n, read: true })));

      const allUpdated = notifications.map(n => ({ ...n, read: true }));
      await fetch('/api/data/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify(allUpdated)
      });
    } catch (err) {
      console.error('Error marking all as read:', err);
    }
  };

  const clearAllNotifications = async () => {
    if (!confirm('آیا از پاک کردن کلیه اعلان‌های ثبت‌شده اطمینان دارید؟')) return;
    try {
      setNotifications([]);
      await fetch('/api/data/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify([])
      });
    } catch (err) {
      console.error('Error clearing notifications:', err);
    }
  };

  // Dispatch a simulated test sensitive notification for verification
  const handleSendTestAlert = async () => {
    try {
      setLoading(true);
      const testNotif = {
        id: 'notif_test_' + Date.now(),
        userId: 'admin',
        targetRole: 'admin',
        title: 'هشدار آزمایشی: حذف فاکتور فرضی',
        message: 'این یک اعلان آزمایشی جهت بررسی صحت عملکرد سیستم اعلان فعالیت‌های حساس مدیر است.',
        type: 'critical',
        read: false,
        createdAt: new Date().toISOString(),
        metadata: {
          action: 'DELETE',
          entityType: 'invoices',
          entityId: 'test-101',
          actorUsername: user?.username || 'admin',
          actorName: user?.name || 'مدیر سیستم',
          ip: '127.0.0.1',
          timestamp: Date.now()
        }
      };

      const updated = [testNotif, ...notifications];
      setNotifications(updated);
      playChime();

      await fetch('/api/data/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify(updated)
      });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Separate sensitive / security alerts from general alerts
  const sensitiveAlerts = useMemo(() => {
    return notifications.filter(n => 
      n.type === 'critical' || 
      n.type === 'warning' || 
      n.type === 'security' ||
      n.metadata?.action ||
      (n.title && (n.title.includes('هشدار') || n.title.includes('حذف') || n.title.includes('امنیتی')))
    );
  }, [notifications]);

  const unreadSensitiveCount = useMemo(() => {
    return sensitiveAlerts.filter(n => !n.read).length;
  }, [sensitiveAlerts]);

  const totalUnreadCount = useMemo(() => {
    return notifications.filter(n => !n.read).length;
  }, [notifications]);

  const displayedList = activeTab === 'sensitive' ? sensitiveAlerts : notifications;

  return (
    <div className="relative" ref={containerRef} dir="rtl">
      {/* Bell Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`relative w-10 h-10 border rounded-2xl transition-all cursor-pointer flex items-center justify-center shadow-xs active:scale-95 ${
          isOpen 
            ? "bg-indigo-50 border-indigo-200 text-indigo-700" 
            : unreadSensitiveCount > 0
            ? "bg-rose-50 border-rose-200 text-rose-600 hover:bg-rose-100"
            : "bg-white border-slate-200 text-slate-600 hover:text-indigo-700 hover:bg-indigo-50"
        }`}
        title={unreadSensitiveCount > 0 ? `${unreadSensitiveCount} هشدار امنیتی حساس جدید` : "اعلان‌ها و هشدارهای سیستم"}
      >
        <div className="relative">
          {unreadSensitiveCount > 0 ? (
            <ShieldAlert className="w-5 h-5 text-rose-600 animate-bounce" />
          ) : totalUnreadCount > 0 ? (
            <BellDot className="w-5 h-5 text-amber-500 animate-pulse" />
          ) : (
            <Bell className="w-5 h-5" />
          )}

          {totalUnreadCount > 0 && (
            <span className={`absolute -top-2 -right-2 flex min-w-4 h-4 px-1 items-center justify-center rounded-full text-[9px] font-black text-white shadow-sm ${
              unreadSensitiveCount > 0 ? 'bg-rose-600 animate-pulse' : 'bg-indigo-600'
            }`}>
              {totalUnreadCount > 9 ? '+9' : totalUnreadCount}
            </span>
          )}
        </div>
      </button>

      {/* Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            className="absolute left-0 top-full mt-2 w-88 sm:w-96 bg-white rounded-3xl shadow-2xl border border-slate-200/90 overflow-hidden z-[120] flex flex-col text-right"
          >
            {/* Header */}
            <div className="p-4 bg-slate-50/90 border-b border-slate-200/70 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-xs">
                  <Shield className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-xs sm:text-sm">مرکز اعلان‌ها و هشدارهای مدیر</h3>
                  <div className="text-[10px] font-bold text-slate-400">رهگیری بلادرنگ فعالیت‌های حساس</div>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={toggleSound}
                  className={`p-1.5 rounded-lg border transition-all ${
                    soundEnabled ? 'text-indigo-600 bg-indigo-50 border-indigo-200' : 'text-slate-400 bg-slate-100 border-slate-200'
                  }`}
                  title={soundEnabled ? 'صدای هشدار فعال است' : 'صدای هشدار خاموش است'}
                >
                  {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
                </button>

                {totalUnreadCount > 0 && (
                  <button 
                    onClick={markAllAsRead} 
                    className="text-[10px] text-indigo-700 font-bold hover:bg-indigo-100/70 flex items-center gap-1 bg-indigo-50 border border-indigo-200 px-2 py-1 rounded-lg transition-all"
                    title="خواندن همه"
                  >
                    <CheckCheck className="w-3 h-3" />
                    <span>خواندن همه</span>
                  </button>
                )}
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex border-b border-slate-100 bg-white p-1 gap-1">
              <button
                onClick={() => setActiveFilterTab('sensitive')}
                className={`flex-1 py-2 px-3 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 transition-all ${
                  activeTab === 'sensitive'
                    ? 'bg-rose-50 text-rose-700 border border-rose-200/60 shadow-xs'
                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                }`}
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>هشدارهای حساس</span>
                {unreadSensitiveCount > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-rose-600 text-white text-[9px] font-black">
                    {unreadSensitiveCount}
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveFilterTab('all')}
                className={`flex-1 py-2 px-3 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 transition-all ${
                  activeTab === 'all'
                    ? 'bg-indigo-50 text-indigo-700 border border-indigo-200/60 shadow-xs'
                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Bell className="w-3.5 h-3.5" />
                <span>همه اعلان‌ها ({notifications.length})</span>
              </button>
            </div>

            {/* Notification List */}
            <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-100 styled-scrollbar">
              {displayedList.length === 0 ? (
                <div className="p-10 text-center flex flex-col items-center justify-center">
                  <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-300 mb-2">
                    {activeTab === 'sensitive' ? <Shield className="w-6 h-6" /> : <Bell className="w-6 h-6" />}
                  </div>
                  <div className="text-xs font-black text-slate-600">اعلانی برای نمایش وجود ندارد</div>
                  <p className="text-[10px] text-slate-400 font-bold mt-1">
                    {activeTab === 'sensitive' ? 'هیچ فعالیت حساسی اخیراً ثبت نشده است.' : 'صندوق اعلان‌های شما خالی است.'}
                  </p>
                </div>
              ) : (
                displayedList.map(notif => {
                  const isCritical = notif.type === 'critical' || notif.title?.includes('حذف');
                  const isWarning = notif.type === 'warning' || notif.title?.includes('تنظیمات');
                  const hasLogLink = notif.metadata?.logId || notif.metadata?.entityType;

                  return (
                    <div 
                      key={notif.id} 
                      className={`p-3.5 transition-all ${
                        !notif.read 
                          ? isCritical 
                            ? 'bg-rose-50/40 border-r-4 border-r-rose-600' 
                            : 'bg-amber-50/30 border-r-4 border-r-amber-500'
                          : 'bg-white hover:bg-slate-50/60 opacity-80'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <div className="flex items-center gap-1.5 flex-1 min-w-0">
                          {isCritical ? (
                            <span className="p-1 rounded-lg bg-rose-100 text-rose-700 shrink-0">
                              <ShieldAlert className="w-3.5 h-3.5" />
                            </span>
                          ) : isWarning ? (
                            <span className="p-1 rounded-lg bg-amber-100 text-amber-700 shrink-0">
                              <AlertTriangle className="w-3.5 h-3.5" />
                            </span>
                          ) : (
                            <span className="p-1 rounded-lg bg-indigo-100 text-indigo-700 shrink-0">
                              <Bell className="w-3.5 h-3.5" />
                            </span>
                          )}

                          <span className={`text-xs font-black truncate ${isCritical ? 'text-rose-900' : 'text-slate-800'}`}>
                            {notif.title}
                          </span>
                        </div>

                        <span className="text-[10px] font-bold text-slate-400 shrink-0" dir="ltr">
                          {notif.createdAt ? formatRelativeTime(new Date(notif.createdAt).getTime()) : 'امروز'}
                        </span>
                      </div>

                      <p className="text-[11px] font-bold text-slate-600 leading-relaxed mb-2.5 whitespace-pre-line">
                        {notif.message}
                      </p>

                      {/* Footer Actions */}
                      <div className="flex items-center justify-between pt-1 border-t border-slate-100/80">
                        {/* View in system logs button */}
                        {setActiveTab && (
                          <button
                            onClick={() => {
                              setIsOpen(false);
                              markAsRead(notif.id);
                              setActiveTab('system_logs');
                            }}
                            className="inline-flex items-center gap-1 text-[10px] font-black text-indigo-700 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 px-2 py-1 rounded-lg transition-all"
                          >
                            <ExternalLink className="w-3 h-3" />
                            <span>مشاهده در لاگ سیستم</span>
                          </button>
                        )}

                        <div className="flex items-center gap-2 mr-auto">
                          {!notif.read && (
                            <button 
                              onClick={() => markAsRead(notif.id)} 
                              className="text-[10px] font-bold text-emerald-700 hover:text-emerald-900 bg-emerald-50 px-2 py-1 rounded-lg transition-all flex items-center gap-1"
                            >
                              <Check className="w-3 h-3" />
                              <span>خوانده شد</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer with Clear & Test Options */}
            <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs">
              <button
                onClick={handleSendTestAlert}
                disabled={loading}
                className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 bg-white border border-indigo-100 px-2.5 py-1 rounded-xl shadow-xs transition-all active:scale-95"
                title="ایجاد یک هشدار آزمایشی جهت تست صدا و نمایش"
              >
                <Sparkles className="w-3 h-3" />
                <span>تست هشدار حساس</span>
              </button>

              {notifications.length > 0 && (
                <button
                  onClick={clearAllNotifications}
                  className="text-[10px] font-bold text-slate-400 hover:text-rose-600 flex items-center gap-1 transition-colors"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>پاکسازی تاریخچه</span>
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
