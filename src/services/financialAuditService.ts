import {
  getAccountingDocuments,
  addAccountingDocument,
  getInvoices,
  getTransactions,
  getPersons,
  getLedgerAccounts,
  getIssuedChecks,
  getReceivedChecks,
  getLoans,
  getInstallments,
  getPayslips,
  getAccounts,
  getCashboxes,
  getStoreSettings,
  getActiveFinancialYear,
  checkFinancialYear,
} from './dataService';
import { syncInvoiceAccountingDocument } from './invoiceService';
import { syncCheckAccountingDocument } from './accountingService';
import { convertToGregorian, formatPrice } from '../utils/format';

export interface UnvoucheredItem {
  id: string;
  originalId: string | number;
  category: 'transaction' | 'invoice' | 'payroll' | 'check' | 'loan' | 'installment';
  categoryLabel: string;
  title: string;
  subTitle?: string;
  date: string;
  amount: number;
  personName?: string;
  personId?: string | number;
  typeBadge: {
    label: string;
    color: string;
  };
  details: Record<string, any>;
  rawEntity: any;
  missingReason: string;
}

export interface UnvoucheredAuditResult {
  items: UnvoucheredItem[];
  counts: {
    all: number;
    transaction: number;
    invoice: number;
    payroll: number;
    check: number;
    loan: number;
    installment: number;
  };
  amounts: {
    all: number;
    transaction: number;
    invoice: number;
    payroll: number;
    check: number;
    loan: number;
    installment: number;
  };
  summaryText: string;
}

/**
 * Scan all financial domains to find operations without an approved accounting document
 */
