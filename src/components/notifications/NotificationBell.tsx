import React, { useState, useRef, useEffect } from 'react';
import { Bell, Check, X, BellDot } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000); // Check every minute
    
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
  }, []);

  const fetchNotifications = async () => {
    try {
      const res = await fetch('/api/data/notifications', {
        headers: { 'Authorization': 'Bearer ' + (localStorage.getItem('access_token') || '') }
      });
      if (res.ok) {
        const data = await res.json();
        // Assuming descending order
        const sorted = data.data.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setNotifications(sorted);
        setUnreadCount(sorted.filter((n: any) => !n.read).length);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      const notif = notifications.find(n => n.id === id);
      if (!notif) return;
      
      const res = await fetch(`/api/data/notifications/${id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + (localStorage.getItem('access_token') || '')
        },
        body: JSON.stringify({ ...notif, read: true })
      });
      if (res.ok) {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch(err) {
       console.error('Error marking as read:', err);
    }
  };

  const markAllAsRead = async () => {
     try {
       const unreadIds = notifications.filter(n => !n.read).map(n => n.id);
       for (const id of unreadIds) {
         await markAsRead(id);
       }
     } catch (err) {}
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-10 h-10 border rounded-xl transition-all cursor-pointer flex items-center justify-center shadow-sm active:scale-95 ${isOpen ? "bg-indigo-50 border-indigo-200 text-indigo-700" : "bg-white border-slate-200 text-slate-600 hover:text-indigo-700 hover:bg-indigo-50"}`}
        title="اعلان‌ها"
      >
        <div className="relative">
          {unreadCount > 0 ? <BellDot className="w-5 h-5 text-rose-500 animate-pulse" /> : <Bell className="w-5 h-5" />}
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white shadow-sm">
              {unreadCount > 9 ? '+9' : unreadCount}
            </span>
          )}
        </div>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute left-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden z-50 flex flex-col"
          >
            <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-800 text-sm">اعلان‌ها</h3>
              {unreadCount > 0 && (
                <button onClick={markAllAsRead} className="text-xs text-indigo-600 font-bold hover:text-indigo-700 flex items-center gap-1 bg-indigo-50 px-2 py-1 rounded-lg">
                  <Check className="w-3 h-3" />
                  خواندن همه
                </button>
              )}
            </div>
            
            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-sm text-slate-400 font-medium">
                  اعلانی برای نمایش وجود ندارد
                </div>
              ) : (
                <div className="divide-y divide-slate-50">
                  {notifications.map(notif => (
                    <div key={notif.id} className={`p-4 transition-colors ${notif.read ? 'bg-white opacity-70' : 'bg-indigo-50/30'}`}>
                      <div className="flex justify-between items-start mb-1">
                        <span className={`text-xs font-bold ${notif.read ? 'text-slate-600' : 'text-slate-900'}`}>{notif.title}</span>
                        <span className="text-[10px] text-slate-400" dir="ltr">{new Date(notif.createdAt).toLocaleDateString('fa-IR')}</span>
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed mb-2">{notif.message}</p>
                      {!notif.read && (
                        <div className="flex justify-end">
                          <button onClick={() => markAsRead(notif.id)} className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 bg-white border border-indigo-100 px-2 py-1 rounded-md">
                            تایید
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
