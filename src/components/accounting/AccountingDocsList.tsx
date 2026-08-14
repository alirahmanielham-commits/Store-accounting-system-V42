import { formatDateDisplay, toPersianDigits, convertToGregorian } from '../../utils/format';
import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { FileText, Plus, Search, Eye, Edit2, Trash2 } from 'lucide-react';
import { getAccountingDocuments, getLedgerAccounts, getStoreSettings, deleteAccountingDocument } from '../../services/dataService';
import { AccountingDocument, LedgerAccount, CompanySettings } from '../../types';
import CustomDatePicker from "../ui/CustomDatePicker";
import persian from "react-date-object/calendars/persian";
import persian_fa from "react-date-object/locales/persian_fa";
const DatePicker = CustomDatePicker;

export default function AccountingDocsList({ onNavigateToCreate, onNavigateToView, onNavigateToEdit, showNotification }: any) {
  const [docs, setDocs] = useState<AccountingDocument[]>([]);
  const [accounts, setAccounts] = useState<LedgerAccount[]>([]);
  const [storeSettings, setStoreSettings] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [filterSourceType, setFilterSourceType] = useState('');
  const [filterAccountId, setFilterAccountId] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    const [fetchedDocs, fetchedAccs, fetchedSettings] = await Promise.all([
      getAccountingDocuments(),
      getLedgerAccounts(),
      getStoreSettings()
    ]);
        setDocs(fetchedDocs.sort((a, b) => {
      const tA = new Date(convertToGregorian(a.date)).getTime();
      const tB = new Date(convertToGregorian(b.date)).getTime();
      const diff = (isNaN(tB) ? 0 : tB) - (isNaN(tA) ? 0 : tA);
      if (diff === 0) return (b.createdAt || 0) - (a.createdAt || 0);
      return diff;
    }));
    setAccounts(fetchedAccs);
    setStoreSettings(fetchedSettings);
    setIsLoading(false);
  };

  const handleDelete = async (id: string | number) => {
    if (window.confirm('آیا از حذف این سند حسابداری اطمینان دارید؟')) {
      try {
        await deleteAccountingDocument(id);
        if (showNotification) showNotification('سند با موفقیت حذف شد.', 'success');
        loadData();
      } catch (err: any) {
        if (showNotification) showNotification(err.message || 'خطا در حذف سند.', 'error');
      }
    }
  };

  const filteredDocs = (docs || []).filter(d => {
    const matchSearch = d.documentNumber?.toString().includes(searchTerm) || d.description?.includes(searchTerm);
    const docDate = new Date(d.date);
    const matchFromDate = fromDate ? docDate >= new Date(fromDate) : true;
    
    let matchToDate = true;
    if (toDate) {
      const toDateObj = new Date(toDate);
      toDateObj.setHours(23, 59, 59, 999);
      matchToDate = docDate <= toDateObj;
    }
    
    const matchSourceType = filterSourceType ? d.sourceType === filterSourceType : true;
    const matchAccount = filterAccountId ? d.items.some(item => item.ledgerAccountId?.toString() === filterAccountId.toString() || item.detailedAccountId?.toString() === filterAccountId.toString()) : true;
    
    return matchSearch && matchFromDate && matchToDate && matchSourceType && matchAccount;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-100 p-2 rounded-xl text-indigo-600">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-800">اسناد حسابداری</h2>
            <p className="text-sm text-slate-500 mt-1">مدیریت لیست اسناد مالی و روزنامه</p>
          </div>
        </div>

        <button onClick={onNavigateToCreate} className="bg-indigo-600 text-white px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-indigo-700 transition w-full sm:w-auto justify-center shadow-lg shadow-indigo-200">
          <Plus className="w-5 h-5" /> صدور سند دستی
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-col gap-4 shadow-sm">
        <div className="relative w-full">
          <Search className="w-5 h-5 text-slate-400 absolute right-3 top-2.5" />
          <input
            type="text"
            placeholder="جستجو در اسناد (شماره سند، توضیحات)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pr-10 pl-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">از تاریخ</label>
            <DatePicker
              value={fromDate}
              onChange={(date: any) => setFromDate(date ? (convertToGregorian(date)) : '')}
              calendar={storeSettings?.calendarType === "gregorian" ? undefined : persian}
              locale={storeSettings?.calendarType === "gregorian" ? undefined : persian_fa}
              calendarPosition="bottom-right"
              inputClass="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-sans"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">تا تاریخ</label>
            <DatePicker
              value={toDate}
              onChange={(date: any) => setToDate(date ? (convertToGregorian(date)) : '')}
              calendar={storeSettings?.calendarType === "gregorian" ? undefined : persian}
              locale={storeSettings?.calendarType === "gregorian" ? undefined : persian_fa}
              calendarPosition="bottom-right"
              inputClass="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-sans"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">نوع سند</label>
            <select
              value={filterSourceType}
              onChange={(e) => setFilterSourceType(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm"
            >
              <option value="">همه اسناد</option>
              <option value="opening_balance">افتتاحیه</option>
              <option value="invoice_sale">فروش</option>
              <option value="invoice_purchase">خرید</option>
              <option value="receipt">دریافت</option>
              <option value="payment">پرداخت</option>
              <option value="issued_check">چک پرداختی</option>
              <option value="received_check">چک دریافتی</option>
              <option value="loan">وام</option>
              <option value="installment">قسط</option>
              <option value="manual">دستی</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">حساب معین/تفصیلی</label>
            <select
              value={filterAccountId}
              onChange={(e) => setFilterAccountId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm"
            >
              <option value="">همه حساب‌ها</option>
              {(accounts || []).filter(a => ['general', 'subsidiary', 'detailed'].includes(a.type)).map(a => (
                <option key={a.id} value={a.id}>{a.code} - {a.title}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="p-4 font-bold text-slate-600 text-sm">شماره سند</th>
                <th className="p-4 font-bold text-slate-600 text-sm">تاریخ</th>
                <th className="p-4 font-bold text-slate-600 text-sm">توضیحات (شرح سند)</th>
                <th className="p-4 font-bold text-slate-600 text-sm text-center">آرتیکل‌ها</th>
                <th className="p-4 font-bold text-slate-600 text-sm text-center">وضعیت</th>
                <th className="p-4 font-bold text-slate-600 text-sm">مجموع مبالغ</th>
                <th className="p-4 font-bold text-slate-600 text-sm text-center">عملیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                 <tr>
                   <td colSpan={7} className="p-6 text-center text-slate-500">
                     <div className="flex justify-center p-4"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div></div>
                   </td>
                 </tr>
              ) : filteredDocs.length === 0 ? (
                <tr>
                   <td colSpan={7} className="p-8 text-center text-slate-400">
                     <FileText className="w-12 h-12 mx-auto mb-3 opacity-20" />
                     <p className="font-bold">هیچ سندی یافت نشد</p>
                   </td>
                 </tr>
              ) : (
                filteredDocs.map((doc, idx) => {
                  const total = doc.items.reduce((sum, item) => sum + Number(item.debit || 0), 0);
                  
                  return (
                  <tr key={`${doc.id}-${idx}`} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4 text-sm font-black text-slate-800 font-mono">{doc.documentNumber}</td>
                    <td className="p-4 text-sm font-bold text-slate-600">
                      <div className="flex items-center gap-1.5">
                        <span>{formatDateDisplay(doc.date, storeSettings?.calendarType)}</span>
                        {doc.createdAt && (
                          <span className="text-[10px] text-slate-400 font-medium bg-slate-100 px-1.5 py-0.5 rounded" dir="ltr">
                            {toPersianDigits(new Date(doc.createdAt).toLocaleTimeString(storeSettings?.calendarType === 'gregorian' ? 'en-US' : 'fa-IR', { hour: '2-digit', minute: '2-digit', hour12: false }))}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-4 text-sm text-slate-700 truncate max-w-xs">
  {(() => {
    try {
      if (typeof doc.description === 'string') {
        const p = JSON.parse(doc.description);
        if (p.isPayslip) {
          const pMonthName = ["فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور", "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند"];
          const mName = p.periodMonth ? pMonthName[parseInt(p.periodMonth, 10) - 1] : "";
          return `سند حقوق ${mName} ماه ${p.periodYear}`;
        }
      }
    } catch(e) {}
    return doc.description;
  })()}
</td>
                    <td className="p-4 text-sm font-bold text-slate-600 text-center">{doc.items?.length || 0} خط
                      <span className="block text-[10px] text-slate-400 mt-1">{doc.currency || storeSettings?.currency || 'تومان'}</span>
                    </td>
                    <td className="p-4 text-sm font-bold text-center">
                       {doc.status === 'approved' ? (
                          <span className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded-md text-xs">تایید شده</span>
                       ) : (
                          <span className="bg-amber-100 text-amber-700 px-2 py-1 rounded-md text-xs">موقت (پیش‌نویس)</span>
                       )}
                    </td>
                    <td className="p-4 text-sm font-black text-indigo-700 font-mono text-left whitespace-nowrap" dir="ltr">
                      <span className="text-xs font-sans text-indigo-500 font-bold ml-1">{storeSettings?.currency || 'تومان'}</span>
                      {total.toLocaleString()}
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => onNavigateToView?.(doc)}
                          className="p-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-lg transition-colors cursor-pointer"
                          title="مشاهده و چاپ"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onNavigateToEdit?.(doc)}
                          className="p-2 bg-amber-50 hover:bg-amber-100 text-amber-600 rounded-lg transition-colors cursor-pointer"
                          title="ویرایش سند"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(doc.id)}
                          className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg transition-colors cursor-pointer"
                          title="حذف سند"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )})
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