export const scanUnvoucheredFinancials = async (): Promise<UnvoucheredAuditResult> => {
  const [
    rawDocs,
    rawInvoices,
    rawTransactions,
    rawPersons,
    rawIssuedChecks,
    rawReceivedChecks,
    rawLoans,
    rawInstallments,
    rawPayslips,
  ] = await Promise.all([
    getAccountingDocuments().catch(() => []),
    getInvoices().catch(() => []),
    getTransactions().catch(() => []),
    getPersons().catch(() => []),
    getIssuedChecks().catch(() => []),
    getReceivedChecks().catch(() => []),
    getLoans().catch(() => []),
    getInstallments().catch(() => []),
    getPayslips().catch(() => []),
  ]);

  const docs = (rawDocs || []).filter((d: any) => !d.isDeleted && d.status !== 'voided');
  const personsMap = new Map<string, any>();
  (rawPersons || []).forEach((p: any) => {
    personsMap.set(String(p.id), p);
  });

  const getPersonName = (id: any) => {
    if (!id) return 'نامشخص / عمومی';
    const p = personsMap.get(String(id));
    return p ? (p.name || `${p.firstName || ''} ${p.lastName || ''}`.trim()) : `شخص با شناسه ${id}`;
  };

  const unvoucheredList: UnvoucheredItem[] = [];

  // 1. Scan Transactions (دریافت، پرداخت، انتقال، هزینه، درآمد)
  (rawTransactions || []).forEach((t: any) => {
    if (t.isDeleted) return;
    const exists = docs.some(
      (d: any) =>
        ['receipt', 'payment', 'transfer', 'salary', 'expense', 'income'].includes(d.sourceType || '') &&
        String(d.sourceId) === String(t.id)
    );

    if (!exists) {
      let typeLabel = 'دریافت وجه';
      let typeColor = 'bg-emerald-100 text-emerald-800 border-emerald-200';
      if (t.type === 'pay') {
        typeLabel = 'پرداخت وجه';
        typeColor = 'bg-rose-100 text-rose-800 border-rose-200';
      } else if (t.type === 'transfer') {
        typeLabel = 'انتقال داخلی';
        typeColor = 'bg-indigo-100 text-indigo-800 border-indigo-200';
      } else if (t.type === 'expense') {
        typeLabel = 'ثبت هزینه';
        typeColor = 'bg-amber-100 text-amber-800 border-amber-200';
      } else if (t.type === 'income') {
        typeLabel = 'ثبت درآمد';
        typeColor = 'bg-teal-100 text-teal-800 border-teal-200';
      }

      unvoucheredList.push({
        id: `tx_${t.id}`,
        originalId: t.id,
        category: 'transaction',
        categoryLabel: 'دریافت و پرداخت',
        title: t.description || `${typeLabel} شماره ${t.receiptNumber || t.id}`,
        subTitle: t.receiptNumber ? `شماره رسید: ${t.receiptNumber}` : undefined,
        date: t.date || (t.createdAt ? new Date(t.createdAt).toISOString().split('T')[0] : ''),
        amount: Number(t.amount) || 0,
        personName: getPersonName(t.personId),
        personId: t.personId,
        typeBadge: { label: typeLabel, color: typeColor },
        details: {
          method: t.method,
          resourceType: t.resourceType,
          resourceId: t.resourceId || t.accountId || t.cashboxId,
        },
        rawEntity: t,
        missingReason: 'سند حسابداری دوطرفه برای این تراکنش مالی در دفاتر ثبت نشده است.',
      });
    }
  });

  // 2. Scan Invoices (فاکتورهای فروش، خرید، برگشت از فروش، برگشت از خرید)
  (rawInvoices || []).forEach((inv: any) => {
    if (inv.isDeleted || inv.isDraft || inv.status === 'draft' || inv.status === 'voided') return;
    if (inv.type === 'proforma' || inv.type?.startsWith('warehouse_')) return;

    const exists = docs.some(
      (d: any) =>
        (d.sourceType?.startsWith('invoice') || ['invoice_sale', 'invoice_purchase', 'invoice_sale_return', 'invoice_purchase_return'].includes(d.sourceType || '')) &&
        (String(d.sourceId) === String(inv.id) || String(d.sourceId) === String(inv.invoiceNumber))
    );

    if (!exists) {
      let typeLabel = 'فاکتور فروش';
      let typeColor = 'bg-blue-100 text-blue-800 border-blue-200';
      if (inv.type === 'purchase') {
        typeLabel = 'فاکتور خرید';
        typeColor = 'bg-amber-100 text-amber-800 border-amber-200';
      } else if (inv.type === 'sale_return') {
        typeLabel = 'برگشت از فروش';
        typeColor = 'bg-purple-100 text-purple-800 border-purple-200';
      } else if (inv.type === 'purchase_return') {
        typeLabel = 'برگشت از خرید';
        typeColor = 'bg-orange-100 text-orange-800 border-orange-200';
      }

      unvoucheredList.push({
        id: `inv_${inv.id}`,
        originalId: inv.id,
        category: 'invoice',
        categoryLabel: 'فاکتورها',
        title: `${typeLabel} شماره ${inv.invoiceNumber || inv.id}`,
        subTitle: inv.customerName ? `مشتری: ${inv.customerName}` : undefined,
        date: inv.date || (inv.createdAt ? new Date(inv.createdAt).toISOString().split('T')[0] : ''),
        amount: Number(inv.totalAmount) || 0,
        personName: inv.customerName || getPersonName(inv.customerId),
        personId: inv.customerId,
        typeBadge: { label: typeLabel, color: typeColor },
        details: {
          itemsCount: inv.items?.length || 0,
          status: inv.status,
          invoiceType: inv.type,
        },
        rawEntity: inv,
        missingReason: 'سند قطعی فروش/خرید و گردش حساب شخص و درآمد/موجودی صادر نشده است.',
      });
    }
  });

  // 3. Scan Payroll / Payslips (فیش‌های حقوق و دستمزد)
  (rawPayslips || []).forEach((slip: any) => {
    if (slip.isDeleted) return;
    const exists = docs.some(
      (d: any) =>
        ['salary', 'payroll'].includes(d.sourceType || '') &&
        String(d.sourceId) === String(slip.id)
    );

    if (!exists) {
      const monthNames = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'];
      const monthStr = monthNames[(slip.periodMonth || 1) - 1] || slip.periodMonth;

      unvoucheredList.push({
        id: `slip_${slip.id}`,
        originalId: slip.id,
        category: 'payroll',
        categoryLabel: 'حقوق و دستمزد',
        title: `فیش حقوقی ${monthStr} ${slip.periodYear || ''} - ${getPersonName(slip.personId)}`,
        subTitle: slip.status === 'finalized' ? 'وضعیت: نهایی‌شده' : 'وضعیت: پیش‌نویس محاسباتی',
        date: slip.date || (slip.createdAt ? new Date(slip.createdAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]),
        amount: Number(slip.netSalary) || Number(slip.totalGross) || 0,
        personName: getPersonName(slip.personId),
        personId: slip.personId,
        typeBadge: {
          label: 'حقوق پرسنل',
          color: 'bg-violet-100 text-violet-800 border-violet-200',
        },
        details: {
          gross: slip.totalGross,
          deductions: slip.totalDeductions,
          net: slip.netSalary,
          period: `${monthStr} ${slip.periodYear}`,
        },
        rawEntity: slip,
        missingReason: 'سند شناسایی هزینه حقوق پرسنل و بستانکاری کارمند ثبت نگردیده است.',
      });
    }
  });

  // 4. Scan Checks (چک‌های صادره و دریافتی)
  // 4.1 Issued Checks
  (rawIssuedChecks || []).forEach((c: any) => {
    if (c.isDeleted) return;
    const initExists = docs.some(
      (d: any) => d.sourceType === 'check_issued_init' && String(d.sourceId) === String(c.id)
    );

    if (!initExists) {
      unvoucheredList.push({
        id: `chk_iss_${c.id}`,
        originalId: c.id,
        category: 'check',
        categoryLabel: 'چک و بانک',
        title: `صدور چک شماره ${c.checkNumber || c.id} عهده بانک ${c.bankName || ''}`,
        subTitle: `سررسید: ${c.dueDate || '-'} | گیرنده: ${getPersonName(c.payeeId)}`,
        date: c.issueDate || c.date || (c.createdAt ? new Date(c.createdAt).toISOString().split('T')[0] : ''),
        amount: Number(c.amount) || 0,
        personName: getPersonName(c.payeeId),
        personId: c.payeeId,
        typeBadge: {
          label: 'چک پرداختی (صدور اولیه)',
          color: 'bg-rose-100 text-rose-800 border-rose-200',
        },
        details: {
          checkType: 'issued',
          stage: 'init',
          checkNumber: c.checkNumber,
          bankName: c.bankName,
          status: c.status,
        },
        rawEntity: { ...c, _checkType: 'issued', _stage: 'init' },
        missingReason: 'سند حسابداری صدور چک (بدهکار شخص / بستانکار اسناد پرداختنی) موجود نیست.',
      });
    }

    // Check status doc (pass/cleared/bounced)
    if (c.status && c.status !== 'pending') {
      const statusDocExists = docs.some(
        (d: any) => d.sourceType === 'check_issued_status' && String(d.sourceId) === `${c.id}_${c.status}`
      );
      if (!statusDocExists) {
        let stLabel = c.status === 'cleared' || c.status === 'passed' ? 'پاس/وصول' : c.status === 'bounced' ? 'برگشت' : c.status;
        unvoucheredList.push({
          id: `chk_iss_st_${c.id}`,
          originalId: c.id,
          category: 'check',
          categoryLabel: 'چک و بانک',
          title: `تغییر وضعیت چک صادره ${c.checkNumber} به ${stLabel}`,
          subTitle: `بانک عامل: ${c.bankName || '-'}`,
          date: c.statusDate || c.dueDate || new Date().toISOString().split('T')[0],
          amount: Number(c.amount) || 0,
          personName: getPersonName(c.payeeId),
          personId: c.payeeId,
          typeBadge: {
            label: `چک پرداختی (${stLabel})`,
            color: 'bg-amber-100 text-amber-800 border-amber-200',
          },
          details: {
            checkType: 'issued',
            stage: 'status',
            status: c.status,
            checkNumber: c.checkNumber,
          },
          rawEntity: { ...c, _checkType: 'issued', _stage: 'status' },
          missingReason: `سند حسابداری تسویه و کسر از بانک بابت تغییر وضعیت چک به "${stLabel}" صادر نشده است.`,
        });
      }
    }
  });

  // 4.2 Received Checks
  (rawReceivedChecks || []).forEach((c: any) => {
    if (c.isDeleted) return;
    const initExists = docs.some(
      (d: any) => d.sourceType === 'check_received_init' && String(d.sourceId) === String(c.id)
    );

    if (!initExists) {
      unvoucheredList.push({
        id: `chk_rec_${c.id}`,
        originalId: c.id,
        category: 'check',
        categoryLabel: 'چک و بانک',
        title: `دریافت چک شماره ${c.checkNumber || c.id} عهده بانک ${c.bankName || ''}`,
        subTitle: `سررسید: ${c.dueDate || '-'} | واگذارکننده: ${getPersonName(c.payerId)}`,
        date: c.issueDate || c.date || (c.createdAt ? new Date(c.createdAt).toISOString().split('T')[0] : ''),
        amount: Number(c.amount) || 0,
        personName: getPersonName(c.payerId),
        personId: c.payerId,
        typeBadge: {
          label: 'چک دریافتی (ورود اولیه)',
          color: 'bg-emerald-100 text-emerald-800 border-emerald-200',
        },
        details: {
          checkType: 'received',
          stage: 'init',
          checkNumber: c.checkNumber,
          bankName: c.bankName,
          status: c.status,
        },
        rawEntity: { ...c, _checkType: 'received', _stage: 'init' },
        missingReason: 'سند حسابداری ورود چک (بدهکار اسناد دریافتنی / بستانکار شخص) صادر نشده است.',
      });
    }

    // Check status doc (deposited / cleared / bounced)
    if (c.status && c.status !== 'pending' && c.status !== 'normal') {
      const statusDocExists = docs.some(
        (d: any) => d.sourceType === 'check_received_status' && String(d.sourceId) === `${c.id}_${c.status}`
      );
      if (!statusDocExists) {
        let stLabel = c.status === 'cleared' ? 'وصول نهایی' : c.status === 'deposited' ? 'واگذاری به بانک' : c.status === 'bounced' ? 'برگشت' : c.status;
        unvoucheredList.push({
          id: `chk_rec_st_${c.id}`,
          originalId: c.id,
          category: 'check',
          categoryLabel: 'چک و بانک',
          title: `تغییر وضعیت چک دریافتی ${c.checkNumber} به ${stLabel}`,
          subTitle: `پرداخت‌کننده: ${getPersonName(c.payerId)}`,
          date: c.statusDate || c.dueDate || new Date().toISOString().split('T')[0],
          amount: Number(c.amount) || 0,
          personName: getPersonName(c.payerId),
          personId: c.payerId,
          typeBadge: {
            label: `چک دریافتی (${stLabel})`,
            color: 'bg-teal-100 text-teal-800 border-teal-200',
          },
          details: {
            checkType: 'received',
            stage: 'status',
            status: c.status,
            checkNumber: c.checkNumber,
          },
          rawEntity: { ...c, _checkType: 'received', _stage: 'status' },
          missingReason: `سند حسابداری تغییر وضعیت چک دریافتی به "${stLabel}" صادر نشده است.`,
        });
      }
    }
  });

  // 5. Scan Loans (وام‌های اعطایی یا دریافتی)
  (rawLoans || []).forEach((l: any) => {
    if (l.isDeleted || l.status === 'cancelled') return;
    const exists = docs.some(
      (d: any) => d.sourceType === 'loan' && String(d.sourceId) === String(l.id)
    );

    if (!exists) {
      const isGiven = l.type === 'given';
      unvoucheredList.push({
        id: `loan_${l.id}`,
        originalId: l.id,
        category: 'loan',
        categoryLabel: 'وام و تسهیلات',
        title: `وام ${isGiven ? 'اعطایی به' : 'دریافتی از'} ${getPersonName(l.personId)}`,
        subTitle: `شماره وام: ${l.loanNumber || l.id} | تعداد اقساط: ${l.totalInstallments || '-'}`,
        date: l.startDate || (l.createdAt ? new Date(l.createdAt).toISOString().split('T')[0] : ''),
        amount: Number(l.amount) || 0,
        personName: getPersonName(l.personId),
        personId: l.personId,
        typeBadge: {
          label: isGiven ? 'وام پرداختی' : 'وام دریافتی',
          color: isGiven ? 'bg-cyan-100 text-cyan-800 border-cyan-200' : 'bg-pink-100 text-pink-800 border-pink-200',
        },
        details: {
          loanType: l.type,
          installmentsCount: l.totalInstallments,
          installmentAmount: l.installmentAmount,
        },
        rawEntity: l,
        missingReason: 'سند افتتاح و واگذاری اصل وام و کارمزد مربوطه ثبت نگردیده است.',
      });
    }
  });

  // 6. Scan Installments (اقساط پرداخت‌شده بدون سند)
  const loansMap = new Map<string, any>();
  (rawLoans || []).forEach((l: any) => loansMap.set(String(l.id), l));

  (rawInstallments || []).forEach((inst: any) => {
    if (inst.status !== 'paid' || inst.isDeleted) return;

    const exists = docs.some(
      (d: any) =>
        (d.sourceType === 'installment' && String(d.sourceId) === String(inst.id)) ||
        (inst.receiptId && (d.sourceType === 'receipt' || d.sourceType === 'payment') && String(d.sourceId) === String(inst.receiptId))
    );

    if (!exists) {
      const loan = loansMap.get(String(inst.loanId));
      const personId = loan?.personId;
      unvoucheredList.push({
        id: `inst_${inst.id}`,
        originalId: inst.id,
        category: 'installment',
        categoryLabel: 'اقساط وام',
        title: `تسویه قسط شماره ${inst.installmentNumber || inst.number || ''} ${loan ? `(وام ${loan.loanNumber || loan.id})` : ''}`,
        subTitle: `تاریخ تسویه: ${inst.paidDate || '-'}`,
        date: inst.paidDate || inst.dueDate || (inst.createdAt ? new Date(inst.createdAt).toISOString().split('T')[0] : ''),
        amount: Number(inst.paidAmount) || Number(inst.amount) || 0,
        personName: getPersonName(personId),
        personId: personId,
        typeBadge: {
          label: 'تسویه قسط',
          color: 'bg-emerald-100 text-emerald-800 border-emerald-200',
        },
        details: {
          loanId: inst.loanId,
          installmentNumber: inst.installmentNumber || inst.number,
          paidDate: inst.paidDate,
        },
        rawEntity: { ...inst, _relatedLoan: loan },
        missingReason: 'سند حسابداری تسویه این قسط و استهلاک بدهی/طلب وام در دفاتر موجود نیست.',
      });
    }
  });

  // Sort by date descending
  unvoucheredList.sort((a, b) => {
    const da = new Date(a.date || 0).getTime();
    const db = new Date(b.date || 0).getTime();
    return db - da;
  });

  // Aggregate stats
  const counts = {
    all: unvoucheredList.length,
    transaction: 0,
    invoice: 0,
    payroll: 0,
    check: 0,
    loan: 0,
    installment: 0,
  };

  const amounts = {
    all: 0,
    transaction: 0,
    invoice: 0,
    payroll: 0,
    check: 0,
    loan: 0,
    installment: 0,
  };

  unvoucheredList.forEach((item) => {
    counts[item.category] = (counts[item.category] || 0) + 1;
    amounts[item.category] = (amounts[item.category] || 0) + item.amount;
    amounts.all += item.amount;
  });

  const summaryText =
    counts.all === 0
      ? 'تمامی عملیات‌های مالی دارای سند حسابداری تراز و معتبر هستند.'
      : `تعداد ${counts.all} عملیات مالی فاقد سند حسابداری به ارزش کل ${formatPrice(amounts.all)} تومان شناسایی شد.`;

  return {
    items: unvoucheredList,
    counts,
    amounts,
    summaryText,
  };
};

