import { Loan, Installment, SystemLog } from '../types';
import { getInstallments, saveInstallments, getTransactions, addTransaction, deleteTransaction, saveLoans, getLoans, addSystemLog, getAccounts, getPersons } from './dataService';
import { getLedgerAccounts, addAccountingDocument, getAccountingDocuments, updateAccountingDocument, addLoanHistoryEntry } from './accountingService';

export interface TransitionCheck {
  name: string;
  passed: boolean;
  detail: string;
}

export interface TransitionEligibility {
  allowed: boolean;
  fromStatus: string;
  toStatus: string;
  direction: 'forward' | 'rollback';
  checks: TransitionCheck[];
  sideEffects: string[];
  blockingReasons: string[];
  requiresReason: boolean;
}

const FORWARD_TRANSITIONS: Record<string, string[]> = {
  requested: ['incomplete', 'completed_dossier'],
  incomplete: ['completed_dossier'],
  completed_dossier: ['approved'],
  approved: ['active'],
  active: ['completed', 'overdue'],
  overdue: ['completed', 'active']
};

const ROLLBACK_TRANSITIONS: Record<string, string[]> = {
  incomplete: ['requested'],
  completed_dossier: ['incomplete', 'requested'],
  approved: ['completed_dossier', 'requested'],
  active: ['approved'], // Needs reversing accounting docs
  completed: ['active', 'overdue'],
  overdue: ['active']
};

export async function checkTransitionEligibility(
  loan: Loan, 
  targetStatus: Loan['status'], 
  userRole: string
): Promise<TransitionEligibility> {
  const fromStatus = loan.status;
  const isForward = FORWARD_TRANSITIONS[fromStatus]?.includes(targetStatus);
  const isRollback = ROLLBACK_TRANSITIONS[fromStatus]?.includes(targetStatus);
  
  const result: TransitionEligibility = {
    allowed: false,
    fromStatus,
    toStatus: targetStatus,
    direction: isForward ? 'forward' : isRollback ? 'rollback' : 'forward',
    checks: [],
    sideEffects: [],
    blockingReasons: [],
    requiresReason: isRollback
  };

  if (!isForward && !isRollback) {
    result.blockingReasons.push('این مسیر تغییر وضعیت تعریف نشده یا مجاز نیست.');
    return result;
  }

  // Common checks
  const isAdminOrManager = userRole === 'admin' || userRole === 'manager';
  
  if (isRollback && !isAdminOrManager) {
    result.checks.push({ name: 'سطح دسترسی', passed: false, detail: 'فقط مدیران سیستم قادر به بازگشت وضعیت هستند.' });
    result.blockingReasons.push('عدم دسترسی کافی برای بازگشت وضعیت.');
  } else {
    result.checks.push({ name: 'سطح دسترسی', passed: true, detail: 'دسترسی مجاز است.' });
  }

  // Specific forward checks
  if (targetStatus === 'completed') {
    const installments = await getInstallments();
    const loanInsts = installments.filter(i => i.loanId === loan.id);
    const hasUnpaid = loanInsts.some(i => i.status !== 'paid');
    
    if (hasUnpaid) {
      result.checks.push({ name: 'تسویه اقساط', passed: false, detail: 'هنوز اقساط پرداخت نشده وجود دارد.' });
      result.blockingReasons.push('برای تسویه وام باید تمامی اقساط پرداخت شده باشند.');
    } else {
      result.checks.push({ name: 'تسویه اقساط', passed: true, detail: 'تمامی اقساط پرداخت شده‌اند.' });
    }
  } else if (targetStatus === 'active') {
    // Ensure installments exist
    const installments = await getInstallments();
    const loanInsts = installments.filter(i => i.loanId === loan.id);
    if (loanInsts.length === 0) {
      result.checks.push({ name: 'جدول اقساط', passed: false, detail: 'جدول اقساط تولید نشده است.' });
      result.blockingReasons.push('قبل از پرداخت وام باید جدول اقساط آن تولید شود.');
    } else {
      result.checks.push({ name: 'جدول اقساط', passed: true, detail: 'جدول اقساط تولید شده است.' });
    }
  }

  if (targetStatus === 'active' && isForward) {
    result.sideEffects.push('صدور خودکار سند حسابداری پرداخت/دریافت وام');
    result.sideEffects.push('ایجاد تراکنش در صندوق/بانک');
  }

  // Specific rollback checks
  if (isRollback && fromStatus === 'active') {
    const installments = await getInstallments();
    const loanInsts = installments.filter(i => i.loanId === loan.id);
    const hasPaid = loanInsts.some(i => i.status === 'paid' || (i.paidAmount && i.paidAmount > 0) || i.receiptId);
    
    if (hasPaid) {
      result.checks.push({ name: 'عدم پرداخت اقساط', passed: false, detail: 'این وام دارای اقساط پرداخت شده است. ابتدا باید پرداخت اقساط لغو شود.' });
      result.blockingReasons.push('بازگشت از وضعیت فعال در حالی که قسطی پرداخت شده مجاز نیست.');
    } else {
      result.checks.push({ name: 'عدم پرداخت اقساط', passed: true, detail: 'هیچ قسطی هنوز پرداخت نشده است.' });
    }
    
    result.sideEffects.push('صدور تراکنش برگشتی (واریز) به صندوق/بانک');
    result.sideEffects.push('صدور سند حسابداری معکوس (اصلاحی) برای ابطال سند قبلی');
  }

  result.allowed = result.checks.every(c => c.passed) && result.blockingReasons.length === 0;

  return result;
}

