import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';

/**
 * GET /api/admin/notifications/channels
 * 管理员获取所有通知渠道
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }
    if ((session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: '权限不足' }, { status: 403 });
    }

    const channels = await prisma.notificationChannel.findMany({
      include: {
        creator: { select: { id: true, name: true, email: true } },
        _count: { select: { bindings: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(channels);
  } catch (error) {
    console.error('Admin get notification channels error:', error);
    return NextResponse.json({ error: '获取通知渠道失败' }, { status: 500 });
  }
}

/**
 * POST /api/admin/notifications/channels
 * 管理员创建通知渠道
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }
    if ((session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: '权限不足' }, { status: 403 });
    }

    const userId = (session.user as any).id;
    const body = await request.json();
    const { name, provider, config } = body;

    if (!name?.trim() || !provider) {
      return NextResponse.json({ error: '名称和提供商不能为空' }, { status: 400 });
    }

    const validProviders = ['TELEGRAM', 'DISCORD', 'ONEBOT'];
    if (!validProviders.includes(provider)) {
      return NextResponse.json({ error: '无效的提供商类型' }, { status: 400 });
    }

    const channel = await prisma.notificationChannel.create({
      data: {
        name: name.trim(),
        provider,
        config: config || {},
        createdBy: userId,
      },
    });

    return NextResponse.json({ message: '渠道创建成功', channel }, { status: 201 });
  } catch (error) {
    console.error('Admin create notification channel error:', error);
    return NextResponse.json({ error: '创建渠道失败' }, { status: 500 });
  }
}

/**
 * PUT /api/admin/notifications/channels?id=xxx
 * 管理员更新通知渠道
 */
export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }
    if ((session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: '权限不足' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: '缺少渠道 ID' }, { status: 400 });
    }

    const body = await request.json();
    const { name, config, enabled } = body;

    const updateData: any = {};
    if (name !== undefined) updateData.name = name.trim();
    if (config !== undefined) updateData.config = config;
    if (enabled !== undefined) updateData.enabled = enabled;

    const channel = await prisma.notificationChannel.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ message: '渠道更新成功', channel });
  } catch (error) {
    console.error('Admin update notification channel error:', error);
    return NextResponse.json({ error: '更新渠道失败' }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/notifications/channels?id=xxx
 * 管理员删除通知渠道（级联删除所有绑定）
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }
    if ((session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: '权限不足' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: '缺少渠道 ID' }, { status: 400 });
    }

    await prisma.notificationChannel.delete({ where: { id } });

    return NextResponse.json({ message: '渠道已删除' });
  } catch (error) {
    console.error('Admin delete notification channel error:', error);
    return NextResponse.json({ error: '删除渠道失败' }, { status: 500 });
  }
}
