import { NextResponse } from 'next/server';
import { isSmtpConfigured } from '@/lib/email';

/**
 * GET /api/system/smtp-status
 * 返回 SMTP 邮件服务配置状态（无需认证，仅返回配置状态）
 */
export async function GET() {
  return NextResponse.json({ configured: isSmtpConfigured() });
}
