import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { resolveAuthFlags } from '@/lib/auth-config';

/**
 * 公开接口：获取登录/注册页所需的配置（无需登录）
 */
export async function GET() {
  try {
    const verificationSetting = await prisma.setting.findUnique({
      where: { key: 'email_verification_enabled' },
    });

    const { oauth, password } = resolveAuthFlags();

    return NextResponse.json({
      emailVerification: !verificationSetting || verificationSetting.value === 'true',
      oauthEnabled: oauth,
      passwordEnabled: password,
    });
  } catch (error) {
    const { oauth, password } = resolveAuthFlags();
    return NextResponse.json({
      emailVerification: true,
      oauthEnabled: oauth,
      passwordEnabled: password,
    });
  }
}
