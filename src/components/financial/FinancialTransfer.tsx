import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { SwitchCamera, CheckCircle, ArrowRightLeft } from 'lucide-react';
import { getAccounts, getCashboxes, updateAccount, updateCashbox, addTransaction, getStoreSettings, getLedgerAccounts, addAccountingDocument } from '../../services/dataService';
import { Account, Cashbox } from '../../types';
import CurrencyInput from '../ui/CurrencyInput';


export default function FinancialTransfer({ showNotification, storeSettings: initialStoreSettings }: any) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [cashboxes, setCashboxes] = useState<Cashbox[]>([]);
  const [storeSettings, setStoreSettings] = useState<any>(initialStoreSettings || {});
  
  const [fromType, setFromType] = useState<'bank' | 'cashbox'>('bank');
  const [fromId, setFromId] = useState('');
  
  const [toType, setToType] = useState<'bank' | 'cashbox'>('bank');
  const [toId, setToId] = useState('');
  
  const [amountStr, setAmountStr] = useState('');
  const [description, setDescription] = useState('');
  
  const [successMsg, setSuccessMsg] = useState('');
  
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setAccounts(await getAccounts());
    setCashboxes(await getCashboxes());
    if (!initialStoreSettings || !initialStoreSettings.currency) {
       const settings = await getStoreSettings();
       if (settings) setStoreSettings(settings);
    }
  };

  const amount = Number((amountStr || '').replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d).toString()).replace(/,/g, ''));

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fromId || !toId || !amount || amount <= 0) return showNotification('اطلاعات نامعتبر است', 'error');
    if (fromType === toType && fromId === toId) return showNotification('مبدا و مقصد نمی‌تواند یکسان باشد', 'error');
    
    if (window.confirm('آیا از انتقال وجه اطمینان دارید؟')) {
       let fromTitle = '';
       let fromCode = '';
       let toTitle = '';
       let toCode = '';

       // Decrease from
       if (fromType === 'bank') {
          const acc = accounts.find(a => a.id.toString() === fromId);
          if (acc) {
             await updateAccount(acc.id.toString(), { ...acc, balance: Number(acc.balance) - amount });
             fromTitle = `${acc.bankName || ''} ${acc.branchName ? 'شعبه ' + acc.branchName : ''} ${acc.accountNumber ? 'حساب ' + acc.accountNumber : ''}`.trim();
             fromCode = acc.accountingCode || '';
          }
       } else {
          const cb = cashboxes.find(a => a.id.toString() === fromId);
          if (cb) {
             await updateCashbox(cb.id.toString(), { ...cb, balance: Number(cb.balance) - amount });
             fromTitle = `صندوق ${cb.name || ''}`;
             fromCode = cb.accountingCode || '';
          }
       }
       
       // Increase to
       if (toType === 'bank') {
          const acc = accounts.find(a => a.id.toString() === toId);
          if (acc) {
             await updateAccount(acc.id.toString(), { ...acc, balance: Number(acc.balance) + amount });
             toTitle = `${acc.bankName || ''} ${acc.branchName ? 'شعبه ' + acc.branchName : ''} ${acc.accountNumber ? 'حساب ' + acc.accountNumber : ''}`.trim();
             toCode = acc.accountingCode || '';
          }
       } else {
          const cb = cashboxes.find(a => a.id.toString() === toId);
          if (cb) {
             await updateCashbox(cb.id.toString(), { ...cb, balance: Number(cb.balance) + amount });
             toTitle = `صندوق ${cb.name || ''}`;
             toCode = cb.accountingCode || '';
          }
       }

       // Register generic tx
       await addTransaction({
         type: 'transfer',
         personId: 0,
         amount: amount,
         date: new Date().toISOString(),
         jalaliDate: new Date().toLocaleDateString('fa-IR'),
         resourceType: fromType,
         resourceId: fromId,
         description: `انتقال وجه به ${toType === 'bank' ? 'حساب' : 'صندوق'} ${toId}. توضیحات: ${description}`
       } as any);

       let actionTypeDesc = 'انتقال وجه';
       if (fromType === 'bank' && toType === 'cashbox') {
           actionTypeDesc = `برداشت نقدی از ${fromTitle} به ${toTitle}`;
       } else if (fromType === 'cashbox' && toType === 'bank') {
           actionTypeDesc = `واریز نقدی از ${fromTitle} به ${toTitle}`;
       } else {
           actionTypeDesc = `انتقال وجه از ${fromTitle} به ${toTitle}`;
       }

       const docDescription = description ? `${actionTypeDesc} - ${description}` : actionTypeDesc;

       const ledgers = await getLedgerAccounts();
       const fromLedger = ledgers.find((l: any) => l.code === fromCode);
       const toLedger = ledgers.find((l: any) => l.code === toCode);

       if (fromLedger && toLedger) {
           await addAccountingDocument({
               date: new Date().toISOString().split('T')[0],
               description: docDescription,
               status: 'approved',
               sourceType: 'manual',
               items: [
                   {
                       ledgerAccountId: String(toLedger.id),
                       detailedAccountId: '',
                       description: actionTypeDesc,
                       debit: amount,
                       credit: 0
                   },
                   {
                       ledgerAccountId: String(fromLedger.id),
                       detailedAccountId: '',
                       description: actionTypeDesc,
                       debit: 0,
                       credit: amount
                   }
               ]
           });
       }

       setSuccessMsg('انتقال وجه با موفقیت انجام شد و سند حسابداری مربوطه ثبت گردید');
       setAmountStr('');
       setDescription('');
       fetchData();
       setTimeout(() => setSuccessMsg(''), 4000);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden" dir="rtl">
      <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
         <h1 className="text-xl font-extrabold text-gray-900 flex items-center gap-2">
           <ArrowRightLeft className="w-6 h-6 text-indigo-600" /> انتقال وجه (بین حساب‌ها و صندوق‌ها)
         </h1>
      </div>
      <div className="p-8">
        {successMsg && (
          <div className="mb-6 p-4 bg-emerald-50 text-emerald-700 rounded-xl flex items-center gap-2 font-bold">
            <CheckCircle className="w-5 h-5" /> {successMsg}
          </div>
        )}
        <form onSubmit={handleTransfer} className="space-y-6 max-w-3xl border border-gray-100 p-6 rounded-2xl bg-gray-50/30">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-4 border border-rose-100 bg-rose-50/30 rounded-xl">
               <h3 className="font-bold text-rose-800 mb-4">مبدا (برداشت از)</h3>
               <div className="space-y-3">
                 <select value={fromType} onChange={e => setFromType(e.target.value as any)} className="w-full p-2 border rounded-lg">
                    <option value="bank">حساب بانکی</option>
                    <option value="cashbox">صندوق</option>
                 </select>
                 <select required value={fromId} onChange={e => setFromId(e.target.value)} className="w-full p-2 border rounded-lg">
                    <option value="">انتخاب کنید ...</option>
                    {fromType === 'bank' ?
                        (accounts || []).map((a, idx) => <option key={a.id ? "ft-acc-" + a.id + "-" + idx : "ft-acc-idx-" + idx} value={a.id}>{a.bankName} - موجودی: {Number(a.balance).toLocaleString()}</option>) :
                       (cashboxes || []).map((c, idx) => <option key={c.id ? "ft-cb-" + c.id + "-" + idx : "ft-cb-idx-" + idx} value={c.id}>{c.name} - موجودی: {Number(c.balance).toLocaleString()}</option>)
                    }
                 </select>
               </div>
            </div>
            <div className="p-4 border border-emerald-100 bg-emerald-50/30 rounded-xl">
               <h3 className="font-bold text-emerald-800 mb-4">مقصد (واریز به)</h3>
               <div className="space-y-3">
                 <select value={toType} onChange={e => setToType(e.target.value as any)} className="w-full p-2 border rounded-lg">
                    <option value="bank">حساب بانکی</option>
                    <option value="cashbox">صندوق</option>
                 </select>
                 <select required value={toId} onChange={e => setToId(e.target.value)} className="w-full p-2 border rounded-lg">
                    <option value="">انتخاب کنید ...</option>
                    {toType === 'bank' ?
                        (accounts || []).map((a, idx) => <option key={a.id ? "ft-acc-" + a.id + "-" + idx : "ft-acc-idx-" + idx} value={a.id}>{a.bankName} - موجودی: {Number(a.balance).toLocaleString()}</option>) :
                       (cashboxes || []).map((c, idx) => <option key={c.id ? "ft-cb-" + c.id + "-" + idx : "ft-cb-idx-" + idx} value={c.id}>{c.name} - موجودی: {Number(c.balance).toLocaleString()}</option>)
                    }
                 </select>
               </div>
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t border-gray-200">
             <div>
                <label className="block text-sm font-bold mb-1">
                  مبلغ انتقال ({storeSettings?.currency || 'تومان'})
                </label>
                <CurrencyInput 
                   value={amountStr} 
                   onChange={(e: any) => setAmountStr(e.target.value)} 
                   placeholder="1,000,000" 
                   className="w-full p-3 border rounded-xl font-mono text-left" 
                   dir="ltr" 
                />
             </div>
             <div>
                <label className="block text-sm font-bold mb-1">توضیحات (اختیاری)</label>
                <input type="text" value={description} onChange={e => setDescription(e.target.value)} className="w-full p-3 border rounded-xl" placeholder="بابت حواله نقدی ..." />
             </div>
          </div>
          <div className="flex justify-end pt-2">
             <button type="submit" className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold flex items-center gap-2">
               <SwitchCamera className="w-5 h-5" /> ثبت انتقال وجه
             </button>
          </div>
        </form>
      </div>
    </div>
  );
}
