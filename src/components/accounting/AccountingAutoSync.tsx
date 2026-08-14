import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Settings, Play, RefreshCcw, FileText, CheckCircle, HandCoins } from 'lucide-react';
import { getAccountingDocuments, addAccountingDocument, getInvoices, getTransactions, getPersons, getLedgerAccounts, getIssuedChecks, getReceivedChecks, getLoans, getInstallments, getAccounts, getCashboxes, getActiveFinancialYear } from '../../services/dataService';
import { convertToGregorian } from '../../utils/format';

export default function AccountingAutoSync({ showNotification }: any) {
  const [missingInvoices, setMissingInvoices] = useState<any[]>([]);
  const [missingTransactions, setMissingTransactions] = useState<any[]>([]);
  const [missingBalances, setMissingBalances] = useState<any[]>([]); // Persons opening balances
  const [missingChecks, setMissingChecks] = useState<any[]>([]);
  const [missingLoans, setMissingLoans] = useState<any[]>([]);
  const [missingInstallments, setMissingInstallments] = useState<any[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    scanSystem();
  }, []);

  const scanSystem = async () => {
    setIsScanning(true);
    try {
      const docs = await getAccountingDocuments();
      const invoices = await getInvoices();
      const transactions = await getTransactions();
      const persons = await getPersons();
      const issuedChecks = await getIssuedChecks();
      const receivedChecks = await getReceivedChecks();
      const loans = await getLoans();
      const installments = await getInstallments();

      const invoiceDocs = (docs || []).filter(d => d.sourceType?.includes('invoice'));
      const transactionDocs = (docs || []).filter(d => ['receipt', 'payment', 'salary'].includes(d.sourceType || ''));
      const balanceDocs = (docs || []).filter(d => d.sourceType === 'opening_balance');
      const checkDocs = (docs || []).filter(d => d.sourceType?.includes('check'));
      const loanDocs = (docs || []).filter(d => d.sourceType === 'loan');
      const instDocs = (docs || []).filter(d => d.sourceType === 'installment');

      const mInvoices = (invoices || []).filter(inv => !['proforma', 'warehouse_receipt', 'warehouse_remittance'].includes(inv.type) && inv.status !== 'voided' && !inv.isDeleted && inv.status !== 'draft' && !inv.isDraft && !invoiceDocs.some(d => d.sourceId?.toString() === inv.id.toString()));
      const mTransactions = (transactions || []).filter(t => !transactionDocs.some(d => d.sourceId?.toString() === t.id.toString()));
      
      const mChecks = [...(issuedChecks || []).map(c => ({...c, _isIssued: true})), ...(receivedChecks || []).map(c => ({...c, _isIssued: false}))].filter(c => !checkDocs.some(d => d.sourceId?.toString() === c.id.toString()));
      const mLoans = loans.filter(l => !loanDocs.some(d => d.sourceId?.toString() === l.id.toString()));
      // Only check paid installments
      const mInsts = installments.filter(i => i.status === 'paid' && !instDocs.some(d => d.sourceId?.toString() === i.id.toString()));

      setMissingInvoices(mInvoices);
      setMissingTransactions(mTransactions);
      setMissingBalances([]); // Removed from arrears
      setMissingChecks(mChecks);
      setMissingLoans(mLoans);
      setMissingInstallments([]);
    } catch (err) {
      showNotification('خطا در اسکن سیستم', 'error');
    }
    setIsScanning(false);
  };

  const handleSyncAll = async () => {
    if (!window.confirm('آیا از صدور خودکار اسناد حسابداری برای تمامی موارد معوقه اطمینان دارید؟')) return;
    
    setIsSyncing(true);
    try {
      const ledgerAccounts = await getLedgerAccounts();
      const pers = await getPersons();
      const bankAccounts = await getAccounts();
      const cashboxesList = await getCashboxes();
      const activeYear = await getActiveFinancialYear();
      const allLoans = await getLoans();
      const defaultLedger = ledgerAccounts.length > 0 ? ledgerAccounts[0].id : '';

      const getPersonLedgerAcc = (personId: string | number) => {
          if (!personId) return defaultLedger;
          const person = pers.find(p => p.id?.toString() === personId.toString());
          if (!person || !person.accountingCode) return defaultLedger;
          const lAcc = ledgerAccounts.find(a => a.code === person.accountingCode);
          return lAcc ? lAcc.id : defaultLedger;
      };

      const getAccByCode = (code: string) => {
          const acc = ledgerAccounts.find(a => a.code === code);
          return acc ? acc.id : defaultLedger;
      };

      const getResourceLedgerAcc = (t: any) => {
          const resType = t.resourceType || (t.accountId ? 'bank' : t.cashboxId ? 'cashbox' : '');
          const resId = t.resourceId || t.accountId || t.cashboxId;

          if (resType === 'bank' && resId) {
              const account = bankAccounts.find(a => a.id?.toString() === resId.toString());
              if (account && account.accountingCode) {
                  const lAcc = ledgerAccounts.find(a => a.code === account.accountingCode);
                  if (lAcc) return lAcc.id;
              }
              const fallback = ledgerAccounts.find(a => a.code === '1102');
              if (fallback) return fallback.id;
          } else if (resType === 'cashbox' && resId) {
              const cashbox = cashboxesList.find(c => c.id?.toString() === resId.toString());
              if (cashbox && cashbox.accountingCode) {
                  const lAcc = ledgerAccounts.find(a => a.code === cashbox.accountingCode);
                  if (lAcc) return lAcc.id;
              }
              const fallback = ledgerAccounts.find(a => a.code === '1101');
              if (fallback) return fallback.id;
          }
          const fallback = ledgerAccounts.find(a => a.code === '11');
          return fallback ? fallback.id : defaultLedger;
      };

      const safeDate = (dateStr: any) => {
          return convertToGregorian(dateStr);
      };

      const salesAcc = getAccByCode('41');
      const inventoryAcc = getAccByCode('13');
      const recvAcc = getAccByCode('12');
      const payAcc = getAccByCode('21');

      let successCount = 0;

      // Sync Persons Opening Balances
      for (const p of missingBalances) {
          const items = [];
          if (p.initialBalanceType === 'debtor') {
              items.push({ description: 'بدهکار - طرف حساب', debit: Number(p.initialBalance), credit: 0, ledgerAccountId: getPersonLedgerAcc(p.id), detailedAccountId: p.id });
              items.push({ description: 'بستانکار - تراز افتتاحیه', debit: 0, credit: Number(p.initialBalance), ledgerAccountId: defaultLedger });
          } else {
              items.push({ description: 'بدهکار - تراز افتتاحیه', debit: Number(p.initialBalance), credit: 0, ledgerAccountId: defaultLedger });
              items.push({ description: 'بستانکار - طرف حساب', debit: 0, credit: Number(p.initialBalance), ledgerAccountId: getPersonLedgerAcc(p.id), detailedAccountId: p.id });
          }
          await addAccountingDocument({
              date: activeYear?.startDate ? activeYear.startDate : safeDate(p.registrationDate),
              description: `سند افتتاحیه طرف حساب: ${p.name}`,
              status: 'approved',
              sourceType: 'opening_balance',
              sourceId: p.id,
              items
          });
          successCount++;
      }

      // Sync Transactions
      for (const t of missingTransactions) {
          const items = [];
          const resourceLedgerId = getResourceLedgerAcc(t);
          if (t.type === 'receive') {
              items.push({ description: 'بدهکار - منابع (صندوق/بانک)', debit: Number(t.amount), credit: 0, ledgerAccountId: resourceLedgerId });
              if (t.isCheckCashing) {
                  items.push({ description: 'بستانکار - اسناد دریافتنی', debit: 0, credit: Number(t.amount), ledgerAccountId: recvAcc });
              } else {
                  items.push({ description: 'بستانکار - طرف حساب', debit: 0, credit: Number(t.amount), ledgerAccountId: getPersonLedgerAcc(t.personId), detailedAccountId: t.personId });
              }
          } else {
              items.push({ description: 'بدهکار - طرف حساب', debit: Number(t.amount), credit: 0, ledgerAccountId: getPersonLedgerAcc(t.personId), detailedAccountId: t.personId });
              items.push({ description: 'بستانکار - منابع (صندوق/بانک)', debit: 0, credit: Number(t.amount), ledgerAccountId: resourceLedgerId });
          }
          await addAccountingDocument({
              date: safeDate(t.date),
              description: `تراکنش به مبدا تراکنش ${t.id}`,
              status: 'approved',
              sourceType: t.type === 'receive' ? 'receipt' : 'payment',
              sourceId: t.id,
              items
          });
          successCount++;
      }

      // Sync Invoices
      for (const inv of missingInvoices) {
          const items = [];
          const total = Number(inv.totalAmount) || 0;
          if (inv.type === 'sale' || inv.type === 'purchase_return') {
              items.push({ description: 'بدهکار - شخص', debit: total, credit: 0, ledgerAccountId: getPersonLedgerAcc(inv.customerId), detailedAccountId: inv.customerId });
              items.push({ description: 'بستانکار - درآمد/موجودی', debit: 0, credit: total, ledgerAccountId: salesAcc });
          } else if (inv.type === 'purchase' || inv.type === 'sale_return') {
              items.push({ description: 'بدهکار - موجودی/هزینه', debit: total, credit: 0, ledgerAccountId: inventoryAcc });
              items.push({ description: 'بستانکار - شخص', debit: 0, credit: total, ledgerAccountId: getPersonLedgerAcc(inv.customerId), detailedAccountId: inv.customerId });
          }

          if ((items || []).length > 0) {
              await addAccountingDocument({
                  date: safeDate(inv.date),
                  description: `فاکتور شماره ${inv.invoiceNumber || inv.id}`,
                  status: 'approved',
                  sourceType: inv.type.includes('sale') ? 'invoice_sale' : 'invoice_purchase',
                  sourceId: inv.id,
                  items
              });
              successCount++;
          }
      }

      // Sync Checks
      for (const c of missingChecks) {
          const items = [];
          const total = Number(c.amount) || 0;
          if (c._isIssued) {
              items.push({ description: 'بدهکار - شخص', debit: total, credit: 0, ledgerAccountId: getPersonLedgerAcc(c.payeeId), detailedAccountId: c.payeeId });
              items.push({ description: 'بستانکار - اسناد پرداختنی', debit: 0, credit: total, ledgerAccountId: payAcc });
          } else {
              items.push({ description: 'بدهکار - اسناد دریافتنی', debit: total, credit: 0, ledgerAccountId: recvAcc });
              items.push({ description: 'بستانکار - شخص', debit: 0, credit: total, ledgerAccountId: getPersonLedgerAcc(c.payerId), detailedAccountId: c.payerId });
          }
          await addAccountingDocument({
              date: safeDate(c.issueDate),
              description: `چک ${c._isIssued ? 'پرداختی' : 'دریافتی'} شماره ${c.checkNumber}`,
              status: 'approved',
              sourceType: c._isIssued ? 'issued_check' : 'received_check',
              sourceId: c.id,
              items
          });
          successCount++;
      }

      // Sync Loans
      for (const l of missingLoans) {
          const items = [];
          const principal = Number(l.amount) || 0;
          const totalPayable = (Number(l.installmentAmount) * Number(l.totalInstallments)) || principal;
          const interestAmt = totalPayable > principal ? totalPayable - principal : 0;
          
          const resourceLedgerId = getResourceLedgerAcc(l);
          
          const interestIncomeAcc = getAccByCode('4') || defaultLedger;
          const interestExpenseAcc = getAccByCode('5') || defaultLedger;

          if (l.type === 'given') {
              items.push({ description: 'بدهکار - وام پرداختی (شخص)', debit: totalPayable, credit: 0, ledgerAccountId: getPersonLedgerAcc(l.personId), detailedAccountId: l.personId });
              items.push({ description: 'بستانکار - منابع (بانک/صندوق)', debit: 0, credit: principal, ledgerAccountId: resourceLedgerId });
              if (interestAmt > 0) items.push({ description: 'بستانکار - درآمد بهره', debit: 0, credit: interestAmt, ledgerAccountId: interestIncomeAcc });
          } else {
              items.push({ description: 'بدهکار - منابع (بانک/صندوق)', debit: principal, credit: 0, ledgerAccountId: resourceLedgerId });
              if (interestAmt > 0) items.push({ description: 'بدهکار - هزینه بهره', debit: interestAmt, credit: 0, ledgerAccountId: interestExpenseAcc });
              items.push({ description: 'بستانکار - وام دریافتی (شخص)', debit: 0, credit: totalPayable, ledgerAccountId: getPersonLedgerAcc(l.personId), detailedAccountId: l.personId });
          }
          await addAccountingDocument({
              date: safeDate(l.startDate),
              description: `وام ${l.type === 'given' ? 'پرداختی' : 'دریافتی'}`,
              status: 'approved',
              sourceType: 'loan',
              sourceId: l.id,
              items
          });
          successCount++;
      }

      // Sync Installments
      for (const inst of missingInstallments) {
          const items = [];
          const total = Number(inst.paidAmount) || Number(inst.amount) || 0;
          const resourceLedgerId = getResourceLedgerAcc(inst);
          const relatedLoan = allLoans.find((l: any) => l.id === inst.loanId);
          const loanType = relatedLoan?.type || 'given';
          const personId = relatedLoan?.personId || '';

          if (loanType === 'given') {
              items.push({ description: 'بدهکار - تسویه قسط (صندوق/بانک)', debit: total, credit: 0, ledgerAccountId: resourceLedgerId });
              items.push({ description: 'بستانکار - وام پرداختی (شخص)', debit: 0, credit: total, ledgerAccountId: getPersonLedgerAcc(personId), detailedAccountId: personId });
          } else {
              items.push({ description: 'بدهکار - وام دریافتی (شخص)', debit: total, credit: 0, ledgerAccountId: getPersonLedgerAcc(personId), detailedAccountId: personId });
              items.push({ description: 'بستانکار - تسویه قسط (صندوق/بانک)', debit: 0, credit: total, ledgerAccountId: resourceLedgerId });
          }
          await addAccountingDocument({
              date: safeDate(inst.paidDate),
              description: `تسویه قسط`,
              status: 'approved',
              sourceType: 'installment',
              sourceId: inst.id,
              items
          });
          successCount++;
      }

      showNotification(`${successCount} سند با موفقیت تولید و ثبت گردید.`, 'success');
      scanSystem();
    } catch (err) {
      console.error(err);
      showNotification('خطا در تولید اسناد: ' + (err as any).message, 'error');
      scanSystem();
    }
    setIsSyncing(false);
  };

  const totalMissing = missingInvoices.length + missingTransactions.length + missingBalances.length + missingChecks.length + missingLoans.length + missingInstallments.length;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="bg-amber-100 p-2 rounded-xl text-amber-600">
          <Settings className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-xl font-black text-slate-800">تولید اسناد معوقه</h2>
          <p className="text-sm text-slate-500 mt-1">تولید خودکار اسناد حسابداری برای رویدادهای ثبت‌شده قبل از سیستم حسابداری (فاکتورها، تراکنش‌ها، چک‌ها، وام‌ها و اقساط)</p>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6">
         <div className="flex justify-between items-center mb-8 pb-4 border-b border-slate-100">
            <h3 className="font-bold text-slate-700 flex items-center gap-2">
               <RefreshCcw className={`w-5 h-5 text-indigo-500 ${isScanning ? 'animate-spin' : ''}`} /> وضعیت اسناد سیستم
            </h3>
            <button onClick={scanSystem} disabled={isScanning || isSyncing} className="px-4 py-2 border border-slate-200 rounded-xl font-bold text-sm text-slate-600 hover:bg-slate-50 transition">
               اسکن مجدد
            </button>
         </div>

         <div className="grid grid-cols-2 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-5 text-center">
               <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm text-indigo-500">
                  <FileText className="w-6 h-6" />
               </div>
               <div className="text-2xl font-black text-slate-800 font-mono mb-1">{missingInvoices.length}</div>
               <div className="text-sm font-bold text-slate-500">فاکتورهای بدون سند</div>
            </div>
            
            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-5 text-center">
               <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm text-emerald-500">
                  <HandCoins className="w-6 h-6" />
               </div>
               <div className="text-2xl font-black text-slate-800 font-mono mb-1">{missingTransactions.length}</div>
               <div className="text-sm font-bold text-slate-500">پرداخت/دریافت بدون سند</div>
            </div>

            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-5 text-center">
               <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm text-amber-500">
                  <FileText className="w-6 h-6" />
               </div>
               <div className="text-2xl font-black text-slate-800 font-mono mb-1">{missingBalances.length}</div>
               <div className="text-sm font-bold text-slate-500">موجودی اولیه شخص</div>
            </div>

            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-5 text-center">
               <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm text-purple-500">
                  <FileText className="w-6 h-6" />
               </div>
               <div className="text-2xl font-black text-slate-800 font-mono mb-1">{missingChecks.length}</div>
               <div className="text-sm font-bold text-slate-500">چک‌های بدون سند</div>
            </div>

            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-5 text-center">
               <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm text-rose-500">
                  <HandCoins className="w-6 h-6" />
               </div>
               <div className="text-2xl font-black text-slate-800 font-mono mb-1">{missingLoans.length}</div>
               <div className="text-sm font-bold text-slate-500">وام‌های بدون سند</div>
            </div>

            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-5 text-center">
               <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm text-blue-500">
                  <FileText className="w-6 h-6" />
               </div>
               <div className="text-2xl font-black text-slate-800 font-mono mb-1">{missingInstallments.length}</div>
               <div className="text-sm font-bold text-slate-500">اقساط (پرداختی) بدون سند</div>
            </div>
         </div>

         <div className="bg-indigo-50/50 rounded-2xl p-6 border border-indigo-100 text-center">
             {totalMissing === 0 ? (
                 <div className="flex flex-col items-center justify-center py-4">
                    <CheckCircle className="w-16 h-16 text-emerald-500 mb-4" />
                    <h4 className="text-lg font-bold text-emerald-800 mb-1">سیستم یکپارچه است</h4>
                    <p className="text-sm text-emerald-600">تمامی رویدادهای مالی دارای سند حسابداری متناظر هستند و نیازی به صدور معوقه نیست.</p>
                 </div>
             ) : (
                 <div className="flex flex-col items-center justify-center py-4">
                    <div className="text-3xl font-black text-indigo-700 font-mono mb-2">{totalMissing}</div>
                    <h4 className="text-lg font-bold text-slate-800 mb-1">رویداد منتظر صدور سند</h4>
                    <p className="text-sm text-slate-600 mb-6 max-w-lg mx-auto">با کلیک روی دکمه زیر، سیستم به طور خودکار تمامی اسناد حسابداری مربوط به فاکتورها، تراکنش‌ها و مانده‌های اولیه را طبق ساختار حساب پیش‌فرض ایجاد خواهد کرد.</p>
                    
                    <button 
                      onClick={handleSyncAll}
                      disabled={isSyncing}
                      className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-bold flex items-center gap-2 hover:bg-indigo-700 transition shadow-lg shadow-indigo-200 disabled:opacity-50"
                    >
                       {isSyncing ? <RefreshCcw className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5" />}
                       تولید اتوماتیک همه‌ی اسناد معوقه
                    </button>
                 </div>
             )}
         </div>
      </div>
    </div>
  );
}
