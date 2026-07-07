import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { getSchedulerStatus, executeAllTasks } from '@/lib/scheduler';
import { isSmtpConfigured } from '@/lib/email';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }
    if ((session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: '权限不足' }, { status: 403 });
    }

    const settings = await prisma.setting.findMany({
      orderBy: { key: 'asc' },
    });

    const scheduler = await getSchedulerStatus();

    return NextResponse.json({ settings, scheduler, smtpConfigured: isSmtpConfigured() });
  } catch (error) {
    console.error('Admin get settings error:', error);
    return NextResponse.json({ error: '获取设置失败' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }
    if ((session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: '权限不足' }, { status: 403 });
    }

    const body = await request.json();
    const { action, key, value } = body;

    if (action === 'executeAll') {
      const results = await executeAllTasks();
      return NextResponse.json({ message: '所有任务执行完成', results });
    }

    if (action === 'setSetting') {
      if (!key) {
        return NextResponse.json({ error: '缺少 key' }, { status: 400 });
      }

      // 开启邮箱验证码时检查 SMTP 是否已配置
      if (key === 'email_verification_enabled' && value === 'true' && !isSmtpConfigured()) {
        return NextResponse.json({ error: 'SMTP 邮件服务未配置，无法开启邮箱验证码。请在环境变量中配置 SMTP_HOST、SMTP_USER、SMTP_PASS 后重试。' }, { status: 400 });
      }

      await prisma.setting.upsert({
        where: { key },
        update: { value: value || '' },
        create: { key, value: value || '' },
      });

      return NextResponse.json({ message: '设置已保存' });
    }

    if (action === 'deleteSetting') {
      if (!key) {
        return NextResponse.json({ error: '缺少 key' }, { status: 400 });
      }

      await prisma.setting.delete({ where: { key } });
      return NextResponse.json({ message: '设置已删除' });
    }

    return NextResponse.json({ error: '未知操作' }, { status: 400 });
  } catch (error) {
    console.error('Admin settings action error:', error);
    return NextResponse.json({ error: '操作失败' }, { status: 500 });
  }
}
