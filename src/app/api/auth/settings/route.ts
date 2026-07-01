import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

/**
 * 公开接口：获取注册页所需的配置（无需登录）
 */
export async function GET() {
  try {
    const verificationSetting = await prisma.setting.findUnique({
      where: { key: 'email_verification_enabled' },
    });

    return NextResponse.json({
      emailVerification: !verificationSetting || verificationSetting.value === 'true',
    });
  } catch (error) {
    return NextResponse.json({ emailVerification: true });
  }
}
