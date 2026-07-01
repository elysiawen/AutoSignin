import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { encrypt } from '@/lib/utils';
import { rescheduleAccount, unscheduleAccount } from '@/lib/scheduler';

export async function PUT(
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
    const body = await request.json();
    const { name, cookie, stoken, uid, mid, cronExpr, isActive } = body;

    const existingAccount = await prisma.account.findUnique({ where: { id } });
    if (!existingAccount) {
      return NextResponse.json({ error: '账号不存在' }, { status: 404 });
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (cookie) updateData.cookie = encrypt(cookie);
    if (stoken !== undefined) updateData.stoken = stoken ? encrypt(stoken) : null;
    if (uid !== undefined) updateData.uid = uid || null;
    if (mid !== undefined) updateData.mid = mid || null;

    if (cronExpr !== undefined) {
      if (cronExpr) {
        const { validate } = await import('node-cron');
        if (!validate(cronExpr)) {
          return NextResponse.json({ error: '无效的 Cron 表达式' }, { status: 400 });
        }
      }
      updateData.cronExpr = cronExpr || null;
    }

    if (isActive !== undefined) updateData.isActive = isActive;

    const account = await prisma.account.update({
      where: { id },
      data: updateData,
    });

    await rescheduleAccount(id);

    return NextResponse.json({
      message: '账号更新成功',
      account: {
        ...account,
        cookie: '***已隐藏***',
        stoken: account.stoken ? '***已隐藏***' : null,
      },
    });
  } catch (error) {
    console.error('Admin update account error:', error);
    return NextResponse.json({ error: '更新账号失败' }, { status: 500 });
  }
}

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
