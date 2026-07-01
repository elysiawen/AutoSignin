import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { sendNotification, formatSummaryMessage, type TaskResultSummary } from '@/services/notification';
import { NotificationSource } from '@/generated/prisma/enums';

/**
 * POST /api/notifications/summary
 * 发送汇总通知（前端批量运行任务完成后调用）
 * Body: { accountId, results: TaskResultSummary[] }
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const body = await request.json();
    const { accountId, results } = body;

    if (!accountId || !results?.length) {
      return NextResponse.json({ error: '参数不完整' }, { status: 400 });
    }

    // 验证账号归属
    const account = await prisma.account.findFirst({
      where: { id: accountId, userId },
    });
    if (!account) {
      return NextResponse.json({ error: '账号不存在' }, { status: 404 });
    }

    const { event, message } = formatSummaryMessage(
      account.name,
      account.platform,
      NotificationSource.MANUAL,
      results as TaskResultSummary[]
    );

    await sendNotification({
      userId,
      accountName: account.name,
      platform: account.platform,
      taskType: `${results.length} 个任务`,
      event,
      message,
      source: NotificationSource.MANUAL,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Send summary notification error:', error);
    return NextResponse.json({ error: '发送汇总通知失败' }, { status: 500 });
  }
}
