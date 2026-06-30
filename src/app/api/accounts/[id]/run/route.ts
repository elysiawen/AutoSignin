import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { executeAccountTasks } from '@/lib/scheduler';

// 手动执行账号的所有任务
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

    // 验证账号归属
    const account = await prisma.account.findFirst({
      where: { id, userId },
    });

    if (!account) {
      return NextResponse.json({ error: '账号不存在' }, { status: 404 });
    }

    // 执行任务
    const results = await executeAccountTasks(id);

    return NextResponse.json({
      message: '任务执行完成',
      results,
    });
  } catch (error) {
    console.error('Run account tasks error:', error);
    return NextResponse.json({ error: '执行任务失败' }, { status: 500 });
  }
}
