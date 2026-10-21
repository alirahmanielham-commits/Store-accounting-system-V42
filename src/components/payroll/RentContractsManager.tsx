import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, Edit2, Trash2, FileText, Check, X, AlertCircle, CheckCircle, 
  Eye, Calendar, ArrowRight, CreditCard, Clock, 
  AlertTriangle, ShieldCheck, Printer, RefreshCw, 
  Wallet, Building, ArrowLeft, Info, HelpCircle,
  History, ExternalLink, CheckCheck, Layers, ArrowUpRight
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
import { convertToGregorian, formatDateDisplay, toPersianDigits, addCommas } from '../../utils/format';
import CurrencyInput from '../common/CurrencyInput';
import CustomDatePicker from '../ui/CustomDatePicker';
import DateObjectModule from 'react-date-object';
import persian from 'react-date-object/calendars/persian';
import persian_fa from 'react-date-object/locales/persian_fa';
import gregorian from 'react-date-object/calendars/gregorian';
import gregorian_en from 'react-date-object/locales/gregorian_en';

const DateObject = (DateObjectModule as any).default || DateObjectModule;

export interface RentInstallment {
  id: string;
  periodIndex: number;
  title: string;
  dueDate: string; // '1403/01/25'
  dueDateTimestamp: number;
  amount: number;
  commitmentStatus: 'uncommitted' | 'committed';
  commitmentDocId?: string | null;
  commitmentDate?: string | null;
  paymentStatus: 'unpaid' | 'paid';
  paidAmount: number;
  paymentDocId?: string | null;
  paidDate?: string | null;
  paymentMethod?: 'cashbox' | 'bank' | null;
  paymentSourceId?: string | null;
  paymentRefNumber?: string | null;
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
      amount: Number(amount) || 0,
      commitmentStatus: existing?.commitmentStatus || 'uncommitted',
      commitmentDocId: existing?.commitmentDocId || null,
      commitmentDate: existing?.commitmentDate || null,
      paymentStatus: existing?.paymentStatus || 'unpaid',
      paidAmount: existing?.paidAmount || 0,
      paymentDocId: existing?.paymentDocId || null,
      paidDate: existing?.paidDate || null,
      paymentMethod: existing?.paymentMethod || null,
      paymentSourceId: existing?.paymentSourceId || null,
      paymentRefNumber: existing?.paymentRefNumber || null
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
  const [detailActiveTab, setDetailActiveTab] = useState<'schedule' | 'accounting' | 'details'>('schedule');

  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [printContract, setPrintContract] = useState<any | null>(null);
  const [systemPayModal, setSystemPayModal] = useState<{ contract: any; installment: RentInstallment } | null>(null);

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
    mode: 'previous_payments' | 'system_form' | 'direct_payment';
    paymentMethod: 'cashbox' | 'bank';
    sourceId: string;
    amount: number;
    date: any;
    refNumber: string;
    description: string;
    selectedPreviousPaymentId?: string | null;
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
    status: 'draft' | 'active' | 'expired';
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
    status: 'active'
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

