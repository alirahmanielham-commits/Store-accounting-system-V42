
import React, { useState, useRef, useEffect } from 'react';
import { Search, CheckCircle, Printer, FileText, User, X, CreditCard, Building2, Calendar as CalendarIcon, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Loan, Installment, Account, Cashbox } from '../../types';
import { useReactToPrint } from 'react-to-print';
import { getAccounts, getCashboxes } from '../../services/dataService';

interface Props {
  loans: Loan[];
  installments: Installment[];
  persons: any[];
  formatCurrency: (val: number) => string;
  setInstallments: (insts: Installment[]) => void;
  showNotification: (msg: string, type?: 'success'|'error'|'info'|'warning') => void;
  saveInstallments: (insts: Installment[]) => Promise<void>;
  addSystemLog: (action: string, details: string, entity: string, id: string | number) => Promise<void>;
  addTransaction?: (tx: any) => Promise<any>;
  storeSettings?: any;
  initialLoanId?: string;
}

export default function LoansPayment({ loans, installments, persons, formatCurrency, setInstallments, showNotification, saveInstallments, addSystemLog, addTransaction, storeSettings, initialLoanId }: Props) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedInst, setSelectedInst] = useState<Installment | null>(null);
  const [paymentMethodType, setPaymentMethodType] = useState<'account' | 'cashbox'>('account');
  const [paymentMethodId, setPaymentMethodId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [cashboxes, setCashboxes] = useState<Cashbox[]>([]);

  
  useEffect(() => {
    if (initialLoanId) {
      const loan = loans.find(l => l.id.toString() === initialLoanId);
      if (loan) {
        setSelectedLoan(loan);
        setSearchQuery(loan.loanNumber || loan.id.toString());
      }
    }
  }, [initialLoanId, loans]);

  useEffect(() => {
    const fetchMethods = async () => {
      try {
        const accs = await getAccounts();
        const cashs = await getCashboxes();
        setAccounts(accs);
        setCashboxes(cashs);
      } catch (e) {
        console.error('Failed to load payment methods', e);
      }
    };
    fetchMethods();
  }, []);

  const getPersonName = (id: string | number) => {
    const p = persons.find(p => p.id === id);
    return p ? (p.firstName + ' ' + p.lastName).trim() : 'نامشخص';
  };

  const handleSearch = () => {
    if (!searchQuery) return;
    const term = searchQuery.toLowerCase();
    
    // Find loan by exact loanNumber or matching person
    const matchedLoans = loans.filter(l => 
      (l.loanNumber && l.loanNumber.includes(term)) || 
      l.id.toString().includes(term) ||
      getPersonName(l.personId).toLowerCase().includes(term)
    );
    
    if (matchedLoans.length === 1) {
      setSelectedLoan(matchedLoans[0]);
    } else if (matchedLoans.length > 1) {
      showNotification('چند وام یافت شد، لطفا دقیق‌تر جستجو کنید.', 'error');
    } else {
      showNotification('وامی یافت نشد.', 'error');
    }
  };

  const loanInstallments = selectedLoan 
    ? installments.filter(i => i.loanId === selectedLoan.id).sort((a,b) => (a.installmentNumber || 0) - (b.installmentNumber || 0)) 
    : [];

  const handleOpenModal = (inst: Installment, idx: number) => {
    // Check if any previous installment is unpaid
    for (let i = 0; i < idx; i++) {
      if (loanInstallments[i].status !== 'paid') {
        showNotification('برای پرداخت این قسط، ابتدا باید اقساط قبلی پرداخت شوند.', 'error');
        return;
      }
    }
    setSelectedInst(inst);
    setIsModalOpen(true);
    setPaymentMethodType('account');
    if (accounts.length > 0) setPaymentMethodId(accounts[0].id.toString());
  };

  const handleConfirmPay = async () => {
    if (!selectedInst || !selectedLoan) return;
    
    if (selectedInst.status === 'paid') {
      showNotification('این قسط قبلاً پرداخت شده است.', 'warning');
      return;
    }

    if (!paymentMethodId) {
      showNotification('لطفاً روش پرداخت را انتخاب کنید.', 'error');
      return;
    }

    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      const today = new Date().toLocaleDateString('fa-IR').replace(/\//g, '-');
      const updatedInsts = installments.map(i => {
        if (i.id === selectedInst.id) {
          return { ...i, status: 'paid', paidDate: today, paidAmount: i.amount } as Installment;
        }
        return i;
      });
      setInstallments(updatedInsts);
      await saveInstallments(updatedInsts);
      await addSystemLog('PAY_INSTALLMENT', `پرداخت قسط ${selectedInst.installmentNumber || ''} وام ${selectedLoan.loanNumber || selectedLoan.id}`, 'Installment', selectedInst.id);
      
      if (addTransaction) {
        const txType = selectedLoan.type === 'given' ? 'receive' : 'pay';
        await addTransaction({
          type: txType,
          amount: selectedInst.amount,
          method: paymentMethodType === 'account' ? 'account' : 'cash',
          resourceType: paymentMethodType === 'account' ? 'bank' : 'cashbox',
          resourceId: paymentMethodId,
          accountId: paymentMethodType === 'account' ? paymentMethodId : undefined,
          cashboxId: paymentMethodType === 'cashbox' ? paymentMethodId : undefined,
          personId: selectedLoan.personId,
          categoryId: selectedLoan.type === 'given' ? 'loan_installment_received' : 'loan_installment_paid',
          description: selectedLoan.type === 'given' ? `دریافت قسط ${selectedInst.installmentNumber || ''} وام ${selectedLoan.loanNumber || selectedLoan.id}` : `پرداخت قسط ${selectedInst.installmentNumber || ''} وام ${selectedLoan.loanNumber || selectedLoan.id}`,
          date: new Date().toISOString().split('T')[0],
          jalaliDate: today,
          time: new Date().toLocaleTimeString('fa-IR', { hour12: false }),
          isSystem: true,
        });
      }

      showNotification('قسط با موفقیت پرداخت شد.', 'success');
      setIsModalOpen(false);
    } catch(err) {
      showNotification('خطا در پرداخت قسط', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const bookletRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({
    contentRef: bookletRef,
    documentTitle: `دفترچه_اقساط_وام_${selectedLoan?.loanNumber || selectedLoan?.id}`,
  });

  const currencyStr = storeSettings?.currency || 'تومان';

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 relative">
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <input 
            type="text" 
            placeholder="شماره وام یا نام شخص را وارد کنید..." 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            className="w-full bg-gray-50 border-2 border-gray-100 rounded-xl pl-4 pr-12 py-3 outline-none focus:border-emerald-500 font-medium"
          />
          <Search className="w-5 h-5 text-gray-400 absolute top-1/2 -translate-y-1/2 right-4" />
        </div>
        <button onClick={handleSearch} className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3 rounded-xl font-bold transition-all">
          جستجو
        </button>
      </div>

      {selectedLoan && (
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 pb-6 border-b border-gray-100 gap-4">
            <div>
              <h2 className="text-xl font-black text-gray-800 mb-1">
                وام شماره {selectedLoan.loanNumber || selectedLoan.id}
              </h2>
              <div className="text-gray-500 font-medium flex items-center gap-2">
                <User className="w-4 h-4" />
                <span>شخص: {getPersonName(selectedLoan.personId)}</span>
                <span className="mx-2">|</span>
                <span>مبلغ: {formatCurrency(selectedLoan.amount)} {currencyStr}</span>
              </div>
            </div>
            <button onClick={handlePrint} className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all">
              <Printer className="w-5 h-5" />
              چاپ دفترچه اقساط
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {loanInstallments.map((inst, idx) => {
              let isPrevUnpaid = false;
              for (let i = 0; i < idx; i++) {
                if (loanInstallments[i].status !== 'paid') {
                  isPrevUnpaid = true;
                  break;
                }
              }

              return (
                <div key={inst.id} className={`p-4 rounded-2xl border-2 ${inst.status === 'paid' ? 'border-emerald-100 bg-emerald-50' : inst.status === 'overdue' ? 'border-red-100 bg-red-50' : 'border-gray-100 bg-white'}`}>
                  <div className="flex justify-between items-center mb-3">
                    <span className="font-bold text-gray-700 bg-gray-100/50 px-3 py-1 rounded-lg text-sm">
                      قسط {inst.installmentNumber || (idx + 1)}
                    </span>
                    {inst.status === 'paid' ? (
                      <span className="text-emerald-600 text-xs font-bold bg-emerald-100 px-2 py-1 rounded-md">پرداخت شده</span>
                    ) : inst.status === 'overdue' ? (
                      <span className="text-red-600 text-xs font-bold bg-red-100 px-2 py-1 rounded-md">معوق</span>
                    ) : (
                      <span className="text-amber-600 text-xs font-bold bg-amber-100 px-2 py-1 rounded-md">در انتظار</span>
                    )}
                  </div>
                  <div className="text-lg font-black text-gray-900 mb-1">{formatCurrency(inst.amount)} <span className="text-sm font-medium text-gray-500">{currencyStr}</span></div>
                  <div className="text-sm text-gray-500 font-medium mb-4 flex items-center gap-1">
                    <FileText className="w-4 h-4" />
                    سررسید: {inst.dueDate}
                  </div>
                  
                  {inst.status !== 'paid' ? (
                    <button 
                      onClick={() => handleOpenModal(inst, idx)} 
                      disabled={isPrevUnpaid}
                      className={`w-full font-bold py-2 rounded-xl text-sm transition-all flex justify-center items-center gap-1 ${
                        isPrevUnpaid 
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                          : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      }`}
                    >
                      <CheckCircle className="w-4 h-4" />
                      ثبت پرداخت
                    </button>
                  ) : (
                    <div className="w-full bg-emerald-100 text-emerald-700 font-bold py-2 rounded-xl text-sm text-center">
                      پرداخت شده در {inst.paidDate}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Hidden Print Booklet */}
          <div className="hidden">
            <div ref={bookletRef} className="p-8 font-sans print:w-[148mm] print:h-[210mm] mx-auto print:p-6" dir="rtl" style={{ width: '100%', maxWidth: '210mm' }}>
              <style>
                {`
                  @media print {
                    @page { size: A5; margin: 10mm; }
                    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                  }
                `}
              </style>
              <div className="text-center mb-8 pb-4 border-b-2 border-gray-800">
                <h1 className="text-2xl font-black mb-2">دفترچه اقساط</h1>
                <p className="text-lg font-bold">وام شماره: {selectedLoan.loanNumber || selectedLoan.id}</p>
                <p className="font-medium mt-1">نام وام‌گیرنده: {getPersonName(selectedLoan.personId)}</p>
                <p className="font-medium mt-1">مبلغ وام: {formatCurrency(selectedLoan.amount)} {currencyStr}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {loanInstallments.map((inst, idx) => (
                  <div key={inst.id} className="border-2 border-gray-400 rounded-xl p-4 flex flex-col justify-between bg-white h-[120px] shadow-sm print:shadow-none" style={{ breakInside: 'avoid' }}>
                    <div className="flex justify-between items-center mb-4 border-b border-dashed border-gray-400 pb-2">
                      <span className="font-bold text-lg">قسط {inst.installmentNumber || (idx + 1)}</span>
                      <span className="font-bold">{inst.dueDate}</span>
                    </div>
                    <div className="mb-4">
                      <p className="font-medium text-gray-600">مبلغ قسط:</p>
                      <p className="font-black text-xl">{formatCurrency(inst.amount)} <span className="text-sm font-medium">{currencyStr}</span></p>
                    </div>
                    <div className="mt-auto border-t border-gray-400 pt-2 flex justify-between text-sm">
                      <span className="text-gray-500">مهر و امضا:</span>
                      <span className="text-gray-500">تاریخ پرداخت: ......................</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      <AnimatePresence>
        {isModalOpen && selectedInst && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100]"
              onClick={() => setIsModalOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[95%] max-w-lg bg-white rounded-3xl shadow-2xl z-[101] overflow-hidden"
            >
              <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                <h3 className="text-xl font-black text-gray-800 flex items-center gap-2">
                  <CreditCard className="w-6 h-6 text-emerald-600" />
                  تأیید پرداخت قسط
                </h3>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-200/50 text-gray-500 hover:bg-gray-200 hover:text-gray-700 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                <div className="bg-emerald-50 rounded-2xl p-4 border border-emerald-100 flex items-start gap-4">
                  <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center shrink-0">
                    <CheckCircle className="w-6 h-6 text-emerald-600" />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-800 mb-1">
                      قسط {selectedInst.installmentNumber} وام {selectedLoan?.loanNumber || selectedLoan?.id}
                    </h4>
                    <p className="text-emerald-700 font-medium">مبلغ: {formatCurrency(selectedInst.amount)} {currencyStr}</p>
                    <p className="text-sm text-emerald-600/80 mt-1 flex items-center gap-1">
                      <CalendarIcon className="w-4 h-4" />
                      سررسید: {selectedInst.dueDate}
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="block text-sm font-bold text-gray-700">محل پرداخت / دریافت</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setPaymentMethodType('account');
                        setPaymentMethodId(accounts.length > 0 ? accounts[0].id.toString() : '');
                      }}
                      className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${
                        paymentMethodType === 'account'
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                          : 'border-gray-200 hover:border-emerald-200 text-gray-600'
                      }`}
                    >
                      <Building2 className="w-6 h-6" />
                      <span className="font-bold">حساب بانکی</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPaymentMethodType('cashbox');
                        setPaymentMethodId(cashboxes.length > 0 ? cashboxes[0].id.toString() : '');
                      }}
                      className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${
                        paymentMethodType === 'cashbox'
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                          : 'border-gray-200 hover:border-emerald-200 text-gray-600'
                      }`}
                    >
                      <CreditCard className="w-6 h-6" />
                      <span className="font-bold">صندوق</span>
                    </button>
                  </div>

                  {paymentMethodType === 'account' ? (
                    accounts.length > 0 ? (
                      <select
                        value={paymentMethodId}
                        onChange={(e) => setPaymentMethodId(e.target.value)}
                        className="w-full bg-gray-50 border-2 border-gray-100 rounded-xl px-4 py-3 outline-none focus:border-emerald-500 font-medium"
                      >
                        {accounts.map(acc => (
                          <option key={acc.id} value={acc.id}>{acc.bankName} - {acc.accountNumber}</option>
                        ))}
                      </select>
                    ) : (
                      <div className="bg-amber-50 text-amber-700 p-3 rounded-xl text-sm font-medium flex items-center gap-2">
                        <AlertCircle className="w-4 h-4" />
                        هیچ حساب بانکی تعریف نشده است.
                      </div>
                    )
                  ) : (
                    cashboxes.length > 0 ? (
                      <select
                        value={paymentMethodId}
                        onChange={(e) => setPaymentMethodId(e.target.value)}
                        className="w-full bg-gray-50 border-2 border-gray-100 rounded-xl px-4 py-3 outline-none focus:border-emerald-500 font-medium"
                      >
                        {cashboxes.map(cb => (
                          <option key={cb.id} value={cb.id}>{cb.name}</option>
                        ))}
                      </select>
                    ) : (
                      <div className="bg-amber-50 text-amber-700 p-3 rounded-xl text-sm font-medium flex items-center gap-2">
                        <AlertCircle className="w-4 h-4" />
                        هیچ صندوقی تعریف نشده است.
                      </div>
                    )
                  )}
                </div>

              </div>

              <div className="p-6 bg-gray-50 flex justify-end gap-3 rounded-b-3xl">
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="px-6 py-2.5 rounded-xl font-bold text-gray-600 hover:bg-gray-200 transition-colors"
                >
                  انصراف
                </button>
                <button
                  onClick={handleConfirmPay}
                  disabled={!paymentMethodId || isSubmitting}
                  className="px-8 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl font-bold transition-all shadow-sm flex items-center gap-2"
                >
                  <CheckCircle className="w-5 h-5" />
                  تأیید و پرداخت
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
