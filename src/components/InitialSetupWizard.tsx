import React, { useState, useEffect, useMemo } from 'react';
import { 
  Database, Server, HardDrive, Loader2, CheckCircle2, XCircle, 
  UserPlus, ArrowLeft, ArrowRight, KeySquare, Building2, Store, 
  Calendar, Landmark, Wallet, Warehouse, Users, PackagePlus, 
  Rocket, ShieldCheck, Sparkles, RefreshCw, Eye, EyeOff,
  Phone, MapPin, Tag, Check, ChevronLeft, ChevronRight,
  CreditCard, Coins, ShoppingBag, ArrowUpRight, HelpCircle,
  FileText, Percent, Globe, AlertTriangle, PlusCircle, Layers,
  Plus, Clock, User, Building, Package, Shield, Lock, Radio
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

  // Step 1: Database Model & Connection (PostgreSQL strictly required)
  const [dbType, setDbType] = useState<'postgres'>('postgres');
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
  const [bankBranchName, setBankBranchName] = useState('');
  const [bankAccountNumber, setBankAccountNumber] = useState('');
  const [bankCardNumber, setBankCardNumber] = useState('');
  const [bankSheba, setBankSheba] = useState('');
  const [bankAccountHolder, setBankAccountHolder] = useState('');
  const [bankInitialBalance, setBankInitialBalance] = useState('0');

  const [cashboxName, setCashboxName] = useState('صندوق مرکزی');
  const [cashboxManager, setCashboxManager] = useState('');
  const [cashboxAccountNumber, setCashboxAccountNumber] = useState('101');
  const [cashboxInitialBalance, setCashboxInitialBalance] = useState('0');

  const [warehouseName, setWarehouseName] = useState('انبار مرکزی');
  const [warehouseCode, setWarehouseCode] = useState('WH-01');
  const [warehouseAddress, setWarehouseAddress] = useState('');

  // Step 6 / 4: Starter Catalog & Contacts
  const [useStarterPack, setUseStarterPack] = useState(true);
  const [customPersonType, setCustomPersonType] = useState<'real' | 'legal'>('real');
  const [customPersonName, setCustomPersonName] = useState('مشتری عمومی (نقدی)');
  const [customPersonNationalId, setCustomPersonNationalId] = useState('');
  const [customPersonEconomicCode, setCustomPersonEconomicCode] = useState('');
  const [customPersonPhone, setCustomPersonPhone] = useState('02188888888');
  const [customPersonMobile, setCustomPersonMobile] = useState('09120000000');
  const [customPersonProvince, setCustomPersonProvince] = useState('');
  const [customPersonCity, setCustomPersonCity] = useState('');
  const [customPersonAddress, setCustomPersonAddress] = useState('');
  const [customPersonRole, setCustomPersonRole] = useState<'customer' | 'supplier' | 'both'>('customer');
  const [customPersonBalance, setCustomPersonBalance] = useState('0');
  const [customPersonBalanceType, setCustomPersonBalanceType] = useState<'settled' | 'debtor' | 'creditor'>('settled');
  const [customPersonBankName, setCustomPersonBankName] = useState('');
  const [customPersonAccountNumber, setCustomPersonAccountNumber] = useState('');
  const [customPersonSheba, setCustomPersonSheba] = useState('');
  const [personSubTab, setPersonSubTab] = useState<'identity' | 'contact' | 'financial'>('identity');

  // Table Creation Progress State (107 tables)
  const [syncProgress, setSyncProgress] = useState<{
    current: number;
    total: number;
    tableName: string;
    status: string;
    percent: number;
    message: string;
  }>({
    current: 0,
    total: 107,
    tableName: '',
    status: 'idle',
    percent: 0,
    message: 'در حال آماده‌سازی و ساخت جداول پایگاه داده...'
  });

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
          localStorage.setItem('initial_setup_complete', 'true');
          const currentStore = localStorage.getItem('activeStoreId');
          if (!currentStore) {
            localStorage.setItem('activeStoreId', 'default');
            sessionStorage.setItem('activeStoreId', 'default');
          }
          onComplete();
        }
      })
      .catch(err => {
        console.warn('Setup status check error:', err);
      })
      .finally(() => setLoading(false));
  }, [isBusinessOnly]);

  const handleTestDb = async () => {
    setDbTesting(true);
    setDbTestResult(null);
    try {
      const auth = dbPass ? `${dbUser}:${encodeURIComponent(dbPass)}` : dbUser;
      const targetDb = dbName?.trim() || 'store_db';
      const connStr = `postgresql://${auth}@${dbHost}:${dbPort}/${targetDb}`;
      const res = await fetch('/api/db/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          connectionString: connStr, 
          dbName: targetDb,
          host: dbHost,
          port: dbPort,
          user: dbUser,
          password: dbPass,
          saveConfig: true
        })
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
      setDbTestResult({ success: false, message: err?.message || 'خطا در ارتباط با سرور PostgreSQL' });
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
    
    // Poll table creation progress while saving
    const pollInterval = setInterval(async () => {
      try {
        const pRes = await fetch('/api/setup/sync-progress');
        if (pRes.ok) {
          const pData = await pRes.json();
          if (pData.success && pData.progress) {
            setSyncProgress(pData.progress);
          }
        }
      } catch (_) {}
    }, 250);

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
            branchName: bankBranchName.trim(),
            accountNumber: bankAccountNumber.trim(),
            cardNumber: bankCardNumber.trim(),
            shebaNumber: bankSheba.trim(),
            accountHolder: bankAccountHolder.trim() || companyName.trim() || storeName.trim(),
            initialBalance: Number(bankInitialBalance) || 0
          },
          cashbox: {
            name: cashboxName.trim(),
            manager: cashboxManager.trim(),
            accountNumber: cashboxAccountNumber.trim(),
            initialBalance: Number(cashboxInitialBalance) || 0
          },
          warehouse: {
            name: warehouseName.trim(),
            code: warehouseCode.trim(),
            address: warehouseAddress.trim() || storeAddress.trim()
          },
          starterPack: useStarterPack,
          customPerson: !useStarterPack ? {
            personType: customPersonType,
            name: customPersonName.trim(),
            nationalId: customPersonNationalId.trim(),
            economicCode: customPersonEconomicCode.trim(),
            phone: customPersonPhone.trim(),
            mobile: customPersonMobile.trim() || customPersonPhone.trim(),
            province: customPersonProvince.trim(),
            city: customPersonCity.trim(),
            address: customPersonAddress.trim(),
            role: customPersonRole,
            initialBalance: Number(customPersonBalance) || 0,
            initialBalanceType: customPersonBalanceType,
            bankName: customPersonBankName.trim(),
            accountNumber: customPersonAccountNumber.trim(),
            shebaNumber: customPersonSheba.trim()
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
          clearInterval(pollInterval);
          onComplete();
        } else {
          clearInterval(pollInterval);
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
            branchName: bankBranchName.trim(),
            accountNumber: bankAccountNumber.trim(),
            cardNumber: bankCardNumber.trim(),
            shebaNumber: bankSheba.trim(),
            accountHolder: bankAccountHolder.trim() || companyName.trim() || storeName.trim(),
            initialBalance: Number(bankInitialBalance) || 0
          },
          cashbox: {
            name: cashboxName.trim(),
            manager: cashboxManager.trim(),
            accountNumber: cashboxAccountNumber.trim(),
            initialBalance: Number(cashboxInitialBalance) || 0
          },
          warehouse: {
            name: warehouseName.trim(),
            code: warehouseCode.trim(),
            address: warehouseAddress.trim() || storeAddress.trim()
          },
          starterPack: useStarterPack,
          customPerson: !useStarterPack ? {
            personType: customPersonType,
            name: customPersonName.trim(),
            nationalId: customPersonNationalId.trim(),
            economicCode: customPersonEconomicCode.trim(),
            phone: customPersonPhone.trim(),
            mobile: customPersonMobile.trim() || customPersonPhone.trim(),
            province: customPersonProvince.trim(),
            city: customPersonCity.trim(),
            address: customPersonAddress.trim(),
            role: customPersonRole,
            initialBalance: Number(customPersonBalance) || 0,
            initialBalanceType: customPersonBalanceType,
            bankName: customPersonBankName.trim(),
            accountNumber: customPersonAccountNumber.trim(),
            shebaNumber: customPersonSheba.trim()
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
        clearInterval(pollInterval);

        if (data.success) {
          localStorage.setItem('initial_setup_complete', 'true');
          if (!isBusinessOnly) {
            localStorage.setItem('activeStoreId', 'default');
            sessionStorage.setItem('activeStoreId', 'default');
          }
          localStorage.setItem('company_profile', JSON.stringify({
            storeName: storeName.trim(),
            companyName: companyName.trim() || storeName.trim(),
            currency,
            calendarType,
            isSetup: true
          }));

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
                  مرحله ۱: پیکربندی و اتصال به پایگاه داده PostgreSQL
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  سیستم منحصراً با اتصال به سرور پایگاه داده PostgreSQL قابل راه‌اندازی است و اطلاعات کسب‌وکارها در پایگاه‌های داده مجزا ذخیره می‌گردند.
                </p>
              </div>

              {/* PostgreSQL Engine Active Card */}
              <div className="p-5 rounded-2xl border bg-indigo-50/70 border-indigo-500 text-slate-900 ring-2 ring-indigo-500/20 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3.5">
                  <div className="w-12 h-12 rounded-xl bg-sky-100 text-sky-600 flex items-center justify-center border border-sky-200 shrink-0">
                    <Server className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-black text-sm text-slate-900">موتور پایگاه داده PostgreSQL (الزامی)</h3>
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-600 text-white flex items-center gap-1">
                        <Check className="w-3 h-3" /> موتور فعال سیستم
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      تفکیک پایگاه‌های داده برای هر کسب‌وکار، ثبت مستقیم تراکنش‌ها و نگهداری اطلاعات اتصال در فایل db_config.
                    </p>
                  </div>
                </div>
              </div>

              {/* PostgreSQL Config Form */}
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

          {/* STEP 3: BUSINESS PROFILE - SEPARATED & BEAUTIFUL */}
          {activeStepType === 'business' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="border-b border-slate-100 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-indigo-600" />
                    {isBusinessOnly ? 'مرحله ۱: مشخصات و اطلاعات کسب‌وکار' : 'مرحله ۳: اطلاعات و تنظیمات کسب‌وکار'}
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    تنظیم مشخصات هویتی کسب‌وکار، برند تجاری، واحد پول رسمی، نوع تقویم و اطلاعات مالیاتی به صورت تفکیک‌شده.
                  </p>
                </div>
                <span className="self-start sm:self-auto text-[11px] font-bold px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                  تفکیک اطلاعات تجاری
                </span>
              </div>

              {/* Card 1: Brand & Identity */}
              <div className="bg-slate-50/80 p-5 rounded-2xl border border-slate-200/90 space-y-4">
                <div className="flex items-center gap-2 text-xs font-black text-slate-800">
                  <Store className="w-4 h-4 text-indigo-600" />
                  <span>هویت تجاری و نام برند</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      نام فروشگاه یا کسب‌وکار <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <Store className="absolute right-3.5 top-3 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        required
                        value={storeName}
                        onChange={e => setStoreName(e.target.value)}
                        placeholder="مثال: فروشگاه بزرگ رایانه یا شرکت آرتان"
                        className="w-full pr-10 pl-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-none font-bold"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">نام رسمی / ثبتی شرکت (اختیاری)</label>
                    <div className="relative">
                      <Building className="absolute right-3.5 top-3 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        value={companyName}
                        onChange={e => setCompanyName(e.target.value)}
                        placeholder="مثال: بازرگانی نوآوران تجارت آریا"
                        className="w-full pr-10 pl-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">حوزه فعالیت و صنف</label>
                    <select
                      value={activityField}
                      onChange={e => setActivityField(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-none font-bold"
                    >
                      <option value="خرده‌فروشی و بازرگانی">خرده‌فروشی و فروشگاهی</option>
                      <option value="عمده‌فروشی و توزیع">عمده‌فروشی و پخش کالا</option>
                      <option value="خدماتی و پیمانکاری">خدماتی، مهندسی و پیمانکاری</option>
                      <option value="تولیدی و کارگاهی">تولیدی و کارگاهی صنعتی</option>
                      <option value="رستوران و فست‌فود">رستوران، کافه و صنایع غذایی</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">شناسه ملی / کد اقتصادی</label>
                    <input
                      type="text"
                      value={nationalId}
                      onChange={e => setNationalId(e.target.value)}
                      placeholder="شناسه ملی ۱۱ رقمی یا کد اقتصادی"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 font-mono text-left text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-none"
                      dir="ltr"
                    />
                  </div>
                </div>
              </div>

              {/* Card 2: Currency & Calendar Settings */}
              <div className="bg-slate-50/80 p-5 rounded-2xl border border-slate-200/90 space-y-4">
                <div className="flex items-center gap-2 text-xs font-black text-slate-800">
                  <Coins className="w-4 h-4 text-amber-600" />
                  <span>پیکربندی مالی و تقویم سیستم</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-2">واحد پول سیستم</label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {[
                        { id: 'تومان', label: 'تومان', desc: 'پیش‌فرض' },
                        { id: 'ریال', label: 'ریال', desc: 'رسمی' },
                        { id: 'USD', label: 'دلار (USD)', desc: 'بین‌الملل' },
                        { id: 'EUR', label: 'یورو (EUR)', desc: 'بین‌الملل' },
                      ].map(c => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => setCurrency(c.id)}
                          className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                            currency === c.id
                              ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm shadow-indigo-600/20 ring-2 ring-indigo-500/20'
                              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          <div className="text-xs font-black">{c.label}</div>
                          <div className={`text-[10px] ${currency === c.id ? 'text-indigo-100' : 'text-slate-400'}`}>{c.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-2">نوع تقویم و تاریخ سیستم</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setCalendarType('jalali')}
                        className={`p-2.5 rounded-xl border flex items-center justify-center gap-2 transition-all cursor-pointer ${
                          calendarType === 'jalali'
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm shadow-indigo-600/20 ring-2 ring-indigo-500/20'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        <Calendar className="w-4 h-4" />
                        <span className="text-xs font-bold">هجری شمسی (جلالی)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setCalendarType('gregorian')}
                        className={`p-2.5 rounded-xl border flex items-center justify-center gap-2 transition-all cursor-pointer ${
                          calendarType === 'gregorian'
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm shadow-indigo-600/20 ring-2 ring-indigo-500/20'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        <Globe className="w-4 h-4" />
                        <span className="text-xs font-bold">میلادی (Gregorian)</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 3: Contact and Address */}
              <div className="bg-slate-50/80 p-5 rounded-2xl border border-slate-200/90 space-y-4">
                <div className="flex items-center gap-2 text-xs font-black text-slate-800">
                  <Phone className="w-4 h-4 text-emerald-600" />
                  <span>اطلاعات تماس و نشانی</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">شماره تلفن ثابت فروشگاه</label>
                    <div className="relative">
                      <Phone className="absolute right-3.5 top-3 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        value={storePhone}
                        onChange={e => setStorePhone(e.target.value)}
                        placeholder="021-88888888"
                        className="w-full pr-10 pl-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 font-mono text-left text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-none"
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
                        className="w-full pr-10 pl-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 font-mono text-left text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-none"
                        dir="ltr"
                      />
                    </div>
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
                      className="w-full pr-10 pl-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Card 4: Tax & Invoice Format */}
              <div className="bg-slate-50/80 p-5 rounded-2xl border border-slate-200/90 space-y-4">
                <div className="flex items-center gap-2 text-xs font-black text-slate-800">
                  <FileText className="w-4 h-4 text-sky-600" />
                  <span>تنظیمات فاکتور و مالیات</span>
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
                          className="w-full pr-10 pl-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 font-mono text-left text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-none font-bold"
                          dir="ltr"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => setTaxPercent('0')}
                        className={`px-3 py-2.5 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                          taxPercent === '0' ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        ۰٪ (معاف)
                      </button>
                      <button
                        type="button"
                        onClick={() => setTaxPercent('10')}
                        className={`px-3 py-2.5 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                          taxPercent === '10' ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
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
                      className="w-full px-3 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-none font-bold"
                    >
                      <option value="standard">فاکتور استاندارد A4 / A5 شرکتی</option>
                      <option value="official">فاکتور رسمی دارایی (ماده ۱۶۹)</option>
                      <option value="thermal">فیش حرارتی ۸۰ میلی‌متری (فروشگاهی / POS)</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: FISCAL YEAR - EXACTLY MATCHING FinancialYearManager.tsx */}
          {activeStepType === 'fiscal' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              
              {/* Header Status Card - exactly like FinancialYearManager */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-indigo-600" />
                    <div>
                      <h3 className="font-black text-slate-800 text-base">وضعیت دوره سال مالی سیستم</h3>
                      <p className="text-xs text-slate-500">مشخصات دوره افتتاحیه برای صدور اسناد حسابداری، فاکتورها و عملیات انبار</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    <span className="flex h-2.5 w-2.5 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                    </span>
                    <span className="text-xs font-black text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                      فعال و آماده کار
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="bg-slate-50/90 border border-slate-200/80 rounded-xl p-3.5">
                    <span className="text-xs font-bold text-slate-400 block mb-1">سال مالی فعال</span>
                    <span className="font-black text-slate-800 text-sm">{fiscalYearName || `سال مالی ${currentJalaliYear}`}</span>
                  </div>
                  <div className="bg-slate-50/90 border border-slate-200/80 rounded-xl p-3.5">
                    <span className="text-xs font-bold text-slate-400 block mb-1">محدوده سال مالی فعال</span>
                    <span className="font-mono font-bold text-slate-700 text-xs" dir="ltr">{fiscalYearStart} تا {fiscalYearEnd}</span>
                  </div>
                  <div className="bg-slate-50/90 border border-slate-200/80 rounded-xl p-3.5">
                    <span className="text-xs font-bold text-slate-400 block mb-1">کد شناسایی دوره</span>
                    <span className="font-mono font-bold text-indigo-700 text-xs" dir="ltr">{fiscalYearCode}</span>
                  </div>
                </div>
              </div>

              {/* Form panel titled "تعریف سال مالی جدید" - identical to FinancialYearManager form */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-5 pb-3 border-b border-slate-100">
                  <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                    <Plus className="w-5 h-5 text-emerald-500" />
                    تعریف سال مالی جدید
                  </h3>

                  {/* Quick Preset Buttons */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-xs text-slate-400 font-bold ml-1 hidden sm:inline">انتخاب سریع:</span>
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
                          className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 text-xs font-bold transition-colors cursor-pointer"
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
                          className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
                        >
                          سال مالی آینده ({currentJalaliYear + 1})
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setFiscalYearName(`Fiscal Year ${currentGregorianYear}`);
                          setFiscalYearCode(`FY-${currentGregorianYear}`);
                          setFiscalYearStart(`${currentGregorianYear}-01-01`);
                          setFiscalYearEnd(`${currentGregorianYear}-12-31`);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 text-xs font-bold transition-colors cursor-pointer"
                      >
                        Fiscal Year {currentGregorianYear}
                      </button>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">عنوان سال مالی *</label>
                      <input
                        type="text"
                        required
                        value={fiscalYearName}
                        onChange={e => setFiscalYearName(e.target.value)}
                        placeholder={`مثال: سال مالی ${currentJalaliYear}`}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:bg-white outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">کد شناسایی سال مالی *</label>
                      <input
                        type="text"
                        value={fiscalYearCode}
                        onChange={e => setFiscalYearCode(e.target.value)}
                        placeholder={`FY-${currentJalaliYear}`}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-mono font-bold text-indigo-700 text-left focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:bg-white outline-none"
                        dir="ltr"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">تاریخ شروع سال مالی *</label>
                      <input
                        type="text"
                        value={fiscalYearStart}
                        onChange={e => setFiscalYearStart(e.target.value)}
                        placeholder={calendarType === 'jalali' ? `${currentJalaliYear}/01/01` : `${currentGregorianYear}-01-01`}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-mono font-bold text-slate-900 text-left focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:bg-white outline-none"
                        dir="ltr"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">تاریخ پایان سال مالی *</label>
                      <input
                        type="text"
                        value={fiscalYearEnd}
                        onChange={e => setFiscalYearEnd(e.target.value)}
                        placeholder={calendarType === 'jalali' ? `${currentJalaliYear}/12/29` : `${currentGregorianYear}-12-31`}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-mono font-bold text-slate-900 text-left focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:bg-white outline-none"
                        dir="ltr"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">توضیحات (اختیاری)</label>
                    <textarea
                      rows={2}
                      value={fiscalYearDesc}
                      onChange={e => setFiscalYearDesc(e.target.value)}
                      placeholder="توضیحات مربوط به سال مالی..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:bg-white outline-none resize-none"
                    />
                  </div>

                  <div className="p-3.5 bg-emerald-50/70 rounded-xl border border-emerald-200/80 flex items-center gap-2.5 text-xs text-emerald-900 font-bold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>این سال مالی به عنوان دوره افتتاحیه و باز (Open) در سیستم ثبت شده و آماده ثبت اسناد و فاکتورها خواهد بود.</span>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* STEP 5: BANK, CASH & WAREHOUSE - EXACTLY MATCHING AccountFormModal.tsx & CashboxFormModal.tsx */}
          {activeStepType === 'infrastructure' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="border-b border-slate-100 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                    <Landmark className="w-5 h-5 text-indigo-600" />
                    {isBusinessOnly ? 'مرحله ۳: زیرساخت مالی و عملیاتی (بانک، صندوق و انبار)' : 'مرحله ۵: زیرساخت مالی و عملیاتی (بانک، صندوق و انبار)'}
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    طراحی منطبق با فرم‌های سیستم جهت تعریف حساب بانکی اولیه، صندوق نقدی و انبار مرکزی کالاها.
                  </p>
                </div>
                <span className="self-start sm:self-auto text-[11px] font-bold px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  تراز افتتاحیه نقد و بانک
                </span>
              </div>

              {/* Bank Account Section - Matching AccountFormModal.tsx */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 via-white to-emerald-50/30">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/20 shrink-0">
                      <CreditCard className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                        ثبت حساب بانکی اولیه
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                          حساب پیش‌فرض سیستم
                        </span>
                      </h3>
                      <p className="text-xs text-slate-500 font-medium mt-0.5">
                        مشخصات حساب بانکی جهت دریافت، پرداخت، واریز فاکتورها و تراکنش‌های دستگاه کارتخوان (POS)
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-6 space-y-6">
                  {/* Top: Card Visual Preview & Popular Banks */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
                    {/* Realistic Bank Card Visual */}
                    <div className="lg:col-span-1">
                      <div className="relative w-full h-44 rounded-2xl p-5 text-white shadow-xl overflow-hidden bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-800 border border-slate-700/60 flex flex-col justify-between">
                        {/* Card Glow FX */}
                        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
                        <div className="absolute bottom-0 left-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

                        {/* Card Top Row */}
                        <div className="flex items-center justify-between relative z-10">
                          <div className="flex items-center gap-2">
                            <Landmark className="w-4 h-4 text-emerald-400" />
                            <span className="text-xs font-black tracking-wide">{bankName || 'بانک ملت'}</span>
                          </div>
                          <span className="text-[10px] font-mono font-bold text-slate-400 tracking-wider">DEBIT CARD</span>
                        </div>

                        {/* Card Chip & Contactless */}
                        <div className="flex items-center gap-3 relative z-10 my-1">
                          <div className="w-9 h-7 rounded-md bg-gradient-to-tr from-amber-300 via-amber-200 to-amber-400 border border-amber-400/80 shadow-xs flex items-center justify-center">
                            <div className="w-full h-[1px] bg-amber-500/40 my-auto" />
                          </div>
                          <Radio className="w-4 h-4 text-slate-400 rotate-90" />
                        </div>

                        {/* Card Number */}
                        <div className="relative z-10">
                          <div className="font-mono text-sm sm:text-base tracking-widest text-slate-100 font-bold" dir="ltr">
                            {bankCardNumber ? (
                              bankCardNumber.replace(/(\d{4})/g, '$1 ').trim()
                            ) : (
                              '6037 •••• •••• 1234'
                            )}
                          </div>
                        </div>

                        {/* Card Bottom Row: Holder & Sheba */}
                        <div className="flex items-end justify-between relative z-10 text-[10px]">
                          <div>
                            <span className="text-[9px] text-slate-400 block font-bold">صاحب حساب:</span>
                            <span className="font-bold text-slate-200 truncate max-w-[140px] block">
                              {bankAccountHolder || companyName || storeName || 'دارنده حساب'}
                            </span>
                          </div>
                          <div className="text-left font-mono" dir="ltr">
                            <span className="text-[9px] text-slate-400 block text-right">IBAN:</span>
                            <span className="text-[10px] text-emerald-300 font-bold">
                              {bankSheba ? (bankSheba.startsWith('IR') ? bankSheba.slice(0, 8) + '...' : 'IR' + bankSheba.slice(0, 6) + '...') : 'IR•• •••• ••••'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Quick Popular Banks Selector */}
                    <div className="lg:col-span-2 space-y-3 bg-slate-50/70 p-4 rounded-xl border border-slate-200/80">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-slate-700">انتخاب سریع از میان بانک‌های پرکاربرد کشور:</span>
                        <span className="text-[10px] text-slate-400 font-bold">کلیک برای تکمیل خودکار</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {popularBanks.map(b => (
                          <button
                            key={b}
                            type="button"
                            onClick={() => {
                              setBankName(b);
                              if (!bankBranchName) setBankBranchName('شعبه مرکزی');
                            }}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                              bankName === b 
                                ? 'bg-indigo-600 text-white shadow-xs ring-2 ring-indigo-500/20' 
                                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200 shadow-2xs'
                            }`}
                          >
                            {b}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Form Fields - Grid identical to AccountFormModal */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-right pt-2 border-t border-slate-100">
                    <div className="w-full text-right">
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        نام بانک <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={bankName}
                        onChange={e => setBankName(e.target.value)}
                        placeholder="مثال: بانک ملی، بانک ملت"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-2xs text-slate-900 text-xs font-bold outline-none"
                        required
                      />
                    </div>

                    <div className="w-full text-right">
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        نام صاحب حساب <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={bankAccountHolder}
                        onChange={e => setBankAccountHolder(e.target.value)}
                        placeholder={companyName || storeName || "مثال: علی محمدی"}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-2xs text-slate-900 text-xs font-bold outline-none"
                        required
                      />
                    </div>

                    <div className="w-full text-right">
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        شماره حساب
                      </label>
                      <input
                        type="text"
                        value={bankAccountNumber}
                        onChange={e => setBankAccountNumber(e.target.value)}
                        placeholder="مثال: 0102030405"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-2xs text-slate-900 text-left font-mono text-xs outline-none"
                        dir="ltr"
                      />
                    </div>

                    <div className="w-full text-right">
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        شماره کارت (۱۶ رقمی)
                      </label>
                      <input
                        type="text"
                        value={bankCardNumber}
                        onChange={e => setBankCardNumber(e.target.value)}
                        placeholder="6104-3378-..."
                        maxLength={19}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-2xs text-slate-900 text-left font-mono text-xs outline-none"
                        dir="ltr"
                      />
                    </div>

                    <div className="w-full text-right md:col-span-2">
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        شماره شبا (IBAN)
                      </label>
                      <input
                        type="text"
                        value={bankSheba}
                        onChange={e => setBankSheba(e.target.value)}
                        placeholder="مثال: IR12017000000000..."
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-2xs text-slate-900 text-left font-mono text-xs outline-none"
                        dir="ltr"
                      />
                    </div>

                    <div className="w-full text-right">
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        نام شعبه
                      </label>
                      <input
                        type="text"
                        value={bankBranchName}
                        onChange={e => setBankBranchName(e.target.value)}
                        placeholder="مثال: شعبه مرکزی"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-2xs text-slate-900 text-xs outline-none"
                      />
                    </div>

                    <div className="w-full text-right">
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        موجودی اولیه ({currency})
                      </label>
                      <input
                        type="number"
                        value={bankInitialBalance}
                        onChange={e => setBankInitialBalance(e.target.value)}
                        placeholder="0"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-2xs text-emerald-700 font-bold font-mono text-left text-xs outline-none"
                        dir="ltr"
                      />
                      {Number(bankInitialBalance) > 0 && (
                        <div className="mt-1.5 p-2 bg-emerald-50 rounded-lg border border-emerald-100 flex items-center gap-1.5 text-[11px] text-emerald-800 font-bold">
                          <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span className="truncate">{numberToWords(bankInitialBalance)} {currency}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Cashbox & Warehouse Grid - Matching CashboxFormModal.tsx & System Design */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Cashbox Section - Exactly matching CashboxFormModal */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex flex-col">
                  <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 via-white to-amber-50/30">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-md shadow-amber-500/20 shrink-0">
                        <Wallet className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-black text-slate-900">
                          ثبت صندوق یا تنخواه جدید
                        </h3>
                        <p className="text-xs text-slate-500 font-medium">
                          صندوق نقدی پیش‌فرض دریافت و پرداخت اسکناس
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                      صندوق ۱
                    </span>
                  </div>

                  <div className="p-5 flex-1 space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        نام صندوق / تنخواه <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={cashboxName}
                        onChange={e => setCashboxName(e.target.value)}
                        placeholder="مثال: صندوق اصلی، تنخواه دفتر"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-2xs text-slate-900 text-xs font-bold outline-none"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">
                          نام مسئول صندوق
                        </label>
                        <input
                          type="text"
                          value={cashboxManager}
                          onChange={e => setCashboxManager(e.target.value)}
                          placeholder="مثال: سارا احمدی"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-2xs text-slate-900 text-xs outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">
                          کد تفصیلی / شماره حساب
                        </label>
                        <input
                          type="text"
                          value={cashboxAccountNumber}
                          onChange={e => setCashboxAccountNumber(e.target.value)}
                          placeholder="101"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-2xs text-slate-900 font-mono text-left text-xs outline-none"
                          dir="ltr"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        موجودی نقدی اولیه ({currency})
                      </label>
                      <input
                        type="number"
                        value={cashboxInitialBalance}
                        onChange={e => setCashboxInitialBalance(e.target.value)}
                        placeholder="0"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-2xs text-amber-700 font-bold font-mono text-left text-xs outline-none"
                        dir="ltr"
                      />
                      {Number(cashboxInitialBalance) > 0 && (
                        <div className="mt-1.5 p-2 bg-amber-50 rounded-lg border border-amber-100 flex items-center gap-1.5 text-[11px] text-amber-800 font-bold">
                          <Check className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          <span className="truncate">{numberToWords(cashboxInitialBalance)} {currency}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Warehouse Section */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex flex-col">
                  <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 via-white to-sky-50/30">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-sky-500 text-white flex items-center justify-center shadow-md shadow-sky-500/20 shrink-0">
                        <Warehouse className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-black text-slate-900">
                          تعریف انبار مرکزی کالاها
                        </h3>
                        <p className="text-xs text-slate-500 font-medium">
                          انبار پیش‌فرض برای نگهداری و موجودی کالاها
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200">
                      انبار اصلی
                    </span>
                  </div>

                  <div className="p-5 flex-1 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">
                          نام انبار <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={warehouseName}
                          onChange={e => setWarehouseName(e.target.value)}
                          placeholder="انبار مرکزی"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-2xs text-slate-900 text-xs font-bold outline-none"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">
                          کد انبار
                        </label>
                        <input
                          type="text"
                          value={warehouseCode}
                          onChange={e => setWarehouseCode(e.target.value)}
                          placeholder="WH-01"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-2xs text-sky-700 font-mono text-left text-xs outline-none font-bold"
                          dir="ltr"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        آدرس و موقعیت انبار
                      </label>
                      <input
                        type="text"
                        value={warehouseAddress}
                        onChange={e => setWarehouseAddress(e.target.value)}
                        placeholder="دفتر مرکزی، سالن نگهداری کالا"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-2xs text-slate-900 text-xs outline-none"
                      />
                    </div>

                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-[11px] text-slate-600 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>کالاهای وارد شده در گام بعد مستقیماً در این انبار ذخیره خواهند شد.</span>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* STEP 6: CONTACTS & CATALOG - EXACTLY MATCHING PersonFormModal.tsx & ProductFormModal.tsx */}
          {activeStepType === 'catalog' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="border-b border-slate-100 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                    <PackagePlus className="w-5 h-5 text-indigo-600" />
                    {isBusinessOnly ? 'مرحله ۴: طرف‌های حساب و کاتالوگ کالای اولیه' : 'مرحله ۶: طرف‌های حساب و کاتالوگ کالای اولیه'}
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    تعریف اشخاص (مشتری/تامین‌کننده) مطابق فرم ثبت پرونده اشخاص و کاتالوگ کالا مطابق فرم ثبت کالا.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setUseStarterPack(true)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      useStarterPack
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200'
                    }`}
                  >
                    پکیج شروع سریع آماده
                  </button>
                  <button
                    type="button"
                    onClick={() => setUseStarterPack(false)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      !useStarterPack
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200'
                    }`}
                  >
                    تعریف دستی شخص و کالا
                  </button>
                </div>
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
                          <Check className="w-3 h-3" /> فعال شده
                        </span>
                      )}
                    </div>
                    <h3 className="font-black text-sm text-slate-900 mb-1.5">پکیج شروع سریع هوشمند (آماده ثبت فاکتور)</h3>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      ایجاد خودکار «مشتری عمومی نقدی»، «تامین‌کننده اصلی»، دسته‌بندی‌های استاندارد کالا و قلم‌های تستی اولیه.
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-200/70 text-[11px] text-emerald-700 font-bold flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>پیشنهادی: بلافاصله پس از اتمام راه‌اندازی می‌توانید فاکتور فروش ثبت کنید.</span>
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
                          <Check className="w-3 h-3" /> فعال شده
                        </span>
                      )}
                    </div>
                    <h3 className="font-black text-sm text-slate-900 mb-1.5">تعریف سفارشی طرف حساب و کالا</h3>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      ورود فرم مشخصات دقیق اولین شخص و اولین کالای اختصاصی شما با تمام جزئیات مالی و شناسنامه‌ای.
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-200/70 text-[11px] text-indigo-700 font-bold flex items-center gap-1.5">
                    <ShoppingBag className="w-3.5 h-3.5" />
                    <span>ورود اطلاعات واقعی از طریق فرم اختصاصی</span>
                  </div>
                </div>
              </div>

              {/* Custom Person & Product Forms - Exactly Matching System Modals */}
              {!useStarterPack && (
                <div className="space-y-6 pt-2 animate-in slide-in-from-top-2 duration-200">
                  
                  {/* PERSON FORM CONTAINER - EXACTLY MATCHING PersonFormModal.tsx */}
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                    {/* Header matching PersonFormModal */}
                    <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 via-white to-indigo-50/30">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/20 shrink-0">
                          {customPersonType === 'legal' ? <Building2 className="w-5 h-5" /> : <User className="w-5 h-5" />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm sm:text-base font-black text-slate-900">
                              ثبت شخص / طرف‌حساب جدید
                            </h3>
                            <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                              customPersonType === 'legal'
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                            }`}>
                              {customPersonType === 'legal' ? 'حقوقی / شرکتی' : 'حقیقی / فردی'}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 font-medium mt-0.5">
                            تکمیل مشخصات فردی، ارتباطی و اعتباری جهت ایجاد پرونده شخص در سامانه
                          </p>
                        </div>
                      </div>

                      {/* Real vs Legal Type Toggle */}
                      <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
                        <button
                          type="button"
                          onClick={() => setCustomPersonType('real')}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            customPersonType === 'real'
                              ? 'bg-white text-indigo-600 shadow-xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          <User className="w-3.5 h-3.5" />
                          <span>شخص حقیقی</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setCustomPersonType('legal')}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            customPersonType === 'legal'
                              ? 'bg-white text-indigo-600 shadow-xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          <Building2 className="w-3.5 h-3.5" />
                          <span>شخص حقوقی</span>
                        </button>
                      </div>
                    </div>

                    {/* Sub-tabs exactly like PersonFormModal.tsx */}
                    <div className="flex border-b border-slate-200 px-6 gap-6 bg-slate-50/60 text-xs font-bold">
                      <button
                        type="button"
                        onClick={() => setPersonSubTab('identity')}
                        className={`py-3 flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
                          personSubTab === 'identity'
                            ? 'border-indigo-600 text-indigo-600'
                            : 'border-transparent text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        <User className="w-4 h-4" />
                        <span>اطلاعات عمومی و هویتی</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setPersonSubTab('contact')}
                        className={`py-3 flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
                          personSubTab === 'contact'
                            ? 'border-indigo-600 text-indigo-600'
                            : 'border-transparent text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        <Phone className="w-4 h-4" />
                        <span>اطلاعات تماس و نشانی</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setPersonSubTab('financial')}
                        className={`py-3 flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
                          personSubTab === 'financial'
                            ? 'border-indigo-600 text-indigo-600'
                            : 'border-transparent text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        <CreditCard className="w-4 h-4" />
                        <span>اطلاعات مالی و اعتباری</span>
                      </button>
                    </div>

                    {/* Tab Contents */}
                    <div className="p-6">
                      {personSubTab === 'identity' && (
                        <div className="space-y-4 animate-in fade-in duration-200">
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="sm:col-span-2">
                              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                                {customPersonType === 'real' ? 'نام و نام خانوادگی' : 'نام شرکت یا سازمان'} <span className="text-rose-500">*</span>
                              </label>
                              <input
                                type="text"
                                value={customPersonName}
                                onChange={e => setCustomPersonName(e.target.value)}
                                placeholder={customPersonType === 'real' ? 'مثال: علی رضایی' : 'مثال: شرکت توسعه تجارت البرز'}
                                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-2xs text-slate-900 text-xs font-bold outline-none"
                                required
                              />
                            </div>

                            <div>
                              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                                نقش طرف حساب <span className="text-rose-500">*</span>
                              </label>
                              <select
                                value={customPersonRole}
                                onChange={e => setCustomPersonRole(e.target.value as any)}
                                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-2xs text-slate-900 text-xs font-bold outline-none"
                              >
                                <option value="customer">مشتری (خریدار)</option>
                                <option value="supplier">تامین‌کننده (فروشنده)</option>
                                <option value="both">مشتری و تامین‌کننده</option>
                              </select>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                                {customPersonType === 'real' ? 'کد ملی (۱۰ رقم)' : 'شناسه ملی شرکت (۱۱ رقم)'}
                              </label>
                              <input
                                type="text"
                                value={customPersonNationalId}
                                onChange={e => setCustomPersonNationalId(e.target.value)}
                                placeholder={customPersonType === 'real' ? '0012345678' : '10100123456'}
                                maxLength={11}
                                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-2xs text-slate-900 font-mono text-left text-xs outline-none"
                                dir="ltr"
                              />
                            </div>

                            <div>
                              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                                کد اقتصادی (اختیاری)
                              </label>
                              <input
                                type="text"
                                value={customPersonEconomicCode}
                                onChange={e => setCustomPersonEconomicCode(e.target.value)}
                                placeholder="کد اقتصادی ۱۲ رقمی"
                                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-2xs text-slate-900 font-mono text-left text-xs outline-none"
                                dir="ltr"
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      {personSubTab === 'contact' && (
                        <div className="space-y-4 animate-in fade-in duration-200">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                                شماره همراه (موبایل)
                              </label>
                              <input
                                type="text"
                                value={customPersonMobile}
                                onChange={e => setCustomPersonMobile(e.target.value)}
                                placeholder="0912..."
                                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-2xs text-slate-900 font-mono text-left text-xs outline-none"
                                dir="ltr"
                              />
                            </div>

                            <div>
                              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                                تلفن ثابت
                              </label>
                              <input
                                type="text"
                                value={customPersonPhone}
                                onChange={e => setCustomPersonPhone(e.target.value)}
                                placeholder="021..."
                                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-2xs text-slate-900 font-mono text-left text-xs outline-none"
                                dir="ltr"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-xs font-bold text-slate-700 mb-1.5">استان</label>
                              <input
                                type="text"
                                value={customPersonProvince}
                                onChange={e => setCustomPersonProvince(e.target.value)}
                                placeholder="تهران"
                                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-2xs text-slate-900 text-xs outline-none"
                              />
                            </div>

                            <div>
                              <label className="block text-xs font-bold text-slate-700 mb-1.5">شهر</label>
                              <input
                                type="text"
                                value={customPersonCity}
                                onChange={e => setCustomPersonCity(e.target.value)}
                                placeholder="تهران"
                                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-2xs text-slate-900 text-xs outline-none"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1.5">نشانی و آدرس کامل</label>
                            <input
                              type="text"
                              value={customPersonAddress}
                              onChange={e => setCustomPersonAddress(e.target.value)}
                              placeholder="خیابان، پلاک، واحد..."
                              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-2xs text-slate-900 text-xs outline-none"
                            />
                          </div>
                        </div>
                      )}

                      {personSubTab === 'financial' && (
                        <div className="space-y-4 animate-in fade-in duration-200">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                                مانده حساب اول دوره ({currency})
                              </label>
                              <div className="flex gap-2">
                                <input
                                  type="number"
                                  value={customPersonBalance}
                                  onChange={e => setCustomPersonBalance(e.target.value)}
                                  placeholder="0"
                                  className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-2xs text-slate-900 font-mono text-left text-xs outline-none"
                                  dir="ltr"
                                />
                                <select
                                  value={customPersonBalanceType}
                                  onChange={e => setCustomPersonBalanceType(e.target.value as any)}
                                  className="px-3 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-2xs text-slate-900 text-xs font-bold outline-none"
                                >
                                  <option value="settled">بی‌حساب (صفر)</option>
                                  <option value="debtor">بدهکار به ما</option>
                                  <option value="creditor">بستانکار از ما</option>
                                </select>
                              </div>
                            </div>

                            <div>
                              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                                نام بانک طرف حساب
                              </label>
                              <input
                                type="text"
                                value={customPersonBankName}
                                onChange={e => setCustomPersonBankName(e.target.value)}
                                placeholder="مثال: بانک ملی"
                                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-2xs text-slate-900 text-xs outline-none"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                                شماره حساب / شماره کارت
                              </label>
                              <input
                                type="text"
                                value={customPersonAccountNumber}
                                onChange={e => setCustomPersonAccountNumber(e.target.value)}
                                placeholder="شماره کارت یا حساب"
                                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-2xs text-slate-900 font-mono text-left text-xs outline-none"
                                dir="ltr"
                              />
                            </div>

                            <div>
                              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                                شماره شبا (IBAN)
                              </label>
                              <input
                                type="text"
                                value={customPersonSheba}
                                onChange={e => setCustomPersonSheba(e.target.value)}
                                placeholder="IR..."
                                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-2xs text-slate-900 font-mono text-left text-xs outline-none"
                                dir="ltr"
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* PRODUCT FORM CONTAINER - EXACTLY MATCHING ProductFormModal.tsx */}
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 via-white to-emerald-50/30">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/20 shrink-0">
                          <Package className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="text-sm sm:text-base font-black text-slate-900 flex items-center gap-2">
                            ثبت کالا / خدمات جدید
                          </h3>
                          <p className="text-xs text-slate-500 font-medium mt-0.5">
                            تعریف مشخصات اولین قلم کالا جهت موجودی اولیه انبار و صدور فاکتور
                          </p>
                        </div>
                      </div>

                      {Number(customProductPurchasePrice) > 0 && Number(customProductSalePrice) > 0 && (
                        <span className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                          <ArrowUpRight className="w-3.5 h-3.5" />
                          حاشیه سود: {Math.round(((Number(customProductSalePrice) - Number(customProductPurchasePrice)) / Number(customProductPurchasePrice)) * 100)}٪
                        </span>
                      )}
                    </div>

                    <div className="p-6 space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="sm:col-span-2">
                          <label className="block text-xs font-bold text-slate-700 mb-1.5">
                            نام کالا یا خدمت <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={customProductName}
                            onChange={e => setCustomProductName(e.target.value)}
                            placeholder="مثال: لپ‌تاپ مدل Pro 16"
                            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-2xs text-slate-900 text-xs font-bold outline-none"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1.5">
                            دسته‌بندی کالا
                          </label>
                          <input
                            type="text"
                            value={customProductCategory}
                            onChange={e => setCustomProductCategory(e.target.value)}
                            placeholder="کالاهای عمومی"
                            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-2xs text-slate-900 text-xs outline-none"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1.5">
                            واحد سنجش اصلی
                          </label>
                          <select
                            value={customProductUnit}
                            onChange={e => setCustomProductUnit(e.target.value)}
                            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-2xs text-slate-900 text-xs font-bold outline-none"
                          >
                            <option value="عدد">عدد</option>
                            <option value="بسته">بسته</option>
                            <option value="کیلوگرم">کیلوگرم</option>
                            <option value="متر">متر</option>
                            <option value="کارتن">کارتن</option>
                            <option value="جین">جین</option>
                            <option value="جعبه">جعبه</option>
                            <option value="لیتر">لیتر</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1.5">
                            قیمت خرید ({currency})
                          </label>
                          <input
                            type="number"
                            value={customProductPurchasePrice}
                            onChange={e => setCustomProductPurchasePrice(e.target.value)}
                            placeholder="0"
                            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-2xs text-slate-900 font-mono text-left text-xs outline-none font-bold"
                            dir="ltr"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1.5">
                            قیمت فروش ({currency})
                          </label>
                          <input
                            type="number"
                            value={customProductSalePrice}
                            onChange={e => setCustomProductSalePrice(e.target.value)}
                            placeholder="0"
                            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-2xs text-emerald-700 font-bold font-mono text-left text-xs outline-none"
                            dir="ltr"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1.5">
                            موجودی اولیه در انبار
                          </label>
                          <input
                            type="number"
                            value={customProductInitialStock}
                            onChange={e => setCustomProductInitialStock(e.target.value)}
                            placeholder="0"
                            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-2xs text-sky-700 font-bold font-mono text-left text-xs outline-none"
                            dir="ltr"
                          />
                        </div>
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
                      {`PostgreSQL (${dbHost}:${dbPort})`}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1">
                      {`پایگاه داده اصلی: ${dbName}`}
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

      {/* 107 Tables Creation Progress Overlay Modal */}
      {saving && (
        <div className="fixed inset-0 z-[99999] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 select-none animate-in fade-in duration-200" dir="rtl">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-slate-200 text-center space-y-5">
            
            {/* Top Animated Icon */}
            <div className="w-16 h-16 mx-auto rounded-2xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600 shadow-sm relative">
              <Database className="w-8 h-8 animate-pulse text-indigo-600" />
              <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px] font-bold shadow-xs">
                <Sparkles className="w-3 h-3" />
              </div>
            </div>

            <div>
              <h3 className="text-base sm:text-lg font-black text-slate-900">
                در حال ساخت و سازمان‌دهی ۱۰۷ جدول پایگاه داده
              </h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                لطفاً شکیبا باشید؛ ساختارهای پایگاه داده، سال مالی، حساب‌های بانکی و ایندکس‌های مالی در حال آماده‌سازی امن هستند.
              </p>
            </div>

            {/* Progress Bar & Percentage */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                <span className="flex items-center gap-1.5">
                  <span className="inline-block w-2 h-2 rounded-full bg-indigo-600 animate-ping"></span>
                  <span>پیشرفت ساخت جداول:</span>
                </span>
                <span className="font-mono text-indigo-600 font-black text-sm">
                  {syncProgress.percent || Math.min(100, Math.round(((syncProgress.current || 1) / (syncProgress.total || 107)) * 100))}%
                </span>
              </div>

              <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-200 p-0.5">
                <div 
                  className="h-full bg-gradient-to-l from-indigo-600 to-indigo-500 rounded-full transition-all duration-300 relative shadow-sm"
                  style={{ width: `${Math.max(5, syncProgress.percent || Math.min(100, Math.round(((syncProgress.current || 1) / (syncProgress.total || 107)) * 100)))}%` }}
                >
                  <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                </div>
              </div>
            </div>

            {/* Table Detail Badges */}
            <div className="bg-slate-50 rounded-2xl p-3 border border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2 text-slate-600 font-bold">
                <Layers className="w-4 h-4 text-indigo-600" />
                <span>
                  جدول <span className="font-mono text-indigo-600 font-black">{syncProgress.current || 1}</span> از <span className="font-mono text-slate-900 font-black">{syncProgress.total || 107}</span>
                </span>
              </div>
              {syncProgress.tableName && (
                <div className="font-mono text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-200 max-w-[200px] truncate" dir="ltr">
                  {syncProgress.tableName}
                </div>
              )}
            </div>

            <p className="text-[11px] text-slate-500 font-medium">
              {syncProgress.message || 'در حال ایجاد جداول و ساختاردهی فیلدهای تخصصی پایگاه داده...'}
            </p>

          </div>
        </div>
      )}

    </div>
  );
}
