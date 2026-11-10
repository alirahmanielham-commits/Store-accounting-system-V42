import { describe, test, expect } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createTestApp } from '../createTestApp';

describe('Integration — High-Performance On-Demand Lazy Loading & Server Search', () => {
  const app = createTestApp();
  const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-jwt-key-2024';
  const adminToken = jwt.sign(
    { id: 'admin-tester-lazy', username: 'admin', name: 'مدیر تست', role: 'admin' },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

  test('GET /api/data/invoices with pagination returns 20 items default and selective hydration', async () => {
    // 1. Seed test invoices
    for (let i = 1; i <= 25; i++) {
      await request(app)
        .post('/api/data/invoices/append')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          id: `inv-lazy-test-${i}`,
          type: 'sale',
          invoiceNumber: `فروش-آزمایشی-${i}`,
          date: '1403/08/20',
          totalAmount: i * 100000,
          items: [
            {
              id: `item-lazy-${i}`,
              productId: `prod-${i}`,
              quantity: 1,
              unitPrice: i * 100000,
              totalPrice: i * 100000
            }
          ]
        });
    }

    // 2. Query page 1 with pageSize = 20
    const resPage1 = await request(app)
      .get('/api/data/invoices?paginated=true&page=1&pageSize=20')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(resPage1.status).toBe(200);
    expect(resPage1.body.pageSize).toBe(20);
    expect(resPage1.body.page).toBe(1);
    expect(resPage1.body.items.length).toBe(20);
    expect(resPage1.body.total).toBeGreaterThanOrEqual(25);
    expect(resPage1.body.totalPages).toBeGreaterThanOrEqual(2);

    // Verify child items are hydrated for the returned page
    const firstItem = resPage1.body.items[0];
    expect(Array.isArray(firstItem.items)).toBe(true);

    // 3. Search for specific invoice number
    const resSearch = await request(app)
      .get('/api/data/invoices?paginated=true&search=فروش-آزمایشی-12')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(resSearch.status).toBe(200);
    const found = resSearch.body.items.find((inv: any) => inv.invoiceNumber === 'فروش-آزمایشی-12');
    expect(found).toBeDefined();
    expect(found.id).toBe('inv-lazy-test-12');
  });

  test('GET /api/data/persons with pagination and search returns paged results', async () => {
    // 1. Seed test persons
    for (let i = 1; i <= 25; i++) {
      await request(app)
        .post('/api/data/persons/append')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          id: `person-lazy-test-${i}`,
          name: `مشتری شماره ${i}`,
          phone: `091200000${i.toString().padStart(2, '0')}`,
          role: 'customer'
        });
    }

    // 2. Query page 1 with pageSize = 20
    const resPersonsP1 = await request(app)
      .get('/api/data/persons?paginated=true&page=1&pageSize=20')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(resPersonsP1.status).toBe(200);
    expect(resPersonsP1.body.pageSize).toBe(20);
    expect(resPersonsP1.body.page).toBe(1);
    expect(resPersonsP1.body.items.length).toBe(20);
    expect(resPersonsP1.body.total).toBeGreaterThanOrEqual(25);

    // 3. Instant search query
    const resPersonSearch = await request(app)
      .get('/api/data/persons?paginated=true&search=مشتری شماره 15')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(resPersonSearch.status).toBe(200);
    const foundPerson = resPersonSearch.body.items.find((p: any) => p.name === 'مشتری شماره 15');
    expect(foundPerson).toBeDefined();
    expect(foundPerson.id).toBe('person-lazy-test-15');
  });
});
