import React, { useState, useEffect } from 'react';
import {
  X,
  Printer,
  SlidersHorizontal,
  FileText,
  Copy,
  Layout,
  Check,
  RotateCcw,
  Sparkles,
  Layers,
  ChevronDown,
  ZoomIn,
  ZoomOut,
  Building2,
  Calendar,
  User,
  CreditCard,
  PenTool,
  Save,
  Edit2
} from 'lucide-react';
import ReceiptPrintTemplate from './ReceiptPrintTemplate';
import {
  ReceiptPrintSettings,
  ReceiptPaperSize,
  ReceiptDesignTheme,
  defaultReceiptPrintSettings,
  defaultReceiptPrintFields
} from './ReceiptPrintTypes';

const STORAGE_KEY = 'receipt_print_settings_v2';

interface ReceiptPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: any;
  storeSettings?: any;
  persons?: any[];
  accounts?: any[];
  cashboxes?: any[];
  invoices?: any[];
  getPersonDisplayName?: (person: any, persons?: any[]) => string;
  formatCurrency?: (val: any) => string;
  onEdit?: (receipt: any) => void;
}

export default function ReceiptPrintModal({
  isOpen,
  onClose,
  data,
  storeSettings = {},
  persons = [],
  accounts = [],
  cashboxes = [],
  invoices = [],
  getPersonDisplayName,
  formatCurrency,
  onEdit,
}: ReceiptPrintModalProps) {
  const [printSettings, setPrintSettings] = useState<ReceiptPrintSettings>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          ...defaultReceiptPrintSettings,
          ...parsed,
          fields: {
            ...defaultReceiptPrintFields,
            ...(parsed.fields || {})
          }
        };
      }
    } catch (e) {
      console.warn('Failed to load saved receipt print settings', e);
    }
    return defaultReceiptPrintSettings;
  });

  const [showCustomizer, setShowCustomizer] = useState(false);
  const [activeCategory, setActiveCategory] = useState<'store' | 'meta' | 'person' | 'finance' | 'desc' | 'signatures'>('store');

  // Save changes to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(printSettings));
    } catch (e) {
      console.error('Failed to save receipt print settings', e);
    }
  }, [printSettings]);

  if (!isOpen || !data) return null;

  const handlePrint = () => {
    window.print();
  };

  const updateField = (key: keyof typeof printSettings.fields, value: any) => {
    setPrintSettings(prev => ({
      ...prev,
      fields: {
        ...prev.fields,
        [key]: value
      }
    }));
  };

  const handleSetPreset = (type: 'all' | 'standard' | 'compact') => {
    if (type === 'all') {
      const allTrue = { ...printSettings.fields };
      Object.keys(allTrue).forEach((k) => {
        if (typeof (allTrue as any)[k] === 'boolean') {
          (allTrue as any)[k] = true;
        }
      });
      setPrintSettings(prev => ({ ...prev, fields: allTrue }));
    } else if (type === 'compact') {
      setPrintSettings(prev => ({
        ...prev,
        fields: {
          ...prev.fields,
          showStoreName: true,
          showStoreLogo: false,
          showStorePhone: true,
          showStoreAddress: false,
          showEconomicCode: false,
          showReceiptNumber: true,
          showDate: true,
          showTime: false,
          showTrackingCode: false,
          showPersonName: true,
          showPersonCode: false,
          showPersonPhone: false,
          showPersonAddress: false,
          showPersonBalance: false,
          showAmountNumber: true,
          showAmountWords: false,
          showPaymentMethod: true,
          showResourceDetails: false,
          showCheckDetails: true,
          showLinkedInvoices: false,
          showDescription: true,
          showNote: false,
          showSignatures: true,
          signatureCount: 2,
          showFooterNote: false,
          showSoftwareWatermark: false,
        }
      }));
    } else {
      // standard
      setPrintSettings(prev => ({
        ...prev,
        fields: { ...defaultReceiptPrintFields }
      }));
    }
  };

  const isReceive = data.type === 'receive';
  const modalTitle = isReceive ? 'پیش‌نمایش و چاپ رسید دریافت' : 'پیش‌نمایش و چاپ رسید پرداخت';

  return (
    <div className="fixed inset-0 z-[99999] flex flex-col bg-slate-900/60 backdrop-blur-sm print:bg-transparent print:backdrop-blur-none print-section" dir="rtl">
      {/* Top Toolbar (Hidden during Print) */}
      <div className="bg-white border-b border-slate-200 px-4 py-3 flex flex-wrap items-center justify-between gap-3 shadow-md print:hidden shrink-0 z-30">
        {/* Left side: Title & Doc Badge */}
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black ${isReceive ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-black text-slate-900">{modalTitle}</h3>
              <span className="text-xs font-mono font-black px-2 py-0.5 bg-slate-100 border border-slate-200 rounded-md text-slate-700">
                {data.receiptNumber || `#${data.id}`}
              </span>
            </div>
            <p className="text-xs font-bold text-slate-500">
              قالب‌های استاندار A4 و A5 با امکان شخصی‌سازی کامل فیلدها و پیش‌نمایش زنده
            </p>
          </div>
        </div>

        {/* Center: Paper Size & Theme Selectors */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Paper Size Selector */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
            <button
              type="button"
              onClick={() => setPrintSettings(s => ({ ...s, paperSize: 'a5_landscape' }))}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                printSettings.paperSize === 'a5_landscape'
                  ? 'bg-white text-slate-900 shadow-sm font-black'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="سایز استاندارد قبوض حسابداری (A5 افقی)"
            >
              <span>A5 افقی</span>
              <span className="text-[9.5px] bg-emerald-100 text-emerald-700 px-1 py-0.2 rounded font-mono">رایج</span>
            </button>

            <button
              type="button"
              onClick={() => setPrintSettings(s => ({ ...s, paperSize: 'a5_portrait' }))}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                printSettings.paperSize === 'a5_portrait'
                  ? 'bg-white text-slate-900 shadow-sm font-black'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              A5 عمودی
            </button>

            <button
              type="button"
              onClick={() => setPrintSettings(s => ({ ...s, paperSize: 'a4_portrait' }))}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                printSettings.paperSize === 'a4_portrait'
                  ? 'bg-white text-slate-900 shadow-sm font-black'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              A4 تمام‌صفحه
            </button>

            <button
              type="button"
              onClick={() => setPrintSettings(s => ({ ...s, paperSize: 'a4_2copy' }))}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 ${
                printSettings.paperSize === 'a4_2copy'
                  ? 'bg-white text-indigo-700 shadow-sm font-black'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="چاپ دو نسخه در یک برگه A4 با خط برش (مشتری و بایگانی)"
            >
              <Copy className="w-3 h-3" />
              <span>A4 دو نسخه‌ای</span>
            </button>
          </div>

          {/* Theme Selector */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
            <button
              type="button"
              onClick={() => setPrintSettings(s => ({ ...s, designTheme: 'modern' }))}
              className={`px-2.5 py-1.5 rounded-lg transition-all ${
                printSettings.designTheme === 'modern'
                  ? 'bg-white text-slate-900 shadow-sm font-black'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              مدرن
            </button>
            <button
              type="button"
              onClick={() => setPrintSettings(s => ({ ...s, designTheme: 'classic' }))}
              className={`px-2.5 py-1.5 rounded-lg transition-all ${
                printSettings.designTheme === 'classic'
                  ? 'bg-white text-slate-900 shadow-sm font-black'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              کلاسیک
            </button>
            <button
              type="button"
              onClick={() => setPrintSettings(s => ({ ...s, designTheme: 'minimal' }))}
              className={`px-2.5 py-1.5 rounded-lg transition-all ${
                printSettings.designTheme === 'minimal'
                  ? 'bg-white text-slate-900 shadow-sm font-black'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              مینیمال
            </button>
          </div>

          {/* Field Customizer Button */}
          <button
            type="button"
            onClick={() => setShowCustomizer(!showCustomizer)}
            className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-2 border transition-all ${
              showCustomizer
                ? 'bg-indigo-50 border-indigo-300 text-indigo-700 shadow-xs'
                : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
            }`}
          >
            <SlidersHorizontal className="w-4 h-4 text-indigo-600" />
            <span>تنظیم فیلدهای چاپی</span>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showCustomizer ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {/* Right side: Print & Close */}
        <div className="flex items-center gap-2">
          {/* Zoom Controls */}
          <div className="hidden sm:flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
            <button
              type="button"
              onClick={() => setPrintSettings(s => ({ ...s, scale: Math.max(75, s.scale - 15) }))}
              className="p-1 hover:bg-white rounded text-slate-600 transition-colors"
              title="کوچک‌نمایی"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="font-mono font-bold px-1.5 text-slate-700">{printSettings.scale}%</span>
            <button
              type="button"
              onClick={() => setPrintSettings(s => ({ ...s, scale: Math.min(130, s.scale + 15) }))}
              className="p-1 hover:bg-white rounded text-slate-600 transition-colors"
              title="بزرگ‌نمایی"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
          </div>

          {onEdit && (
            <button
              type="button"
              onClick={() => onEdit(data)}
              className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs sm:text-sm font-black border border-indigo-200 flex items-center gap-1.5 transition-all"
              title="ویرایش این رسید"
            >
              <Edit2 className="w-4 h-4" />
              <span>ویرایش رسید</span>
            </button>
          )}

          <button
            type="button"
            onClick={handlePrint}
            className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs sm:text-sm font-black shadow-lg flex items-center gap-2 transition-all"
          >
            <Printer className="w-4 h-4" />
            <span>چاپ رسید</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
            title="بستن پیش‌نمایش"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Field Customizer Drawer / Dropdown */}
      {showCustomizer && (
        <div className="bg-white border-b border-slate-300 shadow-xl px-4 py-3 print:hidden z-20 overflow-x-auto text-xs animate-in slide-in-from-top-2 duration-200">
          <div className="max-w-7xl mx-auto space-y-3">
            {/* Quick Actions & Category Tabs */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-2">
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setActiveCategory('store')}
                  className={`px-3 py-1 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                    activeCategory === 'store' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  <Building2 className="w-3.5 h-3.5" />
                  <span>اطلاعات فروشگاه</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveCategory('meta')}
                  className={`px-3 py-1 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                    activeCategory === 'meta' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>شماره و تاریخ</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveCategory('person')}
                  className={`px-3 py-1 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                    activeCategory === 'person' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  <User className="w-3.5 h-3.5" />
                  <span>طرف‌حساب و مانده</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveCategory('finance')}
                  className={`px-3 py-1 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                    activeCategory === 'finance' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>مبالغ و شیوه تسویه</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveCategory('desc')}
                  className={`px-3 py-1 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                    activeCategory === 'desc' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>شرح و بابت</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveCategory('signatures')}
                  className={`px-3 py-1 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                    activeCategory === 'signatures' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  <PenTool className="w-3.5 h-3.5" />
                  <span>امضاها و پاورقی</span>
                </button>
              </div>

              {/* Quick Preset Buttons */}
              <div className="flex items-center gap-2">
                <span className="text-slate-400 text-[11px] font-bold">الگوهای سریع:</span>
                <button
                  type="button"
                  onClick={() => handleSetPreset('all')}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-bold"
                >
                  انتخاب همه
                </button>
                <button
                  type="button"
                  onClick={() => handleSetPreset('standard')}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-bold"
                >
                  پیش‌فرض استاندارد
                </button>
                <button
                  type="button"
                  onClick={() => handleSetPreset('compact')}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-bold"
                >
                  حالت خلاصه
                </button>
              </div>
            </div>

            {/* Active Category Content */}
            <div className="py-1">
              {activeCategory === 'store' && (
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  <label className="flex items-center gap-2 cursor-pointer select-none font-bold text-slate-800">
                    <input
                      type="checkbox"
                      checked={printSettings.fields.showStoreName}
                      onChange={e => updateField('showStoreName', e.target.checked)}
                      className="w-4 h-4 rounded text-indigo-600 focus:ring-0"
                    />
                    <span>نام فروشگاه / مجموعه</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer select-none font-bold text-slate-800">
                    <input
                      type="checkbox"
                      checked={printSettings.fields.showStoreLogo}
                      onChange={e => updateField('showStoreLogo', e.target.checked)}
                      className="w-4 h-4 rounded text-indigo-600 focus:ring-0"
                    />
                    <span>لوگوی فروشگاه</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer select-none font-bold text-slate-800">
                    <input
                      type="checkbox"
                      checked={printSettings.fields.showStorePhone}
                      onChange={e => updateField('showStorePhone', e.target.checked)}
                      className="w-4 h-4 rounded text-indigo-600 focus:ring-0"
                    />
                    <span>تلفن تماس مجموعه</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer select-none font-bold text-slate-800">
                    <input
                      type="checkbox"
                      checked={printSettings.fields.showStoreAddress}
                      onChange={e => updateField('showStoreAddress', e.target.checked)}
                      className="w-4 h-4 rounded text-indigo-600 focus:ring-0"
                    />
                    <span>آدرس فروشگاه</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer select-none font-bold text-slate-800">
                    <input
                      type="checkbox"
                      checked={printSettings.fields.showEconomicCode}
                      onChange={e => updateField('showEconomicCode', e.target.checked)}
                      className="w-4 h-4 rounded text-indigo-600 focus:ring-0"
                    />
                    <span>کد اقتصادی / ملی</span>
                  </label>
                </div>
              )}

              {activeCategory === 'meta' && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <label className="flex items-center gap-2 cursor-pointer select-none font-bold text-slate-800">
                    <input
                      type="checkbox"
                      checked={printSettings.fields.showReceiptNumber}
                      onChange={e => updateField('showReceiptNumber', e.target.checked)}
                      className="w-4 h-4 rounded text-indigo-600 focus:ring-0"
                    />
                    <span>شماره رسید رسمی</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer select-none font-bold text-slate-800">
                    <input
                      type="checkbox"
                      checked={printSettings.fields.showDate}
                      onChange={e => updateField('showDate', e.target.checked)}
                      className="w-4 h-4 rounded text-indigo-600 focus:ring-0"
                    />
                    <span>تاریخ سند</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer select-none font-bold text-slate-800">
                    <input
                      type="checkbox"
                      checked={printSettings.fields.showTime}
                      onChange={e => updateField('showTime', e.target.checked)}
                      className="w-4 h-4 rounded text-indigo-600 focus:ring-0"
                    />
                    <span>ساعت ثبت تراکنش</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer select-none font-bold text-slate-800">
                    <input
                      type="checkbox"
                      checked={printSettings.fields.showTrackingCode}
                      onChange={e => updateField('showTrackingCode', e.target.checked)}
                      className="w-4 h-4 rounded text-indigo-600 focus:ring-0"
                    />
                    <span>شناسه پیگیری سیستمی</span>
                  </label>
                </div>
              )}

              {activeCategory === 'person' && (
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  <label className="flex items-center gap-2 cursor-pointer select-none font-bold text-slate-800">
                    <input
                      type="checkbox"
                      checked={printSettings.fields.showPersonName}
                      onChange={e => updateField('showPersonName', e.target.checked)}
                      className="w-4 h-4 rounded text-indigo-600 focus:ring-0"
                    />
                    <span>نام طرف‌حساب</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer select-none font-bold text-slate-800">
                    <input
                      type="checkbox"
                      checked={printSettings.fields.showPersonCode}
                      onChange={e => updateField('showPersonCode', e.target.checked)}
                      className="w-4 h-4 rounded text-indigo-600 focus:ring-0"
                    />
                    <span>کد شناسایی طرف‌حساب</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer select-none font-bold text-slate-800">
                    <input
                      type="checkbox"
                      checked={printSettings.fields.showPersonPhone}
                      onChange={e => updateField('showPersonPhone', e.target.checked)}
                      className="w-4 h-4 rounded text-indigo-600 focus:ring-0"
                    />
                    <span>تلفن طرف‌حساب</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer select-none font-bold text-slate-800">
                    <input
                      type="checkbox"
                      checked={printSettings.fields.showPersonAddress}
                      onChange={e => updateField('showPersonAddress', e.target.checked)}
                      className="w-4 h-4 rounded text-indigo-600 focus:ring-0"
                    />
                    <span>نشانی طرف‌حساب</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer select-none font-bold text-slate-800">
                    <input
                      type="checkbox"
                      checked={printSettings.fields.showPersonBalance}
                      onChange={e => updateField('showPersonBalance', e.target.checked)}
                      className="w-4 h-4 rounded text-indigo-600 focus:ring-0"
                    />
                    <span>مانده‌حساب جاری شخص</span>
                  </label>
                </div>
              )}

              {activeCategory === 'finance' && (
                <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
                  <label className="flex items-center gap-2 cursor-pointer select-none font-bold text-slate-800">
                    <input
                      type="checkbox"
                      checked={printSettings.fields.showAmountNumber}
                      onChange={e => updateField('showAmountNumber', e.target.checked)}
                      className="w-4 h-4 rounded text-indigo-600 focus:ring-0"
                    />
                    <span>مبلغ به عدد</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer select-none font-bold text-slate-800">
                    <input
                      type="checkbox"
                      checked={printSettings.fields.showAmountWords}
                      onChange={e => updateField('showAmountWords', e.target.checked)}
                      className="w-4 h-4 rounded text-indigo-600 focus:ring-0"
                    />
                    <span>مبلغ به حروف فارسی</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer select-none font-bold text-slate-800">
                    <input
                      type="checkbox"
                      checked={printSettings.fields.showPaymentMethod}
                      onChange={e => updateField('showPaymentMethod', e.target.checked)}
                      className="w-4 h-4 rounded text-indigo-600 focus:ring-0"
                    />
                    <span>روش تسویه (نقد/چک/کارت)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer select-none font-bold text-slate-800">
                    <input
                      type="checkbox"
                      checked={printSettings.fields.showResourceDetails}
                      onChange={e => updateField('showResourceDetails', e.target.checked)}
                      className="w-4 h-4 rounded text-indigo-600 focus:ring-0"
                    />
                    <span>نام بانک / صندوق</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer select-none font-bold text-slate-800">
                    <input
                      type="checkbox"
                      checked={printSettings.fields.showCheckDetails}
                      onChange={e => updateField('showCheckDetails', e.target.checked)}
                      className="w-4 h-4 rounded text-indigo-600 focus:ring-0"
                    />
                    <span>جزئیات چک (صیادی/سررسید)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer select-none font-bold text-slate-800">
                    <input
                      type="checkbox"
                      checked={printSettings.fields.showLinkedInvoices}
                      onChange={e => updateField('showLinkedInvoices', e.target.checked)}
                      className="w-4 h-4 rounded text-indigo-600 focus:ring-0"
                    />
                    <span>جدول فاکتورهای متصل</span>
                  </label>
                </div>
              )}

              {activeCategory === 'desc' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="flex items-center gap-2 cursor-pointer select-none font-bold text-slate-800">
                    <input
                      type="checkbox"
                      checked={printSettings.fields.showDescription}
                      onChange={e => updateField('showDescription', e.target.checked)}
                      className="w-4 h-4 rounded text-indigo-600 focus:ring-0"
                    />
                    <span>شرح و بابت سند</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer select-none font-bold text-slate-800">
                    <input
                      type="checkbox"
                      checked={printSettings.fields.showNote}
                      onChange={e => updateField('showNote', e.target.checked)}
                      className="w-4 h-4 rounded text-indigo-600 focus:ring-0"
                    />
                    <span>یادداشت اداری تکمیلی</span>
                  </label>
                </div>
              )}

              {activeCategory === 'signatures' && (
                <div className="space-y-2">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <label className="flex items-center gap-2 cursor-pointer select-none font-bold text-slate-800">
                      <input
                        type="checkbox"
                        checked={printSettings.fields.showSignatures}
                        onChange={e => updateField('showSignatures', e.target.checked)}
                        className="w-4 h-4 rounded text-indigo-600 focus:ring-0"
                      />
                      <span>کادرهای مهر و امضا</span>
                    </label>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-600 font-bold">تعداد امضا:</span>
                      <select
                        value={printSettings.fields.signatureCount}
                        onChange={e => updateField('signatureCount', Number(e.target.value) as 2 | 3)}
                        className="border border-slate-200 rounded px-2 py-0.5 text-xs bg-white font-bold"
                      >
                        <option value={2}>۲ ستون (طرفین)</option>
                        <option value={3}>۳ ستون (با حسابداری)</option>
                      </select>
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer select-none font-bold text-slate-800">
                      <input
                        type="checkbox"
                        checked={printSettings.fields.showFooterNote}
                        onChange={e => updateField('showFooterNote', e.target.checked)}
                        className="w-4 h-4 rounded text-indigo-600 focus:ring-0"
                      />
                      <span>متن پاورقی سفارشی</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer select-none font-bold text-slate-800">
                      <input
                        type="checkbox"
                        checked={printSettings.fields.showSoftwareWatermark}
                        onChange={e => updateField('showSoftwareWatermark', e.target.checked)}
                        className="w-4 h-4 rounded text-indigo-600 focus:ring-0"
                      />
                      <span>واترمارک و تاریخ چاپ</span>
                    </label>
                  </div>
                  {printSettings.fields.showFooterNote && (
                    <div className="flex items-center gap-2 pt-1">
                      <span className="text-[11px] font-bold text-slate-500 shrink-0">متن شروط پاورقی:</span>
                      <input
                        type="text"
                        value={printSettings.fields.customFooterText}
                        onChange={e => updateField('customFooterText', e.target.value)}
                        className="w-full border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-800"
                        placeholder="متن شروط رسید..."
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Preview Container */}
      <div className="flex-1 overflow-auto p-3 sm:p-6 bg-slate-200/90 print:bg-white print:p-0 flex justify-center items-start">
        <div
          style={{
            transform: `scale(${printSettings.scale / 100})`,
            transformOrigin: 'top center',
            transition: 'transform 0.15s ease'
          }}
          className="print:transform-none bg-white shadow-2xl print:shadow-none rounded-2xl print:rounded-none overflow-hidden max-w-full"
        >
          <ReceiptPrintTemplate
            data={data}
            storeSettings={storeSettings}
            persons={persons}
            accounts={accounts}
            cashboxes={cashboxes}
            invoices={invoices}
            getPersonDisplayName={getPersonDisplayName}
            formatCurrency={formatCurrency}
            printSettings={printSettings}
          />
        </div>
      </div>
    </div>
  );
}
