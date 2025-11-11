/**
 * Encryption utilities for sensitive data
 * Uses AES-256-GCM for card numbers, CVV, and private keys
 */

import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 16; // 128 bits
const AUTH_TAG_LENGTH = 16;
const SALT_LENGTH = 64;

/**
 * Get encryption key from environment or generate
 */
function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;
  
  if (!key) {
    throw new Error('ENCRYPTION_KEY environment variable not set');
  }
  
  // Derive key using PBKDF2
  const salt = process.env.ENCRYPTION_SALT || 'celora-salt-v1';
  return crypto.pbkdf2Sync(key, salt, 100000, KEY_LENGTH, 'sha512');
}

/**
 * Encrypt data using AES-256-GCM
 */
export function encrypt(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  // Format: iv:authTag:encrypted
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

/**
 * Decrypt data using AES-256-GCM
 */
export function decrypt(ciphertext: string): string {
  const key = getEncryptionKey();
  
  const parts = ciphertext.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid ciphertext format');
  }
  
  const iv = Buffer.from(parts[0], 'hex');
  const authTag = Buffer.from(parts[1], 'hex');
  const encrypted = parts[2];
  
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

/**
 * Generate a random card number (for testing/demo)
 */
export function generateCardNumber(brand: 'VISA' | 'MASTERCARD' = 'VISA'): string {
  const prefix = brand === 'VISA' ? '4' : '5';
  let number = prefix;
  
  // Generate 14 random digits
  for (let i = 0; i < 14; i++) {
    number += Math.floor(Math.random() * 10);
  }
  
  // Calculate Luhn checksum
  let sum = 0;
  let isEven = false;
  
  for (let i = number.length - 1; i >= 0; i--) {
    let digit = parseInt(number[i]);
    
    if (isEven) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }
    
    sum += digit;
    isEven = !isEven;
  }
  
  const checksum = (10 - (sum % 10)) % 10;
  return number + checksum;
}

/**
 * Generate a random CVV
 */
export function generateCVV(): string {
  return Math.floor(100 + Math.random() * 900).toString();
}

/**
 * Mask card number (show only last 4 digits)
 */
export function maskCardNumber(cardNumber: string): string {
  if (cardNumber.length < 4) {
    return '****';
  }
  return '**** **** **** ' + cardNumber.slice(-4);
}

/**
 * Get last 4 digits of card number
 */
export function getLastFourDigits(cardNumber: string): string {
  return cardNumber.slice(-4);
}

/**
 * Validate card number using Luhn algorithm
 */
export function validateCardNumber(cardNumber: string): boolean {
  const sanitized = cardNumber.replace(/\s/g, '');
  
  if (!/^\d{13,19}$/.test(sanitized)) {
    return false;
  }
  
  let sum = 0;
  let isEven = false;
  
  for (let i = sanitized.length - 1; i >= 0; i--) {
    let digit = parseInt(sanitized[i]);
    
    if (isEven) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }
    
    sum += digit;
    isEven = !isEven;
  }
  
  return sum % 10 === 0;
}

/**
 * Validate CVV format
 */
export function validateCVV(cvv: string): boolean {
  return /^\d{3,4}$/.test(cvv);
}

/**
 * Validate expiry date
 */
export function validateExpiry(month: number, year: number): boolean {
  if (month < 1 || month > 12) {
    return false;
  }
  
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  
  if (year < currentYear) {
    return false;
  }
  
  if (year === currentYear && month < currentMonth) {
    return false;
  }
  
  // Not more than 10 years in the future
  if (year > currentYear + 10) {
    return false;
  }
  
  return true;
}

/**
 * Hash sensitive data for indexing (one-way)
 */
export function hashForIndex(data: string): string {
  return crypto.createHash('sha256').update(data).digest('hex');
}
