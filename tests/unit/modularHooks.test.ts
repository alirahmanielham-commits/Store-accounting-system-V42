import { describe, test, expect } from 'vitest';
import { calculateItemTotal, calculateInvoiceTotals } from '../../src/hooks/useInvoiceWorkflow';
import { validateVoucherBalance } from '../../src/hooks/useLedgerAccounts';

describe('Phase 9 Modular Architecture — Extracted Domain Logic & Calculations', () => {
  describe('useInvoiceWorkflow Calculations & Totals', () => {
    test('accurately calculates line total with discounts and taxes', () => {
      // 3 items @ 100,000 = 300,000 gross. 10% discount = 30,000 -> 270,000. 9% tax = 24,300 -> 294,300
      const item = {
        quantity: 3,
        unitPrice: 100000,
        discountPercent: 10,
        taxPercent: 9
      };

      const lineTotal = calculateItemTotal(item);
      expect(lineTotal).toBe(294300);
    });

    test('accurately aggregates invoice grand total with overall discount', () => {
      const items = [
        {
          id: '1',
          productId: 'p1',
          quantity: 2,
          unitPrice: 50000,
          discountPercent: 0,
          taxPercent: 0,
          lineTotal: 100000
        },
        {
          id: '2',
          productId: 'p2',
          quantity: 1,
          unitPrice: 200000,
          discountPercent: 10, // 20,000 disc -> 180,000
          taxPercent: 0,
          lineTotal: 180000
        }
      ];

      const totals = calculateInvoiceTotals(items, 10000); // 10,000 extra overall discount
      expect(totals.subtotal).toBe(300000);
      expect(totals.totalDiscount).toBe(30000); // 20,000 item + 10,000 overall
      expect(totals.grandTotal).toBe(270000);
    });
  });

  describe('useLedgerAccounts Double-Entry Verification', () => {
    test('validateVoucherBalance rejects unbalanced voucher entries', () => {
      const unbalanced = [
        { ledgerAccountId: '101', debit: 500000, credit: 0, description: 'صندوق' },
        { ledgerAccountId: '201', debit: 0, credit: 400000, description: 'فروش' }
      ];

      const res = validateVoucherBalance(unbalanced);
      expect(res.valid).toBe(false);
      expect(res.error).toContain('سند حسابداری تراز نیست');
    });

    test('validateVoucherBalance approves strictly balanced entries', () => {
      const balanced = [
        { ledgerAccountId: '101', debit: 500000, credit: 0, description: 'بانک' },
        { ledgerAccountId: '201', debit: 0, credit: 500000, description: 'فروش' }
      ];

      const res = validateVoucherBalance(balanced);
      expect(res.valid).toBe(true);
      expect(res.totalDebit).toBe(500000);
      expect(res.totalCredit).toBe(500000);
    });

    test('validateVoucherBalance requires at least 2 lines', () => {
      const singleLine = [
        { ledgerAccountId: '101', debit: 500000, credit: 0, description: 'تک خط' }
      ];

      const res = validateVoucherBalance(singleLine);
      expect(res.valid).toBe(false);
      expect(res.error).toContain('حداقل شامل دو آرتیکل');
    });
  });
});
