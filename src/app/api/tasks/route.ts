import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { rescheduleAccount } from '@/lib/scheduler';

// 获取任务列表
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('accountId');

    const where: any = { userId };
    if (accountId) {
      where.accountId = accountId;
    }

    const tasks = await prisma.task.findMany({
      where,
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
          take: 1,
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(tasks);
  } catch (error) {
    console.error('Get tasks error:', error);
    return NextResponse.json({ error: '获取任务列表失败' }, { status: 500 });
  }
}

// 创建任务
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const body = await request.json();
    const { accountId, type, config, cronExpr, name } = body;

    // 验证必填字段
    if (!accountId || !type) {
      return NextResponse.json(
        { error: '账号和任务类型不能为空' },
        { status: 400 }
      );
    }

    // 验证账号归属
    const account = await prisma.account.findFirst({
      where: { id: accountId, userId },
    });

    if (!account) {
      return NextResponse.json({ error: '账号不存在' }, { status: 404 });
    }

    // 验证任务类型与平台匹配
    const taskPlatform = getTaskPlatform(type);
    if (taskPlatform && taskPlatform !== account.platform) {
      return NextResponse.json(
        { error: '任务类型与账号平台不匹配' },
        { status: 400 }
      );
    }

    // 检查是否已存在相同任务
    const existingTask = await prisma.task.findFirst({
      where: {
        userId,
        accountId,
        type,
      },
    });

    if (existingTask) {
      return NextResponse.json(
        { error: '该账号已存在相同类型的任务' },
        { status: 400 }
      );
    }

    const task = await prisma.task.create({
      data: {
        userId,
        accountId,
        name: name || null,
        type,
        config: config || null,
      },
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

    // 重新调度账号
    await rescheduleAccount(accountId);

    return NextResponse.json(
      { message: '任务创建成功', task },
      { status: 201 }
    );
  } catch (error) {
    console.error('Create task error:', error);
    return NextResponse.json({ error: '创建任务失败' }, { status: 500 });
  }
}

// 获取任务类型对应的平台
function getTaskPlatform(taskType: string): string | null {
  const platformMap: Record<string, string> = {
    MIYOUSHE_CHECKIN: 'MIYOUSHE',
    MIYOUSHE_READ: 'MIYOUSHE',
    MIYOUSHE_LIKE: 'MIYOUSHE',
    MIYOUSHE_SHARE: 'MIYOUSHE',
    MIYOUSHE_COINS: 'MIYOUSHE',
    GENSHIN_CN: 'MIYOUSHE',
    HONKAI2_CN: 'MIYOUSHE',
    HONKAI3RD_CN: 'MIYOUSHE',
    TEARS_OF_THEMIS_CN: 'MIYOUSHE',
    HONKAI_SR_CN: 'MIYOUSHE',
    ZZZ_CN: 'MIYOUSHE',
    GENSHIN_OS: 'HOYOLAB',
    HONKAI3RD_OS: 'HOYOLAB',
    HONKAI_SR_OS: 'HOYOLAB',
    ZZZ_OS: 'HOYOLAB',
    CLOUD_GENSHIN: 'MIYOUSHE',
    CLOUD_ZZZ: 'MIYOUSHE',
    KUJIEQU_WUWA: 'KUJIEQU',
    KUJIEQU_PGR: 'KUJIEQU',
    KUJIEQU_FORUM: 'KUJIEQU',
    TAYGEDO_SIGNIN: 'TAYGEDO',
    TAYGEDO_GAMESIGNIN: 'TAYGEDO',
    TAYGEDO_COINS: 'TAYGEDO',
    TAYGEDO_CLOUD: 'TAYGEDO',
    SKLAND_ARKNIGHTS: 'SKLAND',
    SKLAND_ENDFIELD: 'SKLAND',
  };
  return platformMap[taskType] || null;
}
