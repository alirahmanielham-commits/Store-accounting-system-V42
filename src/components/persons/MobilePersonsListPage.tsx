import React, { useState, useMemo } from 'react';
import {
  Users,
  Search,
  Filter,
  UserPlus,
  Phone,
  ArrowRight,
  Menu,
  RotateCcw,
  Building,
  User,
  ArrowDownLeft,
  ArrowUpRight,
  Wallet,
  ChevronDown,
  ChevronUp,
  X,
  CreditCard,
  MapPin,
  ExternalLink,
  Receipt,
  FileText,
  CheckCircle2,
  AlertCircle,
  Hash,
  Tag
} from 'lucide-react';
import { addCommas, toPersianDigits } from '../../utils/format';
import { playAudioFeedback } from '../../utils/audio';

interface MobilePersonsListPageProps {
  persons?: any[];
  personGroups?: any[];
  personRoles?: any[];
  storeSettings?: any;
  calculatePersonBalance?: (personId: any) => { status: string; amount: number; isDebtor?: boolean; isCreditor?: boolean };
  fetchPersons?: () => Promise<void>;
  onOpenMenu?: () => void;
  onBack?: () => void;
  onSelectPersonForReceipt?: (person: any, type?: 'receive' | 'pay') => void;
  onGoToCreatePerson?: () => void;
  showNotification?: (msg: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
}

export default function MobilePersonsListPage({
  persons = [],
  personGroups = [],
  personRoles = [],
  storeSettings,
  calculatePersonBalance,
  fetchPersons,
  onOpenMenu,
  onBack,
  onSelectPersonForReceipt,
  onGoToCreatePerson,
  showNotification
}: MobilePersonsListPageProps) {
  const currency = storeSettings?.currency || 'تومان';

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'customer' | 'supplier' | 'colleague' | 'employee'>('all');
  const [balanceFilter, setBalanceFilter] = useState<'all' | 'debtor' | 'creditor' | 'settled'>('all');
  const [groupFilter, setGroupFilter] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [expandedPersonId, setExpandedPersonId] = useState<string | null>(null);

  // Helper: display name
  const getDisplayName = (p: any) => {
    if (p.name) return p.name;
    if (p.fullName) return p.fullName;
    if (p.companyName) return p.companyName;
    const parts = [p.title, p.firstName, p.lastName].filter(Boolean);
    if (parts.length > 0) return parts.join(' ');
    return 'شخص بدون نام';
  };

  // Helper: role badge info
  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'customer':
        return { label: 'مشتری', bg: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200/50' };
      case 'supplier':
        return { label: 'تامین‌کننده', bg: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200/50' };
      case 'colleague':
        return { label: 'همکار / ویزیتور', bg: 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-indigo-200/50' };
      case 'employee':
        return { label: 'پرسنل / کارمند', bg: 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-200/50' };
      default:
        return { label: role || 'طرف‌حساب', bg: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200' };
    }
  };

  // Filter persons list
  const filteredPersons = useMemo(() => {
    const cleanSearch = searchTerm.trim().toLowerCase();

    return persons.filter(p => {
      // 1. Role filter
      if (roleFilter !== 'all') {
        const pRoles: string[] = Array.isArray(p.roles) && p.roles.length > 0 ? p.roles : [p.role || 'customer'];
        if (!pRoles.includes(roleFilter) && p.role !== roleFilter) {
          return false;
        }
      }

      // 2. Group filter
      if (groupFilter !== 'all') {
        if (p.group !== groupFilter && p.groupId !== groupFilter) {
          return false;
        }
      }

      // 3. Balance filter
      if (balanceFilter !== 'all' && calculatePersonBalance) {
        const bal = calculatePersonBalance(p.id);
        const amount = Number(bal?.amount || 0);
        if (balanceFilter === 'debtor' && !(bal?.isDebtor || amount > 0)) return false;
        if (balanceFilter === 'creditor' && !(bal?.isCreditor || amount < 0)) return false;
        if (balanceFilter === 'settled' && amount !== 0) return false;
      }

      // 4. Search text (name, alias, phone, mobile, accountingCode, nationalId)
      if (cleanSearch) {
        const dName = getDisplayName(p).toLowerCase();
        const alias = (p.alias || '').toLowerCase();
        const mobile = (p.mobile || p.phone || '').toString().toLowerCase();
        const code = (p.accountingCode || p.personCode || '').toString().toLowerCase();
        const national = (p.nationalId || '').toString().toLowerCase();

        const match =
          dName.includes(cleanSearch) ||
          alias.includes(cleanSearch) ||
          mobile.includes(cleanSearch) ||
          code.includes(cleanSearch) ||
          national.includes(cleanSearch);

        if (!match) return false;
      }

      return true;
    });
  }, [persons, searchTerm, roleFilter, groupFilter, balanceFilter, calculatePersonBalance]);

  // Counts for quick filter pills
  const stats = useMemo(() => {
    let debtorCount = 0;
    let creditorCount = 0;
    let customerCount = 0;

    persons.forEach(p => {
      if (p.role === 'customer' || (Array.isArray(p.roles) && p.roles.includes('customer'))) customerCount++;
      if (calculatePersonBalance) {
        const bal = calculatePersonBalance(p.id);
        const amount = Number(bal?.amount || 0);
        if (bal?.isDebtor || amount > 0) debtorCount++;
        else if (bal?.isCreditor || amount < 0) creditorCount++;
      }
    });

    return { total: persons.length, debtorCount, creditorCount, customerCount };
  }, [persons, calculatePersonBalance]);

  const toggleExpand = (id: string) => {
    setExpandedPersonId(prev => (prev === id ? null : id));
    try { playAudioFeedback('info'); } catch (_) {}
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setRoleFilter('all');
    setBalanceFilter('all');
    setGroupFilter('all');
  };

  const hasActiveFilters = searchTerm !== '' || roleFilter !== 'all' || balanceFilter !== 'all' || groupFilter !== 'all';

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-24 font-sans select-none max-w-2xl mx-auto" dir="rtl">
      {/* Sticky Mobile Top App Bar */}
      <div className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 py-3 flex items-center justify-between shadow-2xs">
        <div className="flex items-center gap-2.5">
          {onOpenMenu && (
            <button
              type="button"
              onClick={onOpenMenu}
              className="w-9 h-9 rounded-xl flex items-center justify-center bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
              title="منوی اصلی و عملیات مجاز همراه"
              aria-label="باز کردن منو"
            >
              <Menu className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            </button>
          )}

          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="w-9 h-9 rounded-xl flex items-center justify-center bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
              title="بازگشت"
            >
              <ArrowRight className="w-5 h-5" />
            </button>
          )}

          <div>
            <h1 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-1.5">
              <Users className="w-4 h-4 text-indigo-600" />
              <span>لیست و جستجوی طرف‌حساب‌ها</span>
            </h1>
            <p className="text-[11px] text-slate-400 font-medium">
              {toPersianDigits(filteredPersons.length)} نفر یافت شد
            </p>
          </div>
        </div>

        {/* Quick Add Person Button */}
        {onGoToCreatePerson && (
          <button
            type="button"
            onClick={onGoToCreatePerson}
            className="h-9 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm shadow-emerald-500/20 active:scale-95 transition cursor-pointer"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>ثبت شخص</span>
          </button>
        )}
      </div>

      <div className="p-4 space-y-3.5">
        {/* Search Input Box */}
        <div className="relative">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="جستجوی نام، تلفن، کد حسابداری یا شناسه..."
            className="w-full h-11 pr-10 pl-10 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs font-bold outline-none focus:border-indigo-500 text-slate-800 dark:text-slate-100 shadow-2xs"
          />
          <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 absolute left-3 top-1/2 -translate-y-1/2 flex items-center justify-center cursor-pointer text-xs"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Quick KPI & Filter Chips (Horizontal Scrollable) */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
          <button
            type="button"
            onClick={() => {
              setRoleFilter('all');
              setBalanceFilter('all');
            }}
            className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition cursor-pointer shrink-0 border ${
              roleFilter === 'all' && balanceFilter === 'all'
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-transparent shadow-xs'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800'
            }`}
          >
            همه ({toPersianDigits(stats.total)})
          </button>

          <button
            type="button"
            onClick={() => setBalanceFilter(prev => prev === 'debtor' ? 'all' : 'debtor')}
            className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition cursor-pointer shrink-0 border ${
              balanceFilter === 'debtor'
                ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200/50'
            }`}
          >
            بدهکاران ({toPersianDigits(stats.debtorCount)})
          </button>

          <button
            type="button"
            onClick={() => setBalanceFilter(prev => prev === 'creditor' ? 'all' : 'creditor')}
            className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition cursor-pointer shrink-0 border ${
              balanceFilter === 'creditor'
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200/50'
            }`}
          >
            بستانکاران ({toPersianDigits(stats.creditorCount)})
          </button>

          <button
            type="button"
            onClick={() => setRoleFilter(prev => prev === 'customer' ? 'all' : 'customer')}
            className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition cursor-pointer shrink-0 border ${
              roleFilter === 'customer'
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                : 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-indigo-200/50'
            }`}
          >
            مشتریان ({toPersianDigits(stats.customerCount)})
          </button>

