import { getLocalData } from '../services/dataService';
import { saveInstallments } from '../services/accountingService';
import { generateInstallmentCode } from '../utils/installmentUtils';
import { Installment, Loan } from '../types';

export const backfillInstallmentCodes = async () => {
    try {
        const installments = await getLocalData<Installment[]>('installments', []);
        const loans = await getLocalData<Loan[]>('loans', []);
        
        let updatedCount = 0;
        const newInstallments = installments.map(inst => {
            // Force update all to 7 digits
            if (!inst.installmentCode || inst.installmentCode.startsWith('LN-')) {
                const loan = loans.find(l => l.id.toString() === inst.loanId.toString());
                const idx = (inst.installmentNumber || 1) - 1;
                const code = generateInstallmentCode(inst.loanId, loan?.loanNumber, idx, inst.dueDate);
                updatedCount++;
                return { ...inst, installmentCode: code };
            }
            return inst;
        });

        if (updatedCount > 0) {
            await saveInstallments(newInstallments);
            console.log(`Successfully backfilled ${updatedCount} installment codes.`);
            return { success: true, count: updatedCount };
        }
        
        console.log('No installments needed backfilling.');
        return { success: true, count: 0 };
    } catch (error) {
        console.error('Migration failed:', error);
        return { success: false, error };
    }
};
