import { formatDateDisplay, convertToGregorian } from '../../utils/format';
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Scale, AlertTriangle, CheckCircle, FileText, Search, Filter, ArrowLeftRight, CheckSquare } from 'lucide-react';
import { getAccountingDocuments, getLedgerAccounts, getStoreSettings } from '../../services/dataService';
import { AccountingDocument, LedgerAccount, CompanySettings } from '../../types';

export default function AccountingVerification({ showNotification }: any) {
  const [docs, setDocs] = useState<AccountingDocument[]>([]);
  const [accounts, setAccounts] = useState<LedgerAccount[]>([]);
  const [storeSettings, setStoreSettings] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'audit' | 'trial_balance'>('audit');
  const [searchTerm, setSearchTerm] = useState('');

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

  // --- Auditing Calculations ---
  const auditedDocs = (docs || []).map(doc => {
    const totalDebit = (doc.items).reduce((sum, item) => sum + (Number(item.debit) || 0), 0);
    const totalCredit = (doc.items).reduce((sum, item) => sum + (Number(item.credit) || 0), 0);
    const isBalanced = totalDebit === totalCredit;
    const hasMissingLedger = (doc.items).some(item => !item.ledgerAccountId);
    const hasZeroItem = (doc.items).some(item => (Number(item.debit) === 0 && Number(item.credit) === 0));

    let status: 'ok' | 'unbalanced' | 'error' = 'ok';
    let errorMessage = '';

    if (!isBalanced) {
      status = 'unbalanced';
      errorMessage = 'مجموع بدهکار و بستانکار تراز نیست';
    } else if (hasMissingLedger) {
      status = 'error';
      errorMessage = 'کد حساب برای برخی آرتیکل‌ها مشخص نشده است';
    } else if (hasZeroItem) {
      status = 'error';
      errorMessage = 'آرتیکل با مبلغ صفر وجود دارد';
    } else if (!(doc.items) || doc.items.length < 2) {
      status = 'error';
      errorMessage = 'سند باید حداقل دارای دو آرتیکل باشد';
    }

    return {
      ...doc,
      totalDebit,
      totalCredit,
      isBalanced,
      auditStatus: status,
      errorMessage,
      diff: Math.abs(totalDebit - totalCredit)
    };
  });

  const unbalancedCount = auditedDocs.filter(d => d.auditStatus === 'unbalanced').length;
  const errorCount = auditedDocs.filter(d => d.auditStatus === 'error').length;
  const balancedCount = auditedDocs.filter(d => d.auditStatus === 'ok').length;

  const totalSystemDebit = auditedDocs.reduce((sum, doc) => sum + doc.totalDebit, 0);
  const totalSystemCredit = auditedDocs.reduce((sum, doc) => sum + doc.totalCredit, 0);

  // --- Trial Balance Calculations ---
  const rawBalances: Record<string, { sumDebit: number, sumCredit: number }> = {};
  accounts.forEach(a => rawBalances[a.id] = { sumDebit: 0, sumCredit: 0 });

  docs.forEach(doc => {
    if (doc.status !== 'approved') return;
    doc.items.forEach(item => {
      let currentAccId = item.ledgerAccountId;
      while (currentAccId) {
         if (rawBalances[currentAccId]) {
            rawBalances[currentAccId].sumDebit += (Number(item.debit) || 0);
            rawBalances[currentAccId].sumCredit += (Number(item.credit) || 0);
         }
         const acc = accounts.find(a => a.id?.toString() === currentAccId?.toString());
         currentAccId = acc?.parentId;
      }
    });
  });

  const trialBalance = (accounts || []).map(acc => {
    const b = rawBalances[acc.id] || { sumDebit: 0, sumCredit: 0 };
    let remainDebit = 0;
    let remainCredit = 0;

    if (b.sumDebit > b.sumCredit) {
      remainDebit = b.sumDebit - b.sumCredit;
    } else if (b.sumCredit > b.sumDebit) {
      remainCredit = b.sumCredit - b.sumDebit;
    }

    return {
      ...acc,
      sumDebit: b.sumDebit,
      sumCredit: b.sumCredit,
      remainDebit,
      remainCredit
    };
  }).filter(acc => acc.sumDebit > 0 || acc.sumCredit > 0); // Only show accounts with activity

  const tbTotalDebit = trialBalance.filter(a => !a.parentId).reduce((s, a) => s + a.sumDebit, 0);
  const tbTotalCredit = trialBalance.filter(a => !a.parentId).reduce((s, a) => s + a.sumCredit, 0);
  const tbTotalRemainDebit = trialBalance.filter(a => !a.parentId).reduce((s, a) => s + a.remainDebit, 0);
  const tbTotalRemainCredit = trialBalance.filter(a => !a.parentId).reduce((s, a) => s + a.remainCredit, 0);

  const filteredDocs = auditedDocs.filter(d => 
    d.documentNumber?.toString().includes(searchTerm) ||
    d.description?.includes(searchTerm)
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-100 p-2.5 rounded-2xl text-indigo-700 shadow-sm">
            <Scale className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">رصد و تراز حسابداری</h2>
            <p className="text-sm text-slate-500 mt-1 font-bold">بررسی وضعیت تراز بودن اسناد و تراز آزمایشی حساب‌ها</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="flex justify-between items-start mb-2">
            <span className="text-sm font-bold text-slate-500">مجموع اسناد ثبتی</span>
            <div className="bg-slate-100 p-1.5 rounded-lg text-slate-600"><FileText className="w-4 h-4" /></div>
          </div>
          <div className="text-3xl font-black text-slate-800 font-mono">{auditedDocs.length}</div>
        </div>
        
        <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-5 shadow-sm">
          <div className="flex justify-between items-start mb-2">
            <span className="text-sm font-bold text-emerald-700">اسناد تراز و صحیح</span>
            <div className="bg-emerald-200/50 p-1.5 rounded-lg text-emerald-700"><CheckCircle className="w-4 h-4" /></div>
          </div>
          <div className="text-3xl font-black text-emerald-800 font-mono">{balancedCount}</div>
        </div>

        <div className="bg-rose-50 border border-rose-100 rounded-2xl p-5 shadow-sm">
          <div className="flex justify-between items-start mb-2">
            <span className="text-sm font-bold text-rose-700">اسناد دارای اختلاف تراز</span>
            <div className="bg-rose-200/50 p-1.5 rounded-lg text-rose-700"><AlertTriangle className="w-4 h-4" /></div>
          </div>
          <div className="text-3xl font-black text-rose-800 font-mono">{unbalancedCount}</div>
        </div>

        <div className="bg-amber-50 border border-amber-100 rounded-2xl p-5 shadow-sm">
          <div className="flex justify-between items-start mb-2">
            <span className="text-sm font-bold text-amber-700">اسناد دارای خطا (ناقص)</span>
            <div className="bg-amber-200/50 p-1.5 rounded-lg text-amber-700"><CheckSquare className="w-4 h-4" /></div>
          </div>
          <div className="text-3xl font-black text-amber-800 font-mono">{errorCount}</div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex border-b border-slate-200">
          <button 
            onClick={() => setActiveTab('audit')}
            className={`flex-1 py-4 text-sm font-black transition-colors flex justify-center items-center gap-2 ${activeTab === 'audit' ? 'bg-indigo-50 text-indigo-700 border-b-2 border-indigo-600' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'}`}
          >
            <CheckSquare className="w-5 h-5" /> مانیتورینگ و عیب‌یابی اسناد
            {(unbalancedCount > 0 || errorCount > 0) && (
              <span className="bg-rose-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">{unbalancedCount + errorCount}</span>
            )}
          </button>
          <button 
            onClick={() => setActiveTab('trial_balance')}
            className={`flex-1 py-4 text-sm font-black transition-colors flex justify-center items-center gap-2 ${activeTab === 'trial_balance' ? 'bg-indigo-50 text-indigo-700 border-b-2 border-indigo-600' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'}`}
          >
            <ArrowLeftRight className="w-5 h-5" /> تراز آزمایشی ۴ ستونی
          </button>
        </div>

        <div className="p-5">
          {activeTab === 'audit' ? (
            <div className="space-y-4">
              <div className="flex gap-4 mb-6">
                <div className="relative flex-1">
                  <Search className="w-5 h-5 text-slate-400 absolute right-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="جستجو در اسناد..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pr-10 pl-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {isLoading ? (
                 <div className="flex justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div></div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-right bg-white">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold text-sm">
                      <tr>
                        <th className="p-4">شماره سند</th>
                        <th className="p-4">تاریخ</th>
                        <th className="p-4">شرح سند</th>
                        <th className="p-4">جمع بدهکار</th>
                        <th className="p-4">جمع بستانکار</th>
                        <th className="p-4">وضعیت تراز</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredDocs.map((doc) => (
                        <tr key={doc.id} className="hover:bg-slate-50 transition-colors">
                          <td className="p-4 font-mono font-black text-slate-800">{doc.documentNumber}</td>
                          <td className="p-4 font-bold text-slate-600">{formatDateDisplay(doc.date, storeSettings?.calendarType)}</td>
                          <td className="p-4 text-sm text-slate-700 max-w-xs truncate">{doc.description}</td>
                          <td className="p-4 font-mono text-emerald-700" dir="ltr">{doc.totalDebit.toLocaleString()}</td>
                          <td className="p-4 font-mono text-amber-700" dir="ltr">{doc.totalCredit.toLocaleString()}</td>
                          <td className="p-4">
                             {doc.auditStatus === 'ok' ? (
                               <div className="flex items-center gap-1.5 text-emerald-600 bg-emerald-50 px-2 py-1.5 rounded-lg text-xs font-bold w-max">
                                 <CheckCircle className="w-4 h-4" /> تراز
                               </div>
                             ) : doc.auditStatus === 'unbalanced' ? (
                               <div className="flex items-center gap-1.5 text-rose-600 bg-rose-50 px-2 py-1.5 rounded-lg text-xs font-bold w-max" title={doc.errorMessage}>
                                 <AlertTriangle className="w-4 h-4" /> اختلاف: {doc.diff.toLocaleString()}
                               </div>
                             ) : (
                               <div className="flex items-center gap-1.5 text-amber-600 bg-amber-50 px-2 py-1.5 rounded-lg text-xs font-bold w-max">
                                 <AlertTriangle className="w-4 h-4" /> دارای نقص
                               </div>
                             )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-4 mb-6 flex items-start gap-3">
                 <Scale className="w-6 h-6 text-indigo-600 shrink-0 mt-0.5" />
                 <div>
                    <h3 className="font-bold text-indigo-900 mb-1">تراز آزمایشی چهار ستونی (سطوح معین و تفصیلی)</h3>
                    <p className="text-sm text-indigo-700/80 leading-relaxed">این جدول گردش کل بدهکار و بستانکار هر کد حساب و همچنین مانده نهایی آن را در سیستم نشان می‌دهد. فقط اسناد «تأیید شده» در این محاسبات لحاظ شده‌اند.</p>
                 </div>
              </div>

              {isLoading ? (
                 <div className="flex justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div></div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-right bg-white">
                    <thead className="bg-slate-800 text-slate-100 border-b border-slate-200 font-bold text-sm">
                      <tr>
                        <th className="p-4" rowSpan={2}>کد حساب</th>
                        <th className="p-4" rowSpan={2}>عنوان حساب</th>
                        <th className="p-4" rowSpan={2}>سطح حساب</th>
                        <th className="p-3 text-center border-r border-slate-700" colSpan={2}>گردش عملیات</th>
                        <th className="p-3 text-center border-r border-slate-700" colSpan={2}>مانده حساب</th>
                      </tr>
                      <tr className="bg-slate-700/50">
                        <th className="p-3 text-center border-r border-slate-700 border-t border-slate-600 text-slate-200">بدهکار</th>
                        <th className="p-3 text-center border-t border-slate-600 text-slate-200">بستانکار</th>
                        <th className="p-3 text-center border-r border-slate-700 border-t border-slate-600 text-slate-200">بدهکار</th>
                        <th className="p-3 text-center border-t border-slate-600 text-slate-200">بستانکار</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {trialBalance.map((acc) => (
                        <tr key={acc.id} className="hover:bg-slate-50 transition-colors">
                          <td className="p-3 font-mono font-bold text-slate-600">{acc.code}</td>
                          <td className="p-3 font-bold text-slate-800">{acc.title}</td>
                          <td className="p-3">
                             <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-1 rounded-md font-bold">
                               {acc.type === 'group' ? 'گروه' : acc.type === 'general' ? 'کل' : acc.type === 'subsidiary' ? 'معین' : 'تفصیلی'}
                             </span>
                          </td>
                          <td className="p-3 font-mono text-center text-emerald-700 bg-emerald-50/30 border-r border-slate-100" dir="ltr">{acc.sumDebit > 0 ? acc.sumDebit.toLocaleString() : '-'}</td>
                          <td className="p-3 font-mono text-center text-amber-700 bg-amber-50/30" dir="ltr">{acc.sumCredit > 0 ? acc.sumCredit.toLocaleString() : '-'}</td>
                          <td className="p-3 font-mono text-center font-black text-emerald-700 bg-emerald-50/60 border-r border-slate-100" dir="ltr">{acc.remainDebit > 0 ? acc.remainDebit.toLocaleString() : '-'}</td>
                          <td className="p-3 font-mono text-center font-black text-amber-700 bg-amber-50/60" dir="ltr">{acc.remainCredit > 0 ? acc.remainCredit.toLocaleString() : '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-slate-100 border-t-2 border-slate-300 font-black">
                      <tr>
                        <td colSpan={3} className="p-4 text-left text-slate-700">جمع کل (فقط معین و تفصیلی):</td>
                        <td className="p-4 font-mono text-center text-emerald-800 border-r border-slate-200" dir="ltr">{tbTotalDebit.toLocaleString()}</td>
                        <td className="p-4 font-mono text-center text-amber-800" dir="ltr">{tbTotalCredit.toLocaleString()}</td>
                        <td className="p-4 font-mono text-center text-emerald-800 border-r border-slate-200" dir="ltr">{tbTotalRemainDebit.toLocaleString()}</td>
                        <td className="p-4 font-mono text-center text-amber-800" dir="ltr">{tbTotalRemainCredit.toLocaleString()}</td>
                      </tr>
                      <tr>
                         <td colSpan={3} className="p-4 text-left font-bold text-indigo-700">تراز بودن جمع سطون‌ها:</td>
                         <td colSpan={2} className="p-4 text-center font-bold">
                            {tbTotalDebit === tbTotalCredit ? <span className="text-emerald-600 flex items-center justify-center gap-2"><CheckCircle className="w-5 h-5" /> تراز است</span> : <span className="text-rose-600 flex items-center justify-center gap-2"><AlertTriangle className="w-5 h-5"/> مجموع تراز نیست (اختلاف: {Math.abs(tbTotalDebit - tbTotalCredit).toLocaleString()})</span>}
                         </td>
                         <td colSpan={2} className="p-4 text-center font-bold">
                            {tbTotalRemainDebit === tbTotalRemainCredit ? <span className="text-emerald-600 flex items-center justify-center gap-2"><CheckCircle className="w-5 h-5" /> تراز است</span> : <span className="text-rose-600 flex items-center justify-center gap-2"><AlertTriangle className="w-5 h-5"/> مجموع تراز نیست</span>}
                         </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
