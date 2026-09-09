import React, { useState, useRef, useEffect } from 'react';
import { MoreVertical, DownloadCloud, Activity, Settings, Printer, Edit2, ShoppingCart, RefreshCw, Send, X, Package, Shield, Share2, ChevronDown, FileText, ArrowDownToLine, ArrowUpFromLine, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import html2pdf from "html2pdf.js";

export default 
function PersonLedgerActionsDropdown({
  clearDraft,
  ledgerPersonId,
  setActiveTab,
  setCustomerId,
  setReceiptPersonId,
  persons = [],
  handleEditPerson,
  setIsPersonModalOpen,
  storeSettings,
  sendNotification,
  customAlert,
  setPrintingPersonLedger,
  fetchInvoices,
  fetchTransactions,
  fetchAccountingDocuments,
  fetchPersons,
  setPrintPaperSize,
  printPaperSize = 'A4',
}: any) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: any) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handlePrint = (size: 'A4' | 'A5') => {
    setIsOpen(false);
    if (setPrintPaperSize) setPrintPaperSize(size);
    setPrintingPersonLedger(true);
    setTimeout(() => {
      window.print();
    }, 400);
  };

  const handleDownloadPdf = (size: 'A4' | 'A5') => {
    setIsOpen(false);
    if (setPrintPaperSize) setPrintPaperSize(size);
    setPrintingPersonLedger(true);
    setTimeout(() => {
      const element = document.getElementById("person-ledger-printable-content") || document.getElementById("person-ledger-printable-area");
      if (!element) {
        setPrintingPersonLedger(false);
        return;
      }
      const person = (persons || []).find((p: any) => p?.id?.toString() === ledgerPersonId?.toString());
      const opt = {
        margin: size === 'A5' ? 4 : 7,
        filename: `کارت_حساب_${person?.name || "شخص"}_${size}.pdf`,
        image: { type: "jpeg" as const, quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: "mm" as const, format: size.toLowerCase() as any, orientation: "portrait" as const },
      };
      html2pdf().set(opt).from(element).save();
    }, 400);
  };

  if (!ledgerPersonId) return null;

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="px-5 py-2.5 bg-indigo-600 text-white hover:bg-indigo-700 rounded-xl flex items-center gap-2 transition-all font-bold text-sm shadow-md shadow-indigo-200"
      >
        <Settings className="w-4 h-4" />
        <span>عملیات حساب</span>
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.15 }}
            className="absolute left-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-100 p-2 z-50 flex flex-col gap-1"
          >
            <div className="text-xs font-bold text-slate-400 px-3 pb-2 pt-1 border-b border-slate-50 mb-1">عملیات مالی</div>
            <button
              onClick={() => {
                setIsOpen(false);
                clearDraft();
                setActiveTab("create_sale");
                setCustomerId(ledgerPersonId);
              }}
              className="w-full text-right px-3 py-2 text-sm rounded-xl hover:bg-blue-50 text-slate-700 hover:text-blue-700 font-semibold flex items-center gap-2 transition-colors"
            >
              <div className="w-6 h-6 rounded-md bg-blue-100 flex items-center justify-center"><FileText className="w-3.5 h-3.5 text-blue-600" /></div> 
              ثبت فاکتور فروش
            </button>
            <button
              onClick={() => {
                setIsOpen(false);
                clearDraft();
                setActiveTab("create_purchase");
                setCustomerId(ledgerPersonId);
              }}
              className="w-full text-right px-3 py-2 text-sm rounded-xl hover:bg-violet-50 text-slate-700 hover:text-violet-700 font-semibold flex items-center gap-2 transition-colors"
            >
              <div className="w-6 h-6 rounded-md bg-violet-100 flex items-center justify-center"><ShoppingCart className="w-3.5 h-3.5 text-violet-600" /></div> 
              ثبت فاکتور خرید
            </button>
            <button
              onClick={() => {
                setIsOpen(false);
                setActiveTab?.("create_receive_receipt");
                setReceiptPersonId(ledgerPersonId);
              }}
              className="w-full text-right px-3 py-2 text-sm rounded-xl hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 font-semibold flex items-center gap-2 transition-colors"
            >
              <div className="w-6 h-6 rounded-md bg-emerald-100 flex items-center justify-center"><ArrowDownToLine className="w-3.5 h-3.5 text-emerald-600" /></div> 
              ثبت رسید دریافت
            </button>
            <button
              onClick={() => {
                setIsOpen(false);
                setActiveTab?.("create_pay_receipt");
                setReceiptPersonId(ledgerPersonId);
              }}
              className="w-full text-right px-3 py-2 text-sm rounded-xl hover:bg-rose-50 text-slate-700 hover:text-rose-700 font-semibold flex items-center gap-2 transition-colors"
            >
              <div className="w-6 h-6 rounded-md bg-rose-100 flex items-center justify-center"><ArrowUpFromLine className="w-3.5 h-3.5 text-rose-600" /></div> 
              ثبت رسید پرداخت
            </button>

            <div className="text-xs font-bold text-slate-400 px-3 pb-2 pt-2 border-b border-t border-slate-50 my-1">امکانات</div>
            <button
              onClick={() => {
                setIsOpen(false);
                const p = (persons || []).find(x => x?.id?.toString() === ledgerPersonId?.toString());
                if (p) {
                   handleEditPerson(p);
                   setIsPersonModalOpen(true);
                }
              }}
              className="w-full text-right px-3 py-2 text-sm rounded-xl hover:bg-slate-50 text-slate-700 font-semibold flex items-center gap-2 transition-colors"
            >
              <div className="w-6 h-6 rounded-md bg-slate-100 flex items-center justify-center"><Edit2 className="w-3.5 h-3.5 text-slate-600" /></div> 
              ویرایش اطلاعات شخص
            </button>
            <button
              onClick={() => {
                setIsOpen(false);
                const person = (persons || []).find((p: any) => p?.id?.toString() === ledgerPersonId?.toString());
                const phone = person?.phone || person?.mobile;
                if (person && phone) {
                  const method = storeSettings?.notify_method && storeSettings.notify_method !== "none" ? storeSettings.notify_method : undefined;
                  sendNotification(
                    `${person.name} گرامی، به استحضار می‌رساند مانده حساب شما در سیستم ${storeSettings?.storeName || "مجموعه ما"} بررسی و یادآوری می‌گردد. لطفا در صورت امکان جهت تسویه حساب اقدام فرمایید.`,
                    phone,
                    method,
                    {
                      recipientName: person.name,
                      recipientId: person.id,
                      source: "person_profile",
                    }
                  );
                } else {
                  customAlert("شماره تماس این شخص در سیستم ثبت نشده است.");
                }
              }}
              className="w-full text-right px-3 py-2 text-sm rounded-xl hover:bg-amber-50 text-slate-700 hover:text-amber-700 font-semibold flex items-center gap-2 transition-colors"
            >
              <div className="w-6 h-6 rounded-md bg-amber-100 flex items-center justify-center"><span className="text-xs leading-none">💬</span></div> 
              ارسال پیامک مانده حساب
            </button>
            
            <div className="text-xs font-bold text-slate-400 px-3 pb-2 pt-2 border-b border-t border-slate-50 my-1">گزارش‌گیری و چاپ</div>
            <button
              onClick={() => handlePrint('A4')}
              className="w-full text-right px-3 py-2 text-xs rounded-xl hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 font-bold flex items-center justify-between transition-colors"
            >
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-indigo-100 flex items-center justify-center"><Printer className="w-3.5 h-3.5 text-indigo-600" /></div> 
                <span>چاپ کارت حساب (A4)</span>
              </div>
              <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono">استاندارد</span>
            </button>
            <button
              onClick={() => handlePrint('A5')}
              className="w-full text-right px-3 py-2 text-xs rounded-xl hover:bg-violet-50 text-slate-700 hover:text-violet-700 font-bold flex items-center justify-between transition-colors"
            >
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-violet-100 flex items-center justify-center"><Printer className="w-3.5 h-3.5 text-violet-600" /></div> 
                <span>چاپ کارت حساب (A5)</span>
              </div>
              <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono">فشرده</span>
            </button>
            <button
              onClick={() => handleDownloadPdf('A4')}
              className="w-full text-right px-3 py-2 text-xs rounded-xl hover:bg-sky-50 text-slate-700 hover:text-sky-700 font-bold flex items-center justify-between transition-colors"
            >
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-sky-100 flex items-center justify-center"><Download className="w-3.5 h-3.5 text-sky-600" /></div> 
                <span>دانلود PDF (A4)</span>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">PDF</span>
            </button>
            <button
              onClick={() => handleDownloadPdf('A5')}
              className="w-full text-right px-3 py-2 text-xs rounded-xl hover:bg-sky-50 text-slate-700 hover:text-sky-700 font-bold flex items-center justify-between transition-colors"
            >
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-sky-100 flex items-center justify-center"><Download className="w-3.5 h-3.5 text-sky-600" /></div> 
                <span>دانلود PDF (A5)</span>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">PDF</span>
            </button>
            <button
              onClick={async () => {
                setIsOpen(false);
                await Promise.all([
                  fetchInvoices(), fetchTransactions(), fetchAccountingDocuments(), fetchPersons(),
                ]);
              }}
              className="w-full text-right px-3 py-2 text-sm rounded-xl hover:bg-gray-50 text-slate-700 font-semibold flex items-center gap-2 transition-colors"
            >
              <div className="w-6 h-6 rounded-md bg-gray-100 flex items-center justify-center"><RefreshCw className="w-3.5 h-3.5 text-gray-600" /></div> 
              بروزرسانی اطلاعات
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

