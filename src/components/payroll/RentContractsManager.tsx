import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, Edit2, Trash2, FileText, Check, X, AlertCircle, CheckCircle, 
  Eye, Calendar, ArrowRight, CreditCard, Clock, 
  AlertTriangle, ShieldCheck, Printer, RefreshCw, 
  Wallet, Building, ArrowLeft, Info, HelpCircle,
  History, ExternalLink, CheckCheck, Layers, ArrowUpRight,
  ChevronDown, ChevronUp, FileX2, FileCheck, CheckSquare,
  Ban, PauseCircle, PlayCircle, SlidersHorizontal, BookOpen, ScrollText, FileSignature
} from 'lucide-react';
import Select from 'react-select';
import { 
  getRentContracts, addRentContract, updateRentContract, deleteRentContract, 
  ensurePayableAccount, settleRentInstallmentWithPayment 
} from '../../services/hrService';
import { 
  getLedgerAccounts, addAccountingDocument, getAccountingDocuments, 
  getCashboxes, getAccounts, addTransaction 
} from '../../services/dataService';
import { getTransactions } from '../../services/invoiceService';
import PayReceiptModal from '../financial/PayReceiptModal';
import { convertToGregorian, formatDateDisplay, toPersianDigits, addCommas, numberToWords } from '../../utils/format';
import CurrencyInput from '../common/CurrencyInput';
import CustomDatePicker from '../ui/CustomDatePicker';
import DateObjectModule from 'react-date-object';
import persian from 'react-date-object/calendars/persian';
import persian_fa from 'react-date-object/locales/persian_fa';
import gregorian from 'react-date-object/calendars/gregorian';
import gregorian_en from 'react-date-object/locales/gregorian_en';

const DateObject = (DateObjectModule as any).default || DateObjectModule;

export interface RentInstallmentPayment {
  paymentId: string; // transaction.id or receiptNumber
  amount: number; // amount of this payment allocated to this installment
  date?: string;
  refNumber?: string;
  source?: string;
}

export interface RentInstallment {
  id: string;
  periodIndex: number;
  title: string;
  dueDate: string; // '1403/01/25'
  dueDateTimestamp: number;
  amount: number;
  commitmentStatus: 'uncommitted' | 'committed' | 'cancelled';
  commitmentDocId?: string | null;
  commitmentDate?: string | null;
  paymentStatus: 'unpaid' | 'paid';
  paidAmount: number;
  paymentDocId?: string | null;
  paidDate?: string | null;
  paymentMethod?: 'cashbox' | 'bank' | null;
  paymentSourceId?: string | null;
  paymentRefNumber?: string | null;
  payments?: RentInstallmentPayment[];
}

export interface RentContractAmendment {
  id: string;
  date: string;
  type: 'rent_amount' | 'extend_term' | 'terms_change';
  title: string;
  oldMonthlyAmount?: number;
  newMonthlyAmount?: number;
  oldEndDate?: string | null;
  newEndDate?: string | null;
  description: string;
  createdAt: string;
}

export interface RentContractTerminationInfo {
  date: string;
  reason: string;
  penaltyAmount?: number;
  depositStatus: string;
  notes: string;
  cancelFutureInstallments?: boolean;
  createdAt: string;
}

export interface RentContractCompletionInfo {
  date: string;
  depositRefundAmount?: number;
  depositRefundStatus: string;
  notes: string;
  vacated?: boolean;
  utilitiesSettled?: boolean;
  rentSettled?: boolean;
  createdAt: string;
}

export interface PaymentAllocationInfo {
  payment: any;
  totalAmount: number;
  invoiceAllocated: number;
  rentAllocated: number;
  totalUsed: number;
  remainingAvailable: number;
  invoiceDetails: Array<{ id: string; amount: number }>;
  rentDetails: Array<{ contractNumber: string; installmentTitle: string; amount: number }>;
}

export function calculatePaymentAllocations(
  payment: any,
  allContracts: any[]
): PaymentAllocationInfo {
  const totalAmount = Number(payment.amount) || 0;

  // 1. Allocations to invoices
  let invoiceAllocated = 0;
  const invoiceDetails: Array<{ id: string; amount: number }> = [];
  if (payment.linkedInvoices && typeof payment.linkedInvoices === 'object') {
    for (const [invId, invAmt] of Object.entries(payment.linkedInvoices)) {
      const num = Number(invAmt) || 0;
      if (num > 0) {
        invoiceAllocated += num;
        invoiceDetails.push({ id: invId, amount: num });
      }
    }
  } else if (payment.invoiceId || payment.relatedInvoiceId) {
    invoiceAllocated = totalAmount;
    invoiceDetails.push({ id: String(payment.invoiceId || payment.relatedInvoiceId), amount: totalAmount });
  }

  // 2. Allocations to rent contract installments
  let rentAllocated = 0;
  const rentDetails: Array<{ contractNumber: string; installmentTitle: string; amount: number }> = [];

  (allContracts || []).forEach(c => {
    (c.schedule || []).forEach((inst: any) => {
      if (Array.isArray(inst.payments) && inst.payments.length > 0) {
        inst.payments.forEach((p: any) => {
          if (String(p.paymentId) === String(payment.id) || String(p.paymentId) === String(payment.receiptNumber)) {
            const amt = Number(p.amount) || 0;
            if (amt > 0) {
              rentAllocated += amt;
              rentDetails.push({
                contractNumber: c.contractNumber || '',
                installmentTitle: inst.title || '',
                amount: amt
              });
            }
          }
        });
      } else if (inst.paymentDocId) {
        if (String(inst.paymentDocId) === String(payment.receiptNumber) || String(inst.paymentDocId) === String(payment.id)) {
          const amt = Number(inst.paidAmount) || 0;
          if (amt > 0) {
            rentAllocated += amt;
            rentDetails.push({
              contractNumber: c.contractNumber || '',
              installmentTitle: inst.title || '',
              amount: amt
            });
          }
        }
      }
    });
  });

  const totalUsed = invoiceAllocated + rentAllocated;
  const remainingAvailable = Math.max(0, totalAmount - totalUsed);

  return {
    payment,
    totalAmount,
    invoiceAllocated,
    rentAllocated,
    totalUsed,
    remainingAvailable,
    invoiceDetails,
    rentDetails
  };
}

export function generateRentSchedule(
  sDateVal: any,
  eDateVal: any,
  cycle: 'monthly' | 'quarterly' | 'semi_annual' | 'annual',
  paymentDay: number,
  amount: number,
  existingSchedule?: RentInstallment[]
): RentInstallment[] {
  if (!sDateVal) return [];
  
  const sIso = convertToGregorian(sDateVal);
  const sDate = new Date(sIso);
  if (isNaN(sDate.getTime())) return [];
  
  let eDate: Date | null = null;
  if (eDateVal) {
    const eIso = convertToGregorian(eDateVal);
    const parsedEnd = new Date(eIso);
    if (!isNaN(parsedEnd.getTime())) {
      eDate = parsedEnd;
    }
  }

  const dStart = new DateObject({ date: sDate, calendar: persian, locale: persian_fa });
  const stepMonths = cycle === 'quarterly' ? 3 : (cycle === 'semi_annual' ? 6 : (cycle === 'annual' ? 12 : 1));
  const maxPeriods = eDate ? 240 : (cycle === 'annual' ? 1 : cycle === 'semi_annual' ? 2 : cycle === 'quarterly' ? 4 : 12);

  let curYear = dStart.year;
  let curMonth = dStart.month.number;

  let endYear = 0;
  let endMonth = 0;
  if (eDate) {
    const dEnd = new DateObject({ date: eDate, calendar: persian, locale: persian_fa });
    endYear = dEnd.year;
    endMonth = dEnd.month.number;
  }

  const schedule: RentInstallment[] = [];
  let periodIdx = 1;
  const monthNames = ['', 'فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'];

  while (
    (eDate ? (curYear < endYear || (curYear === endYear && curMonth <= endMonth)) : (periodIdx <= maxPeriods)) &&
    periodIdx <= 240
  ) {
    const mLen = curMonth <= 6 ? 31 : (curMonth <= 11 ? 30 : 29);
    const day = Math.min(Math.max(Number(paymentDay) || 1, 1), mLen);

    const dueDateObj = new DateObject({ calendar: persian, locale: persian_fa, year: curYear, month: curMonth, day: day });
    const dueDateStr = `${curYear}/${String(curMonth).padStart(2, '0')}/${String(day).padStart(2, '0')}`;
    const dueDateTs = dueDateObj.toDate().getTime();

    let title = `قسط دوره ${periodIdx} (${monthNames[curMonth]} ${curYear})`;
    if (cycle === 'quarterly') {
      const qNum = Math.ceil(curMonth / 3);
      title = `قسط فصل ${qNum} (${monthNames[curMonth]} ${curYear})`;
    } else if (cycle === 'semi_annual') {
      const sNum = curMonth <= 6 ? 1 : 2;
      title = `قسط شش‌ماهه (${sNum === 1 ? 'نیمه اول' : 'نیمه دوم'} ${curYear})`;
    } else if (cycle === 'annual') {
      title = `اجاره سالانه (${curYear})`;
    }

    const instId = `inst_${periodIdx}_${curYear}_${curMonth}`;
    const existing = existingSchedule?.find(e => e.id === instId || e.periodIndex === periodIdx);

    schedule.push({
      id: instId,
      periodIndex: periodIdx,
      title,
      dueDate: dueDateStr,
      dueDateTimestamp: dueDateTs,
      amount: existing?.amount !== undefined ? Number(existing.amount) : (Number(amount) || 0),
      commitmentStatus: existing?.commitmentStatus || 'uncommitted',
      commitmentDocId: existing?.commitmentDocId || null,
      commitmentDate: existing?.commitmentDate || null,
      paymentStatus: existing?.paymentStatus || 'unpaid',
      paidAmount: existing?.paidAmount || 0,
      paymentDocId: existing?.paymentDocId || null,
      paidDate: existing?.paidDate || null,
      paymentMethod: existing?.paymentMethod || null,
      paymentSourceId: existing?.paymentSourceId || null,
      paymentRefNumber: existing?.paymentRefNumber || null,
      payments: existing?.payments || []
    });

    periodIdx++;
    curMonth += stepMonths;
    while (curMonth > 12) {
      curMonth -= 12;
      curYear++;
    }
  }

  return schedule;
}

