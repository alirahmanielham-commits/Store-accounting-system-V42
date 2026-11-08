import { describe, test, expect } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createTestApp } from '../createTestApp';

describe('Integration — Purchase Invoice Header & Items Synchronization', () => {
  const app = createTestApp();
  const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-jwt-key-2024';
  const adminToken = jwt.sign(
    { id: 'admin-tester', username: 'admin', name: 'مدیر سیستم', role: 'admin' },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

  test('POST /api/data/purchase_invoices/append persists header and items, mirroring to canonical invoices', async () => {
    const purchaseInvoice = {
      id: 'test-pinv-hdr-1',
      type: 'purchase',
      invoiceNumber: 'خرید-۱۰۰۱',
      date: '1403/08/18',
      customerId: 'supplier-person-99',
      payableAmount: 1500000,
      totalAmount: 1500000,
      status: 'confirmed',
      items: [
        {
          id: 'item-pinv-1',
          productId: 'prod-item-1',
          quantity: 3,
          unitPrice: 500000,
          discount: 0,
          tax: 0
        }
      ]
    };

    // 1. Append purchase invoice
    const resAppend = await request(app)
      .post('/api/data/purchase_invoices/append')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(purchaseInvoice);

    expect(resAppend.status).toBe(200);
    expect(resAppend.body.success).toBe(true);

    // 2. Query purchase_invoices: Header and items must exist
    const resPurchaseInvoices = await request(app)
      .get('/api/data/purchase_invoices')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(resPurchaseInvoices.status).toBe(200);
    expect(Array.isArray(resPurchaseInvoices.body)).toBe(true);
    const foundInPurchase = resPurchaseInvoices.body.find((i: any) => i && i.id === 'test-pinv-hdr-1');
    expect(foundInPurchase).toBeDefined();
    expect(foundInPurchase.invoiceNumber).toBe('خرید-۱۰۰۱');
    expect(foundInPurchase.personId).toBe('supplier-person-99');
    expect(foundInPurchase.customerId).toBe('supplier-person-99');
    expect(Array.isArray(foundInPurchase.items)).toBe(true);
    expect(foundInPurchase.items.length).toBe(1);
    expect(foundInPurchase.items[0].netPrice).toBe(1500000);

    // 3. Query canonical invoices: The purchase invoice header MUST exist here too!
    const resCanonicalInvoices = await request(app)
      .get('/api/data/invoices')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(resCanonicalInvoices.status).toBe(200);
    expect(Array.isArray(resCanonicalInvoices.body)).toBe(true);
    const foundInCanonical = resCanonicalInvoices.body.find((i: any) => i && i.id === 'test-pinv-hdr-1');
    expect(foundInCanonical).toBeDefined();
    expect(foundInCanonical.invoiceNumber).toBe('خرید-۱۰۰۱');
    expect(foundInCanonical.type).toBe('purchase');
    expect(foundInCanonical.personId).toBe('supplier-person-99');
    expect(Array.isArray(foundInCanonical.items)).toBe(true);
    expect(foundInCanonical.items.length).toBe(1);
  });

  test('PUT /api/data/purchase_invoices/:id updates header and stays synchronized across both tables', async () => {
    const updatedInvoice = {
      id: 'test-pinv-hdr-1',
      type: 'purchase',
      invoiceNumber: 'خرید-۱۰۰۱-اصلاحی',
      date: '1403/08/18',
      customerId: 'supplier-person-99',
      payableAmount: 2000000,
      totalAmount: 2000000,
      status: 'confirmed',
      items: [
        {
          id: 'item-pinv-1',
          productId: 'prod-item-1',
          quantity: 4,
          unitPrice: 500000
        }
      ]
    };

    const resPut = await request(app)
      .put('/api/data/purchase_invoices/test-pinv-hdr-1')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(updatedInvoice);

    expect(resPut.status).toBe(200);
    expect(resPut.body.success).toBe(true);

    // Verify in invoices table
    const resCanonical = await request(app)
      .get('/api/data/invoices')
      .set('Authorization', `Bearer ${adminToken}`);

    const foundInCanonical = resCanonical.body.find((i: any) => i && i.id === 'test-pinv-hdr-1');
    expect(foundInCanonical).toBeDefined();
    expect(foundInCanonical.invoiceNumber).toBe('خرید-۱۰۰۱-اصلاحی');
    expect(foundInCanonical.items[0].quantity).toBe(4);
  });

  test('DELETE /api/data/purchase_invoices/:id cleans up from both tables and removes items', async () => {
    const resDel = await request(app)
      .delete('/api/data/purchase_invoices/test-pinv-hdr-1')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(resDel.status).toBe(200);

    const resPurchase = await request(app)
      .get('/api/data/purchase_invoices')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(resPurchase.body.find((i: any) => i && i.id === 'test-pinv-hdr-1')).toBeUndefined();

    const resCanonical = await request(app)
      .get('/api/data/invoices')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(resCanonical.body.find((i: any) => i && i.id === 'test-pinv-hdr-1')).toBeUndefined();
  });
});
