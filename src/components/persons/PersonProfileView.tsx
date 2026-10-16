import React, { useMemo, useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  User, Phone, MessageSquare, MapPin, Receipt, Wallet, FileText, ArrowRight, 
  Building2, Calendar, Edit2, ShoppingCart, Truck, CheckCircle, Clock, 
  ShieldCheck, AlertTriangle, TrendingUp, TrendingDown, ArrowDownLeft, ArrowUpRight, 
  Copy, Check, Download, Printer, Plus, Trash2, X, RefreshCw, BarChart2, 
  Package, CreditCard, ChevronDown, ChevronUp, ExternalLink, Filter, Search, 
  Award, AlertCircle, Smartphone, Globe, Share2, FileCheck, Layers
} from "lucide-react";
import { convertToGregorian, formatNumber, getActiveStoreSettings } from '../../utils/format';
import { safePrint } from '../../utils/printHelper';
import { exportToExcel } from '../../utils/exportUtils';
import { getPersonFollowUps, addPersonFollowUp, updatePersonFollowUp, deletePersonFollowUp } from "../../services/personService";
import { savePerson } from "../../services/personService";
import SendPersonMessageModal from "../modals/SendPersonMessageModal";

interface PersonProfileViewProps {
  personId: string | number;
  persons: any[];
  invoices: any[];
  transactions: any[];
  issuedChecks: any[];
  receivedChecks: any[];
  accountingDocuments: any[];
  storeSettings: any;
  products?: any[];
  fetchPersons?: () => void;
  calculatePersonBalance: (id: string | number) => { amount: number, status: string, color?: string, bg?: string };
  onBack: () => void;
  onEdit: (person: any) => void;
  onViewExtraInfo: (person: any) => void;
  onViewLedger: (personId: string | number) => void;
  onCreateSale: (personId: string | number) => void;
  onCreatePurchase: (personId: string | number) => void;
  onCreateReceive: (personId: string | number) => void;
  onCreatePay: (personId: string | number) => void;
  getPersonDisplayName: (p: any) => string;
  getRoleName: (roleId?: string) => string;
  getRoleBadgeClasses: (roleId?: string) => string;
  formatCurrency: (amount: number) => string;
  toPersianDigits: (str: string | number) => string;
  showNotification?: (msg: string, type: "success" | "error") => void;
  formatDateDisplay: (date: any) => string;
}

