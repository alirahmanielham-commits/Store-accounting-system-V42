import { describe, test, expect } from 'vitest';
import {
  encryptBackupData,
  decryptBackupData,
  isEncryptedBackup
} from '../../src/utils/backupCrypto';

describe('Backup Cryptography Engine — AES-256-GCM Authenticated Encryption', () => {
  const sampleData = {
    products: [
      { id: '1', name: 'لپ‌تاپ لنوو', price: 45000000 },
      { id: '2', name: 'ماوس بیاند', price: 350000 }
    ],
    persons: [
      { id: 'p1', name: 'علی رضایی', mobile: '09123456789' }
    ],
    settings: {
      currency: 'IRR',
      storeName: 'فروشگاه تراز'
    }
  };

  test('encryptBackupData generates a compliant AES-256-GCM envelope', () => {
    const { envelope, jsonString } = encryptBackupData(sampleData, 'store_tehran_01');

    expect(envelope.format).toBe('taraz_backup_encrypted');
    expect(envelope.version).toBe('1.0');
    expect(envelope.algorithm).toBe('aes-256-gcm');
    expect(envelope.storeId).toBe('store_tehran_01');
    expect(envelope.iv).toHaveLength(24); // 12 bytes = 24 hex characters
    expect(envelope.tag).toHaveLength(32); // 16 bytes = 32 hex characters
    expect(envelope.ciphertext).toBeTypeOf('string');
    expect(envelope.metadata.tablesCount).toBe(3);
    expect(envelope.metadata.totalRecords).toBeGreaterThan(0);
    expect(envelope.metadata.tables).toContain('products');
    expect(envelope.metadata.tables).toContain('persons');

    expect(jsonString).toBeTypeOf('string');
  });

  test('isEncryptedBackup accurately identifies encrypted envelope format', () => {
    const { jsonString } = encryptBackupData(sampleData);

    expect(isEncryptedBackup(jsonString)).toBe(true);

    // Regular plaintext JSON backup
    const plainJson = JSON.stringify(sampleData);
    expect(isEncryptedBackup(plainJson)).toBe(false);

    // Malformed input
    expect(isEncryptedBackup('')).toBe(false);
    expect(isEncryptedBackup('not a json')).toBe(false);
  });

  test('decryptBackupData cleanly decrypts and preserves exact original payload', () => {
    const { jsonString } = encryptBackupData(sampleData, 'main_store');
    const result = decryptBackupData(jsonString);

    expect(result.success).toBe(true);
    expect(result.isEncrypted).toBe(true);
    expect(result.data).toEqual(sampleData);
    expect(result.data?.products).toHaveLength(2);
    expect(result.data?.products[0].name).toBe('لپ‌تاپ لنوو');
    expect(result.data?.settings.storeName).toBe('فروشگاه تراز');
  });

  test('authenticated encryption guarantees detection of ciphertext tampering', () => {
    const { envelope } = encryptBackupData(sampleData);

    // Alter one byte in ciphertext
    const tamperedCiphertext = Buffer.from(envelope.ciphertext, 'base64');
    tamperedCiphertext[0] ^= 0xff; // flip bits
    envelope.ciphertext = tamperedCiphertext.toString('base64');

    const result = decryptBackupData(JSON.stringify(envelope));
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  test('authenticated encryption guarantees detection of tag tampering', () => {
    const { envelope } = encryptBackupData(sampleData);

    // Alter the authentication tag
    envelope.tag = '0'.repeat(32);

    const result = decryptBackupData(JSON.stringify(envelope));
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  test('supports custom encryption passphrase when provided', () => {
    const customPass = 'super-secret-organization-key-2026';
    const { jsonString } = encryptBackupData(sampleData, 'store_02', customPass);

    // Decrypting with wrong key / default key fails
    const failedResult = decryptBackupData(jsonString);
    expect(failedResult.success).toBe(false);

    // Decrypting with correct custom key succeeds
    const successResult = decryptBackupData(jsonString, customPass);
    expect(successResult.success).toBe(true);
    expect(successResult.data).toEqual(sampleData);
  });
});