          <button
            type="button"
            onClick={() => setShowFilters(prev => !prev)}
            className={`px-2.5 py-1.5 rounded-xl font-bold whitespace-nowrap transition cursor-pointer shrink-0 flex items-center gap-1 border ${
              showFilters || groupFilter !== 'all' || (roleFilter !== 'all' && roleFilter !== 'customer')
                ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border-indigo-300'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800'
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            <span>فیلترها</span>
          </button>
        </div>

        {/* Expandable Advanced Filter Drawer */}
        {showFilters && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3 animate-in fade-in">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-slate-800 dark:text-white flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-indigo-600" />
                <span>فیلترهای پیشرفته</span>
              </span>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={handleClearFilters}
                  className="text-[11px] text-rose-600 dark:text-rose-400 font-bold flex items-center gap-1 hover:underline cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>پاک کردن همه</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              {/* Role Select */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1">نقش طرف‌حساب</label>
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value as any)}
                  className="w-full h-9 px-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold outline-none text-slate-800 dark:text-slate-200"
                >
                  <option value="all">همه نقش‌ها</option>
                  <option value="customer">مشتری</option>
                  <option value="supplier">تامین‌کننده</option>
                  <option value="colleague">همکار / ویزیتور</option>
                  <option value="employee">پرسنل / کارمند</option>
                </select>
              </div>

              {/* Balance Select */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1">وضعیت مانده حساب</label>
                <select
                  value={balanceFilter}
                  onChange={(e) => setBalanceFilter(e.target.value as any)}
                  className="w-full h-9 px-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold outline-none text-slate-800 dark:text-slate-200"
                >
                  <option value="all">همه وضعیت‌ها</option>
                  <option value="debtor">بدهکار (به ما)</option>
                  <option value="creditor">بستانکار (از ما)</option>
                  <option value="settled">تسویه و بی‌حساب</option>
                </select>
              </div>
            </div>

            {/* Group Select if groups exist */}
            {personGroups && personGroups.length > 0 && (
              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1">گروه‌بندی</label>
                <select
                  value={groupFilter}
                  onChange={(e) => setGroupFilter(e.target.value)}
                  className="w-full h-9 px-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold outline-none text-slate-800 dark:text-slate-200"
                >
                  <option value="all">همه گروه‌ها</option>
                  {personGroups.map((g: any) => (
                    <option key={g.id} value={g.id || g.name}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}

        {/* Empty State */}
        {filteredPersons.length === 0 && (
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-200 dark:border-slate-800 text-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
              <Users className="w-7 h-7" />
            </div>
            <h3 className="text-sm font-black text-slate-800 dark:text-slate-100">
              هیچ طرف‌حسابی یافت نشد
            </h3>
            <p className="text-xs text-slate-400 max-w-xs mx-auto">
              {hasActiveFilters
                ? 'با تغییر یا بازنشانی فیلترها و کلمه جستجو دوباره امتحان فرمایید.'
                : 'هنوز طرف‌حسابی در سیستم تعریف نشده است.'}
            </p>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleClearFilters}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>پاک کردن فیلترها</span>
              </button>
            )}
          </div>
        )}

        {/* Persons Card List */}
        <div className="space-y-2.5">
          {filteredPersons.map((person) => {
            const isExpanded = expandedPersonId === person.id;
            const displayName = getDisplayName(person);
            const roleBadge = getRoleBadge(person.role || 'customer');
            const phoneStr = person.mobile || person.phone || '';
            const accountingCode = person.accountingCode || person.personCode || '';

            // Calculate balance
            let balanceAmount = 0;
            let balanceStatus = 'settled';
            let isDebtor = false;
            let isCreditor = false;

            if (calculatePersonBalance) {
              const bal = calculatePersonBalance(person.id);
              balanceAmount = Math.abs(Number(bal?.amount || 0));
              isDebtor = !!bal?.isDebtor || Number(bal?.amount || 0) > 0;
              isCreditor = !!bal?.isCreditor || Number(bal?.amount || 0) < 0;
              if (isDebtor) balanceStatus = 'debtor';
              else if (isCreditor) balanceStatus = 'creditor';
            }

            return (
              <div
                key={person.id}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs overflow-hidden transition-all"
              >
                {/* Main Tapable Header */}
                <div
                  onClick={() => toggleExpand(person.id)}
                  className="p-3.5 flex items-center justify-between cursor-pointer hover:bg-slate-50/70 dark:hover:bg-slate-850 transition"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Avatar Icon */}
                    <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 font-black text-sm shadow-2xs ${
                      isDebtor
                        ? 'bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 border border-rose-200/50'
                        : isCreditor
                        ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200/50'
                        : 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border border-indigo-200/50'
                    }`}>
                      {person.personType === 'legal' ? (
                        <Building className="w-5 h-5" />
                      ) : (
                        <User className="w-5 h-5" />
                      )}
                    </div>

