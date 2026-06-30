import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }
    if ((session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: '权限不足' }, { status: 403 });
    }

    const body = await request.json();
    const { days } = body;

    if (days === undefined || days === null) {
      return NextResponse.json({ error: '请选择保留天数' }, { status: 400 });
    }

    let deletedCount: number;

    if (days === 0) {
      // 全部清理
      const result = await prisma.taskLog.deleteMany({});
      deletedCount = result.count;
    } else if (typeof days === 'number' && days > 0) {
      // 按天数清理
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);

      const result = await prisma.taskLog.deleteMany({
        where: {
          createdAt: { lt: cutoff },
        },
      });
      deletedCount = result.count;
    } else {
      return NextResponse.json({ error: '无效的天数' }, { status: 400 });
    }

    return NextResponse.json({
      message: `清理完成，共删除 ${deletedCount} 条日志`,
      deletedCount,
    });
  } catch (error) {
    return NextResponse.json({ error: '清理失败' }, { status: 500 });
  }
}
