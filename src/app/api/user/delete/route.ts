import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { verifyPassword } from '@/lib/utils';

/**
 * DELETE /api/user/delete
 * 删除当前用户的账号及所有关联数据
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const body = await request.json();
    const { password } = body;

    // 验证密码
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 });
    }

    // 如果用户有密码，需要验证
    if (user.password) {
      if (!password) {
        return NextResponse.json({ error: '请输入密码以确认删除' }, { status: 400 });
      }
      const isValid = await verifyPassword(password, user.password);
      if (!isValid) {
        return NextResponse.json({ error: '密码错误' }, { status: 400 });
      }
    }

    // 级联删除所有关联数据（Prisma schema 中已设置 onDelete: Cascade）
    // 删除顺序：TaskLog -> Task -> Device -> Account -> NotificationBinding -> User
    await prisma.user.delete({ where: { id: userId } });

    return NextResponse.json({ message: '账号已删除' });
  } catch (error) {
    console.error('Delete user account error:', error);
    return NextResponse.json({ error: '删除账号失败' }, { status: 500 });
  }
}
