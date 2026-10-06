import { describe, test, expect } from 'vitest';
import { personSchema, productSchema, loginSchema, validateData } from '../../src/utils/validation';
import {
  invoiceItemFormSchema,
  saleInvoiceFormSchema,
  purchaseInvoiceFormSchema,
  transactionReceiptFormSchema
} from '../../src/schemas/validation';

describe('Validation Schemas — Zod Boundary Contracts & Form Integrity', () => {
  describe('Person Schema', () => {
    test('accepts valid person payload', () => {
      const validPerson = {
        name: 'رضا کمالی',
        type: 'real' as const,
        mobile: '09121112233',
        email: 'reza@example.com'
      };
      const res = validateData(personSchema, validPerson);
      expect(res.success).toBe(true);
    });

    test('rejects person with empty name', () => {
      const invalidPerson = { name: '', mobile: '09121112233' };
      const res = validateData(personSchema, invalidPerson);
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.errors).toContain('نام شخص الزامی است');
      }
    });

    test('rejects person with invalid email format', () => {
      const invalidEmail = { name: 'مهدی', email: 'invalid-email-address' };
      const res = validateData(personSchema, invalidEmail);
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.errors).toContain('ایمیل وارد شده نامعتبر است');
      }
    });
  });

  describe('Product Schema', () => {
    test('accepts valid product with numeric values', () => {
      const validProduct = {
        name: 'پیچ‌گوشتی برقی',
        buyPrice: 1200000,
        sellPrice: 1500000,
        unit: 'دستگاه'
      };
      const res = validateData(productSchema, validProduct);
      expect(res.success).toBe(true);
    });

    test('rejects product with empty or missing name', () => {
      const emptyNameProduct = { name: '', buyPrice: 10000 };
      const res1 = validateData(productSchema, emptyNameProduct);
      expect(res1.success).toBe(false);
      if (!res1.success) {
        expect(res1.errors).toContain('نام کالا الزامی است');
      }

      const missingNameProduct = { buyPrice: 10000 };
      const res2 = validateData(productSchema, missingNameProduct);
      expect(res2.success).toBe(false);
    });
  });

  describe('Login Schema', () => {
    test('accepts valid username and password', () => {
      const credentials = { username: 'admin', password: 'password123' };
      const res = validateData(loginSchema, credentials);
      expect(res.success).toBe(true);
    });

    test('rejects missing or blank credentials', () => {
      expect(validateData(loginSchema, { username: '', password: '123' }).success).toBe(false);
      expect(validateData(loginSchema, { username: 'admin', password: '' }).success).toBe(false);
    });
  });

  describe('Invoice Line Items & Document Form Schemas', () => {
    test('invoiceItemFormSchema rejects negative quantities and prices', () => {
      const negativeQty = { productId: 'p1', quantity: -2, unitPrice: 1000 };
      const res1 = invoiceItemFormSchema.safeParse(negativeQty);
      expect(res1.success).toBe(false);

      const negativePrice = { productId: 'p1', quantity: 5, unitPrice: -500 };
      const res2 = invoiceItemFormSchema.safeParse(negativePrice);
      expect(res2.success).toBe(false);
    });

    test('saleInvoiceFormSchema requires at least one valid item', () => {
      const invoiceEmpty = {
        invoiceNumber: 'INV-1001',
        date: '1403/01/01',
        items: []
      };
      const res = saleInvoiceFormSchema.safeParse(invoiceEmpty);
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.issues[0].message).toContain('حداقل شامل یک قلم کالا');
      }
    });

    test('saleInvoiceFormSchema validates complete valid sale invoice', () => {
      const validInvoice = {
        invoiceNumber: 'INV-1002',
        date: '1403/01/15',
        customerId: 'c-1',
        items: [
          { productId: 'prod-1', quantity: 3, unitPrice: 250000, discountPercent: 5 }
        ]
      };
      const res = saleInvoiceFormSchema.safeParse(validInvoice);
      expect(res.success).toBe(true);
    });

    test('transactionReceiptFormSchema enforces positive financial amounts', () => {
      const zeroAmount = {
        type: 'receive' as const,
        personId: 'p-1',
        amount: 0,
        date: '1403/01/20',
        resourceType: 'bank' as const,
        resourceId: 'bank-1'
      };
      const res = transactionReceiptFormSchema.safeParse(zeroAmount);
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.issues[0].message).toContain('بزرگتر از صفر باشد');
      }
    });
  });
});
