import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { executeTask } from '@/services/task-executor';
import { initLogContextAsync, getFormattedLogs } from '@/lib/logger';
import { sendNotification } from '@/services/notification';
import { NotificationSource } from '@/generated/prisma/enums';

// 手动执行任务
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

    // 验证任务归属
    const task = await prisma.task.findFirst({
      where: { id, userId },
      include: { account: true },
    });

    if (!task) {
      return NextResponse.json({ error: '任务不存在' }, { status: 404 });
    }

    // 是否抑制通知（批量运行时由前端控制）
    const suppressNotification = request.nextUrl.searchParams.get('suppressNotification') === 'true';

    // 在日志上下文中执行任务
    return await initLogContextAsync(async () => {
      const startTime = Date.now();
      const result = await executeTask(task, 'manual');
      const duration = Date.now() - startTime;
      const fullLogs = getFormattedLogs();
      const message = `[手动] ${result.message}`;

      const log = await prisma.taskLog.create({
        data: {
          userId,
          taskId: task.id,
          status: result.status,
          message,
          details: fullLogs || null,
          reward: result.reward || null,
          duration,
        },
      });

      // 发送通知（SKIPPED 不推送，批量运行时抑制）
      if (!suppressNotification && result.status !== 'SKIPPED') {
        sendNotification({
          userId: task.userId,
          accountName: task.account.name,
          platform: task.account.platform,
          taskType: task.type,
          event: result.status as any,
          message: result.message,
          reward: result.reward,
          source: NotificationSource.MANUAL,
        }).catch(() => {});
      }

      return NextResponse.json({ message: '任务执行完成', log, status: result.status });
    });
  } catch (error) {
    console.error('Run task error:', error);
    return NextResponse.json({ error: '执行任务失败' }, { status: 500 });
  }
}
