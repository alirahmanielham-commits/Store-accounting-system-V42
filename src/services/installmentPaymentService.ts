import { getLocalData, getLoans, addTransaction, addSystemLog } from './dataService';
import { saveInstallments } from './accountingService';
import { getPersons } from './personService';
import { Installment, Loan, Account, Cashbox } from '../types';
import { applyTransition } from './loanStateMachine';
import { calculatePenalty } from '../utils/penaltyUtils';

export interface PaymentPreview {
    isFullPayment: boolean;
    isOverpayment: boolean;
    isPartial: boolean;
    penaltyAmount: number;
    amountDue: number; // Including penalty
    principalDue: number; // Just the installment remaining
    overpaymentAmount: number;
    allocations: { installmentId: string | number; amount: number; isPenalty: boolean }[];
}

export const lookupInstallmentByCode = async (code: string) => {
    const installments = await getLocalData<Installment[]>('installments', []);
    const inst = installments.find(i => i.installmentCode === code);
    
    if (!inst) {
        throw new Error('کد قسط یافت نشد');
    }
    
    const loans = await getLoans();
    const loan = loans.find(l => l.id.toString() === inst.loanId.toString());
    
    if (!loan) {
        throw new Error('وام مربوط به این قسط یافت نشد');
    }
    
    if (loan.status !== 'active' && loan.status !== 'overdue') {
         throw new Error(`این وام در وضعیت فعال یا معوق نیست (وضعیت فعلی: ${loan.status})`);
    }

    if (inst.status === 'paid') {
        throw new Error('این قسط قبلاً پرداخت شده است');
    }
    
    // Ensure previous installments are paid
    const loanInstallments = installments
        .filter(i => i.loanId.toString() === loan.id.toString())
        .sort((a, b) => (a.installmentNumber || 0) - (b.installmentNumber || 0));
        
    for (const i of loanInstallments) {
        if (i.id === inst.id) break;
        if (i.status !== 'paid') {
            throw new Error(`نمیتوانید این قسط را پرداخت کنید زیرا قسط شماره ${i.installmentNumber} هنوز پرداخت نشده است`);
        }
    }
    
    const persons = await getPersons();
    const person = persons.find(p => p.id.toString() === loan.personId.toString());

    return {
        installment: inst,
        loan,
        person,
        amountRemaining: inst.amount - (inst.paidAmount || 0),
        penaltyPaidAmount: inst.penaltyPaidAmount || 0,
    };
};

export const calculatePaymentPreview = async (
    installmentCode: string, 
    amountEntered: number
): Promise<PaymentPreview> => {
    const { installment, loan, amountRemaining } = await lookupInstallmentByCode(installmentCode);
    
    const totalAccruedPenalty = calculatePenalty(loan, installment);
    const penaltyAmount = Math.max(0, totalAccruedPenalty - (installment.penaltyPaidAmount || 0));
    
    const totalDueForThisInst = amountRemaining + penaltyAmount;
    
    const isFullPayment = amountEntered === totalDueForThisInst;
    const isOverpayment = amountEntered > totalDueForThisInst;
    const isPartial = amountEntered < totalDueForThisInst;
    
    const overpaymentAmount = isOverpayment ? amountEntered - totalDueForThisInst : 0;
    
    const allocations: { installmentId: string | number; amount: number; isPenalty: boolean }[] = [];
    
    const allocatedPenalty = Math.min(amountEntered, penaltyAmount);
    if (allocatedPenalty > 0) {
        allocations.push({ installmentId: installment.id, amount: allocatedPenalty, isPenalty: true });
    }
    
    const principalToPay = Math.min(Math.max(0, amountEntered - allocatedPenalty), amountRemaining);
    if (principalToPay > 0) {
        allocations.push({ installmentId: installment.id, amount: principalToPay, isPenalty: false });
    }
    
    if (isOverpayment) {
        // Find next installments (FIFO)
        const installments = await getLocalData<Installment[]>('installments', []);
        let nextInsts = installments.filter(i => 
            i.loanId === loan.id && 
            i.id !== installment.id && 
            i.status !== 'paid' &&
            i.dueDate >= installment.dueDate
        ).sort((a, b) => a.dueDate.localeCompare(b.dueDate));
        
        let remainingOverpayment = overpaymentAmount;
        
        for (const nextInst of nextInsts) {
            if (remainingOverpayment <= 0) break;
            
            const nextRemaining = nextInst.amount - (nextInst.paidAmount || 0);
            if (nextRemaining > 0) {
                const amountToApply = Math.min(remainingOverpayment, nextRemaining);
                allocations.push({ installmentId: nextInst.id, amount: amountToApply, isPenalty: false });
                remainingOverpayment -= amountToApply;
            }
        }
    }
    
    return {
        isFullPayment,
        isOverpayment,
        isPartial,
        penaltyAmount,
        amountDue: totalDueForThisInst,
        principalDue: amountRemaining,
        overpaymentAmount,
        allocations
    };
};

