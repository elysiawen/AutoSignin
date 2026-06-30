import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getSchedulerStatus, executeAllTasks } from '@/lib/scheduler';

// 获取调度器状态
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }
    if ((session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: '权限不足' }, { status: 403 });
    }

    const status = await getSchedulerStatus();

    return NextResponse.json({
      enabled: true,
      scheduler: status,
    });
  } catch (error) {
    return NextResponse.json({ error: '获取调度器状态失败' }, { status: 500 });
  }
}

// 执行操作
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
    const { action } = body;

    switch (action) {
      case 'executeAll':
        const results = await executeAllTasks();
        return NextResponse.json({
          message: '所有任务执行完成',
          results,
        });

      default:
        return NextResponse.json({ error: '未知操作' }, { status: 400 });
    }
  } catch (error) {
    return NextResponse.json({ error: '操作失败' }, { status: 500 });
  }
}
