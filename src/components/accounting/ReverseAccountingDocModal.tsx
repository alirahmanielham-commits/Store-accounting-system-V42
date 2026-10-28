import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  RotateCcw, X, AlertTriangle, CheckCircle2, Calendar, FileText,
  ArrowRightLeft, ShieldCheck, Scale, Check, ChevronDown, HelpCircle,
  Building, User, Hash, Lock, Info
} from 'lucide-react';
import { createReversalAccountingDocument } from '../../services/accountingService';
import { formatDateDisplay, toPersianDigits, addCommas } from '../../utils/format';
import CustomDatePicker from '../ui/CustomDatePicker';
import { LedgerAccount } from '../../types';

interface ReverseAccountingDocModalProps {
  isOpen: boolean;
  onClose: () => void;
  doc: any | null;
  accountMap?: Map<string, LedgerAccount>;
  personMap?: Map<string, any>;
  currency?: string;
  onSuccess: (newDoc: any) => void;
  showNotification?: (msg: string, type: string) => void;
}

const COMMON_REASONS = [
  { id: 'wrong_amounts', title: 'اشتباه در مبالغ یا گردش بدهکار/بستانکار', prefix: 'اشتباه در ثبت مبالغ' },
  { id: 'duplicate_entry', title: 'ثبت سند تکراری در سیستم', prefix: 'سند تکراری' },
  { id: 'wrong_account', title: 'انتخاب اشتباه سرفصل معین یا طرف‌حساب', prefix: 'اشتباه در سرفصل حساب' },
  { id: 'cancelled_event', title: 'ابطال فاکتور، چک یا رویداد مالی مبدأ', prefix: 'ابطال رویداد مرجع' },
  { id: 'auditor_adjustment', title: 'اصلاحیه طبق دستور مدیریت یا حسابرس', prefix: 'دستور حسابرسی' },
  { id: 'period_end', title: 'تعدیلات و بستن حساب‌های پایان دوره', prefix: 'تعدیل پایان دوره' },
];

