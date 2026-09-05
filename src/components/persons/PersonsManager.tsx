import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  User, Search, Filter, Plus, GripHorizontal, List, Users, Edit2, FileText,
  ChevronUp, ChevronDown, CheckCircle, Database, Phone, MapPin, Activity, Ban,
  Banknote, History, Printer, ShoppingCart, ArrowDownToLine, ArrowUpFromLine,
  Info, Trash2, RefreshCw, Key, ArrowRightLeft, LayoutGrid, Table as TableIcon,
  Building, BookOpen, Settings, Check, X, FilterX, MoreHorizontal, FileSpreadsheet,
  ArrowUpDown, Download, CheckSquare, Square, FileOutput, Power, PowerOff,
  MessageSquare
} from "lucide-react";
import { updatePerson } from '../../services/personService';
import SendPersonMessageModal from '../modals/SendPersonMessageModal';

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
    showNotification,
    sendNotification
  } = props;

  const notify = showNotification || sendNotification || ((msg:string, type:string) => console.log(type, msg));

  const [openPersonActionsId, setOpenPersonActionsId] = useState<any>(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Send Message Modal state
  const [selectedPersonForMessage, setSelectedPersonForMessage] = useState<any | null>(null);
  const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);

  const handleOpenMessageModal = (person: any, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    setSelectedPersonForMessage(person);
    setIsMessageModalOpen(true);
  };

  // Advanced Filters (Stored in session to persist during navigation)
  const [filterActiveStatus, setFilterActiveStatus] = useState<string>(() => sessionStorage.getItem('person_filterActiveStatus') || 'all');
  const [filterBalanceStatus, setFilterBalanceStatus] = useState<string>(() => sessionStorage.getItem('person_filterBalanceStatus') || 'all');
  const [filterPersonType, setFilterPersonType] = useState<string>(() => sessionStorage.getItem('person_filterPersonType') || 'all');
  const [filterProvince, setFilterProvince] = useState<string>(() => sessionStorage.getItem('person_filterProvince') || 'all');
  const [filterCity, setFilterCity] = useState<string>(() => sessionStorage.getItem('person_filterCity') || 'all');

  // Table Enhancements
  const [sortConfig, setSortConfig] = useState<{key: string, direction: 'asc'|'desc'} | null>(() => {
    const saved = sessionStorage.getItem('personSortConfig');
    return saved ? JSON.parse(saved) : {key: 'createdAt', direction: 'desc'};
  });
  const [isBulkLoading, setIsBulkLoading] = useState(false);
  const [localSearchTerm, setLocalSearchTerm] = useState(personSearchTerm || "");
  useEffect(() => { setLocalSearchTerm(personSearchTerm || ""); }, [personSearchTerm]);
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localSearchTerm !== personSearchTerm) {
        setPersonSearchTerm(localSearchTerm);
        setPersonCurrentPage(1);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [localSearchTerm, personSearchTerm, setPersonSearchTerm, setPersonCurrentPage]);
  const [rowLoadingId, setRowLoadingId] = useState<string | null>(null);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = () => setOpenPersonActionsId(null);
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  // Persist advanced filters
  useEffect(() => {
    sessionStorage.setItem('person_filterActiveStatus', filterActiveStatus);
    sessionStorage.setItem('person_filterBalanceStatus', filterBalanceStatus);
    sessionStorage.setItem('person_filterPersonType', filterPersonType);
    sessionStorage.setItem('person_filterProvince', filterProvince);
    sessionStorage.setItem('person_filterCity', filterCity);
    if (sortConfig) sessionStorage.setItem('personSortConfig', JSON.stringify(sortConfig));
  }, [filterActiveStatus, filterBalanceStatus, filterPersonType, filterProvince, filterCity, sortConfig]);

  // Extract available locations
  const availableProvinces = useMemo(() => {
    const set = new Set<string>();
    filteredPersons.forEach((p:any) => { if(p.province) set.add(p.province) });
    return Array.from(set).sort();
  }, [filteredPersons]);

  const availableCities = useMemo(() => {
    const set = new Set<string>();
    filteredPersons.forEach((p:any) => { 
      if(p.city && (filterProvince === 'all' || p.province === filterProvince)) {
        set.add(p.city);
      }
    });
    return Array.from(set).sort();
  }, [filteredPersons, filterProvince]);

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

      if (filterProvince !== 'all' && p.province !== filterProvince) return false;
      if (filterCity !== 'all' && p.city !== filterCity) return false;

      return true;
    });
  }, [filteredPersons, calculatePersonBalance, filterActiveStatus, filterBalanceStatus, filterPersonType, filterProvince, filterCity]);

  // Apply Sorting
  const sortedPersons = useMemo(() => {
    let sortable = [...processedPersons];
    if (sortConfig !== null) {
      sortable.sort((a, b) => {
         let aValue = a[sortConfig.key];
         let bValue = b[sortConfig.key];
         
         if (sortConfig.key === 'name') {
           aValue = getPersonDisplayName(a) || '';
           bValue = getPersonDisplayName(b) || '';
         } else if (sortConfig.key === 'createdAt') {
           aValue = new Date(a.createdAt || a.registrationDate || 0).getTime();
           bValue = new Date(b.createdAt || b.registrationDate || 0).getTime();
         } else if (sortConfig.key === 'balance') {
           aValue = a.calculatedBalance;
           bValue = b.calculatedBalance;
         } else if (sortConfig.key === 'code') {
           aValue = a.personCode || a.id || '';
           bValue = b.personCode || b.id || '';
         } else if (sortConfig.key === 'accountingCode') {
           aValue = a.accountingCode || '';
           bValue = b.accountingCode || '';
         } else if (sortConfig.key === 'contact') {
           aValue = a.phone || a.mobile || '';
           bValue = b.phone || b.mobile || '';
         } else if (sortConfig.key === 'role') {
           aValue = getRoleName(a.role) || '';
           bValue = getRoleName(b.role) || '';
         }

         if (aValue < bValue) {
           return sortConfig.direction === 'asc' ? -1 : 1;
         }
         if (aValue > bValue) {
           return sortConfig.direction === 'asc' ? 1 : -1;
         }
         return 0;
      });
    }
    return sortable;
  }, [processedPersons, sortConfig]);

  const totalPages = Math.ceil(sortedPersons.length / personPageSize);
  const safeCurrentPage = Math.max(1, Math.min(personCurrentPage, Math.max(totalPages, 1)));
  const paginatedPersons = sortedPersons.slice(
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

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
        direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const SortIcon = ({ columnKey }: { columnKey: string }) => {
    if (sortConfig?.key !== columnKey) return <ArrowUpDown className="w-3 h-3 text-slate-300 inline mr-1" />;
    return sortConfig.direction === 'asc' ? <ChevronUp className="w-3 h-3 text-indigo-500 inline mr-1" /> : <ChevronDown className="w-3 h-3 text-indigo-500 inline mr-1" />;
  };

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
    setSelectedPersonRole('all');
    setSelectedPersonGroup('all');
    setFilterActiveStatus('all');
    setFilterBalanceStatus('all');
    setFilterPersonType('all');
    setFilterProvince('all');
    setFilterCity('all');
  };

  const activeFilters = [];
  if (personSearchTerm) activeFilters.push({ id: 'search', label: `جستجو: ${personSearchTerm}`, onRemove: () => setPersonSearchTerm('') });
  if (selectedPersonRole !== 'all') {
    const roleName = personRoles?.find((r:any) => r.id === selectedPersonRole)?.name || selectedPersonRole;
    activeFilters.push({ id: 'role', label: `نقش: ${roleName}`, onRemove: () => setSelectedPersonRole('all') });
  }
  if (selectedPersonGroup !== 'all') {
    let grpName = selectedPersonGroup === 'none' ? 'بدون گروه' : personGroups?.find((g:any) => g.id === selectedPersonGroup)?.name;
    activeFilters.push({ id: 'group', label: `گروه: ${grpName}`, onRemove: () => setSelectedPersonGroup('all') });
  }
  if (filterActiveStatus !== 'all') activeFilters.push({ id: 'active', label: `وضعیت: ${filterActiveStatus === 'active' ? 'فعال' : 'غیرفعال'}`, onRemove: () => setFilterActiveStatus('all') });
  if (filterBalanceStatus !== 'all') {
    const labels:any = { debtor: 'بدهکاران', creditor: 'بستانکاران', settled: 'تسویه', has_balance: 'دارای مانده' };
    activeFilters.push({ id: 'balance', label: `حساب: ${labels[filterBalanceStatus]}`, onRemove: () => setFilterBalanceStatus('all') });
  }
  if (filterPersonType !== 'all') activeFilters.push({ id: 'type', label: `نوع: ${filterPersonType === 'real' ? 'حقیقی' : 'حقوقی'}`, onRemove: () => setFilterPersonType('all') });
  if (filterProvince !== 'all') activeFilters.push({ id: 'province', label: `استان: ${filterProvince}`, onRemove: () => { setFilterProvince('all'); setFilterCity('all'); } });
  if (filterCity !== 'all') activeFilters.push({ id: 'city', label: `شهر: ${filterCity}`, onRemove: () => setFilterCity('all') });


  // Bulk Actions
  const handleBulkStatusChange = async (isActive: boolean) => {
      confirmAction(`آیا از ${isActive ? 'فعال' : 'غیرفعال'} کردن ${toPersianDigits(selectedIds.length)} شخص اطمینان دارید؟`, async () => {
          setIsBulkLoading(true);
          try {
              for(const id of selectedIds) {
                  const p = (filteredPersons || []).find((x:any) => x.id === id);
                  if(p) await updatePerson(id, { ...p, isActive });
              }
              notify(`عملیات با موفقیت انجام شد`, "success");
              fetchPersons?.();
              setSelectedIds([]);
          } catch(e) {
              console.error(e);
              notify('خطا در انجام عملیات گروهی', 'error');
          } finally {
              setIsBulkLoading(false);
          }
      });
  };

  const handleBulkDelete = () => {
      confirmAction(`توجه: تنها اشخاصی که فاقد تراکنش مالی باشند قابل حذف هستند. آیا از حذف ${toPersianDigits(selectedIds.length)} شخص اطمینان دارید؟`, async () => {
          setIsBulkLoading(true);
          try {
              for(const id of selectedIds) {
                  await handleDeletePerson(id);
              }
              setSelectedIds([]);
          } catch(e) {
              console.error(e);
          } finally {
              setIsBulkLoading(false);
          }
      });
  };

  const handleBulkExport = () => {
     const selectedData = sortedPersons.filter((p:any) => selectedIds.includes(p.id));
     const headers = ['کد', 'نام شخص/شرکت', 'تلفن', 'موبایل', 'مانده حساب', 'وضعیت', 'نقش'];
     const csvContent = "data:text/csv;charset=utf-8,﻿" + 
        headers.join(",") + "\n" +
        selectedData.map((p:any) => {
           return `"${p.accountingCode || p.personCode || ''}","${getPersonDisplayName(p)}","${p.phone || ''}","${p.mobile || ''}","${p.calculatedBalance}","${p.isActive === false ? 'غیرفعال' : 'فعال'}","${getRoleName(p.role)}"`;
        }).join("\n");
     const encodedUri = encodeURI(csvContent);
     const link = document.createElement("a");
     link.setAttribute("href", encodedUri);
     link.setAttribute("download", "persons_export.csv");
     document.body.appendChild(link);
     link.click();
     document.body.removeChild(link);
     notify("خروجی با موفقیت دانلود شد", "success");
  };

  const handleToggleActive = async (p: any, e: React.MouseEvent) => {
     e.stopPropagation();
     confirmAction(`آیا از ${p.isActive === false ? 'فعال' : 'غیرفعال'} کردن ${p.name} اطمینان دارید؟`, async () => {
        setRowLoadingId(p.id);
        try {
            await updatePerson(p.id, { ...p, isActive: p.isActive === false ? true : false });
            notify(`شخص ${p.name} با موفقیت ${p.isActive === false ? 'فعال' : 'غیرفعال'} شد.`, "success");
            fetchPersons?.();
        } catch(err) {
            notify('خطا در تغییر وضعیت شخص', 'error');
        } finally {
            setRowLoadingId(null);
        }
     });
  };

  return (
    <div className="w-full flex-1 flex flex-col relative h-full bg-slate-50" dir="rtl">
      
      {/* Global Bulk Loading Overlay */}
      <AnimatePresence>
        {isBulkLoading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-white/60 backdrop-blur-[2px] z-50 flex items-center justify-center">
            <div className="bg-white px-6 py-4 rounded-2xl shadow-xl flex items-center gap-4 font-black text-indigo-700 border border-indigo-100">
              <RefreshCw className="w-6 h-6 animate-spin" />
              در حال پردازش عملیات گروهی...
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
              <Key className={`w-4 h-4 ${isGeneratingCodes ? 'text-indigo-500 animate-spin' : 'text-slate-500'}`} />
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
              placeholder="جستجو: نام، موبایل، کدملی، شناسه..."
              value={localSearchTerm}
              onChange={(e) => setLocalSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className={`px-3 py-2 rounded-lg border text-xs font-bold flex items-center gap-1.5 transition-colors ${isFilterOpen ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'}`}
            >
              <Filter className="w-4 h-4" />
              فیلترهای پیشرفته
            </button>
            <div className="h-6 w-px bg-slate-200 hidden md:block"></div>
            <div className="hidden md:flex bg-slate-100 p-1 rounded-lg border border-slate-200">
              <button
                onClick={() => setPersonsViewMode("table")}
                className={`p-1.5 rounded transition-all ${effectiveViewMode === "table" ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                title="نمایش جدولی"
              >
                <TableIcon className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPersonsViewMode("list")}
                className={`p-1.5 rounded transition-all ${effectiveViewMode === "list" ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                title="نمایش کارتی"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Active Filter Chips */}
        {activeFilters.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 mt-4 pt-3 border-t border-slate-100">
            <span className="text-[10px] font-black text-slate-400 flex items-center gap-1"><Filter className="w-3 h-3" /> فیلترهای فعال:</span>
            {activeFilters.map(f => (
              <span key={f.id} className="bg-indigo-50 text-indigo-700 border border-indigo-100 px-2 py-1 rounded-md text-[10px] font-bold flex items-center gap-1.5">
                {f.label}
                <button onClick={f.onRemove} className="hover:bg-indigo-200 p-0.5 rounded-full transition-colors"><X className="w-3 h-3" /></button>
              </span>
            ))}
            <button onClick={clearAllFilters} className="text-[10px] font-bold text-rose-500 hover:bg-rose-50 px-2 py-1 rounded-md transition-colors mr-auto">
              حذف همه فیلترها
            </button>
          </div>
        )}

        {/* Advanced Filters Drawer */}
        <AnimatePresence>
          {isFilterOpen && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }} 
              animate={{ height: "auto", opacity: 1 }} 
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden mt-3"
            >
              <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                
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

                <div>
                  <label className="block text-[10px] font-black text-slate-500 mb-1">استان</label>
                  <select 
                    value={filterProvince} 
                    onChange={e => { setFilterProvince(e.target.value); setFilterCity('all'); setPersonCurrentPage(1); }}
                    className="w-full text-xs font-bold border border-slate-200 rounded-lg py-1.5 px-2 outline-none focus:border-indigo-500"
                  >
                    <option value="all">همه استان‌ها</option>
                    {availableProvinces.map(prov => <option key={prov} value={prov}>{prov}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-500 mb-1">شهر</label>
                  <select 
                    value={filterCity} 
                    onChange={e => { setFilterCity(e.target.value); setPersonCurrentPage(1); }}
                    className="w-full text-xs font-bold border border-slate-200 rounded-lg py-1.5 px-2 outline-none focus:border-indigo-500"
                    disabled={availableCities.length === 0}
                  >
                    <option value="all">همه شهرها</option>
                    {availableCities.map(city => <option key={city} value={city}>{city}</option>)}
                  </select>
                </div>

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
            <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -20, opacity: 0 }} className="bg-indigo-900 text-white p-3 rounded-xl mb-4 flex items-center justify-between shadow-lg sticky top-0 z-20">
              <span className="text-sm font-black flex items-center gap-2">
                <CheckSquare className="w-5 h-5 text-indigo-300" />
                {toPersianDigits(selectedIds.length)} رکورد انتخاب شده
              </span>
              <div className="flex items-center gap-2">
                <button onClick={handleBulkExport} className="text-xs font-bold px-3 py-2 bg-indigo-800 hover:bg-indigo-700 rounded-lg transition-colors flex items-center gap-1.5">
                  <Download className="w-4 h-4" /> خروجی اکسل
                </button>
                <button onClick={() => handleBulkStatusChange(true)} className="text-xs font-bold px-3 py-2 bg-emerald-600/20 text-emerald-300 hover:bg-emerald-600/30 border border-emerald-600/50 rounded-lg transition-colors flex items-center gap-1.5">
                  <Power className="w-4 h-4" /> فعال‌سازی
                </button>
                <button onClick={() => handleBulkStatusChange(false)} className="text-xs font-bold px-3 py-2 bg-rose-600/20 text-rose-300 hover:bg-rose-600/30 border border-rose-600/50 rounded-lg transition-colors flex items-center gap-1.5">
                  <PowerOff className="w-4 h-4" /> غیرفعال‌سازی
                </button>
                <button onClick={handleBulkDelete} className="text-xs font-bold px-3 py-2 bg-rose-600 hover:bg-rose-700 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm">
                  <Trash2 className="w-4 h-4" /> حذف گروهی
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {processedPersons.length === 0 ? (
          <div className="py-24 flex flex-col items-center justify-center bg-white rounded-2xl border border-slate-200 shadow-sm">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
              <Users className="w-8 h-8 text-slate-300" />
            </div>
            <h3 className="text-sm font-black text-slate-700 mb-1">هیچ نتیجه‌ای یافت نشد</h3>
            <p className="text-xs font-bold text-slate-400">با حذف یا تغییر فیلترها جستجو را تکرار کنید.</p>
            {activeFilters.length > 0 && (
              <button onClick={clearAllFilters} className="mt-4 text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-4 py-2 rounded-lg transition-colors">
                پاک کردن تمام فیلترها
              </button>
            )}
          </div>
        ) : effectiveViewMode === "list" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
            {paginatedPersons.map((p: any, index: number) => {
              const bal = p.calculatedBalance;
              const isDebtor = bal > 0;
              const isCreditor = bal < 0;
              const isRowLoading = rowLoadingId === p.id;

              return (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.02 }} 
                  key={p.id} 
                  className={`relative bg-white border ${p.isActive === false ? 'border-slate-200 opacity-60' : 'border-slate-200 hover:border-indigo-300'} rounded-2xl p-4 shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col h-full`}
                  onClick={() => { setProfilePersonId(p.id); setActiveTab("person_profile"); }}
                >
                  {isRowLoading && (
                    <div className="absolute inset-0 bg-white/70 backdrop-blur-sm z-10 flex items-center justify-center rounded-2xl">
                      <RefreshCw className="w-6 h-6 text-indigo-500 animate-spin" />
                    </div>
                  )}

                  <div className="flex items-start gap-3">
                    <div className="relative shrink-0">
                      {p.imageUrl ? (
                        <img src={p.imageUrl} alt={p.name} className={`w-14 h-14 rounded-full object-cover ring-2 ring-indigo-50 shadow-sm ${p.isActive === false ? 'grayscale' : ''}`} />
                      ) : (
                        <div className={`w-14 h-14 rounded-full flex items-center justify-center text-white text-lg font-black shadow-sm ring-2 ring-indigo-50 ${p.personType === 'legal' ? 'bg-amber-500' : 'bg-indigo-500'} ${p.isActive === false ? 'grayscale' : ''}`}>
                          <span className="text-lg font-black">{p.name.substring(0, 1)}</span>
                        </div>
                      )}
                      <div className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center text-[10px] shadow-sm border-2 border-white ${p.personType === "legal" ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"}`}>
                        {p.personType === "legal" ? <Building className="w-3.5 h-3.5" /> : <User className="w-3.5 h-3.5" />}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0 pt-0.5">
                      <div className="flex justify-between items-start">
                        <h3 className="text-sm font-black text-slate-800 truncate" title={getPersonDisplayName(p)}>{getPersonDisplayName(p)}</h3>
                        {p.isActive === false && <span className="text-[8px] font-bold bg-rose-50 text-rose-600 px-1 py-0.5 rounded mr-1">غیرفعال</span>}
                      </div>
                      <div className="text-[10px] font-black font-sans tabular-nums mt-1.5 flex flex-wrap items-center gap-1.5">
                        <span className="bg-slate-50 border border-slate-200 px-1.5 py-0.5 rounded flex items-center gap-1 shadow-sm" title="کد شخص">
                          <span className="text-[9px] text-slate-400 font-bold font-sans">کد:</span>
                          <span className="text-slate-700 tracking-wider">{toPersianDigits(p.personCode || p.id)}</span>
                        </span>
                        {p.accountingCode && (
                          <span className="bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded flex items-center gap-1 shadow-sm" title="کد حسابداری">
                            <span className="text-[9px] text-indigo-400 font-bold font-sans">حسابداری:</span>
                            <span className="text-indigo-700 tracking-wider">{toPersianDigits(p.accountingCode)}</span>
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-1 mt-1.5">
                        <span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${getRoleBadgeClasses(p.role)}`}>{getRoleName(p.role)}</span>
                        {p.group && (() => {
                          const g = (personGroups || []).find((grp: any) => grp.id === p.group);
                          return g ? <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 truncate max-w-[80px]">{g.name}</span> : null;
                        })()}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between items-center gap-2">
                    <div className="truncate">
                      <div className="text-[9px] font-black text-slate-400 mb-0.5">شماره تماس (ارسال پیام)</div>
                      <button
                        type="button"
                        onClick={(e) => handleOpenMessageModal(p, e)}
                        className="group inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-indigo-600 font-sans truncate hover:bg-indigo-50/80 px-2 py-0.5 -mx-1.5 rounded-lg transition-all border border-transparent hover:border-indigo-100 cursor-pointer"
                        title="کلیک جهت ارسال پیامک با موضوعات مانده حساب، یادآوری یا اطلاع‌رسانی"
                      >
                        <Phone className="w-3 h-3 text-slate-400 group-hover:text-indigo-600 transition-colors shrink-0" />
                        <span className="truncate">{p.phone || p.mobile ? toPersianDigits(p.phone || p.mobile) : "ثبت و ارسال پیام"}</span>
                        <MessageSquare className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 text-indigo-500 transition-opacity shrink-0" />
                      </button>
                    </div>
                    <div className="text-left">
                      <div className={`text-[9px] font-black mb-0.5 ${isDebtor ? "text-rose-500" : isCreditor ? "text-emerald-500" : "text-slate-400"}`}>وضعیت مانده</div>
                      <div className={`font-black font-sans tabular-nums text-xs truncate ${isDebtor ? "text-rose-700" : isCreditor ? "text-emerald-700" : "text-slate-600"}`} dir="ltr">
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
              <table className="w-full text-sm text-right whitespace-nowrap">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 text-[11px] font-black">
                  <tr>
                    <th className="px-4 py-4 w-10 text-center">
                      <input type="checkbox" className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer" checked={selectedIds.length === paginatedPersons.length && paginatedPersons.length > 0} onChange={selectAll} />
                    </th>
                    <th className="px-4 py-4 cursor-pointer hover:bg-slate-100 transition-colors w-20 text-center" onClick={() => handleSort('code')}>
                      کد مشتری <SortIcon columnKey="code" />
                    </th>
                    <th className="px-4 py-4 cursor-pointer hover:bg-slate-100 transition-colors w-24 text-center" onClick={() => handleSort('accountingCode')}>
                      کد حسابداری <SortIcon columnKey="accountingCode" />
                    </th>
                    <th className="px-4 py-4 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('name')}>
                      شخص / شرکت <SortIcon columnKey="name" />
                    </th>
                    <th className="px-4 py-4 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('role')}>
                      نقش و گروه <SortIcon columnKey="role" />
                    </th>
                    <th className="px-4 py-4 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('contact')}>
                      اطلاعات تماس <SortIcon columnKey="contact" />
                    </th>
                    <th className="px-4 py-4 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('balance')}>
                      مانده حساب <SortIcon columnKey="balance" />
                    </th>
                    <th className="px-4 py-4 text-center">عملیات سریع</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedPersons.map((p: any) => {
                    const bal = p.calculatedBalance;
                    const isDebtor = bal > 0;
                    const isCreditor = bal < 0;
                    const isSelected = selectedIds.includes(p.id);
                    const isRowLoading = rowLoadingId === p.id;

                    return (
                      <tr key={p.id} className={`hover:bg-slate-50/80 transition-colors relative ${isSelected ? 'bg-indigo-50/50 hover:bg-indigo-50/80' : ''} ${p.isActive === false ? 'opacity-70 bg-slate-50/30' : ''}`}>
                        
                        {/* Row Loading Overlay */}
                        {isRowLoading && (
                          <td colSpan={8} className="absolute inset-0 bg-white/70 backdrop-blur-[1px] z-10 flex items-center justify-center">
                             <RefreshCw className="w-5 h-5 text-indigo-500 animate-spin" />
                          </td>
                        )}

                        <td className="px-4 py-3 text-center">
                          <input type="checkbox" className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer" checked={isSelected} onChange={() => toggleSelection(p.id)} />
                        </td>
                        <td className="px-4 py-3 align-middle text-center w-20">
                          <div className="inline-flex items-center bg-slate-50 border border-slate-200 px-2 py-1.5 rounded-lg text-xs font-sans tabular-nums font-black text-slate-700 shadow-sm" title="کد شخص">
                            <span className="tracking-wider">{toPersianDigits(p.personCode || p.id)}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 align-middle text-center w-24">
                          {p.accountingCode ? (
                            <div className="inline-flex items-center bg-indigo-50/70 border border-indigo-100 px-2 py-1.5 rounded-lg text-xs font-sans tabular-nums font-black text-indigo-700 shadow-sm" title="کد حسابداری">
                              <span className="tracking-wider">{toPersianDigits(p.accountingCode)}</span>
                            </div>
                          ) : (
                            <span className="text-slate-300 text-xs">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 cursor-pointer" onClick={() => { setProfilePersonId(p.id); setActiveTab("person_profile"); }}>
                          <div className="flex items-center gap-3">
                            {p.imageUrl ? (
                              <img src={p.imageUrl} alt={p.name} className={`w-10 h-10 rounded-full object-cover ring-2 ring-indigo-50 shadow-sm ${p.isActive === false ? 'grayscale' : ''}`} />
                            ) : (
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-black shadow-sm ${p.personType === 'legal' ? 'bg-amber-500' : 'bg-indigo-500'} ${p.isActive === false ? 'grayscale' : ''}`}>
                                {p.name.substring(0, 1)}
                              </div>
                            )}
                            <div>
                              <div className={`font-black text-sm flex items-center gap-2 ${p.isActive === false ? 'text-slate-500 line-through' : 'text-slate-800'}`}>
                                {getPersonDisplayName(p)}
                                {p.isActive === false && <span className="text-[9px] bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded no-underline">مسدود</span>}
                              </div>
                              <div className="text-[10px] text-slate-400 font-bold mt-0.5 flex items-center gap-1">
                                {p.personType === 'legal' ? <Building className="w-3 h-3 text-slate-300" /> : <User className="w-3 h-3 text-slate-300" />}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col gap-1 items-start">
                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-md ${getRoleBadgeClasses(p.role)}`}>{getRoleName(p.role)}</span>
                            {p.group && (() => {
                              const g = (personGroups || []).find((grp: any) => grp.id === p.group);
                              return g ? <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md truncate max-w-[140px]">{g.name}</span> : null;
                            })()}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col gap-1">
                            <button
                              type="button"
                              onClick={(e) => handleOpenMessageModal(p, e)}
                              className="group inline-flex items-center gap-1.5 font-sans tabular-nums font-black text-xs text-slate-700 hover:text-indigo-600 hover:bg-indigo-50/80 px-2.5 py-1 -mx-2 rounded-lg transition-all border border-transparent hover:border-indigo-200 cursor-pointer text-left"
                              dir="ltr"
                              title="کلیک جهت ارسال پیامک با موضوعات مانده حساب، یادآوری یا اطلاع‌رسانی"
                            >
                              <Phone className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600 transition-colors shrink-0" />
                              <span>{p.phone || p.mobile ? toPersianDigits(p.phone || p.mobile) : "-"}</span>
                              <MessageSquare className="w-3 h-3 text-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity ml-1 shrink-0" />
                            </button>
                          </div>
                        </td>
                        <td className="px-4 py-3" dir="ltr">
                          <div className={`font-sans tabular-nums font-black text-sm ${isDebtor ? 'text-rose-600' : isCreditor ? 'text-emerald-600' : 'text-slate-500'}`}>
                            {bal === 0 ? "۰" : toPersianDigits(formatNumber(Math.abs(bal)))}
                          </div>
                          <div className={`text-[10px] font-bold mt-0.5 text-right ${isDebtor ? 'text-rose-400' : isCreditor ? 'text-emerald-400' : 'text-slate-400'}`}>
                            {isDebtor ? "بدهکار" : isCreditor ? "بستانکار" : "تسویه"}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-1.5" dir="ltr">
                            
                            <button onClick={() => { clearDraft(); setCustomerId(p.id); setActiveTab("create_sale"); }} className="p-2 text-blue-600 hover:text-white bg-blue-50 hover:bg-blue-600 rounded-lg transition-all" title="صدور فاکتور فروش">
                              <ShoppingCart className="w-4 h-4" />
                            </button>
                            
                            <button onClick={() => { setLedgerPersonId(p.id); setActiveTab("person_ledger"); }} className="p-2 text-indigo-600 hover:text-white bg-indigo-50 hover:bg-indigo-600 rounded-lg transition-all" title="صورتحساب و معین">
                              <BookOpen className="w-4 h-4" />
                            </button>

                            <div className="relative">
                              <button 
                                onClick={(e) => { e.stopPropagation(); setOpenPersonActionsId(openPersonActionsId === p.id ? null : p.id); }} 
                                className={`p-2 rounded-lg transition-all ${openPersonActionsId === p.id ? 'bg-slate-200 text-slate-800' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'}`}
                              >
                                <MoreHorizontal className="w-4 h-4" />
                              </button>
                              
                              <AnimatePresence>
                                {openPersonActionsId === p.id && (
                                  <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="absolute right-full top-0 mr-2 w-48 bg-white rounded-xl shadow-xl border border-slate-100 z-50 overflow-hidden" dir="rtl" onClick={e => e.stopPropagation()}>
                                    <div className="p-1.5 flex flex-col gap-0.5">
                                      <button onClick={() => { setOpenPersonActionsId(null); setProfilePersonId(p.id); setActiveTab("person_profile"); }} className="w-full text-right px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-indigo-600 rounded-lg flex items-center gap-2 transition-colors">
                                        <User className="w-3.5 h-3.5 text-slate-400" /> مشاهده پروفایل
                                      </button>
                                      <button onClick={() => { setOpenPersonActionsId(null); handleEditPerson(p); }} className="w-full text-right px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-indigo-600 rounded-lg flex items-center gap-2 transition-colors">
                                        <Edit2 className="w-3.5 h-3.5 text-slate-400" /> ویرایش اطلاعات
                                      </button>
                                      <button onClick={() => { setOpenPersonActionsId(null); handleOpenMessageModal(p); }} className="w-full text-right px-3 py-2 text-xs font-bold text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg flex items-center gap-2 transition-colors">
                                        <MessageSquare className="w-3.5 h-3.5 text-indigo-500" /> ارسال پیامک و مانده حساب
                                      </button>
                                      
                                      <div className="h-px bg-slate-100 my-1"></div>
                                      
                                      <button onClick={() => { setOpenPersonActionsId(null); setActiveTab?.("create_receive_receipt"); setReceiptPersonId(p.id); }} className="w-full text-right px-3 py-2 text-xs font-bold text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 rounded-lg flex items-center gap-2 transition-colors">
                                        <ArrowDownToLine className="w-3.5 h-3.5 text-emerald-500" /> ثبت دریافت وجه
                                      </button>
                                      <button onClick={() => { setOpenPersonActionsId(null); setActiveTab?.("create_pay_receipt"); setReceiptPersonId(p.id); }} className="w-full text-right px-3 py-2 text-xs font-bold text-slate-700 hover:bg-rose-50 hover:text-rose-700 rounded-lg flex items-center gap-2 transition-colors">
                                        <ArrowUpFromLine className="w-3.5 h-3.5 text-rose-500" /> ثبت پرداخت وجه
                                      </button>
                                      <button onClick={() => { setOpenPersonActionsId(null); clearDraft(); setCustomerId(p.id); setActiveTab("create_purchase"); }} className="w-full text-right px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-blue-700 rounded-lg flex items-center gap-2 transition-colors">
                                        <ShoppingCart className="w-3.5 h-3.5 text-slate-400" /> صدور فاکتور خرید
                                      </button>
                                      <button onClick={() => { setOpenPersonActionsId(null); setPrintingPersonLedger && setPrintingPersonLedger(p.id); }} className="w-full text-right px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-slate-900 rounded-lg flex items-center gap-2 transition-colors">
                                        <Printer className="w-3.5 h-3.5 text-slate-400" /> چاپ حساب
                                      </button>
                                      
                                      <div className="h-px bg-slate-100 my-1"></div>

                                      <button onClick={(e) => { setOpenPersonActionsId(null); handleToggleActive(p, e); }} className="w-full text-right px-3 py-2 text-xs font-bold text-amber-700 hover:bg-amber-50 hover:text-amber-800 rounded-lg flex items-center gap-2 transition-colors">
                                        {p.isActive === false ? <><Power className="w-3.5 h-3.5 text-amber-500" /> فعال‌سازی شخص</> : <><PowerOff className="w-3.5 h-3.5 text-amber-500" /> غیرفعال‌سازی شخص</>}
                                      </button>
                                      <button onClick={() => { setOpenPersonActionsId(null); confirmAction("آیا از حذف این شخص اطمینان دارید؟", () => handleDeletePerson(p.id)); }} className="w-full text-right px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 hover:text-rose-700 rounded-lg flex items-center gap-2 transition-colors">
                                        <Trash2 className="w-3.5 h-3.5 text-rose-500" /> حذف شخص
                                      </button>
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
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

        {/* Pagination & Page Size */}
        {processedPersons.length > 0 && (
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 bg-white px-5 py-4 border border-slate-200 rounded-2xl shadow-sm">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-slate-500">تعداد در صفحه:</span>
              <select value={personPageSize} onChange={e => { setPersonPageSize(Number(e.target.value)); setPersonCurrentPage(1); }} className="bg-slate-50 border border-slate-200 rounded-lg text-xs font-black text-indigo-700 px-3 py-1.5 outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer">
                <option value={10}>۱۰ رکورد</option>
                <option value={20}>۲۰ رکورد</option>
                <option value={50}>۵۰ رکورد</option>
                <option value={100}>۱۰۰ رکورد</option>
              </select>
            </div>
            
            <div className="text-xs font-bold text-slate-500 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
              نمایش {toPersianDigits((safeCurrentPage - 1) * personPageSize + 1)} تا {toPersianDigits(Math.min(safeCurrentPage * personPageSize, processedPersons.length))} از {toPersianDigits(processedPersons.length)} شخص
            </div>

            {totalPages > 1 && (
              <div className="flex items-center gap-1.5" dir="ltr">
                <button disabled={safeCurrentPage === 1} onClick={() => setPersonCurrentPage((prev:number) => Math.max(1, prev - 1))} className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-50 text-slate-600 transition-colors shadow-sm">
                  <ChevronDown className="w-4 h-4 rotate-90" />
                </button>
                {Array.from({ length: Math.min(5, totalPages) }).map((_, idx) => {
                  let pg = safeCurrentPage - 2 + idx;
                  if (safeCurrentPage < 3) pg = idx + 1;
                  if (safeCurrentPage > totalPages - 2) pg = totalPages - 4 + idx;
                  if (pg > 0 && pg <= totalPages) {
                    return (
                      <button key={pg} onClick={() => setPersonCurrentPage(pg)} className={`w-8 h-8 rounded-lg text-xs font-black transition-all shadow-sm ${pg === safeCurrentPage ? 'bg-indigo-600 text-white border border-indigo-600 ring-2 ring-indigo-600/20' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-indigo-600'}`}>
                        {toPersianDigits(pg)}
                      </button>
                    );
                  }
                  return null;
                })}
                <button disabled={safeCurrentPage === totalPages} onClick={() => setPersonCurrentPage((prev:number) => Math.min(totalPages, prev + 1))} className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-50 text-slate-600 transition-colors shadow-sm">
                  <ChevronDown className="w-4 h-4 -rotate-90" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* Send Person Message Modal */}
        <SendPersonMessageModal
          isOpen={isMessageModalOpen}
          onClose={() => {
            setIsMessageModalOpen(false);
            setSelectedPersonForMessage(null);
          }}
          person={selectedPersonForMessage}
          showNotification={notify}
          calculatePersonBalance={calculatePersonBalance}
          storeSettings={storeSettings}
        />
      </div>
    </div>
  );
}