/**
 * Helper to build standard debtor/creditor ledger journal items
 */
export const buildVoucherJournalPreview = async (
  item: UnvoucheredItem
): Promise<{
  description: string;
  date: string;
  sourceType: string;
  sourceId: string | number;
  items: Array<{
    ledgerAccountId: string | number;
    detailedAccountId?: string | number;
    accountCode?: string;
    accountTitle?: string;
    description: string;
    debit: number;
    credit: number;
  }>;
}> => {
  const [ledgerAccounts, persons, bankAccounts, cashboxes] = await Promise.all([
    getLedgerAccounts().catch(() => []),
    getPersons().catch(() => []),
    getAccounts().catch(() => []),
    getCashboxes().catch(() => []),
  ]);

  const defaultLedger = ledgerAccounts.length > 0 ? ledgerAccounts[0].id : '';

  const getPersonLedgerAcc = (personId: string | number | undefined) => {
    if (!personId) return defaultLedger;
    const person = (persons || []).find((p: any) => String(p.id) === String(personId));
    if (!person || !person.accountingCode) return defaultLedger;
    const acc = ledgerAccounts.find((a: any) => a.code === person.accountingCode);
    return acc ? acc.id : defaultLedger;
  };

  const getAccByCode = (code: string) => {
    const acc = ledgerAccounts.find((a: any) => a.code === code);
    return acc ? acc.id : defaultLedger;
  };

  const getAccObj = (id: any) => {
    return ledgerAccounts.find((a: any) => String(a.id) === String(id));
  };

  const getResourceLedgerAcc = (t: any) => {
    const resType = t.resourceType || (t.accountId ? 'bank' : t.cashboxId ? 'cashbox' : '');
    const resId = t.resourceId || t.accountId || t.cashboxId;

    if (resType === 'bank' && resId) {
      const account = (bankAccounts || []).find((a: any) => String(a.id) === String(resId));
      if (account && account.accountingCode) {
        const acc = ledgerAccounts.find((a: any) => a.code === account.accountingCode);
        if (acc) return acc.id;
      }
      const fallback = ledgerAccounts.find((a: any) => a.code === '1102');
      if (fallback) return fallback.id;
    } else if (resType === 'cashbox' && resId) {
      const cashbox = (cashboxes || []).find((c: any) => String(c.id) === String(resId));
      if (cashbox && cashbox.accountingCode) {
        const acc = ledgerAccounts.find((a: any) => a.code === cashbox.accountingCode);
        if (acc) return acc.id;
      }
      const fallback = ledgerAccounts.find((a: any) => a.code === '1101');
      if (fallback) return fallback.id;
    }
    const fallback = ledgerAccounts.find((a: any) => a.code === '11');
    return fallback ? fallback.id : defaultLedger;
  };

  const raw = item.rawEntity;
  const journalItems: any[] = [];
  let description = item.title;
  let sourceType = 'manual';
  let sourceId = item.originalId;
  const total = Number(item.amount) || 0;

  if (item.category === 'transaction') {
    sourceType = raw.type === 'receive' ? 'receipt' : raw.type === 'pay' ? 'payment' : raw.type;
    const resourceLedger = getResourceLedgerAcc(raw);
    const personLedger = getPersonLedgerAcc(raw.personId);

    if (raw.type === 'receive') {
      journalItems.push({
        ledgerAccountId: resourceLedger,
        description: `بدهکار - دریافت وجه (بانک/صندوق) بابت ${item.title}`,
        debit: total,
        credit: 0,
      });
      journalItems.push({
        ledgerAccountId: personLedger,
        detailedAccountId: raw.personId,
        description: `بستانکار - طرف حساب ${item.personName || ''}`,
        debit: 0,
        credit: total,
      });
    } else if (raw.type === 'pay') {
      journalItems.push({
        ledgerAccountId: personLedger,
        detailedAccountId: raw.personId,
        description: `بدهکار - طرف حساب ${item.personName || ''}`,
        debit: total,
        credit: 0,
      });
      journalItems.push({
        ledgerAccountId: resourceLedger,
        description: `بستانکار - پرداخت وجه از منابع (بانک/صندوق)`,
        debit: 0,
        credit: total,
      });
    } else if (raw.type === 'transfer') {
      const destResource = raw.destAccountId ? getResourceLedgerAcc({ resourceType: 'bank', accountId: raw.destAccountId }) : getResourceLedgerAcc({ resourceType: 'cashbox', cashboxId: raw.destCashboxId });
      journalItems.push({
        ledgerAccountId: destResource,
        description: `بدهکار - مقصد انتقال`,
        debit: total,
        credit: 0,
      });
      journalItems.push({
        ledgerAccountId: resourceLedger,
        description: `بستانکار - مبدا انتقال`,
        debit: 0,
        credit: total,
      });
    } else if (raw.type === 'expense') {
      const expAcc = getAccByCode('51') || getAccByCode('5') || defaultLedger;
      journalItems.push({
        ledgerAccountId: expAcc,
        description: `بدهکار - هزینه: ${raw.description || ''}`,
        debit: total,
        credit: 0,
      });
      journalItems.push({
        ledgerAccountId: resourceLedger,
        description: `بستانکار - پرداخت از منابع`,
        debit: 0,
        credit: total,
      });
    } else {
      const incAcc = getAccByCode('41') || getAccByCode('4') || defaultLedger;
      journalItems.push({
        ledgerAccountId: resourceLedger,
        description: `بدهکار - دریافت به منابع`,
        debit: total,
        credit: 0,
      });
      journalItems.push({
        ledgerAccountId: incAcc,
        description: `بستانکار - درآمد: ${raw.description || ''}`,
        debit: 0,
        credit: total,
      });
    }
  } else if (item.category === 'invoice') {
    const isSale = raw.type === 'sale' || raw.type === 'purchase_return';
    sourceType = raw.type.includes('sale') ? 'invoice_sale' : 'invoice_purchase';
    const personLedger = getPersonLedgerAcc(raw.customerId);
    const salesAcc = getAccByCode('41');
    const inventoryAcc = getAccByCode('13');

    if (isSale) {
      journalItems.push({
        ledgerAccountId: personLedger,
        detailedAccountId: raw.customerId,
        description: `بدهکار - خریدار / طرف حساب ${item.personName || ''}`,
        debit: total,
        credit: 0,
      });
      journalItems.push({
        ledgerAccountId: salesAcc,
        description: `بستانکار - درآمد حاصل از فروش کالا/خدمات`,
        debit: 0,
        credit: total,
      });
    } else {
      journalItems.push({
        ledgerAccountId: inventoryAcc,
        description: `بدهکار - موجودی کالا / خرید`,
        debit: total,
        credit: 0,
      });
      journalItems.push({
        ledgerAccountId: personLedger,
        detailedAccountId: raw.customerId,
        description: `بستانکار - فروشنده / طرف حساب ${item.personName || ''}`,
        debit: 0,
        credit: total,
      });
    }
  } else if (item.category === 'payroll') {
    sourceType = 'salary';
    const salaryExpAcc = getAccByCode('5001') || getAccByCode('51') || getAccByCode('5') || defaultLedger;
    const employeeLedger = getPersonLedgerAcc(raw.personId);
    const deductionsAcc = getAccByCode('2002') || getAccByCode('21') || defaultLedger;

    const gross = Number(raw.totalGross) || total;
    const net = Number(raw.netSalary) || total;
    const deductions = Number(raw.totalDeductions) || 0;

    journalItems.push({
      ledgerAccountId: salaryExpAcc,
      description: `بدهکار - هزینه حقوق و دستمزد پرسنل`,
      debit: gross,
      credit: 0,
    });
    journalItems.push({
      ledgerAccountId: employeeLedger,
      detailedAccountId: raw.personId,
      description: `بستانکار - حقوق پرداختنی به ${item.personName || ''}`,
      debit: 0,
      credit: net,
    });
    if (deductions > 0) {
      journalItems.push({
        ledgerAccountId: deductionsAcc,
        description: `بستانکار - کسورات قانونی و بیمه/مالیات فیش حقوقی`,
        debit: 0,
        credit: deductions,
      });
    }
  } else if (item.category === 'check') {
    const isIssued = raw._checkType === 'issued';
    const isStageStatus = raw._stage === 'status';
    const notesReceivable = getAccByCode('1202') || getAccByCode('12') || defaultLedger;
    const notesPayable = getAccByCode('2102') || getAccByCode('21') || defaultLedger;
    const inProcess = getAccByCode('1203') || notesReceivable;
    const bankAcc = getAccByCode('1102') || defaultLedger;
    const personLedger = getPersonLedgerAcc(isIssued ? raw.payeeId : raw.payerId);
    const personId = isIssued ? raw.payeeId : raw.payerId;

    if (!isStageStatus) {
      // Init Check
      sourceType = isIssued ? 'check_issued_init' : 'check_received_init';
      if (isIssued) {
        journalItems.push({
          ledgerAccountId: personLedger,
          detailedAccountId: personId,
          description: `بدهکار - طرف حساب ${item.personName} بابت صدور چک`,
          debit: total,
          credit: 0,
        });
        journalItems.push({
          ledgerAccountId: notesPayable,
          description: `بستانکار - اسناد پرداختنی تجاری شماره ${raw.checkNumber}`,
          debit: 0,
          credit: total,
        });
      } else {
        journalItems.push({
          ledgerAccountId: notesReceivable,
          description: `بدهکار - اسناد دریافتنی تجاری شماره ${raw.checkNumber}`,
          debit: total,
          credit: 0,
        });
        journalItems.push({
          ledgerAccountId: personLedger,
          detailedAccountId: personId,
          description: `بستانکار - طرف حساب ${item.personName} بابت دریافت چک`,
          debit: 0,
          credit: total,
        });
      }
    } else {
      // Status transition
      sourceType = isIssued ? 'check_issued_status' : 'check_received_status';
      sourceId = `${raw.id}_${raw.status}`;
      if (isIssued) {
        // Issued check passed
        journalItems.push({
          ledgerAccountId: notesPayable,
          description: `بدهکار - اسناد پرداختنی بابت پاس شدن چک ${raw.checkNumber}`,
          debit: total,
          credit: 0,
        });
        journalItems.push({
          ledgerAccountId: bankAcc,
          description: `بستانکار - کسر از موجودی بانک عامل`,
          debit: 0,
          credit: total,
        });
      } else {
        // Received check deposited/cleared
        if (raw.status === 'deposited') {
          journalItems.push({
            ledgerAccountId: inProcess,
            description: `بدهکار - اسناد در جریان وصول چک ${raw.checkNumber}`,
            debit: total,
            credit: 0,
          });
          journalItems.push({
            ledgerAccountId: notesReceivable,
            description: `بستانکار - اسناد دریافتنی نزد صندوق`,
            debit: 0,
            credit: total,
          });
        } else {
          // Cleared
          journalItems.push({
            ledgerAccountId: bankAcc,
            description: `بدهکار - واریز به بانک بابت وصول چک ${raw.checkNumber}`,
            debit: total,
            credit: 0,
          });
          journalItems.push({
            ledgerAccountId: inProcess,
            description: `بستانکار - اسناد در جریان وصول`,
            debit: 0,
            credit: total,
          });
        }
      }
    }
  } else if (item.category === 'loan') {
    sourceType = 'loan';
    const isGiven = raw.type === 'given';
    const personLedger = getPersonLedgerAcc(raw.personId);
    const resourceLedger = getResourceLedgerAcc(raw);
    const interestInc = getAccByCode('42') || getAccByCode('4') || defaultLedger;
    const interestExp = getAccByCode('52') || getAccByCode('5') || defaultLedger;

    const principal = total;
    const installmentAmt = Number(raw.installmentAmount) || 0;
    const installmentsCount = Number(raw.totalInstallments) || 1;
    const totalRepay = installmentAmt * installmentsCount || principal;
    const interest = totalRepay > principal ? totalRepay - principal : 0;

    if (isGiven) {
      journalItems.push({
        ledgerAccountId: personLedger,
        detailedAccountId: raw.personId,
        description: `بدهکار - اصل و سود وام پرداختی به ${item.personName}`,
        debit: totalRepay,
        credit: 0,
      });
      journalItems.push({
        ledgerAccountId: resourceLedger,
        description: `بستانکار - پرداخت اصل وام از منابع مالی`,
        debit: 0,
        credit: principal,
      });
      if (interest > 0) {
        journalItems.push({
          ledgerAccountId: interestInc,
          description: `بستانکار - درآمد شناسایی شده سود تسهیلات اعطایی`,
          debit: 0,
          credit: interest,
        });
      }
    } else {
      journalItems.push({
        ledgerAccountId: resourceLedger,
        description: `بدهکار - واریز اصل وام دریافتی به حساب بانکی`,
        debit: principal,
        credit: 0,
      });
      if (interest > 0) {
        journalItems.push({
          ledgerAccountId: interestExp,
          description: `بدهکار - هزینه بهره و کارمزد وام دریافتی`,
          debit: interest,
          credit: 0,
        });
      }
      journalItems.push({
        ledgerAccountId: personLedger,
        detailedAccountId: raw.personId,
        description: `بستانکار - تعهد بازپرداخت وام به ${item.personName}`,
        debit: 0,
        credit: totalRepay,
      });
    }
  } else if (item.category === 'installment') {
    sourceType = 'installment';
    const relatedLoan = raw._relatedLoan;
    const isGiven = !relatedLoan || relatedLoan.type === 'given';
    const personLedger = getPersonLedgerAcc(relatedLoan?.personId || item.personId);
    const resourceLedger = getResourceLedgerAcc(raw);

    if (isGiven) {
      journalItems.push({
        ledgerAccountId: resourceLedger,
        description: `بدهکار - وصول مبلغ قسط از طرف حساب`,
        debit: total,
        credit: 0,
      });
      journalItems.push({
        ledgerAccountId: personLedger,
        detailedAccountId: relatedLoan?.personId || item.personId,
        description: `بستانکار - استهلاک قسط وام ${item.personName}`,
        debit: 0,
        credit: total,
      });
    } else {
      journalItems.push({
        ledgerAccountId: personLedger,
        detailedAccountId: relatedLoan?.personId || item.personId,
        description: `بدهکار - پرداخت و استهلاک قسط وام دریافتی`,
        debit: total,
        credit: 0,
      });
      journalItems.push({
        ledgerAccountId: resourceLedger,
        description: `بستانکار - کسر از منابع مالی (بانک/صندوق)`,
        debit: 0,
        credit: total,
      });
    }
  }

  // Populate human-readable account titles & codes
  const enrichedItems = journalItems.map((ji) => {
    const acc = getAccObj(ji.ledgerAccountId);
    return {
      ...ji,
      accountCode: acc?.code || '',
      accountTitle: acc?.title || 'حساب معین پیش‌فرض',
    };
  });

  return {
    description,
    date: item.date || new Date().toISOString().split('T')[0],
    sourceType,
    sourceId,
    items: enrichedItems,
  };
};

