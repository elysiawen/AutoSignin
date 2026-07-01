/**
 * 加密数据迁移脚本
 *
 * 将所有 Account 的 cookie / stoken 从旧格式（硬编码 salt）迁移到 v1 格式（随机 salt + 版本号）。
 *
 * 用法:
 *   npx tsx prisma/migrate-encryption.ts
 *
 * 脚本是幂等的：已经用 v1 格式加密的记录会被跳过。
 * 建议执行前先备份数据库。
 */

import 'dotenv/config';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { PrismaPg } from '@prisma/adapter-pg';
import crypto from 'crypto';

// ==================== 加密逻辑（与 src/lib/utils.ts 保持一致） ====================

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

function deriveKey(salt: Buffer): Buffer {
  return crypto.scryptSync(getBaseKey(), salt, 32);
}

function deriveKeyLegacy(): Buffer {
  return crypto.scryptSync(getBaseKey(), 'salt', 32);
}

function encrypt(text: string): string {
  const salt = crypto.randomBytes(SALT_LENGTH);
  const key = deriveKey(salt);
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const tag = cipher.getAuthTag();

  return `v1:${salt.toString('hex')}:${iv.toString('hex')}:${tag.toString('hex')}:${encrypted}`;
}

function decrypt(encryptedText: string): string {
  const parts = encryptedText.split(':');

  let key: Buffer;
  let iv: Buffer;
  let tag: Buffer;
  let encrypted: string;

  if (parts.length === 5 && parts[0] === 'v1') {
    const salt = Buffer.from(parts[1], 'hex');
    key = deriveKey(salt);
    iv = Buffer.from(parts[2], 'hex');
    tag = Buffer.from(parts[3], 'hex');
    encrypted = parts[4];
  } else if (parts.length === 3) {
    key = deriveKeyLegacy();
    iv = Buffer.from(parts[0], 'hex');
    tag = Buffer.from(parts[1], 'hex');
    encrypted = parts[2];
  } else {
    throw new Error('Invalid encrypted text format');
  }

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

function isV1Format(encryptedText: string): boolean {
  return encryptedText.startsWith('v1:');
}

// ==================== 迁移逻辑 ====================

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set');
  }
  const adapter = new PrismaPg({ connectionString });
  const prisma = new PrismaClient({ adapter });

  try {
    console.log('开始迁移加密数据...\n');

    const accounts = await prisma.account.findMany({
      select: { id: true, name: true, cookie: true, stoken: true },
    });

    console.log(`共找到 ${accounts.length} 条账号记录\n`);

    let migrated = 0;
    let skipped = 0;
    let errors = 0;

    for (const account of accounts) {
      try {
        const needsCookieMigration = account.cookie && !isV1Format(account.cookie);
        const needsStokenMigration = account.stoken && !isV1Format(account.stoken);

        if (!needsCookieMigration && !needsStokenMigration) {
          skipped++;
          continue;
        }

        const updateData: { cookie?: string; stoken?: string } = {};

        if (needsCookieMigration) {
          const plain = decrypt(account.cookie);
          updateData.cookie = encrypt(plain);
          console.log(`  [${account.name}] cookie 已迁移`);
        }

        if (needsStokenMigration) {
          const plain = decrypt(account.stoken!);
          updateData.stoken = encrypt(plain);
          console.log(`  [${account.name}] stoken 已迁移`);
        }

        await prisma.account.update({
          where: { id: account.id },
          data: updateData,
        });

        migrated++;
      } catch (error: any) {
        console.error(`  [${account.name}] 迁移失败: ${error.message}`);
        errors++;
      }
    }

    console.log('\n==================== 迁移完成 ====================');
    console.log(`  已迁移: ${migrated}`);
    console.log(`  已跳过（新格式）: ${skipped}`);
    console.log(`  失败: ${errors}`);
    console.log('==================================================\n');

    if (errors > 0) {
      console.error('⚠️  部分记录迁移失败，请检查上方错误信息');
      process.exit(1);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main();
