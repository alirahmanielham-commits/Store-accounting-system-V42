import React, { useState, useEffect } from 'react';
import { X, Save, RefreshCw, CreditCard, Wallet, Banknote } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getLocalData } from '../../services/coreService';
import { addTransaction, updateTransaction } from '../../services/invoiceService';

export default function SalePaymentModal({
  isOpen,
  onClose,
  payload,
  saveInvoiceData,
  accounts,
  cashboxes,
  transactions,
  formatCurrency,
  addCommas,
  persons, setViewingInvoice
}: any) {
  const [paymentType, setPaymentType] = useState('full'); // full, partial, credit
  const [paidAmount, setPaidAmount] = useState('');
  const [paymentAccountId, setPaymentAccountId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [unallocatedBalance, setUnallocatedBalance] = useState(0);
  const [useUnallocated, setUseUnallocated] = useState(false);
  const [unallocatedAmountToUse, setUnallocatedAmountToUse] = useState('');

  useEffect(() => {
    if (isOpen && payload?.customerId) {
      setPaymentType('full');
      setPaidAmount(payload.totalAmount?.toString() || '');
      setPaymentAccountId('');
      setUseUnallocated(false);
      setUnallocatedAmountToUse('');

      // Calculate unallocated balance for the person
      const personTx = (transactions || []).filter((tx: any) => 
        tx.personId === payload.customerId && 
        tx.type === 'receive'
      );
      
      let totalUnallocated = 0;
      personTx.forEach((tx: any) => {
        let allocated = 0;
        if (tx.linkedInvoices) {
          Object.values(tx.linkedInvoices).forEach((amt: any) => allocated += Number(amt));
        }
        const txAmount = Number(tx.amount) || 0;
        if (txAmount > allocated) {
          totalUnallocated += (txAmount - allocated);
        }
      });
      setUnallocatedBalance(totalUnallocated);
    }
  }, [isOpen, payload, transactions]);

  if (!isOpen || !payload) return null;

  const totalAmount = payload.totalAmount || 0;

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const finalPayload = { ...payload };
      finalPayload.paymentStatus = paymentType === 'credit' ? 'unpaid' : (paymentType === 'full' ? 'paid' : 'partial');
      
      let newPaidAmount = 0;
      if (paymentType === 'full') newPaidAmount = totalAmount;
      if (paymentType === 'partial') newPaidAmount = Number(paidAmount.replace(/,/g, '')) || 0;

      let unallocUse = useUnallocated ? (Number(unallocatedAmountToUse.replace(/,/g, '')) || 0) : 0;
      if (paymentType === 'credit') unallocUse = 0;
      
      finalPayload.paidAmount = newPaidAmount + unallocUse;
      
      if (finalPayload.paidAmount >= totalAmount) finalPayload.paymentStatus = 'paid';
      if (finalPayload.paidAmount === 0) finalPayload.paymentStatus = 'unpaid';

      // 1. Save invoice
      const savedInvoice = await saveInvoiceData(finalPayload, false, true);
      
      if (savedInvoice) {
        // 2. Register new payment if newPaidAmount > 0
        if (newPaidAmount > 0 && paymentAccountId) {
          const acc = accounts.find((a: any) => a.id === paymentAccountId) || cashboxes.find((c: any) => c.id === paymentAccountId);
          const payTxPayload = {
            type: 'receive',
            amount: newPaidAmount,
            date: payload.date || new Date().toISOString().split('T')[0],
            personId: payload.customerId,
            resourceType: accounts.find((a: any) => a.id === paymentAccountId) ? 'bank' : 'cashbox',
            resourceId: paymentAccountId,
            method: 'cash',
            description: `دریافت بابت فاکتور فروش شماره ${savedInvoice.invoiceNumber || savedInvoice.id}`,
            currency: payload.currency || 'تومان',
            linkedInvoices: { [savedInvoice.id]: newPaidAmount }
          }
          await addTransaction(payTxPayload);
        }

        // 3. Allocate previous unallocated balance
        if (unallocUse > 0) {
            const personTx = (transactions || []).filter((tx: any) => 
                tx.personId === payload.customerId && 
                tx.type === 'receive'
            );
            
            let remainingToAllocate = unallocUse;
            
            for (const tx of personTx) {
                if (remainingToAllocate <= 0) break;
                let allocated = 0;
                if (tx.linkedInvoices) {
                    Object.values(tx.linkedInvoices).forEach((amt: any) => allocated += Number(amt));
                }
                const txAmount = Number(tx.amount) || 0;
                const available = txAmount - allocated;
                
                if (available > 0) {
                    const toUse = Math.min(available, remainingToAllocate);
                    const newLinkedInvoices = { ...(tx.linkedInvoices || {}) };
                    newLinkedInvoices[savedInvoice.id] = (newLinkedInvoices[savedInvoice.id] || 0) + toUse;
                    
                    await updateTransaction(tx.id, { ...tx, linkedInvoices: newLinkedInvoices });
                    remainingToAllocate -= toUse;
                }
            }
        }
      }
      onClose();
      if (setViewingInvoice && savedInvoice) setViewingInvoice(savedInvoice);
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]"
      >
        <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50/50">
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            <Wallet className="w-5 h-5 text-indigo-500" />
            تعیین وضعیت پرداخت فاکتور فروش
          </h3>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto">
          <div className="mb-6 p-4 bg-indigo-50 rounded-xl border border-indigo-100 flex justify-between items-center">
            <span className="text-indigo-900 font-medium">مبلغ کل فاکتور:</span>
            <span className="text-xl font-black text-indigo-700">{formatCurrency(totalAmount)} {payload.currency || 'تومان'}</span>
          </div>

          <div className="space-y-4">
            <label className="block text-sm font-bold text-slate-700">وضعیت پرداخت</label>
            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setPaymentType('full')}
                className={`p-3 rounded-xl border-2 font-bold transition-all ${
                  paymentType === 'full' 
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700' 
                    : 'border-slate-200 text-slate-500 hover:border-indigo-200'
                }`}
              >
                پرداخت کامل
              </button>
              <button
                type="button"
                onClick={() => setPaymentType('partial')}
                className={`p-3 rounded-xl border-2 font-bold transition-all ${
                  paymentType === 'partial' 
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700' 
                    : 'border-slate-200 text-slate-500 hover:border-indigo-200'
                }`}
              >
                مقداری پرداخت
              </button>
              <button
                type="button"
                onClick={() => setPaymentType('credit')}
                className={`p-3 rounded-xl border-2 font-bold transition-all ${
                  paymentType === 'credit' 
                    ? 'border-amber-500 bg-amber-50 text-amber-700' 
                    : 'border-slate-200 text-slate-500 hover:border-amber-200'
                }`}
              >
                نسیه
              </button>
            </div>
          </div>

          {unallocatedBalance > 0 && paymentType !== 'credit' && (
            <div className="mt-6 p-4 bg-emerald-50 border border-emerald-100 rounded-xl">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={useUnallocated}
                  onChange={(e) => setUseUnallocated(e.target.checked)}
                  className="w-5 h-5 rounded text-emerald-600 focus:ring-emerald-500 border-emerald-300"
                />
                <div>
                  <span className="block font-bold text-emerald-900">استفاده از طلب/پرداختی‌های قبلی</span>
                  <span className="block text-xs text-emerald-700 mt-1">مبلغ در دسترس: {formatCurrency(unallocatedBalance)} {payload.currency || 'تومان'}</span>
                </div>
              </label>
              
              {useUnallocated && (
                <div className="mt-4">
                  <label className="block text-xs font-bold text-emerald-800 mb-1">مبلغ مورد استفاده از طلب</label>
                  <input
                    type="text"
                    value={unallocatedAmountToUse}
                    onChange={(e) => {
                        const val = e.target.value.replace(/,/g, '');
                        if (!isNaN(Number(val))) {
                            if (Number(val) > unallocatedBalance) return;
                            if (Number(val) > totalAmount) return;
                            setUnallocatedAmountToUse(addCommas(val));
                        }
                    }}
                    className="w-full p-3 rounded-xl border border-emerald-200 focus:ring-2 focus:ring-emerald-500 outline-none text-left"
                    dir="ltr"
                    placeholder="0"
                  />
                </div>
              )}
            </div>
          )}

          {paymentType !== 'credit' && (
            <div className="mt-6 space-y-4">
              {paymentType === 'partial' && (
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">مبلغ پرداختی جدید</label>
                  <input
                    type="text"
                    value={paidAmount}
                    onChange={(e) => {
                      const val = e.target.value.replace(/,/g, '');
                      if (!isNaN(Number(val))) setPaidAmount(addCommas(val));
                    }}
                    className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none text-left"
                    dir="ltr"
                    placeholder="0"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">صندوق / حساب بانکی</label>
                <select
                  value={paymentAccountId}
                  onChange={(e) => setPaymentAccountId(e.target.value)}
                  className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  <option value="">-- انتخاب کنید --</option>
                  <optgroup label="صندوق‌ها">
                    {cashboxes.filter((c: any) => c.isActive !== false).map((c: any) => (
                      <option key={c.id} value={c.id}>{c.title}</option>
                    ))}
                  </optgroup>
                  <optgroup label="حساب‌های بانکی">
                    {accounts.filter((a: any) => a.isActive !== false).map((a: any) => (
                      <option key={a.id} value={a.id}>{a.title} - {a.bankName}</option>
                    ))}
                  </optgroup>
                </select>
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-slate-100 bg-slate-50 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 p-3 text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl font-bold transition-colors"
          >
            انصراف
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || (paymentType !== 'credit' && !paymentAccountId && paymentType === 'full') || (paymentType === 'partial' && !paymentAccountId && Number(paidAmount.replace(/,/g, '')) > 0)}
            className="flex-1 p-3 text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl font-bold transition-colors flex justify-center items-center gap-2 disabled:bg-indigo-300"
          >
            {submitting ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            تایید و ثبت فاکتور
          </button>
        </div>
      </motion.div>
    </div>
  );
}