/**
 * Execute voucher generation for a single unvouchered item
 */
export const issueVoucherForItem = async (item: UnvoucheredItem): Promise<boolean> => {
  // Check if specialized service handles it directly
  if (item.category === 'invoice') {
    await syncInvoiceAccountingDocument(item.rawEntity);
    return true;
  }

  if (item.category === 'check') {
    await syncCheckAccountingDocument(item.rawEntity._checkType, item.rawEntity);
    return true;
  }

  // Otherwise generate custom voucher
  const preview = await buildVoucherJournalPreview(item);
  if (!preview.items || preview.items.length < 2) {
    throw new Error('اقلام سند حسابداری کامل نیست.');
  }

  // Validate debit equals credit
  const totalDebit = preview.items.reduce((s, i) => s + (Number(i.debit) || 0), 0);
  const totalCredit = preview.items.reduce((s, i) => s + (Number(i.credit) || 0), 0);
  if (Math.abs(totalDebit - totalCredit) > 1) {
    throw new Error(`سند تراز نیست: بدهکار (${totalDebit}) با بستانکار (${totalCredit}) برابر نمی‌باشد.`);
  }

  const activeYear = await checkFinancialYear(preview.date).catch(() => null);

  await addAccountingDocument({
    date: convertToGregorian(preview.date).split('T')[0],
    description: preview.description,
    status: 'approved',
    sourceType: preview.sourceType,
    sourceId: preview.sourceId,
    isAutoGenerated: true,
    fiscalYearId: activeYear?.id,
    items: preview.items.map((i) => ({
      ledgerAccountId: i.ledgerAccountId,
      detailedAccountId: i.detailedAccountId,
      description: i.description,
      debit: i.debit,
      credit: i.credit,
    })),
  });

  return true;
};

/**
 * Batch issue vouchers for multiple unvouchered items
 */
export const issueVouchersBatch = async (
  items: UnvoucheredItem[],
  onProgress?: (current: number, total: number, lastTitle: string) => void
): Promise<{ successCount: number; failureCount: number; errors: string[] }> => {
  let successCount = 0;
  let failureCount = 0;
  const errors: string[] = [];

  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    if (onProgress) {
      onProgress(i + 1, items.length, it.title);
    }
    try {
      await issueVoucherForItem(it);
      successCount++;
    } catch (err: any) {
      console.error(`Failed to issue voucher for ${it.id}:`, err);
      failureCount++;
      errors.push(`${it.title}: ${err?.message || 'خطا در صدور سند'}`);
    }
  }

  return { successCount, failureCount, errors };
};
