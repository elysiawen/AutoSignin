import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { kuroSdkLogin } from '@/tools/kuro-login';

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

    const result = await kuroSdkLogin(mobile, code);

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
