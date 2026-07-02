import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { randomInt, hashPassword } from '@/lib/utils';
import { checkRateLimit } from '@/lib/rate-limit';
import { withErrorHandling, ApiError } from '@/lib/api-error-handler';
import { sendVerificationEmail } from '@/lib/email';
import { cleanupVerificationCodes } from '@/lib/cleanup-verification-codes';
import { createLogger } from '@/lib/logger';

const log = createLogger('ForgotPassword');

// 发送验证码
export const POST = withErrorHandling(async (request: NextRequest) => {
  const { email } = await request.json();

  if (!email || typeof email !== 'string') {
    throw new ApiError('请输入邮箱地址');
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new ApiError('邮箱格式不正确');
  }

  const ip =
    request.headers.get('x-forwarded-for') ||
    request.headers.get('x-real-ip') ||
    'unknown';

  // 频率限制：每个邮箱每 60 秒最多 1 次
  const emailLimit = checkRateLimit(`forgot-pwd-email:${email}`, {
    windowMs: 60 * 1000,
    max: 1,
  });
  if (emailLimit.limited) {
    throw new ApiError('验证码发送过于频繁，请60秒后再试', 429);
  }

  // 频率限制：每个 IP 每 15 分钟最多 5 次
  const ipLimit = checkRateLimit(`forgot-pwd-ip:${ip}`, {
    windowMs: 15 * 60 * 1000,
    max: 5,
  });
  if (ipLimit.limited) {
    throw new ApiError('请求过于频繁，请稍后再试', 429);
  }

  // 检查邮箱是否存在
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });
  if (!existingUser) {
    throw new ApiError('该邮箱未注册');
  }

  // 预检查 SMTP 配置
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    throw new ApiError('邮件服务未配置，请联系管理员');
  }

  // 生成 6 位验证码
  const code = String(randomInt(100000, 999999));

  // 删除该邮箱旧的未使用验证码
  await prisma.verificationCode.deleteMany({
    where: { email, purpose: 'FORGOT_PASSWORD', used: false },
  });

  // 存储新验证码
  const verificationCode = await prisma.verificationCode.create({
    data: {
      email,
      code,
      purpose: 'FORGOT_PASSWORD',
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    },
  });

  // 发送邮件（失败时删除已存储的验证码，避免垃圾数据）
  try {
    await sendVerificationEmail(email, code, 'forgot-password');
  } catch (emailError: any) {
    await prisma.verificationCode.delete({
      where: { id: verificationCode.id },
    });
    log.error('发送邮件失败', { email, error: emailError.message });
    if (emailError.message.includes('邮件服务未配置') || emailError.message.includes('SMTP')) {
      throw new ApiError('邮件服务未配置，请联系管理员');
    }
    throw new ApiError('发送邮件失败，请稍后重试');
  }

  log.info(`Forgot password code sent to ${email}`);

  cleanupVerificationCodes().catch(() => {});

  return NextResponse.json({ message: '验证码已发送，请查看邮箱' });
});

// 验证验证码并重置密码
export const PUT = withErrorHandling(async (request: NextRequest) => {
  const { email, code, password } = await request.json();

  if (!email || !code || !password) {
    throw new ApiError('请填写完整信息');
  }

  if (password.length < 6) {
    throw new ApiError('密码长度至少为 6 位');
  }

  // 频率限制：防止暴力破解验证码
  const ip =
    request.headers.get('x-forwarded-for') ||
    request.headers.get('x-real-ip') ||
    'unknown';
  const resetLimit = checkRateLimit(`forgot-pwd-reset:${email}`, {
    windowMs: 60 * 1000,
    max: 5,
  });
  if (resetLimit.limited) {
    throw new ApiError('尝试次数过多，请60秒后再试', 429);
  }

  // 查找有效验证码
  const verificationCode = await prisma.verificationCode.findFirst({
    where: {
      email,
      code,
      purpose: 'FORGOT_PASSWORD',
      used: false,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: 'desc' },
  });

  if (!verificationCode) {
    throw new ApiError('验证码错误或已过期');
  }

  // 标记验证码已使用
  await prisma.verificationCode.update({
    where: { id: verificationCode.id },
    data: { used: true },
  });

  // 重置密码
  const hashedPassword = await hashPassword(password);
  await prisma.user.update({
    where: { email },
    data: { password: hashedPassword },
  });

  log.info(`Password reset for ${email}`);

  return NextResponse.json({ message: '密码重置成功，请使用新密码登录' });
});
