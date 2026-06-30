import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { rescheduleAccount, unscheduleAccount } from '@/lib/scheduler';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }
    if ((session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: '权限不足' }, { status: 403 });
    }

    const { id } = await params;

    const account = await prisma.account.findUnique({ where: { id } });
    if (!account) {
      return NextResponse.json({ error: '账号不存在' }, { status: 404 });
    }

    const newIsActive = !account.isActive;

    await prisma.account.update({
      where: { id },
      data: { isActive: newIsActive },
    });

    if (newIsActive) {
      await rescheduleAccount(id);
    } else {
      unscheduleAccount(id);
    }

    return NextResponse.json({
      message: newIsActive ? '账号已启用' : '账号已禁用',
      isActive: newIsActive,
    });
  } catch (error) {
    console.error('Admin toggle account error:', error);
    return NextResponse.json({ error: '操作失败' }, { status: 500 });
  }
}
