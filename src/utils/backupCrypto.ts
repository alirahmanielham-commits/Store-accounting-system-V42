import crypto from 'crypto';
import zlib from 'zlib';

// Secret key derivation for AES-256-GCM backup encryption
const MASTER_SECRET = process.env.BACKUP_ENCRYPTION_KEY || process.env.JWT_SECRET || 'taraz-store-accounting-aes256gcm-master-key-2026';
const SALT = 'taraz-backup-salt-v1';

// Derive 32-byte key using PBKDF2
const DERIVED_KEY = crypto.pbkdf2Sync(MASTER_SECRET, SALT, 10000, 32, 'sha256');

export interface EncryptedBackupEnvelope {
  format: 'taraz_backup_encrypted';
  version: '1.0' | '2.0';
  algorithm: 'aes-256-gcm';
  compression?: 'gzip' | 'none';
  storeId: string;
  timestamp: number;
  dateStr?: string;
  iv: string; // hex
  tag: string; // hex
  ciphertext: string; // base64
  metadata: {
    tablesCount: number;
    totalRecords: number;
    tables: string[];
    createdAt: string;
    uncompressedSize?: number;
    compressedSize?: number;
  };
}

/**
 * Checks if a given buffer or base64 string is Gzip compressed (magic bytes 0x1f, 0x8b)
 */
export function isGzipBuffer(buf: Buffer): boolean {
  if (!buf || buf.length < 2) return false;
  return buf[0] === 0x1f && buf[1] === 0x8b;
}

/**
 * Normalizes input: handles Buffer, raw JSON string, or gzip-compressed binary string/buffer
 */
export function normalizeBackupInput(input: string | Buffer): string {
  if (!input) return '';
  if (Buffer.isBuffer(input)) {
    if (isGzipBuffer(input)) {
      try {
        return zlib.gunzipSync(input).toString('utf8');
      } catch {
        return input.toString('utf8');
      }
    }
    return input.toString('utf8');
  }

  // If string, check if it might be binary representation or normal string
  if (typeof input === 'string') {
    const trimmed = input.trim();
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      return trimmed;
    }
    // Check if buffer contains gzip header
    const buf = Buffer.from(input, 'binary');
    if (isGzipBuffer(buf)) {
      try {
        return zlib.gunzipSync(buf).toString('utf8');
      } catch {}
    }
  }

  return String(input);
}

/**
 * Checks if a given content string is an encrypted Taraz backup envelope
 */
export function isEncryptedBackup(content: string | Buffer): boolean {
  if (!content) return false;
  const normalized = normalizeBackupInput(content);
  const trimmed = normalized.trim();
  if (!trimmed.startsWith('{') || !trimmed.includes('taraz_backup_encrypted')) return false;
  try {
    const parsed = JSON.parse(trimmed);
    return parsed.format === 'taraz_backup_encrypted' && !!parsed.ciphertext && !!parsed.iv && !!parsed.tag;
  } catch {
    return false;
  }
}

/**
 * Encrypts arbitrary backup data (typically an object mapping table names to arrays of records)
 * using AES-256-GCM authenticated encryption and automatic Gzip compression.
 */
