import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, Edit2, Trash2, FileText, Check, X, AlertCircle, CheckCircle, 
  Play, Eye, Calendar, ArrowRight, DollarSign, CreditCard, Clock, 
  AlertTriangle, ShieldCheck, Printer, RefreshCw, ChevronLeft, 
  Wallet, Building, ArrowLeft, ArrowUpRight, CheckSquare, Sparkles, Filter, Info
} from 'lucide-react';
import Select from 'react-select';
import { 
  getRentContracts, addRentContract, updateRentContract, deleteRentContract, 
  ensurePayableAccount, testGenerateRentCommitments 
} from '../../services/hrService';
import { 
  getLedgerAccounts, addAccountingDocument, getAccountingDocuments, 
  getTransactions, getCashboxes, getAccounts, addTransaction 
} from '../../services/dataService';
import { convertToGregorian, formatDateDisplay, toPersianDigits } from '../../utils/format';
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
  paymentStatus: 'unpaid' | 'partial' | 'paid';
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
  const sDate = sDateVal instanceof Date ? sDateVal : new Date(convertToGregorian(sDateVal));
  if (isNaN(sDate.getTime())) return [];
  
  let eDate = eDateVal ? (eDateVal instanceof Date ? eDateVal : new Date(convertToGregorian(eDateVal))) : null;
  if (!eDate || isNaN(eDate.getTime())) {
    eDate = new Date(sDate);
    eDate.setFullYear(eDate.getFullYear() + 1);
  }

  const dStart = new DateObject({ date: sDate, calendar: persian, locale: persian_fa });
  const dEnd = new DateObject({ date: eDate, calendar: persian, locale: persian_fa });

  const stepMonths = cycle === 'quarterly' ? 3 : (cycle === 'semi_annual' ? 6 : (cycle === 'annual' ? 12 : 1));

  let curYear = dStart.year;
  let curMonth = dStart.month.number;
  const endYear = dEnd.year;
  const endMonth = dEnd.month.number;

  const schedule: RentInstallment[] = [];
  let periodIdx = 1;

  const monthNames = ['', 'فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'];

  while (curYear < endYear || (curYear === endYear && curMonth <= endMonth)) {
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
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [loading, setLoading] = useState(false);

  // Selected Contract for Dedicated Full-Page View
  const [selectedContractDetail, setSelectedContractDetail] = useState<any | null>(null);
  const [detailActiveTab, setDetailActiveTab] = useState<'schedule' | 'vouchers' | 'info'>('schedule');

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [activationModal, setActivationModal] = useState<any>(null);
  const [printModalContract, setPrintModalContract] = useState<any | null>(null);

  // Commitment Voucher Modal State
  const [commitmentModal, setCommitmentModal] = useState<{
    contract: any;
    installment: RentInstallment;
    date: Date;
    expenseAccountId: string;
    amount: number;
    description: string;
  } | null>(null);

  // Quick Payment Modal State
  const [paymentModal, setPaymentModal] = useState<{
    contract: any;
    installment: RentInstallment;
    paymentMethod: 'cashbox' | 'bank';
    sourceId: string;
    amount: number;
    date: Date;
    refNumber: string;
    description: string;
  } | null>(null);

  // Contract Form State
  const [form, setForm] = useState({
    personId: null as any,
    contractNumber: '',
    startDate: new Date(),
    endDate: null as any,
    monthlyAmount: '',
    depositAmount: '',
    paymentCycle: 'monthly' as 'monthly' | 'quarterly' | 'semi_annual' | 'annual',
    paymentDay: '1',
    reminderDaysBefore: 3,
    expenseAccountId: '',
    description: '',
    status: 'draft' as 'draft' | 'active' | 'expired'
  });

  const currencyUnit = storeSettings?.currency || 'ریال';

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [contractsData, accs, cbs, banks, docs] = await Promise.all([
        getRentContracts(),
        getLedgerAccounts(),
        getCashboxes(),
        getAccounts(),
        getAccountingDocuments()
      ]);

      // Ensure every contract has a schedule initialized
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

      // If a contract is currently viewed in detailed mode, update its reference
      if (selectedContractDetail) {
        const refreshed = enrichedContracts.find((c: any) => String(c.id) === String(selectedContractDetail.id));
        if (refreshed) setSelectedContractDetail(refreshed);
      }
    } catch (e) {
      console.error(e);
      showNotification('خطا در بارگذاری اطلاعات قراردادهای اجاره', 'error');
    } finally {
      setLoading(false);
    }
  };

  const getPersonName = (id: string) => {
    const p = (personsData || []).find((x: any) => String(x.id) === String(id));
    return p ? p.name : 'نامشخص';
  };

  const getPersonDetails = (id: string) => {
    return (personsData || []).find((x: any) => String(x.id) === String(id)) || null;
  };

  const autoGenerateContractNumber = (selectedPersonId: any, sDate: any, eDate: any) => {
    if (!selectedPersonId || !sDate || !personsData) return '';
    const person = personsData.find((p: any) => String(p.id) === String(selectedPersonId));
    if (!person) return '';
    const code = person.personCode || person.id.toString().slice(-4);
    try {
      const sDateObj = sDate instanceof Date ? sDate : new Date(convertToGregorian(sDate));
      const sYear = new Intl.DateTimeFormat('fa-IR-u-nu-latn', { year: 'numeric' }).format(sDateObj);
      return `RC-${code}-${sYear}`;
    } catch (e) {
      return `RC-${code}`;
    }
  };

  useEffect(() => {
    if (!editingId && form.personId && form.startDate) {
      const generated = autoGenerateContractNumber(form.personId.value, form.startDate, form.endDate);
      if (generated && !form.contractNumber) {
        setForm(prev => ({ ...prev, contractNumber: generated }));
      }
    }
  }, [form.personId, form.startDate, form.endDate, editingId]);

  // Compute all active alerts across all contracts
  const activeAlerts = useMemo(() => {
    const alerts: Array<{
      id: string;
      type: 'commitment_due' | 'unsettled_debt';
      contract: any;
      installment: RentInstallment;
      daysDiff: number;
    }> = [];

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTs = today.getTime();

    contracts.filter(c => c.status === 'active').forEach(contract => {
      const reminderDays = contract.reminderDaysBefore ?? 3;
      (contract.schedule || []).forEach((inst: RentInstallment) => {
        const daysDiff = Math.round((inst.dueDateTimestamp - todayTs) / 86400000);

        // Alert 1: Commitment Voucher needed (in reminder window or overdue, but uncommitted)
        if (inst.commitmentStatus !== 'committed' && daysDiff <= reminderDays) {
          alerts.push({
            id: `alert_commit_${contract.id}_${inst.id}`,
            type: 'commitment_due',
            contract,
            installment: inst,
            daysDiff
          });
        }
        // Alert 2: Unsettled Debt (committed into accounting, but not yet paid)
        else if (inst.commitmentStatus === 'committed' && inst.paymentStatus !== 'paid') {
          alerts.push({
            id: `alert_debt_${contract.id}_${inst.id}`,
            type: 'unsettled_debt',
            contract,
            installment: inst,
            daysDiff
          });
        }
      });
    });

    return alerts.sort((a, b) => a.daysDiff - b.daysDiff);
  }, [contracts]);

  // Save or Update Contract
  const handleSave = async () => {
    if (loading) return;
    if (!form.personId) return showNotification('طرف قرارداد (موجر) باید انتخاب شود', 'error');
    if (!form.monthlyAmount || Number(form.monthlyAmount) <= 0) return showNotification('مبلغ اجاره دوره الزامی است', 'error');

    setLoading(true);
    try {
      const startDateIso = convertToGregorian(form.startDate);
      const endDateIso = form.endDate ? convertToGregorian(form.endDate) : null;

      if (!startDateIso) {
        setLoading(false);
        return showNotification('تاریخ شروع قرارداد الزامی است', 'error');
      }

      if (startDateIso && endDateIso) {
        const startObj = new Date(startDateIso);
        const endObj = new Date(endDateIso);
        if (endObj < startObj) {
          setLoading(false);
          return showNotification('تاریخ پایان نمی‌تواند قبل از تاریخ شروع باشد', 'error');
        }
      }

      let pDay = Number(form.paymentDay) || 1;
      const existingContract = editingId ? contracts.find(c => c.id === editingId) : null;

      // Auto-generate or update schedule
      const generatedSchedule = generateRentSchedule(
        startDateIso,
        endDateIso,
        form.paymentCycle,
        pDay,
        Number(form.monthlyAmount),
        existingContract?.schedule
      );

      const payload = {
        personId: form.personId.value,
        contractNumber: form.contractNumber || `RC-${Date.now().toString().slice(-4)}`,
        startDate: startDateIso,
        endDate: endDateIso,
        monthlyAmount: Number(form.monthlyAmount),
        depositAmount: Number(form.depositAmount) || 0,
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
        showNotification('قرارداد اجاره با موفقیت بروزرسانی شد', 'success');
      } else {
        const newId = Date.now().toString() + Math.random().toString().substring(2, 8);
        await addRentContract({ id: newId, ...payload });
        showNotification('قرارداد اجاره و جدول اقساط با موفقیت ثبت شد', 'success');
      }

      setIsModalOpen(false);
      await fetchData();
    } catch (e) {
      console.error(e);
      showNotification('خطا در ثبت قرارداد اجاره', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (c: any) => {
    setEditingId(c.id);
    const person = (personsData || []).find((p: any) => String(p.id) === String(c.personId));
    setForm({
      personId: person ? { value: person.id, label: person.name } : null,
      contractNumber: c.contractNumber || '',
      startDate: c.startDate ? new Date(c.startDate) : new Date(),
      endDate: c.endDate ? new Date(c.endDate) : null,
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

  const handleDelete = async () => {
    try {
      if (deleteId) {
        await deleteRentContract(deleteId);
        showNotification('قرارداد اجاره با موفقیت حذف شد', 'success');
        if (selectedContractDetail?.id === deleteId) {
          setSelectedContractDetail(null);
        }
        setDeleteId(null);
        await fetchData();
      }
    } catch (e) {
      showNotification('خطا در حذف قرارداد', 'error');
    }
  };

  const handleActivate = async () => {
    if (!activationModal) return;
    try {
      await updateRentContract(activationModal.id, { ...activationModal, status: 'active' });
      showNotification('قرارداد با موفقیت تایید و فعال شد', 'success');
      setActivationModal(null);
      await fetchData();
    } catch (e) {
      console.error(e);
      showNotification('خطا در فعال‌سازی قرارداد', 'error');
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
      description: `سند تعهد بدهکاری اجاره ${installment.title} - قرارداد ${contract.contractNumber || ''}`
    });
  };

  // Confirm and Issue Commitment Accounting Document
  const handleConfirmCommitment = async () => {
    if (!commitmentModal) return;
    const { contract, installment, date, expenseAccountId, amount, description } = commitmentModal;

    if (!expenseAccountId) {
      return showNotification('لطفاً سرفصل هزینه اجاره را مشخص کنید', 'error');
    }
    if (!amount || amount <= 0) {
      return showNotification('مبلغ نامعتبر است', 'error');
    }

    try {
      setLoading(true);
      const payableAcc = await ensurePayableAccount();

      const doc = {
        date: date instanceof Date ? date.toISOString() : new Date(date).toISOString(),
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

      // Update installment status in contract
      const updatedSchedule = (contract.schedule || []).map((inst: RentInstallment) => {
        if (inst.id === installment.id) {
          return {
            ...inst,
            commitmentStatus: 'committed' as const,
            commitmentDocId: createdDoc?.id || `doc_${Date.now()}`,
            commitmentDate: new Date().toISOString()
          };
        }
        return inst;
      });

      const updatedContract = { ...contract, schedule: updatedSchedule };
      await updateRentContract(contract.id, updatedContract);

      showNotification(`سند تعهد بدهکاری بابت ${installment.title} با موفقیت در حساب موجر ثبت شد`, 'success');
      setCommitmentModal(null);
      await fetchData();
    } catch (e) {
      console.error(e);
      showNotification('خطا در صدور سند تعهد', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Open 1-Click Quick Payment Modal
  const openPaymentModal = (contract: any, installment: RentInstallment) => {
    const defaultCashbox = cashboxes.length > 0 ? cashboxes[0].id : '';
    const defaultBank = bankAccounts.length > 0 ? bankAccounts[0].id : '';
    const initialMethod: 'cashbox' | 'bank' = defaultBank ? 'bank' : 'cashbox';
    const initialSource = initialMethod === 'bank' ? defaultBank : defaultCashbox;
    const remainingAmount = installment.amount - (installment.paidAmount || 0);

    setPaymentModal({
      contract,
      installment,
      paymentMethod: initialMethod,
      sourceId: initialSource,
      amount: remainingAmount > 0 ? remainingAmount : installment.amount,
      date: new Date(),
      refNumber: '',
      description: `پرداخت و تسویه ${installment.title} به موجر: ${getPersonName(contract.personId)}`
    });
  };

  // Confirm Payment & Settle Commitment
  const handleConfirmPayment = async () => {
    if (!paymentModal) return;
    const { contract, installment, paymentMethod, sourceId, amount, date, refNumber, description } = paymentModal;

    if (!sourceId) {
      return showNotification('لطفاً صندوق یا حساب بانکی پرداخت را انتخاب کنید', 'error');
    }
    if (!amount || amount <= 0) {
      return showNotification('مبلغ پرداختی نامعتبر است', 'error');
    }

    try {
      setLoading(true);
      const payableAcc = await ensurePayableAccount();

      // Find ledger account of source
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

      // 1. Issue Payment Accounting Document
      const paymentDoc = {
        date: date instanceof Date ? date.toISOString() : new Date(date).toISOString(),
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
          date: date instanceof Date ? date.toISOString() : new Date(date).toISOString(),
          cashboxId: paymentMethod === 'cashbox' ? sourceId : undefined,
          accountId: paymentMethod === 'bank' ? sourceId : undefined,
          referenceNumber: refNumber || undefined,
          description: description || `تسویه اجاره ${installment.title}`,
          relatedDocId: createdPaymentDoc?.id
        });
      } catch (txErr) {
        console.warn('Transaction record warning:', txErr);
      }

      // 3. Update Installment in Contract
      const updatedSchedule = (contract.schedule || []).map((inst: RentInstallment) => {
        if (inst.id === installment.id) {
          const totalPaidNow = (inst.paidAmount || 0) + Number(amount);
          return {
            ...inst,
            paymentStatus: (totalPaidNow >= inst.amount ? 'paid' : 'partial') as 'paid' | 'partial',
            paidAmount: totalPaidNow,
            paymentDocId: createdPaymentDoc?.id || `pay_${Date.now()}`,
            paidDate: new Date().toISOString(),
            paymentMethod,
            paymentSourceId: sourceId,
            paymentRefNumber: refNumber || null
          };
        }
        return inst;
      });

      const updatedContract = { ...contract, schedule: updatedSchedule };
      await updateRentContract(contract.id, updatedContract);

      showNotification(`پرداخت ${Number(amount).toLocaleString()} ${currencyUnit} ثبت و قسط با موفقیت تسویه گردید`, 'success');
      setPaymentModal(null);
      await fetchData();
    } catch (e) {
      console.error(e);
      showNotification('خطا در ثبت پرداخت و تسویه تعهد', 'error');
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

  // ==========================================
  // RENDER DEDICATED FULL-PAGE DOSSIER VIEW
  // ==========================================
  if (selectedContractDetail) {
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
      <div className="space-y-6 animate-in fade-in pb-12" dir="rtl">
        {/* Top Header Bar */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-wrap justify-between items-center gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSelectedContractDetail(null)}
              className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all flex items-center gap-1.5 font-bold text-sm"
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
                  {c.status === 'active' ? 'فعال' : c.status === 'expired' ? 'منقضی شده' : 'پیش‌نویس'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                طرف قرارداد (موجر): <strong className="text-slate-800">{getPersonName(c.personId)}</strong>
                {' · '}بازه: {formatDateDisplay(c.startDate, storeSettings?.calendarType)} تا {c.endDate ? formatDateDisplay(c.endDate, storeSettings?.calendarType) : 'نامحدود'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPrintModalContract(c)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold flex items-center gap-2 text-sm transition-colors border border-slate-200"
            >
              <Printer className="w-4 h-4" />
              چاپ گزارش مالی
            </button>
            <button
              onClick={() => handleEdit(c)}
              className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl font-bold flex items-center gap-2 text-sm transition-colors border border-indigo-200"
            >
              <Edit2 className="w-4 h-4" />
              ویرایش قرارداد
            </button>
          </div>
        </div>

        {/* 4 Live Financial KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-bold">کل مبلغ تعهدات دوره</span>
              <FileText className="w-4 h-4 text-indigo-500" />
            </div>
            <div className="text-xl font-extrabold text-slate-900 font-mono">
              {Number(totalContractCommitments).toLocaleString()} <span className="text-xs font-normal text-slate-500">{currencyUnit}</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              مجموع {toPersianDigits(schedule.length)} قسط تعیین‌شده
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-bold">تعهدات ثبت‌شده در دفاتر</span>
              <CheckSquare className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="text-xl font-extrabold text-emerald-700 font-mono">
              {Number(totalCommitted).toLocaleString()} <span className="text-xs font-normal text-slate-500">{currencyUnit}</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              {toPersianDigits(schedule.filter(i => i.commitmentStatus === 'committed').length)} قسط با سند تعهد
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-bold">کل پرداختی‌ها و تسویه‌ها</span>
              <CreditCard className="w-4 h-4 text-blue-500" />
            </div>
            <div className="text-xl font-extrabold text-blue-700 font-mono">
              {Number(totalPaid).toLocaleString()} <span className="text-xs font-normal text-slate-500">{currencyUnit}</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              {toPersianDigits(schedule.filter(i => i.paymentStatus === 'paid').length)} قسط کاملاً تسویه شده
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-bold">مانده بدهی تسویه‌نشده جاری</span>
              <AlertTriangle className="w-4 h-4 text-rose-500" />
            </div>
            <div className={`text-xl font-extrabold font-mono ${remainingUnsettledDebt > 0 ? 'text-rose-600' : 'text-slate-700'}`}>
              {Number(remainingUnsettledDebt).toLocaleString()} <span className="text-xs font-normal text-slate-500">{currencyUnit}</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              {remainingUnsettledDebt > 0 ? 'تعهدات صادره منتظر پرداخت' : 'تمامی تعهدات تسویه هستند'}
            </div>
          </div>
        </div>

        {/* Active Alerts for this contract */}
        {activeAlerts.filter(a => a.contract.id === c.id).length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 shadow-sm space-y-2">
            <div className="flex items-center gap-2 text-amber-800 font-bold text-sm">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              <span>هشدارهای فعال و اقدامات فوری این قرارداد:</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
              {activeAlerts.filter(a => a.contract.id === c.id).map(alert => (
                <div key={alert.id} className="bg-white p-3 rounded-xl border border-amber-200 flex items-center justify-between gap-3 shadow-2xs">
                  <div>
                    <div className="font-bold text-xs text-slate-800">
                      {alert.installment.title} ({Number(alert.installment.amount).toLocaleString()} {currencyUnit})
                    </div>
                    <div className="text-[11px] text-amber-700 mt-0.5">
                      {alert.type === 'commitment_due' ? (
                        alert.daysDiff < 0 
                          ? `⚠️ ${Math.abs(alert.daysDiff)} روز از سررسید گذشته است (سند تعهد صادر نشده)`
                          : alert.daysDiff === 0 
                            ? 'امروز موعد سررسید این قسط است'
                            : `⏳ ${alert.daysDiff} روز تا سررسید باقیست (نیاز به تایید تعهد)`
                      ) : (
                        `🔴 سند تعهد صادر شده اما قسط هنوز تسویه نشده است`
                      )}
                    </div>
                  </div>
                  <div>
                    {alert.type === 'commitment_due' ? (
                      <button
                        onClick={() => openCommitmentModal(alert.contract, alert.installment)}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-xs flex items-center gap-1 transition-all"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        تایید و صدور تعهد
                      </button>
                    ) : (
                      <button
                        onClick={() => openPaymentModal(alert.contract, alert.installment)}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs flex items-center gap-1 transition-all"
                      >
                        <CreditCard className="w-3.5 h-3.5" />
                        ثبت پرداخت و تسویه
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab Navigation inside Dossier */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="flex border-b border-slate-200 bg-slate-50 px-4">
            <button
              onClick={() => setDetailActiveTab('schedule')}
              className={`py-3.5 px-6 font-bold text-sm border-b-2 transition-all flex items-center gap-2 ${
                detailActiveTab === 'schedule'
                  ? 'border-indigo-600 text-indigo-700 bg-white shadow-2xs'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              <Calendar className="w-4 h-4" />
              جدول اقساط و سررسیدهای اجاره ({toPersianDigits(schedule.length)})
            </button>

            <button
              onClick={() => setDetailActiveTab('vouchers')}
              className={`py-3.5 px-6 font-bold text-sm border-b-2 transition-all flex items-center gap-2 ${
                detailActiveTab === 'vouchers'
                  ? 'border-indigo-600 text-indigo-700 bg-white shadow-2xs'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileText className="w-4 h-4" />
              گردش اسناد حسابداری ({toPersianDigits(contractDocs.length)})
            </button>

            <button
              onClick={() => setDetailActiveTab('info')}
              className={`py-3.5 px-6 font-bold text-sm border-b-2 transition-all flex items-center gap-2 ${
                detailActiveTab === 'info'
                  ? 'border-indigo-600 text-indigo-700 bg-white shadow-2xs'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              <Info className="w-4 h-4" />
              مشخصات و شرایط قرارداد
            </button>
          </div>

          <div className="p-6">
            {/* TAB 1: SCHEDULE TABLE */}
            {detailActiveTab === 'schedule' && (
              <div className="overflow-x-auto">
                <table className="w-full text-right text-sm">
                  <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 text-xs">
                    <tr>
                      <th className="p-3.5 font-bold w-12 text-center">ردیف</th>
                      <th className="p-3.5 font-bold">دوره / عنوان قسط</th>
                      <th className="p-3.5 font-bold text-center">تاریخ سررسید</th>
                      <th className="p-3.5 font-bold text-center">وضعیت سررسید</th>
                      <th className="p-3.5 font-bold text-center">مبلغ قسط ({currencyUnit})</th>
                      <th className="p-3.5 font-bold text-center">وضعیت تعهد (سند بدهی)</th>
                      <th className="p-3.5 font-bold text-center">وضعیت پرداخت</th>
                      <th className="p-3.5 font-bold text-center w-36">اقدامات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {schedule.map((inst, idx) => {
                      const daysDiff = Math.round((inst.dueDateTimestamp - todayMidTs) / 86400000);
                      const isCommitted = inst.commitmentStatus === 'committed';
                      const isPaid = inst.paymentStatus === 'paid';
                      const isDueSoon = !isCommitted && daysDiff <= (c.reminderDaysBefore ?? 3);

                      return (
                        <tr key={inst.id} className={`hover:bg-slate-50/80 transition-colors ${isDueSoon ? 'bg-amber-50/40' : ''}`}>
                          <td className="p-3 text-center text-slate-400 font-mono">{toPersianDigits(idx + 1)}</td>
                          <td className="p-3 font-bold text-slate-800">{inst.title}</td>
                          <td className="p-3 text-center font-mono text-slate-700">{toPersianDigits(inst.dueDate)}</td>
                          <td className="p-3 text-center text-xs">
                            {daysDiff < 0 ? (
                              <span className="text-rose-600 font-bold">{toPersianDigits(Math.abs(daysDiff))} روز گذشته</span>
                            ) : daysDiff === 0 ? (
                              <span className="text-amber-600 font-bold">امروز سررسید</span>
                            ) : (
                              <span className="text-slate-500">{toPersianDigits(daysDiff)} روز مانده</span>
                            )}
                          </td>
                          <td className="p-3 text-center font-extrabold font-mono text-slate-900">
                            {Number(inst.amount).toLocaleString()}
                          </td>
                          <td className="p-3 text-center">
                            {isCommitted ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <Check className="w-3.5 h-3.5" />
                                تعهد ثبت شد
                              </span>
                            ) : isDueSoon ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300 animate-pulse">
                                <AlertTriangle className="w-3.5 h-3.5" />
                                سررسید تعهد
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 text-slate-600">
                                در انتظار سررسید
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-center">
                            {isPaid ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                <ShieldCheck className="w-3.5 h-3.5" />
                                تسویه شده
                              </span>
                            ) : isCommitted ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                در انتظار تسویه
                              </span>
                            ) : (
                              <span className="text-slate-400 text-xs">پرداخت نشده</span>
                            )}
                          </td>
                          <td className="p-3 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              {!isCommitted ? (
                                <button
                                  onClick={() => openCommitmentModal(c, inst)}
                                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-2xs transition-all flex items-center gap-1"
                                  title="صدور سند تعهد در حساب شخص"
                                >
                                  <FileText className="w-3.5 h-3.5" />
                                  <span>تایید تعهد</span>
                                </button>
                              ) : !isPaid ? (
                                <button
                                  onClick={() => openPaymentModal(c, inst)}
                                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-2xs transition-all flex items-center gap-1"
                                  title="ثبت پرداخت و تسویه تعهد"
                                >
                                  <CreditCard className="w-3.5 h-3.5" />
                                  <span>پرداخت</span>
                                </button>
                              ) : (
                                <span className="text-xs text-emerald-600 font-bold flex items-center gap-1">
                                  <CheckCircle className="w-4 h-4" /> تسویه شد
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
            )}

            {/* TAB 2: ACCOUNTING VOUCHERS */}
            {detailActiveTab === 'vouchers' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center text-xs text-slate-500 pb-2 border-b border-slate-100">
                  <span>کلیه اسناد حسابداری ثبت‌شده شامل اسناد تعهد بدهکاری و اسناد تسویه پرداخت:</span>
                  <span>تعداد: {toPersianDigits(contractDocs.length)} سند</span>
                </div>

                {contractDocs.length > 0 ? (
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full text-right text-sm">
                      <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 text-xs">
                        <tr>
                          <th className="p-3.5 font-bold">شماره / شناسه سند</th>
                          <th className="p-3.5 font-bold">تاریخ سند</th>
                          <th className="p-3.5 font-bold">شرح سند</th>
                          <th className="p-3.5 font-bold text-center">نوع سند</th>
                          <th className="p-3.5 font-bold text-center">مبلغ سند ({currencyUnit})</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {contractDocs.map((doc: any, i) => {
                          const docAmount = (doc.items || []).reduce((max: number, it: any) => Math.max(max, it.debit || 0, it.credit || 0), 0);
                          const isCommitment = doc.sourceType === 'rent_commitment';
                          return (
                            <tr key={doc.id || i} className="hover:bg-slate-50">
                              <td className="p-3 font-mono text-slate-600 text-xs">{doc.documentNumber || doc.id?.toString().slice(-6) || '---'}</td>
                              <td className="p-3 text-slate-700">{formatDateDisplay(doc.date, storeSettings?.calendarType)}</td>
                              <td className="p-3 font-bold text-slate-800">{doc.description}</td>
                              <td className="p-3 text-center">
                                <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                                  isCommitment ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                }`}>
                                  {isCommitment ? 'سند تعهد بدهکاری' : 'سند تسویه پرداخت'}
                                </span>
                              </td>
                              <td className="p-3 text-center font-bold font-mono text-slate-900">
                                {Number(docAmount).toLocaleString()}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-8 text-center bg-slate-50 rounded-xl text-slate-500">
                    تاکنون سندی برای این قرارداد صادر نشده است. با تایید تعهد یا پرداخت قسط، اسناد ثبت می‌شوند.
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: CONTRACT INFO */}
            {detailActiveTab === 'info' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
      </div>
    );
  }

  // ==========================================
  // RENDER CONTRACTS LIST / OVERVIEW VIEW
  // ==========================================
  return (
    <div className="space-y-6 animate-in fade-in" dir="rtl">
      {/* Top Banner Alert Strip if there are due commitments */}
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
              onClick={() => {
                const first = activeAlerts[0];
                if (first) {
                  setSelectedContractDetail(first.contract);
                }
              }}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-2xs transition-all"
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
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none text-xs font-bold text-slate-700"
          >
            <option value="all">همه وضعیت‌ها</option>
            <option value="active">قراردادهای فعال</option>
            <option value="draft">پیش‌نویس</option>
            <option value="expired">منقضی شده</option>
          </select>

          <button
            onClick={fetchData}
            className="p-2.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-xl transition-colors"
            title="بروزرسانی داده‌ها"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        <button 
          onClick={() => {
            setEditingId(null);
            setForm({
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
            setIsModalOpen(true);
          }}
          className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-bold flex items-center gap-2 hover:bg-indigo-700 transition-all shadow-sm shadow-indigo-100 text-sm"
        >
          <Plus className="w-5 h-5" />
          ثبت قرارداد اجاره جدید
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
                const totalCommittedCount = schedule.filter(i => i.commitmentStatus === 'committed').length;
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
                          onClick={() => setSelectedContractDetail(c)}
                          className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors"
                          title="صفحه اختصاصی وضعیت مالی"
                        >
                          <Eye className="w-4 h-4" />
                          <span>داشبورد مالی</span>
                        </button>
                        <button 
                          onClick={() => handleEdit(c)} 
                          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="ویرایش"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => setDeleteId(c.id)} 
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
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

      {/* CREATE / EDIT CONTRACT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-3xl shadow-2xl flex flex-col overflow-hidden max-h-[92vh]">
            <div className="p-5 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <h3 className="font-extrabold text-slate-900 text-lg flex items-center gap-2">
                <Building className="w-5 h-5 text-indigo-600" />
                {editingId ? 'ویرایش قرارداد اجاره' : 'ثبت قرارداد اجاره جدید'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-2 bg-white rounded-lg border border-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">طرف قرارداد (موجر) <span className="text-rose-500">*</span></label>
                  <Select
                    value={form.personId}
                    onChange={(val) => setForm({...form, personId: val})}
                    options={(personsData || []).map((p: any) => ({ value: p.id, label: `${p.name} (${p.personCode || 'کد: ' + p.id.toString().slice(-4)})` }))}
                    placeholder="انتخاب شخص..."
                    className="react-select-container text-sm font-bold"
                    classNamePrefix="react-select"
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
                    inputClass="w-full p-2.5 bg-white border border-slate-200 rounded-xl focus:border-indigo-500 outline-none text-center font-bold text-slate-900"
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
                    inputClass="w-full p-2.5 bg-white border border-slate-200 rounded-xl focus:border-indigo-500 outline-none text-center font-bold text-slate-900"
                    containerClassName="w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">دوره پرداخت اجاره <span className="text-rose-500">*</span></label>
                  <select
                    value={form.paymentCycle}
                    onChange={(e: any) => setForm({ ...form, paymentCycle: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl p-2.5 outline-none focus:border-indigo-500 text-sm font-bold bg-white"
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
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">وضعیت قرارداد</label>
                  <select 
                    value={form.status}
                    onChange={e => setForm({...form, status: e.target.value as any})}
                    className="w-full border border-slate-200 rounded-xl p-2.5 outline-none focus:border-indigo-500 text-sm font-bold bg-white"
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
              <button onClick={() => setIsModalOpen(false)} className="px-6 py-2.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl font-bold transition-colors">انصراف</button>
              <button onClick={handleSave} className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-bold shadow-sm shadow-indigo-200 hover:bg-indigo-700 transition-all flex items-center gap-2">
                <Check className="w-5 h-5" /> ثبت و تولید اقساط
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM COMMITMENT VOUCHER MODAL */}
      {commitmentModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col">
            <div className="px-6 py-5 bg-indigo-600 flex justify-between items-center text-white">
              <h3 className="font-extrabold text-lg flex items-center gap-2">
                <FileText className="w-5 h-5" /> تایید و صدور سند تعهد اجاره
              </h3>
              <button onClick={() => setCommitmentModal(null)} className="p-2 bg-indigo-700/50 hover:bg-indigo-700 rounded-xl transition-colors text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-indigo-50/70 p-4 rounded-xl border border-indigo-100 space-y-2.5 text-sm">
                <div className="flex justify-between"><span className="text-slate-600">قسط مربوطه:</span><strong className="text-slate-900">{commitmentModal.installment.title}</strong></div>
                <div className="flex justify-between"><span className="text-slate-600">طرف حساب (موجر):</span><strong className="text-indigo-900">{getPersonName(commitmentModal.contract.personId)}</strong></div>
                <div className="flex justify-between"><span className="text-slate-600">تاریخ سررسید قسط:</span><strong className="font-mono text-slate-800">{toPersianDigits(commitmentModal.installment.dueDate)}</strong></div>
                <div className="flex justify-between border-t border-indigo-200 pt-2"><span className="text-slate-600">مبلغ تعهد:</span><strong className="text-emerald-700 font-mono text-base">{Number(commitmentModal.amount).toLocaleString()} {currencyUnit}</strong></div>
              </div>

              <div className="bg-amber-50 p-3 rounded-xl border border-amber-200 text-xs text-amber-800 leading-relaxed">
                ℹ️ با تایید این بخش، یک سند حسابداری استاندارد در سیستم صادر می‌شود که حساب <strong>هزینه اجاره</strong> را بدهکار و حساب <strong>موجر</strong> را بستانکار می‌کند تا بدهی شما به موجر مشخص گردد.
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">سرفصل معین هزینه اجاره <span className="text-rose-500">*</span></label>
                <Select
                  options={ledgerAccounts.map(a => ({ value: a.id, label: `${a.code} - ${a.title}` }))}
                  value={commitmentModal.expenseAccountId ? { value: commitmentModal.expenseAccountId, label: ledgerAccounts.find(a => String(a.id) === String(commitmentModal.expenseAccountId))?.title } : null}
                  onChange={(val: any) => setCommitmentModal({ ...commitmentModal, expenseAccountId: val?.value || '' })}
                  placeholder="انتخاب سرفصل هزینه..."
                  className="text-sm font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">تاریخ صدور سند</label>
                <DatePicker
                  value={commitmentModal.date}
                  onChange={(d: any) => setCommitmentModal({ ...commitmentModal, date: d })}
                  calendar={storeSettings?.calendarType === 'gregorian' ? gregorian : persian}
                  locale={storeSettings?.calendarType === 'gregorian' ? gregorian_en : persian_fa}
                  calendarPosition="bottom-right"
                  inputClass="w-full p-2 bg-white border border-slate-200 rounded-xl text-center font-bold text-sm"
                  containerClassName="w-full"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">شرح آرتیکل سند حسابداری</label>
                <input
                  type="text"
                  value={commitmentModal.description}
                  onChange={(e) => setCommitmentModal({ ...commitmentModal, description: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl p-2 text-xs font-medium"
                />
              </div>
            </div>

            <div className="p-5 border-t border-slate-200 flex justify-end gap-3 bg-slate-50">
              <button onClick={() => setCommitmentModal(null)} className="px-6 py-2.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl font-bold transition-colors">انصراف</button>
              <button onClick={handleConfirmCommitment} className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-bold shadow-sm hover:bg-indigo-700 transition-all flex items-center gap-2">
                <Check className="w-5 h-5" /> تایید و ثبت سند بدهکاری
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QUICK PAYMENT MODAL (SETTLE COMMITMENT) */}
      {paymentModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col">
            <div className="px-6 py-5 bg-emerald-600 flex justify-between items-center text-white">
              <h3 className="font-extrabold text-lg flex items-center gap-2">
                <CreditCard className="w-5 h-5" /> ثبت پرداخت و تسویه تعهد اجاره
              </h3>
              <button onClick={() => setPaymentModal(null)} className="p-2 bg-emerald-700/50 hover:bg-emerald-700 rounded-xl transition-colors text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-emerald-50/70 p-4 rounded-xl border border-emerald-100 space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-slate-600">قسط در حال تسویه:</span><strong className="text-slate-900">{paymentModal.installment.title}</strong></div>
                <div className="flex justify-between"><span className="text-slate-600">دریافت‌کننده وجه (موجر):</span><strong className="text-emerald-900">{getPersonName(paymentModal.contract.personId)}</strong></div>
                <div className="flex justify-between"><span className="text-slate-600">کل مبلغ قسط:</span><span className="font-mono">{Number(paymentModal.installment.amount).toLocaleString()} {currencyUnit}</span></div>
              </div>

              {/* Payment Method Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">روش پرداخت</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      const defaultBank = bankAccounts.length > 0 ? bankAccounts[0].id : '';
                      setPaymentModal({ ...paymentModal, paymentMethod: 'bank', sourceId: defaultBank });
                    }}
                    className={`p-3 rounded-xl border font-bold text-xs flex items-center justify-center gap-2 transition-all ${
                      paymentModal.paymentMethod === 'bank'
                        ? 'bg-indigo-50 border-indigo-500 text-indigo-700 shadow-2xs'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Building className="w-4 h-4" />
                    حساب بانکی
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const defaultCb = cashboxes.length > 0 ? cashboxes[0].id : '';
                      setPaymentModal({ ...paymentModal, paymentMethod: 'cashbox', sourceId: defaultCb });
                    }}
                    className={`p-3 rounded-xl border font-bold text-xs flex items-center justify-center gap-2 transition-all ${
                      paymentModal.paymentMethod === 'cashbox'
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-700 shadow-2xs'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Wallet className="w-4 h-4" />
                    صندوق نقدی
                  </button>
                </div>
              </div>

              {/* Source Account Dropdown */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  {paymentModal.paymentMethod === 'bank' ? 'انتخاب حساب بانکی پرداخت‌کننده' : 'انتخاب صندوق نقدی پرداخت‌کننده'} <span className="text-rose-500">*</span>
                </label>
                <select
                  value={paymentModal.sourceId}
                  onChange={(e) => setPaymentModal({ ...paymentModal, sourceId: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl p-2.5 text-sm font-bold bg-white"
                >
                  {paymentModal.paymentMethod === 'bank' ? (
                    bankAccounts.map(b => (
                      <option key={b.id} value={b.id}>{b.bankName} - {b.accountNumber} ({Number(b.balance || 0).toLocaleString()} {currencyUnit})</option>
                    ))
                  ) : (
                    cashboxes.map(c => (
                      <option key={c.id} value={c.id}>{c.name} ({Number(c.balance || 0).toLocaleString()} {currencyUnit})</option>
                    ))
                  )}
                </select>
              </div>

              {/* Amount */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">مبلغ پرداختی ({currencyUnit}) <span className="text-rose-500">*</span></label>
                <CurrencyInput
                  value={paymentModal.amount}
                  onChange={(e: any) => setPaymentModal({ ...paymentModal, amount: Number(e.target.value) || 0 })}
                  storeSettings={storeSettings}
                  hideWords={true}
                  className="w-full border border-slate-200 rounded-xl p-2.5 text-left font-mono font-extrabold text-base text-emerald-700"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">تاریخ پرداخت</label>
                  <DatePicker
                    value={paymentModal.date}
                    onChange={(d: any) => setPaymentModal({ ...paymentModal, date: d })}
                    calendar={storeSettings?.calendarType === 'gregorian' ? gregorian : persian}
                    locale={storeSettings?.calendarType === 'gregorian' ? gregorian_en : persian_fa}
                    calendarPosition="bottom-right"
                    inputClass="w-full p-2 bg-white border border-slate-200 rounded-xl text-center font-bold text-xs"
                    containerClassName="w-full"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">شماره پیگیری / ارجاع</label>
                  <input
                    type="text"
                    value={paymentModal.refNumber}
                    onChange={(e) => setPaymentModal({ ...paymentModal, refNumber: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl p-2 text-xs font-mono"
                    placeholder="اختیاری"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">شرح پرداخت</label>
                <input
                  type="text"
                  value={paymentModal.description}
                  onChange={(e) => setPaymentModal({ ...paymentModal, description: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl p-2 text-xs"
                />
              </div>
            </div>

            <div className="p-5 border-t border-slate-200 flex justify-end gap-3 bg-slate-50">
              <button onClick={() => setPaymentModal(null)} className="px-6 py-2.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl font-bold transition-colors">انصراف</button>
              <button onClick={handleConfirmPayment} className="px-6 py-2.5 bg-emerald-600 text-white rounded-xl font-bold shadow-sm hover:bg-emerald-700 transition-all flex items-center gap-2">
                <Check className="w-5 h-5" /> ثبت پرداخت و تسویه قسط
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PRINT REPORT MODAL */}
      {printModalContract && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 print:p-0">
          <div className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] print:max-h-full print:shadow-none print:w-full">
            <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50 print:hidden">
              <h3 className="font-bold text-slate-800 flex items-center gap-2 text-base">
                <Printer className="w-5 h-5 text-indigo-600" />
                پیش‌نمایش چاپ گزارش قرارداد اجاره ({printModalContract.contractNumber})
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-sm"
                >
                  <Printer className="w-4 h-4" />
                  <span>چاپ</span>
                </button>
                <button onClick={() => setPrintModalContract(null)} className="p-2 bg-slate-200 hover:bg-slate-300 rounded-xl transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-8 overflow-y-auto space-y-6 text-slate-800" id="print-area">
              <div className="border-b border-slate-300 pb-4 text-center">
                <h2 className="text-xl font-extrabold">{storeSettings?.storeName || 'سیستم مدیریت مالی'}</h2>
                <h3 className="text-base font-bold text-slate-600 mt-1">گزارش وضعیت مالی و جدول اقساط قرارداد اجاره</h3>
                <p className="text-xs text-slate-400 mt-1">تاریخ گزارش: {new DateObject({ calendar: persian, locale: persian_fa }).format('YYYY/MM/DD')}</p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                <div><span className="text-slate-500">شماره قرارداد:</span> <strong className="font-mono">{printModalContract.contractNumber}</strong></div>
                <div><span className="text-slate-500">طرف قرارداد:</span> <strong>{getPersonName(printModalContract.personId)}</strong></div>
                <div><span className="text-slate-500">مبلغ قسط:</span> <strong className="font-mono">{Number(printModalContract.monthlyAmount).toLocaleString()} {currencyUnit}</strong></div>
                <div><span className="text-slate-500">مبلغ ودیعه:</span> <strong className="font-mono">{Number(printModalContract.depositAmount || 0).toLocaleString()} {currencyUnit}</strong></div>
              </div>

              <table className="w-full text-right text-xs border border-slate-300 border-collapse">
                <thead className="bg-slate-100 border-b border-slate-300">
                  <tr>
                    <th className="p-2.5 border border-slate-300 text-center">ردیف</th>
                    <th className="p-2.5 border border-slate-300">عنوان قسط</th>
                    <th className="p-2.5 border border-slate-300 text-center">تاریخ سررسید</th>
                    <th className="p-2.5 border border-slate-300 text-center">مبلغ ({currencyUnit})</th>
                    <th className="p-2.5 border border-slate-300 text-center">وضعیت تعهد</th>
                    <th className="p-2.5 border border-slate-300 text-center">وضعیت تسویه</th>
                  </tr>
                </thead>
                <tbody>
                  {(printModalContract.schedule || []).map((inst: RentInstallment, i: number) => (
                    <tr key={inst.id} className="border-b border-slate-200">
                      <td className="p-2 border border-slate-300 text-center font-mono">{toPersianDigits(i + 1)}</td>
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

      {/* DELETE CONFIRMATION MODAL */}
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
              <button onClick={() => setDeleteId(null)} className="flex-1 py-2.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl font-bold transition-colors">انصراف</button>
              <button onClick={handleDelete} className="flex-1 py-2.5 bg-rose-600 text-white rounded-xl font-bold shadow-sm hover:bg-rose-700 transition-all">حذف قرارداد</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
