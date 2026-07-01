import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';

/**
 * GET /api/notifications/channels
 * 获取所有启用的通知渠道（用户可见）
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const channels = await prisma.notificationChannel.findMany({
      where: { enabled: true },
      select: {
        id: true,
        name: true,
        provider: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(channels);
  } catch (error) {
    console.error('Get notification channels error:', error);
    return NextResponse.json({ error: '获取通知渠道失败' }, { status: 500 });
  }
}
