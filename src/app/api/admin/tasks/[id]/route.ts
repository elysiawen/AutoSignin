import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { rescheduleAccount } from '@/lib/scheduler';

export async function DELETE(
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

    const task = await prisma.task.findUnique({ where: { id } });
    if (!task) {
      return NextResponse.json({ error: '任务不存在' }, { status: 404 });
    }

    const accountId = task.accountId;
    await prisma.task.delete({ where: { id } });
    await rescheduleAccount(accountId);

    return NextResponse.json({ message: '任务已删除' });
  } catch (error) {
    console.error('Admin delete task error:', error);
    return NextResponse.json({ error: '删除任务失败' }, { status: 500 });
  }
}
