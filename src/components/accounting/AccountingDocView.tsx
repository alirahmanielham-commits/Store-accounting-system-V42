import { formatDateDisplay, toPersianDigits } from '../../utils/format';
import React, { useRef, useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { useReactToPrint } from 'react-to-print';
import { Printer, ArrowRight, CheckCircle, FileText } from 'lucide-react';
import { AccountingDocument, LedgerAccount } from '../../types';
import { getLedgerAccounts, getPersons } from '../../services/dataService';

interface Props {
  doc: AccountingDocument;
  storeSettings?: any;
  onBack: () => void;
}

export default function AccountingDocView({ doc, storeSettings, onBack }: Props) {
  const printRef = useRef<HTMLDivElement>(null);
  const [accounts, setAccounts] = useState<LedgerAccount[]>([]);
  const [persons, setPersons] = useState<any[]>([]);
  
  useEffect(() => {
    const loadData = async () => {
      const [loadedAccs, loadedPersons] = await Promise.all([getLedgerAccounts(), getPersons()]);
      setAccounts(loadedAccs);
      setPersons(loadedPersons);
    };
    loadData();
  }, []);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Accounting_Doc_${doc.documentNumber}`,
  });

  const getAccountTitle = (id: string | number) => {
    const acc = accounts.find((a) => a.id.toString() === id.toString());
    if (!acc) return 'نامشخص';
    return `${acc.code} - ${acc.title}`;
  };

  const getPersonName = (id: string | number) => {
    const person = persons.find(p => p.id?.toString() === id?.toString());
    return person ? person.name : id;
  };

  const totalDebit = doc.items.reduce((sum, item) => sum + Number(item.debit || 0), 0);
  const totalCredit = doc.items.reduce((sum, item) => sum + Number(item.credit || 0), 0);
  const isBalanced = totalDebit === totalCredit;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-[calc(100vh-12rem)] min-h-[600px]">
      <div className="bg-slate-50 border-b border-slate-200 p-4 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
          >
            <ArrowRight className="w-5 h-5 text-slate-600" />
          </button>
          <div>
            <h2 className="text-lg font-black text-slate-800">مشاهده سند حسابداری</h2>
            <p className="text-xs font-bold text-slate-500 mt-1">شماره: {doc.documentNumber}</p>
          </div>
        </div>
        <button
          onClick={handlePrint}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl flex items-center gap-2 transition-all font-bold text-sm shadow-sm cursor-pointer border-none"
        >
          <Printer className="w-4 h-4" />
          چاپ سند
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-8" ref={printRef} dir="rtl">
        <div className="max-w-4xl mx-auto bg-white p-8">
          {/* Header */}
          <div className="text-center mb-8 border-b-2 border-slate-800 pb-6">
            <h1 className="text-2xl font-black text-slate-900">{storeSettings?.storeName || 'شرکت/فروشگاه من'}</h1>
            <h2 className="text-xl font-bold text-slate-700 mt-2">سند حسابداری</h2>
          </div>

          <div className="flex justify-between items-start mb-8 text-sm font-bold text-slate-800 border bg-slate-50 p-4 rounded-xl">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-slate-500">شماره سند:</span>
                <span className="font-mono text-lg">{doc.documentNumber}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-slate-500">وضعیت سند:</span>
                <span>
                   {doc.status === 'approved' ? (
                      <span className="text-emerald-700 flex items-center gap-1"><CheckCircle className="w-4 h-4"/> تایید شده (دائم)</span>
                   ) : (
                      <span className="text-amber-700 flex items-center gap-1">موقت (پیش‌نویس)</span>
                   )}
                </span>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-slate-500">تاریخ ثبت:</span>
                <span>{formatDateDisplay(doc.date, storeSettings?.calendarType)}</span>
                {doc.createdAt && (
                  <span className="text-[10px] text-slate-500 font-medium bg-slate-100 px-2 py-0.5 rounded-md ml-2" dir="ltr">
                    {toPersianDigits(new Date(doc.createdAt).toLocaleTimeString(storeSettings?.calendarType === 'gregorian' ? 'en-US' : 'fa-IR', { hour: '2-digit', minute: '2-digit', hour12: false }))}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-slate-500">ارز:</span>
                <span className="font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">{doc.currency || storeSettings?.currency || 'تومان'}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-slate-500">شرح کلی:</span>
                <span className="max-w-[200px] truncate" title={doc.description}>{(() => {
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
    return doc.description || '-';
  })()}</span>
              </div>
            </div>
          </div>

          <table className="w-full border-collapse border border-slate-300 mb-8 mt-4 text-sm font-bold">
            <thead className="bg-slate-100 print:bg-slate-100">
              <tr>
                <th className="border border-slate-300 p-3 text-center w-12">ردیف</th>
                <th className="border border-slate-300 p-3 text-right">کد و نام حساب (کل/معین)</th>
                <th className="border border-slate-300 p-3 text-right">شرح آرتیکل</th>
                <th className="border border-slate-300 p-3 text-center w-36">بدهکار</th>
                <th className="border border-slate-300 p-3 text-center w-36">بستانکار</th>
              </tr>
            </thead>
            <tbody>
              {doc.items.map((item, index) => (
                <tr key={item.id ? `id-${item.id}` : `idx-${index}`} className="hover:bg-slate-50">
                  <td className="border border-slate-300 p-3 text-center text-slate-500">{index + 1}</td>
                  <td className="border border-slate-300 p-3">
                    <div className="flex flex-col gap-1">
                       <span className="text-slate-800">{getAccountTitle(item.ledgerAccountId)}</span>
                       {item.detailedAccountId && <span className="text-slate-500 text-xs text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md self-start">شخص: {getPersonName(item.detailedAccountId)}</span>}
                    </div>
                  </td>
                  <td className="border border-slate-300 p-3 text-slate-700">{item.description}</td>
                  <td className="border border-slate-300 p-3 text-center font-mono" dir="ltr">
                    {Number(item.debit) > 0 ? Number(item.debit).toLocaleString() : '-'}
                  </td>
                  <td className="border border-slate-300 p-3 text-center font-mono" dir="ltr">
                    {Number(item.credit) > 0 ? Number(item.credit).toLocaleString() : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-slate-50 font-black">
              <tr>
                <td colSpan={3} className="border border-slate-300 p-4 text-left">جمع کل:</td>
                <td className="border border-slate-300 p-4 text-center text-emerald-700 font-mono" dir="ltr">{totalDebit.toLocaleString()} {doc.currency || storeSettings?.currency || "تومان"}</td>
                <td className="border border-slate-300 p-4 text-center text-amber-700 font-mono" dir="ltr">{totalCredit.toLocaleString()} {doc.currency || storeSettings?.currency || "تومان"}</td>
              </tr>
            </tfoot>
          </table>

          <div className="flex justify-between items-center bg-slate-50 p-4 rounded-xl border border-slate-200 mt-4 font-bold text-sm">
             <div className="flex items-center gap-2">
                 <span className="text-slate-500">صحت سنجی تراز سند:</span>
                 {isBalanced ? (
                     <span className="text-emerald-600 bg-emerald-100 border border-emerald-200 px-3 py-1 rounded-full flex items-center gap-1"><CheckCircle className="w-4 h-4"/> تراز می‌باشد</span>
                 ) : (
                     <span className="text-rose-600 bg-rose-100 border border-rose-200 px-3 py-1 rounded-full">سند نامتراز است ({Math.abs(totalDebit - totalCredit).toLocaleString()})</span>
                 )}
             </div>
             
             <div className="flex items-center gap-8 justify-end text-slate-500 mt-12 mb-4">
                 <div className="text-center w-32 border-t-2 border-slate-300 pt-2 border-dashed">تنظیم کننده</div>
                 <div className="text-center w-32 border-t-2 border-slate-300 pt-2 border-dashed">تایید کننده</div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
