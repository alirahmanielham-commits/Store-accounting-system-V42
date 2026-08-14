import React, { useState, useEffect, useMemo } from 'react';
import { 
  RefreshCw, CheckSquare, Search, Save, AlertCircle, FileText, 
  CheckCircle2, ArrowLeft, ArrowRight, User, TrendingDown, 
  DollarSign, Calendar, ChevronRight, Sparkles, Filter, Trash2, 
  Sliders, Info, HelpCircle, ArrowUpRight, ArrowDownLeft, X,
  FileSpreadsheet, ClipboardCheck
} from 'lucide-react';
import { getPersons, getInvoices, getTransactions, updateInvoice, updateTransaction, getStoreSettings } from '../../services/dataService';
import Select from 'react-select';
import { motion, AnimatePresence } from 'motion/react';

export default function InvoiceAllocation({ 
  customAlert,
  formatCurrency,
  getDefaultExchangeRate
}: { 
  customAlert?: (msg: string) => void,
  formatCurrency: (n: number) => string,
  getDefaultExchangeRate: (inc: string, stc: string) => number
}) {
  const alertUser = customAlert || alert;
  
  const [loading, setLoading] = useState(false);
  const [persons, setPersons] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [storeSettings, setStoreSettings] = useState<any>({ currency: 'تومان' });
  
  const [selectedPersonId, setSelectedPersonId] = useState<string | number | ''>('');
  const [selectedTxId, setSelectedTxId] = useState<string | null>(null);
  
  // Local allocations state: transactionId -> invoiceId -> amount
  const [allocations, setAllocations] = useState<Record<string, Record<string, number>>>({});
  
  // Search and filter states
  const [txSearchTerm, setTxSearchTerm] = useState('');
  const [txTypeFilter, setTxTypeFilter] = useState<'all' | 'receive' | 'pay'>('all');
  const [txStatusFilter, setTxStatusFilter] = useState<'all' | 'open' | 'allocated'>('all');
  
  const [invSearchTerm, setInvSearchTerm] = useState('');
  const [invStatusFilter, setInvStatusFilter] = useState<'all' | 'unpaid' | 'allocated'>('all');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const p = await getPersons();
      const inv = await getInvoices();
      const tx = await getTransactions();
      const s = await getStoreSettings();
      setPersons(p);
      setInvoices(inv);
      setTransactions(tx);
      setStoreSettings(s || { currency: 'تومان' });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const personOptions = useMemo(() => {
    return (persons || []).filter(p => p.isActive !== false).map(p => ({
      value: p.id,
      label: `${p.personCode ? '[' + p.personCode + '] ' : ''}${p.alias || p.name}`
    }));
  }, [persons]);

  // Filter open invoices for the selected person
  const openInvoices = useMemo(() => {
    if (!selectedPersonId) return [];
    return (invoices || []).filter(inv => 
      inv.customerId?.toString() === selectedPersonId.toString() && 
      (inv.type === 'sale' || inv.type === 'purchase' || inv.type === 'sale_return' || inv.type === 'purchase_return') && inv.status !== 'voided' && !inv.isDeleted && inv.status !== 'draft' && !inv.isDraft && 
      (inv.paymentStatus !== 'paid' || 
        transactions.some(t => t.personId?.toString() === selectedPersonId.toString() && t.linkedInvoices?.[inv.id] > 0)
      )
    );
  }, [invoices, selectedPersonId, transactions]);

  // Initialize allocations from DB when a person is selected
  useEffect(() => {
    if (selectedPersonId) {
      const initialAllocations: Record<string, Record<string, number>> = {};
      (transactions || []).filter(tx => tx.personId?.toString() === selectedPersonId.toString()).forEach(tx => {
        if (tx.linkedInvoices && Object.keys(tx.linkedInvoices).length > 0) {
          initialAllocations[tx.id] = { ...tx.linkedInvoices };
        }
      });
      setAllocations(initialAllocations);
      setSelectedTxId(null); // Reset selection
    } else {
      setAllocations({});
      setSelectedTxId(null);
    }
  }, [selectedPersonId, transactions]);

  // Calculate unallocated amounts on the fly based on current allocations state
  const openTransactions = useMemo(() => {
    if (!selectedPersonId) return [];
    
    return (transactions || [])
      .filter(tx => 
        tx.personId?.toString() === selectedPersonId.toString() && 
        (tx.type === 'receive' || tx.type === 'pay')
      )
      .map(tx => {
        const localAllocations = Object.values(allocations[tx.id] || {}).reduce((sum, val) => sum + (Number(val) || 0), 0);
        return {
          ...tx,
          unallocatedLocal: (tx.amount || 0) - localAllocations,
          allocatedLocal: localAllocations
        };
      });
  }, [transactions, selectedPersonId, allocations]);

  // Filter and search transactions for the left sidebar
  const filteredTransactions = useMemo(() => {
    return openTransactions.filter(tx => {
      // 1. Search term match
      const receiptNo = (tx.receiptNumber || tx.id || '').toString();
      const matchSearch = receiptNo.includes(txSearchTerm) || 
                          tx.amount.toString().includes(txSearchTerm) || 
                          (tx.jalaliDate && tx.jalaliDate.includes(txSearchTerm)) ||
                          (tx.description && tx.description.includes(txSearchTerm));
      
      if (!matchSearch) return false;

      // 2. Type Filter
      if (txTypeFilter !== 'all' && tx.type !== txTypeFilter) return false;

      // 3. Status Filter
      if (txStatusFilter === 'open' && tx.unallocatedLocal <= 0) return false;
      if (txStatusFilter === 'allocated' && tx.allocatedLocal <= 0) return false;

      return true;
    });
  }, [openTransactions, txSearchTerm, txTypeFilter, txStatusFilter]);

  // Get current selected transaction data
  const selectedTx = useMemo(() => {
    if (!selectedTxId) return null;
    return openTransactions.find(t => t.id.toString() === selectedTxId.toString()) || null;
  }, [openTransactions, selectedTxId]);

  // Filter eligible invoices for the selected transaction
  const eligibleInvoicesForSelectedTx = useMemo(() => {
    if (!selectedTx) return [];
    const isReceive = selectedTx.type === 'receive';
    
    // Receives can be allocated to Sales & Purchase Returns
    // Pays can be allocated to Purchases & Sale Returns
    const baseInvoices = openInvoices.filter(inv => 
      isReceive 
        ? (inv.type === 'sale' || inv.type === 'purchase_return') 
        : (inv.type === 'purchase' || inv.type === 'sale_return')
    );

    // Filter by search and status
    return baseInvoices.filter(inv => {
      const invNo = (inv.invoiceNumber || inv.id || '').toString();
      const matchSearch = invNo.includes(invSearchTerm) || 
                          (inv.jalaliDate && inv.jalaliDate.includes(invSearchTerm)) ||
                          (inv.totalAmount && inv.totalAmount.toString().includes(invSearchTerm));
      
      if (!matchSearch) return false;

      const currentAllocated = allocations[selectedTx.id]?.[inv.id] || 0;
      if (invStatusFilter === 'allocated' && currentAllocated <= 0) return false;
      
      return true;
    });
  }, [selectedTx, openInvoices, invSearchTerm, invStatusFilter, allocations]);

  // Handle individual allocation value updates
  const handleAllocationChange = (txId: string, invId: string, amount: number, maxAllowedInv: number, maxAllowedTx: number) => {
    let cleanAmount = amount;
    if (cleanAmount < 0 || isNaN(cleanAmount)) cleanAmount = 0;
    
    if (cleanAmount > maxAllowedTx) cleanAmount = maxAllowedTx;
    if (cleanAmount > maxAllowedInv) cleanAmount = maxAllowedInv;
    
    setAllocations(prev => ({
      ...prev,
      [txId]: {
        ...(prev[txId] || {}),
        [invId]: cleanAmount
      }
    }));
  };

  // Smart Auto-Allocation: Allocate oldest invoices chronologically up to unallocated balance
  const handleSmartAllocate = () => {
    if (!selectedTx) return;
    
    const isReceive = selectedTx.type === 'receive';
    const baseInvoices = openInvoices.filter(inv => 
      isReceive 
        ? (inv.type === 'sale' || inv.type === 'purchase_return') 
        : (inv.type === 'purchase' || inv.type === 'sale_return')
    );

    // Sort by Date/ID chronologically (oldest first)
    const sortedInvoices = [...baseInvoices].sort((a, b) => {
      const dateA = a.jalaliDate || '';
      const dateB = b.jalaliDate || '';
      return dateA.localeCompare(dateB) || Number(a.id) - Number(b.id);
    });

    let remainingFund = selectedTx.amount; // Use original amount to recalculate fresh allocations
    const newTxAllocations: Record<string, number> = {};

    sortedInvoices.forEach(inv => {
      const total = (inv.totalAmount || 0) * (getDefaultExchangeRate ? getDefaultExchangeRate(inv.currency, storeSettings.currency) : 1);
      const paidInDB = (inv.paidAmount || 0);
      
      let oldAllocationsSum = 0;
      (transactions || []).filter(t => t.personId?.toString() === selectedPersonId.toString()).forEach(t => {
        oldAllocationsSum += (t.linkedInvoices?.[inv.id] || 0);
      });
      
      const basePaid = paidInDB - oldAllocationsSum;
      
      let otherTxNewAllocations = 0;
      Object.entries(allocations).forEach(([tId, invs]) => {
        if (tId !== String(selectedTx.id) && invs[inv.id]) {
          otherTxNewAllocations += invs[inv.id];
        }
      });
      
      const currentRemainder = Math.max(total - basePaid - otherTxNewAllocations, 0);
      
      if (currentRemainder > 0 && remainingFund > 0) {
        const allocAmount = Math.min(currentRemainder, remainingFund);
        newTxAllocations[inv.id] = allocAmount;
        remainingFund -= allocAmount;
      }
    });

    setAllocations(prev => ({
      ...prev,
      [selectedTx.id]: newTxAllocations
    }));

    showFeedbackNotification('تخصیص هوشمند با موفقیت بر اساس تاریخ سررسید اعمال شد.', 'success');
  };

  // Reset allocations for the selected receipt
  const handleResetSelectedTxAllocations = () => {
    if (!selectedTx) return;
    setAllocations(prev => {
      const copy = { ...prev };
      delete copy[selectedTx.id];
      return copy;
    });
    showFeedbackNotification('تمامی تخصیص‌های این سند موقتاً بازنشانی شدند.', 'info');
  };

  // Temporary floating notifications
  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);
  const showFeedbackNotification = (message: string, type: 'success' | 'info' | 'error') => {
    setFeedback({ message, type });
    setTimeout(() => setFeedback(null), 3000);
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      let hasChanges = false;
      // Process each transaction that has allocations OR had allocations
      const allTxIds = Array.from(new Set([
        ...Object.keys(allocations),
        ...(transactions || []).filter(t => t.personId?.toString() === selectedPersonId.toString() && t.linkedInvoices && Object.keys(t.linkedInvoices).length > 0).map(t => t.id.toString())
      ]));

      for (const txId of allTxIds) {
        const tx = transactions.find(t => t.id.toString() === txId);
        if (!tx) continue;
        
        const oldLinkedInvoices = tx.linkedInvoices || {};
        const newLinkedInvoices = { ...(allocations[txId] || {}) };
        
        // Clean up zeros
        Object.keys(newLinkedInvoices).forEach(k => {
          if (!newLinkedInvoices[k]) delete newLinkedInvoices[k];
        });

        let txChanged = false;
        
        // Apply diff to invoices
        const allInvIds = Array.from(new Set([...Object.keys(oldLinkedInvoices), ...Object.keys(newLinkedInvoices)]));
        
        for (const invId of allInvIds) {
          const oldAmt = oldLinkedInvoices[invId] || 0;
          const newAmt = newLinkedInvoices[invId] || 0;
          const diff = newAmt - oldAmt;
          
          if (diff !== 0) {
            txChanged = true;
            hasChanges = true;
            
            const inv = invoices.find(i => i.id.toString() === invId);
            if (inv) {
              const newPaid = Math.max((inv.paidAmount || 0) + diff, 0);
              const total = (inv.totalAmount || 0) * (getDefaultExchangeRate ? getDefaultExchangeRate(inv.currency, storeSettings.currency) : 1);
              const newStatus = newPaid >= total ? 'paid' : (newPaid > 0 ? 'partial' : 'pending');
              await updateInvoice(inv.id, { ...inv, paidAmount: newPaid, paymentStatus: newStatus });
            }
          }
        }
        
        if (txChanged) {
          await updateTransaction(tx.id, { ...tx, linkedInvoices: newLinkedInvoices });
        }
      }
      
      if (hasChanges) {
        alertUser('تخصیص‌ها با موفقیت در بانک اطلاعاتی ثبت و اعمال شدند.');
        await fetchData(); // refresh data
      } else {
        alertUser('هیچ تغییری برای ثبت وجود ندارد.');
      }
    } catch(err) {
      console.error(err);
      alertUser('خطا در ثبت اطلاعات.');
    } finally {
      setLoading(false);
    }
  };

  // Helper to count modified transactions and draft amount
  const draftStats = useMemo(() => {
    let modifiedCount = 0;
    let totalAllocatedDraft = 0;

    Object.entries(allocations).forEach(([txId, invs]) => {
      const originalTx = transactions.find(t => t.id.toString() === txId);
      const originalLinked = originalTx?.linkedInvoices || {};
      
      // Check if it actually differs from original DB state
      let differs = false;
      const allKeys = new Set([...Object.keys(originalLinked), ...Object.keys(invs)]);
      for (const k of allKeys) {
        if ((originalLinked[k] || 0) !== (invs[k] || 0)) {
          differs = true;
          break;
        }
      }

      if (differs) {
        modifiedCount++;
      }

      totalAllocatedDraft += Object.values(invs).reduce((sum, v) => sum + (v || 0), 0);
    });

    return { modifiedCount, totalAllocatedDraft };
  }, [allocations, transactions]);

  // Overall statistics for the selected person
  const personOverallStats = useMemo(() => {
    if (!selectedPersonId) return null;
    
    const personTxs = openTransactions;
    const totalFunds = personTxs.reduce((sum, t) => sum + t.amount, 0);
    const unallocatedFunds = personTxs.reduce((sum, t) => sum + t.unallocatedLocal, 0);
    
    // Invoices outstanding totals
    let totalInvoicesAmt = 0;
    let unpaidInvoicesAmt = 0;

    openInvoices.forEach(inv => {
      const total = (inv.totalAmount || 0) * (getDefaultExchangeRate ? getDefaultExchangeRate(inv.currency, storeSettings.currency) : 1);
      const paidInDB = (inv.paidAmount || 0);
      
      let oldAllocationsSum = 0;
      (transactions || []).filter(t => t.personId?.toString() === selectedPersonId.toString()).forEach(t => {
        oldAllocationsSum += (t.linkedInvoices?.[inv.id] || 0);
      });
      
      const basePaid = paidInDB - oldAllocationsSum;
      const currentRemainder = Math.max(total - basePaid, 0);

      totalInvoicesAmt += total;
      unpaidInvoicesAmt += currentRemainder;
    });

    return {
      totalFunds,
      unallocatedFunds,
      allocatedFunds: totalFunds - unallocatedFunds,
      totalInvoicesAmt,
      unpaidInvoicesAmt
    };
  }, [selectedPersonId, openTransactions, openInvoices, transactions]);

  const currency = storeSettings?.currency || 'تومان';

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6" dir="rtl">
      {/* Toast Feedback */}
      <AnimatePresence>
        {feedback && (
          <motion.div 
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 px-5 py-3.5 rounded-xl border shadow-lg text-xs font-black ${
              feedback.type === 'success' 
                ? 'bg-emerald-50 text-emerald-800 border-emerald-100' 
                : feedback.type === 'info'
                ? 'bg-indigo-50 text-indigo-800 border-indigo-100'
                : 'bg-rose-50 text-rose-800 border-rose-100'
            }`}
          >
            {feedback.type === 'success' ? <CheckCircle2 className="w-4.5 h-4.5 text-emerald-600" /> : <Info className="w-4.5 h-4.5 text-indigo-600" />}
            <span>{feedback.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Header Card */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100/50">
            <ClipboardCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-800">تخصیص هوشمند دریافت‌ها و پرداخت‌ها به فاکتورها</h1>
            <p className="text-xs text-slate-500 mt-1">تطبیق و پیوند تراکنش‌های مالی به فاکتورهای فروش/خرید با تفکیک بر اساس اشخاص</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={fetchData} 
            className="p-2.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all border border-slate-150 bg-white"
            title="به‌روزرسانی کل داده‌ها"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Person Selection Box */}
      <div className="bg-white p-5 rounded-2xl border border-slate-150/80 shadow-sm space-y-3">
        <div className="flex items-center gap-2 text-xs font-black text-slate-400">
          <User className="w-4 h-4 text-slate-400" />
          <span>لطفاً برای شروع کار، شخص مورد نظر را انتخاب کنید</span>
        </div>
        <div className="w-full max-w-xl">
          <Select
            isRtl
            value={personOptions.find(o => o.value.toString() === selectedPersonId.toString()) || null}
            onChange={(opt) => {
              setSelectedPersonId(opt ? opt.value : '');
              setAllocations({});
            }}
            options={personOptions}
            placeholder="جستجوی نام یا کد شخص..."
            noOptionsMessage={() => "هیچ شخص فعالی یافت نشد"}
            className="text-sm font-bold"
          />
        </div>
      </div>

      {!selectedPersonId ? (
        /* Empty / Welcome State */
        <div className="bg-white rounded-3xl border border-dashed border-slate-200 py-16 px-6 text-center flex flex-col items-center justify-center space-y-4">
          <div className="w-20 h-20 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400">
            <Sliders className="w-10 h-10 text-slate-300" />
          </div>
          <h2 className="text-base font-black text-slate-700">آماده تخصیص تراکنش‌ها</h2>
          <p className="text-xs text-slate-400 max-w-md leading-relaxed">
            با انتخاب یک مشتری یا تامین‌کننده از کادر بالا، تمام دریافتی‌ها و پرداختی‌های تسویه‌نشده او به همراه لیست فاکتورهای باز او بارگذاری می‌شوند تا بتوانید تراکنش‌ها را پیوند دهید.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          
          {/* Dashboard Summary Widgets */}
          {personOverallStats && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
                <div>
                  <span className="block text-[10px] font-black text-slate-400 uppercase">کل وجوه تراکنش‌ها</span>
                  <span className="text-base font-black text-slate-800 mt-1 block">
                    {formatCurrency(personOverallStats.totalFunds)} <span className="text-xs font-medium text-slate-400">{currency}</span>
                  </span>
                </div>
                <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-500">
                  <DollarSign className="w-5 h-5" />
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
                <div>
                  <span className="block text-[10px] font-black text-slate-400 uppercase">وجوه تخصیص‌یافته</span>
                  <span className="text-base font-black text-indigo-600 mt-1 block">
                    {formatCurrency(personOverallStats.allocatedFunds)} <span className="text-xs font-medium text-slate-400">{currency}</span>
                  </span>
                </div>
                <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-500">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
                <div>
                  <span className="block text-[10px] font-black text-slate-400 uppercase">مانده آزاد تخصیص‌نیافته</span>
                  <span className="text-base font-black text-emerald-600 mt-1 block">
                    {formatCurrency(personOverallStats.unallocatedFunds)} <span className="text-xs font-medium text-slate-400">{currency}</span>
                  </span>
                </div>
                <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-500">
                  <Sliders className="w-5 h-5" />
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
                <div>
                  <span className="block text-[10px] font-black text-slate-400 uppercase">بدهی باز فاکتورها</span>
                  <span className="text-base font-black text-rose-600 mt-1 block">
                    {formatCurrency(personOverallStats.unpaidInvoicesAmt)} <span className="text-xs font-medium text-slate-400">{currency}</span>
                  </span>
                </div>
                <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center text-rose-500">
                  <FileText className="w-5 h-5" />
                </div>
              </div>
            </div>
          )}

          {/* Master Detail Grid Pane */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* Left Column (Master): Receipts & Transactions List */}
            <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-150/80 shadow-sm overflow-hidden flex flex-col max-h-[700px]">
              <div className="p-4 border-b border-slate-100 bg-slate-50/50 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black text-slate-700 flex items-center gap-1.5">
                    <Filter className="w-3.5 h-3.5 text-indigo-500" />
                    لیست اسناد دریافتی و پرداختی
                  </h3>
                  <span className="text-[10px] font-bold text-slate-400 bg-slate-150 px-2 py-0.5 rounded-full">
                    {filteredTransactions.length} سند
                  </span>
                </div>

                {/* Quick Search inside transactions */}
                <div className="relative">
                  <input
                    type="text"
                    value={txSearchTerm}
                    onChange={(e) => setTxSearchTerm(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl py-2 pr-8 pl-3 text-xs font-bold outline-none focus:border-indigo-400 transition-colors"
                    placeholder="جستجوی شماره رسید، مبلغ، تاریخ..."
                  />
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute top-3 right-2.5" />
                  {txSearchTerm && (
                    <button onClick={() => setTxSearchTerm('')} className="absolute top-2.5 left-2.5 text-slate-400 hover:text-slate-600">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Filter Controls */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="block text-[9px] font-black text-slate-400 mb-1">نوع سند</span>
                    <select
                      value={txTypeFilter}
                      onChange={(e) => setTxTypeFilter(e.target.value as any)}
                      className="w-full bg-white border border-slate-200 rounded-lg p-1 text-[10px] font-bold outline-none"
                    >
                      <option value="all">همه اسناد</option>
                      <option value="receive">فقط دریافتی‌ها</option>
                      <option value="pay">فقط پرداختی‌ها</option>
                    </select>
                  </div>
                  <div>
                    <span className="block text-[9px] font-black text-slate-400 mb-1">وضعیت تخصیص</span>
                    <select
                      value={txStatusFilter}
                      onChange={(e) => setTxStatusFilter(e.target.value as any)}
                      className="w-full bg-white border border-slate-200 rounded-lg p-1 text-[10px] font-bold outline-none"
                    >
                      <option value="all">همه</option>
                      <option value="open">دارای مانده آزاد</option>
                      <option value="allocated">دارای تخصیص پیش‌نویس</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Transactions list content */}
              <div className="divide-y divide-slate-100 overflow-y-auto custom-scrollbar flex-1 min-h-[300px]">
                {filteredTransactions.length === 0 ? (
                  <div className="py-12 px-4 text-center text-slate-400 flex flex-col items-center justify-center space-y-2">
                    <HelpCircle className="w-8 h-8 text-slate-300" />
                    <span className="text-xs font-bold">هیچ تراکنشی یافت نشد</span>
                    <span className="text-[10px] text-slate-400">فیلترهای جستجو را تغییر دهید</span>
                  </div>
                ) : (
                  filteredTransactions.map(tx => {
                    const isSelected = selectedTxId?.toString() === tx.id.toString();
                    const isReceive = tx.type === 'receive';
                    const progressPercent = Math.min(Math.round((tx.allocatedLocal / tx.amount) * 100), 100);
                    
                    // Check if there are unsaved/draft allocations compared to the original DB state
                    const draftAllocations = allocations[tx.id] || {};
                    const dbAllocations = tx.linkedInvoices || {};
                    let isDraftModified = false;
                    const keys = new Set([...Object.keys(draftAllocations), ...Object.keys(dbAllocations)]);
                    for (const k of keys) {
                      if ((draftAllocations[k] || 0) !== (dbAllocations[k] || 0)) {
                        isDraftModified = true;
                        break;
                      }
                    }

                    return (
                      <button
                        key={tx.id}
                        onClick={() => setSelectedTxId(tx.id.toString())}
                        className={`w-full text-right p-3.5 transition-all flex flex-col gap-2 border-r-4 ${
                          isSelected 
                            ? 'bg-indigo-50/55 border-indigo-600 shadow-inner' 
                            : isReceive 
                            ? 'border-emerald-500 hover:bg-slate-50' 
                            : 'border-rose-500 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex justify-between items-center w-full">
                          <div className="flex items-center gap-1.5">
                            {isReceive ? (
                              <span className="bg-emerald-50 text-emerald-800 text-[9px] font-black px-1.5 py-0.5 rounded border border-emerald-100 flex items-center gap-0.5">
                                <ArrowDownLeft className="w-3 h-3" />
                                دریافتی
                              </span>
                            ) : (
                              <span className="bg-rose-50 text-rose-800 text-[9px] font-black px-1.5 py-0.5 rounded border border-rose-100 flex items-center gap-0.5">
                                <ArrowUpRight className="w-3 h-3" />
                                پرداختی
                              </span>
                            )}
                            <span className="text-xs font-black text-slate-700">
                              شماره {tx.receiptNumber || `#${tx.id}`}
                            </span>
                          </div>
                          
                          {isDraftModified && (
                            <span className="bg-indigo-600 text-white text-[8px] font-extrabold px-1.5 py-0.5 rounded shadow-sm">
                              پیش‌نویس جدید
                            </span>
                          )}
                        </div>

                        <div className="flex justify-between items-center w-full text-xs">
                          <span className="text-slate-400 font-bold">{tx.jalaliDate}</span>
                          <span className="font-black text-slate-800">
                            {formatCurrency(tx.amount)} {currency}
                          </span>
                        </div>

                        {/* Progress bar of Allocation */}
                        <div className="w-full space-y-1">
                          <div className="flex justify-between text-[10px] font-bold text-slate-400">
                            <span>{progressPercent}٪ تخصیص یافته</span>
                            <span>مانده آزاد: <strong className={tx.unallocatedLocal > 0 ? 'text-indigo-600 font-extrabold' : 'text-slate-500'}>{formatCurrency(tx.unallocatedLocal)}</strong></span>
                          </div>
                          <div className="w-full bg-slate-150 h-1.5 rounded-full overflow-hidden">
                            <div 
                              className={`h-full transition-all duration-300 rounded-full ${
                                progressPercent >= 100 
                                  ? 'bg-emerald-500' 
                                  : isReceive 
                                  ? 'bg-indigo-600' 
                                  : 'bg-rose-500'
                              }`}
                              style={{ width: `${progressPercent}%` }}
                            />
                          </div>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* Right Column (Detail): Selected Receipt & Eligible Invoices Allocation */}
            <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-150/80 shadow-sm p-6 min-h-[550px] flex flex-col">
              <AnimatePresence mode="wait">
                {!selectedTx ? (
                  <motion.div
                    key="no-tx-placeholder"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex-1 flex flex-col items-center justify-center text-center p-8 space-y-4 my-auto"
                  >
                    <div className="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-400 animate-pulse">
                      <FileText className="w-8 h-8" />
                    </div>
                    <h3 className="text-sm font-black text-slate-700">انتخاب سند جهت تخصیص</h3>
                    <p className="text-xs text-slate-400 max-w-sm leading-relaxed">
                      یک رسید دریافت یا پرداخت را از لیست سمت راست انتخاب کنید تا فاکتورهای واجد شرایط برای تخصیص به آن نمایش داده شوند.
                    </p>
                  </motion.div>
                ) : (
                  <motion.div
                    key={selectedTx.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    className="space-y-6 flex-1 flex flex-col"
                  >
                    {/* Selected Transaction Summary Header Banner */}
                    <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${
                            selectedTx.type === 'receive' 
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                              : 'bg-rose-50 text-rose-800 border-rose-200'
                          }`}>
                            {selectedTx.type === 'receive' ? 'سند دریافتی' : 'سند پرداختی'}
                          </span>
                          <h4 className="text-sm font-black text-slate-800">
                            شماره {selectedTx.receiptNumber || `#${selectedTx.id}`}
                          </h4>
                        </div>
                        <p className="text-xs text-slate-400">تاریخ ثبت سند: {selectedTx.jalaliDate} | {selectedTx.description || 'بدون توضیحات'}</p>
                      </div>

                      <div className="text-left bg-white px-4 py-2.5 rounded-xl border border-slate-150">
                        <div className="text-xs text-slate-400 font-bold">باقی‌مانده وجوه آزاد این سند</div>
                        <div className="text-lg font-black text-indigo-600 font-mono mt-0.5">
                          {formatCurrency(selectedTx.unallocatedLocal)} <span className="text-xs font-medium text-slate-400">{currency}</span>
                        </div>
                      </div>
                    </div>

                    {/* Automation and Reset Buttons */}
                    <div className="flex flex-wrap items-center gap-3">
                      <button
                        onClick={handleSmartAllocate}
                        disabled={selectedTx.unallocatedLocal <= 0}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-700 hover:from-indigo-700 hover:to-violet-800 disabled:from-slate-100 disabled:to-slate-100 disabled:text-slate-400 text-white font-extrabold text-xs shadow-md shadow-indigo-600/10 cursor-pointer transition-all border-0"
                      >
                        <Sparkles className="w-4 h-4" />
                        تخصیص هوشمند به فاکتورها (به ترتیب تاریخ سررسید)
                      </button>

                      <button
                        onClick={handleResetSelectedTxAllocations}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 font-extrabold text-xs cursor-pointer transition-all"
                      >
                        <Trash2 className="w-4 h-4 text-rose-500" />
                        صفر کردن تخصیص‌های این رسید
                      </button>
                    </div>

                    {/* Invoice Filter, Search and Lists */}
                    <div className="space-y-3 flex-1 flex flex-col">
                      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50/50 p-3 rounded-xl border border-slate-100">
                        <div className="text-xs font-black text-slate-600 flex items-center gap-1">
                          <FileSpreadsheet className="w-4 h-4 text-indigo-500" />
                          <span>فاکتورهای باز مرتبط با تراکنش</span>
                        </div>
                        
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                          <div className="relative flex-1 sm:flex-initial">
                            <input
                              type="text"
                              value={invSearchTerm}
                              onChange={(e) => setInvSearchTerm(e.target.value)}
                              className="bg-white border border-slate-200 rounded-lg py-1.5 pr-7 pl-2 text-[10px] font-bold outline-none focus:border-indigo-400"
                              placeholder="جستجوی شماره فاکتور..."
                            />
                            <Search className="w-3 h-3 text-slate-400 absolute top-2.5 right-2" />
                          </div>

                          <select
                            value={invStatusFilter}
                            onChange={(e) => setInvStatusFilter(e.target.value as any)}
                            className="bg-white border border-slate-200 rounded-lg py-1.5 px-2 text-[10px] font-bold outline-none"
                          >
                            <option value="all">همه فاکتورها</option>
                            <option value="unpaid">دارای بدهی باز</option>
                            <option value="allocated">دارای تخصیص جدید</option>
                          </select>
                        </div>
                      </div>

                      {/* Invoice Cards / Grid Redesign */}
                      <div className="space-y-3 overflow-y-auto max-h-[420px] custom-scrollbar flex-1 pr-1">
                        {eligibleInvoicesForSelectedTx.length === 0 ? (
                          <div className="py-12 px-4 text-center text-slate-400 border border-dashed border-slate-150 rounded-2xl flex flex-col items-center justify-center space-y-2">
                            <HelpCircle className="w-8 h-8 text-slate-300" />
                            <span className="text-xs font-bold">هیچ فاکتور مطابقی یافت نشد</span>
                            <span className="text-[10px] text-slate-400">تمام فاکتورهای مرتبط قبلاً به طور کامل تسویه شده‌اند یا با فیلترهای بالا مطابقت ندارند.</span>
                          </div>
                        ) : (
                          eligibleInvoicesForSelectedTx.map(inv => {
                            const total = (inv.totalAmount || 0) * (getDefaultExchangeRate ? getDefaultExchangeRate(inv.currency, storeSettings.currency) : 1);
                            const paidInDB = (inv.paidAmount || 0);
                            
                            let oldAllocationsSum = 0;
                            (transactions || []).filter(t => t.personId?.toString() === selectedPersonId.toString()).forEach(t => {
                                oldAllocationsSum += (t.linkedInvoices?.[inv.id] || 0);
                            });
                            
                            const basePaid = paidInDB - oldAllocationsSum;
                            
                            let otherTxNewAllocations = 0;
                            Object.entries(allocations).forEach(([tId, invs]) => {
                               if (tId !== String(selectedTx.id) && invs[inv.id]) {
                                  otherTxNewAllocations += invs[inv.id];
                               }
                            });
                            
                            const currentRemainder = Math.max(total - basePaid - otherTxNewAllocations, 0);
                            const currentAllocated = allocations[selectedTx.id]?.[inv.id] || 0;
                            
                            // Visual bar calculations
                            const basePaidPercent = Math.min((basePaid / total) * 100, 100);
                            const otherAllocPercent = Math.min((otherTxNewAllocations / total) * 100, 100 - basePaidPercent);
                            const thisAllocPercent = Math.min((currentAllocated / total) * 100, 100 - basePaidPercent - otherAllocPercent);
                            const unpaidPercent = Math.max(100 - basePaidPercent - otherAllocPercent - thisAllocPercent, 0);

                            return (
                              <div 
                                key={inv.id} 
                                className={`p-4 rounded-xl border transition-all ${
                                  currentAllocated > 0 
                                    ? 'bg-indigo-50/20 border-indigo-200 ring-1 ring-indigo-200/50' 
                                    : 'bg-white border-slate-150 hover:border-slate-250'
                                }`}
                              >
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                  {/* Identity and Dates */}
                                  <div className="flex items-start gap-2.5">
                                    <div className="w-9 h-9 rounded-lg bg-slate-50 flex items-center justify-center text-slate-500 border border-slate-100">
                                      <FileText className="w-4 h-4" />
                                    </div>
                                    <div>
                                      <div className="flex items-center gap-1.5">
                                        <span className="text-xs font-black text-slate-800">شماره {inv.invoiceNumber || `#${inv.id}`}</span>
                                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                                          inv.type === 'sale' 
                                            ? 'bg-blue-50 text-blue-700' 
                                            : inv.type === 'purchase'
                                            ? 'bg-orange-50 text-orange-700'
                                            : 'bg-slate-100 text-slate-700'
                                        }`}>
                                          {inv.type === 'sale' ? 'فروش' : inv.type === 'purchase' ? 'خرید' : inv.type === 'sale_return' ? 'برگشت فروش' : 'برگشت خرید'}
                                        </span>
                                      </div>
                                      <p className="text-[10px] text-slate-400 font-bold mt-1">تاریخ فاکتور: {inv.jalaliDate}</p>
                                    </div>
                                  </div>

                                  {/* Pricing details */}
                                  <div className="grid grid-cols-3 gap-4 shrink-0 text-right sm:text-left">
                                    <div>
                                      <span className="block text-[9px] font-black text-slate-400">مبلغ کل فاکتور</span>
                                      <span className="text-xs font-black text-slate-700 font-mono mt-0.5 block">{formatCurrency(total)}</span>
                                    </div>
                                    <div>
                                      <span className="block text-[9px] font-black text-slate-400">تسویه پیشین</span>
                                      <span className="text-xs font-bold text-slate-500 font-mono mt-0.5 block">{formatCurrency(basePaid + otherTxNewAllocations)}</span>
                                    </div>
                                    <div>
                                      <span className="block text-[9px] font-black text-slate-400">مانده بدهی باز</span>
                                      <span className="text-xs font-black text-rose-600 font-mono mt-0.5 block">{formatCurrency(currentRemainder)}</span>
                                    </div>
                                  </div>

                                  {/* Inputs and Settle tools */}
                                  <div className="flex items-center gap-2 justify-end pt-3 sm:pt-0 border-t sm:border-0 border-slate-100">
                                    <button 
                                      type="button" 
                                      className="p-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 border border-indigo-100 rounded-lg text-xs font-black transition-colors" 
                                      title="تسویه کامل این فاکتور"
                                      onClick={() => {
                                        const maxAlloc = Math.min(currentRemainder, selectedTx.unallocatedLocal + currentAllocated);
                                        handleAllocationChange(
                                          String(selectedTx.id), 
                                          String(inv.id), 
                                          maxAlloc, 
                                          currentRemainder,
                                          selectedTx.unallocatedLocal + currentAllocated
                                        );
                                      }}
                                    >
                                      تسویه کامل
                                    </button>
                                    
                                    <div className="relative">
                                      <input 
                                        type="number"
                                        className="p-2 border border-slate-200 rounded-lg text-xs font-mono w-28 text-left bg-white outline-none focus:border-indigo-500 pr-1"
                                        placeholder="0"
                                        value={currentAllocated || ''}
                                        min={0}
                                        max={Math.min(currentRemainder, selectedTx.unallocatedLocal + currentAllocated)}
                                        onChange={(e) => {
                                          handleAllocationChange(
                                            String(selectedTx.id), 
                                            String(inv.id), 
                                            Number(e.target.value), 
                                            currentRemainder,
                                            selectedTx.unallocatedLocal + currentAllocated
                                          );
                                        }}
                                      />
                                      {currentAllocated > 0 && (
                                        <button 
                                          onClick={() => handleAllocationChange(String(selectedTx.id), String(inv.id), 0, currentRemainder, selectedTx.unallocatedLocal + currentAllocated)}
                                          className="absolute left-1.5 top-2.5 text-slate-400 hover:text-rose-500"
                                        >
                                          <X className="w-3.5 h-3.5" />
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                {/* Custom Settlement Status Progress Bar */}
                                <div className="mt-3">
                                  <div className="flex h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                                    {basePaidPercent > 0 && <div className="bg-slate-400 h-full" style={{ width: `${basePaidPercent}%` }} title={`تسویه قبلی: ${basePaidPercent.toFixed(0)}٪`} />}
                                    {otherAllocPercent > 0 && <div className="bg-slate-300 h-full" style={{ width: `${otherAllocPercent}%` }} title={`تخصیص دیگر فاکتورها: ${otherAllocPercent.toFixed(0)}٪`} />}
                                    {thisAllocPercent > 0 && <div className="bg-indigo-600 h-full" style={{ width: `${thisAllocPercent}%` }} title={`تخصیص از این رسید: ${thisAllocPercent.toFixed(0)}٪`} />}
                                    {unpaidPercent > 0 && <div className="bg-rose-100 h-full" style={{ width: `${unpaidPercent}%` }} title={`باقی‌مانده: ${unpaidPercent.toFixed(0)}٪`} />}
                                  </div>
                                  {currentAllocated > 0 && (
                                    <div className="mt-1 flex items-center justify-between text-[9px] font-black">
                                      <span className="text-indigo-600">جدید از این رسید: {formatCurrency(currentAllocated)} {currency}</span>
                                      <span className="text-slate-400">کل تسویه: {((basePaid + otherTxNewAllocations + currentAllocated) / total * 100).toFixed(0)}٪</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

          </div>
          
          {/* Draft Summary Footer floating-style panel if any allocations were made */}
          {draftStats.modifiedCount > 0 && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-indigo-900 text-white rounded-2xl p-5 border border-indigo-950 shadow-xl flex flex-col md:flex-row items-center justify-between gap-4"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/10 text-indigo-200 flex items-center justify-center">
                  <ClipboardCheck className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h4 className="text-sm font-black">تغییرات در تخصیص‌ها آماده ثبت است</h4>
                  <p className="text-xs text-indigo-200/90 mt-1">
                    شما تخصیص‌های جدیدی برای <strong className="text-white font-extrabold">{draftStats.modifiedCount} رسید</strong> با مبلع کل <strong className="text-white font-extrabold">{formatCurrency(draftStats.totalAllocatedDraft)} {currency}</strong> به صورت پیش‌نویس تعریف کرده‌اید.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full md:w-auto shrink-0">
                <button
                  disabled={loading}
                  onClick={() => {
                    setAllocations({});
                    showFeedbackNotification('تمامی تغییرات پیش‌نویس لغو شدند.', 'info');
                  }}
                  className="w-full md:w-auto px-5 py-2.5 text-xs font-black text-indigo-200 hover:text-white transition-colors cursor-pointer"
                >
                  انصراف و بازنشانی
                </button>
                
                <button
                  disabled={loading}
                  onClick={handleSave}
                  className="w-full md:w-auto px-6 py-3 bg-white text-indigo-900 hover:bg-slate-50 disabled:opacity-50 font-black text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-md transition-all cursor-pointer border-0"
                >
                  {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  ثبت و ذخیره نهایی تخصیص‌ها
                </button>
              </div>
            </motion.div>
          )}

        </div>
      )}
    </div>
  );
}
