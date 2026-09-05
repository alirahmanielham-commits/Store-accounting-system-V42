import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import * as lucide from 'lucide-react';

export default function PersonOpeningBalances(props: any) {
  const {
    persons, setPersons,
    fetchPersons, confirmAction, customAlert, showNotification, 
    formatCurrency, toPersianDigits, numToPersianWords, DatePicker, persian, persian_fa,
    storeSettings, user,
    handleOpeningBalanceSubmit,
    setIsOpeningBalanceModalOpen,
    isOpeningBalanceModalOpen,
    editingOpeningBalanceId,
    addPersonOpeningBalance,
    fetchPersonOpeningBalances,
    setSubmittingOpeningBalance,
    Select,
    selectedOpeningBalancePersonId,
    personOpeningBalances,
    setSelectedOpeningBalancePersonId,
    setOpeningBalanceAmount,
    setOpeningBalanceType,
    Info,
    openingBalanceType,
    CurrencyInput,
    openingBalanceAmount,
    openingBalanceDate,
    setOpeningBalanceDate,
    activeFinancialYear,
    openingBalanceDescription,
    setOpeningBalanceDescription,
    submittingOpeningBalance,
    RefreshCw
  ,
    FileSpreadsheet,
    setEditingOpeningBalanceId,
    DateObject,
    openingBalanceSearch,
    setOpeningBalanceSearch,
    addCommas,
    Edit2,
    deletePersonOpeningBalance,
    updatePersonOpeningBalance,
    formatDateDisplay,
    setLedgerPersonId,
    setActiveTab,
    ...rest
  } = props;
  
  // Destruct icons
  const { 
    Users, Plus, Search, Filter, ArrowUpDown, MoreVertical, Edit, Trash2, 
    X, Check, AlertCircle, ChevronDown, ChevronUp, Download, Upload, 
    Copy, Barcode, Eye, FileText, Image, CheckCircle, Save, DollarSign, Calculator, CalculatorIcon, ArrowRight
  } = lucide;

  return (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-6 text-right"
                  >
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                      <div className="bg-gradient-to-l from-indigo-50/50 to-white px-8 py-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4 font-sans">
                        <div>
                          <h1 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
                            <FileSpreadsheet className="w-6 h-6 text-indigo-500" />
                            سند افتتاحیه اشخاص
                          </h1>
                          <p className="text-xs text-slate-500 font-bold mt-1">
                            ثبت و مدیریت مانده حساب‌های اولیه مشتریان،
                            تامین‌کنندگان و کارمندان در شروع دوره مالی
                          </p>
                        </div>
                        <button
                          onClick={() => {
                            setEditingOpeningBalanceId(null);
                            setSelectedOpeningBalancePersonId("");
                            setOpeningBalanceAmount("");
                            setOpeningBalanceType("debtor");
                            setOpeningBalanceDate(
                              activeFinancialYear?.startDate 
                                ? new DateObject({ 
                                    date: activeFinancialYear.startDate, 
                                    format: "YYYY/MM/DD", 
                                    calendar: storeSettings?.calendarType === "gregorian" ? undefined : persian 
                                  }) 
                                : new Date()
                            );
                            setOpeningBalanceDescription(
                              "بابت مانده بدهی/طلب اول دوره",
                            );
                            setIsOpeningBalanceModalOpen(true);
                          }}
                          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl flex items-center gap-2 transition-all text-xs font-bold shadow-sm cursor-pointer"
                        >
                          <Plus className="w-4 h-4" />
                          ثبت افتتاحیه جدید
                        </button>
                      </div>

                      <div className="p-6">
                        {/* Search and Filters */}
                        <div className="flex flex-col md:flex-row gap-4 justify-between items-center mb-6">
                          <div className="relative w-full md:max-w-md">
                            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                            <input
                              type="text"
                              value={openingBalanceSearch}
                              onChange={(e) =>
                                setOpeningBalanceSearch(e.target.value)
                              }
                              placeholder="جستجو بر اساس نام شخص یا توضیحات..."
                              className="w-full pl-4 pr-10 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-slate-50/50"
                            />
                          </div>

                          <div className="text-xs font-bold text-slate-500">
                            تعداد اسناد:{" "}
                            <span className="text-indigo-600 font-extrabold">
                              {personOpeningBalances.length}
                            </span>
                          </div>
                        </div>

                        {/* List */}
                        {personOpeningBalances.length === 0 ? (
                          <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                            <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 mb-4">
                              <FileSpreadsheet className="w-8 h-8" />
                            </div>
                            <h3 className="text-sm font-extrabold text-slate-800 mb-1">
                              هیچ سند افتتاحیه ای ثبت نشده است
                            </h3>
                            <p className="text-xs text-slate-500 max-w-sm leading-relaxed mb-4">
                              برای تعریف مانده حساب اولیه اشخاص، از دکمه «ثبت
                              افتتاحیه جدید» استفاده کنید.
                            </p>
                            <button
                              onClick={() => {
                                setEditingOpeningBalanceId(null);
                                setSelectedOpeningBalancePersonId("");
                                setOpeningBalanceAmount("");
                                setOpeningBalanceType("debtor");
                                setOpeningBalanceDate(
                                  activeFinancialYear?.startDate 
                                    ? new DateObject({ 
                                        date: activeFinancialYear.startDate, 
                                        format: "YYYY/MM/DD", 
                                        calendar: storeSettings?.calendarType === "gregorian" ? undefined : persian 
                                      }) 
                                    : new Date()
                                );
                                setOpeningBalanceDescription(
                                  "بابت مانده بدهی/طلب اول دوره",
                                );
                                setIsOpeningBalanceModalOpen(true);
                              }}
                              className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold transition-colors"
                            >
                              ثبت اولین سند افتتاحیه
                            </button>
                          </div>
                        ) : (
                          <div className="overflow-x-auto rounded-xl border border-slate-100">
                            <table className="w-full text-right border-collapse text-xs">
                              <thead>
                                <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-100">
                                  <th className="px-4 py-3.5">کد</th>
                                  <th className="px-4 py-3.5">
                                    شخص / طرف حساب
                                  </th>
                                  <th className="px-4 py-3.5 text-center">
                                    نوع مانده
                                  </th>
                                  <th className="px-4 py-3.5 text-left">
                                    مبلغ افتتاحیه
                                  </th>
                                  <th className="px-4 py-3.5">تاریخ ثبت</th>
                                  <th className="px-4 py-3.5 max-w-xs truncate">
                                    توضیحات
                                  </th>
                                  <th className="px-4 py-3.5 text-center">
                                    عملیات
                                  </th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-50">
                                {personOpeningBalances
                                  .filter((ob: any) => {
                                    const pObj = (persons || []).find(
                                      (p: any) =>
                                        String(p?.id) === String(ob.personId),
                                    );
                                    if (!pObj) return false;
                                    const matchSearch =
                                      (pObj.name || "")
                                        .toLowerCase()
                                        .includes(
                                          openingBalanceSearch.toLowerCase(),
                                        ) ||
                                      (ob.description || "")
                                        .toLowerCase()
                                        .includes(
                                          openingBalanceSearch.toLowerCase(),
                                        );
                                    return matchSearch;
                                  })
                                  .map((ob: any, idx: number) => {
                                    const pObj = (persons || []).find(
                                      (p: any) =>
                                        String(p?.id) === String(ob.personId),
                                    );
                                    const isDebtor =
                                      ob.balanceType === "debtor";
                                    return (
                                      <tr
                                        key={ob.id}
                                        className="hover:bg-slate-50/50 transition-colors"
                                      >
                                        <td className="px-4 py-3 text-slate-400 font-mono font-medium">
                                          {idx + 1}
                                        </td>
                                        <td className="px-4 py-3">
                                          <div 
                                            className="font-extrabold text-indigo-600 hover:text-indigo-800 cursor-pointer transition-colors"
                                            onClick={() => {
                                              if (setLedgerPersonId && setActiveTab) {
                                                setLedgerPersonId(pObj?.id || "");
                                                setActiveTab("person_ledger");
                                              }
                                            }}
                                          >
                                            {pObj?.alias || pObj?.name}
                                          </div>
                                          <div className="text-[10px] text-slate-400 mt-0.5 font-bold flex items-center gap-1.5">
                                            <span>کد: {pObj?.personCode}</span>
                                            <span>•</span>
                                            <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded-md text-[9px]">
                                              {pObj?.role === "supplier"
                                                ? "تامین‌کننده"
                                                : pObj?.role === "employee"
                                                  ? "کارمند"
                                                  : "مشتری"}
                                            </span>
                                          </div>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                          <span
                                            className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold shadow-3xs inline-block ${
                                              isDebtor
                                                ? "bg-rose-50 text-rose-700 border border-rose-100"
                                                : "bg-emerald-50 text-emerald-700 border border-emerald-100"
                                            }`}
                                          >
                                            {isDebtor
                                              ? "بدهی شخص"
                                              : "بدهی ما"}
                                          </span>
                                        </td>
                                        <td className="px-4 py-3 text-left font-mono font-extrabold text-slate-900 text-sm">
                                          {addCommas(ob.amount)}{" "}
                                          {storeSettings?.currency || "تومان"}
                                        </td>
                                        <td className="px-4 py-3 text-slate-500 font-medium font-sans text-xs font-bold">
                                          {formatDateDisplay ? formatDateDisplay(ob.date, storeSettings?.calendarType) : ob.date}
                                        </td>
                                        <td
                                          className="px-4 py-3 text-slate-500 max-w-xs truncate font-medium"
                                          title={ob.description}
                                        >
                                          {ob.description || "-"}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                          <div className="flex items-center justify-center gap-1.5">
                                            <button
                                              onClick={() => {
                                                setEditingOpeningBalanceId(
                                                  ob.id,
                                                );
                                                setSelectedOpeningBalancePersonId(
                                                  ob.personId,
                                                );
                                                setOpeningBalanceAmount(
                                                  ob.amount.toString(),
                                                );
                                                setOpeningBalanceType(
                                                  ob.balanceType,
                                                );
                                                setOpeningBalanceDate(
                                                  storeSettings?.calendarType === "gregorian"
                                                    ? new Date(ob.date)
                                                    : new DateObject({
                                                        date: ob.date,
                                                        format: "YYYY/MM/DD",
                                                        calendar: persian
                                                      })
                                                );
                                                setOpeningBalanceDescription(
                                                  ob.description || "",
                                                );
                                                setIsOpeningBalanceModalOpen(
                                                  true,
                                                );
                                              }}
                                              className="p-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-lg transition-colors cursor-pointer"
                                              title="ویرایش سند"
                                            >
                                              <Edit2 className="w-3.5 h-3.5" />
                                            </button>
                                            <button
                                              onClick={async () => {
                                                if (
                                                  window.confirm(
                                                    "آیا از حذف این سند افتتاحیه اطمینان دارید؟ با حذف این سند، مانده حساب اولیه شخص نیز صفر خواهد شد.",
                                                  )
                                                ) {
                                                  try {
                                                    await deletePersonOpeningBalance(
                                                      ob.id,
                                                    );
                                                    await fetchPersonOpeningBalances();
                                                    await fetchPersons();
                                                    showNotification(
                                                      "سند افتتاحیه با موفقیت حذف شد.", "success"
                                                    );
                                                  } catch (err) {
                                                    console.error(err);
                                                    customAlert(
                                                      "خطا در حذف سند افتتاحیه.",
                                                    );
                                                  }
                                                }
                                              }}
                                              className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg transition-colors cursor-pointer"
                                              title="حذف سند"
                                            >
                                              <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                          </div>
                                        </td>
                                      </tr>
                                    );
                                  })}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Modal for Create/Edit Opening Balance */}
                    <AnimatePresence>
                      {isOpeningBalanceModalOpen && (
                        <div key="opening-balance-modal" className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
                          <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 10 }}
                            className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-xl overflow-hidden text-right font-sans"
                          >
                            {/* Modal Header */}
                            <div className="bg-gradient-to-l from-indigo-600 to-violet-600 px-6 py-5 border-b border-indigo-700 flex items-center justify-between">
                              <h2 className="text-lg font-extrabold text-white flex items-center gap-2">
                                <FileText className="w-5 h-5 text-indigo-200" />
                                {editingOpeningBalanceId
                                  ? "ویرایش سند افتتاحیه"
                                  : "ثبت سند افتتاحیه جدید"}
                              </h2>
                              <button
                                type="button"
                                onClick={() =>
                                  setIsOpeningBalanceModalOpen(false)
                                }
                                className="p-1.5 hover:bg-white/20 text-indigo-100 hover:text-white rounded-xl transition-colors cursor-pointer"
                              >
                                <X className="w-5 h-5" />
                              </button>
                            </div>

                            {/* Modal Form */}
                            <form
                              onSubmit={async (e) => {
                                e.preventDefault();
                                if (!selectedOpeningBalancePersonId) {
                                  customAlert(
                                    "لطفا شخص مورد نظر را انتخاب کنید.",
                                  );
                                  return;
                                }
                                const amountNum = Number(openingBalanceAmount);
                                if (isNaN(amountNum) || amountNum <= 0) {
                                  customAlert("لطفا یک مبلغ معتبر وارد کنید.");
                                  return;
                                }

                                // Check duplicate person
                                const exists = personOpeningBalances.some(
                                  (b) =>
                                    String(b.personId) ===
                                    String(selectedOpeningBalancePersonId),
                                );
                                if (exists && !editingOpeningBalanceId) {
                                  customAlert(
                                    "برای این شخص قبلا سند افتتاحیه ثبت شده است. لطفا همان سند قبلی را ویرایش یا حذف کنید.",
                                  );
                                  return;
                                }

                                setSubmittingOpeningBalance(true);
                                try {
                                  const formattedDate =
                                    typeof openingBalanceDate.format ===
                                    "function"
                                      ? openingBalanceDate.format("YYYY/MM/DD")
                                      : String(openingBalanceDate);

                                  const payload = {
                                    personId: selectedOpeningBalancePersonId,
                                    amount: amountNum,
                                    balanceType: openingBalanceType,
                                    date: formattedDate,
                                    description: openingBalanceDescription,
                                  };

                                  if (editingOpeningBalanceId) {
                                    await updatePersonOpeningBalance(
                                      editingOpeningBalanceId,
                                      payload,
                                    );
                                    showNotification(
                                      "سند افتتاحیه با موفقیت بروزرسانی شد.", "success"
                                    );
                                  } else {
                                    await addPersonOpeningBalance(payload);
                                    showNotification(
                                      "سند افتتاحیه با موفقیت ثبت شد.", "success"
                                    );
                                  }

                                  await fetchPersonOpeningBalances();
                                  await fetchPersons();
                                  setIsOpeningBalanceModalOpen(false);
                                } catch (err) {
                                  console.error(err);
                                  customAlert("خطا در ذخیره سند افتتاحیه.");
                                } finally {
                                  setSubmittingOpeningBalance(false);
                                }
                              }}
                              className="p-6 space-y-6 bg-slate-50/50"
                            >
                              {/* Person Selection */}
                              <div>
                                <label className="block text-sm font-extrabold text-slate-700 mb-2">
                                  شخص / طرف حساب را انتخاب کنید{" "}
                                  <span className="text-rose-500">*</span>
                                </label>
                                <Select
                                  isRtl
                                  options={persons
                                    .filter((p) => {
                                      if (!p.isActive) return false;
                                      if (editingOpeningBalanceId) {
                                        if (String(p.id) === String(selectedOpeningBalancePersonId)) return true;
                                      }
                                      const hasBalance = personOpeningBalances.some(
                                        (b) => String(b.personId) === String(p.id)
                                      );
                                      return !hasBalance;
                                    })
                                    .map((p) => ({
                                      value: p.id.toString(),
                                      label: `${p.title ? p.title + " " : ""}${p.name} (${p.role === "supplier" ? "تامین‌کننده" : p.role === "employee" ? "کارمند" : "مشتری"})${p.personCode ? ` - کد: ${p.personCode}` : ""}${p.phone ? ` - ${p.phone}` : ""}`,
                                      data: p,
                                    }))}
                                  filterOption={(option: any, inputValue: string) => {
                                    if (!inputValue) return true;
                                    const searchStr = inputValue.toLowerCase();
                                    const p = option.data.data || option.data;
                                    return (
                                      (p.name && p.name.toLowerCase().includes(searchStr)) ||
                                      (p.title && p.title.toLowerCase().includes(searchStr)) ||
                                      (p.firstName && p.firstName.toLowerCase().includes(searchStr)) ||
                                      (p.lastName && p.lastName.toLowerCase().includes(searchStr)) ||
                                      (p.nationalId && String(p.nationalId).toLowerCase().includes(searchStr)) ||
                                      (p.personCode && String(p.personCode).toLowerCase().includes(searchStr)) ||
                                      (p.phone && String(p.phone).toLowerCase().includes(searchStr)) ||
                                      (p.accountingCode && String(p.accountingCode).toLowerCase().includes(searchStr))
                                    );
                                  }}
                                  formatOptionLabel={(option: any) => (
                                    <div className="flex items-center justify-between py-1">
                                      <div className="flex flex-col">
                                        <span className="font-extrabold text-slate-800 text-sm">
                                          {option.data.title ? option.data.title + " " : ""}
                                          {option.data.name}
                                        </span>
                                        <span className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
                                          <span>
                                            {option.data.role === "supplier"
                                              ? "تامین‌کننده"
                                              : option.data.role === "employee"
                                                ? "کارمند"
                                                : "مشتری"}
                                          </span>
                                          {option.data.phone && (
                                            <span className="text-slate-400 font-mono text-[10px]">
                                              {option.data.phone}
                                            </span>
                                          )}
                                        </span>
                                      </div>
                                      {option.data.personCode && (
                                        <span className="text-xs font-bold bg-slate-100 text-slate-600 px-2.5 py-1 rounded-md">
                                          کد: {option.data.personCode}
                                        </span>
                                      )}
                                    </div>
                                  )}
                                  value={
                                    selectedOpeningBalancePersonId
                                      ? {
                                          value: selectedOpeningBalancePersonId,
                                          label: (() => {
                                            const p = (persons || []).find(
                                              (x: any) =>
                                                String(x?.id) ===
                                                String(
                                                  selectedOpeningBalancePersonId,
                                                ),
                                            );
                                            return p
                                              ? `${p.title ? p.title + " " : ""}${p.name} (${p.role === "supplier" ? "تامین‌کننده" : p.role === "employee" ? "کارمند" : "مشتری"})${p.personCode ? ` - کد: ${p.personCode}` : ""}`
                                              : "";
                                          })(),
                                          data: (persons || []).find(
                                            (x: any) =>
                                              String(x?.id) ===
                                              String(
                                                selectedOpeningBalancePersonId,
                                              ),
                                          ),
                                        }
                                      : null
                                  }
                                  onChange={(opt: any) => {
                                    const selectedId = opt ? opt.value : "";
                                    setSelectedOpeningBalancePersonId(
                                      selectedId,
                                    );
                                    if (
                                      selectedId &&
                                      !editingOpeningBalanceId
                                    ) {
                                      const p = opt.data;
                                      if (
                                        p &&
                                        p.initialBalance &&
                                        p.initialBalance > 0
                                      ) {
                                        setOpeningBalanceAmount(
                                          p.initialBalance.toString(),
                                        );
                                        if (
                                          p.initialBalanceType === "debtor" ||
                                          p.initialBalanceType === "creditor"
                                        ) {
                                          setOpeningBalanceType(
                                            p.initialBalanceType,
                                          );
                                        }
                                      } else {
                                        setOpeningBalanceAmount("");
                                        setOpeningBalanceType("debtor");
                                      }
                                    }
                                  }}
                                  placeholder="جستجو و انتخاب شخص..."
                                  className="text-sm font-sans"
                                  isDisabled={!!editingOpeningBalanceId}
                                />
                                {editingOpeningBalanceId && (
                                  <p className="text-xs font-bold text-slate-400 mt-2 flex items-center gap-1">
                                    <Info className="w-4 h-4" />
                                    در حالت ویرایش، امکان تغییر شخص وجود ندارد.
                                  </p>
                                )}
                              </div>

                              {/* Balance Type buttons */}
                              <div>
                                <label className="block text-sm font-extrabold text-slate-700 mb-2">
                                  نوع مانده حساب افتتاحیه{" "}
                                  <span className="text-rose-500">*</span>
                                </label>
                                <div className="grid grid-cols-2 gap-3">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setOpeningBalanceType("debtor")
                                    }
                                    className={`py-3 px-4 text-center rounded-2xl text-sm font-bold border-2 transition-all cursor-pointer ${
                                      openingBalanceType === "debtor"
                                        ? "bg-rose-50 text-rose-700 border-rose-500 shadow-md shadow-rose-100"
                                        : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:border-slate-300"
                                    }`}
                                  >
                                    بدهی شخص
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setOpeningBalanceType("creditor")
                                    }
                                    className={`py-3 px-4 text-center rounded-2xl text-sm font-bold border-2 transition-all cursor-pointer ${
                                      openingBalanceType === "creditor"
                                        ? "bg-emerald-50 text-emerald-700 border-emerald-500 shadow-md shadow-emerald-100"
                                        : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:border-slate-300"
                                    }`}
                                  >
                                    بدهی ما به شخص
                                  </button>
                                </div>
                              </div>

                              {/* Amount input & Date */}
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div>
                                  <label className="block text-sm font-extrabold text-slate-700 mb-2">
                                    مبلغ مانده اولیه (
                                    {storeSettings?.currency || "تومان"}){" "}
                                    <span className="text-rose-500">*</span>
                                  </label>
                                  <CurrencyInput
                                    value={openingBalanceAmount}
                                    onChange={(e: any) =>
                                      setOpeningBalanceAmount(e.target.value)
                                    }
                                    placeholder="مثلا: 10,000,000"
                                    className="w-full px-4 py-3 rounded-2xl border-2 border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 text-lg font-sans font-extrabold text-slate-800 tracking-wider bg-white transition-all text-left"
                                  />
                                </div>

                                <div>
                                  <label className="block text-sm font-extrabold text-slate-700 mb-2">
                                    تاریخ ثبت سند{" "}
                                    <span className="text-rose-500">*</span>
                                  </label>
                                  <div className="relative">
                                    <DatePicker
                                      value={openingBalanceDate}
                                      onChange={setOpeningBalanceDate}
                                      calendar={
                                        storeSettings?.calendarType ===
                                        "gregorian"
                                          ? undefined
                                          : persian
                                      }
                                      locale={
                                        storeSettings?.calendarType ===
                                        "gregorian"
                                          ? undefined
                                          : persian_fa
                                      }
                                      disabled={!!activeFinancialYear}
                                      inputClass={`w-full px-4 py-3 rounded-2xl border-2 border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 text-sm text-center font-sans font-bold ${activeFinancialYear ? 'opacity-70 cursor-not-allowed bg-slate-50' : 'bg-white'}`}
                                    />
                                    {activeFinancialYear && (
                                       <p className="text-[10px] text-slate-500 mt-2 font-medium">تاریخ سند به طور خودکار تاریخ شروع سال مالی در نظر گرفته می‌شود.</p>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Description */}
                              <div>
                                <label className="block text-sm font-extrabold text-slate-700 mb-2">
                                  توضیحات / بابت
                                </label>
                                <textarea
                                  value={openingBalanceDescription}
                                  onChange={(e) =>
                                    setOpeningBalanceDescription(e.target.value)
                                  }
                                  placeholder="مثلا: بابت مانده حساب قبلی سال ۱۴۰۴"
                                  rows={2}
                                  className="w-full px-4 py-3 rounded-2xl border-2 border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 text-sm font-bold bg-white transition-all"
                                />
                              </div>

                              {/* Action buttons */}
                              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 mt-2">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setIsOpeningBalanceModalOpen(false)
                                  }
                                  className="px-6 py-2.5 hover:bg-slate-200 bg-slate-100 text-slate-600 rounded-xl text-sm font-bold cursor-pointer transition-colors"
                                >
                                  انصراف
                                </button>
                                <button
                                  type="submit"
                                  disabled={submittingOpeningBalance}
                                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold shadow-md shadow-indigo-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
                                >
                                  {submittingOpeningBalance ? (
                                    <>
                                      <RefreshCw className="w-5 h-5 animate-spin" />
                                      در حال ذخیره...
                                    </>
                                  ) : (
                                    <>
                                      <Save className="w-5 h-5" />
                                      ذخیره سند
                                    </>
                                  )}
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
