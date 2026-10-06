import { describe, test, expect } from 'vitest';
import request from 'supertest';
import { createTestApp } from '../createTestApp';

describe('Integration — Authentication & RBAC Routes', () => {
  const app = createTestApp();

  test('POST /api/auth/login rejects request with missing fields', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: '' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  test('POST /api/auth/login rejects nonexistent user with 401', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'nonexistent_user_999', password: 'random_password' });

    expect(res.status).toBe(401);
    expect(res.body.error).toContain('اشتباه');
  });

  test('POST /api/auth/login authenticates default admin and returns JWT', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'admin' });

    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeTypeOf('string');
    expect(res.body.user).toBeDefined();
    expect(res.body.user.username).toBe('admin');
    expect(res.body.user.role).toBe('admin');
    expect(res.body.user.password).toBeUndefined(); // Security: password never returned
  });

  test('POST /api/auth/logout successfully clears session', async () => {
    const res = await request(app)
      .post('/api/auth/logout')
      .send({});

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
