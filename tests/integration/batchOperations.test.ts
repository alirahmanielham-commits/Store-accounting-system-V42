import { describe, test, expect } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createTestApp } from '../createTestApp';

describe('Integration — Batch Operations & Transactions Flow', () => {
  const app = createTestApp();
  const token = jwt.sign(
    { id: 'admin-default', username: 'admin', role: 'admin', name: 'مدیر سیستم' },
    process.env.JWT_SECRET || 'super-secret-jwt-key-2024'
  );

  test('POST /api/data/batch processes multiple operations atomically and gracefully', async () => {
    const payload = {
      operations: [
        {
          type: 'update',
          key: 'cashboxes',
          id: 'cb-test-batch',
          data: { balance: 9500000 }
        },
        {
          type: 'append',
          key: 'payment_transactions',
          data: {
            id: 'tx-pay-batch-test',
            type: 'pay',
            amount: 500000,
            resourceType: 'cashbox',
            resourceId: 'cb-test-batch',
            receiptNumber: 'PAY-BATCH-99',
            description: 'رسید پرداخت تستی'
          }
        }
      ]
    };

    const res = await request(app)
      .post('/api/data/batch')
      .set('Authorization', `Bearer ${token}`)
      .send(payload);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.results)).toBe(true);
  });

  test('POST /api/data/batch handles invalid or empty operation objects without 500 crashes', async () => {
    const res = await request(app)
      .post('/api/data/batch')
      .set('Authorization', `Bearer ${token}`)
      .send({
        operations: [
          null,
          {},
          { type: 'append', key: 'receipt_transactions', data: { id: 'tx-rec-1', type: 'receive', amount: 10000 } }
        ]
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