      if (selectedContractDetail) {
        const refreshed = enrichedContracts.find((c: any) => String(c.id) === String(selectedContractDetail.id));
        if (refreshed) setSelectedContractDetail(refreshed);
      }
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
      status: 'active'
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
      status: c.status || 'draft'
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
      notify('خطا در ثبت قرارداد اجاره', 'error');
    } finally {
      setLoading(false);
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
    const defaultCashbox = cashboxes.length > 0 ? cashboxes[0].id : '';
    const defaultBank = bankAccounts.length > 0 ? bankAccounts[0].id : '';
    const initialMethod: 'cashbox' | 'bank' = defaultBank ? 'bank' : 'cashbox';
    const initialSource = initialMethod === 'bank' ? defaultBank : defaultCashbox;
    const remainingAmount = installment.amount - (installment.paidAmount || 0);

    const matchingPayments = (allTransactions || []).filter(
      (t: any) =>
        (t.type === 'pay' || t.type === 'payment') &&
        String(t.personId) === String(contract.personId)
    );

    const initialMode: 'previous_payments' | 'system_form' | 'direct_payment' = 
      matchingPayments.length > 0 ? 'previous_payments' : 'direct_payment';

    setPaymentModal({
      contract,
      installment,
      mode: initialMode,
      paymentMethod: initialMethod,
      sourceId: initialSource,
      amount: remainingAmount > 0 ? remainingAmount : installment.amount,
      date: new Date(),
      refNumber: '',
      description: `پرداخت و تسویه ${installment.title} به موجر: ${getPersonName(contract.personId)}`,
      selectedPreviousPaymentId: matchingPayments.length > 0 ? String(matchingPayments[0].id) : null
    });
  };

  // Settle with a previously registered payment made to this person
  const handleSettleWithPreviousPayment = async () => {
    if (!paymentModal || !paymentModal.selectedPreviousPaymentId) {
      notify('لطفاً یکی از پرداخت‌های قبلی را انتخاب کنید', 'error');
      return;
    }
    const { contract, installment, selectedPreviousPaymentId } = paymentModal;
    const selectedPayment = allTransactions.find(t => String(t.id) === String(selectedPreviousPaymentId));
    if (!selectedPayment) {
      notify('سند پرداخت انتخاب شده یافت نشد', 'error');
      return;
    }

    try {
      setLoading(true);
      const payAmount = Math.min(Number(selectedPayment.amount) || installment.amount, installment.amount);
      await settleRentInstallmentWithPayment(
        contract.id,
        installment.id,
        {
          paymentDocId: selectedPayment.receiptNumber || String(selectedPayment.id),
          amount: payAmount,
          paidDate: selectedPayment.date || selectedPayment.rawDate || new Date().toISOString(),
          paymentMethod: selectedPayment.resourceType || selectedPayment.method || 'bank',
          paymentSourceId: selectedPayment.resourceId || selectedPayment.accountId || selectedPayment.cashboxId || null,
          paymentRefNumber: selectedPayment.trackingNumber || selectedPayment.receiptNumber || null
        }
      );

      notify(`قسط ${installment.title} با موفقیت با رسید پرداخت شماره ${selectedPayment.receiptNumber || selectedPayment.id} تسویه گردید`, 'success');
      setPaymentModal(null);
      await fetchData();
    } catch (err) {
      console.error(err);
      notify('خطا در تسویه تعهد با پرداخت قبلی', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Confirm Payment & Settle Commitment
  const handleConfirmPayment = async () => {
    if (!paymentModal) return;
    const { contract, installment, paymentMethod, sourceId, amount, date, refNumber, description } = paymentModal;

    if (!sourceId) {
      notify('لطفاً صندوق یا حساب بانکی پرداخت را انتخاب کنید', 'error');
      return;
    }
    if (!amount || amount <= 0) {
      notify('مبلغ پرداختی نامعتبر است', 'error');
      return;
    }

    try {
      setLoading(true);
      const payableAcc = await ensurePayableAccount();

      let sourceLedgerAccId = '';
      if (paymentMethod === 'cashbox') {
        const cb = cashboxes.find(c => String(c.id) === String(sourceId));
        sourceLedgerAccId = cb?.ledgerAccountId || 
          ledgerAccounts.find(a => a.code === '1001' || a.title?.includes('صندوق'))?.id || payableAcc.id;
      } else {
        const bank = bankAccounts.find(b => String(b.id) === String(sourceId));
        sourceLedgerAccId = bank?.ledgerAccountId || 
          ledgerAccounts.find(a => a.code === '1002' || a.title?.includes('بانک'))?.id || payableAcc.id;
      }

      const payDateIso = convertToGregorian(date);

      // 1. Issue Payment Accounting Document
      const paymentDoc = {
        date: payDateIso,
        description: description || `پرداخت و تسویه اجاره ${installment.title}`,
        status: 'approved',
        sourceType: 'rent_payment',
        sourceId: `${contract.id}_${installment.id}`,
        items: [
          {
            ledgerAccountId: payableAcc.id,
            detailedAccountId: contract.personId,
            debit: Number(amount),
            credit: 0,
            description: `تسویه بدهی اجاره - ${installment.title}`
          },
          {
            ledgerAccountId: sourceLedgerAccId,
            detailedAccountId: sourceId,
            debit: 0,
            credit: Number(amount),
            description: `پرداخت از ${paymentMethod === 'cashbox' ? 'صندوق' : 'بانک'} بابت ${installment.title}`
          }
        ]
      };

      const createdPaymentDoc = await addAccountingDocument(paymentDoc);

      // 2. Add Financial Transaction
      try {
        await addTransaction({
          type: 'payment',
          personId: contract.personId,
          amount: Number(amount),
          date: payDateIso,
          cashboxId: paymentMethod === 'cashbox' ? sourceId : undefined,
          accountId: paymentMethod === 'bank' ? sourceId : undefined,
          trackingNumber: refNumber || undefined,
          description: description || `پرداخت اجاره ${installment.title}`
        });
      } catch (txErr) {
        console.warn('Transaction logging skipped or handled by backend:', txErr);
      }

      // 3. Mark Installment as Paid
      const updatedSchedule = (contract.schedule || []).map((inst: RentInstallment) => {
        if (inst.id === installment.id) {
          const newPaidAmount = (Number(inst.paidAmount) || 0) + Number(amount);
          const isFullySettled = newPaidAmount >= inst.amount;
          return {
            ...inst,
            paymentStatus: (isFullySettled ? 'paid' : 'unpaid') as any,
            paidAmount: newPaidAmount,
            paymentDocId: createdPaymentDoc?.id || `pay_${Date.now()}`,
            paidDate: payDateIso,
            paymentMethod,
            paymentSourceId: sourceId,
            paymentRefNumber: refNumber || null
          };
        }
        return inst;
      });

      const updatedContract = { ...contract, schedule: updatedSchedule };
      await updateRentContract(contract.id, updatedContract);

      notify(`پرداخت ${Number(amount).toLocaleString()} ${currencyUnit} ثبت و قسط با موفقیت تسویه گردید`, 'success');
      setPaymentModal(null);
      await fetchData();
    } catch (e) {
      console.error(e);
      notify('خطا در ثبت پرداخت و تسویه تعهد', 'error');
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
                    <span className={`px-3 py-0.5 rounded-full text-xs font-bold border ${
                      c.status === 'active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                      c.status === 'expired' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                      'bg-slate-100 text-slate-700 border-slate-200'
                    }`}>
                      {c.status === 'active' ? 'فعال' : c.status === 'expired' ? 'خاتمه‌یافته' : 'پیش‌نویس'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    طرف حساب و موجر: <span className="font-bold text-slate-800">{getPersonName(c.personId)}</span>
                    {' '}• شروع: {formatDateDisplay(c.startDate, storeSettings?.calendarType)}
                    {c.endDate ? ` • پایان: ${formatDateDisplay(c.endDate, storeSettings?.calendarType)}` : ' • مدت: نامحدود'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPrintContract(c)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>چاپ اقساط</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleEdit(c)}
                  className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Edit2 className="w-4 h-4" />
                  <span>ویرایش قرارداد</span>
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
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-500 border border-slate-200">
                                    <Clock className="w-3.5 h-3.5" />
                                    <span>تعهد ثبت نشده</span>
                                  </span>
                                )}
                              </td>

                              <td className="p-3.5 text-center">
                                {isPaid ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    <ShieldCheck className="w-3.5 h-3.5" />
                                    <span>تسویه کامل ({Number(inst.paidAmount).toLocaleString()})</span>
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                    <Clock className="w-3.5 h-3.5" />
                                    <span>پرداخت نشده</span>
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
            <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl shadow-xs flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <div className="font-extrabold text-sm text-slate-900">
                    {toPersianDigits(activeAlerts.length)} تعهد اجاره نیازمند اقدام فوری است!
                  </div>
                  <div className="text-xs text-amber-800 mt-0.5">
                    اقساطی در آستانه سررسید (۳ روز مانده) یا معوق هستند که سند تعهد یا تسویه آن‌ها در انتظار تایید شماست.
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
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
                  <span>مشاهده و اقدام سریع</span>
                  <ArrowLeft className="w-4 h-4" />
                </button>
              </div>
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
                <option value="all">همه وضعیت‌ها</option>
                <option value="active">قراردادهای فعال</option>
                <option value="draft">پیش‌نویس</option>
                <option value="expired">منقضی شده</option>
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
                          <span className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-bold border ${
                            c.status === 'active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                            c.status === 'expired' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                            'bg-slate-100 text-slate-700 border-slate-200'
                          }`}>
                            {c.status === 'active' ? 'فعال' : c.status === 'expired' ? 'منقضی' : 'پیش‌نویس'}
                          </span>
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

                <div className="md:col-span-2">
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">وضعیت قرارداد</label>
                  <select 
                    value={form.status}
                    onChange={e => setForm({...form, status: e.target.value as any})}
                    className="w-full border border-slate-200 rounded-xl p-2.5 outline-none focus:border-indigo-500 text-sm font-bold bg-white cursor-pointer"
                  >
                    <option value="active">فعال (محاسبه و هشدار خودکار اقساط)</option>
                    <option value="draft">پیش‌نویس (غیرفعال)</option>
                    <option value="expired">منقضی شده / خاتمه‌یافته</option>
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
      {paymentModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[92vh]">
            {/* Modal Header */}
            <div className="px-6 py-5 bg-gradient-to-r from-emerald-600 to-teal-700 flex justify-between items-center text-white shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                  <Wallet className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base sm:text-lg">ثبت پرداخت و تسویه تعهد اجاره</h3>
                  <p className="text-[11px] text-emerald-100 font-medium">
                    {paymentModal.installment.title} - موجر: {getPersonName(paymentModal.contract.personId)}
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
            <div className="p-4 bg-emerald-50/80 border-b border-emerald-100 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
              <div className="space-y-0.5">
                <span className="text-slate-500 block text-[10px] font-bold">قرارداد و قسط:</span>
                <span className="font-extrabold text-slate-800">
                  قرارداد {paymentModal.contract.contractNumber || '---'} ({paymentModal.installment.title})
                </span>
              </div>
              <div className="space-y-0.5">
                <span className="text-slate-500 block text-[10px] font-bold">سررسید:</span>
                <span className="font-mono font-bold text-slate-700">
                  {toPersianDigits(paymentModal.installment.dueDate)}
                </span>
              </div>
              <div className="space-y-0.5 text-left">
                <span className="text-slate-500 block text-[10px] font-bold">مانده قابل پرداخت:</span>
                <span className="font-mono font-black text-sm text-emerald-700">
                  {toPersianDigits(addCommas(paymentModal.installment.amount - (paymentModal.installment.paidAmount || 0)))} {currencyUnit}
                </span>
              </div>
            </div>

            {/* Mode Switcher Tabs */}
            {(() => {
              const matchingPayments = (allTransactions || []).filter(
                (t: any) =>
                  (t.type === 'pay' || t.type === 'payment') &&
                  String(t.personId) === String(paymentModal.contract.personId)
              );

              return (
                <div className="p-4 border-b border-slate-100 bg-slate-50/60 shrink-0">
                  <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-200/70 rounded-xl text-xs font-bold">
                    <button
                      type="button"
                      onClick={() => setPaymentModal({ ...paymentModal, mode: 'previous_payments' })}
                      className={`py-2 px-2 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                        paymentModal.mode === 'previous_payments'
                          ? 'bg-white text-emerald-800 shadow-xs ring-1 ring-emerald-500/20'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <History className="w-3.5 h-3.5" />
                      <span>پرداخت‌های قبلی ({toPersianDigits(matchingPayments.length)})</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentModal({ ...paymentModal, mode: 'system_form' })}
                      className={`py-2 px-2 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                        paymentModal.mode === 'system_form'
                          ? 'bg-white text-rose-800 shadow-xs ring-1 ring-rose-500/20'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>فرم پرداخت سیستم</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentModal({ ...paymentModal, mode: 'direct_payment' })}
                      className={`py-2 px-2 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                        paymentModal.mode === 'direct_payment'
                          ? 'bg-white text-slate-900 shadow-xs ring-1 ring-slate-400/20'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Wallet className="w-3.5 h-3.5" />
                      <span>ثبت مستقیم</span>
                    </button>
                  </div>
                </div>
              );
            })()}

            {/* Modal Body depending on Mode */}
            <div className="p-6 overflow-y-auto space-y-4">
              {/* TAB 1: PREVIOUS PAYMENTS */}
              {paymentModal.mode === 'previous_payments' && (() => {
                const matchingPayments = (allTransactions || []).filter(
                  (t: any) =>
                    (t.type === 'pay' || t.type === 'payment') &&
                    String(t.personId) === String(paymentModal.contract.personId)
                );

                if (matchingPayments.length === 0) {
                  return (
                    <div className="py-8 px-4 text-center space-y-4">
                      <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto border border-amber-200">
                        <History className="w-7 h-7" />
                      </div>
                      <div className="space-y-1">
                        <h4 className="font-black text-slate-800 text-sm">هیچ پرداختی قبلی برای این شخص یافت نشد</h4>
                        <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                          تاکنون هیچ سند پرداختی در سیستم برای موجر «{getPersonName(paymentModal.contract.personId)}» ثبت نشده است. می‌توانید پرداخت جدید را با فرم رسمی سیستم یا مستقیماً در همین پنجره ثبت کنید.
                        </p>
                      </div>
                      <div className="flex justify-center gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => setPaymentModal({ ...paymentModal, mode: 'system_form' })}
                          className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <ExternalLink className="w-4 h-4" />
                          <span>ثبت با فرم رسمی پرداخت سیستم</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setPaymentModal({ ...paymentModal, mode: 'direct_payment' })}
                          className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-bold text-xs transition-colors cursor-pointer"
                        >
                          ثبت مستقیم در همین فرم
                        </button>
                      </div>
                    </div>
                  );
                }

                const selectedPayment = matchingPayments.find(p => String(p.id) === String(paymentModal.selectedPreviousPaymentId));

                return (
                  <div className="space-y-3">
                    <p className="text-xs text-slate-600 leading-relaxed font-medium">
                      یکی از پرداخت‌های قبلی ثبت‌شده برای موجر را انتخاب نمایید تا این قسط با آن تطبیق داده شده و وضعیت آن تسویه گردد:
                    </p>

                    <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                      {matchingPayments.map((p: any) => {
                        const isSelected = String(p.id) === String(paymentModal.selectedPreviousPaymentId);
                        const pAmt = Number(p.amount) || 0;
                        const pDate = p.displayDate || formatDateDisplay(p.date || p.rawDate);
                        const pNum = p.receiptNumber || p.trackingNumber || p.id;
                        const pSource = p.resourceType === 'cashbox' ? 'صندوق' : (p.resourceType === 'bank' ? 'بانک' : (p.method || 'پرداخت'));

                        return (
                          <div
                            key={p.id}
                            onClick={() => setPaymentModal({ ...paymentModal, selectedPreviousPaymentId: String(p.id) })}
                            className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                              isSelected
                                ? 'bg-emerald-50/90 border-emerald-400 ring-2 ring-emerald-500/20 shadow-xs'
                                : 'bg-white border-slate-200 hover:border-emerald-300 hover:bg-slate-50/50'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 border transition-all ${
                                isSelected ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-slate-300 bg-white'
                              }`}>
                                {isSelected && <Check className="w-3.5 h-3.5" />}
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-mono font-extrabold text-xs text-slate-900">
                                    رسید {toPersianDigits(pNum)}
                                  </span>
                                  <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                                    {pSource}
                                  </span>
                                </div>
                                <p className="text-[11px] text-slate-500 mt-0.5 max-w-xs truncate">
                                  {p.description || p.note || 'پرداخت وجه'}
                                </p>
                              </div>
                            </div>

                            <div className="text-left shrink-0">
                              <span className="font-mono font-black text-xs text-emerald-800 block">
                                {toPersianDigits(addCommas(pAmt))} {currencyUnit}
                              </span>
                              <span className="text-[10px] font-mono text-slate-400 block mt-0.5">
                                {toPersianDigits(pDate)}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {selectedPayment && (
                      <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-950 font-medium space-y-1">
                        <div className="flex items-center gap-1.5 font-bold text-emerald-900">
                          <CheckCheck className="w-4 h-4 text-emerald-600" />
                          <span>خلاصه انطباق و تسویه قسط با پرداخت قبلی:</span>
                        </div>
                        <p className="text-[11px] text-emerald-800 leading-relaxed">
                          قسط <strong>{paymentModal.installment.title}</strong> به مبلغ {toPersianDigits(addCommas(paymentModal.installment.amount))} {currencyUnit} با سند شماره <strong>{selectedPayment.receiptNumber || selectedPayment.id}</strong> به مبلغ {toPersianDigits(addCommas(selectedPayment.amount))} {currencyUnit} تسویه شده و هشدار آن خاموش خواهد شد.
                        </p>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* TAB 2: SYSTEM OFFICIAL FORM */}
              {paymentModal.mode === 'system_form' && (
                <div className="py-4 space-y-4">
                  <div className="p-4 bg-gradient-to-r from-rose-50/80 to-orange-50/40 rounded-2xl border border-rose-200/80 space-y-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                        <ArrowUpRight className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-black text-sm text-slate-900">فرم رسمی ثبت رسید پرداخت وجه سیستم</h4>
                        <p className="text-[11px] text-slate-500">
                          خزانه‌داری یکپارچه با قابلیت انتخاب بانک، چک، کارت، صندوق و صدور سند دوبل
                        </p>
                      </div>
                    </div>

                    <div className="space-y-1.5 text-xs text-slate-700 pt-1">
                      <div className="flex items-center gap-2">
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span>طرف‌حساب (موجر) و مبلغ قسط به صورت خودکار در فرم بارگذاری می‌شود.</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span>پرداخت مستقیماً به سند تعهد این قسط متصل شده و بلافاصله تسویه را اعمال می‌کند.</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span>امکان چاپ فیش پرداخت و ارسال پیامک خودکار برای موجر.</span>
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

              {/* TAB 3: DIRECT QUICK PAYMENT */}
              {paymentModal.mode === 'direct_payment' && (
                <div className="space-y-4">
                  {/* Payment Method Tabs */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">روش پرداخت</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const defaultBank = bankAccounts.length > 0 ? bankAccounts[0].id : '';
                          setPaymentModal({ ...paymentModal, paymentMethod: 'bank', sourceId: defaultBank });
                        }}
                        className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                          paymentModal.paymentMethod === 'bank'
                            ? 'border-emerald-600 bg-emerald-50 text-emerald-700 ring-2 ring-emerald-500/20'
                            : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <CreditCard className="w-4 h-4" />
                        <span>حساب بانکی</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const defaultCb = cashboxes.length > 0 ? cashboxes[0].id : '';
                          setPaymentModal({ ...paymentModal, paymentMethod: 'cashbox', sourceId: defaultCb });
                        }}
                        className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                          paymentModal.paymentMethod === 'cashbox'
                            ? 'border-emerald-600 bg-emerald-50 text-emerald-700 ring-2 ring-emerald-500/20'
                            : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <Wallet className="w-4 h-4" />
                        <span>صندوق نقدی</span>
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      {paymentModal.paymentMethod === 'bank' ? 'انتخاب حساب بانکی پرداخت‌کننده' : 'انتخاب صندوق نقدی'} <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={paymentModal.sourceId}
                      onChange={(e) => setPaymentModal({ ...paymentModal, sourceId: e.target.value })}
                      className="w-full border border-slate-200 rounded-xl p-2.5 outline-none focus:border-emerald-500 text-xs font-bold bg-white cursor-pointer"
                    >
                      {paymentModal.paymentMethod === 'bank' ? (
                        bankAccounts.map(b => (
                          <option key={b.id} value={b.id}>
                            {b.bankName || b.title} - شماره حساب: {b.accountNumber || b.accountNo || b.id}
                          </option>
                        ))
                      ) : (
                        cashboxes.map(c => (
                          <option key={c.id} value={c.id}>
                            {c.name || c.title || 'صندوق اصلی'}
                          </option>
                        ))
                      )}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      مبلغ پرداختی ({currencyUnit}) <span className="text-rose-500">*</span>
                    </label>
                    <CurrencyInput
                      value={paymentModal.amount}
                      onChange={(e: any) => setPaymentModal({ ...paymentModal, amount: Number(e.target.value) || 0 })}
                      storeSettings={storeSettings}
                      hideWords={true}
                      className="w-full border border-slate-200 rounded-xl p-2.5 outline-none focus:border-emerald-500 text-left font-mono font-bold"
                      placeholder="0"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-emerald-600" /> تاریخ پرداخت
                    </label>
                    <DatePicker
                      value={paymentModal.date}
                      onChange={(d: any) => setPaymentModal({ ...paymentModal, date: d })}
                      calendar={storeSettings?.calendarType === 'gregorian' ? gregorian : persian}
                      locale={storeSettings?.calendarType === 'gregorian' ? gregorian_en : persian_fa}
                      calendarPosition="bottom-right"
                      inputClass="w-full p-2.5 bg-white border border-slate-200 rounded-xl focus:border-emerald-500 outline-none text-center font-bold text-slate-900 cursor-pointer"
                      containerClassName="w-full"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">شماره پیگیری / ارجاع بانکی</label>
                    <input
                      type="text"
                      value={paymentModal.refNumber}
                      onChange={(e) => setPaymentModal({ ...paymentModal, refNumber: e.target.value })}
                      placeholder="مثال: 98234123"
                      className="w-full border border-slate-200 rounded-xl p-2.5 outline-none focus:border-emerald-500 font-mono text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">شرح پرداخت</label>
                    <input
                      type="text"
                      value={paymentModal.description}
                      onChange={(e) => setPaymentModal({ ...paymentModal, description: e.target.value })}
                      className="w-full border border-slate-200 rounded-xl p-2.5 outline-none focus:border-emerald-500 text-xs"
                    />
                  </div>
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
                  disabled={loading || !paymentModal.selectedPreviousPaymentId}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-sm shadow-emerald-200 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <CheckCheck className="w-4 h-4" />
                  <span>{loading ? 'در حال ثبت...' : 'تایید و تسویه تعهد با پرداخت قبلی'}</span>
                </button>
              ) : paymentModal.mode === 'system_form' ? (
                <button 
                  type="button"
                  onClick={() => {
                    setSystemPayModal({
                      contract: paymentModal.contract,
                      installment: paymentModal.installment
                    });
                  }}
                  className="px-6 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-xs shadow-sm shadow-rose-200 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>انتقال به فرم پرداخت سیستم</span>
                </button>
              ) : (
                <button 
                  type="button"
                  onClick={handleConfirmPayment} 
                  disabled={loading}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-sm shadow-emerald-200 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  <span>{loading ? 'در حال ثبت...' : 'ثبت مستقیم پرداخت و تسویه تعهد'}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

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

      {/* 4. PRINT / SCHEDULE PREVIEW MODAL */}
      {printContract && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <h3 className="font-extrabold text-slate-800 text-base flex items-center gap-2">
                <Printer className="w-5 h-5 text-indigo-600" />
                پیش‌نمایش و چاپ جدول اقساط اجاره ({printContract.contractNumber || 'بدون شماره'})
              </h3>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>چاپ برگه</span>
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

            <div className="p-8 overflow-y-auto print:p-0 space-y-6">
              <div className="text-center border-b border-slate-300 pb-4">
                <h2 className="text-xl font-black text-slate-900">جدول زمان‌بندی و تعهدات پرداخت اجاره</h2>
                <div className="text-xs text-slate-600 mt-2 flex justify-center gap-6">
                  <span>شماره قرارداد: <strong className="font-mono">{printContract.contractNumber}</strong></span>
                  <span>طرف حساب (موجر): <strong>{getPersonName(printContract.personId)}</strong></span>
                  <span>تاریخ تنظیم: <strong>{new Date().toLocaleDateString('fa-IR')}</strong></span>
                </div>
              </div>

              <table className="w-full text-right text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 border border-slate-300 font-bold">
                    <th className="p-2.5 border border-slate-300 text-center">ردیف</th>
                    <th className="p-2.5 border border-slate-300">عنوان دوره / قسط</th>
                    <th className="p-2.5 border border-slate-300 text-center">موعد سررسید</th>
                    <th className="p-2.5 border border-slate-300 text-center">مبلغ ({currencyUnit})</th>
                    <th className="p-2.5 border border-slate-300 text-center">وضعیت تعهد حسابداری</th>
                    <th className="p-2.5 border border-slate-300 text-center">وضعیت تسویه مالی</th>
                  </tr>
                </thead>
                <tbody>
                  {(printContract.schedule || []).map((inst: RentInstallment, i: number) => (
                    <tr key={i} className="border border-slate-300">
                      <td className="p-2 border border-slate-300 text-center font-bold">{toPersianDigits(i + 1)}</td>
                      <td className="p-2 border border-slate-300 font-bold">{inst.title}</td>
                      <td className="p-2 border border-slate-300 text-center font-mono">{toPersianDigits(inst.dueDate)}</td>
                      <td className="p-2 border border-slate-300 text-center font-mono font-bold">{Number(inst.amount).toLocaleString()}</td>
                      <td className="p-2 border border-slate-300 text-center">
                        {inst.commitmentStatus === 'committed' ? 'سند تعهد صادر شده' : 'صادر نشده'}
                      </td>
                      <td className="p-2 border border-slate-300 text-center">
                        {inst.paymentStatus === 'paid' ? 'تسویه شده' : 'پرداخت نشده'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
