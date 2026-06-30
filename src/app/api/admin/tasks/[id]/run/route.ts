import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { executeTask } from '@/services/task-executor';
import { initLogContextAsync, getFormattedLogs } from '@/lib/logger';

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

    const task = await prisma.task.findUnique({
      where: { id },
      include: { account: true },
    });

    if (!task) {
      return NextResponse.json({ error: '任务不存在' }, { status: 404 });
    }

    return await initLogContextAsync(async () => {
      const startTime = Date.now();
      const result = await executeTask(task, 'manual');
      const duration = Date.now() - startTime;
      const fullLogs = getFormattedLogs();

      const log = await prisma.taskLog.create({
        data: {
          userId: task.userId,
          taskId: task.id,
          status: result.status,
          message: `[手动-管理] ${result.message}`,
          details: fullLogs || null,
          reward: result.reward || null,
          duration,
        },
      });

      return NextResponse.json({ message: '任务执行完成', result, log });
    });
  } catch (error) {
    return NextResponse.json({ error: '执行任务失败' }, { status: 500 });
  }
}
