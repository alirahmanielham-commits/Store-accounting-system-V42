import React, { useState, useEffect } from "react";
import { addCommas, convertToGregorian } from "../../utils/format";
import { motion, AnimatePresence } from "framer-motion";
import {
  RefreshCw,
  Save,
  ArrowUpRight,
  CheckCircle,
  FileText,
  Calendar,
  Building2,
  User,
  UserPlus,
  Wallet,
  DollarSign,
  CreditCard,
  Printer,
  X,
  CheckSquare,
  Phone,
  Hash,
  Sparkles,
  ChevronDown,
  Layers,
  Check,
  Zap,
  ArrowRightLeft,
  Users,
  Home,
  KeyRound,
  ShieldCheck
} from "lucide-react";
import Select from "react-select";
import CurrencyInput from "../common/CurrencyInput";
import CustomDatePicker from "../ui/CustomDatePicker";
const DatePicker = CustomDatePicker;
import persian from "react-date-object/calendars/persian";
import persian_fa from "react-date-object/locales/persian_fa";
import { 
  getCommittedRentInstallmentsForPerson, 
  settleRentInstallmentWithPayment, 
  ensurePayableAccount 
} from "../../services/hrService";
import { 
  addTransaction, 
  getPersons, 
  getAccounts, 
  getCashboxes 
} from "../../services/dataService";

