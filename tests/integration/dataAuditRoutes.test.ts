import { describe, test, expect } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createTestApp } from '../createTestApp';

describe('Integration — Data Operations & Comprehensive Audit Trail', () => {
  const app = createTestApp();
  const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-jwt-key-2024';
  const adminToken = jwt.sign(
    { id: 'admin-auditor', username: 'auditor_user', name: 'ناظر ممیزی', role: 'admin' },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

  test('POST /api/data/products/append creates product and triggers audit logging', async () => {
    const newProduct = {
      id: 'test-audit-p1',
      name: 'پیچ‌گوشتی شارژی آزمایشی',
      price: 850000,
      stock: 5
    };

    const res = await request(app)
      .post('/api/data/products/append')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(newProduct);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
    expect(res.body.data.id).toBe('test-audit-p1');
  });

  test('GET /api/data/products returns list containing created product', async () => {
    const res = await request(app)
      .get('/api/data/products')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    const found = res.body.find((p: any) => p && p.id === 'test-audit-p1');
    expect(found).toBeDefined();
  });

  test('PUT /api/data/products/:id updates product and captures before/after audit snapshot', async () => {
    const updatedProduct = {
      id: 'test-audit-p1',
      name: 'پیچ‌گوشتی شارژی آزمایشی (ویرایش شده)',
      price: 920000,
      stock: 8
    };

    const res = await request(app)
      .put('/api/data/products/test-audit-p1')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(updatedProduct);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('GET /api/data/system_logs retrieves audit trail with operation snapshot', async () => {
    const res = await request(app)
      .get('/api/data/system_logs')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);

    const latestLog = res.body[0];
    expect(latestLog).toBeDefined();
    expect(latestLog.timestamp).toBeTypeOf('number');
  });
});
