import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }
    if ((session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: '权限不足' }, { status: 403 });
    }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [
      totalUsers,
      totalAccounts,
      totalTasks,
      activeAccounts,
      todayLogs,
      recentLogs,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.account.count(),
      prisma.task.count(),
      prisma.account.count({ where: { isActive: true, cronExpr: { not: null } } }),
      prisma.taskLog.groupBy({
        by: ['status'],
        where: { createdAt: { gte: todayStart } },
        _count: true,
      }),
      prisma.taskLog.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, name: true, email: true } },
          task: {
            include: {
              account: { select: { name: true, platform: true } },
            },
          },
        },
      }),
    ]);

    return NextResponse.json({
      totalUsers,
      totalAccounts,
      totalTasks,
      activeAccounts,
      todayStats: {
        success: todayLogs.find((l) => l.status === 'SUCCESS')?._count || 0,
        failed: todayLogs.find((l) => l.status === 'FAILED')?._count || 0,
        skipped: todayLogs.find((l) => l.status === 'SKIPPED')?._count || 0,
        captcha: todayLogs.find((l) => l.status === 'CAPTCHA')?._count || 0,
      },
      recentLogs,
    });
  } catch (error) {
    console.error('Admin stats error:', error);
    return NextResponse.json({ error: '获取统计数据失败' }, { status: 500 });
  }
}
