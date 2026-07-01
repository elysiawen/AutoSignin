import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

// Tailwind CSS 类名合并
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ==================== 密码处理 ====================

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

// ==================== 数据加密 ====================

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const SALT_LENGTH = 16;

function getBaseKey(): string {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    throw new Error('ENCRYPTION_KEY is not set in environment variables');
  }
  return key;
}

/**
 * 从 base key 和 salt 派生 32 字节密钥
 */
function deriveKey(salt: Buffer): Buffer {
  return crypto.scryptSync(getBaseKey(), salt, 32);
}

/**
 * 加密数据
 * 格式: v1:salt(hex):iv(hex):tag(hex):encrypted(hex)
 */
export function encrypt(text: string): string {
  const salt = crypto.randomBytes(SALT_LENGTH);
  const key = deriveKey(salt);
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const tag = cipher.getAuthTag();

  return `v1:${salt.toString('hex')}:${iv.toString('hex')}:${tag.toString('hex')}:${encrypted}`;
}

/**
 * 解密数据
 * 格式: v1:salt(hex):iv(hex):tag(hex):encrypted(hex)
 */
export function decrypt(encryptedText: string): string {
  const parts = encryptedText.split(':');

  if (parts.length !== 5 || parts[0] !== 'v1') {
    throw new Error('Invalid encrypted text format');
  }

  const salt = Buffer.from(parts[1], 'hex');
  const key = deriveKey(salt);
  const iv = Buffer.from(parts[2], 'hex');
  const tag = Buffer.from(parts[3], 'hex');
  const encrypted = parts[4];

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

// ==================== 工具函数 ====================

export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// 生成随机字符串
export function randomString(length: number): string {
  return crypto.randomBytes(Math.ceil(length / 2)).toString('hex').slice(0, length);
}

// MD5 哈希
export function md5(text: string): string {
  return crypto.createHash('md5').update(text).digest('hex');
}

// 获取当前时间戳（秒）
export function timestamp(): number {
  return Math.floor(Date.now() / 1000);
}