export default function PayReceiptModal(props: any) {
  const { isOpen, onClose, ...rest } = props;

  const {
    receiptHasDraft,
    restoreReceiptDraft,
    discardReceiptDraft,
    handleSubmitReceipt,
    receiptPersonId,
    setReceiptPersonId,
    setIsPersonModalOpen,
    persons,
    getPersonDisplayName,
    receiptMethod,
    setReceiptMethod,
    accounts,
    cashboxes,
    receiptAmount,
    setReceiptAmount,
    receiptDate,
    setReceiptDate,
    receiptNumber,
    receiptNote,
    setReceiptNote,
    formatNumber,
    submittingReceipt: externalSubmittingReceipt,
    lastCreatedReceipt,
    toPersianDigits = (s: any) => String(s ?? ''),
    storeSettings,
    setPrintingTransaction,
    setLastCreatedReceipt,
    receiptSuccessMsg,
    setReceiptLinkedInvoices,
    activePersonsOnly,
    mapPersonToOption,
    customPersonFilter,
    renderPersonInfoBox,
    numToPersianWords = (s: any) => '',
    receiptResourceType,
    setReceiptResourceType,
    receiptResourceId,
    setReceiptResourceId,
    invoices,
    getDefaultExchangeRate,
    receiptLinkedInvoices = {},
    formatDateDisplay = (d: any) => String(d ?? ''),
    formatCurrency = (c: any) => addCommas(c),
    customAlert = (msg: string) => alert(msg),
    receiptTargetPersonId,
    setReceiptTargetPersonId,
    receiptTransferDirection,
    setReceiptTransferDirection,
    calculatePersonBalance = props.calculatePersonBalance,
  } = props;

  // Standalone fallback states in case props aren't provided by parent
  const [internalPersonId, setInternalPersonId] = useState<string>(String(props.initialPersonId || props.personId || ""));
  const [internalAmount, setInternalAmount] = useState<string>(props.initialAmount ? String(props.initialAmount) : "");
  const [internalDate, setInternalDate] = useState<any>(new Date());
  const [internalNote, setInternalNote] = useState<string>(props.initialNote || "");
  const [internalResourceType, setInternalResourceType] = useState<string>("bank");
  const [internalResourceId, setInternalResourceId] = useState<string>("");
  const [internalLinkedInvoices, setInternalLinkedInvoices] = useState<any>({});
  const [internalPersons, setInternalPersons] = useState<any[]>(persons || []);
  const [internalAccounts, setInternalAccounts] = useState<any[]>(accounts || []);
  const [internalCashboxes, setInternalCashboxes] = useState<any[]>(cashboxes || []);
  const [internalSubmitting, setInternalSubmitting] = useState(false);

  // Rent Commitments State
  const [personRentCommitments, setPersonRentCommitments] = useState<any[]>([]);
  const [isRentCommitmentsExpanded, setIsRentCommitmentsExpanded] = useState<boolean>(true);
  const [selectedRentCommitment, setSelectedRentCommitment] = useState<any | null>(null);

  // Active channel within cash/bank payment methods
  const [paymentChannel, setPaymentChannel] = useState<"transfer" | "cashbox" | "pos" | "card" | "person_transfer">("transfer");
  const [internalTargetPersonId, setInternalTargetPersonId] = useState<string>(
    String(receiptTargetPersonId || "")
  );
  const [transferDirection, setTransferDirection] = useState<"from_first_to_second" | "from_second_to_first">(
    receiptTransferDirection || "from_first_to_second"
  );
  const [trackingNumber, setTrackingNumber] = useState<string>("");
  const [isInvoicesExpanded, setIsInvoicesExpanded] = useState<boolean>(true);

  // Effective state bindings
  const effectivePersonId = receiptPersonId !== undefined ? receiptPersonId : ((props as any).personId !== undefined ? (props as any).personId : internalPersonId);
  const effectiveSetPersonId = (id: string) => {
    if (typeof setReceiptPersonId === "function") setReceiptPersonId(id);
    if (typeof (props as any).setPersonId === "function") (props as any).setPersonId(id);
    setInternalPersonId(id);
  };

  const effectiveAmount = receiptAmount !== undefined ? receiptAmount : internalAmount;
  const effectiveSetAmount = (amt: string) => {
    if (typeof setReceiptAmount === "function") setReceiptAmount(amt);
    setInternalAmount(amt);
  };

  const effectiveDate = receiptDate !== undefined ? receiptDate : internalDate;
  const effectiveSetDate = (d: any) => {
    if (typeof setReceiptDate === "function") setReceiptDate(d);
    setInternalDate(d);
  };

  const effectiveNote = receiptNote !== undefined ? receiptNote : internalNote;
  const effectiveSetNote = (n: any) => {
    if (typeof setReceiptNote === "function") setReceiptNote(n);
    setInternalNote(n);
  };

  const effectiveResourceType = receiptResourceType !== undefined ? receiptResourceType : internalResourceType;
  const effectiveSetResourceType = (r: string) => {
    if (typeof setReceiptResourceType === "function") setReceiptResourceType(r);
    setInternalResourceType(r);
  };

  const effectiveResourceId = receiptResourceId !== undefined ? receiptResourceId : internalResourceId;
  const effectiveSetResourceId = (id: string) => {
    if (typeof setReceiptResourceId === "function") setReceiptResourceId(id);
    setInternalResourceId(id);
  };

  const effectivePersons = (persons && persons.length > 0) ? persons : internalPersons;
  const effectiveAccounts = (accounts && accounts.length > 0) ? accounts : internalAccounts;
  const effectiveCashboxes = (cashboxes && cashboxes.length > 0) ? cashboxes : internalCashboxes;
  const effectiveLinkedInvoices = receiptLinkedInvoices !== undefined ? receiptLinkedInvoices : internalLinkedInvoices;
  const effectiveSetLinkedInvoices = typeof setReceiptLinkedInvoices === "function" ? setReceiptLinkedInvoices : setInternalLinkedInvoices;
  const submittingReceipt = externalSubmittingReceipt || internalSubmitting;

  // Load fallback data if standalone
  useEffect(() => {
    if (!persons || persons.length === 0) {
      getPersons().then(res => setInternalPersons(res || [])).catch(() => {});
    }
    if (!accounts || accounts.length === 0) {
      getAccounts().then(res => setInternalAccounts(res || [])).catch(() => {});
    }
    if (!cashboxes || cashboxes.length === 0) {
      getCashboxes().then(res => setInternalCashboxes(res || [])).catch(() => {});
    }
  }, []);

  // Fetch pending rent commitments for the chosen person
  useEffect(() => {
    if (effectivePersonId) {
      getCommittedRentInstallmentsForPerson(effectivePersonId)
        .then((items) => {
          setPersonRentCommitments(items || []);
          if (props.initialRentContractId && props.initialRentInstallmentId) {
            const found = (items || []).find(
              (it: any) =>
                String(it.contractId) === String(props.initialRentContractId) &&
                String(it.installment?.id) === String(props.initialRentInstallmentId)
            );
            if (found) {
              setSelectedRentCommitment(found);
              if (!effectiveAmount || effectiveAmount === "0") {
                effectiveSetAmount(String(found.remainingAmount));
              }
              if (!effectiveNote) {
                effectiveSetNote(`بابت پرداخت و تسویه تعهد اجاره ${found.installment?.title || ''} - قرارداد ${found.contractNumber || ''}`);
              }
            }
          }
        })
        .catch(console.error);
    } else {
      setPersonRentCommitments([]);
      setSelectedRentCommitment(null);
    }
  }, [effectivePersonId, props.initialRentContractId, props.initialRentInstallmentId]);

  // Guarantee method is always cash or person_transfer
  useEffect(() => {
    if (typeof setReceiptMethod === "function" && receiptMethod !== "cash" && receiptMethod !== "person_transfer") {
      setReceiptMethod("cash");
    }
  }, [receiptMethod, setReceiptMethod]);

  // Sync payment channel with resource type
  const handleSelectChannel = (channel: "transfer" | "cashbox" | "pos" | "card" | "person_transfer") => {
    setPaymentChannel(channel);
    if (channel === "person_transfer") {
      effectiveSetResourceType("person");
      effectiveSetResourceId(internalTargetPersonId || "");
    } else if (channel === "cashbox") {
      effectiveSetResourceType("cashbox");
      if (effectiveCashboxes && effectiveCashboxes.length > 0) {
        if (!effectiveCashboxes.some((c: any) => String(c.id) === String(effectiveResourceId))) {
          effectiveSetResourceId(effectiveCashboxes[0].id);
        }
      }
    } else {
      effectiveSetResourceType("bank");
      if (effectiveAccounts && effectiveAccounts.length > 0) {
        if (!effectiveAccounts.some((a: any) => String(a.id) === String(effectiveResourceId))) {
          effectiveSetResourceId(effectiveAccounts[0].id);
        }
      }
    }
  };

  const handleSelectTargetPerson = (id: string) => {
    setInternalTargetPersonId(id);
    if (typeof setReceiptTargetPersonId === "function") {
      setReceiptTargetPersonId(id);
    }
    if (paymentChannel === "person_transfer") {
      effectiveSetResourceId(id);
    }
  };

  const handleSwapDirection = () => {
    setTransferDirection((prev) => {
      const next = prev === "from_first_to_second" ? "from_second_to_first" : "from_first_to_second";
      if (typeof setReceiptTransferDirection === "function") {
        setReceiptTransferDirection(next);
      }
      return next;
    });
  };

  const themeRing = "focus:ring-rose-500";
  const themeText = "text-rose-600";
  const themeBg = "bg-rose-600 hover:bg-rose-700 disabled:bg-rose-300";
  const themeLightBg = "bg-rose-50/40";
  const themeBorder = "border-rose-200";
  const themeIcon = "text-rose-500";
  const themeBadge = "bg-rose-100 text-rose-800";

  const resolvePersonName = (p: any): string => {
    if (!p) return "نامشخص";
    if (typeof getPersonDisplayName === "function") {
      const d = getPersonDisplayName(p, persons);
      if (d && d !== "نامشخص") return d;
    }
    const fullName = `${p.firstName || ""} ${p.lastName || ""}`.trim();
    return (
      p.alias?.trim() ||
      p.name?.trim() ||
      fullName ||
      p.companyName?.trim() ||
      p.title?.trim() ||
      "نامشخص"
    );
  };

  const selectedPerson = (persons || []).find(
    (p: any) => p && String(p.id) === String(effectivePersonId)
  );

  const selectedPersonLabel = selectedPerson
    ? (selectedPerson.personCode ? `[${selectedPerson.personCode}] ` : "") + resolvePersonName(selectedPerson)
    : "";

  const effectiveActivePersons = (activePersonsOnly && activePersonsOnly.length > 0)
    ? activePersonsOnly
    : (persons || []).filter((p: any) => p.isActive !== false);

  const defaultMapPersonToOption = (p: any) => {
    const dName = resolvePersonName(p);
    const roleText = p.role === "supplier" ? "تأمین‌کننده" : p.role === "customer" ? "مشتری" : "طرف‌حساب";
    return {
      value: String(p.id),
      label: (p.personCode ? `[${p.personCode}] ` : "") + dName + " (" + roleText + ")",
      imageUrl: p.imageUrl,
      searchStr: `${dName} ${p.phone || ""} ${p.nationalId || ""}`,
    };
  };

  const effectiveMapPerson = mapPersonToOption || defaultMapPersonToOption;

  const personInvoices = (invoices || []).filter(
    (inv: any) =>
      !inv.isDraft &&
      inv.status !== "draft" &&
      inv.status !== "voided" &&
      inv.type !== "proforma" &&
      (inv.customerId?.toString() === effectivePersonId.toString() ||
       inv.sellerId?.toString() === effectivePersonId.toString()) &&
      inv.paymentStatus !== "paid" &&
      (inv.type === "purchase" || inv.type === "sale_return")
  );

  const totalUnpaidInvoices = personInvoices.reduce((sum: number, inv: any) => {
    const total =
      (inv.totalAmount || 0) *
      (typeof getDefaultExchangeRate === "function"
        ? getDefaultExchangeRate(inv.currency, storeSettings?.currency)
        : 1);
    const paid = inv.paidAmount || 0;
    return sum + Math.max(total - paid, 0);
  }, 0);

  // Quick Amount Adders
  const handleAddAmount = (addVal: number) => {
    const current = Number(String(receiptAmount || 0).replace(/,/g, "")) || 0;
    const nextVal = current + addVal;
    if (typeof setReceiptAmount === "function") {
      setReceiptAmount(String(nextVal));
    }
  };

  // Keyboard shortcut: Ctrl+Enter to submit
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        const form = document.getElementById("pay-receipt-form") as HTMLFormElement;
        if (form && !submittingReceipt) {
          form.requestSubmit();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [submittingReceipt]);

  const handleSelectRentCommitment = (item: any) => {
    if (selectedRentCommitment?.installment?.id === item.installment?.id) {
      // Toggle off
      setSelectedRentCommitment(null);
    } else {
      setSelectedRentCommitment(item);
      effectiveSetAmount(String(item.remainingAmount));
      const autoText = `بابت پرداخت و تسویه تعهد اجاره ${item.installment?.title || ''} - قرارداد ${item.contractNumber || ''}`;
      effectiveSetNote(autoText);
    }
  };

  const onFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!effectivePersonId) {
      if (typeof customAlert === "function") customAlert("لطفاً طرف حساب دریافت‌کننده وجه را انتخاب کنید");
      return;
    }
    const numAmount = Number(String(effectiveAmount).replace(/,/g, ""));
    if (!numAmount || numAmount <= 0) {
      if (typeof customAlert === "function") customAlert("مبلغ پرداختی باید بیشتر از صفر باشد");
      return;
    }

    const rentPayload = selectedRentCommitment ? {
      linkedRentInstallment: {
        contractId: selectedRentCommitment.contractId,
        installmentId: selectedRentCommitment.installment?.id,
        title: selectedRentCommitment.installment?.title,
        amount: numAmount,
        contractNumber: selectedRentCommitment.contractNumber
      }
    } : {};

    if (paymentChannel === "person_transfer") {
      if (!internalTargetPersonId) {
        if (typeof customAlert === "function") customAlert("لطفاً طرف‌حساب دوم (مقابل) را انتخاب کنید");
        return;
      }
      if (String(internalTargetPersonId) === String(effectivePersonId)) {
        if (typeof customAlert === "function") customAlert("طرف‌حساب مبدا و مقصد نمی‌توانند یک شخص باشند");
        return;
      }
      if (typeof handleSubmitReceipt === "function") {
        handleSubmitReceipt("pay", e, {
          isPersonTransfer: true,
          targetPersonId: internalTargetPersonId,
          transferDirection,
          ...rentPayload
        });
        return;
      }
    }

    if (typeof handleSubmitReceipt === "function") {
      handleSubmitReceipt("pay", e, rentPayload);
      return;
    }

    // Standalone fallback submission
    try {
      setInternalSubmitting(true);
      const payDateIso = convertToGregorian(effectiveDate);
      const resType = paymentChannel === 'cashbox' ? 'cashbox' : 'bank';
      const resId = effectiveResourceId || (resType === 'bank' ? effectiveAccounts[0]?.id : effectiveCashboxes[0]?.id);
      const generatedNum = `PD-${Math.floor(100000 + Math.random() * 900000)}`;

      const newTx = await addTransaction({
        type: 'pay',
        receiptNumber: generatedNum,
        personId: effectivePersonId,
        amount: numAmount,
        date: payDateIso,
        resourceType: resType,
        resourceId: resId,
        trackingNumber: trackingNumber || undefined,
        note: effectiveNote || 'پرداخت وجه',
        description: effectiveNote || 'پرداخت وجه',
        method: 'cash',
        linkedRentInstallment: rentPayload.linkedRentInstallment
      });

      if (selectedRentCommitment) {
        await settleRentInstallmentWithPayment(
          selectedRentCommitment.contractId,
          selectedRentCommitment.installment?.id,
          {
            paymentDocId: generatedNum,
            amount: numAmount,
            paidDate: payDateIso,
            paymentMethod: resType,
            paymentSourceId: resId,
            paymentRefNumber: trackingNumber || generatedNum
          }
        );
      }

      if (typeof props.onRentPaymentSuccess === "function") {
        props.onRentPaymentSuccess(selectedRentCommitment?.contractId, selectedRentCommitment?.installment?.id, newTx);
      }
      if (typeof props.onSuccess === "function") {
        props.onSuccess(newTx);
      }
      if (typeof onClose === "function") {
        onClose();
      }
    } catch (sErr) {
      console.error(sErr);
      if (typeof customAlert === "function") customAlert("خطا در ثبت رسید پرداخت");
    } finally {
      setInternalSubmitting(false);
    }
  };

  return (
    <div className="w-full font-sans pb-32 md:pb-6" dir="rtl">
      <div className="bg-white rounded-3xl shadow-sm border border-slate-200/90 w-full flex flex-col overflow-hidden relative">
        
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-8 py-4 sm:py-5 border-b border-slate-100 bg-gradient-to-r from-rose-50/80 via-orange-50/40 to-white">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-rose-500/20">
              <ArrowUpRight className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-xl font-black text-slate-900 tracking-tight">
                  ثبت رسید پرداخت وجه
                </h2>
                <span className="text-[11px] font-bold bg-rose-100/90 text-rose-800 px-2 py-0.5 rounded-md">
                  پرداخت نقدی و بانکی
                </span>
              </div>
              <p className="text-xs font-medium text-slate-500 mt-0.5">
                ثبت پرداخت وجه به تأمین‌کننده یا بستانکار، صدور سند حسابداری و تسویه فاکتورهای خرید
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {typeof props.setActiveTab === "function" && (
              <button
                type="button"
                onClick={() => props.setActiveTab("keyboard_receipt")}
                className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                title="رفتن به حالت ثبت فوق‌سریع رسید با کیبورد و بدون ماوس"
              >
                <Zap className="w-3.5 h-3.5 fill-slate-950" />
                <span className="hidden md:inline">ثبت سریع با کیبورد</span>
                <span className="md:hidden">کیبورد</span>
              </button>
            )}
            <div className="hidden sm:flex flex-col text-left">
              <span className="text-[10px] font-bold text-slate-400">شماره رسید پرداخت</span>
              <span className="text-xs font-mono font-black text-rose-900">
                {receiptNumber ? toPersianDigits(receiptNumber) : "در حال رزرو..."}
              </span>
            </div>
            {typeof onClose === "function" && (
              <button
                type="button"
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
                title="بستن فرم"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        <div className="p-4 sm:p-6 md:p-8 space-y-6">

          {/* Draft Notification */}
          {receiptHasDraft && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-amber-50 border border-amber-200/90 rounded-2xl p-4 flex flex-col md:flex-row justify-between items-center text-amber-900 shadow-xs gap-3"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                  <CheckSquare className="w-4 h-4" />
                </div>
                <span className="font-bold text-xs sm:text-sm">
                  پیش‌نویس ذخیره‌شده از پرداخت قبلی بازیابی شد. مایلید ادامه دهید؟
                </span>
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  type="button"
                  onClick={restoreReceiptDraft}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-colors shadow-2xs"
                >
                  بازیابی اطلاعات
                </button>
                <button
                  type="button"
                  onClick={discardReceiptDraft}
                  className="px-4 py-2 bg-white border border-amber-300 text-amber-800 hover:bg-amber-100/50 rounded-xl text-xs font-bold transition-colors"
                >
                  انصراف و پاک کردن
                </button>
              </div>
            </motion.div>
          )}

          {/* Last Created Success Banner */}
          {lastCreatedReceipt && (
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-rose-50 text-rose-950 p-4 sm:p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-rose-200 shadow-sm"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-500 text-white flex items-center justify-center shrink-0 shadow-sm">
                  <CheckCircle className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-black text-rose-950">
                    رسید پرداخت رسمی شماره {lastCreatedReceipt.receiptNumber || `#${lastCreatedReceipt.id}`} با موفقیت صادر شد
                  </p>
                  <p className="text-xs text-rose-700 font-medium mt-0.5">
                    مبلغ پرداختی: <strong className="font-mono text-rose-950">{toPersianDigits(formatNumber(lastCreatedReceipt.amount))}</strong> {storeSettings?.currency || "تومان"} — سند دوبل حسابداری ثبت گردید.
                  </p>
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setPrintingTransaction(lastCreatedReceipt)}
                  className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-xs flex items-center gap-2 transition-all shadow-sm cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  چاپ و صدور فیش پرداخت
                </button>
                <button
                  type="button"
                  onClick={() => setLastCreatedReceipt(null)}
                  className="p-2 text-rose-600 hover:bg-rose-100/60 rounded-xl transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}

          {receiptSuccessMsg && (
            <div className="bg-rose-50 text-rose-800 px-4 py-3 rounded-2xl flex items-center gap-2 border border-rose-200 font-bold text-xs shadow-xs">
              <CheckCircle className="w-4 h-4 text-rose-600" />
              {receiptSuccessMsg}
            </div>
          )}

          {/* Payment Channel Dropdown Selector */}
          <div className="bg-slate-50/80 p-3 sm:p-4 rounded-2xl border border-slate-200 space-y-2">
            <label className="block text-xs font-bold text-slate-700 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <CreditCard className="w-4 h-4 text-rose-600" />
                روش و کانال پرداخت وجه *
              </span>
              <span className="text-[11px] font-medium text-slate-500">
                {paymentChannel === "person_transfer" ? "تهاتر و انتقال دوجانبه بدون درگیری بانک/صندوق" : "انتخاب حساب یا صندوق مبدا"}
              </span>
            </label>
            <select
              value={paymentChannel}
              onChange={(e) => handleSelectChannel(e.target.value as any)}
              className="w-full min-h-[46px] px-3.5 py-2.5 bg-white border border-slate-300 hover:border-rose-500 rounded-2xl font-bold text-xs sm:text-sm text-slate-800 outline-none focus:ring-2 focus:ring-rose-500/20 transition-all shadow-2xs cursor-pointer"
            >
              <option value="transfer">پرداخت بانکی (حواله / پایا / ساتنا)</option>
              <option value="cashbox">پرداخت نقدی (صندوق فروشگاه)</option>
              <option value="card">کارت به کارت</option>
              <option value="pos">کارتخوان / درگاه آنلاین</option>
              <option value="person_transfer">🔗 حواله و انتقال مستقیم بین اشخاص (تهاتر دوجانبه)</option>
            </select>
          </div>

          <form id="pay-receipt-form" onSubmit={onFormSubmit} className="space-y-6">
            
            {/* Top Grid: Person, Amount, Date, Resource */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-5">

              {/* Person Select (6 cols) */}
              <div className="lg:col-span-6 space-y-2">
                <label className="block text-xs font-bold text-slate-700 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <User className="w-4 h-4 text-rose-600" /> طرف حساب و دریافت‌کننده وجه *
                  </span>
                  {selectedPerson && (
                    <span className="text-[10px] text-slate-400 font-medium">
                      کد طرف‌حساب: {toPersianDigits(selectedPerson.personCode || selectedPerson.id)}
                    </span>
                  )}
                </label>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Select
                      isRtl
                      value={
                        effectivePersonId && selectedPerson
                          ? {
                              value: String(effectivePersonId),
                              label: selectedPersonLabel,
                            }
                          : null
                      }
                      onChange={(option: any) => {
                        effectiveSetPersonId(option ? option.value : "");
                        if (typeof setReceiptLinkedInvoices === "function") {
                          setReceiptLinkedInvoices({});
                        }
                      }}
                      options={effectiveActivePersons.map(effectiveMapPerson) as any}
                      filterOption={customPersonFilter}
                      formatOptionLabel={(option: any) => (
                        <div className="flex items-center gap-2.5">
                          {option.imageUrl ? (
                            <img
                              src={option.imageUrl}
                              alt={option.label}
                              className="w-7 h-7 rounded-full object-cover border border-slate-200"
                            />
                          ) : (
                            <div className="w-7 h-7 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400">
                              <User className="w-3.5 h-3.5" />
                            </div>
                          )}
                          <span className="font-bold text-slate-800 text-xs sm:text-sm">
                            {option.label}
                          </span>
                        </div>
                      )}
                      placeholder="انتخاب یا جستجوی نام شخص / شرکت..."
                      noOptionsMessage={() => "شخصی یافت نشد"}
                      isClearable
                      menuPortalTarget={typeof document !== "undefined" ? document.body : null}
                      menuPosition="fixed"
                      styles={{
                        menuPortal: (base) => ({ ...base, zIndex: 99999 }),
                        control: (base) => ({
                          ...base,
                          borderRadius: "0.875rem",
                          borderColor: "#CBD5E1",
                          minHeight: "46px",
                          boxShadow: "none",
                          "&:hover": { borderColor: "#F43F5E" },
                        }),
                      }}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsPersonModalOpen && setIsPersonModalOpen(true)}
                    className="w-12 h-[46px] shrink-0 bg-slate-50 hover:bg-rose-50 text-slate-600 hover:text-rose-700 border border-slate-200 hover:border-rose-300 rounded-2xl flex items-center justify-center transition-colors shadow-2xs"
                    title="تعریف شخص جدید"
                  >
                    <UserPlus className="w-5 h-5" />
                  </button>
                </div>

                {/* Person Mini Card & Debt Status */}
                {selectedPerson && (
                  <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3 text-xs flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-800">{resolvePersonName(selectedPerson)}</span>
                      {selectedPerson.phone && (
                        <span className="text-slate-500 font-mono text-[11px]" dir="ltr">
                          {selectedPerson.phone}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {totalUnpaidInvoices > 0 ? (
                        <button
                          type="button"
                          onClick={() => {
                            effectiveSetAmount(String(totalUnpaidInvoices));
                            let remaining = totalUnpaidInvoices;
                            const newAlloc: Record<string, number> = {};
                            for (const inv of personInvoices) {
                              const invTotal =
                                (inv.totalAmount || 0) *
                                (typeof getDefaultExchangeRate === "function"
                                  ? getDefaultExchangeRate(inv.currency, storeSettings?.currency)
                                  : 1);
                              const invPaid = inv.paidAmount || 0;
                              const invRemainder = Math.max(invTotal - invPaid, 0);
                              if (invRemainder > 0 && remaining > 0) {
                                const alloc = Math.min(invRemainder, remaining);
                                newAlloc[inv.id] = alloc;
                                remaining -= alloc;
                              }
                            }
                            effectiveSetLinkedInvoices(newAlloc);
                          }}
                          className="px-2.5 py-1 bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-200 rounded-lg font-bold text-[11px] flex items-center gap-1 transition-colors cursor-pointer"
                          title="تنظیم مبلغ پرداختی به اندازه کل فاکتورهای باز"
                        >
                          <Sparkles className="w-3 h-3 text-amber-600" />
                          تسویه کل فاکتورها: {toPersianDigits(addCommas(totalUnpaidInvoices))} {storeSettings?.currency || "تومان"}
                        </button>
                      ) : (
                        <span className="text-slate-600 bg-slate-200/80 px-2 py-0.5 rounded-lg font-bold text-[11px]">
                          فاکتور پرداخت‌نشده‌ای ندارد
                        </span>
                      )}

                      {personRentCommitments.length > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            if (personRentCommitments.length > 0) {
                              handleSelectRentCommitment(personRentCommitments[0]);
                            }
                          }}
                          className={`px-2.5 py-1 rounded-lg font-bold text-[11px] flex items-center gap-1 transition-colors cursor-pointer ${
                            selectedRentCommitment
                              ? "bg-emerald-600 text-white shadow-xs"
                              : "bg-emerald-100 hover:bg-emerald-200 text-emerald-950 border border-emerald-300"
                          }`}
                          title="اتصال به اولین قسط اجاره معوق"
                        >
                          <Building2 className="w-3 h-3 text-emerald-700" />
                          {selectedRentCommitment ? (
                            <span>متصل به تعهد: {selectedRentCommitment.installment?.title}</span>
                          ) : (
                            <span>تعهد اجاره: {toPersianDigits(personRentCommitments.length)} قسط</span>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Date Input (3 cols) */}
              <div className="lg:col-span-3 space-y-2">
                <label className="block text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-rose-600" /> تاریخ ثبت پرداخت *
                </label>
                <div className="relative">
                  <DatePicker
                    value={receiptDate}
                    onChange={setReceiptDate}
                    calendar={storeSettings?.calendarType === "gregorian" ? undefined : persian}
                    locale={storeSettings?.calendarType === "gregorian" ? undefined : persian_fa}
                    calendarPosition="bottom-right"
                    inputClass={`w-full px-4 py-3 bg-white hover:bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 ${themeRing} outline-none font-sans font-black text-slate-900 text-center transition-all cursor-pointer text-sm min-h-[46px] shadow-2xs`}
                    containerClassName="w-full"
                  />
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                    <Calendar className="w-4 h-4 text-rose-600" />
                  </div>
                </div>
              </div>

              {/* Number Badge Desktop (3 cols) */}
              <div className="lg:col-span-3 space-y-2">
                <label className="block text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-rose-600" /> شماره سند پرداخت
                </label>
                <div className="w-full min-h-[46px] px-3.5 py-3 border border-slate-200 bg-slate-50/70 rounded-2xl font-mono text-center font-bold text-slate-800 text-sm flex items-center justify-center">
                  {receiptNumber ? toPersianDigits(receiptNumber) : "در حال صدور خودکار..."}
                </div>
              </div>

              {/* Amount Input (6 cols) */}
              <div className="lg:col-span-6 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <DollarSign className="w-4 h-4 text-rose-600" /> مبلغ پرداختی ({storeSettings?.currency || "تومان"}) *
                  </label>
                  {receiptAmount && Number(String(receiptAmount).replace(/,/g, "")) > 0 && (
                    <span className="text-[11px] font-mono text-rose-700 font-bold">
                      {toPersianDigits(addCommas(receiptAmount))} {storeSettings?.currency || "تومان"}
                    </span>
                  )}
                </div>

                <div className="relative">
                  <CurrencyInput
                    value={receiptAmount}
                    onChange={(e: any) => setReceiptAmount(e.target.value)}
                    className="w-full pl-16 pr-4 py-3 bg-white hover:bg-slate-50 border border-slate-300 rounded-2xl focus:ring-2 focus:ring-rose-500 outline-none font-mono font-black text-slate-900 text-right text-lg md:text-xl transition-all shadow-2xs min-h-[48px]"
                    placeholder="۰"
                    inputMode="numeric"
                    required
                  />
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 font-bold text-xs select-none">
                    {storeSettings?.currency || "تومان"}
                  </div>
                </div>

                {/* Quick Amount Adders */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[10px] text-slate-400 font-bold ml-1">مبالغ سریع:</span>
                  {[
                    { label: "+۱ میلیون", val: 1000000 },
                    { label: "+۵ میلیون", val: 5000000 },
                    { label: "+۱۰ میلیون", val: 10000000 },
                    { label: "+۵۰ میلیون", val: 50000000 },
                  ].map((chip) => (
                    <button
                      key={chip.label}
                      type="button"
                      onClick={() => handleAddAmount(chip.val)}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-rose-100 text-slate-700 hover:text-rose-800 rounded-lg text-[11px] font-bold transition-colors"
                    >
                      {chip.label}
                    </button>
                  ))}
                  {receiptAmount && Number(String(receiptAmount).replace(/,/g, "")) > 0 && (
                    <button
                      type="button"
                      onClick={() => setReceiptAmount("")}
                      className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-[11px] font-bold transition-colors"
                      title="صفر کردن مبلغ"
                    >
                      پاک کردن
                    </button>
                  )}
                </div>

                {/* Amount in Words */}
                {receiptAmount &&
                  !isNaN(Number(String(receiptAmount).replace(/,/g, ""))) &&
                  Number(String(receiptAmount).replace(/,/g, "")) > 0 && (
                    <div className="p-3 bg-gradient-to-r from-rose-50/70 to-orange-50/50 border border-rose-100 rounded-2xl text-xs leading-relaxed text-slate-700 flex items-center gap-2">
                      <span className="bg-rose-200/70 text-rose-900 text-[10px] px-2 py-0.5 rounded-md font-black shrink-0">
                        به حروف:
                      </span>
                      <strong className="font-bold text-slate-900">
                        {numToPersianWords(Number(String(receiptAmount).replace(/,/g, "")))} {storeSettings?.currency || "تومان"} تمام.
                      </strong>
                    </div>
                  )}
              </div>

              {/* Resource: Bank / Cashbox OR Person Target */}
              {paymentChannel === "person_transfer" ? (
                <div className="lg:col-span-6 space-y-2">
                  <label className="block text-xs font-bold text-slate-700 flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-indigo-700 font-black">
                      <Users className="w-4 h-4 text-indigo-600" />
                      طرف‌حساب دوم (مقابل) *
                    </span>
                    {internalTargetPersonId && (
                      <span className="text-[10px] text-indigo-600 font-bold bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200">
                        {(() => {
                          const tp = (persons || []).find((p: any) => String(p.id) === String(internalTargetPersonId));
                          return tp ? `کد: ${toPersianDigits(tp.personCode || tp.id)}` : "";
                        })()}
                      </span>
                    )}
                  </label>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <Select
                        isRtl
                        value={
                          internalTargetPersonId
                            ? (() => {
                                const tp = (persons || []).find((p: any) => String(p.id) === String(internalTargetPersonId));
                                return tp ? { value: String(tp.id), label: (tp.personCode ? `[${tp.personCode}] ` : "") + resolvePersonName(tp) } : null;
                              })()
                            : null
                        }
                        onChange={(opt: any) => handleSelectTargetPerson(opt ? opt.value : "")}
                        options={effectiveActivePersons
                          .filter((p: any) => String(p.id) !== String(effectivePersonId))
                          .map(effectiveMapPerson) as any}
                        filterOption={customPersonFilter}
                        placeholder="انتخاب یا جستجوی طرف‌حساب دوم (مقابل)..."
                        noOptionsMessage={() => "شخص دیگری یافت نشد"}
                        isClearable
                        menuPortalTarget={typeof document !== "undefined" ? document.body : null}
                        menuPosition="fixed"
                        styles={{
                          menuPortal: (base) => ({ ...base, zIndex: 99999 }),
                          control: (base) => ({
                            ...base,
                            borderRadius: "0.875rem",
                            borderColor: "#818CF8",
                            minHeight: "46px",
                            boxShadow: "none",
                            backgroundColor: "#EEF2FF",
                            "&:hover": { borderColor: "#4F46E5" },
                          }),
                        }}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsPersonModalOpen && setIsPersonModalOpen(true)}
                      className="w-12 h-[46px] shrink-0 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-2xl flex items-center justify-center transition-colors shadow-2xs"
                      title="تعریف شخص جدید"
                    >
                      <UserPlus className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="lg:col-span-3 space-y-2">
                    <label className="block text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      {receiptResourceType === "bank" ? (
                        <Building2 className="w-4 h-4 text-rose-600" />
                      ) : (
                        <Wallet className="w-4 h-4 text-rose-600" />
                      )}
                      {receiptResourceType === "bank" ? "پرداخت از حساب بانکی *" : "پرداخت از صندوق *"}
                    </label>

                    {receiptResourceType === "bank" ? (
                      <select
                        value={receiptResourceId}
                        onChange={(e) => setReceiptResourceId(e.target.value)}
                        className="w-full min-h-[48px] p-2.5 border border-slate-200 bg-white rounded-2xl focus:ring-2 focus:ring-rose-500 font-bold text-xs sm:text-sm text-slate-800 outline-none transition-shadow shadow-2xs"
                        required
                      >
                        <option value="">-- انتخاب حساب بانکی --</option>
                        {(accounts || []).map((acc: any, idx: number) => (
                          <option key={acc.id ? `rcpt-acc-${acc.id}` : `acc-idx-${idx}`} value={acc.id}>
                            {acc.bankName} - {acc.accountNumber} ({acc.accountHolder || "اصلی"})
                          </option>
                        ))}
                      </select>
                    ) : (
                      <select
                        value={receiptResourceId}
                        onChange={(e) => setReceiptResourceId(e.target.value)}
                        className="w-full min-h-[48px] p-2.5 border border-slate-200 bg-white rounded-2xl focus:ring-2 focus:ring-rose-500 font-bold text-xs sm:text-sm text-slate-800 outline-none transition-shadow shadow-2xs"
                        required
                      >
                        <option value="">-- انتخاب صندوق --</option>
                        {(cashboxes || []).map((cb: any) => (
                          <option key={cb.id} value={cb.id}>
                            صندوق: {cb.name}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  {/* Tracking / Reference Number (3 cols) */}
                  <div className="lg:col-span-3 space-y-2">
                    <label className="block text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <Hash className="w-4 h-4 text-rose-600" /> شماره پیگیری / شماره حواله
                    </label>
                    <input
                      type="text"
                      value={trackingNumber}
                      onChange={(e) => setTrackingNumber(e.target.value)}
                      placeholder="مثال: ۸۹۵۴۲۱۶۳"
                      className="w-full min-h-[48px] p-3 border border-slate-200 bg-white rounded-2xl focus:ring-2 focus:ring-rose-500 font-mono text-center font-bold text-xs sm:text-sm text-slate-800 outline-none shadow-2xs"
                    />
                  </div>
                </>
              )}

              {/* Person-to-Person Interactive Flow & Balances Panel */}
              {paymentChannel === "person_transfer" && (
                <div className="lg:col-span-12 bg-gradient-to-l from-indigo-50/90 via-purple-50/40 to-indigo-50/90 border border-indigo-200 rounded-3xl p-4 sm:p-5 shadow-xs space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-indigo-200/70 pb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                        <ArrowRightLeft className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="font-black text-sm text-indigo-950">
                          مدیریت و کنترل جریان انتقال بین طرفین
                        </h4>
                        <p className="text-[11px] font-medium text-slate-500">
                          جهت دریافت و پرداخت را مشخص کنید؛ اثر مالی همزمان در حساب هر دو طرف ثبت خواهد شد.
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleSwapDirection}
                      className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer self-start sm:self-auto"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      تعویض جهت انتقال (جابجایی دوطرفه)
                    </button>
                  </div>

                  {(() => {
                    const p1 = selectedPerson;
                    const p2 = (persons || []).find((p: any) => String(p.id) === String(internalTargetPersonId));
                    const numAmt = Number(String(receiptAmount || "").replace(/,/g, "")) || 0;

                    const p1Name = p1 ? resolvePersonName(p1) : "طرف اول";
                    const p2Name = p2 ? resolvePersonName(p2) : "طرف دوم";

                    const p1Bal = p1 && calculatePersonBalance ? calculatePersonBalance(p1.id) : null;
                    const p2Bal = p2 && calculatePersonBalance ? calculatePersonBalance(p2.id) : null;

                    const isP1Payer = transferDirection === "from_first_to_second";

                    return (
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 sm:gap-4 items-center">
                        {/* Party 1 Card (5 cols) */}
                        <div className={`md:col-span-5 p-4 rounded-2xl border transition-all ${
                          isP1Payer
                            ? "bg-emerald-50/70 border-emerald-200 ring-2 ring-emerald-500/10"
                            : "bg-rose-50/70 border-rose-200 ring-2 ring-rose-500/10"
                        }`}>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[11px] font-black text-slate-500">طرف اول:</span>
                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                              isP1Payer
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-rose-100 text-rose-800"
                            }`}>
                              {isP1Payer ? "پرداخت‌کننده (مبدا دریافت)" : "دریافت‌کننده (مقصد پرداخت)"}
                            </span>
                          </div>
                          <div className="font-black text-slate-900 text-sm sm:text-base">
                            {p1Name}
                          </div>
                          <div className="mt-2 pt-2 border-t border-black/5 text-xs space-y-1">
                            <div className="flex justify-between text-slate-500">
                              <span>مانده حساب فعلی:</span>
                              <span className="font-bold text-slate-800">
                                {p1Bal ? `${formatCurrency(p1Bal.amount)} ${storeSettings?.currency || "تومان"} (${p1Bal.status})` : "---"}
                              </span>
                            </div>
                            <div className="flex justify-between font-black">
                              <span className={isP1Payer ? "text-emerald-700" : "text-rose-700"}>
                                اثر بر حساب:
                              </span>
                              <span className={isP1Payer ? "text-emerald-700" : "text-rose-700"}>
                                {isP1Payer ? "بستانکار می‌شود (کاهش بدهی)" : "بدهکار می‌شود (افزایش بدهی)"}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Direction Arrow & Swap Center (2 cols) */}
                        <div className="md:col-span-2 flex flex-col items-center justify-center text-center p-2">
                          <button
                            type="button"
                            onClick={handleSwapDirection}
                            className="w-10 h-10 rounded-2xl bg-indigo-100 hover:bg-indigo-200 text-indigo-700 flex items-center justify-center shadow-2xs transition-transform active:scale-95 cursor-pointer"
                            title="تغییر جهت انتقال"
                          >
                            <ArrowRightLeft className="w-5 h-5" />
                          </button>
                          <span className="text-[10px] font-black text-indigo-900 mt-1">
                            {numAmt > 0 ? `${toPersianDigits(addCommas(numAmt))} ${storeSettings?.currency || "تومان"}` : "مبلغ انتقال"}
                          </span>
                        </div>

                        {/* Party 2 Card (5 cols) */}
                        <div className={`md:col-span-5 p-4 rounded-2xl border transition-all ${
                          !isP1Payer
                            ? "bg-emerald-50/70 border-emerald-200 ring-2 ring-emerald-500/10"
                            : "bg-rose-50/70 border-rose-200 ring-2 ring-rose-500/10"
                        }`}>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[11px] font-black text-slate-500">طرف دوم (مقابل):</span>
                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                              !isP1Payer
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-rose-100 text-rose-800"
                            }`}>
                              {!isP1Payer ? "پرداخت‌کننده (مبدا دریافت)" : "دریافت‌کننده (مقصد پرداخت)"}
                            </span>
                          </div>
                          <div className="font-black text-slate-900 text-sm sm:text-base">
                            {p2Name}
                          </div>
                          <div className="mt-2 pt-2 border-t border-black/5 text-xs space-y-1">
                            <div className="flex justify-between text-slate-500">
                              <span>مانده حساب فعلی:</span>
                              <span className="font-bold text-slate-800">
                                {p2Bal ? `${formatCurrency(p2Bal.amount)} ${storeSettings?.currency || "تومان"} (${p2Bal.status})` : "---"}
                              </span>
                            </div>
                            <div className="flex justify-between font-black">
                              <span className={!isP1Payer ? "text-emerald-700" : "text-rose-700"}>
                                اثر بر حساب:
                              </span>
                              <span className={!isP1Payer ? "text-emerald-700" : "text-rose-700"}>
                                {!isP1Payer ? "بستانکار می‌شود (کاهش بدهی)" : "بدهکار می‌شود (افزایش بدهی)"}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* Note / Description (Full 12 cols) */}
              <div className="lg:col-span-12 space-y-2">
                <label className="block text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-rose-600" /> شرح و بابت پرداخت وجه
                </label>
                <input
                  type="text"
                  value={receiptNote}
                  onChange={(e) => setReceiptNote(e.target.value)}
                  className="w-full p-3 border border-slate-200 bg-white rounded-2xl focus:ring-2 focus:ring-rose-500 text-xs sm:text-sm font-bold text-slate-800 outline-none transition-shadow shadow-2xs"
                  placeholder="شرح پرداخت وجه را وارد کنید یا از برچسب‌های زیر انتخاب نمایید..."
                />
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {[
                    "تسویه فاکتور خرید",
                    "پیش‌پرداخت خرید کالا",
                    "تسویه مانده بستانکاری",
                    "پرداخت نقدی",
                    "انتقال وجه و حواله",
                  ].map((qNote) => (
                    <button
                      key={qNote}
                      type="button"
                      onClick={() =>
                        setReceiptNote((prev: string) => (prev ? `${prev} - ${qNote}` : qNote))
                      }
                      className="px-2.5 py-1 bg-slate-100 hover:bg-rose-100 text-slate-700 hover:text-rose-800 rounded-lg text-[11px] font-bold transition-colors"
                    >
                      {qNote}
                    </button>
                  ))}
                </div>
              </div>

            </div>

            {/* Rent Commitments Allocation Section */}
            {personRentCommitments.length > 0 && (
              <div className="bg-emerald-50/70 rounded-2xl border border-emerald-200 overflow-hidden shadow-xs">
                <button
                  type="button"
                  onClick={() => setIsRentCommitmentsExpanded(!isRentCommitmentsExpanded)}
                  className="w-full p-4 flex items-center justify-between bg-emerald-100/60 hover:bg-emerald-100 transition-colors text-right cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-emerald-700" />
                    <span className="font-black text-xs sm:text-sm text-emerald-950">
                      اتصال به سند تعهد اجاره ({toPersianDigits(personRentCommitments.length)} قسط در انتظار تسویه)
                    </span>
                    <span className="text-[11px] font-bold text-emerald-800 bg-white px-2.5 py-0.5 rounded-md border border-emerald-300">
                      مانده تعهدات: {toPersianDigits(addCommas(personRentCommitments.reduce((sum, it) => sum + (it.remainingAmount || 0), 0)))} {storeSettings?.currency || "تومان"}
                    </span>
                  </div>
                  <ChevronDown
                    className={`w-4 h-4 text-emerald-700 transition-transform ${
                      isRentCommitmentsExpanded ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {isRentCommitmentsExpanded && (
                  <div className="p-4 space-y-3">
                    <p className="text-xs text-emerald-900 font-medium">
                      با انتخاب هر یک از اقساط زیر، این رسید پرداخت مستقیماً به سند تعهد اجاره متصل شده و هشدار سررسید آن تسویه و خاموش می‌شود:
                    </p>

                    {/* Desktop Table View */}
                    <div className="hidden md:block overflow-x-auto">
                      <table className="w-full text-xs text-right bg-white rounded-xl border border-emerald-200 overflow-hidden">
                        <thead>
                          <tr className="bg-emerald-50 text-emerald-900 font-bold border-b border-emerald-200">
                            <th className="p-3">شماره قرارداد</th>
                            <th className="p-3">عنوان قسط / دوره</th>
                            <th className="p-3">تاریخ سررسید</th>
                            <th className="p-3">مبلغ تعهد</th>
                            <th className="p-3">شناسه سند تعهد</th>
                            <th className="p-3">مانده تسویه‌نشده</th>
                            <th className="p-3 text-center">عملیات اتصال</th>
                          </tr>
                        </thead>
                        <tbody>
                          {personRentCommitments.map((item: any) => {
                            const isSelected = selectedRentCommitment?.installment?.id === item.installment?.id;
                            return (
                              <tr
                                key={item.installment?.id}
                                className={`border-b border-slate-100 last:border-0 transition-colors ${
                                  isSelected ? "bg-emerald-50/90 font-bold ring-1 ring-inset ring-emerald-500" : "hover:bg-slate-50/80"
                                }`}
                              >
                                <td className="p-3 font-mono font-bold text-slate-800">
                                  {item.contractNumber ? toPersianDigits(item.contractNumber) : `#${toPersianDigits(item.contractId)}`}
                                </td>
                                <td className="p-3 font-bold text-emerald-950">
                                  {item.installment?.title}
                                </td>
                                <td className="p-3 font-mono text-slate-700">
                                  {toPersianDigits(item.installment?.dueDate)}
                                </td>
                                <td className="p-3 font-mono font-bold text-slate-800">
                                  {toPersianDigits(addCommas(item.installment?.amount))} {storeSettings?.currency || "تومان"}
                                </td>
                                <td className="p-3 font-mono text-slate-500 text-[11px]">
                                  {item.installment?.commitmentDocId ? toPersianDigits(item.installment.commitmentDocId) : "سند ثبت‌شده"}
                                </td>
                                <td className="p-3 font-mono font-black text-rose-600">
                                  {toPersianDigits(addCommas(item.remainingAmount))} {storeSettings?.currency || "تومان"}
                                </td>
                                <td className="p-3 text-center">
                                  <button
                                    type="button"
                                    onClick={() => handleSelectRentCommitment(item)}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 mx-auto cursor-pointer ${
                                      isSelected
                                        ? "bg-emerald-600 text-white shadow-xs"
                                        : "bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-300"
                                    }`}
                                  >
                                    {isSelected ? (
                                      <>
                                        <Check className="w-3.5 h-3.5" />
                                        <span>متصل شد (لغو)</span>
                                      </>
                                    ) : (
                                      <>
                                        <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                                        <span>اتصال و تسویه این قسط</span>
                                      </>
                                    )}
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile Cards View */}
                    <div className="md:hidden space-y-2">
                      {personRentCommitments.map((item: any) => {
                        const isSelected = selectedRentCommitment?.installment?.id === item.installment?.id;
                        return (
                          <div
                            key={item.installment?.id}
                            className={`p-3.5 rounded-xl border transition-all space-y-2.5 ${
                              isSelected
                                ? "bg-emerald-50/90 border-emerald-400 ring-2 ring-emerald-500/20"
                                : "bg-white border-emerald-200"
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-xs text-emerald-950">
                                {item.installment?.title}
                              </span>
                              <span className="text-[10px] font-mono text-slate-500">
                                سررسید: {toPersianDigits(item.installment?.dueDate)}
                              </span>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-xs py-1 border-y border-emerald-100">
                              <div>
                                <span className="text-slate-400 block text-[10px]">قرارداد:</span>
                                <span className="font-mono font-bold text-slate-800">
                                  {item.contractNumber ? toPersianDigits(item.contractNumber) : `#${toPersianDigits(item.contractId)}`}
                                </span>
                              </div>
                              <div className="text-left">
                                <span className="text-slate-400 block text-[10px]">مانده تعهد:</span>
                                <span className="font-mono font-black text-rose-600">
                                  {toPersianDigits(addCommas(item.remainingAmount))} {storeSettings?.currency || "تومان"}
                                </span>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleSelectRentCommitment(item)}
                              className={`w-full py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                                isSelected
                                  ? "bg-emerald-600 text-white"
                                  : "bg-emerald-100 hover:bg-emerald-200 text-emerald-900 border border-emerald-300"
                              }`}
                            >
                              {isSelected ? (
                                <>
                                  <Check className="w-4 h-4" />
                                  <span>متصل به این تعهد (کلیک برای لغو)</span>
                                </>
                              ) : (
                                <>
                                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                                  <span>اتصال و تسویه این قسط</span>
                                </>
                              )}
                            </button>
                          </div>
                        );
                      })}
                    </div>

                    {selectedRentCommitment && (
                      <div className="p-3 bg-emerald-100/70 border border-emerald-300 rounded-xl text-xs text-emerald-900 flex items-center justify-between font-bold">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-emerald-700" />
                          <span>
                            این رسید به قسط <strong>{selectedRentCommitment.installment?.title}</strong> متصل شد. با ثبت پرداخت، قسط تسویه خواهد شد.
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setSelectedRentCommitment(null)}
                          className="text-xs text-rose-600 hover:text-rose-800 font-bold underline cursor-pointer"
                        >
                          لغو اتصال
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Invoices Allocation Section */}
            {personInvoices.length > 0 && (
              <div className="bg-slate-50/80 rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
                <button
                  type="button"
                  onClick={() => setIsInvoicesExpanded(!isInvoicesExpanded)}
                  className="w-full p-4 flex items-center justify-between bg-slate-100/60 hover:bg-slate-100 transition-colors text-right"
                >
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-rose-600" />
                    <span className="font-black text-xs sm:text-sm text-slate-800">
                      تخصیص به فاکتورهای خرید ({toPersianDigits(personInvoices.length)} فاکتور)
                    </span>
                    <span className="text-[11px] font-bold text-slate-500 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                      مانده کل: {toPersianDigits(addCommas(totalUnpaidInvoices))} {storeSettings?.currency || "تومان"}
                    </span>
                  </div>
                  <ChevronDown
                    className={`w-4 h-4 text-slate-500 transition-transform ${
                      isInvoicesExpanded ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {isInvoicesExpanded && (
                  <div className="p-4 space-y-3">
                    <p className="text-xs text-slate-500 font-medium">
                      می‌توانید با دکمه تسویه فاکتور یا وارد کردن مبلغ، پرداخت جاری را به فاکتورهای خرید تخصیص دهید:
                    </p>

                    {/* Desktop Table View */}
                    <div className="hidden md:block overflow-x-auto">
                      <table className="w-full text-xs text-right bg-white rounded-xl border border-slate-200 overflow-hidden">
                        <thead>
                          <tr className="bg-slate-100/80 text-slate-600 font-bold border-b border-slate-200">
                            <th className="p-3">شماره فاکتور</th>
                            <th className="p-3">تاریخ فاکتور</th>
                            <th className="p-3">مبلغ کل فاکتور</th>
                            <th className="p-3">مانده تسویه‌نشده</th>
                            <th className="p-3">مبلغ تخصیصی در این رسید</th>
                          </tr>
                        </thead>
                        <tbody>
                          {personInvoices.map((inv: any) => {
                            const total =
                              (inv.totalAmount || 0) *
                              (typeof getDefaultExchangeRate === "function"
                                ? getDefaultExchangeRate(inv.currency, storeSettings?.currency)
                                : 1);
                            const paid = inv.paidAmount || 0;
                            const remainder = Math.max(total - paid, 0);
                            const currentAllocated = receiptLinkedInvoices[inv.id] || 0;
                            return (
                              <tr key={inv.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/80">
                                <td className="p-3 font-mono font-bold text-slate-700">
                                  {toPersianDigits(inv.invoiceNumber) || `#${toPersianDigits(inv.id)}`}
                                </td>
                                <td className="p-3 font-mono text-slate-600">
                                  {formatDateDisplay(inv.date || inv.jalaliDate)}
                                </td>
                                <td className="p-3 font-mono font-bold text-slate-800">
                                  {formatCurrency ? formatCurrency(total) : addCommas(total)}
                                </td>
                                <td className="p-3 font-mono font-black text-rose-600">
                                  {formatCurrency ? formatCurrency(remainder) : addCommas(remainder)}
                                </td>
                                <td className="p-3">
                                  <div className="flex items-center gap-2 justify-end">
                                    <button
                                      type="button"
                                      className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                                        currentAllocated === remainder
                                          ? "bg-rose-600 text-white shadow-2xs"
                                          : "bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200"
                                      }`}
                                      onClick={() => {
                                        setReceiptLinkedInvoices((prev: any) => ({
                                          ...prev,
                                          [inv.id]: remainder,
                                        }));
                                      }}
                                    >
                                      تسویه کامل
                                    </button>
                                    <input
                                      type="number"
                                      className="p-1.5 px-2 border border-slate-200 rounded-lg text-xs font-mono font-bold w-32 outline-none focus:border-rose-500 bg-white"
                                      placeholder="۰"
                                      value={currentAllocated || ""}
                                      onChange={(e) => {
                                        const val = Number(e.target.value);
                                        if (val > remainder) {
                                          customAlert("مبلغ تخصیصی نمی‌تواند بیشتر از مانده فاکتور باشد");
                                          return;
                                        }
                                        setReceiptLinkedInvoices((prev: any) => ({
                                          ...prev,
                                          [inv.id]: val,
                                        }));
                                      }}
                                      min={0}
                                      max={remainder}
                                    />
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile Cards View */}
                    <div className="md:hidden space-y-2">
                      {personInvoices.map((inv: any) => {
                        const total =
                          (inv.totalAmount || 0) *
                          (typeof getDefaultExchangeRate === "function"
                            ? getDefaultExchangeRate(inv.currency, storeSettings?.currency)
                            : 1);
                        const paid = inv.paidAmount || 0;
                        const remainder = Math.max(total - paid, 0);
                        const currentAllocated = receiptLinkedInvoices[inv.id] || 0;
                        return (
                          <div key={inv.id} className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="font-mono text-xs font-black text-slate-800">
                                فاکتور {toPersianDigits(inv.invoiceNumber) || `#${toPersianDigits(inv.id)}`}
                              </span>
                              <span className="text-[11px] font-mono text-slate-500">
                                {formatDateDisplay(inv.date || inv.jalaliDate)}
                              </span>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-xs py-1.5 border-y border-slate-100">
                              <div>
                                <span className="text-slate-400 block text-[10px] font-bold">مبلغ کل:</span>
                                <span className="font-mono font-bold text-slate-700">
                                  {formatCurrency ? formatCurrency(total) : addCommas(total)}
                                </span>
                              </div>
                              <div className="text-left">
                                <span className="text-slate-400 block text-[10px] font-bold">مانده:</span>
                                <span className="font-mono font-black text-rose-600">
                                  {formatCurrency ? formatCurrency(remainder) : addCommas(remainder)}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 pt-1">
                              <button
                                type="button"
                                onClick={() => {
                                  setReceiptLinkedInvoices((prev: any) => ({ ...prev, [inv.id]: remainder }));
                                }}
                                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 whitespace-nowrap"
                              >
                                تسویه فاکتور
                              </button>
                              <input
                                type="number"
                                className="flex-1 py-1 px-2 border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-800 outline-none focus:border-rose-500 bg-white"
                                placeholder="مبلغ..."
                                value={currentAllocated || ""}
                                onChange={(e) => {
                                  const val = Number(e.target.value);
                                  if (val > remainder) {
                                    customAlert("مبلغ تخصیصی نمی‌تواند بیشتر از مانده فاکتور باشد");
                                    return;
                                  }
                                  setReceiptLinkedInvoices((prev: any) => ({
                                    ...prev,
                                    [inv.id]: val,
                                  }));
                                }}
                                min={0}
                                max={remainder}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="mt-2 text-xs font-bold text-slate-600 flex justify-between sm:justify-end gap-2 items-center pt-2 border-t border-slate-200">
                      <span>جمع تخصیص یافته:</span>
                      <span className="font-mono text-sm font-black text-rose-700">
                        {toPersianDigits(
                          addCommas(
                            Number(
                              Object.values(receiptLinkedInvoices || {}).reduce(
                                (a: number, b: any) => a + Number(b || 0),
                                0
                              )
                            )
                          )
                        )}{" "}
                        {storeSettings?.currency || "تومان"}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Desktop & Tablet Submit Footer */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-4 border-t border-slate-200">
              <div className="text-xs text-slate-500 font-medium hidden sm:block">
                کلید میانبر ذخیره سریع: <kbd className="px-2 py-1 bg-slate-100 border border-slate-300 rounded font-mono text-xs">Ctrl + Enter</kbd>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                {typeof onClose === "function" && (
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-6 py-3 border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-2xl font-bold text-xs sm:text-sm transition-colors cursor-pointer w-full sm:w-auto"
                  >
                    انصراف
                  </button>
                )}
                <button
                  type="submit"
                  disabled={submittingReceipt || !effectivePersonId || !receiptAmount}
                  className={`px-8 py-3.5 ${themeBg} text-white rounded-2xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-md shadow-rose-600/20 disabled:opacity-50 cursor-pointer min-h-[48px] w-full sm:w-auto`}
                >
                  {submittingReceipt ? (
                    <>
                      <RefreshCw className="w-5 h-5 animate-spin" />
                      در حال ثبت و صدور سند...
                    </>
                  ) : (
                    <>
                      <Save className="w-5 h-5" />
                      ثبت و صدور رسید پرداخت وجه
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Mobile Floating Sticky Submit Bar */}
            <div className="md:hidden fixed bottom-16 left-0 right-0 p-3 bg-white/95 backdrop-blur-md border-t border-slate-200 z-50 shadow-[0_-4px_16px_rgba(0,0,0,0.08)] flex items-center justify-between gap-3">
              <div className="flex flex-col min-w-0">
                <span className="text-[10px] font-bold text-slate-500">مبلغ پرداخت:</span>
                <span className="font-mono font-black text-sm text-slate-900 truncate">
                  {receiptAmount && Number(String(receiptAmount).replace(/,/g, "")) > 0 ? (
                    `${toPersianDigits(addCommas(receiptAmount))} ${storeSettings?.currency || "تومان"}`
                  ) : (
                    "۰ تومان"
                  )}
                </span>
              </div>
              <button
                type="submit"
                disabled={submittingReceipt || !receiptAmount || !effectivePersonId}
                className="px-6 py-2.5 bg-rose-600 text-white rounded-xl font-black text-xs flex items-center justify-center gap-2 transition-all shadow-sm disabled:opacity-50 min-h-[44px] shrink-0"
              >
                {submittingReceipt ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                ثبت رسید پرداخت
              </button>
            </div>

          </form>

        </div>
      </div>
    </div>
  );
}
