import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { rescheduleAccount } from '@/lib/scheduler';

// 切换账号启用状态
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const { id } = await params;

    // 验证账号归属
    const account = await prisma.account.findFirst({
      where: { id, userId },
    });

    if (!account) {
      return NextResponse.json({ error: '账号不存在' }, { status: 404 });
    }

    // 切换状态
    const newIsActive = !account.isActive;

    await prisma.account.update({
      where: { id },
      data: { isActive: newIsActive },
    });

    // 重新调度
    await rescheduleAccount(id);

    return NextResponse.json({
      message: newIsActive ? '已开启自动签到' : '已停止自动签到',
      isActive: newIsActive,
    });
  } catch (error) {
    console.error('Toggle account error:', error);
    return NextResponse.json({ error: '操作失败' }, { status: 500 });
  }
}
