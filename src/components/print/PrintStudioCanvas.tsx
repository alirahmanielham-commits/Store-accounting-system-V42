import React, { useRef, useState } from 'react';
import { 
  Printer, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  Maximize2, 
  FileText, 
  Database, 
  Sparkles, 
  CheckCircle2, 
  Scissors,
  Layers
} from 'lucide-react';
import { PrintTemplateProfile } from '../../types/printStudio';
import { PrintTemplateService } from '../../services/printTemplateService';
import InvoicePrintTemplate from './InvoicePrintTemplate';
import ReceiptPrintTemplate from './ReceiptPrintTemplate';
import WarehousePrintTemplate from './WarehousePrintTemplate';
import { CheckReceiptPrintTemplate } from './CheckReceiptPrintTemplate';
import { printViaIframe } from '../../utils/printHelper';
import { 
  sampleInvoiceData, 
  sampleReceiptData, 
  sampleWarehouseData, 
  sampleCheckData, 
  sampleLoanData 
} from './samplePrintData';
import { toPersianDigits, formatDateDisplay } from '../../utils/format';

interface PrintStudioCanvasProps {
  profile: PrintTemplateProfile;
  storeSettings: any;
  liveInvoices?: any[];
  livePersons?: any[];
  liveWarehouses?: any[];
  liveTransactions?: any[];
  liveChecks?: any[];
  formatCurrency?: (val: any) => string;
}

