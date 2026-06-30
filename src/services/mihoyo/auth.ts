import { AxiosInstance, AxiosError } from 'axios';
import { API } from './api';
import { createLogger } from '@/lib/logger';

const log = createLogger('米哈游认证');

/**
 * 通过 stoken 获取新的 cookie_token
 * 当 cookie 过期时使用
 */
export async function refreshCookieToken(
  client: AxiosInstance,
  stoken: string,
  uid: string,
  mid?: string
): Promise<string | null> {
  log.info('尝试刷新 cookie_token...');

  try {
    // 构建带 stoken 的 cookie
    let cookie = `stuid=${uid};stoken=${stoken}`;
    if (mid) {
      cookie += `;mid=${mid}`;
    }

    const response = await client.get(API.GET_COOKIE_TOKEN_BY_STOKEN, {
      headers: {
        Cookie: cookie,
      },
    });

    const data = response.data;
    log.debug('刷新 cookie_token 响应', { retcode: data.retcode });

    if (data.retcode === 0) {
      const newCookieToken = data.data.cookie_token;
      log.info('cookie_token 刷新成功');
      return newCookieToken;
    }

    log.error('刷新 cookie_token 失败', { retcode: data.retcode, message: data.message });
    return null;
  } catch (error: any) {
    log.error('刷新 cookie_token 异常', { message: error.message });
    return null;
  }
}

/**
 * 更新 cookie 中的 cookie_token
 */
export function updateCookieInString(
  originalCookie: string,
  newCookieToken: string
): string {
  const cookieTokenMatch = originalCookie.match(/cookie_token=(.*?)(?:;|$)/);
  if (cookieTokenMatch) {
    return originalCookie.replace(cookieTokenMatch[1], newCookieToken);
  }
  // 如果没有 cookie_token，添加一个
  return `${originalCookie};cookie_token=${newCookieToken}`;
}

/**
 * 检查是否需要 mid（v2_stoken 需要）
 */
export function requireMid(stoken: string): boolean {
  return stoken.startsWith('v2_');
}

/**
 * 从 cookie 中提取 login_ticket
 */
export function getLoginTicket(cookie: string): string | null {
  const match = cookie.match(/login_ticket=(.*?)(?:;|$)/);
  return match ? match[1] : null;
}

/**
 * 通过 login_ticket 获取 stoken
 */
export async function getStokenByLoginTicket(
  client: AxiosInstance,
  loginTicket: string,
  uid: string
): Promise<string | null> {
  log.info('通过 login_ticket 获取 stoken...');

  try {
    const response = await client.get(API.GET_MULTI_TOKEN, {
      params: {
        login_ticket: loginTicket,
        token_types: '3',
        uid: uid,
      },
    });

    const data = response.data;
    if (data.retcode === 0) {
      log.info('获取 stoken 成功');
      return data.data.list[0].token;
    }

    log.error('获取 stoken 失败', { retcode: data.retcode, message: data.message });
    return null;
  } catch (error: any) {
    log.error('获取 stoken 异常', { message: error.message });
    return null;
  }
}
