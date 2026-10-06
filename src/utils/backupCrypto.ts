import crypto from 'crypto';

// Secret key derivation for AES-256-GCM backup encryption
const MASTER_SECRET = process.env.BACKUP_ENCRYPTION_KEY || process.env.JWT_SECRET || 'taraz-store-accounting-aes256gcm-master-key-2026';
const SALT = 'taraz-backup-salt-v1';

// Derive 32-byte key using PBKDF2
const DERIVED_KEY = crypto.pbkdf2Sync(MASTER_SECRET, SALT, 10000, 32, 'sha256');

export interface EncryptedBackupEnvelope {
  format: 'taraz_backup_encrypted';
  version: '1.0';
  algorithm: 'aes-256-gcm';
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
  };
}

/**
 * Checks if a given content string is an encrypted Taraz backup envelope
 */
export function isEncryptedBackup(content: string): boolean {
  if (!content || typeof content !== 'string') return false;
  const trimmed = content.trim();
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
 * using AES-256-GCM authenticated encryption.
 */
export function encryptBackupData(
  data: Record<string, any>,
  storeId: string = 'default',
  customKey?: string
): { envelope: EncryptedBackupEnvelope; jsonString: string } {
  const key = customKey 
    ? crypto.pbkdf2Sync(customKey, SALT, 10000, 32, 'sha256')
    : DERIVED_KEY;

  // 12-byte initialization vector recommended for GCM
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

  const payloadString = JSON.stringify(data);
  const encryptedBuffer = Buffer.concat([
    cipher.update(payloadString, 'utf8'),
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
      createdAt: new Date().toISOString()
    }
  };

  return {
    envelope,
    jsonString: JSON.stringify(envelope, null, 2)
  };
}

/**
 * Decrypts an encrypted backup file content (or parses plain JSON if unencrypted)
 * Verifies authenticated ciphertext with GCM Auth Tag.
 */
export function decryptBackupData(
  fileContent: string,
  customKey?: string
): { success: boolean; data?: Record<string, any>; isEncrypted: boolean; metadata?: any; error?: string } {
  if (!fileContent || typeof fileContent !== 'string') {
    return { success: false, isEncrypted: false, error: 'محتوای فایل خالی است.' };
  }

  const trimmed = fileContent.trim();

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

    const decryptedJson = decryptedBuffer.toString('utf8');
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
