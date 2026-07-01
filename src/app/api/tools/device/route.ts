import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';

/**
 * GET /api/tools/device
 *
 * 获取当前用户所有平台的模拟设备信息
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const devices = await prisma.device.findMany({
      where: { userId: session.user.id! },
      orderBy: { updatedAt: 'desc' },
    });

    return NextResponse.json({ devices });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || '服务器错误' },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/tools/device?id=xxx
 *
 * 删除指定设备信息（下次使用工具时会重新生成）
 * 不传 id 则删除当前用户所有设备信息
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (id) {
      const device = await prisma.device.findFirst({
        where: { id, userId: session.user.id! },
      });
      if (!device) {
        return NextResponse.json({ error: '设备不存在' }, { status: 404 });
      }
      await prisma.device.delete({ where: { id } });
    } else {
      await prisma.device.deleteMany({
        where: { userId: session.user.id! },
      });
    }

    return NextResponse.json({ success: true, message: '设备信息已删除，下次使用工具时会重新生成' });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || '服务器错误' },
      { status: 500 },
    );
  }
}
