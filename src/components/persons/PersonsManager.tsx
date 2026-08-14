import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { CloudOff } from "lucide-react";
import { User, Search, Filter, Plus, GripHorizontal, List, Users, Edit2, FileText, ChevronUp, ChevronDown, CheckCircle, Database, Phone, MapPin, Activity, Ban, Banknote, History, Printer, ShoppingCart, ArrowDownToLine, ArrowUpFromLine, Info, Trash2, RefreshCw, Key, ArrowRightLeft, LayoutGrid, Table, Building, BookOpen, Settings } from "lucide-react";
import { useState, useEffect } from "react";
import Select from "react-select";

export default function PersonsManager(props: any) {
  const [openPersonActionsId, setOpenPersonActionsId] = useState<any>(null);

  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

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

                    const totalPages = Math.ceil(
                      filteredPersons.length / personPageSize,
                    );
                    const safeCurrentPage = Math.max(
                      1,
                      Math.min(personCurrentPage, totalPages),
                    );
                    const paginatedPersons = filteredPersons.slice(
                      (safeCurrentPage - 1) * personPageSize,
                      safeCurrentPage * personPageSize,
                    );

                    const paginatedPersonBalances: Record<string, number> = {};
                    paginatedPersons.forEach((p) => {
                      const pid = p.id.toString();
                      const balResult = calculatePersonBalance(p.id);
                      let b = balResult.amount;
                      if (balResult.status === "بستانکار") {
                        b = -Math.abs(b);
                      } else if (balResult.status === "بدهکار") {
                        b = Math.abs(b);
                      } else {
                        b = 0;
                      }
                      paginatedPersonBalances[pid] = b;
                    });

                    const getPaginationItems = () => {
                      const items: (number | string)[] = [];
                      if (totalPages <= 7) {
                        for (let i = 1; i <= totalPages; i++) items.push(i);
                      } else {
                        if (safeCurrentPage <= 4) {
                          items.push(1, 2, 3, 4, 5, "...", totalPages);
                        } else if (safeCurrentPage >= totalPages - 3) {
                          items.push(
                            1,
                            "...",
                            totalPages - 4,
                            totalPages - 3,
                            totalPages - 2,
                            totalPages - 1,
                            totalPages,
                          );
                        } else {
                          items.push(
                            1,
                            "...",
                            safeCurrentPage - 1,
                            safeCurrentPage,
                            safeCurrentPage + 1,
                            "...",
                            totalPages,
                          );
                        }
                      }
                      return items;
                    };

  const effectiveViewMode = isMobile ? "list" : personsViewMode;
  return (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, ease: "easeOut" }}
                        className="bg-white rounded-[24px] shadow-sm border border-slate-200/60 overflow-hidden flex flex-col"
                      >
                        <div className="bg-gradient-to-l from-indigo-50/80 via-white to-white px-6 sm:px-8 py-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
                          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4 pointer-events-none" />
                          <div className="relative z-10">
                            <h1 className="text-2xl font-black text-slate-900 flex items-center gap-3 tracking-tight">
                              <div className="p-2.5 bg-indigo-600 rounded-xl shadow-lg shadow-indigo-200/50 text-white">
                                <User className="w-6 h-6" strokeWidth={2.5} />
                              </div>
                              مدیریت اشخاص
                            </h1>
                            <p className="text-sm text-slate-500 font-semibold mt-2 tracking-tight">
                              پرونده‌ی اطلاعاتی جامع مشتریان، تامین‌کنندگان و
                              همکاران
                            </p>
                          </div>
                          <div className="flex flex-wrap items-center gap-3 relative z-10">
                            <button
                              onClick={handleGenerateMissingAccountingCodes}
                              disabled={isGeneratingCodes}
                              className="px-4 py-2.5 border border-slate-200/80 hover:bg-slate-50 text-slate-700 bg-white rounded-xl flex items-center gap-2 transition-all text-xs font-black shadow-xs cursor-pointer disabled:opacity-50"
                              title="صدور کد حسابداری برای اشخاصی که کد حسابداری ندارند"
                            >
                              {isGeneratingCodes ? (
                                <RefreshCw className="w-4 h-4 text-indigo-500 animate-spin" />
                              ) : (
                                <Key className="w-4 h-4 text-indigo-500" />
                              )}
                              تخصیص کد حسابداری
                            </button>
                            <button
                              onClick={() => {
                                setPersonIOAction("export");
                                setIsPersonIOModalOpen(true);
                              }}
                              className="px-4 py-2.5 border border-slate-200/80 hover:bg-slate-50 text-slate-700 bg-white rounded-xl flex items-center gap-2 transition-all text-xs font-black shadow-xs cursor-pointer"
                            >
                              <ArrowRightLeft className="w-4 h-4 text-emerald-500" />
                              ورود / خروج اکسل
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
                              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl flex items-center gap-2 transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-indigo-600/30 active:translate-y-0 text-sm font-black cursor-pointer border-none"
                            >
                              <Plus className="w-4 h-4" strokeWidth={3} />
                              شخص جدید
                            </button>
                          </div>
                        </div>

                        {successMsg && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            className="mx-6 sm:mx-8 mt-6"
                          >
                            <div className="bg-emerald-50/80 text-emerald-700 px-5 py-4 rounded-2xl flex items-center gap-3 border border-emerald-100/50 shadow-sm">
                              <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />
                              <span className="font-bold text-sm">
                                {successMsg}
                              </span>
                            </div>
                          </motion.div>
                        )}

                        <div className="mx-6 sm:mx-8 mt-8 flex flex-col xl:flex-row gap-4 xl:items-center justify-between animate-fade-in">
                          {/* Search */}
                          <div className="relative w-full xl:max-w-md">
                            <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
                              <Search className="w-5 h-5 text-slate-400" />
                            </div>
                            <input
                              type="text"
                              className="w-full pl-4 pr-12 py-3.5 rounded-2xl border-2 border-slate-100 bg-slate-50/50 hover:bg-slate-50 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all text-sm text-slate-900 font-bold outline-none"
                              placeholder="جستجوی نام، تلفن، کد ملی، شماره شخص..."
                              value={personSearchTerm}
                              onChange={(e) =>
                                setPersonSearchTerm(e.target.value)
                              }
                            />
                          </div>

                          {/* Filters Layout */}
                          <div className="flex flex-wrap items-center gap-3">
                            <div className="flex bg-slate-100/70 p-1.5 rounded-2xl overflow-x-auto hide-scrollbar">
                              <button
                                onClick={() => {
                                  setSelectedPersonRole("all");
                                  setPersonCurrentPage(1);
                                }}
                                className={`px-4 py-2 rounded-xl font-black text-xs transition-all whitespace-nowrap ${selectedPersonRole === "all" ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50 border-transparent cursor-pointer"}`}
                              >
                                همه نقش‌ها
                              </button>
                              {(personRoles || []).map((r, index) => (
                                <button
                                  key={r.id ? `id-${r.id}` : `idx-${index}`}
                                  onClick={() => {
                                    setSelectedPersonRole(r.id);
                                    setPersonCurrentPage(1);
                                  }}
                                  className={`px-4 py-2 rounded-xl font-black text-xs transition-all whitespace-nowrap ${selectedPersonRole === r.id ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50 border-transparent cursor-pointer"}`}
                                >
                                  {r.name}
                                </button>
                              ))}
                            </div>

                            <div className="h-8 w-px bg-slate-200 hidden xl:block" />

                            <div className="flex flex-wrap gap-1.5 bg-slate-50 p-1.5 rounded-2xl border border-slate-100">
                              <button
                                onClick={() => setSelectedPersonGroup("all")}
                                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all border-none cursor-pointer ${
                                  selectedPersonGroup === "all"
                                    ? "bg-slate-800 text-white shadow-md shadow-slate-800/20"
                                    : "text-slate-500 hover:bg-slate-200 hover:text-slate-800"
                                }`}
                              >
                                همه گروه‌ها
                              </button>

                              <button
                                onClick={() => setSelectedPersonGroup("none")}
                                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all border-none cursor-pointer ${
                                  selectedPersonGroup === "none"
                                    ? "bg-amber-500 text-white shadow-md shadow-amber-500/20"
                                    : "text-slate-500 hover:bg-slate-200 hover:text-slate-800"
                                }`}
                              >
                                بدون گروه
                              </button>

                              {personGroups.slice(0, 3).map((g, index) => {
                                return (
                                  <button
                                    key={g.id ? `id-${g.id}` : `idx-${index}`}
                                    onClick={() => setSelectedPersonGroup(g.id)}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all border-none cursor-pointer ${
                                      selectedPersonGroup === g.id
                                        ? "bg-slate-800 text-white shadow-md shadow-slate-800/20"
                                        : "text-slate-500 hover:bg-slate-200 hover:text-slate-800"
                                    }`}
                                  >
                                    {g.name}
                                  </button>
                                );
                              })}

                              {personGroups.length > 3 && (
                                <select
                                  value={
                                    selectedPersonGroup !== "all" &&
                                    selectedPersonGroup !== "none" &&
                                    personGroups.find(
                                      (g) => g.id === selectedPersonGroup,
                                    )
                                      ? selectedPersonGroup
                                      : ""
                                  }
                                  onChange={(e) => {
                                    if (e.target.value) {
                                      setSelectedPersonGroup(e.target.value);
                                    }
                                  }}
                                  className="bg-transparent border-none font-black text-xs text-slate-600 rounded-xl px-2 focus:ring-0 cursor-pointer outline-none hover:text-slate-900"
                                >
                                  <option value="" disabled>
                                    بیشتر...
                                  </option>
                                  {personGroups.slice(3).map((g, index) => {
                                    return (
                                      <option key={g.id ? `id-${g.id}` : `idx-${index}`} value={g.id}>
                                        {g.icon ? g.icon + " " : ""}{g.name}
                                      </option>
                                    );
                                  })}
                                </select>
                              )}
                            </div>

                            <div className="h-8 w-px bg-slate-200 hidden xl:block" />

                            <div className="hidden md:flex bg-slate-100/70 p-1.5 rounded-2xl">
                              <button
                                onClick={() => setPersonsViewMode("list")}
                                className={`p-1.5 rounded-xl transition-all ${personsViewMode === "list" ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"}`}
                                title="نمایش کارتی"
                              >
                                <LayoutGrid className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setPersonsViewMode("table")}
                                className={`p-1.5 rounded-xl transition-all ${effectiveViewMode === "table" ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"}`}
                                title="نمایش جدولی"
                              >
                                <Table className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>

                        <div className="px-6 sm:px-8 mt-8 pb-8 flex-1">
                          {filteredPersons.length === 0 ? (
                            <div className="py-20 flex flex-col items-center justify-center bg-slate-50/50 rounded-3xl border-2 border-dashed border-slate-200">
                              <div className="w-20 h-20 bg-white rounded-full shadow-sm border border-slate-100 flex items-center justify-center mb-6">
                                <User className="w-10 h-10 text-slate-300" />
                              </div>
                              <h3 className="text-lg font-black text-slate-700 mb-2">
                                هیچ شخصی یافت نشد
                              </h3>
                              <p className="text-sm font-semibold text-slate-400">
                                با تغییر فیلترها جستجو را تکرار کنید یا شخص
                                جدیدی ایجاد نمایید.
                              </p>
                            </div>
                          ) : effectiveViewMode === "list" ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3">
                              {paginatedPersons.map((p, index) => {
                                const bal =
                                  paginatedPersonBalances[p.id.toString()] || 0;
                                const isDebtor = bal > 0;
                                const isCreditor = bal < 0;

                                return (
                                  <motion.div
  initial={{ opacity: 0, y: 10 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ delay: index * 0.03 }}
  key={p.id ? `id-${p.id}-${index}` : `idx-${index}`}
  onClick={() => {
    setProfilePersonId(p.id);
    setActiveTab("person_profile");
  }}
  className="group relative bg-white border border-slate-100 hover:border-indigo-200 rounded-[20px] p-5 shadow-sm hover:shadow-xl hover:shadow-indigo-500/10 transition-all duration-300 cursor-pointer flex flex-col h-full"
>
  <div className="flex items-start gap-4">
    <div className="relative shrink-0">
      {p.imageUrl ? (
        <img
          src={p.imageUrl}
          alt={p.name}
          className="w-14 h-14 rounded-[14px] object-cover ring-4 ring-slate-50 group-hover:ring-indigo-50 transition-all z-10 relative"
        />
      ) : (
        <div className="w-14 h-14 rounded-[14px] bg-gradient-to-br from-slate-50 to-slate-100 ring-4 ring-slate-50 group-hover:ring-indigo-50 flex items-center justify-center transition-all z-10 relative overflow-hidden">
          <span className="text-xl font-black text-slate-400/80">
            {p.name.substring(0, 1)}
          </span>
        </div>
      )}
      <div
        className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-lg flex items-center justify-center text-[10px] shadow-sm z-20 border-2 border-white ${
          p.personType === "legal"
            ? "bg-amber-100 text-amber-700"
            : "bg-blue-100 text-blue-700"
        }`}
      >
        {p.personType === "legal" ? (
          <Building className="w-3 h-3" />
        ) : (
          <User className="w-3 h-3" />
        )}
      </div>
    </div>
    <div className="flex-1 min-w-0 pt-0.5">
      <div className="flex justify-between items-start">
        <h3 className="text-[15px] font-black text-slate-800 truncate group-hover:text-indigo-700 transition-colors">
          {getPersonDisplayName(p)}
        </h3>
        {p.isActive === false && (
          <span className="shrink-0 ml-1 text-[9px] font-bold bg-rose-50 text-rose-600 px-1.5 py-0.5 rounded-md">
            غیرفعال
          </span>
        )}
      </div>
      {p.alias && (
        <p className="text-[11px] font-bold text-slate-400 mt-0.5 truncate">
          {p.name}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
        <span
          className={`text-[10px] font-black px-2 py-1 rounded-lg leading-none ${getRoleBadgeClasses(p.role)}`}
        >
          {getRoleName(p.role)}
        </span>
        {p.group && (() => {
          const g = personGroups.find((grp) => grp.id === p.group);
          if (!g) return null;
          let bg = "bg-slate-100",
            text = "text-slate-600";
          if (g.color === "indigo") { bg = "bg-indigo-50"; text = "text-indigo-700"; }
          else if (g.color === "emerald") { bg = "bg-emerald-50"; text = "text-emerald-700"; }
          else if (g.color === "amber") { bg = "bg-amber-50"; text = "text-amber-700"; }
          else if (g.color === "rose") { bg = "bg-rose-50"; text = "text-rose-700"; }
          else if (g.color === "purple") { bg = "bg-purple-50"; text = "text-purple-700"; }
          else if (g.color === "cyan") { bg = "bg-cyan-50"; text = "text-cyan-700"; }
          const effectiveViewMode = isMobile ? "list" : personsViewMode;
  return (
            <span className={`text-[10px] font-black px-2 py-1 rounded-lg leading-none ${bg} ${text}`}>
              {g.name}
            </span>
          );
        })()}
      </div>
    </div>
  </div>

  <div className="mt-5 grid grid-cols-2 gap-3 mb-4">
    <div>
      <span className="text-[10px] font-black text-slate-400 mb-1.5 block">
        شماره تماس
      </span>
      <div className="text-xs font-bold text-slate-700 font-sans truncate">
        {p.phone ? (
          toPersianDigits(p.phone)
        ) : (
          <span className="text-slate-300">-</span>
        )}
      </div>
    </div>
    <div>
      <span className={`text-[10px] font-black mb-1.5 block ${isDebtor ? "text-rose-500" : isCreditor ? "text-emerald-500" : "text-slate-400"}`}>
        وضعیت مانده
      </span>
      <div
        className={`font-black font-sans text-xs truncate ${isDebtor ? "text-rose-700" : isCreditor ? "text-emerald-700" : "text-slate-600"}`}
        dir="ltr"
      >
        {bal === 0
          ? "تسویه (۰)"
          : toPersianDigits(formatNumber(Math.abs(bal)))}
        {bal !== 0 && (
          <span className="text-[9px] ml-1">{storeSettings.currency}</span>
        )}
      </div>
    </div>
  </div>

  <div className="mt-auto pt-4 border-t border-slate-100 flex items-center justify-between">
    <div className="flex gap-1.5">
      {p.personCode && (
        <span className="text-[9px] font-black font-sans bg-slate-50 text-slate-500 px-2 py-1 rounded-md border border-slate-100">
          ID: {toPersianDigits(p.personCode)}
        </span>
      )}
      {p.accountingCode && (
        <span className="text-[9px] font-black font-mono bg-indigo-50 text-indigo-600 px-2 py-1 rounded-md border border-indigo-100/50">
          ACC: {toPersianDigits(p.accountingCode)}
        </span>
      )}
    </div>
    <div className="relative" onClick={e => e.stopPropagation()}>
      <button
        onClick={(e) => {
          setOpenPersonActionsId(openPersonActionsId === p.id ? null : p.id);
        }}
        className="w-8 h-8 rounded-full bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 flex items-center justify-center text-slate-600 hover:text-indigo-600 transition-colors"
      >
        <Settings className="w-4 h-4" />
      </button>
      
      {openPersonActionsId === p.id && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpenPersonActionsId(null)}
          />
          <div
            className="absolute left-0 bottom-full mb-2 w-56 bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden z-50 flex flex-col origin-bottom-left"
            dir="rtl"
          >
            <div className="bg-slate-50 px-3 py-2 border-b border-slate-100 flex items-center justify-between">
              <span className="text-[10px] font-black text-slate-500">
                عملیات شخص
              </span>
            </div>
            <div className="p-1.5 flex flex-col gap-0.5 max-h-[250px] overflow-y-auto custom-scrollbar">
              <button
                onClick={() => { setOpenPersonActionsId(null); setProfilePersonId(p.id); setActiveTab("person_profile"); }}
                className="w-full text-right px-3 py-2 text-xs font-bold text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 rounded-xl transition-colors flex items-center gap-2"
              >
                <User className="w-4 h-4 text-indigo-500" />
                مشاهده پروفایل
              </button>
              <button
                onClick={() => { setOpenPersonActionsId(null); clearDraft(); setCustomerId(p.id); setActiveTab("create_sale"); }}
                className="w-full text-right px-3 py-2 text-xs font-bold text-gray-700 hover:bg-slate-100 hover:text-slate-800 rounded-xl transition-colors flex items-center gap-2"
              >
                <ShoppingCart className="w-4 h-4 text-slate-400" />
                ثبت فاکتور جدید
              </button>
              <button
                onClick={() => { setOpenPersonActionsId(null); setLedgerPersonId(p.id); setActiveTab("person_ledger"); }}
                className="w-full text-right px-3 py-2 text-xs font-bold text-gray-700 hover:bg-slate-100 hover:text-slate-800 rounded-xl transition-colors flex items-center gap-2"
              >
                <BookOpen className="w-4 h-4 text-slate-400" />
                صورتحساب و معین
              </button>
              <div className="h-px bg-slate-100 my-1 mx-2"></div>
              <button
                onClick={() => { setOpenPersonActionsId(null); setActiveTab?.("create_receive_receipt"); setReceiptPersonId(p.id); }}
                className="w-full text-right px-3 py-2 text-xs font-bold text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 rounded-xl transition-colors flex items-center gap-2"
              >
                <ArrowDownToLine className="w-4 h-4 text-emerald-500" />
                دریافت وجه
              </button>
              <button
                onClick={() => { setOpenPersonActionsId(null); setActiveTab?.("create_pay_receipt"); setReceiptPersonId(p.id); }}
                className="w-full text-right px-3 py-2 text-xs font-bold text-gray-700 hover:bg-rose-50 hover:text-rose-700 rounded-xl transition-colors flex items-center gap-2"
              >
                <ArrowUpFromLine className="w-4 h-4 text-rose-500" />
                پرداخت وجه
              </button>
              <div className="h-px bg-slate-100 my-1 mx-2"></div>
              <button
                onClick={() => { setOpenPersonActionsId(null); handleEditPerson(p); }}
                className="w-full text-right px-3 py-2 text-xs font-bold text-gray-700 hover:bg-slate-100 hover:text-slate-800 rounded-xl transition-colors flex items-center gap-2"
              >
                <Edit2 className="w-4 h-4 text-slate-400" />
                ویرایش اطلاعات
              </button>
              <button
                onClick={() => { setOpenPersonActionsId(null); confirmAction(
  "آیا از حذف این شخص اطمینان دارید؟",
  () => handleDeletePerson(p.id),
  <div className="flex flex-col gap-2">
    <div><strong>نام:</strong> {p.name}</div>
    {p.phone && <div><strong>موبایل:</strong> {p.phone}</div>}
    {p.role && <div><strong>نقش:</strong> {p.role === "customer" ? "مشتری" : p.role === "supplier" ? "تامین‌کننده" : "پرسنل"}</div>}
  </div>
); }}
                className="w-full text-right px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 hover:text-rose-700 rounded-xl transition-colors flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4 text-rose-500" />
                حذف شخص
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  </div>
</motion.div>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
                              <div className="overflow-x-auto pb-40">
                                <table className="w-full text-sm text-right">
                                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                                    <tr>
                                      <th className="px-6 py-4">
                                        نام شخص / شرکت
                                      </th>
                                      <th className="px-6 py-4">نقش و گروه</th>
                                      <th className="px-6 py-4">شماره تماس</th>
                                      <th className="px-6 py-4">مانده حساب</th>
                                      <th className="px-6 py-4">کدینگ</th>
                                      <th className="px-6 py-4 text-left">
                                        عملیات
                                      </th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {paginatedPersons.map((p, index) => {
                                      const bal =
                                        paginatedPersonBalances[
                                          p.id.toString()
                                        ] || 0;
                                      const isDebtor = bal > 0;
                                      const isCreditor = bal < 0;

                                      return (
                                        <tr
                                          key={p.id ? `id-${p.id}-${index}` : `idx-${index}`}
                                          onClick={() => {
                                            setProfilePersonId(p.id);
                                            setActiveTab("person_profile");
                                          }}
                                          className="border-b border-slate-100 hover:bg-slate-50 transition-colors cursor-pointer"
                                        >
                                          <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                              <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                                                {p.imageUrl ? (
                                                  <img
                                                    src={p.imageUrl}
                                                    alt={p.name}
                                                    className="w-full h-full rounded-xl object-cover"
                                                  />
                                                ) : p.personType === "real" &&
                                                  p.gender === "male" ? (
                                                  <svg
                                                    viewBox="0 0 24 24"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    strokeWidth="2"
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    className="w-6 h-6 text-blue-400 mt-1"
                                                  >
                                                    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path>
                                                    <circle
                                                      cx="12"
                                                      cy="7"
                                                      r="4"
                                                    ></circle>
                                                  </svg>
                                                ) : p.personType === "real" &&
                                                  p.gender === "female" ? (
                                                  <svg
                                                    viewBox="0 0 24 24"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    strokeWidth="2"
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    className="w-6 h-6 text-pink-400 mt-1"
                                                  >
                                                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                                                    <circle
                                                      cx="12"
                                                      cy="7"
                                                      r="4"
                                                    ></circle>
                                                    <path d="M8 7v4s0 2 -2 2"></path>
                                                    <path d="M16 7v4s0 2 2 2"></path>
                                                  </svg>
                                                ) : (
                                                  <span className="text-sm font-black text-slate-400">
                                                    {p.name.substring(0, 1)}
                                                  </span>
                                                )}
                                              </div>
                                              <div>
                                                <div className="font-black text-slate-800">
                                                  {getPersonDisplayName(p)}
                                                  {p.isLocalUnsynced && (
                                                    <span className="mr-2 inline-flex items-center gap-1 text-[10px] font-bold bg-amber-50 text-amber-600 px-2 py-0.5 rounded-md align-middle" title="ذخیره محلی - در صف ارسال">
                                                      <CloudOff className="w-3 h-3" />
                                                      در صف
                                                    </span>
                                                  )}
                                                  {p.isActive === false && (
                                                    <span className="mr-2 text-[10px] font-bold bg-rose-50 text-rose-500 px-2 py-0.5 rounded-md align-middle">
                                                      غیرفعال
                                                    </span>
                                                  )}
                                                </div>
                                                {p.alias && (
                                                  <div className="text-xs font-bold text-slate-500 mt-1">
                                                    {p.name}
                                                  </div>
                                                )}
                                              </div>
                                            </div>
                                          </td>
                                          <td className="px-6 py-4">
                                            <div className="flex flex-col gap-1.5">
                                              <span
                                                className={`text-[10px] font-black px-2 py-1 rounded-lg inline-block w-fit ${getRoleBadgeClasses(p.role)}`}
                                              >
                                                {getRoleName(p.role)}
                                              </span>
                                              {p.group &&
                                                (() => {
                                                  const g = personGroups.find(
                                                    (grp) => grp.id === p.group,
                                                  );
                                                  if (!g) return null;
                                                  return (
                                                    <span className="text-[10px] font-bold text-slate-500 flex items-center gap-1">
                                                      {g.icon && <span>{g.icon}</span>}
                                                      <span>{g.name}</span>
                                                    </span>
                                                  );
                                                })()}
                                            </div>
                                          </td>
                                          <td className="px-6 py-4">
                                            <span className="font-sans font-bold text-slate-700">
                                              {p.phone
                                                ? toPersianDigits(p.phone)
                                                : "-"}
                                            </span>
                                          </td>
                                          <td className="px-6 py-4">
                                            <div
                                              className={`font-sans font-black text-xs ${isDebtor ? "text-rose-600" : isCreditor ? "text-emerald-600" : "text-slate-500"}`}
                                              dir="ltr"
                                            >
                                              {bal === 0
                                                ? "تسویه (۰)"
                                                : toPersianDigits(
                                                    formatNumber(Math.abs(bal)),
                                                  )}
                                              {bal !== 0 && (
                                                <span className="text-[10px] font-medium mr-1">
                                                  {storeSettings.currency}
                                                </span>
                                              )}
                                            </div>
                                          </td>
                                          <td className="px-6 py-4">
                                            <div className="flex flex-col gap-1 text-[10px] font-sans font-black">
                                              {p.personCode && (
                                                <span className="text-slate-600">
                                                  ID:{" "}
                                                  {toPersianDigits(
                                                    p.personCode,
                                                  )}
                                                </span>
                                              )}
                                              {p.accountingCode && (
                                                <span className="text-indigo-600">
                                                  ACC:{" "}
                                                  {toPersianDigits(
                                                    p.accountingCode,
                                                  )}
                                                </span>
                                              )}
                                            </div>
                                          </td>
                                          <td className="px-6 py-4">
                                            <div
                                              className="flex items-center justify-end gap-1 relative"
                                              dir="ltr"
                                            >
                                              <button
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  setOpenPersonActionsId(
                                                    openPersonActionsId === p.id
                                                      ? null
                                                      : p.id,
                                                  );
                                                }}
                                                className="px-3 py-1.5 h-8 flex items-center gap-1.5 bg-indigo-50 border border-indigo-100 text-indigo-700 hover:bg-indigo-600 hover:text-white rounded-xl transition-all font-black text-[10px] shadow-sm"
                                              >
                                                <Settings className="w-3.5 h-3.5" />{" "}
                                                عملیات{" "}
                                                <ChevronDown
                                                  className={`w-3 h-3 transition-transform ${openPersonActionsId === p.id ? "rotate-180" : ""}`}
                                                />
                                              </button>

                                              {openPersonActionsId === p.id && (
                                                <>
                                                  <div
                                                    className="fixed inset-0 z-40"
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      setOpenPersonActionsId(
                                                        null,
                                                      );
                                                    }}
                                                  ></div>
                                                  <div
                                                    className="absolute left-0 top-full mt-2 w-64 bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden z-50 flex flex-col"
                                                    onClick={(e) =>
                                                      e.stopPropagation()
                                                    }
                                                    dir="rtl"
                                                  >
                                                    <div className="bg-slate-50 px-3 py-2 border-b border-slate-100 flex items-center justify-between">
                                                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">
                                                        عملیات شخص
                                                      </span>
                                                      <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                                                        {p.name.substring(
                                                          0,
                                                          15,
                                                        )}
                                                        {p.name.length > 15
                                                          ? "..."
                                                          : ""}
                                                      </span>
                                                    </div>
                                                    <div className="p-1.5 flex flex-col gap-0.5 max-h-[300px] overflow-y-auto custom-scrollbar">
                                                      <button
                                                        onClick={() => {
                                                          setOpenPersonActionsId(
                                                            null,
                                                          );
                                                          setProfilePersonId(p.id);
                                                          setActiveTab(
                                                            "person_profile",
                                                          );
                                                        }}
                                                        className="w-full text-right px-3 py-2 text-xs font-bold text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 rounded-xl transition-colors flex items-center gap-2"
                                                      >
                                                        <div className="w-6 h-6 rounded-lg bg-indigo-100/50 flex items-center justify-center text-indigo-600">
                                                          <User className="w-3.5 h-3.5" />
                                                        </div>
                                                        مشاهده پروفایل
                                                      </button>

                                                      <div className="h-px bg-slate-100 my-1 mx-2"></div>
                                                      <div className="px-3 py-1 text-[9px] font-black text-slate-400">
                                                        امور بازرگانی
                                                      </div>

                                                      <button
                                                        onClick={() => {
                                                          setOpenPersonActionsId(
                                                            null,
                                                          );
                                                          setActiveTab(
                                                            "create_sale",
                                                          );
                                                          setCustomerId(p.id);
                                                        }}
                                                        className="w-full text-right px-3 py-2 text-xs font-bold text-gray-700 hover:bg-blue-50 hover:text-blue-700 rounded-xl transition-colors flex items-center gap-2"
                                                      >
                                                        <div className="w-6 h-6 rounded-lg bg-blue-100/50 flex items-center justify-center text-blue-600">
                                                          <FileText className="w-3.5 h-3.5" />
                                                        </div>
                                                        صدور فاکتور فروش
                                                      </button>
                                                      <button
                                                        onClick={() => {
                                                          setOpenPersonActionsId(
                                                            null,
                                                          );
                                                          setActiveTab(
                                                            "create_purchase",
                                                          );
                                                          setCustomerId(p.id);
                                                        }}
                                                        className="w-full text-right px-3 py-2 text-xs font-bold text-gray-700 hover:bg-violet-50 hover:text-violet-700 rounded-xl transition-colors flex items-center gap-2"
                                                      >
                                                        <div className="w-6 h-6 rounded-lg bg-violet-100/50 flex items-center justify-center text-violet-600">
                                                          <ShoppingCart className="w-3.5 h-3.5" />
                                                        </div>
                                                        صدور فاکتور خرید
                                                      </button>

                                                      <div className="h-px bg-slate-100 my-1 mx-2"></div>
                                                      <div className="px-3 py-1 text-[9px] font-black text-slate-400">
                                                        امور مالی و خزانه‌داری
                                                      </div>

                                                      <button
                                                        onClick={() => {
                                                          setOpenPersonActionsId(
                                                            null,
                                                          );
                                                          setActiveTab?.("create_receive_receipt");
                                                          setReceiptPersonId(
                                                            p.id,
                                                          );
                                                        }}
                                                        className="w-full text-right px-3 py-2 text-xs font-bold text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 rounded-xl transition-colors flex items-center gap-2"
                                                      >
                                                        <div className="w-6 h-6 rounded-lg bg-emerald-100/50 flex items-center justify-center text-emerald-600">
                                                          <ArrowDownToLine className="w-3.5 h-3.5" />
                                                        </div>
                                                        دریافت وجه (سند وصول)
                                                      </button>
                                                      <button
                                                        onClick={() => {
                                                          setOpenPersonActionsId(
                                                            null,
                                                          );
                                                          setActiveTab?.("create_pay_receipt");
                                                          setReceiptPersonId(
                                                            p.id,
                                                          );
                                                        }}
                                                        className="w-full text-right px-3 py-2 text-xs font-bold text-gray-700 hover:bg-rose-50 hover:text-rose-700 rounded-xl transition-colors flex items-center gap-2"
                                                      >
                                                        <div className="w-6 h-6 rounded-lg bg-rose-100/50 flex items-center justify-center text-rose-600">
                                                          <ArrowUpFromLine className="w-3.5 h-3.5" />
                                                        </div>
                                                        پرداخت وجه (سند پرداخت)
                                                      </button>

                                                      <div className="h-px bg-slate-100 my-1 mx-2"></div>
                                                      <div className="px-3 py-1 text-[9px] font-black text-slate-400">
                                                        اطلاعات پایه
                                                      </div>

                                                      <button
                                                        onClick={() => {
                                                          setOpenPersonActionsId(
                                                            null,
                                                          );
                                                          handleEditPerson(p);
                                                        }}
                                                        className="w-full text-right px-3 py-2 text-xs font-bold text-gray-700 hover:bg-slate-100 hover:text-slate-800 rounded-xl transition-colors flex items-center gap-2"
                                                      >
                                                        <div className="w-6 h-6 rounded-lg bg-slate-200/50 flex items-center justify-center text-slate-600">
                                                          <Edit2 className="w-3.5 h-3.5" />
                                                        </div>
                                                        ویرایش اطلاعات پایه
                                                      </button>
                                                      <button
                                                        onClick={() => {
                                                          setOpenPersonActionsId(
                                                            null,
                                                          );
                                                          setPersonExtraId(
  p.id,
);
setPersonBankAccounts(p.bankAccounts || []);
setPersonNotes(
  p.additionalNotes || "",
);
setIsPersonExtraModalOpen(
                                                            true,
                                                          );
                                                        }}
                                                        className="w-full text-right px-3 py-2 text-xs font-bold text-gray-700 hover:bg-slate-100 hover:text-slate-800 rounded-xl transition-colors flex items-center gap-2"
                                                      >
                                                        <div className="w-6 h-6 rounded-lg bg-slate-200/50 flex items-center justify-center text-slate-600">
                                                          <Info className="w-3.5 h-3.5" />
                                                        </div>
                                                        اطلاعات تکمیلی بانکی
                                                      </button>

                                                      <div className="h-px bg-slate-100 my-1 mx-2"></div>
                                                      <button
                                                        onClick={() => {
                                                          setOpenPersonActionsId(
                                                            null,
                                                          );
                                                          confirmAction(
                                                            "آیا از حذف این شخص اطمینان دارید؟",
                                                            () =>
                                                              handleDeletePerson(
                                                                p.id,
                                                              ),
                                                          );
                                                        }}
                                                        className="w-full text-right px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 hover:text-rose-700 rounded-xl transition-colors flex items-center gap-2"
                                                      >
                                                        <div className="w-6 h-6 rounded-lg bg-rose-100/50 flex items-center justify-center text-rose-600">
                                                          <Trash2 className="w-3.5 h-3.5" />
                                                        </div>
                                                        حذف شخص
                                                      </button>
                                                    </div>
                                                  </div>
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
                            </div>
                          )}
                        </div>

                        {/* Beautiful Pagination Footer */}
                        {totalPages > 1 && (
                          <div className="px-6 py-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50/50">
                            <div className="text-xs text-slate-500 font-bold">
                              نمایش ردیف‌های{" "}
                              <span className="text-slate-850 font-sans font-black">
                                {(
                                  (safeCurrentPage - 1) * personPageSize +
                                  1
                                ).toLocaleString("fa-IR")}
                              </span>{" "}
                              تا{" "}
                              <span className="text-slate-850 font-sans font-black">
                                {Math.min(
                                  filteredPersons.length,
                                  safeCurrentPage * personPageSize,
                                ).toLocaleString("fa-IR")}
                              </span>{" "}
                              از مجموع{" "}
                              <span className="text-indigo-600 font-sans font-bold">
                                {filteredPersons.length.toLocaleString("fa-IR")}
                              </span>{" "}
                              شخص یافت‌شده
                            </div>

                            <div
                              className="flex items-center gap-1.5"
                              dir="ltr"
                            >
                              <button
                                disabled={safeCurrentPage === 1}
                                onClick={() =>
                                  setPersonCurrentPage((prev) =>
                                    Math.max(1, prev - 1),
                                  )
                                }
                                className="p-2 border border-slate-200 hover:bg-slate-100 text-slate-600 bg-white rounded-xl transition-all disabled:opacity-40 disabled:hover:bg-white disabled:cursor-not-allowed cursor-pointer flex items-center justify-center shadow-3xs"
                                title="صفحه قبل"
                              >
                                <ChevronDown className="w-4 h-4 rotate-90" />
                              </button>

                              {getPaginationItems().map((pg, idx) => {
                                if (pg === "...") {
                                  return (
                                    <span
                                      key={`ellipsis-${idx}`}
                                      className="px-2 text-slate-400 font-black tracking-widest flex items-end pb-1"
                                    >
                                      ...
                                    </span>
                                  );
                                }
                                const isCurrent = pg === safeCurrentPage;
                                return (
                                  <button
                                    key={pg}
                                    onClick={() =>
                                      setPersonCurrentPage(pg as number)
                                    }
                                    className={`w-8 h-8 rounded-xl text-xs font-black transition-all flex items-center justify-center border cursor-pointer ${
                                      isCurrent
                                        ? "bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-100"
                                        : "bg-white border-slate-200 text-slate-700 hover:bg-slate-100"
                                    }`}
                                  >
                                    {Number(pg).toLocaleString("fa-IR")}
                                  </button>
                                );
                              })}

                              <button
                                disabled={safeCurrentPage === totalPages}
                                onClick={() =>
                                  setPersonCurrentPage((prev) =>
                                    Math.min(totalPages, prev + 1),
                                  )
                                }
                                className="p-2 border border-slate-200 hover:bg-slate-150 text-slate-600 bg-white rounded-xl transition-all disabled:opacity-40 disabled:hover:bg-white disabled:cursor-not-allowed cursor-pointer flex items-center justify-center shadow-3xs"
                                title="صفحه بعد"
                              >
                                <ChevronDown className="w-4 h-4 -rotate-90" />
                              </button>
                            </div>

                            <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200">
                              <span className="text-xs font-bold text-slate-500">
                                تعداد در صفحه:
                              </span>
                              <select
                                value={personPageSize}
                                onChange={(e) =>
                                  setPersonPageSize(Number(e.target.value))
                                }
                                className="bg-transparent border-none text-xs font-extrabold text-indigo-700 outline-none cursor-pointer focus:ring-0"
                              >
                                <option value={10}>۱۰ شخص</option>
                                <option value={20}>۲۰ شخص</option>
                                <option value={50}>۵۰ شخص</option>
                                <option value={100}>۱۰۰ شخص</option>
                              </select>
                            </div>
                          </div>
                        )}
                      </motion.div>
                    );

}
