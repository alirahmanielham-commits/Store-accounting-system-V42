// @ts-nocheck
import React, { useState } from 'react';
import { Loan, Installment, Person, Account } from '../../types';
import { generateInstallmentCode, calculateInstallmentDates } from '../../utils/installmentUtils';
import { Plus, Percent, Edit2, Trash2, Search, CheckCircle, ChevronDown, ChevronUp, AlertCircle, RefreshCw, Layers, Calendar, DollarSign, Wallet, Users, Activity, List, ArrowLeftRight, Settings } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import SearchableSelect from '../ui/SearchableSelect';
import CustomDatePicker from '../ui/CustomDatePicker';
import { startAppProcessing, stopAppProcessing } from '../../utils/processingHelper';
import { saveLoans, saveInstallments, addTransaction, deleteTransaction, checkFinancialYear, addSystemLog, addLoanHistoryEntry } from '../../services/dataService';
import { formatDateDisplay, convertToGregorian } from '../../utils/format';
import { globalDateFormatter } from '../../utils/dateFormatter';
import LoansDashboard from './LoansDashboard';
import LoansArrears from './LoansArrears';
import LoansReports from './LoansReports';
import LoansSettings from './LoansSettings';
import InstallmentPaymentTerminal from './InstallmentPaymentTerminal';
import InstallmentBookletPrint from './InstallmentBookletPrint';
import LoanDetailsView from './LoanDetailsView';
import LoanTransitionModal from './LoanTransitionModal';


import { Printer, X } from 'lucide-react';




interface LoansManagerProps {
  showNotification: (message: string, type?: "success" | "error" | "info" | "warning") => void;
  loans: Loan[];
  setLoans: React.Dispatch<React.SetStateAction<Loan[]>>;
  installments: Installment[];
  setInstallments: React.Dispatch<React.SetStateAction<Installment[]>>;
  persons: Person[];
  accounts: Account[];
  setAccounts: React.Dispatch<React.SetStateAction<Account[]>>;
  transactions: any[];
  setTransactions: React.Dispatch<React.SetStateAction<any[]>>;
  storeSettings?: any;
  formatCurrency?: (val: number) => string;
  currentUser?: string;
  userRole?: string;
  activeTab?: 'dashboard' | 'list' | 'create' | 'payment' | 'arrears' | 'reports' | 'settings';
}


const LOAN_STATUS_LABELS: Record<string, string> = {
  requested: 'درخواست',
  incomplete: 'نقص پرونده',
  completed_dossier: 'تکمیل پرونده',
  approved: 'تایید شده',
  active: 'پرداخت شده',
  completed: 'تسویه شده',
  overdue: 'معوق'
};
const LOAN_STATUS_COLORS: Record<string, string> = {
  requested: 'bg-slate-100 text-slate-700',
  incomplete: 'bg-rose-100 text-rose-700',
  completed_dossier: 'bg-sky-100 text-sky-700',
  approved: 'bg-purple-100 text-purple-700',
  active: 'bg-emerald-100 text-emerald-700',
  completed: 'bg-slate-200 text-slate-800',
  overdue: 'bg-red-100 text-red-800'
};

