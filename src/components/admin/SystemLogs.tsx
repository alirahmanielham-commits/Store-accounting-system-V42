import React, { useState, useEffect, useMemo } from 'react';
import { 
  Activity, Search, Filter, Clock, User as UserIcon, Globe, 
  Laptop, Smartphone, Shield, Download, RefreshCw, Eye, X, 
  ChevronDown, AlertTriangle, CheckCircle, FileText, Calendar, 
  Layers, Database, ArrowUpDown, Copy, Check, Info, ShieldAlert,
  LogIn, LogOut, Edit, Trash2, PlusCircle, Monitor
} from 'lucide-react';
import { getSystemLogs } from '../../services/dataService';
import { SystemLog } from '../../types';
import { 
  ENTITY_NAMES_MAP, 
  ACTION_NAMES_MAP, 
  formatAuditDateTime, 
  formatRelativeTime 
} from '../../utils/auditLogger';
import { USER_ROLE_LABELS } from '../../utils/permissionUtils';
import { motion, AnimatePresence } from 'motion/react';

export default function SystemLogs() {
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterAction, setFilterAction] = useState('ALL');
  const [filterEntity, setFilterEntity] = useState('ALL');
  const [filterUser, setFilterUser] = useState('ALL');
  const [dateRange, setDateRange] = useState<'ALL' | 'TODAY' | '7DAYS' | '30DAYS'>('ALL');
  
  // Selected log for detailed modal
  const [selectedLog, setSelectedLog] = useState<SystemLog | null>(null);
  const [modalTab, setModalTab] = useState<'diff' | 'client' | 'raw'>('diff');
  const [copiedRaw, setCopiedRaw] = useState(false);

  // Pagination / Page size
  const [displayLimit, setDisplayLimit] = useState(50);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const data = await getSystemLogs({
        action: filterAction !== 'ALL' ? filterAction : undefined,
        entityType: filterEntity !== 'ALL' ? filterEntity : undefined,
        userId: filterUser !== 'ALL' ? filterUser : undefined,
        search: searchQuery.trim() || undefined,
        limit: 1000
      });
      setLogs(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching logs:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [filterAction, filterEntity, filterUser]);

  // Extract unique users for the user filter dropdown
  const uniqueUsers = useMemo(() => {
    const map = new Map<string, { username: string; name?: string }>();
    logs.forEach(l => {
      const uKey = l.username || String(l.userId || '');
      if (uKey && !map.has(uKey)) {
        map.set(uKey, {
          username: uKey,
          name: l.userName || l.username || uKey
        });
      }
    });
    return Array.from(map.values());
  }, [logs]);

  // Extract unique entities for filter dropdown
  const uniqueEntities = useMemo(() => {
    const set = new Set<string>();
    logs.forEach(l => {
      if (l.entityType) set.add(l.entityType);
    });
    return Array.from(set);
  }, [logs]);

  // Client-side filtering for search & date range
  const filteredLogs = useMemo(() => {
    const now = Date.now();
    const oneDayMs = 24 * 60 * 60 * 1000;

    return logs.filter(log => {
      // Date filter
      if (dateRange === 'TODAY') {
        const startOfToday = new Date().setHours(0, 0, 0, 0);
        if (log.timestamp < startOfToday) return false;
      } else if (dateRange === '7DAYS') {
        if (now - log.timestamp > 7 * oneDayMs) return false;
      } else if (dateRange === '30DAYS') {
        if (now - log.timestamp > 30 * oneDayMs) return false;
      }

      // Keyword search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchDetails = log.details?.toLowerCase().includes(q);
        const matchEntity = log.entityType?.toLowerCase().includes(q) || (ENTITY_NAMES_MAP[log.entityType]?.toLowerCase().includes(q));
        const matchUser = log.username?.toLowerCase().includes(q) || log.userName?.toLowerCase().includes(q);
        const matchBrowser = log.browser?.toLowerCase().includes(q) || log.os?.toLowerCase().includes(q);
        const matchIp = log.ip?.includes(q);
        const matchDiff = log.diffSummary?.toLowerCase().includes(q);
        const matchAction = log.action?.toLowerCase().includes(q);

        if (!matchDetails && !matchEntity && !matchUser && !matchBrowser && !matchIp && !matchDiff && !matchAction) {
          return false;
        }
      }

      return true;
    });
  }, [logs, searchQuery, dateRange]);

  // Summary statistics
  const stats = useMemo(() => {
    const now = Date.now();
    const startOfToday = new Date().setHours(0, 0, 0, 0);

    let total = logs.length;
    let today = 0;
    let logins = 0;
    let criticalChanges = 0;

    logs.forEach(l => {
      if (l.timestamp >= startOfToday) today++;
      if (l.action === 'LOGIN' || l.action === 'LOGOUT') logins++;
      if (['UPDATE', 'EDIT', 'DELETE', 'STATUS_CHANGE'].some(a => l.action.startsWith(a))) {
        criticalChanges++;
      }
    });

    return { total, today, logins, criticalChanges };
  }, [logs]);

  // Action badge helper
  const getActionBadge = (action: string) => {
    const def = ACTION_NAMES_MAP[action];
    if (def) {
      return (
        <span className={`px-2.5 py-1 rounded-lg text-[11px] font-black border inline-flex items-center gap-1 ${def.color}`}>
          {action.startsWith('CREATE') || action.startsWith('ADD') ? <PlusCircle className="w-3 h-3" /> :
           action.startsWith('UPDATE') || action.startsWith('EDIT') ? <Edit className="w-3 h-3" /> :
           action.startsWith('DELETE') ? <Trash2 className="w-3 h-3" /> :
           action === 'LOGIN' ? <LogIn className="w-3 h-3" /> :
           action === 'LOGOUT' ? <LogOut className="w-3 h-3" /> :
           <Activity className="w-3 h-3" />}
          {def.label}
        </span>
      );
    }

    if (action.startsWith('CREATE') || action.startsWith('ADD')) {
      return <span className="px-2.5 py-1 rounded-lg text-[11px] font-black border bg-emerald-50 text-emerald-700 border-emerald-200 inline-flex items-center gap-1"><PlusCircle className="w-3 h-3" /> ثبت جدید</span>;
    }
    if (action.startsWith('UPDATE') || action.startsWith('EDIT')) {
      return <span className="px-2.5 py-1 rounded-lg text-[11px] font-black border bg-sky-50 text-sky-700 border-sky-200 inline-flex items-center gap-1"><Edit className="w-3 h-3" /> ویرایش</span>;
    }
    if (action.startsWith('DELETE')) {
      return <span className="px-2.5 py-1 rounded-lg text-[11px] font-black border bg-rose-50 text-rose-700 border-rose-200 inline-flex items-center gap-1"><Trash2 className="w-3 h-3" /> حذف</span>;
    }

    return (
      <span className="px-2.5 py-1 rounded-lg text-[11px] font-black border bg-slate-100 text-slate-700 border-slate-200">
        {action}
      </span>
    );
  };

  // Export filtered logs to CSV
  const handleExportCSV = () => {
    if (filteredLogs.length === 0) {
      alert('لاگی برای خروجی وجود ندارد.');
      return;
    }

    const headers = [
      'شناسه',
      'تاریخ و زمان',
      'کاربر',
      'نام کاربر',
      'نقش کاربر',
      'نوع فعالیت',
      'بخش سیستم',
      'شرح عملیات',
      'خلاصه تغییرات',
      'مرورگر',
      'سیستم‌عامل',
      'دستگاه',
      'آدرس IP'
    ];

    const rows = filteredLogs.map(l => [
      l.id,
      formatAuditDateTime(l.timestamp),
      l.username || l.userId || 'system',
      l.userName || 'سیستم',
      USER_ROLE_LABELS[l.userRole as any] || l.userRole || 'نامشخص',
      ACTION_NAMES_MAP[l.action]?.label || l.action,
      ENTITY_NAMES_MAP[l.entityType] || l.entityType,
      `"${(l.details || '').replace(/"/g, '""')}"`,
      `"${(l.diffSummary || '').replace(/"/g, '""')}"`,
      l.browser || 'وب',
      l.os || 'نامشخص',
      l.device || 'رایانه',
      l.ip || '127.0.0.1'
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `system_logs_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Copy raw JSON to clipboard
  const handleCopyRaw = () => {
    if (!selectedLog) return;
    navigator.clipboard.writeText(JSON.stringify(selectedLog, null, 2));
    setCopiedRaw(true);
    setTimeout(() => setCopiedRaw(false), 2500);
  };

  // Helper to parse changes object
  const parsedChanges = useMemo(() => {
    if (!selectedLog) return null;
    if (selectedLog.changes) {
      try {
        const obj = typeof selectedLog.changes === 'string' ? JSON.parse(selectedLog.changes) : selectedLog.changes;
        return obj;
      } catch (_) {}
    }
    if (selectedLog.oldData && selectedLog.newData) {
      return { old: selectedLog.oldData, new: selectedLog.newData };
    }
    return null;
  }, [selectedLog]);

  return (
    <div className="space-y-6 pb-12" dir="rtl">
      {/* Top Banner & Header */}
      <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-slate-200/80">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-sm shrink-0">
              <Activity className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">لاگ و تاریخچه وقایع سیستم</h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-100 text-indigo-800">
                  حسابرسی جامع (Audit Log)
                </span>
              </div>
              <p className="text-xs md:text-sm font-bold text-slate-500 mt-1.5 leading-relaxed">
                رهگیری کامل و دقیق کلیه فعالیت‌ها، ورود و خروج‌ها، ثبت و ویرایش اسناد، مرورگر و آی‌پی کاربران
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0 flex-wrap">
            <button
              onClick={fetchLogs}
              disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs shadow-sm transition-all active:scale-95 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-indigo-600' : 'text-slate-500'}`} />
              <span>بروزرسانی</span>
            </button>

            <button
              onClick={handleExportCSV}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition-all active:scale-95"
            >
              <Download className="w-4 h-4" />
              <span>خروجی اکسل (CSV)</span>
            </button>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-100">
          <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-200/60">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-bold">کل وقایع ثبت‌شده</span>
              <Layers className="w-4 h-4 text-indigo-600" />
            </div>
            <div className="text-xl md:text-2xl font-black text-slate-800">
              {stats.total.toLocaleString('fa-IR')}
            </div>
            <div className="text-[11px] font-bold text-slate-400 mt-1">تراکنش در پایگاه داده</div>
          </div>

          <div className="bg-emerald-50/50 rounded-2xl p-4 border border-emerald-100/70">
            <div className="flex items-center justify-between text-emerald-700 mb-2">
              <span className="text-xs font-bold">فعالیت‌های امروز</span>
              <Calendar className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-xl md:text-2xl font-black text-emerald-800">
              {stats.today.toLocaleString('fa-IR')}
            </div>
            <div className="text-[11px] font-bold text-emerald-600/80 mt-1">از ساعت ۰۰:۰۰ بامداد امروز</div>
          </div>

          <div className="bg-indigo-50/50 rounded-2xl p-4 border border-indigo-100/70">
            <div className="flex items-center justify-between text-indigo-700 mb-2">
              <span className="text-xs font-bold">ورود و خروج‌ها</span>
              <LogIn className="w-4 h-4 text-indigo-600" />
            </div>
            <div className="text-xl md:text-2xl font-black text-indigo-800">
              {stats.logins.toLocaleString('fa-IR')}
            </div>
            <div className="text-[11px] font-bold text-indigo-600/80 mt-1">نشست‌های احراز هویت</div>
          </div>

          <div className="bg-amber-50/50 rounded-2xl p-4 border border-amber-100/70">
            <div className="flex items-center justify-between text-amber-700 mb-2">
              <span className="text-xs font-bold">تغییرات و ویرایش‌ها</span>
              <ShieldAlert className="w-4 h-4 text-amber-600" />
            </div>
            <div className="text-xl md:text-2xl font-black text-amber-800">
              {stats.criticalChanges.toLocaleString('fa-IR')}
            </div>
            <div className="text-[11px] font-bold text-amber-600/80 mt-1">ویرایش، حذف و تغییر وضعیت</div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-200/80 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Keyword Search */}
          <div className="relative lg:col-span-2">
            <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="جستجو در شرح، نام کاربر، شناسه، آی‌پی، تغییرات..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-2.5 pr-10 pl-4 text-xs font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-400"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Action Filter */}
          <div>
            <select
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-2.5 px-3 text-xs font-bold text-slate-700 outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 cursor-pointer"
            >
              <option value="ALL">همه عملیات‌ها</option>
              <option value="CREATE">ثبت‌های جدید (CREATE/ADD)</option>
              <option value="UPDATE">ویرایش‌ها (UPDATE/EDIT)</option>
              <option value="DELETE">حذف‌ها (DELETE)</option>
              <option value="LOGIN">ورود به سیستم (LOGIN)</option>
              <option value="LOGOUT">خروج از سیستم (LOGOUT)</option>
              <option value="SESSION_TIMEOUT">انقضای عدم فعالیت</option>
              <option value="STATUS_CHANGE">تغییر وضعیت</option>
            </select>
          </div>

          {/* User Filter */}
          <div>
            <select
              value={filterUser}
              onChange={(e) => setFilterUser(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-2.5 px-3 text-xs font-bold text-slate-700 outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 cursor-pointer"
            >
              <option value="ALL">همه کاربران</option>
              {uniqueUsers.map(u => (
                <option key={u.username} value={u.username}>
                  {u.name} ({u.username})
                </option>
              ))}
            </select>
          </div>

          {/* Entity Filter */}
          <div>
            <select
              value={filterEntity}
              onChange={(e) => setFilterEntity(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-2.5 px-3 text-xs font-bold text-slate-700 outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 cursor-pointer"
            >
              <option value="ALL">همه بخش‌های سیستم</option>
              {uniqueEntities.map(ent => (
                <option key={ent} value={ent}>
                  {ENTITY_NAMES_MAP[ent] || ent}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Date Range Quick Tabs & Result Counter */}
        <div className="flex items-center justify-between flex-wrap gap-3 pt-2 text-xs border-t border-slate-100">
          <div className="flex items-center gap-1.5 font-bold">
            <span className="text-slate-400">بازه زمانی:</span>
            <button
              onClick={() => setDateRange('ALL')}
              className={`px-3 py-1 rounded-xl transition-all ${dateRange === 'ALL' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              همه
            </button>
            <button
              onClick={() => setDateRange('TODAY')}
              className={`px-3 py-1 rounded-xl transition-all ${dateRange === 'TODAY' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              امروز
            </button>
            <button
              onClick={() => setDateRange('7DAYS')}
              className={`px-3 py-1 rounded-xl transition-all ${dateRange === '7DAYS' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              ۷ روز اخیر
            </button>
            <button
              onClick={() => setDateRange('30DAYS')}
              className={`px-3 py-1 rounded-xl transition-all ${dateRange === '30DAYS' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              ۳۰ روز اخیر
            </button>
          </div>

          <div className="text-slate-500 font-bold">
            نمایش <span className="text-slate-900 font-black">{Math.min(filteredLogs.length, displayLimit).toLocaleString('fa-IR')}</span> از{' '}
            <span className="text-slate-900 font-black">{filteredLogs.length.toLocaleString('fa-IR')}</span> واقعه یافت‌شده
          </div>
        </div>
      </div>

      {/* Main Table View */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-200/80 overflow-hidden">
        {loading ? (
          <div className="p-16 text-center">
            <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <div className="text-slate-700 font-bold text-sm">در حال دریافت و تحلیل لاگ‌های سیستم...</div>
            <div className="text-slate-400 font-medium text-xs mt-1">لطفاً شکیبا باشید</div>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-16 text-center flex flex-col items-center justify-center">
            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
              <Filter className="w-8 h-8" />
            </div>
            <div className="text-slate-700 font-bold text-base">هیچ واقعه‌ای با فیلترهای انتخابی یافت نشد</div>
            <p className="text-slate-400 text-xs font-bold mt-1">لطفاً عبارت جستجو یا فیلترهای اعمال‌شده را تغییر دهید.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="bg-slate-50/80 text-slate-500 border-b border-slate-200/70 font-black">
                  <th className="py-4 px-4 whitespace-nowrap">تاریخ و زمان</th>
                  <th className="py-4 px-4 whitespace-nowrap">کاربر انجام‌دهنده</th>
                  <th className="py-4 px-4 whitespace-nowrap">نوع فعالیت</th>
                  <th className="py-4 px-4 whitespace-nowrap">بخش سیستم</th>
                  <th className="py-4 px-4">شرح دقیق فعالیت</th>
                  <th className="py-4 px-4 whitespace-nowrap">مرورگر و کلاینت</th>
                  <th className="py-4 px-4 text-center whitespace-nowrap">جزئیات تغییرات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLogs.slice(0, displayLimit).map((log) => {
                  const roleLabel = USER_ROLE_LABELS[log.userRole as any] || (log.userRole === 'admin' ? 'مدیر کل' : log.userRole || 'کاربر');
                  const entityName = ENTITY_NAMES_MAP[log.entityType] || log.entityType;
                  const hasDetails = Boolean(log.changes || log.diffSummary || log.oldData || log.newData);

                  return (
                    <tr 
                      key={log.id} 
                      className="hover:bg-indigo-50/30 transition-colors group cursor-pointer"
                      onClick={() => setSelectedLog(log)}
                    >
                      {/* Date & Time */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-center gap-1.5 font-black text-slate-800 text-[11px]" dir="ltr">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            {formatAuditDateTime(log.timestamp)}
                          </div>
                          <span className="text-[10px] font-bold text-indigo-600">
                            {formatRelativeTime(log.timestamp)}
                          </span>
                        </div>
                      </td>

                      {/* Actor / User */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 font-black text-xs shrink-0 shadow-sm">
                            {log.userName?.charAt(0) || log.username?.charAt(0) || 'U'}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="font-black text-slate-800 truncate max-w-[140px]">
                              {log.userName || log.username || 'سیستم'}
                            </span>
                            <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400">
                              <span>@{log.username || 'system'}</span>
                              <span>•</span>
                              <span className="text-slate-500 font-extrabold">{roleLabel}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Activity Action Badge */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {getActionBadge(log.action)}
                      </td>

                      {/* Entity / Module */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-black text-[11px] border border-slate-200/80 inline-flex items-center gap-1.5">
                          <Database className="w-3 h-3 text-slate-400" />
                          {entityName}
                        </span>
                      </td>

                      {/* Activity Description */}
                      <td className="py-3.5 px-4 max-w-md">
                        <div className="font-bold text-slate-700 line-clamp-2 leading-relaxed">
                          {log.details || 'انجام عملیات در سامانه'}
                        </div>
                        {log.diffSummary && (
                          <div className="text-[11px] font-bold text-indigo-600 mt-1 line-clamp-1 bg-indigo-50/60 rounded-md px-2 py-0.5 inline-block">
                            {log.diffSummary}
                          </div>
                        )}
                      </td>

                      {/* Client / Browser / OS */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-center gap-1.5 text-slate-700 font-bold text-[11px]">
                            {log.device?.includes('موبایل') ? (
                              <Smartphone className="w-3.5 h-3.5 text-slate-400" />
                            ) : (
                              <Monitor className="w-3.5 h-3.5 text-slate-400" />
                            )}
                            <span>{log.browser || 'مرورگر وب'}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-bold" dir="ltr">
                            <span>{log.ip || '127.0.0.1'}</span>
                            {log.os && <span>• {log.os}</span>}
                          </div>
                        </div>
                      </td>

                      {/* Action Button */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedLog(log);
                          }}
                          className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-indigo-50 hover:border-indigo-200 text-slate-700 hover:text-indigo-600 font-bold text-[11px] shadow-sm inline-flex items-center gap-1 transition-all"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>مشاهده جزئیات</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Load More Button if remaining */}
        {!loading && filteredLogs.length > displayLimit && (
          <div className="p-4 border-t border-slate-100 text-center bg-slate-50/50">
            <button
              onClick={() => setDisplayLimit(prev => prev + 50)}
              className="px-6 py-2 rounded-2xl bg-white border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-100 transition-all shadow-sm"
            >
              نمایش ۵۰ مورد بیشتر (باقی‌مانده: {(filteredLogs.length - displayLimit).toLocaleString('fa-IR')})
            </button>
          </div>
        )}
      </div>

      {/* Detailed Log Modal */}
      <AnimatePresence>
        {selectedLog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden max-h-[90vh] flex flex-col"
              dir="rtl"
            >
              {/* Modal Header */}
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                    <Activity className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900">
                      جزئیات کامل واقعه {selectedLog.id}
                    </h3>
                    <p className="text-xs font-bold text-slate-400 mt-0.5">
                      {formatAuditDateTime(selectedLog.timestamp)} ({formatRelativeTime(selectedLog.timestamp)})
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedLog(null)}
                  className="w-8 h-8 rounded-full bg-slate-200/60 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Quick Summary Strip */}
              <div className="px-6 py-3 bg-slate-100/60 border-b border-slate-200/60 grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                <div>
                  <span className="text-slate-400 font-bold block text-[10px]">نوع عملیات:</span>
                  <div className="mt-0.5">{getActionBadge(selectedLog.action)}</div>
                </div>
                <div>
                  <span className="text-slate-400 font-bold block text-[10px]">کاربر:</span>
                  <span className="font-black text-slate-800">{selectedLog.userName || selectedLog.username}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-bold block text-[10px]">بخش سیستم:</span>
                  <span className="font-black text-slate-800">{ENTITY_NAMES_MAP[selectedLog.entityType] || selectedLog.entityType}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-bold block text-[10px]">آدرس IP:</span>
                  <span className="font-mono font-bold text-slate-800" dir="ltr">{selectedLog.ip || '127.0.0.1'}</span>
                </div>
              </div>

              {/* Tabs */}
              <div className="flex border-b border-slate-200 px-6 bg-white gap-4">
                <button
                  onClick={() => setModalTab('diff')}
                  className={`py-3 text-xs font-black border-b-2 transition-all ${
                    modalTab === 'diff' 
                      ? 'border-indigo-600 text-indigo-600' 
                      : 'border-transparent text-slate-400 hover:text-slate-600'
                  }`}
                >
                  تغییرات انجام‌شده (Diff)
                </button>
                <button
                  onClick={() => setModalTab('client')}
                  className={`py-3 text-xs font-black border-b-2 transition-all ${
                    modalTab === 'client' 
                      ? 'border-indigo-600 text-indigo-600' 
                      : 'border-transparent text-slate-400 hover:text-slate-600'
                  }`}
                >
                  اطلاعات کلاینت و نشست
                </button>
                <button
                  onClick={() => setModalTab('raw')}
                  className={`py-3 text-xs font-black border-b-2 transition-all ${
                    modalTab === 'raw' 
                      ? 'border-indigo-600 text-indigo-600' 
                      : 'border-transparent text-slate-400 hover:text-slate-600'
                  }`}
                >
                  داده خام JSON
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 overflow-y-auto flex-1 styled-scrollbar">
                {modalTab === 'diff' && (
                  <div className="space-y-4">
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                      <div className="text-xs font-bold text-slate-500 mb-1">شرح عملیات:</div>
                      <div className="text-sm font-black text-slate-900 leading-relaxed">
                        {selectedLog.details || 'بدون شرح'}
                      </div>
                      {selectedLog.diffSummary && (
                        <div className="mt-2 text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-xl p-2.5">
                          {selectedLog.diffSummary}
                        </div>
                      )}
                    </div>

                    {parsedChanges && typeof parsedChanges === 'object' ? (
                      <div className="border border-slate-200 rounded-2xl overflow-hidden">
                        <div className="bg-slate-100 px-4 py-2.5 font-black text-xs text-slate-700 border-b border-slate-200">
                          فیلدهای ویرایش یا ثبت‌شده
                        </div>
                        <div className="divide-y divide-slate-100">
                          {Object.entries(parsedChanges).map(([k, val]: [string, any]) => {
                            const isOldNew = val && typeof val === 'object' && ('old' in val || 'new' in val);
                            return (
                              <div key={k} className="p-3.5 hover:bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                                <span className="font-mono font-bold text-slate-500 dir-ltr">{k}</span>
                                {isOldNew ? (
                                  <div className="flex items-center gap-3 text-xs font-bold">
                                    <span className="text-rose-600 line-through bg-rose-50 px-2 py-0.5 rounded" dir="ltr">
                                      {typeof val.old === 'object' ? JSON.stringify(val.old) : String(val.old ?? 'خالی')}
                                    </span>
                                    <span className="text-slate-400 font-bold">←</span>
                                    <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded" dir="ltr">
                                      {typeof val.new === 'object' ? JSON.stringify(val.new) : String(val.new ?? 'خالی')}
                                    </span>
                                  </div>
                                ) : (
                                  <span className="font-bold text-slate-800 bg-slate-100 px-2 py-1 rounded max-w-sm truncate" dir="ltr">
                                    {typeof val === 'object' ? JSON.stringify(val) : String(val)}
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-slate-400 font-bold text-xs">
                        تغییر ساختاری مشخصی ثبت نشده است یا رکورد کامل در داده خام موجود است.
                      </div>
                    )}
                  </div>
                )}

                {modalTab === 'client' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-bold">
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                      <div>
                        <span className="text-slate-400 block text-[11px]">مرورگر وب:</span>
                        <span className="text-slate-800 text-sm font-black">{selectedLog.browser || 'مرورگر وب'}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[11px]">سیستم‌عامل:</span>
                        <span className="text-slate-800">{selectedLog.os || 'نامشخص'}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[11px]">نوع دستگاه:</span>
                        <span className="text-slate-800">{selectedLog.device || 'رایانه (Desktop)'}</span>
                      </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                      <div>
                        <span className="text-slate-400 block text-[11px]">آدرس IP:</span>
                        <span className="font-mono text-slate-800 text-sm font-black" dir="ltr">{selectedLog.ip || '127.0.0.1'}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[11px]">زمان ثبت در سرور:</span>
                        <span className="font-mono text-slate-800 text-[11px]" dir="ltr">
                          {new Date(selectedLog.timestamp).toISOString()}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[11px]">شناسه رکورد مرتبط:</span>
                        <span className="font-mono text-slate-800 text-[11px]" dir="ltr">
                          {String(selectedLog.entityId || 'نامشخص')}
                        </span>
                      </div>
                    </div>

                    {selectedLog.userAgent && (
                      <div className="md:col-span-2 p-4 rounded-2xl bg-slate-50 border border-slate-200">
                        <span className="text-slate-400 block text-[11px] mb-1">User-Agent کامل ارسالی:</span>
                        <div className="font-mono text-[10px] text-slate-600 bg-slate-100 p-2.5 rounded-xl break-all" dir="ltr">
                          {selectedLog.userAgent}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {modalTab === 'raw' && (
                  <div className="relative">
                    <button
                      onClick={handleCopyRaw}
                      className="absolute left-3 top-3 z-10 px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-white text-[11px] font-bold inline-flex items-center gap-1 shadow-sm transition-all"
                    >
                      {copiedRaw ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedRaw ? 'کپی شد' : 'کپی JSON'}</span>
                    </button>
                    <pre className="p-4 bg-slate-900 text-slate-100 rounded-2xl text-[11px] font-mono overflow-x-auto max-h-96 styled-scrollbar" dir="ltr">
                      {JSON.stringify(selectedLog, null, 2)}
                    </pre>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-400">
                  شناسه سیستم: {selectedLog.id}
                </span>
                <button
                  onClick={() => setSelectedLog(null)}
                  className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs transition-all shadow-sm"
                >
                  بستن
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
