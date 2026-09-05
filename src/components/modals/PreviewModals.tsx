import React, { useState } from "react";
import { X, Printer, CheckCircle, Eye, Wallet, Settings, AlertTriangle, Ban, FileText, AlertCircle } from "lucide-react";
import InvoicePrintTemplate from "../print/InvoicePrintTemplate";
import WarehousePrintTemplate from "../print/WarehousePrintTemplate";
import ReceiptPrintTemplate from "../print/ReceiptPrintTemplate";

export default function PreviewModals(props: any) {
  const {
    viewingInvoice, setViewingInvoice,
    previewInvoiceData, setPreviewInvoiceData,
    submitting, saveInvoiceData,
    viewingCheck, setViewingCheck, getPersonDisplayName, persons, formatCurrency, toPersianDigits,
    previewReceiptData, setPreviewReceiptData, confirmReceiptSubmit,
    storeSettings, products, warehouses,
    transactions, invoices, personOpeningBalances, issuedChecks, receivedChecks, printingTransaction, setPrintingTransaction
  } = props;

  const currentInvoice = viewingInvoice || previewInvoiceData;
  const isVoided = currentInvoice?.status === "voided" || currentInvoice?.isVoided === true;
  const isDraft = currentInvoice?.status === "draft" || currentInvoice?.isDraft === true;

  const [printSettings, setPrintSettings] = useState({
    showStoreLogo: true,
    showSignatures: true,
    showTransactions: true,
    showBalance: true,
    showNotes: true,
    showFooter: true,
    designType: 'classic', // classic or modern
    paperSize: 'a4' // a4 or a5
  });

  return (
    <>
      {/* Invoice Preview / Viewing */}
      {(viewingInvoice || previewInvoiceData) && (
        <div className="fixed inset-0 z-[99999] flex flex-col bg-slate-900/50 backdrop-blur-sm print:bg-transparent print:backdrop-blur-none print-section" dir="rtl">
          <div className="flex-1 w-full max-w-5xl mx-auto my-0 sm:my-4 bg-slate-100 sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden print:w-full print:max-w-none print:m-0 print:rounded-none print:shadow-none print:bg-white relative">
            <div className="bg-white border-b border-slate-200 p-4 flex items-center justify-between print:hidden shrink-0 z-10">
              <div className="flex items-center gap-3">
                <h3 className="text-lg font-black text-slate-800">
                  {viewingInvoice ? "پیش‌نمایش سند" : "تایید نهایی و پیش‌نمایش سند"}
                </h3>
                {isVoided && (
                  <span className="px-3 py-1 bg-red-100 text-red-700 border border-red-200 rounded-full text-xs font-black flex items-center gap-1.5 shadow-xs">
                    <Ban className="w-3.5 h-3.5 text-red-600" />
                    ابطال شده (فاقد اعتبار مالی)
                  </span>
                )}
                {isDraft && !isVoided && (
                  <span className="px-3 py-1 bg-amber-100 text-amber-800 border border-amber-300 rounded-full text-xs font-black flex items-center gap-1.5 shadow-xs">
                    <FileText className="w-3.5 h-3.5 text-amber-600" />
                    پیش‌نویس (غیر رسمی)
                  </span>
                )}
                <div className="hidden sm:flex items-center gap-3 bg-slate-50 p-2 rounded-lg border border-slate-200">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600">
                    <Settings className="w-3.5 h-3.5" />
                    <span>تنظیمات چاپ:</span>
                  </div>
                  <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                    <input type="checkbox" checked={printSettings.showStoreLogo} onChange={(e) => setPrintSettings(s => ({...s, showStoreLogo: e.target.checked}))} className="rounded text-indigo-600" />
                    <span>لوگو</span>
                  </label>
                  <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                    <input type="checkbox" checked={printSettings.showSignatures} onChange={(e) => setPrintSettings(s => ({...s, showSignatures: e.target.checked}))} className="rounded text-indigo-600" />
                    <span>امضاها</span>
                  </label>
                  <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                    <input type="checkbox" checked={printSettings.showTransactions} onChange={(e) => setPrintSettings(s => ({...s, showTransactions: e.target.checked}))} className="rounded text-indigo-600" />
                    <span>تراکنش‌ها</span>
                  </label>
                  <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                    <input type="checkbox" checked={printSettings.showBalance} onChange={(e) => setPrintSettings(s => ({...s, showBalance: e.target.checked}))} className="rounded text-indigo-600" />
                    <span>مانده</span>
                  </label>
                  <select 
                    value={printSettings.paperSize}
                    onChange={(e) => setPrintSettings(s => ({...s, paperSize: e.target.value}))}
                    className="text-xs bg-white border border-slate-200 rounded px-2 py-1 outline-none"
                  >
                    <option value="a4">سایز A4</option>
                    <option value="a5">سایز A5</option>
                  </select>
                  <select 
                    value={printSettings.designType}
                    onChange={(e) => setPrintSettings(s => ({...s, designType: e.target.value}))}
                    className="text-xs bg-white border border-slate-200 rounded px-2 py-1 outline-none"
                  >
                    <option value="classic">کلاسیک</option>
                    <option value="modern">مدرن</option>
                  </select>
                </div>
              </div>
              <button
                onClick={() => {
                  setViewingInvoice(null);
                  setPreviewInvoiceData(null);
                }}
                className="p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-700 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Informational Alert Banner for Voided or Draft */}
            {isVoided && (
              <div className="bg-red-50 border-b border-red-200 text-red-800 px-4 py-2.5 text-xs font-bold flex items-center justify-between shrink-0 print:hidden">
                <div className="flex items-center gap-2">
                  <Ban className="w-4 h-4 text-red-600 shrink-0" />
                  <span>هشدار: این سند / فاکتور ابطال گردیده و در کلیه دفاتر حسابداری و انبارداری باطل شده است.</span>
                </div>
                <span className="bg-red-600 text-white text-[10px] px-2 py-0.5 rounded font-black">ابطال شده</span>
              </div>
            )}
            {isDraft && !isVoided && (
              <div className="bg-amber-50 border-b border-amber-200 text-amber-900 px-4 py-2.5 text-xs font-bold flex items-center justify-between shrink-0 print:hidden">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>توجه: این سند در وضعیت «پیش‌نویس» قرار دارد و تا پیش از تایید نهایی فاقد اثر مالی، سند حسابداری و قانونی می‌باشد.</span>
                </div>
                <span className="bg-amber-600 text-white text-[10px] px-2 py-0.5 rounded font-black">پیش‌نویس</span>
              </div>
            )}
            
            {/* Mobile Print Settings */}
            <div className="sm:hidden bg-slate-50 border-b border-slate-200 p-3 shrink-0 print:hidden overflow-x-auto flex items-center gap-4 whitespace-nowrap">
              <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                <input type="checkbox" checked={printSettings.showStoreLogo} onChange={(e) => setPrintSettings(s => ({...s, showStoreLogo: e.target.checked}))} className="rounded text-indigo-600" />
                <span>لوگو</span>
              </label>
              <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                <input type="checkbox" checked={printSettings.showSignatures} onChange={(e) => setPrintSettings(s => ({...s, showSignatures: e.target.checked}))} className="rounded text-indigo-600" />
                <span>امضاها</span>
              </label>
              <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                <input type="checkbox" checked={printSettings.showTransactions} onChange={(e) => setPrintSettings(s => ({...s, showTransactions: e.target.checked}))} className="rounded text-indigo-600" />
                <span>تراکنش‌ها</span>
              </label>
              <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                <input type="checkbox" checked={printSettings.showBalance} onChange={(e) => setPrintSettings(s => ({...s, showBalance: e.target.checked}))} className="rounded text-indigo-600" />
                <span>مانده</span>
              </label>
              <select 
                value={printSettings.paperSize}
                onChange={(e) => setPrintSettings(s => ({...s, paperSize: e.target.value}))}
                className="text-xs bg-white border border-slate-200 rounded px-2 py-1 outline-none"
              >
                <option value="a4">سایز A4</option>
                <option value="a5">سایز A5</option>
              </select>
              <select 
                value={printSettings.designType}
                onChange={(e) => setPrintSettings(s => ({...s, designType: e.target.value}))}
                className="text-xs bg-white border border-slate-200 rounded px-2 py-1 outline-none"
              >
                <option value="classic">کلاسیک</option>
                <option value="modern">مدرن</option>
              </select>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-100 print:p-0 print:overflow-visible">
              <div className={`bg-white rounded-xl shadow-sm border border-slate-200 print:border-none print:shadow-none mx-auto print:w-full print:max-w-none relative overflow-hidden ${printSettings.paperSize === 'a5' ? 'max-w-[148mm] min-h-[210mm] print:min-h-0' : 'max-w-[210mm] min-h-[297mm] print:min-h-0'}`}>
                {/* Visual Watermarks for Draft and Voided */}
                {isVoided && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-30 overflow-hidden print:flex">
                    <div className="transform -rotate-45 border-8 border-red-600/35 text-red-600/35 font-black text-6xl sm:text-7xl md:text-8xl px-12 py-6 rounded-3xl tracking-widest text-center shadow-xs">
                      ابطال شد
                    </div>
                  </div>
                )}
                {isDraft && !isVoided && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-30 overflow-hidden print:flex">
                    <div className="transform -rotate-45 border-8 border-dashed border-amber-600/35 text-amber-600/35 font-black text-6xl sm:text-7xl md:text-8xl px-12 py-6 rounded-3xl tracking-widest text-center shadow-xs">
                      پیش‌نویس
                    </div>
                  </div>
                )}
                {(viewingInvoice?.type?.includes("warehouse") || previewInvoiceData?.type?.includes("warehouse")) ? (
                  <WarehousePrintTemplate
                    data={viewingInvoice || previewInvoiceData}
                    storeSettings={storeSettings}
                    persons={persons}
                    products={products}
                    warehouses={warehouses}
                  />
                ) : (
                  <InvoicePrintTemplate
                    data={viewingInvoice || previewInvoiceData}
                    storeSettings={storeSettings}
                    persons={persons}
                    transactions={transactions}
                    invoices={invoices}
                    personOpeningBalances={personOpeningBalances}
                    issuedChecks={issuedChecks}
                    receivedChecks={receivedChecks}
                    printSettings={printSettings}
                  />
                )}
              </div>
            </div>
            
            {previewInvoiceData && (
              <div className="p-4 bg-white border-t border-slate-200 flex justify-end gap-3 print:hidden shrink-0">
                <button
                  onClick={() => setPreviewInvoiceData(null)}
                  className="px-4 py-2 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl font-bold transition-colors"
                >
                  انصراف و ویرایش
                </button>
                <button onClick={() => window.print()} className="px-6 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-xl font-bold transition-colors flex items-center gap-2 shadow-sm">
                   <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
                   چاپ پیش‌نمایش
                 </button>
                 <button
                  onClick={() => {
                    const finalData = { ...previewInvoiceData, isDraft: false, status: 'final' };
                    saveInvoiceData(finalData, false);
                    setPreviewInvoiceData(null);
                  }}
                  disabled={submitting}
                  className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-colors flex items-center gap-2 shadow-sm"
                >
                  <CheckCircle className="w-5 h-5" />
                  تایید و ثبت نهایی
                </button>
              </div>
            )}
            {viewingInvoice && (
               <div className="p-4 bg-white border-t border-slate-200 flex justify-end gap-3 print:hidden shrink-0">
                 <button onClick={() => window.print()} className="px-6 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-xl font-bold transition-colors flex items-center gap-2 shadow-sm">
                   <Printer className="w-5 h-5" />
                   چاپ
                 </button>
               </div>
            )}
          </div>
        </div>
      )}

      {/* Check Preview */}


      {/* Receipt Preview */}
      {previewReceiptData && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm print:hidden" dir="rtl">
          <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl relative">
            <button onClick={() => setPreviewReceiptData(null)} className="absolute top-4 left-4 p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors z-10">
              <X className="w-5 h-5" />
            </button>
            <div className="p-6">
              <h3 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2">
                <Wallet className="w-6 h-6 text-emerald-500" />
                تایید رسید {previewReceiptData.type === 'receive' ? 'دریافت' : 'پرداخت'}
              </h3>
              <div className="space-y-4">
                <div className="flex justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-slate-500 text-sm font-bold">شخص</span>
                  <span className="font-black text-slate-800">{getPersonDisplayName(previewReceiptData.personId, persons)}</span>
                </div>
                <div className="flex justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-slate-500 text-sm font-bold">مبلغ تراکنش</span>
                  <span className="font-black text-emerald-600">{toPersianDigits(formatCurrency(previewReceiptData.amount))} ریال</span>
                </div>
                <div className="flex justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-slate-500 text-sm font-bold">تاریخ</span>
                  <span className="font-black text-slate-800">{previewReceiptData.date}</span>
                </div>
              </div>
              <div className="mt-8 flex gap-3">
                <button
                  onClick={() => setPreviewReceiptData(null)}
                  className="flex-1 px-4 py-2 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl font-bold transition-colors"
                >
                  انصراف
                </button>
                <button
                  onClick={() => {
                    confirmReceiptSubmit(previewReceiptData);
                    setPreviewReceiptData(null);
                  }}
                  disabled={submitting}
                  className="flex-1 px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition-colors flex items-center justify-center gap-2 shadow-sm"
                >
                  <CheckCircle className="w-5 h-5" />
                  تایید نهایی
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Receipt Printing Modal */}
      {printingTransaction && (
        <div className="fixed inset-0 z-[99999] flex flex-col bg-slate-900/50 backdrop-blur-sm print:bg-transparent print:backdrop-blur-none print-section" dir="rtl">
          <div className="flex-1 w-full max-w-3xl mx-auto my-0 sm:my-4 bg-slate-100 sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden print:w-full print:max-w-none print:m-0 print:rounded-none print:shadow-none print:bg-white relative">
            <div className="bg-white border-b border-slate-200 p-4 flex items-center justify-between print:hidden shrink-0 z-10">
              <h3 className="text-lg font-black text-slate-800">پیش‌نمایش چاپ رسید</h3>
              <div className="flex gap-2">
                <button onClick={() => window.print()} className="p-2 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition-colors font-bold flex gap-2 px-4 items-center">
                  <Printer className="w-5 h-5" />
                  چاپ
                </button>
                <button onClick={() => setPrintingTransaction(null)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-xl transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto p-4 sm:p-8 print:p-0 relative">
               <div className="bg-white rounded-xl shadow-sm border border-slate-200 print:border-none print:shadow-none mx-auto max-w-[210mm] min-h-[148mm] print:w-full print:max-w-none print:min-h-0">
                  <ReceiptPrintTemplate
                    data={printingTransaction}
                    storeSettings={storeSettings}
                    persons={persons}
                    formatCurrency={formatCurrency}
                    getPersonDisplayName={getPersonDisplayName}
                  />
               </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
