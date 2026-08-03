import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { createTaygedoClient, sendCaptcha } from '@/services/taygedo/api';
import { ensureTaygedoDevice } from '@/tools/device';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const body = await request.json();
    const { phone } = body;

    if (!phone) {
      return NextResponse.json({ error: '手机号不能为空' }, { status: 400 });
    }

    const device = await ensureTaygedoDevice(session.user.id!);
    const client = createTaygedoClient();
    await sendCaptcha(client, phone, device.deviceId);

    return NextResponse.json({ message: '验证码已发送' });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || '发送验证码失败' },
      { status: 500 },
    );
  }
}
