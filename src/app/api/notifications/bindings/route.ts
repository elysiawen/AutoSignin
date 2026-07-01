import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';

/**
 * GET /api/notifications/bindings
 * 获取当前用户的所有通知绑定
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const userId = (session.user as any).id;

    const bindings = await prisma.notificationBinding.findMany({
      where: { userId },
      include: {
        channel: {
          select: { id: true, name: true, provider: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(bindings);
  } catch (error) {
    console.error('Get notification bindings error:', error);
    return NextResponse.json({ error: '获取通知绑定失败' }, { status: 500 });
  }
}

/**
 * POST /api/notifications/bindings
 * 创建通知绑定
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const body = await request.json();
    const { channelId, target, events, sources } = body;

    if (!channelId || !target || !events?.length) {
      return NextResponse.json({ error: '渠道、目标和事件类型不能为空' }, { status: 400 });
    }

    // 验证渠道存在且启用
    const channel = await prisma.notificationChannel.findFirst({
      where: { id: channelId, enabled: true },
    });
    if (!channel) {
      return NextResponse.json({ error: '通知渠道不存在或已禁用' }, { status: 404 });
    }

    // 验证事件类型
    const validEvents = ['SUCCESS', 'FAILED', 'CAPTCHA'];
    const invalidEvents = events.filter((e: string) => !validEvents.includes(e));
    if (invalidEvents.length > 0) {
      return NextResponse.json({ error: `无效的事件类型: ${invalidEvents.join(', ')}` }, { status: 400 });
    }

    // 验证来源类型
    const validSources = ['AUTO', 'MANUAL'];
    const finalSources = sources?.length ? sources.filter((s: string) => validSources.includes(s)) : ['AUTO', 'MANUAL'];
    if (finalSources.length === 0) {
      return NextResponse.json({ error: '请至少选择一种来源类型' }, { status: 400 });
    }

    // 检查是否已绑定
    const existing = await prisma.notificationBinding.findUnique({
      where: { userId_channelId: { userId, channelId } },
    });
    if (existing) {
      return NextResponse.json({ error: '已绑定该渠道' }, { status: 400 });
    }

    const binding = await prisma.notificationBinding.create({
      data: {
        userId,
        channelId,
        target,
        events,
        sources: finalSources,
      },
      include: {
        channel: { select: { id: true, name: true, provider: true } },
      },
    });

    return NextResponse.json({ message: '绑定成功', binding }, { status: 201 });
  } catch (error) {
    console.error('Create notification binding error:', error);
    return NextResponse.json({ error: '创建绑定失败' }, { status: 500 });
  }
}

/**
 * PUT /api/notifications/bindings?id=xxx
 * 更新通知绑定
 */
export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: '缺少绑定 ID' }, { status: 400 });
    }

    // 验证归属
    const existing = await prisma.notificationBinding.findFirst({
      where: { id, userId },
    });
    if (!existing) {
      return NextResponse.json({ error: '绑定不存在' }, { status: 404 });
    }

    const body = await request.json();
    const { target, events, sources, enabled } = body;

    const updateData: any = {};
    if (target !== undefined) updateData.target = target;
    if (events !== undefined) updateData.events = events;
    if (sources !== undefined) updateData.sources = sources;
    if (enabled !== undefined) updateData.enabled = enabled;

    const binding = await prisma.notificationBinding.update({
      where: { id },
      data: updateData,
      include: {
        channel: { select: { id: true, name: true, provider: true } },
      },
    });

    return NextResponse.json({ message: '更新成功', binding });
  } catch (error) {
    console.error('Update notification binding error:', error);
    return NextResponse.json({ error: '更新绑定失败' }, { status: 500 });
  }
}

/**
 * DELETE /api/notifications/bindings?id=xxx
 * 删除通知绑定
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: '缺少绑定 ID' }, { status: 400 });
    }

    // 验证归属
    const existing = await prisma.notificationBinding.findFirst({
      where: { id, userId },
    });
    if (!existing) {
      return NextResponse.json({ error: '绑定不存在' }, { status: 404 });
    }

    await prisma.notificationBinding.delete({ where: { id } });

    return NextResponse.json({ message: '已解除绑定' });
  } catch (error) {
    console.error('Delete notification binding error:', error);
    return NextResponse.json({ error: '删除绑定失败' }, { status: 500 });
  }
}
