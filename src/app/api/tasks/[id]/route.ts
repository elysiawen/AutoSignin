import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { rescheduleAccount, unscheduleAccount } from '@/lib/scheduler';

// 获取单个任务详情
export async function GET(
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

    const task = await prisma.task.findFirst({
      where: {
        id,
        userId,
      },
      include: {
        account: {
          select: {
            id: true,
            name: true,
            platform: true,
          },
        },
        logs: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    });

    if (!task) {
      return NextResponse.json({ error: '任务不存在' }, { status: 404 });
    }

    return NextResponse.json(task);
  } catch (error) {
    console.error('Get task error:', error);
    return NextResponse.json({ error: '获取任务详情失败' }, { status: 500 });
  }
}

// 更新任务
export async function PUT(
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
    const body = await request.json();
    const { isActive, cronExpr, config, name } = body;

    // 验证任务归属
    const existingTask = await prisma.task.findFirst({
      where: { id, userId },
    });

    if (!existingTask) {
      return NextResponse.json({ error: '任务不存在' }, { status: 404 });
    }

    // 准备更新数据
    const updateData: any = {};
    if (isActive !== undefined) updateData.isActive = isActive;
    if (cronExpr !== undefined) updateData.cronExpr = cronExpr || null;
    if (config !== undefined) updateData.config = config || null;
    if (name !== undefined) updateData.name = name || null;

    const task = await prisma.task.update({
      where: { id },
      data: updateData,
      include: {
        account: {
          select: {
            id: true,
            name: true,
            platform: true,
          },
        },
      },
    });

    return NextResponse.json({
      message: '任务更新成功',
      task,
    });
  } catch (error) {
    console.error('Update task error:', error);
    return NextResponse.json({ error: '更新任务失败' }, { status: 500 });
  }
}

// 删除任务
export async function DELETE(
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

    // 验证任务归属
    const existingTask = await prisma.task.findFirst({
      where: { id, userId },
    });

    if (!existingTask) {
      return NextResponse.json({ error: '任务不存在' }, { status: 404 });
    }

    // 删除任务（级联删除关联的日志）
    const accountId = existingTask.accountId;
    await prisma.task.delete({
      where: { id },
    });

    // 重新调度账号
    await rescheduleAccount(accountId);

    return NextResponse.json({ message: '任务删除成功' });
  } catch (error) {
    console.error('Delete task error:', error);
    return NextResponse.json({ error: '删除任务失败' }, { status: 500 });
  }
}
