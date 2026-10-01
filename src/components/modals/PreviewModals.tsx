import React, { useState, useEffect } from "react";
import { X, Printer, CheckCircle, Eye, Wallet, Settings, AlertTriangle, Ban, FileText, AlertCircle, Columns, SlidersHorizontal, ChevronDown, Check } from "lucide-react";
import InvoicePrintTemplate from "../print/InvoicePrintTemplate";
import WarehousePrintTemplate from "../print/WarehousePrintTemplate";
import ReceiptPrintTemplate from "../print/ReceiptPrintTemplate";
import ReceiptPrintModal from "../print/ReceiptPrintModal";
import ReceiptConfirmationModal from "../financial/ReceiptConfirmationModal";
import { InvoicePrintSettings, InvoiceColumnSettings } from "../print/invoice-templates/InvoicePrintTypes";
import { safePrint, printViaIframe } from "../../utils/printHelper";

const INVOICE_PRINT_SETTINGS_STORAGE_KEY = "company_user_invoice_print_settings";

const getDefaultPrintSettings = (storeSettings: any): InvoicePrintSettings => ({
  showStoreLogo: true,
  showSignatures: true,
  showTransactions: true,
  showBalance: true,
  showNotes: true,
  showFooter: true,
  showQrCode: true,
  boldBorders: false,
  designType: (storeSettings?.invoicePrintFormat as any) || 'modern',
  paperSize: 'a4',
  paginationMode: 'auto',
  itemsPerPage: 12,
  fontSize: 'normal',
  columns: {
    rowIndex: true,
    productCode: false,
    productName: true,
    quantity: true,
    unit: true,
    unitPrice: true,
    grossAmount: true,
    discountPercent: true,
    discountAmount: true,
    tax: true,
    totalPrice: true,
  }
});

const getInitialPrintSettings = (storeSettings: any): InvoicePrintSettings => {
  const defaults = getDefaultPrintSettings(storeSettings);
  try {
    const saved = localStorage.getItem(INVOICE_PRINT_SETTINGS_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        ...defaults,
        ...parsed,
        columns: {
          ...defaults.columns,
          ...(parsed.columns || {})
        }
      };
    }
  } catch (e) {
    console.warn("Could not load stored invoice print settings:", e);
  }
  return defaults;
};

