import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';

// 获取用户信息
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const userId = (session.user as any).id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error('Get user profile error:', error);
    return NextResponse.json({ error: '获取用户信息失败' }, { status: 500 });
  }
}

// 更新用户信息
export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const body = await request.json();
    const { name } = body;

    // 验证必填字段
    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: '昵称不能为空' },
        { status: 400 }
      );
    }

    // 更新昵称
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { name: name.trim() },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
      },
    });

    return NextResponse.json({
      message: '昵称修改成功',
      user: updatedUser,
    });
  } catch (error) {
    console.error('Update user profile error:', error);
    return NextResponse.json({ error: '修改昵称失败' }, { status: 500 });
  }
}
