import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { encrypt, decrypt } from '@/lib/utils';
import { rescheduleAccount, unscheduleAccount } from '@/lib/scheduler';
import { createKuroClient, GameType } from '@/services/kuro';

// 获取单个账号详情
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const isAdmin = (session.user as any).role === 'ADMIN';
    const { id } = await params;

    const account = await prisma.account.findFirst({
      where: {
        id,
        ...(isAdmin ? {} : { userId }),
      },
      include: {
        tasks: true,
      },
    });

    if (!account) {
      return NextResponse.json({ error: '账号不存在' }, { status: 404 });
    }

    // 返回解密的 cookie（仅限本人或管理员查看）
    return NextResponse.json({
      ...account,
      cookie: decrypt(account.cookie),
      stoken: account.stoken ? decrypt(account.stoken) : null,
    });
  } catch (error) {
    console.error('Get account error:', error);
    return NextResponse.json({ error: '获取账号详情失败' }, { status: 500 });
  }
}

// 更新账号
export async function PUT(
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
    const body = await request.json();
    const { name, cookie, stoken, uid, mid, extra, isActive, cronExpr } = body;

    // 验证账号归属
    const existingAccount = await prisma.account.findFirst({
      where: { id, userId },
    });

    if (!existingAccount) {
      return NextResponse.json({ error: '账号不存在' }, { status: 404 });
    }

    // 准备更新数据
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (cookie !== undefined) updateData.cookie = encrypt(cookie);
    if (stoken !== undefined) updateData.stoken = stoken ? encrypt(stoken) : null;
    if (uid !== undefined) updateData.uid = uid || null;
    if (mid !== undefined) updateData.mid = mid || null;

    // 库街区账号：更新Token时自动获取用户ID和角色ID
    if (existingAccount.platform === 'KUJIEQU' && cookie) {
      try {
        const kuroClient = createKuroClient(
          cookie,
          extra?.devcode || (existingAccount.extra as any)?.devcode,
          extra?.distinct_id || (existingAccount.extra as any)?.distinct_id
        );

        const finalExtra: any = { ...(existingAccount.extra as any || {}), ...extra };

        // 获取用户ID
        if (!finalExtra.kuroUserId) {
          const kuroUserId = await kuroClient.getUserId();
          if (kuroUserId) {
            finalExtra.kuroUserId = kuroUserId;
            console.log(`自动获取库街区用户ID成功: ${kuroUserId}`);
          }
        }

        // 获取鸣潮角色ID
        if (!finalExtra.wwroleId) {
          const wwroleId = await kuroClient.getGameRoleId(GameType.WUWA);
          if (wwroleId) {
            finalExtra.wwroleId = wwroleId;
            console.log(`自动获取鸣潮角色ID成功: ${wwroleId}`);
          }
        }

        // 获取战双角色ID
        if (!finalExtra.pgrRoleId) {
          const pgrRoleId = await kuroClient.getGameRoleId(GameType.PGR);
          if (pgrRoleId) {
            finalExtra.pgrRoleId = pgrRoleId;
            console.log(`自动获取战双角色ID成功: ${pgrRoleId}`);
          }
        }

        updateData.extra = finalExtra;
      } catch (error) {
        console.error('自动获取库街区信息失败:', error);
        if (extra !== undefined) {
          // 合并而不是覆盖
          const existingExtra = (existingAccount.extra as any) || {};
          updateData.extra = { ...existingExtra, ...extra };
        }
      }
    } else if (extra !== undefined) {
      // 合并而不是覆盖，过滤掉 undefined 值
      const existingExtra = (existingAccount.extra as any) || {};
      const filteredExtra = Object.fromEntries(
        Object.entries(extra).filter(([_, v]) => v !== undefined)
      );
      updateData.extra = { ...existingExtra, ...filteredExtra };
    }

    // 更新定时表达式
    if (cronExpr !== undefined) {
      if (cronExpr) {
        const { validate } = await import('node-cron');
        if (!validate(cronExpr)) {
          return NextResponse.json({ error: '无效的 Cron 表达式' }, { status: 400 });
        }
      }
      updateData.cronExpr = cronExpr || null;
      // 如果设置了定时，自动启用；如果清空定时，自动禁用
      updateData.isActive = !!cronExpr;
    }

    // 如果手动设置 isActive，覆盖上面的逻辑
    if (isActive !== undefined) updateData.isActive = isActive;

    const account = await prisma.account.update({
      where: { id },
      data: updateData,
    });

    // 重新调度账号
    await rescheduleAccount(id);

    return NextResponse.json({
      message: '账号更新成功',
      account: {
        ...account,
        cookie: '***已隐藏***',
        stoken: account.stoken ? '***已隐藏***' : null,
      },
    });
  } catch (error) {
    console.error('Update account error:', error);
    return NextResponse.json({ error: '更新账号失败' }, { status: 500 });
  }
}

// 删除账号
export async function DELETE(
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
    const existingAccount = await prisma.account.findFirst({
      where: { id, userId },
    });

    if (!existingAccount) {
      return NextResponse.json({ error: '账号不存在' }, { status: 404 });
    }

    // 删除账号（级联删除关联的任务和日志）
    unscheduleAccount(id);
    await prisma.account.delete({
      where: { id },
    });

    return NextResponse.json({ message: '账号删除成功' });
  } catch (error) {
    console.error('Delete account error:', error);
    return NextResponse.json({ error: '删除账号失败' }, { status: 500 });
  }
}
