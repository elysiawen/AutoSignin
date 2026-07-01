import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { createLoginCaptcha, loginByMobileCaptcha, getLToken, getCookieToken } from '@/tools/mys-login';
import { ensureMiyousheDevice, type MiyousheDeviceConfig } from '@/tools/device';

/**
 * POST /api/auth/mys-login
 *
 * 米游社手机号验证码登录
 *
 * Body:
 * - action: 'captcha' | 'login'
 * - phone: 手机号
 * - code?: 验证码（login 时必填）
 * - actionType?: 操作类型（login 时必填）
 * - aigis?: 极验验证数据（可选，格式：session_id;base64(gt_result)）
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const body = await request.json();
    const { action, phone, code, actionType, aigis } = body;

    if (!phone) {
      return NextResponse.json({ error: '手机号不能为空' }, { status: 400 });
    }

    // 加载或生成该用户的米游社设备信息（持久化在 Device 表）
    const device = await ensureMiyousheDevice(session.user.id!);

    // ==================== 发送验证码 ====================
    if (action === 'captcha') {
      try {
        const result = await createLoginCaptcha(phone, aigis, device);

        // 需要极验验证
        if (result.geetest) {
          return NextResponse.json({
            needGeetest: true,
            geetest: result.geetest,
            aigisSession: result.aigisSession,
          });
        }

        // 成功，返回 actionType
        return NextResponse.json({
          success: true,
          actionType: result.actionType,
          message: '验证码已发送',
        });
      } catch (error: any) {
        console.error('发送验证码失败:', error);
        return NextResponse.json(
          { error: error.message || '发送验证码失败', details: error.response?.data },
          { status: 500 },
        );
      }
    }

    // ==================== 登录 ====================
    if (action === 'login') {
      if (!code) {
        return NextResponse.json({ error: '验证码不能为空' }, { status: 400 });
      }
      if (!actionType) {
        return NextResponse.json({ error: 'actionType 不能为空' }, { status: 400 });
      }

      try {
        // 1. 登录获取 stoken
        const loginResult = await loginByMobileCaptcha(phone, code, actionType, aigis, device);

        // 检查是否需要极验验证
        if (loginResult.needGeetest) {
          return NextResponse.json({
            needGeetest: true,
            geetest: loginResult.geetest,
            aigisSession: loginResult.aigisSession,
          });
        }

        // 确保 stoken 和 mid 存在
        if (!loginResult.stoken || !loginResult.mid) {
          return NextResponse.json({ error: '登录失败，未获取到 Token' }, { status: 500 });
        }

        // 2. 获取 ltoken
        const ltoken = await getLToken(loginResult.stoken, loginResult.mid, device);

        // 3. 获取 cookie_token
        const cookieToken = await getCookieToken(loginResult.stoken, loginResult.mid, device);

        return NextResponse.json({
          success: true,
          message: '登录成功，Token 已获取',
          accountId: loginResult.accountId,
          mid: loginResult.mid,
          stoken: loginResult.stoken,
          ltoken,
          cookieToken,
          loginTicket: loginResult.loginTicket,
          userInfo: {
            accountName: '',
            email: '',
            mobile: phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2'),
          },
        });
      } catch (error: any) {
        return NextResponse.json(
          { error: error.message || '登录失败，请检查手机号和验证码' },
          { status: 500 },
        );
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
