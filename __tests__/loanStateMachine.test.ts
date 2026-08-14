import { checkTransitionEligibility, applyTransition } from '../src/services/loanStateMachine';
import * as dataService from '../src/services/dataService';
import * as accountingService from '../src/services/accountingService';

// Mock dependencies
jest.mock('../src/services/dataService', () => ({
  getInstallments: jest.fn(),
  getTransactions: jest.fn(),
  addTransaction: jest.fn(),
  deleteTransaction: jest.fn(),
  saveLoans: jest.fn(),
  getLoans: jest.fn(),
  addSystemLog: jest.fn(),
  getAccounts: jest.fn(),
  getPersons: jest.fn(),
}));
jest.mock('../src/services/accountingService', () => ({
  getLedgerAccounts: jest.fn(),
  addAccountingDocument: jest.fn(),
  getAccountingDocuments: jest.fn(),
  updateAccountingDocument: jest.fn()
}));

describe('Loan State Machine', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    const mockLoan = { id: 'loan1', status: 'requested', amount: 1000, type: 'given', personId: 'p1' };
    
    test('checkTransitionEligibility allows valid forward transition', async () => {
        (dataService.getInstallments as jest.Mock).mockResolvedValue([]);
        
        const res = await checkTransitionEligibility(mockLoan as any, 'completed_dossier', 'admin');
        expect(res.allowed).toBe(true);
        expect(res.direction).toBe('forward');
    });

    test('checkTransitionEligibility blocks completing loan with unpaid installments', async () => {
        const activeLoan = { ...mockLoan, status: 'active' };
        (dataService.getInstallments as jest.Mock).mockResolvedValue([
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