export default function PrintStudioCanvas({
  profile,
  storeSettings,
  liveInvoices = [],
  livePersons = [],
  liveWarehouses = [],
  liveTransactions = [],
  liveChecks = [],
  formatCurrency,
}: PrintStudioCanvasProps) {
  const [zoom, setZoom] = useState<number>(100);
  const [useLiveData, setUseLiveData] = useState<boolean>(false);
  const [isPrinting, setIsPrinting] = useState<boolean>(false);

  // Determine active document data
  const getDocumentData = () => {
    if (!useLiveData) {
      switch (profile.category) {
        case 'invoice': return sampleInvoiceData;
        case 'receipt': return sampleReceiptData;
        case 'warehouse': return sampleWarehouseData;
        case 'check': return sampleCheckData;
        case 'loan': return sampleLoanData;
        default: return sampleInvoiceData;
      }
    }

    // Try finding latest real document
    if (profile.category === 'invoice' && liveInvoices.length > 0) {
      return liveInvoices[0];
    }
    if (profile.category === 'warehouse' && liveInvoices.length > 0) {
      const whDoc = liveInvoices.find((i: any) => i.type === 'warehouse_receipt' || i.type === 'warehouse_remittance');
      if (whDoc) return whDoc;
    }
    if (profile.category === 'receipt' && liveTransactions.length > 0) {
      return liveTransactions[0];
    }
    if (profile.category === 'check' && liveChecks.length > 0) {
      return liveChecks[0];
    }

    // Fallback to sample if live list is empty
    switch (profile.category) {
      case 'invoice': return sampleInvoiceData;
      case 'receipt': return sampleReceiptData;
      case 'warehouse': return sampleWarehouseData;
      case 'check': return sampleCheckData;
      case 'loan': return sampleLoanData;
      default: return sampleInvoiceData;
    }
  };

  const documentData = getDocumentData();

  // Handle direct test print
  const handleTestPrint = async () => {
    setIsPrinting(true);
    try {
      await printViaIframe('#print-studio-live-sheet', {
        paperSize: profile.paperSize === 'pos58' ? 'pos80' : profile.paperSize,
        documentTitle: `پیش‌نمایش_${profile.name}`,
      });
    } catch (e) {
      console.error('Test print failed:', e);
    } finally {
      setIsPrinting(false);
    }
  };

  // Convert profile to InvoicePrintSettings
  const invoicePrintSettings = PrintTemplateService.toInvoicePrintSettings(profile);

  // Store settings combined with profile overrides
  const effectiveStoreSettings = {
    ...storeSettings,
    storeName: profile.showStoreName ? (storeSettings?.storeName || 'بازرگانی و فروشگاه صنعت نوین') : '',
    phone: profile.showStorePhone ? (storeSettings?.phone || '۰۲۱-۸۸۹۹۰۰۱۱') : '',
    address: profile.showStoreAddress ? (storeSettings?.address || 'تهران، خیابان جمهوری، تقاطع فردوسی، پلاک ۲۵۰') : '',
    economicCode: profile.showEconomicCode ? (storeSettings?.economicCode || '۴۱۱۴۹۸۳۲۷۱۱۹') : '',
    nationalId: profile.showNationalId ? (storeSettings?.nationalId || '۱۰۱۰۳۴۸۷۲۱۰') : '',
    print_signature_1: profile.signature1Title,
    print_signature_2: profile.signature2Title,
    print_signature_3: profile.signature3Title,
    print_footer_note: profile.footerNote,
  };

  // Paper dimension and classes based on size & orientation
  const getPaperDimensions = () => {
    if (profile.paperSize === 'pos80') {
      return {
        width: '320px',
        minHeight: '480px',
        label: 'فیش حرارتی ۸۰ میلی‌متر (Thermal 80mm)',
      };
    }
    if (profile.paperSize === 'pos58') {
      return {
        width: '240px',
        minHeight: '400px',
        label: 'فیش حرارتی ۵۸ میلی‌متر (Thermal 58mm)',
      };
    }
    if (profile.paperSize === 'a5') {
      return profile.orientation === 'landscape'
        ? { width: '800px', minHeight: '560px', label: 'کاغذ A5 افقی (Landscape)' }
        : { width: '560px', minHeight: '800px', label: 'کاغذ A5 عمودی (Portrait)' };
    }
    if (profile.paperSize === 'a4_2copy') {
      return {
        width: '780px',
        minHeight: '1100px',
        label: 'کاغذ A4 دو نسخه‌ای فشرده (2-Up Split)',
      };
    }
    // Default A4
    return profile.orientation === 'landscape'
      ? { width: '1100px', minHeight: '780px', label: 'کاغذ A4 افقی (Landscape)' }
      : { width: '780px', minHeight: '1100px', label: 'کاغذ A4 عمودی (Portrait)' };
  };

  const paperDim = getPaperDimensions();

  // Render content based on category
  const renderTemplateContent = () => {
    switch (profile.category) {
      case 'invoice':
        return (
          <InvoicePrintTemplate
            data={documentData}
            storeSettings={effectiveStoreSettings}
            persons={livePersons.length > 0 ? livePersons : [sampleInvoiceData.customerId ? { id: 'cust_001', name: sampleInvoiceData.customerName, phone: sampleInvoiceData.customerPhone } : null].filter(Boolean)}
            transactions={liveTransactions}
            invoices={liveInvoices}
            printSettings={invoicePrintSettings}
            paperSize={profile.paperSize === 'pos80' || profile.paperSize === 'pos58' ? 'pos80' : profile.paperSize === 'a5' ? 'a5' : 'a4'}
          />
        );

      case 'receipt':
        return (
          <ReceiptPrintTemplate
            data={documentData}
            storeSettings={effectiveStoreSettings}
            persons={livePersons}
            accounts={[]}
            cashboxes={[]}
            invoices={liveInvoices}
            printSettings={{
              paperSize: profile.paperSize === 'a4_2copy' ? 'a4_2copy' : profile.orientation === 'landscape' ? 'a5_landscape' : 'a5_portrait',
              designTheme: profile.designTheme === 'minimal' ? 'minimal' : profile.designTheme === 'standard' ? 'classic' : 'modern',
              fields: {
                showStoreName: profile.showStoreName,
                showStoreLogo: profile.showStoreLogo,
                showStorePhone: profile.showStorePhone,
                showStoreAddress: profile.showStoreAddress,
                showEconomicCode: profile.showEconomicCode,
                showReceiptNumber: true,
                showDate: true,
                showTime: true,
                showTrackingCode: true,
                showPersonName: profile.showCustomerInfo,
                showPersonCode: true,
                showPersonPhone: profile.showCustomerPhone,
                showPersonAddress: profile.showCustomerAddress,
                showPersonBalance: profile.showCustomerBalance,
                showAmountNumber: true,
                showAmountWords: profile.showAmountInWords,
                showPaymentMethod: profile.showSettlementDetails,
                showResourceDetails: true,
                showCheckDetails: true,
                showLinkedInvoices: true,
                showDescription: true,
                showNote: false,
                showSignatures: profile.showSignatures,
                signatureCount: profile.signaturesCount,
                showFooterNote: profile.showFooter,
                customFooterText: profile.footerNote || 'این رسید به منزله سند قطعی پرداخت/دریافت می‌باشد.',
                showSoftwareWatermark: profile.showWatermark,
              },
              scale: profile.scale,
            }}
          />
        );

      case 'warehouse':
        return (
          <WarehousePrintTemplate
            data={documentData}
            storeSettings={effectiveStoreSettings}
            warehouses={liveWarehouses.length > 0 ? liveWarehouses : [{ id: 'wh_main', name: 'انبار مرکزی شماره ۱' }]}
            persons={livePersons}
            products={[]}
          />
        );

      case 'check':
        return (
          <CheckReceiptPrintTemplate
            check={documentData}
            persons={livePersons.length > 0 ? livePersons : [{ id: 'cust_001', name: sampleInvoiceData.customerName }]}
            storeSettings={effectiveStoreSettings}
          />
        );

      case 'loan':
        return (
          <div className="p-6 bg-white rounded-lg" dir="rtl">
            <div className="flex justify-between items-center border-b-2 border-slate-800 pb-4 mb-6">
              <div>
                <h2 className="text-xl font-black text-slate-900">{effectiveStoreSettings.storeName || 'صندوق قرض‌الحسنه و اعتبارات'}</h2>
                <p className="text-xs font-bold text-slate-500 mt-1">دفترچه اقساط تسهیلات اعتباری</p>
              </div>
              <div className="text-left">
                <span className="text-xs font-bold text-slate-500">شماره وام: </span>
                <span className="font-mono font-bold text-slate-800">{toPersianDigits(sampleLoanData.loan.loanNumber)}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-xl mb-6 text-xs">
              <div>
                <span className="text-slate-500 font-medium">وام‌گیرنده: </span>
                <span className="font-bold text-slate-800">{sampleLoanData.person.name}</span>
              </div>
              <div>
                <span className="text-slate-500 font-medium">مبلغ کل تسهیلات: </span>
                <span className="font-bold text-indigo-700">{toPersianDigits((sampleLoanData.loan.amount).toLocaleString())} {storeSettings?.currency || 'تومان'}</span>
              </div>
              <div>
                <span className="text-slate-500 font-medium">تعداد اقساط: </span>
                <span className="font-bold text-slate-800">{toPersianDigits(sampleLoanData.loan.installmentCount)} ماهه</span>
              </div>
              <div>
                <span className="text-slate-500 font-medium">مبلغ هر قسط: </span>
                <span className="font-bold text-slate-800">{toPersianDigits((sampleLoanData.loan.installmentAmount).toLocaleString())} {storeSettings?.currency || 'تومان'}</span>
              </div>
            </div>

            <table className="w-full text-xs text-right border-collapse mb-6 border border-slate-300">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-300">
                  <th className="p-2 border-l border-slate-300 text-center w-12">قسط</th>
                  <th className="p-2 border-l border-slate-300">سررسید</th>
                  <th className="p-2 border-l border-slate-300">مبلغ قسط ({storeSettings?.currency || 'تومان'})</th>
                  <th className="p-2 border-l border-slate-300 text-center">وضعیت</th>
                  <th className="p-2 text-center">مهر و امضای صندوق</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {sampleLoanData.installments.map((inst) => (
                  <tr key={inst.number} className="hover:bg-slate-50">
                    <td className="p-2 border-l border-slate-300 text-center font-bold">{toPersianDigits(inst.number)}</td>
                    <td className="p-2 border-l border-slate-300">{toPersianDigits(inst.dueDate)}</td>
                    <td className="p-2 border-l border-slate-300 font-bold font-mono">{toPersianDigits(inst.amount.toLocaleString())}</td>
                    <td className="p-2 border-l border-slate-300 text-center font-bold">
                      {inst.status === 'paid' ? (
                        <span className="text-emerald-700 font-black">پرداخت شده</span>
                      ) : (
                        <span className="text-amber-600">در انتظار سررسید</span>
                      )}
                    </td>
                    <td className="p-2 text-center h-12"></td>
                  </tr>
                ))}
              </tbody>
            </table>

            {profile.showSignatures && (
              <div className="flex justify-between items-center pt-6 border-t border-slate-300 text-xs">
                <div className="text-center w-1/2">
                  <p className="font-bold text-slate-700 mb-10">{profile.signature1Title || 'امضا و اثرانگشت وام‌گیرنده'}</p>
                </div>
                <div className="text-center w-1/2">
                  <p className="font-bold text-slate-700 mb-10">{profile.signature2Title || 'مهر و امضای صندوق'}</p>
                </div>
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-900/90 rounded-2xl border border-slate-800 shadow-xl overflow-hidden">
      {/* Canvas Top Bar */}
      <div className="bg-slate-950 px-5 py-3 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-300">
        <div className="flex items-center gap-3">
          <span className="font-bold text-white flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
            بوم پیش‌نمایش چاپ:
          </span>
          <span className="bg-slate-800/80 text-indigo-300 px-2.5 py-1 rounded-md font-mono text-[11px] border border-slate-700/60">
            {paperDim.label}
          </span>
        </div>

        {/* Center Controls: Data Switcher */}
        <div className="flex items-center gap-2 bg-slate-900 p-1 rounded-lg border border-slate-800">
          <button
            onClick={() => setUseLiveData(false)}
            className={`px-3 py-1 rounded font-bold transition-all cursor-pointer ${
              !useLiveData 
                ? 'bg-indigo-600 text-white shadow-xs' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            داده‌های نمونه استاندارد
          </button>
          <button
            onClick={() => setUseLiveData(true)}
            className={`px-3 py-1 rounded font-bold transition-all cursor-pointer ${
              useLiveData 
                ? 'bg-indigo-600 text-white shadow-xs' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            آخرین سند واقعی سیستم
          </button>
        </div>

        {/* Right Controls: Zoom & Direct Test Print */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5">
            <button
              onClick={() => setZoom((prev) => Math.max(50, prev - 10))}
              className="p-1.5 text-slate-400 hover:text-white rounded hover:bg-slate-800 cursor-pointer"
              title="کوچک‌نمایی"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="px-2 font-mono font-bold text-[11px] text-slate-300 min-w-10 text-center">
              %{toPersianDigits(zoom)}
            </span>
            <button
              onClick={() => setZoom((prev) => Math.min(150, prev + 10))}
              className="p-1.5 text-slate-400 hover:text-white rounded hover:bg-slate-800 cursor-pointer"
              title="بزرگ‌نمایی"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setZoom(100)}
              className="p-1.5 text-slate-400 hover:text-white rounded hover:bg-slate-800 cursor-pointer border-r border-slate-800"
              title="ریست زوم به ۱۰۰٪"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          </div>

          <button
            onClick={handleTestPrint}
            disabled={isPrinting}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold text-xs transition-all shadow-sm cursor-pointer disabled:opacity-50"
          >
            {isPrinting ? (
              <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
            ) : (
              <Printer className="w-3.5 h-3.5" />
            )}
            <span>چاپ آزمایشی مستقیم</span>
          </button>
        </div>
      </div>

      {/* Sheet Stage Area */}
      <div className="flex-1 overflow-auto p-6 md:p-10 flex items-start justify-center bg-radial from-slate-900 to-slate-950 custom-scrollbar select-none">
        <div 
          className="transition-transform duration-200 origin-top flex flex-col items-center"
          style={{ transform: `scale(${zoom / 100})` }}
        >
          {/* Thermal Receipt Roll effect or Standard Sheet */}
          {profile.paperSize === 'pos80' || profile.paperSize === 'pos58' ? (
            <div className="flex flex-col items-center">
              {/* Paper roll top tear notch */}
              <div 
                className="w-full h-3 bg-slate-200 opacity-80"
                style={{
                  clipPath: 'polygon(0% 0%, 5% 100%, 10% 0%, 15% 100%, 20% 0%, 25% 100%, 30% 0%, 35% 100%, 40% 0%, 45% 100%, 50% 0%, 55% 100%, 60% 0%, 65% 100%, 70% 0%, 75% 100%, 80% 0%, 85% 100%, 90% 0%, 95% 100%, 100% 0%)'
                }}
              />
              
              <div
                id="print-studio-live-sheet"
                className="bg-white text-slate-900 shadow-2xl p-4 transition-all duration-300 font-sans"
                style={{
                  width: paperDim.width,
                  minHeight: paperDim.minHeight,
                  boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6)',
                }}
              >
                {renderTemplateContent()}
              </div>

              {/* Paper roll bottom tear notch */}
              <div 
                className="w-full h-3 bg-slate-200 opacity-80"
                style={{
                  clipPath: 'polygon(0% 100%, 5% 0%, 10% 100%, 15% 0%, 20% 100%, 25% 0%, 30% 100%, 35% 0%, 40% 100%, 45% 0%, 50% 100%, 55% 0%, 60% 100%, 65% 0%, 70% 100%, 75% 0%, 80% 100%, 85% 0%, 90% 100%, 95% 0%, 100% 100%)'
                }}
              />
            </div>
          ) : profile.paperSize === 'a4_2copy' ? (
            /* 2-Copy split sheet with dashed cut line in the middle */
            <div
              id="print-studio-live-sheet"
              className="bg-white text-slate-900 shadow-2xl p-6 transition-all duration-300 font-sans rounded-xs flex flex-col justify-between"
              style={{
                width: paperDim.width,
                minHeight: paperDim.minHeight,
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
              }}
            >
              {/* Copy 1 (Top) */}
              <div className="flex-1 pb-6">
                <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold mb-2 no-print">
                  <span>نسخه اول (مشتری)</span>
                  <span>کد پیگیری چاپ: {toPersianDigits(Date.now().toString().slice(-6))}</span>
                </div>
                {renderTemplateContent()}
              </div>

              {/* Scissor Cut Line */}
              <div className="relative py-4 my-2 flex items-center justify-center">
                <div className="w-full border-t-2 border-dashed border-slate-300"></div>
                <div className="absolute bg-white px-3 text-slate-400 flex items-center gap-1.5 text-[11px] font-bold">
                  <Scissors className="w-3.5 h-3.5" />
                  <span>محل برش و تفکیک نسخه‌ها</span>
                </div>
              </div>

              {/* Copy 2 (Bottom) */}
              <div className="flex-1 pt-4">
                <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold mb-2 no-print">
                  <span>نسخه دوم (بایگانی حسابداری)</span>
                  <span>کد پیگیری چاپ: {toPersianDigits(Date.now().toString().slice(-6))}</span>
                </div>
                {renderTemplateContent()}
              </div>
            </div>
          ) : (
            /* Standard A4 or A5 sheet */
            <div
              id="print-studio-live-sheet"
              className="bg-white text-slate-900 shadow-2xl p-6 sm:p-8 transition-all duration-300 font-sans rounded-xs"
              style={{
                width: paperDim.width,
                minHeight: paperDim.minHeight,
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
              }}
            >
              {renderTemplateContent()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
