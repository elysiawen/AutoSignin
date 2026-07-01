import prisma from './prisma';
import { createLogger } from './logger';

const log = createLogger('Cleanup');

/**
 * 删除所有已过期或已使用的验证码。
 * 使用索引列 expiresAt 和 used，单条 DELETE 查询开销很低。
 */
export async function cleanupVerificationCodes(): Promise<number> {
  const result = await prisma.verificationCode.deleteMany({
    where: {
      OR: [
        { expiresAt: { lt: new Date() } },
        { used: true },
      ],
    },
  });

  if (result.count > 0) {
    log.info(`Cleaned up ${result.count} verification codes`);
  }

  return result.count;
}
