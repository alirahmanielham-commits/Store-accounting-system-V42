import React, { useState, useEffect } from 'react';
import { Book, Search, FileText, ArrowLeftRight, CheckCircle, Calculator } from 'lucide-react';
import { getAccountingDocuments, getLedgerAccounts, getPersons, getStoreSettings } from '../../services/dataService';
import { AccountingDocument, LedgerAccount, Person } from '../../types';
import { formatNumber, formatDateDisplay } from '../../utils/format';
import CustomDatePicker from "../ui/CustomDatePicker";

export default function AccountLedgerReport({ showNotification, onNavigateToDoc }: any) {
  const [ledgerAccounts, setLedgerAccounts] = useState<LedgerAccount[]>([]);
  const [persons, setPersons] = useState<Person[]>([]);
  const [storeSettings, setStoreSettings] = useState<any>(null);
  
  const [selectedLedgerId, setSelectedLedgerId] = useState<string>('');
  const [selectedPersonId, setSelectedPersonId] = useState<string>('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  
  const [transactions, setTransactions] = useState<any[]>([]);
  const [openingBalance, setOpeningBalance] = useState<{ amount: number, type: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    const [accs, pers, settings] = await Promise.all([
      getLedgerAccounts(),
      getPersons(),
      getStoreSettings()
    ]);
    setLedgerAccounts(accs);
    setPersons(pers);
    setStoreSettings(settings);
    setIsLoading(false);
  };

  const handleSearch = async () => {
    if (!selectedLedgerId) {
      showNotification('لطفاً حساب کل/معین را انتخاب کنید', 'error');
      return;
    }
    
    setIsLoading(true);
    setHasSearched(true);
    
    const selectedLedger = ledgerAccounts.find(a => a.id.toString() === selectedLedgerId);
    const isCreditNature = selectedLedger?.nature === 'credit';
    
    const docs = await getAccountingDocuments();
    
    // Sort chronologically
    docs.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    let prevBalance = 0;
    let items: any[] = [];
    
    const fromTime = fromDate ? new Date(fromDate).getTime() : 0;
    const toTime = toDate ? new Date(toDate).getTime() : Infinity;
    
    docs.forEach(doc => {
      // Only include approved documents in the ledger report
      if (doc.status !== 'approved') return;
      
      const docDate = new Date(doc.date).getTime();
      const isBefore = docDate < fromTime;
      const isWithin = docDate >= fromTime && docDate <= toTime;
      
      (doc.items || []).forEach(item => {
        if (item.ledgerAccountId.toString() === selectedLedgerId) {
           if (selectedPersonId && item.detailedAccountId?.toString() !== selectedPersonId) {
              return;
           }
           
           const debit = Number(item.debit) || 0;
           const credit = Number(item.credit) || 0;
           
           if (isBefore) {
              if (isCreditNature) {
                 prevBalance += credit - debit;
              } else {
                 prevBalance += debit - credit;
              }
           } else if (isWithin) {
              items.push({
                 docId: doc.id,
                 docNumber: doc.docNumber || '-',
                 date: doc.date,
                 description: item.description,
                 detailedAccountId: item.detailedAccountId,
                 debit: debit,
                 credit: credit
              });
           }
        }
      });
    });
    
    let runningBalance = prevBalance;
    
    const rows = items.map(item => {
       if (isCreditNature) {
          runningBalance += item.credit - item.debit;
       } else {
          runningBalance += item.debit - item.credit;
       }
       
       let balType = '-';
       if (runningBalance > 0) balType = isCreditNature ? 'بستانکار' : 'بدهکار';
       else if (runningBalance < 0) balType = isCreditNature ? 'بدهکار' : 'بستانکار';
       
       return {
          ...item,
          balance: Math.abs(runningBalance),
          balanceType: balType
       };
    });
    
    let opBalType = '-';
    if (prevBalance > 0) opBalType = isCreditNature ? 'بستانکار' : 'بدهکار';
    else if (prevBalance < 0) opBalType = isCreditNature ? 'بدهکار' : 'بستانکار';
    
    setOpeningBalance({
       amount: Math.abs(prevBalance),
       type: opBalType
    });
    
    setTransactions(rows);
    setIsLoading(false);
  };

  const getPersonName = (id: string | number | undefined) => {
    if (!id) return '-';
    const p = persons.find(x => x.id.toString() === id.toString());
    return p ? p.name : '-';
  };

  const totalDebit = transactions.reduce((sum, t) => sum + (Number(t.debit) || 0), 0);
  const totalCredit = transactions.reduce((sum, t) => sum + (Number(t.credit) || 0), 0);
  const currency = storeSettings?.currency || 'تومان';

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 flex flex-col h-[calc(100vh-140px)] overflow-hidden" dir="rtl">
      <div className="p-6 border-b border-slate-100 flex flex-col gap-4 bg-slate-50/50">
        <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <Book className="w-6 h-6 text-indigo-600" /> دفتر حساب‌ها (دفتر کل/معین/تفصیلی)
        </h1>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-2">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">حساب کل/معین <span className="text-rose-500">*</span></label>
            <select 
               value={selectedLedgerId} 
               onChange={e => setSelectedLedgerId(e.target.value)}
               className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500"
            >
               <option value="">انتخاب حساب...</option>
               {ledgerAccounts.map(a => (
                 <option key={a.id} value={a.id}>{a.code} - {a.title} ({a.nature === 'debit' ? 'بدهکار' : 'بستانکار'})</option>
               ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">حساب تفصیلی (شخص/اختیاری)</label>
            <select 
               value={selectedPersonId} 
               onChange={e => setSelectedPersonId(e.target.value)}
               className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500"
            >
               <option value="">همه اشخاص</option>
               {persons.filter(p => p.isActive !== false).map(p => (
                 <option key={p.id} value={p.id}>{p.name}</option>
               ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">از تاریخ</label>
            <CustomDatePicker
              value={fromDate}
              onChange={setFromDate}
              placeholder="شروع دوره"
              inputClass="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 text-left"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">تا تاریخ</label>
            <div className="flex gap-2">
                <div className="flex-1">
                    <CustomDatePicker
                      value={toDate}
                      onChange={setToDate}
                      placeholder="پایان دوره"
                      inputClass="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 text-left"
                    />
                </div>
                <button 
                  onClick={handleSearch}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 rounded-xl flex items-center justify-center transition-colors"
                >
                  <Search className="w-5 h-5" />
                </button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto bg-slate-50 p-6">
        {!hasSearched ? (
           <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-3">
              <Calculator className="w-16 h-16 opacity-20" />
              <p>برای مشاهده دفتر حساب، فیلترها را تنظیم کرده و جستجو کنید</p>
           </div>
        ) : (
           <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
             <div className="overflow-x-auto">
               <table className="w-full text-right text-sm">
                 <thead>
                   <tr className="bg-slate-100 text-slate-600 border-b border-slate-200">
                     <th className="p-3 font-semibold w-16 text-center">ردیف</th>
                     <th className="p-3 font-semibold w-24">تاریخ</th>
                     <th className="p-3 font-semibold w-24 text-center">شماره سند</th>
                     <th className="p-3 font-semibold w-40">تفضیل (شخص)</th>
                     <th className="p-3 font-semibold min-w-[200px]">شرح</th>
                     <th className="p-3 font-semibold w-32 text-left">بدهکار ({currency})</th>
                     <th className="p-3 font-semibold w-32 text-left">بستانکار ({currency})</th>
                     <th className="p-3 font-semibold w-32 text-left">تراز ({currency})</th>
                     <th className="p-3 font-semibold w-24 text-center">تشخیص</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100">
                   {/* Opening Balance Row */}
                   {openingBalance && (
                     <tr className="bg-orange-50/50 font-medium text-slate-700">
                       <td colSpan={7} className="p-3 text-left">
                         مانده از قبل (تراز افتتاحیه)
                       </td>
                       <td className="p-3 text-left font-mono" dir="ltr">{formatNumber(openingBalance.amount)}</td>
                       <td className="p-3 text-center">
                         <span className={`px-2 py-0.5 rounded-full text-xs ${
                           openingBalance.type === 'بدهکار' ? 'bg-rose-100 text-rose-700' : 
                           openingBalance.type === 'بستانکار' ? 'bg-emerald-100 text-emerald-700' : 
                           'bg-slate-100 text-slate-600'
                         }`}>
                           {openingBalance.type}
                         </span>
                       </td>
                     </tr>
                   )}
                   
                   {transactions.map((t, i) => (
                     <tr key={i} className="hover:bg-slate-50 transition-colors text-slate-700 group">
                       <td className="p-3 text-center text-slate-400">{i + 1}</td>
                       <td className="p-3">{formatDateDisplay(t.date)}</td>
                       <td className="p-3 text-center">
                         <button 
                           onClick={() => onNavigateToDoc && onNavigateToDoc(t.docId)}
                           className="text-indigo-600 hover:text-indigo-800 hover:underline font-mono"
                         >
                           {t.docNumber}
                         </button>
                       </td>
                       <td className="p-3 truncate max-w-[150px]" title={getPersonName(t.detailedAccountId)}>
                         {getPersonName(t.detailedAccountId)}
                       </td>
                       <td className="p-3 text-slate-900 leading-relaxed whitespace-pre-wrap">{t.description}</td>
                       <td className="p-3 text-left font-mono text-rose-600" dir="ltr">{t.debit > 0 ? formatNumber(t.debit) : '-'}</td>
                       <td className="p-3 text-left font-mono text-emerald-600" dir="ltr">{t.credit > 0 ? formatNumber(t.credit) : '-'}</td>
                       <td className="p-3 text-left font-mono font-semibold" dir="ltr">{formatNumber(t.balance)}</td>
                       <td className="p-3 text-center">
                         <span className={`px-2 py-0.5 rounded-full text-xs ${
                           t.balanceType === 'بدهکار' ? 'bg-rose-100 text-rose-700' : 
                           t.balanceType === 'بستانکار' ? 'bg-emerald-100 text-emerald-700' : 
                           'bg-slate-100 text-slate-600'
                         }`}>
                           {t.balanceType}
                         </span>
                       </td>
                     </tr>
                   ))}
                   
                   {transactions.length === 0 && hasSearched && (
                     <tr>
                       <td colSpan={9} className="p-8 text-center text-slate-400">
                         هیچ تراکنشی در این بازه زمانی یافت نشد.
                       </td>
                     </tr>
                   )}
                 </tbody>
                 <tfoot className="bg-slate-100 border-t-2 border-slate-200 text-slate-800 font-bold">
                   <tr>
                     <td colSpan={5} className="p-4 text-left">جمع گردش در این دوره:</td>
                     <td className="p-4 text-left font-mono text-rose-700" dir="ltr">{formatNumber(totalDebit)}</td>
                     <td className="p-4 text-left font-mono text-emerald-700" dir="ltr">{formatNumber(totalCredit)}</td>
                     <td colSpan={2}></td>
                   </tr>
                 </tfoot>
               </table>
             </div>
           </div>
        )}
      </div>
    </div>
  );
}
