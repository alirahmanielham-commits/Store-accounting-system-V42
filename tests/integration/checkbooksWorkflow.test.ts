import { describe, test, expect, beforeEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createTestApp } from '../createTestApp';

describe('Integration — Checkbooks & Leaves Management Workflow', () => {
  const app = createTestApp();
  const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-jwt-key-2024';
  const adminToken = jwt.sign(
    { id: 'admin-cb-tester', username: 'admin', name: 'مدیر سیستم', role: 'admin' },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

  beforeEach(async () => {
    // Reset checkbooks & issued_checks
    await request(app)
      .post('/api/data/checkbooks')
      .set('Authorization', `Bearer ${adminToken}`)
      .send([]);

    await request(app)
      .post('/api/data/issued_checks')
      .set('Authorization', `Bearer ${adminToken}`)
      .send([]);
  });

  test('POST and GET checkbooks with leaf generation works seamlessly', async () => {
    // 1. Save checkbook
    const checkbook = {
      id: 'cb-test-101',
      accountId: 'acc-meli-1',
      bankName: 'بانک ملی ایران',
      startNumber: '1001',
      endNumber: '1005',
      totalLeaves: 5,
      issuedDate: '2026-11-04'
    };

    const postRes = await request(app)
      .post('/api/data/checkbooks')
      .set('Authorization', `Bearer ${adminToken}`)
      .send([checkbook]);

    expect(postRes.status).toBe(200);
    expect(postRes.body.success).toBe(true);

    // 2. Retrieve checkbooks
    const getRes = await request(app)
      .get('/api/data/checkbooks')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(getRes.status).toBe(200);
    expect(Array.isArray(getRes.body)).toBe(true);
    expect(getRes.body.length).toBe(1);
    expect(getRes.body[0].id).toBe('cb-test-101');
    expect(getRes.body[0].bankName).toBe('بانک ملی ایران');

    // 3. Save generated blank leaves
    const leaves = [
      { id: 'leaf-1', checkbookId: 'cb-test-101', checkNumber: '1001', amount: 0, status: 'blank' },
      { id: 'leaf-2', checkbookId: 'cb-test-101', checkNumber: '1002', amount: 0, status: 'blank' },
      { id: 'leaf-3', checkbookId: 'cb-test-101', checkNumber: '1003', amount: 0, status: 'blank' }
    ];

    const postLeavesRes = await request(app)
      .post('/api/data/issued_checks')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(leaves);

    expect(postLeavesRes.status).toBe(200);

    // 4. Retrieve leaves
    const getLeavesRes = await request(app)
      .get('/api/data/issued_checks')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(getLeavesRes.status).toBe(200);
    expect(Array.isArray(getLeavesRes.body)).toBe(true);
    expect(getLeavesRes.body.length).toBe(3);
    expect(getLeavesRes.body[0].status).toBe('blank');

    // 5. Issue one of the check leaves (صدور چک پرداختنی)
    const issuedLeaf = {
      ...leaves[0],
      amount: 25000000,
      payeeId: 'person-55',
      payeeName: 'فروشگاه پارس ابزار',
      issueDate: '2026-11-04',
      dueDate: '2026-12-04',
      sayadId: '1234567890123456',
      reason: 'خرید تجهیزات',
      status: 'issued'
    };

    const putRes = await request(app)
      .put('/api/data/issued_checks/leaf-1')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(issuedLeaf);

    expect(putRes.status).toBe(200);

    // 6. Verify leaf is now issued
    const finalChecksRes = await request(app)
      .get('/api/data/issued_checks')
      .set('Authorization', `Bearer ${adminToken}`);

    const updated = finalChecksRes.body.find((c: any) => c.id === 'leaf-1');
    expect(updated).toBeDefined();
    expect(updated.status).toBe('issued');
    expect(Number(updated.amount)).toBe(25000000);
    expect(updated.payeeName).toBe('فروشگاه پارس ابزار');
  });
});
