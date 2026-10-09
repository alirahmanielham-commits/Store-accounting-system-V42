import React, { useState, useEffect, useMemo } from 'react';
import { 
  Database, Server, HardDrive, Loader2, CheckCircle2, XCircle, 
  UserPlus, ArrowLeft, ArrowRight, KeySquare, Building2, Store, 
  Calendar, Landmark, Wallet, Warehouse, Users, PackagePlus, 
  Rocket, ShieldCheck, Sparkles, RefreshCw, Eye, EyeOff,
  Phone, MapPin, Tag, Check, ChevronLeft, ChevronRight,
  CreditCard, Coins, ShoppingBag, ArrowUpRight, HelpCircle,
  FileText, Percent, Globe, AlertTriangle
} from 'lucide-react';
import { numberToWords } from '../utils/format';

interface InitialSetupWizardProps {
  onComplete: () => void;
  onCancel?: () => void;
  mode?: 'initial' | 'business_only';
}

export default function InitialSetupWizard({ onComplete, onCancel, mode = 'initial' }: InitialSetupWizardProps) {
  const isBusinessOnly = mode === 'business_only';

  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Status from server
  const [status, setStatus] = useState<any>({
    dbConfigured: false,
    usingEnvVars: false,
    adminConfigured: false,
    companyConfigured: false,
    fiscalYearConfigured: false,
    isComplete: false
  });

  // Step 1: Database Model & Connection (Only in initial mode)
  const [dbType, setDbType] = useState<'json' | 'postgres'>('json');
  const [dbHost, setDbHost] = useState('localhost');
  const [dbPort, setDbPort] = useState('5432');
  const [dbUser, setDbUser] = useState('postgres');
  const [dbPass, setDbPass] = useState('');
  const [dbName, setDbName] = useState('store_db');
  const [dbTesting, setDbTesting] = useState(false);
  const [dbTestResult, setDbTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Step 2: Admin Account & Security (Only in initial mode)
  const [adminUsername, setAdminUsername] = useState('admin');
  const [adminFullName, setAdminFullName] = useState('مدیر ارشد سیستم');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminPasswordConfirm, setAdminPasswordConfirm] = useState('');

  // Step 3 / 1: Business Profile & Primary Settings
  const [storeName, setStoreName] = useState('فروشگاه و کسب‌وکار من');
  const [companyName, setCompanyName] = useState('');
  const [nationalId, setNationalId] = useState('');
  const [activityField, setActivityField] = useState('خرده‌فروشی و بازرگانی');
  const [currency, setCurrency] = useState('تومان');
  const [calendarType, setCalendarType] = useState<'jalali' | 'gregorian'>('jalali');
  const [storePhone, setStorePhone] = useState('');
  const [storeMobile, setStoreMobile] = useState('');
  const [storeAddress, setStoreAddress] = useState('');
  const [taxPercent, setTaxPercent] = useState('0');
  const [invoicePrintFormat, setInvoicePrintFormat] = useState<'standard' | 'official' | 'thermal'>('standard');

  // Step 4 / 2: Fiscal Year
  // Auto-detect current year based on calendar
  const currentJalaliYear = useMemo(() => {
    try {
      const d = new Date();
      return d.getFullYear() - 621;
    } catch {
      return 1404;
    }
  }, []);

  const currentGregorianYear = useMemo(() => {
    return new Date().getFullYear();
  }, []);

  const [fiscalYearName, setFiscalYearName] = useState(`سال مالی ${currentJalaliYear}`);
  const [fiscalYearCode, setFiscalYearCode] = useState(`FY-${currentJalaliYear}`);
  const [fiscalYearStart, setFiscalYearStart] = useState(`${currentJalaliYear}/01/01`);
  const [fiscalYearEnd, setFiscalYearEnd] = useState(`${currentJalaliYear}/12/29`);
  const [fiscalYearDesc, setFiscalYearDesc] = useState('دوره مالی افتتاحیه سیستم حسابداری');

  // Synchronize fiscal year dates when calendar type changes
  useEffect(() => {
    if (calendarType === 'gregorian') {
      setFiscalYearName(`Fiscal Year ${currentGregorianYear}`);
      setFiscalYearCode(`FY-${currentGregorianYear}`);
      setFiscalYearStart(`${currentGregorianYear}-01-01`);
      setFiscalYearEnd(`${currentGregorianYear}-12-31`);
      setFiscalYearDesc('Opening Fiscal Accounting Period');
      if (currency === 'ریال' || currency === 'تومان') {
        setCurrency('USD');
      }
    } else {
      setFiscalYearName(`سال مالی ${currentJalaliYear}`);
      setFiscalYearCode(`FY-${currentJalaliYear}`);
      setFiscalYearStart(`${currentJalaliYear}/01/01`);
      setFiscalYearEnd(`${currentJalaliYear}/12/29`);
      setFiscalYearDesc('دوره مالی افتتاحیه سیستم حسابداری');
      if (currency === 'USD' || currency === 'EUR') {
        setCurrency('تومان');
      }
    }
  }, [calendarType, currentJalaliYear, currentGregorianYear]);

  // Step 5 / 3: Financial Infrastructure (Bank, Cashbox, Warehouse)
  const [bankName, setBankName] = useState('بانک ملت');
  const [bankAccountNumber, setBankAccountNumber] = useState('');
  const [bankCardNumber, setBankCardNumber] = useState('');
  const [bankSheba, setBankSheba] = useState('');
  const [bankInitialBalance, setBankInitialBalance] = useState('0');

  const [cashboxName, setCashboxName] = useState('صندوق مرکزی');
  const [cashboxInitialBalance, setCashboxInitialBalance] = useState('0');

  const [warehouseName, setWarehouseName] = useState('انبار مرکزی');
  const [warehouseCode, setWarehouseCode] = useState('WH-01');
  const [warehouseAddress, setWarehouseAddress] = useState('');

  // Step 6 / 4: Starter Catalog & Contacts
  const [useStarterPack, setUseStarterPack] = useState(true);
  const [customPersonName, setCustomPersonName] = useState('مشتری عمومی (نقدی)');
  const [customPersonPhone, setCustomPersonPhone] = useState('09120000000');
  const [customPersonRole, setCustomPersonRole] = useState<'customer' | 'supplier' | 'both'>('customer');
  const [customPersonBalance, setCustomPersonBalance] = useState('0');
  const [customPersonBalanceType, setCustomPersonBalanceType] = useState<'settled' | 'debtor' | 'creditor'>('settled');

  const [customProductName, setCustomProductName] = useState('کالای نمونه ۱');
  const [customProductCategory, setCustomProductCategory] = useState('کالاهای عمومی');
  const [customProductUnit, setCustomProductUnit] = useState('عدد');
  const [customProductPurchasePrice, setCustomProductPurchasePrice] = useState('100000');
  const [customProductSalePrice, setCustomProductSalePrice] = useState('150000');
  const [customProductInitialStock, setCustomProductInitialStock] = useState('20');

  // Password strength calculation
  const calculatePasswordStrength = (pwd: string) => {
    let score = 0;
    if (!pwd) return score;
    if (pwd.length >= 6) score += 25;
    if (pwd.length >= 10) score += 15;
    if (/[A-Z]/.test(pwd)) score += 20;
    if (/[a-z]/.test(pwd)) score += 15;
    if (/[0-9]/.test(pwd)) score += 15;
    if (/[^A-Za-z0-9]/.test(pwd)) score += 10;
    return Math.min(100, score);
  };
  const passwordStrength = calculatePasswordStrength(adminPassword);

  // Common Iranian Banks for quick select
  const popularBanks = [
    'بانک ملت', 'بانک ملی', 'بانک صادرات', 'بانک تجارت', 
    'بانک سامان', 'بانک پاسارگاد', 'بانک سپه', 'بانک پارسیان', 
    'بانک رسالت', 'بلوبانک'
  ];

  useEffect(() => {
    if (isBusinessOnly) {
      setLoading(false);
      return;
    }

    fetch('/api/setup/status')
      .then(r => r.json())
      .then(data => {
        setStatus(data);
        if (data.adminUser?.username) {
          setAdminUsername(data.adminUser.username);
        }
        if (data.companyProfile?.storeName) {
          setStoreName(data.companyProfile.storeName);
        }
        if (data.companyProfile?.currency) {
          setCurrency(data.companyProfile.currency);
        }
        // If already completed and user is visiting this directly
        if (data.isComplete && !onCancel) {
          onComplete();
        }
      })
      .catch(err => {
        console.warn('Setup status check error:', err);
      })
      .finally(() => setLoading(false));
  }, [isBusinessOnly]);

  const handleTestDb = async () => {
    if (dbType === 'json') {
      setDbTestResult({ 
        success: true, 
        message: 'موتور پایگاه داده محلی (JSON Storage) تایید شد و بدون نیاز به سرور خارجی آماده فعالیت است.' 
      });
      return;
    }
    setDbTesting(true);
    setDbTestResult(null);
    try {
      const auth = dbPass ? `${dbUser}:${encodeURIComponent(dbPass)}` : dbUser;
      const targetDb = dbName?.trim() || 'postgres';
      const connStr = `postgresql://${auth}@${dbHost}:${dbPort}/${targetDb}`;
      const res = await fetch('/api/db/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connectionString: connStr, dbName: targetDb })
      });
      const data = await res.json();
      setDbTestResult({ success: data.success, message: data.message || data.error });
    } catch (err: any) {
      setDbTestResult({ success: false, message: err?.message || 'خطا در ارتباط با سرور' });
    } finally {
      setDbTesting(false);
    }
  };

  // Steps definition based on mode
  const stepsList = isBusinessOnly ? [
    { id: 1, title: 'مشخصات کسب‌وکار', subtitle: 'نام، صنف و تنظیمات', icon: Store },
    { id: 2, title: 'سال مالی', subtitle: 'تعریف دوره مالی باز', icon: Calendar },
    { id: 3, title: 'حساب و انبار', subtitle: 'بانک، صندوق و انبار', icon: Landmark },
    { id: 4, title: 'طرف‌حساب و کالا', subtitle: 'اشخاص و کاتالوگ آغازین', icon: PackagePlus },
    { id: 5, title: 'تایید و ایجاد', subtitle: 'بررسی و راه‌اندازی محیط', icon: Rocket }
  ] : [
    { id: 1, title: 'پایگاه داده', subtitle: 'موتور ذخیره‌سازی داده', icon: Database },
    { id: 2, title: 'مدیر ارشد', subtitle: 'حساب کاربری و امنیت', icon: ShieldCheck },
    { id: 3, title: 'کسب‌وکار', subtitle: 'نام تجاری و تنظیمات', icon: Store },
    { id: 4, title: 'سال مالی', subtitle: 'تعریف دوره مالی اولیه', icon: Calendar },
    { id: 5, title: 'حساب و انبار', subtitle: 'بانک، صندوق و انبار', icon: Landmark },
    { id: 6, title: 'طرف‌حساب و کالا', subtitle: 'اشخاص و کاتالوگ آغازین', icon: PackagePlus },
    { id: 7, title: 'تایید و راه‌اندازی', subtitle: 'بررسی نهایی و ورود', icon: Rocket }
  ];

  const handleNextStep = () => {
    setError('');

    // Mapping step validations
    if (!isBusinessOnly && step === 1) {
      if (dbType === 'postgres' && (!dbHost || !dbPort || !dbUser || !dbName)) {
        setError('لطفاً تمامی اطلاعات اتصال به سرور PostgreSQL را تکمیل فرمایید.');
        return;
      }
    } else if (!isBusinessOnly && step === 2) {
      if (!adminUsername.trim()) {
        setError('نام کاربری مدیر ارشد الزامی است.');
        return;
      }
      if (!adminPassword) {
        setError('کلمه عبور مدیر ارشد الزامی است.');
        return;
      }
      if (adminPassword.length < 4) {
        setError('کلمه عبور باید حداقل ۴ کاراکتر باشد.');
        return;
      }
      if (adminPasswordConfirm && adminPassword !== adminPasswordConfirm) {
        setError('کلمه عبور و تکرار آن یکسان نیستند.');
        return;
      }
    } else if ((!isBusinessOnly && step === 3) || (isBusinessOnly && step === 1)) {
      if (!storeName.trim()) {
        setError('نام فروشگاه یا کسب‌وکار الزامی است.');
        return;
      }
    } else if ((!isBusinessOnly && step === 4) || (isBusinessOnly && step === 2)) {
      if (!fiscalYearName.trim()) {
        setError('عنوان سال مالی الزامی است.');
        return;
      }
      if (!fiscalYearStart.trim() || !fiscalYearEnd.trim()) {
        setError('تاریخ شروع و پایان سال مالی الزامی است.');
        return;
      }
    } else if ((!isBusinessOnly && step === 5) || (isBusinessOnly && step === 3)) {
      if (!warehouseName.trim()) {
        setError('نام انبار پیش‌فرض الزامی است.');
        return;
      }
    } else if ((!isBusinessOnly && step === 6) || (isBusinessOnly && step === 4)) {
      if (!useStarterPack) {
        if (!customPersonName.trim()) {
          setError('لطفاً نام اولین طرف حساب را وارد فرمایید.');
          return;
        }
        if (!customProductName.trim()) {
          setError('لطفاً نام اولین کالا را وارد فرمایید.');
          return;
        }
      }
    }

    setStep(prev => Math.min(stepsList.length, prev + 1));
  };

  const handlePrevStep = () => {
    setError('');
    setStep(prev => Math.max(1, prev - 1));
  };

  const handleFinalSubmit = async () => {
    setSaving(true);
    setError('');
    try {
      if (isBusinessOnly) {
        // Create business via POST /api/databases with full fiscal year & infrastructure
        const payload = {
          name: storeName.trim(),
          companyName: companyName.trim() || storeName.trim(),
          activityField,
          currency,
          calendarType,
          phone: storePhone.trim() || storeMobile.trim(),
          address: storeAddress.trim(),
          taxPercent: Number(taxPercent) || 0,
          fiscalYear: {
            name: fiscalYearName.trim(),
            code: fiscalYearCode.trim(),
            startDate: fiscalYearStart.trim(),
            endDate: fiscalYearEnd.trim(),
            description: fiscalYearDesc.trim()
          },
          bankAccount: {
            bankName: bankName.trim(),
            accountNumber: bankAccountNumber.trim(),
            cardNumber: bankCardNumber.trim(),
            shebaNumber: bankSheba.trim(),
            initialBalance: Number(bankInitialBalance) || 0
          },
          cashbox: {
            name: cashboxName.trim(),
            initialBalance: Number(cashboxInitialBalance) || 0
          },
          warehouse: {
            name: warehouseName.trim(),
            code: warehouseCode.trim(),
            address: warehouseAddress.trim() || storeAddress.trim()
          },
          starterPack: useStarterPack,
          customPerson: !useStarterPack ? {
            name: customPersonName.trim(),
            phone: customPersonPhone.trim(),
            role: customPersonRole,
            initialBalance: Number(customPersonBalance) || 0,
            initialBalanceType: customPersonBalanceType
          } : null,
          customProduct: !useStarterPack ? {
            name: customProductName.trim(),
            categoryName: customProductCategory.trim(),
            unit: customProductUnit,
            purchasePrice: Number(customProductPurchasePrice) || 0,
            salePrice: Number(customProductSalePrice) || 0,
            initialStock: Number(customProductInitialStock) || 0
          } : null
        };

        const res = await fetch('/api/databases', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            ...(sessionStorage.getItem('access_token') || localStorage.getItem('access_token') ? {
              'Authorization': `Bearer ${sessionStorage.getItem('access_token') || localStorage.getItem('access_token')}`
            } : {})
          },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.success) {
          onComplete();
        } else {
          setError(data.error || 'خطا در ایجاد کسب و کار جدید');
        }
      } else {
        // Initial Full Wizard Setup via POST /api/setup/wizard-complete
        const payload = {
          dbConfig: {
            engine: dbType,
            host: dbHost,
            port: dbPort,
            user: dbUser,
            password: dbPass,
            dbName: dbName.trim() || 'store_db'
          },
          admin: {
            username: adminUsername.trim(),
            password: adminPassword,
            fullName: adminFullName.trim()
          },
          business: {
            storeName: storeName.trim(),
            companyName: companyName.trim() || storeName.trim(),
            nationalId: nationalId.trim(),
            activityField,
            currency,
            calendarType,
            phone: storePhone.trim() || storeMobile.trim(),
            address: storeAddress.trim(),
            taxPercent: Number(taxPercent) || 0,
            invoicePrintFormat
          },
          fiscalYear: {
            name: fiscalYearName.trim(),
            code: fiscalYearCode.trim(),
            startDate: fiscalYearStart.trim(),
            endDate: fiscalYearEnd.trim(),
            description: fiscalYearDesc.trim()
          },
          bankAccount: {
            bankName: bankName.trim(),
            accountNumber: bankAccountNumber.trim(),
            cardNumber: bankCardNumber.trim(),
            shebaNumber: bankSheba.trim(),
            initialBalance: Number(bankInitialBalance) || 0
          },
          cashbox: {
            name: cashboxName.trim(),
            initialBalance: Number(cashboxInitialBalance) || 0
          },
          warehouse: {
            name: warehouseName.trim(),
            code: warehouseCode.trim(),
            address: warehouseAddress.trim() || storeAddress.trim()
          },
          starterPack: useStarterPack,
          customPerson: !useStarterPack ? {
            name: customPersonName.trim(),
            phone: customPersonPhone.trim(),
            role: customPersonRole,
            initialBalance: Number(customPersonBalance) || 0,
            initialBalanceType: customPersonBalanceType
          } : null,
          customProduct: !useStarterPack ? {
            name: customProductName.trim(),
            categoryName: customProductCategory.trim(),
            unit: customProductUnit,
            purchasePrice: Number(customProductPurchasePrice) || 0,
            salePrice: Number(customProductSalePrice) || 0,
            initialStock: Number(customProductInitialStock) || 0
          } : null
        };

        const res = await fetch('/api/setup/wizard-complete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();

        if (data.success) {
          if (data.accessToken) {
            sessionStorage.setItem('access_token', data.accessToken);
            sessionStorage.setItem('auth_user', JSON.stringify(data.user));
            localStorage.setItem('access_token', data.accessToken);
            localStorage.setItem('auth_user', JSON.stringify(data.user));
          }
          onComplete();
        } else {
          setError(data.error || 'خطا در ذخیره‌سازی اطلاعات راه‌اندازی.');
        }
      }
    } catch (err: any) {
      setError(err?.message || 'خطا در برقراری ارتباط با سرور.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 text-white font-sans dir-rtl" style={{ direction: 'rtl' }}>
        <div className="w-16 h-16 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center mb-4">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
        </div>
        <p className="text-base text-slate-200 font-black">در حال بارگذاری ویزارد راه‌اندازی...</p>
        <p className="text-xs text-slate-400 mt-1">بررسی وضعیت دیتابیس و تنظیمات اولیه سامانه</p>
      </div>
    );
  }

  // Active step renderer resolver
  const activeStepType = isBusinessOnly ? (step === 1 ? 'business' : step === 2 ? 'fiscal' : step === 3 ? 'infrastructure' : step === 4 ? 'catalog' : 'review') : (step === 1 ? 'db' : step === 2 ? 'admin' : step === 3 ? 'business' : step === 4 ? 'fiscal' : step === 5 ? 'infrastructure' : step === 6 ? 'catalog' : 'review');

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between font-sans selection:bg-indigo-500 selection:text-white" style={{ direction: 'rtl' }}>
      
      {/* Top Header Bar */}
      <header className="border-b border-slate-800/90 bg-slate-900/95 backdrop-blur-md px-6 py-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center text-white shadow-lg shadow-indigo-600/30 border border-indigo-400/30">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
              {isBusinessOnly ? 'ویزارد تعریف و راه‌اندازی کسب‌وکار جدید' : 'ویزارد راه‌اندازی یکپارچه سیستم مالی و حسابداری'}
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-bold">نسخه استاندارد</span>
            </h1>
            <p className="text-xs text-slate-400">
              {isBusinessOnly ? 'پیکربندی هوشمند سال مالی، حساب‌های بانکی، انبار و کاتالوگ کسب‌وکار' : 'پیکربندی گام‌به‌گام دیتابیس، مشخصات تجاری، سال مالی و زیرساخت آغازین'}
            </p>
          </div>
        </div>

        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="text-xs text-slate-400 hover:text-white px-3.5 py-2 rounded-xl border border-slate-700 hover:border-slate-600 transition-colors cursor-pointer font-bold flex items-center gap-1.5"
          >
            <span>انصراف و بستن</span>
          </button>
        )}
      </header>

      {/* Main Wizard Container */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-8 flex flex-col justify-center">
        
        {/* Stepper Navigation */}
        <div className="mb-6">
          <div className={`grid gap-2 bg-slate-900/80 p-2 rounded-2xl border border-slate-800/80 shadow-2xl backdrop-blur-sm ${
            isBusinessOnly ? 'grid-cols-2 sm:grid-cols-5' : 'grid-cols-2 sm:grid-cols-4 lg:grid-cols-7'
          }`}>
            {stepsList.map((s) => {
              const isCurrent = step === s.id;
              const isDone = step > s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => s.id < step && setStep(s.id)}
                  className={`flex items-center gap-2.5 p-2 rounded-xl text-right transition-all cursor-pointer ${
                    isCurrent
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 ring-1 ring-indigo-400/40'
                      : isDone
                        ? 'bg-slate-800/70 text-slate-200 hover:bg-slate-800 border border-slate-700/60'
                        : 'text-slate-500 hover:text-slate-400 opacity-60'
                  }`}
                >
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-xs font-black ${
                    isCurrent
                      ? 'bg-white/20 text-white'
                      : isDone
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-slate-800 text-slate-400'
                  }`}>
                    {isDone ? <Check className="w-3.5 h-3.5" /> : s.id}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-black truncate leading-tight">{s.title}</div>
                    <div className="text-[10px] opacity-70 truncate hidden sm:block">{s.subtitle}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Form Card */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden backdrop-blur-md">
          
          {/* Global Error Alert */}
          {error && (
            <div className="mb-6 p-4 bg-rose-950/70 border border-rose-800 text-rose-200 rounded-2xl text-xs font-bold flex items-center justify-between gap-3 animate-in fade-in duration-200">
              <div className="flex items-center gap-2.5">
                <XCircle className="w-5 h-5 text-rose-400 shrink-0" />
                <span>{error}</span>
              </div>
              <button onClick={() => setError('')} className="text-rose-400 hover:text-rose-200 cursor-pointer">
                ✕
              </button>
            </div>
          )}

          {/* STEP 1: DATABASE */}
          {activeStepType === 'db' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="border-b border-slate-800 pb-4">
                <h2 className="text-lg font-black text-white flex items-center gap-2">
                  <Database className="w-5 h-5 text-indigo-400" />
                  مرحله ۱: انتخاب و پیکربندی موتور پایگاه داده
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  سیستم از ذخیره‌سازی محلی یکپارچه بدون سرور (JSON Local Database) و همچنین سرور مقیاس‌پذیر PostgreSQL / Cloud SQL پشتیبانی می‌کند.
                </p>
              </div>

              {/* Mode Selection Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div
                  onClick={() => setDbType('json')}
                  className={`p-5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                    dbType === 'json'
                      ? 'bg-indigo-950/50 border-indigo-500 text-white shadow-xl shadow-indigo-950/60 ring-1 ring-indigo-500/50'
                      : 'bg-slate-800/40 border-slate-700/60 text-slate-300 hover:bg-slate-800/80 hover:border-slate-600'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30">
                        <HardDrive className="w-5 h-5" />
                      </div>
                      {dbType === 'json' && (
                        <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-indigo-500 text-white flex items-center gap-1">
                          <Check className="w-3 h-3" /> انتخاب شده
                        </span>
                      )}
                    </div>
                    <h3 className="font-black text-sm text-white mb-1.5">پایگاه داده محلی توکار (JSON Storage)</h3>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      سریع‌ترین حالت راه‌اندازی بدون نیاز به نصب یا پیکربندی سرور دیتابیس جداگانه. ایده‌آل برای شروع فوری، سیستم‌های فروشگاهی مستقل و تست بدون وقفه.
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center gap-1.5 text-[11px] text-emerald-400 font-bold">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>موتور آماده به کار - بدون نیاز به پورت یا سرور</span>
                  </div>
                </div>

                <div
                  onClick={() => setDbType('postgres')}
                  className={`p-5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                    dbType === 'postgres'
                      ? 'bg-indigo-950/50 border-indigo-500 text-white shadow-xl shadow-indigo-950/60 ring-1 ring-indigo-500/50'
                      : 'bg-slate-800/40 border-slate-700/60 text-slate-300 hover:bg-slate-800/80 hover:border-slate-600'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-10 h-10 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center border border-sky-500/30">
                        <Server className="w-5 h-5" />
                      </div>
                      {dbType === 'postgres' && (
                        <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-indigo-500 text-white flex items-center gap-1">
                          <Check className="w-3 h-3" /> انتخاب شده
                        </span>
                      )}
                    </div>
                    <h3 className="font-black text-sm text-white mb-1.5">سرور پایگاه داده PostgreSQL / Cloud SQL</h3>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      اتصال سازمانی به سرور PostgreSQL برای پردازش حجم‌های کلان اسناد حسابداری، تراکنش‌های همزمان چندکاربره و پشتیبان‌گیری متمرکز شبکه.
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center gap-1.5 text-[11px] text-indigo-400 font-bold">
                    <Database className="w-3.5 h-3.5" />
                    <span>مقیاس‌پذیری نامحدود و قابلیت چندکاربره</span>
                  </div>
                </div>
              </div>

              {/* PostgreSQL Config Form */}
              {dbType === 'postgres' && (
                <div className="bg-slate-950/70 p-5 rounded-2xl border border-slate-800 space-y-4 animate-in slide-in-from-top-2 duration-200">
                  <div className="text-xs font-bold text-slate-200 flex items-center gap-2">
                    <Server className="w-4 h-4 text-sky-400" />
                    <span>مشخصات اتصال به سرور PostgreSQL:</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-slate-400 mb-1">آدرس سرور یا هاست (Host) *</label>
                      <input
                        type="text"
                        value={dbHost}
                        onChange={e => setDbHost(e.target.value)}
                        placeholder="localhost یا IP سرور دیتابیس"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-left text-xs focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 outline-none"
                        dir="ltr"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-400 mb-1">پورت (Port) *</label>
                      <input
                        type="text"
                        value={dbPort}
                        onChange={e => setDbPort(e.target.value)}
                        placeholder="5432"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-left text-xs focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 outline-none"
                        dir="ltr"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-400 mb-1">نام کاربری پایگاه داده (User) *</label>
                      <input
                        type="text"
                        value={dbUser}
                        onChange={e => setDbUser(e.target.value)}
                        placeholder="postgres"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-left text-xs focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 outline-none"
                        dir="ltr"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-400 mb-1">رمز عبور (Password)</label>
                      <input
                        type="password"
                        value={dbPass}
                        onChange={e => setDbPass(e.target.value)}
                        placeholder="رمز عبور کاربر دیتابیس"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-left text-xs focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 outline-none"
                        dir="ltr"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-1">نام پایگاه داده (Database Name) *</label>
                    <input
                      type="text"
                      value={dbName}
                      onChange={e => setDbName(e.target.value)}
                      placeholder="store_db"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-indigo-300 font-mono font-bold text-left text-xs focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 outline-none"
                      dir="ltr"
                    />
                  </div>
                </div>
              )}

              {/* DB Test Result Badge */}
              {dbTestResult && (
                <div className={`p-4 rounded-xl text-xs font-bold flex items-center gap-2.5 border ${
                  dbTestResult.success 
                    ? 'bg-emerald-950/70 border-emerald-800 text-emerald-300' 
                    : 'bg-rose-950/70 border-rose-800 text-rose-300'
                }`}>
                  {dbTestResult.success ? <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" /> : <XCircle className="w-5 h-5 shrink-0 text-rose-400" />}
                  <span>{dbTestResult.message}</span>
                </div>
              )}

              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleTestDb}
                  disabled={dbTesting}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold border border-slate-700 flex items-center gap-2 cursor-pointer transition-colors"
                >
                  {dbTesting ? <Loader2 className="w-4 h-4 animate-spin text-indigo-400" /> : <RefreshCw className="w-4 h-4 text-indigo-400" />}
                  <span>تست اتصال به موتور دیتابیس</span>
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: ADMIN USER */}
          {activeStepType === 'admin' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="border-b border-slate-800 pb-4">
                <h2 className="text-lg font-black text-white flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-indigo-400" />
                  مرحله ۲: تعریف حساب کاربری مدیر ارشد (امنیت سیستم)
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  این حساب با دسترسی کامل مدیر کل (Super Admin) برای مدیریت تنظیمات، کاربران، سال‌های مالی و صدور گزارشات تعریف می‌شود.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    نام و نام خانوادگی مدیر ارشد <span className="text-rose-400">*</span>
                  </label>
                  <div className="relative">
                    <UserPlus className="absolute right-3.5 top-3 w-4 h-4 text-slate-500" />
                    <input
                      type="text"
                      value={adminFullName}
                      onChange={e => setAdminFullName(e.target.value)}
                      placeholder="مثال: مهدی رضایی"
                      className="w-full pr-10 pl-3.5 py-2.5 rounded-xl bg-slate-950/70 border border-slate-700 text-white text-xs focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 outline-none font-bold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    نام کاربری ورود (Username) <span className="text-rose-400">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={adminUsername}
                      onChange={e => setAdminUsername(e.target.value)}
                      placeholder="admin"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/70 border border-slate-700 text-white font-mono text-left text-xs focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 outline-none font-bold"
                      dir="ltr"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="block text-xs font-bold text-slate-300">
                      کلمه عبور (Password) <span className="text-rose-400">*</span>
                    </label>
                    {adminPassword && (
                      <span className={`text-[10px] font-black ${
                        passwordStrength < 40 ? 'text-rose-400' : passwordStrength < 70 ? 'text-amber-400' : 'text-emerald-400'
                      }`}>
                        {passwordStrength < 40 ? 'ضعیف' : passwordStrength < 70 ? 'متوسط' : 'بسیار قوی'}
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <KeySquare className="absolute right-3.5 top-3 w-4 h-4 text-slate-500" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={adminPassword}
                      onChange={e => setAdminPassword(e.target.value)}
                      placeholder="حداقل ۶ کاراکتر"
                      className="w-full pr-10 pl-10 py-2.5 rounded-xl bg-slate-950/70 border border-slate-700 text-white font-mono text-left text-xs tracking-widest focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 outline-none"
                      dir="ltr"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute left-3 top-2.5 text-slate-500 hover:text-slate-300 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {/* Strength Bar */}
                  {adminPassword && (
                    <div className="h-1.5 w-full bg-slate-800 rounded-full mt-2 overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${
                          passwordStrength < 40 ? 'bg-rose-500' : passwordStrength < 70 ? 'bg-amber-500' : 'bg-emerald-500'
                        }`}
                        style={{ width: `${passwordStrength}%` }}
                      />
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    تکرار کلمه عبور <span className="text-rose-400">*</span>
                  </label>
                  <div className="relative">
                    <KeySquare className="absolute right-3.5 top-3 w-4 h-4 text-slate-500" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={adminPasswordConfirm}
                      onChange={e => setAdminPasswordConfirm(e.target.value)}
                      placeholder="تکرار رمز عبور"
                      className="w-full pr-10 pl-3.5 py-2.5 rounded-xl bg-slate-950/70 border border-slate-700 text-white font-mono text-left text-xs tracking-widest focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 outline-none"
                      dir="ltr"
                    />
                  </div>
                  {adminPasswordConfirm && adminPassword === adminPasswordConfirm && (
                    <p className="text-[10px] text-emerald-400 font-bold mt-1.5 flex items-center gap-1">
                      <Check className="w-3 h-3" /> کلمه عبور و تکرار آن منطبق هستند
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: BUSINESS PROFILE */}
          {activeStepType === 'business' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="border-b border-slate-800 pb-4">
                <h2 className="text-lg font-black text-white flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-indigo-400" />
                  {isBusinessOnly ? 'مرحله ۱: مشخصات و تنظیمات کسب‌وکار' : 'مرحله ۳: تعریف کسب‌وکار و تنظیمات اولیه تجاری'}
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  نام تجاری، واحد پول رسمی، نوع تقویم، صنف و مشخصات ارتباطی کسب‌وکار در این بخش تعیین می‌شود.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    نام فروشگاه یا عنوان کسب‌وکار <span className="text-rose-400">*</span>
                  </label>
                  <div className="relative">
                    <Store className="absolute right-3.5 top-3 w-4 h-4 text-slate-500" />
                    <input
                      type="text"
                      required
                      value={storeName}
                      onChange={e => setStoreName(e.target.value)}
                      placeholder="مثال: فروشگاه بزرگ رایانه پارس"
                      className="w-full pr-10 pl-3.5 py-2.5 rounded-xl bg-slate-950/70 border border-slate-700 text-white text-xs focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 outline-none font-bold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">نام رسمی / حقوقی ثبتی شرکت</label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={e => setCompanyName(e.target.value)}
                    placeholder="اختیاری - در صورت شرکت حقوقی ثبت شده"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/70 border border-slate-700 text-white text-xs focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">صنف و حوزه فعالیت</label>
                  <select
                    value={activityField}
                    onChange={e => setActivityField(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-950/70 border border-slate-700 text-white text-xs focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 outline-none"
                  >
                    <option value="خرده‌فروشی و بازرگانی">فروشگاهی و خرده‌فروشی</option>
                    <option value="عمده‌فروشی و توزیع">عمده‌فروشی، پخش و توزیع</option>
                    <option value="خدماتی و پیمانکاری">خدماتی، مهندسی و پیمانکاری</option>
                    <option value="تولیدی و کارگاهی">تولیدی، صنعتی و کارگاهی</option>
                    <option value="رستوران و فست‌فود">رستوران، کافه و فست‌فود</option>
                    <option value="آموزشی و درمانی">پزشکی، دارویی و آموزشی</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">واحد پول پایه سیستم</label>
                  <select
                    value={currency}
                    onChange={e => setCurrency(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-950/70 border border-slate-700 text-white text-xs focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 outline-none font-bold"
                  >
                    <option value="تومان">تومان (پیش‌فرض ایران)</option>
                    <option value="ریال">ریال (رسمی حسابداری)</option>
                    <option value="USD">دلار آمریکا (USD)</option>
                    <option value="EUR">یورو (EUR)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">نوع تقویم و گاه‌شماری</label>
                  <select
                    value={calendarType}
                    onChange={e => setCalendarType(e.target.value as any)}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-950/70 border border-slate-700 text-white text-xs focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 outline-none font-bold"
                  >
                    <option value="jalali">هجری شمسی (جلالی)</option>
                    <option value="gregorian">میلادی (Gregorian)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">شماره تلفن ثابت</label>
                  <div className="relative">
                    <Phone className="absolute right-3.5 top-3 w-4 h-4 text-slate-500" />
                    <input
                      type="text"
                      value={storePhone}
                      onChange={e => setStorePhone(e.target.value)}
                      placeholder="021-88888888"
                      className="w-full pr-10 pl-3.5 py-2.5 rounded-xl bg-slate-950/70 border border-slate-700 text-white font-mono text-left text-xs focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 outline-none"
                      dir="ltr"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">شماره همراه مدیریت</label>
                  <div className="relative">
                    <Phone className="absolute right-3.5 top-3 w-4 h-4 text-slate-500" />
                    <input
                      type="text"
                      value={storeMobile}
                      onChange={e => setStoreMobile(e.target.value)}
                      placeholder="09120000000"
                      className="w-full pr-10 pl-3.5 py-2.5 rounded-xl bg-slate-950/70 border border-slate-700 text-white font-mono text-left text-xs focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 outline-none"
                      dir="ltr"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">شناسه ملی / کد اقتصادی</label>
                  <input
                    type="text"
                    value={nationalId}
                    onChange={e => setNationalId(e.target.value)}
                    placeholder="اختیاری"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/70 border border-slate-700 text-white font-mono text-left text-xs focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 outline-none"
                    dir="ltr"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">درصد مالیات ارزش افزوده پیش‌فرض</label>
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <Percent className="absolute right-3.5 top-3 w-4 h-4 text-slate-500" />
                      <input
                        type="number"
                        value={taxPercent}
                        onChange={e => setTaxPercent(e.target.value)}
                        placeholder="0 یا 10"
                        className="w-full pr-10 pl-3.5 py-2.5 rounded-xl bg-slate-950/70 border border-slate-700 text-white font-mono text-left text-xs focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 outline-none font-bold"
                        dir="ltr"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setTaxPercent('0')}
                      className={`px-3 py-2.5 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                        taxPercent === '0' ? 'bg-indigo-600 text-white border-indigo-500' : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-750'
                      }`}
                    >
                      ۰٪ (معاف)
                    </button>
                    <button
                      type="button"
                      onClick={() => setTaxPercent('10')}
                      className={`px-3 py-2.5 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                        taxPercent === '10' ? 'bg-indigo-600 text-white border-indigo-500' : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-750'
                      }`}
                    >
                      ۱۰٪ (قانونی)
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">فرمت پیش‌فرض چاپ فاکتور</label>
                  <select
                    value={invoicePrintFormat}
                    onChange={e => setInvoicePrintFormat(e.target.value as any)}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-950/70 border border-slate-700 text-white text-xs focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 outline-none font-bold"
                  >
                    <option value="standard">فاکتور استاندارد A4 / A5 شرکتی</option>
                    <option value="official">فاکتور رسمی دارایی (ماده ۱۶۹)</option>
                    <option value="thermal">فیش حرارتی ۸۰ میلی‌متری (فروشگاهی / POS)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">نشانی و آدرس دفتر یا فروشگاه</label>
                <div className="relative">
                  <MapPin className="absolute right-3.5 top-3 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    value={storeAddress}
                    onChange={e => setStoreAddress(e.target.value)}
                    placeholder="تهران، خیابان ولیعصر، تقاطع ..."
                    className="w-full pr-10 pl-3.5 py-2.5 rounded-xl bg-slate-950/70 border border-slate-700 text-white text-xs focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: FISCAL YEAR */}
          {activeStepType === 'fiscal' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="border-b border-slate-800 pb-4">
                <h2 className="text-lg font-black text-white flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-indigo-400" />
                  {isBusinessOnly ? 'مرحله ۲: تعریف سال مالی کسب‌وکار' : 'مرحله ۴: تعریف دوره سال مالی برای کسب‌وکار'}
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  کلیه اسناد حسابداری دوبل، فاکتورها، انبارداری و ترازهای مالی بر اساس سال مالی فعال ثبت و تفکیک می‌شوند.
                </p>
              </div>

              {/* Quick Preset Buttons */}
              <div className="flex flex-wrap items-center gap-2 pb-1">
                <span className="text-xs text-slate-400 font-bold ml-1">دوره‌های سریع:</span>
                {calendarType === 'jalali' ? (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setFiscalYearName(`سال مالی ${currentJalaliYear}`);
                        setFiscalYearCode(`FY-${currentJalaliYear}`);
                        setFiscalYearStart(`${currentJalaliYear}/01/01`);
                        setFiscalYearEnd(`${currentJalaliYear}/12/29`);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-indigo-950/60 hover:bg-indigo-900 border border-indigo-700/60 text-indigo-200 text-xs font-bold transition-colors cursor-pointer"
                    >
                      سال مالی جاری ({currentJalaliYear})
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setFiscalYearName(`سال مالی ${currentJalaliYear + 1}`);
                        setFiscalYearCode(`FY-${currentJalaliYear + 1}`);
                        setFiscalYearStart(`${currentJalaliYear + 1}/01/01`);
                        setFiscalYearEnd(`${currentJalaliYear + 1}/12/29`);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs font-bold transition-colors cursor-pointer"
                    >
                      سال مالی آینده ({currentJalaliYear + 1})
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setFiscalYearName(`Fiscal Year ${currentGregorianYear}`);
                        setFiscalYearCode(`FY-${currentGregorianYear}`);
                        setFiscalYearStart(`${currentGregorianYear}-01-01`);
                        setFiscalYearEnd(`${currentGregorianYear}-12-31`);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-indigo-950/60 hover:bg-indigo-900 border border-indigo-700/60 text-indigo-200 text-xs font-bold transition-colors cursor-pointer"
                    >
                      Current Year ({currentGregorianYear})
                    </button>
                  </>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    عنوان دوره سال مالی <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={fiscalYearName}
                    onChange={e => setFiscalYearName(e.target.value)}
                    placeholder="مثال: سال مالی ۱۴۰۴"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/70 border border-slate-700 text-white text-xs font-bold focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    کد شناسایی دوره مالی <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={fiscalYearCode}
                    onChange={e => setFiscalYearCode(e.target.value)}
                    placeholder="FY-1404"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/70 border border-slate-700 text-indigo-300 font-mono text-left text-xs font-bold focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 outline-none"
                    dir="ltr"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    تاریخ شروع دوره مالی <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={fiscalYearStart}
                    onChange={e => setFiscalYearStart(e.target.value)}
                    placeholder={calendarType === 'jalali' ? '1404/01/01' : '2026-01-01'}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/70 border border-slate-700 text-white font-mono text-left text-xs focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 outline-none font-bold"
                    dir="ltr"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    تاریخ پایان دوره مالی <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={fiscalYearEnd}
                    onChange={e => setFiscalYearEnd(e.target.value)}
                    placeholder={calendarType === 'jalali' ? '1404/12/29' : '2026-12-31'}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/70 border border-slate-700 text-white font-mono text-left text-xs focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 outline-none font-bold"
                    dir="ltr"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">شرح و توضیحات افتتاح دوره مالی</label>
                <input
                  type="text"
                  value={fiscalYearDesc}
                  onChange={e => setFiscalYearDesc(e.target.value)}
                  placeholder="شرح افتتاحیه سال مالی جدید"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/70 border border-slate-700 text-white text-xs focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 outline-none"
                />
              </div>

              <div className="p-4 bg-indigo-950/40 rounded-2xl border border-indigo-900/60 flex items-center justify-between gap-3 text-xs text-indigo-200">
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-5 h-5 shrink-0 text-indigo-400" />
                  <span>این سال مالی بلافاصله پس از ایجاد به عنوان دوره فعال و باز (Status: Open) در سیستم قرار خواهد گرفت.</span>
                </div>
                <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-black text-[11px] shrink-0">
                  وضعیت: باز
                </span>
              </div>
            </div>
          )}

          {/* STEP 5: BANK, CASH & WAREHOUSE */}
          {activeStepType === 'infrastructure' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="border-b border-slate-800 pb-4">
                <h2 className="text-lg font-black text-white flex items-center gap-2">
                  <Landmark className="w-5 h-5 text-indigo-400" />
                  {isBusinessOnly ? 'مرحله ۳: زیرساخت مالی و عملیاتی (بانک، صندوق و انبار)' : 'مرحله ۵: زیرساخت مالی و عملیاتی (حساب بانکی، صندوق و انبار اصلی)'}
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  تعریف حداقل یک حساب بانکی، یک صندوق نقدی و یک انبار اصلی برای صدور فاکتورها، دریافت و پرداخت و گردش کالا.
                </p>
              </div>

              {/* Bank Account Section */}
              <div className="bg-slate-950/60 p-5 rounded-2xl border border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-black text-white">
                    <CreditCard className="w-4 h-4 text-emerald-400" />
                    <span>حساب بانکی افتتاحیه</span>
                  </div>
                  <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 font-bold">حساب پیش‌فرض دریافت/پرداخت</span>
                </div>

                {/* Popular Bank Selector */}
                <div>
                  <span className="block text-[11px] font-bold text-slate-400 mb-1.5">بانک‌های پرکاربرد:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {popularBanks.map(b => (
                      <button
                        key={b}
                        type="button"
                        onClick={() => setBankName(b)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                          bankName === b 
                            ? 'bg-emerald-600 text-white border border-emerald-500 shadow-sm' 
                            : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
                        }`}
                      >
                        {b}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">نام بانک *</label>
                    <input
                      type="text"
                      value={bankName}
                      onChange={e => setBankName(e.target.value)}
                      placeholder="بانک ملت"
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:ring-1 focus:ring-indigo-500 outline-none font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">شماره حساب</label>
                    <input
                      type="text"
                      value={bankAccountNumber}
                      onChange={e => setBankAccountNumber(e.target.value)}
                      placeholder="123456789"
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-left text-xs focus:ring-1 focus:ring-indigo-500 outline-none"
                      dir="ltr"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">موجودی اولیه ({currency})</label>
                    <input
                      type="number"
                      value={bankInitialBalance}
                      onChange={e => setBankInitialBalance(e.target.value)}
                      placeholder="0"
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-emerald-400 font-bold font-mono text-left text-xs focus:ring-1 focus:ring-indigo-500 outline-none"
                      dir="ltr"
                    />
                    {Number(bankInitialBalance) > 0 && (
                      <span className="block text-[10px] text-emerald-400/90 font-bold mt-1 truncate">
                        {numberToWords(bankInitialBalance)} {currency}
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">شماره کارت ۱۶ رقمی (اختیاری)</label>
                    <input
                      type="text"
                      value={bankCardNumber}
                      onChange={e => setBankCardNumber(e.target.value)}
                      placeholder="6104-3378-..."
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-left text-xs focus:ring-1 focus:ring-indigo-500 outline-none"
                      dir="ltr"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">شماره شبا (اختیاری)</label>
                    <input
                      type="text"
                      value={bankSheba}
                      onChange={e => setBankSheba(e.target.value)}
                      placeholder="IR123456789..."
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-left text-xs focus:ring-1 focus:ring-indigo-500 outline-none"
                      dir="ltr"
                    />
                  </div>
                </div>
              </div>

              {/* Cashbox & Warehouse Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Cashbox */}
                <div className="bg-slate-950/60 p-5 rounded-2xl border border-slate-800 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-black text-white">
                    <Wallet className="w-4 h-4 text-amber-400" />
                    <span>صندوق نقدینگی اول دوره</span>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">نام صندوق *</label>
                    <input
                      type="text"
                      value={cashboxName}
                      onChange={e => setCashboxName(e.target.value)}
                      placeholder="صندوق مرکزی"
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:ring-1 focus:ring-indigo-500 outline-none font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">موجودی نقدی اولیه ({currency})</label>
                    <input
                      type="number"
                      value={cashboxInitialBalance}
                      onChange={e => setCashboxInitialBalance(e.target.value)}
                      placeholder="0"
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-amber-400 font-bold font-mono text-left text-xs focus:ring-1 focus:ring-indigo-500 outline-none"
                      dir="ltr"
                    />
                    {Number(cashboxInitialBalance) > 0 && (
                      <span className="block text-[10px] text-amber-400/90 font-bold mt-1 truncate">
                        {numberToWords(cashboxInitialBalance)} {currency}
                      </span>
                    )}
                  </div>
                </div>

                {/* Warehouse */}
                <div className="bg-slate-950/60 p-5 rounded-2xl border border-slate-800 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-black text-white">
                    <Warehouse className="w-4 h-4 text-sky-400" />
                    <span>انبار پیش‌فرض کالاها</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 mb-1">نام انبار *</label>
                      <input
                        type="text"
                        value={warehouseName}
                        onChange={e => setWarehouseName(e.target.value)}
                        placeholder="انبار مرکزی"
                        className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:ring-1 focus:ring-indigo-500 outline-none font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 mb-1">کد انبار</label>
                      <input
                        type="text"
                        value={warehouseCode}
                        onChange={e => setWarehouseCode(e.target.value)}
                        placeholder="WH-01"
                        className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-sky-300 font-mono text-left text-xs focus:ring-1 focus:ring-indigo-500 outline-none"
                        dir="ltr"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">آدرس انبار</label>
                    <input
                      type="text"
                      value={warehouseAddress}
                      onChange={e => setWarehouseAddress(e.target.value)}
                      placeholder="دفتر و انبار مرکزی"
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:ring-1 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* STEP 6: CONTACTS & CATALOG */}
          {activeStepType === 'catalog' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="border-b border-slate-800 pb-4">
                <h2 className="text-lg font-black text-white flex items-center gap-2">
                  <PackagePlus className="w-5 h-5 text-indigo-400" />
                  {isBusinessOnly ? 'مرحله ۴: طرف‌های حساب و کاتالوگ کالای اولیه' : 'مرحله ۶: طرف‌های حساب (اشخاص) و کاتالوگ کالای آغازین'}
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  می‌توانید با یک کلیک از پکیج هوشمند شروع سریع استفاده نمایید یا مشخصات اولین شخص و کالای واقعی خود را وارد نمایید.
                </p>
              </div>

              {/* Starter Pack Option Selector */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div
                  onClick={() => setUseStarterPack(true)}
                  className={`p-5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                    useStarterPack
                      ? 'bg-indigo-950/50 border-indigo-500 text-white shadow-xl shadow-indigo-950/60 ring-1 ring-indigo-500/50'
                      : 'bg-slate-800/40 border-slate-700/60 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                        <Sparkles className="w-5 h-5" />
                      </div>
                      {useStarterPack && (
                        <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-emerald-500 text-white flex items-center gap-1">
                          <Check className="w-3 h-3" /> پیشنهاد شده
                        </span>
                      )}
                    </div>
                    <h3 className="font-black text-sm text-white mb-1.5">پکیج آغازین هوشمند (راه‌اندازی فوری با ۱ کلیک)</h3>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      ایجاد خودکار «مشتری عمومی (نقدی)»، «تامین‌کننده نمونه»، دسته‌بندی‌های استاندارد کالا و خدمات و کالاهای تستی همراه با موجودی انبار.
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-800/80 text-[11px] text-emerald-400 font-bold flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>آماده صدور آنی فاکتور فروش و خرید بلافاصله پس از ورود</span>
                  </div>
                </div>

                <div
                  onClick={() => setUseStarterPack(false)}
                  className={`p-5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                    !useStarterPack
                      ? 'bg-indigo-950/50 border-indigo-500 text-white shadow-xl shadow-indigo-950/60 ring-1 ring-indigo-500/50'
                      : 'bg-slate-800/40 border-slate-700/60 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
                        <Users className="w-5 h-5" />
                      </div>
                      {!useStarterPack && (
                        <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-indigo-500 text-white flex items-center gap-1">
                          <Check className="w-3 h-3" /> انتخاب شده
                        </span>
                      )}
                    </div>
                    <h3 className="font-black text-sm text-white mb-1.5">تعریف دستی اولین شخص و کالا</h3>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      اگر مایلید اولین مشتری یا تامین‌کننده واقعی خود و اولین محصول کاتالوگ تجاری را مستقیماً از ابتدا وارد فرمایید.
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-800/80 text-[11px] text-indigo-400 font-bold flex items-center gap-1.5">
                    <ShoppingBag className="w-3.5 h-3.5" />
                    <span>شخصی‌سازی دقیق مشخصات اختصاصی</span>
                  </div>
                </div>
              </div>

              {/* Custom Entry Fields (if starter pack disabled) */}
              {!useStarterPack && (
                <div className="space-y-4 pt-2 animate-in slide-in-from-top-2 duration-200">
                  {/* Person */}
                  <div className="bg-slate-950/60 p-5 rounded-2xl border border-slate-800 space-y-3">
                    <div className="text-xs font-bold text-white flex items-center gap-2">
                      <Users className="w-4 h-4 text-indigo-400" />
                      <span>اولین طرف حساب (شخص / شرکت)</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                      <div className="sm:col-span-2">
                        <label className="block text-[11px] font-bold text-slate-400 mb-1">نام شخص یا شرکت *</label>
                        <input
                          type="text"
                          value={customPersonName}
                          onChange={e => setCustomPersonName(e.target.value)}
                          placeholder="مشتری نقدی یا نام مشتری"
                          className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs outline-none focus:ring-1 focus:ring-indigo-500 font-bold"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-400 mb-1">شماره تماس</label>
                        <input
                          type="text"
                          value={customPersonPhone}
                          onChange={e => setCustomPersonPhone(e.target.value)}
                          placeholder="0912..."
                          className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-left text-xs outline-none focus:ring-1 focus:ring-indigo-500"
                          dir="ltr"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-400 mb-1">نقش طرف حساب</label>
                        <select
                          value={customPersonRole}
                          onChange={e => setCustomPersonRole(e.target.value as any)}
                          className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs outline-none focus:ring-1 focus:ring-indigo-500 font-bold"
                        >
                          <option value="customer">مشتری (خریدار)</option>
                          <option value="supplier">تامین‌کننده (فروشنده)</option>
                          <option value="both">مشتری و تامین‌کننده</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Product */}
                  <div className="bg-slate-950/60 p-5 rounded-2xl border border-slate-800 space-y-3">
                    <div className="text-xs font-bold text-white flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <ShoppingBag className="w-4 h-4 text-emerald-400" />
                        <span>اولین کالا یا خدمت</span>
                      </div>
                      {Number(customProductPurchasePrice) > 0 && Number(customProductSalePrice) > 0 && (
                        <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 font-bold">
                          حاشیه سود: {Math.round(((Number(customProductSalePrice) - Number(customProductPurchasePrice)) / Number(customProductPurchasePrice)) * 100)}٪
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-400 mb-1">نام کالا یا خدمت *</label>
                        <input
                          type="text"
                          value={customProductName}
                          onChange={e => setCustomProductName(e.target.value)}
                          placeholder="کالای نمونه"
                          className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs outline-none focus:ring-1 focus:ring-indigo-500 font-bold"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-400 mb-1">دسته‌بندی کالا</label>
                        <input
                          type="text"
                          value={customProductCategory}
                          onChange={e => setCustomProductCategory(e.target.value)}
                          placeholder="کالاهای عمومی"
                          className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-400 mb-1">واحد شمارش</label>
                        <input
                          type="text"
                          value={customProductUnit}
                          onChange={e => setCustomProductUnit(e.target.value)}
                          placeholder="عدد"
                          className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs outline-none focus:ring-1 focus:ring-indigo-500 font-bold"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-400 mb-1">قیمت خرید ({currency})</label>
                        <input
                          type="number"
                          value={customProductPurchasePrice}
                          onChange={e => setCustomProductPurchasePrice(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-left text-xs outline-none focus:ring-1 focus:ring-indigo-500 font-bold"
                          dir="ltr"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-400 mb-1">قیمت فروش ({currency})</label>
                        <input
                          type="number"
                          value={customProductSalePrice}
                          onChange={e => setCustomProductSalePrice(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-emerald-400 font-bold font-mono text-left text-xs outline-none focus:ring-1 focus:ring-indigo-500"
                          dir="ltr"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-400 mb-1">موجودی افتتاحیه در انبار</label>
                        <input
                          type="number"
                          value={customProductInitialStock}
                          onChange={e => setCustomProductInitialStock(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-sky-400 font-bold font-mono text-left text-xs outline-none focus:ring-1 focus:ring-indigo-500"
                          dir="ltr"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 7: REVIEW & LAUNCH */}
          {activeStepType === 'review' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="border-b border-slate-800 pb-4">
                <h2 className="text-lg font-black text-white flex items-center gap-2">
                  <Rocket className="w-5 h-5 text-indigo-400" />
                  {isBusinessOnly ? 'مرحله ۵: بازبینی نهایی و راه‌اندازی کسب‌وکار' : 'مرحله ۷: بازبینی نهایی و تکمیل راه‌اندازی سیستم'}
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  پیکربندی گام‌به‌گام با موفقیت تدوین شد. خلاصه‌ای از تنظیمات تعیین شده را در زیر مرور فرمایید.
                </p>
              </div>

              {/* Summary Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                
                {!isBusinessOnly && (
                  <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800">
                    <div className="flex items-center gap-2 text-indigo-400 text-xs font-bold mb-2">
                      <Database className="w-4 h-4" />
                      <span>موتور پایگاه داده</span>
                    </div>
                    <div className="text-sm font-black text-white">
                      {dbType === 'json' ? 'پایگاه داده محلی (JSON Storage)' : `PostgreSQL (${dbHost})`}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1">
                      {dbType === 'json' ? 'ذخیره‌سازی سریع محلی' : `دیتابیس: ${dbName}`}
                    </div>
                  </div>
                )}

                {!isBusinessOnly && (
                  <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800">
                    <div className="flex items-center gap-2 text-indigo-400 text-xs font-bold mb-2">
                      <ShieldCheck className="w-4 h-4" />
                      <span>حساب مدیر ارشد</span>
                    </div>
                    <div className="text-sm font-black text-white">{adminFullName}</div>
                    <div className="text-[11px] text-slate-400 mt-1 font-mono">کاربر: {adminUsername}</div>
                  </div>
                )}

                <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800">
                  <div className="flex items-center gap-2 text-indigo-400 text-xs font-bold mb-2">
                    <Store className="w-4 h-4" />
                    <span>مشخصات کسب‌وکار</span>
                  </div>
                  <div className="text-sm font-black text-white truncate">{storeName}</div>
                  <div className="text-[11px] text-emerald-400 mt-1 font-bold">واحد پول: {currency} ({calendarType === 'jalali' ? 'شمسی' : 'میلادی'})</div>
                </div>

                <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800">
                  <div className="flex items-center gap-2 text-indigo-400 text-xs font-bold mb-2">
                    <Calendar className="w-4 h-4" />
                    <span>سال مالی باز</span>
                  </div>
                  <div className="text-sm font-black text-white">{fiscalYearName}</div>
                  <div className="text-[11px] text-slate-400 mt-1 font-mono">{fiscalYearStart} تا {fiscalYearEnd}</div>
                </div>

                <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800">
                  <div className="flex items-center gap-2 text-indigo-400 text-xs font-bold mb-2">
                    <Landmark className="w-4 h-4" />
                    <span>حساب و انبارداری</span>
                  </div>
                  <div className="text-sm font-black text-white">{bankName} / {cashboxName}</div>
                  <div className="text-[11px] text-sky-400 mt-1">انبار اصلی: {warehouseName}</div>
                </div>

                <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800">
                  <div className="flex items-center gap-2 text-indigo-400 text-xs font-bold mb-2">
                    <PackagePlus className="w-4 h-4" />
                    <span>طرف حساب و کاتالوگ</span>
                  </div>
                  <div className="text-sm font-black text-white">
                    {useStarterPack ? 'پکیج هوشمند شروع سریع' : customProductName}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">
                    {useStarterPack ? 'مشتری نقدی، تامین‌کننده و کالاها' : `طرف حساب: ${customPersonName}`}
                  </div>
                </div>

              </div>

              <div className="p-4 bg-emerald-950/40 rounded-2xl border border-emerald-800/80 flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <div className="text-xs text-emerald-200 leading-relaxed">
                  <span className="font-black text-white block mb-0.5">آماده ایجاد و راه‌اندازی است!</span>
                  با فشردن دکمه زیر، تمام تعاریف و زیرساخت‌ها به صورت اتمیک ایجاد گردیده و مستقیماً وارد میز کار سامانه حسابداری خواهید شد.
                </div>
              </div>
            </div>
          )}

          {/* Action Navigation Footer */}
          <div className="mt-8 pt-5 border-t border-slate-800 flex items-center justify-between gap-3">
            <div>
              {step > 1 && (
                <button
                  type="button"
                  onClick={handlePrevStep}
                  disabled={saving}
                  className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all flex items-center gap-2 cursor-pointer border border-slate-700 disabled:opacity-50"
                >
                  <ArrowRight className="w-4 h-4" />
                  <span>مرحله قبل</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              {step < stepsList.length ? (
                <button
                  type="button"
                  onClick={handleNextStep}
                  className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black transition-all flex items-center gap-2 cursor-pointer shadow-lg shadow-indigo-600/30 hover:scale-[1.02] active:scale-[0.98]"
                >
                  <span>مرحله بعد</span>
                  <ArrowLeft className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleFinalSubmit}
                  disabled={saving}
                  className="px-8 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-black transition-all flex items-center gap-2 cursor-pointer shadow-xl shadow-emerald-600/30 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
                >
                  {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Rocket className="w-5 h-5" />}
                  <span>{isBusinessOnly ? 'ایجاد کسب‌وکار و راه‌اندازی دوره مالی' : 'تکمیل نهایی و ورود به نرم‌افزار'}</span>
                </button>
              )}
            </div>
          </div>

        </div>

      </main>

      {/* Footer Branding */}
      <footer className="text-center py-4 border-t border-slate-900 text-[11px] text-slate-500 font-sans">
        سیستم یکپارچه مدیریت مالی و حسابداری فروشگاهی · طراحی شده بر پایه استانداردهای نوین رابط کاربری
      </footer>

    </div>
  );
}
