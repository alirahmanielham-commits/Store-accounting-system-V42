import { describe, test, expect } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createTestApp } from '../createTestApp';
import { encryptBackupData } from '../../src/utils/backupCrypto';

describe('Integration — Backup & Recovery Endpoints', () => {
  const app = createTestApp();
  const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-jwt-key-2024';
  const adminToken = jwt.sign(
    { id: 'admin-test', username: 'admin', name: 'مدیر', role: 'admin' },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

  test('GET /api/db/backups returns array of backup archives', async () => {
    const res = await request(app)
      .get('/api/db/backups')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test('POST /api/backup/dry-run evaluates payload and returns dry-run diff report', async () => {
    const mockBackupData = {
      products: [
        { id: 'dry-1', name: 'کالای آزمایشی تحلیل', price: 99000 }
      ],
      persons: [
        { id: 'dry-p1', name: 'مشتری آزمایشی' }
      ]
    };

    const res = await request(app)
      .post('/api/backup/dry-run')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ content: JSON.stringify(mockBackupData) });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.tablesCount).toBe(2);
    expect(res.body.totalBackupRecords).toBe(2);
    expect(res.body.isEncrypted).toBe(false);
  });

  test('POST /api/backup/dry-run decrypts and evaluates AES-256-GCM encrypted envelope', async () => {
    const mockBackupData = {
      products: [
        { id: 'enc-1', name: 'کالای رمزنگاری شده', price: 45000 }
      ]
    };

    const { jsonString } = encryptBackupData(mockBackupData, 'test_store');

    const res = await request(app)
      .post('/api/backup/dry-run')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ content: jsonString });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.isEncrypted).toBe(true);
    expect(res.body.tablesCount).toBe(1);
  });

  test('GET /api/db/backup returns encrypted envelope by default', async () => {
    const res = await request(app)
      .get('/api/db/backup')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    // Envelope format
    expect(res.body.format).toBe('taraz_backup_encrypted');
    expect(res.body.algorithm).toBe('aes-256-gcm');
    expect(res.body.ciphertext).toBeTypeOf('string');
    expect(res.body.tag).toBeDefined();
    expect(res.body.iv).toBeDefined();
  });

  test('GET /api/db/backup?decrypt=true returns plaintext JSON backup', async () => {
    const res = await request(app)
      .get('/api/db/backup?decrypt=true')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.format).toBeUndefined(); // Plain format
    expect(typeof res.body).toBe('object');
  });
});
