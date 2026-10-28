import React, { useState, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  User, Search, Filter, Plus, GripHorizontal, List, Users, Edit2, FileText,
  ChevronUp, ChevronDown, CheckCircle, Database, Phone, MapPin, Activity, Ban,
  Banknote, History, Printer, ShoppingCart, ArrowDownToLine, ArrowUpFromLine,
  Info, Trash2, RefreshCw, Key, ArrowRightLeft, LayoutGrid, Table as TableIcon,
  Building, BookOpen, Settings, Check, X, FilterX, MoreHorizontal, FileSpreadsheet,
  ArrowUpDown, Download, CheckSquare, Square, FileOutput, Power, PowerOff,
  MessageSquare, Tag, Hammer, Sparkles, Wrench, Zap
} from "lucide-react";
import { updatePerson } from '../../services/personService';
import SendPersonMessageModal from '../modals/SendPersonMessageModal';
import { exportToExcel, formatDecimalForExcel } from '../../utils/exportUtils';
import { getActiveStoreSettings } from '../../utils/format';
import { DEFAULT_SPECIALTIES, getSpecialties, getSpecialtyById, getSpecialtyName } from '../../services/specialistService';
import { PersonSpecialty } from '../../types';

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
  const [filterTag, setFilterTag] = useState<string>(() => sessionStorage.getItem('person_filterTag') || 'all');
  const [filterSpecialistsOnly, setFilterSpecialistsOnly] = useState<boolean>(false);
  const [specialtiesCatalog, setSpecialtiesCatalog] = useState<PersonSpecialty[]>(DEFAULT_SPECIALTIES);

  useEffect(() => {
    let mounted = true;
    const loadCatalog = () => {
      getSpecialties().then((list) => {
        if (mounted && list && list.length > 0) {
          setSpecialtiesCatalog(list);
        }
      });
    };
    loadCatalog();

    const handleCatalogChanged = (e: any) => {
      if (e.detail && Array.isArray(e.detail)) {
        setSpecialtiesCatalog(e.detail);
      } else {
        loadCatalog();
      }
    };

    const handleAppDataChanged = (e: any) => {
      if (e?.detail?.key === 'person_specialties') {
        loadCatalog();
      }
    };

    window.addEventListener('specialties_catalog_changed', handleCatalogChanged);
    window.addEventListener('app_data_changed', handleAppDataChanged);
    return () => {
      mounted = false;
      window.removeEventListener('specialties_catalog_changed', handleCatalogChanged);
      window.removeEventListener('app_data_changed', handleAppDataChanged);
    };
  }, []);

  // Table Enhancements
  const [sortConfig, setSortConfig] = useState<{key: string, direction: 'asc'|'desc'} | null>(() => {
    const saved = sessionStorage.getItem('personSortConfig');
    return saved ? JSON.parse(saved) : {key: 'createdAt', direction: 'desc'};
  });
  const [isBulkLoading, setIsBulkLoading] = useState(false);
  const [localSearchTerm, setLocalSearchTerm] = useState(personSearchTerm || "");
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcut to focus search with '/' or 'F2'
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === '/' || e.key === 'F2') && 
          document.activeElement?.tagName !== 'INPUT' && 
          document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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

  const handleOpenNewPersonModal = (defaultRole: string = "customer") => {
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
    setNewPersonRole(defaultRole);
    setNewPersonInitialBalance("");
    setNewPersonInitialBalanceType("settled");
    setNewPersonCreditLimit("");
    setIsPersonModalOpen(true);
  };

  const handleKpiFilterClick = (type: 'all' | 'customer' | 'supplier' | 'active' | 'debtor' | 'creditor') => {
    setPersonCurrentPage(1);
    if (type === 'all') {
      clearAllFilters();
      return;
    }
    if (type === 'customer') {
      setSelectedPersonRole((prev: string) => prev === 'customer' ? 'all' : 'customer');
      return;
    }
    if (type === 'supplier') {
      setSelectedPersonRole((prev: string) => prev === 'supplier' ? 'all' : 'supplier');
      return;
    }
    if (type === 'active') {
      setFilterActiveStatus((prev: string) => prev === 'active' ? 'all' : 'active');
      return;
    }
    if (type === 'debtor') {
      setFilterBalanceStatus((prev: string) => prev === 'debtor' ? 'all' : 'debtor');
      return;
    }
    if (type === 'creditor') {
      setFilterBalanceStatus((prev: string) => prev === 'creditor' ? 'all' : 'creditor');
      return;
    }
  };

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
    sessionStorage.setItem('person_filterTag', filterTag);
    if (sortConfig) sessionStorage.setItem('personSortConfig', JSON.stringify(sortConfig));
  }, [filterActiveStatus, filterBalanceStatus, filterPersonType, filterProvince, filterCity, filterTag, sortConfig]);

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

  // Extract all available tags across persons
  const availableTags = useMemo(() => {
    const set = new Set<string>();
    (filteredPersons || []).forEach((p: any) => {
      if (Array.isArray(p.tags)) {
        p.tags.forEach((t: string) => {
          const clean = (t || '').trim();
          if (clean) set.add(clean);
        });
      }
    });
    return Array.from(set).sort();
  }, [filteredPersons]);

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

      if (filterTag !== 'all') {
        const pTags = Array.isArray(p.tags) ? p.tags : [];
        if (!pTags.includes(filterTag)) return false;
      }

      if (filterSpecialistsOnly) {
        const hasSpecs = Array.isArray(p.specialties) && p.specialties.length > 0;
        if (!hasSpecs) return false;
      }

      return true;
    });
  }, [filteredPersons, calculatePersonBalance, filterActiveStatus, filterBalanceStatus, filterPersonType, filterProvince, filterCity, filterTag, filterSpecialistsOnly]);

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
    let inactive = 0;
    let totalDebtors = 0;
    let totalCreditors = 0;
    let debtorsCount = 0;
    let creditorsCount = 0;
    
    (filteredPersons || []).forEach((p: any) => {
      const balResult = calculatePersonBalance(p.id);
      let b = balResult.amount;
      if (balResult.status === "بستانکار") b = -Math.abs(b);
      else if (balResult.status === "بدهکار") b = Math.abs(b);
      else b = 0;

      if (p.role === 'customer') customers++;
      if (p.role === 'supplier') suppliers++;
      if (p.isActive === false) inactive++;
      else active++;

      if (b > 0) {
        totalDebtors += b;
        debtorsCount++;
      } else if (b < 0) {
        totalCreditors += Math.abs(b);
        creditorsCount++;
      }
    });

    return {
      total: (filteredPersons || []).length,
      customers,
      suppliers,
      active,
      inactive,
      debtorsCount,
      creditorsCount,
      totalDebtors,
      totalCreditors,
      netBalance: totalDebtors - totalCreditors
    };
  }, [filteredPersons, calculatePersonBalance]);


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
    setFilterTag('all');
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
  if (filterTag !== 'all') activeFilters.push({ id: 'tag', label: `برچسب: #${filterTag}`, onRemove: () => setFilterTag('all') });


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
     try {
       const selectedData = sortedPersons.filter((p:any) => selectedIds.includes(p.id));
       if (selectedData.length === 0) return;

       const activeSettings = props.storeSettings || getActiveStoreSettings();
       const curr = activeSettings?.currency || 'تومان';

       const excelRows = selectedData.map((p: any, idx: number) => {
         const balVal = typeof p.calculatedBalance === 'number' 
           ? p.calculatedBalance 
           : (Number(String(p.calculatedBalance || 0).replace(/,/g, '')) || 0);

         let balStatus = 'تسویه';
         if (balVal > 0) balStatus = 'بدهکار (به ما)';
         else if (balVal < 0) balStatus = 'بستانکار (از ما)';

         return {
           'ردیف': idx + 1,
           'کد حسابداری': p.accountingCode || p.personCode || '-',
           'نام شخص / شرکت': getPersonDisplayName(p),
           'نام مستعار': p.alias || '-',
           'نقش': getRoleName(p.role),
           'گروه': p.group || '-',
           'تلفن': p.phone || '-',
           'موبایل': p.mobile || '-',
           'کد ملی / شناسه': p.nationalId || '-',
           [`مانده حساب (${curr})`]: formatDecimalForExcel(Math.abs(balVal), activeSettings),
           'وضعیت تراز': balStatus,
           'وضعیت': p.isActive === false ? 'غیرفعال' : 'فعال'
         };
       });

       const fileName = `اشخاص_منتخب_${new Date().toLocaleDateString('fa-IR').replace(/\//g, '-')}`;

       exportToExcel({
         filename: fileName,
         sheetName: 'اشخاص منتخب',
         data: excelRows,
         storeSettings: activeSettings
       });

       notify("خروجی اکسل اشخاص منتخب با موفقیت دانلود شد", "success");
     } catch(e) {
       console.error(e);
       notify("خطا در خروجی فایل اکسل", "error");
     }
  };

  const handleExportPersonsExcel = () => {
    try {
      const activeSettings = props.storeSettings || getActiveStoreSettings();
      const curr = activeSettings?.currency || 'تومان';

      const excelRows = sortedPersons.map((p: any, idx: number) => {
        const balVal = typeof p.calculatedBalance === 'number' 
          ? p.calculatedBalance 
          : (Number(String(p.calculatedBalance || 0).replace(/,/g, '')) || 0);

        let balStatus = 'تسویه';
        if (balVal > 0) balStatus = 'بدهکار (به ما)';
        else if (balVal < 0) balStatus = 'بستانکار (از ما)';

        return {
          'ردیف': idx + 1,
          'کد حسابداری': p.accountingCode || p.personCode || '-',
          'نام و نام خانوادگی / شرکت': getPersonDisplayName(p),
          'نام مستعار / عنوان': p.alias || '-',
          'نقش': getRoleName(p.role),
          'گروه': p.group || '-',
          'تلفن': p.phone || '-',
          'موبایل': p.mobile || '-',
          'کد ملی / شناسه ملی': p.nationalId || '-',
          [`مانده حساب (${curr})`]: formatDecimalForExcel(Math.abs(balVal), activeSettings),
          'وضعیت تراز': balStatus,
          [`سقف اعتبار (${curr})`]: formatDecimalForExcel(p.creditLimit || 0, activeSettings),
          'وضعیت': p.isActive === false ? 'غیرفعال' : 'فعال',
          'آدرس': p.address || '-'
        };
      });

      const fileName = `لیست_اشخاص_و_طرف‌حساب‌ها_${new Date().toLocaleDateString('fa-IR').replace(/\//g, '-')}`;

      exportToExcel({
        filename: fileName,
        sheetName: 'لیست اشخاص',
        data: excelRows,
        storeSettings: activeSettings
      });

      notify('فایل اکسل لیست اشخاص با موفقیت دانلود شد', 'success');
    } catch (err) {
      console.error(err);
      notify('خطا در خروجی فایل اکسل اشخاص', 'error');
    }
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

      {/* Executive Header (Non-sticky, scrolls smoothly with document) */}
      <div className="bg-white px-4 sm:px-6 md:px-8 py-5 border-b border-slate-200 relative">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-2xs">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-lg sm:text-xl font-black text-slate-800">
                    اشخاص و طرف‌حساب‌ها
                  </h1>
                  <span className="text-xs font-black px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100/80 font-sans">
                    {toPersianDigits(kpis.total)} طرف‌حساب
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-semibold mt-0.5">
                  مدیریت جامع مشتریان، تامین‌کنندگان، متخصصین فنی، ترازهای مالی و اطلاعات تماس
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto justify-end">
            <button
              onClick={() => handleOpenNewPersonModal("customer")}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl flex items-center gap-1.5 transition-all text-xs font-black shadow-sm cursor-pointer hover:shadow-indigo-500/20"
            >
              <Plus className="w-4 h-4" strokeWidth={2.5} />
              <span>شخص جدید</span>
            </button>

            <button
              onClick={() => setActiveTab?.("specialists_directory")}
              className="px-3.5 py-2.5 border border-amber-300 hover:bg-amber-100/80 text-amber-900 bg-amber-50/90 rounded-xl flex items-center gap-1.5 transition-all text-xs font-black shadow-2xs cursor-pointer"
              title="مشاهده ویترین متخصصین و استادکاران فنی"
            >
              <Hammer className="w-4 h-4 text-amber-600" />
              <span>ویترین متخصصین</span>
            </button>

            <button
              onClick={handleExportPersonsExcel}
              className="px-3 py-2.5 border border-emerald-300 hover:bg-emerald-50 text-emerald-700 bg-white rounded-xl flex items-center gap-1.5 transition-all text-xs font-bold cursor-pointer shadow-2xs"
              title="خروجی مستقیم فایل اکسل از جدول فعلی اشخاص با فرمت استاندارد"
            >
              <Download className="w-4 h-4 text-emerald-600" />
              <span>خروجی اکسل</span>
            </button>

            <button
              onClick={handleGenerateMissingAccountingCodes}
              disabled={isGeneratingCodes}
              className="px-3 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-600 bg-white rounded-xl flex items-center gap-1.5 transition-all text-xs font-bold disabled:opacity-50 cursor-pointer shadow-2xs"
              title="تخصیص خودکار کد حسابداری به اشخاص فاقد کد"
            >
              <Key className={`w-4 h-4 ${isGeneratingCodes ? 'text-indigo-500 animate-spin' : 'text-slate-500'}`} />
              <span>کدگذاری</span>
            </button>

            <button
              onClick={() => { setPersonIOAction("export"); setIsPersonIOModalOpen(true); }}
              className="px-3 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-600 bg-white rounded-xl flex items-center gap-1.5 transition-all text-xs font-bold cursor-pointer shadow-2xs"
              title="درون‌ریزی و برون‌ریزی گروهی فایل"
            >
              <FileSpreadsheet className="w-4 h-4 text-slate-500" />
              <span>درون‌ریزی / برون‌ریزی</span>
            </button>
          </div>
        </div>

        {/* Interactive KPI Metrics Grid (1-click interactive filters) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3 mt-5">
          {/* Total Counterparties */}
          <div 
            onClick={() => handleKpiFilterClick('all')}
            className={`border rounded-xl p-3 flex flex-col justify-between cursor-pointer transition-all ${
              selectedPersonRole === 'all' && filterBalanceStatus === 'all' && filterActiveStatus === 'all' && !filterSpecialistsOnly
                ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/70'
            }`}
            title="کلیک برای نمایش همه طرف‌حساب‌ها"
          >
            <div className="flex items-center justify-between">
              <span className={`text-[10px] font-black flex items-center gap-1 ${
                selectedPersonRole === 'all' && filterBalanceStatus === 'all' && filterActiveStatus === 'all' && !filterSpecialistsOnly ? 'text-slate-300' : 'text-slate-500'
              }`}>
                <Users className="w-3.5 h-3.5" /> کل اشخاص
              </span>
              <span className={`text-[9px] px-1.5 py-0.2 rounded font-black ${
                selectedPersonRole === 'all' && filterBalanceStatus === 'all' && filterActiveStatus === 'all' && !filterSpecialistsOnly ? 'bg-slate-800 text-slate-200' : 'bg-slate-100 text-slate-500'
              }`}>همه</span>
            </div>
            <div className="mt-2">
              <div className="text-lg font-black font-sans leading-none">{toPersianDigits(kpis.total)}</div>
              <div className={`text-[9px] font-bold mt-1 ${
                selectedPersonRole === 'all' && filterBalanceStatus === 'all' && filterActiveStatus === 'all' && !filterSpecialistsOnly ? 'text-slate-400' : 'text-slate-400'
              }`}>
                {toPersianDigits(kpis.active)} فعال
              </div>
            </div>
          </div>

          {/* Customers */}
          <div 
            onClick={() => handleKpiFilterClick('customer')}
            className={`border rounded-xl p-3 flex flex-col justify-between cursor-pointer transition-all ${
              selectedPersonRole === 'customer'
                ? 'bg-blue-600 text-white border-blue-600 shadow-sm ring-2 ring-blue-500/20'
                : 'bg-blue-50/40 border-blue-100 hover:border-blue-200 hover:bg-blue-50/70 text-blue-900'
            }`}
            title="کلیک برای فیلتر مشتریان"
          >
            <div className="flex items-center justify-between">
              <span className={`text-[10px] font-black flex items-center gap-1 ${selectedPersonRole === 'customer' ? 'text-blue-100' : 'text-blue-600'}`}>
                <ShoppingCart className="w-3.5 h-3.5" /> مشتریان
              </span>
              {selectedPersonRole === 'customer' && (
                <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-blue-700 text-white">فعال</span>
              )}
            </div>
            <div className="mt-2">
              <div className="text-lg font-black font-sans leading-none">{toPersianDigits(kpis.customers)}</div>
              <div className={`text-[9px] font-bold mt-1 ${selectedPersonRole === 'customer' ? 'text-blue-100' : 'text-blue-500'}`}>
                طرف‌حساب فروش
              </div>
            </div>
          </div>

          {/* Suppliers */}
          <div 
            onClick={() => handleKpiFilterClick('supplier')}
            className={`border rounded-xl p-3 flex flex-col justify-between cursor-pointer transition-all ${
              selectedPersonRole === 'supplier'
                ? 'bg-amber-600 text-white border-amber-600 shadow-sm ring-2 ring-amber-500/20'
                : 'bg-amber-50/40 border-amber-100 hover:border-amber-200 hover:bg-amber-50/70 text-amber-900'
            }`}
            title="کلیک برای فیلتر تامین‌کنندگان"
          >
            <div className="flex items-center justify-between">
              <span className={`text-[10px] font-black flex items-center gap-1 ${selectedPersonRole === 'supplier' ? 'text-amber-100' : 'text-amber-600'}`}>
                <Building className="w-3.5 h-3.5" /> تامین‌کنندگان
              </span>
              {selectedPersonRole === 'supplier' && (
                <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-amber-700 text-white">فعال</span>
              )}
            </div>
            <div className="mt-2">
              <div className="text-lg font-black font-sans leading-none">{toPersianDigits(kpis.suppliers)}</div>
              <div className={`text-[9px] font-bold mt-1 ${selectedPersonRole === 'supplier' ? 'text-amber-100' : 'text-amber-500'}`}>
                طرف‌حساب خرید
              </div>
            </div>
          </div>

          {/* Active Status */}
          <div 
            onClick={() => handleKpiFilterClick('active')}
            className={`border rounded-xl p-3 flex flex-col justify-between cursor-pointer transition-all ${
              filterActiveStatus === 'active'
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm ring-2 ring-emerald-500/20'
                : 'bg-emerald-50/40 border-emerald-100 hover:border-emerald-200 hover:bg-emerald-50/70 text-emerald-900'
            }`}
            title="کلیک برای فیلتر اشخاص فعال"
          >
            <div className="flex items-center justify-between">
              <span className={`text-[10px] font-black flex items-center gap-1 ${filterActiveStatus === 'active' ? 'text-emerald-100' : 'text-emerald-600'}`}>
                <CheckCircle className="w-3.5 h-3.5" /> فعال
              </span>
              {filterActiveStatus === 'active' && (
                <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-emerald-700 text-white">فعال</span>
              )}
            </div>
            <div className="mt-2">
              <div className="text-lg font-black font-sans leading-none">{toPersianDigits(kpis.active)}</div>
              <div className={`text-[9px] font-bold mt-1 ${filterActiveStatus === 'active' ? 'text-emerald-100' : 'text-emerald-500'}`}>
                {toPersianDigits(kpis.inactive)} غیرفعال
              </div>
            </div>
          </div>

          {/* Debtors (Claims) */}
          <div 
            onClick={() => handleKpiFilterClick('debtor')}
            className={`border rounded-xl p-3 flex flex-col justify-between cursor-pointer transition-all ${
              filterBalanceStatus === 'debtor'
                ? 'bg-rose-600 text-white border-rose-600 shadow-sm ring-2 ring-rose-500/20'
                : 'bg-rose-50/40 border-rose-100 hover:border-rose-200 hover:bg-rose-50/70 text-rose-900'
            }`}
            title="کلیک برای فیلتر بدهکاران (مطالبات ما)"
          >
            <div className="flex items-center justify-between">
              <span className={`text-[10px] font-black flex items-center gap-1 ${filterBalanceStatus === 'debtor' ? 'text-rose-100' : 'text-rose-600'}`}>
                <ArrowDownToLine className="w-3.5 h-3.5" /> مطالبات (بدهکار)
              </span>
              {filterBalanceStatus === 'debtor' && (
                <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-rose-700 text-white">فعال</span>
              )}
            </div>
            <div className="mt-2">
              <div className="text-sm font-black font-sans leading-none truncate" title={formatNumber(kpis.totalDebtors)}>
                {kpis.totalDebtors === 0 ? "۰" : toPersianDigits(formatNumber(kpis.totalDebtors))}
                <span className="text-[8px] mr-1 opacity-80">{storeSettings.currency}</span>
              </div>
              <div className={`text-[9px] font-bold mt-1 ${filterBalanceStatus === 'debtor' ? 'text-rose-100' : 'text-rose-500'}`}>
                {toPersianDigits(kpis.debtorsCount)} طرف‌حساب
              </div>
            </div>
          </div>

          {/* Creditors (Liabilities) */}
          <div 
            onClick={() => handleKpiFilterClick('creditor')}
            className={`border rounded-xl p-3 flex flex-col justify-between cursor-pointer transition-all ${
              filterBalanceStatus === 'creditor'
                ? 'bg-teal-700 text-white border-teal-700 shadow-sm ring-2 ring-teal-500/20'
                : 'bg-teal-50/40 border-teal-100 hover:border-teal-200 hover:bg-teal-50/70 text-teal-900'
            }`}
            title="کلیک برای فیلتر بستانکاران (بدهی‌های ما)"
          >
            <div className="flex items-center justify-between">
              <span className={`text-[10px] font-black flex items-center gap-1 ${filterBalanceStatus === 'creditor' ? 'text-teal-100' : 'text-teal-700'}`}>
                <ArrowUpFromLine className="w-3.5 h-3.5" /> بدهی‌ها (بستانکار)
              </span>
              {filterBalanceStatus === 'creditor' && (
                <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-teal-800 text-white">فعال</span>
              )}
            </div>
            <div className="mt-2">
              <div className="text-sm font-black font-sans leading-none truncate" title={formatNumber(kpis.totalCreditors)}>
                {kpis.totalCreditors === 0 ? "۰" : toPersianDigits(formatNumber(kpis.totalCreditors))}
                <span className="text-[8px] mr-1 opacity-80">{storeSettings.currency}</span>
              </div>
              <div className={`text-[9px] font-bold mt-1 ${filterBalanceStatus === 'creditor' ? 'text-teal-100' : 'text-teal-600'}`}>
                {toPersianDigits(kpis.creditorsCount)} طرف‌حساب
              </div>
            </div>
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

      {/* Unified SaaS Command Bar & Filter Toolbar (Non-sticky, smooth scrolling) */}
      <div className="px-4 sm:px-6 md:px-8 py-3 bg-white/70 border-b border-slate-200/80">
        <div className="flex flex-col xl:flex-row gap-3 xl:items-center justify-between">
          
          {/* Quick Search with shortcut hint */}
          <div className="relative w-full xl:max-w-md">
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              ref={searchInputRef}
              type="text"
              className="w-full pl-16 pr-9 py-2.5 rounded-xl border border-slate-200 bg-white hover:border-indigo-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all text-xs sm:text-sm font-bold outline-none placeholder:text-slate-400"
              placeholder="جستجو نام، موبایل، کدملی، کد حسابداری..."
              value={localSearchTerm}
              onChange={(e) => setLocalSearchTerm(e.target.value)}
            />
            {localSearchTerm ? (
              <button
                onClick={() => setLocalSearchTerm('')}
                className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                title="پاک کردن جستجو"
              >
                <X className="w-4 h-4" />
              </button>
            ) : (
              <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                <kbd className="hidden sm:inline-block text-[10px] font-mono font-semibold bg-slate-100 text-slate-400 border border-slate-200 px-1.5 py-0.5 rounded">
                  /
                </kbd>
              </div>
            )}
          </div>

          {/* Quick Segmented Tabs & Filters */}
          <div className="flex flex-wrap items-center gap-2">
            
            {/* Quick Role Segmented Bar */}
            <div className="inline-flex items-center bg-slate-100/90 p-1 rounded-xl border border-slate-200 text-xs font-bold">
              <button
                onClick={() => { setSelectedPersonRole('all'); setFilterSpecialistsOnly(false); setPersonCurrentPage(1); }}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  selectedPersonRole === 'all' && !filterSpecialistsOnly
                    ? 'bg-white text-indigo-700 shadow-2xs font-black'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                همه
              </button>
              <button
                onClick={() => { setSelectedPersonRole('customer'); setFilterSpecialistsOnly(false); setPersonCurrentPage(1); }}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  selectedPersonRole === 'customer'
                    ? 'bg-white text-blue-700 shadow-2xs font-black'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                مشتریان
              </button>
              <button
                onClick={() => { setSelectedPersonRole('supplier'); setFilterSpecialistsOnly(false); setPersonCurrentPage(1); }}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  selectedPersonRole === 'supplier'
                    ? 'bg-white text-amber-700 shadow-2xs font-black'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                تامین‌کنندگان
              </button>
              <button
                onClick={() => {
                  setFilterSpecialistsOnly(!filterSpecialistsOnly);
                  if (!filterSpecialistsOnly) setSelectedPersonRole('all');
                  setPersonCurrentPage(1);
                }}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
                  filterSpecialistsOnly
                    ? 'bg-amber-500 text-white shadow-2xs font-black'
                    : 'text-slate-600 hover:text-amber-800'
                }`}
              >
                <Hammer className="w-3 h-3" />
                <span>متخصصین</span>
              </button>
            </div>

            {/* Advanced Filters Button */}
            <button
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className={`px-3.5 py-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                isFilterOpen || activeFilters.length > 0
                  ? 'bg-indigo-50 border-indigo-200 text-indigo-700 font-black shadow-2xs'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Filter className="w-3.5 h-3.5" />
              <span>فیلتر پیشرفته</span>
              {activeFilters.length > 0 && (
                <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[10px] flex items-center justify-center font-sans">
                  {toPersianDigits(activeFilters.length)}
                </span>
              )}
            </button>

            {/* View Mode Switcher */}
            <div className="hidden md:flex bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                onClick={() => setPersonsViewMode("table")}
                className={`p-1.5 rounded-lg transition-all cursor-pointer ${effectiveViewMode === "table" ? "bg-white text-indigo-700 shadow-2xs" : "text-slate-500 hover:text-slate-700"}`}
                title="نمایش جدولی"
              >
                <TableIcon className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPersonsViewMode("list")}
                className={`p-1.5 rounded-lg transition-all cursor-pointer ${effectiveViewMode === "list" ? "bg-white text-indigo-700 shadow-2xs" : "text-slate-500 hover:text-slate-700"}`}
                title="نمایش کارتی"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Quick Tag Filter Pills */}
        {availableTags.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 mt-3 scrollbar-none">
            <span className="text-[10px] font-black text-slate-400 flex items-center gap-1 shrink-0 ml-1">
              <Tag className="w-3 h-3 text-indigo-500" />
              برچسب‌ها:
            </span>
            <button
              onClick={() => { setFilterTag('all'); setPersonCurrentPage(1); }}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer ${
                filterTag === 'all'
                  ? 'bg-slate-800 text-white shadow-2xs'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              همه ({toPersianDigits(filteredPersons.length)})
            </button>
            {availableTags.map(tag => {
              const count = (filteredPersons || []).filter((p: any) => Array.isArray(p.tags) && p.tags.includes(tag)).length;
              const isSelected = filterTag === tag;
              return (
                <button
                  key={tag}
                  onClick={() => { setFilterTag(isSelected ? 'all' : tag); setPersonCurrentPage(1); }}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-black transition-all shrink-0 cursor-pointer ${
                    isSelected
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-white border border-slate-200 text-slate-700 hover:border-indigo-300 hover:text-indigo-600'
                  }`}
                  title={`فیلتر بر اساس برچسب ${tag}`}
                >
                  <span>#{tag}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-sans ${isSelected ? 'bg-indigo-500 text-white' : 'bg-slate-100 text-slate-500'}`}>
                    {toPersianDigits(count)}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Active Filter Chips */}
        {activeFilters.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 mt-3 pt-2.5 border-t border-slate-100">
            <span className="text-[10px] font-black text-slate-400 flex items-center gap-1"><Filter className="w-3 h-3" /> فیلترهای فعال:</span>
            {activeFilters.map(f => (
              <span key={f.id} className="bg-indigo-50 text-indigo-700 border border-indigo-100 px-2.5 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1.5 shadow-2xs">
                {f.label}
                <button onClick={f.onRemove} className="hover:bg-indigo-200 p-0.5 rounded-full transition-colors cursor-pointer"><X className="w-3 h-3" /></button>
              </span>
            ))}
            <button onClick={clearAllFilters} className="text-[10px] font-bold text-rose-500 hover:bg-rose-50 px-2 py-1 rounded-md transition-colors mr-auto cursor-pointer">
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
              <div className="bg-slate-50/90 border border-slate-200 p-4 rounded-2xl grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
                
                <div>
                  <label className="block text-[10px] font-black text-slate-500 mb-1">نقش طرف‌حساب</label>
                  <select 
                    value={selectedPersonRole} 
                    onChange={e => { setSelectedPersonRole(e.target.value); setPersonCurrentPage(1); }}
                    className="w-full text-xs font-bold border border-slate-200 rounded-xl py-2 px-2.5 outline-none focus:border-indigo-500 bg-white shadow-2xs"
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
                    className="w-full text-xs font-bold border border-slate-200 rounded-xl py-2 px-2.5 outline-none focus:border-indigo-500 bg-white shadow-2xs"
                  >
                    <option value="all">همه گروه‌ها</option>
                    <option value="none">بدون گروه</option>
                    {(personGroups || []).map((g: any) => <option key={g.id} value={g.id}>{g.name}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-500 mb-1">وضعیت مانده حساب</label>
                  <select 
                    value={filterBalanceStatus} 
                    onChange={e => { setFilterBalanceStatus(e.target.value); setPersonCurrentPage(1); }}
                    className="w-full text-xs font-bold border border-slate-200 rounded-xl py-2 px-2.5 outline-none focus:border-indigo-500 bg-white shadow-2xs"
                  >
                    <option value="all">همه موارد</option>
                    <option value="has_balance">دارای مانده (بدهکار/بستانکار)</option>
                    <option value="debtor">بدهکاران (طلب ما)</option>
                    <option value="creditor">بستانکاران (بدهی ما)</option>
                    <option value="settled">بی‌حساب (تسویه شده)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-500 mb-1">وضعیت فعالیت</label>
                  <select 
                    value={filterActiveStatus} 
                    onChange={e => { setFilterActiveStatus(e.target.value); setPersonCurrentPage(1); }}
                    className="w-full text-xs font-bold border border-slate-200 rounded-xl py-2 px-2.5 outline-none focus:border-indigo-500 bg-white shadow-2xs"
                  >
                    <option value="all">همه موارد</option>
                    <option value="active">فقط اشخاص فعال</option>
                    <option value="inactive">مسدود / غیرفعال</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-500 mb-1">نوع شخص</label>
                  <select 
                    value={filterPersonType} 
                    onChange={e => { setFilterPersonType(e.target.value); setPersonCurrentPage(1); }}
                    className="w-full text-xs font-bold border border-slate-200 rounded-xl py-2 px-2.5 outline-none focus:border-indigo-500 bg-white shadow-2xs"
                  >
                    <option value="all">همه موارد</option>
                    <option value="real">شخص حقیقی</option>
                    <option value="legal">شخص حقوقی (شرکت)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-500 mb-1">استان</label>
                  <select 
                    value={filterProvince} 
                    onChange={e => { setFilterProvince(e.target.value); setFilterCity('all'); setPersonCurrentPage(1); }}
                    className="w-full text-xs font-bold border border-slate-200 rounded-xl py-2 px-2.5 outline-none focus:border-indigo-500 bg-white shadow-2xs"
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
                    className="w-full text-xs font-bold border border-slate-200 rounded-xl py-2 px-2.5 outline-none focus:border-indigo-500 bg-white shadow-2xs"
                    disabled={availableCities.length === 0}
                  >
                    <option value="all">همه شهرها</option>
                    {availableCities.map(city => <option key={city} value={city}>{city}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-500 mb-1 flex items-center gap-1">
                    <Tag className="w-3 h-3 text-indigo-500" />
                    برچسب (تگ)
                  </label>
                  <select 
                    value={filterTag} 
                    onChange={e => { setFilterTag(e.target.value); setPersonCurrentPage(1); }}
                    className="w-full text-xs font-bold border border-slate-200 rounded-xl py-2 px-2.5 outline-none focus:border-indigo-500 bg-white shadow-2xs"
                  >
                    <option value="all">همه برچسب‌ها</option>
                    {availableTags.map(tag => (
                      <option key={tag} value={tag}>#{tag}</option>
                    ))}
                  </select>
                </div>

              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Main Content Area */}
      <div className="px-4 sm:px-6 md:px-8 py-4 sm:py-6 flex-1 overflow-x-hidden">
        
        {/* Floating Bulk Action Dock (Non-intrusive, appears at screen bottom) */}
        <AnimatePresence>
          {selectedIds.length > 0 && (
            <motion.div
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 50, opacity: 0 }}
              className="fixed bottom-6 inset-x-4 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 max-w-2xl bg-slate-900/95 text-white backdrop-blur-md px-4 py-3 rounded-2xl shadow-2xl z-40 border border-slate-700/60 flex flex-wrap items-center justify-between gap-3"
            >
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse"></span>
                <span className="text-xs font-black flex items-center gap-1.5">
                  <CheckSquare className="w-4 h-4 text-indigo-400" />
                  {toPersianDigits(selectedIds.length)} رکورد انتخاب شده
                </span>
                <button
                  onClick={() => setSelectedIds([])}
                  className="text-[10px] text-slate-400 hover:text-white underline mr-2 cursor-pointer"
                >
                  لغو انتخاب
                </button>
              </div>

              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  onClick={handleBulkExport}
                  className="text-xs font-bold px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-400" />
                  <span>اکسل</span>
                </button>
                <button
                  onClick={() => handleBulkStatusChange(true)}
                  className="text-xs font-bold px-2.5 py-1.5 bg-emerald-600/20 text-emerald-300 hover:bg-emerald-600/30 border border-emerald-600/40 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <Power className="w-3.5 h-3.5" />
                  <span>فعال‌سازی</span>
                </button>
                <button
                  onClick={() => handleBulkStatusChange(false)}
                  className="text-xs font-bold px-2.5 py-1.5 bg-amber-600/20 text-amber-300 hover:bg-amber-600/30 border border-amber-600/40 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <PowerOff className="w-3.5 h-3.5" />
                  <span>غیرفعال‌سازی</span>
                </button>
                <button
                  onClick={handleBulkDelete}
                  className="text-xs font-bold px-2.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg transition-colors flex items-center gap-1 shadow-xs cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>حذف</span>
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
          <>
            {/* Mobile View: Concise, uncluttered summary list */}
            <div className="block md:hidden space-y-2">
              {paginatedPersons.map((p: any) => {
                const bal = p.calculatedBalance;
                const isDebtor = bal > 0;
                const isCreditor = bal < 0;
                const phone = p.phone || p.mobile;

                return (
                  <div
                    key={p.id}
                    onClick={() => { setProfilePersonId(p.id); setActiveTab("person_profile"); }}
                    className="bg-white border border-slate-200/90 rounded-xl p-3 shadow-xs active:bg-slate-50 transition-colors flex items-center justify-between gap-2.5 cursor-pointer"
                  >
                    {/* Right: Avatar + Name + Role & Phone */}
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div className="relative shrink-0">
                        {p.imageUrl ? (
                          <img src={p.imageUrl} alt={p.name} className="w-10 h-10 rounded-full object-cover ring-1 ring-slate-200" />
                        ) : (
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-xs ${p.personType === 'legal' ? 'bg-amber-500' : 'bg-indigo-600'}`}>
                            {p.name ? p.name.substring(0, 1) : "?"}
                          </div>
                        )}
                        <div className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center text-[8px] border border-white ${p.personType === "legal" ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"}`}>
                          {p.personType === "legal" ? <Building className="w-2.5 h-2.5" /> : <User className="w-2.5 h-2.5" />}
                        </div>
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-bold text-slate-800 truncate">{getPersonDisplayName(p)}</span>
                          {p.isActive === false && (
                            <span className="text-[9px] font-bold bg-rose-50 text-rose-600 px-1 py-0.2 rounded shrink-0">غیرفعال</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500">
                          <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${getRoleBadgeClasses(p.role)}`}>
                            {getRoleName(p.role)}
                          </span>
                          {phone && (
                            <span className="text-[11px] font-mono text-slate-500 truncate" dir="ltr">
                              {toPersianDigits(phone)}
                            </span>
                          )}
                        </div>
                        {Array.isArray(p.specialties) && p.specialties.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1 mt-1">
                            {p.specialties.slice(0, 2).map((specId: string) => {
                              const spec = getSpecialtyById(specId, specialtiesCatalog);
                              return (
                                <span key={specId} className="inline-flex items-center gap-0.5 text-[8.5px] font-bold bg-amber-50 text-amber-900 px-1.5 py-0.2 rounded border border-amber-200">
                                  <Hammer className="w-2.5 h-2.5 text-amber-600" />
                                  <span>{spec.name}</span>
                                </span>
                              );
                            })}
                            {p.specialties.length > 2 && (
                              <span className="text-[8px] font-bold text-amber-700">+{p.specialties.length - 2} تخصص</span>
                            )}
                          </div>
                        )}
                        {Array.isArray(p.tags) && p.tags.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1 mt-1">
                            {p.tags.slice(0, 3).map((t: string, ti: number) => (
                              <span key={ti} className="text-[9px] font-bold bg-indigo-50 text-indigo-700 px-1.5 py-0.2 rounded border border-indigo-100">
                                #{t}
                              </span>
                            ))}
                            {p.tags.length > 3 && (
                              <span className="text-[8px] font-bold text-slate-400">+{p.tags.length - 3}</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Left: Balance + Action */}
                    <div className="flex items-center gap-2 shrink-0 text-left">
                      <div className="text-left">
                        <div className={`text-xs font-bold font-sans tabular-nums ${isDebtor ? "text-rose-600" : isCreditor ? "text-emerald-600" : "text-slate-500"}`} dir="ltr">
                          {bal === 0 ? "تسویه" : toPersianDigits(formatNumber(Math.abs(bal)))}
                        </div>
                        <div className={`text-[10px] font-medium ${isDebtor ? "text-rose-500" : isCreditor ? "text-emerald-500" : "text-slate-400"}`}>
                          {bal === 0 ? "۰ ریال" : isDebtor ? "بدهکار" : "بستانکار"}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenMessageModal(p, e);
                        }}
                        className="p-2 rounded-lg bg-slate-100 hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 transition-colors"
                        title="پیامک / تماس"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop View: Full Rich Cards (Untouched) */}
            <div className="hidden md:grid sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
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
                      {Array.isArray(p.tags) && p.tags.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1 mt-2">
                          {p.tags.map((t: string, ti: number) => (
                            <span
                              key={ti}
                              onClick={(e) => {
                                e.stopPropagation();
                                setFilterTag(filterTag === t ? 'all' : t);
                                setPersonCurrentPage(1);
                              }}
                              className={`inline-flex items-center gap-0.5 text-[9px] font-black px-1.5 py-0.5 rounded cursor-pointer transition-colors ${
                                filterTag === t
                                  ? 'bg-indigo-600 text-white shadow-2xs'
                                  : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200'
                              }`}
                              title={`فیلتر بر اساس برچسب ${t}`}
                            >
                              <Tag className="w-2.5 h-2.5" />
                              #{t}
                            </span>
                          ))}
                        </div>
                      )}
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
          </>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-right whitespace-nowrap">
                <thead className="bg-slate-50/95 backdrop-blur-xs border-b border-slate-200 text-slate-600 text-[11px] font-black sticky top-0 z-10 shadow-2xs">
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
                      نقش، گروه و برچسب <SortIcon columnKey="role" />
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
                            {Array.isArray(p.specialties) && p.specialties.length > 0 && (
                              <div className="flex flex-wrap items-center gap-1 mt-1 max-w-[200px]">
                                {p.specialties.map((specId: string) => {
                                  const spec = getSpecialtyById(specId, specialtiesCatalog);
                                  return (
                                    <span
                                      key={specId}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        props.setActiveTab?.("specialists_directory");
                                      }}
                                      className="inline-flex items-center gap-1 text-[9px] font-black px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100 cursor-pointer transition-colors"
                                      title="مشاهده در ویترین متخصصین"
                                    >
                                      <Hammer className="w-2.5 h-2.5 text-amber-600" />
                                      <span>{spec.name}</span>
                                    </span>
                                  );
                                })}
                              </div>
                            )}
                            {Array.isArray(p.tags) && p.tags.length > 0 && (
                              <div className="flex flex-wrap items-center gap-1 mt-1 max-w-[200px]">
                                {p.tags.map((t: string, ti: number) => (
                                  <span
                                    key={ti}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setFilterTag(filterTag === t ? 'all' : t);
                                      setPersonCurrentPage(1);
                                    }}
                                    className={`inline-flex items-center gap-0.5 text-[9px] font-black px-1.5 py-0.5 rounded cursor-pointer transition-colors ${
                                      filterTag === t
                                        ? 'bg-indigo-600 text-white shadow-2xs'
                                        : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200'
                                    }`}
                                    title={`کلیک برای فیلتر بر اساس برچسب ${t}`}
                                  >
                                    #{t}
                                  </span>
                                ))}
                              </div>
                            )}
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
                                      <button onClick={() => { setOpenPersonActionsId(null); handleEditPerson(p); }} className="w-full text-right px-3 py-2 text-xs font-bold text-slate-700 hover:bg-amber-50 hover:text-amber-800 rounded-lg flex items-center gap-2 transition-colors">
                                        <Hammer className="w-3.5 h-3.5 text-amber-500" />
                                        {Array.isArray(p.specialties) && p.specialties.length > 0 ? "ویرایش مهارت‌های تخصصی" : "افزودن به متخصصین و استادکاران"}
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
          source="person_list"
        />
      </div>
    </div>
  );
}