export const registerInstallmentPayment = async (
    installmentCode: string,
    amountEntered: number,
    paymentMethodType: 'account' | 'cashbox',
    paymentMethodId: string,
    userId: string
) => {
    // 1. Lock (virtually by getting fresh data) & Validate
    const { installment, loan } = await lookupInstallmentByCode(installmentCode);
    const preview = await calculatePaymentPreview(installmentCode, amountEntered);
    
    if (amountEntered <= 0) throw new Error('مبلغ باید بزرگتر از صفر باشد');
    
    const installments = await getLocalData<Installment[]>('installments', []);
    const loans = await getLoans();
    let updatedInstallments = [...installments];
    
    const todayIso = new Date().toISOString();
    const todayFa = new Date().toLocaleDateString('fa-IR').replace(/\//g, '-');
    let totalAllocatedPrincipal = 0;
    let totalAllocatedPenalty = 0;
    
    // Apply allocations
    for (const alloc of preview.allocations) {
        const instIndex = updatedInstallments.findIndex(i => i.id === alloc.installmentId);
        if (instIndex !== -1) {
            const inst = updatedInstallments[instIndex];
            if (alloc.isPenalty) {
                totalAllocatedPenalty += alloc.amount;
                updatedInstallments[instIndex] = {
                    ...inst,
                    penaltyPaidAmount: (inst.penaltyPaidAmount || 0) + alloc.amount
                };
            } else {
                const newPaid = (inst.paidAmount || 0) + alloc.amount;
                // Important: an installment is fully paid only if the principal is paid AND there is no remaining accrued penalty
                const isPaid = newPaid >= inst.amount && (calculatePenalty(loan, inst) - (updatedInstallments[instIndex].penaltyPaidAmount || inst.penaltyPaidAmount || 0) <= 0);
                
                updatedInstallments[instIndex] = {
                    ...updatedInstallments[instIndex],
                    paidAmount: newPaid,
                    status: isPaid ? 'paid' : 'pending',
                    paidDate: isPaid ? todayIso : inst.paidDate
                };
                totalAllocatedPrincipal += alloc.amount;
            }
            
            // Re-check isPaid status for penalty allocations as well
            if (alloc.isPenalty) {
                const currentInst = updatedInstallments[instIndex];
                const isPaid = (currentInst.paidAmount || 0) >= currentInst.amount && (calculatePenalty(loan, currentInst) - (currentInst.penaltyPaidAmount || 0) <= 0);
                if (isPaid) {
                    updatedInstallments[instIndex].status = 'paid';
                    updatedInstallments[instIndex].paidDate = currentInst.paidDate || todayIso;
                }
            }
        }
    }
    
    // Update Transaction & Accounting
    const txType = loan.type === 'given' ? 'receive' : 'pay';
    // The main payment transaction
    const tx = await addTransaction({
        type: txType,
        amount: amountEntered, // Actual amount received
        method: paymentMethodType === 'account' ? 'account' : 'cash',
        resourceType: paymentMethodType === 'account' ? 'bank' : 'cashbox',
        resourceId: paymentMethodId,
        accountId: paymentMethodType === 'account' ? paymentMethodId : undefined,
        cashboxId: paymentMethodType === 'cashbox' ? paymentMethodId : undefined,
        personId: loan.personId,
        categoryId: loan.type === 'given' ? 'loan_installment_received' : 'loan_installment_paid',
        description: `پرداخت قسط(ها) برای کد یکتا ${installmentCode}`,
        date: new Date().toISOString().split('T')[0],
        jalaliDate: new Date().toLocaleDateString('fa-IR').replace(/\//g, '-'),
        time: new Date().toLocaleTimeString('fa-IR', { hour12: false }),
        isSystem: true,
    });
    
    // Also register the penalty charge in the ledger if there is any penalty paid
    if (totalAllocatedPenalty > 0) {
        await addTransaction({
            type: loan.type === 'given' ? 'pay' : 'receive', // The opposite type: charges the person
            amount: totalAllocatedPenalty,
            method: 'account', // Does not matter, but we must provide it
            resourceType: 'bank',
            resourceId: 'penalty-virtual',
            personId: loan.personId,
            categoryId: loan.type === 'given' ? 'loan_penalty_charged' : 'loan_penalty_deducted',
            description: `ثبت جریمه دیرکرد قسط برای کد یکتا ${installmentCode}`,
            date: new Date().toISOString().split('T')[0],
            jalaliDate: new Date().toLocaleDateString('fa-IR').replace(/\//g, '-'),
            time: new Date().toLocaleTimeString('fa-IR', { hour12: false }),
            isSystem: true,
        });
    }
    
    // Attach receipt info to installments that were paid in this batch
    updatedInstallments = updatedInstallments.map((inst: any) => {
        if (inst.loanId === loan.id && inst.status === 'paid' && inst.paidDate === todayIso) {
            // We assume if it was paid today in this session, we attach the receipt info
            // A more robust way is to check if we just allocated to this installment
            return {
                ...inst,
                receiptId: tx.id,
                receiptNumber: tx.receiptNumber
            };
        }
        return inst;
    });

    // Save updated installments
    await saveInstallments(updatedInstallments);
    
    // Check if loan status needs change
    const loanInsts = updatedInstallments.filter(i => i.loanId === loan.id);
    const allPaid = loanInsts.every(i => i.status === 'paid');
    
    let newLoanStatus = loan.status;
    if (allPaid && loan.status !== 'completed') {
        newLoanStatus = 'completed';
        // Use state machine to apply transition cleanly (it manages logging & accounting rollback/forward rules)
        await applyTransition(loan.id, 'completed', 'system', 'پرداخت تمام اقساط');
    } else if (loan.status === 'overdue') {
        // If it was overdue, and now the overdue installments are paid...
        const hasOverdue = loanInsts.some(i => i.status === 'overdue' || (i.status === 'pending' && new Date(i.dueDate) < new Date(todayIso)));
        if (!hasOverdue) {
             newLoanStatus = 'active';
             await applyTransition(loan.id, 'active', 'system', 'تسویه اقساط معوق');
        }
    }
    
    await addSystemLog('PAY_INSTALLMENT', `دریافت/پرداخت قسط با کد ${installmentCode} مبلغ ${amountEntered}`, 'Installment', installment.id);
    
    return {
        success: true,
        receiptNumber: tx.receiptNumber || tx.id,
        allocatedAmount: totalAllocatedPrincipal,
        newLoanStatus
    };
};


export const lookupNextInstallmentByLoanId = async (loanId: string) => {
    const installments = await getLocalData<Installment[]>('installments', []);
    const loanInstallments = installments
        .filter(i => i.loanId.toString() === loanId.toString() && i.status !== 'paid')
        .sort((a, b) => (a.installmentNumber || 0) - (b.installmentNumber || 0));

    if (loanInstallments.length === 0) {
        throw new Error('هیچ قسط پرداخت‌نشده‌ای برای این وام یافت نشد.');
    }
    const nextInst = loanInstallments[0];
    return lookupInstallmentByCode(nextInst.installmentCode);
};
