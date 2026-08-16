const fs = require('fs');

const code = `import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  User, Search, Filter, Plus, GripHorizontal, List, Users, Edit2, FileText,
  ChevronUp, ChevronDown, CheckCircle, Database, Phone, MapPin, Activity, Ban,
  Banknote, History, Printer, ShoppingCart, ArrowDownToLine, ArrowUpFromLine,
  Info, Trash2, RefreshCw, Key, ArrowRightLeft, LayoutGrid, Table as TableIcon,
  Building, BookOpen, Settings, Check, X, FilterX, MoreHorizontal, FileSpreadsheet
} from "lucide-react";

export default function PersonsManager(props: any) {
  const { 
    filteredPersons,
    personPageSize,
    personCurrentPage,
    calculatePersonBalance,
    formatNumber,
    personSearchTerm,
    setPersonSearchTerm,
    selectedPersonGroup,
    setSelectedPersonGroup,
    personGroups,
    selectedPersonRole,
    setSelectedPersonRole,
    personRoles,
    personCategories = [],
    personsViewMode,
    setPersonsViewMode,
    setIsPersonModalOpen,
    setPersonCurrentPage,
    getRoleBadgeClasses,
    getRoleName,
    handleEditPerson,
    setProfilePersonId,
    setLedgerPersonId,
    setRawActiveTab,
    handleDeletePerson,
    setPrintingPersonLedger,
    fetchPersons,
    activePersonsOnly,
    clearDraft,
    handleGenerateMissingAccountingCodes,
    isGeneratingCodes,
    setPersonIOAction,
    setIsPersonIOModalOpen,
    setEditingPersonId,
    setNewPersonType,
    setNewPersonTitle,
    setNewPersonAlias,
    setNewPersonFirstName,
    setNewPersonLastName,
    setNewPersonCompanyName,
    setNewPersonFatherName,
    setNewPersonNationalId,
    setNewPersonAccountingCode,
    setNewPersonAddress,
    setNewPersonImage,
    setNewPersonPhone,
    setNewPersonContacts,
    setNewPersonRole,
    newPersonTaxNumber,
    setNewPersonTaxNumber,
    newPersonRegistrationNumber,
    setNewPersonRegistrationNumber,
    newPersonRoles,
    setNewPersonRoles,
    newPersonCategories,
    setNewPersonCategories,
    duplicatePersonsWarning,
    setDuplicatePersonsWarning,
    setNewPersonInitialBalance,
    setNewPersonInitialBalanceType,
    setNewPersonCreditLimit,
    successMsg,
    getPersonDisplayName,
    toPersianDigits,
    storeSettings,
    setCustomerId,
    setReceiptPersonId,
    setPersonExtraId,
    setPersonBankName,
    setPersonBankAcc,
    setPersonCard,
    setPersonSheba,
    setPersonBankAccounts,
    setPersonNotes,
    setIsPersonExtraModalOpen,
    confirmAction,
    setPersonPageSize,
    setActiveTab,
  } = props;

  const [openPersonActionsId, setOpenPersonActionsId] = useState<any>(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Advanced Filters
  const [filterActiveStatus, setFilterActiveStatus] = useState<string>('all');
  const [filterBalanceStatus, setFilterBalanceStatus] = useState<string>('all');
  const [filterPersonType, setFilterPersonType] = useState<string>('all');

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Compute Balances and advanced filtering
  const processedPersons = useMemo(() => {
    return filteredPersons.map((p: any) => {
      const balResult = calculatePersonBalance(p.id);
      let b = balResult.amount;
      if (balResult.status === "بستانکار") b = -Math.abs(b);
      else if (balResult.status === "بدهکار") b = Math.abs(b);
      else b = 0;
      return { ...p, calculatedBalance: b };
    }).filter((p: any) => {
      if (filterActiveStatus === 'active' && p.isActive === false) return false;
      if (filterActiveStatus === 'inactive' && p.isActive !== false) return false;
      
      if (filterBalanceStatus === 'debtor' && p.calculatedBalance <= 0) return false;
      if (filterBalanceStatus === 'creditor' && p.calculatedBalance >= 0) return false;
      if (filterBalanceStatus === 'settled' && p.calculatedBalance !== 0) return false;
      if (filterBalanceStatus === 'has_balance' && p.calculatedBalance === 0) return false;

      if (filterPersonType === 'real' && p.personType === 'legal') return false;
      if (filterPersonType === 'legal' && p.personType === 'real') return false;

      return true;
    });
  }, [filteredPersons, calculatePersonBalance, filterActiveStatus, filterBalanceStatus, filterPersonType]);

  const totalPages = Math.ceil(processedPersons.length / personPageSize);
  const safeCurrentPage = Math.max(1, Math.min(personCurrentPage, totalPages));
  const paginatedPersons = processedPersons.slice(
    (safeCurrentPage - 1) * personPageSize,
    safeCurrentPage * personPageSize
  );

  // KPIs
  const kpis = useMemo(() => {
    let customers = 0;
    let suppliers = 0;
    let active = 0;
    let totalDebtors = 0;
    let totalCreditors = 0;
    
    processedPersons.forEach((p: any) => {
      if (p.role === 'customer') customers++;
      if (p.role === 'supplier') suppliers++;
      if (p.isActive !== false) active++;
      if (p.calculatedBalance > 0) totalDebtors += p.calculatedBalance;
      if (p.calculatedBalance < 0) totalCreditors += Math.abs(p.calculatedBalance);
    });

    return {
      total: processedPersons.length,
      customers,
      suppliers,
      active,
      totalDebtors,
      totalCreditors
    };
  }, [processedPersons]);

  const effectiveViewMode = isMobile ? "list" : personsViewMode;

  const toggleSelection = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(x => x !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const selectAll = () => {
    if (selectedIds.length === paginatedPersons.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(paginatedPersons.map((p: any) => p.id));
    }
  };

  const clearAllFilters = () => {
    setPersonSearchTerm('');
    setSelectedPersonGroup('all');
    setSelectedPersonRole('all');
    setFilterActiveStatus('all');
    setFilterBalanceStatus('all');
    setFilterPersonType('all');
  };

  return (
    <div className="w-full flex-1 flex flex-col relative h-full bg-slate-50" dir="rtl">
      {/* Header */}
      <div className="bg-white px-6 sm:px-8 py-5 border-b border-slate-200 sticky top-0 z-30 shadow-sm">
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
          <div>
            <h1 className="text-xl font-black text-slate-800 flex items-center gap-2">
              <Users className="w-6 h-6 text-indigo-600" />
              اشخاص و طرف‌حساب‌ها
            </h1>
            <p className="text-xs text-slate-500 font-semibold mt-1">
              مدیریت جامع مشتریان، تامین‌کنندگان، پرسنل و سایر طرف‌حساب‌های سازمان
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleGenerateMissingAccountingCodes}
              disabled={isGeneratingCodes}
              className="px-3 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 bg-white rounded-lg flex items-center gap-1.5 transition-all text-xs font-bold disabled:opacity-50"
              title="تخصیص کد حسابداری"
            >
              <Key className={\`w-4 h-4 \${isGeneratingCodes ? 'text-indigo-500 animate-spin' : 'text-slate-500'}\`} />
              کدگذاری
            </button>
            <button
              onClick={() => { setPersonIOAction("export"); setIsPersonIOModalOpen(true); }}
              className="px-3 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 bg-white rounded-lg flex items-center gap-1.5 transition-all text-xs font-bold"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              اکسل
            </button>
            <button
              onClick={() => {
                setEditingPersonId(null);
                setNewPersonType("real");
                setNewPersonTitle("");
                setNewPersonAlias("");
                setNewPersonFirstName("");
                setNewPersonLastName("");
                setNewPersonCompanyName("");
                setNewPersonFatherName("");
                setNewPersonNationalId("");
                setNewPersonAccountingCode("");
                setNewPersonAddress("");
                setNewPersonImage("");
                setNewPersonPhone("");
                setNewPersonContacts([]);
                setNewPersonRole("customer");
                setNewPersonInitialBalance("");
                setNewPersonInitialBalanceType("settled");
                setNewPersonCreditLimit("");
                setIsPersonModalOpen(true);
              }}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg flex items-center gap-1.5 transition-all text-xs font-black shadow-sm"
            >
              <Plus className="w-4 h-4" strokeWidth={2.5} />
              شخص جدید
            </button>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mt-6">
          <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 flex flex-col justify-center">
            <span className="text-[10px] font-black text-slate-500 mb-1 flex items-center gap-1"><Users className="w-3 h-3"/> کل اشخاص</span>
            <span className="text-lg font-black text-slate-800 font-sans">{toPersianDigits(kpis.total)}</span>
          </div>
          <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-3 flex flex-col justify-center">
            <span className="text-[10px] font-black text-blue-600 mb-1 flex items-center gap-1"><ShoppingCart className="w-3 h-3"/> مشتریان</span>
            <span className="text-lg font-black text-blue-800 font-sans">{toPersianDigits(kpis.customers)}</span>
          </div>
          <div className="bg-amber-50/50 border border-amber-100 rounded-xl p-3 flex flex-col justify-center">
            <span className="text-[10px] font-black text-amber-600 mb-1 flex items-center gap-1"><Building className="w-3 h-3"/> تامین‌کنندگان</span>
            <span className="text-lg font-black text-amber-800 font-sans">{toPersianDigits(kpis.suppliers)}</span>
          </div>
          <div className="bg-emerald-50/50 border border-emerald-100 rounded-xl p-3 flex flex-col justify-center">
            <span className="text-[10px] font-black text-emerald-600 mb-1 flex items-center gap-1"><CheckCircle className="w-3 h-3"/> فعال</span>
            <span className="text-lg font-black text-emerald-800 font-sans">{toPersianDigits(kpis.active)}</span>
          </div>
          <div className="bg-rose-50 border border-rose-100 rounded-xl p-3 flex flex-col justify-center">
            <span className="text-[10px] font-black text-rose-600 mb-1 flex items-center gap-1"><ArrowDownToLine className="w-3 h-3"/> مطالبات (بدهکاران)</span>
            <span className="text-sm font-black text-rose-800 font-sans truncate" title={formatNumber(kpis.totalDebtors)}>
              {kpis.totalDebtors === 0 ? "۰" : toPersianDigits(formatNumber(kpis.totalDebtors))}
              <span className="text-[8px] mr-1">{storeSettings.currency}</span>
            </span>
          </div>
          <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 flex flex-col justify-center">
            <span className="text-[10px] font-black text-emerald-600 mb-1 flex items-center gap-1"><ArrowUpFromLine className="w-3 h-3"/> بدهی‌ها (بستانکاران)</span>
            <span className="text-sm font-black text-emerald-800 font-sans truncate" title={formatNumber(kpis.totalCreditors)}>
              {kpis.totalCreditors === 0 ? "۰" : toPersianDigits(formatNumber(kpis.totalCreditors))}
              <span className="text-[8px] mr-1">{storeSettings.currency}</span>
            </span>
          </div>
        </div>
        
        {successMsg && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="mt-4">
            <div className="bg-emerald-50 text-emerald-700 px-4 py-3 rounded-xl flex items-center gap-2 border border-emerald-100 shadow-sm text-xs font-bold">
              <CheckCircle className="w-4 h-4 text-emerald-500" />
              {successMsg}
            </div>
          </motion.div>
        )}
      </div>

      {/* Toolbar & Filters */}
      <div className="px-6 sm:px-8 py-4 bg-white/50 border-b border-slate-200">
        <div className="flex flex-col xl:flex-row gap-3 xl:items-center justify-between">
          <div className="relative w-full xl:max-w-md">
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
              <Search className="w-4 h-4 text-slate-400" />
            </div>
            <input
              type="text"
              className="w-full pl-3 pr-9 py-2 rounded-lg border border-slate-200 bg-white hover:border-indigo-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all text-sm font-bold outline-none"
              placeholder="جستجو در نام، موبایل، کد و..."
              value={personSearchTerm}
              onChange={(e) => setPersonSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className={\`px-3 py-2 rounded-lg border text-xs font-bold flex items-center gap-1.5 transition-colors \${isFilterOpen ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'}\`}
            >
              <Filter className="w-4 h-4" />
              فیلترهای پیشرفته
            </button>
            <div className="h-6 w-px bg-slate-200 hidden md:block"></div>
            <div className="hidden md:flex bg-slate-100 p-1 rounded-lg border border-slate-200">
              <button
                onClick={() => setPersonsViewMode("table")}
                className={\`p-1.5 rounded transition-all \${effectiveViewMode === "table" ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500 hover:text-slate-700"}\`}
                title="نمایش جدولی"
              >
                <TableIcon className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPersonsViewMode("list")}
                className={\`p-1.5 rounded transition-all \${effectiveViewMode === "list" ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500 hover:text-slate-700"}\`}
                title="نمایش کارتی"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Advanced Filters Drawer */}
        <AnimatePresence>
          {isFilterOpen && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }} 
              animate={{ height: "auto", opacity: 1 }} 
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden mt-3"
            >
              <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                
                <div>
                  <label className="block text-[10px] font-black text-slate-500 mb-1">نقش شخص</label>
                  <select 
                    value={selectedPersonRole} 
                    onChange={e => { setSelectedPersonRole(e.target.value); setPersonCurrentPage(1); }}
                    className="w-full text-xs font-bold border border-slate-200 rounded-lg py-1.5 px-2 outline-none focus:border-indigo-500"
                  >
                    <option value="all">همه نقش‌ها</option>
                    {(personRoles || []).map((r: any) => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-500 mb-1">گروه‌بندی</label>
                  <select 
                    value={selectedPersonGroup} 
                    onChange={e => { setSelectedPersonGroup(e.target.value); setPersonCurrentPage(1); }}
                    className="w-full text-xs font-bold border border-slate-200 rounded-lg py-1.5 px-2 outline-none focus:border-indigo-500"
                  >
                    <option value="all">همه گروه‌ها</option>
                    <option value="none">بدون گروه</option>
                    {(personGroups || []).map((g: any) => <option key={g.id} value={g.id}>{g.name}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-500 mb-1">وضعیت حساب</label>
                  <select 
                    value={filterBalanceStatus} 
                    onChange={e => { setFilterBalanceStatus(e.target.value); setPersonCurrentPage(1); }}
                    className="w-full text-xs font-bold border border-slate-200 rounded-lg py-1.5 px-2 outline-none focus:border-indigo-500"
                  >
                    <option value="all">همه موارد</option>
                    <option value="has_balance">دارای مانده (بدهکار/بستانکار)</option>
                    <option value="debtor">بدهکاران</option>
                    <option value="creditor">بستانکاران</option>
                    <option value="settled">بی‌حساب (تسویه)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-500 mb-1">وضعیت فعالیت</label>
                  <select 
                    value={filterActiveStatus} 
                    onChange={e => { setFilterActiveStatus(e.target.value); setPersonCurrentPage(1); }}
                    className="w-full text-xs font-bold border border-slate-200 rounded-lg py-1.5 px-2 outline-none focus:border-indigo-500"
                  >
                    <option value="all">همه موارد</option>
                    <option value="active">فعال</option>
                    <option value="inactive">مسدود / غیرفعال</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-500 mb-1">نوع شخص</label>
                  <select 
                    value={filterPersonType} 
                    onChange={e => { setFilterPersonType(e.target.value); setPersonCurrentPage(1); }}
                    className="w-full text-xs font-bold border border-slate-200 rounded-lg py-1.5 px-2 outline-none focus:border-indigo-500"
                  >
                    <option value="all">همه موارد</option>
                    <option value="real">حقیقی</option>
                    <option value="legal">حقوقی (شرکت)</option>
                  </select>
                </div>

              </div>
              <div className="flex justify-end mt-2">
                <button onClick={clearAllFilters} className="text-[10px] font-bold text-rose-500 flex items-center gap-1 hover:bg-rose-50 px-2 py-1 rounded">
                  <FilterX className="w-3 h-3" />
                  حذف همه فیلترها
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Main Content */}
      <div className="px-6 sm:px-8 py-6 flex-1 overflow-x-hidden">
        
        {/* Bulk Actions Bar */}
        <AnimatePresence>
          {selectedIds.length > 0 && (
            <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -20, opacity: 0 }} className="bg-indigo-900 text-white p-3 rounded-xl mb-4 flex items-center justify-between shadow-lg">
              <span className="text-xs font-bold flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-indigo-300" />
                {toPersianDigits(selectedIds.length)} مورد انتخاب شده
              </span>
              <div className="flex items-center gap-2">
                <button className="text-xs font-bold px-3 py-1.5 bg-indigo-800 hover:bg-indigo-700 rounded-lg transition-colors border border-indigo-700">پیامک گروهی</button>
                <button className="text-xs font-bold px-3 py-1.5 bg-indigo-800 hover:bg-indigo-700 rounded-lg transition-colors border border-indigo-700">تغییر گروه</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {processedPersons.length === 0 ? (
          <div className="py-24 flex flex-col items-center justify-center bg-white rounded-2xl border border-slate-200 shadow-sm">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
              <Users className="w-8 h-8 text-slate-300" />
            </div>
            <h3 className="text-sm font-black text-slate-700 mb-1">هیچ شخصی یافت نشد</h3>
            <p className="text-xs font-bold text-slate-400">با تغییر فیلترها جستجو را تکرار کنید یا شخص جدیدی ایجاد نمایید.</p>
          </div>
        ) : effectiveViewMode === "list" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
            {paginatedPersons.map((p: any, index: number) => {
              const bal = p.calculatedBalance;
              const isDebtor = bal > 0;
              const isCreditor = bal < 0;
              return (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.02 }} 
                  key={p.id} 
                  className="bg-white border border-slate-200 hover:border-indigo-300 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col h-full"
                  onClick={() => { setProfilePersonId(p.id); setActiveTab("person_profile"); }}
                >
                  <div className="flex items-start gap-3">
                    {/* Avatar */}
                    <div className="relative shrink-0">
                      {p.imageUrl ? (
                        <img src={p.imageUrl} alt={p.name} className="w-12 h-12 rounded-xl object-cover ring-2 ring-slate-100" />
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-slate-100 ring-2 ring-slate-50 flex items-center justify-center">
                          <span className="text-lg font-black text-slate-400">{p.name.substring(0, 1)}</span>
                        </div>
                      )}
                      <div className={\`absolute -bottom-1 -right-1 w-5 h-5 rounded-md flex items-center justify-center text-[9px] shadow-sm border border-white \${p.personType === "legal" ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"}\`}>
                        {p.personType === "legal" ? <Building className="w-3 h-3" /> : <User className="w-3 h-3" />}
                      </div>
                    </div>
                    {/* Details */}
                    <div className="flex-1 min-w-0 pt-0.5">
                      <div className="flex justify-between items-start">
                        <h3 className="text-sm font-black text-slate-800 truncate" title={getPersonDisplayName(p)}>{getPersonDisplayName(p)}</h3>
                        {p.isActive === false && <span className="text-[8px] font-bold bg-rose-50 text-rose-600 px-1 py-0.5 rounded mr-1">غیرفعال</span>}
                      </div>
                      <div className="flex flex-wrap items-center gap-1 mt-1.5">
                        <span className={\`text-[9px] font-black px-1.5 py-0.5 rounded \${getRoleBadgeClasses(p.role)}\`}>{getRoleName(p.role)}</span>
                        {p.group && (() => {
                          const g = personGroups.find((grp: any) => grp.id === p.group);
                          return g ? <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 truncate max-w-[80px]">{g.name}</span> : null;
                        })()}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between items-center gap-2">
                    <div className="truncate">
                      <div className="text-[9px] font-black text-slate-400 mb-0.5">شماره تماس</div>
                      <div className="text-xs font-bold text-slate-700 font-sans truncate">{p.phone ? toPersianDigits(p.phone) : "-"}</div>
                    </div>
                    <div className="text-left">
                      <div className={\`text-[9px] font-black mb-0.5 \${isDebtor ? "text-rose-500" : isCreditor ? "text-emerald-500" : "text-slate-400"}\`}>وضعیت مانده</div>
                      <div className={\`font-black font-sans text-xs truncate \${isDebtor ? "text-rose-700" : isCreditor ? "text-emerald-700" : "text-slate-600"}\`} dir="ltr">
                        {bal === 0 ? "تسویه (۰)" : toPersianDigits(formatNumber(Math.abs(bal)))}
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-right">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[11px] font-black uppercase">
                  <tr>
                    <th className="px-4 py-3 w-10 text-center">
                      <input type="checkbox" className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" checked={selectedIds.length === paginatedPersons.length && paginatedPersons.length > 0} onChange={selectAll} />
                    </th>
                    <th className="px-4 py-3">شخص / شرکت</th>
                    <th className="px-4 py-3">نقش و گروه</th>
                    <th className="px-4 py-3">اطلاعات تماس</th>
                    <th className="px-4 py-3">مانده حساب</th>
                    <th className="px-4 py-3 text-left">عملیات سریع</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedPersons.map((p: any) => {
                    const bal = p.calculatedBalance;
                    const isDebtor = bal > 0;
                    const isCreditor = bal < 0;
                    const isSelected = selectedIds.includes(p.id);

                    return (
                      <tr key={p.id} className={\`hover:bg-slate-50/80 transition-colors cursor-pointer \${isSelected ? 'bg-indigo-50/50' : ''}\`} onClick={() => toggleSelection(p.id)}>
                        <td className="px-4 py-3 text-center" onClick={e => e.stopPropagation()}>
                          <input type="checkbox" className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" checked={isSelected} onChange={() => toggleSelection(p.id)} />
                        </td>
                        <td className="px-4 py-3" onClick={() => { setProfilePersonId(p.id); setActiveTab("person_profile"); }}>
                          <div className="flex items-center gap-3">
                            <div className={\`w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-black \${p.personType === 'legal' ? 'bg-amber-500' : 'bg-indigo-500'}\`}>
                              {p.name.substring(0, 1)}
                            </div>
                            <div>
                              <div className="font-black text-slate-800 text-sm flex items-center gap-2">
                                {getPersonDisplayName(p)}
                                {p.isActive === false && <span className="text-[9px] bg-rose-100 text-rose-700 px-1.5 rounded">غیرفعال</span>}
                              </div>
                              <div className="text-[10px] text-slate-400 font-bold font-mono mt-0.5">
                                {p.accountingCode ? \`ACC: \${toPersianDigits(p.accountingCode)}\` : \`ID: \${toPersianDigits(p.personCode || p.id)}\`}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col gap-1 items-start">
                            <span className={\`text-[10px] font-black px-2 py-0.5 rounded-full \${getRoleBadgeClasses(p.role)}\`}>{getRoleName(p.role)}</span>
                            {p.group && (() => {
                              const g = personGroups.find((grp: any) => grp.id === p.group);
                              return g ? <span className="text-[10px] font-bold text-slate-500 truncate max-w-[120px]">{g.name}</span> : null;
                            })()}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-mono text-xs font-bold text-slate-600" dir="ltr">{p.phone ? toPersianDigits(p.phone) : "-"}</div>
                        </td>
                        <td className="px-4 py-3" dir="ltr">
                          <div className={\`font-sans font-black text-xs \${isDebtor ? 'text-rose-600' : isCreditor ? 'text-emerald-600' : 'text-slate-500'}\`}>
                            {bal === 0 ? "۰" : toPersianDigits(formatNumber(Math.abs(bal)))}
                          </div>
                          <div className="text-[9px] text-slate-400 font-bold mt-0.5 text-right">
                            {isDebtor ? "بدهکار" : isCreditor ? "بستانکار" : "تسویه"}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-left" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1" dir="ltr">
                            <button onClick={() => { setLedgerPersonId(p.id); setActiveTab("person_ledger"); }} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="صورتحساب">
                              <BookOpen className="w-4 h-4" />
                            </button>
                            <button onClick={() => { clearDraft(); setCustomerId(p.id); setActiveTab("create_sale"); }} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="ثبت فاکتور">
                              <ShoppingCart className="w-4 h-4" />
                            </button>
                            <div className="relative">
                              <button onClick={() => setOpenPersonActionsId(openPersonActionsId === p.id ? null : p.id)} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                                <MoreHorizontal className="w-4 h-4" />
                              </button>
                              {openPersonActionsId === p.id && (
                                <>
                                  <div className="fixed inset-0 z-40" onClick={() => setOpenPersonActionsId(null)} />
                                  <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-xl shadow-lg border border-slate-100 z-50 overflow-hidden" dir="rtl">
                                    <div className="p-1 flex flex-col">
                                      <button onClick={() => { setOpenPersonActionsId(null); setActiveTab?.("create_receive_receipt"); setReceiptPersonId(p.id); }} className="text-right px-3 py-2 text-[11px] font-bold text-slate-700 hover:bg-slate-50 rounded-lg flex items-center gap-2">
                                        <ArrowDownToLine className="w-3.5 h-3.5 text-emerald-500" /> دریافت وجه
                                      </button>
                                      <button onClick={() => { setOpenPersonActionsId(null); setActiveTab?.("create_pay_receipt"); setReceiptPersonId(p.id); }} className="text-right px-3 py-2 text-[11px] font-bold text-slate-700 hover:bg-slate-50 rounded-lg flex items-center gap-2">
                                        <ArrowUpFromLine className="w-3.5 h-3.5 text-rose-500" /> پرداخت وجه
                                      </button>
                                      <div className="h-px bg-slate-100 my-1"></div>
                                      <button onClick={() => { setOpenPersonActionsId(null); handleEditPerson(p); }} className="text-right px-3 py-2 text-[11px] font-bold text-slate-700 hover:bg-slate-50 rounded-lg flex items-center gap-2">
                                        <Edit2 className="w-3.5 h-3.5 text-slate-400" /> ویرایش
                                      </button>
                                    </div>
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-6 flex items-center justify-between bg-white px-4 py-3 border border-slate-200 rounded-xl">
            <div className="text-xs font-bold text-slate-500">
              نمایش {(safeCurrentPage - 1) * personPageSize + 1} تا {Math.min(safeCurrentPage * personPageSize, processedPersons.length)} از {processedPersons.length} شخص
            </div>
            <div className="flex items-center gap-1.5" dir="ltr">
              <button disabled={safeCurrentPage === 1} onClick={() => setPersonCurrentPage(prev => Math.max(1, prev - 1))} className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-50 text-slate-600">
                <ChevronDown className="w-4 h-4 rotate-90" />
              </button>
              {Array.from({ length: Math.min(5, totalPages) }).map((_, idx) => {
                let pg = safeCurrentPage - 2 + idx;
                if (safeCurrentPage < 3) pg = idx + 1;
                if (safeCurrentPage > totalPages - 2) pg = totalPages - 4 + idx;
                if (pg > 0 && pg <= totalPages) {
                  return (
                    <button key={pg} onClick={() => setPersonCurrentPage(pg)} className={\`w-8 h-8 rounded-lg text-xs font-black transition-colors \${pg === safeCurrentPage ? 'bg-indigo-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}\`}>
                      {toPersianDigits(pg)}
                    </button>
                  );
                }
                return null;
              })}
              <button disabled={safeCurrentPage === totalPages} onClick={() => setPersonCurrentPage(prev => Math.min(totalPages, prev + 1))} className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-50 text-slate-600">
                <ChevronDown className="w-4 h-4 -rotate-90" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
`;

fs.writeFileSync('src/components/persons/PersonsManager.tsx', code, 'utf8');
console.log("Patched PersonsManager.tsx");
