import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Save,
  User,
  DollarSign,
  Calendar,
  CreditCard,
  Wallet,
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  CheckCircle,
  FileText,
  Building2,
  Phone,
  RefreshCw,
  Check,
  Layers,
  AlertCircle
} from 'lucide-react';
import CustomDatePicker from "../ui/CustomDatePicker";
import persian from "react-date-object/calendars/persian";
import persian_fa from "react-date-object/locales/persian_fa";
import { numToPersianWords, toPersianDigits } from '../../utils/format';

const DatePicker = CustomDatePicker;

interface EditReceiptModalProps {
  showNotification: (message: string, type?: "success" | "error" | "info" | "warning") => void;
  isOpen: boolean;
  onClose: () => void;
  receipt: any;
  persons: any[];
  accounts: any[];
  cashboxes: any[];
  checkbooks: any[];
  invoices?: any[];
  storeSettings?: any;
  onSave: (updatedPayload: any) => Promise<void>;
  confirmAction?: (message: string, onConfirm: () => void) => void;
  getPersonDisplayName?: (person: any, persons?: any[]) => string;
  formatCurrency?: (val: any) => string;
  formatNumber?: (val: any) => string;
  toPersianDigits?: (val: any) => string;
  numToPersianWords?: (val: any) => string;
  formatDateDisplay?: (date: any) => string;
}

