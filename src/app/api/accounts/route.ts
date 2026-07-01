import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { encrypt } from '@/lib/utils';
import { createKuroClient, GameType } from '@/services/kuro';

// 获取账号列表
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const userId = (session.user as any).id;

    const accounts = await prisma.account.findMany({
      where: { userId },
      include: {
        _count: {
          select: { tasks: true },
        },
        tasks: {
          select: {
            id: true,
            type: true,
            name: true,
            logs: {
              take: 1,
              orderBy: { createdAt: 'desc' },
              select: {
                id: true,
                status: true,
                message: true,
                reward: true,
                duration: true,
                createdAt: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // 获取每个账号最近一次自动执行的统计
    const accountsWithStats = await Promise.all(
      accounts.map(async (account) => {
        // 获取该账号下所有任务的ID
        const taskIds = account.tasks.map(t => t.id);

        if (taskIds.length === 0) {
          return {
            ...account,
            cookie: '***已隐藏***',
            stoken: account.stoken ? '***已隐藏***' : null,
            extra: account.extra || null,
            lastAutoRun: null,
            stats: { success: 0, failed: 0 },
          };
        }

        // 获取最近一次自动执行的日志（按时间分组）
        const recentLogs = await prisma.taskLog.findMany({
          where: {
            taskId: { in: taskIds },
            message: { startsWith: '[自动]' },
          },
          orderBy: { createdAt: 'desc' },
          take: taskIds.length,
          select: {
            status: true,
            createdAt: true,
          },
        });

        // 统计成功和失败数量
        const stats = {
          success: recentLogs.filter(l => l.status === 'SUCCESS').length,
          failed: recentLogs.filter(l => l.status === 'FAILED').length,
        };

        const lastAutoRun = recentLogs.length > 0 ? recentLogs[0].createdAt : null;

        return {
          ...account,
          cookie: '***已隐藏***',
          stoken: account.stoken ? '***已隐藏***' : null,
          extra: account.extra || null,
          lastAutoRun,
          stats,
        };
      })
    );

    return NextResponse.json(accountsWithStats);
  } catch (error) {
    console.error('Get accounts error:', error);
    return NextResponse.json({ error: '获取账号列表失败' }, { status: 500 });
  }
}

// 添加账号
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const body = await request.json();
    const { platform, name, cookie, stoken, uid, mid, extra, cronExpr } = body;

    // 验证必填字段
    if (!platform || !name?.trim()) {
      return NextResponse.json({ error: '平台和名称不能为空' }, { status: 400 });
    }
    if (name.trim().length > 50) {
      return NextResponse.json({ error: '名称不能超过50个字符' }, { status: 400 });
    }

    // 按平台验证凭证
    if ((platform === 'MIYOUSHE' || platform === 'HOYOLAB') && !cookie) {
      return NextResponse.json({ error: 'Cookie 不能为空' }, { status: 400 });
    }
    if (platform === 'KUJIEQU' && !cookie) {
      return NextResponse.json({ error: 'Token 不能为空' }, { status: 400 });
    }
    if (platform === 'TAYGEDO') {
      if (extra?.taygedoLoginMode === 'password') {
        if (!extra?.phone || !extra?.password) {
          return NextResponse.json({ error: '手机号和密码不能为空' }, { status: 400 });
        }
      } else {
        if (!stoken) {
          return NextResponse.json({ error: 'Refresh Token 不能为空' }, { status: 400 });
        }
      }
    }

    // 验证平台类型
    const validPlatforms = ['MIYOUSHE', 'HOYOLAB', 'KUJIEQU', 'TAYGEDO', 'YIHUAN'];
    if (!validPlatforms.includes(platform)) {
      return NextResponse.json({ error: '无效的平台类型' }, { status: 400 });
    }

    // 加密敏感信息
    let encryptedCookie = cookie ? encrypt(cookie) : encrypt('');
    let encryptedStoken = stoken ? encrypt(stoken) : null;

    // 库街区账号：自动获取用户ID和角色ID
    let finalExtra = extra || {};
    if (platform === 'KUJIEQU') {
      try {
        const kuroClient = createKuroClient(
          cookie,
          extra?.devcode,
          extra?.distinct_id
        );

        if (!extra?.kuroUserId) {
          const kuroUserId = await kuroClient.getUserId();
          if (kuroUserId) finalExtra.kuroUserId = kuroUserId;
        }

        if (!extra?.wwroleId) {
          const wwroleId = await kuroClient.getGameRoleId(GameType.WUWA);
          if (wwroleId) finalExtra.wwroleId = wwroleId;
        }

        if (!extra?.pgrRoleId) {
          const pgrRoleId = await kuroClient.getGameRoleId(GameType.PGR);
          if (pgrRoleId) finalExtra.pgrRoleId = pgrRoleId;
        }
      } catch (error) {
        // 不影响账号添加，继续执行
      }
    }

    // 塔吉多密码模式：自动登录获取 tokens
    if (platform === 'TAYGEDO' && extra?.taygedoLoginMode === 'password' && extra?.phone && extra?.password) {
      try {
        const { createTaygedoClient, loginWithPassword, userCenterLogin } = await import('@/services/taygedo/api');
        const { ensureTaygedoDevice } = await import('@/tools/device');
        const device = await ensureTaygedoDevice(session.user.id!);

        const client = createTaygedoClient();
        const login = await loginWithPassword(client, extra.phone, extra.password, device.deviceId);
        const ucLogin = await userCenterLogin(client, login.token, login.userId, device.deviceId);

        encryptedCookie = encrypt(ucLogin.accessToken);
        encryptedStoken = encrypt(ucLogin.refreshToken);
        const { password: _, ...extraWithoutPassword } = finalExtra;
        finalExtra = {
          ...extraWithoutPassword,
          laohuToken: login.token,
          laohuUserId: login.userId,
          taygedoLoginMode: 'password',
        };
      } catch (error: any) {
        return NextResponse.json({ error: '塔吉多登录失败，请检查手机号和密码' }, { status: 400 });
      }
    }

    const account = await prisma.account.create({
      data: {
        userId,
        platform,
        name,
        cookie: encryptedCookie,
        stoken: encryptedStoken,
        uid: uid || null,
        mid: mid || null,
        extra: Object.keys(finalExtra).length > 0 ? finalExtra : null,
        cronExpr: cronExpr || null,
      },
    });

    return NextResponse.json(
      {
        message: '账号添加成功',
        account: {
          ...account,
          cookie: '***已隐藏***',
          stoken: account.stoken ? '***已隐藏***' : null,
          extra: account.extra || null,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Add account error:', error);
    return NextResponse.json({ error: '添加账号失败' }, { status: 500 });
  }
}