export function encryptBackupData(
  data: Record<string, any>,
  storeId: string = 'default',
  customKey?: string,
  useCompression: boolean = true
): { envelope: EncryptedBackupEnvelope; jsonString: string; rawBuffer?: Buffer } {
  const key = customKey 
    ? crypto.pbkdf2Sync(customKey, SALT, 10000, 32, 'sha256')
    : DERIVED_KEY;

  // 12-byte initialization vector recommended for GCM
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

  const payloadString = JSON.stringify(data);
  const uncompressedSize = Buffer.byteLength(payloadString, 'utf8');

  // Gzip compression before encryption saves substantial space & encrypts compressed stream
  let payloadBuffer: Buffer;
  let compressionType: 'gzip' | 'none' = 'none';

  if (useCompression) {
    try {
      payloadBuffer = zlib.gzipSync(Buffer.from(payloadString, 'utf8'), { level: 9 });
      compressionType = 'gzip';
    } catch {
      payloadBuffer = Buffer.from(payloadString, 'utf8');
      compressionType = 'none';
    }
  } else {
    payloadBuffer = Buffer.from(payloadString, 'utf8');
  }

  const encryptedBuffer = Buffer.concat([
    cipher.update(payloadBuffer),
    cipher.final()
  ]);

  const authTag = cipher.getAuthTag();

  // Calculate high-level metadata
  const tables = Object.keys(data);
  let totalRecords = 0;
  for (const t of tables) {
    if (Array.isArray(data[t])) {
      totalRecords += data[t].length;
    } else if (data[t] && typeof data[t] === 'object') {
      totalRecords += Object.keys(data[t]).length;
    }
  }

  const envelope: EncryptedBackupEnvelope = {
    format: 'taraz_backup_encrypted',
    version: '1.0',
    algorithm: 'aes-256-gcm',
    compression: compressionType,
    storeId,
    timestamp: Date.now(),
    dateStr: new Date().toISOString(),
    iv: iv.toString('hex'),
    tag: authTag.toString('hex'),
    ciphertext: encryptedBuffer.toString('base64'),
    metadata: {
      tablesCount: tables.length,
      totalRecords,
      tables,
      createdAt: new Date().toISOString(),
      uncompressedSize,
      compressedSize: encryptedBuffer.length
    }
  };

  return {
    envelope,
    jsonString: JSON.stringify(envelope, null, 2)
  };
}

/**
 * Decrypts an encrypted backup file content (or parses plain JSON if unencrypted)
 * Automatically decompresses Gzip if payload was compressed.
 * Verifies authenticated ciphertext with GCM Auth Tag.
 */
export function decryptBackupData(
  fileContent: string | Buffer,
  customKey?: string
): { success: boolean; data?: Record<string, any>; isEncrypted: boolean; metadata?: any; error?: string } {
  if (!fileContent) {
    return { success: false, isEncrypted: false, error: 'محتوای فایل خالی است.' };
  }

  const normalized = normalizeBackupInput(fileContent);
  const trimmed = normalized.trim();

  // Case 1: Plain unencrypted JSON backup (backward compatibility)
  if (!isEncryptedBackup(trimmed)) {
    try {
      const parsed = JSON.parse(trimmed);
      if (typeof parsed !== 'object' || parsed === null) {
        return { success: false, isEncrypted: false, error: 'ساختار JSON معتبر نیست.' };
      }
      return { success: true, data: parsed, isEncrypted: false };
    } catch (err: any) {
      return { success: false, isEncrypted: false, error: `خطا در خواندن فایل JSON: ${err.message}` };
    }
  }

  // Case 2: AES-256-GCM Encrypted Backup
  try {
    const envelope: EncryptedBackupEnvelope = JSON.parse(trimmed);
    const key = customKey 
      ? crypto.pbkdf2Sync(customKey, SALT, 10000, 32, 'sha256')
      : DERIVED_KEY;

    const iv = Buffer.from(envelope.iv, 'hex');
    const authTag = Buffer.from(envelope.tag, 'hex');
    const ciphertext = Buffer.from(envelope.ciphertext, 'base64');

    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);

    const decryptedBuffer = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final()
    ]);

    let decryptedJson: string;

    // Check if payload is compressed (either marked in envelope or detected via gzip header)
    if (envelope.compression === 'gzip' || isGzipBuffer(decryptedBuffer)) {
      try {
        decryptedJson = zlib.gunzipSync(decryptedBuffer).toString('utf8');
      } catch (gzErr: any) {
        decryptedJson = decryptedBuffer.toString('utf8');
      }
    } else {
      decryptedJson = decryptedBuffer.toString('utf8');
    }

    const parsedData = JSON.parse(decryptedJson);

    return {
      success: true,
      data: parsedData,
      isEncrypted: true,
      metadata: envelope.metadata
    };
  } catch (err: any) {
    if (err.message && err.message.includes('Unsupported state or unable to authenticate data')) {
      return {
        success: false,
        isEncrypted: true,
        error: 'اعتبارسنجی رمزنگاری فایل ناموفق بود. کلید رمزنگاری نامعتبر است یا فایل دستکاری شده است (GCM Auth Tag Failure).'
      };
    }
    return {
      success: false,
      isEncrypted: true,
      error: `خطا در رمزگشایی فایل پشتیبان: ${err.message}`
    };
  }
}
