import crypto from 'crypto';

// 米游社 Salt 值（从 setting.py 提取）
const SALTS = {
  // java提取，会跟随版本更新
  APP: '47f15f1b66bee46b816115d8e8e6ebb6',
  WEB: 'd9200c846b10886e8c874fc33c8f308b',
  // so提取 一般不会变
  X4: 'xV8v4Qu54lUKrEYFZkJhB8cuOh9Asafs',
  X6: 't0qEgfub6cvueAPgR5m9aQWWVciEer7v',
};

// 米游社版本和客户端类型
export const MIHYO_BBS_VERSION = '2.109.0';
export const CLIENT_TYPE = '2'; // 安卓
export const CLIENT_TYPE_WEB = '5'; // mobile web

// MD5 哈希
function md5(text: string): string {
  return crypto.createHash('md5').update(text).digest('hex');
}

// 获取当前时间戳（秒）
function timestamp(): number {
  return Math.floor(Date.now() / 1000);
}

// 生成随机字符串
function randomText(length: number): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * 生成 DS 签名（用于米游社 API）
 * @param web 是否为网页端请求
 */
export function generateDS(web: boolean = false): string {
  const salt = web ? SALTS.WEB : SALTS.APP;
  const t = timestamp().toString();
  const r = randomText(6);
  const c = md5(`salt=${salt}&t=${t}&r=${r}`);
  return `${t},${r},${c}`;
}

/**
 * 生成 DS2 签名（用于部分接口）
 * @param query 请求的查询参数
 * @param body 请求的主体内容
 */
export function generateDS2(query: string = '', body: string = ''): string {
  const salt = SALTS.X6;
  const t = timestamp().toString();
  const r = (Math.floor(Math.random() * 100000) + 100001).toString();
  const c = md5(`salt=${salt}&t=${t}&r=${r}&b=${body}&q=${query}`);
  return `${t},${r},${c}`;
}

/**
 * 使用 cookie 通过 uuid v3 生成设备 ID
 */
export function getDeviceId(cookie: string): string {
  return crypto.createHash('md5').update(cookie).digest('hex').substring(0, 32);
}

/**
 * 延迟执行
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 生成随机整数
 */
export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * 获取用户代理
 */
export function getUserAgent(customUA?: string): string {
  const defaultUA = `Mozilla/5.0 (Linux; Android 12; Unspecified Device) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/103.0.5060.129 Mobile Safari/537.36 miHoYoBBS/${MIHYO_BBS_VERSION}`;

  if (!customUA) {
    return defaultUA;
  }

  if (customUA.includes('miHoYoBBS')) {
    const index = customUA.indexOf('miHoYoBBS');
    const prefix = customUA[index - 1] === ' ' ? customUA.substring(0, index - 1) : customUA.substring(0, index);
    return `${prefix} miHoYoBBS/${MIHYO_BBS_VERSION}`;
  }

  return `${customUA} miHoYoBBS/${MIHYO_BBS_VERSION}`;
}

/**
 * 整理 cookie 格式
 */
export function tidyCookie(cookies: string): string {
  const cookieDict: Record<string, string> = {};
  const splitCookie = cookies.split(';');

  if (splitCookie.length < 2) {
    return cookies;
  }

  for (const cookie of splitCookie) {
    const trimmed = cookie.trim();
    if (!trimmed) continue;
    const [key, value] = trimmed.split('=', 2);
    cookieDict[key] = value;
  }

  return Object.entries(cookieDict)
    .map(([key, value]) => `${key}=${value}`)
    .join('; ');
}

/**
 * 从 cookie 中提取 UID
 */
export function getUidFromCookie(cookie: string): string | null {
  const match = cookie.match(/(account_id|ltuid|login_uid|ltuid_v2|account_id_v2)=(\d+)/);
  return match ? match[2] : null;
}

/**
 * 从 cookie 中提取 mid
 */
export function getMidFromCookie(cookie: string): string | null {
  const match = cookie.match(/(account_mid_v2|ltmid_v2|mid)=(.*?)(?:;|$)/);
  return match ? match[2] : null;
}

/**
 * 格式化分钟数为可读字符串
 */
export function formatMinutes(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours > 0) {
    return `${hours} 小时 ${mins} 分钟`;
  }
  return `${mins} 分钟`;
}
