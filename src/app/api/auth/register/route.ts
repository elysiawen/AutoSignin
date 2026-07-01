import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { hashPassword } from '@/lib/utils';
import { checkRateLimit } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  try {
    // 检查是否开放注册
    const setting = await prisma.setting.findUnique({ where: { key: 'registration_enabled' } });
    if (setting && setting.value !== 'true') {
      return NextResponse.json({ error: '注册功能已关闭，请联系管理员创建账号' }, { status: 403 });
    }

    // 频率限制：每个 IP 每 15 分钟最多 5 次注册
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const { limited } = checkRateLimit(`register:${ip}`, { windowMs: 15 * 60 * 1000, max: 5 });
    if (limited) {
      return NextResponse.json({ error: '注册请求过于频繁，请稍后再试' }, { status: 429 });
    }

    const body = await request.json();
    const { email, password, name } = body;

    if (!email || !password) {
      return NextResponse.json({ error: '邮箱和密码不能为空' }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: '密码长度至少为6位' }, { status: 400 });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json({ error: '该邮箱已被注册' }, { status: 400 });
    }

    const hashedPassword = await hashPassword(password);
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name: name || email.split('@')[0],
      },
      select: { id: true, email: true, name: true, createdAt: true },
    });

    return NextResponse.json({ message: '注册成功', user }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: '注册失败，请稍后重试' }, { status: 500 });
  }
}
