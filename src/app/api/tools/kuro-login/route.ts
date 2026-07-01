import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { kuroSdkLogin } from '@/tools/kuro-login';
import { ensureKuroDevice } from '@/tools/device';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const body = await request.json();
    const { mobile, code } = body;

    if (!mobile || !code) {
      return NextResponse.json({ error: '手机号和验证码不能为空' }, { status: 400 });
    }

    // 加载或生成该用户的库街区设备信息
    const device = await ensureKuroDevice(session.user.id!);

    const result = await kuroSdkLogin(mobile, code, device);

    return NextResponse.json({
      message: '登录成功',
      ...result,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || '登录失败，请检查手机号和验证码' },
      { status: 500 },
    );
  }
}
