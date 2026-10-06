import { describe, test, expect } from 'vitest';

/**
 * Double-Entry Accounting Rule Validator
 * Enforces fundamental accounting invariants:
 * 1. Minimum of 2 articles per journal voucher.
 * 2. Total Debit must equal Total Credit within standard precision tolerance (0.001).
 * 3. All amounts must be non-negative.
 * 4. At least one non-zero debit and one non-zero credit.
 */
export function validateAccountingVoucher(doc: {
  items?: Array<{ debit?: number; credit?: number; description?: string; ledgerAccountId?: string }>;
}) {
  if (!doc.items || !Array.isArray(doc.items) || doc.items.length < 2) {
    throw new Error('سند حسابداری باید حداقل شامل دو آرتیکل (یک بدهکار و یک بستانکار) باشد.');
  }

  let totalDebit = 0;
  let totalCredit = 0;
  let hasDebitArticle = false;
  let hasCreditArticle = false;

  for (const it of doc.items) {
    const debit = Number(it.debit) || 0;
    const credit = Number(it.credit) || 0;

    if (debit < 0 || credit < 0) {
      throw new Error('مبالغ بدهکار و بستانکار نمی‌توانند منفی باشند.');
    }

    if (debit > 0 && credit > 0) {
      throw new Error('یک آرتیکل نمی‌تواند همزمان دارای مانده بدهکار و بستانکار باشد.');
    }

    if (debit > 0) hasDebitArticle = true;
    if (credit > 0) hasCreditArticle = true;

    totalDebit += debit;
    totalCredit += credit;
  }

  if (!hasDebitArticle || !hasCreditArticle) {
    throw new Error('سند حسابداری باید حداقل شامل یک آرتیکل بدهکار و یک آرتیکل بستانکار باشد.');
  }

  if (Math.abs(totalDebit - totalCredit) > 0.001) {
    throw new Error(
      `سند حسابداری تراز نیست. جمع بدهکار (${totalDebit.toLocaleString()}) با جمع بستانکار (${totalCredit.toLocaleString()}) مغایرت دارد.`
    );
  }

  return {
    valid: true,
    totalDebit,
    totalCredit,
    articleCount: doc.items.length
  };
}

describe('Accounting Engine — Double Entry Balance & Validation Rules', () => {
  test('approves simple balanced two-line journal entry', () => {
    const doc = {
      items: [
        { debit: 5000000, credit: 0, description: 'بانک ملت' },
        { debit: 0, credit: 5000000, description: 'فروش کالا' }
      ]
    };

    const res = validateAccountingVoucher(doc);
    expect(res.valid).toBe(true);
    expect(res.totalDebit).toBe(5000000);
    expect(res.totalCredit).toBe(5000000);
    expect(res.articleCount).toBe(2);
  });

  test('approves compound multi-line balanced voucher (split payment & tax)', () => {
    const doc = {
      items: [
        { debit: 11000000, credit: 0, description: 'حساب‌های دریافتنی (مشتری)' },
        { debit: 0, credit: 10000000, description: 'درآمد فروش' },
        { debit: 0, credit: 1000000, description: 'مالیات بر ارزش افزوده' }
      ]
    };

    const res = validateAccountingVoucher(doc);
    expect(res.valid).toBe(true);
    expect(res.totalDebit).toBe(11000000);
    expect(res.totalCredit).toBe(11000000);
    expect(res.articleCount).toBe(3);
  });

  test('throws Persian error when voucher is unbalanced', () => {
    const doc = {
      items: [
        { debit: 2500000, credit: 0, description: 'صندوق' },
        { debit: 0, credit: 2000000, description: 'درآمد خدمات' }
      ]
    };

    expect(() => validateAccountingVoucher(doc)).toThrowError(
      /سند حسابداری تراز نیست/
    );
  });

  test('rejects document with fewer than 2 items', () => {
    const docOne = {
      items: [{ debit: 100000, credit: 0, description: 'تک آرتیکل' }]
    };
    expect(() => validateAccountingVoucher(docOne)).toThrowError(
      'سند حسابداری باید حداقل شامل دو آرتیکل (یک بدهکار و یک بستانکار) باشد.'
    );

    const docEmpty = { items: [] };
    expect(() => validateAccountingVoucher(docEmpty)).toThrowError(
      'سند حسابداری باید حداقل شامل دو آرتیکل (یک بدهکار و یک بستانکار) باشد.'
    );
  });

  test('rejects document with negative amounts', () => {
    const docNegative = {
      items: [
        { debit: -50000, credit: 0 },
        { debit: 0, credit: -50000 }
      ]
    };
    expect(() => validateAccountingVoucher(docNegative)).toThrowError(
      'مبالغ بدهکار و بستانکار نمی‌توانند منفی باشند.'
    );
  });

  test('rejects article having both debit and credit non-zero', () => {
    const docSimultaneous = {
      items: [
        { debit: 1000, credit: 500 },
        { debit: 0, credit: 500 }
      ]
    };
    expect(() => validateAccountingVoucher(docSimultaneous)).toThrowError(
      'یک آرتیکل نمی‌تواند همزمان دارای مانده بدهکار و بستانکار باشد.'
    );
  });

  test('allows micro-floating point tolerances within 0.001', () => {
    const docTolerance = {
      items: [
        { debit: 1000.0004, credit: 0 },
        { debit: 0, credit: 1000.0001 }
      ]
    };
    const res = validateAccountingVoucher(docTolerance);
    expect(res.valid).toBe(true);
  });

  test('rejects discrepancy exceeding 0.001 tolerance', () => {
    const docExceedTolerance = {
      items: [
        { debit: 1000.01, credit: 0 },
        { debit: 0, credit: 1000.0 }
      ]
    };
    expect(() => validateAccountingVoucher(docExceedTolerance)).toThrowError(
      /سند حسابداری تراز نیست/
    );
  });
});
