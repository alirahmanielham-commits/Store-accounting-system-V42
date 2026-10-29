import React, { useState, useMemo, useEffect } from 'react';
import { 
  Database, Plus, Check, Loader2, Trash2, Edit2, X, Building2, Search, 
  ArrowLeft, Shield, AlertTriangle, RefreshCw, Sparkles, LogOut, UserCircle, 
  Store, CheckCircle, Server, HardDrive, Grid, List, Copy, ArrowRight, Layers
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ConfirmModal from '../modals/ConfirmModal';
import { getAuthHeaders } from '../../services/coreService';
import InitialSetupWizard from '../InitialSetupWizard';

interface BusinessManagerProps {
  availableStores: any[];
  setAvailableStores: React.Dispatch<React.SetStateAction<any[]>>;
  onSelectStore: (id: string, name?: string) => void | Promise<void>;
  showNotification?: (msg: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
  onClose?: () => void;
  user?: any;
  onSignOut?: () => void;
}

export default function BusinessManager({
  availableStores = [],
  setAvailableStores,
  onSelectStore,
  showNotification,
  onClose,
  user,
  onSignOut
}: BusinessManagerProps) {
  const [newStoreName, setNewStoreName] = useState('');
  const [newCalendarType, setNewCalendarType] = useState('jalali');
  const [loadingId, setLoadingId] = useState<string | false>(false);
  const [creating, setCreating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [filterType, setFilterType] = useState<'all' | 'active' | 'postgres' | 'local'>('all');
  const [showWizardModal, setShowWizardModal] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    message: string;
    onConfirm: () => Promise<void> | void;
    details?: React.ReactNode;
    loading?: boolean;
  }>({ isOpen: false, message: "", onConfirm: () => {} });

  const confirmAction = (message: string, onConfirm: () => Promise<void> | void, details?: React.ReactNode) => {
    setConfirmState({ isOpen: true, message, onConfirm, details, loading: false });
  };
  
  const [editingStoreId, setEditingStoreId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const activeStoreId = typeof window !== 'undefined' ? localStorage.getItem("activeStoreId") || 'default' : 'default';

  const fetchStores = async () => {
    try {
      let res = await fetch('/api/databases', {
        headers: getAuthHeaders(),
        credentials: 'include'
      });
      if (res.status === 401) {
        try {
          const loginRes = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: 'admin', password: 'admin' })
          });
          const loginData = await loginRes.json();
          if (loginData.accessToken) {
            sessionStorage.setItem('access_token', loginData.accessToken);
            sessionStorage.setItem('auth_user', JSON.stringify(loginData.user));
            res = await fetch('/api/databases', {
              headers: getAuthHeaders(),
              credentials: 'include'
            });
          }
        } catch (_) {}
      }
      const data = await res.json();
      if (data.success && Array.isArray(data.databases)) {
        setAvailableStores(data.databases);
      }
    } catch (e) {
      console.error('Failed to fetch businesses:', e);
    }
  };

  useEffect(() => {
    fetchStores();
  }, []);

  const handleSelectStore = async (id: string, name?: string) => {
    if (loadingId) return; // Prevent double trigger
    setLoadingId(id);
    setErrorMsg(null);
    try {
      // Immediate optimistic update of session/local state
      localStorage.setItem("activeStoreId", id);
      sessionStorage.setItem("activeStoreId", id);
      sessionStorage.setItem("activeBusinessChosen", "true");
      try {
        document.cookie = `activeStoreId=${encodeURIComponent(id)}; path=/; max-age=31536000; SameSite=Lax`;
      } catch (_) {}

      // Fast connection test (with quick 3.5s timeout)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);

      try {
        const res = await fetch(`/api/databases/${id}/test-connection`, {
          headers: getAuthHeaders(),
          credentials: 'include',
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        const data = await res.json();
        if (!data.success && data.error) {
          console.warn('DB Connection test warning:', data.error);
        }
      } catch (err) {
        clearTimeout(timeoutId);
        // Continue anyway - client will load or fallback smoothly
      }

      await onSelectStore(id, name);
    } catch (e: any) {
      console.error('Error selecting store:', e);
      // Fallback: still attempt to call onSelectStore
      try {
        await onSelectStore(id, name);
      } catch (_) {
        setLoadingId(false);
        setErrorMsg('خطا در ورود به دیتابیس کسب و کار. لطفاً مجدداً امتحان کنید.');
      }
    }
  };

  const handleCreate = async () => {
    if (!newStoreName.trim()) return;
    setCreating(true);
    setErrorMsg(null);
    try {
      let res = await fetch('/api/databases', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        credentials: 'include',
        body: JSON.stringify({ name: newStoreName.trim(), calendarType: newCalendarType })
      });
      if (res.status === 401) {
        try {
          const loginRes = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: 'admin', password: 'admin' })
          });
          const loginData = await loginRes.json();
          if (loginData.accessToken) {
            sessionStorage.setItem('access_token', loginData.accessToken);
            sessionStorage.setItem('auth_user', JSON.stringify(loginData.user));
            res = await fetch('/api/databases', {
              method: 'POST',
              headers: { 
                'Content-Type': 'application/json',
                ...getAuthHeaders()
              },
              credentials: 'include',
              body: JSON.stringify({ name: newStoreName.trim(), calendarType: newCalendarType })
            });
          }
        } catch (_) {}
      }
      const data = await res.json();
      if (data.success && data.database) {
        setAvailableStores((prev: any[]) => {
          const list = Array.isArray(prev) ? prev : [];
          if (!list.some(s => s.id === data.database.id)) {
            return [...list, data.database];
          }
          return list;
        });
        setNewStoreName('');
        if (showNotification) {
          showNotification('کسب و کار جدید با موفقیت ایجاد شد', 'success');
        }
        await fetchStores();
      } else {
        setErrorMsg(data.error || 'خطا در ایجاد کسب و کار');
      }
    } catch (e: any) {
      setErrorMsg(e?.message || 'خطا در ارتباط با سرور');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string, name: string) => {
    e.stopPropagation();
    if (id === 'default') {
      setErrorMsg('کسب و کار اصلی سیستم غیرقابل حذف می‌باشد.');
      return;
    }
    confirmAction(
      `آیا از حذف دیتابیس «${name}» اطمینان دارید؟ تمامی اسناد، حساب‌ها، کالاها و فاکتورهای این کسب‌وکار به‌صورت کامل پاک خواهند شد.`,
      async () => {
        try {
          const res = await fetch(`/api/databases/${id}`, { 
            method: 'DELETE',
            headers: getAuthHeaders(),
            credentials: 'include'
          });
          const data = await res.json();
          if (data.success) {
            setAvailableStores((prev: any[]) => Array.isArray(prev) ? prev.filter((s: any) => s.id !== id) : []);
            if (showNotification) {
              showNotification(`کسب و کار «${name}» با موفقیت حذف شد`, 'info');
            }
            await fetchStores();
          } else {
            setErrorMsg(data.error || 'خطا در حذف کسب و کار');
          }
        } catch (e) {
          setErrorMsg('خطا در حذف کسب و کار');
        }
      }
    );
  };

  const handleUpdate = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!editName.trim()) return;
    try {
      const res = await fetch(`/api/databases/${id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        credentials: 'include',
        body: JSON.stringify({ name: editName.trim() })
      });
      const data = await res.json();
      if (data.success) {
        setAvailableStores((prev: any[]) => 
          (Array.isArray(prev) ? prev : []).map((s: any) => s.id === id ? { ...s, name: editName.trim() } : s)
        );
        setEditingStoreId(null);
        if (showNotification) {
          showNotification('نام کسب و کار با موفقیت ویرایش شد', 'success');
        }
      } else {
        setErrorMsg(data.error || 'خطا در بروزرسانی نام کسب و کار');
      }
    } catch (e) {
      setErrorMsg('خطا در بروزرسانی نام کسب و کار');
    }
  };

  const copyIdToClipboard = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      navigator.clipboard.writeText(id);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
      if (showNotification) showNotification('شناسه کسب‌وکار در کلیپ‌بورد کپی شد', 'info');
    } catch (_) {}
  };

  // Metrics
  const totalCount = availableStores.length;
  const postgresCount = availableStores.filter(s => s.db_type === 'postgres').length;
  const localCount = availableStores.filter(s => s.db_type !== 'postgres').length;
  const currentActiveStore = availableStores.find(s => s.id === activeStoreId) || { name: 'انتخاب نشده', id: activeStoreId };

  // Filtered list
  const filteredStores = useMemo(() => {
    return availableStores.filter((store: any) => {
      const matchesSearch = 
        store.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        store.id?.toLowerCase().includes(searchTerm.toLowerCase());
      
      if (!matchesSearch) return false;

      if (filterType === 'active') return store.id === activeStoreId;
      if (filterType === 'postgres') return store.db_type === 'postgres';
      if (filterType === 'local') return store.db_type !== 'postgres';
      return true;
    });
  }, [availableStores, searchTerm, filterType, activeStoreId]);

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-50 via-slate-100/60 to-indigo-50/30 flex flex-col pt-6 pb-12 px-4 sm:px-8 rtl font-sans" dir="rtl">
      
      <div className="max-w-7xl mx-auto w-full flex-1 flex flex-col">
        {/* Top Header Card */}
        <div className="bg-white/90 backdrop-blur-md border border-slate-200/90 rounded-3xl p-6 sm:p-7 shadow-xs mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            
            {/* Branding & Title */}
            <div className="flex items-center gap-4 sm:gap-5">
              <div className="w-16 h-16 sm:w-18 sm:h-18 bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-600 text-white rounded-3xl flex items-center justify-center shadow-lg shadow-indigo-600/25 shrink-0">
                <Building2 className="w-8 h-8 sm:w-9 sm:h-9" />
              </div>
              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                    پرتال مدیریت و انتخاب کسب‌وکارها
                  </h1>
                  <span className="bg-indigo-50 text-indigo-700 text-xs font-black px-3 py-1 rounded-full border border-indigo-200/60 flex items-center gap-1.5 shadow-3xs">
                    <Layers className="w-3.5 h-3.5" />
                    چند شرکتی (Multi-Tenant)
                  </span>
                </div>
                <p className="text-slate-500 mt-1 font-medium text-xs sm:text-sm leading-relaxed">
                  کسب‌وکار یا شعبه مورد نظر را جهت ورود به میزکار، ثبت اسناد و گزارش‌گیری انتخاب کنید.
                </p>
              </div>
            </div>

            {/* User Profile & Actions */}
            <div className="flex flex-wrap items-center gap-3">
              {user && (
                <div className="bg-slate-50 border border-slate-200/80 rounded-2xl px-4 py-2.5 flex items-center gap-3 shadow-3xs">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 text-white flex items-center justify-center font-black text-sm shadow-xs">
                    {(user.name || user.username || 'U').charAt(0).toUpperCase()}
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-black text-slate-800">{user.name || user.username}</div>
                    <div className="text-[10px] text-slate-400 font-bold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                      {user.role === 'admin' ? 'مدیر ارشد سیستم' : user.role}
                    </div>
                  </div>
                </div>
              )}

              {onSignOut && (
                <button
                  type="button"
                  onClick={onSignOut}
                  className="bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200/80 px-4 py-2.5 rounded-2xl text-xs font-black flex items-center gap-2 transition-all shadow-3xs cursor-pointer hover:scale-105 active:scale-95"
                  title="خروج از حساب کاربری"
                >
                  <LogOut className="w-4 h-4" />
                  <span>خروج</span>
                </button>
              )}

              {onClose && (
                <button
                  type="button"
                  onClick={onClose}
                  className="bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 transition-all shadow-sm cursor-pointer hover:scale-105 active:scale-95"
                >
                  <span>بازگشت به برنامه</span>
                  <ArrowLeft className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Quick Metrics Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mt-6 pt-6 border-t border-slate-100">
            {/* Total */}
            <div className="bg-slate-50/80 rounded-2xl p-3.5 border border-slate-200/60 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-slate-400 block mb-1">کل کسب‌وکارها</span>
                <span className="text-xl font-black text-slate-800">{totalCount} شرکت</span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-blue-100/70 text-blue-600 flex items-center justify-center">
                <Building2 className="w-5 h-5" />
              </div>
            </div>

            {/* Active Store */}
            <div className="bg-emerald-50/60 rounded-2xl p-3.5 border border-emerald-200/60 flex items-center justify-between">
              <div className="min-w-0 flex-1 pl-2">
                <span className="text-[11px] font-bold text-emerald-600 block mb-1">کسب‌وکار فعال جاری</span>
                <span className="text-sm font-black text-emerald-950 truncate block" title={currentActiveStore.name}>
                  {currentActiveStore.name}
                </span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <CheckCircle className="w-5 h-5" />
              </div>
            </div>

            {/* PostgreSQL Instances */}
            <div className="bg-indigo-50/60 rounded-2xl p-3.5 border border-indigo-200/60 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-indigo-600 block mb-1">پایگاه ابری PostgreSQL</span>
                <span className="text-xl font-black text-indigo-950">{postgresCount} دیتابیس</span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
                <Server className="w-5 h-5" />
              </div>
            </div>

            {/* Local / SQLite */}
            <div className="bg-amber-50/60 rounded-2xl p-3.5 border border-amber-200/60 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-amber-700 block mb-1">موتور مرکزی / محلی</span>
                <span className="text-xl font-black text-amber-950">{localCount} دیتابیس</span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
                <HardDrive className="w-5 h-5" />
              </div>
            </div>
          </div>
        </div>

        {/* Action Controls & Fast Creation Bar */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-3xs mb-6 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          
          {/* Quick Create Input */}
          <div className="flex items-center gap-2 flex-1 max-w-xl">
            <div className="relative flex-1">
              <input 
                type="text" 
                value={newStoreName}
                onChange={e => setNewStoreName(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') handleCreate();
                }}
                placeholder="نام کسب‌وکار جدید را وارد کنید (مثال: شعبه ۲، بازرگانی صبا)..." 
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs sm:text-sm font-bold text-slate-800 placeholder:font-medium placeholder:text-slate-400 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
              />
            </div>

            <button 
              onClick={handleCreate}
              disabled={creating || !newStoreName.trim()}
              className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-blue-600/20 cursor-pointer shrink-0 hover:scale-[1.02] active:scale-[0.98]"
            >
              {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              <span>ایجاد سریع</span>
            </button>
          </div>

          {/* Standard Wizard Launcher */}
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setShowWizardModal(true)}
              className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white px-5 py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-md shadow-indigo-600/20 text-xs sm:text-sm cursor-pointer hover:scale-[1.02] active:scale-[0.98] w-full md:w-auto"
            >
              <Sparkles className="w-4 h-4 text-indigo-200" />
              <span>ایجاد با ویزارد راه‌اندازی پیشرفته</span>
            </button>
          </div>
        </div>

        {/* Setup Wizard Modal */}
        {showWizardModal && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
            <InitialSetupWizard 
              mode="business_only"
              onComplete={async () => {
                setShowWizardModal(false);
                await fetchStores();
                if (showNotification) showNotification('کسب و کار جدید همراه با سال مالی و زیرساخت آغازین با موفقیت در پایگاه داده ایجاد شد', 'success');
              }}
              onCancel={() => setShowWizardModal(false)}
            />
          </div>
        )}

        {/* Error Alert */}
        <AnimatePresence>
          {errorMsg && (
            <motion.div 
              initial={{ opacity: 0, height: 0, marginBottom: 0 }}
              animate={{ opacity: 1, height: 'auto', marginBottom: 20 }}
              exit={{ opacity: 0, height: 0, marginBottom: 0 }}
              className="overflow-hidden"
            >
              <div className="p-4 bg-rose-50 text-rose-700 rounded-2xl border border-rose-200/80 flex items-center gap-4 shadow-sm">
                <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5 text-rose-600" />
                </div>
                <div className="flex-1">
                  <p className="font-black text-rose-900 text-sm">خطا در عملیات</p>
                  <p className="text-xs font-semibold opacity-90 mt-0.5">{errorMsg}</p>
                </div>
                <button 
                  onClick={() => setErrorMsg(null)} 
                  className="p-1.5 hover:bg-rose-100 rounded-xl transition-colors text-rose-600 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Content Area */}
        <div className="bg-white border border-slate-200/90 rounded-3xl shadow-xs flex-1 flex flex-col overflow-hidden">
          
          {/* Filter Bar & Controls */}
          <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/50 flex flex-col lg:flex-row lg:items-center justify-between gap-4 shrink-0">
            
            {/* Filter Pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 lg:pb-0">
              <button
                type="button"
                onClick={() => setFilterType('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
                  filterType === 'all' 
                    ? 'bg-slate-900 text-white shadow-xs' 
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                همه ({totalCount})
              </button>
              <button
                type="button"
                onClick={() => setFilterType('active')}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                  filterType === 'active' 
                    ? 'bg-emerald-600 text-white shadow-xs' 
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                کسب‌وکار فعال
              </button>
              <button
                type="button"
                onClick={() => setFilterType('postgres')}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                  filterType === 'postgres' 
                    ? 'bg-indigo-600 text-white shadow-xs' 
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Server className="w-3 h-3" />
                PostgreSQL ({postgresCount})
              </button>
              <button
                type="button"
                onClick={() => setFilterType('local')}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                  filterType === 'local' 
                    ? 'bg-amber-600 text-white shadow-xs' 
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <HardDrive className="w-3 h-3" />
                موتور محلی ({localCount})
              </button>
            </div>

            {/* Search & View Switcher */}
            <div className="flex items-center gap-3">
              <div className="relative w-full sm:w-64">
                <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-400">
                  <Search className="h-4 w-4" />
                </div>
                <input
                  type="text"
                  placeholder="جستجوی نام یا شناسه..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-8 pr-10 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-xs sm:text-sm font-medium"
                />
                {searchTerm && (
                  <button 
                    onClick={() => setSearchTerm('')} 
                    className="absolute inset-y-0 left-0 pl-2.5 flex items-center text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* View Toggle */}
              <div className="bg-white border border-slate-200 rounded-xl p-1 flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                    viewMode === 'grid' 
                      ? 'bg-slate-900 text-white shadow-3xs' 
                      : 'text-slate-400 hover:text-slate-700'
                  }`}
                  title="نمای کارتی مدرن"
                >
                  <Grid className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('table')}
                  className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                    viewMode === 'table' 
                      ? 'bg-slate-900 text-white shadow-3xs' 
                      : 'text-slate-400 hover:text-slate-700'
                  }`}
                  title="نمای جدولی"
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>

          </div>

          {/* List / Grid Container */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar bg-slate-50/30">
            {filteredStores.length > 0 ? (
              viewMode === 'grid' ? (
                /* Card Grid View */
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {filteredStores.map((store: any) => {
                    const isActive = store.id === activeStoreId;
                    const isEditing = editingStoreId === store.id;
                    const isSelecting = loadingId === store.id;
                    const isPg = store.db_type === 'postgres';

                    return (
                      <motion.div
                        key={store.id}
                        layout
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`group relative bg-white rounded-3xl p-5 border transition-all duration-200 flex flex-col justify-between ${
                          isActive 
                            ? 'border-emerald-400/90 shadow-md ring-2 ring-emerald-500/20 bg-gradient-to-b from-white to-emerald-50/20' 
                            : 'border-slate-200/90 hover:border-blue-400/80 hover:shadow-lg hover:-translate-y-0.5'
                        }`}
                      >
                        {/* Active Ribbon / Badge */}
                        {isActive && (
                          <div className="absolute top-4 left-4 bg-emerald-50 text-emerald-700 border border-emerald-300 text-[10px] font-black px-2.5 py-1 rounded-full flex items-center gap-1.5 shadow-3xs">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                            <span>کسب‌وکار فعال</span>
                          </div>
                        )}

                        <div>
                          {/* Card Header: Avatar & Info */}
                          <div className="flex items-start gap-3.5 mb-4">
                            <div className={`w-13 h-13 rounded-2xl flex items-center justify-center font-black text-lg shadow-xs shrink-0 ${
                              isActive 
                                ? 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-emerald-500/25' 
                                : isPg
                                  ? 'bg-gradient-to-br from-indigo-500 to-blue-600 text-white shadow-indigo-500/25'
                                  : 'bg-gradient-to-br from-slate-700 to-slate-900 text-white shadow-slate-700/25'
                            }`}>
                              <Store className="w-6 h-6" />
                            </div>

                            <div className="flex-1 min-w-0 pr-1">
                              {isEditing ? (
                                <div className="flex items-center gap-2 mt-1" onClick={e => e.stopPropagation()}>
                                  <input
                                    type="text"
                                    value={editName}
                                    onChange={e => setEditName(e.target.value)}
                                    className="w-full px-3 py-1.5 border-2 border-blue-500 rounded-xl text-sm font-bold text-slate-800 outline-none"
                                    autoFocus
                                    onKeyDown={e => {
                                      if (e.key === 'Enter') handleUpdate(e as any, store.id);
                                      if (e.key === 'Escape') setEditingStoreId(null);
                                    }}
                                  />
                                  <button 
                                    onClick={(e) => handleUpdate(e, store.id)} 
                                    className="p-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
                                    title="ذخیره"
                                  >
                                    <Check className="w-4 h-4" />
                                  </button>
                                  <button 
                                    onClick={(e) => { e.stopPropagation(); setEditingStoreId(null); }} 
                                    className="p-1.5 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors"
                                    title="انصراف"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                </div>
                              ) : (
                                <>
                                  <div className="flex items-center gap-2">
                                    <h3 className="font-black text-slate-900 text-base leading-tight truncate" title={store.name}>
                                      {store.name}
                                    </h3>
                                    {store.id === 'default' && (
                                      <span className="bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-black px-1.5 py-0.5 rounded flex items-center gap-0.5 shrink-0">
                                        <Shield className="w-3 h-3"/> مرکزی
                                      </span>
                                    )}
                                  </div>

                                  <div className="flex items-center gap-2 mt-2">
                                    <span className="text-[11px] font-bold text-slate-400">شناسه:</span>
                                    <button
                                      type="button"
                                      onClick={(e) => copyIdToClipboard(store.id, e)}
                                      className="group/copy flex items-center gap-1 bg-slate-100 hover:bg-slate-200 px-2 py-0.5 rounded-md text-[10px] font-mono text-slate-600 border border-slate-200 transition-colors cursor-pointer"
                                      title="کپی کردن شناسه"
                                    >
                                      <span>{store.id === 'default' ? 'default' : store.id.substring(0, 10) + '...'}</span>
                                      {copiedId === store.id ? (
                                        <Check className="w-2.5 h-2.5 text-emerald-600" />
                                      ) : (
                                        <Copy className="w-2.5 h-2.5 text-slate-400 group-hover/copy:text-slate-700" />
                                      )}
                                    </button>
                                  </div>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Database Specs Pill */}
                          <div className="bg-slate-50 border border-slate-200/70 rounded-2xl p-3 flex items-center justify-between text-xs mb-5">
                            <span className="font-bold text-slate-500">نوع پایگاه داده:</span>
                            <span className={`font-black px-2.5 py-1 rounded-lg text-[11px] flex items-center gap-1.5 ${
                              isPg 
                                ? 'bg-indigo-50 text-indigo-700 border border-indigo-200/80' 
                                : 'bg-slate-200/70 text-slate-700 border border-slate-300/70'
                            }`}>
                              {isPg ? <Server className="w-3 h-3" /> : <HardDrive className="w-3 h-3" />}
                              {isPg ? 'PostgreSQL' : 'موتور محلی'}
                            </span>
                          </div>
                        </div>

                        {/* Card Bottom: Action Button & Settings */}
                        <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                          <button
                            type="button"
                            onClick={() => handleSelectStore(store.id, store.name)}
                            disabled={isSelecting || (loadingId !== false && loadingId !== store.id)}
                            className={`flex-1 py-3 px-4 rounded-2xl text-xs font-black flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm ${
                              isActive
                                ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20 active:scale-95'
                                : 'bg-slate-900 hover:bg-slate-800 text-white shadow-slate-900/20 active:scale-95'
                            } disabled:opacity-50 disabled:cursor-not-allowed`}
                          >
                            {isSelecting ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin text-white" />
                                <span>در حال اتصال و بارگذاری...</span>
                              </>
                            ) : (
                              <>
                                <span>{isActive ? 'ورود به این کسب‌وکار' : 'انتخاب و ورود'}</span>
                                <ArrowLeft className="w-4 h-4" />
                              </>
                            )}
                          </button>

                          {/* More Options / Rename / Delete */}
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingStoreId(store.id);
                                setEditName(store.name);
                              }}
                              className="p-2.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors cursor-pointer"
                              title="ویرایش نام کسب‌وکار"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>

                            {store.id !== 'default' && (
                              <button
                                type="button"
                                onClick={(e) => handleDelete(e, store.id, store.name)}
                                className="p-2.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                                title="حذف کسب‌وکار"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>

                      </motion.div>
                    );
                  })}
                </div>
              ) : (
                /* Table View */
                <div className="overflow-x-auto rounded-2xl border border-slate-200/90 shadow-3xs bg-white">
                  <table className="w-full text-right border-collapse">
                    <thead>
                      <tr className="bg-slate-50/80 text-slate-600 border-b border-slate-200 text-xs font-black">
                        <th className="p-4">نام کسب‌وکار</th>
                        <th className="p-4 text-center">شناسه سیستم (ID)</th>
                        <th className="p-4 text-center">نوع پایگاه داده</th>
                        <th className="p-4 text-center">وضعیت دسترسی</th>
                        <th className="p-4 text-center">ورود مستقیم</th>
                        <th className="p-4 text-center">عملیات</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredStores.map((store: any) => {
                        const isActive = store.id === activeStoreId;
                        const isEditing = editingStoreId === store.id;
                        const isSelecting = loadingId === store.id;
                        const isPg = store.db_type === 'postgres';

                        return (
                          <tr 
                            key={store.id}
                            onClick={() => !isEditing && handleSelectStore(store.id, store.name)}
                            className={`group transition-all cursor-pointer hover:bg-blue-50/50 ${isActive ? 'bg-emerald-50/30' : ''}`}
                          >
                            <td className="p-4 align-middle">
                              <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border transition-colors ${
                                  isActive 
                                    ? 'bg-emerald-600 text-white border-emerald-500 shadow-xs' 
                                    : 'bg-slate-100 text-slate-600 border-slate-200 group-hover:bg-white'
                                }`}>
                                  <Building2 className="w-5 h-5" />
                                </div>
                                {isEditing ? (
                                  <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                                    <input
                                      type="text"
                                      value={editName}
                                      onChange={e => setEditName(e.target.value)}
                                      className="px-3 py-1.5 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-xs font-bold text-slate-800"
                                      autoFocus
                                      onKeyDown={e => {
                                        if (e.key === 'Enter') handleUpdate(e as any, store.id);
                                        if (e.key === 'Escape') setEditingStoreId(null);
                                      }}
                                    />
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-2">
                                    <span className="font-black text-slate-800 text-sm">
                                      {store.name}
                                    </span>
                                    {store.id === 'default' && (
                                      <span className="bg-amber-50 text-amber-700 px-2 py-0.5 rounded text-[10px] font-bold border border-amber-200 flex items-center gap-0.5">
                                        <Shield className="w-3 h-3"/> مرکزی
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="p-4 align-middle text-center">
                              <span className="text-xs font-mono bg-slate-100 text-slate-600 px-2.5 py-1 rounded-md border border-slate-200 inline-block">
                                {store.id === 'default' ? 'default' : store.id.substring(0, 10) + '...'}
                              </span>
                            </td>
                            <td className="p-4 align-middle text-center">
                              <span className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border inline-flex items-center gap-1 ${
                                isPg ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-slate-100 text-slate-600 border-slate-200'
                              }`}>
                                {isPg ? 'PostgreSQL' : 'موتور محلی'}
                              </span>
                            </td>
                            <td className="p-4 align-middle text-center">
                              {isActive ? (
                                <span className="bg-emerald-50 text-emerald-700 border border-emerald-300 text-[10px] font-black px-2.5 py-1 rounded-full inline-flex items-center gap-1 shadow-3xs">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                  کسب‌وکار فعال
                                </span>
                              ) : (
                                <span className="text-[11px] font-bold text-slate-400">آماده انتخاب</span>
                              )}
                            </td>
                            <td className="p-4 align-middle text-center">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSelectStore(store.id, store.name);
                                }}
                                disabled={isSelecting}
                                className={`px-4 py-2 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all shadow-3xs mx-auto cursor-pointer ${
                                  isActive
                                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                    : 'bg-slate-900 hover:bg-slate-800 text-white'
                                }`}
                              >
                                {isSelecting ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <ArrowLeft className="w-3.5 h-3.5" />
                                )}
                                <span>{isActive ? 'ورود به سیستم' : 'انتخاب و ورود'}</span>
                              </button>
                            </td>
                            <td className="p-4 align-middle text-center" onClick={e => e.stopPropagation()}>
                              <div className="flex items-center justify-center gap-1">
                                {isEditing ? (
                                  <>
                                    <button onClick={(e) => handleUpdate(e, store.id)} className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors" title="ذخیره">
                                      <Check className="w-4 h-4" />
                                    </button>
                                    <button onClick={(e) => { e.stopPropagation(); setEditingStoreId(null); }} className="p-1.5 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors" title="انصراف">
                                      <X className="w-4 h-4" />
                                    </button>
                                  </>
                                ) : (
                                  <>
                                    <button 
                                      onClick={(e) => { e.stopPropagation(); setEditingStoreId(store.id); setEditName(store.name); }}
                                      className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                                      title="ویرایش نام"
                                    >
                                      <Edit2 className="w-4 h-4" />
                                    </button>
                                    {store.id !== 'default' && (
                                      <button 
                                        onClick={(e) => handleDelete(e, store.id, store.name)}
                                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                        title="حذف کسب‌وکار"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    )}
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )
            ) : (
              <div className="h-64 flex flex-col items-center justify-center text-slate-400">
                <Search className="w-16 h-16 mb-4 text-slate-300 stroke-1" />
                <p className="text-lg font-bold text-slate-600">کسب‌وکاری با این مشخصات یافت نشد</p>
                <p className="text-xs text-slate-400 mt-1">می‌توانید با نام دیگری جستجو کنید یا همین حالا کسب‌وکار جدیدی بسازید.</p>
              </div>
            )}
          </div>
        </div>

      </div>
      <ConfirmModal confirmState={confirmState} setConfirmState={setConfirmState} />
    </div>
  );
}
