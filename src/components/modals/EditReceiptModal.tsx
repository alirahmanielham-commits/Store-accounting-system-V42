import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Save, User, DollarSign, Calendar, CreditCard, Wallet, Tag } from 'lucide-react';
import CustomDatePicker from "../ui/CustomDatePicker";
import DatePickerModule from "react-multi-date-picker";
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
  storeSettings: any;
  onSave: (updatedPayload: any) => Promise<void>;
  confirmAction?: (message: string, onConfirm: () => void) => void;
}

export default function EditReceiptModal({
  isOpen,
  onClose,
  receipt,
  persons,
  accounts,
  cashboxes,
  checkbooks,
  storeSettings,
  onSave,
  showNotification,
  confirmAction
}: EditReceiptModalProps) {
  const [personId, setPersonId] = useState('');
  const [method, setMethod] = useState<'cash' | 'check'>('cash');
  const [amount, setAmount] = useState('');
  const [dateStr, setDateStr] = useState<any>('');
  const [resourceType, setResourceType] = useState<'bank' | 'cashbox'>('bank');
  const [resourceId, setResourceId] = useState('');
  const [checkNumber, setCheckNumber] = useState('');
  const [checkDueDate, setCheckDueDate] = useState<any>('');
  const [checkBankName, setCheckBankName] = useState('');
  const [checkbookId, setCheckbookId] = useState('');
  const [description, setDescription] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (receipt) {
      setPersonId(String(receipt.personId || ''));
      setMethod(receipt.method || 'cash');
      setAmount(String(receipt.amount || ''));
      setDateStr(receipt.jalaliDate || receipt.date || '');
      setResourceType(receipt.resourceType || 'bank');
      setResourceId(String(receipt.resourceId || ''));
      setCheckNumber(receipt.checkNumber || '');
      setCheckDueDate(receipt.checkDueDate || '');
      setCheckBankName(receipt.checkBankName || '');
      setCheckbookId(String(receipt.checkbookId || ''));
      setDescription(receipt.description || '');
      setNote(receipt.note || '');
    }
  }, [receipt]);

  if (!isOpen || !receipt) return null;

  const isReceive = receipt.type === 'receive';
  const themeText = isReceive ? 'text-emerald-600' : 'text-rose-600';
  const themeRing = isReceive ? 'focus:ring-emerald-500' : 'focus:ring-rose-500';
  const themeBgButton = isReceive ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700';

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!personId || !amount) {
      showNotification('لطفاً اطلاعات الزامی را تکمیل کنید.', 'error');
      return;
    }

    if (method === 'cash') {
      if (!resourceId) {
        showNotification('لطفاً منبع مالی (بانک یا صندوق) را انتخاب کنید.', 'error');
        return;
      }
    } else {
      if (!checkNumber || !checkDueDate) {
        showNotification('لطفاً مشخصات چک را کامل وارد نمایید.', 'error');
        return;
      }
    }

    const processSave = async () => {
      setLoading(true);
      try {
        const parsedAmount = Number(amount);
        let jalaliDateConverted = dateStr;
        
        // If dateStr is a date object (from multi-date-picker)
        if (dateStr && typeof dateStr.toDate === 'function') {
          const d = dateStr.toDate();
          jalaliDateConverted = d.toLocaleDateString(storeSettings?.calendarType === 'gregorian' ? 'en-US' : 'fa-IR');
        }

        let parsedCheckDueDate = checkDueDate;
        if (checkDueDate && typeof checkDueDate.toDate === 'function') {
          const d = checkDueDate.toDate();
          parsedCheckDueDate = d.toLocaleDateString('fa-IR');
        }

        const updatedPayload: any = {
          personId,
          method,
          amount: parsedAmount,
          jalaliDate: jalaliDateConverted,
          description,
          note,
          resourceType: method === 'cash' ? resourceType : undefined,
          resourceId: method === 'cash' ? resourceId : undefined,
          checkNumber: method === 'check' ? checkNumber : undefined,
          checkDueDate: method === 'check' ? parsedCheckDueDate : undefined,
          checkBankName: (method === 'check' && isReceive) ? checkBankName : undefined,
          checkbookId: (method === 'check' && !isReceive) ? checkbookId : undefined,
        };

        await onSave(updatedPayload);
        onClose();
      } catch (err) {
        console.error(err);
        showNotification('خطا در ثبت تغییرات رسید.', 'error');
      } finally {
        setLoading(false);
      }
    };

    if (confirmAction) {
      confirmAction('آیا از اعمال این تغییرات روی رسید اطمینان دارید؟', processSave);
    } else {
      processSave();
    }
  };

  return (
    <div className="fixed inset-0 z-[999] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto" dir="rtl">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col border border-slate-100"
      >
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-2xl ${isReceive ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'} flex items-center justify-center shadow-inner`}>
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-800 text-lg">
                ویرایش رسید رسمی
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                سند {isReceive ? 'دریافت وجه' : 'پرداخت وجه'} شماره {receipt.receiptNumber || `#${receipt.id}`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-2 hover:bg-slate-100 rounded-xl transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleFormSubmit} className="p-6 space-y-6 text-right">
          {/* Method Selector */}
          <div className="flex gap-2 bg-slate-100 p-1.5 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => setMethod('cash')}
              className={`flex-1 flex gap-2 justify-center items-center py-2.5 px-4 rounded-lg font-bold text-sm transition-all duration-300 ${method === 'cash' ? 'bg-white text-slate-800 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <DollarSign className="w-4 h-4" />
              نقدی / فیش بانکی / حواله
            </button>
            <button
              type="button"
              onClick={() => setMethod('check')}
              className={`flex-1 flex gap-2 justify-center items-center py-2.5 px-4 rounded-lg font-bold text-sm transition-all duration-300 ${method === 'check' ? 'bg-white text-slate-800 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <CreditCard className="w-4 h-4" />
              {isReceive ? 'چک دریافتی' : 'چک صادره (پرداختی)'}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Person Selector */}
            <div className="md:col-span-2 lg:col-span-4">
              <label className="block text-xs font-black text-slate-700 mb-1.5 flex items-center gap-1.5">
                <User className="w-4 h-4 text-slate-400" /> طرف حساب شخص/شرکت *
              </label>
              <select
                required
                value={personId}
                onChange={e => setPersonId(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-500/30"
              >
                <option value="">-- انتخاب طرف حساب --</option>
                {(persons || []).filter(p => p.isActive !== false).map((p, idx) => (
                  <option key={`${p.id}-${idx}`} value={p.id}>{p.name} ({p.role === 'customer' ? 'مشتری' : p.role === 'supplier' ? 'تامین کننده' : 'همکار'})</option>
                ))}
              </select>
            </div>

            {/* Date Field */}
            <div className="lg:col-span-2">
              <label className="block text-xs font-black text-slate-700 mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-slate-400" /> تاریخ سند
              </label>
              <DatePicker
                value={dateStr}
                onChange={setDateStr}
                calendar={storeSettings?.calendarType === 'gregorian' ? undefined : persian}
                locale={storeSettings?.calendarType === 'gregorian' ? undefined : persian_fa}
                calendarPosition="bottom-right"
                inputClass="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-center font-sans font-black focus:outline-none focus:ring-2 focus:ring-slate-500/30"
                containerClassName="w-full"
              />
            </div>

            {/* Amount Field */}
            <div className="lg:col-span-2">
              <label className="block text-xs font-black text-slate-700 mb-1.5 flex items-center gap-1.5">
                <DollarSign className="w-4 h-4 text-slate-400" /> مبلغ کل سند ({storeSettings?.currency || 'تومان'}) *
              </label>
              <input
                required
                type="number"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-base text-left font-mono font-black focus:outline-none focus:ring-2 focus:ring-slate-500/30"
                placeholder="مبلغ را وارد کنید"
                dir="ltr"
              />
            </div>

            {/* Info Word Display */}
            {amount && !isNaN(Number(amount)) && Number(amount) > 0 && (
              <div className="md:col-span-2 lg:col-span-4 bg-slate-50 border p-4 rounded-xl text-xs space-y-1">
                <p className="text-slate-500">حروف: <span className="font-extrabold text-slate-800">{numToPersianWords(Number(amount))} {storeSettings.currency || 'تومان'}</span> تمام.</p>
              </div>
            )}
          </div>

          {/* Conditional Sections based on Method */}
          {method === 'cash' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50/50 p-4 border rounded-2xl">
              <div>
                <label className="block text-xs font-black text-slate-700 mb-1.5">نوع منبع مالی</label>
                <select
                  value={resourceType}
                  onChange={e => {
                    setResourceType(e.target.value as 'bank' | 'cashbox');
                    setResourceId('');
                  }}
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-white"
                >
                  <option value="bank">حساب بانکی</option>
                  <option value="cashbox">صندوق فروشگاهی</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-700 mb-1.5">
                  {resourceType === 'bank' ? 'بانک مقصد/مبدا' : 'صندوق مقصد/مبدا'}
                </label>
                {resourceType === 'bank' ? (
                  <select
                    required
                    value={resourceId}
                    onChange={e => setResourceId(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-white"
                  >
                    <option value="">-- انتخاب بانک --</option>
                    {(accounts || []).map((acc, idx) => (
                      <option key={`${acc.id}-${idx}`} value={acc.id}>{acc.bankName} - {acc.accountNumber}</option>
                    ))}
                  </select>
                ) : (
                  <select
                    required
                    value={resourceId}
                    onChange={e => setResourceId(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-white"
                  >
                    <option value="">-- انتخاب صندوق --</option>
                    {(cashboxes || []).map((cb, idx) => (
                      <option key={`${cb.id}-${idx}`} value={cb.id}>{cb.name}</option>
                    ))}
                  </select>
                )}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50/50 p-4 border rounded-2xl">
              {/* Check Details */}
              <div>
                <label className="block text-xs font-black text-slate-700 mb-1.5">شماره چک *</label>
                <input
                  required
                  type="text"
                  value={checkNumber}
                  onChange={e => setCheckNumber(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-center font-mono"
                  placeholder="مثال: ۴۵۸۲۱۲"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-slate-700 mb-1.5">تاریخ سررسید چک *</label>
                <DatePicker
                  value={checkDueDate}
                  onChange={setCheckDueDate}
                  calendar={persian}
                  locale={persian_fa}
                  calendarPosition="bottom-right"
                  inputClass="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-center font-sans font-black"
                />
              </div>

              {isReceive ? (
                <div className="md:col-span-2">
                  <label className="block text-xs font-black text-slate-700 mb-1.5">بانک صادرکننده چک *</label>
                  <input
                    required
                    type="text"
                    value={checkBankName}
                    onChange={e => setCheckBankName(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm"
                    placeholder="ملی، تجارت، پارسیان..."
                  />
                </div>
              ) : (
                <div className="md:col-span-2">
                  <label className="block text-xs font-black text-slate-700 mb-1.5">دسته چک بانکی مرجع *</label>
                  <select
                    required
                    value={checkbookId}
                    onChange={e => setCheckbookId(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-white"
                  >
                    <option value="">-- انتخاب دسته چک --</option>
                    {(checkbooks || []).map((cb, idx) => {
                      const acc = accounts.find(a => a.id == cb.accountId);
                      return <option key={`${cb.id}-${idx}`} value={cb.id}>{acc?.bankName || 'نامشخص'} (برگه‌های: {cb.startNumber} تا {cb.endNumber})</option>;
                    })}
                  </select>
                </div>
              )}
            </div>
          )}

          <div>
            <label className="block text-xs font-black text-slate-700 mb-1.5">توضیحات و بابت سند</label>
            <textarea
              rows={2}
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800"
              placeholder="مثال: بابت خرید فاکتور شماره ۱۲۳ یا تسویه بستانکاری..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-5 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 border bg-white border-slate-200 rounded-xl text-sm font-bold text-slate-500 hover:bg-slate-50"
            >
              انصراف
            </button>
            <button
              type="submit"
              disabled={loading}
              className={`px-6 py-2.5 ${themeBgButton} text-white rounded-xl text-sm font-bold shadow-md flex items-center gap-2`}
            >
              <Save className="w-4 h-4" />
              {loading ? 'در حال ذخیره...' : 'ذخیره تغییرات'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
