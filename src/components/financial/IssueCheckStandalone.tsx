import React, { useState, useEffect, useMemo } from "react";
import { updateIssuedCheck, getIssuedChecks, getCheckbooks, getPersons, getAccounts } from "../../services/dataService";
import { getStoreSettings } from "../../services/settingsService";
import { addTransaction } from "../../services/invoiceService";
import { convertToGregorian, formatDateDisplay } from "../../utils/format";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, Building2, User, CreditCard, Save, Calendar, Paperclip, UploadCloud, FileText, AlertCircle, Plus, Info, X, ChevronDown, ChevronUp, Edit3 } from "lucide-react";
import Select from "react-select";
import CreatableSelect from "react-select/creatable";
import CurrencyInput from "../common/CurrencyInput";
import CustomDatePicker from "../ui/CustomDatePicker";
import num2persian from "num2persian";

export default function IssueCheckStandalone() {
  const [persons, setPersons] = useState<any[]>([]);
  const [checkbooks, setCheckbooks] = useState<any[]>([]);
  const [allChecks, setAllChecks] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [currency, setCurrency] = useState("تومان");
  
  // Step 1: Selection
  const [payeeId, setPayeeId] = useState("");
  const [checkbookId, setCheckbookId] = useState("");
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [checkLeafId, setCheckLeafId] = useState("");
  const [checkNumber, setCheckNumber] = useState("");
  
  // Step 2: Data Entry
  const [amount, setAmount] = useState("");
  const [sayadId, setSayadId] = useState("");
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState("");
  const [payeeName, setPayeeName] = useState(""); // Free text or selected for "در وجه"
  const [reason, setReason] = useState("");
  const [description, setDescription] = useState("");
  
  const [isDirty, setIsDirty] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState("");
  const [showPreviewMobile, setShowPreviewMobile] = useState(false);

  const load = async () => {
    setPersons(await getPersons());
    setCheckbooks(await getCheckbooks());
    setAllChecks(await getIssuedChecks());
    setAccounts(await getAccounts());
    const settings = await getStoreSettings();
    if (settings?.currency) {
      setCurrency(settings.currency);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const availableLeaves = useMemo(() => {
    if (!checkbookId) return [];
    return allChecks
      .filter(c => c.checkbookId === checkbookId && c.status === 'blank')
      .sort((a, b) => Number(a.checkNumber) - Number(b.checkNumber));
  }, [allChecks, checkbookId]);

  // Options arrays to guarantee correct labels
  const personOptions = useMemo(() => persons.map(p => ({ value: p.id, label: p.name })), [persons]);
  const payeeNameOptions = useMemo(() => persons.map(p => ({ value: p.name, label: p.name })), [persons]);
  const checkbookOptions = useMemo(() => {
    return checkbooks.map(cb => {
      const acc = accounts.find(a => String(a.id) === String(cb.accountId));
      return { 
        value: cb.id, 
        label: acc ? `${acc.bankName} - شعبه ${acc.branchName || 'مرکزی'} - حساب ${acc.accountNumber}` : `دسته‌چک ${cb.id}`
      };
    });
  }, [checkbooks, accounts]);
  const leafOptions = useMemo(() => availableLeaves.map(l => ({ value: l.id, label: `سریال ${l.checkNumber}` })), [availableLeaves]);

  // Set dirty state
  useEffect(() => {
    if (payeeId || amount || checkbookId || checkNumber || sayadId || dueDate || reason || description) {
      setIsDirty(true);
    } else {
      setIsDirty(false);
    }
  }, [payeeId, amount, checkbookId, checkNumber, sayadId, dueDate, reason, description]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty && !success) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty, success]);

  // Real-time validation
  useEffect(() => {
    const newErrors: Record<string, string> = {};
    if (dueDate && issueDate && dueDate < issueDate) {
      newErrors.dueDate = "تاریخ سررسید نمی‌تواند قبل از تاریخ صدور باشد.";
    }
    setErrors(newErrors);
  }, [dueDate, issueDate]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!payeeId) newErrors.payeeId = "شخص مرتبط را انتخاب کنید.";
    if (!checkbookId) newErrors.checkbookId = "دسته‌چک را انتخاب کنید.";
    if (!checkLeafId) newErrors.checkLeafId = "شماره برگ چک را انتخاب کنید.";
    if (!amount || Number(amount) <= 0) newErrors.amount = "مبلغ چک نامعتبر است.";
    if (!issueDate) newErrors.issueDate = "تاریخ صدور را مشخص کنید.";
    if (!dueDate) newErrors.dueDate = "تاریخ سررسید را مشخص کنید.";
    if (!payeeName.trim()) newErrors.payeeName = "متن در وجه را وارد کنید.";
    if (dueDate && issueDate && dueDate < issueDate) newErrors.dueDate = "تاریخ سررسید نمی‌تواند قبل از صدور باشد.";
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const confirmSave = () => {
    if (!validateForm()) {
      setSubmitError("لطفاً خطاهای فرم را برطرف کنید.");
      return;
    }
    setShowConfirmModal(true);
  };

  const handleSave = async (status: "issued" | "draft") => {
    setSubmitError("");
    setSuccess(false);

    if (!validateForm()) {
      setSubmitError("لطفاً خطاهای فرم را برطرف کنید.");
      return;
    }

    setLoading(true);
    try {
      const finalIssueDate = convertToGregorian(issueDate || new Date().toISOString());
      const finalDueDate = convertToGregorian(dueDate);

      await updateIssuedCheck(checkLeafId, {
        payeeId,
        payeeName, 
        amount: Number(amount),
        checkbookId,
        checkNumber,
        sayadId,
        issueDate: finalIssueDate,
        dueDate: finalDueDate,
        reason,
        description,
        status: status
      });

      if (status === "issued") {
        const person = persons.find(p => String(p.id) === String(payeeId)) || { name: payeeName };
        const savedTx = await addTransaction({
          type: "pay",
          method: "check",
          personId: payeeId,
          amount: Number(amount),
          date: finalIssueDate,
          description: description || `پرداخت چک به شماره ${checkNumber} در وجه ${person.name || 'نامشخص'}`,
          checkNumber: checkNumber,
          checkDueDate: finalDueDate,
          checkbookId: checkbookId,
          sourceType: "check_issued",
          sourceId: checkLeafId
        });
        
        if (savedTx && savedTx.receiptNumber) {
           await updateIssuedCheck(checkLeafId, { receiptNumber: savedTx.receiptNumber });
        }
      }
      setSuccess(true);
      setIsDirty(false);
      
      await load();
      
      setTimeout(() => {
        setPayeeId("");
        setCheckbookId("");
        setCheckLeafId("");
        setCheckNumber("");
        setAmount("");
        setSayadId("");
        setDueDate("");
        setPayeeName("");
        setReason("");
        setDescription("");
        setSuccess(false);
      }, 3000);
    } catch (err: any) {
      setSubmitError(err.message || "خطا در ثبت چک");
    } finally {
      setLoading(false);
    }
  };

  const selectedCheckbook = useMemo(() => {
    const cb = checkbooks.find(c => c.id === checkbookId);
    if (!cb) return null;
    const acc = accounts.find(a => String(a.id) === String(cb.accountId));
    return { ...cb, ...acc };
  }, [checkbooks, checkbookId, accounts]);

  const handlePersonChange = (val: any) => {
    const newPersonId = val?.value || '';
    setPayeeId(newPersonId);
    
    if (!newPersonId) {
       setCheckbookId('');
       setCheckLeafId('');
       setCheckNumber('');
       setPayeeName('');
    } else {
       const person = persons.find(p => p.id === newPersonId);
       if (person) setPayeeName(person.name);
    }
    
    if (errors.payeeId) setErrors(prev => ({...prev, payeeId: ''}));
  };

  return (
    <div className="p-4 md:p-8 w-full font-sans" dir="rtl">
      <div className="flex flex-col xl:flex-row gap-8">
        
        {/* Right Column: Form */}
        <div className="w-full xl:w-2/3 space-y-8">
          <div className="flex items-center justify-between bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center">
                <CreditCard className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl font-black text-slate-800">صدور چک پرداختنی</h1>
                <p className="text-slate-500 text-sm mt-1">انتخاب شخص، دسته‌چک و ثبت اطلاعات روی چک</p>
              </div>
            </div>
          </div>

          <AnimatePresence>
            {success && (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl flex items-center gap-3">
                <CheckCircle className="w-6 h-6 text-emerald-500" />
                <span className="font-bold">چک با موفقیت صادر و ثبت شد.</span>
              </motion.div>
            )}
            
            {submitError && (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl flex items-center gap-3">
                <AlertCircle className="w-6 h-6 text-rose-500" />
                <span className="font-bold">{submitError}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Section 1: Selection (Person -> Checkbook -> Leaf) */}
          <section className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
             <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
              <User className="w-5 h-5 text-indigo-500" />
              <h2 className="font-bold text-slate-700">۱. انتخاب شخص و برگ چک</h2>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 relative">
               
               <div className="space-y-2 md:col-span-2">
                <div className="flex justify-between items-center">
                   <label className="text-sm font-bold text-slate-700 flex items-center gap-1">
                     شخص مرتبط (گیرنده در سیستم) <span className="text-rose-500">*</span>
                   </label>
                   <button type="button" className="text-xs text-indigo-600 font-bold hover:bg-indigo-50 px-2 py-1 rounded flex items-center gap-1 transition-colors">
                     <Plus className="w-3 h-3" /> شخص جدید
                   </button>
                </div>
                <Select
                  options={personOptions}
                  value={personOptions.find(opt => opt.value === payeeId) || null}
                  onChange={handlePersonChange}
                  placeholder="جستجو و انتخاب شخص..."
                  className="font-sans"
                  menuPortalTarget={document.body}
                  styles={{
                    menuPortal: base => ({ ...base, zIndex: 9999 }),
                    control: (base) => ({
                      ...base,
                      borderRadius: '1rem',
                      padding: '4px',
                      borderColor: errors.payeeId ? '#f43f5e' : '#e2e8f0',
                      boxShadow: 'none',
                      '&:hover': { borderColor: '#cbd5e1' }
                    })
                  }}
                  isClearable
                />
                {errors.payeeId && <p className="text-xs text-rose-500 flex items-center gap-1 mt-1"><AlertCircle className="w-3 h-3"/> {errors.payeeId}</p>}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 flex items-center gap-1">
                  دسته‌چک <span className="text-rose-500">*</span>
                </label>
                <Select
                  isDisabled={!payeeId}
                  options={checkbookOptions}
                  value={checkbookOptions.find(opt => opt.value === checkbookId) || null}
                  onChange={(val: any) => {
                     setCheckbookId(val?.value || '');
                     setCheckLeafId(''); 
                     setCheckNumber('');
                     if (errors.checkbookId) setErrors(prev => ({...prev, checkbookId: ''}));
                  }}
                  placeholder="ابتدا شخص را انتخاب کنید..."
                  className="font-sans"
                  menuPortalTarget={document.body}
                  styles={{
                    menuPortal: base => ({ ...base, zIndex: 9999 }),
                    control: (base) => ({
                      ...base,
                      borderRadius: '1rem',
                      padding: '4px',
                      borderColor: errors.checkbookId ? '#f43f5e' : '#e2e8f0',
                      boxShadow: 'none',
                      '&:hover': { borderColor: '#cbd5e1' }
                    })
                  }}
                  isClearable
                />
                {errors.checkbookId && <p className="text-xs text-rose-500 flex items-center gap-1 mt-1"><AlertCircle className="w-3 h-3"/> {errors.checkbookId}</p>}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">برگ چک (سفید) <span className="text-rose-500">*</span></label>
                <Select
                  isDisabled={!checkbookId}
                  options={leafOptions}
                  value={leafOptions.find(opt => opt.value === checkLeafId) || null}
                  onChange={(val: any) => {
                     setCheckLeafId(val?.value || '');
                     const leaf = availableLeaves.find(l => l.id === val?.value);
                     setCheckNumber(leaf ? leaf.checkNumber : '');
                     if (errors.checkLeafId) setErrors(prev => ({...prev, checkLeafId: ''}));
                  }}
                  placeholder={!checkbookId ? "ابتدا دسته‌چک را انتخاب کنید..." : "انتخاب از برگ‌های سفید..."}
                  className="font-sans"
                  menuPortalTarget={document.body}
                  styles={{
                    menuPortal: base => ({ ...base, zIndex: 9999 }),
                    control: (base) => ({
                      ...base,
                      borderRadius: '1rem',
                      padding: '4px',
                      borderColor: errors.checkLeafId ? '#f43f5e' : '#e2e8f0',
                      boxShadow: 'none',
                      '&:hover': { borderColor: '#cbd5e1' }
                    })
                  }}
                  isClearable
                />
                {errors.checkLeafId && <p className="text-xs text-rose-500 flex items-center gap-1 mt-1"><AlertCircle className="w-3 h-3"/> {errors.checkLeafId}</p>}
                {checkbookId && availableLeaves.length === 0 && (
                    <p className="text-xs text-amber-500 flex items-center gap-1 mt-1"><Info className="w-3 h-3"/> برگ سفیدی موجود نیست.</p>
                )}
              </div>
            </div>
          </section>

          {/* Section 2: Check Data Entry */}
          <section className={`bg-white rounded-3xl shadow-sm border transition-colors overflow-hidden ${!checkLeafId ? 'border-slate-100 opacity-50' : 'border-slate-100'}`}>
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
              <Edit3 className={`w-5 h-5 ${!checkLeafId ? 'text-slate-400' : 'text-emerald-500'}`} />
              <h2 className="font-bold text-slate-700">۲. مشخصات روی چک</h2>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 relative">
              
              {!checkLeafId && (
                <div className="absolute inset-0 z-10 bg-white/40 cursor-not-allowed backdrop-blur-[1px]"></div>
              )}

              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-bold text-slate-700">مبلغ چک ({currency}) <span className="text-rose-500">*</span></label>
                <CurrencyInput 
                  value={amount} 
                  onChange={(e: any) => {
                    let val = e;
                    if (e && e.target && e.target.value !== undefined) {
                      val = e.target.value;
                    } else if (e && typeof e === 'string') {
                      val = e;
                    } else if (e && e.value !== undefined) {
                      val = e.value;
                    } else if (typeof e === 'object' && Object.keys(e).length === 0) {
                      val = ''; // Sometimes empty object is passed
                    } else if (typeof e === 'number') {
                      val = e.toString();
                    }
                    if (typeof val === 'object') {
                      console.error("CurrencyInput onChange returned an object that we didn't handle:", e);
                      val = '';
                    }
                    setAmount(val);
                    if (errors.amount) setErrors(prev => ({...prev, amount: ''}));
                  }} 
                  currencyLabel={currency}
                  className={`w-full border-2 rounded-2xl p-4 text-left font-sans outline-none transition-colors font-bold text-2xl ${errors.amount ? 'border-rose-300 focus:border-rose-500' : 'border-slate-200 focus:border-indigo-500'} disabled:bg-slate-50 disabled:text-slate-400`}
                  disabled={!checkLeafId}
                />
                <div className="h-6">
                   {amount && Number(amount) > 0 ? (
                     <p className="text-sm text-indigo-600 font-bold flex items-center gap-1">
                       <span className="w-2 h-2 rounded-full bg-indigo-400 inline-block"></span>
                       {num2persian(amount)} {currency}
                     </p>
                   ) : errors.amount ? (
                     <p className="text-sm text-rose-500 flex items-center gap-1 mt-1"><AlertCircle className="w-4 h-4"/> {errors.amount}</p>
                   ) : null}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 flex items-center gap-1">تاریخ صدور <span className="text-rose-500">*</span></label>
                <div className={`flex flex-col p-2 border-2 rounded-2xl transition-all duration-200 ${errors.issueDate ? "border-rose-300 bg-rose-50/50" : "border-slate-200 hover:border-slate-300 focus-within:border-indigo-500 focus-within:shadow-[0_0_0_4px_rgba(79,70,229,0.1)] bg-slate-50/30"} ${!checkLeafId ? 'opacity-50 pointer-events-none' : 'bg-white'}`}>
                   <div className="flex items-center gap-3 px-1">
                     <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center shadow-sm border border-slate-100 shrink-0 text-slate-500 group-focus-within:text-indigo-600 transition-colors">
                       <Calendar className="w-6 h-6" />
                     </div>
                     <div className="flex-1 w-full date-picker-lg">
                       <CustomDatePicker 
                         value={issueDate} 
                         onChange={setIssueDate} 
                       />
                     </div>
                   </div>
                </div>
                {errors.issueDate && <p className="text-xs text-rose-500 flex items-center gap-1 mt-1"><AlertCircle className="w-3 h-3"/> {errors.issueDate}</p>}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 flex items-center gap-1">تاریخ سررسید <span className="text-rose-500">*</span></label>
                <div className={`flex flex-col p-2 border-2 rounded-2xl transition-all duration-200 ${errors.dueDate ? "border-rose-300 bg-rose-50/50" : "border-indigo-200 hover:border-indigo-300 focus-within:border-indigo-500 focus-within:shadow-[0_0_0_4px_rgba(79,70,229,0.15)] bg-indigo-50/10"} ${!checkLeafId ? 'opacity-50 pointer-events-none' : 'bg-white'}`}>
                   <div className="flex items-center gap-3 px-1">
                     <div className="w-12 h-12 rounded-xl bg-indigo-600 flex items-center justify-center shadow-md border border-indigo-500 shrink-0 text-white">
                       <Calendar className="w-6 h-6" />
                     </div>
                     <div className="flex-1 w-full date-picker-lg dueDate">
                       <CustomDatePicker 
                         value={dueDate} 
                         onChange={setDueDate} 
                       />
                     </div>
                   </div>
                </div>
                {errors.dueDate && <p className="text-xs text-rose-500 flex items-center gap-1 mt-1"><AlertCircle className="w-3 h-3"/> {errors.dueDate}</p>}
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-bold text-slate-700">در وجه (متن روی چک) <span className="text-rose-500">*</span></label>
                <CreatableSelect
                  isDisabled={!checkLeafId}
                  options={payeeNameOptions}
                  value={payeeName ? { value: payeeName, label: payeeName } : null}
                  onChange={(val: any) => {
                     setPayeeName(val?.value || '');
                     if (errors.payeeName) setErrors(prev => ({...prev, payeeName: ''}));
                  }}
                  placeholder="تایپ کنید یا از لیست اشخاص انتخاب کنید..."
                  className="font-sans text-lg"
                  menuPortalTarget={document.body}
                  formatCreateLabel={(inputValue) => `ثبت عبارت: "${inputValue}"`}
                  styles={{
                    menuPortal: base => ({ ...base, zIndex: 9999 }),
                    control: (base) => ({
                      ...base,
                      borderRadius: '1rem',
                      padding: '8px',
                      borderColor: errors.payeeName ? '#f43f5e' : '#e2e8f0',
                      boxShadow: 'none',
                      borderWidth: '2px',
                      '&:hover': { borderColor: '#cbd5e1' }
                    })
                  }}
                  isClearable
                />
                {errors.payeeName && <p className="text-xs text-rose-500 flex items-center gap-1 mt-1"><AlertCircle className="w-3 h-3"/> {errors.payeeName}</p>}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">شناسه صیادی (۱۶ رقمی)</label>
                <input
                  type="text"
                  value={sayadId}
                  onChange={e => setSayadId(e.target.value.replace(/\D/g, '').slice(0, 16))}
                  className="w-full border-2 border-slate-200 rounded-2xl p-4 text-left font-mono text-lg focus:border-indigo-500 outline-none transition-colors tracking-widest disabled:bg-slate-50 disabled:text-slate-400"
                  dir="ltr"
                  placeholder="0000 0000 0000 0000"
                  disabled={!checkLeafId}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">بابت (شرح مختصر)</label>
                <input
                  type="text"
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  className="w-full border-2 border-slate-200 rounded-2xl p-4 focus:border-indigo-500 text-lg outline-none font-sans transition-colors disabled:bg-slate-50 disabled:text-slate-400"
                  placeholder="مثال: تسویه فاکتور"
                  disabled={!checkLeafId}
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-bold text-slate-700">توضیحات تکمیلی (فقط در سیستم)</label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  className="w-full border-2 border-slate-200 rounded-2xl p-4 focus:border-indigo-500 outline-none font-sans min-h-[80px] transition-colors resize-y disabled:bg-slate-50 disabled:text-slate-400"
                  placeholder="یادداشت‌های داخلی..."
                  disabled={!checkLeafId}
                />
              </div>
            </div>
          </section>

          {/* Section 3: Attachments */}
          <section className={`bg-white rounded-3xl shadow-sm border transition-colors overflow-hidden ${!checkLeafId ? 'border-slate-100 opacity-50' : 'border-slate-100'}`}>
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
              <Paperclip className={`w-5 h-5 ${!checkLeafId ? 'text-slate-400' : 'text-amber-500'}`} />
              <h2 className="font-bold text-slate-700">۳. پیوست‌ها (اختیاری)</h2>
            </div>
            <div className="p-6 relative">
              {!checkLeafId && (
                <div className="absolute inset-0 z-10 bg-white/40 cursor-not-allowed backdrop-blur-[1px]"></div>
              )}
              <div className="border-2 border-dashed border-slate-200 rounded-3xl p-8 flex flex-col items-center justify-center text-center hover:bg-slate-50 hover:border-indigo-300 transition-colors cursor-pointer group">
                 <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4 group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-colors">
                    <UploadCloud className="w-8 h-8 text-slate-400 group-hover:text-indigo-600 transition-colors" />
                 </div>
                 <h3 className="font-bold text-slate-700 mb-1">بارگذاری تصویر چک یا رسید</h3>
                 <p className="text-sm text-slate-500 max-w-sm">فایل‌ها را اینجا بکشید و رها کنید، یا برای انتخاب فایل کلیک کنید (حداکثر ۵ مگابایت)</p>
              </div>
            </div>
          </section>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-end gap-4 pt-4">
             <button
               type="button"
               onClick={() => handleSave("draft")}
               disabled={loading || !checkLeafId}
               className="w-full sm:w-auto px-8 py-4 rounded-2xl font-bold text-slate-700 bg-white border-2 border-slate-200 hover:bg-slate-50 hover:border-slate-300 transition-all flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95"
             >
               <Save className="w-5 h-5" />
               ذخیره پیش‌نویس
             </button>
             <button
               type="button"
               onClick={confirmSave}
               disabled={loading || !checkLeafId}
               className="w-full sm:w-auto px-10 py-4 rounded-2xl font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-[0_8px_20px_rgb(79,70,229,0.3)] transition-all flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95"
             >
               <CheckCircle className="w-5 h-5" />
               {loading ? "در حال ثبت..." : "تأیید و صدور نهایی"}
             </button>
          </div>
        </div>

        {/* Left Column: Visual Check Preview */}
        <div className="w-full xl:w-1/3">
           <div className="xl:sticky xl:top-8">
              {/* Mobile Toggle */}
              <button 
                onClick={() => setShowPreviewMobile(!showPreviewMobile)}
                className="xl:hidden w-full flex items-center justify-between bg-indigo-50 text-indigo-700 p-4 rounded-2xl font-bold mb-4 border border-indigo-100"
              >
                <span className="flex items-center gap-2"><FileText className="w-5 h-5"/> پیش‌نمایش گرافیکی چک</span>
                {showPreviewMobile ? <ChevronUp className="w-5 h-5"/> : <ChevronDown className="w-5 h-5"/>}
              </button>

              <div className={`${showPreviewMobile ? 'block' : 'hidden'} xl:block`}>
                <div className="bg-[#fcfdfa] rounded-xl shadow-lg border border-[#e5e7eb] p-6 relative overflow-hidden aspect-[2/1] min-h-[250px] flex flex-col justify-between" style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(0,0,0,0.01) 10px, rgba(0,0,0,0.01) 20px)' }}>
                  
                  {/* Watermark / Pattern */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.03] pointer-events-none">
                     <Building2 className="w-48 h-48" />
                  </div>

                  {/* Top Row */}
                  <div className="flex justify-between items-start relative z-10">
                     <div className="text-right">
                       <p className="text-[10px] text-slate-500 font-bold mb-1">تاریخ سررسید</p>
                       <div className="font-mono text-sm tracking-widest border-b border-dashed border-slate-400 pb-1 min-w-[100px] text-center text-slate-800">
                         {dueDate ? formatDateDisplay(dueDate) : '---- / -- / --'}
                       </div>
                     </div>
                     <div className="text-center flex-1 px-4">
                        <p className="text-lg font-black text-slate-800 mb-1">{selectedCheckbook?.bankName || 'نام بانک'}</p>
                        <p className="text-xs text-slate-500">شعبه {selectedCheckbook?.branchName || '---'}</p>
                     </div>
                     <div className="text-left w-[120px]">
                        <p className="text-[10px] text-slate-500 font-bold mb-1 text-right">مبلغ به عدد</p>
                        <div className="border border-slate-300 rounded px-2 py-1 font-mono text-sm bg-white text-left tracking-wider flex items-center justify-between">
                           <span>{amount ? Number(amount).toLocaleString() : '۰'}</span>
                           <span className="text-[8px] text-slate-400 mr-1">{currency}</span>
                        </div>
                     </div>
                  </div>

                  {/* Middle Row */}
                  <div className="space-y-4 relative z-10 mt-4">
                     <div className="flex items-end gap-2 text-sm">
                       <span className="font-bold text-slate-700 whitespace-nowrap">مبلغ به حروف:</span>
                       <div className="flex-1 border-b border-dashed border-slate-400 pb-1 text-slate-800 font-bold px-2 overflow-hidden text-ellipsis whitespace-nowrap">
                         {amount && Number(amount) > 0 ? `${num2persian(amount)} ${currency}` : ''}
                       </div>
                     </div>
                     <div className="flex items-end gap-2 text-sm">
                       <span className="font-bold text-slate-700 whitespace-nowrap">در وجه:</span>
                       <div className="flex-1 border-b border-dashed border-slate-400 pb-1 text-slate-800 font-bold px-2 overflow-hidden text-ellipsis whitespace-nowrap">
                         {payeeName || ''}
                       </div>
                     </div>
                     <div className="flex items-end gap-2 text-sm">
                       <span className="font-bold text-slate-700 whitespace-nowrap">بابت:</span>
                       <div className="flex-1 border-b border-dashed border-slate-400 pb-1 text-slate-800 px-2 overflow-hidden text-ellipsis whitespace-nowrap">
                         {reason || ''}
                       </div>
                     </div>
                  </div>

                  {/* Bottom Row */}
                  <div className="flex justify-between items-end relative z-10 mt-6">
                     <div className="space-y-1">
                        <div className="flex items-center gap-2">
                           <span className="text-[10px] font-bold text-slate-500 w-16">سریال چک:</span>
                           <span className="font-mono text-sm text-slate-800 tracking-widest">{checkNumber || '--------'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                           <span className="text-[10px] font-bold text-slate-500 w-16">شناسه صیاد:</span>
                           <span className="font-mono text-xs text-slate-800 tracking-widest">{sayadId || '----------------'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                           <span className="text-[10px] font-bold text-slate-500 w-16">شماره حساب:</span>
                           <span className="font-mono text-xs text-slate-800 tracking-widest">{selectedCheckbook?.accountNumber || '------------'}</span>
                        </div>
                        <div className="flex items-center gap-2 pt-1 mt-1 border-t border-slate-200/50">
                           <span className="text-[10px] font-bold text-slate-400 w-16">تاریخ صدور:</span>
                           <span className="font-mono text-xs text-slate-500 tracking-widest">{issueDate ? issueDate.replace(/-/g, '/') : '----/--/--'}</span>
                        </div>
                     </div>
                     
                     <div className="w-24 h-12 border-2 border-slate-200 rounded text-center flex items-center justify-center text-[10px] text-slate-400 transform -rotate-6">
                        محل مهر و امضا
                     </div>
                  </div>
                </div>

                {/* Info Note */}
                <div className="mt-4 bg-blue-50 text-blue-800 p-4 rounded-2xl flex gap-3 text-sm border border-blue-100">
                  <Info className="w-5 h-5 text-blue-500 shrink-0" />
                  <p className="leading-relaxed">این یک پیش‌نمایش گرافیکی از اطلاعات وارد شده است. ظاهر چک واقعی ممکن است بسته به بانک صادرکننده متفاوت باشد.</p>
                </div>
              </div>
           </div>
        </div>
        
      </div>

      {showConfirmModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-xl border border-slate-200 p-8 max-w-lg w-full" dir="rtl">
            <h3 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2">
              <CheckCircle className="w-6 h-6 text-indigo-500" />
              تایید نهایی صدور چک
            </h3>
            
            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 mb-6 space-y-4">
              <div className="flex justify-between border-b border-slate-200 pb-2">
                <span className="text-slate-500">شماره چک:</span>
                <span className="font-bold text-slate-800">{checkNumber}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200 pb-2">
                <span className="text-slate-500">مبلغ چک:</span>
                <span className="font-bold text-slate-800">{Number(amount).toLocaleString('fa-IR')} ریال</span>
              </div>
              <div className="flex justify-between border-b border-slate-200 pb-2">
                <span className="text-slate-500">در وجه:</span>
                <span className="font-bold text-slate-800">{payeeName || persons.find(p => String(p.id) === String(payeeId))?.name || payeeId}</span>
              </div>
              <div className="flex justify-between pb-2">
                <span className="text-slate-500">تاریخ سررسید:</span>
                <span className="font-bold text-slate-800">{dueDate ? (typeof dueDate === "object" ? String(dueDate) : formatDateDisplay(dueDate)) : ""}</span>
              </div>
            </div>
            
            <p className="text-slate-600 mb-8 text-sm">
              آیا از صحت اطلاعات فوق اطمینان دارید؟ با تایید نهایی، سند مالی متصل (در صورت لزوم) ایجاد خواهد شد.
            </p>
            
            <div className="flex justify-end gap-3">
              <button 
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="px-6 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold hover:bg-slate-50 transition-colors"
                disabled={loading}
              >
                انصراف
              </button>
              <button 
                type="button"
                onClick={() => {
                  setShowConfirmModal(false);
                  handleSave("issued");
                }}
                className="px-6 py-2.5 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 transition-colors shadow-sm flex items-center gap-2"
                disabled={loading}
              >
                {loading && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                تایید و صدور
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
