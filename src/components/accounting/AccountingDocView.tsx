import { formatDateDisplay, toPersianDigits } from '../../utils/format';
import React, { useRef, useState, useEffect, useMemo } from 'react';
import { motion } from 'motion/react';
import { useReactToPrint } from 'react-to-print';
import { Printer, ArrowRight, CheckCircle, FileText, RotateCcw, AlertTriangle } from 'lucide-react';
import { AccountingDocument, LedgerAccount } from '../../types';
import { getLedgerAccounts, getPersons } from '../../services/dataService';
import ReverseAccountingDocModal from './ReverseAccountingDocModal';

interface Props {
  doc: AccountingDocument;
  storeSettings?: any;
  onBack: () => void;
  showNotification?: (msg: string, type: 'success' | 'error' | 'info' | 'warning') => void;
}

export default function AccountingDocView({ doc, storeSettings, onBack, showNotification }: Props) {
  const printRef = useRef<HTMLDivElement>(null);
  const [currentDoc, setCurrentDoc] = useState<any>(doc);
  const [accounts, setAccounts] = useState<LedgerAccount[]>([]);
  const [persons, setPersons] = useState<any[]>([]);
  const [isReversalOpen, setIsReversalOpen] = useState(false);

  useEffect(() => {
    setCurrentDoc(doc);
  }, [doc]);
  
  useEffect(() => {
    const loadData = async () => {
      const [loadedAccs, loadedPersons] = await Promise.all([getLedgerAccounts(), getPersons()]);
      setAccounts(loadedAccs);
      setPersons(loadedPersons);
    };
    loadData();
  }, []);

  const accountMap = useMemo(() => {
    const map = new Map<string, LedgerAccount>();
    accounts.forEach(a => map.set(String(a.id), a));
    return map;
  }, [accounts]);

  const personMap = useMemo(() => {
    const map = new Map<string, any>();
    persons.forEach(p => map.set(String(p.id), p));
    return map;
  }, [persons]);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Accounting_Doc_${currentDoc.documentNumber}`,
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

  const totalDebit = (currentDoc.items || []).reduce((sum: number, item: any) => sum + Number(item.debit || 0), 0);
  const totalCredit = (currentDoc.items || []).reduce((sum: number, item: any) => sum + Number(item.credit || 0), 0);
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.001;

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
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black text-slate-800">مشاهده سند حسابداری</h2>
              {(currentDoc as any).isReversed && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 border border-purple-200 font-bold">
                  معکوس شده بابت سند شماره {(currentDoc as any).reversalDocNumber || ''}
                </span>
              )}
            </div>
            <p className="text-xs font-bold text-slate-500 mt-0.5">شماره: {currentDoc.documentNumber}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!(currentDoc as any).isReversed ? (
            <button
              type="button"
              onClick={() => setIsReversalOpen(true)}
              className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl flex items-center gap-1.5 transition-all font-bold text-xs shadow-2xs cursor-pointer"
              title="صدور سند معکوس / اصلاحی جهت ابطال استاندارد اثرات این سند"
            >
              <RotateCcw className="w-4 h-4 text-emerald-600" />
              <span>صدور سند معکوس / اصلاحی</span>
            </button>
          ) : (
            <span className="px-3 py-1.5 bg-purple-50 text-purple-700 border border-purple-200 rounded-xl text-xs font-bold flex items-center gap-1.5">
              <RotateCcw className="w-3.5 h-3.5" />
              <span>معکوس شده</span>
            </span>
          )}

          <button
            onClick={handlePrint}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl flex items-center gap-2 transition-all font-bold text-xs sm:text-sm shadow-sm cursor-pointer border-none"
          >
            <Printer className="w-4 h-4" />
            <span>چاپ سند</span>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-8" ref={printRef} dir="rtl">
        <div className="max-w-4xl mx-auto bg-white p-8">
          {/* Header */}
          <div className="text-center mb-8 border-b-2 border-slate-800 pb-6">
            <h1 className="text-2xl font-black text-slate-900">{storeSettings?.storeName || 'شرکت/فروشگاه من'}</h1>
            <h2 className="text-xl font-bold text-slate-700 mt-2">سند حسابداری</h2>
          </div>

          {(currentDoc as any).isReversed && (
            <div className="bg-purple-50 border border-purple-200 text-purple-900 rounded-xl p-3.5 mb-6 flex items-start gap-2.5 text-xs font-bold">
              <RotateCcw className="w-5 h-5 text-purple-600 shrink-0 mt-0.5" />
              <div className="leading-relaxed">
                <div className="font-black text-sm text-purple-950">توجه: این سند حسابداری معکوس (ابطال) شده است</div>
                <p className="mt-0.5 text-purple-800 font-medium">
                  اثرات مالی و گردش‌های این سند توسط سند معکوس شماره {toPersianDigits((currentDoc as any).reversalDocNumber || '')} خنثی و بی‌اثر گردیده است.
                  {(currentDoc as any).reversalReason && ` (علت معکوس‌سازی: ${(currentDoc as any).reversalReason})`}
                </p>
              </div>
            </div>
          )}

          <div className="flex justify-between items-start mb-8 text-sm font-bold text-slate-800 border bg-slate-50 p-4 rounded-xl">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-slate-500">شماره سند:</span>
                <span className="font-mono text-lg">{currentDoc.documentNumber}</span>
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

      {/* Reverse Accounting Document Modal */}
      <ReverseAccountingDocModal
        isOpen={isReversalOpen}
        onClose={() => setIsReversalOpen(false)}
        doc={currentDoc}
        accountMap={accountMap}
        personMap={personMap}
        currency={currentDoc.currency || storeSettings?.currency || 'تومان'}
        showNotification={showNotification}
        onSuccess={(newDoc) => {
          setCurrentDoc((prev: any) => ({
            ...prev,
            isReversed: true,
            reversalDocId: newDoc.id,
            reversalDocNumber: newDoc.documentNumber
          }));
        }}
      />
    </div>
  );
}
