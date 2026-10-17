import React, { useState } from 'react';
import { 
  Sliders, 
  Layout, 
  FileText, 
  Building2, 
  Columns, 
  PenTool, 
  ShieldCheck, 
  Check, 
  RotateCcw, 
  Info, 
  ChevronDown,
  Sparkles,
  HelpCircle,
  QrCode
} from 'lucide-react';
import { 
  PrintTemplateProfile, 
  PaperSizeOption, 
  PaperOrientation, 
  DesignThemeOption,
  FontSizeOption,
  MarginOption 
} from '../../types/printStudio';

interface PrintStudioControlsProps {
  profile: PrintTemplateProfile;
  onChange: (updated: PrintTemplateProfile) => void;
  onReset: () => void;
}

export default function PrintStudioControls({
  profile,
  onChange,
  onReset,
}: PrintStudioControlsProps) {
  const [activeTab, setActiveTab] = useState<'paper' | 'header' | 'columns' | 'signatures' | 'extras'>('paper');

  const update = (partial: Partial<PrintTemplateProfile>) => {
    onChange({
      ...profile,
      ...partial,
    });
  };

  const updateColumn = (key: keyof typeof profile.columns, value: boolean) => {
    onChange({
      ...profile,
      columns: {
        ...profile.columns,
        [key]: value,
      },
    });
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden" dir="rtl">
      {/* Header Tabs */}
      <div className="border-b border-slate-200 bg-slate-50/70 p-2 flex items-center gap-1 overflow-x-auto custom-scrollbar shrink-0">
        {[
          { id: 'paper', label: 'ابعاد و قالب', icon: Layout },
          { id: 'header', label: 'سربرگ و لوگو', icon: Building2 },
          { id: 'columns', label: profile.category === 'receipt' ? 'اقلام و جدول تسویه' : 'ستون‌های جدول', icon: Columns },
          { id: 'signatures', label: 'امضاها و فوتر', icon: PenTool },
          { id: 'extras', label: 'مالی و امنیت', icon: ShieldCheck },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Control Body */}
      <div className="flex-1 overflow-y-auto p-5 custom-scrollbar space-y-6">
        {/* TAB 1: PAPER & GEOMETRY */}
        {activeTab === 'paper' && (
          <div className="space-y-6">
            <div>
              <h4 className="text-xs font-black text-slate-800 mb-2 flex items-center gap-1.5">
                <Layout className="w-4 h-4 text-indigo-600" />
                مدل و الگوی طراحی (Design Theme)
              </h4>
              <p className="text-[11px] text-slate-500 mb-3">
                یکی از طرح‌های بصری استاندارد سیستم را برای این قالب انتخاب کنید:
              </p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'official', label: 'رسمی (دارایی و مالیاتی)', desc: 'کادر استاندارد ماده ۱۶۹ با تفکیک عوارض' },
                  { id: 'standard', label: 'بازرگانی استاندارد', desc: 'کلاسیک و متداول شرکتی' },
                  { id: 'modern', label: 'مدرن و آراسته', desc: 'حاشیه‌های نرم و خطوط تفکیک خلوت' },
                  { id: 'minimal', label: 'ساده و مینیمال', desc: 'بدون کادربندی‌های ضخیم' },
                  { id: 'compact', label: 'دو نسخه در یک برگ', desc: 'فشرده با خط برش وسط صفحه' },
                  { id: 'thermal', label: 'حرارتی فیش‌پرینتر', desc: 'رول فیش مخصوص صندوق فروشگاه' },
                ].map((t) => (
                  <button
                    key={t.id}
                    onClick={() => update({ designTheme: t.id as DesignThemeOption })}
                    className={`p-3 rounded-xl border text-right transition-all cursor-pointer flex flex-col justify-between ${
                      profile.designTheme === t.id
                        ? 'border-indigo-600 bg-indigo-50/50 text-indigo-900 ring-2 ring-indigo-600/20'
                        : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-xs">{t.label}</span>
                      {profile.designTheme === t.id && (
                        <Check className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                      )}
                    </div>
                    <span className="text-[10px] text-slate-500 leading-tight">{t.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="border-t border-slate-100 pt-5">
              <h4 className="text-xs font-black text-slate-800 mb-3">قطع و ابعاد کاغذ (Paper Size)</h4>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'a4', label: 'A4 استاندارد' },
                  { id: 'a5', label: 'A5 نیم‌برگ' },
                  { id: 'pos80', label: 'حرارتی ۸۰mm' },
                  { id: 'pos58', label: 'حرارتی ۵۸mm' },
                  { id: 'a4_2copy', label: 'A4 دو نسخه‌ای' },
                ].map((s) => (
                  <button
                    key={s.id}
                    onClick={() => update({ paperSize: s.id as PaperSizeOption })}
                    className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer font-bold text-xs ${
                      profile.paperSize === s.id
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-900'
                        : 'border-slate-200 hover:border-slate-300 text-slate-700'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {profile.paperSize !== 'pos80' && profile.paperSize !== 'pos58' && profile.paperSize !== 'a4_2copy' && (
              <div className="border-t border-slate-100 pt-5">
                <h4 className="text-xs font-black text-slate-800 mb-3">جهت کاغذ (Orientation)</h4>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => update({ orientation: 'portrait' })}
                    className={`p-2.5 rounded-xl border text-center font-bold text-xs transition-all cursor-pointer ${
                      profile.orientation === 'portrait'
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-900'
                        : 'border-slate-200 hover:border-slate-300 text-slate-700'
                    }`}
                  >
                    عمودی (Portrait)
                  </button>
                  <button
                    onClick={() => update({ orientation: 'landscape' })}
                    className={`p-2.5 rounded-xl border text-center font-bold text-xs transition-all cursor-pointer ${
                      profile.orientation === 'landscape'
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-900'
                        : 'border-slate-200 hover:border-slate-300 text-slate-700'
                    }`}
                  >
                    افقی (Landscape)
                  </button>
                </div>
              </div>
            )}

            <div className="border-t border-slate-100 pt-5">
              <h4 className="text-xs font-black text-slate-800 mb-3">اندازه قلم و تراکم متن (Font Scale)</h4>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'compact', label: 'فشرده و ریز' },
                  { id: 'normal', label: 'استاندارد' },
                  { id: 'large', label: 'درشت و خوانا' },
                ].map((f) => (
                  <button
                    key={f.id}
                    onClick={() => update({ fontSize: f.id as FontSizeOption })}
                    className={`p-2.5 rounded-xl border text-center font-bold text-xs transition-all cursor-pointer ${
                      profile.fontSize === f.id
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-900'
                        : 'border-slate-200 hover:border-slate-300 text-slate-700'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="border-t border-slate-100 pt-5 space-y-3">
              <label className="flex items-center justify-between p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
                <span className="text-xs font-bold text-slate-800">خطوط کادر جدول پررنگ و مشکی (Bold Borders)</span>
                <input
                  type="checkbox"
                  checked={profile.boldBorders}
                  onChange={(e) => update({ boldBorders: e.target.checked })}
                  className="w-4 h-4 text-indigo-600 rounded border-slate-300 cursor-pointer"
                />
              </label>
            </div>
          </div>
        )}

        {/* TAB 2: HEADER & STORE DETAILS */}
        {activeTab === 'header' && (
          <div className="space-y-4">
            <h4 className="text-xs font-black text-slate-800 flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-indigo-600" />
              اطلاعات سربرگ و هویت فروشگاه
            </h4>
            <p className="text-[11px] text-slate-500 mb-4">
              فیلدهای زیر را برای نمایش یا عدم نمایش در سربرگ فاکتور و اسناد تنظیم نمایید:
            </p>

            {[
              { key: 'showStoreLogo', label: 'نمایش آرم و لوگوی فروشگاه' },
              { key: 'showStoreName', label: 'نمایش نام تجاری شرکت یا فروشگاه' },
              { key: 'showStorePhone', label: 'نمایش تلفن و اطلاعات تماس' },
              { key: 'showStoreAddress', label: 'نمایش نشانی و آدرس فروشگاه' },
              { key: 'showEconomicCode', label: 'نمایش کد اقتصادی (برای اسناد رسمی)' },
              { key: 'showNationalId', label: 'نمایش شناسه ملی / شماره ثبت' },
            ].map((item) => (
              <label
                key={item.key}
                className="flex items-center justify-between p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors"
              >
                <span className="text-xs font-bold text-slate-800">{item.label}</span>
                <input
                  type="checkbox"
                  checked={(profile as any)[item.key]}
                  onChange={(e) => update({ [item.key]: e.target.checked } as any)}
                  className="w-4 h-4 text-indigo-600 rounded border-slate-300 cursor-pointer"
                />
              </label>
            ))}
          </div>
        )}

        {/* TAB 3: TABLE COLUMNS / SETTLEMENT FIELDS */}
        {activeTab === 'columns' && (
          <div className="space-y-4">
            <h4 className="text-xs font-black text-slate-800 flex items-center gap-1.5">
              <Columns className="w-4 h-4 text-indigo-600" />
              {profile.category === 'receipt'
                ? 'فیلدها و جدول جامع تسویه رسید'
                : 'مدیریت ستون‌های جدول اقلام کالا و خدمات'}
            </h4>
            <p className="text-[11px] text-slate-500 mb-4">
              {profile.category === 'receipt'
                ? 'ردیف‌ها و اقلام مالی نمایش‌داده‌شده در جدول تسویه رسید را تنظیم فرمایید:'
                : 'با فعال یا غیرفعال کردن هر گزینه، ستون مربوطه بلافاصله از جدول فاکتور حذف یا به آن افزوده می‌شود:'}
            </p>

            {profile.category === 'receipt' ? (
              <div className="space-y-2.5">
                {[
                  { key: 'showSettlementDetails', label: 'نمایش جدول جامع ردیف‌های تسویه و پرداخت' },
                  { key: 'showAmountInWords', label: 'نمایش معادل مبلغ کل به حروف فارسی' },
                  { key: 'showCustomerBalance', label: 'نمایش مانده حساب قبلی و جدید طرف‌حساب' },
                  { key: 'showTransactions', label: 'نمایش شناسه رهگیری، کد صیاد و جزئیات پیگیری' },
                  { key: 'showCustomerInfo', label: 'نمایش نام و عنوان طرف‌حساب (مشتری/فروشنده)' },
                  { key: 'showCustomerPhone', label: 'نمایش تلفن و اطلاعات تماس طرف‌حساب' },
                  { key: 'showCustomerAddress', label: 'نمایش نشانی و آدرس طرف‌حساب' },
                  { key: 'showEconomicCode', label: 'نمایش کد اقتصادی و شناسه ملی طرفین' },
                ].map((item) => (
                  <label
                    key={item.key}
                    className="flex items-center justify-between p-2.5 px-3.5 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors"
                  >
                    <span className="text-xs font-bold text-slate-800">{item.label}</span>
                    <input
                      type="checkbox"
                      checked={Boolean((profile as any)[item.key])}
                      onChange={(e) => update({ [item.key]: e.target.checked } as any)}
                      className="w-4 h-4 text-indigo-600 rounded border-slate-300 cursor-pointer"
                    />
                  </label>
                ))}
              </div>
            ) : (
              <div className="space-y-2.5">
                {[
                  { key: 'rowIndex', label: 'شماره ردیف (ردیف شمارشی)' },
                  { key: 'productCode', label: 'کد کالا یا خدمات' },
                  { key: 'productName', label: 'شرح کالا یا خدمات' },
                  { key: 'quantity', label: 'مقدار / تعداد' },
                  { key: 'unit', label: 'واحد سنجش (عدد، کیلوگرم، متر و...)' },
                  { key: 'unitPrice', label: 'مبلغ واحد (فی)' },
                  { key: 'grossAmount', label: 'مبلغ ناخالص (قبل از تخفیف)' },
                  { key: 'discountPercent', label: 'درصد تخفیف (%)' },
                  { key: 'discountAmount', label: 'مبلغ تخفیف سطر' },
                  { key: 'tax', label: 'مالیات و عوارض ارزش افزوده' },
                  { key: 'totalPrice', label: 'مبلغ کل نهایی سطر' },
                ].map((col) => (
                  <label
                    key={col.key}
                    className="flex items-center justify-between p-2.5 px-3.5 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors"
                  >
                    <span className="text-xs font-bold text-slate-800">{col.label}</span>
                    <input
                      type="checkbox"
                      checked={profile.columns[col.key as keyof typeof profile.columns] !== false}
                      onChange={(e) => updateColumn(col.key as keyof typeof profile.columns, e.target.checked)}
                      className="w-4 h-4 text-indigo-600 rounded border-slate-300 cursor-pointer"
                    />
                  </label>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: SIGNATURES & FOOTER */}
        {activeTab === 'signatures' && (
          <div className="space-y-5">
            <h4 className="text-xs font-black text-slate-800 flex items-center gap-1.5">
              <PenTool className="w-4 h-4 text-indigo-600" />
              کادرهای امضا، مهر و شرایط سند
            </h4>

            <label className="flex items-center justify-between p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
              <span className="text-xs font-bold text-slate-800">نمایش کادرهای امضا و مهر در انتهای سند</span>
              <input
                type="checkbox"
                checked={profile.showSignatures}
                onChange={(e) => update({ showSignatures: e.target.checked })}
                className="w-4 h-4 text-indigo-600 rounded border-slate-300 cursor-pointer"
              />
            </label>

            {profile.showSignatures && (
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2">تعداد امضاها</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => update({ signaturesCount: 2 })}
                      className={`p-2 rounded-lg border text-xs font-bold cursor-pointer ${
                        profile.signaturesCount === 2
                          ? 'border-indigo-600 bg-white text-indigo-700 shadow-xs'
                          : 'border-slate-200 text-slate-600'
                      }`}
                    >
                      ۲ امضا (طرفین سند)
                    </button>
                    <button
                      onClick={() => update({ signaturesCount: 3 })}
                      className={`p-2 rounded-lg border text-xs font-bold cursor-pointer ${
                        profile.signaturesCount === 3
                          ? 'border-indigo-600 bg-white text-indigo-700 shadow-xs'
                          : 'border-slate-200 text-slate-600'
                      }`}
                    >
                      ۳ امضا (با تحویل‌گیرنده/مدیریت)
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">عنوان امضای اول (سمت چپ)</label>
                    <input
                      type="text"
                      value={profile.signature1Title || ''}
                      onChange={(e) => update({ signature1Title: e.target.value })}
                      placeholder="مثال: مهر و امضای خریدار"
                      className="w-full px-3 py-2 text-xs font-medium border border-slate-300 rounded-lg bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">عنوان امضای دوم (سمت راست)</label>
                    <input
                      type="text"
                      value={profile.signature2Title || ''}
                      onChange={(e) => update({ signature2Title: e.target.value })}
                      placeholder="مثال: مهر و امضای فروشنده"
                      className="w-full px-3 py-2 text-xs font-medium border border-slate-300 rounded-lg bg-white"
                    />
                  </div>
                  {profile.signaturesCount === 3 && (
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">عنوان امضای سوم (وسط)</label>
                      <input
                        type="text"
                        value={profile.signature3Title || ''}
                        onChange={(e) => update({ signature3Title: e.target.value })}
                        placeholder="مثال: تحویل‌گیرنده / انباردار"
                        className="w-full px-3 py-2 text-xs font-medium border border-slate-300 rounded-lg bg-white"
                      />
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="border-t border-slate-100 pt-5 space-y-4">
              <label className="flex items-center justify-between p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
                <span className="text-xs font-bold text-slate-800">نمایش یادداشت ثابت فوتر فاکتور</span>
                <input
                  type="checkbox"
                  checked={profile.showFooter}
                  onChange={(e) => update({ showFooter: e.target.checked })}
                  className="w-4 h-4 text-indigo-600 rounded border-slate-300 cursor-pointer"
                />
              </label>

              {profile.showFooter && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">متن یادداشت فوتر</label>
                  <textarea
                    rows={2}
                    value={profile.footerNote || ''}
                    onChange={(e) => update({ footerNote: e.target.value })}
                    placeholder="پیام تشکر یا توضیحات ثابت انتهای فاکتور..."
                    className="w-full px-3 py-2 text-xs font-medium border border-slate-300 rounded-lg bg-white"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">شرایط و قوانین تعویض / مرجوعی کالا</label>
                <textarea
                  rows={2}
                  value={profile.termsAndConditions || ''}
                  onChange={(e) => update({ termsAndConditions: e.target.value })}
                  placeholder="شرایط استرداد، مهلت تست، نگهداری فیش..."
                  className="w-full px-3 py-2 text-xs font-medium border border-slate-300 rounded-lg bg-white"
                />
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: FINANCIAL & EXTRAS */}
        {activeTab === 'extras' && (
          <div className="space-y-4">
            <h4 className="text-xs font-black text-slate-800 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-indigo-600" />
              اطلاعات تکمیلی، مالی و امنیتی
            </h4>

            {[
              { key: 'showCustomerInfo', label: 'نمایش نام و مشخصات طرف‌حساب' },
              { key: 'showCustomerPhone', label: 'نمایش شماره تماس مشتری' },
              { key: 'showCustomerAddress', label: 'نمایش آدرس مشتری' },
              { key: 'showCustomerBalance', label: 'نمایش مانده حساب پیشین مشتری' },
              { key: 'showSettlementDetails', label: 'نمایش تفکیک شیوه تسویه (نقد، پوز، چک، نسیه)' },
              { key: 'showAmountInWords', label: 'نمایش مبلغ کل به حروف فارسی' },
              { key: 'showQrCode', label: 'نمایش بارکد هوشمند QR فاکتور الکترونیک' },
              { key: 'showWatermark', label: 'نمایش واترمارک برای اسناد ابطال‌شده و پیش‌نویس' },
            ].map((item) => (
              <label
                key={item.key}
                className="flex items-center justify-between p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors"
              >
                <span className="text-xs font-bold text-slate-800">{item.label}</span>
                <input
                  type="checkbox"
                  checked={(profile as any)[item.key]}
                  onChange={(e) => update({ [item.key]: e.target.checked } as any)}
                  className="w-4 h-4 text-indigo-600 rounded border-slate-300 cursor-pointer"
                />
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Footer Reset Action */}
      <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
        <button
          onClick={onReset}
          className="flex items-center gap-1.5 px-3 py-2 text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg text-xs font-bold transition-all cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>بازنشانی به پیش‌فرض این قالب</span>
        </button>
        <span className="text-[11px] text-slate-400 font-medium">تغییرات به صورت زنده روی بوم اعمال می‌شود</span>
      </div>
    </div>
  );
}