export default function PreviewModals(props: any) {
  const {
    viewingInvoice, setViewingInvoice,
    previewInvoiceData, setPreviewInvoiceData,
    submitting, saveInvoiceData,
    viewingCheck, setViewingCheck, getPersonDisplayName, persons, formatCurrency, toPersianDigits,
    previewReceiptData, setPreviewReceiptData, confirmReceiptSubmit,
    storeSettings, products, warehouses,
    transactions, invoices, personOpeningBalances, issuedChecks, receivedChecks, printingTransaction, setPrintingTransaction,
    accounts, cashboxes, checkbooks, submittingReceipt, setEditingReceipt, setIsEditReceiptModalOpen,
  } = props;

  const currentInvoice = viewingInvoice || previewInvoiceData;
  const isVoided = currentInvoice?.status === "voided" || currentInvoice?.isVoided === true;
  const isDraft = currentInvoice?.status === "draft" || currentInvoice?.isDraft === true;

  const [showColumnDropdown, setShowColumnDropdown] = useState(false);
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
  const [justSavedNotification, setJustSavedNotification] = useState(false);

  const [printSettings, setPrintSettings] = useState<InvoicePrintSettings>(() =>
    getInitialPrintSettings(storeSettings)
  );

  // Auto-save any setting change to localStorage so the user never has to re-configure
  useEffect(() => {
    try {
      localStorage.setItem(INVOICE_PRINT_SETTINGS_STORAGE_KEY, JSON.stringify(printSettings));
      setJustSavedNotification(true);
      const timer = setTimeout(() => setJustSavedNotification(false), 2000);
      return () => clearTimeout(timer);
    } catch (e) {}
  }, [printSettings]);

  const handleCloseModal = () => {
    if (setViewingInvoice) setViewingInvoice(null);
    if (setPreviewInvoiceData) setPreviewInvoiceData(null);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (viewingInvoice || previewInvoiceData) {
          handleCloseModal();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [viewingInvoice, previewInvoiceData]);

  const handleResetPrintSettings = () => {
    const defaults = getDefaultPrintSettings(storeSettings);
    setPrintSettings(defaults);
    try {
      localStorage.setItem(INVOICE_PRINT_SETTINGS_STORAGE_KEY, JSON.stringify(defaults));
    } catch (e) {}
  };

  const handleDesignTypeChange = (newType: string) => {
    setPrintSettings(prev => ({
      ...prev,
      designType: newType,
      paperSize: newType === 'thermal' ? 'pos80' : (prev.paperSize === 'pos80' ? 'a4' : prev.paperSize)
    }));
  };

  const handlePrintInvoice = () => {
    const invNum = currentInvoice?.invoiceNumber || currentInvoice?.id || "";
    const isWh = Boolean(viewingInvoice?.type?.includes("warehouse") || previewInvoiceData?.type?.includes("warehouse"));
    const docTitle = isWh
      ? `سند انبار شماره ${toPersianDigits(invNum)}`
      : `فاکتور شماره ${toPersianDigits(invNum)}`;

    safePrint("#invoice-sheet-to-print", {
      paperSize: printSettings.paperSize,
      documentTitle: docTitle,
      timeoutMs: 3500
    });
  };

  const toggleColumn = (key: keyof InvoiceColumnSettings) => {
    setPrintSettings(prev => ({
      ...prev,
      columns: {
        ...prev.columns,
        [key]: !prev.columns?.[key]
      }
    }));
  };

  const setColumnPreset = (preset: 'all' | 'compact' | 'standard' | 'official') => {
    if (preset === 'all' || preset === 'official') {
      setPrintSettings(prev => ({
        ...prev,
        columns: {
          rowIndex: true,
          productCode: true,
          productName: true,
          quantity: true,
          unit: true,
          unitPrice: true,
          grossAmount: true,
          discountPercent: true,
          discountAmount: true,
          tax: true,
          totalPrice: true,
        }
      }));
    } else if (preset === 'compact') {
      setPrintSettings(prev => ({
        ...prev,
        columns: {
          rowIndex: true,
          productCode: false,
          productName: true,
          quantity: true,
          unit: false,
          unitPrice: true,
          grossAmount: false,
          discountPercent: false,
          discountAmount: false,
          tax: false,
          totalPrice: true,
        }
      }));
    } else {
      setPrintSettings(prev => ({
        ...prev,
        columns: {
          rowIndex: true,
          productCode: false,
          productName: true,
          quantity: true,
          unit: true,
          unitPrice: true,
          grossAmount: true,
          discountPercent: true,
          discountAmount: true,
          tax: true,
          totalPrice: true,
        }
      }));
    }
  };

  const activeColumnCount = Object.values(printSettings.columns || {}).filter(Boolean).length;

  return (
    <>
      {/* Invoice Preview / Viewing */}
      {(viewingInvoice || previewInvoiceData) && (
        <div
          data-print-modal="true"
          id="invoice-preview-modal-root"
          className="fixed inset-0 z-[99999] flex flex-col bg-slate-900/60 backdrop-blur-sm print:bg-transparent print:backdrop-blur-none print-section print-modal-active overflow-y-auto"
          dir="rtl"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              handleCloseModal();
            }
          }}
        >
          {/* Floating High-Visibility Close Button at top corner */}
          <button
            type="button"
            onClick={handleCloseModal}
            className="fixed top-3 left-3 z-[100000] px-3.5 py-2 bg-slate-900/90 hover:bg-rose-600 text-white rounded-xl backdrop-blur-md shadow-2xl transition-all cursor-pointer print:hidden flex items-center gap-1.5 text-xs font-black border border-white/20 active:scale-95"
            title="بستن پنجره پیش‌نمایش (Esc)"
          >
            <X className="w-4 h-4" />
            <span>بستن (Esc)</span>
          </button>
          <style>{`
            @media print {
              @page {
                size: ${printSettings.paperSize === 'a5' ? 'A5 portrait' : 'A4 portrait'};
                margin: 5mm;
              }
              html, body {
                background: white !important;
                background-color: white !important;
                padding: 0 !important;
                margin: 0 !important;
              }
              .main-app-layout-wrapper {
                display: none !important;
                height: 0 !important;
                overflow: hidden !important;
                position: absolute !important;
                left: -99999px !important;
                visibility: hidden !important;
              }
              #invoice-sheet-to-print {
                box-shadow: none !important;
                border: none !important;
                margin: 0 auto !important;
                width: 100% !important;
                max-width: ${printSettings.paperSize === 'a5' ? '138mm' : '196mm'} !important;
              }
            }
          `}</style>
          <div className="flex-1 w-full max-w-5xl mx-auto my-0 sm:my-4 bg-slate-100 sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden print:w-full print:max-w-none print:m-0 print:rounded-none print:shadow-none print:bg-white relative">
            <div className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between gap-3 print:hidden shrink-0 z-20">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base sm:text-lg font-black text-slate-800 truncate">
                      {viewingInvoice ? "پیش‌نمایش سند" : "تایید نهایی و پیش‌نمایش سند"}
                    </h3>
                    {currentInvoice?.invoiceNumber && (
                      <span className="font-sans font-black text-xs px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md border border-slate-200 shrink-0">
                        #{toPersianDigits(currentInvoice.invoiceNumber)}
                      </span>
                    )}
                  </div>
                </div>
                {isVoided && (
                  <span className="hidden sm:flex px-2.5 py-0.5 bg-red-100 text-red-700 border border-red-200 rounded-lg text-xs font-black items-center gap-1 shrink-0">
                    <Ban className="w-3.5 h-3.5 text-red-600" />
                    ابطال شده
                  </span>
                )}
                {isDraft && !isVoided && (
                  <span className="hidden sm:flex px-2.5 py-0.5 bg-amber-100 text-amber-800 border border-amber-300 rounded-lg text-xs font-black items-center gap-1 shrink-0">
                    <FileText className="w-3.5 h-3.5 text-amber-600" />
                    پیش‌نویس
                  </span>
                )}
              </div>

              {/* Action Buttons: Print + Prominent Close Button */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handlePrintInvoice}
                  className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs transition-all shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95"
                  title="چاپ مستقیم فاکتور"
                >
                  <Printer className="w-4 h-4" />
                  <span className="hidden sm:inline">چاپ فاکتور</span>
                </button>

                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 bg-rose-50 hover:bg-rose-600 hover:text-white text-rose-700 hover:border-rose-600 border border-rose-200 rounded-xl font-black text-xs sm:text-sm flex items-center gap-1.5 transition-all shadow-xs cursor-pointer shrink-0 active:scale-95"
                  title="بستن پنجره پیش‌نمایش (Esc)"
                >
                  <X className="w-4 h-4" />
                  <span>بستن</span>
                </button>
              </div>
            </div>

            {/* Dedicated Print Settings Bar (Universal for all screens) */}
            <div className="bg-slate-50 border-b border-slate-200 px-4 py-2 flex items-center gap-2.5 overflow-x-auto print:hidden shrink-0 whitespace-nowrap text-xs">
              <div className="flex items-center gap-1 text-xs font-bold text-slate-600 px-1 shrink-0">
                <Settings className="w-3.5 h-3.5 text-indigo-600" />
                <span>تنظیمات چاپ:</span>
              </div>

                  {/* Auto-save notification badge */}
                  {justSavedNotification && (
                    <span className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md font-bold flex items-center gap-1 animate-pulse">
                      <Check className="w-3 h-3 text-emerald-600" />
                      ذخیره شد
                    </span>
                  )}

                  {/* Columns Selector Dropdown */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => {
                        setShowColumnDropdown(!showColumnDropdown);
                        setShowAdvancedSettings(false);
                      }}
                      className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:border-indigo-300 hover:text-indigo-600 rounded-lg transition-colors shadow-xs"
                    >
                      <Columns className="w-3.5 h-3.5 text-indigo-500" />
                      <span>ستون‌ها ({toPersianDigits(activeColumnCount)})</span>
                      <ChevronDown className={`w-3 h-3 transition-transform ${showColumnDropdown ? 'rotate-180' : ''}`} />
                    </button>

                    {showColumnDropdown && (
                      <div className="absolute top-full right-0 mt-1.5 w-64 bg-white rounded-xl shadow-xl border border-slate-200 p-3 z-50 text-right">
                        <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
                          <span className="text-xs font-black text-slate-800">انتخاب ستون‌های جدول چاپ</span>
                          <button
                            type="button"
                            onClick={() => setShowColumnDropdown(false)}
                            className="text-slate-400 hover:text-slate-600 p-0.5"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Quick Presets */}
                        <div className="grid grid-cols-2 gap-1 mb-2.5 pb-2 border-b border-slate-100">
                          <button
                            type="button"
                            onClick={() => setColumnPreset('standard')}
                            className="py-1 text-[10.5px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded transition-colors"
                          >
                            استاندارد
                          </button>
                          <button
                            type="button"
                            onClick={() => setColumnPreset('compact')}
                            className="py-1 text-[10.5px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded transition-colors"
                          >
                            فشرده
                          </button>
                          <button
                            type="button"
                            onClick={() => setColumnPreset('official')}
                            className="py-1 text-[10.5px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded transition-colors"
                          >
                            رسمی و مالیاتی
                          </button>
                          <button
                            type="button"
                            onClick={() => setColumnPreset('all')}
                            className="py-1 text-[10.5px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded transition-colors"
                          >
                            همه ستون‌ها
                          </button>
                        </div>

                        <div className="space-y-1.5 max-h-56 overflow-y-auto pl-1">
                          <label className="flex items-center justify-between text-xs py-1 px-1.5 rounded hover:bg-slate-50 cursor-pointer">
                            <span className="text-slate-700 font-medium">شماره ردیف (#)</span>
                            <input
                              type="checkbox"
                              checked={!!printSettings.columns?.rowIndex}
                              onChange={() => toggleColumn('rowIndex')}
                              className="rounded text-indigo-600 focus:ring-0"
                            />
                          </label>

                          <label className="flex items-center justify-between text-xs py-1 px-1.5 rounded hover:bg-slate-50 cursor-pointer">
                            <span className="text-slate-700 font-medium">کد کالا</span>
                            <input
                              type="checkbox"
                              checked={!!printSettings.columns?.productCode}
                              onChange={() => toggleColumn('productCode')}
                              className="rounded text-indigo-600 focus:ring-0"
                            />
                          </label>

                          <label className="flex items-center justify-between text-xs py-1 px-1.5 rounded hover:bg-slate-50 cursor-pointer">
                            <span className="text-slate-700 font-medium">تعداد / مقدار</span>
                            <input
                              type="checkbox"
                              checked={!!printSettings.columns?.quantity}
                              onChange={() => toggleColumn('quantity')}
                              className="rounded text-indigo-600 focus:ring-0"
                            />
                          </label>

                          <label className="flex items-center justify-between text-xs py-1 px-1.5 rounded hover:bg-slate-50 cursor-pointer">
                            <span className="text-slate-700 font-medium">واحد سنجش</span>
                            <input
                              type="checkbox"
                              checked={!!printSettings.columns?.unit}
                              onChange={() => toggleColumn('unit')}
                              className="rounded text-indigo-600 focus:ring-0"
                            />
                          </label>

                          <label className="flex items-center justify-between text-xs py-1 px-1.5 rounded hover:bg-slate-50 cursor-pointer">
                            <span className="text-slate-700 font-medium">قیمت فی واحد</span>
                            <input
                              type="checkbox"
                              checked={!!printSettings.columns?.unitPrice}
                              onChange={() => toggleColumn('unitPrice')}
                              className="rounded text-indigo-600 focus:ring-0"
                            />
                          </label>

                          <label className="flex items-center justify-between text-xs py-1 px-1.5 rounded hover:bg-slate-50 cursor-pointer">
                            <span className="text-slate-700 font-medium">مبلغ ناخالص</span>
                            <input
                              type="checkbox"
                              checked={!!printSettings.columns?.grossAmount}
                              onChange={() => toggleColumn('grossAmount')}
                              className="rounded text-indigo-600 focus:ring-0"
                            />
                          </label>

                          <label className="flex items-center justify-between text-xs py-1 px-1.5 rounded hover:bg-slate-50 cursor-pointer">
                            <span className="text-slate-700 font-medium">درصد تخفیف (%)</span>
                            <input
                              type="checkbox"
                              checked={!!printSettings.columns?.discountPercent}
                              onChange={() => toggleColumn('discountPercent')}
                              className="rounded text-indigo-600 focus:ring-0"
                            />
                          </label>

                          <label className="flex items-center justify-between text-xs py-1 px-1.5 rounded hover:bg-slate-50 cursor-pointer">
                            <span className="text-slate-700 font-medium">مبلغ تخفیف</span>
                            <input
                              type="checkbox"
                              checked={!!printSettings.columns?.discountAmount}
                              onChange={() => toggleColumn('discountAmount')}
                              className="rounded text-indigo-600 focus:ring-0"
                            />
                          </label>

                          <label className="flex items-center justify-between text-xs py-1 px-1.5 rounded hover:bg-slate-50 cursor-pointer">
                            <span className="text-slate-700 font-medium">مالیات و ارزش افزوده</span>
                            <input
                              type="checkbox"
                              checked={!!printSettings.columns?.tax}
                              onChange={() => toggleColumn('tax')}
                              className="rounded text-indigo-600 focus:ring-0"
                            />
                          </label>

                          <label className="flex items-center justify-between text-xs py-1 px-1.5 rounded hover:bg-slate-50 cursor-pointer">
                            <span className="text-slate-700 font-medium">مبلغ خالص نهایی</span>
                            <input
                              type="checkbox"
                              checked={!!printSettings.columns?.totalPrice}
                              onChange={() => toggleColumn('totalPrice')}
                              className="rounded text-indigo-600 focus:ring-0"
                            />
                          </label>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Advanced Print & Pagination Settings Dropdown */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => {
                        setShowAdvancedSettings(!showAdvancedSettings);
                        setShowColumnDropdown(false);
                      }}
                      className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:border-indigo-300 hover:text-indigo-600 rounded-lg transition-colors shadow-xs"
                    >
                      <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-500" />
                      <span>صفحه‌بندی و پیشرفته</span>
                      <ChevronDown className={`w-3 h-3 transition-transform ${showAdvancedSettings ? 'rotate-180' : ''}`} />
                    </button>

                    {showAdvancedSettings && (
                      <div className="absolute top-full right-0 mt-1.5 w-72 bg-white rounded-xl shadow-xl border border-slate-200 p-3.5 z-50 text-right space-y-3">
                        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                          <span className="text-xs font-black text-slate-800">تنظیمات صفحه‌بندی و چاپ</span>
                          <button
                            type="button"
                            onClick={() => setShowAdvancedSettings(false)}
                            className="text-slate-400 hover:text-slate-600 p-0.5"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Pagination Mode */}
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">نوع صفحه‌بندی اقلام:</label>
                          <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-lg">
                            <button
                              type="button"
                              onClick={() => setPrintSettings(s => ({ ...s, paginationMode: 'auto' }))}
                              className={`py-1 px-2 text-xs font-bold rounded-md transition-colors ${
                                printSettings.paginationMode !== 'chunked'
                                  ? 'bg-white text-indigo-700 shadow-xs'
                                  : 'text-slate-600 hover:text-slate-900'
                              }`}
                            >
                              جریان خودکار
                            </button>
                            <button
                              type="button"
                              onClick={() => setPrintSettings(s => ({ ...s, paginationMode: 'chunked' }))}
                              className={`py-1 px-2 text-xs font-bold rounded-md transition-colors ${
                                printSettings.paginationMode === 'chunked'
                                  ? 'bg-white text-indigo-700 shadow-xs'
                                  : 'text-slate-600 hover:text-slate-900'
                              }`}
                            >
                              برگه‌بندی مجزا
                            </button>
                          </div>
                        </div>

                        {/* Items Per Page if chunked */}
                        {printSettings.paginationMode === 'chunked' && (
                          <div>
                            <label className="block text-[11px] font-bold text-slate-700 mb-1">تعداد اقلام در هر برگه:</label>
                            <select
                              value={printSettings.itemsPerPage || 12}
                              onChange={(e) => setPrintSettings(s => ({ ...s, itemsPerPage: Number(e.target.value) }))}
                              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-1.5 font-bold text-slate-700 outline-none"
                            >
                              <option value={8}>۸ قلم در هر برگه</option>
                              <option value={10}>۱۰ قلم در هر برگه</option>
                              <option value={12}>۱۲ قلم در هر برگه (استاندارد)</option>
                              <option value={15}>۱۵ قلم در هر برگه</option>
                              <option value={20}>۲۰ قلم در هر برگه (فشرده)</option>
                            </select>
                          </div>
                        )}

                        {/* Font Size */}
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">اندازه قلم چاپ:</label>
                          <select
                            value={printSettings.fontSize || 'normal'}
                            onChange={(e) => setPrintSettings(s => ({ ...s, fontSize: e.target.value as any }))}
                            className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-1.5 font-bold text-slate-700 outline-none"
                          >
                            <option value="compact">فشرده (ریز برای اقلام پرتعداد)</option>
                            <option value="normal">استاندارد و متوازن</option>
                            <option value="large">درشت (خوانایی حداکثری)</option>
                          </select>
                        </div>

                        {/* Barcode toggle */}
                        <label className="flex items-center justify-between text-xs py-1 px-1 hover:bg-slate-50 rounded cursor-pointer">
                          <span className="font-bold text-slate-700">بارکد استعلام فاکتور</span>
                          <input
                            type="checkbox"
                            checked={printSettings.showQrCode !== false}
                            onChange={(e) => setPrintSettings(s => ({ ...s, showQrCode: e.target.checked }))}
                            className="rounded text-indigo-600 focus:ring-0"
                          />
                        </label>

                        {/* Reset button */}
                        <div className="pt-2 border-t border-slate-100">
                          <button
                            type="button"
                            onClick={() => {
                              handleResetPrintSettings();
                              setShowAdvancedSettings(false);
                            }}
                            className="w-full py-1.5 text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors border border-rose-200"
                          >
                            بازنشانی تنظیمات چاپ به پیش‌فرض
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Bold Borders Toggle */}
                  <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 cursor-pointer bg-white border border-slate-200 hover:border-slate-300 px-2 py-1 rounded-lg shadow-xs">
                    <input
                      type="checkbox"
                      checked={!!printSettings.boldBorders || printSettings.paperSize === 'a5'}
                      onChange={(e) => setPrintSettings(s => ({ ...s, boldBorders: e.target.checked }))}
                      className="rounded text-indigo-600 focus:ring-0"
                    />
                    <span>خطوط پررنگ</span>
                  </label>

                  {/* Standard toggles */}
                  <label className="flex items-center gap-1 text-xs cursor-pointer px-1">
                    <input type="checkbox" checked={printSettings.showStoreLogo} onChange={(e) => setPrintSettings(s => ({...s, showStoreLogo: e.target.checked}))} className="rounded text-indigo-600 focus:ring-0" />
                    <span>لوگو</span>
                  </label>
                  <label className="flex items-center gap-1 text-xs cursor-pointer px-1">
                    <input type="checkbox" checked={printSettings.showSignatures} onChange={(e) => setPrintSettings(s => ({...s, showSignatures: e.target.checked}))} className="rounded text-indigo-600 focus:ring-0" />
                    <span>امضاها</span>
                  </label>
                  <label className="flex items-center gap-1 text-xs cursor-pointer px-1">
                    <input type="checkbox" checked={printSettings.showTransactions} onChange={(e) => setPrintSettings(s => ({...s, showTransactions: e.target.checked}))} className="rounded text-indigo-600 focus:ring-0" />
                    <span>تراکنش‌ها</span>
                  </label>
                  <label className="flex items-center gap-1 text-xs cursor-pointer px-1">
                    <input type="checkbox" checked={printSettings.showBalance} onChange={(e) => setPrintSettings(s => ({...s, showBalance: e.target.checked}))} className="rounded text-indigo-600 focus:ring-0" />
                    <span>مانده</span>
                  </label>

                  <select 
                    value={printSettings.paperSize}
                    onChange={(e) => setPrintSettings(s => ({...s, paperSize: e.target.value as any}))}
                    className="text-xs bg-white font-bold text-slate-700 border border-slate-200 rounded-lg px-2 py-1 outline-none shadow-xs"
                  >
                    <option value="a4">سایز A4</option>
                    <option value="a5">سایز A5 (بهینه‌شده)</option>
                    <option value="pos80">فیش پرینتر (80mm)</option>
                  </select>

                  <select 
                    value={printSettings.designType}
                    onChange={(e) => handleDesignTypeChange(e.target.value)}
                    className="text-xs bg-white font-bold text-slate-700 border border-slate-200 rounded-lg px-2 py-1 outline-none shadow-xs"
                  >
                    <option value="modern">طراحی مدرن (پیشنهادی)</option>
                    <option value="minimal">طراحی مینیمال</option>
                    <option value="classic">طراحی کلاسیک</option>
                    <option value="official">طراحی رسمی (مالیاتی)</option>
                    <option value="compact">طراحی فشرده</option>
                    <option value="thermal">فیش پرینتر (حرارتی)</option>
                  </select>
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

            <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-100 print:p-0 print:overflow-visible print:bg-white flex justify-center items-start print:block">
              <div
                id="invoice-sheet-to-print"
                className={`invoice-print-container bg-white rounded-xl shadow-sm border border-slate-200 print:border-none print:shadow-none mx-auto print:mx-auto print:w-full print:max-w-none relative overflow-visible box-border p-4 sm:p-6 print:p-0 ${
                  printSettings.paperSize === 'a5'
                    ? 'max-w-[148mm] min-h-[210mm] print:min-h-0'
                    : printSettings.paperSize === 'pos80'
                      ? 'max-w-[80mm] min-h-[100mm] print:min-h-0'
                      : 'max-w-[210mm] min-h-[297mm] print:min-h-0'
                }`}
                style={{ fontFamily: "'IRANYekanXFaNum', 'Vazirmatn', -apple-system, sans-serif" }}
              >
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
              <div className="p-4 bg-white border-t border-slate-200 flex items-center justify-between gap-3 print:hidden shrink-0">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-5 py-2.5 text-slate-700 bg-slate-100 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 rounded-xl font-black text-xs sm:text-sm border border-slate-200 flex items-center gap-2 transition-all cursor-pointer shadow-xs active:scale-95"
                >
                  <X className="w-4 h-4 text-slate-500" />
                  <span>بستن و انصراف</span>
                </button>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handlePrintInvoice}
                    className="px-5 py-2.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-xl font-black text-xs sm:text-sm transition-colors flex items-center gap-2 border border-indigo-200 shadow-xs cursor-pointer active:scale-95"
                  >
                    <Printer className="w-4 h-4" />
                    <span>چاپ پیش‌نمایش</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const finalData = { ...previewInvoiceData, isDraft: false, status: 'final' };
                      saveInvoiceData(finalData, false);
                      setPreviewInvoiceData(null);
                    }}
                    disabled={submitting}
                    className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white rounded-xl font-black text-xs sm:text-sm transition-all flex items-center gap-2 shadow-md shadow-indigo-600/20 cursor-pointer active:scale-95"
                  >
                    <CheckCircle className="w-4 h-4" />
                    <span>تایید و ثبت نهایی</span>
                  </button>
                </div>
              </div>
            )}
            {viewingInvoice && (
              <div className="p-4 bg-white border-t border-slate-200 flex items-center justify-between gap-3 print:hidden shrink-0">
                <div className="text-xs text-slate-500 font-bold hidden sm:block">
                  شماره سند: <span className="font-sans font-black text-slate-800">#{toPersianDigits(currentInvoice?.invoiceNumber || currentInvoice?.id || '')}</span>
                </div>
                <div className="flex items-center gap-3 mr-auto">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="px-5 py-2.5 bg-slate-100 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 text-slate-700 rounded-xl font-black text-xs sm:text-sm border border-slate-200 flex items-center gap-2 transition-all cursor-pointer shadow-xs active:scale-95"
                    title="بستن پنجره پیش‌نمایش (Esc)"
                  >
                    <X className="w-4 h-4 text-slate-500" />
                    <span>بستن پنجره</span>
                  </button>
                  <button
                    type="button"
                    onClick={handlePrintInvoice}
                    className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black text-xs sm:text-sm transition-all flex items-center gap-2 shadow-md shadow-indigo-600/20 cursor-pointer active:scale-95"
                  >
                    <Printer className="w-4 h-4" />
                    <span>چاپ فاکتور</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Check Preview */}


      {/* Receipt Preview & Confirmation */}
      {previewReceiptData && (
        <ReceiptConfirmationModal
          isOpen={Boolean(previewReceiptData)}
          onClose={() => setPreviewReceiptData(null)}
          onConfirm={() => {
            confirmReceiptSubmit(previewReceiptData);
          }}
          submitting={Boolean(submittingReceipt || submitting)}
          receiptData={previewReceiptData}
          persons={persons}
          accounts={accounts}
          cashboxes={cashboxes}
          checkbooks={checkbooks}
          invoices={invoices}
          storeSettings={storeSettings}
          formatCurrency={formatCurrency}
          getPersonDisplayName={getPersonDisplayName}
        />
      )}
      {/* Receipt Printing Modal */}
      {printingTransaction && (
        <ReceiptPrintModal
          isOpen={Boolean(printingTransaction)}
          onClose={() => setPrintingTransaction(null)}
          data={printingTransaction}
          storeSettings={storeSettings}
          persons={persons}
          accounts={accounts}
          cashboxes={cashboxes}
          invoices={invoices}
          formatCurrency={formatCurrency}
          getPersonDisplayName={getPersonDisplayName}
          onEdit={(receipt) => {
            setPrintingTransaction(null);
            if (setEditingReceipt && setIsEditReceiptModalOpen) {
              setEditingReceipt(receipt);
              setIsEditReceiptModalOpen(true);
            }
          }}
        />
      )}
    </>
  );
}