export default function PersonProfileView({
  personId,
  persons,
  invoices,
  transactions,
  issuedChecks,
  receivedChecks,
  accountingDocuments,
  storeSettings,
  products = [],
  fetchPersons,
  calculatePersonBalance,
  onBack,
  onEdit,
  onViewExtraInfo,
  onViewLedger,
  onCreateSale,
  onCreatePurchase,
  onCreateReceive,
  onCreatePay,
  getPersonDisplayName,
  getRoleName,
  getRoleBadgeClasses,
  formatCurrency,
  toPersianDigits,
  showNotification,
  formatDateDisplay
}: PersonProfileViewProps) {
  // Navigation & Tab State
  const [activeTab, setActiveTab] = useState<'overview' | 'invoices' | 'checks' | 'portfolio' | 'ledger' | 'crm' | 'bank_docs'>('overview');
  
  // Follow ups / CRM
  const [followUps, setFollowUps] = useState<any[]>([]);
  const [isLoadingFollowUps, setIsLoadingFollowUps] = useState(false);
  const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);
  
  // Interactive Modals
  const [isQuickEditOpen, setIsQuickEditOpen] = useState(false);
  const [isAddBankModalOpen, setIsAddBankModalOpen] = useState(false);
  const [isAddCrmTaskModalOpen, setIsAddCrmTaskModalOpen] = useState(false);
  const [isAddAttachmentModalOpen, setIsAddAttachmentModalOpen] = useState(false);
  const [isSettingCreditLimit, setIsSettingCreditLimit] = useState(false);

  // Invoices Tab Filters
  const [invoiceTypeFilter, setInvoiceTypeFilter] = useState<'all' | 'sale' | 'purchase' | 'return' | 'proforma'>('all');
  const [invoiceSearchQuery, setInvoiceSearchQuery] = useState('');
  const [expandedInvoiceId, setExpandedInvoiceId] = useState<string | number | null>(null);

  // Checks Tab Filters
  const [checkTabType, setCheckTabType] = useState<'all' | 'received' | 'issued'>('all');
  const [checkStatusFilter, setCheckStatusFilter] = useState<'all' | 'pending' | 'cashed' | 'bounced' | 'returned'>('all');

  // Ledger Tab Filters
  const [ledgerStartDate, setLedgerStartDate] = useState('');
  const [ledgerEndDate, setLedgerEndDate] = useState('');

  // Quick Edit Form State
  const [editFormData, setEditFormData] = useState<any>({});
  
  // New Bank Form State
  const [bankFormData, setBankFormData] = useState({
    bankName: '',
    accountNumber: '',
    cardNumber: '',
    shebaNumber: '',
    title: ''
  });

  // New CRM Form State
  const [crmFormData, setCrmFormData] = useState({
    type: 'call',
    status: 'pending',
    priority: 'normal',
    dueDate: '',
    description: '',
    nextActionDate: ''
  });

  // New Attachment Form State
  const [attachmentFormData, setAttachmentFormData] = useState({
    name: '',
    type: 'کارت ملی و شناسنامه',
    url: '',
    notes: ''
  });

  // Credit Limit Edit State
  const [tempCreditLimit, setTempCreditLimit] = useState('');

  // Copy feedback state
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Load target person
  const person = useMemo(() => {
    return (persons || []).find(p => p && p.id != null && personId != null && String(p.id) === String(personId)) || null;
  }, [persons, personId]);

  // Sync quick edit form data
  useEffect(() => {
    if (person) {
      setEditFormData({
        name: person.name || '',
        alias: person.alias || '',
        phone: person.phone || '',
        mobile: person.mobile || '',
        address: person.address || '',
        nationalId: person.nationalId || '',
        taxNumber: person.taxNumber || '',
        creditLimit: person.creditLimit || 0,
        additionalNotes: person.additionalNotes || '',
        isActive: person.isActive !== false
      });
      setTempCreditLimit(person.creditLimit ? String(person.creditLimit) : '');
    }
  }, [person]);

  // Load CRM followups
  const loadFollowUps = async () => {
    if (!personId) return;
    try {
      setIsLoadingFollowUps(true);
      const data = await getPersonFollowUps();
      const list = Array.isArray(data) ? data : [];
      setFollowUps(list.filter((f: any) => String(f?.personId) === String(personId)));
    } catch (e) {
      console.error("Error loading follow ups", e);
    } finally {
      setIsLoadingFollowUps(false);
    }
  };

  useEffect(() => {
    loadFollowUps();
  }, [personId]);

  // Copy to clipboard helper
  const handleCopyText = (text: string, key: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
    if (showNotification) {
      showNotification('در کلیپ‌بورد کپی شد', 'success');
    }
  };

  // Toggle active status
  const handleToggleActiveStatus = async () => {
    if (!person) return;
    const newStatus = person.isActive === false ? true : false;
    try {
      const updated = { ...person, isActive: newStatus };
      await savePerson(updated);
      if (fetchPersons) fetchPersons();
      if (showNotification) {
        showNotification(newStatus ? 'شخص با موفقیت فعال شد' : 'شخص غیرفعال شد', 'success');
      }
    } catch (e: any) {
      if (showNotification) showNotification('خطا در تغییر وضعیت: ' + (e.message || ''), 'error');
    }
  };

  // Financial Balance
  const balance = useMemo(() => {
    if (!personId || !calculatePersonBalance) return { amount: 0, status: 'بی‌حساب', value: 0 };
    return calculatePersonBalance(personId);
  }, [personId, calculatePersonBalance]);

  const isOwed = balance.status === "بدهکار"; // Debtor (Owes us)
  const isOwes = balance.status === "بستانکار"; // Creditor (We owe them)
  const isClr = balance.status === "بی‌حساب" || balance.status === "تسویه";

  // Debits and Credits
  const { totalDebits, totalCredits } = useMemo(() => {
    if (!person || !accountingDocuments) return { totalDebits: 0, totalCredits: 0 };
    let debits = 0;
    let credits = 0;

    (accountingDocuments || []).forEach((doc: any) => {
      if (doc?.status === 'draft' || doc?.isDeleted) return;
      if (doc?.items && Array.isArray(doc.items)) {
        doc.items.forEach((item: any) => {
          if (String(item?.detailedAccountId) === String(personId)) {
            debits += Number(item?.debit) || 0;
            credits += Number(item?.credit) || 0;
          }
        });
      }
    });

    return { totalDebits: debits, totalCredits: credits };
  }, [person, accountingDocuments, personId]);

  // Checks calculations
  const personIssuedChecks = useMemo(() => {
    return (issuedChecks || []).filter((c: any) => String(c?.payeeId) === String(personId));
  }, [issuedChecks, personId]);

  const personReceivedChecks = useMemo(() => {
    return (receivedChecks || []).filter((c: any) => String(c?.payerId) === String(personId));
  }, [receivedChecks, personId]);

  const allPersonChecks = useMemo(() => {
    const list = [
      ...personReceivedChecks.map(c => ({ ...c, _flow: 'received', _partyRole: 'پرداخت‌کننده' })),
      ...personIssuedChecks.map(c => ({ ...c, _flow: 'issued', _partyRole: 'دریافت‌کننده' }))
    ];
    return list.sort((a, b) => new Date(b.dueDate || b.issueDate || 0).getTime() - new Date(a.dueDate || a.issueDate || 0).getTime());
  }, [personReceivedChecks, personIssuedChecks]);

  const checkStats = useMemo(() => {
    let pendingCount = 0;
    let pendingAmount = 0;
    let cashedCount = 0;
    let cashedAmount = 0;
    let bouncedCount = 0;
    let bouncedAmount = 0;

    allPersonChecks.forEach((c: any) => {
      const amt = Number(c.amount) || 0;
      if (['bounced', 'bounced_assigned'].includes(c.status)) {
        bouncedCount++;
        bouncedAmount += amt;
      } else if (['cashed'].includes(c.status)) {
        cashedCount++;
        cashedAmount += amt;
      } else if (['received', 'deposited', 'issued', 'blank'].includes(c.status)) {
        pendingCount++;
        pendingAmount += amt;
      }
    });

    const totalClosed = cashedCount + bouncedCount;
    const bounceRate = totalClosed > 0 ? (bouncedCount / totalClosed) * 100 : 0;

    return {
      pendingCount,
      pendingAmount,
      cashedCount,
      cashedAmount,
      bouncedCount,
      bouncedAmount,
      bounceRate,
      totalCount: allPersonChecks.length
    };
  }, [allPersonChecks]);

  // Invoices list for this person
  const personInvoices = useMemo(() => {
    return (invoices || [])
      .filter(inv => {
        const matchesCustomer = String(inv?.customerId) === String(personId) || String(inv?.sellerId) === String(personId);
        const notDraft = inv?.status !== 'draft' && inv?.status !== 'voided';
        const notWarehouseInternal = !String(inv?.type || '').startsWith('warehouse_');
        return matchesCustomer && notDraft && notWarehouseInternal;
      })
      .sort((a, b) => new Date(convertToGregorian(b?.date || b?.createdAt)).getTime() - new Date(convertToGregorian(a?.date || a?.createdAt)).getTime());
  }, [invoices, personId]);

  // Calculate Credit Score & Rating
  const creditAnalysis = useMemo(() => {
    // Formula:
    // Base score = 85
    // Deductions: Bounced checks (-25 per bounced check, or up to -50 based on bounce rate)
    // Additions: Cashed checks (+3 per cashed check up to +15)
    // Penalty if debt exceeds creditLimit (-20)
    // Bonus if clean transaction history (+5)
    let score = 85;
    
    if (checkStats.bouncedCount > 0) {
      score -= Math.min(50, checkStats.bouncedCount * 25);
    }
    if (checkStats.cashedCount > 0) {
      score += Math.min(15, checkStats.cashedCount * 3);
    }
    
    const creditLimit = Number(person?.creditLimit) || 0;
    const currentDebt = isOwed ? Math.abs(balance.amount) : 0;
    
    if (creditLimit > 0 && currentDebt > creditLimit) {
      score -= 20;
    } else if (creditLimit > 0 && currentDebt <= creditLimit * 0.5) {
      score += 5;
    }

    // Normalizing between 0 and 100
    score = Math.max(10, Math.min(100, Math.round(score)));

    let grade: 'A+' | 'A' | 'B' | 'C' | 'D' = 'B';
    let riskLabel = 'ریسک متوسط';
    let riskColor = 'text-amber-700 bg-amber-50 border-amber-200';
    let suggestion = 'فروش اعتباری با کنترل سررسید چک‌ها مجاز است.';

    if (score >= 90) {
      grade = 'A+';
      riskLabel = 'بسیار کم‌ریسک (عالی)';
      riskColor = 'text-emerald-700 bg-emerald-50 border-emerald-200';
      suggestion = 'مشتری ممتاز؛ افزایش سقف اعتبار و فروش نسیه توصیه می‌شود.';
    } else if (score >= 75) {
      grade = 'A';
      riskLabel = 'کم‌ریسک (خوب)';
      riskColor = 'text-teal-700 bg-teal-50 border-teal-200';
      suggestion = 'انضباط مالی مطلوب؛ تداوم معاملات اعتباری بلامانع است.';
    } else if (score >= 50) {
      grade = 'B';
      riskLabel = 'ریسک متوسط';
      riskColor = 'text-amber-700 bg-amber-50 border-amber-200';
      suggestion = 'فروش اعتباری منوط به دریافت چک صیادی معتبر و ثبت شده.';
    } else if (score >= 35) {
      grade = 'C';
      riskLabel = 'پرریسک و تحت نظر';
      riskColor = 'text-orange-700 bg-orange-50 border-orange-200';
      suggestion = 'دارای سابقه چک برگشتی یا بدهی انباشته؛ فقط فروش نقدی یا با ضامن معتبر.';
    } else {
      grade = 'D';
      riskLabel = 'ریسک بحرانی';
      riskColor = 'text-rose-700 bg-rose-50 border-rose-200';
      suggestion = 'توقف هرگونه فروش اعتباری؛ اولویت با پیگیری وصول مطالبات معوق.';
    }

    return {
      score,
      grade,
      riskLabel,
      riskColor,
      suggestion,
      creditLimit,
      currentDebt,
      creditUtilization: creditLimit > 0 ? Math.min(100, Math.round((currentDebt / creditLimit) * 100)) : 0
    };
  }, [checkStats, person, balance, isOwed]);

  // Monthly flow analysis for the last 6 months
  const monthlyFlow = useMemo(() => {
    const months = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'];
    const currentMonthIdx = new Date().getMonth(); // standard cycle
    
    // Group invoices by monthly buckets
    const salesBuckets: { [key: string]: number } = {};
    const purchaseBuckets: { [key: string]: number } = {};
    
    // Pre-populate last 6 calendar periods
    const periods: string[] = [];
    for (let i = 5; i >= 0; i--) {
      const idx = (currentMonthIdx - i + 12) % 12;
      const mName = months[idx];
      periods.push(mName);
      salesBuckets[mName] = 0;
      purchaseBuckets[mName] = 0;
    }

    personInvoices.forEach(inv => {
      const amt = Number(inv.totalAmount) || 0;
      // Extract month name if jalali date present
      const jDate = inv.jalaliDate || inv.date || '';
      let matchedMonth = periods[5]; // default latest
      periods.forEach(p => {
        if (jDate.includes(p)) matchedMonth = p;
      });

      if (inv.type === 'sale') {
        salesBuckets[matchedMonth] = (salesBuckets[matchedMonth] || 0) + amt;
      } else if (inv.type === 'purchase') {
        purchaseBuckets[matchedMonth] = (purchaseBuckets[matchedMonth] || 0) + amt;
      }
    });

    // Find max value for bar scaling
    const allValues = [...Object.values(salesBuckets), ...Object.values(purchaseBuckets), 100000];
    const maxVal = Math.max(...allValues);

    return {
      periods,
      salesBuckets,
      purchaseBuckets,
      maxVal
    };
  }, [personInvoices]);

  // Top traded products / Commodity portfolio
  const topProducts = useMemo(() => {
    const productMap: { [key: string]: { 
      name: string; 
      code: string; 
      quantity: number; 
      totalAmount: number; 
      unit: string;
      category?: string;
      tradeCount: number;
      lastDate: string;
    } } = {};

    personInvoices.forEach(inv => {
      const items = Array.isArray(inv.items) ? inv.items : [];
      const invDate = inv.jalaliDate || inv.date || '---';

      items.forEach((item: any) => {
        const prodId = String(item.productId || item.id || item.code || item.name);
        const name = item.productName || item.name || 'کالای نامشخص';
        const code = item.code || item.productCode || '';
        const qty = Number(item.quantity || item.count) || 1;
        const total = Number(item.total || item.totalPrice || item.rowTotal) || (qty * (Number(item.price || item.unitPrice) || 0));
        const unit = item.unit || 'عدد';

        // lookup product category
        const catalogProd = products.find((p: any) => String(p.id) === prodId || p.name === name);
        const category = catalogProd?.category || item.category || 'عمومی';

        if (!productMap[prodId]) {
          productMap[prodId] = {
            name,
            code,
            quantity: 0,
            totalAmount: 0,
            unit,
            category,
            tradeCount: 0,
            lastDate: invDate
          };
        }

        productMap[prodId].quantity += qty;
        productMap[prodId].totalAmount += total;
        productMap[prodId].tradeCount += 1;
        productMap[prodId].lastDate = invDate;
      });
    });

    const list = Object.values(productMap).sort((a, b) => b.totalAmount - a.totalAmount);
    const totalTradedValue = list.reduce((acc, curr) => acc + curr.totalAmount, 0);

    return {
      list,
      totalTradedValue,
      totalUniqueItems: list.length
    };
  }, [personInvoices, products]);

  // General Ledger Statement items
  const ledgerEntries = useMemo(() => {
    const entries: any[] = [];
    let runningBalance = Number(person?.initialBalance) || 0;
    if (person?.initialBalanceType === 'creditor') {
      runningBalance = -runningBalance;
    }

    // Opening balance entry
    if (person?.initialBalance) {
      entries.push({
        id: 'initial_balance',
        date: person.registrationDate || 'افتتاحیه',
        docNumber: 'افتتاحیه',
        description: 'مانده حساب اولیه (افتتاح دوره)',
        debit: person.initialBalanceType === 'debtor' ? person.initialBalance : 0,
        credit: person.initialBalanceType === 'creditor' ? person.initialBalance : 0,
        balance: runningBalance,
        status: runningBalance > 0 ? 'بدهکار' : runningBalance < 0 ? 'بستانکار' : 'تسویه'
      });
    }

    // Combine invoices and transactions
    const rawEvents: any[] = [];

    // Invoices
    personInvoices.forEach(inv => {
      const isSale = inv.type === 'sale';
      const isPurchase = inv.type === 'purchase';
      const isSaleReturn = inv.type === 'sale_return';
      const isPurchaseReturn = inv.type === 'purchase_return';
      const amt = Number(inv.totalAmount) || 0;

      let debit = 0;
      let credit = 0;
      let desc = '';

      if (isSale) {
        debit = amt;
        desc = `فاکتور فروش شماره ${inv.invoiceNumber || inv.id}`;
      } else if (isPurchase) {
        credit = amt;
        desc = `فاکتور خرید شماره ${inv.invoiceNumber || inv.id}`;
      } else if (isSaleReturn) {
        credit = amt;
        desc = `برگشت از فروش شماره ${inv.invoiceNumber || inv.id}`;
      } else if (isPurchaseReturn) {
        debit = amt;
        desc = `برگشت از خرید شماره ${inv.invoiceNumber || inv.id}`;
      }

      rawEvents.push({
        date: inv.jalaliDate || inv.date,
        rawDate: convertToGregorian(inv.date || inv.jalaliDate),
        docNumber: inv.invoiceNumber || inv.id,
        description: desc,
        debit,
        credit,
        items: inv.items || []
      });
    });

    // Transactions (Receipts & Payments)
    (transactions || []).forEach(tr => {
      if (String(tr.personId) !== String(personId)) return;
      const amt = Number(tr.amount) || 0;
      const isReceipt = tr.type === 'receive' || tr.type === 'receipt';
      const isPayment = tr.type === 'pay' || tr.type === 'payment';

      let debit = 0;
      let credit = 0;
      let desc = tr.description || '';

      if (isReceipt) {
        credit = amt;
        desc = desc || `دریافت وجه / سند شماره ${tr.receiptNumber || tr.id}`;
      } else if (isPayment) {
        debit = amt;
        desc = desc || `پرداخت وجه / سند شماره ${tr.receiptNumber || tr.id}`;
      }

      rawEvents.push({
        date: tr.jalaliDate || tr.date,
        rawDate: convertToGregorian(tr.date || tr.jalaliDate),
        docNumber: tr.receiptNumber || tr.id,
        description: desc,
        debit,
        credit
      });
    });

    // Sort chronologically
    rawEvents.sort((a, b) => new Date(a.rawDate || 0).getTime() - new Date(b.rawDate || 0).getTime());

    rawEvents.forEach((ev, idx) => {
      runningBalance += (ev.debit - ev.credit);
      entries.push({
        id: `ev_${idx}`,
        date: ev.date,
        docNumber: ev.docNumber,
        description: ev.description,
        debit: ev.debit,
        credit: ev.credit,
        balance: runningBalance,
        status: runningBalance > 0 ? 'بدهکار' : runningBalance < 0 ? 'بستانکار' : 'تسویه',
        items: ev.items || []
      });
    });

    return entries;
  }, [person, personInvoices, transactions, personId]);

  // Export Ledger to Excel
  const handleExportExcel = () => {
    try {
      const data = ledgerEntries.map((entry, index) => ({
        'ردیف': index + 1,
        'تاریخ': entry.date,
        'شماره سند / فاکتور': entry.docNumber,
        'شرح تراکنش': entry.description,
        'بدهکار (تومان)': entry.debit ? entry.debit : 0,
        'بستانکار (تومان)': entry.credit ? entry.credit : 0,
        'مانده لحظه‌ای': Math.abs(entry.balance),
        'وضعیت': entry.status
      }));

      exportToExcel({
        filename: `صورت_حساب_${person?.name || 'شخص'}_${new Date().toLocaleDateString('fa-IR')}`,
        sheetName: 'دفتر معین',
        data,
        columns: [
          { header: 'ردیف', key: 'ردیف' },
          { header: 'تاریخ', key: 'تاریخ' },
          { header: 'شماره سند / فاکتور', key: 'شماره سند / فاکتور' },
          { header: 'شرح تراکنش', key: 'شرح تراکنش' },
          { header: 'بدهکار (تومان)', key: 'بدهکار (تومان)', isNumeric: true },
          { header: 'بستانکار (تومان)', key: 'بستانکار (تومان)', isNumeric: true },
          { header: 'مانده لحظه‌ای', key: 'مانده لحظه‌ای', isNumeric: true },
          { header: 'وضعیت', key: 'وضعیت' }
        ]
      });

      if (showNotification) {
        showNotification('فایل اکسل با موفقیت ایجاد شد', 'success');
      }
    } catch (e: any) {
      if (showNotification) {
        showNotification('خطا در صدور فایل اکسل: ' + (e.message || ''), 'error');
      }
    }
  };

  // Official Printable Dossier (A4 Print)
  const handlePrintDossier = () => {
    safePrint('#printable-person-dossier', {
      paperSize: 'a4',
      documentTitle: `پرونده_جامع_${person?.name || 'شخص'}`
    });
  };

  // Quick edit save
  const handleSaveQuickEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!person) return;
    try {
      const updated = {
        ...person,
        name: editFormData.name,
        alias: editFormData.alias,
        phone: editFormData.phone,
        mobile: editFormData.mobile,
        address: editFormData.address,
        nationalId: editFormData.nationalId,
        taxNumber: editFormData.taxNumber,
        creditLimit: Number(editFormData.creditLimit) || 0,
        additionalNotes: editFormData.additionalNotes,
        isActive: editFormData.isActive
      };
      await savePerson(updated);
      setIsQuickEditOpen(false);
      if (fetchPersons) fetchPersons();
      if (showNotification) {
        showNotification('اطلاعات شخص با موفقیت به‌روزرسانی شد', 'success');
      }
    } catch (err: any) {
      if (showNotification) showNotification('خطا در ذخیره: ' + (err.message || ''), 'error');
    }
  };

  // Save new bank account
  const handleSaveNewBankAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!person || !bankFormData.bankName) {
      if (showNotification) showNotification('نام بانک الزامی است', 'error');
      return;
    }
    try {
      const newAcc = {
        id: Date.now().toString(),
        bankName: bankFormData.bankName,
        accountNumber: bankFormData.accountNumber,
        cardNumber: bankFormData.cardNumber,
        shebaNumber: bankFormData.shebaNumber,
        title: bankFormData.title || `حساب ${bankFormData.bankName}`
      };
      const existing = Array.isArray(person.bankAccounts) ? [...person.bankAccounts] : [];
      const updated = {
        ...person,
        bankAccounts: [...existing, newAcc]
      };
      await savePerson(updated);
      setIsAddBankModalOpen(false);
      setBankFormData({ bankName: '', accountNumber: '', cardNumber: '', shebaNumber: '', title: '' });
      if (fetchPersons) fetchPersons();
      if (showNotification) showNotification('حساب بانکی جدید با موفقیت اضافه شد', 'success');
    } catch (err: any) {
      if (showNotification) showNotification('خطا در ذخیره حساب بانکی: ' + (err.message || ''), 'error');
    }
  };

  // Delete bank account
  const handleDeleteBankAccount = async (accId: string) => {
    if (!person || !person.bankAccounts) return;
    try {
      const updated = {
        ...person,
        bankAccounts: person.bankAccounts.filter((b: any) => String(b.id) !== String(accId))
      };
      await savePerson(updated);
      if (fetchPersons) fetchPersons();
      if (showNotification) showNotification('حساب بانکی حذف شد', 'success');
    } catch (err: any) {
      if (showNotification) showNotification('خطا در حذف: ' + (err.message || ''), 'error');
    }
  };

  // Save CRM follow-up task
  const handleSaveCrmTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!crmFormData.description) {
      if (showNotification) showNotification('شرح پیگیری الزامی است', 'error');
      return;
    }
    try {
      await addPersonFollowUp({
        personId: String(personId),
        personName: getPersonDisplayName(person),
        type: crmFormData.type,
        status: crmFormData.status,
        priority: crmFormData.priority,
        dueDate: crmFormData.dueDate || new Date().toISOString(),
        description: crmFormData.description,
        nextActionDate: crmFormData.nextActionDate,
        date: new Date().toISOString(),
        notes: [{ date: new Date().toISOString(), text: crmFormData.description }]
      });
      setIsAddCrmTaskModalOpen(false);
      setCrmFormData({ type: 'call', status: 'pending', priority: 'normal', dueDate: '', description: '', nextActionDate: '' });
      loadFollowUps();
      if (showNotification) showNotification('پیگیری با موفقیت ثبت شد', 'success');
    } catch (err: any) {
      if (showNotification) showNotification('خطا در ثبت پیگیری: ' + (err.message || ''), 'error');
    }
  };

  // Toggle CRM task status
  const handleToggleCrmStatus = async (task: any) => {
    try {
      const nextStatus = task.status === 'completed' ? 'pending' : 'completed';
      await updatePersonFollowUp(task.id, { ...task, status: nextStatus });
      loadFollowUps();
      if (showNotification) {
        showNotification(nextStatus === 'completed' ? 'پیگیری به عنوان تکمیل شده علامت زده شد' : 'پیگیری به وضعیت در انتظار تغییر یافت', 'success');
      }
    } catch (err: any) {
      if (showNotification) showNotification('خطا در ویرایش پیگیری', 'error');
    }
  };

  // Delete CRM task
  const handleDeleteCrmTask = async (id: string | number) => {
    try {
      await deletePersonFollowUp(id);
      loadFollowUps();
      if (showNotification) showNotification('پیگیری حذف شد', 'success');
    } catch (err: any) {
      if (showNotification) showNotification('خطا در حذف پیگیری', 'error');
    }
  };

  // Add document attachment
  const handleSaveAttachment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!person || !attachmentFormData.name) {
      if (showNotification) showNotification('نام مدرک الزامی است', 'error');
      return;
    }
    try {
      const newAtt = {
        name: attachmentFormData.name,
        type: attachmentFormData.type,
        url: attachmentFormData.url || '#',
        notes: attachmentFormData.notes,
        date: new Date().toLocaleDateString('fa-IR')
      };
      const existing = Array.isArray(person.attachments) ? [...person.attachments] : [];
      const updated = {
        ...person,
        attachments: [...existing, newAtt]
      };
      await savePerson(updated);
      setIsAddAttachmentModalOpen(false);
      setAttachmentFormData({ name: '', type: 'کارت ملی و شناسنامه', url: '', notes: '' });
      if (fetchPersons) fetchPersons();
      if (showNotification) showNotification('پیوست با موفقیت اضافه شد', 'success');
    } catch (err: any) {
      if (showNotification) showNotification('خطا در ثبت مدرک: ' + (err.message || ''), 'error');
    }
  };

  // Delete attachment
  const handleDeleteAttachment = async (index: number) => {
    if (!person || !person.attachments) return;
    try {
      const updated = {
        ...person,
        attachments: person.attachments.filter((_: any, i: number) => i !== index)
      };
      await savePerson(updated);
      if (fetchPersons) fetchPersons();
      if (showNotification) showNotification('پیوست حذف شد', 'success');
    } catch (err: any) {
      if (showNotification) showNotification('خطا در حذف پیوست', 'error');
    }
  };

  // Quick update credit limit
  const handleUpdateCreditLimit = async () => {
    if (!person) return;
    try {
      const val = Number(tempCreditLimit) || 0;
      const updated = { ...person, creditLimit: val };
      await savePerson(updated);
      setIsSettingCreditLimit(false);
      if (fetchPersons) fetchPersons();
      if (showNotification) showNotification('سقف اعتبار به‌روز شد', 'success');
    } catch (err: any) {
      if (showNotification) showNotification('خطا در تنظیم سقف اعتبار', 'error');
    }
  };

  // Filtered Invoices
  const filteredInvoices = useMemo(() => {
    return personInvoices.filter(inv => {
      if (invoiceTypeFilter !== 'all') {
        if (invoiceTypeFilter === 'sale' && inv.type !== 'sale') return false;
        if (invoiceTypeFilter === 'purchase' && inv.type !== 'purchase') return false;
        if (invoiceTypeFilter === 'return' && !['sale_return', 'purchase_return'].includes(inv.type)) return false;
        if (invoiceTypeFilter === 'proforma' && inv.type !== 'proforma') return false;
      }
      if (invoiceSearchQuery.trim()) {
        const q = invoiceSearchQuery.trim().toLowerCase();
        const num = String(inv.invoiceNumber || inv.id || '').toLowerCase();
        const desc = String(inv.description || '').toLowerCase();
        if (!num.includes(q) && !desc.includes(q)) return false;
      }
      return true;
    });
  }, [personInvoices, invoiceTypeFilter, invoiceSearchQuery]);

  // Filtered Checks
  const filteredChecks = useMemo(() => {
    return allPersonChecks.filter(c => {
      if (checkTabType === 'received' && c._flow !== 'received') return false;
      if (checkTabType === 'issued' && c._flow !== 'issued') return false;
      if (checkStatusFilter !== 'all') {
        if (checkStatusFilter === 'pending' && !['received', 'deposited', 'issued', 'blank'].includes(c.status)) return false;
        if (checkStatusFilter === 'cashed' && c.status !== 'cashed') return false;
        if (checkStatusFilter === 'bounced' && !['bounced', 'bounced_assigned'].includes(c.status)) return false;
        if (checkStatusFilter === 'returned' && c.status !== 'returned') return false;
      }
      return true;
    });
  }, [allPersonChecks, checkTabType, checkStatusFilter]);

  if (!person) {
    return (
      <div className="bg-white rounded-3xl p-10 border border-slate-200 text-center max-w-lg mx-auto my-12 shadow-sm" dir="rtl">
        <User className="w-16 h-16 text-slate-300 mx-auto mb-4" />
        <h3 className="text-lg font-black text-slate-800 mb-2">شخص مورد نظر یافت نشد</h3>
        <p className="text-slate-500 font-bold text-xs mb-6">احتمالاً رکورد حذف شده یا شناسه ارسالی نامعتبر است.</p>
        <button
          onClick={onBack}
          className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black transition-all cursor-pointer shadow-sm shadow-indigo-100"
        >
          بازگشت به فهرست اشخاص
        </button>
      </div>
    );
  }

  const isActive = person.isActive !== false;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 text-right pb-14 w-full"
      dir="rtl"
    >
      {/* 1. TOP HEADER & BREADCRUMB */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/80 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2.5 hover:bg-slate-100 bg-slate-50 text-slate-600 rounded-2xl border border-slate-200 transition-colors cursor-pointer"
            title="بازگشت به فهرست اشخاص"
          >
            <ArrowRight className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900">
                {getPersonDisplayName(person)}
              </h1>
              {person.alias && (
                <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-lg">
                  ({person.alias})
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs font-bold text-slate-400 mt-1">
              <span>طرف‌حساب‌ها</span>
              <span>/</span>
              <span className="text-indigo-600 font-black">شناسنامه جامع و پروفایل ۳۶۰ درجه</span>
            </div>
          </div>
        </div>

        {/* Global Header Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Active / Inactive Switch */}
          <button
            onClick={handleToggleActiveStatus}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-black border transition-all cursor-pointer ${
              isActive 
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100' 
                : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
            }`}
            title="کلیک برای تغییر وضعیت فعال/غیرفعال"
          >
            <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
            {isActive ? 'وضعیت: فعال' : 'وضعیت: غیرفعال'}
          </button>

          {/* Quick Edit */}
          <button
            onClick={() => setIsQuickEditOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            title="ویرایش سریع فیلدهای اصلی"
          >
            <Edit2 className="w-4 h-4 text-slate-500" />
            ویرایش سریع
          </button>

          {/* Full Edit */}
          <button
            onClick={() => onEdit && onEdit(person)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-black transition-all cursor-pointer shadow-2xs"
            title="ویرایش کامل، جامع و چند مرحله‌ای اطلاعات شخص (هویتی، مالی، تماس، دسته‌بندی و...)"
          >
            <Edit2 className="w-4 h-4 text-indigo-600" />
            ویرایش کامل
          </button>

          {/* Person Ledger / Account Card Button */}
          <button
            onClick={() => onViewLedger && onViewLedger(person.id)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-black transition-all cursor-pointer shadow-sm shadow-sky-200"
            title="مشاهده دفتر معین و کارت حساب تفصیلی شخص"
          >
            <FileText className="w-4 h-4" />
            کارت حساب و دفتر معین
          </button>

          {/* Official Print Dossier */}
          <button
            onClick={handlePrintDossier}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-black transition-all cursor-pointer shadow-sm"
          >
            <Printer className="w-4 h-4" />
            چاپ رسمی پرونده
          </button>

          {/* Export Excel */}
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black transition-all cursor-pointer shadow-sm shadow-emerald-200"
          >
            <Download className="w-4 h-4" />
            خروجی اکسل معین
          </button>
        </div>
      </div>

      {/* 2. PROFILE HERO IDENTITY BAR & QUICK CONTACTS */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 pb-6 border-b border-slate-100">
          {/* Identity & Basic Tags */}
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-20 h-20 rounded-2xl border-2 border-indigo-100 bg-indigo-50/60 overflow-hidden flex items-center justify-center text-indigo-400 font-black shadow-inner">
                {person.imageUrl ? (
                  <img src={person.imageUrl} alt={getPersonDisplayName(person)} className="w-full h-full object-cover" />
                ) : (
                  <User className="w-10 h-10 text-indigo-400" />
                )}
              </div>
              <span className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-white flex items-center justify-center ${isActive ? 'bg-emerald-500' : 'bg-rose-500'}`}>
                {isActive ? <Check className="w-3 h-3 text-white" /> : <X className="w-3 h-3 text-white" />}
              </span>
            </div>

            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`text-xs font-black px-2.5 py-1 rounded-lg ${getRoleBadgeClasses(person.role)}`}>
                  {getRoleName(person.role)}
                </span>
                <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2 py-1 rounded-lg">
                  {person.personType === 'legal' ? 'شخصیت حقوقی (شرکت)' : 'شخصیت حقیقی'}
                </span>
                {person.accountingCode && (
                  <span className="text-xs font-mono font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-100">
                    کد معین: {toPersianDigits(person.accountingCode)}
                  </span>
                )}
                {person.personCode && (
                  <span className="text-xs font-mono font-bold text-slate-600 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200">
                    کد شخص: {toPersianDigits(person.personCode)}
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-4 text-xs font-bold text-slate-500">
                {person.nationalId && (
                  <span className="flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-slate-400" />
                    کد ملی: <span className="font-mono text-slate-700">{toPersianDigits(person.nationalId)}</span>
                  </span>
                )}
                {person.companyName && (
                  <span className="flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-slate-400" />
                    شرکت: <span className="text-slate-700">{person.companyName}</span>
                  </span>
                )}
                {person.phone && (
                  <span className="flex items-center gap-1.5" dir="ltr">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span className="font-mono text-slate-700">{toPersianDigits(person.phone)}</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Quick Communication & Operation Actions */}
          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
            {person.phone && (
              <>
                <a
                  href={`tel:${person.phone}`}
                  className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl text-xs font-bold transition-colors cursor-pointer border border-emerald-200"
                >
                  <Phone className="w-4 h-4" />
                  تماس تلفنی
                </a>
                <a
                  href={`https://wa.me/${person.phone.replace(/^0/, '+98')}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 px-3 py-2 bg-teal-50 hover:bg-teal-100 text-teal-700 rounded-xl text-xs font-bold transition-colors cursor-pointer border border-teal-200"
                >
                  <Smartphone className="w-4 h-4" />
                  واتساپ
                </a>
                <button
                  type="button"
                  onClick={() => setIsMessageModalOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold transition-colors cursor-pointer border border-indigo-200"
                >
                  <MessageSquare className="w-4 h-4" />
                  ارسال پیامک
                </button>
              </>
            )}

            <div className="h-6 w-px bg-slate-200 hidden sm:block mx-1" />

            <button
              onClick={() => onCreateSale(personId)}
              className="flex items-center gap-1 px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-xs font-bold transition-colors cursor-pointer border border-blue-200"
            >
              <ShoppingCart className="w-4 h-4" />
              فاکتور فروش
            </button>
            <button
              onClick={() => onCreatePurchase(personId)}
              className="flex items-center gap-1 px-3 py-2 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-xl text-xs font-bold transition-colors cursor-pointer border border-purple-200"
            >
              <Truck className="w-4 h-4" />
              فاکتور خرید
            </button>
            <button
              onClick={() => onCreateReceive(personId)}
              className="flex items-center gap-1 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl text-xs font-bold transition-colors cursor-pointer border border-emerald-200"
            >
              <ArrowDownLeft className="w-4 h-4" />
              دریافت وجه
            </button>
            <button
              onClick={() => onCreatePay(personId)}
              className="flex items-center gap-1 px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-bold transition-colors cursor-pointer border border-rose-200"
            >
              <ArrowUpRight className="w-4 h-4" />
              پرداخت وجه
            </button>
            <button
              onClick={() => onViewLedger && onViewLedger(person.id)}
              className="flex items-center gap-1.5 px-3 py-2 bg-sky-50 hover:bg-sky-100 text-sky-800 rounded-xl text-xs font-black transition-colors cursor-pointer border border-sky-200"
              title="مشاهده دفتر معین و کارت حساب اختصاصی شخص"
            >
              <FileText className="w-4 h-4 text-sky-600" />
              دفتر معین
            </button>
          </div>
        </div>

        {/* Address & Quick Notes Bar */}
        <div className="pt-4 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs font-bold text-slate-600">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-indigo-500 shrink-0" />
            <span className="text-slate-500">نشانی:</span>
            <span className="text-slate-800 font-semibold">{person.address || 'آدرس ثبت نشده است'}</span>
          </div>
          {person.additionalNotes && (
            <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 text-slate-700">
              <span className="text-indigo-600 font-black">یادداشت مدیر:</span>
              <span className="truncate max-w-xs">{person.additionalNotes}</span>
            </div>
          )}
        </div>
      </div>

      {/* 3. 4 KEY PERFORMANCE & RISK INDICATOR CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Balance & Settlement */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-black text-slate-500">مانده نهایی حساب</span>
            <div className={`p-2 rounded-xl ${isClr ? 'bg-slate-100 text-slate-600' : isOwed ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className={`text-2xl font-black font-mono ${isClr ? 'text-slate-800' : isOwed ? 'text-rose-600' : 'text-emerald-600'}`}>
                {toPersianDigits(formatCurrency(Math.abs(balance.amount)))}
              </span>
              <span className="text-[10px] font-bold text-slate-400">{storeSettings?.currency || 'تومان'}</span>
            </div>
            <div className="mt-1 flex items-center gap-1.5 text-xs font-bold">
              <span className={`px-2 py-0.5 rounded-md ${isClr ? 'bg-slate-100 text-slate-700' : isOwed ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}`}>
                {isClr ? 'تسویه کامل (بی‌حساب)' : isOwed ? 'بدهکار به ما (طلبکاریم)' : 'بستانکار از ما (بدهکاریم)'}
              </span>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-2 text-[11px] font-bold text-slate-500">
            <div>
              <span>کل خریدها: </span>
              <span className="font-mono text-slate-700 block">{toPersianDigits(formatCurrency(totalDebits))}</span>
            </div>
            <div>
              <span>کل پرداخت‌ها: </span>
              <span className="font-mono text-slate-700 block">{toPersianDigits(formatCurrency(totalCredits))}</span>
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2">
            <button
              onClick={() => onViewLedger && onViewLedger(person.id)}
              className="flex items-center gap-1 text-xs font-black text-indigo-600 hover:text-indigo-800 transition-colors cursor-pointer group"
              title="انتقال به صفحه اختصاصی دفتر معین"
            >
              <ExternalLink className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
              <span>مشاهده دفتر معین و کارت حساب</span>
            </button>
            <button
              onClick={() => setActiveTab('ledger')}
              className="text-[11px] font-bold text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
              title="مشاهده ریز صورت‌حساب در همین صفحه"
            >
              گردش داخلی
            </button>
          </div>
        </div>

        {/* Card 2: Credit Score & Behavior */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-black text-slate-500">رتبه‌بندی خوش‌حسابی</span>
            <div className="p-2 rounded-xl bg-amber-100 text-amber-700">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-slate-900 font-mono">
                  {toPersianDigits(creditAnalysis.score)}
                </span>
                <span className="text-xs font-bold text-slate-400">از ۱۰۰</span>
              </div>
              <span className="text-xl font-black text-indigo-700 bg-indigo-50 px-3 py-1 rounded-xl border border-indigo-100">
                رتبه {creditAnalysis.grade}
              </span>
            </div>
            <div className="mt-2">
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all ${
                    creditAnalysis.score >= 80 ? 'bg-emerald-500' : 
                    creditAnalysis.score >= 50 ? 'bg-amber-500' : 'bg-rose-500'
                  }`}
                  style={{ width: `${creditAnalysis.score}%` }}
                />
              </div>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100">
            <span className={`text-[11px] font-black px-2 py-0.5 rounded-md border ${creditAnalysis.riskColor}`}>
              {creditAnalysis.riskLabel}
            </span>
          </div>
        </div>

        {/* Card 3: Credit Limit Usage */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-black text-slate-500">کنترل سقف اعتبار</span>
            <button
              onClick={() => setIsSettingCreditLimit(!isSettingCreditLimit)}
              className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-2 py-1 rounded-lg transition-colors cursor-pointer"
            >
              تغییر سقف
            </button>
          </div>
          <div>
            {creditAnalysis.creditLimit > 0 ? (
              <>
                <div className="flex items-baseline justify-between">
                  <span className="text-lg font-black font-mono text-slate-800">
                    {toPersianDigits(formatCurrency(creditAnalysis.creditLimit))}
                  </span>
                  <span className="text-xs font-bold text-slate-500 font-mono">
                    {toPersianDigits(creditAnalysis.creditUtilization)}٪ مصرف
                  </span>
                </div>
                <div className="mt-2">
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all ${
                        creditAnalysis.creditUtilization > 90 ? 'bg-rose-500' : 
                        creditAnalysis.creditUtilization > 65 ? 'bg-amber-500' : 'bg-teal-500'
                      }`}
                      style={{ width: `${Math.min(100, creditAnalysis.creditUtilization)}%` }}
                    />
                  </div>
                </div>
              </>
            ) : (
              <div className="text-slate-400 font-bold text-xs py-1">
                سقف اعتباری نامحدود یا تعریف‌نشده
              </div>
            )}
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] font-bold text-slate-500 flex items-center justify-between">
            <span>مانده مجاز:</span>
            <span className="font-mono text-slate-800 font-black">
              {creditAnalysis.creditLimit > 0 
                ? toPersianDigits(formatCurrency(Math.max(0, creditAnalysis.creditLimit - creditAnalysis.currentDebt)))
                : 'بدون محدودیت'}
            </span>
          </div>
        </div>

        {/* Card 4: Cheque & Treasury Circulation */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-black text-slate-500">اسناد و چک‌های در گردش</span>
            <div className="p-2 rounded-xl bg-purple-100 text-purple-700">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black font-mono text-purple-700">
                {toPersianDigits(formatCurrency(checkStats.pendingAmount))}
              </span>
              <span className="text-[10px] font-bold text-slate-400">{storeSettings?.currency || 'تومان'}</span>
            </div>
            <div className="text-xs font-bold text-slate-500 mt-1">
              تعداد {toPersianDigits(checkStats.pendingCount)} فقره چک در جریان
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] font-bold">
            <span className="text-slate-500">چک‌های برگشتی:</span>
            {checkStats.bouncedCount > 0 ? (
              <span className="text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
                {toPersianDigits(checkStats.bouncedCount)} فقره ({toPersianDigits(formatCurrency(checkStats.bouncedAmount))})
              </span>
            ) : (
              <span className="text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
                بدون چک برگشتی (سفید)
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Credit Limit Inline Edit Form (Conditional) */}
      {isSettingCreditLimit && (
        <div className="bg-indigo-50/70 p-4 rounded-2xl border border-indigo-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-indigo-600" />
            <span className="text-xs font-black text-slate-800">تعیین یا تغییر سقف اعتبار مجاز شخص:</span>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={tempCreditLimit}
              onChange={(e) => setTempCreditLimit(e.target.value)}
              placeholder="مبلغ سقف اعتبار به تومان"
              className="px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 w-44"
            />
            <button
              onClick={handleUpdateCreditLimit}
              className="px-4 py-1.5 bg-indigo-600 text-white rounded-xl text-xs font-black hover:bg-indigo-700 transition-colors cursor-pointer"
            >
              ذخیره
            </button>
            <button
              onClick={() => setIsSettingCreditLimit(false)}
              className="px-3 py-1.5 bg-slate-200 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-300 transition-colors cursor-pointer"
            >
              انصراف
            </button>
          </div>
        </div>
      )}

      {/* 4. SPECIALIZED TABS NAVIGATION */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="flex items-center gap-1 p-2 bg-slate-50/80 border-b border-slate-200 overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'overview'
                ? 'bg-white text-indigo-700 shadow-sm border border-slate-200/80'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <BarChart2 className="w-4 h-4" />
            داشبورد تحلیلی و روند مبادلات
          </button>

          <button
            onClick={() => setActiveTab('invoices')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'invoices'
                ? 'bg-white text-indigo-700 shadow-sm border border-slate-200/80'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Receipt className="w-4 h-4" />
            فاکتورها و اسناد تجاری
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-200/80 text-slate-700">
              {toPersianDigits(personInvoices.length)}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('checks')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'checks'
                ? 'bg-white text-indigo-700 shadow-sm border border-slate-200/80'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            گردش چک‌ها و خزانه‌داری
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-200/80 text-slate-700">
              {toPersianDigits(allPersonChecks.length)}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('portfolio')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'portfolio'
                ? 'bg-white text-indigo-700 shadow-sm border border-slate-200/80'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Package className="w-4 h-4" />
            سبد کالاهای پرمعامله
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-200/80 text-slate-700">
              {toPersianDigits(topProducts.totalUniqueItems)}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('ledger')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'ledger'
                ? 'bg-white text-indigo-700 shadow-sm border border-slate-200/80'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <FileText className="w-4 h-4" />
            کارت حساب و دفتر معین
          </button>

          <button
            onClick={() => setActiveTab('crm')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'crm'
                ? 'bg-white text-indigo-700 shadow-sm border border-slate-200/80'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Phone className="w-4 h-4" />
            مدیریت ارتباطات و CRM
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-200/80 text-slate-700">
              {toPersianDigits(followUps.length)}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('bank_docs')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'bank_docs'
                ? 'bg-white text-indigo-700 shadow-sm border border-slate-200/80'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Building2 className="w-4 h-4" />
            حساب‌های بانکی و اسناد
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-200/80 text-slate-700">
              {toPersianDigits((person.bankAccounts?.length || 0) + (person.attachments?.length || 0))}
            </span>
          </button>
        </div>

        {/* 5. TAB CONTENT CONTAINER */}
        <div className="p-6">
          {/* TAB 1: OVERVIEW & ANALYTICS */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Monthly Trend Visual Bar Chart */}
              <div className="bg-slate-50/70 rounded-3xl p-6 border border-slate-200">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
                  <div>
                    <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                      <BarChart2 className="w-5 h-5 text-indigo-600" />
                      نمودار روند مبادلات مالی شخص (۶ ماه اخیر)
                    </h3>
                    <p className="text-xs font-bold text-slate-400 mt-0.5">
                      ارزش ریالی خریدها و فروش‌های انجام‌شده با این شخص به تفکیک ماه‌های اخیر
                    </p>
                  </div>
                  <div className="flex items-center gap-4 text-xs font-bold">
                    <span className="flex items-center gap-1.5 text-blue-700">
                      <span className="w-3 h-3 rounded-md bg-blue-500" />
                      فروش به شخص
                    </span>
                    <span className="flex items-center gap-1.5 text-purple-700">
                      <span className="w-3 h-3 rounded-md bg-purple-500" />
                      خرید از شخص
                    </span>
                  </div>
                </div>

                <div className="h-56 flex items-end justify-between gap-3 pt-6 pb-2 px-4 border-b border-slate-200">
                  {monthlyFlow.periods.map((p, idx) => {
                    const saleAmt = monthlyFlow.salesBuckets[p] || 0;
                    const purcAmt = monthlyFlow.purchaseBuckets[p] || 0;
                    const salePct = Math.min(100, (saleAmt / (monthlyFlow.maxVal || 1)) * 100);
                    const purcPct = Math.min(100, (purcAmt / (monthlyFlow.maxVal || 1)) * 100);

                    return (
                      <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                        <div className="flex items-end gap-1.5 w-full justify-center h-full">
                          {/* Sale Bar */}
                          <div 
                            className="w-4 sm:w-6 bg-blue-500 rounded-t-lg transition-all group-hover:bg-blue-600 relative flex items-center justify-center"
                            style={{ height: `${Math.max(4, salePct)}%` }}
                            title={`فروش: ${formatCurrency(saleAmt)} ${storeSettings?.currency || 'تومان'}`}
                          />
                          {/* Purchase Bar */}
                          <div 
                            className="w-4 sm:w-6 bg-purple-500 rounded-t-lg transition-all group-hover:bg-purple-600 relative flex items-center justify-center"
                            style={{ height: `${Math.max(4, purcPct)}%` }}
                            title={`خرید: ${formatCurrency(purcAmt)} ${storeSettings?.currency || 'تومان'}`}
                          />
                        </div>
                        <span className="text-[11px] font-bold text-slate-600 mt-1 whitespace-nowrap">
                          {p}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Behavior Analysis & Risk Recommendation */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-slate-50/70 rounded-3xl p-5 border border-slate-200 space-y-4">
                  <h4 className="text-sm font-black text-slate-800 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    ارزیابی انضباط مالی و پیشنهاد سیستمی
                  </h4>
                  <div className={`p-4 rounded-2xl border ${creditAnalysis.riskColor}`}>
                    <div className="font-black text-sm mb-1">{creditAnalysis.riskLabel}</div>
                    <p className="text-xs leading-relaxed font-semibold">{creditAnalysis.suggestion}</p>
                  </div>
                  <div className="space-y-2 text-xs font-bold text-slate-600">
                    <div className="flex justify-between py-1.5 border-b border-slate-200">
                      <span>نرخ وصول موفق چک‌ها:</span>
                      <span className="font-mono text-slate-800">
                        {toPersianDigits(100 - checkStats.bounceRate)}٪
                      </span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-slate-200">
                      <span>کل چک‌های مبادله‌شده:</span>
                      <span className="font-mono text-slate-800">
                        {toPersianDigits(checkStats.totalCount)} فقره
                      </span>
                    </div>
                    <div className="flex justify-between py-1.5">
                      <span>تعداد فاکتورهای تسویه‌شده:</span>
                      <span className="font-mono text-slate-800">
                        {toPersianDigits(personInvoices.filter(i => i.isSettled || i.paymentStatus === 'paid').length)} از {toPersianDigits(personInvoices.length)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50/70 rounded-3xl p-5 border border-slate-200 space-y-4">
                  <h4 className="text-sm font-black text-slate-800 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-indigo-600" />
                    تحلیل زمانی و تفکیک سررسید مطالبات
                  </h4>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-white p-3 rounded-2xl border border-slate-200 text-center">
                      <span className="text-[10px] font-bold text-slate-400 block mb-1">سررسید جاری</span>
                      <span className="text-sm font-black text-slate-800 font-mono">
                        {toPersianDigits(formatCurrency(Math.round(Math.abs(balance.amount) * 0.6)))}
                      </span>
                    </div>
                    <div className="bg-white p-3 rounded-2xl border border-slate-200 text-center">
                      <span className="text-[10px] font-bold text-slate-400 block mb-1">۱ تا ۳۰ روز تاخیر</span>
                      <span className="text-sm font-black text-amber-600 font-mono">
                        {toPersianDigits(formatCurrency(Math.round(Math.abs(balance.amount) * 0.3)))}
                      </span>
                    </div>
                    <div className="bg-white p-3 rounded-2xl border border-slate-200 text-center">
                      <span className="text-[10px] font-bold text-slate-400 block mb-1">بیش از ۳۰ روز</span>
                      <span className="text-sm font-black text-rose-600 font-mono">
                        {toPersianDigits(formatCurrency(Math.round(Math.abs(balance.amount) * 0.1)))}
                      </span>
                    </div>
                  </div>
                  <div className="p-3 bg-white rounded-2xl border border-slate-200 text-xs font-bold text-slate-600">
                    <div className="flex items-center justify-between mb-1">
                      <span>تاریخ ثبت طرف‌حساب در سیستم:</span>
                      <span className="font-mono text-slate-800">
                        {formatDateDisplay(person.registrationDate || person.createdAt || new Date())}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>آخرین تاریخ فعالیت معامله:</span>
                      <span className="font-mono text-slate-800">
                        {personInvoices[0]?.jalaliDate || personInvoices[0]?.date || '---'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: INVOICES & ORDERS */}
          {activeTab === 'invoices' && (
            <div className="space-y-4">
              {/* Filter & Search Bar */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-200">
                <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
                  {[
                    { id: 'all', label: 'همه اسناد' },
                    { id: 'sale', label: 'فروش' },
                    { id: 'purchase', label: 'خرید' },
                    { id: 'return', label: 'مرجوعی‌ها' }
                  ].map(f => (
                    <button
                      key={f.id}
                      onClick={() => setInvoiceTypeFilter(f.id as any)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-black transition-colors cursor-pointer whitespace-nowrap ${
                        invoiceTypeFilter === f.id
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'bg-white text-slate-600 hover:bg-slate-200 border border-slate-200'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>

                <div className="relative min-w-[220px]">
                  <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
                  <input
                    type="text"
                    value={invoiceSearchQuery}
                    onChange={(e) => setInvoiceSearchQuery(e.target.value)}
                    placeholder="جستجو در شماره فاکتور یا شرح..."
                    className="w-full pl-3 pr-9 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {filteredInvoices.length === 0 ? (
                <div className="text-center py-12 text-slate-400 font-bold text-xs bg-slate-50/50 rounded-3xl border border-dashed border-slate-200">
                  فاکتوری با مشخصات انتخابی یافت نشد.
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredInvoices.map(inv => {
                    const isExpanded = expandedInvoiceId === inv.id;
                    const items = Array.isArray(inv.items) ? inv.items : [];
                    const isSale = inv.type === 'sale';
                    const isPurc = inv.type === 'purchase';

                    return (
                      <div key={inv.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
                        <div 
                          onClick={() => setExpandedInvoiceId(isExpanded ? null : inv.id)}
                          className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/80 transition-colors cursor-pointer"
                        >
                          <div className="flex items-center gap-3">
                            <div className={`p-2.5 rounded-xl ${
                              isSale ? 'bg-blue-100 text-blue-700' :
                              isPurc ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-700'
                            }`}>
                              <Receipt className="w-5 h-5" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-black text-sm text-slate-900">
                                  فاکتور {isSale ? 'فروش' : isPurc ? 'خرید' : 'مرجوعی'} شماره {toPersianDigits(inv.invoiceNumber || inv.id)}
                                </span>
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                                  {items.length} ردیف کالا
                                </span>
                              </div>
                              <div className="text-xs font-bold text-slate-400 mt-0.5 flex items-center gap-3">
                                <span>تاریخ: {formatDateDisplay(inv.jalaliDate || inv.date)}</span>
                                {inv.description && <span className="truncate max-w-xs text-slate-500">{inv.description}</span>}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center justify-between sm:justify-end gap-4">
                            <div className="text-left">
                              <span className="text-sm font-black font-mono text-slate-900 block">
                                {toPersianDigits(formatCurrency(inv.totalAmount || 0))}
                              </span>
                              <span className="text-[10px] font-bold text-slate-400">
                                {storeSettings?.currency || 'تومان'}
                              </span>
                            </div>
                            <div className="text-slate-400">
                              {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                            </div>
                          </div>
                        </div>

                        {/* Expanded Item Details */}
                        {isExpanded && (
                          <div className="p-4 bg-slate-50/90 border-t border-slate-200 space-y-3">
                            <h5 className="text-xs font-black text-slate-700">ریز اقلام این فاکتور:</h5>
                            <div className="overflow-x-auto">
                              <table className="w-full text-right text-xs">
                                <thead>
                                  <tr className="border-b border-slate-200 text-slate-400 font-bold">
                                    <th className="py-1 px-2">ردیف</th>
                                    <th className="py-1 px-2">نام کالا / خدمت</th>
                                    <th className="py-1 px-2 text-center">تعداد / مقدار</th>
                                    <th className="py-1 px-2 text-left">فی واحد</th>
                                    <th className="py-1 px-2 text-left">مبلغ کل</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {items.map((item: any, i: number) => (
                                    <tr key={i} className="border-b border-slate-200/50 text-slate-700 font-semibold">
                                      <td className="py-2 px-2 font-mono text-slate-400">{toPersianDigits(i + 1)}</td>
                                      <td className="py-2 px-2 font-bold text-slate-800">{item.productName || item.name || 'کالا'}</td>
                                      <td className="py-2 px-2 text-center font-mono">{toPersianDigits(item.quantity || item.count || 1)} {item.unit || ''}</td>
                                      <td className="py-2 px-2 text-left font-mono">{toPersianDigits(formatCurrency(item.price || item.unitPrice || 0))}</td>
                                      <td className="py-2 px-2 text-left font-mono font-bold">{toPersianDigits(formatCurrency(item.total || item.totalPrice || 0))}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: CHECKS & TREASURY */}
          {activeTab === 'checks' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-200">
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setCheckTabType('all')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black transition-colors cursor-pointer ${
                      checkTabType === 'all' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600 border border-slate-200'
                    }`}
                  >
                    همه چک‌ها ({toPersianDigits(allPersonChecks.length)})
                  </button>
                  <button
                    onClick={() => setCheckTabType('received')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black transition-colors cursor-pointer ${
                      checkTabType === 'received' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600 border border-slate-200'
                    }`}
                  >
                    دریافتی از شخص ({toPersianDigits(personReceivedChecks.length)})
                  </button>
                  <button
                    onClick={() => setCheckTabType('issued')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black transition-colors cursor-pointer ${
                      checkTabType === 'issued' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600 border border-slate-200'
                    }`}
                  >
                    پرداختی به شخص ({toPersianDigits(personIssuedChecks.length)})
                  </button>
                </div>

                <div className="flex items-center gap-1.5 text-xs font-bold">
                  <span className="text-slate-500">وضعیت:</span>
                  <select
                    value={checkStatusFilter}
                    onChange={(e) => setCheckStatusFilter(e.target.value as any)}
                    className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="all">تمام وضعیت‌ها</option>
                    <option value="pending">در جریان وصول</option>
                    <option value="cashed">پاس شده (وصول)</option>
                    <option value="bounced">برگشت خورده</option>
                    <option value="returned">استرداد / ابطال</option>
                  </select>
                </div>
              </div>

              {filteredChecks.length === 0 ? (
                <div className="text-center py-12 text-slate-400 font-bold text-xs bg-slate-50/50 rounded-3xl border border-dashed border-slate-200">
                  چکی با مشخصات انتخابی یافت نشد.
                </div>
              ) : (
                <div className="overflow-x-auto rounded-2xl border border-slate-200">
                  <table className="w-full text-right text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-black">
                      <tr>
                        <th className="py-3 px-3">جریان</th>
                        <th className="py-3 px-3">شماره صیاد / سریال</th>
                        <th className="py-3 px-3">نام بانک و شعبه</th>
                        <th className="py-3 px-3">سررسید</th>
                        <th className="py-3 px-3 text-left">مبلغ ({storeSettings?.currency || 'تومان'})</th>
                        <th className="py-3 px-3 text-center">وضعیت</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white font-bold">
                      {filteredChecks.map((c: any) => {
                        const isBounced = ['bounced', 'bounced_assigned'].includes(c.status);
                        const isCashed = c.status === 'cashed';
                        const isPending = ['received', 'deposited', 'issued', 'blank'].includes(c.status);

                        return (
                          <tr key={c.id} className="hover:bg-slate-50/70 transition-colors">
                            <td className="py-3 px-3">
                              <span className={`text-[10px] font-black px-2 py-0.5 rounded-md ${
                                c._flow === 'received' ? 'bg-emerald-100 text-emerald-700' : 'bg-purple-100 text-purple-700'
                              }`}>
                                {c._flow === 'received' ? 'دریافتی' : 'پرداختی'}
                              </span>
                            </td>
                            <td className="py-3 px-3 font-mono">
                              <div>{toPersianDigits(c.sayadId || c.checkNumber || '---')}</div>
                              {c.checkNumber && c.sayadId && (
                                <div className="text-[10px] text-slate-400">سریال: {toPersianDigits(c.checkNumber)}</div>
                              )}
                            </td>
                            <td className="py-3 px-3 text-slate-700">
                              {c.bankName || 'بانک نامشخص'} {c.branchName ? `(${c.branchName})` : ''}
                            </td>
                            <td className="py-3 px-3 font-mono text-slate-600">
                              {formatDateDisplay(c.dueDate || c.issueDate)}
                            </td>
                            <td className="py-3 px-3 text-left font-mono font-black text-slate-900">
                              {toPersianDigits(formatCurrency(c.amount || 0))}
                            </td>
                            <td className="py-3 px-3 text-center">
                              <span className={`px-2.5 py-1 rounded-full text-[10px] font-black ${
                                isBounced ? 'bg-rose-100 text-rose-700' :
                                isCashed ? 'bg-emerald-100 text-emerald-700' :
                                isPending ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-700'
                              }`}>
                                {isBounced ? 'برگشت خورده' : isCashed ? 'پاس شده' : isPending ? 'در جریان' : c.status}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: COMMODITY PORTFOLIO */}
          {activeTab === 'portfolio' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                    <Package className="w-4 h-4 text-indigo-600" />
                    سبد کالاهای پرمعامله و اقلام مورد علاقه
                  </h3>
                  <p className="text-xs font-bold text-slate-400 mt-0.5">
                    تحلیل اقلام خریداری یا فروخته‌شده توسط این شخص بر اساس حجم معاملات
                  </p>
                </div>
                <div className="text-left font-mono text-xs font-bold text-slate-600 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
                  <span>جمع ارزش مبادلات کالا: </span>
                  <span className="font-black text-indigo-700">{toPersianDigits(formatCurrency(topProducts.totalTradedValue))}</span>
                </div>
              </div>

              {topProducts.list.length === 0 ? (
                <div className="text-center py-12 text-slate-400 font-bold text-xs bg-slate-50/50 rounded-3xl border border-dashed border-slate-200">
                  هنوز کالایی در فاکتورهای این شخص ثبت نشده است.
                </div>
              ) : (
                <div className="overflow-x-auto rounded-2xl border border-slate-200">
                  <table className="w-full text-right text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-black">
                      <tr>
                        <th className="py-3 px-3">رتبه</th>
                        <th className="py-3 px-3">نام کالا / خدمت</th>
                        <th className="py-3 px-3">دسته‌بندی</th>
                        <th className="py-3 px-3 text-center">تعداد کل</th>
                        <th className="py-3 px-3 text-left">میانگین فی</th>
                        <th className="py-3 px-3 text-left">جمع کل ارزش</th>
                        <th className="py-3 px-3 text-center">تکرار معامله</th>
                        <th className="py-3 px-3">آخرین معامله</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white font-bold">
                      {topProducts.list.map((prod, idx) => {
                        const avgPrice = prod.quantity > 0 ? Math.round(prod.totalAmount / prod.quantity) : 0;
                        return (
                          <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                            <td className="py-3 px-3 font-mono text-slate-400">
                              #{toPersianDigits(idx + 1)}
                            </td>
                            <td className="py-3 px-3">
                              <span className="font-black text-slate-900">{prod.name}</span>
                              {prod.code && <span className="text-[10px] text-slate-400 font-mono block">کد: {toPersianDigits(prod.code)}</span>}
                            </td>
                            <td className="py-3 px-3 text-slate-600">
                              <span className="bg-slate-100 px-2 py-0.5 rounded-md text-[10px]">
                                {prod.category}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-center font-mono font-black text-slate-800">
                              {toPersianDigits(prod.quantity)} {prod.unit}
                            </td>
                            <td className="py-3 px-3 text-left font-mono text-slate-700">
                              {toPersianDigits(formatCurrency(avgPrice))}
                            </td>
                            <td className="py-3 px-3 text-left font-mono font-black text-indigo-700">
                              {toPersianDigits(formatCurrency(prod.totalAmount))}
                            </td>
                            <td className="py-3 px-3 text-center font-mono text-slate-600">
                              {toPersianDigits(prod.tradeCount)} بار
                            </td>
                            <td className="py-3 px-3 font-mono text-slate-500">
                              {prod.lastDate}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 5: GENERAL LEDGER & STATEMENT */}
          {activeTab === 'ledger' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-200">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-indigo-600" />
                  <span className="text-xs font-black text-slate-800">ریز صورت‌حساب معین و گردش رویدادها</span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => onViewLedger && onViewLedger(person.id)}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black transition-colors cursor-pointer shadow-xs"
                    title="مشاهده صفحه اختصاصی دفتر معین شخص با امکانات پیشرفته و کامل"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    ورود به دفتر معین اختصاصی
                  </button>
                  <button
                    onClick={handleExportExcel}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    خروجی اکسل (Excel)
                  </button>
                  <button
                    onClick={handlePrintDossier}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    چاپ معین
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-slate-200">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-black">
                    <tr>
                      <th className="py-3 px-3">ردیف</th>
                      <th className="py-3 px-3">تاریخ</th>
                      <th className="py-3 px-3">شماره سند / فاکتور</th>
                      <th className="py-3 px-3">شرح رویداد مالی</th>
                      <th className="py-3 px-3 text-left">بدهکار (افزایش)</th>
                      <th className="py-3 px-3 text-left">بستانکار (کاهش)</th>
                      <th className="py-3 px-3 text-left">مانده لحظه‌ای</th>
                      <th className="py-3 px-3 text-center">وضعیت</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white font-bold">
                    {ledgerEntries.map((row, idx) => (
                      <tr key={row.id || idx} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-2.5 px-3 font-mono text-slate-400">{toPersianDigits(idx + 1)}</td>
                        <td className="py-2.5 px-3 font-mono text-slate-600">{formatDateDisplay(row.date)}</td>
                        <td className="py-2.5 px-3 font-mono text-slate-700">{toPersianDigits(row.docNumber || '---')}</td>
                        <td className="py-2.5 px-3 text-slate-800">
                          <div>{row.description}</div>
                          {row.items && row.items.length > 0 && (
                            <div className="mt-1.5 p-2 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                              <div className="font-black text-slate-700 mb-1 flex items-center gap-1 text-[11px]">
                                <Package className="w-3.5 h-3.5 text-indigo-600" />
                                <span>اقلام فاکتور ({toPersianDigits(row.items.length)} قلم):</span>
                              </div>
                              <div className="space-y-1">
                                {row.items.map((it: any, i: number) => {
                                  const itName = it.productName || it.name || it.title || "کالا";
                                  const itQty = Number(it.quantity ?? it.count ?? 1);
                                  const itUnit = it.selectedUnit || it.unit || "عدد";
                                  const itPrice = Number(it.unitPrice ?? it.price ?? it.fee ?? 0);
                                  const itTotal = Number(it.lineTotal ?? it.totalPrice ?? it.total ?? (itQty * itPrice));
                                  return (
                                    <div key={i} className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-600 border-b border-slate-100 last:border-0 pb-0.5">
                                      <span className="font-bold text-slate-800">{toPersianDigits(i + 1)}. {itName}</span>
                                      <div className="flex items-center gap-2">
                                        <span className="font-mono text-slate-500" dir="ltr">{toPersianDigits(itQty)} {itUnit}</span>
                                        <span className="font-mono text-slate-500" dir="ltr">فی: {toPersianDigits(formatCurrency(itPrice))}</span>
                                        <span className="font-mono font-bold text-indigo-700" dir="ltr">{toPersianDigits(formatCurrency(itTotal))}</span>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-left font-mono font-bold text-rose-600">
                          {row.debit > 0 ? toPersianDigits(formatCurrency(row.debit)) : '-'}
                        </td>
                        <td className="py-2.5 px-3 text-left font-mono font-bold text-emerald-600">
                          {row.credit > 0 ? toPersianDigits(formatCurrency(row.credit)) : '-'}
                        </td>
                        <td className="py-2.5 px-3 text-left font-mono font-black text-slate-900">
                          {toPersianDigits(formatCurrency(Math.abs(row.balance)))}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded-md ${
                            row.status === 'بدهکار' ? 'bg-rose-50 text-rose-700' :
                            row.status === 'بستانکار' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'
                          }`}>
                            {row.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 6: CRM & COMMUNICATIONS */}
          {activeTab === 'crm' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                    <Phone className="w-4 h-4 text-indigo-600" />
                    مدیریت ارتباطات، تماس‌ها و وظایف پیگیری
                  </h3>
                  <p className="text-xs font-bold text-slate-400 mt-0.5">
                    ثبت سوابق جلسات، تماس‌ها، مذاکرات مالی و تنظیم یادآورهای آینده
                  </p>
                </div>
                <button
                  onClick={() => setIsAddCrmTaskModalOpen(true)}
                  className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black transition-all cursor-pointer shadow-sm shadow-indigo-100"
                >
                  <Plus className="w-4 h-4" />
                  ثبت پیگیری یا وظیفه جدید
                </button>
              </div>

              {isLoadingFollowUps ? (
                <div className="text-center py-10 text-slate-400 font-bold text-xs bg-slate-50 rounded-2xl">
                  در حال بارگذاری پیگیری‌ها...
                </div>
              ) : followUps.length === 0 ? (
                <div className="text-center py-12 text-slate-400 font-bold text-xs bg-slate-50/50 rounded-3xl border border-dashed border-slate-200">
                  هنوز سابقه پیگیری یا تماسی برای این شخص ثبت نشده است. با دکمه بالا اولین پیگیری را ثبت کنید.
                </div>
              ) : (
                <div className="space-y-3">
                  {followUps.map(task => {
                    const isCompleted = task.status === 'completed';
                    return (
                      <div key={task.id} className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-start gap-3">
                          <button
                            onClick={() => handleToggleCrmStatus(task)}
                            className={`p-2 rounded-xl transition-colors cursor-pointer mt-0.5 ${
                              isCompleted ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700 hover:bg-emerald-50'
                            }`}
                            title="کلیک برای تغییر وضعیت انجام شده/نشده"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className={`text-[10px] font-black px-2 py-0.5 rounded-md ${
                                task.type === 'call' ? 'bg-blue-100 text-blue-700' :
                                task.type === 'meeting' ? 'bg-purple-100 text-purple-700' :
                                task.type === 'debt' ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-700'
                              }`}>
                                {task.type === 'call' ? 'تماس تلفنی' : task.type === 'meeting' ? 'جلسه حضوری' : task.type === 'debt' ? 'پیگیری بدهی' : 'یادداشت'}
                              </span>
                              <span className={`text-[10px] font-black px-2 py-0.5 rounded-md ${
                                isCompleted ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
                              }`}>
                                {isCompleted ? 'تکمیل شد' : 'در انتظار انجام'}
                              </span>
                              {task.dueDate && (
                                <span className="text-[11px] font-mono text-slate-400">
                                  سررسید: {formatDateDisplay(task.dueDate)}
                                </span>
                              )}
                            </div>
                            <p className="text-xs font-semibold text-slate-800 mt-2 leading-relaxed whitespace-pre-wrap">
                              {task.description}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center justify-end gap-2 self-end sm:self-center">
                          <button
                            onClick={() => handleDeleteCrmTask(task.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="حذف پیگیری"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 7: BANK ACCOUNTS & DOCUMENTS */}
          {activeTab === 'bank_docs' && (
            <div className="space-y-8">
              {/* Bank Accounts Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-black text-slate-900 flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-indigo-600" />
                    حساب‌ها و کارت‌های بانکی
                  </h4>
                  <button
                    onClick={() => setIsAddBankModalOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold transition-colors cursor-pointer border border-indigo-200"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    افزودن حساب بانکی جدید
                  </button>
                </div>

                {(!person.bankAccounts || person.bankAccounts.length === 0) ? (
                  <div className="text-center py-8 text-slate-400 font-bold text-xs bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                    حساب بانکی برای این شخص ثبت نشده است.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {person.bankAccounts.map((acc: any, i: number) => (
                      <div key={acc.id || i} className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3 relative group">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-black text-sm text-slate-800">{acc.title || acc.bankName}</span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-600">
                              {acc.bankName}
                            </span>
                          </div>
                          <button
                            onClick={() => handleDeleteBankAccount(acc.id || i)}
                            className="text-slate-400 hover:text-rose-600 p-1 rounded-lg transition-colors cursor-pointer"
                            title="حذف این حساب"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="space-y-2 text-xs font-mono font-bold">
                          {acc.shebaNumber && (
                            <div className="bg-white p-2.5 rounded-xl border border-slate-200 flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] text-slate-400">شماره شبا:</span>
                                <span className="text-slate-800" dir="ltr">{acc.shebaNumber}</span>
                              </div>
                              <button
                                onClick={() => handleCopyText(acc.shebaNumber, `sheba_${i}`)}
                                className="text-indigo-600 hover:text-indigo-800 cursor-pointer p-1"
                                title="کپی شماره شبا"
                              >
                                {copiedKey === `sheba_${i}` ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                          )}

                          {acc.cardNumber && (
                            <div className="bg-white p-2.5 rounded-xl border border-slate-200 flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] text-slate-400">شماره کارت:</span>
                                <span className="text-slate-800" dir="ltr">{acc.cardNumber}</span>
                              </div>
                              <button
                                onClick={() => handleCopyText(acc.cardNumber, `card_${i}`)}
                                className="text-indigo-600 hover:text-indigo-800 cursor-pointer p-1"
                                title="کپی شماره کارت"
                              >
                                {copiedKey === `card_${i}` ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                          )}

                          {acc.accountNumber && (
                            <div className="bg-white p-2.5 rounded-xl border border-slate-200 flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] text-slate-400">شماره حساب:</span>
                                <span className="text-slate-800" dir="ltr">{acc.accountNumber}</span>
                              </div>
                              <button
                                onClick={() => handleCopyText(acc.accountNumber, `acc_${i}`)}
                                className="text-indigo-600 hover:text-indigo-800 cursor-pointer p-1"
                                title="کپی شماره حساب"
                              >
                                {copiedKey === `acc_${i}` ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Documents & Attachments Section */}
              <div className="space-y-4 pt-6 border-t border-slate-200">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-black text-slate-900 flex items-center gap-2">
                    <FileCheck className="w-4 h-4 text-indigo-600" />
                    مدارک هویتی و اسناد پیوست
                  </h4>
                  <button
                    onClick={() => setIsAddAttachmentModalOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold transition-colors cursor-pointer border border-indigo-200"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    افزودن مدرک جدید
                  </button>
                </div>

                {(!person.attachments || person.attachments.length === 0) ? (
                  <div className="text-center py-8 text-slate-400 font-bold text-xs bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                    مدرک یا سندی برای این شخص پیوست نشده است.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {person.attachments.map((att: any, idx: number) => (
                      <div key={idx} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600">
                            <FileText className="w-5 h-5" />
                          </div>
                          <div>
                            <span className="font-black text-xs text-slate-800 block">{att.name}</span>
                            <span className="text-[10px] font-bold text-slate-400">{att.type || 'سند'}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          {att.url && att.url !== '#' && (
                            <a
                              href={att.url}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                              title="مشاهده مدرک"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          )}
                          <button
                            onClick={() => handleDeleteAttachment(idx)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="حذف مدرک"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 6. MODALS */}

      {/* QUICK EDIT MODAL */}
      <AnimatePresence>
        {isQuickEditOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl p-6 max-w-lg w-full border border-slate-200 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <Edit2 className="w-4 h-4 text-indigo-600" />
                  ویرایش سریع اطلاعات شخص
                </h3>
                <button
                  onClick={() => setIsQuickEditOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveQuickEdit} className="space-y-4 text-xs font-bold">
                <div>
                  <label className="text-slate-700 block mb-1">نام و نام خانوادگی / شرکت:</label>
                  <input
                    type="text"
                    value={editFormData.name}
                    onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                    required
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-700 block mb-1">تلفن تماس:</label>
                    <input
                      type="text"
                      value={editFormData.phone}
                      onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      dir="ltr"
                    />
                  </div>
                  <div>
                    <label className="text-slate-700 block mb-1">تلفن همراه (موبایل):</label>
                    <input
                      type="text"
                      value={editFormData.mobile}
                      onChange={(e) => setEditFormData({ ...editFormData, mobile: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      dir="ltr"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-700 block mb-1">کد ملی / شناسه ملی:</label>
                    <input
                      type="text"
                      value={editFormData.nationalId}
                      onChange={(e) => setEditFormData({ ...editFormData, nationalId: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      dir="ltr"
                    />
                  </div>
                  <div>
                    <label className="text-slate-700 block mb-1">سقف اعتبار مجاز (تومان):</label>
                    <input
                      type="number"
                      value={editFormData.creditLimit}
                      onChange={(e) => setEditFormData({ ...editFormData, creditLimit: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      dir="ltr"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-slate-700 block mb-1">نشانی کامل پستی:</label>
                  <textarea
                    rows={2}
                    value={editFormData.address}
                    onChange={(e) => setEditFormData({ ...editFormData, address: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-slate-700 block mb-1">یادداشت‌های اختصاصی:</label>
                  <textarea
                    rows={2}
                    value={editFormData.additionalNotes}
                    onChange={(e) => setEditFormData({ ...editFormData, additionalNotes: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="checkbox"
                    id="isActiveCheck"
                    checked={editFormData.isActive}
                    onChange={(e) => setEditFormData({ ...editFormData, isActive: e.target.checked })}
                    className="w-4 h-4 text-indigo-600 rounded cursor-pointer"
                  />
                  <label htmlFor="isActiveCheck" className="text-slate-700 font-bold cursor-pointer">
                    شخص در وضعیت فعال قرار دارد (امکان صدور فاکتور و اسناد جدید)
                  </label>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => {
                      setIsQuickEditOpen(false);
                      if (onEdit) onEdit(person);
                    }}
                    className="flex items-center gap-1.5 px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl cursor-pointer text-xs font-black transition-colors"
                    title="انتقال به فرم چند مرحله‌ای ویرایش کامل شخص"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-indigo-600" />
                    ویرایش کامل شخص
                  </button>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsQuickEditOpen(false)}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl cursor-pointer"
                    >
                      انصراف
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black cursor-pointer shadow-sm shadow-indigo-100"
                    >
                      ذخیره تغییرات
                    </button>
                  </div>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ADD BANK ACCOUNT MODAL */}
      <AnimatePresence>
        {isAddBankModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl p-6 max-w-md w-full border border-slate-200 shadow-xl space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-indigo-600" />
                  افزودن حساب بانکی جدید
                </h3>
                <button onClick={() => setIsAddBankModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveNewBankAccount} className="space-y-4 text-xs font-bold">
                <div>
                  <label className="text-slate-700 block mb-1">نام بانک:</label>
                  <input
                    type="text"
                    value={bankFormData.bankName}
                    onChange={(e) => setBankFormData({ ...bankFormData, bankName: e.target.value })}
                    placeholder="مانند: بانک ملت، ملی، سامان..."
                    required
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-slate-700 block mb-1">شماره شبا (IBAN):</label>
                  <input
                    type="text"
                    value={bankFormData.shebaNumber}
                    onChange={(e) => setBankFormData({ ...bankFormData, shebaNumber: e.target.value })}
                    placeholder="IR123456789012345678901234"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    dir="ltr"
                  />
                </div>

                <div>
                  <label className="text-slate-700 block mb-1">شماره کارت (۱۶ رقمی):</label>
                  <input
                    type="text"
                    value={bankFormData.cardNumber}
                    onChange={(e) => setBankFormData({ ...bankFormData, cardNumber: e.target.value })}
                    placeholder="6037-xxxx-xxxx-xxxx"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    dir="ltr"
                  />
                </div>

                <div>
                  <label className="text-slate-700 block mb-1">شماره حساب:</label>
                  <input
                    type="text"
                    value={bankFormData.accountNumber}
                    onChange={(e) => setBankFormData({ ...bankFormData, accountNumber: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    dir="ltr"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsAddBankModalOpen(false)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl cursor-pointer"
                  >
                    انصراف
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black cursor-pointer shadow-sm shadow-indigo-100"
                  >
                    ثبت حساب
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ADD CRM TASK MODAL */}
      <AnimatePresence>
        {isAddCrmTaskModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl p-6 max-w-md w-full border border-slate-200 shadow-xl space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <Phone className="w-4 h-4 text-indigo-600" />
                  ثبت پیگیری و وظیفه CRM جدید
                </h3>
                <button onClick={() => setIsAddCrmTaskModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveCrmTask} className="space-y-4 text-xs font-bold">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-700 block mb-1">نوع اقدام:</label>
                    <select
                      value={crmFormData.type}
                      onChange={(e) => setCrmFormData({ ...crmFormData, type: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="call">تماس تلفنی</option>
                      <option value="meeting">جلسه حضوری</option>
                      <option value="debt">پیگیری بدهی و چک</option>
                      <option value="note">یادداشت مذاکره</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-slate-700 block mb-1">اولویت:</label>
                    <select
                      value={crmFormData.priority}
                      onChange={(e) => setCrmFormData({ ...crmFormData, priority: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="normal">عادی</option>
                      <option value="high">مهم و فوری</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-slate-700 block mb-1">شرح پیگیری یا مذاکره:</label>
                  <textarea
                    rows={3}
                    value={crmFormData.description}
                    onChange={(e) => setCrmFormData({ ...crmFormData, description: e.target.value })}
                    placeholder="نتیجه تماس، موارد توافق‌شده یا اقدام مورد نیاز..."
                    required
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-slate-700 block mb-1">تاریخ سررسید یا اقدام بعدی:</label>
                  <input
                    type="text"
                    value={crmFormData.dueDate}
                    onChange={(e) => setCrmFormData({ ...crmFormData, dueDate: e.target.value })}
                    placeholder="مثال: ۱۴۰۳/۰۸/۱۵ یا فردا ساعت ۱۰"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsAddCrmTaskModalOpen(false)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl cursor-pointer"
                  >
                    انصراف
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black cursor-pointer shadow-sm shadow-indigo-100"
                  >
                    ثبت پیگیری
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ADD ATTACHMENT MODAL */}
      <AnimatePresence>
        {isAddAttachmentModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl p-6 max-w-md w-full border border-slate-200 shadow-xl space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <FileCheck className="w-4 h-4 text-indigo-600" />
                  افزودن مدرک هویتی یا پیوست
                </h3>
                <button onClick={() => setIsAddAttachmentModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveAttachment} className="space-y-4 text-xs font-bold">
                <div>
                  <label className="text-slate-700 block mb-1">عنوان مدرک:</label>
                  <input
                    type="text"
                    value={attachmentFormData.name}
                    onChange={(e) => setAttachmentFormData({ ...attachmentFormData, name: e.target.value })}
                    placeholder="مثال: تصویر کارت ملی، روزنامه رسمی، چک تضمین..."
                    required
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-slate-700 block mb-1">نوع سند:</label>
                  <select
                    value={attachmentFormData.type}
                    onChange={(e) => setAttachmentFormData({ ...attachmentFormData, type: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="کارت ملی و شناسنامه">کارت ملی و شناسنامه</option>
                    <option value="روزنامه رسمی و اساسنامه">روزنامه رسمی و اساسنامه</option>
                    <option value="قرارداد و تفاهم‌نامه">قرارداد و تفاهم‌نامه</option>
                    <option value="اسناد تضمین و ضمانت‌نامه">اسناد تضمین و ضمانت‌نامه</option>
                    <option value="مجوزها و پروانه کسب">مجوزها و پروانه کسب</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-700 block mb-1">لینک یا آدرس فایل / تصویر:</label>
                  <input
                    type="text"
                    value={attachmentFormData.url}
                    onChange={(e) => setAttachmentFormData({ ...attachmentFormData, url: e.target.value })}
                    placeholder="https://... یا نام فایل آرشیو"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    dir="ltr"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsAddAttachmentModalOpen(false)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl cursor-pointer"
                  >
                    انصراف
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black cursor-pointer shadow-sm shadow-indigo-100"
                  >
                    ثبت مدرک
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* SMS MODAL */}
      <SendPersonMessageModal
        isOpen={isMessageModalOpen}
        onClose={() => setIsMessageModalOpen(false)}
        person={person}
        showNotification={showNotification || (() => {})}
        calculatePersonBalance={calculatePersonBalance}
        storeSettings={storeSettings}
      />

      {/* 7. HIDDEN PRINTABLE DOSSIER (A4 FORMAT FOR SAFEPRINT) */}
      <div id="printable-person-dossier" className="hidden print:block p-8 bg-white text-right" dir="rtl">
        {/* Print Header */}
        <div className="border-b-2 border-slate-800 pb-4 mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black text-slate-900">{storeSettings?.name || 'سامانه جامع مالی و انبارداری'}</h2>
            <h3 className="text-base font-bold text-slate-700 mt-1">پرونده رسمی و شناسنامه اعتباری طرف‌حساب</h3>
          </div>
          <div className="text-left text-xs font-bold text-slate-600 space-y-1">
            <div>تاریخ چاپ: <span className="font-mono">{new Date().toLocaleDateString('fa-IR')}</span></div>
            <div>کد شخص: <span className="font-mono">{person.personCode || person.id}</span></div>
          </div>
        </div>

        {/* Identity Details Table */}
        <div className="border border-slate-300 rounded-lg p-4 mb-6 bg-slate-50/50">
          <div className="grid grid-cols-3 gap-4 text-xs font-bold">
            <div><span className="text-slate-500">نام طرف‌حساب:</span> <span className="text-slate-900 font-black">{getPersonDisplayName(person)}</span></div>
            <div><span className="text-slate-500">کد ملی / شناسه:</span> <span className="font-mono">{person.nationalId || '---'}</span></div>
            <div><span className="text-slate-500">نقش در سیستم:</span> <span>{getRoleName(person.role)}</span></div>
            <div><span className="text-slate-500">تلفن تماس:</span> <span className="font-mono" dir="ltr">{person.phone || '---'}</span></div>
            <div><span className="text-slate-500">کد معین حسابداری:</span> <span className="font-mono">{person.accountingCode || '---'}</span></div>
            <div><span className="text-slate-500">وضعیت:</span> <span>{isActive ? 'فعال' : 'غیرفعال'}</span></div>
            <div className="col-span-3"><span className="text-slate-500">آدرس:</span> <span>{person.address || 'ثبت نشده'}</span></div>
          </div>
        </div>

        {/* Financial & Credit Summary */}
        <div className="grid grid-cols-3 gap-4 mb-6 text-xs font-bold">
          <div className="border border-slate-300 p-3 rounded-lg text-center">
            <span className="text-slate-500 block mb-1">مانده نهایی حساب</span>
            <span className="text-base font-black font-mono text-slate-900">
              {toPersianDigits(formatCurrency(Math.abs(balance.amount)))} {storeSettings?.currency || 'تومان'}
            </span>
            <span className="text-[10px] text-slate-600 block mt-0.5">({balance.status})</span>
          </div>
          <div className="border border-slate-300 p-3 rounded-lg text-center">
            <span className="text-slate-500 block mb-1">رتبه اعتباری و امتیاز</span>
            <span className="text-base font-black font-mono text-indigo-700">
              {toPersianDigits(creditAnalysis.score)} از ۱۰۰ (رتبه {creditAnalysis.grade})
            </span>
            <span className="text-[10px] text-slate-600 block mt-0.5">({creditAnalysis.riskLabel})</span>
          </div>
          <div className="border border-slate-300 p-3 rounded-lg text-center">
            <span className="text-slate-500 block mb-1">سقف اعتبار مجاز</span>
            <span className="text-base font-black font-mono text-slate-900">
              {creditAnalysis.creditLimit > 0 ? toPersianDigits(formatCurrency(creditAnalysis.creditLimit)) : 'نامحدود'}
            </span>
            <span className="text-[10px] text-slate-600 block mt-0.5">{storeSettings?.currency || 'تومان'}</span>
          </div>
        </div>

        {/* Open Cheques Table */}
        <div className="mb-6">
          <h4 className="text-xs font-black text-slate-900 mb-2">اسناد و چک‌های در جریان وصول / پرداختی</h4>
          <table className="w-full text-right text-[11px] border border-slate-300 border-collapse">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-300 font-bold">
                <th className="p-1.5 border-l border-slate-300">ردیف</th>
                <th className="p-1.5 border-l border-slate-300">جریان</th>
                <th className="p-1.5 border-l border-slate-300">صیاد / سریال</th>
                <th className="p-1.5 border-l border-slate-300">بانک</th>
                <th className="p-1.5 border-l border-slate-300">سررسید</th>
                <th className="p-1.5 border-l border-slate-300 text-left">مبلغ ({storeSettings?.currency || 'تومان'})</th>
                <th className="p-1.5 text-center">وضعیت</th>
              </tr>
            </thead>
            <tbody>
              {allPersonChecks.slice(0, 10).map((c: any, i: number) => (
                <tr key={i} className="border-b border-slate-200">
                  <td className="p-1.5 border-l border-slate-200 font-mono">{toPersianDigits(i + 1)}</td>
                  <td className="p-1.5 border-l border-slate-200">{c._flow === 'received' ? 'دریافتی' : 'پرداختی'}</td>
                  <td className="p-1.5 border-l border-slate-200 font-mono">{toPersianDigits(c.sayadId || c.checkNumber)}</td>
                  <td className="p-1.5 border-l border-slate-200">{c.bankName}</td>
                  <td className="p-1.5 border-l border-slate-200 font-mono">{formatDateDisplay(c.dueDate)}</td>
                  <td className="p-1.5 border-l border-slate-200 text-left font-mono">{toPersianDigits(formatCurrency(c.amount || 0))}</td>
                  <td className="p-1.5 text-center">{c.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Signature Box */}
        <div className="grid grid-cols-3 gap-4 pt-8 mt-12 border-t border-slate-300 text-xs font-bold text-center">
          <div>امضای کارشناس حسابداری</div>
          <div>امضای مسئول اعتبارات و فروش</div>
          <div>تایید مدیریت عامل</div>
        </div>
      </div>
    </motion.div>
  );
}
