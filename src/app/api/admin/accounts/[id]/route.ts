import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { unscheduleAccount } from '@/lib/scheduler';

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

    const account = await prisma.account.findUnique({ where: { id } });
    if (!account) {
      return NextResponse.json({ error: '账号不存在' }, { status: 404 });
    }

    unscheduleAccount(id);
    await prisma.account.delete({ where: { id } });

    return NextResponse.json({ message: '账号已删除' });
  } catch (error) {
    console.error('Admin delete account error:', error);
    return NextResponse.json({ error: '删除账号失败' }, { status: 500 });
  }
}