export default function LoansManager({
  storeSettings,
  loans,
  setLoans,
  installments,
  setInstallments,
  persons,
  accounts,
  setAccounts,
  transactions,
  setTransactions, 
  showNotification,
  formatCurrency = (val: number) => val.toLocaleString('fa-IR'),
  currentUser = 'سیستم',
  userRole = 'viewer',
  activeTab = 'dashboard'
}: LoansManagerProps) {
  const navigate = useNavigate();
  const [selectedLoanForPayment, setSelectedLoanForPayment] = useState<string>('');
    const [expandedLoanId, setExpandedLoanId] = useState<string | number | null>(null);
  const [printingLoanId, setPrintingLoanId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previewData, setPreviewData] = useState<{loan: Loan, installments: Installment[]} | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const [formData, setFormData] = useState<{
    personId: string | number;
    amount: number | '';
    interestRate: number | '';
    startDate: string;
    totalInstallments: number | '';
    installmentAmount: number | '';
    frequency: 'monthly' | 'quarterly' | 'yearly';
    description: string;
    type: 'given' | 'received';
    accountId: string | number;
    penaltyType: 'none' | 'fixed_per_day' | 'percent_per_day' | 'fixed_per_month' | 'percent_per_month';
    penaltyRate: number | '';
    earlySettlementPolicy: 'none' | 'discount_interest';
    earlySettlementDiscountPercent: number | '';
    roundingBase: number;
  }>({
    personId: '',
    amount: '',
    interestRate: '',
    startDate: globalDateFormatter.formatDateOnly(new Date()),
    firstInstallmentDate: globalDateFormatter.formatDateOnly(new Date()),
    totalInstallments: '',
    installmentAmount: '',
    frequency: 'monthly',
    description: '',
    type: 'given',
    accountId: '',
    penaltyType: 'none',
    penaltyRate: '',
    earlySettlementPolicy: 'none',
    earlySettlementDiscountPercent: '',
    roundingBase: 1000
  });


  const [useBalanceAsAmount, setUseBalanceAsAmount] = useState(false);

  const selectedPersonBalance = React.useMemo(() => {
    if (!formData.personId) return null;
    const personIdStr = formData.personId.toString();
    const person = persons.find(p => p.id.toString() === personIdStr);
    if (!person) return null;
    
    let balance = 0;
    (transactions || []).filter(t => t.personId?.toString() === personIdStr).forEach(t => {
        if (t.type === 'receive') balance -= (t.amount || 0);
        else if (t.type === 'pay') balance += (t.amount || 0);
        else if (t.type === 'salary') balance -= (t.amount || 0);
    });
    if (balance > 0) return { amount: balance, status: 'بدهکار', value: balance, color: 'text-rose-600', bg: 'bg-rose-50' };
    if (balance < 0) return { amount: Math.abs(balance), status: 'بستانکار', value: balance, color: 'text-emerald-600', bg: 'bg-emerald-50' };
    return { amount: 0, status: 'بی‌حساب', value: 0, color: 'text-gray-500', bg: 'bg-gray-100' };
  }, [formData.personId, persons, transactions]);

  const [paymentForm, setPaymentForm] = useState<{
    installmentId: string | number | null;
    amount: number | '';
    accountId: string | number;
    paymentDate: string;
  }>({
    installmentId: null,
    amount: '',
    accountId: '',
    paymentDate: globalDateFormatter.formatDateOnly(new Date()),
  });

  const addCommas = (num: number | string) => {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  };

    const toEnglishNumbers = (str: string) => {
    const persianNumbers = [/۰/g, /۱/g, /۲/g, /۳/g, /۴/g, /۵/g, /۶/g, /۷/g, /۸/g, /۹/g];
    const arabicNumbers  = [/٠/g, /١/g, /٢/g, /٣/g, /٤/g, /٥/g, /٦/g, /٧/g, /٨/g, /٩/g];
    let result = str;
    for(let i=0; i<10; i++) {
      result = result.replace(persianNumbers[i], i.toString()).replace(arabicNumbers[i], i.toString());
    }
    return result;
  };

  const removeCommas = (str: string) => {
    return str.replace(/,/g, "");
  };

  const calculateInstallment = (amount: number, count: number, rate: number, freq: string, roundBase: number) => {
      if (!amount || !count) return '';
      let periodsPerYear = freq === 'monthly' ? 12 : freq === 'quarterly' ? 4 : 1;
      let periodicRate = (rate / 100) / periodsPerYear;
      let exactAmt = 0;
      if (periodicRate > 0) {
          exactAmt = (amount * periodicRate * Math.pow(1 + periodicRate, count)) / (Math.pow(1 + periodicRate, count) - 1);
      } else {
          exactAmt = amount / count;
      }
      return Math.round(exactAmt / roundBase) * roundBase;
  };

  const handleCreateLoan = async () => {
    if (isSubmitting) return;
    if (userRole !== 'admin' && userRole !== 'manager' && userRole !== 'accountant') {
      showNotification('شما دسترسی ثبت وام را ندارید.', 'error');
      return;
    }
    if (!formData.personId || formData.amount === '' || formData.totalInstallments === '' || formData.installmentAmount === '' || !formData.accountId) {
      showNotification('لطفا تمام فیلدهای ضروری را پر کنید.', 'error');
      return;
    }
    const amountNum = Number(formData.amount);
    const instCount = Number(formData.totalInstallments);
    const instAmount = Number(formData.installmentAmount);
    if (amountNum <= 0) {
      showNotification('مبلغ وام باید بیشتر از صفر باشد.', 'error');
      return;
    }
    if (instCount <= 0 || !Number.isInteger(instCount)) {
      showNotification('تعداد اقساط باید یک عدد صحیح و بزرگتر از صفر باشد.', 'error');
      return;
    }
    if (instAmount <= 0) {
      showNotification('مبلغ قسط باید بیشتر از صفر باشد.', 'error');
      return;
    }
    const maxRoundingDiff = instCount;
    if (instCount * instAmount < amountNum && (amountNum - (instCount * instAmount) > maxRoundingDiff)) {
      showNotification('مجموع اقساط نمی‌تواند کمتر از اصل وام باشد.', 'error');
      return;
    }
    if (formData.interestRate !== '' && Number(formData.interestRate) < 0) {
      showNotification('نرخ سود نمی‌تواند منفی باشد.', 'error');
      return;
    }
    setIsSubmitting(true);
    startAppProcessing('اعتبارسنجی وام...');
    try {
      await checkFinancialYear(formData.startDate);
    } catch (err: any) {
      showNotification(err.message || 'تاریخ خارج از سال مالی فعال است.', 'error');
      setIsSubmitting(false);
      stopAppProcessing();
      return;
    }

    const loanId = crypto.randomUUID();
    const loanNumber = Math.floor(10000 + Math.random() * 90000).toString();
    const newLoan: Loan = {
      id: loanId,
      loanNumber,
      personId: formData.personId,
      amount: amountNum,
      interestRate: formData.interestRate === '' ? undefined : Number(formData.interestRate),
      frequency: formData.frequency,
      startDate: convertToGregorian(formData.startDate).split('T')[0], // save as ISO date
      totalInstallments: instCount,
      installmentAmount: instAmount,
      description: formData.description,
      status: 'requested', // Initial status
      type: formData.type,
      accountId: formData.accountId,
      penaltyType: formData.penaltyType,
      penaltyRate: formData.penaltyRate === '' ? undefined : Number(formData.penaltyRate),
      earlySettlementPolicy: formData.earlySettlementPolicy,
      earlySettlementDiscountPercent: formData.earlySettlementDiscountPercent === '' ? undefined : Number(formData.earlySettlementDiscountPercent),
    };
    
    // To english numbers
    const toEnglishNumbers = (str: string) => {
      const persianNumbers = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
      return str.split('').map(c => {
        const index = persianNumbers.indexOf(c);
        return index !== -1 ? index : c;
      }).join('');
    };

    
    const r = formData.interestRate === '' ? 0 : Number(formData.interestRate);
    let targetTotalPayable = amountNum;
    let exactInstAmt = amountNum / instCount;

    if (r > 0) {
        let freq = formData.frequency || 'monthly';
        let periodsPerYear = freq === 'monthly' ? 12 : freq === 'quarterly' ? 4 : 1;
        let periodicRate = (r / 100) / periodsPerYear;
        exactInstAmt = (amountNum * periodicRate * Math.pow(1 + periodicRate, instCount)) / (Math.pow(1 + periodicRate, instCount) - 1);
        targetTotalPayable = Math.round(exactInstAmt * instCount);
    }
    
    // Determine the calendar type and calculate dates
    const calendarType = globalDateFormatter.getConfig().calendarType === 'jalali' ? 'jalali' : 'gregorian';
    const firstDateIso = convertToGregorian(formData.firstInstallmentDate || formData.startDate).split('T')[0];
    const newDates = calculateInstallmentDates(firstDateIso, instCount + 1, formData.frequency || 'monthly', calendarType);
    // newDates[0] is the start date. Installments start from index 1.

    const newInstallments: Installment[] = [];
    let accumulated = 0;

    for (let i = 0; i < instCount; i++) {
      let expectedAccumulated = (i + 1) * exactInstAmt;
      
      if (formData.roundingBase > 0) {
         expectedAccumulated = Math.round(expectedAccumulated / formData.roundingBase) * formData.roundingBase;
      } else {
         expectedAccumulated = Math.round(expectedAccumulated);
      }
      
      if (i === instCount - 1) {
          expectedAccumulated = targetTotalPayable; // The final must exactly match total payable
      }

      let currentInstAmount = expectedAccumulated - accumulated;
      accumulated = expectedAccumulated;
      
      let gregorianDueDate = newDates[i + 1];

      newInstallments.push({
        id: 'inst-' + loanId + '-' + i,
        installmentNumber: i + 1,
        loanId: loanId,
        dueDate: gregorianDueDate,
        amount: currentInstAmount,
        status: 'pending',
        installmentCode: generateInstallmentCode(loanId, newLoan.loanNumber, i, gregorianDueDate),
      });
    }

    setPreviewData({ loan: newLoan, installments: newInstallments });
    setIsSubmitting(false);
    stopAppProcessing();
  };

  const handleFinalSubmitLoan = async () => {
    if (!previewData) return;
    setIsSubmitting(true);
    startAppProcessing('در حال ثبت نهایی وام...');
    const newInstsList = [...installments, ...previewData.installments];
    const newLoansList = [...loans, previewData.loan];
    
    setLoans(newLoansList);
    setInstallments(newInstsList);
    
    try {
      await saveLoans(newLoansList);
      await saveInstallments(newInstsList);
      await addLoanHistoryEntry({
        loanId: previewData.loan.id,
        status: 'requested',
        date: new Date().toISOString(),
        desc: 'ثبت اولیه درخواست وام',
        user: userRole || 'سیستم'
      });
      if (typeof addSystemLog !== 'undefined') {
        await addSystemLog('ADD_LOAN', `ثبت وام جدید به مبلغ ${previewData.loan.amount} برای شخص ${previewData.loan.personId}`, 'Loan', previewData.loan.id);
      }
      showNotification('وام با موفقیت ثبت شد.', 'success');
    } catch (err: any) {
      showNotification(err.message || 'خطا در ذخیره وام', 'error');
      setIsSubmitting(false);
      stopAppProcessing();
      return;
    }
    
    setFormData({
      personId: '',
      amount: '',
      interestRate: '',
      startDate: globalDateFormatter.formatDateOnly(new Date()),
      totalInstallments: '',
      installmentAmount: '',
      description: '',
      type: 'given',
      accountId: '',
      penaltyType: 'none',
      penaltyRate: '',
      earlySettlementPolicy: 'none',
      earlySettlementDiscountPercent: '',
      roundingBase: 1000
    });
    setPreviewData(null);
    navigate('/loans_list');
    setIsSubmitting(false);
    stopAppProcessing();
  };


  const [transitionState, setTransitionState] = useState<{loanId: string | number, newStatus: string} | null>(null);

  const handleUpdateLoanStatus = async (loanId: string | number, newStatus: string) => {
    setTransitionState({ loanId, newStatus });
  };

  const handleRevertInstallment = async (loanId: string | number, instId: string | number) => {
    if (userRole !== 'admin' && userRole !== 'manager') {
      showNotification('شما دسترسی بازگشت قسط را ندارید.', 'error');
      return;
    }
    if (!window.confirm('آیا از بازگشت این قسط به حالت پرداخت‌نشده اطمینان دارید؟')) return;
    
    setIsSubmitting(true);
    try {
       // Delete corresponding transaction
       const txsToDelete = transactions.filter(t => t.id.toString().startsWith(`txn-inst-${instId}`));
       for (const tx of txsToDelete) {
           await deleteTransaction(tx.id);
       }
       setTransactions(transactions.filter(t => !txsToDelete.includes(t)));

       const updatedInstallments = installments.map(i => {
         if (i.id === instId) {
           return { ...i, status: 'pending',
        installmentCode: generateInstallmentCode(loanId, newLoan.loanNumber, i, dueDateStr), paidDate: undefined, paidAmount: undefined };
         }
         return i;
       });
       const loanInstallments = updatedInstallments.filter(i => i.loanId === loanId);
       const allPaid = loanInstallments.every(i => i.status === 'paid');
       
       const updatedLoans = loans.map(l => {
         if (l.id === loanId) {
           return { ...l, status: allPaid ? 'completed' : 'active' };
         }
         return l;
       });

       await saveInstallments(updatedInstallments);
       await saveLoans(updatedLoans);
       setInstallments(updatedInstallments);
       setLoans(updatedLoans);
       
       if (typeof addSystemLog !== 'undefined') {
          await addSystemLog('REVERT_INSTALLMENT', `ابطال پرداخت قسط ${instId}`, 'Installment', instId);
       }
       showNotification('وضعیت قسط به پرداخت‌نشده تغییر یافت.', 'success');
    } catch(err: any) {
       showNotification(err.message || 'خطا در عملیات', 'error');
    }
    setIsSubmitting(false);
  };

  const handleMarkOverdue = async (instId: string | number) => {
    if (userRole !== 'admin' && userRole !== 'manager') {
      showNotification('شما دسترسی تغییر وضعیت قسط را ندارید.', 'error');
      return;
    }
    const updatedInstallments = installments.map(i => i.id === instId ? { ...i, status: 'overdue' as 'overdue' } : i);
    setInstallments(updatedInstallments);
    await saveInstallments(updatedInstallments);
    showNotification('قسط معوقه شد', 'warning');
  };

  const getPersonName = (pid: string | number) => {
    const p = persons.find(x => x.id === pid);
    return p ? p.name : 'نامشخص';
  };

  const getAccountName = (aid: string | number) => {
    const a = accounts.find(x => x.id === aid);
    return a ? a.bankName : 'نامشخص';
  };

  const handleDeleteLoan = async (loanId: string | number) => {
    if (userRole !== 'admin' && userRole !== 'manager') {
      showNotification('شما دسترسی حذف وام را ندارید.', 'error');
      return;
    }
    
    if (!window.confirm('آیا از حذف این وام و اقساط آن اطمینان دارید؟')) {
      return;
    }
    
    setIsSubmitting(true);
    try {
      const loanInsts = installments.filter(i => i.loanId === loanId);
      const instIds = loanInsts.map(i => i.id.toString());
      
      const txsToDelete = transactions.filter(t => {
          const tId = t.id.toString();
          if (tId === `txn-loan-${loanId}`) return true;
          if (tId.startsWith('txn-inst-')) {
               return instIds.some(instId => tId.startsWith(`txn-inst-${instId}`));
          }
          return false;
      });
      
      for (const tx of txsToDelete) {
          await deleteTransaction(tx.id);
      }

      const updatedLoans = loans.filter(l => l.id !== loanId);
      const updatedInstallments = installments.filter(i => i.loanId !== loanId);
      await saveLoans(updatedLoans);
      await saveInstallments(updatedInstallments);
      
      setTransactions(transactions.filter(t => !txsToDelete.includes(t)));
      setLoans(updatedLoans);
      setInstallments(updatedInstallments);
      
      if (typeof addSystemLog !== 'undefined') {
        await addSystemLog('DELETE_LOAN', `حذف وام ${loanId}`, 'Loan', loanId);
      }
      showNotification('وام با موفقیت حذف شد.', 'success');
    } catch (err: any) {
      showNotification(err.message || 'خطا در حذف وام', 'error');
    }
    setIsSubmitting(false);
  };


  const filteredLoans = loans.filter(loan => {
    const matchesSearch = getPersonName(loan.personId).toLowerCase().includes(searchQuery.toLowerCase()) || (loan.loanNumber?.toString() || loan.id.toString()).includes(searchQuery);
    const matchesStatus = statusFilter === 'all' || loan.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const currencyUnit = storeSettings?.currency || 'تومان';
  const finalApprovedLoans = loans.filter(l => ['approved', 'active', 'completed', 'overdue'].includes(l.status));

  return (

    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto hide-scrollbar" dir="rtl">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 drop-shadow-sm mb-2">مدیریت وام و اقساط</h1>
          <p className="text-gray-500 font-medium tracking-tight">وام‌های پرداختی، دریافتی و زمان‌بندی اقساط</p>
        </div>
        
              </div>

      {activeTab === 'create' && (
        <motion.div
           initial={{ opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
           className="bg-white rounded-3xl p-6 md:p-8 shadow-xl shadow-gray-200/50 border border-gray-100"
        >
          <div className="flex items-center gap-3 mb-8">
             <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center">
                <Wallet className="w-6 h-6 text-emerald-600" />
             </div>
             <div>
                <h2 className="text-xl font-black text-gray-800">تعریف وام</h2>
                <p className="text-sm text-gray-500">مشخصات و زمانبندی اقساط را وارد کنید</p>
             </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            <div className="col-span-1 border border-gray-200 rounded-2xl p-1 bg-gray-50/50 flex">
                <button
                   onClick={() => setFormData({...formData, type: 'given'})}
                   className={`flex-1 py-3 text-sm font-black rounded-xl transition-all ${formData.type === 'given' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >پرداختی به شخص</button>
                <button
                   onClick={() => setFormData({...formData, type: 'received'})}
                   className={`flex-1 py-3 text-sm font-black rounded-xl transition-all ${formData.type === 'received' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >دریافتی از شخص</button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
             <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                   <Users className="w-4 h-4 text-gray-400" /> طرف حساب
                </label>
                <SearchableSelect
                  value={formData.personId}
                  onChange={(val) => {
                    setFormData({...formData, personId: val});
                    setUseBalanceAsAmount(false);
                  }}
                  options={(persons || []).filter(p => p.isActive !== false).map(p => ({ value: p.id, label: p.name }))}
                  placeholder="انتخاب شخص..."
                  searchPlaceholder="جستجوی شخص..."
                />
                {selectedPersonBalance && selectedPersonBalance.value !== 0 && (
                   <motion.div initial={{opacity:0, y:-5}} animate={{opacity:1, y:0}} className="pt-2">
                      <div className={`text-xs font-bold p-3 rounded-xl border ${selectedPersonBalance.bg} ${selectedPersonBalance.color} flex flex-col gap-2`}>
                         <div className="flex items-center justify-between">
                            <span>مانده این شخص: {formatCurrency(selectedPersonBalance.amount)} {currencyUnit} ({selectedPersonBalance.status})</span>
                         </div>
                         <button
                            type="button"
                            onClick={() => {
                               const useBal = !useBalanceAsAmount;
                               setUseBalanceAsAmount(useBal);
                               if (useBal) {
                                  setFormData({
                                     ...formData,
                                     amount: selectedPersonBalance.amount,
                                     type: selectedPersonBalance.value > 0 ? 'given' : 'received'
                                  });
                               }
                            }}
                            className="bg-white/60 hover:bg-white px-3 py-1.5 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1.5 mt-1 border-current border border-white/40"
                         >
                            <ArrowLeftRight className="w-3 h-3" />
                            {useBalanceAsAmount ? 'لغو استفاده از مانده' : 'تبدیل کل این مانده به وام'}
                         </button>
                      </div>
                   </motion.div>
                )}
             </div>
             <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                   <DollarSign className="w-4 h-4 text-gray-400" /> مبلغ کل وام
                </label>
                <div className="relative">
                <input
                  type="text"
                  disabled={useBalanceAsAmount}
                  value={formData.amount === '' ? '' : addCommas(formData.amount)}
                  onChange={(e) => {
                     let v = removeCommas(e.target.value);
                     if(v === '') { setFormData({...formData, amount: ''}); return; }
                     if(!isNaN(Number(v))) {
                        let amt = Number(v);
                        let instAmt = formData.installmentAmount;
                        if (formData.totalInstallments) {
                           let r = formData.interestRate === '' ? 0 : Number(formData.interestRate);
                           let instCount = Number(formData.totalInstallments);
                           let freq = formData.frequency || 'monthly';
                           instAmt = calculateInstallment(amt, instCount, r, freq, formData.roundingBase) as any;
                        }
                        setFormData({...formData, amount: amt, installmentAmount: instAmt});
                     }
                  }}
                  className="w-full bg-gray-50 border-2 border-gray-100 focus:border-emerald-500 focus:bg-white rounded-xl pr-4 pl-14 py-3 outline-none transition-all font-black text-left font-mono disabled:opacity-50"
                  dir="ltr"
                />
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">{storeSettings?.currency || 'تومان'}</span>
                </div>
             </div>
             
               <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                    <Wallet className="w-4 h-4 text-gray-400" /> حساب بانکی / صندوق
                  </label>
                  <select
                    value={formData.accountId}
                    onChange={(e) => setFormData({...formData, accountId: e.target.value})}
                    className="w-full bg-gray-50 border-2 border-gray-100 focus:border-emerald-500 focus:bg-white rounded-xl pr-4 pl-14 py-3 outline-none transition-all font-medium"
                  >
                    <option value="">انتخاب حساب...</option>
                    {(accounts || []).map(a => (
                      <option key={a.id} value={a.id}>{a.bankName}</option>
                    ))}
                  </select>
               </div>


             <div className="space-y-2">
                 <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-400" /> تاریخ ثبت درخواست
                 </label>
                 <CustomDatePicker
                   value={formData.startDate}
                   format="YYYY/MM/DD"
                   onChange={(val: string) => setFormData({...formData, startDate: val})}
                   inputClass="w-full bg-gray-50 border-2 border-gray-100 focus:border-emerald-500 focus:bg-white rounded-xl px-4 py-3 outline-none transition-all font-medium text-slate-800"
                   containerClassName="w-full"
                 />
              </div>

             <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                   <span className="flex items-center justify-center w-4 h-4 rounded-full bg-gray-200 text-gray-500 font-bold text-[10px]">%</span> درصد کارمزد (سالیانه/کلی)
                </label>
                <input
                  type="number"
                  disabled={useBalanceAsAmount}
                  value={formData.interestRate}
                  onChange={(e) => {
                     let rate = (e.target.value === '' ? '' : Number(e.target.value)) as any;
                     let instAmt = '' as any;
                     if (formData.amount && formData.totalInstallments) {
                        let r = rate === '' ? 0 : Number(rate);
                        let amt = Number(formData.amount);
                        let instCount = Number(formData.totalInstallments);
                        let freq = formData.frequency || 'monthly';
                        instAmt = calculateInstallment(amt, instCount, r, freq, formData.roundingBase);
                     }
                     setFormData({...formData, interestRate: rate, installmentAmount: instAmt});
                  }}
                  className="w-full bg-gray-50 border-2 border-gray-100 focus:border-emerald-500 focus:bg-white rounded-xl pr-4 pl-14 py-3 outline-none transition-all font-black text-left font-mono disabled:opacity-50"
                  dir="ltr"
                />
             </div>



             <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                   <Layers className="w-4 h-4 text-gray-400" /> رند کردن اقساط
                </label>
                <select
                  value={formData.roundingBase}
                  onChange={(e) => {
                     const roundBase = Number(e.target.value);
                     
                     let instAmt = formData.installmentAmount;
                     if (formData.amount && formData.totalInstallments) {
                        let r = formData.interestRate === '' ? 0 : Number(formData.interestRate);
                        let amt = Number(formData.amount);
                        let instCount = Number(formData.totalInstallments);
                        let freq = formData.frequency || 'monthly';
                        instAmt = calculateInstallment(amt, instCount, r, freq, roundBase);
                     }
                        
                     setFormData({...formData, roundingBase: roundBase, installmentAmount: instAmt});
                  }}
                  className="w-full bg-gray-50 border-2 border-gray-100 focus:border-emerald-500 focus:bg-white rounded-xl pr-4 pl-4 py-3 outline-none transition-all font-medium text-slate-800"
                >
                  <option value={1}>بدون رند کردن (دقیق)</option>
                  <option value={1000}>رند به هزار</option>
                  <option value={10000}>رند به ده هزار</option>
                  <option value={50000}>رند به پنجاه هزار</option>
                  <option value={100000}>رند به صد هزار</option>
                </select>
             </div>

             <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                   <Layers className="w-4 h-4 text-gray-400" /> تواتر / دوره‌های پرداخت
                </label>
                <select
                  value={formData.frequency || 'monthly'}
                  onChange={(e) => {
                     const freq = e.target.value as 'monthly' | 'quarterly' | 'yearly';
                     
                     let instAmt = formData.installmentAmount;
                     if (formData.amount && formData.totalInstallments) {
                        let r = formData.interestRate === '' ? 0 : Number(formData.interestRate);
                        let amt = Number(formData.amount);
                        let instCount = Number(formData.totalInstallments);
                        instAmt = calculateInstallment(amt, instCount, r, freq, formData.roundingBase);
                     }
                     
                     setFormData({...formData, frequency: freq, installmentAmount: instAmt});
                  }}
                  className="w-full bg-gray-50 border-2 border-gray-100 focus:border-emerald-500 focus:bg-white rounded-xl pr-4 pl-14 py-3 outline-none transition-all font-medium text-slate-800"
                >
                  <option value="monthly">ماهانه</option>
                  <option value="quarterly">سه ماهه (فصلی)</option>
                  <option value="yearly">سالانه</option>
                </select>
             </div>
             <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                   <Layers className="w-4 h-4 text-gray-400" /> تعداد اقساط
                </label>
                <input
                  type="number"
                  value={formData.totalInstallments}
                  onChange={(e) => {
                     const val = e.target.value === '' ? '' : Number(e.target.value);
                     let instAmt = formData.installmentAmount;
                     if (formData.amount && val !== '') {
                        let r = formData.interestRate === '' ? 0 : Number(formData.interestRate);
                        let amt = Number(formData.amount);
                        let instCount = Number(val);
                        let freq = formData.frequency || 'monthly';
                        instAmt = calculateInstallment(amt, instCount, r, freq, formData.roundingBase);
                     }
                     setFormData({...formData, totalInstallments: val, installmentAmount: instAmt});
                  }}
                  className="w-full bg-gray-50 border-2 border-gray-100 focus:border-emerald-500 focus:bg-white rounded-xl pr-4 pl-14 py-3 outline-none transition-all font-black font-mono text-left"
                  dir="ltr"
                />
             </div>
             <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                   <Activity className="w-4 h-4 text-gray-400" /> مبلغ هر قسط
                </label>
                <input
                  type="text"
                  value={formData.installmentAmount === '' ? '' : addCommas(formData.installmentAmount)}
                  onChange={(e) => {
                     let v = removeCommas(e.target.value);
                     if(v === '') { setFormData({...formData, installmentAmount: ''}); return; }
                     if(!isNaN(Number(v))) setFormData({...formData, installmentAmount: Number(v)});
                  }}
                  className="w-full bg-gray-50 border-2 border-gray-100 focus:border-emerald-500 focus:bg-white rounded-xl pr-4 pl-14 py-3 outline-none transition-all font-black text-left font-mono"
                  dir="ltr"
                />
             </div>
             <div className="space-y-2 lg:col-span-3">
                <div className="p-4 bg-orange-50 border border-orange-100 rounded-xl mb-4">
                  <h4 className="font-bold text-orange-800 mb-4 flex items-center gap-2">
                     <Settings className="w-4 h-4" /> تنظیمات قوانین وام (دیرکرد و تسویه)
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-orange-700">نوع جریمه دیرکرد</label>
                      <select 
                        value={formData.penaltyType} 
                        onChange={e => setFormData({...formData, penaltyType: e.target.value as any})}
                        className="w-full bg-white border border-orange-200 rounded-lg p-2 outline-none text-sm"
                      >
                        <option value="none">بدون جریمه</option>
                        <option value="fixed_per_day">مبلغ ثابت روزانه</option>
                        <option value="percent_per_day">درصد روزانه از مبلغ قسط</option>
                        <option value="fixed_per_month">مبلغ ثابت ماهانه</option>
                        <option value="percent_per_month">درصد ماهانه از مبلغ قسط</option>
                      </select>
                    </div>
                    {formData.penaltyType !== 'none' && (
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-orange-700">
                          {formData.penaltyType.includes('fixed') ? 'مبلغ جریمه (ریال)' : 'درصد جریمه (%)'}
                        </label>
                        <input 
                          type="number"
                          value={formData.penaltyRate}
                          onChange={e => setFormData({...formData, penaltyRate: e.target.value === '' ? '' : Number(e.target.value)})}
                          className="w-full bg-white border border-orange-200 rounded-lg p-2 outline-none text-sm"
                        />
                      </div>
                    )}
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-orange-700">سیاست تسویه زودتر از موعد</label>
                      <select 
                        value={formData.earlySettlementPolicy} 
                        onChange={e => setFormData({...formData, earlySettlementPolicy: e.target.value as any})}
                        className="w-full bg-white border border-orange-200 rounded-lg p-2 outline-none text-sm"
                      >
                        <option value="none">بدون تخفیف</option>
                        <option value="discount_interest">تخفیف در کارمزد/سود</option>
                      </select>
                    </div>
                    {formData.earlySettlementPolicy === 'discount_interest' && (
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-orange-700">درصد تخفیف کارمزد (%)</label>
                        <input 
                          type="number"
                          value={formData.earlySettlementDiscountPercent}
                          onChange={e => setFormData({...formData, earlySettlementDiscountPercent: e.target.value === '' ? '' : Number(e.target.value)})}
                          className="w-full bg-white border border-orange-200 rounded-lg p-2 outline-none text-sm"
                        />
                      </div>
                    )}
                  </div>
                </div>

                <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                    توضیحات (اختیاری)
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className="w-full bg-gray-50 border-2 border-gray-100 focus:border-emerald-500 focus:bg-white rounded-xl pr-4 pl-14 py-3 outline-none transition-all font-medium resize-none min-h-[100px]"
                />
             </div>
          </div>

          <div className="flex justify-end border-t border-gray-100 pt-6">
             <button
               disabled={isSubmitting}
               onClick={handleCreateLoan}
               className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3.5 rounded-xl font-bold flex items-center gap-2 transition-all transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
             >
                <Plus className="w-5 h-5"/>
                ثبت وام و ایجاد سررسید
             </button>
          </div>
        </motion.div>
      )}

      {activeTab === 'dashboard' && (
           <LoansDashboard formatCurrency={formatCurrency} loans={finalApprovedLoans} installments={installments} persons={persons} storeSettings={storeSettings}
             initialLoanId={selectedLoanForPayment} />
        )}
        
        {activeTab === 'arrears' && (
           <LoansArrears formatCurrency={formatCurrency} loans={finalApprovedLoans} installments={installments} persons={persons} storeSettings={storeSettings} />
        )}

        {activeTab === 'reports' && (
           <LoansReports formatCurrency={formatCurrency} loans={finalApprovedLoans} installments={installments} persons={persons} />
        )}

        {activeTab === 'settings' && (
           <LoansSettings showNotification={showNotification} userRole={userRole} />
        )}
        
      
            {transitionState && (
        <LoanTransitionModal
          isOpen={true}
          onClose={() => setTransitionState(null)}
          loan={loans.find(l => l.id === transitionState.loanId) as Loan}
          targetStatus={transitionState.newStatus as any}
          userRole={userRole}
          LOAN_STATUS_LABELS={LOAN_STATUS_LABELS}
          showNotification={showNotification}
          onSuccess={(updatedLoan) => {
            setLoans(loans.map(l => l.id === updatedLoan.id ? updatedLoan : l));
            // Trigger refresh of other data (transactions, docs) if needed, but since it's a demo, the user can reload or we can fetch.
            // Ideally we should refetch global data here.
          }}
        />
      )}
      
      {activeTab === 'payment' && (
         <InstallmentPaymentTerminal
             showNotification={showNotification}
             formatCurrency={formatCurrency}
             onBack={() => navigate("/loans_list")}
             userId={currentUser}
           />
        )}

        {activeTab === 'list'  && (
        <motion.div 
           initial={{ opacity: 0 }} 
           animate={{ opacity: 1 }} 
           className="space-y-6"
        >
          
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
             <div className="relative flex-1">
               <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                 <Search className="h-5 w-5 text-gray-400" />
               </div>
               <input
                 type="text"
                 className="block w-full pl-3 pr-10 py-2 border border-gray-300 rounded-xl leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                 placeholder="جستجو در وام‌ها (نام شخص یا شماره وام)..."
                 value={searchQuery}
                 onChange={(e) => setSearchQuery(e.target.value)}
               />
             </div>
             <div className="w-full sm:w-48">
               <select
                 className="block w-full pl-3 pr-3 py-2 border border-gray-300 rounded-xl leading-5 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                 value={statusFilter}
                 onChange={(e) => setStatusFilter(e.target.value)}
               >
                 <option value="all">همه وضعیت‌ها</option>
                 <option value="requested">درخواست</option>
                 <option value="incomplete">نقص پرونده</option>
                 <option value="completed_dossier">تکمیل پرونده</option>
                 <option value="approved">تایید شده</option>
                 <option value="active">پرداخت شده / در جریان</option>
                 <option value="completed">تسویه شده</option>
                 <option value="overdue">معوق</option>
               </select>
             </div>
          </div>

          {filteredLoans.length === 0 ? (
             <div className="bg-white rounded-3xl p-12 text-center border-2 border-dashed border-gray-200">
               <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                 <Wallet className="w-10 h-10 text-gray-300"/>
               </div>
               <h3 className="text-xl font-black text-gray-800 mb-2">هیچ وامی ثبت نشده است</h3>
               <p className="text-gray-400 font-medium">برای ثبت وام جدید از تب «ثبت وام جدید» استفاده کنید.</p>
             </div>
          ) : (
            filteredLoans.map(loan => {
               const loanInsts = (installments || []).filter(i => i.loanId === loan.id);
               const paidInsts = loanInsts.filter(i => i.status === 'paid').length;
               const totalInsts = loanInsts.length;
               const isExpanded = expandedLoanId === loan.id;

               return (
                 <div key={loan.id} className={`bg-white rounded-2xl border ${isExpanded ? 'border-indigo-200 shadow-md ring-4 ring-indigo-50' : 'border-gray-100 shadow-sm'} overflow-hidden transition-all hover:border-gray-200 hover:shadow-md`}>
                    <div className="p-6 flex flex-col lg:flex-row items-center gap-6 cursor-pointer" onClick={() => navigate('/loan/' + loan.id)}>
                       
                       <div className="flex-shrink-0 w-14 h-14 rounded-2xl flex items-center justify-center" style={{backgroundColor: loan.type === 'given' ? '#eff6ff' : '#ecfdf5'}}>
                          <Wallet className={`w-7 h-7 ${loan.type === 'given' ? 'text-blue-500' : 'text-emerald-500'}`}/>
                       </div>

                       <div className="flex-1 w-full flex flex-col md:flex-row md:items-center justify-between gap-6">
                          
                         <div>
                            <div className="flex flex-wrap items-center gap-3 mb-1.5">
                               <h3 className="text-lg font-black text-gray-800">{getPersonName(loan.personId)}</h3>
                               <span className={`px-2.5 py-1 rounded-lg text-xs font-black ${loan.type === 'given' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                  {loan.type === 'given' ? 'پرداختی' : 'دریافتی'}
                               </span>
                               <span className={`px-2.5 py-1 rounded-lg text-xs font-black ${LOAN_STATUS_COLORS[loan.status] || 'bg-gray-100 text-gray-600'}`}>{LOAN_STATUS_LABELS[loan.status] || 'نامشخص'}</span>
                               <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-lg text-xs font-bold font-mono" dir="ltr">
                                  #{loan.loanNumber || loan.id}
                               </span>
                            </div>
                            <div className="flex flex-wrap items-center gap-4 text-sm font-medium text-gray-500">
                               <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4"/> تاریخ: {formatDateDisplay(loan.startDate)}</span>
                               <span className="flex items-center gap-1.5"><Layers className="w-4 h-4"/> اقساط: {totalInsts} {loan.frequency === 'yearly' ? '(سالانه)' : loan.frequency === 'quarterly' ? '(فصلی)' : '(ماهانه)'}</span>
                               {loan.interestRate && <span className="flex items-center gap-1.5"><Percent className="w-4 h-4"/> سود: {loan.interestRate}٪</span>}
                            </div>
                         </div>

                         <div className="flex flex-col md:items-end gap-1">
                            <span className="text-xl font-black font-mono text-gray-900 tracking-tight" dir="ltr">{formatCurrency(loan.amount)} {currencyUnit}</span>
                            <div className="flex items-center gap-2 text-sm font-medium text-gray-500">
                               <span>پرداخت شده: {paidInsts} از {totalInsts}</span>
                               <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                                  <div className="h-full bg-emerald-500 rounded-full" style={{width: `${(paidInsts/totalInsts)*100}%`}}></div>
                               </div>
                            </div>
                            <div className="flex items-center gap-2 mt-2">
                               <button 
                                  onClick={(e) => { e.stopPropagation(); navigate('/loan/' + loan.id); }}
                                  className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all bg-indigo-50 text-indigo-700 hover:bg-indigo-100`}
                               >
                                  کارت وام (جزئیات و عملیات)
                               </button>
                            </div>
                         </div>
                       </div>
                    </div>
                    
                    
                 </div>
               );
            })
          )}
        </motion.div>
      )}

      {previewData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]"
          >
            <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-gray-50/50">
              <h2 className="text-xl font-black text-gray-800">پیش‌نمایش اقساط وام</h2>
              <button onClick={() => setPreviewData(null)} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
                 <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto custom-scrollbar flex-1 bg-white">
               <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                     <span className="text-xs text-gray-500 font-bold block mb-1">مبلغ وام</span>
                     <span className="text-lg font-black text-gray-800">{formatCurrency(previewData.loan.amount)} {storeSettings?.currency || 'تومان'}</span>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                     <span className="text-xs text-gray-500 font-bold block mb-1">مبلغ هر قسط</span>
                     <span className="text-lg font-black text-gray-800">{formatCurrency(previewData.loan.installmentAmount)} {storeSettings?.currency || 'تومان'}</span>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                     <span className="text-xs text-gray-500 font-bold block mb-1">تعداد اقساط</span>
                     <span className="text-lg font-black text-gray-800">{previewData.loan.totalInstallments} قسط</span>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                     <span className="text-xs text-gray-500 font-bold block mb-1">شخص</span>
                     <span className="text-base font-black text-gray-800">{persons.find(p => p.id === previewData.loan.personId)?.name || 'نامشخص'}</span>
                  </div>
               </div>

               <h3 className="text-sm font-black text-gray-800 mb-3 flex items-center gap-2">
                 <List className="w-4 h-4 text-emerald-500" /> لیست اقساط
               </h3>
               
               <div className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm">
                  <table className="w-full text-sm text-right">
                     <thead className="bg-gray-50 text-gray-600 font-bold border-b border-gray-200">
                        <tr>
                           <th className="p-3">ردیف</th>
                           <th className="p-3">سررسید</th>
                           <th className="p-3">مبلغ قسط</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-gray-100">
                        {previewData.installments.map((inst, idx) => (
                           <tr key={inst.id} className="hover:bg-gray-50/50 transition-colors">
                              <td className="p-3 font-bold text-gray-600">{idx + 1}</td>
                              <td className="p-3 font-mono font-medium">{formatDateDisplay(inst.dueDate)}</td>
                              <td className="p-3 font-black text-gray-900">{formatCurrency(inst.amount)} {currencyUnit}</td>
                           </tr>
                        ))}
                     </tbody>
                  </table>
               </div>
            </div>
            <div className="p-6 border-t border-gray-100 bg-gray-50/50 flex flex-wrap justify-between items-center gap-4">
              <button
                 onClick={() => setPrintingLoanId('preview')}
                 className="bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all shadow-sm"
              >
                 <Printer className="w-4 h-4" />
                 چاپ پیش‌نمایش
              </button>
              <div className="flex items-center gap-3">
                 <button
                    onClick={() => setPreviewData(null)}
                    className="px-6 py-2.5 rounded-xl font-bold text-gray-500 hover:bg-gray-200 transition-all"
                 >
                    انصراف
                 </button>
                 <button
                    disabled={isSubmitting}
                    onClick={handleFinalSubmitLoan}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all shadow-md shadow-emerald-600/20 disabled:opacity-50"
                 >
                    <CheckCircle className="w-5 h-5" />
                    تایید و ثبت نهایی
                 </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
      {printingLoanId && (
        <InstallmentBookletPrint 
          loan={printingLoanId === 'preview' && previewData ? previewData.loan : loans.find(l => l.id === printingLoanId) as Loan} 
          installments={printingLoanId === 'preview' && previewData ? previewData.installments : (installments || []).filter(i => i.loanId === printingLoanId)} 
          person={persons.find(p => p.id?.toString() === (printingLoanId === 'preview' && previewData ? previewData.loan.personId?.toString() : loans.find(l => l.id === printingLoanId)?.personId?.toString()))} 
          onClose={() => setPrintingLoanId(null)} 
          formatCurrency={formatCurrency}
          currency={storeSettings?.currency || 'تومان'}
        />
      )}
    </div>
  );
}
