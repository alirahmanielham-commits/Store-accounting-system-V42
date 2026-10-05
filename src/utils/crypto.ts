import crypto from 'crypto';
import fsPromises from 'fs/promises';

const ALGORITHM = 'aes-256-gcm';
const SECRET_SEED = process.env.DB_ENCRYPTION_KEY || process.env.JWT_SECRET || 'taraz-accounting-master-key-2025';
const SALT = 'taraz-salt-secure-storage-2025';

// Derive 32-byte key
const KEY = crypto.scryptSync(SECRET_SEED, SALT, 32);

/**
 * Encrypt a plain text string (e.g. database connection string or secret)
 * Returns string prefixed with "enc:gcm:<iv>:<authTag>:<ciphertext>"
 */
export function encryptValue(plainText: string): string {
  if (!plainText || typeof plainText !== 'string') return plainText;
  if (plainText.startsWith('enc:')) return plainText; // already encrypted

  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
  
  let encrypted = cipher.update(plainText, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  
  return `enc:gcm:${iv.toString('hex')}:${authTag}:${encrypted}`;
}

/**
 * Decrypt an encrypted string.
 * If not prefixed with "enc:", returns original string (backward compatibility).
 */
export function decryptValue(cipherText: string): string {
  if (!cipherText || typeof cipherText !== 'string') return cipherText;
  if (!cipherText.startsWith('enc:gcm:')) {
    // Legacy or unencrypted string
    return cipherText;
  }

  try {
    const parts = cipherText.split(':');
    if (parts.length !== 5) {
      throw new Error('Invalid encrypted format');
    }
    const iv = Buffer.from(parts[2], 'hex');
    const authTag = Buffer.from(parts[3], 'hex');
    const encryptedText = parts[4];

    const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (err: any) {
    console.error('Decryption failed:', err.message);
    return cipherText;
  }
}

/**
 * Masks sensitive passwords in database connection strings for safe display in logs or UI
 * e.g. postgres://user:password@localhost:5432/db -> postgres://user:******@localhost:5432/db
 */
export function maskConnectionString(connStr: string): string {
  if (!connStr || typeof connStr !== 'string') return '';
  try {
    const url = new URL(connStr);
    if (url.password) {
      url.password = '******';
      return url.toString();
    }
    return connStr;
  } catch (_) {
    // If not a standard URL, regex replace password pattern
    return connStr.replace(/(:\/\/)([^:@\s]+):([^@\s]+)(@)/, '$1$2:******$4');
  }
}

/**
 * Read and decrypt db_config.json
 */
export async function readSecureDbConfig(filePath: string): Promise<any> {
  try {
    const raw = await fsPromises.readFile(filePath, 'utf-8');
    const config = JSON.parse(raw);
    if (config.connectionString) {
      config.connectionString = decryptValue(config.connectionString);
    }
    return config;
  } catch (e) {
    return null;
  }
}

/**
 * Encrypt and save db_config.json safely
 */
export async function writeSecureDbConfig(filePath: string, config: any): Promise<void> {
  const secureConfig = { ...config };
  if (secureConfig.connectionString) {
    secureConfig.connectionString = encryptValue(secureConfig.connectionString);
  }
  await fsPromises.writeFile(filePath, JSON.stringify(secureConfig, null, 2), 'utf-8');
}