import { convertToGregorian } from '../utils/format';
import { generateInstallmentCode, calculateInstallmentDates } from '../utils/installmentUtils';
import { globalDateFormatter } from '../utils/dateFormatter';

const toEnglishNumbers = (str: string) => {
    const persianNumbers = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
    let res = str;
    for (let i = 0; i < 10; i++) {
        res = res.replace(new RegExp(persianNumbers[i], 'g'), i.toString());
    }
    return res;
};

export async function applyTransition(
  loanId: string | number, 
  targetStatus: Loan['status'], 
  userRole: string, 
  reason?: string,
  userId?: string,
  dates?: { paymentDate: string, firstInstallmentDate: string }
) {
  const loans = await getLoans();
  const loan = loans.find(l => l.id === loanId);
  if (!loan) throw new Error('وام یافت نشد.');

  const eligibility = await checkTransitionEligibility(loan, targetStatus, userRole);
  if (!eligibility.allowed) {
    throw new Error(eligibility.blockingReasons.join(' - '));
  }

  if (eligibility.requiresReason && !reason) {
    throw new Error('وارد کردن دلیل برای این تغییر وضعیت الزامی است.');
  }

  const fromStatus = loan.status;
  
  // Here we use pseudo DB transaction logic with sequence of awaits.
  
  if (targetStatus === 'active' && eligibility.direction === 'forward') {
    // 1. Create Transaction
    const transactionId = `txn-loan-${loan.id}`;
    const txs = await getTransactions();
    if (!txs.find(t => t.id === transactionId)) {
        const interestAmt = (loan.totalInstallments * loan.installmentAmount) - loan.amount;
        // Find if accountId is bank or cashbox (we'll assume bank if not specified, since LoansManager currently sets accountId)
        // A robust fix would check if it's a cashbox or bank, but LoansManager form only provides accounts.
        const newTransaction = {
            interestAmount: interestAmt > 0 ? interestAmt : 0,
            id: transactionId,
            type: loan.type === 'given' ? 'pay' : 'receive',
            amount: loan.amount,
            method: 'account',
            resourceType: 'bank',
            resourceId: loan.accountId || '',
            accountId: loan.accountId || '',
            personId: loan.personId,
            categoryId: loan.type === 'given' ? 'loan_given' : 'loan_received',
            description: loan.type === 'given' ? `اعطای وام پرداختی شماره ${loan.loanNumber || loan.id}` : `اخذ وام دریافتی شماره ${loan.loanNumber || loan.id}`,
            date: dates?.paymentDate ? convertToGregorian(dates.paymentDate).split('T')[0] : new Date().toISOString().split('T')[0],
            jalaliDate: dates?.paymentDate ? dates.paymentDate : new Date().toLocaleDateString('fa-IR').replace(/\//g, '-'),
            documentNumber: `LOAN-${loan.loanNumber || loan.id}`,
            createdAt: new Date().toISOString(), skipAccounting: true
        };
        await addTransaction(newTransaction);
        
        // 2. Create Accounting Document
        const ledgerAccounts = await getLedgerAccounts();
        const pers = await getPersons();
        const bankAccounts = await getAccounts();
        
        const getPersonLedgerAcc = (pId: string | number) => {
            const person = pers.find(p => p.id?.toString() === pId.toString());
            if (!person || !person.accountingCode) return '';
            const lAcc = ledgerAccounts.find(a => a.code === person.accountingCode);
            return lAcc ? lAcc.id : '';
        };

        const getAccByCode = (code: string) => {
            const acc = ledgerAccounts.find(a => a.code === code);
            return acc ? acc.id : '';
        };

        let resourceLedgerId = '';
        if (loan.accountId) {
            const account = bankAccounts.find(a => a.id?.toString() === loan.accountId?.toString());
            if (account && account.accountingCode) {
                const accLedger = ledgerAccounts.find(a => a.code === account.accountingCode);
                resourceLedgerId = accLedger ? accLedger.id : '';
            }
        }

        const items = [];
        const principal = Number(loan.amount) || 0;
        const interest = interestAmt > 0 ? interestAmt : 0;
        const totalPayable = principal + interest;
        
        const interestIncomeAcc = getAccByCode('4');
        const interestExpenseAcc = getAccByCode('5');

        if (loan.type === 'given') {
            if (getPersonLedgerAcc(loan.personId)) items.push({ description: 'بدهکار - وام پرداختی (شخص)', debit: totalPayable, credit: 0, ledgerAccountId: getPersonLedgerAcc(loan.personId), detailedAccountId: loan.personId });
            if (resourceLedgerId) items.push({ description: 'بستانکار - منابع (بانک/صندوق)', debit: 0, credit: principal, ledgerAccountId: resourceLedgerId });
            if (interest > 0 && interestIncomeAcc) items.push({ description: 'بستانکار - درآمد بهره', debit: 0, credit: interest, ledgerAccountId: interestIncomeAcc });
        } else {
            if (resourceLedgerId) items.push({ description: 'بدهکار - منابع (بانک/صندوق)', debit: principal, credit: 0, ledgerAccountId: resourceLedgerId });
            if (interest > 0 && interestExpenseAcc) items.push({ description: 'بدهکار - هزینه بهره', debit: interest, credit: 0, ledgerAccountId: interestExpenseAcc });
            if (getPersonLedgerAcc(loan.personId)) items.push({ description: 'بستانکار - وام دریافتی (شخص)', debit: 0, credit: totalPayable, ledgerAccountId: getPersonLedgerAcc(loan.personId), detailedAccountId: loan.personId });
        }

        if (items.length >= 2 && items.every(i => i.ledgerAccountId)) {
            await addAccountingDocument({
                date: dates?.paymentDate ? convertToGregorian(dates.paymentDate).split('T')[0] : loan.startDate,
                description: `سند مکانیزه وام ${loan.type === 'given' ? 'پرداختی' : 'دریافتی'} شماره ${loan.loanNumber || loan.id}`,
                status: 'approved',
                sourceType: 'loan',
                sourceId: loan.id,
                items
            });
        }
    }
  } else if (eligibility.direction === 'rollback' && fromStatus === 'active') {
    // Reverse Accounting doc & Add reverse transaction instead of deleting
    const reverseTransaction = {
        id: `txn-rev-loan-${loan.id}-${Date.now()}`,
        accountId: loan.accountId,
        type: loan.type === 'given' ? 'deposit' : 'withdrawal',
        amount: Number(loan.amount),
        date: new Date().toISOString().split('T')[0],
        description: `برگشت تراکنش وام شماره ${loan.loanNumber || loan.id}`,
        personId: loan.personId,
        categoryId: 'loan_reversal',
        createdAt: new Date().toISOString(), 
        skipAccounting: true
    };
    await addTransaction(reverseTransaction as any);
    
    const docs = await getAccountingDocuments();
    const docToReverse = docs.find(d => d.sourceType === 'loan' && d.sourceId === loan.id && d.status === 'approved');
    
    if (docToReverse) {
       // DO NOT modify or delete the original document so history remains intact
       
       // Create reverse document
       const reversedItems = docToReverse.items.map((item: any) => ({
           ...item,
           debit: item.credit,
           credit: item.debit,
           description: `معکوس: ${item.description}`
       }));
       
       await addAccountingDocument({
           date: new Date().toISOString().split('T')[0],
           description: `سند اصلاحی بازگشت وضعیت وام ${loan.loanNumber || loan.id}`,
           status: 'approved',
           sourceType: 'loan_reversal',
           sourceId: loan.id,
           items: reversedItems
       });
    }
  }

  // Update loan status
  await addLoanHistoryEntry({
    loanId: loan.id,
    status: targetStatus,
    date: new Date().toISOString(),
    desc: reason || 'تغییر وضعیت',
    user: userId || 'سیستم'
  });

  const updatedLoan = { 
     ...loan, 
     status: targetStatus,
     ...(dates && targetStatus === 'active' ? { 
         paymentDate: convertToGregorian(dates.paymentDate).split('T')[0],
         firstInstallmentDate: convertToGregorian(dates.firstInstallmentDate).split('T')[0]
     } : {})
  };

  if (dates && targetStatus === 'active') {
      // Recalculate installments based on firstInstallmentDate
      const allInst = await getInstallments();
      const loanInst = allInst.filter((i: any) => i.loanId === loanId).sort((a: any, b: any) => a.installmentNumber - b.installmentNumber);
      
      let [initY, initM, initD] = toEnglishNumbers(dates.firstInstallmentDate).replace(/\//g, '-').split('-').map(Number);
      if (isNaN(initY)) {
          // fallback to ISO split
          const iso = convertToGregorian(dates.firstInstallmentDate).split('T')[0];
          const parts = iso.split('-');
          // Wait, initY/M/D needs to be Jalali so stepMonths logic works nicely, but convertToGregorian takes Jalali. 
          // If the user picked a Jalali date, toEnglishNumbers.replace... works.
      }
      
      const calendarType = globalDateFormatter.getConfig().calendarType === 'jalali' ? 'jalali' : 'gregorian';
      const firstDateIso = convertToGregorian(dates.firstInstallmentDate).split('T')[0];
      const newDates = calculateInstallmentDates(firstDateIso, loanInst.length, loan.frequency || 'monthly', calendarType);
      
      loanInst.forEach((inst: any, idx: number) => {
          inst.dueDate = newDates[idx];
          inst.installmentCode = generateInstallmentCode(loanId, loan.loanNumber, idx, newDates[idx]);
      });
      
      const otherInst = allInst.filter((i: any) => i.loanId !== loanId);
      await saveInstallments([...otherInst, ...loanInst]);
  }
  const updatedLoans = loans.map(l => l.id === loan.id ? updatedLoan : l);
  await saveLoans(updatedLoans);

  // Log status history
  await addSystemLog(
     'LOAN_STATUS_CHANGE', 
     `تغییر وضعیت وام از ${fromStatus} به ${targetStatus} ${reason ? `دلیل: ${reason}` : ''}`, 
     'Loan', 
     loan.id
  );

  return updatedLoan;
}
