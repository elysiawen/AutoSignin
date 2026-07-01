import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { randomInt } from '@/lib/utils';
import { checkRateLimit } from '@/lib/rate-limit';
import { withErrorHandling, ApiError } from '@/lib/api-error-handler';
import { sendVerificationEmail } from '@/lib/email';
import { cleanupVerificationCodes } from '@/lib/cleanup-verification-codes';
import { createLogger } from '@/lib/logger';

const log = createLogger('VerifyCode');

export const POST = withErrorHandling(async (request: NextRequest) => {
  // 检查是否开启邮箱验证
  const verificationSetting = await prisma.setting.findUnique({ where: { key: 'email_verification_enabled' } });
  if (verificationSetting && verificationSetting.value === 'false') {
    throw new ApiError('邮箱验证功能未开启');
  }

  const { email } = await request.json();

  if (!email || typeof email !== 'string') {
    throw new ApiError('请输入邮箱地址');
  }

  // 基本邮箱格式检查
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new ApiError('邮箱格式不正确');
  }

  const ip =
    request.headers.get('x-forwarded-for') ||
    request.headers.get('x-real-ip') ||
    'unknown';

  // 频率限制 1：每个邮箱每 60 秒最多 1 次
  const emailLimit = checkRateLimit(`verify-email:${email}`, {
    windowMs: 60 * 1000,
    max: 1,
  });
  if (emailLimit.limited) {
    throw new ApiError('验证码发送过于频繁，请60秒后再试', 429);
  }

  // 频率限制 2：每个 IP 每 15 分钟最多 10 次
  const ipLimit = checkRateLimit(`verify-ip:${ip}`, {
    windowMs: 15 * 60 * 1000,
    max: 10,
  });
  if (ipLimit.limited) {
    throw new ApiError('请求过于频繁，请稍后再试', 429);
  }

  // 检查邮箱是否已注册
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });
  if (existingUser) {
    throw new ApiError('该邮箱已被注册');
  }

  // 生成 6 位验证码
  const code = String(randomInt(100000, 999999));

  // 删除该邮箱旧的未使用验证码
  await prisma.verificationCode.deleteMany({
    where: { email, purpose: 'REGISTER', used: false },
  });

  // 存储新验证码
  await prisma.verificationCode.create({
    data: {
      email,
      code,
      purpose: 'REGISTER',
      expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 分钟
    },
  });

  // 发送邮件
  await sendVerificationEmail(email, code);

  log.info(`Verification code sent to ${email}`);

  // Fire-and-forget 清理过期验证码
  cleanupVerificationCodes().catch(() => {});

  return NextResponse.json({ message: '验证码已发送，请查看邮箱' });
});