export default function RentContractsManager({ personsData, storeSettings, showNotification }: any) {
  const DatePicker = CustomDatePicker;
  const [contracts, setContracts] = useState<any[]>([]);
  const [ledgerAccounts, setLedgerAccounts] = useState<any[]>([]);
  const [cashboxes, setCashboxes] = useState<any[]>([]);
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  const [allAccountingDocs, setAllAccountingDocs] = useState<any[]>([]);
  const [allTransactions, setAllTransactions] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [loading, setLoading] = useState(false);

  // Dedicated Detailed Dossier View
  const [selectedContractDetail, setSelectedContractDetail] = useState<any | null>(null);
  const [detailActiveTab, setDetailActiveTab] = useState<'schedule' | 'accounting' | 'details' | 'amendments'>('schedule');
  const [showAllAlerts, setShowAllAlerts] = useState(false);

  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [printContract, setPrintContract] = useState<any | null>(null);
  const [systemPayModal, setSystemPayModal] = useState<{ contract: any; installment: RentInstallment } | null>(null);

  // Advanced Contract Lifecycle Modals
  const [terminateModal, setTerminateModal] = useState<{
    contract: any;
    date: any;
    reason: string;
    penaltyAmount: string;
    depositStatus: string;
    cancelFutureInstallments: boolean;
    notes: string;
  } | null>(null);

  const [completeModal, setCompleteModal] = useState<{
    contract: any;
    date: any;
    depositRefundAmount: string;
    depositRefundStatus: string;
    vacated: boolean;
    utilitiesSettled: boolean;
    rentSettled: boolean;
    notes: string;
  } | null>(null);

  const [amendmentModal, setAmendmentModal] = useState<{
    contract: any;
    date: any;
    type: 'rent_amount' | 'extend_term' | 'terms_change';
    newMonthlyAmount: string;
    newEndDate: any;
    applyToFutureOnly: boolean;
    description: string;
  } | null>(null);

  const [statusChangeModal, setStatusChangeModal] = useState<{
    contract: any;
    newStatus: string;
  } | null>(null);

  // Commitment & Payment Quick Modals
  const [commitmentModal, setCommitmentModal] = useState<{
    contract: any;
    installment: RentInstallment;
    date: any;
    expenseAccountId: string;
    amount: number;
    description: string;
  } | null>(null);

  const [paymentModal, setPaymentModal] = useState<{
    contract: any;
    installment: RentInstallment;
    mode: 'previous_payments' | 'system_form';
    selectedAllocations: Record<string, number>; // paymentId -> allocated amount
  } | null>(null);

  // Contract Form State
  const [form, setForm] = useState<{
    personId: any;
    contractNumber: string;
    startDate: any;
    endDate: any;
    monthlyAmount: string;
    depositAmount: string;
    paymentCycle: 'monthly' | 'quarterly' | 'semi_annual' | 'annual';
    paymentDay: string;
    reminderDaysBefore: number;
    expenseAccountId: string;
    description: string;
    status: 'draft' | 'active' | 'suspended' | 'completed' | 'terminated';
    propertyUsage: 'commercial' | 'office' | 'warehouse' | 'residential';
    propertyArea: string;
    propertyAddress: string;
    propertyRegistryCode: string;
    lesseeName: string;
  }>({
    personId: null,
    contractNumber: '',
    startDate: new Date(),
    endDate: null,
    monthlyAmount: '',
    depositAmount: '',
    paymentCycle: 'monthly',
    paymentDay: '1',
    reminderDaysBefore: 3,
    expenseAccountId: '',
    description: '',
    status: 'active',
    propertyUsage: 'commercial',
    propertyArea: '',
    propertyAddress: '',
    propertyRegistryCode: '',
    lesseeName: ''
  });

  const currencyUnit = storeSettings?.currency || 'ریال';

  // Safe notification helper
  const notify = (msg: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') => {
    if (typeof showNotification === 'function') {
      showNotification(msg, type);
    } else {
      console.log(`[Notification ${type}]: ${msg}`);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [contractsData, accs, cbs, banks, docs, txs] = await Promise.all([
        getRentContracts(),
        getLedgerAccounts(),
        getCashboxes(),
        getAccounts(),
        getAccountingDocuments(),
        getTransactions()
      ]);

      const enrichedContracts = (contractsData || []).map((c: any) => {
        if (!c.schedule || c.schedule.length === 0) {
          const generated = generateRentSchedule(
            c.startDate,
            c.endDate,
            c.paymentCycle || 'monthly',
            c.paymentDay || 1,
            c.monthlyAmount || 0,
            c.schedule
          );
          return { ...c, schedule: generated };
        }
        return c;
      });

      setContracts(enrichedContracts);
      setLedgerAccounts(accs || []);
      setCashboxes(cbs || []);
      setBankAccounts(banks || []);
      setAllAccountingDocs(docs || []);
      setAllTransactions(txs || []);

      setSelectedContractDetail(prev => {
        if (!prev) return null;
        return enrichedContracts.find((c: any) => String(c.id) === String(prev.id)) || prev;
      });
    } catch (e) {
      console.error(e);
      notify('خطا در بارگذاری اطلاعات قراردادهای اجاره', 'error');
    } finally {
      setLoading(false);
    }
  };

  const getPersonName = (id: string | number) => {
    const p = (personsData || []).find((x: any) => String(x.id) === String(id));
    if (!p) return 'نامشخص';
    return p.name || `${p.firstName || ''} ${p.lastName || ''}`.trim() || 'بدون نام';
  };

  const getPersonDetails = (id: string | number) => {
    return (personsData || []).find((x: any) => String(x.id) === String(id)) || null;
  };

  // Active Alerts computation
  const activeAlerts = useMemo(() => {
    const alerts: Array<{
      contract: any;
      installment: RentInstallment;
      type: 'commitment_due' | 'payment_unsettled';
      daysDiff: number;
      label: string;
    }> = [];

    const nowMid = new Date();
    nowMid.setHours(0, 0, 0, 0);
    const nowTs = nowMid.getTime();

    contracts.filter(c => c.status === 'active').forEach(c => {
      const reminderDays = Number(c.reminderDaysBefore ?? 3);
      const reminderMs = reminderDays * 24 * 60 * 60 * 1000;
      const schedule: RentInstallment[] = c.schedule || [];

      schedule.forEach(inst => {
        const dueTs = inst.dueDateTimestamp;
        const diffMs = dueTs - nowTs;
        const daysDiff = Math.ceil(diffMs / (24 * 60 * 60 * 1000));

        // 1. Commitment Due Alert
        if (inst.commitmentStatus === 'uncommitted') {
          if (diffMs <= reminderMs) {
            alerts.push({
              contract: c,
              installment: inst,
              type: 'commitment_due',
              daysDiff,
              label: daysDiff < 0 
                ? `موعد سررسید گذشته (${toPersianDigits(Math.abs(daysDiff))} روز معوق) - سند تعهد صادر نشده`
                : (daysDiff === 0 
                  ? 'سررسید امروز - سند تعهد صادر نشده' 
                  : `${toPersianDigits(daysDiff)} روز مانده به سررسید - تایید تعهد لازم است`)
            });
          }
        } 
        // 2. Payment Unsettled Alert
        else if (inst.commitmentStatus === 'committed' && inst.paymentStatus !== 'paid') {
          if (diffMs <= reminderMs) {
            alerts.push({
              contract: c,
              installment: inst,
              type: 'payment_unsettled',
              daysDiff,
              label: daysDiff < 0 
                ? `قسط معوق پرداخت‌نشده (${toPersianDigits(Math.abs(daysDiff))} روز گذشته) - نیازمند تسویه`
                : (daysDiff === 0 
                  ? 'موعد پرداخت امروز - در انتظار تسویه' 
                  : `${toPersianDigits(daysDiff)} روز تا موعد پرداخت`)
            });
          }
        }
      });
    });

    return alerts.sort((a, b) => a.daysDiff - b.daysDiff);
  }, [contracts]);

  // Open Create Modal
  const handleOpenCreateModal = () => {
    setEditingId(null);
    setForm({
      personId: null,
      contractNumber: `RC-${Date.now().toString().slice(-4)}`,
      startDate: new Date(),
      endDate: null,
      monthlyAmount: '',
      depositAmount: '',
      paymentCycle: 'monthly',
      paymentDay: '1',
      reminderDaysBefore: 3,
      expenseAccountId: '',
      description: '',
      status: 'active',
      propertyUsage: 'commercial',
      propertyArea: '',
      propertyAddress: '',
      propertyRegistryCode: '',
      lesseeName: storeSettings?.name || storeSettings?.storeName || ''
    });
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleEdit = (c: any) => {
    setEditingId(c.id);
    const person = (personsData || []).find((p: any) => String(p.id) === String(c.personId));
    setForm({
      personId: person 
        ? { value: person.id, label: `${person.name || `${person.firstName || ''} ${person.lastName || ''}`.trim()} (${person.personCode || 'کد: ' + person.id})` } 
        : (c.personId ? { value: c.personId, label: getPersonName(c.personId) } : null),
      contractNumber: c.contractNumber || '',
      startDate: c.startDate ? new Date(convertToGregorian(c.startDate)) : new Date(),
      endDate: c.endDate ? new Date(convertToGregorian(c.endDate)) : null,
      monthlyAmount: String(c.monthlyAmount || ''),
      depositAmount: String(c.depositAmount || ''),
      paymentCycle: c.paymentCycle || 'monthly',
      paymentDay: String(c.paymentDay || 1),
      reminderDaysBefore: c.reminderDaysBefore ?? 3,
      expenseAccountId: c.expenseAccountId || '',
      description: c.description || '',
      status: c.status || 'draft',
      propertyUsage: c.propertyUsage || 'commercial',
      propertyArea: String(c.propertyArea || ''),
      propertyAddress: c.propertyAddress || '',
      propertyRegistryCode: c.propertyRegistryCode || '',
      lesseeName: c.lesseeName || storeSettings?.name || storeSettings?.storeName || ''
    });
    setIsModalOpen(true);
  };

  // Save or Update Contract
  const handleSave = async () => {
    const personIdVal = typeof form.personId === 'object' && form.personId !== null 
      ? form.personId.value 
      : form.personId;

    if (!personIdVal) {
      notify('طرف قرارداد (موجر) باید انتخاب شود', 'error');
      return;
    }

    const cleanAmountStr = String(form.monthlyAmount || '').replace(/,/g, '').trim();
    const cleanAmount = Number(cleanAmountStr);
    if (!cleanAmount || cleanAmount <= 0) {
      notify('مبلغ اجاره دوره الزامی و باید بزرگتر از صفر باشد', 'error');
      return;
    }

    try {
      setLoading(true);
      const startDateIso = convertToGregorian(form.startDate);
      const endDateIso = form.endDate ? convertToGregorian(form.endDate) : null;

      if (!startDateIso) {
        setLoading(false);
        notify('تاریخ شروع قرارداد الزامی است', 'error');
        return;
      }

      if (startDateIso && endDateIso) {
        const startObj = new Date(startDateIso);
        const endObj = new Date(endDateIso);
        if (endObj < startObj) {
          setLoading(false);
          notify('تاریخ پایان نمی‌تواند قبل از تاریخ شروع باشد', 'error');
          return;
        }
      }

      const pDay = Number(form.paymentDay) || 1;
      const existingContract = editingId ? contracts.find(c => c.id === editingId) : null;

      const generatedSchedule = generateRentSchedule(
        startDateIso,
        endDateIso,
        form.paymentCycle,
        pDay,
        cleanAmount,
        existingContract?.schedule
      );

      const cleanDeposit = Number(String(form.depositAmount || '').replace(/,/g, '').trim()) || 0;

      const payload = {
        ...(existingContract || {}),
        personId: personIdVal,
        contractNumber: form.contractNumber || `RC-${Date.now().toString().slice(-4)}`,
        startDate: startDateIso,
        endDate: endDateIso,
        monthlyAmount: cleanAmount,
        depositAmount: cleanDeposit,
        paymentCycle: form.paymentCycle,
        paymentDay: pDay,
        reminderDaysBefore: Number(form.reminderDaysBefore) || 3,
        expenseAccountId: form.expenseAccountId || '',
        description: form.description || '',
        status: form.status,
        propertyUsage: form.propertyUsage,
        propertyArea: form.propertyArea,
        propertyAddress: form.propertyAddress,
        propertyRegistryCode: form.propertyRegistryCode,
        lesseeName: form.lesseeName,
        schedule: generatedSchedule
      };

      if (editingId) {
        await updateRentContract(editingId, payload);
        notify('قرارداد اجاره با موفقیت بروزرسانی شد', 'success');
        if (selectedContractDetail && String(selectedContractDetail.id) === String(editingId)) {
          setSelectedContractDetail({ id: editingId, ...payload });
        }
      } else {
        const newId = Date.now().toString() + Math.random().toString().substring(2, 8);
        await addRentContract({ id: newId, ...payload });
        notify('قرارداد اجاره و جدول اقساط با موفقیت ثبت شد', 'success');
      }

      setIsModalOpen(false);
      await fetchData();
    } catch (e) {
      console.error(e);
      notify('خطا در ذخیره اطلاعات قرارداد', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Quick Status Changer
  const handleQuickStatusChange = async (contract: any, newStatus: string) => {
    try {
      setLoading(true);
      const updated = { ...contract, status: newStatus };
      await updateRentContract(contract.id, updated);
      notify(`وضعیت قرارداد ${contract.contractNumber || ''} به «${getStatusLabel(newStatus)}» تغییر یافت`, 'success');
      setStatusChangeModal(null);
      await fetchData();
    } catch (e) {
      console.error(e);
      notify('خطا در تغییر وضعیت قرارداد', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Terminate Contract Handler
  const handleTerminateSubmit = async () => {
    if (!terminateModal) return;
    const { contract, date, reason, penaltyAmount, depositStatus, cancelFutureInstallments, notes } = terminateModal;
    try {
      setLoading(true);
      const termDateIso = convertToGregorian(date);
      const termDateTs = new Date(termDateIso).getTime();

      let updatedSchedule = [...(contract.schedule || [])];
      if (cancelFutureInstallments) {
        updatedSchedule = updatedSchedule.map((inst: RentInstallment) => {
          if (inst.commitmentStatus === 'uncommitted' && inst.dueDateTimestamp >= termDateTs) {
            return {
              ...inst,
              commitmentStatus: 'cancelled' as const
            };
          }
          return inst;
        });
      }

      const termInfo: RentContractTerminationInfo = {
        date: termDateIso,
        reason,
        penaltyAmount: Number(String(penaltyAmount || '').replace(/,/g, '')) || 0,
        depositStatus,
        cancelFutureInstallments,
        notes,
        createdAt: new Date().toISOString()
      };

      const updatedContract = {
        ...contract,
        status: 'terminated',
        terminationInfo: termInfo,
        schedule: updatedSchedule
      };

      await updateRentContract(contract.id, updatedContract);
      notify(`قرارداد ${contract.contractNumber || ''} با موفقیت فسخ و سوابق آن ثبت شد`, 'warning');
      setTerminateModal(null);
      await fetchData();
    } catch (e) {
      console.error(e);
      notify('خطا در ثبت فسخ قرارداد', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Complete Contract Handler
  const handleCompleteSubmit = async () => {
    if (!completeModal) return;
    const { contract, date, depositRefundAmount, depositRefundStatus, vacated, utilitiesSettled, rentSettled, notes } = completeModal;
    try {
      setLoading(true);
      const compDateIso = convertToGregorian(date);
      const compInfo: RentContractCompletionInfo = {
        date: compDateIso,
        depositRefundAmount: Number(String(depositRefundAmount || '').replace(/,/g, '')) || 0,
        depositRefundStatus,
        vacated,
        utilitiesSettled,
        rentSettled,
        notes,
        createdAt: new Date().toISOString()
      };

      const updatedContract = {
        ...contract,
        status: 'completed',
        completionInfo: compInfo
      };

      await updateRentContract(contract.id, updatedContract);
      notify(`خاتمه قرارداد ${contract.contractNumber || ''} و تحویل ملک با موفقیت ثبت شد`, 'success');
      setCompleteModal(null);
      await fetchData();
    } catch (e) {
      console.error(e);
      notify('خطا در ثبت خاتمه قرارداد', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Amendment Submit Handler
  const handleAmendmentSubmit = async () => {
    if (!amendmentModal) return;
    const { contract, date, type, newMonthlyAmount, newEndDate, applyToFutureOnly, description } = amendmentModal;
    const cleanNewAmount = Number(String(newMonthlyAmount || '').replace(/,/g, '')) || Number(contract.monthlyAmount);

    if (type === 'rent_amount' && cleanNewAmount <= 0) {
      notify('مبلغ جدید اجاره‌بها باید بزرگتر از صفر باشد', 'error');
      return;
    }

    try {
      setLoading(true);
      const amdDateIso = convertToGregorian(date);
      const amdDateTs = new Date(amdDateIso).getTime();
      let updatedSchedule = [...(contract.schedule || [])];
      let updatedMonthlyAmount = contract.monthlyAmount;
      let updatedEndDate = contract.endDate;

      if (type === 'rent_amount') {
        updatedMonthlyAmount = cleanNewAmount;
        updatedSchedule = updatedSchedule.map((inst: RentInstallment) => {
          if (inst.commitmentStatus === 'uncommitted' && (!applyToFutureOnly || inst.dueDateTimestamp >= amdDateTs)) {
            return {
              ...inst,
              amount: cleanNewAmount
            };
          }
          return inst;
        });
      } else if (type === 'extend_term') {
        if (!newEndDate) {
          notify('تاریخ پایان جدید برای تمدید الزامی است', 'error');
          setLoading(false);
          return;
        }
        const newEndIso = convertToGregorian(newEndDate);
        updatedEndDate = newEndIso;
        if (cleanNewAmount > 0) {
          updatedMonthlyAmount = cleanNewAmount;
        }

        const regenerated = generateRentSchedule(
          contract.startDate,
          newEndIso,
          contract.paymentCycle || 'monthly',
          Number(contract.paymentDay) || 1,
          cleanNewAmount,
          contract.schedule
        );
        updatedSchedule = regenerated;
      }

      const amdTitle = type === 'rent_amount'
        ? `الحاقیه تغییر مبلغ اجاره‌بها به ${cleanNewAmount.toLocaleString()} ${currencyUnit}`
        : type === 'extend_term'
          ? `الحاقیه تمدید مدت قرارداد تا تاریخ ${formatDateDisplay(updatedEndDate, storeSettings?.calendarType)}`
          : 'الحاقیه تغییر شرایط و توافقات قرارداد';

      const newAmendment: RentContractAmendment = {
        id: `amd_${Date.now()}`,
        date: amdDateIso,
        type,
        title: amdTitle,
        oldMonthlyAmount: Number(contract.monthlyAmount),
        newMonthlyAmount: cleanNewAmount,
        oldEndDate: contract.endDate,
        newEndDate: updatedEndDate,
        description,
        createdAt: new Date().toISOString()
      };

      const updatedContract = {
        ...contract,
        monthlyAmount: updatedMonthlyAmount,
        endDate: updatedEndDate,
        schedule: updatedSchedule,
        amendments: [...(contract.amendments || []), newAmendment]
      };

      await updateRentContract(contract.id, updatedContract);
      notify(`الحاقیه قرارداد با موفقیت ثبت و بر روی جدول اقساط اعمال شد`, 'success');
      setAmendmentModal(null);
      await fetchData();
    } catch (e) {
      console.error(e);
      notify('خطا در ثبت الحاقیه قرارداد', 'error');
    } finally {
      setLoading(false);
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active': return 'فعال (جاری)';
      case 'suspended':
      case 'inactive': return 'معلق / غیرفعال';
      case 'draft': return 'پیش‌نویس';
      case 'completed':
      case 'expired': return 'خاتمه‌یافته';
      case 'terminated': return 'فسخ‌شده';
      default: return status || 'نامشخص';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return { label: 'فعال (جاری)', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
      case 'suspended':
      case 'inactive':
        return { label: 'معلق / غیرفعال', bg: 'bg-amber-50 text-amber-800 border-amber-300' };
      case 'draft':
        return { label: 'پیش‌نویس', bg: 'bg-slate-100 text-slate-700 border-slate-200' };
      case 'completed':
      case 'expired':
        return { label: 'خاتمه‌یافته', bg: 'bg-blue-50 text-blue-700 border-blue-200' };
      case 'terminated':
        return { label: 'فسخ‌شده', bg: 'bg-rose-50 text-rose-700 border-rose-200' };
      default:
        return { label: status || 'نامشخص', bg: 'bg-slate-100 text-slate-700 border-slate-200' };
    }
  };

  const getUsageLabel = (usage: string) => {
    switch (usage) {
      case 'commercial': return 'واحد تجاری / فروشگاه';
      case 'office': return 'واحد اداری / دفتر کار';
      case 'warehouse': return 'انبار تجاری / سوله';
      case 'residential': return 'واحد مسکونی';
      default: return 'ملک تجاری / اداری';
    }
  };

  // Delete Contract
  const handleDelete = async () => {
    try {
      if (deleteId) {
        setLoading(true);
        await deleteRentContract(deleteId);
        notify('قرارداد اجاره با موفقیت حذف شد', 'success');
        if (selectedContractDetail?.id === deleteId) {
          setSelectedContractDetail(null);
        }
        setDeleteId(null);
        await fetchData();
      }
    } catch (e) {
      console.error(e);
      notify('خطا در حذف قرارداد', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Open 1-Click Commitment Modal
  const openCommitmentModal = (contract: any, installment: RentInstallment) => {
    const expenseAccId = contract.expenseAccountId || 
      ledgerAccounts.find(a => a.code === '5001' || a.title?.includes('هزینه اجاره') || a.title?.includes('اجاره'))?.id || '';

    setCommitmentModal({
      contract,
      installment,
      date: new Date(),
      expenseAccountId: expenseAccId,
      amount: installment.amount,
      description: `تعهد بدهکاری بابت اجاره ${installment.title} - قرارداد ${contract.contractNumber || ''}`
    });
  };

  // Confirm Commitment Voucher
  const handleConfirmCommitment = async () => {
    if (!commitmentModal) return;
    const { contract, installment, date, expenseAccountId, amount, description } = commitmentModal;

    if (!expenseAccountId) {
      notify('لطفاً سرفصل هزینه اجاره را مشخص کنید', 'error');
      return;
    }
    if (!amount || amount <= 0) {
      notify('مبلغ نامعتبر است', 'error');
      return;
    }

    try {
      setLoading(true);
      const payableAcc = await ensurePayableAccount();

      const docDateIso = convertToGregorian(date);

      const doc = {
        date: docDateIso,
        description: description || `سند تعهد اجاره ${installment.title}`,
        status: 'approved',
        sourceType: 'rent_commitment',
        sourceId: `${contract.id}_${installment.id}`,
        items: [
          {
            ledgerAccountId: expenseAccountId,
            detailedAccountId: '',
            debit: Number(amount),
            credit: 0,
            description: `تعهد هزینه اجاره - ${installment.title}`
          },
          {
            ledgerAccountId: payableAcc.id,
            detailedAccountId: contract.personId,
            debit: 0,
            credit: Number(amount),
            description: `بستانکاری موجر بابت ${installment.title}`
          }
        ]
      };

      const createdDoc = await addAccountingDocument(doc);

      const updatedSchedule = (contract.schedule || []).map((inst: RentInstallment) => {
        if (inst.id === installment.id) {
          return {
            ...inst,
            commitmentStatus: 'committed' as const,
            commitmentDocId: createdDoc?.id || `doc_${Date.now()}`,
            commitmentDate: docDateIso
          };
        }
        return inst;
      });

      const updatedContract = { ...contract, schedule: updatedSchedule };
      await updateRentContract(contract.id, updatedContract);

      notify(`سند تعهد بدهکاری بابت ${installment.title} با موفقیت در حساب موجر ثبت شد`, 'success');
      setCommitmentModal(null);
      await fetchData();
    } catch (e) {
      console.error(e);
      notify('خطا در صدور سند تعهد', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Open 1-Click Payment & Settlement Modal
  const openPaymentModal = (contract: any, installment: RentInstallment) => {
    const remainingNeed = Math.max(0, installment.amount - (installment.paidAmount || 0));

    const matchingPayments = (allTransactions || []).filter(
      (t: any) =>
        (t.type === 'pay' || t.type === 'payment') &&
        String(t.personId) === String(contract.personId)
    );

    // Calculate allocation info for each payment
    const paymentInfos = matchingPayments.map(p => calculatePaymentAllocations(p, contracts));
    const availablePayments = paymentInfos.filter(pi => pi.remainingAvailable > 0);

    // Auto-select available payment(s) to fulfill remainingNeed
    const initialAllocations: Record<string, number> = {};
    let need = remainingNeed;
    for (const pi of availablePayments) {
      if (need <= 0) break;
      const take = Math.min(need, pi.remainingAvailable);
      initialAllocations[String(pi.payment.id)] = take;
      need -= take;
    }

    setPaymentModal({
      contract,
      installment,
      mode: 'previous_payments',
      selectedAllocations: initialAllocations
    });
  };

  // Settle commitment with selected previous payment(s)
  const handleSettleWithPreviousPayment = async () => {
    if (!paymentModal) return;
    const { contract, installment, selectedAllocations } = paymentModal;

    const entries = Object.entries(selectedAllocations).filter(([_, amt]) => Number(amt) > 0);
    if (entries.length === 0) {
      notify('لطفاً حداقل یک پرداخت با مبلغ معتبر را جهت تسویه انتخاب نمایید', 'error');
      return;
    }

    const totalAllocated = entries.reduce((s, [_, amt]) => s + Number(amt), 0);

    try {
      setLoading(true);

      const existingPayments = Array.isArray(installment.payments) ? [...installment.payments] : [];
      const newPaymentsList = [...existingPayments];
      const linkedDocIds: string[] = [];

      for (const [paymentId, allocAmt] of entries) {
        const paymentTx = allTransactions.find(t => String(t.id) === String(paymentId));
        const refNum = paymentTx?.receiptNumber || paymentTx?.trackingNumber || String(paymentId);
        linkedDocIds.push(refNum);
        newPaymentsList.push({
          paymentId: String(paymentId),
          amount: Number(allocAmt),
          date: paymentTx?.date || paymentTx?.rawDate || new Date().toISOString(),
          refNumber: refNum,
          source: paymentTx?.resourceType || paymentTx?.method || 'پرداخت'
        });
      }

      const currentPaid = Number(installment.paidAmount) || 0;
      const newPaidAmount = currentPaid + totalAllocated;
      const isFullySettled = newPaidAmount >= installment.amount;

      const updatedSchedule = (contract.schedule || []).map((inst: RentInstallment) => {
        if (inst.id === installment.id) {
          return {
            ...inst,
            paymentStatus: (isFullySettled ? 'paid' : 'unpaid') as any,
            paidAmount: newPaidAmount,
            paymentDocId: linkedDocIds.join(', ') || inst.paymentDocId || `pay_${Date.now()}`,
            paidDate: new Date().toISOString(),
            payments: newPaymentsList
          };
        }
        return inst;
      });

      const updatedContract = { ...contract, schedule: updatedSchedule };
      await updateRentContract(contract.id, updatedContract);

      notify(`قسط «${installment.title}» با موفقیت با پرداخت‌های انتخابی (${Number(totalAllocated).toLocaleString()} ${currencyUnit}) تسویه شد`, 'success');
      setPaymentModal(null);
      await fetchData();
    } catch (err) {
      console.error(err);
      notify('خطا در تسویه تعهد با پرداخت‌های قبلی', 'error');
    } finally {
      setLoading(false);
    }
  };

  const filteredContracts = contracts.filter(c => {
    const personName = getPersonName(c.personId).toLowerCase();
    const cNum = (c.contractNumber || '').toLowerCase();
    const matchesSearch = personName.includes(searchQuery.toLowerCase()) || cNum.includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === 'all' || c.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6 animate-in fade-in pb-12" dir="rtl">
      {/* ============================================================== */}
      {/* VIEW A: DEDICATED FULL-PAGE DOSSIER VIEW (When Contract Selected) */}
      {/* ============================================================== */}
      {selectedContractDetail ? (() => {
        const c = selectedContractDetail;
        const schedule: RentInstallment[] = c.schedule || [];
        const totalContractCommitments = schedule.reduce((sum, i) => sum + (Number(i.amount) || 0), 0);
        const totalCommitted = schedule.filter(i => i.commitmentStatus === 'committed').reduce((sum, i) => sum + (Number(i.amount) || 0), 0);
        const totalPaid = schedule.reduce((sum, i) => sum + (Number(i.paidAmount) || 0), 0);
        const remainingUnsettledDebt = Math.max(0, totalCommitted - totalPaid);

        const contractDocs = (allAccountingDocs || []).filter((d: any) => 
          (d.sourceType === 'rent_commitment' || d.sourceType === 'rent_payment' || d.sourceType === 'rent_contract') &&
          (String(d.sourceId || '').startsWith(String(c.id)))
        );

        const todayMid = new Date();
        todayMid.setHours(0, 0, 0, 0);
        const todayMidTs = todayMid.getTime();

        return (
          <div className="space-y-6 animate-in fade-in">
            {/* Top Dossier Header Bar */}
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-wrap justify-between items-center gap-4">
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => setSelectedContractDetail(null)}
                  className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all flex items-center gap-1.5 font-bold text-sm cursor-pointer"
                  title="بازگشت به لیست قراردادها"
                >
                  <ArrowRight className="w-5 h-5" />
                  <span>بازگشت به لیست</span>
                </button>
                <div className="border-r border-slate-200 pr-4">
                  <div className="flex items-center gap-2">
                    <Building className="w-6 h-6 text-indigo-600" />
                    <h1 className="text-xl font-extrabold text-slate-900">
                      قرارداد اجاره {c.contractNumber ? `(${c.contractNumber})` : ''}
                    </h1>
                    {(() => {
                      const badge = getStatusBadge(c.status);
                      return (
                        <button
                          type="button"
                          onClick={() => setStatusChangeModal({ contract: c, newStatus: c.status })}
                          className={`px-3 py-1 rounded-full text-xs font-bold border transition-all hover:scale-105 cursor-pointer flex items-center gap-1 ${badge.bg}`}
                          title="برای تغییر وضعیت قرارداد کلیک کنید"
                        >
                          <span>{badge.label}</span>
                          <ChevronDown className="w-3.5 h-3.5 opacity-70" />
                        </button>
                      );
                    })()}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    طرف حساب و موجر: <span className="font-bold text-slate-800">{getPersonName(c.personId)}</span>
                    {' '}• شروع: {formatDateDisplay(c.startDate, storeSettings?.calendarType)}
                    {c.endDate ? ` • پایان: ${formatDateDisplay(c.endDate, storeSettings?.calendarType)}` : ' • مدت: نامحدود'}
                  </p>
                </div>
              </div>

              {/* Action Toolbar */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPrintContract({ contract: c, activeTab: 'agreement' })}
                  className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>چاپ قرارداد و مالی</span>
                </button>

                <button
                  type="button"
                  onClick={() => setAmendmentModal({
                    contract: c,
                    date: new Date(),
                    type: 'rent_amount',
                    newMonthlyAmount: String(c.monthlyAmount || ''),
                    newEndDate: c.endDate ? new Date(convertToGregorian(c.endDate)) : null,
                    applyToFutureOnly: true,
                    description: ''
                  })}
                  className="px-3.5 py-2 bg-blue-50 hover:bg-blue-100 text-blue-800 rounded-xl font-bold text-xs flex items-center gap-1.5 border border-blue-200 transition-colors cursor-pointer"
                >
                  <FileSignature className="w-4 h-4 text-blue-600" />
                  <span>ثبت الحاقیه / تغییر مبلغ</span>
                </button>

                {c.status !== 'terminated' && c.status !== 'completed' && (
                  <>
                    <button
                      type="button"
                      onClick={() => setCompleteModal({
                        contract: c,
                        date: new Date(),
                        depositRefundAmount: String(c.depositAmount || ''),
                        depositRefundStatus: 'fully_refunded',
                        vacated: true,
                        utilitiesSettled: true,
                        rentSettled: true,
                        notes: ''
                      })}
                      className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-xl font-bold text-xs flex items-center gap-1.5 border border-emerald-200 transition-colors cursor-pointer"
                    >
                      <CheckCircle className="w-4 h-4 text-emerald-600" />
                      <span>خاتمه و تحویل ملک</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setTerminateModal({
                        contract: c,
                        date: new Date(),
                        reason: 'mutual',
                        penaltyAmount: '0',
                        depositStatus: 'pending',
                        cancelFutureInstallments: true,
                        notes: ''
                      })}
                      className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-800 rounded-xl font-bold text-xs flex items-center gap-1.5 border border-rose-200 transition-colors cursor-pointer"
                    >
                      <FileX2 className="w-4 h-4 text-rose-600" />
                      <span>فسخ قرارداد</span>
                    </button>
                  </>
                )}

                <button
                  type="button"
                  onClick={() => handleEdit(c)}
                  className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Edit2 className="w-4 h-4" />
                  <span>ویرایش</span>
                </button>

                <button
                  type="button"
                  onClick={() => setDeleteId(c.id)}
                  className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                  title="حذف قرارداد"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Active Alerts for this contract */}
            {(() => {
              const contractAlerts = activeAlerts.filter(a => String(a.contract?.id) === String(c.id));
              if (contractAlerts.length === 0) return null;
              return (
                <div className="bg-amber-50/90 border border-amber-300 rounded-2xl p-4 shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center flex-shrink-0 shadow-2xs">
                        <AlertTriangle className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-extrabold text-amber-950 flex items-center gap-2">
                          <span>هشدارهای مالی فعال این قرارداد</span>
                          <span className="px-2 py-0.5 rounded-full text-xs bg-amber-200 text-amber-900 font-bold">
                            {toPersianDigits(contractAlerts.length)} مورد نیازمند اقدام
                          </span>
                        </h4>
                        <p className="text-xs text-amber-800 mt-0.5">
                          اقساط زیر موعدشان گذشته یا در آستانه سررسید هستند. صدور یک تعهد، هشدارهای سایر دوره‌ها را غیرفعال نمی‌کند.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-1">
                    {contractAlerts.map((alt, aIdx) => {
                      const isCommitment = alt.type === 'commitment_due';
                      const isPast = alt.daysDiff < 0;
                      return (
                        <div
                          key={aIdx}
                          className={`p-3 rounded-xl border flex items-center justify-between gap-3 text-xs ${
                            isPast
                              ? 'bg-rose-50/90 border-rose-200 text-rose-950 shadow-2xs'
                              : 'bg-white border-amber-200 text-slate-800 shadow-2xs'
                          }`}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="font-bold flex items-center gap-1.5 truncate">
                              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${isPast ? 'bg-rose-500 animate-pulse' : 'bg-amber-500'}`} />
                              <span className="truncate">{alt.installment.title}</span>
                            </div>
                            <div className="text-[11px] font-mono text-slate-500 mt-0.5">
                              موعد: {toPersianDigits(alt.installment.dueDate)}
                            </div>
                            <div className={`text-[11px] mt-0.5 font-bold ${isPast ? 'text-rose-700' : 'text-amber-800'}`}>
                              {alt.label}
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            {isCommitment ? (
                              <button
                                type="button"
                                onClick={() => openCommitmentModal(c, alt.installment)}
                                className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
                              >
                                <FileText className="w-3.5 h-3.5" />
                                <span>صدور تعهد</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => openPaymentModal(c, alt.installment)}
                                className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
                              >
                                <Wallet className="w-3.5 h-3.5" />
                                <span>تسویه</span>
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {/* Live Financial KPI Dashboard */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-400 block mb-1">مجموع تعهدات قرارداد</span>
                  <div className="text-xl font-black text-slate-900 font-mono">
                    {totalContractCommitments.toLocaleString()}
                  </div>
                  <span className="text-[11px] text-slate-400">{currencyUnit} ({toPersianDigits(schedule.length)} قسط)</span>
                </div>
                <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Building className="w-6 h-6" />
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-400 block mb-1">اسناد تعهد صادر شده</span>
                  <div className="text-xl font-black text-blue-600 font-mono">
                    {totalCommitted.toLocaleString()}
                  </div>
                  <span className="text-[11px] text-blue-500">
                    {toPersianDigits(schedule.filter(i => i.commitmentStatus === 'committed').length)} از {toPersianDigits(schedule.length)} قسط
                  </span>
                </div>
                <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <FileText className="w-6 h-6" />
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-400 block mb-1">کل تسویه‌ها و پرداخت‌ها</span>
                  <div className="text-xl font-black text-emerald-600 font-mono">
                    {totalPaid.toLocaleString()}
                  </div>
                  <span className="text-[11px] text-emerald-500">
                    {toPersianDigits(schedule.filter(i => i.paymentStatus === 'paid').length)} قسط تسویه کامل
                  </span>
                </div>
                <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <CheckCircle className="w-6 h-6" />
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-400 block mb-1">بدهی معوق (تسویه‌نشده)</span>
                  <div className={`text-xl font-black font-mono ${remainingUnsettledDebt > 0 ? 'text-rose-600' : 'text-slate-700'}`}>
                    {remainingUnsettledDebt.toLocaleString()}
                  </div>
                  <span className={`text-[11px] font-bold ${remainingUnsettledDebt > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                    {remainingUnsettledDebt > 0 ? 'در انتظار پرداخت' : 'حساب کاملاً تسویه است'}
                  </span>
                </div>
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${remainingUnsettledDebt > 0 ? 'bg-rose-50 text-rose-600' : 'bg-slate-100 text-slate-600'}`}>
                  <CreditCard className="w-6 h-6" />
                </div>
              </div>
            </div>

            {/* Dossier Tabs */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="border-b border-slate-200 px-6 pt-4 flex gap-6">
                <button
                  type="button"
                  onClick={() => setDetailActiveTab('schedule')}
                  className={`pb-4 text-sm font-extrabold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
                    detailActiveTab === 'schedule'
                      ? 'border-indigo-600 text-indigo-600'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Calendar className="w-4 h-4" />
                  <span>جدول اقساط، تعهدات و تسویه ({toPersianDigits(schedule.length)})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDetailActiveTab('accounting')}
                  className={`pb-4 text-sm font-extrabold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
                    detailActiveTab === 'accounting'
                      ? 'border-indigo-600 text-indigo-600'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  <span>اسناد و تراکنش‌های حسابداری ({toPersianDigits(contractDocs.length)})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDetailActiveTab('details')}
                  className={`pb-4 text-sm font-extrabold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
                    detailActiveTab === 'details'
                      ? 'border-indigo-600 text-indigo-600'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Info className="w-4 h-4" />
                  <span>مشخصات و شرایط قرارداد</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDetailActiveTab('amendments')}
                  className={`pb-4 text-sm font-extrabold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
                    detailActiveTab === 'amendments'
                      ? 'border-indigo-600 text-indigo-600'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <FileSignature className="w-4 h-4" />
                  <span>الحاقیه‌ها و سوابق حقوقی ({toPersianDigits((c.amendments?.length || 0) + (c.terminationInfo ? 1 : 0) + (c.completionInfo ? 1 : 0))})</span>
                </button>
              </div>

              {/* TAB 1: SCHEDULE & INSTALLMENTS */}
              {detailActiveTab === 'schedule' && (
                <div className="p-6">
                  <div className="overflow-x-auto">
                    <table className="w-full text-right text-sm">
                      <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 text-xs">
                        <tr>
                          <th className="p-3.5 font-bold">دوره / قسط</th>
                          <th className="p-3.5 font-bold text-center">تاریخ موعد سررسید</th>
                          <th className="p-3.5 font-bold text-center">مبلغ قسط ({currencyUnit})</th>
                          <th className="p-3.5 font-bold text-center">وضعیت تعهد (سند هزینه)</th>
                          <th className="p-3.5 font-bold text-center">وضعیت تسویه و پرداخت</th>
                          <th className="p-3.5 font-bold text-center">عملیات مالی</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {schedule.map((inst, idx) => {
                          const isCommitted = inst.commitmentStatus === 'committed';
                          const isPaid = inst.paymentStatus === 'paid';
                          const isPastDue = inst.dueDateTimestamp < todayMidTs;
                          const reminderDays = Number(c.reminderDaysBefore ?? 3);
                          const isDueSoon = inst.dueDateTimestamp - todayMidTs <= reminderDays * 24 * 3600 * 1000;

                          return (
                            <tr key={inst.id || idx} className="hover:bg-slate-50/70 transition-colors">
                              <td className="p-3.5 font-bold text-slate-800">
                                <div className="flex items-center gap-2">
                                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs ${
                                    isPaid ? 'bg-emerald-100 text-emerald-800' :
                                    isCommitted ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-600'
                                  }`}>
                                    {toPersianDigits(inst.periodIndex)}
                                  </div>
                                  <span>{inst.title}</span>
                                </div>
                              </td>

                              <td className="p-3.5 text-center">
                                <div className="font-mono text-slate-700 font-bold text-xs">
                                  {toPersianDigits(inst.dueDate)}
                                </div>
                                {!isPaid && isPastDue && (
                                  <span className="text-[10px] text-rose-600 font-bold block mt-0.5">موعد گذشته (معوق)</span>
                                )}
                                {!isPaid && !isPastDue && isDueSoon && (
                                  <span className="text-[10px] text-amber-600 font-bold block mt-0.5">در آستانه سررسید</span>
                                )}
                              </td>

                              <td className="p-3.5 text-center font-bold font-mono text-slate-900">
                                {Number(inst.amount).toLocaleString()}
                              </td>

                              <td className="p-3.5 text-center">
                                {isCommitted ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                    <Check className="w-3.5 h-3.5" />
                                    <span>سند تعهد صادر شد</span>
                                  </span>
                                ) : isPastDue ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-300">
                                    <AlertTriangle className="w-3.5 h-3.5" />
                                    <span>⚠️ عدم صدور تعهد (معوق)</span>
                                  </span>
                                ) : isDueSoon ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-300">
                                    <AlertTriangle className="w-3.5 h-3.5" />
                                    <span>⚠️ در آستانه سررسید تعهد</span>
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-500 border border-slate-200">
                                    <Clock className="w-3.5 h-3.5" />
                                    <span>در انتظار موعد</span>
                                  </span>
                                )}
                              </td>

                              <td className="p-3.5 text-center">
                                {isPaid ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    <ShieldCheck className="w-3.5 h-3.5" />
                                    <span>✓ تسویه کامل ({Number(inst.paidAmount).toLocaleString()})</span>
                                  </span>
                                ) : (inst.paidAmount || 0) > 0 ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-cyan-50 text-cyan-800 border border-cyan-300">
                                    <Wallet className="w-3.5 h-3.5" />
                                    <span>تسویه جزئی ({Number(inst.paidAmount).toLocaleString()} از {Number(inst.amount).toLocaleString()})</span>
                                  </span>
                                ) : isCommitted && isPastDue ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                    <AlertTriangle className="w-3.5 h-3.5" />
                                    <span>⚠️ پرداخت معوق</span>
                                  </span>
                                ) : isCommitted && isDueSoon ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                    <Clock className="w-3.5 h-3.5" />
                                    <span>در انتظار پرداخت</span>
                                  </span>
                                ) : isCommitted ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200">
                                    <Clock className="w-3.5 h-3.5" />
                                    <span>پرداخت نشده</span>
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-50 text-slate-400 border border-slate-200">
                                    <Clock className="w-3.5 h-3.5" />
                                    <span>پس از ثبت تعهد</span>
                                  </span>
                                )}
                              </td>

                              <td className="p-3.5 text-center">
                                <div className="flex items-center justify-center gap-2">
                                  {!isCommitted ? (
                                    <button
                                      type="button"
                                      onClick={() => openCommitmentModal(c, inst)}
                                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
                                    >
                                      <FileText className="w-3.5 h-3.5" />
                                      <span>تایید و صدور تعهد</span>
                                    </button>
                                  ) : !isPaid ? (
                                    <button
                                      type="button"
                                      onClick={() => openPaymentModal(c, inst)}
                                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
                                    >
                                      <Wallet className="w-3.5 h-3.5" />
                                      <span>ثبت پرداخت و تسویه</span>
                                    </button>
                                  ) : (
                                    <span className="text-xs text-emerald-600 font-bold flex items-center gap-1">
                                      <CheckCircle className="w-4 h-4" />
                                      <span>تکمیل شده</span>
                                    </span>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 2: ACCOUNTING DOCUMENTS */}
              {detailActiveTab === 'accounting' && (
                <div className="p-6">
                  {contractDocs.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-right text-sm">
                        <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 text-xs">
                          <tr>
                            <th className="p-3.5 font-bold">شماره / شناسه سند</th>
                            <th className="p-3.5 font-bold">تاریخ سند</th>
                            <th className="p-3.5 font-bold">شرح سند</th>
                            <th className="p-3.5 font-bold text-center">نوع عملیات</th>
                            <th className="p-3.5 font-bold text-center">مبلغ سند ({currencyUnit})</th>
                            <th className="p-3.5 font-bold text-center">وضعیت</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {contractDocs.map((doc: any, dIdx: number) => {
                            const docAmount = (doc.items || []).reduce((sum: number, it: any) => sum + (Number(it.debit) || 0), 0);
                            return (
                              <tr key={doc.id || dIdx} className="hover:bg-slate-50">
                                <td className="p-3.5 font-mono text-xs font-bold text-slate-700">{doc.documentNumber || doc.id}</td>
                                <td className="p-3.5 text-xs text-slate-600 font-bold">{formatDateDisplay(doc.date, storeSettings?.calendarType)}</td>
                                <td className="p-3.5 text-xs text-slate-800 font-medium">{doc.description}</td>
                                <td className="p-3.5 text-center">
                                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                                    doc.sourceType === 'rent_commitment' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                                    doc.sourceType === 'rent_payment' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                                    'bg-slate-100 text-slate-700'
                                  }`}>
                                    {doc.sourceType === 'rent_commitment' ? 'تعهد بدهکاری' : doc.sourceType === 'rent_payment' ? 'تسویه و پرداخت' : 'قرارداد اجاره'}
                                  </span>
                                </td>
                                <td className="p-3.5 text-center font-bold font-mono text-slate-900">{docAmount.toLocaleString()}</td>
                                <td className="p-3.5 text-center">
                                  <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-md text-xs font-bold">ثبت قطعی</span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-12 text-slate-400">
                      <FileText className="w-12 h-12 mx-auto text-slate-300 mb-2" />
                      <p>هنوز سند حسابداری برای این قرارداد صادر نشده است.</p>
                      <p className="text-xs text-slate-400 mt-1">با تایید تعهد یا ثبت پرداخت در تب جدول اقساط، اسناد به صورت خودکار صادر می‌شوند.</p>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: CONTRACT DETAILS */}
              {detailActiveTab === 'details' && (
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 space-y-3">
                    <h4 className="font-bold text-slate-800 border-b border-slate-200 pb-2">اطلاعات طرف قرارداد (موجر)</h4>
                    <div className="flex justify-between text-sm"><span className="text-slate-500">نام شخص:</span><span className="font-bold text-slate-800">{getPersonName(c.personId)}</span></div>
                    <div className="flex justify-between text-sm"><span className="text-slate-500">کد پرسنلی / طرف حساب:</span><span className="font-mono text-slate-700">{getPersonDetails(c.personId)?.personCode || '---'}</span></div>
                    <div className="flex justify-between text-sm"><span className="text-slate-500">تلفن تماس:</span><span className="font-mono text-slate-700">{getPersonDetails(c.personId)?.mobile || getPersonDetails(c.personId)?.phone || '---'}</span></div>
                    <div className="flex justify-between text-sm"><span className="text-slate-500">شماره کارت / حساب بانکی:</span><span className="font-mono text-slate-700">{getPersonDetails(c.personId)?.bankAccount || '---'}</span></div>
                  </div>

                  <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 space-y-3">
                    <h4 className="font-bold text-slate-800 border-b border-slate-200 pb-2">شرایط مالی و قرارداد</h4>
                    <div className="flex justify-between text-sm"><span className="text-slate-500">دوره پرداخت:</span><span className="font-bold text-indigo-700">{c.paymentCycle === 'quarterly' ? 'فصلی (۳ ماهه)' : c.paymentCycle === 'semi_annual' ? 'شش‌ماهه' : c.paymentCycle === 'annual' ? 'سالانه' : 'ماهانه'}</span></div>
                    <div className="flex justify-between text-sm"><span className="text-slate-500">روز موعد سررسید:</span><span className="font-bold text-slate-800">روز {toPersianDigits(c.paymentDay)} هر دوره</span></div>
                    <div className="flex justify-between text-sm"><span className="text-slate-500">مبلغ ودیعه (رهن):</span><span className="font-bold font-mono text-amber-700">{Number(c.depositAmount || 0).toLocaleString()} {currencyUnit}</span></div>
                    <div className="flex justify-between text-sm"><span className="text-slate-500">هشدار قبل از سررسید:</span><span className="font-bold text-slate-800">{toPersianDigits(c.reminderDaysBefore ?? 3)} روز قبل</span></div>
                    <div className="flex justify-between text-sm"><span className="text-slate-500">سرفصل هزینه معین:</span><span className="text-slate-700">{ledgerAccounts.find(a => String(a.id) === String(c.expenseAccountId))?.title || 'پیش‌فرض سیستم'}</span></div>
                  </div>

                  {c.description && (
                    <div className="md:col-span-2 bg-slate-50 p-5 rounded-xl border border-slate-200">
                      <h4 className="font-bold text-slate-800 mb-2">توضیحات و شروط قرارداد:</h4>
                      <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">{c.description}</p>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: AMENDMENTS & LEGAL HISTORY */}
              {detailActiveTab === 'amendments' && (
                <div className="p-6 space-y-6">
                  {/* Termination Banner if terminated */}
                  {c.terminationInfo && (
                    <div className="bg-rose-50 border border-rose-200 p-5 rounded-2xl space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="font-extrabold text-rose-950 text-base flex items-center gap-2">
                          <FileX2 className="w-5 h-5 text-rose-600" />
                          <span>صورتجلسه فسخ قرارداد</span>
                        </h4>
                        <span className="text-xs font-mono font-bold text-rose-800">
                          تاریخ فسخ: {formatDateDisplay(c.terminationInfo.date, storeSettings?.calendarType)}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-rose-900 bg-white/70 p-3 rounded-xl border border-rose-100">
                        <div><strong>علت فسخ:</strong> {c.terminationInfo.reason === 'mutual' ? 'توافق دوطرفه' : c.terminationInfo.reason === 'non_payment' ? 'عدم پرداخت اجاره‌بها' : c.terminationInfo.reason === 'early_vacation' ? 'تخلیه زودهنگام' : c.terminationInfo.reason === 'breach_of_terms' ? 'تخلف از شروط قرارداد' : 'سایر موارد'}</div>
                        <div><strong>خسارت/جریمه فسخ:</strong> {Number(c.terminationInfo.penaltyAmount || 0).toLocaleString()} {currencyUnit}</div>
                        <div><strong>وضعیت ودیعه:</strong> {c.terminationInfo.depositStatus === 'refunded' ? 'مسترد گردید' : c.terminationInfo.depositStatus === 'settled_with_damages' ? 'تهاتر با مطالبات' : 'در انتظار تسویه'}</div>
                      </div>
                      {c.terminationInfo.notes && (
                        <p className="text-xs text-rose-800 leading-relaxed bg-white/60 p-3 rounded-xl">
                          <strong>توضیحات صورتجلسه:</strong> {c.terminationInfo.notes}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Completion Banner if completed */}
                  {c.completionInfo && (
                    <div className="bg-blue-50 border border-blue-200 p-5 rounded-2xl space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="font-extrabold text-blue-950 text-base flex items-center gap-2">
                          <CheckCircle className="w-5 h-5 text-blue-600" />
                          <span>صورتجلسه خاتمه و تحویل ملک</span>
                        </h4>
                        <span className="text-xs font-mono font-bold text-blue-800">
                          تاریخ خاتمه: {formatDateDisplay(c.completionInfo.date, storeSettings?.calendarType)}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-blue-900 bg-white/70 p-3 rounded-xl border border-blue-100">
                        <div><strong>مبلغ ودیعه مسترد شده:</strong> {Number(c.completionInfo.depositRefundAmount || 0).toLocaleString()} {currencyUnit}</div>
                        <div><strong>وضعیت تخلیه:</strong> {c.completionInfo.vacated ? '✓ ملک تخلیه و تحویل شد' : 'در انتظار تخلیه'}</div>
                        <div><strong>تسویه قبوض و شارژ:</strong> {c.completionInfo.utilitiesSettled ? '✓ کامل تسویه شد' : 'در انتظار تسویه'}</div>
                      </div>
                      {c.completionInfo.notes && (
                        <p className="text-xs text-blue-800 leading-relaxed bg-white/60 p-3 rounded-xl">
                          <strong>شرح تحویل:</strong> {c.completionInfo.notes}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Registered Amendments List */}
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h4 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
                        <FileSignature className="w-4 h-4 text-indigo-600" />
                        <span>الحاقیه‌ها و الحاق‌های ثبت‌شده ({toPersianDigits(c.amendments?.length || 0)})</span>
                      </h4>
                      <button
                        type="button"
                        onClick={() => setAmendmentModal({
                          contract: c,
                          date: new Date(),
                          type: 'rent_amount',
                          newMonthlyAmount: String(c.monthlyAmount || ''),
                          newEndDate: c.endDate ? new Date(convertToGregorian(c.endDate)) : null,
                          applyToFutureOnly: true,
                          description: ''
                        })}
                        className="px-3.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>ثبت الحاقیه جدید</span>
                      </button>
                    </div>

                    {c.amendments && c.amendments.length > 0 ? (
                      <div className="space-y-3">
                        {c.amendments.map((amd: RentContractAmendment, aIdx: number) => (
                          <div key={amd.id || aIdx} className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="font-bold text-slate-900 text-sm">{amd.title}</span>
                              <span className="text-xs font-mono text-slate-500">تاریخ: {formatDateDisplay(amd.date, storeSettings?.calendarType)}</span>
                            </div>
                            <div className="flex flex-wrap gap-4 text-xs text-slate-600">
                              {amd.type === 'rent_amount' && (
                                <span>مبلغ قبلی: <strong className="line-through">{Number(amd.oldMonthlyAmount || 0).toLocaleString()}</strong> ➔ جدید: <strong className="text-indigo-700 font-mono font-bold">{Number(amd.newMonthlyAmount || 0).toLocaleString()} {currencyUnit}</strong></span>
                              )}
                              {amd.type === 'extend_term' && (
                                <span>تمدید تا: <strong className="text-indigo-700 font-mono font-bold">{formatDateDisplay(amd.newEndDate, storeSettings?.calendarType)}</strong></span>
                              )}
                            </div>
                            {amd.description && (
                              <p className="text-xs text-slate-700 bg-white p-2.5 rounded-lg border border-slate-200 leading-relaxed">
                                {amd.description}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : !c.terminationInfo && !c.completionInfo ? (
                      <div className="text-center py-8 text-slate-400 border border-dashed border-slate-200 rounded-2xl">
                        <FileSignature className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                        <p className="text-xs font-bold">هنوز هیچ الحاقیه‌ای برای این قرارداد ثبت نشده است.</p>
                      </div>
                    ) : null}
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })() : (
        /* ============================================================== */
        /* VIEW B: MAIN OVERVIEW & CONTRACTS LIST (When No Contract Open) */
        /* ============================================================== */
        <div className="space-y-6 animate-in fade-in">
          {/* Active Alerts Strip */}
          {activeAlerts.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl shadow-xs space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center flex-shrink-0">
                    <AlertTriangle className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <div className="font-extrabold text-sm text-slate-900">
                      {toPersianDigits(activeAlerts.length)} تعهد اجاره نیازمند اقدام است!
                    </div>
                    <div className="text-xs text-amber-800 mt-0.5">
                      اقساطی در آستانه سررسید یا معوق هستند که سند تعهد یا تسویه آن‌ها در انتظار تایید شماست.
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAllAlerts(!showAllAlerts)}
                    className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
                  >
                    <span>{showAllAlerts ? 'بستن لیست کامل' : `مشاهده تمام هشدارها (${toPersianDigits(activeAlerts.length)})`}</span>
                    {showAllAlerts ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const first = activeAlerts[0];
                      if (first) {
                        setSelectedContractDetail(first.contract);
                        if (first.type === 'commitment_due') {
                          openCommitmentModal(first.contract, first.installment);
                        } else {
                          openPaymentModal(first.contract, first.installment);
                        }
                      }
                    }}
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
                  >
                    <span>اقدام سریع اولین مورد</span>
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Expandable list of all alerts across all contracts */}
              {showAllAlerts && (
                <div className="mt-3 pt-3 border-t border-amber-200/80 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {activeAlerts.map((alt, idx) => {
                    const isCommitment = alt.type === 'commitment_due';
                    const isPast = alt.daysDiff < 0;
                    return (
                      <div
                        key={idx}
                        className={`p-3 rounded-xl border flex items-center justify-between gap-3 text-xs ${
                          isPast
                            ? 'bg-rose-50/90 border-rose-200 text-rose-950 shadow-2xs'
                            : 'bg-white border-amber-200 text-slate-800 shadow-2xs'
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="font-bold flex items-center gap-1.5 truncate">
                            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${isPast ? 'bg-rose-500 animate-pulse' : 'bg-amber-500'}`} />
                            <span className="truncate">{getPersonName(alt.contract.personId)} - {alt.installment.title}</span>
                          </div>
                          <div className="text-[11px] font-mono text-slate-500 mt-0.5">
                            قرارداد: {alt.contract.contractNumber} • موعد: {toPersianDigits(alt.installment.dueDate)}
                          </div>
                          <div className={`text-[11px] mt-0.5 font-bold ${isPast ? 'text-rose-700' : 'text-amber-800'}`}>
                            {alt.label}
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          {isCommitment ? (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedContractDetail(alt.contract);
                                openCommitmentModal(alt.contract, alt.installment);
                              }}
                              className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              <span>صدور تعهد</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedContractDetail(alt.contract);
                                openPaymentModal(alt.contract, alt.installment);
                              }}
                              className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
                            >
                              <Wallet className="w-3.5 h-3.5" />
                              <span>تسویه</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Action Header Bar */}
          <div className="flex flex-wrap justify-between items-center bg-white p-4 rounded-2xl shadow-sm border border-slate-200 gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <input 
                type="text" 
                placeholder="جستجو بر اساس طرف قرارداد یا شماره..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 text-sm w-72"
              />

              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none text-xs font-bold text-slate-700 cursor-pointer"
              >
                <option value="all">همه وضعیت‌ها ({toPersianDigits(contracts.length)})</option>
                <option value="active">فعال ({toPersianDigits(contracts.filter(c => c.status === 'active').length)})</option>
                <option value="suspended">معلق / غیرفعال ({toPersianDigits(contracts.filter(c => c.status === 'suspended' || c.status === 'inactive').length)})</option>
                <option value="draft">پیش‌نویس ({toPersianDigits(contracts.filter(c => c.status === 'draft').length)})</option>
                <option value="completed">خاتمه‌یافته ({toPersianDigits(contracts.filter(c => c.status === 'completed' || c.status === 'expired').length)})</option>
                <option value="terminated">فسخ‌شده ({toPersianDigits(contracts.filter(c => c.status === 'terminated').length)})</option>
              </select>

              <button
                type="button"
                onClick={fetchData}
                className="p-2.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                title="بروزرسانی داده‌ها"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-indigo-600' : ''}`} />
              </button>
            </div>

            <button 
              type="button"
              onClick={handleOpenCreateModal}
              className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-bold flex items-center gap-2 hover:bg-indigo-700 transition-all shadow-sm shadow-indigo-100 text-sm cursor-pointer"
            >
              <Plus className="w-5 h-5" />
              <span>ثبت قرارداد اجاره جدید</span>
            </button>
          </div>

          {/* Contracts Table */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-sm">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 text-xs">
                  <tr>
                    <th className="p-4 font-bold">طرف قرارداد (موجر)</th>
                    <th className="p-4 font-bold">شماره قرارداد</th>
                    <th className="p-4 font-bold">بازه زمانی</th>
                    <th className="p-4 font-bold text-center">دوره و روز سررسید</th>
                    <th className="p-4 font-bold text-center">مبلغ اجاره ({currencyUnit})</th>
                    <th className="p-4 font-bold text-center">اقساط و تسویه</th>
                    <th className="p-4 font-bold text-center">وضعیت</th>
                    <th className="p-4 font-bold text-center w-40">عملیات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredContracts.map(c => {
                    const schedule: RentInstallment[] = c.schedule || [];
                    const totalPaidCount = schedule.filter(i => i.paymentStatus === 'paid').length;
                    const hasAlert = activeAlerts.some(a => a.contract.id === c.id);

                    return (
                      <tr 
                        key={c.id} 
                        className="hover:bg-indigo-50/20 transition-colors cursor-pointer"
                        onClick={() => setSelectedContractDetail(c)}
                      >
                        <td className="p-4 font-bold text-slate-900 flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold text-xs">
                            {getPersonName(c.personId).slice(0, 1)}
                          </div>
                          <span>{getPersonName(c.personId)}</span>
                        </td>
                        <td className="p-4 text-slate-700 font-mono text-xs">{c.contractNumber || '---'}</td>
                        <td className="p-4 text-slate-500 text-xs">
                          {formatDateDisplay(c.startDate, storeSettings?.calendarType)}
                          {' '}تا{' '}
                          {c.endDate ? formatDateDisplay(c.endDate, storeSettings?.calendarType) : 'نامحدود'}
                        </td>
                        <td className="p-4 text-center text-xs">
                          <span className="font-bold text-indigo-700">
                            {c.paymentCycle === 'quarterly' ? 'فصلی' : c.paymentCycle === 'semi_annual' ? 'شش‌ماهه' : c.paymentCycle === 'annual' ? 'سالانه' : 'ماهانه'}
                          </span>
                          <span className="text-slate-400 block mt-0.5">روز {toPersianDigits(c.paymentDay)}</span>
                        </td>
                        <td className="p-4 text-center">
                          <div className="font-extrabold text-slate-900 font-mono">
                            {Number(c.monthlyAmount).toLocaleString()}
                          </div>
                          {c.depositAmount ? (
                            <div className="text-[11px] text-amber-700 font-mono mt-0.5">
                              ودیعه: {Number(c.depositAmount).toLocaleString()}
                            </div>
                          ) : null}
                        </td>
                        <td className="p-4 text-center text-xs">
                          <div className="flex flex-col items-center gap-1">
                            <span className="text-slate-600 font-mono">
                              {toPersianDigits(totalPaidCount)} از {toPersianDigits(schedule.length)} قسط تسویه
                            </span>
                            {hasAlert && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                                <AlertTriangle className="w-3 h-3 text-amber-600" />
                                نیازمند اقدام
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-4 text-center">
                          {(() => {
                            const badge = getStatusBadge(c.status);
                            return (
                              <span className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-bold border ${badge.bg}`}>
                                {badge.label}
                              </span>
                            );
                          })()}
                        </td>
                        <td className="p-4 text-center" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-center gap-1.5">
                            <button 
                              type="button"
                              onClick={() => setSelectedContractDetail(c)}
                              className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                              title="صفحه اختصاصی وضعیت مالی"
                            >
                              <Eye className="w-4 h-4" />
                              <span>داشبورد مالی</span>
                            </button>
                            <button 
                              type="button"
                              onClick={() => handleEdit(c)} 
                              className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                              title="ویرایش"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button 
                              type="button"
                              onClick={() => setDeleteId(c.id)} 
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              title="حذف"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredContracts.length === 0 && (
                    <tr>
                      <td colSpan={8} className="p-12 text-center text-slate-400 font-medium">
                        قرارداد اجاره‌ای یافت نشد. برای شروع، روی «ثبت قرارداد اجاره جدید» کلیک کنید.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* SHARED MODALS (RENDERED ON TOP OF EITHER VIEW)                  */}
      {/* ============================================================== */}

      {/* 1. CREATE / EDIT CONTRACT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-3xl shadow-2xl flex flex-col overflow-hidden max-h-[92vh]">
            <div className="p-5 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <h3 className="font-extrabold text-slate-900 text-lg flex items-center gap-2">
                <Building className="w-5 h-5 text-indigo-600" />
                {editingId ? 'ویرایش قرارداد اجاره' : 'ثبت قرارداد اجاره جدید'}
              </h3>
              <button 
                type="button"
                onClick={() => setIsModalOpen(false)} 
                className="text-slate-400 hover:text-slate-600 p-2 bg-white rounded-lg border border-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">
                    طرف قرارداد (موجر) <span className="text-rose-500">*</span>
                  </label>
                  <Select
                    value={form.personId}
                    onChange={(val) => setForm({...form, personId: val})}
                    options={(personsData || []).map((p: any) => ({ 
                      value: p.id, 
                      label: `${p.name || `${p.firstName || ''} ${p.lastName || ''}`.trim() || 'بدون نام'} (${p.personCode || 'کد: ' + (p.id ? p.id.toString().slice(-4) : '')})` 
                    }))}
                    placeholder="انتخاب شخص موجر..."
                    className="react-select-container text-sm font-bold"
                    classNamePrefix="react-select"
                    isClearable={false}
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">شماره قرارداد</label>
                  <input 
                    type="text" 
                    value={form.contractNumber}
                    onChange={e => setForm({...form, contractNumber: e.target.value})}
                    className="w-full border border-slate-200 rounded-xl p-2.5 outline-none focus:border-indigo-500 font-mono text-sm"
                    placeholder="مثال: RC-140301"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-indigo-600" /> تاریخ شروع قرارداد <span className="text-rose-500">*</span>
                  </label>
                  <DatePicker
                    value={form.startDate}
                    onChange={(d: any) => setForm({ ...form, startDate: d })}
                    calendar={storeSettings?.calendarType === 'gregorian' ? gregorian : persian}
                    locale={storeSettings?.calendarType === 'gregorian' ? gregorian_en : persian_fa}
                    calendarPosition="bottom-right"
                    inputClass="w-full p-2.5 bg-white border border-slate-200 rounded-xl focus:border-indigo-500 outline-none text-center font-bold text-slate-900 cursor-pointer"
                    containerClassName="w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-indigo-600" /> تاریخ پایان قرارداد
                  </label>
                  <DatePicker
                    value={form.endDate}
                    onChange={(d: any) => setForm({ ...form, endDate: d })}
                    calendar={storeSettings?.calendarType === 'gregorian' ? gregorian : persian}
                    locale={storeSettings?.calendarType === 'gregorian' ? gregorian_en : persian_fa}
                    calendarPosition="bottom-right"
                    inputClass="w-full p-2.5 bg-white border border-slate-200 rounded-xl focus:border-indigo-500 outline-none text-center font-bold text-slate-900 cursor-pointer"
                    containerClassName="w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">دوره پرداخت اجاره <span className="text-rose-500">*</span></label>
                  <select
                    value={form.paymentCycle}
                    onChange={(e: any) => setForm({ ...form, paymentCycle: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl p-2.5 outline-none focus:border-indigo-500 text-sm font-bold bg-white cursor-pointer"
                  >
                    <option value="monthly">ماهانه (هر ۱ ماه یکبار)</option>
                    <option value="quarterly">فصلی (هر ۳ ماه یکبار)</option>
                    <option value="semi_annual">شش‌ماهه (هر ۶ ماه یکبار)</option>
                    <option value="annual">سالانه (یکبار در سال)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">روز سررسید هر دوره (۱ تا ۳۱) <span className="text-rose-500">*</span></label>
                  <input 
                    type="number"
                    min="1"
                    max="31"
                    value={form.paymentDay}
                    onChange={(e) => setForm({...form, paymentDay: e.target.value})}
                    className="w-full border border-slate-200 rounded-xl p-2.5 outline-none focus:border-indigo-500 text-center font-bold font-mono"
                    placeholder="مثال: ۲۵"
                    dir="ltr"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">مبلغ اجاره هر دوره ({currencyUnit}) <span className="text-rose-500">*</span></label>
                  <CurrencyInput 
                    value={form.monthlyAmount}
                    onChange={(e: any) => setForm({...form, monthlyAmount: e.target.value})}
                    storeSettings={storeSettings}
                    hideWords={true}
                    className="w-full border border-slate-200 rounded-xl p-2.5 outline-none focus:border-indigo-500 text-left font-mono font-bold"
                    placeholder="0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">مبلغ ودیعه / رهن ({currencyUnit})</label>
                  <CurrencyInput 
                    value={form.depositAmount}
                    onChange={(e: any) => setForm({...form, depositAmount: e.target.value})}
                    storeSettings={storeSettings}
                    hideWords={true}
                    className="w-full border border-slate-200 rounded-xl p-2.5 outline-none focus:border-indigo-500 text-left font-mono"
                    placeholder="0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">روزهای هشدار قبل از سررسید</label>
                  <input 
                    type="number"
                    min="0"
                    max="30"
                    value={form.reminderDaysBefore}
                    onChange={(e) => setForm({...form, reminderDaysBefore: Number(e.target.value) || 0})}
                    className="w-full border border-slate-200 rounded-xl p-2.5 outline-none focus:border-indigo-500 text-center font-bold font-mono"
                    placeholder="3"
                    dir="ltr"
                  />
                  <span className="text-[11px] text-slate-400 mt-1 block">پیش‌فرض: ۳ روز قبل از سررسید قسط هشدار داده می‌شود.</span>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">سرفصل معین هزینه اجاره</label>
                  <Select
                    options={ledgerAccounts.map(a => ({ value: a.id, label: `${a.code} - ${a.title}` }))}
                    value={form.expenseAccountId ? { value: form.expenseAccountId, label: ledgerAccounts.find(a => String(a.id) === String(form.expenseAccountId))?.title } : null}
                    onChange={(val: any) => setForm({ ...form, expenseAccountId: val?.value || '' })}
                    placeholder="انتخاب سرفصل هزینه اجاره..."
                    className="text-sm font-bold"
                    isClearable={true}
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">کاربری مورد اجاره</label>
                  <select
                    value={form.propertyUsage}
                    onChange={(e: any) => setForm({ ...form, propertyUsage: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl p-2.5 outline-none focus:border-indigo-500 text-sm font-bold bg-white cursor-pointer"
                  >
                    <option value="commercial">واحد تجاری / فروشگاه</option>
                    <option value="office">واحد اداری / دفتر کار</option>
                    <option value="warehouse">انبار تجاری / سوله</option>
                    <option value="residential">واحد مسکونی</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">متراژ / مساحت (متر مربع)</label>
                  <input
                    type="text"
                    value={form.propertyArea}
                    onChange={(e) => setForm({ ...form, propertyArea: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl p-2.5 outline-none focus:border-indigo-500 text-center font-bold font-mono"
                    placeholder="مثال: ۱۲۰"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">شماره پلاک ثبتی / کد رهگیری</label>
                  <input
                    type="text"
                    value={form.propertyRegistryCode}
                    onChange={(e) => setForm({ ...form, propertyRegistryCode: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl p-2.5 outline-none focus:border-indigo-500 font-mono text-sm"
                    placeholder="مثال: ۱۲۳/۴۵۶"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">نشانی دقیق مورد اجاره</label>
                  <input
                    type="text"
                    value={form.propertyAddress}
                    onChange={(e) => setForm({ ...form, propertyAddress: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl p-2.5 outline-none focus:border-indigo-500 text-sm"
                    placeholder="خیابان، پلاک، طبقه، واحد..."
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">وضعیت اولیه قرارداد</label>
                  <select 
                    value={form.status}
                    onChange={e => setForm({...form, status: e.target.value as any})}
                    className="w-full border border-slate-200 rounded-xl p-2.5 outline-none focus:border-indigo-500 text-sm font-bold bg-white cursor-pointer"
                  >
                    <option value="active">فعال (محاسبه و هشدار خودکار اقساط)</option>
                    <option value="suspended">معلق / غیرفعال موقت (توقف هشدارها)</option>
                    <option value="draft">پیش‌نویس</option>
                    <option value="completed">خاتمه‌یافته</option>
                    <option value="terminated">فسخ‌شده</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">توضیحات و شروط قرارداد</label>
                  <textarea 
                    value={form.description}
                    onChange={e => setForm({...form, description: e.target.value})}
                    className="w-full border border-slate-200 rounded-xl p-3 outline-none focus:border-indigo-500 h-20 resize-none text-sm"
                    placeholder="نشانی ملک، مورد اجاره، شرایط فسخ یا پرداخت..."
                  ></textarea>
                </div>
              </div>
            </div>
            
            <div className="p-5 border-t border-slate-200 flex justify-end gap-3 bg-slate-50">
              <button 
                type="button"
                onClick={() => setIsModalOpen(false)} 
                className="px-6 py-2.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl font-bold transition-colors cursor-pointer"
              >
                انصراف
              </button>
              <button 
                type="button"
                onClick={handleSave} 
                disabled={loading}
                className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-bold shadow-sm shadow-indigo-200 hover:bg-indigo-700 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Check className="w-5 h-5" />
                <span>{loading ? 'در حال ثبت...' : 'ثبت و تولید اقساط'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. CONFIRM COMMITMENT VOUCHER MODAL */}
      {commitmentModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col">
            <div className="px-6 py-5 bg-indigo-600 flex justify-between items-center text-white">
              <h3 className="font-extrabold text-lg flex items-center gap-2">
                <FileText className="w-5 h-5" /> تایید و صدور سند تعهد اجاره
              </h3>
              <button 
                type="button"
                onClick={() => setCommitmentModal(null)} 
                className="p-2 bg-indigo-700/50 hover:bg-indigo-700 rounded-xl transition-colors text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-100 text-xs space-y-2 text-indigo-950 font-medium">
                <div className="flex justify-between"><span className="text-slate-600">قسط مربوطه:</span><span className="font-bold text-indigo-900">{commitmentModal.installment.title}</span></div>
                <div className="flex justify-between"><span className="text-slate-600">طرف حساب (موجر):</span><span className="font-bold text-slate-800">{getPersonName(commitmentModal.contract.personId)}</span></div>
                <div className="flex justify-between"><span className="text-slate-600">تاریخ سررسید قسط:</span><span className="font-bold font-mono">{toPersianDigits(commitmentModal.installment.dueDate)}</span></div>
                <div className="flex justify-between border-t border-indigo-200 pt-2"><span className="text-slate-600">مبلغ سند تعهد:</span><span className="font-extrabold text-indigo-700 font-mono text-sm">{Number(commitmentModal.amount).toLocaleString()} {currencyUnit}</span></div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  سرفصل معین هزینه اجاره (بدهکار) <span className="text-rose-500">*</span>
                </label>
                <Select
                  options={ledgerAccounts.map(a => ({ value: a.id, label: `${a.code} - ${a.title}` }))}
                  value={commitmentModal.expenseAccountId ? { value: commitmentModal.expenseAccountId, label: ledgerAccounts.find(a => String(a.id) === String(commitmentModal.expenseAccountId))?.title } : null}
                  onChange={(val: any) => setCommitmentModal({ ...commitmentModal, expenseAccountId: val?.value || '' })}
                  placeholder="انتخاب سرفصل هزینه..."
                  className="text-sm font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-indigo-600" /> تاریخ سند حسابداری
                </label>
                <DatePicker
                  value={commitmentModal.date}
                  onChange={(d: any) => setCommitmentModal({ ...commitmentModal, date: d })}
                  calendar={storeSettings?.calendarType === 'gregorian' ? gregorian : persian}
                  locale={storeSettings?.calendarType === 'gregorian' ? gregorian_en : persian_fa}
                  calendarPosition="bottom-right"
                  inputClass="w-full p-2.5 bg-white border border-slate-200 rounded-xl focus:border-indigo-500 outline-none text-center font-bold text-slate-900 cursor-pointer"
                  containerClassName="w-full"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">شرح سند حسابداری</label>
                <input
                  type="text"
                  value={commitmentModal.description}
                  onChange={(e) => setCommitmentModal({ ...commitmentModal, description: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl p-2.5 outline-none focus:border-indigo-500 text-xs"
                />
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
              <button 
                type="button"
                onClick={() => setCommitmentModal(null)} 
                className="px-5 py-2.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl font-bold text-xs transition-colors cursor-pointer"
              >
                انصراف
              </button>
              <button 
                type="button"
                onClick={handleConfirmCommitment} 
                disabled={loading}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs shadow-sm shadow-indigo-200 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Check className="w-4 h-4" />
                <span>{loading ? 'در حال صدور...' : 'صدور سند حسابداری تعهد'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. REGISTER PAYMENT & SETTLEMENT MODAL */}
      {paymentModal && (() => {
        const remainingNeed = Math.max(0, paymentModal.installment.amount - (paymentModal.installment.paidAmount || 0));

        const matchingPayments = (allTransactions || []).filter(
          (t: any) =>
            (t.type === 'pay' || t.type === 'payment') &&
            String(t.personId) === String(paymentModal.contract.personId)
        );

        const paymentInfos = matchingPayments.map(p => calculatePaymentAllocations(p, contracts));
        const totalSelectedAllocated = Object.entries(paymentModal.selectedAllocations || {}).reduce(
          (sum, [_, amt]) => sum + (Number(amt) || 0),
          0
        );

        const isFullyCovered = totalSelectedAllocated >= remainingNeed && remainingNeed > 0;
        const deficit = Math.max(0, remainingNeed - totalSelectedAllocated);

        return (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto">
            <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[94vh] animate-in fade-in zoom-in-95 duration-200">
              {/* Modal Header */}
              <div className="px-6 py-4.5 bg-gradient-to-r from-emerald-600 via-teal-700 to-emerald-800 flex justify-between items-center text-white shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-white/15 backdrop-blur-xs flex items-center justify-center border border-white/20">
                    <Wallet className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-base sm:text-lg">ثبت پرداخت و تسویه تعهد اجاره</h3>
                    <p className="text-xs text-emerald-100 font-medium">
                      {paymentModal.installment.title} • موجر: <span className="font-bold text-white">{getPersonName(paymentModal.contract.personId)}</span>
                    </p>
                  </div>
                </div>
                <button 
                  type="button"
                  onClick={() => setPaymentModal(null)} 
                  className="p-2 bg-white/10 hover:bg-white/20 rounded-xl transition-colors text-white cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Installment Summary Banner */}
              <div className="p-4 bg-emerald-50/90 border-b border-emerald-100/80 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
                <div className="space-y-0.5">
                  <span className="text-slate-500 block text-[10px] font-bold">قرارداد و قسط:</span>
                  <span className="font-extrabold text-slate-800">
                    قرارداد {paymentModal.contract.contractNumber || '---'} ({paymentModal.installment.title})
                  </span>
                </div>
                <div className="space-y-0.5">
                  <span className="text-slate-500 block text-[10px] font-bold">سررسید قسط:</span>
                  <span className="font-mono font-bold text-slate-700">
                    {toPersianDigits(paymentModal.installment.dueDate)}
                  </span>
                </div>
                <div className="space-y-0.5 text-left">
                  <span className="text-slate-500 block text-[10px] font-bold">مانده قابل پرداخت:</span>
                  <span className="font-mono font-black text-sm text-emerald-700">
                    {toPersianDigits(addCommas(remainingNeed))} {currencyUnit}
                  </span>
                </div>
              </div>

              {/* Mode Switcher Tabs (2 Tabs Only - Direct Payment Removed) */}
              <div className="p-3 border-b border-slate-100 bg-slate-50/70 shrink-0">
                <div className="grid grid-cols-2 gap-2 p-1 bg-slate-200/80 rounded-2xl text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setPaymentModal({ ...paymentModal, mode: 'previous_payments' })}
                    className={`py-2.5 px-3 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${
                      paymentModal.mode === 'previous_payments'
                        ? 'bg-white text-emerald-800 shadow-sm ring-1 ring-emerald-500/20'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <History className="w-4 h-4 text-emerald-600" />
                    <span>انتخاب از پرداخت‌های قبلی شخص ({toPersianDigits(matchingPayments.length)})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentModal({ ...paymentModal, mode: 'system_form' })}
                    className={`py-2.5 px-3 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${
                      paymentModal.mode === 'system_form'
                        ? 'bg-white text-rose-800 shadow-sm ring-1 ring-rose-500/20'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <ExternalLink className="w-4 h-4 text-rose-600" />
                    <span>ثبت پرداخت جدید با فرم رسمی سیستم</span>
                  </button>
                </div>
              </div>

              {/* Modal Body */}
              <div className="p-5 overflow-y-auto space-y-4">
                {/* TAB 1: PREVIOUS PAYMENTS MULTI-SELECT & ALLOCATION */}
                {paymentModal.mode === 'previous_payments' && (() => {
                  if (matchingPayments.length === 0) {
                    return (
                      <div className="py-10 px-4 text-center space-y-4">
                        <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto border border-amber-200">
                          <History className="w-7 h-7" />
                        </div>
                        <div className="space-y-1">
                          <h4 className="font-black text-slate-800 text-sm">هیچ سند پرداختی قبلی برای این شخص یافت نشد</h4>
                          <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                            تاکنون رسید پرداختی برای موجر «{getPersonName(paymentModal.contract.personId)}» در سیستم ثبت نشده است. برای تسویه این قسط می‌توانید از فرم رسمی پرداخت وجه سیستم استفاده کنید.
                          </p>
                        </div>
                        <div className="flex justify-center pt-2">
                          <button
                            type="button"
                            onClick={() => setPaymentModal({ ...paymentModal, mode: 'system_form' })}
                            className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-xs flex items-center gap-2 shadow-sm shadow-rose-200 transition-all cursor-pointer"
                          >
                            <ExternalLink className="w-4 h-4" />
                            <span>ثبت پرداخت جدید در فرم رسمی سیستم</span>
                          </button>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-3.5">
                      <div className="bg-blue-50/70 border border-blue-200/80 rounded-2xl p-3 text-xs text-blue-900 flex items-start gap-2.5">
                        <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                        <div className="space-y-1 leading-relaxed">
                          <p className="font-bold">راهنمای تخصیص و تسویه هوشمند:</p>
                          <p className="text-[11px] text-blue-800">
                            رسیدهای پرداخت قبلی بر اساس مانده آزاد قابل انتخاب هستند. مبالغی که قبلاً بابت فاکتورها یا سایر تعهدات اجاره مصرف شده‌اند کسر گردیده و مبالغ مازاد برای اقساط بعدی باقی خواهند ماند. در صورت نیاز به ترکیب چند پرداخت، می‌توانید چند رسید را همزمان انتخاب نمایید.
                          </p>
                        </div>
                      </div>

                      <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                        {paymentInfos.map(pi => {
                          const p = pi.payment;
                          const pIdStr = String(p.id);
                          const isSelected = paymentModal.selectedAllocations?.[pIdStr] !== undefined && paymentModal.selectedAllocations[pIdStr] > 0;
                          const allocatedAmt = paymentModal.selectedAllocations?.[pIdStr] || 0;
                          const isExhausted = pi.remainingAvailable <= 0;

                          const pDate = p.displayDate || formatDateDisplay(p.date || p.rawDate);
                          const pNum = p.receiptNumber || p.trackingNumber || p.id;
                          const pSource = p.resourceType === 'cashbox' ? 'صندوق' : (p.resourceType === 'bank' ? 'بانک' : (p.method || 'پرداخت'));

                          const handleTogglePayment = () => {
                            if (isExhausted) return;
                            const next = { ...(paymentModal.selectedAllocations || {}) };
                            if (isSelected) {
                              delete next[pIdStr];
                            } else {
                              const curAllocTotal = Object.entries(next).reduce((s, [_, a]) => s + (Number(a) || 0), 0);
                              const stillNeed = Math.max(0, remainingNeed - curAllocTotal);
                              const take = stillNeed > 0 ? Math.min(stillNeed, pi.remainingAvailable) : pi.remainingAvailable;
                              next[pIdStr] = take;
                            }
                            setPaymentModal({ ...paymentModal, selectedAllocations: next });
                          };

                          const handleCustomAmountChange = (newVal: number) => {
                            const val = Math.max(0, Math.min(newVal, pi.remainingAvailable));
                            const next = { ...(paymentModal.selectedAllocations || {}) };
                            if (val > 0) {
                              next[pIdStr] = val;
                            } else {
                              delete next[pIdStr];
                            }
                            setPaymentModal({ ...paymentModal, selectedAllocations: next });
                          };

                          return (
                            <div
                              key={p.id}
                              className={`p-3.5 rounded-2xl border transition-all ${
                                isExhausted 
                                  ? 'bg-slate-50 border-slate-200 opacity-60' 
                                  : isSelected
                                    ? 'bg-emerald-50/90 border-emerald-400 ring-2 ring-emerald-500/20 shadow-xs'
                                    : 'bg-white border-slate-200 hover:border-emerald-300 hover:bg-slate-50/50'
                              }`}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div 
                                  onClick={handleTogglePayment}
                                  className={`flex items-start gap-3 flex-1 ${isExhausted ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                                >
                                  <div className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 border mt-0.5 transition-all ${
                                    isExhausted
                                      ? 'border-slate-300 bg-slate-200 text-slate-400'
                                      : isSelected 
                                        ? 'border-emerald-600 bg-emerald-600 text-white shadow-xs' 
                                        : 'border-slate-300 bg-white hover:border-emerald-400'
                                  }`}>
                                    {isSelected && <Check className="w-3.5 h-3.5" />}
                                  </div>

                                  <div>
                                    <div className="flex flex-wrap items-center gap-2">
                                      <span className="font-mono font-extrabold text-xs text-slate-900">
                                        رسید شماره {toPersianDigits(pNum)}
                                      </span>
                                      <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md">
                                        {pSource}
                                      </span>
                                      <span className="text-[10px] font-mono text-slate-400">
                                        {toPersianDigits(pDate)}
                                      </span>
                                    </div>

                                    {p.description && (
                                      <p className="text-[11px] text-slate-500 mt-1 line-clamp-1">
                                        {p.description || p.note}
                                      </p>
                                    )}

                                    {/* Financial Breakdown Badges */}
                                    <div className="flex flex-wrap items-center gap-1.5 mt-2 text-[10px]">
                                      <span className="font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                                        مبلغ کل: {toPersianDigits(addCommas(pi.totalAmount))}
                                      </span>
                                      {pi.invoiceAllocated > 0 && (
                                        <span className="font-mono text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                                          مصرف در فاکتور: {toPersianDigits(addCommas(pi.invoiceAllocated))}
                                        </span>
                                      )}
                                      {pi.rentAllocated > 0 && (
                                        <span className="font-mono text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded">
                                          مصرف در سایر تعهدات: {toPersianDigits(addCommas(pi.rentAllocated))}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                <div className="text-left shrink-0">
                                  {isExhausted ? (
                                    <span className="text-[10px] font-bold text-slate-400 bg-slate-200 px-2 py-1 rounded-md block">
                                      تسویه کامل شده
                                    </span>
                                  ) : (
                                    <div>
                                      <span className="text-[10px] text-slate-400 block font-medium">مانده قابل تخصیص:</span>
                                      <span className="font-mono font-black text-xs text-emerald-800 block">
                                        {toPersianDigits(addCommas(pi.remainingAvailable))} {currencyUnit}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Allocated Amount Row for this Payment */}
                              {isSelected && !isExhausted && (
                                <div className="mt-3 pt-2.5 border-t border-emerald-200/70 flex flex-wrap items-center justify-between gap-2 bg-emerald-100/40 -mx-3.5 -mb-3.5 p-3 rounded-b-2xl">
                                  <div className="flex items-center gap-1.5 text-xs text-emerald-900 font-bold">
                                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                                    <span>مبلغ تخصیص‌یافته از این رسید:</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <input
                                      type="number"
                                      value={allocatedAmt || ''}
                                      max={pi.remainingAvailable}
                                      min={1}
                                      onChange={(e) => handleCustomAmountChange(Number(e.target.value) || 0)}
                                      className="w-32 py-1 px-2.5 bg-white border border-emerald-300 rounded-xl text-left font-mono font-bold text-xs text-emerald-950 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-500"
                                    />
                                    <span className="text-[11px] font-bold text-emerald-800">{currencyUnit}</span>
                                    {allocatedAmt < pi.remainingAvailable && (
                                      <span className="text-[10px] text-slate-500 bg-white/80 px-2 py-0.5 rounded-lg border border-slate-200 font-mono">
                                        مازاد محفوظ: {toPersianDigits(addCommas(pi.remainingAvailable - allocatedAmt))}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* Settlement Summary & Reconciliation Box */}
                      <div className="p-4 bg-gradient-to-r from-slate-50 to-emerald-50/50 rounded-2xl border border-slate-200 text-xs space-y-2.5">
                        <div className="flex justify-between items-center text-slate-700">
                          <span className="font-bold">مانده مورد نیاز قسط:</span>
                          <span className="font-mono font-bold text-slate-900">
                            {toPersianDigits(addCommas(remainingNeed))} {currencyUnit}
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-emerald-900">
                          <span className="font-bold">مجموع پرداختی‌های انتخابی:</span>
                          <span className="font-mono font-black text-sm text-emerald-700">
                            {toPersianDigits(addCommas(totalSelectedAllocated))} {currencyUnit}
                          </span>
                        </div>

                        <div className="pt-2 border-t border-slate-200/80">
                          {isFullyCovered ? (
                            <div className="flex items-center gap-2 text-emerald-800 font-extrabold text-[11px] bg-emerald-100/70 p-2 rounded-xl">
                              <CheckCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                              <span>این تعهد اجاره به صورت کامل (۱۰۰٪) تسویه شده و هشدار آن خاموش خواهد شد.</span>
                            </div>
                          ) : totalSelectedAllocated > 0 ? (
                            <div className="flex items-center gap-2 text-amber-800 font-bold text-[11px] bg-amber-50 p-2 rounded-xl border border-amber-200">
                              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                              <span>تسویه بخشی از تعهد انجام می‌شود. مانده پس از تسویه: {toPersianDigits(addCommas(deficit))} {currencyUnit}</span>
                            </div>
                          ) : (
                            <p className="text-[11px] text-slate-500">
                              لطفاً یک یا چند رسید پرداخت بالا را با فعال‌کردن تیک انتخاب نمایید.
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* TAB 2: SYSTEM OFFICIAL FORM */}
                {paymentModal.mode === 'system_form' && (
                  <div className="py-4 space-y-4">
                    <div className="p-4.5 bg-gradient-to-r from-rose-50/90 to-orange-50/50 rounded-2xl border border-rose-200 space-y-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-2xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-sm shadow-rose-200">
                          <ArrowUpRight className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="font-black text-sm text-slate-900">فرم رسمی ثبت رسید پرداخت وجه سیستم</h4>
                          <p className="text-[11px] text-slate-500">
                            خزانه‌داری جامع با پشتیبانی از حساب‌های بانکی، چک، کارت، صندوق و صدور سند اتوماتیک
                          </p>
                        </div>
                      </div>

                      <div className="space-y-1.5 text-xs text-slate-700 pt-1">
                        <div className="flex items-center gap-2">
                          <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>موجر و مانده قسط ({toPersianDigits(addCommas(remainingNeed))} {currencyUnit}) به صورت خودکار بارگذاری می‌شوند.</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>این پرداخت مستقیماً به سند تعهد قسط متصل شده و بلافاصله تسویه را اعمال می‌کند.</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>رسید چاپ و پیامک اطلاع‌رسانی به موجر قابل صدور است.</span>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setSystemPayModal({
                          contract: paymentModal.contract,
                          installment: paymentModal.installment
                        });
                      }}
                      className="w-full py-3.5 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md shadow-rose-600/20 transition-all cursor-pointer min-h-[46px]"
                    >
                      <ExternalLink className="w-4 h-4" />
                      <span>باز کردن فرم رسمی پرداخت وجه سیستم</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-between items-center gap-3 shrink-0">
                <button 
                  type="button"
                  onClick={() => setPaymentModal(null)} 
                  className="px-5 py-2.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl font-bold text-xs transition-colors cursor-pointer"
                >
                  انصراف
                </button>

                {paymentModal.mode === 'previous_payments' ? (
                  <button 
                    type="button"
                    onClick={handleSettleWithPreviousPayment} 
                    disabled={loading || totalSelectedAllocated <= 0}
                    className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-sm shadow-emerald-200 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <CheckCheck className="w-4 h-4" />
                    <span>
                      {loading 
                        ? 'در حال ثبت...' 
                        : totalSelectedAllocated > 0 
                          ? `تایید و تسویه تعهد (${toPersianDigits(addCommas(totalSelectedAllocated))} ${currencyUnit})`
                          : 'انتخاب پرداخت برای تسویه'}
                    </span>
                  </button>
                ) : (
                  <button 
                    type="button"
                    onClick={() => {
                      setSystemPayModal({
                        contract: paymentModal.contract,
                        installment: paymentModal.installment
                      });
                    }}
                    className="px-6 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-xs shadow-sm shadow-rose-200 transition-all flex items-center gap-2 cursor-pointer"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>انتقال به فرم پرداخت رسمی سیستم</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* 3.5 SYSTEM OFFICIAL PAYMENT MODAL OVERLAY */}
      {systemPayModal && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-900/65 backdrop-blur-sm p-2 sm:p-4 overflow-y-auto">
          <div className="w-full max-w-4xl max-h-[94vh] overflow-y-auto my-auto rounded-3xl shadow-2xl">
            <PayReceiptModal
              isOpen={true}
              onClose={() => setSystemPayModal(null)}
              initialPersonId={systemPayModal.contract.personId}
              initialAmount={systemPayModal.installment.amount - (systemPayModal.installment.paidAmount || 0)}
              initialRentContractId={systemPayModal.contract.id}
              initialRentInstallmentId={systemPayModal.installment.id}
              initialNote={`پرداخت و تسویه تعهد اجاره ${systemPayModal.installment.title} - قرارداد ${systemPayModal.contract.contractNumber || ''}`}
              onRentPaymentSuccess={async () => {
                notify(`رسید پرداخت رسمی با موفقیت ثبت و تعهد قسط ${systemPayModal.installment.title} تسویه شد`, 'success');
                setSystemPayModal(null);
                setPaymentModal(null);
                await fetchData();
              }}
              onSuccess={async () => {
                notify(`رسید پرداخت با موفقیت ثبت شد`, 'success');
                setSystemPayModal(null);
                setPaymentModal(null);
                await fetchData();
              }}
              storeSettings={storeSettings}
              persons={personsData}
              accounts={bankAccounts}
              cashboxes={cashboxes}
            />
          </div>
        </div>
      )}

      {/* 4. OFFICIAL LEGAL PRINT & FINANCIAL SHEET MODAL */}
      {printContract && (() => {
        const cToPrint = printContract.contract || printContract;
        const currentTab = printContract.activeTab || 'agreement';

        return (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
              {/* Header */}
              <div className="p-4 border-b border-slate-200 flex flex-wrap justify-between items-center bg-slate-50 gap-3">
                <div className="flex items-center gap-3">
                  <Printer className="w-5 h-5 text-indigo-600" />
                  <h3 className="font-extrabold text-slate-800 text-sm sm:text-base">
                    پیش‌نمایش و چاپ قرارداد اجاره ({cToPrint.contractNumber || 'بدون شماره'})
                  </h3>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  >
                    <Printer className="w-4 h-4" />
                    <span>چاپ این برگه</span>
                  </button>
                  <button 
                    type="button"
                    onClick={() => setPrintContract(null)} 
                    className="p-2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* View Switcher Bar */}
              <div className="border-b border-slate-200 px-6 bg-white flex gap-6 text-xs font-bold print:hidden">
                <button
                  type="button"
                  onClick={() => setPrintContract({ contract: cToPrint, activeTab: 'agreement' })}
                  className={`py-3 flex items-center gap-1.5 border-b-2 transition-all cursor-pointer ${
                    currentTab === 'agreement'
                      ? 'border-indigo-600 text-indigo-600'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <ScrollText className="w-4 h-4" />
                  <span>متن رسمی و قانونی قرارداد اجاره</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPrintContract({ contract: cToPrint, activeTab: 'schedule' })}
                  className={`py-3 flex items-center gap-1.5 border-b-2 transition-all cursor-pointer ${
                    currentTab === 'schedule'
                      ? 'border-indigo-600 text-indigo-600'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Calendar className="w-4 h-4" />
                  <span>کاربرگ مالی و وضعیت اقساط</span>
                </button>

                {(cToPrint.amendments?.length > 0 || cToPrint.terminationInfo || cToPrint.completionInfo) && (
                  <button
                    type="button"
                    onClick={() => setPrintContract({ contract: cToPrint, activeTab: 'amendments' })}
                    className={`py-3 flex items-center gap-1.5 border-b-2 transition-all cursor-pointer ${
                      currentTab === 'amendments'
                        ? 'border-indigo-600 text-indigo-600'
                        : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <FileSignature className="w-4 h-4" />
                    <span>برگه الحاقیه‌ها و صورتجلسات</span>
                  </button>
                )}
              </div>

              {/* Printable Modal Body */}
              <div className="p-8 overflow-y-auto space-y-6 text-slate-900 text-xs sm:text-sm print:p-0">
                {/* TAB 1: OFFICIAL TENANCY AGREEMENT */}
                {currentTab === 'agreement' && (
                  <div className="space-y-5 leading-relaxed font-sans">
                    {/* Official Document Header */}
                    <div className="text-center border-b-2 border-slate-800 pb-4 space-y-1">
                      <div className="font-extrabold text-xs text-slate-600">بسمه تعالی</div>
                      <h2 className="text-xl font-black text-slate-900 tracking-wide">
                        قرارداد اجاره اماکن {getUsageLabel(cToPrint.propertyUsage)}
                      </h2>
                      <p className="text-[11px] text-slate-600">
                        (تنظیم‌شده بر اساس ماده ۱۰ قانون مدنی و قانون روابط موجر و مستاجر مصوب ۱۳۷۶)
                      </p>
                      <div className="flex justify-between items-center pt-3 text-xs font-mono font-bold text-slate-700">
                        <span>شماره قرارداد: {cToPrint.contractNumber || '---'}</span>
                        <span>تاریخ انعقاد: {formatDateDisplay(cToPrint.startDate, storeSettings?.calendarType)}</span>
                      </div>
                    </div>

                    {/* Article 1: Parties */}
                    <div className="space-y-1.5">
                      <h3 className="font-black text-slate-900 text-sm underline decoration-slate-300 underline-offset-4">
                        ماده ۱ - طرفین قرارداد:
                      </h3>
                      <p className="text-justify text-slate-800">
                        <strong>۱-۱- موجر:</strong> جناب آقای / سرکار خانم <strong>{getPersonName(cToPrint.personId)}</strong> به شماره ملی / شناسه <strong>{getPersonDetails(cToPrint.personId)?.personCode || '---'}</strong> و شماره تماس <strong>{getPersonDetails(cToPrint.personId)?.mobile || getPersonDetails(cToPrint.personId)?.phone || '---'}</strong>.
                      </p>
                      <p className="text-justify text-slate-800">
                        <strong>۲-۱- مستاجر:</strong> مجموعه / فروشگاه <strong>{cToPrint.lesseeName || storeSettings?.name || storeSettings?.storeName || 'مجموعه تجاری'}</strong> به مدیریت / نمایندگی <strong>{storeSettings?.ownerName || 'مدیریت فروشگاه'}</strong> و شماره تماس <strong>{storeSettings?.mobile || storeSettings?.phone || '---'}</strong>.
                      </p>
                    </div>

                    {/* Article 2: Subject */}
                    <div className="space-y-1.5">
                      <h3 className="font-black text-slate-900 text-sm underline decoration-slate-300 underline-offset-4">
                        ماده ۲ - موضوع و مشخصات مورد اجاره:
                      </h3>
                      <p className="text-justify text-slate-800">
                        منافع یک باب <strong>{getUsageLabel(cToPrint.propertyUsage)}</strong> به مساحت تقریبی <strong>{cToPrint.propertyArea || '---'} متر مربع</strong>، دارای پلاک ثبتی <strong>{cToPrint.propertyRegistryCode || '---'}</strong> واقع در نشانی: <strong>{cToPrint.propertyAddress || cToPrint.description || 'نشانی مندرج در پرونده'}</strong> به همراه انشعابات آب، برق، گاز و تلفن جهت انتفاع مستاجر.
                      </p>
                    </div>

                    {/* Article 3: Duration */}
                    <div className="space-y-1.5">
                      <h3 className="font-black text-slate-900 text-sm underline decoration-slate-300 underline-offset-4">
                        ماده ۳ - مدت اجاره:
                      </h3>
                      <p className="text-justify text-slate-800">
                        مدت این قرارداد از تاریخ <strong>{formatDateDisplay(cToPrint.startDate, storeSettings?.calendarType)}</strong> لغایت <strong>{cToPrint.endDate ? formatDateDisplay(cToPrint.endDate, storeSettings?.calendarType) : 'نامحدود'}</strong> به مدت کامل شمسی می‌باشد.
                      </p>
                    </div>

                    {/* Article 4: Financial Terms */}
                    <div className="space-y-1.5">
                      <h3 className="font-black text-slate-900 text-sm underline decoration-slate-300 underline-offset-4">
                        ماده ۴ - مبلغ اجاره‌بها و ودیعه (قرض‌الحسنه):
                      </h3>
                      <p className="text-justify text-slate-800">
                        <strong>۱-۴- قرض‌الحسنه (ودیعه):</strong> مبلغ <strong>{Number(cToPrint.depositAmount || 0).toLocaleString()} {currencyUnit}</strong> (معادل <strong>{numberToWords(cToPrint.depositAmount || 0)} {currencyUnit}</strong>) که از سوی مستاجر به عنوان ودیعه نزد موجر قرار گرفته و در پایان مدت اجاره و پس از تخلیه و تسویه حساب کامل، عیناً مسترد می‌گردد.
                      </p>
                      <p className="text-justify text-slate-800">
                        <strong>۲-۴- اجاره‌بها:</strong> بابت هر دوره مبلغ <strong>{Number(cToPrint.monthlyAmount).toLocaleString()} {currencyUnit}</strong> (معادل <strong>{numberToWords(cToPrint.monthlyAmount)} {currencyUnit}</strong>) که مستاجر متعهد است در روز <strong>{toPersianDigits(cToPrint.paymentDay)}</strong> هر دوره پرداخت و رسید دریافت نماید.
                      </p>
                    </div>

                    {/* Article 5: Terms & Obligations */}
                    <div className="space-y-1.5">
                      <h3 className="font-black text-slate-900 text-sm underline decoration-slate-300 underline-offset-4">
                        ماده ۵ - شروط و تعهدات طرفین:
                      </h3>
                      <ul className="list-disc list-inside space-y-1 text-slate-800 text-justify">
                        <li>مستاجر حق واگذاری مورد اجاره را کلاً یا جزئاً به غیر ندارد مگر با موافقت کتبی موجر.</li>
                        <li>پرداخت کلیه هزینه‌های مصرفی انشعابات (آب، برق، گاز، تلفن) و شارژ ساختمان بر عهده مستاجر است.</li>
                        <li>مستاجر مکلف به حفظ عین مستاجره بوده و هرگونه تغییر فیزیکی اساسی منوط به اجازه موجر می‌باشد.</li>
                        <li>مستاجر مکلف است در انقضای مدت، مورد اجاره را صحیح و سالم تخلیه و تحویل موجر نماید.</li>
                      </ul>
                    </div>

                    {/* Article 6: Termination Conditions */}
                    <div className="space-y-1.5">
                      <h3 className="font-black text-slate-900 text-sm underline decoration-slate-300 underline-offset-4">
                        ماده ۶ - شرایط فسخ و نسخ قرارداد:
                      </h3>
                      <p className="text-justify text-slate-800">
                        در صورت عدم پرداخت اجاره‌بها برای بیش از دو دوره متوالی یا تخلف از شروط این قرارداد، موجر حق فسخ خواهد داشت. این قرارداد در دو نسخه متحدالشکل تنظیم و به امضای طرفین رسید.
                      </p>
                    </div>

                    {/* Signatures Block */}
                    <div className="pt-8 grid grid-cols-2 gap-8 border-t border-slate-300 text-center">
                      <div className="p-4 border border-slate-300 rounded-xl space-y-12">
                        <span className="font-bold block">امضا و اثر انگشت موجر:</span>
                        <div className="text-[11px] text-slate-500">{getPersonName(cToPrint.personId)}</div>
                      </div>

                      <div className="p-4 border border-slate-300 rounded-xl space-y-12">
                        <span className="font-bold block">امضا و اثر انگشت مستاجر:</span>
                        <div className="text-[11px] text-slate-500">{cToPrint.lesseeName || storeSettings?.name || 'مدیریت فروشگاه'}</div>
                      </div>

                      <div className="p-4 border border-slate-300 rounded-xl space-y-12">
                        <span className="font-bold block">امضا و مشخصات شاهد اول:</span>
                        <div className="text-[11px] text-slate-400">نام و کدملی: ..........................</div>
                      </div>

                      <div className="p-4 border border-slate-300 rounded-xl space-y-12">
                        <span className="font-bold block">امضا و مشخصات شاهد دوم:</span>
                        <div className="text-[11px] text-slate-400">نام و کدملی: ..........................</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 2: FINANCIAL SCHEDULE TABLE */}
                {currentTab === 'schedule' && (
                  <div className="space-y-6">
                    <div className="text-center border-b border-slate-300 pb-4">
                      <h2 className="text-lg font-black text-slate-900">جدول زمان‌بندی، اسناد تعهد و صورت وضعیت مالی اقساط اجاره</h2>
                      <div className="text-xs text-slate-600 mt-2 flex justify-center gap-6">
                        <span>شماره قرارداد: <strong className="font-mono">{cToPrint.contractNumber}</strong></span>
                        <span>موجر: <strong>{getPersonName(cToPrint.personId)}</strong></span>
                        <span>تاریخ گزارش: <strong>{new Date().toLocaleDateString('fa-IR')}</strong></span>
                      </div>
                    </div>

                    <table className="w-full text-right text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-100 border border-slate-300 font-bold">
                          <th className="p-2.5 border border-slate-300 text-center">ردیف</th>
                          <th className="p-2.5 border border-slate-300">عنوان دوره / قسط</th>
                          <th className="p-2.5 border border-slate-300 text-center">موعد سررسید</th>
                          <th className="p-2.5 border border-slate-300 text-center">مبلغ ({currencyUnit})</th>
                          <th className="p-2.5 border border-slate-300 text-center">وضعیت تعهد</th>
                          <th className="p-2.5 border border-slate-300 text-center">مبلغ پرداختی</th>
                          <th className="p-2.5 border border-slate-300 text-center">وضعیت تسویه</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(cToPrint.schedule || []).map((inst: RentInstallment, i: number) => (
                          <tr key={i} className="border border-slate-300">
                            <td className="p-2 border border-slate-300 text-center font-bold">{toPersianDigits(i + 1)}</td>
                            <td className="p-2 border border-slate-300 font-bold">{inst.title}</td>
                            <td className="p-2 border border-slate-300 text-center font-mono">{toPersianDigits(inst.dueDate)}</td>
                            <td className="p-2 border border-slate-300 text-center font-mono font-bold">{Number(inst.amount).toLocaleString()}</td>
                            <td className="p-2 border border-slate-300 text-center">
                              {inst.commitmentStatus === 'committed' ? 'سند تعهد صادر شده' : inst.commitmentStatus === 'cancelled' ? 'لغو شده' : 'صادر نشده'}
                            </td>
                            <td className="p-2 border border-slate-300 text-center font-mono">{Number(inst.paidAmount || 0).toLocaleString()}</td>
                            <td className="p-2 border border-slate-300 text-center font-bold">
                              {inst.paymentStatus === 'paid' ? 'تسویه کامل' : (inst.paidAmount || 0) > 0 ? 'تسویه جزئی' : 'پرداخت نشده'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* TAB 3: AMENDMENTS & MINUTES */}
                {currentTab === 'amendments' && (
                  <div className="space-y-6">
                    <div className="text-center border-b border-slate-300 pb-4">
                      <h2 className="text-lg font-black text-slate-900">سوابق حقوقی، صورتجلسات و الحاقیه‌های قرارداد اجاره</h2>
                      <p className="text-xs text-slate-600 mt-1">شماره قرارداد: {cToPrint.contractNumber}</p>
                    </div>

                    {cToPrint.terminationInfo && (
                      <div className="p-4 border border-rose-300 bg-rose-50 rounded-xl space-y-2">
                        <h3 className="font-bold text-rose-950 text-sm">برگه صورتجلسه فسخ قرارداد</h3>
                        <p className="text-xs">تاریخ فسخ: {formatDateDisplay(cToPrint.terminationInfo.date, storeSettings?.calendarType)} • علت: {cToPrint.terminationInfo.reason}</p>
                        <p className="text-xs">{cToPrint.terminationInfo.notes}</p>
                      </div>
                    )}

                    {cToPrint.amendments && cToPrint.amendments.length > 0 && (
                      <div className="space-y-3">
                        {cToPrint.amendments.map((amd: any, idx: number) => (
                          <div key={idx} className="p-4 border border-slate-300 rounded-xl space-y-1">
                            <h4 className="font-bold text-slate-900">{amd.title}</h4>
                            <p className="text-xs text-slate-600">تاریخ: {formatDateDisplay(amd.date, storeSettings?.calendarType)}</p>
                            <p className="text-xs text-slate-800">{amd.description}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* 5. TERMINATE CONTRACT MODAL */}
      {terminateModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col">
            <div className="p-5 bg-rose-600 text-white flex justify-between items-center">
              <h3 className="font-extrabold text-lg flex items-center gap-2">
                <FileX2 className="w-5 h-5" /> فسخ رسمی قرارداد اجاره
              </h3>
              <button 
                type="button"
                onClick={() => setTerminateModal(null)} 
                className="p-2 bg-rose-700/50 hover:bg-rose-700 rounded-xl transition-colors text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-sm">
              <div className="bg-rose-50 border border-rose-200 p-3.5 rounded-xl text-rose-900 text-xs leading-relaxed">
                ⚠️ با ثبت فسخ، وضعیت قرارداد به «فسخ‌شده» تغییر می‌یابد و هشدارهای مالی آن متوقف خواهد شد.
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">تاریخ فسخ / صورتجلسه</label>
                <DatePicker
                  value={terminateModal.date}
                  onChange={(d: any) => setTerminateModal({ ...terminateModal, date: d })}
                  calendar={storeSettings?.calendarType === 'gregorian' ? gregorian : persian}
                  locale={storeSettings?.calendarType === 'gregorian' ? gregorian_en : persian_fa}
                  calendarPosition="bottom-right"
                  inputClass="w-full p-2.5 bg-white border border-slate-200 rounded-xl focus:border-rose-500 outline-none text-center font-bold text-slate-900 cursor-pointer"
                  containerClassName="w-full"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">علت فسخ قرارداد</label>
                <select
                  value={terminateModal.reason}
                  onChange={(e) => setTerminateModal({ ...terminateModal, reason: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl p-2.5 text-xs font-bold outline-none cursor-pointer"
                >
                  <option value="mutual">توافق دوطرفه موجر و مستاجر</option>
                  <option value="non_payment">عدم پرداخت به موقع اجاره‌بها و معوقات</option>
                  <option value="early_vacation">تخلیه زودهنگام توسط مستاجر</option>
                  <option value="breach_of_terms">تخلف از شروط و تعهدات قرارداد</option>
                  <option value="other">سایر موارد و دلایل اضطراری</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">مبلغ خسارت/جریمه توافقی فسخ ({currencyUnit})</label>
                <CurrencyInput
                  value={terminateModal.penaltyAmount}
                  onChange={(e: any) => setTerminateModal({ ...terminateModal, penaltyAmount: e.target.value })}
                  storeSettings={storeSettings}
                  hideWords={true}
                  className="w-full border border-slate-200 rounded-xl p-2.5 font-mono text-left"
                  placeholder="0"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">تعیین تکلیف استرداد ودیعه (رهن)</label>
                <select
                  value={terminateModal.depositStatus}
                  onChange={(e) => setTerminateModal({ ...terminateModal, depositStatus: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl p-2.5 text-xs font-bold outline-none cursor-pointer"
                >
                  <option value="pending">در انتظار تسویه و عودت ودیعه</option>
                  <option value="refunded">ودیعه کاملاً مسترد گردید</option>
                  <option value="settled_with_damages">تهاتر با بدهی و خسارات</option>
                </select>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="cancelFuture"
                  checked={terminateModal.cancelFutureInstallments}
                  onChange={(e) => setTerminateModal({ ...terminateModal, cancelFutureInstallments: e.target.checked })}
                  className="w-4 h-4 text-rose-600 rounded cursor-pointer"
                />
                <label htmlFor="cancelFuture" className="text-xs font-bold text-slate-800 cursor-pointer">
                  لغو خودکار تمام اقساط و تعهدات صادرنشده آینده پس از تاریخ فسخ
                </label>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">شرح و صورتجلسه فسخ</label>
                <textarea
                  value={terminateModal.notes}
                  onChange={(e) => setTerminateModal({ ...terminateModal, notes: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl p-2.5 text-xs outline-none h-20 resize-none"
                  placeholder="توضیحات و توافقات صورتجلسه فسخ..."
                />
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setTerminateModal(null)}
                className="px-5 py-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl font-bold text-xs cursor-pointer"
              >
                انصراف
              </button>
              <button
                type="button"
                onClick={handleTerminateSubmit}
                disabled={loading}
                className="px-6 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-xs shadow-sm cursor-pointer disabled:opacity-50"
              >
                {loading ? 'در حال ثبت...' : 'تایید و ثبت فسخ قرارداد'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. COMPLETE CONTRACT MODAL */}
      {completeModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col">
            <div className="p-5 bg-emerald-600 text-white flex justify-between items-center">
              <h3 className="font-extrabold text-lg flex items-center gap-2">
                <CheckCircle className="w-5 h-5" /> ثبت خاتمه قرارداد و تحویل ملک
              </h3>
              <button 
                type="button"
                onClick={() => setCompleteModal(null)} 
                className="p-2 bg-emerald-700/50 hover:bg-emerald-700 rounded-xl transition-colors text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-sm">
              <div>
                <label className="block font-bold text-slate-700 mb-1">تاریخ پایان و تحویل ملک</label>
                <DatePicker
                  value={completeModal.date}
                  onChange={(d: any) => setCompleteModal({ ...completeModal, date: d })}
                  calendar={storeSettings?.calendarType === 'gregorian' ? gregorian : persian}
                  locale={storeSettings?.calendarType === 'gregorian' ? gregorian_en : persian_fa}
                  calendarPosition="bottom-right"
                  inputClass="w-full p-2.5 bg-white border border-slate-200 rounded-xl focus:border-emerald-500 outline-none text-center font-bold text-slate-900 cursor-pointer"
                  containerClassName="w-full"
                />
              </div>

              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
                <span className="font-bold text-xs text-slate-800 block">چک‌لیست تحویل و تخلیه:</span>
                <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={completeModal.vacated}
                    onChange={(e) => setCompleteModal({ ...completeModal, vacated: e.target.checked })}
                    className="w-4 h-4 text-emerald-600 rounded"
                  />
                  <span>ملک کاملاً تخلیه و کلیدها تحویل شد.</span>
                </label>
                <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={completeModal.utilitiesSettled}
                    onChange={(e) => setCompleteModal({ ...completeModal, utilitiesSettled: e.target.checked })}
                    className="w-4 h-4 text-emerald-600 rounded"
                  />
                  <span>قبوض مصرفی (آب، برق، گاز، تلفن) و شارژ تسویه شد.</span>
                </label>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">مبلغ ودیعه مسترد شده ({currencyUnit})</label>
                <CurrencyInput
                  value={completeModal.depositRefundAmount}
                  onChange={(e: any) => setCompleteModal({ ...completeModal, depositRefundAmount: e.target.value })}
                  storeSettings={storeSettings}
                  hideWords={true}
                  className="w-full border border-slate-200 rounded-xl p-2.5 font-mono text-left"
                  placeholder="0"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">شرح تحویل و تسویه نهایی</label>
                <textarea
                  value={completeModal.notes}
                  onChange={(e) => setCompleteModal({ ...completeModal, notes: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl p-2.5 text-xs outline-none h-20 resize-none"
                  placeholder="توضیحات صورتجلسه تحویل..."
                />
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setCompleteModal(null)}
                className="px-5 py-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl font-bold text-xs cursor-pointer"
              >
                انصراف
              </button>
              <button
                type="button"
                onClick={handleCompleteSubmit}
                disabled={loading}
                className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-sm cursor-pointer disabled:opacity-50"
              >
                {loading ? 'در حال ثبت...' : 'ثبت خاتمه و تحویل قرارداد'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. AMENDMENT / RENT CHANGE MODAL */}
      {amendmentModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col">
            <div className="p-5 bg-indigo-600 text-white flex justify-between items-center">
              <h3 className="font-extrabold text-lg flex items-center gap-2">
                <FileSignature className="w-5 h-5" /> ثبت الحاقیه و تغییر شرایط قرارداد
              </h3>
              <button 
                type="button"
                onClick={() => setAmendmentModal(null)} 
                className="p-2 bg-indigo-700/50 hover:bg-indigo-700 rounded-xl transition-colors text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-sm">
              <div>
                <label className="block font-bold text-slate-700 mb-1">نوع الحاقیه</label>
                <select
                  value={amendmentModal.type}
                  onChange={(e: any) => setAmendmentModal({ ...amendmentModal, type: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl p-2.5 text-xs font-bold outline-none cursor-pointer"
                >
                  <option value="rent_amount">تغییر مبلغ اجاره‌بها (افزایش / کاهش)</option>
                  <option value="extend_term">تمدید مدت زمان قرارداد</option>
                  <option value="terms_change">تغییر شروط و توافقات قرارداد</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">تاریخ ثبت الحاقیه</label>
                <DatePicker
                  value={amendmentModal.date}
                  onChange={(d: any) => setAmendmentModal({ ...amendmentModal, date: d })}
                  calendar={storeSettings?.calendarType === 'gregorian' ? gregorian : persian}
                  locale={storeSettings?.calendarType === 'gregorian' ? gregorian_en : persian_fa}
                  calendarPosition="bottom-right"
                  inputClass="w-full p-2.5 bg-white border border-slate-200 rounded-xl focus:border-indigo-500 outline-none text-center font-bold text-slate-900 cursor-pointer"
                  containerClassName="w-full"
                />
              </div>

              {amendmentModal.type === 'rent_amount' && (
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    مبلغ جدید اجاره‌بها هر دوره ({currencyUnit})
                  </label>
                  <CurrencyInput
                    value={amendmentModal.newMonthlyAmount}
                    onChange={(e: any) => setAmendmentModal({ ...amendmentModal, newMonthlyAmount: e.target.value })}
                    storeSettings={storeSettings}
                    hideWords={true}
                    className="w-full border border-slate-200 rounded-xl p-2.5 font-mono font-bold text-left"
                    placeholder="0"
                  />
                  <span className="text-[11px] text-slate-500 mt-1 block">
                    مبلغ فعلی: {Number(amendmentModal.contract.monthlyAmount || 0).toLocaleString()} {currencyUnit}
                  </span>
                </div>
              )}

              {amendmentModal.type === 'extend_term' && (
                <div>
                  <label className="block font-bold text-slate-700 mb-1">تاریخ پایان جدید قرارداد</label>
                  <DatePicker
                    value={amendmentModal.newEndDate}
                    onChange={(d: any) => setAmendmentModal({ ...amendmentModal, newEndDate: d })}
                    calendar={storeSettings?.calendarType === 'gregorian' ? gregorian : persian}
                    locale={storeSettings?.calendarType === 'gregorian' ? gregorian_en : persian_fa}
                    calendarPosition="bottom-right"
                    inputClass="w-full p-2.5 bg-white border border-slate-200 rounded-xl focus:border-indigo-500 outline-none text-center font-bold text-slate-900 cursor-pointer"
                    containerClassName="w-full"
                  />
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-700 mb-1">متن توافقات و توضیحات الحاقیه</label>
                <textarea
                  value={amendmentModal.description}
                  onChange={(e) => setAmendmentModal({ ...amendmentModal, description: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl p-2.5 text-xs outline-none h-20 resize-none"
                  placeholder="مثال: بنا به توافق طرفین اجاره‌بها از تاریخ ... به مبلغ ... تغییر یافت."
                />
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setAmendmentModal(null)}
                className="px-5 py-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl font-bold text-xs cursor-pointer"
              >
                انصراف
              </button>
              <button
                type="button"
                onClick={handleAmendmentSubmit}
                disabled={loading}
                className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs shadow-sm cursor-pointer disabled:opacity-50"
              >
                {loading ? 'در حال ثبت...' : 'ثبت الحاقیه و بروزرسانی اقساط'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 8. QUICK STATUS CHANGE MODAL */}
      {statusChangeModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden flex flex-col">
            <div className="p-4 bg-slate-800 text-white flex justify-between items-center">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4" /> تغییر وضعیت قرارداد
              </h3>
              <button
                type="button"
                onClick={() => setStatusChangeModal(null)}
                className="p-1 text-slate-300 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-3 text-xs">
              <label className="block font-bold text-slate-700">وضعیت جدید را انتخاب کنید:</label>
              <div className="space-y-2">
                {[
                  { key: 'active', label: 'فعال (محاسبه و هشدار خودکار اقساط)' },
                  { key: 'suspended', label: 'معلق / غیرفعال موقت (توقف هشدارها)' },
                  { key: 'draft', label: 'پیش‌نویس' },
                  { key: 'completed', label: 'خاتمه‌یافته' },
                  { key: 'terminated', label: 'فسخ‌شده' }
                ].map(st => (
                  <button
                    key={st.key}
                    type="button"
                    onClick={() => handleQuickStatusChange(statusChangeModal.contract, st.key)}
                    className={`w-full p-2.5 rounded-xl border text-right font-bold transition-all cursor-pointer ${
                      statusChangeModal.newStatus === st.key
                        ? 'bg-indigo-50 border-indigo-300 text-indigo-900'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {st.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. DELETE CONFIRMATION MODAL */}
      {deleteId && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden">
            <div className="p-6 text-center space-y-4">
              <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto">
                <AlertCircle className="w-8 h-8" />
              </div>
              <h3 className="font-extrabold text-slate-800 text-lg">حذف قرارداد اجاره</h3>
              <p className="text-slate-500 text-sm leading-relaxed">
                آیا از حذف این قرارداد اطمینان دارید؟ جدول اقساط و سوابق آن حذف خواهد شد.
              </p>
            </div>
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-3">
              <button 
                type="button"
                onClick={() => setDeleteId(null)} 
                className="flex-1 py-2.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl font-bold transition-colors cursor-pointer"
              >
                انصراف
              </button>
              <button 
                type="button"
                onClick={handleDelete} 
                disabled={loading}
                className="flex-1 py-2.5 bg-rose-600 text-white rounded-xl font-bold shadow-sm hover:bg-rose-700 transition-all cursor-pointer disabled:opacity-50"
              >
                {loading ? 'در حال حذف...' : 'حذف قرارداد'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
