import React, { useState, useEffect, useMemo } from 'react';
import { useStore } from '../../store';
import { motion } from 'motion/react';
import { Calculator, Save, Plus, Trash2, ArrowRight, CheckCircle2, AlertTriangle, AlertCircle, Sparkles } from 'lucide-react';
import { getLedgerAccounts, addAccountingDocument, updateAccountingDocument, getPersons, getProducts, getStoreSettings, generateDocNumber, updateDocCounter } from '../../services/dataService';
import { convertToGregorian, addCommas, toPersianDigits } from '../../utils/format';
import CustomDatePicker from '../ui/CustomDatePicker';
import persian from 'react-date-object/calendars/persian';
import persian_fa from 'react-date-object/locales/persian_fa';
import { LedgerAccount } from '../../types';
import CurrencyInput from '../common/CurrencyInput';
import { useDirtyForm } from '../../hooks/useDirtyForm';
import { UnsavedChangesPrompt } from '../common/UnsavedChangesPrompt';
import { accountingDocFormSchema } from '../../schemas/validation';

export default function AccountingDocCreate({ showNotification, onBack, initialDoc }: any) {
  const [accounts, setAccounts] = useState<LedgerAccount[]>([]);
  const [persons, setPersons] = useState<any[]>([]);
  const [storeSettings, setStoreSettings] = useState<any>(null);
  const [date, setDate] = useState(initialDoc?.date ? convertToGregorian(initialDoc.date).split('T')[0] : new Date().toISOString().split('T')[0]);
  const [docNumber, setDocNumber] = useState(initialDoc?.documentNumber || '');
  const [description, setDescription] = useState(initialDoc?.description || '');
  const [items, setItems] = useState<any[]>((initialDoc?.items && initialDoc.items.length > 0) ? initialDoc.items : [
    { ledgerAccountId: '', detailedAccountId: '', description: '', debit: 0, credit: 0 },
    { ledgerAccountId: '', detailedAccountId: '', description: '', debit: 0, credit: 0 }
  ]);
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Dirty Form Detection
  const isDirty = useMemo(() => {
    return Boolean(
      description.trim() ||
      items.some(i => i.ledgerAccountId || Number(i.debit) > 0 || Number(i.credit) > 0)
    );
  }, [description, items]);

  const { showPrompt, guardNavigation, confirmDiscard, cancelDiscard } = useDirtyForm({
    isDirty,
    message: 'اطلاعات سند حسابداری تغییر کرده است. آیا از خروج بدون ذخیره مطمئنید؟'
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F2') {
        e.preventDefault();
        handleSave('approved');
      } else if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave('draft');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [items, description, date, isSubmitting]);

  useEffect(() => {
     if (!initialDoc && !docNumber) {
        const hasData = items.some(i => i.ledgerAccountId || i.debit > 0 || i.credit > 0) || description;
        if (hasData) {
            generateDocNumber('accounting_document').then(num => {
                setDocNumber(num);
                updateDocCounter('accounting_document', num);
            });
        }
     }
  }, [items, description, docNumber, initialDoc]);

  const loadData = async () => {
    const [accs, pers, settings] = await Promise.all([
      getLedgerAccounts(),
      getPersons(),
      getStoreSettings()
    ]);
    setAccounts(accs);
    setPersons(pers);
    setStoreSettings(settings);
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    const newItems = [...items];
    if (field === 'debit' && Number(value) > 0) {
      newItems[index].credit = 0;
    }
    if (field === 'credit' && Number(value) > 0) {
      newItems[index].debit = 0;
    }
    newItems[index][field] = value;
    setItems(newItems);
  };

  const addItemRow = () => {
    setItems([...items, { ledgerAccountId: '', detailedAccountId: '', description: '', debit: 0, credit: 0 }]);
  };

  const removeItemRow = (index: number) => {
    if ((items || []).length <= 2) {
      if (showNotification) showNotification('حداقل دو آرتیکل برای ثبت سند دوبل الزامی است.', 'warning');
      return;
    }
    const newItems = [...items];
    newItems.splice(index, 1);
    setItems(newItems);
  };

  const totalDebit = items.reduce((sum, item) => sum + (Number(item.debit) || 0), 0);
  const totalCredit = items.reduce((sum, item) => sum + (Number(item.credit) || 0), 0);
  const difference = Math.abs(totalDebit - totalCredit);
  const isBalanced = difference < 0.001 && totalDebit > 0;

  const handleSafeBack = () => {
    guardNavigation(() => {
      onBack();
    });
  };

  const handleSave = async (status: 'draft' | 'approved') => {
    if (status === 'approved') {
      let dateStr = '';
      if ((date as any) instanceof Date) {
        dateStr = !isNaN((date as any).getTime()) ? (date as any).toISOString() : new Date().toISOString();
      } else if (date && typeof (date as any).toDate === 'function') {
        try {
          const d = (date as any).toDate();
          dateStr = d instanceof Date && !isNaN(d.getTime()) ? d.toISOString() : new Date().toISOString();
        } catch (_) {
          dateStr = new Date().toISOString();
        }
      } else if (date && typeof (date as any).format === 'function') {
        try {
          dateStr = (date as any).format();
        } catch (_) {
          dateStr = new Date().toISOString();
        }
      } else if (date) {
        dateStr = String(date).trim();
      } else {
        dateStr = new Date().toISOString();
      }

      const validationResult = accountingDocFormSchema.safeParse({
        date: dateStr,
        description: description.trim(),
        items: items.map(it => ({
          ledgerAccountId: it.ledgerAccountId,
          debit: Number(it.debit) || 0,
          credit: Number(it.credit) || 0,
          description: it.description || ''
        }))
      });

      if (!validationResult.success) {
        const issues = (validationResult.error as any).issues || (validationResult.error as any).errors || [];
        const errorList = issues.map((e: any) => `• ${e.message}`).join('\n');
        if (showNotification) {
          showNotification(errorList, 'error');
        } else {
          alert(`خطای اعتبارسنجی سند:\n${errorList}`);
        }
        return;
      }
    } else {
      if (!description.trim()) {
        showNotification?.('لطفاً شرح کلی سند را وارد کنید.', 'error');
        return;
      }
      if (items.length < 2) {
        showNotification?.('حداقل ۲ آرتیکل برای سند الزامی است.', 'error');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      if (initialDoc?.id) {
        await updateAccountingDocument(initialDoc.id, {
          ...initialDoc,
          date,
          description,
          status,
          items,
        });
        showNotification?.(status === 'approved' ? 'سند حسابداری با موفقیت بروزرسانی و تایید شد' : 'تغییرات سند موقت ذخیره شد', 'success');
      } else {
        await addAccountingDocument({
          date: date,
          description,
          status,
          items,
          sourceType: 'manual'
        });
        showNotification?.(status === 'approved' ? 'سند حسابداری با موفقیت تایید و ثبت شد' : 'سند موقت ذخیره شد', 'success');
      }
      onBack();
    } catch (err: any) {
      showNotification?.(err.message || 'خطا در ثبت سند', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const currency = storeSettings?.currency || 'تومان';

  return (
    <div className="max-w-6xl mx-auto space-y-6 text-right font-sans" dir="rtl">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button 
            type="button"
            onClick={handleSafeBack} 
            className="p-2.5 hover:bg-slate-200 bg-white border border-slate-200 rounded-xl transition text-slate-600 cursor-pointer shadow-2xs"
            title="بازگشت به فهرست اسناد"
          >
            <ArrowRight className="w-5 h-5" />
          </button>
          <div className="bg-indigo-600 p-2.5 rounded-xl text-white shadow-sm">
             <Calculator className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-800">
              {initialDoc ? `ویرایش سند حسابداری (${initialDoc.documentNumber || initialDoc.id})` : 'صدور سند حسابداری دوبل'}
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">ثبت دستی آرتیکل‌های بدهکار و بستانکار مطابق استانداردهای حسابداری</p>
          </div>
        </div>

        {/* Keyboard Shortcuts Hint */}
        <div className="hidden sm:flex items-center gap-2 text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200">
          <span className="font-mono bg-white px-2 py-0.5 rounded border border-slate-200 text-indigo-700">F2: ثبت قطعی</span>
          <span className="font-mono bg-white px-2 py-0.5 rounded border border-slate-200 text-slate-700">Ctrl+S: پیش‌نویس</span>
        </div>
      </div>

      {/* Main Metadata Card */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">شماره سند</label>
            <input 
              type="text" 
              value={docNumber || 'خودکار'} 
              disabled 
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-mono text-left font-bold text-slate-600" 
              dir="ltr"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">تاریخ سند *</label>
            <CustomDatePicker
              value={date ? new Date(date) : new Date()}
              onChange={(d: any) => setDate(d?.toDate?.()?.toISOString() || '')}
              calendar={storeSettings?.calendarType === 'gregorian' ? undefined : persian}
              locale={storeSettings?.calendarType === 'gregorian' ? undefined : persian_fa}
              calendarPosition="bottom-right"
              inputClass="w-full bg-slate-50 hover:bg-slate-100/70 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-center font-bold text-slate-800 transition-colors cursor-pointer outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div className="md:col-span-1">
            <label className="block text-xs font-bold text-slate-700 mb-1.5">شرح کلی سند *</label>
            <input 
              type="text" 
              value={description} 
              onChange={e => setDescription(e.target.value)} 
              className="w-full bg-slate-50 focus:bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500 font-medium" 
              placeholder="مثال: واریز نقدی سرمایه، اصلاح حساب بانکی..." 
            />
          </div>
        </div>
      </div>

      {/* Articles / Lines */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/70">
          <div className="flex items-center gap-2">
            <h3 className="font-black text-slate-800 text-sm">آرتیکل‌های سند دوبل</h3>
            <span className="text-xs bg-indigo-50 text-indigo-700 font-bold px-2 py-0.5 rounded-full border border-indigo-100">
              {toPersianDigits(items.length)} ردیف
            </span>
          </div>
          <button 
            type="button"
            onClick={addItemRow} 
            className="text-xs font-black text-indigo-700 hover:text-indigo-800 flex items-center gap-1.5 bg-indigo-50 hover:bg-indigo-100/80 px-3 py-1.5 rounded-xl border border-indigo-200/80 transition-all cursor-pointer shadow-2xs"
          >
            <Plus className="w-4 h-4" /> افزودن سطر آرتیکل
          </button>
        </div>

        {/* Desktop & Tablet Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs text-slate-600 font-black">
              <tr>
                <th className="p-3.5 w-12 text-center">#</th>
                <th className="p-3.5 min-w-[220px]">حساب معین / تفصیلی *</th>
                <th className="p-3.5 w-52">طرف حساب شخص (اختیاری)</th>
                <th className="p-3.5 min-w-[180px]">شرح آرتیکل</th>
                <th className="p-3.5 w-48 text-left">مبلغ بدهکار ({currency})</th>
                <th className="p-3.5 w-48 text-left">مبلغ بستانکار ({currency})</th>
                <th className="p-3.5 w-12 text-center"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {(items || []).map((item, index) => (
                <tr key={index} className="hover:bg-slate-50/60 transition-colors">
                  <td className="p-3 text-center text-slate-400 font-mono font-bold">{index + 1}</td>
                  
                  {/* Ledger Account */}
                  <td className="p-3">
                    <select
                      value={item.ledgerAccountId}
                      onChange={e => handleItemChange(index, 'ledgerAccountId', e.target.value)}
                      className={`w-full bg-slate-50 focus:bg-white border rounded-xl px-2.5 py-2 text-xs font-bold outline-none transition-all ${
                        !item.ledgerAccountId ? 'border-amber-300 bg-amber-50/20' : 'border-slate-200 focus:ring-2 focus:ring-indigo-500'
                      }`}
                    >
                      <option value="">-- انتخاب حساب حسابداری --</option>
                      {(accounts || []).filter(a => ['general', 'subsidiary', 'detailed'].includes(a.type)).map(a => (
                        <option key={a.id} value={a.id}>
                          {a.code} - {a.title} ({a.type === 'general' ? 'کل' : a.type === 'subsidiary' ? 'معین' : 'تفصیلی'})
                        </option>
                      ))}
                    </select>
                  </td>

                  {/* Person */}
                  <td className="p-3">
                    <select
                      value={item.detailedAccountId}
                      onChange={e => handleItemChange(index, 'detailedAccountId', e.target.value)}
                      className="w-full bg-slate-50 focus:bg-white border border-slate-200 rounded-xl px-2.5 py-2 text-xs text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                    >
                       <option value="">بدون شخص</option>
                       {(persons || []).filter(p => p.isActive !== false).map(p => (
                         <option key={p.id} value={p.id}>{p.name} {p.role ? `(${p.role})` : ''}</option>
                       ))}
                    </select>
                  </td>

                  {/* Description */}
                  <td className="p-3">
                    <input
                      type="text"
                      value={item.description}
                      onChange={e => handleItemChange(index, 'description', e.target.value)}
                      className="w-full bg-slate-50 focus:bg-white border border-slate-200 rounded-xl px-2.5 py-2 text-xs outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                      placeholder="شرح ردیف..."
                    />
                  </td>

                  {/* Debit Input with Currency formatting */}
                  <td className="p-3">
                    <CurrencyInput
                      value={item.debit}
                      onChange={(e: any) => handleItemChange(index, 'debit', Number(e.target.value) || 0)}
                      className="w-full bg-emerald-50/40 text-emerald-800 border border-emerald-200 rounded-xl px-2.5 py-2 text-xs font-mono font-bold text-left focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                      placeholder="۰"
                      currencyLabel={currency}
                      showConversion={false}
                      hideWords={true}
                    />
                  </td>

                  {/* Credit Input with Currency formatting */}
                  <td className="p-3">
                    <CurrencyInput
                      value={item.credit}
                      onChange={(e: any) => handleItemChange(index, 'credit', Number(e.target.value) || 0)}
                      className="w-full bg-amber-50/40 text-amber-800 border border-amber-200 rounded-xl px-2.5 py-2 text-xs font-mono font-bold text-left focus:ring-2 focus:ring-amber-500 focus:bg-white"
                      placeholder="۰"
                      currencyLabel={currency}
                      showConversion={false}
                      hideWords={true}
                    />
                  </td>

                  {/* Remove */}
                  <td className="p-3 text-center">
                    <button 
                      type="button"
                      onClick={() => removeItemRow(index)} 
                      disabled={(items || []).length <= 2} 
                      className="p-2 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer"
                      title="حذف این آرتیکل"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>

            {/* Balancing & Totals Footer */}
            <tfoot className="bg-slate-50/90 border-t-2 border-slate-200 font-black text-xs">
              <tr>
                <td colSpan={4} className="p-4 text-slate-700">
                  <div className="flex items-center gap-3">
                    <span>جمع اقلام سند</span>
                    {isBalanced ? (
                      <span className="flex items-center gap-1.5 text-emerald-700 bg-emerald-100/80 px-2.5 py-1 rounded-full text-xs font-black">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        سند کاملاً تراز است
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-rose-700 bg-rose-100/80 px-2.5 py-1 rounded-full text-xs font-black">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        سند ناتراز است (اختلاف: {toPersianDigits(addCommas(difference))} {currency})
                      </span>
                    )}
                  </div>
                </td>
                <td className="p-4 text-left font-mono text-emerald-800 font-black text-sm" dir="ltr">
                  {addCommas(totalDebit)} {currency}
                </td>
                <td className="p-4 text-left font-mono text-amber-800 font-black text-sm" dir="ltr">
                  {addCommas(totalCredit)} {currency}
                </td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
        <div className="text-xs text-slate-500 font-medium">
          اسناد تایید شده پس از ثبت قطعی مستقیماً در ترازنامه و دفاتر کل و روزنامه ثبت می‌شوند.
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => handleSave('draft')}
            disabled={isSubmitting}
            className="flex-1 sm:flex-none px-6 py-3 bg-white border-2 border-slate-200 hover:bg-slate-50 text-slate-700 rounded-2xl font-bold transition shadow-2xs cursor-pointer"
          >
            ذخیره موقت (پیش‌نویس)
          </button>
          <button
            type="button"
            onClick={() => handleSave('approved')}
            disabled={isSubmitting || !isBalanced}
            className="flex-1 sm:flex-none px-8 py-3 bg-indigo-600 text-white rounded-2xl font-black hover:bg-indigo-700 transition flex items-center justify-center gap-2.5 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-200 cursor-pointer"
          >
            <Save className="w-5 h-5" /> 
            تایید و ثبت قطعی سند (F2)
          </button>
        </div>
      </div>

      {/* Dirty Form Exit Protection Modal */}
      <UnsavedChangesPrompt
        isOpen={showPrompt}
        onStay={cancelDiscard}
        onDiscard={confirmDiscard}
        title="سند حسابداری ذخیره‌نشده"
        description="آرتیکل‌های سند حسابداری جاری ذخیره نشده‌اند. در صورت خروج از این صفحه، تغییرات پاک خواهند شد. آیا اطمینان دارید؟"
      />
    </div>
  );
}
