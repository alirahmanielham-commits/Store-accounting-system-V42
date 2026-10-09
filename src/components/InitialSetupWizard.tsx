import React, { useState, useEffect, useMemo } from 'react';
import { 
  Database, Server, HardDrive, Loader2, CheckCircle2, XCircle, 
  UserPlus, ArrowLeft, ArrowRight, KeySquare, Building2, Store, 
  Calendar, Landmark, Wallet, Warehouse, Users, PackagePlus, 
  Rocket, ShieldCheck, Sparkles, RefreshCw, Eye, EyeOff,
  Phone, MapPin, Tag, Check, ChevronLeft, ChevronRight,
  CreditCard, Coins, ShoppingBag, ArrowUpRight, HelpCircle,
  FileText, Percent, Globe, AlertTriangle, PlusCircle
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
  const [autoCreateDbIfMissing, setAutoCreateDbIfMissing] = useState(true);
  const [dbTesting, setDbTesting] = useState(false);
  const [creatingMissingDb, setCreatingMissingDb] = useState(false);
  const [dbTestResult, setDbTestResult] = useState<{ 
    success: boolean; 
    message: string; 
    dbNotFound?: boolean;
    dbName?: string;
  } | null>(null);

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
        if (data.isComplete && !onCancel) {
          localStorage.setItem('activeStoreId', 'default');
          sessionStorage.setItem('activeStoreId', 'default');
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
      const targetDb = dbName?.trim() || 'store_db';
      const connStr = `postgresql://${auth}@${dbHost}:${dbPort}/${targetDb}`;
      const res = await fetch('/api/db/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connectionString: connStr, dbName: targetDb })
      });
      const data = await res.json();
      if (data.dbNotFound) {
        setDbTestResult({ 
          success: false, 
          dbNotFound: true,
          dbName: targetDb,
          message: data.message || `پایگاه داده «${targetDb}» در سرور PostgreSQL یافت نشد.` 
        });
      } else {
        setDbTestResult({ 
          success: data.success, 
          message: data.message || data.error,
          dbNotFound: false 
        });
      }
    } catch (err: any) {
      setDbTestResult({ success: false, message: err?.message || 'خطا در ارتباط با سرور' });
    } finally {
      setDbTesting(false);
    }
  };

  const handleCreateDatabaseConfirm = async () => {
    setCreatingMissingDb(true);
    try {
      const targetDb = dbName?.trim() || 'store_db';
      const auth = dbPass ? `${dbUser}:${encodeURIComponent(dbPass)}` : dbUser;
      const adminConnStr = `postgresql://${auth}@${dbHost}:${dbPort}/postgres`;
      const res = await fetch('/api/db/create-database', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          connectionString: adminConnStr,
          dbName: targetDb,
          host: dbHost,
          port: dbPort,
          user: dbUser,
          password: dbPass
        })
      });
      const data = await res.json();
      if (data.success) {
        setDbTestResult({
          success: true,
          dbNotFound: false,
          message: `پایگاه داده «${targetDb}» با تایید شما در سرور PostgreSQL ساخته شد و اتصال فعال گردید.`
        });
      } else {
        setDbTestResult({
          success: false,
          dbNotFound: true,
          message: data.error || 'خطا در ساخت خودکار پایگاه داده در سرور'
        });
      }
    } catch (e: any) {
      setDbTestResult({
        success: false,
        dbNotFound: true,
        message: e?.message || 'خطا در برقراری ارتباط با سرور دیتابیس'
      });
    } finally {
      setCreatingMissingDb(false);
    }
  };

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
        const payload = {
          dbConfig: {
            engine: dbType,
            host: dbHost,
            port: dbPort,
            user: dbUser,
            password: dbPass,
            dbName: dbName.trim() || 'store_db',
            autoCreate: autoCreateDbIfMissing
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
          // Explicitly set activeStoreId to prevent prompt modal on first load
          localStorage.setItem('activeStoreId', 'default');
          sessionStorage.setItem('activeStoreId', 'default');

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
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 text-slate-800 font-sans dir-rtl" style={{ direction: 'rtl' }}>
        <div className="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-200 flex items-center justify-center mb-4 shadow-sm">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        </div>
        <p className="text-base text-slate-900 font-black">در حال بارگذاری ویزارد راه‌اندازی...</p>
        <p className="text-xs text-slate-500 mt-1">بررسی وضعیت دیتابیس و تنظیمات اولیه سامانه</p>
      </div>
    );
  }

  const activeStepType = isBusinessOnly 
    ? (step === 1 ? 'business' : step === 2 ? 'fiscal' : step === 3 ? 'infrastructure' : step === 4 ? 'catalog' : 'review') 
    : (step === 1 ? 'db' : step === 2 ? 'admin' : step === 3 ? 'business' : step === 4 ? 'fiscal' : step === 5 ? 'infrastructure' : step === 6 ? 'catalog' : 'review');

  const progressPercent = Math.round((step / stepsList.length) * 100);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col justify-between font-sans selection:bg-indigo-600 selection:text-white" style={{ direction: 'rtl' }}>
      
      {/* Top Header Bar - Clean Light Theme */}
      <header className="border-b border-slate-200/90 bg-white/95 backdrop-blur-md px-6 py-4 flex items-center justify-between sticky top-0 z-50 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-600/25">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
              {isBusinessOnly ? 'ویزارد تعریف و راه‌اندازی کسب‌وکار جدید' : 'ویزارد راه‌اندازی یکپارچه سیستم مالی و حسابداری'}
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 font-bold">نسخه ۲.۵</span>
            </h1>
            <p className="text-xs text-slate-500">
              {isBusinessOnly ? 'پیکربندی هوشمند سال مالی، حساب‌های بانکی، انبار و کاتالوگ کسب‌وکار' : 'پیکربندی گام‌به‌گام دیتابیس، مشخصات تجاری، سال مالی و زیرساخت آغازین'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-2 text-xs font-bold text-slate-500">
            <span>پیشرفت:</span>
            <div className="w-28 h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
              <div 
                className="h-full bg-indigo-600 transition-all duration-300 rounded-full" 
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <span className="font-mono text-indigo-600">{progressPercent}٪</span>
          </div>

          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="text-xs text-slate-600 hover:text-slate-900 px-3.5 py-2 rounded-xl border border-slate-200 hover:border-slate-300 bg-white transition-colors cursor-pointer font-bold shadow-xs"
            >
              انصراف و بستن
            </button>
          )}
        </div>
      </header>

      {/* Main Wizard Container */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-8 flex flex-col justify-center">
        
        {/* Stepper Navigation */}
        <div className="mb-6">
          <div className={`grid gap-2 bg-white p-2 rounded-2xl border border-slate-200/90 shadow-sm ${
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
                  className={`flex items-center gap-2.5 p-2.5 rounded-xl text-right transition-all cursor-pointer ${
                    isCurrent
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25 ring-2 ring-indigo-500/20'
                      : isDone
                        ? 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100/70 border border-emerald-200/80'
                        : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-xs font-black ${
                    isCurrent
                      ? 'bg-white/20 text-white'
                      : isDone
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-100 text-slate-500'
                  }`}>
                    {isDone ? <Check className="w-3.5 h-3.5" /> : s.id}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-black truncate leading-tight">{s.title}</div>
                    <div className="text-[10px] opacity-75 truncate hidden sm:block">{s.subtitle}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Form Card - Elegant Light Design */}
        <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-xl shadow-slate-200/50 relative overflow-hidden">
          
          {/* Global Error Alert */}
          {error && (
            <div className="mb-6 p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs font-bold flex items-center justify-between gap-3 animate-in fade-in duration-200">
              <div className="flex items-center gap-2.5">
                <XCircle className="w-5 h-5 text-rose-500 shrink-0" />
                <span>{error}</span>
              </div>
              <button onClick={() => setError('')} className="text-rose-500 hover:text-rose-700 cursor-pointer">
                ✕
              </button>
            </div>
          )}

          {/* STEP 1: DATABASE */}
          {activeStepType === 'db' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="border-b border-slate-100 pb-4">
                <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <Database className="w-5 h-5 text-indigo-600" />
                  مرحله ۱: انتخاب و پیکربندی موتور پایگاه داده
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  سامانه از دو حالت ذخیره‌سازی محلی فایل‌محور (JSON Local Database) و سرور سازمانی PostgreSQL / Cloud SQL پشتیبانی می‌کند.
                </p>
              </div>

              {/* Mode Selection Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div
                  onClick={() => setDbType('json')}
                  className={`p-5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                    dbType === 'json'
                      ? 'bg-indigo-50/70 border-indigo-500 text-slate-900 ring-2 ring-indigo-500/20 shadow-sm'
                      : 'bg-slate-50/60 border-slate-200 text-slate-700 hover:bg-slate-100/70 hover:border-slate-300'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center border border-indigo-200">
                        <HardDrive className="w-5 h-5" />
                      </div>
                      {dbType === 'json' && (
                        <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-indigo-600 text-white flex items-center gap-1 shadow-xs">
                          <Check className="w-3 h-3" /> انتخاب شده
                        </span>
                      )}
                    </div>
                    <h3 className="font-black text-sm text-slate-900 mb-1.5">پایگاه داده محلی توکار (JSON Storage)</h3>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      سریع‌ترین حالت راه‌اندازی بدون نیاز به سرور دیتابیس جداگانه. ایده‌آل برای شروع سریع، سیستم‌های مستقل و محیط پیش‌نمایش.
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-200/70 flex items-center gap-1.5 text-[11px] text-emerald-700 font-bold">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>موتور آماده به کار - بدون نیاز به تنظیمات سرور</span>
                  </div>
                </div>

                <div
                  onClick={() => setDbType('postgres')}
                  className={`p-5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                    dbType === 'postgres'
                      ? 'bg-indigo-50/70 border-indigo-500 text-slate-900 ring-2 ring-indigo-500/20 shadow-sm'
                      : 'bg-slate-50/60 border-slate-200 text-slate-700 hover:bg-slate-100/70 hover:border-slate-300'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-10 h-10 rounded-xl bg-sky-100 text-sky-600 flex items-center justify-center border border-sky-200">
                        <Server className="w-5 h-5" />
                      </div>
                      {dbType === 'postgres' && (
                        <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-indigo-600 text-white flex items-center gap-1 shadow-xs">
                          <Check className="w-3 h-3" /> انتخاب شده
                        </span>
                      )}
                    </div>
                    <h3 className="font-black text-sm text-slate-900 mb-1.5">سرور پایگاه داده PostgreSQL / Cloud SQL</h3>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      اتصال سازمانی به PostgreSQL برای حجم‌های بزرگ مالی و چندین کاربر همزمان با قفل‌های تراکنشی سخت‌گیرانه.
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-200/70 flex items-center gap-1.5 text-[11px] text-indigo-700 font-bold">
                    <Database className="w-3.5 h-3.5" />
                    <span>قابلیت مقیاس‌پذیری بالا و تراکنش‌های همزمان</span>
                  </div>
                </div>
              </div>

              {/* PostgreSQL Config Form */}
              {dbType === 'postgres' && (
                <div className="bg-slate-50/90 p-5 rounded-2xl border border-slate-200 space-y-4 animate-in slide-in-from-top-2 duration-200">
                  <div className="text-xs font-bold text-slate-800 flex items-center gap-2">
                    <Server className="w-4 h-4 text-sky-600" />
                    <span>مشخصات اتصال به سرور PostgreSQL:</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-slate-700 mb-1">آدرس سرور یا هاست (Host) *</label>
                      <input
                        type="text"
                        value={dbHost}
                        onChange={e => setDbHost(e.target.value)}
                        placeholder="localhost یا IP سرور دیتابیس"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 font-mono text-left text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-none"
                        dir="ltr"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">پورت (Port) *</label>
                      <input
                        type="text"
                        value={dbPort}
                        onChange={e => setDbPort(e.target.value)}
                        placeholder="5432"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 font-mono text-left text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-none"
                        dir="ltr"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">نام کاربری پایگاه داده (User) *</label>
                      <input
                        type="text"
                        value={dbUser}
                        onChange={e => setDbUser(e.target.value)}
                        placeholder="postgres"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 font-mono text-left text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-none"
                        dir="ltr"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">رمز عبور (Password)</label>
                      <input
                        type="password"
                        value={dbPass}
                        onChange={e => setDbPass(e.target.value)}
                        placeholder="رمز عبور دیتابیس"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 font-mono text-left text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-none"
                        dir="ltr"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">نام پایگاه داده (Database Name) *</label>
                      <input
                        type="text"
                        value={dbName}
                        onChange={e => setDbName(e.target.value)}
                        placeholder="store_db"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-indigo-700 font-mono font-bold text-left text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-none"
                        dir="ltr"
                      />
                    </div>

                    <div className="pt-5">
                      <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700">
                        <input
                          type="checkbox"
                          checked={autoCreateDbIfMissing}
                          onChange={e => setAutoCreateDbIfMissing(e.target.checked)}
                          className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                        />
                        <span>ایجاد خودکار دیتابیس در سرور در صورت عدم وجود (با تایید کاربر)</span>
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* DB Test Result Badge & Confirmation Banner */}
              {dbTestResult && (
                <div className={`p-4 rounded-2xl text-xs font-bold border ${
                  dbTestResult.success 
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                    : dbTestResult.dbNotFound
                      ? 'bg-amber-50 border-amber-200 text-amber-900'
                      : 'bg-rose-50 border-rose-200 text-rose-800'
                }`}>
                  <div className="flex items-center gap-2.5">
                    {dbTestResult.success ? (
                      <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" />
                    ) : dbTestResult.dbNotFound ? (
                      <AlertTriangle className="w-5 h-5 shrink-0 text-amber-600" />
                    ) : (
                      <XCircle className="w-5 h-5 shrink-0 text-rose-600" />
                    )}
                    <span className="flex-1">{dbTestResult.message}</span>
                  </div>

                  {/* Explicit User Confirmation Button to create database if not found */}
                  {dbTestResult.dbNotFound && (
                    <div className="mt-3 pt-3 border-t border-amber-200/80 flex items-center justify-between gap-3">
                      <p className="text-[11px] text-amber-800 font-normal">
                        برای ادامه کار، پایگاه داده «<span className="font-mono font-bold">{dbName}</span>» باید در سرور PostgreSQL ایجاد شود.
                      </p>
                      <button
                        type="button"
                        onClick={handleCreateDatabaseConfirm}
                        disabled={creatingMissingDb}
                        className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer disabled:opacity-50 shrink-0"
                      >
                        {creatingMissingDb ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlusCircle className="w-4 h-4" />}
                        <span>تایید و ساخت خودکار دیتابیس</span>
                      </button>
                    </div>
                  )}
                </div>
              )}

              <div className="pt-2 flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleTestDb}
                  disabled={dbTesting}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold border border-slate-200 flex items-center gap-2 cursor-pointer transition-colors shadow-xs"
                >
                  {dbTesting ? <Loader2 className="w-4 h-4 animate-spin text-indigo-600" /> : <RefreshCw className="w-4 h-4 text-indigo-600" />}
                  <span>تست اتصال به پایگاه داده</span>
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: ADMIN USER */}
          {activeStepType === 'admin' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="border-b border-slate-100 pb-4">
                <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-indigo-600" />
                  مرحله ۲: تعریف مدیر ارشد و امنیت سیستم
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  این حساب با دسترسی کامل و نامحدود مدیریتی به تمام اسناد، فاکتورها، کاربران و تنظیمات سامانه ایجاد می‌شود.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    نام و نام خانوادگی مدیر ارشد <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <UserPlus className="absolute right-3.5 top-3 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      value={adminFullName}
                      onChange={e => setAdminFullName(e.target.value)}
                      placeholder="مثال: مهدی رضایی"
                      className="w-full pr-10 pl-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:bg-white outline-none font-bold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    نام کاربری ورود (Username) <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={adminUsername}
                      onChange={e => setAdminUsername(e.target.value)}
                      placeholder="admin"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 font-mono text-left text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:bg-white outline-none font-bold"
                      dir="ltr"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="block text-xs font-bold text-slate-700">
                      کلمه عبور (Password) <span className="text-rose-500">*</span>
                    </label>
                    {adminPassword && (
                      <span className={`text-[10px] font-black ${
                        passwordStrength < 40 ? 'text-rose-600' : passwordStrength < 70 ? 'text-amber-600' : 'text-emerald-600'
                      }`}>
                        {passwordStrength < 40 ? 'ضعیف' : passwordStrength < 70 ? 'متوسط' : 'بسیار قوی'}
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <KeySquare className="absolute right-3.5 top-3 w-4 h-4 text-slate-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={adminPassword}
                      onChange={e => setAdminPassword(e.target.value)}
                      placeholder="حداقل ۶ کاراکتر"
                      className="w-full pr-10 pl-10 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 font-mono text-left text-xs tracking-widest focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:bg-white outline-none"
                      dir="ltr"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute left-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {/* Strength Bar */}
                  {adminPassword && (
                    <div className="h-1.5 w-full bg-slate-100 rounded-full mt-2 overflow-hidden border border-slate-200">
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
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    تکرار کلمه عبور <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <KeySquare className="absolute right-3.5 top-3 w-4 h-4 text-slate-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={adminPasswordConfirm}
                      onChange={e => setAdminPasswordConfirm(e.target.value)}
                      placeholder="تکرار رمز عبور"
                      className="w-full pr-10 pl-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 font-mono text-left text-xs tracking-widest focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:bg-white outline-none"
                      dir="ltr"
                    />
                  </div>
                  {adminPasswordConfirm && adminPassword === adminPasswordConfirm && (
                    <p className="text-[10px] text-emerald-700 font-bold mt-1.5 flex items-center gap-1">
                      <Check className="w-3 h-3" /> کلمه عبور و تکرار آن یکسان هستند
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: BUSINESS PROFILE */}
          {activeStepType === 'business' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="border-b border-slate-100 pb-4">
                <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-indigo-600" />
                  {isBusinessOnly ? 'مرحله ۱: مشخصات و تنظیمات کسب‌وکار' : 'مرحله ۳: مشخصات و تنظیمات اولیه کسب‌وکار'}
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  نام تجاری، واحد پول رسمی، تقویم و اطلاعات ارتباطی فروشگاه در این بخش ثبت می‌شود.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    نام فروشگاه / کسب‌وکار <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Store className="absolute right-3.5 top-3 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      required
                      value={storeName}
                      onChange={e => setStoreName(e.target.value)}
                      placeholder="مثال: فروشگاه بزرگ رایانه یا شرکت آرتان"
                      className="w-full pr-10 pl-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:bg-white outline-none font-bold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">نام رسمی / حقوقی شرکت</label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={e => setCompanyName(e.target.value)}
                    placeholder="اختیاری - در صورت شرکت رسمی"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:bg-white outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">حوزه فعالیت</label>
                  <select
                    value={activityField}
                    onChange={e => setActivityField(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:bg-white outline-none"
                  >
                    <option value="خرده‌فروشی و بازرگانی">خرده‌فروشی و فروشگاهی</option>
                    <option value="عمده‌فروشی و توزیع">عمده‌فروشی و پخش</option>
                    <option value="خدماتی و پیمانکاری">خدماتی و مهندسی</option>
                    <option value="تولیدی و کارگاهی">تولیدی و صنعتی</option>
                    <option value="رستوران و فست‌فود">رستوران و کافه</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">واحد پول پیش‌فرض</label>
                  <select
                    value={currency}
                    onChange={e => setCurrency(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:bg-white outline-none font-bold"
                  >
                    <option value="تومان">تومان (پیش‌فرض ایران)</option>
                    <option value="ریال">ریال (رسمی)</option>
                    <option value="USD">دلار آمریکا (USD)</option>
                    <option value="EUR">یورو (EUR)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">نوع تقویم سیستم</label>
                  <select
                    value={calendarType}
                    onChange={e => setCalendarType(e.target.value as any)}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:bg-white outline-none font-bold"
                  >
                    <option value="jalali">هجری شمسی (جلالی)</option>
                    <option value="gregorian">میلادی (Gregorian)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">شماره تلفن ثابت یا همراه</label>
                  <div className="relative">
                    <Phone className="absolute right-3.5 top-3 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      value={storePhone}
                      onChange={e => setStorePhone(e.target.value)}
                      placeholder="021-88888888"
                      className="w-full pr-10 pl-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 font-mono text-left text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:bg-white outline-none"
                      dir="ltr"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">شماره همراه مدیریت</label>
                  <div className="relative">
                    <Phone className="absolute right-3.5 top-3 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      value={storeMobile}
                      onChange={e => setStoreMobile(e.target.value)}
                      placeholder="09120000000"
                      className="w-full pr-10 pl-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 font-mono text-left text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:bg-white outline-none"
                      dir="ltr"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">شناسه ملی / کد اقتصادی</label>
                  <input
                    type="text"
                    value={nationalId}
                    onChange={e => setNationalId(e.target.value)}
                    placeholder="اختیاری"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 font-mono text-left text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:bg-white outline-none"
                    dir="ltr"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">درصد مالیات ارزش افزوده پیش‌فرض</label>
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <Percent className="absolute right-3.5 top-3 w-4 h-4 text-slate-400" />
                      <input
                        type="number"
                        value={taxPercent}
                        onChange={e => setTaxPercent(e.target.value)}
                        placeholder="0 یا 10"
                        className="w-full pr-10 pl-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 font-mono text-left text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:bg-white outline-none font-bold"
                        dir="ltr"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setTaxPercent('0')}
                      className={`px-3 py-2.5 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                        taxPercent === '0' ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs' : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                      }`}
                    >
                      ۰٪ (معاف)
                    </button>
                    <button
                      type="button"
                      onClick={() => setTaxPercent('10')}
                      className={`px-3 py-2.5 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                        taxPercent === '10' ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs' : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                      }`}
                    >
                      ۱۰٪ (قانونی)
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">فرمت پیش‌فرض چاپ فاکتور</label>
                  <select
                    value={invoicePrintFormat}
                    onChange={e => setInvoicePrintFormat(e.target.value as any)}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:bg-white outline-none font-bold"
                  >
                    <option value="standard">فاکتور استاندارد A4 / A5 شرکتی</option>
                    <option value="official">فاکتور رسمی دارایی (ماده ۱۶۹)</option>
                    <option value="thermal">فیش حرارتی ۸۰ میلی‌متری (فروشگاهی / POS)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">نشانی و آدرس کسب‌وکار</label>
                <div className="relative">
                  <MapPin className="absolute right-3.5 top-3 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={storeAddress}
                    onChange={e => setStoreAddress(e.target.value)}
                    placeholder="تهران، خیابان ولیعصر، پلاک ..."
                    className="w-full pr-10 pl-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:bg-white outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: FISCAL YEAR */}
          {activeStepType === 'fiscal' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="border-b border-slate-100 pb-4">
                <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-indigo-600" />
                  {isBusinessOnly ? 'مرحله ۲: تعریف سال مالی کسب‌وکار' : 'مرحله ۴: تعریف سال مالی کسب‌وکار'}
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  تمامی اسناد حسابداری، فاکتورها، انبارداری و ترازهای مالی بر اساس سال مالی باز ردیابی می‌شوند.
                </p>
              </div>

              {/* Quick Presets */}
              <div className="flex flex-wrap items-center gap-2 pb-1">
                <span className="text-xs text-slate-500 font-bold ml-1">دوره‌های سریع:</span>
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
                      className="px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 text-xs font-bold transition-colors cursor-pointer"
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
                      className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
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
                      className="px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 text-xs font-bold transition-colors cursor-pointer"
                    >
                      Current Year ({currentGregorianYear})
                    </button>
                  </>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    عنوان دوره مالی <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={fiscalYearName}
                    onChange={e => setFiscalYearName(e.target.value)}
                    placeholder={`سال مالی ${currentJalaliYear}`}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 text-xs font-bold focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:bg-white outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">کد شناسایی سال مالی *</label>
                  <input
                    type="text"
                    value={fiscalYearCode}
                    onChange={e => setFiscalYearCode(e.target.value)}
                    placeholder={`FY-${currentJalaliYear}`}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-indigo-700 font-mono text-left text-xs font-bold focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:bg-white outline-none"
                    dir="ltr"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    تاریخ شروع سال مالی <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={fiscalYearStart}
                    onChange={e => setFiscalYearStart(e.target.value)}
                    placeholder={calendarType === 'jalali' ? `${currentJalaliYear}/01/01` : `${currentGregorianYear}-01-01`}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 font-mono text-left text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:bg-white outline-none font-bold"
                    dir="ltr"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    تاریخ پایان سال مالی <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={fiscalYearEnd}
                    onChange={e => setFiscalYearEnd(e.target.value)}
                    placeholder={calendarType === 'jalali' ? `${currentJalaliYear}/12/29` : `${currentGregorianYear}-12-31`}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 font-mono text-left text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:bg-white outline-none font-bold"
                    dir="ltr"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">توضیحات و شرح افتتاح دوره</label>
                <input
                  type="text"
                  value={fiscalYearDesc}
                  onChange={e => setFiscalYearDesc(e.target.value)}
                  placeholder="افتتاحیه سال مالی جدید"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:bg-white outline-none"
                />
              </div>

              <div className="p-4 bg-indigo-50/70 rounded-2xl border border-indigo-200/80 flex items-center justify-between gap-2 text-xs text-indigo-900">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-indigo-600" />
                  <span>این دوره مالی به صورت خودکار به عنوان دوره فعال و باز (Status: Open) در سیستم قرار خواهد گرفت.</span>
                </div>
                <span className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold text-[11px] shrink-0">
                  وضعیت: باز
                </span>
              </div>
            </div>
          )}

          {/* STEP 5: BANK, CASH & WAREHOUSE */}
          {activeStepType === 'infrastructure' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="border-b border-slate-100 pb-4">
                <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <Landmark className="w-5 h-5 text-indigo-600" />
                  {isBusinessOnly ? 'مرحله ۳: زیرساخت مالی و عملیاتی (بانک، صندوق و انبار)' : 'مرحله ۵: زیرساخت مالی و عملیاتی (بانک، صندوق و انبار)'}
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  تعریف حداقل یک حساب بانکی، صندوق نقدینگی و انبار اصلی برای انجام دریافت، پرداخت و گردش کالا.
                </p>
              </div>

              {/* Bank Account Section */}
              <div className="bg-slate-50/90 p-5 rounded-2xl border border-slate-200 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-black text-slate-900">
                    <CreditCard className="w-4 h-4 text-emerald-600" />
                    <span>حساب بانکی اولیه</span>
                  </div>
                  <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 font-bold">پیش‌فرض دریافت و پرداخت</span>
                </div>

                {/* Popular Bank Selector */}
                <div>
                  <span className="block text-[11px] font-bold text-slate-500 mb-1.5">بانک‌های پرکاربرد:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {popularBanks.map(b => (
                      <button
                        key={b}
                        type="button"
                        onClick={() => setBankName(b)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                          bankName === b 
                            ? 'bg-emerald-600 text-white border border-emerald-600 shadow-xs' 
                            : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                        }`}
                      >
                        {b}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">نام بانک *</label>
                    <input
                      type="text"
                      value={bankName}
                      onChange={e => setBankName(e.target.value)}
                      placeholder="بانک ملت"
                      className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs focus:ring-1 focus:ring-indigo-500 outline-none font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">شماره حساب</label>
                    <input
                      type="text"
                      value={bankAccountNumber}
                      onChange={e => setBankAccountNumber(e.target.value)}
                      placeholder="123456789"
                      className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 font-mono text-left text-xs focus:ring-1 focus:ring-indigo-500 outline-none"
                      dir="ltr"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">موجودی اولیه ({currency})</label>
                    <input
                      type="number"
                      value={bankInitialBalance}
                      onChange={e => setBankInitialBalance(e.target.value)}
                      placeholder="0"
                      className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-emerald-700 font-bold font-mono text-left text-xs focus:ring-1 focus:ring-indigo-500 outline-none"
                      dir="ltr"
                    />
                    {Number(bankInitialBalance) > 0 && (
                      <span className="block text-[10px] text-emerald-700 font-bold mt-1 truncate">
                        {numberToWords(bankInitialBalance)} {currency}
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">شماره کارت (اختیاری)</label>
                    <input
                      type="text"
                      value={bankCardNumber}
                      onChange={e => setBankCardNumber(e.target.value)}
                      placeholder="6104-3378-..."
                      className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 font-mono text-left text-xs focus:ring-1 focus:ring-indigo-500 outline-none"
                      dir="ltr"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">شماره شبا (اختیاری)</label>
                    <input
                      type="text"
                      value={bankSheba}
                      onChange={e => setBankSheba(e.target.value)}
                      placeholder="IR123456789..."
                      className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 font-mono text-left text-xs focus:ring-1 focus:ring-indigo-500 outline-none"
                      dir="ltr"
                    />
                  </div>
                </div>
              </div>

              {/* Cashbox & Warehouse Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Cashbox */}
                <div className="bg-slate-50/90 p-5 rounded-2xl border border-slate-200 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-black text-slate-900">
                    <Wallet className="w-4 h-4 text-amber-600" />
                    <span>صندوق نقدی اولیه</span>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">نام صندوق *</label>
                    <input
                      type="text"
                      value={cashboxName}
                      onChange={e => setCashboxName(e.target.value)}
                      placeholder="صندوق مرکزی"
                      className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs focus:ring-1 focus:ring-indigo-500 outline-none font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">موجودی نقدی اولیه ({currency})</label>
                    <input
                      type="number"
                      value={cashboxInitialBalance}
                      onChange={e => setCashboxInitialBalance(e.target.value)}
                      placeholder="0"
                      className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-amber-700 font-bold font-mono text-left text-xs focus:ring-1 focus:ring-indigo-500 outline-none"
                      dir="ltr"
                    />
                    {Number(cashboxInitialBalance) > 0 && (
                      <span className="block text-[10px] text-amber-700 font-bold mt-1 truncate">
                        {numberToWords(cashboxInitialBalance)} {currency}
                      </span>
                    )}
                  </div>
                </div>

                {/* Warehouse */}
                <div className="bg-slate-50/90 p-5 rounded-2xl border border-slate-200 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-black text-slate-900">
                    <Warehouse className="w-4 h-4 text-sky-600" />
                    <span>انبار پیش‌فرض کالاها</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">نام انبار *</label>
                      <input
                        type="text"
                        value={warehouseName}
                        onChange={e => setWarehouseName(e.target.value)}
                        placeholder="انبار مرکزی"
                        className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs focus:ring-1 focus:ring-indigo-500 outline-none font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">کد انبار</label>
                      <input
                        type="text"
                        value={warehouseCode}
                        onChange={e => setWarehouseCode(e.target.value)}
                        placeholder="WH-01"
                        className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-sky-700 font-mono text-left text-xs focus:ring-1 focus:ring-indigo-500 outline-none"
                        dir="ltr"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">آدرس انبار</label>
                    <input
                      type="text"
                      value={warehouseAddress}
                      onChange={e => setWarehouseAddress(e.target.value)}
                      placeholder="دفتر مرکزی فروشگاه"
                      className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs focus:ring-1 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* STEP 6: CONTACTS & CATALOG */}
          {activeStepType === 'catalog' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="border-b border-slate-100 pb-4">
                <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <PackagePlus className="w-5 h-5 text-indigo-600" />
                  {isBusinessOnly ? 'مرحله ۴: طرف‌های حساب و کاتالوگ کالای اولیه' : 'مرحله ۶: طرف‌های حساب و کاتالوگ کالای اولیه'}
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  می‌توانید از پکیج شروع سریع آماده استفاده کنید یا اولین شخص و کالای خود را دستی وارد نمایید.
                </p>
              </div>

              {/* Starter Pack Option Selector */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div
                  onClick={() => setUseStarterPack(true)}
                  className={`p-5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                    useStarterPack
                      ? 'bg-indigo-50/70 border-indigo-500 text-slate-900 ring-2 ring-indigo-500/20 shadow-sm'
                      : 'bg-slate-50/60 border-slate-200 text-slate-700 hover:bg-slate-100/70 hover:border-slate-300'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center border border-emerald-200">
                        <Sparkles className="w-5 h-5" />
                      </div>
                      {useStarterPack && (
                        <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-emerald-600 text-white flex items-center gap-1 shadow-xs">
                          <Check className="w-3 h-3" /> توصیه شده
                        </span>
                      )}
                    </div>
                    <h3 className="font-black text-sm text-slate-900 mb-1.5">پکیج شروع سریع هوشمند (یک کلیک)</h3>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      ایجاد خودکار «مشتری عمومی نقدی»، «تامین‌کننده اصلی»، دسته‌بندی‌های استاندارد کالا و ۲ قلم کالای نمونه تستی.
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-200/70 text-[11px] text-emerald-700 font-bold flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>آماده ثبت فوری فاکتور فروش بلافاصله پس از ورود</span>
                  </div>
                </div>

                <div
                  onClick={() => setUseStarterPack(false)}
                  className={`p-5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                    !useStarterPack
                      ? 'bg-indigo-50/70 border-indigo-500 text-slate-900 ring-2 ring-indigo-500/20 shadow-sm'
                      : 'bg-slate-50/60 border-slate-200 text-slate-700 hover:bg-slate-100/70 hover:border-slate-300'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center border border-amber-200">
                        <Users className="w-5 h-5" />
                      </div>
                      {!useStarterPack && (
                        <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-indigo-600 text-white flex items-center gap-1 shadow-xs">
                          <Check className="w-3 h-3" /> انتخاب شده
                        </span>
                      )}
                    </div>
                    <h3 className="font-black text-sm text-slate-900 mb-1.5">تعریف دستی شخص و کالا</h3>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      اگر می‌خواهید کالاها و طرف‌های حساب واقعی کسب‌وکار خود را مستقیماً از ابتدا وارد کنید.
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-200/70 text-[11px] text-indigo-700 font-bold flex items-center gap-1.5">
                    <ShoppingBag className="w-3.5 h-3.5" />
                    <span>ورود اطلاعات اختصاصی شما</span>
                  </div>
                </div>
              </div>

              {/* Custom Entry Fields (if starter pack disabled) */}
              {!useStarterPack && (
                <div className="space-y-4 pt-2 animate-in slide-in-from-top-2 duration-200">
                  {/* Person */}
                  <div className="bg-slate-50/90 p-5 rounded-2xl border border-slate-200 space-y-3">
                    <div className="text-xs font-bold text-slate-900 flex items-center gap-2">
                      <Users className="w-4 h-4 text-indigo-600" />
                      <span>اولین طرف حساب (شخص)</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">نام شخص یا شرکت *</label>
                        <input
                          type="text"
                          value={customPersonName}
                          onChange={e => setCustomPersonName(e.target.value)}
                          placeholder="مشتری نقدی"
                          className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs outline-none focus:ring-1 focus:ring-indigo-500 font-bold"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">شماره تماس</label>
                        <input
                          type="text"
                          value={customPersonPhone}
                          onChange={e => setCustomPersonPhone(e.target.value)}
                          placeholder="0912..."
                          className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 font-mono text-left text-xs outline-none focus:ring-1 focus:ring-indigo-500"
                          dir="ltr"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">نقش طرف حساب</label>
                        <select
                          value={customPersonRole}
                          onChange={e => setCustomPersonRole(e.target.value as any)}
                          className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs outline-none focus:ring-1 focus:ring-indigo-500 font-bold"
                        >
                          <option value="customer">مشتری (خریدار)</option>
                          <option value="supplier">تامین‌کننده (فروشنده)</option>
                          <option value="both">مشتری و تامین‌کننده</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Product */}
                  <div className="bg-slate-50/90 p-5 rounded-2xl border border-slate-200 space-y-3">
                    <div className="text-xs font-bold text-slate-900 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <ShoppingBag className="w-4 h-4 text-emerald-600" />
                        <span>اولین کالا یا خدمات</span>
                      </div>
                      {Number(customProductPurchasePrice) > 0 && Number(customProductSalePrice) > 0 && (
                        <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 font-bold">
                          حاشیه سود: {Math.round(((Number(customProductSalePrice) - Number(customProductPurchasePrice)) / Number(customProductPurchasePrice)) * 100)}٪
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">نام کالا / خدمت *</label>
                        <input
                          type="text"
                          value={customProductName}
                          onChange={e => setCustomProductName(e.target.value)}
                          placeholder="نام کالا"
                          className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs outline-none focus:ring-1 focus:ring-indigo-500 font-bold"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">دسته‌بندی</label>
                        <input
                          type="text"
                          value={customProductCategory}
                          onChange={e => setCustomProductCategory(e.target.value)}
                          placeholder="عمومی"
                          className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">واحد شمارش</label>
                        <input
                          type="text"
                          value={customProductUnit}
                          onChange={e => setCustomProductUnit(e.target.value)}
                          placeholder="عدد"
                          className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs outline-none focus:ring-1 focus:ring-indigo-500 font-bold"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">قیمت خرید ({currency})</label>
                        <input
                          type="number"
                          value={customProductPurchasePrice}
                          onChange={e => setCustomProductPurchasePrice(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 font-mono text-left text-xs outline-none focus:ring-1 focus:ring-indigo-500 font-bold"
                          dir="ltr"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">قیمت فروش ({currency})</label>
                        <input
                          type="number"
                          value={customProductSalePrice}
                          onChange={e => setCustomProductSalePrice(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-emerald-700 font-bold font-mono text-left text-xs outline-none focus:ring-1 focus:ring-indigo-500"
                          dir="ltr"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">موجودی اولیه در انبار</label>
                        <input
                          type="number"
                          value={customProductInitialStock}
                          onChange={e => setCustomProductInitialStock(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-sky-700 font-bold font-mono text-left text-xs outline-none focus:ring-1 focus:ring-indigo-500"
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
              <div className="border-b border-slate-100 pb-4">
                <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <Rocket className="w-5 h-5 text-indigo-600" />
                  {isBusinessOnly ? 'مرحله ۵: بازبینی نهایی و راه‌اندازی کسب‌وکار' : 'مرحله ۷: بازبینی نهایی و تکمیل راه‌اندازی'}
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  پیکربندی با موفقیت آماده شد. خلاصه‌ای از تنظیمات زیر را مرور و راه‌اندازی را به پایان برسانید.
                </p>
              </div>

              {/* Summary Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                
                {!isBusinessOnly && (
                  <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-200">
                    <div className="flex items-center gap-2 text-indigo-700 text-xs font-bold mb-2">
                      <Database className="w-4 h-4" />
                      <span>موتور پایگاه داده</span>
                    </div>
                    <div className="text-sm font-black text-slate-900">
                      {dbType === 'json' ? 'دیتابیس محلی (JSON Storage)' : `PostgreSQL (${dbHost})`}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1">
                      {dbType === 'json' ? 'ذخیره در data.json محلی' : `دیتابیس: ${dbName}`}
                    </div>
                  </div>
                )}

                {!isBusinessOnly && (
                  <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-200">
                    <div className="flex items-center gap-2 text-indigo-700 text-xs font-bold mb-2">
                      <ShieldCheck className="w-4 h-4" />
                      <span>حساب مدیر ارشد</span>
                    </div>
                    <div className="text-sm font-black text-slate-900">{adminFullName}</div>
                    <div className="text-[11px] text-slate-500 mt-1 font-mono">نام کاربری: {adminUsername}</div>
                  </div>
                )}

                <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-200">
                  <div className="flex items-center gap-2 text-indigo-700 text-xs font-bold mb-2">
                    <Store className="w-4 h-4" />
                    <span>کسب‌وکار و واحد پول</span>
                  </div>
                  <div className="text-sm font-black text-slate-900 truncate">{storeName}</div>
                  <div className="text-[11px] text-emerald-700 mt-1 font-bold">واحد رسمی: {currency} ({calendarType === 'jalali' ? 'شمسی' : 'میلادی'})</div>
                </div>

                <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-200">
                  <div className="flex items-center gap-2 text-indigo-700 text-xs font-bold mb-2">
                    <Calendar className="w-4 h-4" />
                    <span>دوره سال مالی</span>
                  </div>
                  <div className="text-sm font-black text-slate-900">{fiscalYearName}</div>
                  <div className="text-[11px] text-slate-500 mt-1 font-mono">از {fiscalYearStart} تا {fiscalYearEnd}</div>
                </div>

                <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-200">
                  <div className="flex items-center gap-2 text-indigo-700 text-xs font-bold mb-2">
                    <Landmark className="w-4 h-4" />
                    <span>حساب و انبارداری</span>
                  </div>
                  <div className="text-sm font-black text-slate-900">{bankName} / {cashboxName}</div>
                  <div className="text-[11px] text-sky-700 mt-1">انبار اصلی: {warehouseName}</div>
                </div>

                <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-200">
                  <div className="flex items-center gap-2 text-indigo-700 text-xs font-bold mb-2">
                    <PackagePlus className="w-4 h-4" />
                    <span>اقلام شروع اولیه</span>
                  </div>
                  <div className="text-sm font-black text-slate-900">
                    {useStarterPack ? 'پکیج شروع سریع آماده' : customProductName}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">
                    {useStarterPack ? 'مشتری، تامین‌کننده، کالا و خدمات' : `طرف حساب: ${customPersonName}`}
                  </div>
                </div>

              </div>

              <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div className="text-xs text-emerald-900 leading-relaxed">
                  <span className="font-black text-emerald-950 block mb-0.5">سیستم آماده ورود است!</span>
                  با فشردن دکمه زیر، تمامی جداول و تعاریف در پایگاه داده انتخابی شما ثبت گردیده، سشن ورود معتبر ایجاد شده و داشبورد حسابداری با داده‌های افتتاحیه گشوده خواهد شد.
                </div>
              </div>
            </div>
          )}

          {/* Action Navigation Footer */}
          <div className="mt-8 pt-5 border-t border-slate-100 flex items-center justify-between gap-3">
            <div>
              {step > 1 && (
                <button
                  type="button"
                  onClick={handlePrevStep}
                  disabled={saving}
                  className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all flex items-center gap-2 cursor-pointer border border-slate-200 disabled:opacity-50"
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
                  className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black transition-all flex items-center gap-2 cursor-pointer shadow-md shadow-indigo-600/25 hover:scale-[1.02] active:scale-[0.98]"
                >
                  <span>مرحله بعد</span>
                  <ArrowLeft className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleFinalSubmit}
                  disabled={saving}
                  className="px-8 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-black transition-all flex items-center gap-2 cursor-pointer shadow-lg shadow-emerald-600/25 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
                >
                  {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Rocket className="w-5 h-5" />}
                  <span>{isBusinessOnly ? 'ایجاد کسب‌وکار و راه‌اندازی سال مالی' : 'تکمیل نهایی و ورود به نرم‌افزار'}</span>
                </button>
              )}
            </div>
          </div>

        </div>

      </main>

      {/* Footer Branding */}
      <footer className="text-center py-4 border-t border-slate-200 text-[11px] text-slate-500 font-sans">
        سیستم یکپارچه مدیریت مالی و حسابداری فروشگاهی · طراحی شده بر پایه استانداردهای نوین رابط کاربری
      </footer>

    </div>
  );
}
