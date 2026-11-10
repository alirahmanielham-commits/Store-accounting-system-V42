import { describe, test, expect } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createTestApp } from '../createTestApp';

describe('Integration — Sales Invoice Header & Items Synchronization', () => {
  const app = createTestApp();
  const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-jwt-key-2024';
  const adminToken = jwt.sign(
    { id: 'admin-tester-sales', username: 'admin', name: 'مدیر فروش', role: 'admin' },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

  test('POST /api/data/sales_invoices/append persists header and items, mirroring to canonical invoices without schema errors', async () => {
    const salesInvoice = {
      id: 'test-sinv-hdr-1',
      type: 'sale',
      invoiceNumber: 'فروش-۵۰۰۱',
      date: '1403/08/18',
      fiscalYearId: 'fy-1403-test',
      customerId: 'customer-person-88',
      personId: 'customer-person-88',
      payableAmount: 3200000,
      totalAmount: 3200000,
      status: 'confirmed',
      items: [
        {
          id: 'item-sinv-1',
          productId: 'prod-item-sales-1',
          quantity: 2,
          unitPrice: 1600000,
          discount: 0,
          tax: 0,
          totalPrice: 3200000,
          netPrice: 3200000
        }
      ]
    };

    // 1. Append sales invoice
    const resAppend = await request(app)
      .post('/api/data/sales_invoices/append')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(salesInvoice);

    expect(resAppend.status).toBe(200);
    expect(resAppend.body.success).toBe(true);

    // 2. Query sales_invoices: Header and items must exist
    const resSalesInvoices = await request(app)
      .get('/api/data/sales_invoices')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(resSalesInvoices.status).toBe(200);
    expect(Array.isArray(resSalesInvoices.body)).toBe(true);
    const foundInSales = resSalesInvoices.body.find((i: any) => i && i.id === 'test-sinv-hdr-1');
    expect(foundInSales).toBeDefined();
    expect(foundInSales.invoiceNumber).toBe('فروش-۵۰۰۱');
    expect(foundInSales.personId).toBe('customer-person-88');
    expect(Array.isArray(foundInSales.items)).toBe(true);
    expect(foundInSales.items.length).toBe(1);

    // 3. Query canonical invoices: The sales invoice header MUST exist in master invoices table too!
    const resCanonicalInvoices = await request(app)
      .get('/api/data/invoices')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(resCanonicalInvoices.status).toBe(200);
    expect(Array.isArray(resCanonicalInvoices.body)).toBe(true);
    const foundInCanonical = resCanonicalInvoices.body.find((i: any) => i && i.id === 'test-sinv-hdr-1');
    expect(foundInCanonical).toBeDefined();
    expect(foundInCanonical.invoiceNumber).toBe('فروش-۵۰۰۱');
    expect(foundInCanonical.type).toBe('sale');
    expect(foundInCanonical.personId).toBe('customer-person-88');
    expect(Array.isArray(foundInCanonical.items)).toBe(true);
    expect(foundInCanonical.items.length).toBe(1);
  });

  test('PUT /api/data/sales_invoices/:id updates sales invoice header without mirror errors', async () => {
    const updatedSalesInvoice = {
      id: 'test-sinv-hdr-1',
      type: 'sale',
      invoiceNumber: 'فروش-۵۰۰۱-اصلاحی',
      date: '1403/08/18',
      fiscalYearId: 'fy-1403-test',
      customerId: 'customer-person-88',
      personId: 'customer-person-88',
      payableAmount: 4800000,
      totalAmount: 4800000,
      status: 'confirmed',
      items: [
        {
          id: 'item-sinv-1',
          productId: 'prod-item-sales-1',
          quantity: 3,
          unitPrice: 1600000,
          totalPrice: 4800000,
          netPrice: 4800000
        }
      ]
    };

    const resPut = await request(app)
      .put('/api/data/sales_invoices/test-sinv-hdr-1')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(updatedSalesInvoice);

    expect(resPut.status).toBe(200);
    expect(resPut.body.success).toBe(true);

    const resCanonical = await request(app)
      .get('/api/data/invoices')
      .set('Authorization', `Bearer ${adminToken}`);

    const foundInCanonical = resCanonical.body.find((i: any) => i && i.id === 'test-sinv-hdr-1');
    expect(foundInCanonical).toBeDefined();
    expect(foundInCanonical.invoiceNumber).toBe('فروش-۵۰۰۱-اصلاحی');
    expect(foundInCanonical.items[0].quantity).toBe(3);
  });

  test('POST /api/data/batch registers sales invoice without documentid errors', async () => {
    const batchInvoice = {
      id: 'test-sinv-batch-1',
      type: 'sale',
      invoiceNumber: 'فروش-۵۰۰۲',
      date: '1403/08/19',
      fiscalYearId: 'fy-1403-test',
      customerId: 'customer-person-99',
      personId: 'customer-person-99',
      payableAmount: 5000000,
      totalAmount: 5000000,
      status: 'confirmed',
      items: [
        {
          id: 'item-sinv-batch-1',
          productId: 'prod-item-sales-2',
          quantity: 5,
          unitPrice: 1000000,
          totalPrice: 5000000,
          netPrice: 5000000
        }
      ]
    };

    const resBatch = await request(app)
      .post('/api/data/batch')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        operations: [
          {
            type: 'append',
            key: 'sales_invoices',
            data: batchInvoice
          }
        ]
      });

    expect(resBatch.status).toBe(200);
    expect(resBatch.body.success).toBe(true);

    const resSales = await request(app)
      .get('/api/data/sales_invoices')
      .set('Authorization', `Bearer ${adminToken}`);

    const foundInSales = resSales.body.find((i: any) => i && i.id === 'test-sinv-batch-1');
    expect(foundInSales).toBeDefined();
    expect(foundInSales.invoiceNumber).toBe('فروش-۵۰۰۲');
    expect(foundInSales.items.length).toBe(1);
    expect(foundInSales.items[0].invoiceId).toBe('test-sinv-batch-1');
    expect(foundInSales.items[0].documentId).toBeUndefined();
  });
});

