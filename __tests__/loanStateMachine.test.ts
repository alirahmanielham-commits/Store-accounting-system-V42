import { describe, test, expect, vi, beforeEach } from 'vitest';
import { checkTransitionEligibility, applyTransition } from '../src/services/loanStateMachine';
import * as dataService from '../src/services/dataService';
import * as accountingService from '../src/services/accountingService';

// Mock dependencies
vi.mock('../src/services/dataService', () => ({
  getInstallments: vi.fn(),
  getTransactions: vi.fn(),
  addTransaction: vi.fn(),
  deleteTransaction: vi.fn(),
  saveLoans: vi.fn(),
  getLoans: vi.fn(),
  addSystemLog: vi.fn(),
  getAccounts: vi.fn(),
  getPersons: vi.fn(),
}));
vi.mock('../src/services/accountingService', () => ({
  getLedgerAccounts: vi.fn(),
  addAccountingDocument: vi.fn(),
  getAccountingDocuments: vi.fn(),
  updateAccountingDocument: vi.fn()
}));

describe('Loan State Machine', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    const mockLoan = { id: 'loan1', status: 'requested', amount: 1000, type: 'given', personId: 'p1' };
    
    test('checkTransitionEligibility allows valid forward transition', async () => {
        (dataService.getInstallments as any).mockResolvedValue([]);
        
        const res = await checkTransitionEligibility(mockLoan as any, 'completed_dossier', 'admin');
        expect(res.allowed).toBe(true);
        expect(res.direction).toBe('forward');
    });

    test('checkTransitionEligibility blocks completing loan with unpaid installments', async () => {
        const activeLoan = { ...mockLoan, status: 'active' };
        (dataService.getInstallments as any).mockResolvedValue([
            { id: 'inst1', loanId: 'loan1', status: 'pending' }
        ]);

        const res = await checkTransitionEligibility(activeLoan as any, 'completed', 'admin');
        expect(res.allowed).toBe(false);
        expect(res.blockingReasons).toContain('برای تسویه وام باید تمامی اقساط پرداخت شده باشند.');
    });

    test('checkTransitionEligibility blocks rollback without admin role', async () => {
        const activeLoan = { ...mockLoan, status: 'active' };
        
        const res = await checkTransitionEligibility(activeLoan as any, 'approved', 'viewer');
        expect(res.allowed).toBe(false);
        expect(res.blockingReasons).toContain('عدم دسترسی کافی برای بازگشت وضعیت.');
    });
});
