import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import DateObject from "react-date-object";
import * as lucide from 'lucide-react';
import { MessageSquare } from 'lucide-react';
import html2pdf from "html2pdf.js";
import SendPersonMessageModal from '../modals/SendPersonMessageModal';

export default function PersonLedger(props: any) {
  const {
    persons, setPersons,
    fetchPersons, confirmAction, customAlert, showNotification, 
    formatCurrency, toPersianDigits, numToPersianWords, DatePicker, persian, persian_fa,
    storeSettings, user,
    PersonLedgerActionsDropdown,
    ledgerPersonId,
    setActiveTab,
    setCustomerId,
    setReceiptPersonId,
    handleEditPerson,
    setIsPersonModalOpen,
    sendNotification,
    setPrintingPersonLedger,
    fetchInvoices,
    fetchTransactions,
    fetchAccountingDocuments,
    User,
    Select,
    mapPersonToOption,
    setLedgerPersonId,
    customPersonFilter,
    accountingDocuments,
    payslips,
    invoices,
    convertToGregorian,
    printingPersonLedger,
    getPersonDisplayName,
    formatNumber,
    formatDateDisplay,
    getRoleBadgeClasses,
    getRoleName,
    setLedgerTab,
    ledgerTab,
    PersonNotesAndAttachments,
    List,
    setViewingInvoice,
    transactions,
    setViewingPayslip,
    setPreviewReceiptData,
    setPrintingTransaction,
    issuedChecks,
    setViewingCheck,
    receivedChecks,
    Calendar,
    Tag
,
    ...rest
  } = props;
  
  // Destruct icons
  const { 
    Users, Plus, Search, Filter, ArrowUpDown, MoreVertical, Edit, Trash2, 
    X, Check, AlertCircle, ChevronDown, ChevronUp, Download, Upload, 
    Copy, Barcode, Eye, FileText, Image, CheckCircle, Save, DollarSign, Calculator, CalculatorIcon, ArrowRight, Printer, Share2
  } = lucide;

  const [filterStartDate, setFilterStartDate] = useState("");
  const [filterEndDate, setFilterEndDate] = useState("");
  const [includeOpening, setIncludeOpening] = useState(true);
  const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);
  const [printPaperSize, setPrintPaperSize] = useState<'A4' | 'A5'>('A4');

  const cleanDescription = (desc: string, typeName: string) => {
    if (!desc || desc === "-") return typeName || "رویداد مالی";
    let cleaned = String(desc).trim();
    if (cleaned.startsWith('{') && cleaned.endsWith('}')) {
      try {
        const parsed = JSON.parse(cleaned);
        if (parsed.description) cleaned = parsed.description;
      } catch (e) {}
    }
    if (typeName && cleaned.startsWith(typeName)) {
      cleaned = cleaned.substring(typeName.length).replace(/^[\s:–\-]+/, '');
    }
    return cleaned || typeName || "رویداد مالی";
  };

  const getLedgerDateOnly = (dateInput: any) => {
    if (!dateInput || dateInput === "-") return "-";
    const isGregorian = storeSettings?.calendarType?.startsWith('gregorian');
    const targetCal = isGregorian ? 'gregorian' : 'jalali';
    let formatted = formatDateDisplay(dateInput, targetCal);
    if (!formatted || formatted === "-") return "-";
    // Strictly strip any hour/minute time patterns (e.g. " 14:30", " 14:30:25", " ساعت 14:30")
    formatted = formatted.replace(/\s+(?:ساعت\s*)?[0-9۰-۹]{1,2}:[0-9۰-۹]{2}(?::[0-9۰-۹]{2})?/g, '').trim();
    if (formatted.includes(' ')) {
      const parts = formatted.split(/\s+/);
      if (parts[0].includes('/') || parts[0].includes('-')) {
        formatted = parts[0];
      }
    }
    return toPersianDigits(formatted);
  };

  const renderFormattedAmount = (
    amount: number | string | undefined | null,
    options?: {
      colorClass?: string;
      paperSize?: 'A4' | 'A5';
      showDashOnZero?: boolean;
    }
  ) => {
    const num = Number(amount) || 0;
    if (num === 0) {
      if (options?.showDashOnZero) {
        return <span className="text-slate-300 font-normal">---</span>;
      }
      return <span className="text-slate-500 font-medium">۰</span>;
    }

    const formatted = toPersianDigits(formatNumber(Math.abs(num)));
    const charLen = formatted.length;
    
    // Auto-fit font size according to string length and paper size to strictly avoid overflow
    let sizeClass = "";
    if (options?.paperSize === 'A5') {
      if (charLen >= 15) sizeClass = "text-[7px]";
      else if (charLen >= 12) sizeClass = "text-[7.5px]";
      else sizeClass = "text-[8.5px]";
    } else {
      if (charLen >= 15) sizeClass = "text-[8.5px]";
      else if (charLen >= 12) sizeClass = "text-[9.5px]";
      else sizeClass = "text-[10.5px]";
    }

    return (
      <span
        dir="ltr"
        title={formatted}
        className={`accounting-num inline-block w-full text-left font-extrabold whitespace-nowrap overflow-hidden text-ellipsis ${sizeClass} ${options?.colorClass || 'text-slate-900'}`}
      >
        {formatted}
      </span>
    );
  };

  const handleDownloadPdf = (size: 'A4' | 'A5') => {
    const element = document.getElementById("person-ledger-printable-content") || document.getElementById("person-ledger-printable-area");
    if (!element) return;
    const person = (persons || []).find((p: any) => p?.id?.toString() === ledgerPersonId?.toString());
    const opt = {
      margin: size === 'A5' ? 4 : 7,
      filename: `کارت_حساب_${person?.name || "طرف_حساب"}_${size}.pdf`,
      image: { type: "jpeg" as const, quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, logging: false },
      jsPDF: { unit: "mm" as const, format: size.toLowerCase() as any, orientation: "portrait" as const },
    };
    html2pdf().set(opt).from(element).save();
  };

  const currentPerson = ledgerPersonId
    ? persons?.find((p: any) => String(p.id) === String(ledgerPersonId))
    : null;

  const calculatePersonBalance = (personId: string | number) => {
    let balance = 0;
    (accountingDocuments || []).forEach((doc: any) => {
      if (doc.status === 'draft' || doc.isDeleted) return;
      (doc.items || []).forEach((item: any) => {
        if (String(item.detailedAccountId) === String(personId)) {
          const debit = Number(item.debit || 0);
          const credit = Number(item.credit || 0);
          balance += (debit - credit);
        }
      });
    });
    if (balance > 0) {
      return { amount: balance, status: 'بدهکار', value: balance };
    } else if (balance < 0) {
      return { amount: Math.abs(balance), status: 'بستانکار', value: balance };
    }
    return { amount: 0, status: 'بی‌حساب', value: 0 };
  };

  return (
                  /* Contact/Person Ledger Card View (کارت حساب اشخاص) */
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-6 text-right print:p-0 print:bg-white print:min-h-screen"
                    dir="rtl"
                  >
                    {/* Header */}
                    <div className="bg-gradient-to-l from-indigo-50 to-white rounded-2xl shadow-sm border border-gray-100 px-8 py-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 print:hidden">
                      <div>
                        <h1 className="text-xl font-extrabold text-gray-900 flex items-center gap-2">
                          <User className="w-6 h-6 text-violet-600 font-bold" />
                          کارت حساب و دفتر معین اشخاص
                        </h1>
                        <p className="text-sm text-gray-500 mt-1">
                          گزارش یکپارچه و به ترتیب زمان از تمام فاکتورهای
                          فروش/خرید و رسیدهای دریافت/پرداخت هر یک از طرف حساب‌ها
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center justify-end gap-2 mt-4 md:mt-0">
                        {currentPerson && (
                          <button
                            type="button"
                            onClick={() => setIsMessageModalOpen(true)}
                            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black transition-all shadow-sm cursor-pointer"
                            title="ارسال پیامک با مانده حساب و صورت‌حساب"
                          >
                            <MessageSquare className="w-4 h-4" />
                            <span>ارسال پیام و مانده حساب</span>
                          </button>
                        )}
                        <PersonLedgerActionsDropdown 
                          ledgerPersonId={ledgerPersonId}
                          setActiveTab={setActiveTab}
                          setCustomerId={setCustomerId}
                          setReceiptPersonId={setReceiptPersonId}
                          persons={persons || []}
                          handleEditPerson={handleEditPerson}
                          setIsPersonModalOpen={setIsPersonModalOpen}
                          storeSettings={storeSettings}
                          sendNotification={sendNotification}
                          customAlert={customAlert}
                          setPrintingPersonLedger={setPrintingPersonLedger}
                          fetchInvoices={fetchInvoices}
                          fetchTransactions={fetchTransactions}
                          fetchAccountingDocuments={fetchAccountingDocuments}
                          fetchPersons={fetchPersons}
                          setPrintPaperSize={setPrintPaperSize}
                          printPaperSize={printPaperSize}
                        />
                      </div>
                    </div>
                    {/* Selector Card */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 print:hidden">
                      <div className="max-w-xl">
                        <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                          <User className="w-4 h-4 text-violet-500" />
                          شخص مورد نظر را انتخاب کنید:
                        </label>
                        <Select
                          isRtl
                          value={
                            ledgerPersonId
                              ? (persons || []).find(
                                  (p: any) =>
                                    p?.id?.toString() ===
                                    ledgerPersonId.toString(),
                                )
                                ? mapPersonToOption(
                                    (persons || []).find(
                                      (p: any) =>
                                        p?.id?.toString() ===
                                        ledgerPersonId.toString(),
                                    )!,
                                  )
                                : null
                              : null
                          }
                          onChange={(option: any) =>
                            setLedgerPersonId(option ? option.value : "")
                          }
                          options={(persons || []).map(mapPersonToOption) as any}
                          filterOption={customPersonFilter}
                          formatOptionLabel={(option: any) => (
                            <div className="flex items-center gap-3">
                              {option.imageUrl ? (
                                <img
                                  src={option.imageUrl}
                                  alt={option.label}
                                  className="w-8 h-8 rounded-full object-cover shadow-sm border border-slate-200"
                                />
                              ) : (
                               
                                <div className="w-8 h-8 rounded-full bg-violet-50 border border-violet-100 flex items-center justify-center">
                                  <User className="w-4 h-4 text-violet-400" />
                                </div>
                              )}
                              <span className="font-bold text-slate-700">
                                {option.label}
                              </span>
                            </div>
                          )}
                          placeholder="انتخاب یا جستجوی نام شخص..."
                          noOptionsMessage={() => "شخصی یافت نشد"}
                          isClearable
                          styles={{
                            control: (base) => ({
                              ...base,
                              borderRadius: "0.75rem",
                              borderColor: "#E5E7EB",
                              padding: "3px",
                              boxShadow: "none",
                              "&:hover": { borderColor: "#7C3AED" },
                            }),
                          }}
                        />
                      </div>
                      
                      {/* Date Filter & Opening Balance Configuration */}
                      <div className="mt-6 flex flex-col lg:flex-row gap-4 border-t border-gray-100 pt-6">
                        <div className="flex-1">
                          <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-violet-500" />
                            محدوده زمانی گزارش:
                          </label>
                          <div className="flex flex-col sm:flex-row gap-3">
                            <DatePicker
                              calendarPosition="bottom-right"
                              inputClass="w-full text-center px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 font-medium transition-all text-sm outline-none"
                              placeholder="از تاریخ"
                              value={filterStartDate || null}
                              onChange={(date: any) => {
                                setFilterStartDate(
                                  (date ? convertToGregorian(date) : "")
                                );
                              }}
                            />
                            <DatePicker
                              calendarPosition="bottom-right"
                              inputClass="w-full text-center px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 font-medium transition-all text-sm outline-none"
                              placeholder="تا تاریخ"
                              value={filterEndDate || null}
                              onChange={(date: any) => {
                                setFilterEndDate(
                                  (date ? convertToGregorian(date) : "")
                                );
                              }}
                            />
                          </div>
                          
                          <div className="flex gap-2 mt-3 overflow-x-auto pb-2 custom-scrollbar">
                            <button
                              onClick={() => {
                                const d = new Date();
                                d.setMonth(d.getMonth() - 1);
                                setFilterStartDate(d.toISOString());
                                setFilterEndDate("");
                              }}
                              className="px-3 py-1.5 text-xs font-bold bg-violet-50 text-violet-700 hover:bg-violet-100 rounded-lg whitespace-nowrap transition-colors"
                            >
                              یک ماهه
                            </button>
                            <button
                              onClick={() => {
                                const d = new Date();
                                d.setMonth(d.getMonth() - 2);
                                setFilterStartDate(d.toISOString());
                                setFilterEndDate("");
                              }}
                              className="px-3 py-1.5 text-xs font-bold bg-violet-50 text-violet-700 hover:bg-violet-100 rounded-lg whitespace-nowrap transition-colors"
                            >
                              دو ماهه
                            </button>
                            <button
                              onClick={() => {
                                const d = new Date();
                                d.setMonth(d.getMonth() - 3);
                                setFilterStartDate(d.toISOString());
                                setFilterEndDate("");
                              }}
                              className="px-3 py-1.5 text-xs font-bold bg-violet-50 text-violet-700 hover:bg-violet-100 rounded-lg whitespace-nowrap transition-colors"
                            >
                              سه ماهه
                            </button>
                            <button
                              onClick={() => {
                                setFilterStartDate("");
                                setFilterEndDate("");
                              }}
                              className="px-3 py-1.5 text-xs font-bold bg-slate-50 text-slate-700 hover:bg-slate-100 rounded-lg whitespace-nowrap transition-colors border border-slate-200"
                            >
                              پاک کردن فیلتر
                            </button>
                          </div>
                        </div>
                        
                        <div className="flex-1">
                          <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                            <Calculator className="w-4 h-4 text-violet-500" />
                            محاسبه مانده از قبل:
                          </label>
                          <label className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors mt-2">
                            <div className="relative flex items-center">
                              <input 
                                type="checkbox" 
                                className="peer sr-only"
                                checked={includeOpening}
                                onChange={(e) => setIncludeOpening(e.target.checked)}
                              />
                              <div className="w-5 h-5 rounded-md border-2 border-gray-300 peer-checked:bg-violet-500 peer-checked:border-violet-500 transition-all flex items-center justify-center">
                                <Check className="w-3.5 h-3.5 text-white opacity-0 peer-checked:opacity-100 scale-50 peer-checked:scale-100 transition-all" />
                              </div>
                            </div>
                            <div className="flex flex-col">
                              <span className="text-sm font-bold text-gray-800">مانده اول دوره لحاظ شود</span>
                              <span className="text-xs text-gray-500 mt-0.5">در صورت انتخاب، مانده حساب شخص تا قبل از تاریخ شروع فیلتر محاسبه و نمایش داده می‌شود.</span>
                            </div>
                          </label>
                        </div>
                      </div>
                    </div>

                    {/* Ledger Content */}
                    {(() => {
                      if (!ledgerPersonId) {
                        return (
                          <div className="bg-white rounded-2xl p-12 text-center text-gray-500 border border-gray-100 shadow-sm">
                            <User className="w-16 h-16 text-violet-200 mx-auto mb-4" />
                            <h3 className="text-lg font-bold text-gray-700 mb-1">
                              مکانیزم صدور صورتحساب هوشمند
                            </h3>
                            <p className="text-sm text-gray-400 max-w-md mx-auto">
                              برای بررسی گردش مالی، ریز فاکتورها، واریزی‌ها و
                              دریافت/پرداخت‌ها، لطفاً از کادر بالا یک شخص را
                              انتخاب و بررسی کنید.
                            </p>
                          </div>
                        );
                      }

                      const selectedPerson = (persons || []).find(
                        (p: any) => p?.id?.toString() === ledgerPersonId?.toString(),
                      );
                      if (!selectedPerson) {
                        return (
                          <div className="bg-white rounded-2xl p-8 text-center text-rose-500 border border-rose-100 shadow-sm">
                            شخص مورد نظر در سیستم یافت نشد.
                          </div>
                        );
                      }

                      // Calculations
                      const accountingDocEntries = accountingDocuments
                        .filter((doc) =>
                          doc.items?.some((item) => String(item.detailedAccountId) === String(selectedPerson.id))
                        )
                        .map((doc) => {
                          const personItems = doc.items.filter((item) => String(item.detailedAccountId) === String(selectedPerson.id));
                          const debit = personItems.reduce((sum, item) => sum + Number(item.debit || 0), 0);
                          const credit = personItems.reduce((sum, item) => sum + Number(item.credit || 0), 0);
                          
                          const descriptions = personItems.map((item) => item.description).filter(Boolean);
                          let desc = doc.description || descriptions.join(" - ") || "سند حسابداری";
                          let isPayslip = false;
                          try {
                            let p = (payslips || []).find(ps => String(ps.transactionId) === String(doc.sourceId));
                            if (!p) {
                              p = JSON.parse(desc);
                            }
                            if (p && p.isPayslip) {
                              isPayslip = true;
                              const pMonthName = ["فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور", "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند"];
                              const mName = p.periodMonth ? pMonthName[parseInt(p.periodMonth, 10) - 1] : "";
                              desc = `سند حقوق ${mName} ماه ${p.periodYear}`;
                            }
                          } catch (e) {}
                          
                          let entryType = "accounting_document";
                          let typeName = "سند حسابداری";
                          if (doc.sourceType && doc.sourceType.startsWith("invoice_")) {
                            entryType = "invoice";
                            const invoice = (invoices || []).find(inv => inv.id.toString() === doc.sourceId?.toString());
                            if (invoice) {
                                if (invoice.type === "sale") typeName = "فاکتور فروش";
                                else if (invoice.type === "purchase") typeName = "فاکتور خرید";
                                else if (invoice.type === "sale_return") typeName = "برگشت از فروش";
                                else if (invoice.type === "purchase_return") typeName = "برگشت از خرید";
                            } else {
                                if (doc.sourceType === "invoice_sale") typeName = "فاکتور فروش";
                                else if (doc.sourceType === "invoice_purchase") typeName = "فاکتور خرید";
                                else if (doc.sourceType === "invoice_sale_return") typeName = "برگشت از فروش";
                                else if (doc.sourceType === "invoice_purchase_return") typeName = "برگشت از خرید";
                            }
                          }
                          else if (doc.sourceType === "receipt") { entryType = "transaction"; typeName = "رسید دریافت"; }
                          else if (doc.sourceType === "payment") { entryType = "transaction"; typeName = (typeof isPayslip !== "undefined" && isPayslip) ? desc : "رسید پرداخت"; }
                          else if (doc.sourceType === "opening_balance") { entryType = "opening_balance"; typeName = "افتتاحیه"; }
                          else if (doc.sourceType?.startsWith("check_issued")) { entryType = "issued_check"; typeName = "چک پرداختی"; }
                          else if (doc.sourceType?.startsWith("check_received")) { entryType = "received_check"; typeName = "چک دریافتی"; }
                          
                          return {
                            id: doc.id,
                            refId: doc.documentNumber?.toString() || "-",
                            date: doc.date || new Date().toISOString(),
                            
                            type: typeName,
                            desc,
                            debit,
                            credit,
                            rawItem: doc,
                            entryType,
                          };
                        });

                      const getJalaliSortValue = (jalaliStr) => {
                        if (!jalaliStr || jalaliStr === "-") return 0;
                        const normalized = jalaliStr.replace(
                          /[۰-۹]/g,
                          (d) => "۰۱۲۳۴۵۶۷۸۹".indexOf(d).toString(),
                        );
                        const parts = normalized.split("/");
                        if (parts.length === 3) {
                          const y = parts[0];
                          const m = parts[1].padStart(2, "0");
                          const d = parts[2].split(" ")[0].padStart(2, "0");
                          return parseInt(y + m + d, 10);
                        }
                        return 0;
                      };

                      let allEntries = [...accountingDocEntries].sort((a, b) => {
                        const tA = new Date(convertToGregorian(a.date)).getTime();
                        const tB = new Date(convertToGregorian(b.date)).getTime();
                        const dateDiff = (isNaN(tA) ? 0 : tA) - (isNaN(tB) ? 0 : tB);
                        if (dateDiff === 0) {
                          return (a.rawItem?.createdAt || 0) - (b.rawItem?.createdAt || 0);
                        }
                        return dateDiff;
                      });
                      
                      // Apply Date Filters & Calculate Opening Balance
                      const startMs = filterStartDate ? new Date(convertToGregorian(filterStartDate)).setHours(0,0,0,0) : 0;
                      const endMs = filterEndDate ? new Date(convertToGregorian(filterEndDate)).setHours(23,59,59,999) : Infinity;

                      if (filterStartDate || filterEndDate) {
                         let openingBalance = 0;
                         
                         const filtered = [];
                         for (const entry of allEntries) {
                            const t = new Date(convertToGregorian(entry.date)).getTime();
                            const entryMs = isNaN(t) ? 0 : t;
                            
                            if (filterStartDate && entryMs < startMs) {
                               openingBalance += (entry.debit - entry.credit);
                            } else if (filterEndDate && entryMs > endMs) {
                               // skip
                            } else {
                               filtered.push(entry);
                            }
                         }
                         
                         if (includeOpening && filterStartDate && openingBalance !== 0) {
                             filtered.unshift({
                                 id: 'opening-balance',
                                 date: filterStartDate,
                                 desc: 'مانده از قبل',
                                 description: 'مانده از قبل',
                                 type: 'سیستم',
                                 refId: '-',
                                 debit: openingBalance > 0 ? openingBalance : 0,
                                 credit: openingBalance < 0 ? Math.abs(openingBalance) : 0,
                                 sourceType: 'system',
                                 sourceId: '0',
                                 isSynthetic: true,
                                 entryType: 'opening_balance',
                                 rawItem: { items: [], id: 'opening-balance' }
                             });
                         }
                         allEntries = filtered;
                      }

                      // Running progressive balance
                      let runningSum = 0;
                      const ledgerEntries = allEntries.map((entry) => {
                        runningSum += entry.debit - entry.credit;
                        return {
                          ...entry,
                          runningBalance: runningSum,
                        };
                      });

                      const totalDebits = allEntries.reduce(
                        (sum, entry) => sum + entry.debit,
                        0,
                      );
                      const totalCredits = allEntries.reduce(
                        (sum, entry) => sum + entry.credit,
                        0,
                      );
                      const finalBalance = totalDebits - totalCredits;

                      const isOwed = finalBalance > 0;
                      const isClr = finalBalance === 0;

                      return (
                        <div className="space-y-6">
                          {printingPersonLedger && createPortal(
                            <div
                              id="person-ledger-print-overlay"
                              className="fixed inset-0 z-[9999] bg-slate-900/80 backdrop-blur-xs flex flex-col items-center overflow-y-auto print:overflow-visible print:bg-white print:p-0 print:m-0 print:block print-section font-sans"
                              dir="rtl"
                            >
                              {/* Dynamic Print Styles for A4 and A5 */}
                              <style dangerouslySetInnerHTML={{ __html: `
                                @media print {
                                  @page {
                                    size: ${printPaperSize === 'A5' ? 'A5 portrait' : 'A4 portrait'};
                                    margin: ${printPaperSize === 'A5' ? '4mm' : '7mm'};
                                  }
                                  html, body {
                                    width: ${printPaperSize === 'A5' ? '148mm' : '210mm'} !important;
                                    background: #ffffff !important;
                                    margin: 0 !important;
                                    padding: 0 !important;
                                    -webkit-print-color-adjust: exact !important;
                                    print-color-adjust: exact !important;
                                  }
                                  #person-ledger-print-overlay {
                                    position: static !important;
                                    background: #ffffff !important;
                                    padding: 0 !important;
                                    margin: 0 !important;
                                    overflow: visible !important;
                                    display: block !important;
                                    width: 100% !important;
                                    height: auto !important;
                                  }
                                  #person-ledger-printable-area {
                                    padding: 0 !important;
                                    margin: 0 auto !important;
                                    width: 100% !important;
                                    max-width: 100% !important;
                                    display: block !important;
                                    background: #ffffff !important;
                                    box-shadow: none !important;
                                  }
                                  #person-ledger-printable-content {
                                    width: 100% !important;
                                    max-width: 100% !important;
                                    margin: 0 auto !important;
                                    padding: 0 !important;
                                    border: none !important;
                                    box-shadow: none !important;
                                    border-radius: 0 !important;
                                  }
                                  .print-avoid-break {
                                    page-break-inside: avoid !important;
                                    break-inside: avoid !important;
                                  }
                                }
                              `}} />

                              {/* Top Action Bar (Screen Only) */}
                              <div className="w-full max-w-5xl bg-white border-b border-slate-200 px-6 py-3 sticky top-0 z-50 shadow-md flex flex-wrap items-center justify-between gap-4 print:hidden my-0">
                                <div className="flex items-center gap-3">
                                  <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-xs">
                                    <Printer className="w-5 h-5" />
                                  </div>
                                  <div>
                                    <h3 className="font-extrabold text-slate-800 text-sm">
                                      پیش‌نمایش چاپ کارت حساب: {getPersonDisplayName(selectedPerson)}
                                    </h3>
                                    <p className="text-xs text-slate-400">
                                      فرمت چاپ را انتخاب کرده و پرینت یا فایل PDF دریافت کنید.
                                    </p>
                                  </div>
                                </div>

                                <div className="flex items-center gap-2">
                                  {/* Paper size toggles */}
                                  <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-1 border border-slate-200 text-xs font-bold">
                                    <button
                                      type="button"
                                      onClick={() => setPrintPaperSize('A4')}
                                      className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                                        printPaperSize === 'A4'
                                          ? 'bg-white text-indigo-600 shadow-sm border border-slate-200'
                                          : 'text-slate-600 hover:text-slate-900'
                                      }`}
                                    >
                                      <span>کاغذ A4</span>
                                      <span className="text-[10px] text-slate-400 font-mono">۲۱۰×۲۹۷</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setPrintPaperSize('A5')}
                                      className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                                        printPaperSize === 'A5'
                                          ? 'bg-white text-indigo-600 shadow-sm border border-slate-200'
                                          : 'text-slate-600 hover:text-slate-900'
                                      }`}
                                    >
                                      <span>کاغذ A5</span>
                                      <span className="text-[10px] text-slate-400 font-mono">۱۴۸×۲۱۰</span>
                                    </button>
                                  </div>

                                  {/* Print Button */}
                                  <button
                                    type="button"
                                    onClick={() => window.print()}
                                    className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm shadow-indigo-200 cursor-pointer"
                                  >
                                    <Printer className="w-4 h-4" />
                                    <span>چاپ نهایی</span>
                                  </button>

                                  {/* Download PDF Button */}
                                  <button
                                    type="button"
                                    onClick={() => handleDownloadPdf(printPaperSize)}
                                    className="flex items-center gap-1.5 bg-sky-600 hover:bg-sky-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm shadow-sky-200 cursor-pointer"
                                  >
                                    <Download className="w-4 h-4" />
                                    <span>دانلود PDF</span>
                                  </button>

                                  {/* Close Button */}
                                  <button
                                    type="button"
                                    onClick={() => setPrintingPersonLedger(false)}
                                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all cursor-pointer mr-1"
                                    title="بستن پیش‌نمایش"
                                  >
                                    <X className="w-5 h-5" />
                                  </button>
                                </div>
                              </div>

                              {/* Printable Paper Area */}
                              <div
                                id="person-ledger-printable-area"
                                className="p-4 md:p-8 flex justify-center w-full print:p-0 print:m-0"
                              >
                                <div
                                  id="person-ledger-printable-content"
                                  className={`bg-white text-slate-900 shadow-2xl print:shadow-none border border-slate-300 print:border-none transition-all rounded-xl print:rounded-none ${
                                    printPaperSize === 'A5'
                                      ? "w-[148mm] min-h-[210mm] p-3.5 text-[9.5px]"
                                      : "w-[210mm] min-h-[297mm] p-6 text-[11px]"
                                  } print:w-full print:max-w-none print:p-0 print:m-0`}
                                >
                                  {/* Header Info Block */}
                                  <div className={`border border-slate-300 rounded-xl ${printPaperSize === 'A5' ? 'p-3 mb-3' : 'p-4 mb-5'} bg-white`}>
                                    <div className={`flex justify-between items-start border-b border-slate-200 ${printPaperSize === 'A5' ? 'pb-2 mb-2' : 'pb-3 mb-3'}`}>
                                      <div className="text-right">
                                        <h1 className={`font-black text-slate-900 ${printPaperSize === 'A5' ? 'text-base' : 'text-xl'}`}>
                                          {storeSettings.storeName || "سیستم مدیریت"}
                                        </h1>
                                        <h2 className={`font-bold text-indigo-700 mt-0.5 ${printPaperSize === 'A5' ? 'text-xs' : 'text-sm'}`}>
                                          کارت حساب (دفتر معین) طرف حساب
                                        </h2>
                                      </div>
                                      <div className={`text-left text-slate-500 font-semibold ${printPaperSize === 'A5' ? 'text-[9px]' : 'text-xs'}`}>
                                        تاریخ گزارش:{" "}
                                        <span className="font-bold text-slate-800">
                                          {formatDateDisplay(new Date(), storeSettings?.calendarType)}
                                        </span>
                                      </div>
                                    </div>

                                    {/* Two Column Person & Balance Summary */}
                                    <div className={`grid grid-cols-2 ${printPaperSize === 'A5' ? 'gap-2 text-[9px]' : 'gap-4 text-xs'}`}>
                                      {/* Person Info */}
                                      <div className={`bg-slate-50/80 rounded-lg border border-slate-200 ${printPaperSize === 'A5' ? 'p-2 space-y-1' : 'p-3 space-y-1.5'}`}>
                                        <div className="flex items-center gap-1.5">
                                          <span className="text-slate-500 font-bold shrink-0">طرف حساب:</span>
                                          <span className={`font-black text-slate-900 truncate ${printPaperSize === 'A5' ? 'text-[10.5px]' : 'text-sm'}`}>
                                            {getPersonDisplayName(selectedPerson)}
                                          </span>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                          <span className="text-slate-500 font-bold shrink-0">کد شناسایی:</span>
                                          <span className="font-sans font-bold text-slate-700">
                                            {toPersianDigits(selectedPerson.personCode || selectedPerson.id || "---")}
                                          </span>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                          <span className="text-slate-500 font-bold shrink-0">تلفن تماس:</span>
                                          <span className="font-sans font-bold text-slate-800" dir="ltr">
                                            {toPersianDigits(selectedPerson.phone || "---")}
                                          </span>
                                        </div>
                                        {selectedPerson.address && (
                                          <div className="flex items-center gap-1.5">
                                            <span className="text-slate-500 font-bold shrink-0">نشانی:</span>
                                            <span className="text-slate-700 truncate">{toPersianDigits(selectedPerson.address)}</span>
                                          </div>
                                        )}
                                      </div>

                                      {/* Balance Summary */}
                                      <div className={`bg-slate-50/80 rounded-lg border border-slate-200 ${printPaperSize === 'A5' ? 'p-2 space-y-1' : 'p-3 space-y-1.5'}`}>
                                        <div className="flex items-center justify-between">
                                          <span className="text-slate-500 font-bold shrink-0">مجموع فاکتورها (بدهی):</span>
                                          <span className="accounting-num font-extrabold text-slate-900 text-left" dir="ltr">
                                            {toPersianDigits(formatNumber(totalDebits))} <span className="text-[10px] text-slate-500 font-normal mr-1">{storeSettings.currency || 'ریال'}</span>
                                          </span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                          <span className="text-slate-500 font-bold shrink-0">مجموع پرداختی‌ها (بستانکاری):</span>
                                          <span className="accounting-num font-extrabold text-slate-900 text-left" dir="ltr">
                                            {toPersianDigits(formatNumber(totalCredits))} <span className="text-[10px] text-slate-500 font-normal mr-1">{storeSettings.currency || 'ریال'}</span>
                                          </span>
                                        </div>
                                        <div className={`flex items-center justify-between border-t border-slate-200 pt-1 ${isOwed ? 'text-rose-700' : isClr ? 'text-slate-700' : 'text-emerald-700'}`}>
                                          <span className="font-black shrink-0">مانده حساب نهایی:</span>
                                          <span className={`accounting-num font-black text-left ${printPaperSize === 'A5' ? 'text-[11px]' : 'text-sm'}`} dir="ltr">
                                            {isClr ? "تسویه کامل (بی‌حساب)" : (
                                              <>
                                                {toPersianDigits(formatNumber(Math.abs(finalBalance)))}{" "}
                                                <span className="text-[10px] text-slate-500 font-normal mr-1">{storeSettings.currency || 'ریال'}</span>{" "}
                                                <span className="text-[10px] font-bold">({isOwed ? 'بدهکار' : 'بستانکار'})</span>
                                              </>
                                            )}
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Clean, Fixed-Width, Non-Wrapping Ledger Table */}
                                  <div className="overflow-visible w-full">
                                    <table className="w-full text-right border-collapse table-fixed border border-slate-700 print:border-slate-800">
                                      <colgroup>
                                        <col style={{ width: printPaperSize === 'A5' ? "4.5%" : "3.5%" }} />
                                        <col style={{ width: printPaperSize === 'A5' ? "11.5%" : "10%" }} />
                                        <col style={{ width: printPaperSize === 'A5' ? "26%" : "29.5%" }} />
                                        <col style={{ width: printPaperSize === 'A5' ? "18.5%" : "18%" }} />
                                        <col style={{ width: printPaperSize === 'A5' ? "18.5%" : "18%" }} />
                                        <col style={{ width: printPaperSize === 'A5' ? "18%" : "18%" }} />
                                        <col style={{ width: printPaperSize === 'A5' ? "3%" : "3%" }} />
                                      </colgroup>
                                      <thead>
                                        <tr className="bg-slate-800 text-white print:bg-slate-200 print:text-slate-900 font-bold border-b border-slate-700">
                                          <th className={`border border-slate-700 text-center ${printPaperSize === 'A5' ? 'py-1 px-0.5 text-[8.5px]' : 'py-2 px-1 text-[10px]'}`}>
                                            ردیف
                                          </th>
                                          <th className={`border border-slate-700 text-right ${printPaperSize === 'A5' ? 'py-1 px-1 text-[8.5px]' : 'py-2 px-1.5 text-[10px]'}`}>
                                            تاریخ و سند
                                          </th>
                                          <th className={`border border-slate-700 text-right ${printPaperSize === 'A5' ? 'py-1 px-1.5 text-[8.5px]' : 'py-2 px-2 text-[10px]'}`}>
                                            عنوان و شرح جزئیات رویداد مالی
                                          </th>
                                          <th className={`border border-slate-700 text-left ${printPaperSize === 'A5' ? 'py-1 px-1 text-[8.5px]' : 'py-2 px-1 text-[10px]'}`}>
                                            بدهکار (افزایش)
                                          </th>
                                          <th className={`border border-slate-700 text-left ${printPaperSize === 'A5' ? 'py-1 px-1 text-[8.5px]' : 'py-2 px-1 text-[10px]'}`}>
                                            بستانکار (کاهش)
                                          </th>
                                          <th className={`border border-slate-700 text-left ${printPaperSize === 'A5' ? 'py-1 px-1 text-[8.5px]' : 'py-2 px-1 text-[10px]'}`}>
                                            مانده
                                          </th>
                                          <th className={`border border-slate-700 text-center ${printPaperSize === 'A5' ? 'py-1 px-0.5 text-[8.5px]' : 'py-2 px-0.5 text-[10px]'}`}>
                                            تشخیص
                                          </th>
                                        </tr>
                                      </thead>
                                      <tbody className="font-medium font-sans bg-white divide-y divide-slate-300">
                                        {ledgerEntries.map((entry, index) => {
                                          const isDeb = entry.runningBalance > 0;
                                          const isCred = entry.runningBalance < 0;
                                          const isBalZero = entry.runningBalance === 0;
                                          return (
                                            <tr
                                              key={index}
                                              className="break-inside-avoid print-avoid-break hover:bg-slate-50 transition-colors"
                                            >
                                              {/* ردیف */}
                                              <td className={`border border-slate-400 text-center align-middle font-bold text-slate-700 ${printPaperSize === 'A5' ? 'py-1 px-0.5 text-[8.5px]' : 'py-1.5 px-1 text-[10px]'}`}>
                                                {toPersianDigits(index + 1)}
                                              </td>

                                              {/* تاریخ و سند (فقط تاریخ بدون ساعت) */}
                                              <td className={`border border-slate-400 align-middle ${printPaperSize === 'A5' ? 'py-1 px-1' : 'py-1.5 px-1.5'}`}>
                                                <div className="flex flex-col leading-tight gap-0.5 text-right overflow-hidden">
                                                  <span className={`font-bold text-slate-800 whitespace-nowrap truncate ${printPaperSize === 'A5' ? 'text-[8px]' : 'text-[9.5px]'}`}>
                                                    {getLedgerDateOnly(
                                                      entry.date || (entry as any).jalaliDate
                                                    )}
                                                  </span>
                                                  <span className={`text-slate-500 font-sans font-bold whitespace-nowrap truncate ${printPaperSize === 'A5' ? 'text-[7.5px]' : 'text-[8.5px]'}`}>
                                                    #{toPersianDigits(entry.refId)}
                                                  </span>
                                                </div>
                                              </td>

                                              {/* شرح جزئیات مالی */}
                                              <td className={`border border-slate-400 align-middle ${printPaperSize === 'A5' ? 'py-1 px-1.5' : 'py-1.5 px-2'}`}>
                                                <div className="flex items-center gap-1.5 min-w-0 w-full overflow-hidden">
                                                  <span
                                                    className={`shrink-0 font-extrabold rounded border whitespace-nowrap ${
                                                      printPaperSize === 'A5' ? 'text-[7.5px] px-1 py-0.2' : 'text-[9px] px-1.5 py-0.5'
                                                    } ${
                                                      entry.credit > 0
                                                        ? "bg-emerald-50 text-emerald-800 border-emerald-300 print:border-slate-400 print:bg-slate-100"
                                                        : entry.debit > 0
                                                          ? "bg-rose-50 text-rose-800 border-rose-300 print:border-slate-400 print:bg-slate-100"
                                                          : "bg-slate-100 text-slate-800 border-slate-300 print:border-slate-400 print:bg-slate-100"
                                                    }`}
                                                  >
                                                    {entry.type}
                                                  </span>
                                                  <span
                                                    className={`text-slate-800 font-medium truncate min-w-0 flex-1 whitespace-nowrap overflow-hidden text-ellipsis text-right ${
                                                      printPaperSize === 'A5' ? 'text-[8.5px]' : 'text-[10px]'
                                                    }`}
                                                    title={entry.desc}
                                                  >
                                                    {toPersianDigits(cleanDescription(entry.desc, entry.type))}
                                                  </span>
                                                </div>
                                              </td>

                                              {/* مبلغ بدهکار (فونت زیبای حسابداری بدون بیرون‌زدگی) */}
                                              <td className={`border border-slate-400 text-left align-middle ${
                                                printPaperSize === 'A5' ? 'py-1 px-1' : 'py-1.5 px-1'
                                              }`}>
                                                {renderFormattedAmount(entry.debit, {
                                                  paperSize: printPaperSize,
                                                  showDashOnZero: true,
                                                  colorClass: entry.debit > 0 ? 'text-slate-900' : 'text-slate-400'
                                                })}
                                              </td>

                                              {/* مبلغ بستانکار (فونت زیبای حسابداری بدون بیرون‌زدگی) */}
                                              <td className={`border border-slate-400 text-left align-middle ${
                                                printPaperSize === 'A5' ? 'py-1 px-1' : 'py-1.5 px-1'
                                              }`}>
                                                {renderFormattedAmount(entry.credit, {
                                                  paperSize: printPaperSize,
                                                  showDashOnZero: true,
                                                  colorClass: entry.credit > 0 ? 'text-slate-900' : 'text-slate-400'
                                                })}
                                              </td>

                                              {/* مانده نهایی */}
                                              <td className={`border border-slate-400 text-left align-middle ${
                                                printPaperSize === 'A5' ? 'py-1 px-1' : 'py-1.5 px-1'
                                              }`}>
                                                {isBalZero ? (
                                                  <span className={`font-bold text-slate-500 block text-left ${printPaperSize === 'A5' ? 'text-[8px]' : 'text-[9.5px]'}`}>
                                                    تسویه
                                                  </span>
                                                ) : (
                                                  renderFormattedAmount(Math.abs(entry.runningBalance), {
                                                    paperSize: printPaperSize,
                                                    colorClass: 'text-slate-900'
                                                  })
                                                )}
                                              </td>

                                              {/* تشخیص */}
                                              <td className={`border border-slate-400 text-center align-middle font-bold whitespace-nowrap ${
                                                printPaperSize === 'A5' ? 'py-1 px-0.5 text-[8px]' : 'py-1.5 px-0.5 text-[9.5px]'
                                              } ${isBalZero ? 'text-slate-400' : (isDeb ? 'text-rose-700' : 'text-emerald-700')}`}>
                                                {isBalZero ? "-" : (isDeb ? "بد" : "بس")}
                                              </td>
                                            </tr>
                                          );
                                        })}
                                      </tbody>
                                      <tfoot>
                                        <tr className="bg-slate-100 print:bg-slate-100 font-extrabold border-t-2 border-slate-700">
                                          <td colSpan={2} className={`border border-slate-600 text-center ${printPaperSize === 'A5' ? 'py-1 text-[8px]' : 'py-1.5 text-[9.5px]'}`}>
                                            جمع کل دوره
                                          </td>
                                          <td className={`border border-slate-600 text-right px-1.5 font-bold text-slate-700 truncate ${printPaperSize === 'A5' ? 'py-1 text-[8px]' : 'py-1.5 text-[9.5px]'}`}>
                                            گردش حساب و مانده نهایی طرف حساب
                                          </td>
                                          <td className={`border border-slate-600 text-left align-middle ${printPaperSize === 'A5' ? 'py-1 px-1' : 'py-1.5 px-1'}`}>
                                            {renderFormattedAmount(totalDebits, { paperSize: printPaperSize, colorClass: 'text-slate-900' })}
                                          </td>
                                          <td className={`border border-slate-600 text-left align-middle ${printPaperSize === 'A5' ? 'py-1 px-1' : 'py-1.5 px-1'}`}>
                                            {renderFormattedAmount(totalCredits, { paperSize: printPaperSize, colorClass: 'text-slate-900' })}
                                          </td>
                                          <td className={`border border-slate-600 text-left align-middle ${printPaperSize === 'A5' ? 'py-1 px-1' : 'py-1.5 px-1'}`}>
                                            {finalBalance === 0 ? (
                                              <span className={`font-bold text-slate-600 block text-left ${printPaperSize === 'A5' ? 'text-[8px]' : 'text-[9.5px]'}`}>تسویه</span>
                                            ) : (
                                              renderFormattedAmount(Math.abs(finalBalance), { paperSize: printPaperSize, colorClass: isOwed ? 'text-rose-700' : 'text-emerald-700' })
                                            )}
                                          </td>
                                          <td className={`border border-slate-600 text-center font-bold whitespace-nowrap ${printPaperSize === 'A5' ? 'py-1 px-0.5 text-[8px]' : 'py-1.5 px-1 text-[9px]'} ${finalBalance === 0 ? 'text-slate-500' : (isOwed ? 'text-rose-700' : 'text-emerald-700')}`}>
                                            {finalBalance === 0 ? "-" : (isOwed ? "بد" : "بس")}
                                          </td>
                                        </tr>
                                      </tfoot>
                                    </table>
                                  </div>

                                  {/* Signatures Footer */}
                                  <div className={`border-t border-slate-300 grid grid-cols-2 text-center text-slate-600 ${printPaperSize === 'A5' ? 'mt-4 pt-3 text-[9px]' : 'mt-6 pt-4 text-xs'}`}>
                                    <div>
                                      <span className="font-bold">امضاء و تایید صادرکننده:</span>
                                      <div className={`border-b border-dashed border-slate-300 mx-auto ${printPaperSize === 'A5' ? 'w-24 mt-6' : 'w-36 mt-8'}`} />
                                    </div>
                                    <div>
                                      <span className="font-bold">امضاء و تایید طرف حساب:</span>
                                      <div className={`border-b border-dashed border-slate-300 mx-auto ${printPaperSize === 'A5' ? 'w-24 mt-6' : 'w-36 mt-8'}`} />
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          , document.body)}

                          {/* Person Summary KPI Panel */}
                          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 print:hidden">
                            {/* Persona Info Card */}
                            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm flex flex-col justify-between">
                              <div>
                                <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-3">
                                  <div className="flex items-center gap-2">
                                    <span
                                      className={`px-2.5 py-1 rounded-lg text-xs font-bold ${getRoleBadgeClasses(selectedPerson.role)}`}
                                    >
                                      {getRoleName(selectedPerson.role)}
                                    </span>
                                  </div>
                                  <span className="text-xs text-gray-400 font-medium font-mono text-left">
                                    کد شخص: #
                                    {toPersianDigits(
                                      selectedPerson.personCode
                                        ? selectedPerson.personCode
                                        : selectedPerson.id,
                                    )}
                                  </span>
                                </div>
                                <div className="flex items-center gap-4 mb-4">
                                  {selectedPerson.imageUrl ? (
                                    <img
                                      src={selectedPerson.imageUrl}
                                      alt={getPersonDisplayName(selectedPerson)}
                                      className="w-16 h-16 rounded-full object-cover border-2 border-gray-100 shadow-sm shrink-0"
                                    />
                                  ) : (
                                    <div className="w-16 h-16 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center shrink-0 shadow-sm">
                                      <User className="w-8 h-8 text-gray-300" />
                                    </div>
                                  )}
                                  <h2 className="text-xl font-extrabold text-gray-900 leading-tight">
                                    {getPersonDisplayName(selectedPerson)}
                                  </h2>
                                </div>

                                <div className="space-y-2 text-sm text-gray-600">
                                                                    {selectedPerson.phone && (
                                    <div className="flex items-center justify-between">
                                      <span className="text-gray-400 text-xs font-semibold">
                                        تلفن تماس:
                                      </span>
                                      <span
                                        className="font-mono text-gray-800 font-semibold"
                                        dir="ltr"
                                      >
                                        {selectedPerson.phone}
                                      </span>
                                    </div>
                                  )}
                                  {selectedPerson.contacts && selectedPerson.contacts.map((contact, idx) => (
                                    <div key={idx} className="flex items-center justify-between">
                                      <span className="text-gray-400 text-xs font-semibold">
                                        {contact.type === 'mobile' ? 'موبایل' : contact.type === 'phone' ? 'تلفن ثابت' : contact.type === 'fax' ? 'فکس' : 'دیگر'}:
                                      </span>
                                      <span
                                        className="font-mono text-gray-800 font-semibold text-xs flex gap-1"
                                        dir="ltr"
                                      >
                                        {contact.title && <span className="text-[9px] text-gray-400">({contact.title})</span>}
                                        {contact.number}
                                      </span>
                                    </div>
                                  ))}
                                  {selectedPerson.nationalId && (
                                    <div className="flex items-center justify-between">
                                      <span className="text-gray-400 text-xs font-semibold">
                                        کد ملی / شناسه ملی:
                                      </span>
                                      <span
                                        className="font-mono text-gray-800"
                                        dir="ltr"
                                      >
                                        {selectedPerson.nationalId}
                                      </span>
                                    </div>
                                  )}
                                  {selectedPerson.fatherName && (
                                    <div className="flex items-center justify-between">
                                      <span className="text-gray-400 text-xs font-semibold">
                                        نام پدر:
                                      </span>
                                      <span className="text-gray-800 font-medium">
                                        {selectedPerson.fatherName}
                                      </span>
                                    </div>
                                  )}
                                  {selectedPerson.address && (
                                    <div className="pt-2 border-t border-gray-50 text-xs text-gray-500">
                                      <span className="text-gray-400 block mb-1 font-semibold">
                                        نشانی:
                                      </span>
                                      <span className="leading-relaxed block">
                                        {selectedPerson.address}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Operational Turns KPI Card */}
                            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm flex flex-col justify-between">
                              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wide border-b border-gray-100 pb-3 mb-3">
                                آمار کارکرد و گردش حساب
                              </h3>
                              <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <span className="text-sm font-semibold text-gray-600 block">
                                      جمع کل فاکتورها (فروش‌ها / مخارج پرداختی)
                                    </span>
                                    <span className="text-[10px] text-gray-450">
                                      افزایش دارایی ما / افزایش تعهد شخص
                                    </span>
                                  </div>
                                  <span className="text-base font-black text-gray-900 font-sans">
                                    {formatNumber(totalDebits)}{" "}
                                    <span className="text-xs font-normal text-gray-400">
                                      {storeSettings.currency}
                                    </span>
                                  </span>
                                </div>
                                <div className="flex items-center justify-between border-t border-gray-50 pt-3">
                                  <div>
                                    <span className="text-sm font-semibold text-gray-600 block">
                                      جمع کل دریافتی‌ها (خریدها / دریافت‌ها از شخص)
                                    </span>
                                    <span className="text-[10px] text-gray-450">
                                      کاهش تعهد شخص / افزایش تعهد ما
                                    </span>
                                  </div>
                                  <span className="text-base font-black text-gray-900 font-sans">
                                    {formatNumber(totalCredits)}{" "}
                                    <span className="text-xs font-normal text-gray-400">
                                      {storeSettings.currency}
                                    </span>
                                  </span>
                                </div>
                              </div>
                              <div className="text-xs text-gray-455 mt-2 font-medium">
                                تعداد کل اسناد مرتبط:{" "}
                                {formatNumber(allEntries.length)} سند
                              </div>
                            </div>

                            {/* Net Balanced Status Card */}
                            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm flex flex-col justify-between relative overflow-hidden">
                              {(() => {
                                const isOwedToUs = finalBalance > 0;
                                const isClear = finalBalance === 0;
                                const borderStripe = isClear
                                  ? "bg-slate-500"
                                  : isOwedToUs
                                    ? "bg-rose-500"
                                    : "bg-emerald-500";

                                return (
                                  <>
                                    <div
                                      className={`absolute right-0 top-0 bottom-0 w-1.5 ${borderStripe}`}
                                    ></div>
                                    <div>
                                      <span className="text-xs font-bold text-gray-400 block mb-2">
                                        وضعیت نهایی تراز حساب شخص
                                      </span>
                                      <div className="py-2 font-semibold">
                                        <span
                                          className={`text-[11px] font-extrabold px-2.5 py-1 rounded-md inline-block mb-2 ${
                                            isClear
                                              ? "bg-slate-50 text-slate-700"
                                              : isOwedToUs
                                                ? "bg-rose-50 text-rose-700"
                                                : "bg-emerald-50 text-emerald-700"
                                          }`}
                                        >
                                          {isClear
                                            ? "✔ کاملاً تسویه شده"
                                            : isOwedToUs
                                              ? "🔺 بدهی شخص به فروشگاه"
                                              : "🔻 طلب شخص از فروشگاه"}
                                        </span>

                                        <span
                                          className={`text-2xl font-black block tracking-tight ${
                                            isClear
                                              ? "text-slate-700"
                                              : isOwedToUs
                                                ? "text-rose-700"
                                                : "text-emerald-700"
                                          }`}
                                        >
                                          {formatNumber(Math.abs(finalBalance))}{" "}
                                          <span className="text-xs font-medium text-gray-500">
                                            {storeSettings.currency}
                                          </span>
                                        </span>
                                      </div>
                                    </div>
                                    <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded-xl border border-gray-100/50 mt-2">
                                      {isClear
                                        ? "هیچ بدهی یا طلبی بین ما و این شخص وجود ندارد."
                                        : isOwedToUs
                                          ? "این مبلغ باید از شخص دریافت شود (بدهی شخص به فروشگاه)."
                                          : "فروشگاه به این شخص تعهد مالی (بدهی) دارد یا پرداخت اضافه داشته است."}
                                    </div>
                                  </>
                                );
                              })()}
                            </div>
                          </div>

                          {/* Ledger Detail Tabs */}
                          <div className="flex border-b border-gray-200 mb-6 gap-6 print:hidden">
                            <button
                              onClick={() => setLedgerTab("transactions")}
                              className={`py-3 px-1 font-bold text-sm border-b-2 transition-all ${ledgerTab === "transactions" ? "border-indigo-600 text-indigo-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}
                            >
                              تراکنش‌ها
                            </button>
                            <button
                              onClick={() => setLedgerTab("detailed")}
                              className={`py-3 px-1 font-bold text-sm border-b-2 transition-all ${ledgerTab === "detailed" ? "border-indigo-600 text-indigo-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}
                            >
                              تراکنش‌ها با جزئیات
                            </button>
                            <button
                              onClick={() => setLedgerTab("items")}
                              className={`py-3 px-1 font-bold text-sm border-b-2 transition-all ${ledgerTab === "items" ? "border-indigo-600 text-indigo-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}
                            >
                              خرید و فروش کالا
                            </button>
                            <button
                              onClick={() => setLedgerTab("checks")}
                              className={`py-3 px-1 font-bold text-sm border-b-2 transition-all ${ledgerTab === "checks" ? "border-indigo-600 text-indigo-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}
                            >
                              چک‌ها
                            </button>
                            
                            <button
                              onClick={() => setLedgerTab("notes")}
                              className={`py-3 px-1 font-bold text-sm border-b-2 transition-all ${ledgerTab === "notes" ? "border-indigo-600 text-indigo-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}
                            >
                              یادداشت‌ها و پیوست‌ها
                            </button>
                            <button
                              onClick={() => setLedgerTab("crm")}
                              className={`py-3 px-1 font-bold text-sm border-b-2 transition-all ${ledgerTab === "crm" ? "border-indigo-600 text-indigo-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}
                            >
                              پیگیری‌ها (CRM)
                            </button>
                          </div>

                          {/* Ledger Detail Table */}
                          {ledgerTab === "notes" ? (
                            <PersonNotesAndAttachments
                              person={selectedPerson}
                              onDataChange={fetchPersons}
                              />
                          ) : (

                            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden print:overflow-visible">
                              <div className="bg-gray-50/50 px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                                <h3 className="font-extrabold text-gray-800 flex items-center gap-2">
                                  <List className="w-5 h-5 text-violet-500" />
                                  ریز و گردش جزئیات حساب معین (کارت حساب اشخاص)
                                </h3>
                              </div>

                              <div className="overflow-x-auto print:overflow-visible">
                                {(() => {
                                  const filteredLedgerEntries = ledgerEntries.filter((entry) => {
                                    if (
                                      ledgerTab === "transactions" ||
                                      ledgerTab === "detailed"
                                    ) {
                                      return true;
                                    } else if (ledgerTab === "items") {
                                      return entry.entryType === "invoice";
                                    } else if (ledgerTab === "checks") {
                                      return (
                                        entry.entryType === "issued_check" ||
                                        entry.entryType === "received_check"
                                      );
                                    }
                                    return true;
                                  });
                                  
                                  const totalDebit = filteredLedgerEntries.reduce((sum, e) => sum + (e.debit || 0), 0);
                                  const totalCredit = filteredLedgerEntries.reduce((sum, e) => sum + (e.credit || 0), 0);
                                  const totalBalance = totalDebit - totalCredit;
                                  
                                  if (filteredLedgerEntries.length === 0) {
                                    return (
                                      <div className="p-12 text-center text-gray-400">
                                        <Search className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                                        هیچ گردش مالی یا سندی برای این تب یافت نشد.
                                      </div>
                                    );
                                  }

                                  return (
                                    <div className="w-full">
                                      <div className="md:hidden flex flex-col gap-3 p-3">
                                        {filteredLedgerEntries.map((entry, index) => {
                                          const isDeb = entry.debit > 0;
                                          const isCred = entry.credit > 0;
                                          const isBalancePos = entry.runningBalance > 0;
                                          const isBalanceNeg = entry.runningBalance < 0;
                                          return (
                                            <div key={index} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col gap-2 relative">
                                              <div className="flex justify-between items-center mb-1">
                                                <span className="text-xs font-bold text-slate-400">#{toPersianDigits(index + 1)}</span>
                                                <span className="text-xs font-bold text-slate-500 bg-slate-50 px-2 py-1 rounded-lg border border-slate-100">
                                                  {getLedgerDateOnly(entry.date)}
                                                </span>
                                              </div>
                                              
                                              <div className="font-bold text-slate-800 text-sm mb-2">{entry.description}</div>
                                              
                                              <div className="grid grid-cols-2 gap-2 text-xs mb-2">
                                                <div className="flex flex-col gap-1 p-2 bg-rose-50 rounded-xl">
                                                  <span className="text-rose-600 font-bold opacity-70">بدهکار</span>
                                                  <span className="accounting-num font-black text-rose-700 text-left" dir="ltr">{entry.debit > 0 ? toPersianDigits(formatNumber(entry.debit)) : "-"}</span>
                                                </div>
                                                <div className="flex flex-col gap-1 p-2 bg-emerald-50 rounded-xl">
                                                  <span className="text-emerald-600 font-bold opacity-70">بستانکار</span>
                                                  <span className="accounting-num font-black text-emerald-700 text-left" dir="ltr">{entry.credit > 0 ? toPersianDigits(formatNumber(entry.credit)) : "-"}</span>
                                                </div>
                                              </div>
                                              
                                              <div className="flex justify-between items-center bg-slate-50 p-2 rounded-xl mt-1">
                                                <span className="text-xs font-bold text-slate-500">مانده</span>
                                                <div className="flex items-center gap-1.5">
                                                  <span className="accounting-num font-black text-slate-800 text-left" dir="ltr">
                                                    {toPersianDigits(formatNumber(Math.abs(entry.runningBalance)))}
                                                  </span>
                                                  <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-md ${isBalancePos ? "bg-rose-100 text-rose-700" : isBalanceNeg ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"}`}>
                                                    {isBalancePos ? "بدهکار" : isBalanceNeg ? "بستانکار" : "بی‌حساب"}
                                                  </span>
                                                </div>
                                              </div>
                                              

                                            </div>
                                          );
                                        })}
                                      </div>
                                      <div className="hidden md:block overflow-x-auto">
                                        <table className="w-full text-right min-w-[950px] print:min-w-[0px] print:text-[12px] text-sm border-collapse border-2 border-slate-700">
                                      <thead>
                                        <tr className="bg-slate-200 text-slate-800 font-bold text-xs uppercase tracking-wider print:text-[10px] border-b-2 border-slate-700">
                                          <th className="py-4 px-4 text-center w-10 print:w-8 print:px-2 border-2 border-slate-700">
                                            ردیف
                                          </th>
                                          <th className="py-4 px-4 text-right w-36 print:w-28 print:px-2 border-2 border-slate-700">
                                            تاریخ و ارجاع
                                          </th>
                                          <th className="py-4 px-6 text-right print:px-2 border-2 border-slate-700">
                                            عنوان و شرح جزئیات رویداد مالی
                                          </th>
                                          <th className="py-4 px-4 text-left w-36 print:w-28 print:px-2 border-2 border-slate-700 bg-rose-50/50">
                                            مبلغ (افزایش بدهی)
                                          </th>
                                          <th className="py-4 px-4 text-left w-36 print:w-28 print:px-2 border-2 border-slate-700 bg-emerald-50/50">
                                            پرداختی (کاهش بدهی)
                                          </th>
                                          <th className="py-4 px-6 text-left w-44 print:w-32 print:px-2 border-2 border-slate-700 bg-slate-100">
                                            مانده نهایی حساب
                                          </th>
                                          <th className="py-4 px-4 text-center w-16 print:w-12 print:px-2 border-2 border-slate-700 bg-slate-50">
                                            تشخیص
                                          </th>
                                        </tr>
                                      </thead>
                                      <tbody className="font-medium">
                                        {filteredLedgerEntries.map((entry, index) => {
                                          const isDeb =
                                            entry.runningBalance > 0;
                                          const isCred =
                                            entry.runningBalance < 0;
                                          const isBalZero =
                                            entry.runningBalance === 0;

                                          const isSale =
                                            entry.type.includes("فروش");
                                          const isPurchase =
                                            entry.type.includes("خرید");
                                          const isReceive =
                                            entry.type.includes("دریافت");
                                          const isPay =
                                            entry.type.includes("پرداخت");
                                          const isCheck =
                                            entry.entryType ===
                                              "issued_check" ||
                                            entry.entryType ===
                                              "received_check";

                                          const badgeColor = isSale
                                            ? "bg-sky-50 text-sky-700 border-sky-200"
                                            : isPurchase
                                              ? "bg-amber-50 text-amber-700 border-amber-200"
                                              : isReceive
                                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                                : isPay
                                                  ? "bg-rose-50 text-rose-700 border-rose-200"
                                                  : isCheck
                                                    ? "bg-violet-50 text-violet-700 border-violet-200"
                                                    : "bg-slate-50 text-slate-700 border-slate-200";

                                          return (
                                            <tr
                                              key={entry.id}
                                              className={`transition-colors group cursor-pointer ${
                                                isDeb ? "bg-rose-50/40 print:bg-rose-50/50" : isCred ? "bg-emerald-50/40 print:bg-emerald-50/50" : "bg-white print:bg-white"
                                              } hover:bg-slate-50/80`}
                                              onClick={() => {
                                                if (entry.entryType === "invoice" && entry.rawItem) {
                                                  const actualInvoice = (invoices || []).find(i => String(i?.id) === String(entry.rawItem.sourceId));
                                                  if (actualInvoice) setViewingInvoice(actualInvoice);
                                                } else if (entry.entryType === "transaction" && entry.rawItem) {
                                                  const actualTx = (transactions || []).find(t => String(t?.id) === String(entry.rawItem.sourceId));
                                                  if (actualTx) {
                                                    if (actualTx.type === "salary") {
                                                      try {
                                                        let parsedDesc = (payslips || []).find(p => String(p?.transactionId) === String(actualTx.id));
                                                        if (!parsedDesc && typeof actualTx.description === "string" && actualTx.description.includes("isPayslip")) {
                                                          parsedDesc = JSON.parse(actualTx.description);
                                                        }
                                                        if (parsedDesc && parsedDesc.isPayslip) {
                                                          setViewingPayslip({
                                                            ...actualTx,
                                                            parsed: parsedDesc,
                                                            computedPersonName: selectedPerson?.name,
                                                          });
                                                          return;
                                                        }
                                                      } catch (e) {}
                                                    }
                                                    setPrintingTransaction({
                                                      ...actualTx,
                                                      personId: selectedPerson?.id,
                                                      _isReadOnly: true,
                                                    });
                                                  }
                                                } else if (entry.entryType === "issued_check") {
                                                  const check = (issuedChecks || []).find(c => String(c?.id) === String(entry.rawItem?.sourceId));
                                                  if (check) setViewingCheck({ ...check, _type: 'issued' });
                                                } else if (entry.entryType === "received_check") {
                                                  const check = (receivedChecks || []).find(c => String(c?.id) === String(entry.rawItem?.sourceId));
                                                  if (check) setViewingCheck({ ...check, _type: 'received' });
                                                }
                                              }}
                                            >
                                              <td className="border-2 border-slate-700 py-3 px-4 text-center text-gray-400 font-sans align-top print:py-3 print:px-2">
                                                <div className="w-6 h-6 rounded-full bg-white border border-gray-200 flex items-center justify-center mx-auto text-[10px] font-bold shadow-sm group-hover:border-indigo-300 group-hover:text-indigo-600 transition-colors shrink-0">
                                                  {toPersianDigits(index + 1)}
                                                </div>
                                              </td>
                                              <td className="border-2 border-slate-700 py-3 px-4 align-top print:py-3 print:px-2">
                                                <div className="flex flex-col gap-1.5 text-right relative">
                                                  <span
                                                    className="text-gray-700 font-bold flex items-center justify-start gap-2 text-[13px] max-w-fit pr-0 print:text-xs"
                                                    dir="rtl"
                                                  >
                                                    <span className="whitespace-nowrap font-medium">
                                                      {getLedgerDateOnly(
                                                        entry.date || (entry as any).jalaliDate,
                                                      )}
                                                    </span>
                                                    <Calendar className="w-3.5 h-3.5 text-indigo-500/70" />
                                                  </span>
                                                  <span className="text-[11px] text-gray-600 bg-white border border-gray-200 px-2 py-0.5 rounded inline-flex w-max items-center gap-1 shadow-sm">
                                                    <Tag className="w-3 h-3 text-gray-400 shrink-0" />
                                                    {toPersianDigits(
                                                      entry.refId,
                                                    )}
                                                  </span>
                                                </div>
                                              </td>
                                              <td className="border-2 border-slate-700 py-3 px-6 align-top max-w-sm print:py-3 print:px-2">
                                                <div className="flex flex-wrap items-center gap-2">
                                                  <span
                                                    className={`w-max px-2.5 py-0.5 rounded text-[11px] font-extrabold border shadow-sm whitespace-nowrap ${badgeColor}`}
                                                  >
                                                    {entry.type}
                                                  </span>
                                                  <span className="text-gray-700 text-[12px] print:text-[11px] whitespace-normal font-medium break-words text-justify">
                                                    {toPersianDigits(
                                                      cleanDescription(entry.desc, entry.type),
                                                    )}
                                                  </span>
                                                  {ledgerTab === "detailed" &&
                                                    entry.entryType ===
                                                      "invoice" &&
                                                    entry.rawItem?.items &&
                                                    entry.rawItem.items.length >
                                                      0 && (
                                                      <div className="mt-1.5 w-full text-[11px] text-gray-500 bg-gray-50 p-2 rounded-lg border border-gray-100 text-right shadow-sm">
                                                        <div className="font-bold mb-1 text-gray-700">
                                                          اقلام رویداد مالی:
                                                        </div>
                                                        <ul className="list-disc list-inside space-y-1 marker:text-gray-400">
                                                          {entry.rawItem.items.map(
                                                            (
                                                              item: any,
                                                              i: number,
                                                            ) => (
                                                              <li
                                                                key={i}
                                                                className="flex justify-between items-center border-b border-gray-200/60 pb-1 last:border-0 last:pb-0"
                                                              >
                                                                <span className="font-medium text-gray-800">
                                                                  {item.name}
                                                                </span>
                                                                <span
                                                                  className="font-sans font-bold text-gray-500 text-[10px]"
                                                                  dir="ltr"
                                                                >
                                                                  {toPersianDigits(
                                                                    item.quantity,
                                                                  )}{" "}
                                                                  {item.selectedUnit || item.unit ||
                                                                    "عدد"}
                                                                </span>
                                                              </li>
                                                            ),
                                                          )}
                                                        </ul>
                                                      </div>
                                                    )}
                                                </div>
                                              </td>
                                              <td className="border-2 border-slate-700 py-3 px-4 text-left align-top print:py-3 print:px-2">
                                                {entry.debit > 0 ? (
                                                  <span
                                                    dir="ltr"
                                                    title={toPersianDigits(formatNumber(entry.debit))}
                                                    className="accounting-num inline-block w-full text-left font-black text-[14px] print:text-[12px] text-indigo-600 whitespace-nowrap overflow-hidden text-ellipsis"
                                                  >
                                                    {toPersianDigits(formatNumber(entry.debit))}
                                                  </span>
                                                ) : (
                                                  <span className="text-gray-300 font-medium">---</span>
                                                )}
                                              </td>
                                              <td className="border-2 border-slate-700 py-3 px-4 text-left align-top print:py-3 print:px-2">
                                                {entry.credit > 0 ? (
                                                  <span
                                                    dir="ltr"
                                                    title={toPersianDigits(formatNumber(entry.credit))}
                                                    className="accounting-num inline-block w-full text-left font-black text-[14px] print:text-[12px] text-emerald-600 whitespace-nowrap overflow-hidden text-ellipsis"
                                                  >
                                                    {toPersianDigits(formatNumber(entry.credit))}
                                                  </span>
                                                ) : (
                                                  <span className="text-gray-300 font-medium">---</span>
                                                )}
                                              </td>
                                              <td className="border-2 border-slate-700 py-3 px-6 text-left align-top print:py-3 print:px-2">
                                                <div
                                                  className={`flex items-center justify-end gap-1.5 font-extrabold ${
                                                    isBalZero
                                                      ? "text-slate-600"
                                                      : "text-slate-900"
                                                  }`}
                                                >
                                                  {isBalZero ? (
                                                    <span className="bg-slate-50 px-2 py-1 rounded border border-slate-200 text-xs shadow-sm text-slate-700">
                                                      صفر
                                                    </span>
                                                  ) : (
                                                    <span
                                                      dir="ltr"
                                                      title={toPersianDigits(formatNumber(Math.abs(entry.runningBalance)))}
                                                      className="accounting-num inline-block w-full text-left font-black text-[15px] print:text-[13px] whitespace-nowrap overflow-hidden text-ellipsis tracking-tight"
                                                    >
                                                      {toPersianDigits(
                                                        formatNumber(
                                                          Math.abs(
                                                            entry.runningBalance,
                                                          ),
                                                        ),
                                                      )}
                                                    </span>
                                                  )}
                                                </div>
                                              </td>
                                              <td className="border-2 border-slate-700 py-3 px-4 text-center align-top font-bold text-[13px] text-slate-800 print:py-3 print:px-2">
                                                <span className={`${!isBalZero ? (isDeb ? "text-rose-600" : "text-emerald-600") : "text-slate-400"}`}>
                                                  {!isBalZero ? (isDeb ? "بد" : "بس") : "-"}
                                                </span>
                                              </td>
                                            </tr>
                                          );
                                        })}
                                    </tbody>
                                    <tfoot className="bg-slate-200 border-2 border-slate-700 font-bold text-[13px] text-slate-800">
                                      <tr>
                                        <td colSpan={3} className="border-2 border-slate-700 py-3 px-6 text-left text-slate-700">
                                          جمع کل ({filteredLedgerEntries.length} رکورد):
                                        </td>
                                        <td className="border-2 border-slate-700 py-3 px-4 text-left text-indigo-600">
                                          <span dir="ltr" className="accounting-num font-black text-[15px] block text-left whitespace-nowrap overflow-hidden text-ellipsis">
                                            {toPersianDigits(formatNumber(totalDebit))}
                                          </span>
                                        </td>
                                        <td className="border-2 border-slate-700 py-3 px-4 text-left text-emerald-600">
                                          <span dir="ltr" className="accounting-num font-black text-[15px] block text-left whitespace-nowrap overflow-hidden text-ellipsis">
                                            {toPersianDigits(formatNumber(totalCredit))}
                                          </span>
                                        </td>
                                        <td className="border-2 border-slate-700 py-3 px-6 text-left">
                                          <div
                                            className={`flex items-center justify-end gap-1.5 font-extrabold ${
                                              totalBalance === 0
                                                ? "text-slate-600"
                                                : "text-slate-900"
                                            }`}
                                          >
                                            {totalBalance === 0 ? (
                                              <span className="bg-slate-100 px-2 py-1 rounded text-xs text-slate-700">
                                                صفر
                                              </span>
                                            ) : (
                                              <span dir="ltr" className="accounting-num font-black text-[15px] block text-left tracking-tight whitespace-nowrap overflow-hidden text-ellipsis">
                                                {toPersianDigits(formatNumber(Math.abs(totalBalance)))}
                                              </span>
                                            )}
                                          </div>
                                        </td>
                                        <td className="border-2 border-slate-700 py-3 px-4 text-center font-bold text-[13px] text-slate-800">
                                          {totalBalance !== 0 ? (
                                            <span className={`${totalBalance > 0 ? "text-rose-600" : "text-emerald-600"}`}>
                                              {totalBalance > 0 ? "بد" : "بس"}
                                            </span>
                                          ) : "-"}
                                        </td>
                                      </tr>
                                    </tfoot>
                                  </table>
                                      </div>
                                    </div>
                                  );
                                })()}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    {currentPerson && (
                      <SendPersonMessageModal
                        isOpen={isMessageModalOpen}
                        onClose={() => setIsMessageModalOpen(false)}
                        person={currentPerson}
                        showNotification={showNotification}
                        calculatePersonBalance={calculatePersonBalance}
                        storeSettings={storeSettings}
                      />
                    )}
                  </motion.div>

  );
}
