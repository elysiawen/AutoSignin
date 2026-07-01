import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { createQrLogin, queryQrLoginStatus } from '@/tools/mys-qr-login';
import { getLToken, getCookieToken } from '@/tools/mys-login';
import { ensureMiyousheDevice, type MiyousheDeviceConfig } from '@/tools/device';

/**
 * POST /api/tools/mys-qr-login
 *
 * 米游社扫码登录
 *
 * Body:
 * - action: 'create' | 'query'
 * - ticket?: 二维码 ticket（query 时必填）
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const body = await request.json();
    const { action, ticket } = body;

    // 加载或生成该用户的米游社设备信息（持久化在 Device 表）
    const device = await ensureMiyousheDevice(session.user.id!);

    // ==================== 创建二维码 ====================
    if (action === 'create') {
      try {
        const result = await createQrLogin(device);
        return NextResponse.json({
          success: true,
          url: result.url,
          ticket: result.ticket,
        });
      } catch (error: any) {
        console.error('创建二维码失败:', error);
        return NextResponse.json(
          { error: error.message || '创建二维码失败' },
          { status: 500 },
        );
      }
    }

    // ==================== 查询登录状态 ====================
    if (action === 'query') {
      if (!ticket) {
        return NextResponse.json({ error: 'ticket 不能为空' }, { status: 400 });
      }

      try {
        const result = await queryQrLoginStatus(ticket, device);

        // 未确认，返回状态即可
        if (result.status !== 'Confirmed') {
          return NextResponse.json({
            success: true,
            status: result.status,
          });
        }

        // 已确认，用 stoken 补充 ltoken 和 cookie_token
        let ltoken = '';
        let cookieToken = '';
        try {
          ltoken = await getLToken(result.stoken!, result.mid!, device);
        } catch (e) {
          console.warn('扫码登录获取 ltoken 失败:', e);
        }
        try {
          cookieToken = await getCookieToken(result.stoken!, result.mid!, device);
        } catch (e) {
          console.warn('扫码登录获取 cookie_token 失败:', e);
        }

        return NextResponse.json({
          success: true,
          status: 'Confirmed',
          accountId: result.accountId,
          mid: result.mid,
          stoken: result.stoken,
          ltoken,
          cookieToken,
          userInfo: {
            accountName: '',
            email: '',
            mobile: '',
          },
        });
      } catch (error: any) {
        // ticket 已消费或过期，返回 Consumed 让前端停止轮询（不再返回 500）
        return NextResponse.json({
          success: true,
          status: 'Consumed',
        });
      }
    }

    return NextResponse.json({ error: '无效的 action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || '服务器错误' },
      { status: 500 },
    );
  }
}