                    {/* Person Main Info */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-xs font-black text-slate-900 dark:text-white truncate">
                          {displayName}
                        </h3>
                        {person.alias && person.alias !== displayName && (
                          <span className="text-[10px] text-slate-400 truncate">
                            ({person.alias})
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        {/* Role Badge */}
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${roleBadge.bg}`}>
                          {roleBadge.label}
                        </span>

                        {/* Phone if available */}
                        {phoneStr && (
                          <span className="text-[11px] font-mono font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1" dir="ltr">
                            <Phone className="w-3 h-3 text-slate-400" />
                            <span>{toPersianDigits(phoneStr)}</span>
                          </span>
                        )}

                        {/* Accounting Code */}
                        {accountingCode && (
                          <span className="text-[10px] font-mono text-slate-400">
                            #{toPersianDigits(accountingCode)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Balance Display & Chevron */}
                  <div className="flex items-center gap-2.5 shrink-0 text-left mr-2">
                    <div className="text-left">
                      {balanceStatus === 'debtor' ? (
                        <div className="text-rose-600 dark:text-rose-400">
                          <div className="text-xs font-black font-mono" dir="ltr">
                            {toPersianDigits(addCommas(balanceAmount))}
                          </div>
                          <div className="text-[9px] font-bold text-rose-500">
                            بدهکار ({currency})
                          </div>
                        </div>
                      ) : balanceStatus === 'creditor' ? (
                        <div className="text-emerald-600 dark:text-emerald-400">
                          <div className="text-xs font-black font-mono" dir="ltr">
                            {toPersianDigits(addCommas(balanceAmount))}
                          </div>
                          <div className="text-[9px] font-bold text-emerald-500">
                            بستانکار ({currency})
                          </div>
                        </div>
                      ) : (
                        <div className="text-slate-400">
                          <div className="text-xs font-black font-mono">۰</div>
                          <div className="text-[9px] font-medium">تسویه</div>
                        </div>
                      )}
                    </div>

                    <div className="text-slate-400">
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </div>
                </div>

                {/* Expanded Action Panel & Details */}
                {isExpanded && (
                  <div className="px-3.5 pb-3.5 pt-2 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-850/40 space-y-3 animate-in fade-in">
                    {/* Extended Details Grid */}
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {person.nationalId && (
                        <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800">
                          <span className="text-[10px] text-slate-400 block font-bold">کد / شناسه ملی:</span>
                          <span className="font-mono font-bold text-slate-800 dark:text-slate-200" dir="ltr">
                            {toPersianDigits(person.nationalId)}
                          </span>
                        </div>
                      )}

                      {person.group && (
                        <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800">
                          <span className="text-[10px] text-slate-400 block font-bold">گروه طرف‌حساب:</span>
                          <span className="font-bold text-slate-800 dark:text-slate-200">
                            {person.group}
                          </span>
                        </div>
                      )}

                      {(person.city || person.province) && (
                        <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 col-span-2">
                          <span className="text-[10px] text-slate-400 block font-bold">موقعیت و آدرس:</span>
                          <p className="font-medium text-slate-700 dark:text-slate-300 text-[11px] leading-relaxed mt-0.5">
                            {[person.province, person.city, person.address].filter(Boolean).join(' - ')}
                          </p>
                        </div>
                      )}

                      {/* Bank Account Info if exists */}
                      {Array.isArray(person.bankAccounts) && person.bankAccounts.length > 0 && (
                        <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 col-span-2 space-y-1">
                          <span className="text-[10px] text-slate-400 flex items-center gap-1 font-bold">
                            <CreditCard className="w-3 h-3 text-indigo-500" />
                            <span>اطلاعات بانکی:</span>
                          </span>
                          <div className="text-[11px] font-mono font-bold text-slate-800 dark:text-slate-200 flex flex-wrap gap-2" dir="ltr">
                            {person.bankAccounts[0].cardNumber && (
                              <span>کارت: {person.bankAccounts[0].cardNumber}</span>
                            )}
                            {person.bankAccounts[0].shebaNumber && (
                              <span>شبا: {person.bankAccounts[0].shebaNumber}</span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Quick Mobile Action Buttons */}
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      {/* Receive Receipt Button */}
                      <button
                        type="button"
                        onClick={() => {
                          if (onSelectPersonForReceipt) {
                            onSelectPersonForReceipt(person, 'receive');
                          }
                        }}
                        className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black flex items-center justify-center gap-1.5 transition cursor-pointer shadow-xs active:scale-98"
                      >
                        <ArrowDownLeft className="w-4 h-4" />
                        <span>ثبت رسید دریافت</span>
                      </button>

                      {/* Pay Receipt Button */}
                      <button
                        type="button"
                        onClick={() => {
                          if (onSelectPersonForReceipt) {
                            onSelectPersonForReceipt(person, 'pay');
                          }
                        }}
                        className="py-2.5 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black flex items-center justify-center gap-1.5 transition cursor-pointer shadow-xs active:scale-98"
                      >
                        <ArrowUpRight className="w-4 h-4" />
                        <span>ثبت رسید پرداخت</span>
                      </button>

                      {/* Call Phone Button if has phone */}
                      {phoneStr && (
                        <a
                          href={`tel:${phoneStr}`}
                          className="py-2 px-3 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center justify-center gap-1.5 transition col-span-2"
                        >
                          <Phone className="w-3.5 h-3.5 text-emerald-600" />
                          <span>تماس مستقیم با {displayName} ({toPersianDigits(phoneStr)})</span>
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
