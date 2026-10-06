import { describe, test, expect } from 'vitest';
import request from 'supertest';
import { createTestApp } from '../createTestApp';

describe('Integration — System Health & Diagnostics', () => {
  const app = createTestApp();

  test('GET /api/health responds with status ok, uptime and timestamp', async () => {
    const res = await request(app).get('/api/health');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.uptime).toBeTypeOf('number');
    expect(res.body.timestamp).toBeTypeOf('number');
  });

  test('GET /nonexistent responds with 404', async () => {
    const res = await request(app).get('/nonexistent-route-404');
    expect(res.status).toBe(404);
  });
});
