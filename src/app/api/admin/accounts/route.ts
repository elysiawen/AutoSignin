import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }
    if ((session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: '权限不足' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const platform = searchParams.get('platform');
    const search = searchParams.get('search') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');

    const where: any = {};
    if (platform) {
      where.platform = platform;
    }
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { user: { name: { contains: search, mode: 'insensitive' } } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [accounts, total] = await Promise.all([
      prisma.account.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, email: true } },
          _count: { select: { tasks: true } },
          tasks: {
            select: {
              id: true,
              type: true,
              logs: { take: 1, orderBy: { createdAt: 'desc' }, select: { status: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.account.count({ where }),
    ]);

    const sanitized = accounts.map((account) => ({
      ...account,
      cookie: '***',
      stoken: account.stoken ? '***' : null,
    }));

    return NextResponse.json({ accounts: sanitized, total });
  } catch (error) {
    console.error('Admin get accounts error:', error);
    return NextResponse.json({ error: '获取账号列表失败' }, { status: 500 });
  }
}