export default function ReverseAccountingDocModal({
  isOpen,
  onClose,
  doc,
  accountMap = new Map(),
  personMap = new Map(),
  currency = 'تومان',
  onSuccess,
  showNotification
}: ReverseAccountingDocModalProps) {
  if (!isOpen || !doc) return null;

  const totalDebit = useMemo(() => {
    return (doc.items || []).reduce((sum: number, it: any) => sum + (Number(it.debit) || 0), 0);
  }, [doc]);

  const totalCredit = useMemo(() => {
    return (doc.items || []).reduce((sum: number, it: any) => sum + (Number(it.credit) || 0), 0);
  }, [doc]);

  const [selectedPresetId, setSelectedPresetId] = useState<string>('wrong_amounts');
  const [reasonTitle, setReasonTitle] = useState<string>('اشتباه در ثبت مبالغ یا گردش بدهکار/بستانکار');
  const [customDescription, setCustomDescription] = useState<string>(() => {
    return `سند معکوس بابت ابطال سند شماره ${doc.documentNumber || doc.id} - ${doc.description || ''}`;
  });
  const [internalNotes, setInternalNotes] = useState<string>('');
  const [dateMode, setDateMode] = useState<'today' | 'same_date' | 'custom'>('today');
  const [customDate, setCustomDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [docStatus, setDocStatus] = useState<'permanent' | 'approved' | 'draft'>('permanent');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'form' | 'preview'>('form');

  const effectiveDate = useMemo(() => {
    if (dateMode === 'today') return new Date().toISOString();
    if (dateMode === 'same_date') return doc.date || new Date().toISOString();
    return customDate ? new Date(customDate).toISOString() : new Date().toISOString();
  }, [dateMode, doc.date, customDate]);

  const handleSelectPreset = (preset: typeof COMMON_REASONS[0]) => {
    setSelectedPresetId(preset.id);
    setReasonTitle(preset.title);
    setCustomDescription(
      `سند معکوس بابت سند شماره ${doc.documentNumber || doc.id} (علت: ${preset.prefix}) - ${doc.description || ''}`
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (doc.isReversed) {
      if (showNotification) {
        showNotification(`برای این سند قبلاً سند معکوس شماره ${doc.reversalDocNumber || ''} صادر شده است.`, 'warning');
      }
      return;
    }

    if (!reasonTitle.trim()) {
      if (showNotification) showNotification('لطفاً علت معکوس‌سازی را مشخص فرمایید.', 'warning');
      return;
    }

    setIsSubmitting(true);
    try {
      const newDoc = await createReversalAccountingDocument(
        doc.id,
        reasonTitle.trim(),
        effectiveDate,
        {
          customDescription: customDescription.trim(),
          status: docStatus,
          reversalNotes: internalNotes.trim() || undefined
        }
      );

      if (showNotification) {
        showNotification(
          `سند معکوس شماره ${newDoc.documentNumber || newDoc.id} با موفقیت صادر و ثبت گردید.`,
          'success'
        );
      }
      onSuccess(newDoc);
      onClose();
    } catch (err: any) {
      console.error(err);
      if (showNotification) {
        showNotification(err.message || 'خطا در ثبت سند معکوس', 'error');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto" dir="rtl">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl overflow-hidden my-auto flex flex-col max-h-[92vh]"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white px-5 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
              <RotateCcw className="w-5 h-5 animate-reverse-spin" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black">صدور سند معکوس / اصلاحی</h2>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 font-sans font-bold">
                  استاندارد حسابداری
                </span>
              </div>
              <p className="text-xs text-slate-300 font-medium mt-0.5">
                ابطال و خنثی‌سازی کامل گردش سند شماره {doc.documentNumber || doc.id} بدون مخدوش شدن دفاتر مالی
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 px-6 pt-3 border-b border-slate-200 bg-slate-50/70">
          <button
            type="button"
            onClick={() => setActiveTab('form')}
            className={`pb-2.5 px-3 text-xs font-black border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'form'
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>مشخصات و دلایل معکوس‌سازی</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('preview')}
            className={`pb-2.5 px-3 text-xs font-black border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'preview'
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <ArrowRightLeft className="w-4 h-4" />
            <span>پیش‌نمایش جابجایی آرتیکل‌ها ({toPersianDigits(doc.items?.length || 0)} سطر)</span>
          </button>
        </div>

        {/* Body Content */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-5">
          
          {/* Source Document Card */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/90 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-500">سند مبدأ:</span>
                <span className="text-sm font-black font-sans text-slate-900 bg-white px-2.5 py-0.5 rounded-lg border border-slate-200">
                  سند شماره {doc.documentNumber || doc.id}
                </span>
                <span className="text-xs text-slate-500 font-bold">
                  (تاریخ: {formatDateDisplay(doc.date)})
                </span>
              </div>
              <div className="text-xs text-slate-600 font-medium">
                <span className="text-slate-400 font-bold ml-1">شرح اصلی:</span>
                {doc.description || 'بدون شرح'}
              </div>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-200">
              <div className="text-left">
                <div className="text-[10px] font-bold text-slate-400">جمع گردش بدهکار / بستانکار</div>
                <div className="text-sm font-black text-slate-800 font-mono" dir="ltr">
                  <span className="text-xs font-sans text-slate-500 ml-1 font-bold">{currency}</span>
                  {addCommas(totalDebit)}
                </div>
              </div>
              <div className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-black">
                <Scale className="w-3.5 h-3.5" />
                <span>تراز دوبل</span>
              </div>
            </div>
          </div>

          {activeTab === 'form' ? (
            <form onSubmit={handleSubmit} className="space-y-5">
              
              {/* Preset Reasons Chips */}
              <div>
                <label className="block text-xs font-black text-slate-700 mb-2 flex items-center gap-1.5">
                  <HelpCircle className="w-3.5 h-3.5 text-indigo-600" />
                  <span>انتخاب سریع دلیل معکوس‌سازی و ابطال:</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {COMMON_REASONS.map((preset) => {
                    const isSelected = selectedPresetId === preset.id;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => handleSelectPreset(preset)}
                        className={`text-right p-2.5 rounded-xl border text-xs transition-all cursor-pointer flex items-center justify-between gap-2 ${
                          isSelected
                            ? 'bg-indigo-50/90 border-indigo-300 text-indigo-900 font-black shadow-xs ring-1 ring-indigo-500/20'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 font-medium'
                        }`}
                      >
                        <span className="truncate">{preset.title}</span>
                        {isSelected && <Check className="w-4 h-4 text-indigo-600 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Exact Reason & Title */}
              <div>
                <label className="block text-xs font-black text-slate-700 mb-1.5">
                  علت معکوس‌سازی (عنوان خلاصه):
                </label>
                <input
                  type="text"
                  value={reasonTitle}
                  onChange={(e) => setReasonTitle(e.target.value)}
                  placeholder="مثال: اشتباه در ثبت مبالغ، سند تکراری، ابطال فاکتور..."
                  className="w-full text-xs sm:text-sm font-bold border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-all bg-white"
                  required
                />
              </div>

              {/* Custom Voucher Description */}
              <div>
                <label className="block text-xs font-black text-slate-700 mb-1.5 flex items-center justify-between">
                  <span>شرح عمومی سند معکوس (در دفتر روزنامه و کل ثبت می‌شود):</span>
                  <span className="text-[10px] text-slate-400 font-normal">قابل ویرایش</span>
                </label>
                <input
                  type="text"
                  value={customDescription}
                  onChange={(e) => setCustomDescription(e.target.value)}
                  className="w-full text-xs sm:text-sm font-bold border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-all bg-white"
                  placeholder="شرح سند معکوس..."
                  required
                />
              </div>

              {/* Date & Document Status Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Date Selection */}
                <div className="bg-slate-50/70 p-3.5 rounded-xl border border-slate-200">
                  <label className="block text-xs font-black text-slate-700 mb-2 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                    <span>تاریخ ثبت سند معکوس:</span>
                  </label>
                  
                  <div className="flex items-center gap-1.5 mb-2.5">
                    <button
                      type="button"
                      onClick={() => setDateMode('today')}
                      className={`flex-1 py-1.5 px-2 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                        dateMode === 'today'
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      امروز (جاری)
                    </button>
                    <button
                      type="button"
                      onClick={() => setDateMode('same_date')}
                      className={`flex-1 py-1.5 px-2 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                        dateMode === 'same_date'
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      تاریخ سند مبدأ
                    </button>
                    <button
                      type="button"
                      onClick={() => setDateMode('custom')}
                      className={`flex-1 py-1.5 px-2 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                        dateMode === 'custom'
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      تاریخ دلخواه
                    </button>
                  </div>

                  {dateMode === 'custom' ? (
                    <div className="mt-2">
                      <CustomDatePicker
                        value={customDate}
                        onChange={(d: any) => {
                          if (d) setCustomDate(typeof d === 'string' ? d : d.toString());
                        }}
                      />
                    </div>
                  ) : (
                    <div className="text-[11px] font-bold text-slate-500 bg-white p-2 rounded-lg border border-slate-200">
                      تاریخ موثر: {formatDateDisplay(effectiveDate)}
                    </div>
                  )}
                </div>

                {/* Status Selection */}
                <div className="bg-slate-50/70 p-3.5 rounded-xl border border-slate-200">
                  <label className="block text-xs font-black text-slate-700 mb-2 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
                    <span>وضعیت سند صادر شونده:</span>
                  </label>

                  <div className="space-y-2">
                    <label className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-all ${
                      docStatus === 'permanent' ? 'bg-indigo-50 border-indigo-300 text-indigo-900 font-bold' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}>
                      <input
                        type="radio"
                        name="docStatus"
                        value="permanent"
                        checked={docStatus === 'permanent'}
                        onChange={() => setDocStatus('permanent')}
                        className="text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="text-xs">دائم و قطعی‌شده (توصیه استاندارد - قطعی‌سازی فوری ابطال)</span>
                    </label>

                    <label className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-all ${
                      docStatus === 'approved' ? 'bg-indigo-50 border-indigo-300 text-indigo-900 font-bold' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}>
                      <input
                        type="radio"
                        name="docStatus"
                        value="approved"
                        checked={docStatus === 'approved'}
                        onChange={() => setDocStatus('approved')}
                        className="text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="text-xs">تایید شده (قابل بازبینی قبل از قطعی شدن)</span>
                    </label>
                  </div>
                </div>

              </div>

              {/* Internal Notes / Auditor References */}
              <div>
                <label className="block text-xs font-black text-slate-700 mb-1.5 flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5 text-slate-400" />
                  <span>توضیحات تکمیلی، شماره مجوز اصلاح یا ارجاع اداری (اختیاری):</span>
                </label>
                <textarea
                  value={internalNotes}
                  onChange={(e) => setInternalNotes(e.target.value)}
                  rows={2}
                  className="w-full text-xs font-medium border border-slate-200 rounded-xl p-3 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-all bg-white"
                  placeholder="مثال: پیرو نامه شماره ۴۰۴/ب و بررسی اسناد و تایید مدیر مالی مورخ..."
                />
              </div>

              {/* Accounting Warning & Note */}
              <div className="bg-amber-50/80 border border-amber-200/90 rounded-xl p-3 flex items-start gap-2.5 text-amber-900 text-xs">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  <strong className="font-black">توجه حسابداری:</strong> پس از ثبت سند معکوس، سند مبدأ با شناسه سند معکوس قفل شده و علامت «معکوس‌شده» دریافت خواهد کرد. آرتیکل‌های این سند به صورت بدهکار/بستانکار معکوس ثبت می‌شوند تا تراز مالی دقیقاً به وضعیت قبل از سند اشتباه بازگردد.
                </div>
              </div>

            </form>
          ) : (
            /* Articles Inversion Preview Table */
            <div className="space-y-3">
              <div className="bg-indigo-50/70 border border-indigo-100 rounded-xl p-3 text-xs text-indigo-900 flex items-center justify-between">
                <span className="font-bold flex items-center gap-1.5">
                  <Info className="w-4 h-4 text-indigo-600" />
                  نحوه جابجایی مبالغ: ردیف‌های بدهکار به بستانکار و ردیف‌های بستانکار به بدهکار منتقل می‌شوند.
                </span>
                <span className="font-black font-sans px-2.5 py-1 bg-white rounded-lg border border-indigo-200">
                  {toPersianDigits(doc.items?.length || 0)} سطر معکوس
                </span>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-right text-xs whitespace-nowrap">
                    <thead className="bg-slate-100 text-slate-700 font-black border-b border-slate-200">
                      <tr>
                        <th className="p-2.5 text-center w-10">#</th>
                        <th className="p-2.5">سرفصل حسابداری</th>
                        <th className="p-2.5">طرف‌حساب / تفصیل</th>
                        <th className="p-2.5">شرح سطر</th>
                        <th className="p-2.5 text-center bg-rose-50/70 text-rose-800 border-l border-rose-100">
                          بدهکار اصلی ➔ بستانکار معکوس
                        </th>
                        <th className="p-2.5 text-center bg-emerald-50/70 text-emerald-800">
                          بستانکار اصلی ➔ بدهکار معکوس
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(doc.items || []).map((it: any, idx: number) => {
                        const acc = accountMap.get(String(it.ledgerAccountId));
                        const person = it.detailedAccountId ? personMap.get(String(it.detailedAccountId)) : null;
                        const origDebit = Number(it.debit) || 0;
                        const origCredit = Number(it.credit) || 0;

                        return (
                          <tr key={it.id || idx} className="hover:bg-slate-50/80 transition-colors">
                            <td className="p-2.5 text-center font-mono font-bold text-slate-400">
                              {toPersianDigits(idx + 1)}
                            </td>
                            <td className="p-2.5 font-bold text-slate-800">
                              {acc ? `${acc.code} - ${acc.title}` : (it.ledgerAccountId || '-')}
                            </td>
                            <td className="p-2.5 text-slate-600 font-medium">
                              {person ? person.name : (it.detailedAccountId || '-')}
                            </td>
                            <td className="p-2.5 text-slate-600 text-[11px] max-w-xs truncate" title={it.description}>
                              <span className="text-slate-400 font-bold ml-1">معکوس:</span>
                              {it.description || '-'}
                            </td>
                            <td className="p-2.5 text-center font-mono font-black text-rose-700 bg-rose-50/30 border-l border-rose-100" dir="ltr">
                              {origDebit > 0 ? (
                                <span className="inline-flex items-center gap-1 font-bold">
                                  <span>{addCommas(origDebit)}</span>
                                  <span className="text-[10px] text-rose-500 font-sans">(بستانکار جدید)</span>
                                </span>
                              ) : (
                                <span className="text-slate-300">-</span>
                              )}
                            </td>
                            <td className="p-2.5 text-center font-mono font-black text-emerald-700 bg-emerald-50/30" dir="ltr">
                              {origCredit > 0 ? (
                                <span className="inline-flex items-center gap-1 font-bold">
                                  <span>{addCommas(origCredit)}</span>
                                  <span className="text-[10px] text-emerald-600 font-sans">(بدهکار جدید)</span>
                                </span>
                              ) : (
                                <span className="text-slate-300">-</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot className="bg-slate-50 border-t-2 border-slate-200 font-black text-slate-800">
                      <tr>
                        <td colSpan={4} className="p-2.5 text-left font-bold">جمع کل سند معکوس ({currency}):</td>
                        <td className="p-2.5 text-center font-mono text-rose-800 bg-rose-50/60 border-l border-rose-100" dir="ltr">
                          {addCommas(totalDebit)}
                        </td>
                        <td className="p-2.5 text-center font-mono text-emerald-800 bg-emerald-50/60" dir="ltr">
                          {addCommas(totalCredit)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="bg-slate-50 px-5 sm:px-6 py-3.5 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-slate-500 font-bold flex items-center gap-1">
            <Lock className="w-3.5 h-3.5 text-slate-400" />
            <span>سند معکوس به عنوان سند جدید با سورس 'reversal' ثبت خواهد شد.</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              انصراف
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black shadow-sm transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              <RotateCcw className={`w-4 h-4 ${isSubmitting ? 'animate-spin' : ''}`} />
              <span>{isSubmitting ? 'در حال ثبت سند معکوس...' : 'تایید و صدور نهایی سند معکوس'}</span>
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
