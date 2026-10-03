import React, { useState, useEffect, useMemo } from 'react';
import { 
  Shield, Plus, Edit2, Trash2, CheckCircle, User as UserIcon, 
  Lock, Settings, Key, Clock, Eye, EyeOff, Search, Check, X, 
  ShieldAlert, Sparkles, AlertCircle, RefreshCw, ChevronDown, 
  ChevronUp, Sliders, CheckSquare, Square, Users, Layers, DollarSign,
  Tag, Percent, Database, FileText, CheckCheck, UserCheck, ShieldCheck
} from 'lucide-react';
import { User, UserRole, UserSpecialPermissions } from '../../types';
import { getUsers, addUser, updateUser, deleteUser, getPersons } from '../../services/dataService';
import { motion, AnimatePresence } from 'motion/react';
import AdvancedProfileModal from '../profile/advanced/AdvancedProfileModal';
import { 
  PERMISSION_MODULES, 
  getDefaultTabsForRole, 
  USER_ROLE_LABELS, 
  getPageTitle 
} from '../../utils/permissionUtils';
import { logActivity, createDiffSummary } from '../../utils/auditLogger';
import { useAuth } from '../../context/AuthContext';

export default function UserManager() {
  const { user: currentLoggedUser, refreshUserData } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [persons, setPersons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeModalTab, setActiveModalTab] = useState<'basic' | 'permissions' | 'special'>('basic');
  const [profileModalId, setProfileModalId] = useState<string | number | null>(null);
  const [editingId, setEditingId] = useState<string | number | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({});

  // Initial Form State
  const initialFormState = {
    username: '',
    password: '',
    name: '',
    role: 'employee' as UserRole,
    isActive: true,
    requires2FA: false,
    personId: '' as string | number,
    autoLogoutMinutes: 15,
    customPermissionsEnabled: false,
    allowedTabs: [] as string[],
    deniedTabs: [] as string[],
    specialPermissions: {
      canEditPrices: false,
      canDeleteInvoices: false,
      canGiveDiscounts: false,
      canViewCostAndProfit: false,
      canManageUsers: false,
      canManageSettings: false,
      canManageDatabase: false,
      canApproveChecks: false,
      canAccessAllWarehouses: true,
      allowedWarehouseIds: [] as (string | number)[]
    } as UserSpecialPermissions
  };

  const [form, setForm] = useState(initialFormState);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await getUsers();
      setUsers(Array.isArray(data) ? data : []);
      const pData = await getPersons();
      setPersons(Array.isArray(pData) ? pData : []);
    } catch (e) {
      console.error('Error loading users:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filtered users
  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      const matchesSearch = 
        !searchQuery.trim() || 
        (u.name && u.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (u.username && u.username.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesRole = roleFilter === 'all' || u.role === roleFilter;
      const matchesStatus = 
        statusFilter === 'all' || 
        (statusFilter === 'active' && u.isActive !== false) ||
        (statusFilter === 'inactive' && u.isActive === false);
      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [users, searchQuery, roleFilter, statusFilter]);

  // Statistics
  const stats = useMemo(() => {
    const total = users.length;
    const active = users.filter(u => u.isActive !== false).length;
    const custom = users.filter(u => u.customPermissionsEnabled).length;
    const adminsManagers = users.filter(u => u.role === 'admin' || u.role === 'manager').length;
    return { total, active, custom, adminsManagers };
  }, [users]);

  // Open modal for new user
  const handleAddNew = () => {
    setEditingId(null);
    setShowPassword(false);
    setActiveModalTab('basic');
    const defaultRole = 'employee' as UserRole;
    const defaultTabs = getDefaultTabsForRole(defaultRole);
    setForm({
      ...initialFormState,
      role: defaultRole,
      allowedTabs: defaultTabs,
    });
    setIsModalOpen(true);
  };

  // Open modal for editing
  const handleEdit = (u: User) => {
    setEditingId(u.id);
    setShowPassword(false);
    setActiveModalTab('basic');

    // Default tabs for role if not customized
    const roleDefaults = getDefaultTabsForRole(u.role);
    const existingAllowed = Array.isArray(u.allowedTabs) && u.allowedTabs.length > 0 
      ? u.allowedTabs 
      : roleDefaults;

    setForm({
      username: u.username || '',
      password: '', // Blank initially for security
      name: u.name || '',
      role: u.role || 'employee',
      isActive: u.isActive !== false,
      requires2FA: Boolean(u.requires2FA),
      personId: u.personId || '',
      autoLogoutMinutes: typeof u.autoLogoutMinutes === 'number' && u.autoLogoutMinutes > 0 ? u.autoLogoutMinutes : 15,
      customPermissionsEnabled: Boolean(u.customPermissionsEnabled),
      allowedTabs: existingAllowed,
      deniedTabs: Array.isArray(u.deniedTabs) ? u.deniedTabs : [],
      specialPermissions: {
        canEditPrices: Boolean(u.specialPermissions?.canEditPrices),
        canDeleteInvoices: Boolean(u.specialPermissions?.canDeleteInvoices),
        canGiveDiscounts: Boolean(u.specialPermissions?.canGiveDiscounts),
        canViewCostAndProfit: Boolean(u.specialPermissions?.canViewCostAndProfit),
        canManageUsers: Boolean(u.specialPermissions?.canManageUsers),
        canManageSettings: Boolean(u.specialPermissions?.canManageSettings),
        canManageDatabase: Boolean(u.specialPermissions?.canManageDatabase),
        canApproveChecks: Boolean(u.specialPermissions?.canApproveChecks),
        canAccessAllWarehouses: u.specialPermissions?.canAccessAllWarehouses !== false,
        allowedWarehouseIds: u.specialPermissions?.allowedWarehouseIds || []
      }
    });
    setIsModalOpen(true);
  };

  // Change role in form: update default tabs if not customized
  const handleRoleChange = (newRole: UserRole) => {
    const roleDefaults = getDefaultTabsForRole(newRole);
    setForm(prev => ({
      ...prev,
      role: newRole,
      // If user hasn't explicitly customized, update allowedTabs to match new role
      allowedTabs: prev.customPermissionsEnabled ? prev.allowedTabs : roleDefaults,
      // Set default special permissions for role if not already customized
      specialPermissions: {
        ...prev.specialPermissions,
        canEditPrices: ['admin', 'manager'].includes(newRole),
        canDeleteInvoices: ['admin', 'manager'].includes(newRole),
        canGiveDiscounts: ['admin', 'manager', 'cashier'].includes(newRole),
        canViewCostAndProfit: ['admin', 'manager', 'accountant'].includes(newRole),
        canApproveChecks: ['admin', 'manager', 'accountant'].includes(newRole),
        canManageUsers: newRole === 'admin',
        canManageSettings: newRole === 'admin',
        canManageDatabase: newRole === 'admin',
      }
    }));
  };

  // Reset tabs to role defaults
  const handleResetToRoleDefaults = () => {
    const roleDefaults = getDefaultTabsForRole(form.role);
    setForm(prev => ({
      ...prev,
      allowedTabs: roleDefaults
    }));
  };

  // Select all system tabs
  const handleSelectAllTabs = () => {
    const allTabs: string[] = [];
    PERMISSION_MODULES.forEach(mod => {
      mod.items.forEach(itm => allTabs.push(itm.id));
    });
    setForm(prev => ({
      ...prev,
      allowedTabs: allTabs
    }));
  };

  // Deselect all tabs (keep welcome_page)
  const handleDeselectAllTabs = () => {
    setForm(prev => ({
      ...prev,
      allowedTabs: ['welcome_page']
    }));
  };

  // Toggle single tab permission
  const handleToggleTab = (tabId: string) => {
    if (tabId === 'welcome_page') return; // Always keep welcome page
    setForm(prev => {
      const exists = prev.allowedTabs.includes(tabId);
      const updated = exists 
        ? prev.allowedTabs.filter(id => id !== tabId)
        : [...prev.allowedTabs, tabId];
      return { ...prev, allowedTabs: updated };
    });
  };

  // Toggle module: select all or deselect all in module
  const handleToggleModuleAll = (moduleId: string, selectAll: boolean) => {
    const mod = PERMISSION_MODULES.find(m => m.id === moduleId);
    if (!mod) return;
    const moduleTabIds = mod.items.map(i => i.id);

    setForm(prev => {
      let updated: string[];
      if (selectAll) {
        const set = new Set([...prev.allowedTabs, ...moduleTabIds]);
        updated = Array.from(set);
      } else {
        updated = prev.allowedTabs.filter(id => !moduleTabIds.includes(id) || id === 'welcome_page');
      }
      return { ...prev, allowedTabs: updated };
    });
  };

  // Generate strong random password
  const handleGeneratePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
    let result = '';
    for (let i = 0; i < 10; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setForm(prev => ({ ...prev, password: result }));
    setShowPassword(true);
  };

  // Save user
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!form.username.trim()) {
      setErrorMsg('نام کاربری نمی‌تواند خالی باشد.');
      return;
    }

    if (!form.name.trim()) {
      setErrorMsg('نام و نام خانوادگی الزامی است.');
      return;
    }

    if (!editingId && !form.password) {
      setErrorMsg('رمز عبور برای کاربر جدید الزامی است.');
      return;
    }

    // Check duplicate username
    const duplicate = users.find(u => 
      u.username.toLowerCase() === form.username.trim().toLowerCase() && 
      String(u.id) !== String(editingId)
    );
    if (duplicate) {
      setErrorMsg('این نام کاربری قبلاً در سیستم ثبت شده است.');
      return;
    }

    try {
      const payload: any = {
        name: form.name.trim(),
        username: form.username.trim().toLowerCase(),
        role: form.role,
        isActive: form.isActive,
        requires2FA: form.requires2FA,
        personId: form.personId || null,
        autoLogoutMinutes: Number(form.autoLogoutMinutes) || 15,
        customPermissionsEnabled: form.customPermissionsEnabled,
        allowedTabs: form.customPermissionsEnabled ? form.allowedTabs : getDefaultTabsForRole(form.role),
        specialPermissions: form.specialPermissions
      };

      if (form.password && form.password.trim() !== '') {
        payload.password = form.password.trim();
      }

      if (editingId) {
        const existingUser = users.find(u => String(u.id) === String(editingId));
        const { diffSummary, changesObj } = createDiffSummary(existingUser, payload);
        await updateUser(editingId.toString(), payload);
        logActivity({
          action: 'UPDATE',
          entityType: 'users',
          entityId: editingId,
          details: `ویرایش مشخصات و دسترسی‌های کاربر «${form.name}» (${form.username})`,
          diffSummary: diffSummary || 'ویرایش سطوح دسترسی و تنظیمات کاربر',
          oldData: existingUser,
          newData: payload,
          changes: JSON.stringify(changesObj)
        });
        setSuccessMsg(`اطلاعات و سطوح دسترسی کاربر «${form.name}» با موفقیت ذخیره شد.`);
      } else {
        const createdUser = await addUser(payload);
        logActivity({
          action: 'CREATE',
          entityType: 'users',
          entityId: createdUser?.id || form.username,
          details: `تعریف کاربر جدید «${form.name}» (${form.username}) با نقش ${USER_ROLE_LABELS[form.role] || form.role}`,
          diffSummary: `ثبت کاربر با ${payload.allowedTabs?.length || 0} صفحه مجاز و نشست ${form.autoLogoutMinutes} دقیقه`,
          newData: payload
        });
        setSuccessMsg(`کاربر جدید «${form.name}» با موفقیت در سیستم تعریف شد.`);
      }

      setIsModalOpen(false);
      await loadData();
      if (currentLoggedUser && (String(currentLoggedUser.id) === String(editingId) || currentLoggedUser.username === form.username)) {
        await refreshUserData();
      }
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      setErrorMsg('خطا در ذخیره اطلاعات کاربر: ' + (err?.message || 'خطای ناشناخته'));
    }
  };

  // Toggle user active status quickly
  const handleToggleActiveQuick = async (u: User) => {
    if (u.username === 'admin') {
      alert('امکان غیرفعال‌سازی کاربر اصلی مدیر سیستم وجود ندارد.');
      return;
    }
    const newStatus = !u.isActive;
    try {
      await updateUser(u.id.toString(), { isActive: newStatus });
      logActivity({
        action: 'STATUS_CHANGE',
        entityType: 'users',
        entityId: u.id,
        details: `تغییر وضعیت کاربر «${u.name}» به ${newStatus ? 'فعال' : 'غیرفعال'}`,
        diffSummary: `تغییر وضعیت: ${newStatus ? 'فعال' : 'غیرفعال'}`
      });
      setUsers(prev => prev.map(item => item.id === u.id ? { ...item, isActive: newStatus } : item));
      setSuccessMsg(`وضعیت کاربر «${u.name}» به ${newStatus ? 'فعال' : 'غیرفعال'} تغییر یافت.`);
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (e) {
      alert('خطا در تغییر وضعیت کاربر');
    }
  };

  // Delete user
  const handleDelete = async (u: User) => {
    if (u.username === 'admin') {
      alert('کاربر اصلی مدیر سیستم (admin) قابل حذف نمی‌باشد.');
      return;
    }
    if (confirm(`آیا از حذف کامل کاربر «${u.name}» (${u.username}) از سیستم اطمینان دارید؟`)) {
      try {
        await deleteUser(u.id.toString());
        logActivity({
          action: 'DELETE',
          entityType: 'users',
          entityId: u.id,
          details: `حذف کاربر «${u.name}» (${u.username}) با نقش ${USER_ROLE_LABELS[u.role] || u.role} از سامانه`,
          diffSummary: `حذف کاربر ${u.username}`,
          oldData: u
        });
        setSuccessMsg(`کاربر «${u.name}» با موفقیت حذف شد.`);
        await loadData();
        setTimeout(() => setSuccessMsg(''), 3000);
      } catch (e) {
        alert('خطا در حذف کاربر');
      }
    }
  };

  // Total available system tabs count
  const totalTabsCount = useMemo(() => {
    let count = 0;
    PERMISSION_MODULES.forEach(mod => {
      count += mod.items.length;
    });
    return count;
  }, []);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 8 }} 
      animate={{ opacity: 1, y: 0 }} 
      className="space-y-6 text-right font-sans select-none" 
      dir="rtl"
    >
      {/* Header Banner */}
      <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50/60 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-600/25 shrink-0">
            <Shield className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-black text-slate-900 flex items-center gap-2">
              مدیریت کاربران و سطوح دسترسی
            </h1>
            <p className="text-xs md:text-sm text-slate-500 font-medium mt-1.5 max-w-2xl leading-relaxed">
              تعریف کاربران با نقش‌های سازمانی مختلف، اعمال تنظیمات اختصاصی، کنترل دقیق دسترسی به منوها و صفحات، تعیین زمان خروج خودکار و اختیارات ویژه
            </p>
          </div>
        </div>

        <div className="relative z-10 flex items-center gap-3">
          <button 
            type="button"
            onClick={loadData}
            className="p-3 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-2xl border border-slate-200/80 transition-all cursor-pointer"
            title="بروزرسانی لیست"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-indigo-600' : ''}`} />
          </button>
          <button 
            type="button"
            onClick={handleAddNew} 
            className="px-5 py-3 bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white rounded-2xl flex items-center gap-2 transition-all text-xs md:text-sm font-bold shadow-lg shadow-indigo-600/25 cursor-pointer"
          >
            <Plus className="w-4 h-4" /> 
            <span>تعریف کاربر جدید</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-4 md:p-5 border border-slate-100 shadow-xs flex items-center gap-3">
          <div className="p-3 rounded-xl bg-indigo-50 text-indigo-600 shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-400 block">کل کاربران</span>
            <span className="text-lg md:text-xl font-black text-slate-800">{stats.total}</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 md:p-5 border border-slate-100 shadow-xs flex items-center gap-3">
          <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600 shrink-0">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-400 block">کاربران فعال</span>
            <span className="text-lg md:text-xl font-black text-emerald-600">{stats.active}</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 md:p-5 border border-slate-100 shadow-xs flex items-center gap-3">
          <div className="p-3 rounded-xl bg-purple-50 text-purple-600 shrink-0">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-400 block">دسترسی سفارشی</span>
            <span className="text-lg md:text-xl font-black text-purple-600">{stats.custom}</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 md:p-5 border border-slate-100 shadow-xs flex items-center gap-3">
          <div className="p-3 rounded-xl bg-amber-50 text-amber-600 shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-400 block">مدیران و حسابداران</span>
            <span className="text-lg md:text-xl font-black text-amber-600">{stats.adminsManagers}</span>
          </div>
        </div>
      </div>

      {/* Notifications */}
      {successMsg && (
        <motion.div 
          initial={{ opacity: 0, y: -5 }} 
          animate={{ opacity: 1, y: 0 }} 
          className="bg-emerald-50 text-emerald-800 px-5 py-3.5 rounded-2xl flex items-center gap-2.5 border border-emerald-200/60 text-xs md:text-sm font-bold shadow-xs"
        >
          <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </motion.div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="جستجوی نام یا نام‌کاربری..."
            className="w-full pr-10 pl-4 py-2.5 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-bold outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
          />
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
          {searchQuery && (
            <button 
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2 w-full md:w-auto">
            <span className="text-xs text-slate-400 font-bold shrink-0">نقش:</span>
            <select
              value={roleFilter}
              onChange={e => setRoleFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200/80 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none cursor-pointer"
            >
              <option value="all">همه نقش‌ها</option>
              {Object.entries(USER_ROLE_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <span className="text-xs text-slate-400 font-bold shrink-0">وضعیت:</span>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200/80 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none cursor-pointer"
            >
              <option value="all">همه وضعیت‌ها</option>
              <option value="active">فقط فعال‌ها</option>
              <option value="inactive">غیرفعال‌ها</option>
            </select>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-100 text-xs font-black text-slate-500">
                <th className="px-6 py-4">مشخصات کاربر</th>
                <th className="px-6 py-4">نقش سیستمی</th>
                <th className="px-6 py-4">سطح دسترسی صفحات</th>
                <th className="px-6 py-4">خروج عدم فعالیت</th>
                <th className="px-6 py-4">وضعیت / امنیت</th>
                <th className="px-6 py-4">پروفایل شخص متصل</th>
                <th className="px-6 py-4 text-center">عملیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-bold">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                    <UserIcon className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <span>هیچ کاربری با معیارهای انتخابی یافت نشد.</span>
                  </td>
                </tr>
              ) : (
                filteredUsers.map(u => {
                  const roleLabel = USER_ROLE_LABELS[u.role] || u.role;
                  const isCustom = Boolean(u.customPermissionsEnabled);
                  const allowedCount = isCustom 
                    ? (u.allowedTabs?.length || 0)
                    : getDefaultTabsForRole(u.role).length;
                  const timeoutMin = u.autoLogoutMinutes || 15;
                  const linkedPerson = persons.find(p => String(p.id) === String(u.personId));

                  return (
                    <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                      {/* Name & Username */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs shrink-0 ${
                            u.role === 'admin' 
                              ? 'bg-amber-100 text-amber-800 border border-amber-200' 
                              : u.role === 'manager' 
                                ? 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                                : 'bg-slate-100 text-slate-700'
                          }`}>
                            {u.name?.charAt(0) || 'U'}
                          </div>
                          <div>
                            <span className="font-black text-slate-900 block text-xs md:text-sm">{u.name}</span>
                            <span className="text-[11px] text-slate-400 font-mono text-left block dir-ltr">
                              @{u.username}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Role */}
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-extrabold border ${
                          u.role === 'admin'
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : u.role === 'manager'
                              ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                              : u.role === 'accountant'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : u.role === 'cashier'
                                  ? 'bg-teal-50 text-teal-700 border-teal-200'
                                  : u.role === 'warehouseman'
                                    ? 'bg-orange-50 text-orange-700 border-orange-200'
                                    : 'bg-slate-50 text-slate-700 border-slate-200'
                        }`}>
                          <Shield className="w-3 h-3" />
                          {roleLabel}
                        </span>
                      </td>

                      {/* Page Access Levels */}
                      <td className="px-6 py-4">
                        {isCustom ? (
                          <div className="flex flex-col gap-1">
                            <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200/60 w-fit">
                              <Sliders className="w-3 h-3" />
                              سفارشی: {allowedCount} صفحه مجاز
                            </span>
                            <span className="text-[10px] text-slate-400">
                              از مجموع {totalTabsCount} فرم
                            </span>
                          </div>
                        ) : (
                          <div className="flex flex-col gap-1">
                            <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md w-fit">
                              <CheckCheck className="w-3 h-3 text-slate-500" />
                              استاندارد نقش ({allowedCount} صفحه)
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Inactivity Timeout */}
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-50 border border-slate-200 text-slate-700">
                          <Clock className="w-3 h-3 text-indigo-500" />
                          {timeoutMin} دقیقه
                        </span>
                      </td>

                      {/* Status & 2FA */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <button
                            type="button"
                            onClick={() => handleToggleActiveQuick(u)}
                            className={`px-2.5 py-0.5 rounded-md text-[11px] font-extrabold transition-all cursor-pointer ${
                              u.isActive !== false
                                ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                                : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                            }`}
                            title="کلیک برای تغییر وضعیت"
                          >
                            {u.isActive !== false ? 'فعال' : 'غیرفعال'}
                          </button>
                          {u.requires2FA && (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-blue-50 text-blue-700 border border-blue-200">
                              OTP فعال
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Linked Person */}
                      <td className="px-6 py-4">
                        {linkedPerson ? (
                          <span className="text-slate-800 font-extrabold flex items-center gap-1 text-xs">
                            <UserCheck className="w-3.5 h-3.5 text-indigo-600" />
                            {linkedPerson.name}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">متصل نیست</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1 justify-center">
                          <button 
                            type="button"
                            onClick={() => handleEdit(u)} 
                            className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors cursor-pointer"
                            title="ویرایش کاربر و تنظیم سطوح دسترسی"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          
                          <button 
                            type="button"
                            onClick={() => setProfileModalId(u.id)} 
                            className="p-2 text-slate-500 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                            title="پروفایل پیشرفته و سوابق"
                          >
                            <Settings className="w-4 h-4" />
                          </button>

                          {u.username !== 'admin' && (
                            <button 
                              type="button"
                              onClick={() => handleDelete(u)} 
                              className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                              title="حذف کاربر"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Advanced Profile Modal */}
      {profileModalId && (
        <AdvancedProfileModal 
          onClose={() => {
            setProfileModalId(null);
            loadData();
          }} 
          targetUserId={profileModalId} 
        />
      )}

      {/* User Create / Edit Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs select-none" dir="rtl">
            <motion.div 
              initial={{ opacity: 0, scale: 0.96, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 10 }}
              className="bg-white rounded-3xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-slate-100"
            >
              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/20">
                    {editingId ? <Edit2 className="w-5 h-5"/> : <Plus className="w-5 h-5"/>}
                  </div>
                  <div>
                    <h3 className="font-black text-base text-slate-900">
                      {editingId ? 'ویرایش کاربر و تنظیم سطوح دسترسی' : 'تعریف کاربر جدید با سطوح دسترسی اختصاصی'}
                    </h3>
                    <p className="text-[11px] text-slate-400 font-bold">
                      {editingId ? `در حال ویرایش حساب کاربری ${form.username}` : 'مشخصات، نقش سازمانی، صفحات مجاز و مدت نشست کاری'}
                    </p>
                  </div>
                </div>

                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Tabs Navigation */}
              <div className="flex items-center border-b border-slate-100 px-6 bg-slate-50/40 text-xs font-black">
                <button
                  type="button"
                  onClick={() => setActiveModalTab('basic')}
                  className={`py-3 px-4 border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
                    activeModalTab === 'basic'
                      ? 'border-indigo-600 text-indigo-600'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <UserIcon className="w-4 h-4" />
                  <span>مشخصات و نشست کاری</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveModalTab('permissions')}
                  className={`py-3 px-4 border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
                    activeModalTab === 'permissions'
                      ? 'border-indigo-600 text-indigo-600'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Layers className="w-4 h-4" />
                  <span>سطوح دسترسی صفحات و منوها</span>
                  {form.customPermissionsEnabled && (
                    <span className="text-[9px] px-1.5 py-0.2 bg-purple-100 text-purple-700 rounded-full font-bold">
                      سفارشی
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setActiveModalTab('special')}
                  className={`py-3 px-4 border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
                    activeModalTab === 'special'
                      ? 'border-indigo-600 text-indigo-600'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>اختیارات و تنظیمات خاص</span>
                </button>
              </div>

              {/* Error inside modal */}
              {errorMsg && (
                <div className="mx-6 mt-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-bold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Modal Body */}
              <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-6">
                
                {/* TAB 1: Basic & Session Timeout */}
                {activeModalTab === 'basic' && (
                  <div className="space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Full Name */}
                      <div>
                        <label className="block text-xs font-extrabold text-slate-700 mb-1.5">
                          نام و نام خانوادگی <span className="text-rose-500">*</span>
                        </label>
                        <input 
                          type="text" 
                          required 
                          value={form.name} 
                          onChange={e => setForm({ ...form, name: e.target.value })} 
                          placeholder="مثلاً: علی رضایی"
                          className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                        />
                      </div>

                      {/* Username */}
                      <div>
                        <label className="block text-xs font-extrabold text-slate-700 mb-1.5">
                          نام کاربری (لاتین) <span className="text-rose-500">*</span>
                        </label>
                        <input 
                          type="text" 
                          required 
                          value={form.username} 
                          disabled={editingId !== null && form.username === 'admin'}
                          onChange={e => setForm({ ...form, username: e.target.value.toLowerCase().trim() })} 
                          placeholder="مثلاً: ali_rezaei"
                          className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold font-mono text-left focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none dir-ltr disabled:bg-slate-100"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Password */}
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="text-xs font-extrabold text-slate-700">
                            {editingId ? 'تغییر رمز عبور (اختیاری)' : 'رمز عبور کاربر *'}
                          </label>
                          <button
                            type="button"
                            onClick={handleGeneratePassword}
                            className="text-[10px] text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1 cursor-pointer"
                          >
                            <Sparkles className="w-3 h-3" />
                            تولید رمز قوی
                          </button>
                        </div>
                        <div className="relative">
                          <input 
                            type={showPassword ? "text" : "password"}
                            required={!editingId} 
                            value={form.password} 
                            onChange={e => setForm({ ...form, password: e.target.value })} 
                            placeholder={editingId ? 'جهت حفظ رمز قبلی خالی بگذارید' : 'حداقل ۶ کاراکتر'}
                            className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold font-mono text-left focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none dir-ltr"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                          >
                            {showPassword ? <EyeOff className="w-4 h-4"/> : <Eye className="w-4 h-4"/>}
                          </button>
                        </div>
                      </div>

                      {/* System Role */}
                      <div>
                        <label className="block text-xs font-extrabold text-slate-700 mb-1.5">
                          نقش سازمانی کاربر <span className="text-rose-500">*</span>
                        </label>
                        <select 
                          value={form.role} 
                          disabled={editingId !== null && form.username === 'admin'}
                          onChange={e => handleRoleChange(e.target.value as UserRole)} 
                          className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none cursor-pointer"
                        >
                          {Object.entries(USER_ROLE_LABELS).map(([k, v]) => (
                            <option key={k} value={k}>{v}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Person Link */}
                    <div>
                      <label className="block text-xs font-extrabold text-slate-700 mb-1.5">
                        اتصال به پرونده شخص / کارمند در سیستم
                      </label>
                      <select
                        value={form.personId || ''}
                        onChange={e => setForm({ ...form, personId: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none cursor-pointer"
                      >
                        <option value="">-- بدون اتصال به شخص --</option>
                        {persons.map(p => (
                          <option key={p.id} value={p.id}>{p.name} ({p.accountingCode || p.phone || 'بدون کد'})</option>
                        ))}
                      </select>
                      <p className="text-[11px] text-slate-400 mt-1">
                        با اتصال کاربر به شخص، فاکتورها و عملیات مالی ثبت‌شده به صورت خودکار به نام این کارمند ارجاع داده می‌شود.
                      </p>
                    </div>

                    {/* Inactivity Timeout Config */}
                    <div className="bg-indigo-50/50 border border-indigo-100 rounded-2xl p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                          <Clock className="w-4 h-4 text-indigo-600" />
                          مدت زمان مجاز عدم فعالیت تا خروج خودکار (Session Timeout)
                        </label>
                        <span className="text-xs font-extrabold text-indigo-700 bg-white px-2.5 py-0.5 rounded-lg border border-indigo-200 shadow-2xs">
                          {form.autoLogoutMinutes} دقیقه
                        </span>
                      </div>

                      <p className="text-[11px] text-slate-500 leading-relaxed font-medium">
                        در صورت عدم فعالیت کاربر (کلیک، تایپ یا جابجایی ماوس) برای مدت تعیین شده، سشن کاری کاربر به دلایل امنیتی خودکار منقضی و کاربر از سیستم بیرون انداخته می‌شود.
                      </p>

                      {/* Quick preset buttons */}
                      <div className="flex items-center gap-2 flex-wrap">
                        {[5, 10, 15, 30, 60, 120].map(mins => (
                          <button
                            key={mins}
                            type="button"
                            onClick={() => setForm({ ...form, autoLogoutMinutes: mins })}
                            className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                              form.autoLogoutMinutes === mins
                                ? 'bg-indigo-600 text-white shadow-xs'
                                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                            }`}
                          >
                            {mins} دقیقه
                          </button>
                        ))}
                        
                        <div className="flex items-center gap-1.5 mr-auto">
                          <input
                            type="number"
                            min="1"
                            max="480"
                            value={form.autoLogoutMinutes}
                            onChange={e => setForm({ ...form, autoLogoutMinutes: Math.max(1, parseInt(e.target.value) || 15) })}
                            className="w-16 px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold text-center outline-none focus:border-indigo-500"
                          />
                          <span className="text-xs text-slate-400 font-bold">دقیقه دلخواه</span>
                        </div>
                      </div>
                    </div>

                    {/* Account Status and 2FA */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                      <label className="flex items-center gap-3 p-3.5 bg-slate-50 hover:bg-slate-100/80 rounded-2xl border border-slate-200 cursor-pointer transition-colors">
                        <input 
                          type="checkbox" 
                          checked={form.isActive} 
                          disabled={editingId !== null && form.username === 'admin'}
                          onChange={e => setForm({ ...form, isActive: e.target.checked })}
                          className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                        />
                        <div>
                          <span className="text-xs font-extrabold text-slate-800 block">حساب کاربری فعال است</span>
                          <span className="text-[10px] text-slate-400 font-medium">کاربر می‌تواند با این حساب وارد سیستم شود</span>
                        </div>
                      </label>

                      <label className="flex items-center gap-3 p-3.5 bg-slate-50 hover:bg-slate-100/80 rounded-2xl border border-slate-200 cursor-pointer transition-colors">
                        <input 
                          type="checkbox" 
                          checked={form.requires2FA} 
                          onChange={e => setForm({ ...form, requires2FA: e.target.checked })}
                          className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                        />
                        <div>
                          <span className="text-xs font-extrabold text-slate-800 block">ورود دو مرحله‌ای (OTP)</span>
                          <span className="text-[10px] text-slate-400 font-medium">ارسال کد یکبار مصرف هنگام لاگین</span>
                        </div>
                      </label>
                    </div>
                  </div>
                )}

                {/* TAB 2: Page & Menu Permissions */}
                {activeModalTab === 'permissions' && (
                  <div className="space-y-5">
                    {/* Mode Selector */}
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div>
                        <span className="text-xs font-black text-slate-900 block">نحوه اعمال دسترسی‌ها:</span>
                        <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                          می‌توانید از دسترسی‌های پیش‌فرض نقش استفاده کنید یا دسترسی هر صفحه را تک به تک تنظیم کنید.
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setForm(prev => ({
                              ...prev,
                              customPermissionsEnabled: false,
                              allowedTabs: getDefaultTabsForRole(prev.role)
                            }));
                          }}
                          className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                            !form.customPermissionsEnabled
                              ? 'bg-indigo-600 text-white shadow-xs'
                              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          دسترسی استاندارد نقش ({USER_ROLE_LABELS[form.role] || form.role})
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setForm(prev => ({
                              ...prev,
                              customPermissionsEnabled: true
                            }));
                          }}
                          className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                            form.customPermissionsEnabled
                              ? 'bg-purple-600 text-white shadow-xs'
                              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          تنظیم سفارشی برای این کاربر
                        </button>
                      </div>
                    </div>

                    {/* Toolbar for Custom Permissions */}
                    <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-500 font-bold">صفحات مجاز:</span>
                        <span className="font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-100">
                          {form.allowedTabs.length} از {totalTabsCount} صفحه
                        </span>
                      </div>

                      {form.customPermissionsEnabled && (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={handleResetToRoleDefaults}
                            className="px-2.5 py-1 text-[11px] font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                          >
                            بازنشانی به نقش {USER_ROLE_LABELS[form.role]}
                          </button>
                          <button
                            type="button"
                            onClick={handleSelectAllTabs}
                            className="px-2.5 py-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors cursor-pointer"
                          >
                            انتخاب همه
                          </button>
                          <button
                            type="button"
                            onClick={handleDeselectAllTabs}
                            className="px-2.5 py-1 text-[11px] font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors cursor-pointer"
                          >
                            لغو همه
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Modules and Pages Accordions */}
                    <div className="space-y-3">
                      {PERMISSION_MODULES.map(mod => {
                        const isExpanded = expandedModules[mod.id] !== false; // Default open
                        const modTabs = mod.items.map(i => i.id);
                        const selectedCountInMod = mod.items.filter(i => form.allowedTabs.includes(i.id)).length;
                        const isAllSelectedInMod = selectedCountInMod === mod.items.length;

                        return (
                          <div 
                            key={mod.id} 
                            className={`rounded-2xl border transition-all overflow-hidden ${
                              selectedCountInMod > 0 ? 'border-slate-200 bg-white' : 'border-slate-100 bg-slate-50/50'
                            }`}
                          >
                            {/* Module Header */}
                            <div className="px-4 py-3 bg-slate-50/80 flex items-center justify-between border-b border-slate-100">
                              <div 
                                className="flex items-center gap-2.5 cursor-pointer flex-1"
                                onClick={() => setExpandedModules(p => ({ ...p, [mod.id]: !isExpanded }))}
                              >
                                <span className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600 font-bold">
                                  <Layers className="w-4 h-4" />
                                </span>
                                <div>
                                  <span className="text-xs font-black text-slate-800">{mod.label}</span>
                                  <span className="text-[10px] text-slate-400 block font-medium">{mod.description}</span>
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md ${
                                  selectedCountInMod === mod.items.length
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : selectedCountInMod > 0
                                      ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                                      : 'bg-slate-200/60 text-slate-500'
                                }`}>
                                  {selectedCountInMod} از {mod.items.length}
                                </span>

                                {form.customPermissionsEnabled && (
                                  <button
                                    type="button"
                                    onClick={() => handleToggleModuleAll(mod.id, !isAllSelectedInMod)}
                                    className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 p-1"
                                  >
                                    {isAllSelectedInMod ? 'لغو این بخش' : 'انتخاب کل این بخش'}
                                  </button>
                                )}

                                <button
                                  type="button"
                                  onClick={() => setExpandedModules(p => ({ ...p, [mod.id]: !isExpanded }))}
                                  className="p-1 text-slate-400 hover:text-slate-600"
                                >
                                  {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                </button>
                              </div>
                            </div>

                            {/* Module Tabs Grid */}
                            {isExpanded && (
                              <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-2 bg-white">
                                {mod.items.map(item => {
                                  const isAllowed = form.allowedTabs.includes(item.id);
                                  const isWelcome = item.id === 'welcome_page';

                                  return (
                                    <label
                                      key={item.id}
                                      className={`flex items-start gap-2.5 p-2.5 rounded-xl border transition-all ${
                                        isAllowed
                                          ? 'bg-indigo-50/40 border-indigo-200/80 text-indigo-950 font-bold'
                                          : 'bg-slate-50/60 border-slate-100 text-slate-600'
                                      } ${form.customPermissionsEnabled && !isWelcome ? 'cursor-pointer hover:bg-slate-100' : 'cursor-default'}`}
                                    >
                                      <input
                                        type="checkbox"
                                        checked={isAllowed}
                                        disabled={!form.customPermissionsEnabled || isWelcome}
                                        onChange={() => handleToggleTab(item.id)}
                                        className="w-4 h-4 mt-0.5 text-indigo-600 rounded focus:ring-indigo-500"
                                      />
                                      <div className="min-w-0 flex-1">
                                        <div className="flex items-center justify-between">
                                          <span className="text-xs truncate">{item.label}</span>
                                          {isWelcome && (
                                            <span className="text-[9px] text-slate-400 font-bold">همیشه فعال</span>
                                          )}
                                        </div>
                                        <span className="text-[10px] text-slate-400 font-mono block dir-ltr text-left">
                                          /{item.id}
                                        </span>
                                      </div>
                                    </label>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* TAB 3: Special Permissions */}
                {activeModalTab === 'special' && (
                  <div className="space-y-4">
                    <div className="p-3.5 bg-amber-50/70 border border-amber-200/80 rounded-2xl flex items-center gap-2.5 text-xs text-amber-800 font-bold">
                      <ShieldCheck className="w-5 h-5 text-amber-600 shrink-0" />
                      <span>
                        این اختیارات به صورت خاص روی عملیات‌های حساس مثل قیمت‌گذاری، تخفیف، حذف اسناد و سود فروشگاه اعمال می‌شوند.
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {/* Edit Prices */}
                      <label className="flex items-start gap-3 p-3.5 bg-slate-50 hover:bg-slate-100/80 rounded-2xl border border-slate-200 cursor-pointer transition-colors">
                        <input
                          type="checkbox"
                          checked={Boolean(form.specialPermissions.canEditPrices)}
                          onChange={e => setForm({
                            ...form,
                            specialPermissions: { ...form.specialPermissions, canEditPrices: e.target.checked }
                          })}
                          className="w-4 h-4 mt-0.5 text-indigo-600 rounded"
                        />
                        <div>
                          <span className="text-xs font-black text-slate-900 block">امکان ویرایش قیمت‌ها در فاکتور</span>
                          <span className="text-[10px] text-slate-500 font-medium">کاربر می‌تواند نرخ پیش‌فرض اجناس را در فاکتور تغییر دهد</span>
                        </div>
                      </label>

                      {/* Delete Invoices */}
                      <label className="flex items-start gap-3 p-3.5 bg-slate-50 hover:bg-slate-100/80 rounded-2xl border border-slate-200 cursor-pointer transition-colors">
                        <input
                          type="checkbox"
                          checked={Boolean(form.specialPermissions.canDeleteInvoices)}
                          onChange={e => setForm({
                            ...form,
                            specialPermissions: { ...form.specialPermissions, canDeleteInvoices: e.target.checked }
                          })}
                          className="w-4 h-4 mt-0.5 text-rose-600 rounded"
                        />
                        <div>
                          <span className="text-xs font-black text-slate-900 block text-rose-700">امکان حذف فاکتورها و اسناد</span>
                          <span className="text-[10px] text-slate-500 font-medium">امکان حذف اسناد فاکتور ثبت شده و پاک‌سازی داده‌ها</span>
                        </div>
                      </label>

                      {/* Give Discounts */}
                      <label className="flex items-start gap-3 p-3.5 bg-slate-50 hover:bg-slate-100/80 rounded-2xl border border-slate-200 cursor-pointer transition-colors">
                        <input
                          type="checkbox"
                          checked={Boolean(form.specialPermissions.canGiveDiscounts)}
                          onChange={e => setForm({
                            ...form,
                            specialPermissions: { ...form.specialPermissions, canGiveDiscounts: e.target.checked }
                          })}
                          className="w-4 h-4 mt-0.5 text-indigo-600 rounded"
                        />
                        <div>
                          <span className="text-xs font-black text-slate-900 block">امکان اعمال تخفیف در فاکتورها</span>
                          <span className="text-[10px] text-slate-500 font-medium">اجازه ثبت تخفیف سطری یا تخفیف کلی فاکتور</span>
                        </div>
                      </label>

                      {/* View Cost & Profit */}
                      <label className="flex items-start gap-3 p-3.5 bg-slate-50 hover:bg-slate-100/80 rounded-2xl border border-slate-200 cursor-pointer transition-colors">
                        <input
                          type="checkbox"
                          checked={Boolean(form.specialPermissions.canViewCostAndProfit)}
                          onChange={e => setForm({
                            ...form,
                            specialPermissions: { ...form.specialPermissions, canViewCostAndProfit: e.target.checked }
                          })}
                          className="w-4 h-4 mt-0.5 text-indigo-600 rounded"
                        />
                        <div>
                          <span className="text-xs font-black text-slate-900 block">مشاهده قیمت تمام‌شده و سود</span>
                          <span className="text-[10px] text-slate-500 font-medium">نمایش حاشیه سود، بهای خرید و گزارشات سود خالص و ناخالص</span>
                        </div>
                      </label>

                      {/* Approve Checks */}
                      <label className="flex items-start gap-3 p-3.5 bg-slate-50 hover:bg-slate-100/80 rounded-2xl border border-slate-200 cursor-pointer transition-colors">
                        <input
                          type="checkbox"
                          checked={Boolean(form.specialPermissions.canApproveChecks)}
                          onChange={e => setForm({
                            ...form,
                            specialPermissions: { ...form.specialPermissions, canApproveChecks: e.target.checked }
                          })}
                          className="w-4 h-4 mt-0.5 text-indigo-600 rounded"
                        />
                        <div>
                          <span className="text-xs font-black text-slate-900 block">تایید، وصول و خرج چک‌ها</span>
                          <span className="text-[10px] text-slate-500 font-medium">اجازه تغییر وضعیت چک‌های صیادی و ثبت عملیات وصولی</span>
                        </div>
                      </label>

                      {/* All Warehouses */}
                      <label className="flex items-start gap-3 p-3.5 bg-slate-50 hover:bg-slate-100/80 rounded-2xl border border-slate-200 cursor-pointer transition-colors">
                        <input
                          type="checkbox"
                          checked={form.specialPermissions.canAccessAllWarehouses !== false}
                          onChange={e => setForm({
                            ...form,
                            specialPermissions: { ...form.specialPermissions, canAccessAllWarehouses: e.target.checked }
                          })}
                          className="w-4 h-4 mt-0.5 text-indigo-600 rounded"
                        />
                        <div>
                          <span className="text-xs font-black text-slate-900 block">دسترسی به تمامی انبارها</span>
                          <span className="text-[10px] text-slate-500 font-medium">مشاهده و ثبت حواله برای همه انبارها و شعبات</span>
                        </div>
                      </label>

                      {/* Manage Users */}
                      <label className="flex items-start gap-3 p-3.5 bg-slate-50 hover:bg-slate-100/80 rounded-2xl border border-slate-200 cursor-pointer transition-colors">
                        <input
                          type="checkbox"
                          checked={Boolean(form.specialPermissions.canManageUsers)}
                          onChange={e => setForm({
                            ...form,
                            specialPermissions: { ...form.specialPermissions, canManageUsers: e.target.checked }
                          })}
                          className="w-4 h-4 mt-0.5 text-indigo-600 rounded"
                        />
                        <div>
                          <span className="text-xs font-black text-slate-900 block">مدیریت کاربران و سطوح دسترسی</span>
                          <span className="text-[10px] text-slate-500 font-medium">امکان تعریف و ویرایش کاربران دیگر در سیستم</span>
                        </div>
                      </label>

                      {/* Manage Settings */}
                      <label className="flex items-start gap-3 p-3.5 bg-slate-50 hover:bg-slate-100/80 rounded-2xl border border-slate-200 cursor-pointer transition-colors">
                        <input
                          type="checkbox"
                          checked={Boolean(form.specialPermissions.canManageSettings)}
                          onChange={e => setForm({
                            ...form,
                            specialPermissions: { ...form.specialPermissions, canManageSettings: e.target.checked }
                          })}
                          className="w-4 h-4 mt-0.5 text-indigo-600 rounded"
                        />
                        <div>
                          <span className="text-xs font-black text-slate-900 block">مدیریت تنظیمات عمومی فروشگاه</span>
                          <span className="text-[10px] text-slate-500 font-medium">تغییر نام فروشگاه، الگوهای فاکتور، لوگو و شماره‌ها</span>
                        </div>
                      </label>
                    </div>
                  </div>
                )}

                {/* Modal Footer Controls */}
                <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
                  <button 
                    type="submit" 
                    className="flex-1 py-3 px-5 bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white rounded-2xl text-xs md:text-sm font-black transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/25 cursor-pointer"
                  >
                    <CheckCircle className="w-4 h-4" />
                    <span>ذخیره نهایی اطلاعات و دسترسی‌ها</span>
                  </button>

                  <button 
                    type="button" 
                    onClick={() => setIsModalOpen(false)} 
                    className="py-3 px-6 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl text-xs md:text-sm font-bold transition-colors cursor-pointer"
                  >
                    انصراف
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
