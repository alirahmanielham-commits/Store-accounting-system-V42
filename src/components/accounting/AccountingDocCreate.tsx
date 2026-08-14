import React, { useState, useEffect } from 'react';
import { useStore } from '../../store';
import { motion } from 'motion/react';
import { Calculator, Save, Plus, Trash2, ArrowRight } from 'lucide-react';
import { getLedgerAccounts, addAccountingDocument, updateAccountingDocument, getPersons, getProducts, getStoreSettings, generateDocNumber, updateDocCounter } from '../../services/dataService';
import { convertToGregorian } from '../../utils/format';
import CustomDatePicker from '../ui/CustomDatePicker';
import persian from 'react-date-object/calendars/persian';
import persian_fa from 'react-date-object/locales/persian_fa';
import { LedgerAccount } from '../../types';

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

  useEffect(() => {
    loadData();
  }, []);

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
    const [accs, pers] = await Promise.all([
      getLedgerAccounts(),
      getPersons()
    ]);
    // only show 'general' (کل), 'subsidiary' (معین) or 'detailed' (تفصیلی) for selection in journal
    setAccounts(accs);
    setPersons(pers);
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
    if ((items || []).length <= 2) return;
    const newItems = [...items];
    newItems.splice(index, 1);
    setItems(newItems);
  };

  const totalDebit = items.reduce((sum, item) => sum + (Number(item.debit) || 0), 0);
  const totalCredit = items.reduce((sum, item) => sum + (Number(item.credit) || 0), 0);
  const isBalanced = totalDebit === totalCredit && totalDebit > 0;

  const handleSave = async (status: 'draft' | 'approved') => {
    if (!description || (items || []).length < 2) {
      showNotification('تکمیل شرح سند و حداقل ۲ آرتیکل الزامی است', 'error');
      return;
    }
    
    // Check validation
    const invalidItems = (items || []).filter(i => !i.ledgerAccountId || (Number(i.debit) === 0 && Number(i.credit) === 0));
    if (invalidItems.length > 0) {
      showNotification('لطفا اطلاعات تمام آرتیکل‌ها (حساب و مبلغ) را کامل کنید', 'error');
      return;
    }

    if (status === 'approved' && !isBalanced) {
      showNotification('سند تراز نیست (جمع بدهکار و بستانکار برابر نیست).', 'error');
      return;
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
        showNotification(status === 'approved' ? 'سند حسابداری با موفقیت بروزرسانی و تایید شد' : 'تغییرات سند موقت ذخیره شد', 'success');
      } else {
        await addAccountingDocument({
          date: date,
          description,
          status,
          items,
          sourceType: 'manual'
        });
        showNotification(status === 'approved' ? 'سند حسابداری با موفقیت تایید و ثبت شد' : 'سند موقت ذخیره شد', 'success');
      }
      onBack();
    } catch (err: any) {
      showNotification(err.message || 'خطا در ثبت سند', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 hover:bg-slate-200 rounded-xl transition text-slate-500">
            <ArrowRight className="w-5 h-5" />
          </button>
          <div className="bg-indigo-100 p-2 rounded-xl text-indigo-600">
             <Calculator className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-800">{initialDoc ? `ویرایش سند حسابداری (${initialDoc.documentNumber || initialDoc.id})` : 'صدور سند حسابداری (دستی)'}</h2>
            <p className="text-sm text-slate-500 mt-1">ثبت آرتیکل‌های بدهکار و بستانکار</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">تاریخ سند *</label>
            <CustomDatePicker
              value={date ? new Date(date) : new Date()}
              onChange={(d: any) => setDate(d?.toDate?.()?.toISOString() || '')}
              calendar={storeSettings?.calendarType === 'gregorian' ? undefined : persian}
              locale={storeSettings?.calendarType === 'gregorian' ? undefined : persian_fa}
              calendarPosition="bottom-right"
              inputClass="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-left font-mono"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">شرح کل سند *</label>
            <input type="text" value={description} onChange={e => setDescription(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm" placeholder="مثلا: بابت واریز سرمایه اولیه..." />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <h3 className="font-bold text-slate-700">آرتیکل‌های سند</h3>
          <button onClick={addItemRow} className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 bg-indigo-50 px-2 py-1 rounded-md">
            <Plus className="w-3.5 h-3.5" /> افزودن سطر
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-right">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs text-slate-500 font-bold">
              <tr>
                <th className="p-3 w-10 text-center">#</th>
                <th className="p-3">حساب معین/تفصیلی</th>
                <th className="p-3 w-48">حساب شخص (اختیاری)</th>
                <th className="p-3">شرح آرتیکل</th>
                <th className="p-3 w-40 text-left">بدهکار</th>
                <th className="p-3 w-40 text-left">بستانکار</th>
                <th className="p-3 w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(items || []).map((item, index) => (
                <tr key={index} className="hover:bg-slate-50/50">
                  <td className="p-2 text-center text-slate-400 text-sm font-mono">{index + 1}</td>
                  <td className="p-2 min-w-[200px]">
                    <select
                      value={item.ledgerAccountId}
                      onChange={e => handleItemChange(index, 'ledgerAccountId', e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-md px-2 py-1.5 text-xs"
                    >
                      <option value="">-- انتخاب حساب --</option>
                      {(accounts || []).filter(a => ['general', 'subsidiary', 'detailed'].includes(a.type)).map(a => (
                        <option key={a.id} value={a.id}>{a.code} - {a.title} ({a.type === 'general' ? 'کل' : a.type === 'subsidiary' ? 'معین' : 'تفصیلی'})</option>
                      ))}
                    </select>
                  </td>
                  <td className="p-2">
                    <select
                      value={item.detailedAccountId}
                      onChange={e => handleItemChange(index, 'detailedAccountId', e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-md px-2 py-1.5 text-xs text-slate-600"
                    >
                       <option value="">بدون شخص</option>
                       {(persons || []).filter(p => p.isActive !== false).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </td>
                  <td className="p-2 min-w-[200px]">
                    <input
                      type="text"
                      value={item.description}
                      onChange={e => handleItemChange(index, 'description', e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-md px-2 py-1.5 text-xs"
                      placeholder="شرح این ردیف..."
                    />
                  </td>
                  <td className="p-2">
                     <input
                      type="number"
                      value={item.debit || ''}
                      onChange={e => handleItemChange(index, 'debit', e.target.value)}
                      className="w-full bg-white border border-emerald-200 text-emerald-700 bg-emerald-50 rounded-md px-2 py-1.5 text-sm font-mono text-left focus:ring-1 focus:ring-emerald-500"
                      dir="ltr"
                      min="0"
                    />
                  </td>
                  <td className="p-2">
                     <input
                      type="number"
                      value={item.credit || ''}
                      onChange={e => handleItemChange(index, 'credit', e.target.value)}
                      className="w-full bg-white border border-amber-200 text-amber-700 bg-amber-50 rounded-md px-2 py-1.5 text-sm font-mono text-left focus:ring-1 focus:ring-amber-500"
                      dir="ltr"
                      min="0"
                    />
                  </td>
                  <td className="p-2 text-center">
                    <button onClick={() => removeItemRow(index)} disabled={(items || []).length <= 2} className="p-1.5 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded disabled:opacity-30">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-slate-100 border-t-2 border-slate-200 font-bold text-sm">
              <tr>
                <td colSpan={4} className="p-4 text-left text-slate-600">جمع کل (تراز: {isBalanced ? <span className="text-emerald-600">بلی</span> : <span className="text-rose-600">خیر</span>})</td>
                <td className="p-4 text-left font-mono text-emerald-700" dir="ltr">{totalDebit.toLocaleString()}</td>
                <td className="p-4 text-left font-mono text-amber-700" dir="ltr">{totalCredit.toLocaleString()}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <button
          onClick={() => handleSave('draft')}
          disabled={isSubmitting}
          className="px-6 py-2.5 bg-white border-2 border-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-50 transition"
        >
          ذخیره موقت
        </button>
        <button
          onClick={() => handleSave('approved')}
          disabled={isSubmitting || !isBalanced}
          className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-200"
        >
          <Save className="w-5 h-5" /> تایید و ثبت قطعی سند
        </button>
      </div>
    </div>
  );
}
