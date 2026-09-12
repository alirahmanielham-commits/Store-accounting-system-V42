import React, { useState, useEffect, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { 
  addReceivedCheck, 
  updateReceivedCheck, 
  getReceivedChecks, 
  getPersons, 
  getAccounts, 
  syncCheckAccountingDocument 
} from "../../services/dataService";
import { getStoreSettings } from "../../services/settingsService";
import { addTransaction } from "../../services/invoiceService";
import { formatDateDisplay } from "../../utils/format";
import { motion, AnimatePresence } from "motion/react";
import { 
  CheckCircle, 
  Building2, 
  User, 
  CreditCard, 
  Save, 
  Calendar, 
  Paperclip, 
  UploadCloud, 
  FileText, 
  AlertCircle, 
  Plus, 
  Info, 
  X, 
  ChevronDown, 
  ChevronUp, 
  Edit3, 
  ArrowRight, 
  List, 
  Clock, 
  QrCode, 
  Check, 
  ArrowLeft 
} from "lucide-react";
import Select from "react-select";
import CreatableSelect from "react-select/creatable";
import CurrencyInput from "../common/CurrencyInput";
import CustomDatePicker from "../ui/CustomDatePicker";
import num2persian from "num2persian";

const POPULAR_BANKS = [
  "ملی ایران", "ملت", "صادرات", "تجارت", "سپه", 
  "پاسارگاد", "پارسیان", "سامان", "کشاورزی", "مسکن", 
  "آینده", "رسالت", "مهر ایران", "شهر", "دی", "سینا"
];

interface ReceiveCheckStandaloneProps {
  checkId?: string | number;
  showNotification?: (msg: string, type?: "success" | "error" | "info" | "warning") => void;
  onSuccess?: (check: any) => void;
  onCancel?: () => void;
  setViewingCheck?: (check: any) => void;
}

export default function ReceiveCheckStandalone({
  checkId: propCheckId,
  showNotification,
  onSuccess,
  onCancel,
  setViewingCheck
}: ReceiveCheckStandaloneProps) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const editId = propCheckId || searchParams.get("id");

  const [persons, setPersons] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [currency, setCurrency] = useState("تومان");
  const [isEditing, setIsEditing] = useState(false);
  const [existingCheck, setExistingCheck] = useState<any>(null);

  // Form state
  const [payerId, setPayerId] = useState("");
  const [payerName, setPayerName] = useState("");
  const [drawerName, setDrawerName] = useState(""); // صاحب حساب روی برگه چک
  const [bankName, setBankName] = useState("");
  const [branchName, setBranchName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  
  const [checkNumber, setCheckNumber] = useState("");
  const [sayadId, setSayadId] = useState("");
  const [amount, setAmount] = useState("");
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split("T")[0]);
  const [dueDate, setDueDate] = useState("");
  const [reason, setReason] = useState("تسویه فاکتور فروش");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<"received" | "deposited" | "cashed">("received");
  const [depositAccountId, setDepositAccountId] = useState("");
  const [autoSyncAccounting, setAutoSyncAccounting] = useState(true);

  // Attachments
  const [attachments, setAttachments] = useState<string[]>([]);

  // UI state
  const [isDirty, setIsDirty] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [savedResult, setSavedResult] = useState<any>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState("");
  const [showPreviewMobile, setShowPreviewMobile] = useState(false);

  // Load initial data
  const loadData = async () => {
    try {
      const [pList, aList, settings, checksList] = await Promise.all([
        getPersons(),
        getAccounts(),
        getStoreSettings(),
        getReceivedChecks()
      ]);
      setPersons(pList || []);
      setAccounts(aList || []);
      if (settings?.currency) {
        setCurrency(settings.currency);
      }

      if (editId) {
        const rawList = Array.isArray(checksList) ? checksList : checksList?.data || [];
        const found = rawList.find((c: any) => String(c.id) === String(editId));
        if (found) {
          setIsEditing(true);
          setExistingCheck(found);
          setPayerId(found.payerId ? String(found.payerId) : "");
          setPayerName(found.payerName || "");
          setDrawerName(found.drawerName || found.payerName || "");
          setBankName(found.bankName || "");
          setBranchName(found.branchName || "");
          setAccountNumber(found.accountNumber || "");
          setCheckNumber(found.checkNumber || "");
          setSayadId(found.sayadId || "");
          setAmount(String(found.amount || ""));
          setIssueDate(found.receiveDate || found.issueDate || new Date().toISOString().split("T")[0]);
          setDueDate(found.dueDate || "");
          setReason(found.reason || "تسویه فاکتور فروش");
          setDescription(found.description || "");
          setStatus(found.status || "received");
          setDepositAccountId(found.depositAccountId || found.bankAccountId || "");
          if (found.attachments) setAttachments(found.attachments);
        }
      }
    } catch (err) {
      console.error("Error loading data in ReceiveCheckStandalone:", err);
    }
  };

  useEffect(() => {
    loadData();
  }, [editId]);

  // Options for Persons Select
  const personOptions = useMemo(() => {
    return persons.map((p) => {
      const balance = Number(p.balance || 0);
      let balanceLabel = "";
      if (balance > 0) {
        balanceLabel = `(بستانکار: ${balance.toLocaleString()} ${currency})`;
      } else if (balance < 0) {
        balanceLabel = `(بدهکار: ${Math.abs(balance).toLocaleString()} ${currency})`;
      } else {
        balanceLabel = `(بی‌حساب)`;
      }
      return {
        value: String(p.id),
        label: `${p.name} ${p.personCode ? `[${p.personCode}]` : ""} ${balanceLabel}`,
        person: p
      };
    });
  }, [persons, currency]);

  // Options for Deposit Accounts
  const accountOptions = useMemo(() => {
    return accounts.map((a) => ({
      value: String(a.id),
      label: `${a.bankName} - حساب ${a.accountNumber} (موجودی: ${Number(a.balance || 0).toLocaleString()} ${currency})`
    }));
  }, [accounts, currency]);

  // Selected person details
  const selectedPerson = useMemo(() => {
    return persons.find((p) => String(p.id) === String(payerId)) || null;
  }, [persons, payerId]);

  // Sayad ID validation
  const isSayadValid = useMemo(() => {
    if (!sayadId) return false;
    const clean = sayadId.replace(/\D/g, "");
    return clean.length === 16;
  }, [sayadId]);

  // Formatted Sayad ID for visual check (4-4-4-4)
  const formattedSayad = useMemo(() => {
    const clean = sayadId.replace(/\D/g, "");
    if (!clean) return "---- ---- ---- ----";
    return clean.match(/.{1,4}/g)?.join(" ") || clean;
  }, [sayadId]);

  // Days remaining calculation
  const daysRemaining = useMemo(() => {
    if (!dueDate) return null;
    try {
      const target = new Date(dueDate).getTime();
      const now = new Date().setHours(0, 0, 0, 0);
      const diff = Math.ceil((target - now) / (1000 * 60 * 60 * 24));
      return diff;
    } catch {
      return null;
    }
  }, [dueDate]);

  // Amount in words
  const amountInWords = useMemo(() => {
    const num = Number(amount);
    if (!num || isNaN(num) || num <= 0) return "";
    try {
      return num2persian(num) + " " + currency;
    } catch {
      return "";
    }
  }, [amount, currency]);

  // Mark dirty
  useEffect(() => {
    if (payerId || amount || checkNumber || sayadId || dueDate) {
      setIsDirty(true);
    }
  }, [payerId, amount, checkNumber, sayadId, dueDate]);

  // Person select change
  const handlePersonChange = (val: any) => {
    const pid = val?.value || "";
    setPayerId(pid);
    if (val?.person) {
      setPayerName(val.person.name);
      if (!drawerName) {
        setDrawerName(val.person.name);
      }
    } else if (val?.label) {
      setPayerName(val.label);
      if (!drawerName) setDrawerName(val.label);
    }
    if (errors.payerId) setErrors((prev) => ({ ...prev, payerId: "" }));
  };

  // Image / Attachment upload simulation
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setAttachments((prev) => [...prev, reader.result as string]);
        if (showNotification) showNotification("تصویر برگه چک با موفقیت ضمیمه شد", "success");
      }
    };
    reader.readAsDataURL(files[0]);
  };

  // Validation
  const validate = () => {
    const errs: Record<string, string> = {};
    if (!payerId && !payerName) errs.payerId = "انتخاب یا ثبت طرف حساب پرداخت‌کننده الزامی است";
    if (!amount || Number(amount) <= 0) errs.amount = "مبلغ چک باید بزرگتر از صفر باشد";
    if (!checkNumber.trim()) errs.checkNumber = "شماره چک الزامی است";
    if (!bankName.trim()) errs.bankName = "نام بانک صادرکننده الزامی است";
    if (!dueDate) errs.dueDate = "تاریخ سررسید چک الزامی است";
    if (sayadId && sayadId.replace(/\D/g, "").length !== 16) {
      errs.sayadId = "شناسه صیادی باید دقیقاً ۱۶ رقم باشد";
    }
    if (status === "deposited" && !depositAccountId) {
      errs.depositAccountId = "برای وضعیت واگذار شده، انتخاب حساب بانکی الزامی است";
    }
    if (status === "cashed" && !depositAccountId) {
      errs.depositAccountId = "برای وضعیت وصول شده، انتخاب حساب واریزی الزامی است";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // Submit Handler
  const handleSubmit = async (isDraft = false) => {
    if (!isDraft && !validate()) {
      if (showNotification) showNotification("لطفاً خطاهای مشخص‌شده در فرم را اصلاح کنید", "error");
      return;
    }

    setLoading(true);
    setSubmitError("");

    try {
      const finalStatus = isDraft ? "received" : status;
      let createdTx: any = null;

      // 1. If financial integration is enabled, record transaction in Person Card & Cash/Bank
      if (autoSyncAccounting && !isEditing && payerId) {
        try {
          createdTx = await addTransaction({
            type: "receive",
            resourceType: status === "cashed" || status === "deposited" ? "bank" : "check",
            resourceId: depositAccountId || undefined,
            amount: Number(amount),
            personId: payerId,
            date: issueDate || new Date().toISOString(),
            method: "check",
            receiptNumber: checkNumber,
            checkNumber: checkNumber,
            description: `دریافت برگه چک شماره ${checkNumber} عهده بانک ${bankName} به سررسید ${formatDateDisplay(dueDate)} از طرف حساب ${payerName || "مشتری"}`
          });
        } catch (txErr) {
          console.warn("Could not create linked receipt transaction:", txErr);
        }
      }

      const payload = {
        payerId: payerId || undefined,
        payerName: payerName || (selectedPerson ? selectedPerson.name : "نامشخص"),
        drawerName: drawerName || payerName,
        bankName: bankName.trim(),
        branchName: branchName.trim(),
        accountNumber: accountNumber.trim(),
        checkNumber: checkNumber.trim(),
        sayadId: sayadId.replace(/\D/g, ""),
        amount: Number(amount),
        receiveDate: issueDate || new Date().toISOString().split("T")[0],
        dueDate: dueDate,
        reason: reason.trim(),
        description: description.trim(),
        status: finalStatus,
        depositAccountId: depositAccountId || undefined,
        transactionId: createdTx ? createdTx.id : (existingCheck?.transactionId || undefined),
        receiptNumber: createdTx ? createdTx.receiptNumber : (existingCheck?.receiptNumber || checkNumber),
        attachments: attachments
      };

      let resultCheck: any = null;

      if (isEditing && editId) {
        resultCheck = await updateReceivedCheck(String(editId), payload);
        if (showNotification) showNotification("اطلاعات چک دریافتی با موفقیت بروزرسانی شد", "success");
      } else {
        resultCheck = await addReceivedCheck(payload);
        if (showNotification) showNotification("چک دریافتی و سند حسابداری مربوطه با موفقیت ثبت شد", "success");
      }

      // Sync Accounting Document
      try {
        await syncCheckAccountingDocument("received", resultCheck, isEditing ? existingCheck : undefined);
      } catch (accErr) {
        console.warn("Accounting sync warning:", accErr);
      }

      setSavedResult(resultCheck);
      setSuccess(true);
      setIsDirty(false);

      if (onSuccess) {
        onSuccess(resultCheck);
      }
    } catch (err: any) {
      console.error("Save error:", err);
      const msg = err.message || "خطا در ثبت چک دریافتی";
      setSubmitError(msg);
      if (showNotification) showNotification(msg, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleResetForm = () => {
    setPayerId("");
    setPayerName("");
    setDrawerName("");
    setBankName("");
    setBranchName("");
    setAccountNumber("");
    setCheckNumber("");
    setSayadId("");
    setAmount("");
    setIssueDate(new Date().toISOString().split("T")[0]);
    setDueDate("");
    setReason("تسویه فاکتور فروش");
    setDescription("");
    setStatus("received");
    setDepositAccountId("");
    setAttachments([]);
    setSuccess(false);
    setSavedResult(null);
    setIsEditing(false);
    setIsDirty(false);
  };

  return (
    <div className="p-4 md:p-8 w-full max-w-7xl mx-auto font-sans" dir="rtl">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl shadow-sm border border-slate-200 mb-8">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center border border-emerald-100 shadow-xs">
            <CreditCard className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-800 font-display">
              {isEditing ? "ویرایش چک دریافتنی" : "ثبت برگه چک دریافتنی"}
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              ثبت مشخصات برگه چک دریافتی، همگام‌سازی با کارت حساب شخص و صدور خودکار سند حسابداری
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/received_checks_page")}
            className="px-4 py-2.5 rounded-xl text-sm font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-all flex items-center gap-2"
          >
            <List className="w-4 h-4 text-slate-600" />
            مشاهده لیست چک‌های دریافتی
          </button>
          {onCancel && (
            <button
              onClick={onCancel}
              className="p-2.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              title="انصراف"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Success Banner */}
      <AnimatePresence>
        {success && savedResult && (
          <motion.div
            initial={{ opacity: 0, y: -15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="mb-8 p-6 bg-emerald-50 border border-emerald-200 rounded-3xl text-emerald-900 shadow-sm"
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <CheckCircle className="w-8 h-8 text-emerald-600 shrink-0 mt-1" />
                <div>
                  <h3 className="text-lg font-black">
                    چک شماره {savedResult.checkNumber} با موفقیت در سیستم ثبت گردید!
                  </h3>
                  <p className="text-sm text-emerald-700 mt-1">
                    سند حسابداری دوطرفه و تراکنش متناظر در کارت حساب طرف حساب (
                    {savedResult.payerName}) به روزرسانی شد.
                  </p>
                  {savedResult.receiptNumber && (
                    <span className="inline-block mt-2 px-3 py-1 bg-white border border-emerald-300 text-xs font-mono font-bold rounded-lg text-emerald-800">
                      شماره رسید متصل: #{savedResult.receiptNumber}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3 self-end md:self-center">
                <button
                  onClick={() => {
                    if (setViewingCheck) {
                      setViewingCheck({ ...savedResult, _type: "received" });
                    }
                    navigate("/check_card");
                  }}
                  className="px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 shadow-sm flex items-center gap-2 transition-all"
                >
                  <FileText className="w-4 h-4" />
                  مشاهده پرونده چک
                </button>
                <button
                  onClick={handleResetForm}
                  className="px-4 py-2.5 bg-white text-emerald-800 border border-emerald-300 rounded-xl text-sm font-bold hover:bg-emerald-100 transition-all flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  ثبت چک جدید
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error Banner */}
      {submitError && (
        <div className="mb-6 p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl flex items-center gap-3">
          <AlertCircle className="w-6 h-6 text-rose-500 shrink-0" />
          <span className="text-sm font-bold">{submitError}</span>
        </div>
      )}

      {/* Main Grid: Form (Right) & Graphic Preview (Left) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        
        {/* Right 7 Cols: Inputs Form */}
        <div className="xl:col-span-7 space-y-8">
          
          {/* Section 1: Payer & Bank Details */}
          <section className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center gap-2 pb-4 mb-6 border-b border-slate-100">
              <User className="w-5 h-5 text-emerald-600" />
              <h2 className="font-bold text-slate-800 text-base">۱. مشخصات طرف حساب و بانک عهده</h2>
            </div>

            <div className="space-y-6">
              {/* Payer Select */}
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 flex items-center justify-between">
                  <span>طرف حساب پرداخت‌کننده (مشتری/صادرکننده) <span className="text-rose-500">*</span></span>
                  {selectedPerson && (
                    <span className="text-xs font-medium text-slate-500 font-mono">
                      کد حسابداری: {selectedPerson.accountingCode || "---"}
                    </span>
                  )}
                </label>
                <CreatableSelect
                  placeholder="انتخاب یا تایپ نام شخص/مشتری..."
                  options={personOptions}
                  value={
                    payerId
                      ? personOptions.find((o) => o.value === String(payerId))
                      : payerName
                      ? { value: payerName, label: payerName }
                      : null
                  }
                  onChange={handlePersonChange}
                  isClearable
                  className="text-sm"
                  styles={{
                    control: (base, state) => ({
                      ...base,
                      borderRadius: "1rem",
                      padding: "0.4rem",
                      borderColor: errors.payerId ? "#f43f5e" : state.isFocused ? "#059669" : "#e2e8f0",
                      boxShadow: "none",
                      "&:hover": { borderColor: "#cbd5e1" }
                    })
                  }}
                />
                {errors.payerId && <p className="text-xs text-rose-500 font-bold">{errors.payerId}</p>}
              </div>

              {/* Drawer Name on Cheque */}
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">
                  صاحب حساب روی برگه چک (در صورت تفاوت با طرف حساب)
                </label>
                <input
                  type="text"
                  value={drawerName}
                  onChange={(e) => setDrawerName(e.target.value)}
                  placeholder="مثال: شرکت بازرگانی یا نام صاحب دسته چک"
                  className="w-full border border-slate-200 rounded-2xl p-3.5 focus:border-emerald-500 outline-none text-sm transition-colors"
                />
              </div>

              {/* Bank Name with Quick Chips */}
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 flex items-center justify-between">
                  <span>بانک صادرکننده (عهده) <span className="text-rose-500">*</span></span>
                </label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {POPULAR_BANKS.slice(0, 8).map((b) => (
                    <button
                      key={b}
                      type="button"
                      onClick={() => {
                        setBankName(b);
                        if (errors.bankName) setErrors((prev) => ({ ...prev, bankName: "" }));
                      }}
                      className={`px-2.5 py-1 text-xs rounded-lg font-bold border transition-all ${
                        bankName === b
                          ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                          : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      {b}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  value={bankName}
                  onChange={(e) => {
                    setBankName(e.target.value);
                    if (errors.bankName) setErrors((prev) => ({ ...prev, bankName: "" }));
                  }}
                  placeholder="نام بانک عهده (مثلاً ملی، ملت، صادرات و...)"
                  className={`w-full border rounded-2xl p-3.5 focus:border-emerald-500 outline-none text-sm transition-colors ${
                    errors.bankName ? "border-rose-400" : "border-slate-200"
                  }`}
                />
                {errors.bankName && <p className="text-xs text-rose-500 font-bold">{errors.bankName}</p>}
              </div>

              {/* Branch & Account Number */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">نام یا کد شعبه</label>
                  <input
                    type="text"
                    value={branchName}
                    onChange={(e) => setBranchName(e.target.value)}
                    placeholder="مثال: شعبه مرکزی یا کد ۱۲۳"
                    className="w-full border border-slate-200 rounded-2xl p-3.5 focus:border-emerald-500 outline-none text-sm transition-colors"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">شماره حساب صادرکننده (اختیاری)</label>
                  <input
                    type="text"
                    dir="ltr"
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    placeholder="شماره حساب یا شبا"
                    className="w-full border border-slate-200 rounded-2xl p-3.5 focus:border-emerald-500 outline-none text-sm text-left transition-colors font-mono"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Section 2: Cheque Information */}
          <section className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center gap-2 pb-4 mb-6 border-b border-slate-100">
              <CreditCard className="w-5 h-5 text-emerald-600" />
              <h2 className="font-bold text-slate-800 text-base">۲. مشخصات و سررسید برگه چک</h2>
            </div>

            <div className="space-y-6">
              {/* Sayad ID & Check Number */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 flex items-center justify-between">
                    <span>شناسه صیادی (۱۶ رقم)</span>
                    {sayadId && (
                      <span
                        className={`text-xs px-2 py-0.5 rounded-md font-mono ${
                          isSayadValid
                            ? "bg-emerald-100 text-emerald-700 font-bold"
                            : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {isSayadValid ? "معتبر (۱۶ رقم)" : `${sayadId.replace(/\D/g, "").length}/16 رقم`}
                      </span>
                    )}
                  </label>
                  <input
                    type="text"
                    dir="ltr"
                    maxLength={19}
                    value={sayadId}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, "");
                      setSayadId(val);
                      if (errors.sayadId) setErrors((prev) => ({ ...prev, sayadId: "" }));
                    }}
                    placeholder="۱۶ رقم شناسه صیادی"
                    className={`w-full border rounded-2xl p-3.5 focus:border-emerald-500 outline-none text-sm font-mono tracking-widest text-left transition-colors ${
                      errors.sayadId ? "border-rose-400" : "border-slate-200"
                    }`}
                  />
                  {errors.sayadId && <p className="text-xs text-rose-500 font-bold">{errors.sayadId}</p>}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">
                    شماره سریال چک <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    dir="ltr"
                    value={checkNumber}
                    onChange={(e) => {
                      setCheckNumber(e.target.value);
                      if (errors.checkNumber) setErrors((prev) => ({ ...prev, checkNumber: "" }));
                    }}
                    placeholder="مثال: ۱۲۳۴۵۶"
                    className={`w-full border rounded-2xl p-3.5 focus:border-emerald-500 outline-none text-sm font-mono text-left transition-colors ${
                      errors.checkNumber ? "border-rose-400" : "border-slate-200"
                    }`}
                  />
                  {errors.checkNumber && <p className="text-xs text-rose-500 font-bold">{errors.checkNumber}</p>}
                </div>
              </div>

              {/* Amount */}
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 flex items-center justify-between">
                  <span>مبلغ چک ({currency}) <span className="text-rose-500">*</span></span>
                  {amountInWords && (
                    <span className="text-xs font-medium text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg">
                      {amountInWords}
                    </span>
                  )}
                </label>
                <CurrencyInput
                  value={amount}
                  onChange={(e: any) => {
                    setAmount(e.target.value);
                    if (errors.amount) setErrors((prev) => ({ ...prev, amount: "" }));
                  }}
                  placeholder="مبلغ به عدد..."
                  className={`w-full border rounded-2xl p-4 focus:border-emerald-500 outline-none text-lg font-mono font-bold transition-colors ${
                    errors.amount ? "border-rose-400" : "border-slate-200"
                  }`}
                />
                {errors.amount && <p className="text-xs text-rose-500 font-bold">{errors.amount}</p>}
              </div>

              {/* Dates: Issue / Receive Date & Due Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    تاریخ دریافت چک
                  </label>
                  <CustomDatePicker
                    value={issueDate}
                    onChange={(d: any) => setIssueDate(d)}
                    placeholder="انتخاب تاریخ دریافت..."
                    className="w-full"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-slate-400" />
                      تاریخ سررسید چک <span className="text-rose-500">*</span>
                    </span>
                    {daysRemaining !== null && (
                      <span
                        className={`text-xs px-2 py-0.5 rounded-md font-bold ${
                          daysRemaining < 0
                            ? "bg-rose-100 text-rose-700"
                            : daysRemaining === 0
                            ? "bg-amber-100 text-amber-700"
                            : "bg-emerald-100 text-emerald-700"
                        }`}
                      >
                        {daysRemaining < 0
                          ? `سررسید گذشته (${Math.abs(daysRemaining)} روز)`
                          : daysRemaining === 0
                          ? "سررسید امروز"
                          : `${daysRemaining} روز مانده`}
                      </span>
                    )}
                  </label>
                  <CustomDatePicker
                    value={dueDate}
                    onChange={(d: any) => {
                      setDueDate(d);
                      if (errors.dueDate) setErrors((prev) => ({ ...prev, dueDate: "" }));
                    }}
                    placeholder="انتخاب تاریخ سررسید..."
                    className="w-full"
                  />
                  {errors.dueDate && <p className="text-xs text-rose-500 font-bold">{errors.dueDate}</p>}
                </div>
              </div>

              {/* Reason & Description */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">بابت / شرح دریافت</label>
                  <input
                    type="text"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="مثال: تسویه فاکتور فروش شماره..."
                    className="w-full border border-slate-200 rounded-2xl p-3.5 focus:border-emerald-500 outline-none text-sm transition-colors"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">وضعیت استقرار اولیه</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full border border-slate-200 rounded-2xl p-3.5 focus:border-emerald-500 outline-none text-sm transition-colors bg-white cursor-pointer font-bold text-slate-700"
                  >
                    <option value="received">موجود در صندوق (اسناد دریافتنی نزد صندوق)</option>
                    <option value="deposited">واگذار شده به بانک (در جریان وصول)</option>
                    <option value="cashed">وصول آنی / نقد شده</option>
                  </select>
                </div>
              </div>

              {/* Bank Account Selection for deposited or cashed */}
              {(status === "deposited" || status === "cashed") && (
                <div className="p-4 bg-indigo-50/50 border border-indigo-100 rounded-2xl space-y-2">
                  <label className="text-sm font-bold text-indigo-900">
                    حساب بانکی مقصد جهت {status === "deposited" ? "خواباندن به حساب" : "واریز و وصول"} <span className="text-rose-500">*</span>
                  </label>
                  <Select
                    placeholder="انتخاب حساب بانکی..."
                    options={accountOptions}
                    value={accountOptions.find((o) => o.value === String(depositAccountId)) || null}
                    onChange={(opt: any) => {
                      setDepositAccountId(opt?.value || "");
                      if (errors.depositAccountId) setErrors((prev) => ({ ...prev, depositAccountId: "" }));
                    }}
                    isClearable
                    styles={{
                      control: (base) => ({
                        ...base,
                        borderRadius: "0.85rem",
                        padding: "0.3rem"
                      })
                    }}
                  />
                  {errors.depositAccountId && (
                    <p className="text-xs text-rose-500 font-bold">{errors.depositAccountId}</p>
                  )}
                </div>
              )}

              {/* Note / Description */}
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">توضیحات و یادداشت تکمیلی</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="یادداشت‌های داخلی پرونده..."
                  className="w-full border border-slate-200 rounded-2xl p-3.5 focus:border-emerald-500 outline-none text-sm transition-colors resize-none"
                />
              </div>

              {/* Financial & Person Card Integration Toggle */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between">
                <div>
                  <span className="text-sm font-bold text-slate-800 block">
                    ثبت خودکار سند حسابداری و بروزرسانی کارت حساب شخص
                  </span>
                  <span className="text-xs text-slate-500 block mt-0.5">
                    با فعال بودن این گزینه، دریافت چک به عنوان رسید دریافت مالی در کارت شخص ثبت و سند دوبل صادر می‌گردد.
                  </span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoSyncAccounting}
                    onChange={(e) => setAutoSyncAccounting(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
              </div>
            </div>
          </section>

          {/* Section 3: Attachments */}
          <section className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center gap-2 pb-4 mb-4 border-b border-slate-100">
              <Paperclip className="w-5 h-5 text-emerald-600" />
              <h2 className="font-bold text-slate-800 text-base">۳. پیوست‌ها و تصویر برگه چک</h2>
            </div>

            <div className="space-y-4">
              <label className="border-2 border-dashed border-slate-200 hover:border-emerald-400 rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-colors bg-slate-50/50 hover:bg-emerald-50/20">
                <UploadCloud className="w-10 h-10 text-slate-400 mb-2" />
                <span className="text-sm font-bold text-slate-700">انتخاب یا رها کردن تصویر برگه چک</span>
                <span className="text-xs text-slate-400 mt-1">فرمت‌های تصویری JPG, PNG تا حداکثر ۵ مگابایت</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>

              {attachments.length > 0 && (
                <div className="flex flex-wrap gap-3">
                  {attachments.map((img, idx) => (
                    <div key={idx} className="relative group w-24 h-16 rounded-xl overflow-hidden border border-slate-200 shadow-xs">
                      <img src={img} alt="چک" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setAttachments((prev) => prev.filter((_, i) => i !== idx))}
                        className="absolute inset-0 bg-black/50 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-2">
            {!isEditing && (
              <button
                type="button"
                onClick={() => handleSubmit(true)}
                disabled={loading}
                className="w-full sm:w-auto px-6 py-3.5 rounded-2xl font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
              >
                <Save className="w-4 h-4" />
                ذخیره پیش‌نویس
              </button>
            )}

            <button
              type="button"
              onClick={() => handleSubmit(false)}
              disabled={loading}
              className="w-full sm:w-auto px-8 py-3.5 rounded-2xl font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-md transition-all flex items-center justify-center gap-2"
            >
              <CheckCircle className="w-5 h-5" />
              {loading ? "در حال ذخیره‌سازی..." : isEditing ? "بروزرسانی چک دریافتی" : "ثبت و صدور نهایی سند"}
            </button>
          </div>
        </div>

        {/* Left 5 Cols: Visual Cheque Preview */}
        <div className="xl:col-span-5">
          <div className="xl:sticky xl:top-8 space-y-6">
            
            {/* Cheque Graphic Card (Sayad Cheque Style) */}
            <div className="bg-gradient-to-br from-[#f8f5fc] via-[#fdfcff] to-[#f3edf9] rounded-3xl p-6 border-2 border-purple-200/80 shadow-md relative overflow-hidden">
              
              {/* Security pattern lines */}
              <div 
                className="absolute inset-0 opacity-[0.03] pointer-events-none"
                style={{
                  backgroundImage: "radial-gradient(#6b21a8 1px, transparent 1px)",
                  backgroundSize: "16px 16px"
                }}
              />

              {/* Sayad Cheque Header */}
              <div className="flex items-center justify-between pb-4 border-b border-purple-100 relative z-10">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 bg-purple-600 text-white rounded-lg flex items-center justify-center font-bold text-xs">
                    IR
                  </div>
                  <div>
                    <span className="font-bold text-xs text-purple-900 block">چک دریافتنی (صیادی)</span>
                    <span className="text-[10px] text-purple-600 block">بانک مرکزی جمهوری اسلامی ایران</span>
                  </div>
                </div>

                <div className="text-left">
                  <span className="text-[10px] text-slate-500 block">شناسه یکتای صیاد:</span>
                  <span className="font-mono font-black text-xs text-purple-900 tracking-wider">
                    {formattedSayad}
                  </span>
                </div>
              </div>

              {/* Bank & Serial */}
              <div className="flex justify-between items-center py-4 border-b border-purple-50 relative z-10">
                <div>
                  <span className="text-[11px] text-slate-400 block">بانک عهده:</span>
                  <span className="font-bold text-sm text-slate-800">
                    بانک {bankName || "..............."} {branchName ? `شعبه ${branchName}` : ""}
                  </span>
                </div>
                <div className="text-left">
                  <span className="text-[11px] text-slate-400 block">شماره چک:</span>
                  <span className="font-mono font-bold text-sm text-slate-800">
                    {checkNumber || "............."}
                  </span>
                </div>
              </div>

              {/* Due Date & Amount */}
              <div className="py-4 space-y-3 border-b border-purple-50 relative z-10">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-500">تاریخ سررسید:</span>
                  <span className="font-mono font-bold text-sm text-slate-900 bg-white px-3 py-1 rounded-lg border border-purple-100 shadow-xs">
                    {dueDate ? formatDateDisplay(dueDate) : "----/--/--"}
                  </span>
                </div>

                <div>
                  <span className="text-xs text-slate-500 block mb-1">مبلغ به حروف:</span>
                  <div className="text-xs font-bold text-purple-950 bg-white/70 p-2.5 rounded-xl border border-purple-100 min-h-[36px] leading-relaxed">
                    {amountInWords || "مبلغ چک به حروف.................................."}
                  </div>
                </div>

                <div className="flex justify-between items-center bg-purple-100/50 p-3 rounded-xl border border-purple-200/60">
                  <span className="text-xs font-bold text-purple-900">مبلغ به عدد:</span>
                  <span className="font-mono font-black text-base text-purple-950">
                    {amount ? Number(amount).toLocaleString() : "۰"} <span className="text-xs font-normal">{currency}</span>
                  </span>
                </div>
              </div>

              {/* Payee / Payer Info */}
              <div className="py-4 space-y-2 relative z-10">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">طرف حساب / پرداخت‌کننده:</span>
                  <span className="font-bold text-slate-800">
                    {payerName || (selectedPerson ? selectedPerson.name : "....................")}
                  </span>
                </div>
                {drawerName && drawerName !== payerName && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">صاحب امضا/حساب:</span>
                    <span className="font-medium text-slate-700">{drawerName}</span>
                  </div>
                )}
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">بابت:</span>
                  <span className="font-medium text-slate-700">{reason || "---"}</span>
                </div>
              </div>

              {/* Bottom Cheque Footer: QR / Barcode & Status */}
              <div className="pt-3 border-t border-purple-100 flex items-center justify-between relative z-10">
                <div className="flex items-center gap-2">
                  <QrCode className="w-8 h-8 text-purple-600" />
                  <span className="text-[10px] text-purple-700 font-mono">SAMANE SAYAD</span>
                </div>
                <div>
                  <span className={`text-xs px-2.5 py-1 rounded-lg font-bold border ${
                    status === 'cashed' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' :
                    status === 'deposited' ? 'bg-indigo-100 text-indigo-800 border-indigo-300' :
                    'bg-amber-100 text-amber-800 border-amber-300'
                  }`}>
                    {status === 'cashed' ? 'وصول شده' : status === 'deposited' ? 'واگذار به بانک' : 'موجود نزد صندوق'}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Summary Info Card */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
              <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
                <Info className="w-4 h-4 text-emerald-600" />
                اثرات ثبت چک در سیستم حسابداری
              </h3>
              <ul className="text-xs text-slate-600 space-y-2.5 leading-relaxed">
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>
                    حساب <strong>اسناد دریافتنی تجاری (کد ۱۲۰۱)</strong> بدهکار می‌شود.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>
                    حساب معین و تفصیلی <strong>{payerName || "طرف حساب"}</strong> بستانکار شده و مانده طلب/بدهی او کاهش می‌یابد.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>
                    یک شناسه تراکنش رسید و سند اتوماتیک صادر شده و در گردش حساب شخص قابل مشاهده خواهد بود.
                  </span>
                </li>
              </ul>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
