import React, { useState, useMemo } from 'react';
import { 
  User, 
  Building2, 
  Phone, 
  MapPin, 
  CreditCard, 
  DollarSign, 
  Check, 
  ArrowRight, 
  RotateCcw, 
  Sparkles, 
  AlertCircle, 
  ShieldCheck, 
  CheckCircle2, 
  Wallet, 
  Tag, 
  Hash, 
  FileText, 
  UserPlus,
  ChevronDown,
  Layers,
  Building,
  Plus,
  ExternalLink,
  ShoppingCart,
  Receipt
} from 'lucide-react';
import { toPersianDigits, addCommas } from '../../utils/format';
import CurrencyInput from '../ui/CurrencyInput';
import { addPerson } from '../../services/dataService';

interface MobilePersonCreatePageProps {
  persons?: any[];
  personGroups?: any[];
  personRoles?: any[];
  personCategories?: any[];
  storeSettings?: any;
  fetchPersons?: () => Promise<void>;
  setActiveTab?: (tab: string) => void;
  setCustomerId?: (id: any) => void;
  setReceiptPersonId?: (id: any) => void;
  setLedgerPersonId?: (id: any) => void;
  showNotification?: (msg: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
}

export default function MobilePersonCreatePage({
  persons = [],
  personGroups = [],
  personRoles = [],
  storeSettings,
  fetchPersons,
  setActiveTab,
  setCustomerId,
  setReceiptPersonId,
  setLedgerPersonId,
  showNotification,
}: MobilePersonCreatePageProps) {
  // Navigation / Section state
  const [activeSection, setActiveSection] = useState<'identity' | 'contact' | 'role' | 'financial'>('identity');

  // Form Fields - Identity
  const [personType, setPersonType] = useState<'real' | 'legal'>('real');
  const [title, setTitle] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [alias, setAlias] = useState('');
  const [fatherName, setFatherName] = useState('');
  const [nationalId, setNationalId] = useState('');
  const [economicCode, setEconomicCode] = useState('');
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [accountingCode, setAccountingCode] = useState('');

  // Form Fields - Contact
  const [mobile, setMobile] = useState('');
  const [phone, setPhone] = useState('');
  const [province, setProvince] = useState('');
  const [city, setCity] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [address, setAddress] = useState('');

  // Form Fields - Role & Group
  const [selectedRole, setSelectedRole] = useState<string>('customer');
  const [selectedRoles, setSelectedRoles] = useState<string[]>(['customer']);
  const [selectedGroup, setSelectedGroup] = useState<string>('');
  const [description, setDescription] = useState('');

  // Form Fields - Financial
  const [initialBalance, setInitialBalance] = useState('');
  const [initialBalanceType, setInitialBalanceType] = useState<'settled' | 'debtor' | 'creditor'>('settled');
  const [creditLimit, setCreditLimit] = useState('');
  const [bankName, setBankName] = useState('');
  const [bankAccount, setBankAccount] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [shebaNumber, setShebaNumber] = useState('');

  // UI state
  const [submitting, setSubmitting] = useState(false);
  const [createdPerson, setCreatedPerson] = useState<any | null>(null);

  // Currency label
  const currency = storeSettings?.currency || 'تومان';

  // Compute Full Name & Default Alias
  const computedFullName = useMemo(() => {
    if (personType === 'legal') {
      return companyName.trim() || 'شخص حقوقی';
    }
    const full = `${firstName.trim()} ${lastName.trim()}`.trim();
    if (title && full) return `${title} ${full}`;
    return full || 'شخص حقیقی';
  }, [personType, title, firstName, lastName, companyName]);

  // Suggested Aliases
  const aliasSuggestions = useMemo(() => {
    if (personType === 'legal') {
      if (!companyName.trim()) return [];
      return [
        companyName.trim(),
        `شرکت ${companyName.trim()}`,
        `فروشگاه ${companyName.trim()}`,
        `بازرگانی ${companyName.trim()}`
      ];
    }
    const full = `${firstName.trim()} ${lastName.trim()}`.trim();
    if (!full) return [];
    return [
      full,
      title ? `${title} ${full}` : '',
      lastName.trim(),
      fatherName ? `${full} (فرزند ${fatherName})` : ''
    ].filter(Boolean);
  }, [personType, title, firstName, lastName, companyName, fatherName]);

  // Duplicate Check Warning
  const duplicateWarning = useMemo(() => {
    const cleanMobile = mobile.trim().replace(/^0/, '');
    const cleanNationalId = nationalId.trim();

    if (cleanMobile.length >= 10) {
      const matchPhone = persons.find(p => {
        const pPhone = String(p.mobile || p.phone || '').trim().replace(/^0/, '');
        return pPhone && pPhone === cleanMobile;
      });
      if (matchPhone) {
        return {
          field: 'شماره موبایل',
          matchedName: matchPhone.name || matchPhone.companyName || `${matchPhone.firstName || ''} ${matchPhone.lastName || ''}`,
          personId: matchPhone.id
        };
      }
    }

    if (cleanNationalId.length >= 8) {
      const matchId = persons.find(p => p.nationalId && String(p.nationalId).trim() === cleanNationalId);
      if (matchId) {
        return {
          field: 'کد / شناسه ملی',
          matchedName: matchId.name || matchId.companyName || `${matchId.firstName || ''} ${matchId.lastName || ''}`,
          personId: matchId.id
        };
      }
    }

    return null;
  }, [mobile, nationalId, persons]);

  // Auto-generate next suggested accounting code
  const handleAutoGenerateAccountingCode = () => {
    let prefix = '10';
    if (selectedRole === 'supplier') prefix = '20';
    else if (selectedRole === 'employee') prefix = '30';

    let maxNum = 0;
    persons.forEach(p => {
      const code = String(p.accountingCode || p.personCode || '');
      if (code.startsWith(prefix)) {
        const suffix = Number(code.substring(prefix.length));
        if (!isNaN(suffix) && suffix > maxNum) {
          maxNum = suffix;
        }
      }
    });

    const nextCode = `${prefix}${(maxNum + 1).toString().padStart(4, '0')}`;
    setAccountingCode(nextCode);
    showNotification?.(`کد تفصیلی پیشنهادی: ${nextCode}`, 'info');
  };

  // Toggle role in multi-role array
  const toggleRole = (rId: string) => {
    setSelectedRoles(prev => {
      if (prev.includes(rId)) {
        if (prev.length === 1) return prev; // Keep at least one
        return prev.filter(r => r !== rId);
      } else {
        return [...prev, rId];
      }
    });
    setSelectedRole(rId);
  };

  // Reset form
  const handleResetForm = () => {
    setFirstName('');
    setLastName('');
    setCompanyName('');
    setTitle('');
    setAlias('');
    setFatherName('');
    setNationalId('');
    setEconomicCode('');
    setRegistrationNumber('');
    setAccountingCode('');
    setMobile('');
    setPhone('');
    setProvince('');
    setCity('');
    setPostalCode('');
    setAddress('');
    setSelectedRole('customer');
    setSelectedRoles(['customer']);
    setSelectedGroup('');
    setDescription('');
    setInitialBalance('');
    setInitialBalanceType('settled');
    setCreditLimit('');
    setBankName('');
    setBankAccount('');
    setCardNumber('');
    setShebaNumber('');
    setCreatedPerson(null);
    setActiveSection('identity');
  };

  // Validate and Submit
  const handleSavePerson = async (shouldResetAfter = false) => {
    if (personType === 'real') {
      if (!firstName.trim()) {
        showNotification?.('لطفاً نام شخص را وارد فرمایید.', 'warning');
        setActiveSection('identity');
        return;
      }
      if (!lastName.trim()) {
        showNotification?.('لطفاً نام خانوادگی شخص را وارد فرمایید.', 'warning');
        setActiveSection('identity');
        return;
      }
    } else {
      if (!companyName.trim()) {
        showNotification?.('لطفاً نام شرکت یا سازمان را وارد فرمایید.', 'warning');
        setActiveSection('identity');
        return;
      }
    }

    const cleanMobile = mobile.trim();
    if (cleanMobile && !/^09\d{9}$/.test(cleanMobile) && cleanMobile.length < 8) {
      showNotification?.('فرمت شماره موبایل وارد شده استاندارد نیست (مثال: ۰۹۱۲۳۴۵۶۷۸۹)', 'warning');
    }

    setSubmitting(true);
    try {
      const finalName = computedFullName;
      const finalAlias = alias.trim() || finalName;

      const bankAccountsList = [];
      if (bankName.trim() || bankAccount.trim() || cardNumber.trim() || shebaNumber.trim()) {
        bankAccountsList.push({
          bankName: bankName.trim(),
          accountNumber: bankAccount.trim(),
          cardNumber: cardNumber.trim(),
          shebaNumber: shebaNumber.trim(),
          isDefault: true,
        });
      }

      const payload = {
        personType,
        title: title.trim(),
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        companyName: companyName.trim(),
        name: finalName,
        fullName: finalName,
        alias: finalAlias,
        fatherName: fatherName.trim(),
        nationalId: nationalId.trim(),
        economicCode: economicCode.trim(),
        registrationNumber: registrationNumber.trim(),
        accountingCode: accountingCode.trim(),
        
        mobile: cleanMobile,
        phone: phone.trim() || cleanMobile,
        province: province.trim(),
        city: city.trim(),
        postalCode: postalCode.trim(),
        address: address.trim(),

        role: selectedRole,
        roles: Array.from(new Set([selectedRole, ...selectedRoles])),
        group: selectedGroup,
        groupId: selectedGroup,
        description: description.trim(),

        initialBalance: Number(initialBalance) || 0,
        initialBalanceType,
        creditLimit: Number(creditLimit) || 0,
        bankAccounts: bankAccountsList,
        isActive: true,
      };

      const result = await addPerson(payload as any);
      await fetchPersons?.();

      showNotification?.(`شخص «${finalName}» با موفقیت در سیستم ثبت گردید.`, 'success');

      if (shouldResetAfter) {
        handleResetForm();
      } else {
        setCreatedPerson(result || payload);
      }
    } catch (err: any) {
      console.error('Error adding person on mobile:', err);
      showNotification?.(err?.message || 'خطا در ثبت اطلاعات شخص.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Role configuration
  const ROLE_OPTIONS = [
    { id: 'customer', label: 'مشتری', color: 'emerald', icon: <User className="w-3.5 h-3.5" /> },
    { id: 'supplier', label: 'تامین‌کننده', color: 'amber', icon: <Building className="w-3.5 h-3.5" /> },
    { id: 'colleague', label: 'همکار / بازاریاب', color: 'indigo', icon: <Tag className="w-3.5 h-3.5" /> },
    { id: 'employee', label: 'پرسنل / کارمند', color: 'purple', icon: <Building2 className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-28 font-sans select-none" dir="rtl">
      {/* Sticky Mobile Top App Bar */}
      <div className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 py-3 flex items-center justify-between shadow-2xs">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setActiveTab?.('persons')}
            className="w-9 h-9 rounded-xl flex items-center justify-center bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors"
            title="بازگشت به لیست اشخاص"
          >
            <ArrowRight className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-1.5">
              <UserPlus className="w-4 h-4 text-emerald-600" />
              <span>ثبت شخص و طرف‌حساب جدید</span>
            </h1>
            <p className="text-[11px] text-slate-400 font-medium">فرم ویژه و بهینه‌سازی شده همراه</p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleResetForm}
          className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors rounded-lg"
          title="پاک کردن فرم"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {/* Main Container */}
      <div className="p-4 max-w-xl mx-auto space-y-4">
        {/* Duplicate Warning Banner */}
        {duplicateWarning && (
          <div className="p-3.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-2xl flex items-start gap-3 shadow-xs animate-in fade-in">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs">
              <p className="font-bold text-amber-900 dark:text-amber-200">
                طرف‌حساب مشابه در سیستم یافت شد!
              </p>
              <p className="text-amber-700 dark:text-amber-400 mt-0.5 leading-relaxed">
                {duplicateWarning.field} وارد شده قبلاً برای شخص «{duplicateWarning.matchedName}» ثبت شده است.
              </p>
            </div>
          </div>
        )}

        {/* Section Tabs Pill Selector */}
        <div className="grid grid-cols-4 gap-1.5 bg-slate-200/70 dark:bg-slate-800/70 p-1 rounded-2xl">
          <button
            type="button"
            onClick={() => setActiveSection('identity')}
            className={`py-2 px-1 text-center rounded-xl text-xs font-bold transition-all ${
              activeSection === 'identity'
                ? 'bg-white dark:bg-slate-700 text-indigo-700 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            هویتی
          </button>
          <button
            type="button"
            onClick={() => setActiveSection('contact')}
            className={`py-2 px-1 text-center rounded-xl text-xs font-bold transition-all ${
              activeSection === 'contact'
                ? 'bg-white dark:bg-slate-700 text-indigo-700 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            تماس
          </button>
          <button
            type="button"
            onClick={() => setActiveSection('role')}
            className={`py-2 px-1 text-center rounded-xl text-xs font-bold transition-all ${
              activeSection === 'role'
                ? 'bg-white dark:bg-slate-700 text-indigo-700 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            نقش
          </button>
          <button
            type="button"
            onClick={() => setActiveSection('financial')}
            className={`py-2 px-1 text-center rounded-xl text-xs font-bold transition-all ${
              activeSection === 'financial'
                ? 'bg-white dark:bg-slate-700 text-indigo-700 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            مالی
          </button>
        </div>

        {/* SECTION 1: IDENTITY */}
        {activeSection === 'identity' && (
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4 animate-in fade-in">
            {/* Person Type Segmented Switch */}
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-2">نوع طرف‌حساب:</label>
              <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
                <button
                  type="button"
                  onClick={() => setPersonType('real')}
                  className={`py-2.5 rounded-lg text-xs font-black flex items-center justify-center gap-2 transition-all ${
                    personType === 'real'
                      ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-xs'
                      : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  <User className="w-4 h-4" />
                  <span>شخص حقیقی (فرد)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPersonType('legal')}
                  className={`py-2.5 rounded-lg text-xs font-black flex items-center justify-center gap-2 transition-all ${
                    personType === 'legal'
                      ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-xs'
                      : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  <Building2 className="w-4 h-4" />
                  <span>شخص حقوقی (شرکت)</span>
                </button>
              </div>
            </div>

            {/* REAL PERSON FIELDS */}
            {personType === 'real' ? (
              <>
                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-1">
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">پیشوند</label>
                    <select
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full h-11 px-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold outline-none text-slate-800 dark:text-slate-200"
                    >
                      <option value="">بدون پیشوند</option>
                      <option value="آقای">آقای</option>
                      <option value="خانم">خانم</option>
                      <option value="دکتر">دکتر</option>
                      <option value="مهندس">مهندس</option>
                      <option value="استاد">استاد</option>
                      <option value="حاج">حاج</option>
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                      نام <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="نام کوچک..."
                      className="w-full h-11 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold outline-none focus:border-indigo-500 text-slate-800 dark:text-slate-100"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                    نام خانوادگی <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="نام خانوادگی کامل..."
                    className="w-full h-11 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold outline-none focus:border-indigo-500 text-slate-800 dark:text-slate-100"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">نام پدر</label>
                    <input
                      type="text"
                      value={fatherName}
                      onChange={(e) => setFatherName(e.target.value)}
                      placeholder="اختیاری..."
                      className="w-full h-11 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold outline-none text-slate-800 dark:text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">کد ملی</label>
                    <input
                      type="text"
                      value={nationalId}
                      onChange={(e) => setNationalId(e.target.value)}
                      inputMode="numeric"
                      placeholder="۱۰ رقمی..."
                      maxLength={10}
                      className="w-full h-11 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-bold outline-none text-slate-800 dark:text-slate-100 text-left"
                      dir="ltr"
                    />
                  </div>
                </div>
              </>
            ) : (
              /* LEGAL PERSON FIELDS */
              <>
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                    نام کامل شرکت / سازمان <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="نام رسمی حقوقی..."
                    className="w-full h-11 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold outline-none focus:border-indigo-500 text-slate-800 dark:text-slate-100"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">شناسه ملی</label>
                    <input
                      type="text"
                      value={nationalId}
                      onChange={(e) => setNationalId(e.target.value)}
                      inputMode="numeric"
                      placeholder="۱۱ رقمی..."
                      maxLength={11}
                      className="w-full h-11 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-bold outline-none text-slate-800 dark:text-slate-100 text-left"
                      dir="ltr"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">شماره ثبت</label>
                    <input
                      type="text"
                      value={registrationNumber}
                      onChange={(e) => setRegistrationNumber(e.target.value)}
                      inputMode="numeric"
                      placeholder="شماره ثبت شرکت..."
                      className="w-full h-11 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-bold outline-none text-slate-800 dark:text-slate-100 text-left"
                      dir="ltr"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">کد اقتصادی</label>
                  <input
                    type="text"
                    value={economicCode}
                    onChange={(e) => setEconomicCode(e.target.value)}
                    inputMode="numeric"
                    placeholder="کد اقتصادی..."
                    className="w-full h-11 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-bold outline-none text-slate-800 dark:text-slate-100 text-left"
                    dir="ltr"
                  />
                </div>
              </>
            )}

            {/* ALIAS & DISPLAY TITLE */}
            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                نام نمایشی / تابلوی فروشگاه (Alias)
              </label>
              <input
                type="text"
                value={alias}
                onChange={(e) => setAlias(e.target.value)}
                placeholder={computedFullName}
                className="w-full h-11 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold outline-none text-slate-800 dark:text-slate-100"
              />
              {aliasSuggestions.length > 0 && !alias && (
                <div className="flex flex-wrap items-center gap-1.5 mt-2">
                  <span className="text-[10px] text-slate-400">پیشنهادات سریع:</span>
                  {aliasSuggestions.map((sug, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setAlias(sug)}
                      className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/50"
                    >
                      {sug}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* ACCOUNTING CODE */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-600 dark:text-slate-400">کد حسابداری تفصیلی</label>
                <button
                  type="button"
                  onClick={handleAutoGenerateAccountingCode}
                  className="text-[11px] text-indigo-600 dark:text-indigo-400 font-bold flex items-center gap-1 hover:underline"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>تولید خودکار کد</span>
                </button>
              </div>
              <input
                type="text"
                value={accountingCode}
                onChange={(e) => setAccountingCode(e.target.value)}
                placeholder="اختیاری (در صورت خالی بودن خودکار تخصیص می‌یابد)"
                className="w-full h-11 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-bold outline-none text-slate-800 dark:text-slate-100 text-left"
                dir="ltr"
              />
            </div>
          </div>
        )}

        {/* SECTION 2: CONTACT & ADDRESS */}
        {activeSection === 'contact' && (
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4 animate-in fade-in">
            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                شماره تلفن همراه اصلی
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  inputMode="tel"
                  placeholder="۰۹۱۲۳۴۵۶۷۸۹"
                  maxLength={11}
                  className="w-full h-11 pr-10 pl-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-mono font-bold outline-none text-slate-800 dark:text-slate-100 text-left"
                  dir="ltr"
                />
                <Phone className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                تلفن ثابت / دفتر
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                inputMode="tel"
                placeholder="۰۲۱۸۸۸۸..."
                className="w-full h-11 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-bold outline-none text-slate-800 dark:text-slate-100 text-left"
                dir="ltr"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">استان</label>
                <input
                  type="text"
                  value={province}
                  onChange={(e) => setProvince(e.target.value)}
                  placeholder="مثال: تهران"
                  className="w-full h-11 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold outline-none text-slate-800 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">شهر</label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="مثال: تهران"
                  className="w-full h-11 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold outline-none text-slate-800 dark:text-slate-100"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                آدرس پستی کامل
              </label>
              <textarea
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                rows={2}
                placeholder="خیابان، کوچه، پلاک، واحد..."
                className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold outline-none text-slate-800 dark:text-slate-100 resize-none leading-relaxed"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">کد پستی</label>
              <input
                type="text"
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value)}
                inputMode="numeric"
                maxLength={10}
                placeholder="۱۰ رقمی..."
                className="w-full h-11 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-bold outline-none text-slate-800 dark:text-slate-100 text-left"
                dir="ltr"
              />
            </div>
          </div>
        )}

        {/* SECTION 3: ROLE & GROUP */}
        {activeSection === 'role' && (
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4 animate-in fade-in">
            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-2">
                نقش‌های طرف‌حساب (قابلیت انتخاب چندگانه):
              </label>
              <div className="grid grid-cols-2 gap-2">
                {ROLE_OPTIONS.map((r) => {
                  const isSelected = selectedRoles.includes(r.id);
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => toggleRole(r.id)}
                      className={`p-3 rounded-2xl border text-right flex items-center justify-between transition-all ${
                        isSelected
                          ? 'bg-indigo-50 dark:bg-indigo-950/50 border-indigo-500 text-indigo-700 dark:text-indigo-300 font-black shadow-xs'
                          : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-bold'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {r.icon}
                        <span className="text-xs">{r.label}</span>
                      </div>
                      {isSelected && <Check className="w-4 h-4 text-indigo-600 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Person Group Selector */}
            {personGroups && personGroups.length > 0 && (
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                  گروه‌بندی طرف‌حساب
                </label>
                <select
                  value={selectedGroup}
                  onChange={(e) => setSelectedGroup(e.target.value)}
                  className="w-full h-11 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold outline-none text-slate-800 dark:text-slate-200"
                >
                  <option value="">بدون گروه مشخص</option>
                  {personGroups.map((g: any) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                توضیحات و یادداشت داخلی
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="یادداشت‌های ویژه یا شرایط کاری با این شخص..."
                className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold outline-none text-slate-800 dark:text-slate-100 resize-none leading-relaxed"
              />
            </div>
          </div>
        )}

        {/* SECTION 4: FINANCIAL & CREDIT */}
        {activeSection === 'financial' && (
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4 animate-in fade-in">
            {/* Initial Balance */}
            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                مانده‌حساب اول‌دوره ({currency})
              </label>
              <div className="space-y-2">
                <CurrencyInput
                  value={initialBalance}
                  onChange={(e: any) => setInitialBalance(e.target.value)}
                  placeholder="مبلغ به عدد..."
                  className="w-full h-11 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-mono font-bold outline-none text-slate-800 dark:text-slate-100 text-left"
                />

                <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setInitialBalanceType('settled')}
                    className={`py-2 text-xs font-bold rounded-lg transition-all ${
                      initialBalanceType === 'settled'
                        ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-xs'
                        : 'text-slate-500'
                    }`}
                  >
                    بی‌حساب (صفر)
                  </button>
                  <button
                    type="button"
                    onClick={() => setInitialBalanceType('debtor')}
                    className={`py-2 text-xs font-bold rounded-lg transition-all ${
                      initialBalanceType === 'debtor'
                        ? 'bg-rose-500 text-white shadow-xs'
                        : 'text-slate-500'
                    }`}
                  >
                    بدهکار به ما
                  </button>
                  <button
                    type="button"
                    onClick={() => setInitialBalanceType('creditor')}
                    className={`py-2 text-xs font-bold rounded-lg transition-all ${
                      initialBalanceType === 'creditor'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-slate-500'
                    }`}
                  >
                    بستانکار از ما
                  </button>
                </div>
              </div>
            </div>

            {/* Credit Limit */}
            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                سقف اعتبار معامله ({currency})
              </label>
              <CurrencyInput
                value={creditLimit}
                onChange={(e: any) => setCreditLimit(e.target.value)}
                placeholder="صفر یعنی نامحدود..."
                className="w-full h-11 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-mono font-bold outline-none text-slate-800 dark:text-slate-100 text-left"
              />
              <span className="text-[10px] text-slate-400 block mt-1">
                حداکثر مانده بدهی مجاز پیش از هشدار هنگام صدور فاکتور
              </span>
            </div>

            {/* Bank Card / Sheba */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3">
              <h3 className="text-xs font-black text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <CreditCard className="w-4 h-4 text-indigo-500" />
                <span>اطلاعات بانکی جهت واریز وجه</span>
              </h3>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">نام بانک</label>
                  <input
                    type="text"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    placeholder="مثال: ملی، ملت..."
                    className="w-full h-11 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold outline-none text-slate-800 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">شماره حساب</label>
                  <input
                    type="text"
                    value={bankAccount}
                    onChange={(e) => setBankAccount(e.target.value)}
                    placeholder="شماره حساب..."
                    className="w-full h-11 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-bold outline-none text-slate-800 dark:text-slate-100 text-left"
                    dir="ltr"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">شماره کارت ۱۶ رقمی</label>
                <input
                  type="text"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(e.target.value)}
                  inputMode="numeric"
                  maxLength={16}
                  placeholder="۶۰۳۷۹۹..."
                  className="w-full h-11 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-mono font-bold outline-none text-slate-800 dark:text-slate-100 text-left tracking-wider"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">شماره شبا (IBAN)</label>
                <div className="relative">
                  <input
                    type="text"
                    value={shebaNumber}
                    onChange={(e) => setShebaNumber(e.target.value)}
                    maxLength={26}
                    placeholder="IR..."
                    className="w-full h-11 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-bold outline-none text-slate-800 dark:text-slate-100 text-left"
                    dir="ltr"
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* SUCCESS MODAL / POPUP OVERLAY */}
      {createdPerson && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-sm w-full border border-slate-200 dark:border-slate-800 shadow-2xl text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center mx-auto shadow-md shadow-emerald-500/20">
              <CheckCircle2 className="w-9 h-9" />
            </div>

            <div>
              <h2 className="text-base font-black text-slate-900 dark:text-white">
                طرف‌حساب با موفقیت ثبت شد
              </h2>
              <p className="text-xs text-slate-500 mt-1 font-bold">
                «{createdPerson.name || createdPerson.companyName}»
              </p>
            </div>

            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setCustomerId?.(createdPerson.id);
                  setActiveTab?.('create_sale');
                }}
                className="w-full py-2.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow-sm"
              >
                <ShoppingCart className="w-4 h-4" />
                <span>صدور فاکتور فروش برای این شخص</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setReceiptPersonId?.(createdPerson.id);
                  setActiveTab?.('receive');
                }}
                className="w-full py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow-sm"
              >
                <Receipt className="w-4 h-4" />
                <span>ثبت دریافت وجه (رسید دریافت)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setLedgerPersonId?.(createdPerson.id);
                  setActiveTab?.('person_ledger');
                }}
                className="w-full py-2.5 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <FileText className="w-4 h-4 text-slate-500" />
                <span>مشاهده پرونده و گردش حساب</span>
              </button>

              <button
                type="button"
                onClick={handleResetForm}
                className="w-full py-2 px-3 text-xs text-slate-500 dark:text-slate-400 font-bold hover:text-slate-700 dark:hover:text-slate-200 transition"
              >
                ثبت شخص دیگر
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sticky Bottom Action Buttons */}
      <div className="fixed bottom-0 inset-x-0 z-30 p-3 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 flex items-center gap-2 max-w-xl mx-auto shadow-lg">
        <button
          type="button"
          onClick={() => handleSavePerson(false)}
          disabled={submitting}
          className="flex-1 h-12 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-sm flex items-center justify-center gap-2 shadow-md shadow-emerald-500/25 active:scale-98 transition disabled:opacity-50 cursor-pointer"
        >
          <Check className="w-5 h-5" />
          <span>{submitting ? 'در حال ثبت...' : 'ذخیره و ثبت شخص'}</span>
        </button>

        <button
          type="button"
          onClick={() => handleSavePerson(true)}
          disabled={submitting}
          className="px-4 h-12 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center justify-center shrink-0 transition cursor-pointer"
          title="ثبت این شخص و آماده‌سازی برای ثبت شخص بعدی"
        >
          ثبت و بعدی
        </button>
      </div>
    </div>
  );
}
