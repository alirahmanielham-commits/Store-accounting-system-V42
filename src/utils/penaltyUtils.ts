import { Loan, Installment } from '../types';

export function calculateDaysPastDue(dueDate: string): number {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);
    
    const diffTime = today.getTime() - due.getTime();
    if (diffTime <= 0) return 0;
    
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
}

export function calculatePenalty(loan: Loan, installment: Installment): number {
    if (!loan.penaltyType || loan.penaltyType === 'none' || !loan.penaltyRate) return 0;
    
    if (installment.status === 'paid' && installment.paidDate) {
        // Penalty is fixed at time of payment if already paid
        // But if we want to show historical penalty or penalty paid, it gets complex.
        // For now, if paid, penalty is 0, assuming it was settled.
        // Unless we store penaltyAmountPaid on the installment.
        // If we want to show what the penalty *was* at time of payment:
        const paidDate = new Date(installment.paidDate);
        paidDate.setHours(0,0,0,0);
        const due = new Date(installment.dueDate);
        due.setHours(0,0,0,0);
        const diffTime = paidDate.getTime() - due.getTime();
        const diffDays = diffTime > 0 ? Math.floor(diffTime / (1000 * 60 * 60 * 24)) : 0;
        return calculatePenaltyForDays(loan, installment.amount, diffDays);
    }

    const daysPastDue = calculateDaysPastDue(installment.dueDate);
    return calculatePenaltyForDays(loan, installment.amount, daysPastDue);
}

function calculatePenaltyForDays(loan: Loan, amount: number, daysPastDue: number): number {
    if (daysPastDue <= 0 || !loan.penaltyRate) return 0;

    let penalty = 0;
    switch (loan.penaltyType) {
        case 'fixed_per_day':
            penalty = loan.penaltyRate * daysPastDue;
            break;
        case 'percent_per_day':
            penalty = amount * (loan.penaltyRate / 100) * daysPastDue;
            break;
        case 'fixed_per_month':
            penalty = loan.penaltyRate * Math.ceil(daysPastDue / 30);
            break;
        case 'percent_per_month':
            penalty = amount * (loan.penaltyRate / 100) * (daysPastDue / 30); // Or maybe step function: Math.ceil(daysPastDue / 30)
            break;
    }
    return Math.round(penalty);
}

export function calculateEarlySettlement(loan: Loan, installments: Installment[]): { 
    totalRemaining: number; 
    discountAmount: number; 
    payableAmount: number;
    penaltyTotal: number;
} {
    const loanInsts = installments.filter(i => i.loanId === loan.id && i.status !== 'paid');
    let totalRemaining = 0;
    let penaltyTotal = 0;
    
    // We assume equal principal and interest across all installments for simplicity,
    // or if `interestRate` was used to calculate the installment amount, we can discount the interest portion.
    // However, the standard way with fixed installment amount is just applying the discount percentage 
    // to the total remaining amount of unpaid installments, or to the interest portion of it.
    // Here we'll apply it to the total remaining amount to keep it aligned with earlySettlementDiscountPercent 
    // being a discount on the remaining unearned interest (or remaining amount if we don't store principal/interest separately).
    
    loanInsts.forEach(inst => {
        totalRemaining += inst.amount - (inst.paidAmount || 0);
        penaltyTotal += Math.max(0, calculatePenalty(loan, inst) - (inst.penaltyPaidAmount || 0));
    });

    let discountAmount = 0;
    if (loan.earlySettlementPolicy === 'discount_interest' && loan.earlySettlementDiscountPercent) {
        // As a simplified model, if we don't have interest split, we assume discount applies to total remaining
        // Or better, it applies only to the "interest" portion. 
        // We can estimate total interest = (installmentAmount * totalInstallments) - loanAmount
        // Then remaining interest = total interest * (remaining un-due installments / totalInstallments)
        // Then discount = remaining interest * discountPercent
        const totalInterest = (loan.installmentAmount * loan.totalInstallments) - loan.amount;
        const unpaidCount = loanInsts.filter(i => i.status === 'pending' && calculateDaysPastDue(i.dueDate) <= 0).length;
        
        if (totalInterest > 0 && unpaidCount > 0) {
            const remainingInterest = totalInterest * (unpaidCount / loan.totalInstallments);
            discountAmount = Math.round(remainingInterest * (loan.earlySettlementDiscountPercent / 100));
        }
    }

    const payableAmount = totalRemaining + penaltyTotal - discountAmount;
    
    return {
        totalRemaining,
        discountAmount,
        payableAmount,
        penaltyTotal
    };
}