export default function EditReceiptModal({
  isOpen,
  onClose,
  receipt,
  persons = [],
  accounts = [],
  cashboxes = [],
  checkbooks = [],
  invoices = [],
  storeSettings = {},
  onSave,
  showNotification,
  getPersonDisplayName,
  formatCurrency: formatCurrencyProp,
  formatNumber: formatNumberProp,
  toPersianDigits: toPersianDigitsProp,
  formatDateDisplay: formatDateDisplayProp
}: EditReceiptModalProps) {
  const [personId, setPersonId] = useState('');
  const [method, setMethod] = useState<'cash' | 'check'>('cash');
  const [amount, setAmount] = useState<number | string>('');
  const [dateStr, setDateStr] = useState<any>('');
  const [receiptNumber, setReceiptNumber] = useState('');
  const [resourceType, setResourceType] = useState<'bank' | 'cashbox'>('bank');
  const [resourceId, setResourceId] = useState('');
  const [checkNumber, setCheckNumber] = useState('');
  const [checkDueDate, setCheckDueDate] = useState<any>('');
  const [checkBankName, setCheckBankName] = useState('');
  const [checkbookId, setCheckbookId] = useState('');
  const [description, setDescription] = useState('');
  const [note, setNote] = useState('');
  const [recreateAccountingDoc, setRecreateAccountingDoc] = useState<boolean>(true);
  const [linkedInvoices, setLinkedInvoices] = useState<{ [invId: string]: number }>({});
  const [loading, setLoading] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Helper formatting functions
  const fmtNumber = (val: any) => {
    if (typeof formatNumberProp === 'function') return formatNumberProp(val);
    const n = Number(val) || 0;
    return n.toLocaleString('fa-IR');
  };

  const fmtCurrency = (val: any) => {
    if (typeof formatCurrencyProp === 'function') return formatCurrencyProp(val);
    return `${fmtNumber(val)} ${storeSettings?.currency || 'تومان'}`;
  };

  const toFaDigits = (val: any) => {
    if (typeof toPersianDigitsProp === 'function') return toPersianDigitsProp(val);
    return toPersianDigits(val || '');
  };

  const fmtDate = (d: any) => {
    if (typeof formatDateDisplayProp === 'function') return formatDateDisplayProp(d);
    return String(d || '');
  };

  // Populate state on receipt open/change
  useEffect(() => {
    if (receipt) {
      setPersonId(String(receipt.personId || ''));
      setMethod(receipt.method === 'check' ? 'check' : 'cash');
      setAmount(receipt.amount !== undefined ? Number(receipt.amount) : '');
      setDateStr(receipt.jalaliDate || receipt.date || '');
      setReceiptNumber(receipt.receiptNumber || '');
      setResourceType(receipt.resourceType || (receipt.accountId ? 'bank' : receipt.cashboxId ? 'cashbox' : 'bank'));
      setResourceId(String(receipt.resourceId || receipt.accountId || receipt.cashboxId || ''));
      setCheckNumber(receipt.checkNumber || '');
      setCheckDueDate(receipt.checkDueDate || '');
      setCheckBankName(receipt.checkBankName || '');
      setCheckbookId(String(receipt.checkbookId || ''));
      setDescription(receipt.description || '');
      setNote(receipt.note || '');
      setRecreateAccountingDoc(true);
      setShowConfirmModal(false);

      if (receipt.linkedInvoices && typeof receipt.linkedInvoices === 'object') {
        const initialAllocations: { [key: string]: number } = {};
        Object.entries(receipt.linkedInvoices).forEach(([key, val]) => {
          initialAllocations[key] = Number(val) || 0;
        });
        setLinkedInvoices(initialAllocations);
      } else {
        setLinkedInvoices({});
      }
    }
  }, [receipt]);

  const isReceive = receipt?.type === 'receive';
  const receiptTitle = isReceive ? 'رسید دریافت وجه' : 'رسید پرداخت وجه';
  const themeBg = isReceive ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700';
  const themeText = isReceive ? 'text-emerald-700' : 'text-rose-700';
  const themeBorder = isReceive ? 'border-emerald-200' : 'border-rose-200';
  const themeBadge = isReceive ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-rose-50 text-rose-800 border-rose-200';

  // Selected person details
  const selectedPerson = useMemo(() => {
    return (persons || []).find((p: any) => String(p.id) === String(personId));
  }, [persons, personId]);

  const personDisplayName = useMemo(() => {
    if (!selectedPerson) return 'نامشخص';
    if (typeof getPersonDisplayName === 'function') {
      return getPersonDisplayName(selectedPerson, persons);
    }
    return selectedPerson.name || `${selectedPerson.firstName || ''} ${selectedPerson.lastName || ''}`.trim() || 'نامشخص';
  }, [selectedPerson, persons, getPersonDisplayName]);

  // Open invoices for selected person
  const openInvoicesForPerson = useMemo(() => {
    if (!personId || !invoices || invoices.length === 0) return [];
    const expectedType = isReceive ? 'sale' : 'purchase';
    return invoices.filter((inv: any) => {
      const matchPerson = String(inv.customerId || inv.personId || inv.supplierId) === String(personId);
      const matchType = inv.type === expectedType;
      const isNotVoided = !inv.isVoided;
      // Show if unpaid/partial or already allocated in this receipt
      const isAllocatedInThisReceipt = linkedInvoices[inv.id] && linkedInvoices[inv.id] > 0;
      const remainingAmount = (Number(inv.totalAmount || inv.finalAmount || 0) - Number(inv.paidAmount || 0));
      return matchPerson && matchType && isNotVoided && (remainingAmount > 0 || isAllocatedInThisReceipt);
    });
  }, [personId, invoices, isReceive, linkedInvoices]);

  // Total allocated to invoices
  const totalAllocated = useMemo(() => {
    return Object.values(linkedInvoices).reduce((acc, val) => acc + (Number(val) || 0), 0);
  }, [linkedInvoices]);

  const handleInvoiceAllocationChange = (invId: string | number, value: string) => {
    const num = Number(value) || 0;
    setLinkedInvoices(prev => {
      const copy = { ...prev };
      if (num <= 0) {
        delete copy[invId];
      } else {
        copy[invId] = num;
      }
      return copy;
    });
  };

  const handleAutoAllocateFull = (inv: any) => {
    const invId = inv.id;
    const invTotal = Number(inv.totalAmount || inv.finalAmount || 0);
    const paidByOthers = (Number(inv.paidAmount || 0) - (Number(linkedInvoices[invId]) || 0));
    const remainingToPay = Math.max(0, invTotal - paidByOthers);
    handleInvoiceAllocationChange(invId, String(remainingToPay));
  };

  if (!isOpen || !receipt) return null;

  // Validation prior to showing confirmation
  const handleInitiateSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!personId) {
      showNotification('لطفاً طرف حساب را مشخص فرمایید.', 'error');
      return;
    }
    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) {
      showNotification('مبلغ سند باید بزرگتر از صفر باشد.', 'error');
      return;
    }

    if (method === 'cash') {
      if (!resourceId) {
        showNotification(resourceType === 'bank' ? 'لطفاً حساب بانکی مقصد/مبدا را انتخاب نمایید.' : 'لطفاً صندوق مقصد/مبدا را انتخاب نمایید.', 'error');
        return;
      }
    } else {
      if (!checkNumber || !checkDueDate) {
        showNotification('لطفاً شماره چک و تاریخ سررسید چک را وارد فرمایید.', 'error');
        return;
      }
      if (isReceive && !checkBankName) {
        showNotification('لطفاً نام بانک صادرکننده چک را وارد نمایید.', 'error');
        return;
      }
      if (!isReceive && !checkbookId) {
        showNotification('لطفاً دسته چک بانکی مبدا را انتخاب فرمایید.', 'error');
        return;
      }
    }

    // Open confirmation step
    setShowConfirmModal(true);
  };

  // Final submit execution
  const handleExecuteSave = async () => {
    setLoading(true);
    try {
      const parsedAmount = Number(amount);
      let jalaliDateConverted = dateStr;
      if (dateStr && typeof dateStr.toDate === 'function') {
        const d = dateStr.toDate();
        jalaliDateConverted = d.toLocaleDateString(storeSettings?.calendarType === 'gregorian' ? 'en-US' : 'fa-IR');
      }

      let parsedCheckDueDate = checkDueDate;
      if (checkDueDate && typeof checkDueDate.toDate === 'function') {
        const d = checkDueDate.toDate();
        parsedCheckDueDate = d.toLocaleDateString(storeSettings?.calendarType === 'gregorian' ? 'en-US' : 'fa-IR');
      }

      const updatedPayload: any = {
        ...receipt,
        personId,
        method,
        amount: parsedAmount,
        jalaliDate: jalaliDateConverted,
        date: jalaliDateConverted,
        receiptNumber: receiptNumber || receipt.receiptNumber,
        description,
        note,
        recreateAccountingDoc,
        linkedInvoices,
        resourceType: method === 'cash' ? resourceType : undefined,
        resourceId: method === 'cash' ? resourceId : undefined,
        accountId: method === 'cash' && resourceType === 'bank' ? resourceId : undefined,
        cashboxId: method === 'cash' && resourceType === 'cashbox' ? resourceId : undefined,
        checkNumber: method === 'check' ? checkNumber : undefined,
        checkDueDate: method === 'check' ? parsedCheckDueDate : undefined,
        checkBankName: (method === 'check' && isReceive) ? checkBankName : undefined,
        checkbookId: (method === 'check' && !isReceive) ? checkbookId : undefined,
      };

      await onSave(updatedPayload);
      setShowConfirmModal(false);
      onClose();
    } catch (err: any) {
      console.error(err);
      showNotification('خطا در ذخیره‌سازی ویرایش رسید.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[999] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto" dir="rtl">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        className="bg-white rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col border border-slate-200 my-auto max-h-[92vh]"
      >
        {/* Modal Header */}
        <div className={`px-6 py-4 border-b flex items-center justify-between ${isReceive ? 'bg-emerald-50/70 border-emerald-100' : 'bg-rose-50/70 border-rose-100'}`}>
          <div className="flex items-center gap-3">
            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shadow-inner ${isReceive ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
              {isReceive ? <ArrowDownLeft className="w-6 h-6" /> : <ArrowUpRight className="w-6 h-6" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-slate-900 text-lg">
                  ویرایش {receiptTitle}
                </h3>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-black border ${themeBadge}`}>
                  {receipt.receiptNumber ? `شماره: ${toFaDigits(receipt.receiptNumber)}` : `#${toFaDigits(receipt.id)}`}
                </span>
              </div>
              <p className="text-xs font-bold text-slate-500 mt-0.5">
                اصلاح اطلاعات ثبت‌شده، مبالغ، منبع مالی و بازسازی خودکار اسناد حسابداری
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-2 hover:bg-white/80 rounded-xl transition-all"
            title="بستن"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleInitiateSave} className="p-5 sm:p-6 overflow-y-auto space-y-6 text-right flex-1">
          {/* Prominent Financial Warning Banner */}
          <div className="bg-amber-50 border border-amber-200/90 rounded-2xl p-4 flex items-start gap-3.5 shadow-sm text-amber-900">
            <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 mt-0.5">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div className="text-xs space-y-1 leading-relaxed flex-1">
              <span className="font-black text-amber-950 block text-sm">
                هشدار حسابداری و مالی
              </span>
              <p className="text-slate-700">
                این رسید قبلاً در سیستم قطعی شده است. با ویرایش این فرم،
                <strong className="text-amber-950 font-black"> مانده‌حساب طرف‌حساب، موجودی بانک/صندوق و سند حسابداری دوبل متناظر </strong>
                به طور سیستمی اصلاح و تراز خواهند شد.
              </p>
              <div className="pt-2 flex items-center gap-2">
                <label className="flex items-center gap-2 cursor-pointer font-black text-slate-800 select-none">
                  <input
                    type="checkbox"
                    checked={recreateAccountingDoc}
                    onChange={e => setRecreateAccountingDoc(e.target.checked)}
                    className="w-4 h-4 rounded border-amber-300 text-amber-600 focus:ring-amber-500"
                  />
                  <span>حذف و بازسازی مجدد سند حسابداری متناظر با ثبت روزنامه جدید (توصیه می‌شود)</span>
                </label>
              </div>
            </div>
          </div>

          {/* Method Selector Tabs */}
          <div className="flex gap-2 bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
            <button
              type="button"
              onClick={() => setMethod('cash')}
              className={`flex-1 flex gap-2 justify-center items-center py-2.5 px-4 rounded-xl font-black text-xs sm:text-sm transition-all duration-200 ${
                method === 'cash'
                  ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Wallet className="w-4 h-4 text-emerald-600" />
              <span>نقدی / واریز به حساب بانکی / کارت‌خوان</span>
            </button>
            <button
              type="button"
              onClick={() => setMethod('check')}
              className={`flex-1 flex gap-2 justify-center items-center py-2.5 px-4 rounded-xl font-black text-xs sm:text-sm transition-all duration-200 ${
                method === 'check'
                  ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <CreditCard className="w-4 h-4 text-indigo-600" />
              <span>{isReceive ? 'چک صیادی دریافتی' : 'چک صیادی پرداختی'}</span>
            </button>
          </div>

          {/* Section 1: Person Selector & Info Card */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-black text-slate-700 mb-1.5 flex items-center gap-1.5">
                <User className="w-4 h-4 text-slate-400" />
                <span>طرف حساب شخص یا شرکت *</span>
              </label>
              <select
                required
                value={personId}
                onChange={e => setPersonId(e.target.value)}
                className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm bg-white font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400"
              >
                <option value="">-- انتخاب طرف حساب --</option>
                {(persons || []).map((p, idx) => (
                  <option key={`${p.id}-${idx}`} value={p.id}>
                    {p.personCode ? `[${p.personCode}] ` : ''}{p.name || `${p.firstName || ''} ${p.lastName || ''}`} ({p.role === 'customer' ? 'مشتری' : p.role === 'supplier' ? 'تأمین‌کننده' : 'طرف‌حساب'})
                  </option>
                ))}
              </select>
            </div>

            {selectedPerson && (
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <span className="text-slate-500 font-bold block">طرف حساب:</span>
                  <span className="font-black text-slate-900 mt-0.5 block">{personDisplayName}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-bold block">مانده‌حساب جاری:</span>
                  <span className={`font-black mt-0.5 block ${Number(selectedPerson.balance || 0) > 0 ? 'text-emerald-700' : Number(selectedPerson.balance || 0) < 0 ? 'text-rose-700' : 'text-slate-600'}`}>
                    {Number(selectedPerson.balance || 0) > 0
                      ? `${fmtNumber(selectedPerson.balance)} ${storeSettings?.currency || 'تومان'} (بستانکار)`
                      : Number(selectedPerson.balance || 0) < 0
                      ? `${fmtNumber(Math.abs(selectedPerson.balance))} ${storeSettings?.currency || 'تومان'} (بدهکار)`
                      : 'بی‌حساب / تسویه'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 font-bold block">شماره تماس / موبایل:</span>
                  <span className="font-mono font-bold text-slate-800 mt-0.5 block dir-ltr text-right">
                    {selectedPerson.phone || selectedPerson.mobile || 'ثبت نشده'}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Section 2: Financial Fields (Date, Amount, Receipt Number) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Amount Field */}
            <div className="sm:col-span-1">
              <label className="block text-xs font-black text-slate-700 mb-1.5 flex items-center gap-1.5">
                <DollarSign className="w-4 h-4 text-slate-400" />
                <span>مبلغ سند ({storeSettings?.currency || 'تومان'}) *</span>
              </label>
              <input
                required
                type="number"
                min="1"
                step="any"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-base text-left font-mono font-black focus:outline-none focus:ring-2 focus:ring-slate-400"
                placeholder="مبلغ به عدد"
                dir="ltr"
              />
            </div>

            {/* Date Field */}
            <div className="sm:col-span-1">
              <label className="block text-xs font-black text-slate-700 mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-slate-400" />
                <span>تاریخ سند *</span>
              </label>
              <DatePicker
                value={dateStr}
                onChange={setDateStr}
                calendar={storeSettings?.calendarType === 'gregorian' ? undefined : persian}
                locale={storeSettings?.calendarType === 'gregorian' ? undefined : persian_fa}
                calendarPosition="bottom-right"
                inputClass="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm text-center font-sans font-black focus:outline-none focus:ring-2 focus:ring-slate-400"
                containerClassName="w-full"
              />
            </div>

            {/* Receipt Number */}
            <div className="sm:col-span-1">
              <label className="block text-xs font-black text-slate-700 mb-1.5 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-slate-400" />
                <span>شماره رسید / سند رسمی</span>
              </label>
              <input
                type="text"
                value={receiptNumber}
                onChange={e => setReceiptNumber(e.target.value)}
                className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm text-center font-mono font-bold focus:outline-none focus:ring-2 focus:ring-slate-400"
                placeholder="مثال: RD-1002"
              />
            </div>

            {/* Amount in Persian Words */}
            {amount && !isNaN(Number(amount)) && Number(amount) > 0 && (
              <div className="sm:col-span-3 bg-slate-50 border border-slate-200 p-3 rounded-xl text-xs flex items-center justify-between">
                <div className="text-slate-600 font-bold">
                  مبلغ به حروف: <span className="font-black text-slate-900">{numToPersianWords(Number(amount))} {storeSettings?.currency || 'تومان'}</span> تمام.
                </div>
                <div className="font-mono font-black text-slate-800 text-sm">
                  {fmtCurrency(amount)}
                </div>
              </div>
            )}
          </div>

          {/* Section 3: Payment Details based on Method */}
          {method === 'cash' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50/70 p-4 border border-slate-200 rounded-2xl">
              <div>
                <label className="block text-xs font-black text-slate-700 mb-1.5">نوع منبع مالی</label>
                <select
                  value={resourceType}
                  onChange={e => {
                    setResourceType(e.target.value as 'bank' | 'cashbox');
                    setResourceId('');
                  }}
                  className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm bg-white font-bold text-slate-800"
                >
                  <option value="bank">حساب بانکی / کارت‌خوان</option>
                  <option value="cashbox">صندوق فروشگاهی / نقد</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-700 mb-1.5">
                  {resourceType === 'bank' ? (isReceive ? 'بانک مقصد واریز *' : 'بانک مبدا پرداخت *') : (isReceive ? 'صندوق مقصد *' : 'صندوق مبدا *')}
                </label>
                {resourceType === 'bank' ? (
                  <select
                    required
                    value={resourceId}
                    onChange={e => setResourceId(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm bg-white font-bold text-slate-800"
                  >
                    <option value="">-- انتخاب حساب بانکی --</option>
                    {(accounts || []).map((acc, idx) => (
                      <option key={`${acc.id}-${idx}`} value={acc.id}>
                        {acc.bankName || acc.title} {acc.accountNumber ? `(${acc.accountNumber})` : ''} - موجودی: {fmtCurrency(acc.balance || 0)}
                      </option>
                    ))}
                  </select>
                ) : (
                  <select
                    required
                    value={resourceId}
                    onChange={e => setResourceId(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm bg-white font-bold text-slate-800"
                  >
                    <option value="">-- انتخاب صندوق --</option>
                    {(cashboxes || []).map((cb, idx) => (
                      <option key={`${cb.id}-${idx}`} value={cb.id}>
                        {cb.name} - موجودی: {fmtCurrency(cb.balance || 0)}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50/70 p-4 border border-slate-200 rounded-2xl">
              <div>
                <label className="block text-xs font-black text-slate-700 mb-1.5">شماره چک / شناسه صیادی *</label>
                <input
                  required
                  type="text"
                  value={checkNumber}
                  onChange={e => setCheckNumber(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm text-center font-mono font-bold"
                  placeholder="مثال: ۱۲۳۴۵۶۷۸۹۰۱۲۳۴۵۶"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-slate-700 mb-1.5">تاریخ سررسید چک *</label>
                <DatePicker
                  value={checkDueDate}
                  onChange={setCheckDueDate}
                  calendar={storeSettings?.calendarType === 'gregorian' ? undefined : persian}
                  locale={storeSettings?.calendarType === 'gregorian' ? undefined : persian_fa}
                  calendarPosition="bottom-right"
                  inputClass="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm text-center font-sans font-black"
                  containerClassName="w-full"
                />
              </div>

              {isReceive ? (
                <div className="sm:col-span-2">
                  <label className="block text-xs font-black text-slate-700 mb-1.5">نام بانک صادرکننده چک *</label>
                  <input
                    required
                    type="text"
                    value={checkBankName}
                    onChange={e => setCheckBankName(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm font-bold"
                    placeholder="مثال: ملی، ملت، صادرات، تجارت..."
                  />
                </div>
              ) : (
                <div className="sm:col-span-2">
                  <label className="block text-xs font-black text-slate-700 mb-1.5">دسته چک بانکی مبدا *</label>
                  <select
                    required
                    value={checkbookId}
                    onChange={e => setCheckbookId(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm bg-white font-bold text-slate-800"
                  >
                    <option value="">-- انتخاب دسته چک --</option>
                    {(checkbooks || []).map((cb, idx) => {
                      const acc = (accounts || []).find(a => String(a.id) === String(cb.accountId));
                      return (
                        <option key={`${cb.id}-${idx}`} value={cb.id}>
                          {acc?.bankName || 'حساب بانکی'} (برگه‌های: {toFaDigits(cb.startNumber)} تا {toFaDigits(cb.endNumber)})
                        </option>
                      );
                    })}
                  </select>
                </div>
              )}
            </div>
          )}

          {/* Section 4: Invoice Allocations */}
          {openInvoicesForPerson.length > 0 && (
            <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
              <div className="bg-slate-100/80 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-indigo-600" />
                  <span className="text-xs font-black text-slate-800">
                    تخصیص و تسویه فاکتورهای باز {isReceive ? 'مشتری' : 'تأمین‌کننده'}
                  </span>
                </div>
                <div className="text-[11px] font-bold text-slate-500">
                  جمع تخصیص: <span className="font-black text-slate-900">{fmtCurrency(totalAllocated)}</span> از <span className="font-black text-slate-900">{fmtCurrency(amount || 0)}</span>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-right">
                  <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                    <tr>
                      <th className="p-3 font-black">شماره فاکتور</th>
                      <th className="p-3 font-black">تاریخ</th>
                      <th className="p-3 font-black">مبلغ کل</th>
                      <th className="p-3 font-black">مانده فاکتور</th>
                      <th className="p-3 font-black">مبلغ تخصیص این رسید</th>
                      <th className="p-3 font-black text-center">عملیات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {openInvoicesForPerson.map((inv: any) => {
                      const invTotal = Number(inv.totalAmount || inv.finalAmount || 0);
                      const paidByOthers = (Number(inv.paidAmount || 0) - (Number(linkedInvoices[inv.id]) || 0));
                      const remainingToPay = Math.max(0, invTotal - paidByOthers);
                      const currentAlloc = linkedInvoices[inv.id] || '';

                      return (
                        <tr key={inv.id} className="hover:bg-slate-50/70">
                          <td className="p-3 font-mono font-bold text-slate-800">
                            {inv.invoiceNumber || `#${inv.id}`}
                          </td>
                          <td className="p-3 font-bold text-slate-600">
                            {fmtDate(inv.date)}
                          </td>
                          <td className="p-3 font-mono font-bold text-slate-800">
                            {fmtCurrency(invTotal)}
                          </td>
                          <td className="p-3 font-mono font-black text-rose-700">
                            {fmtCurrency(remainingToPay)}
                          </td>
                          <td className="p-3">
                            <input
                              type="number"
                              min="0"
                              max={remainingToPay}
                              value={currentAlloc}
                              onChange={e => handleInvoiceAllocationChange(inv.id, e.target.value)}
                              className="w-32 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-left font-mono font-bold focus:ring-1 focus:ring-indigo-500"
                              placeholder="0"
                              dir="ltr"
                            />
                          </td>
                          <td className="p-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleAutoAllocateFull(inv)}
                              className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-lg transition-colors text-[11px]"
                            >
                              تسویه کامل
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Section 5: Descriptions and Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-black text-slate-700 mb-1.5">
                شرح و بابت سند (درج در سند حسابداری دوبل)
              </label>
              <textarea
                rows={2}
                value={description}
                onChange={e => setDescription(e.target.value)}
                className="w-full border border-slate-300 rounded-xl px-4 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400"
                placeholder="مثال: تسویه فاکتور شماره ۱۲۳ یا دریافت علی‌الحساب بابت قرارداد..."
              />
            </div>
            <div>
              <label className="block text-xs font-black text-slate-700 mb-1.5">
                یادداشت داخلی (اختیاری)
              </label>
              <textarea
                rows={2}
                value={note}
                onChange={e => setNote(e.target.value)}
                className="w-full border border-slate-300 rounded-xl px-4 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400"
                placeholder="یادداشت‌های محرمانه و اداری داخلی..."
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 rounded-xl text-sm font-black transition-colors"
            >
              انصراف و بستن
            </button>
            <button
              type="submit"
              disabled={loading}
              className={`px-7 py-2.5 ${themeBg} text-white rounded-xl text-sm font-black shadow-md flex items-center gap-2 transition-all disabled:opacity-50`}
            >
              <Save className="w-4 h-4" />
              <span>ذخیره تغییرات و اصلاح اسناد</span>
            </button>
          </div>
        </form>

        {/* Confirmation Modal Step */}
        <AnimatePresence>
          {showConfirmModal && (
            <div className="fixed inset-0 z-[1000] bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.92 }}
                className="bg-white rounded-3xl max-w-lg w-full shadow-2xl p-6 border border-slate-200 text-right space-y-5"
              >
                <div className="flex items-center gap-3 border-b pb-4">
                  <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                    <AlertCircle className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-black text-slate-900 text-base">
                      تایید نهایی ویرایش رسید و اصلاح اسناد
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      لطفاً خلاصه تغییرات مالی زیر را قبل از ثبت قطعی بازبینی فرمایید
                    </p>
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2.5 text-xs">
                  <div className="flex justify-between items-center py-1 border-b border-slate-200/70">
                    <span className="text-slate-500 font-bold">نوع سند:</span>
                    <span className="font-black text-slate-900">{receiptTitle}</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-slate-200/70">
                    <span className="text-slate-500 font-bold">طرف حساب:</span>
                    <span className="font-black text-slate-900">{personDisplayName}</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-slate-200/70">
                    <span className="text-slate-500 font-bold">مبلغ قبلی سند:</span>
                    <span className="font-mono font-bold text-slate-600 line-through">
                      {fmtCurrency(receipt.amount || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-slate-200/70">
                    <span className="text-slate-500 font-bold">مبلغ جدید سند:</span>
                    <span className="font-mono font-black text-emerald-700 text-sm">
                      {fmtCurrency(amount || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-slate-200/70">
                    <span className="text-slate-500 font-bold">روش تسویه:</span>
                    <span className="font-bold text-slate-900">
                      {method === 'cash' ? 'نقدی / بانکی' : 'چک صیادی'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-slate-500 font-bold">عملیات حسابداری:</span>
                    <span className="font-black text-indigo-700">
                      {recreateAccountingDoc ? 'حذف و صدور مجدد سند حسابداری' : 'به‌روزرسانی سند حسابداری'}
                    </span>
                  </div>
                </div>

                <p className="text-xs font-bold text-amber-800 bg-amber-50/70 p-3 rounded-xl border border-amber-200/70 leading-relaxed">
                  آیا از اعمال این تغییرات اطمینان دارید؟ پس از تأیید، گردش بانک/صندوق، تراز حسابداری و مانده طرف‌حساب فوراً اصلاح خواهند شد.
                </p>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => setShowConfirmModal(false)}
                    className="px-4 py-2.5 border border-slate-300 rounded-xl text-xs font-black text-slate-700 hover:bg-slate-100"
                  >
                    بازگشت و اصلاح
                  </button>
                  <button
                    type="button"
                    disabled={loading}
                    onClick={handleExecuteSave}
                    className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black shadow-lg flex items-center gap-2 disabled:opacity-50"
                  >
                    {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    <span>تایید نهایی و اعمال تغییرات</span>
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
