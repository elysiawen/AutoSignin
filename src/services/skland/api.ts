/**
 * 森空岛 API 客户端
 * 移植自 skland-kit
 */

import axios, { AxiosInstance } from 'axios';
import { createLogger } from '@/lib/logger';
import { buildSignedHeaders, getDid } from './crypto';

const log = createLogger('森空岛API');

// ==================== 常量 ====================

const SKLAND_BASE_URL = 'https://zonai.skland.com';
const HYPERGRYPH_URL = 'https://as.hypergryph.com';
const SKLAND_APP_CODE = '4ca99fa6b56cc2ba';

// ==================== 类型定义 ====================

export interface SklandResponse<T = any> {
  code: number;
  message: string;
  data: T;
}

export interface GrantAuthorizeCodeResponse {
  code: string;
  uid: string;
}

export interface GenerateCredResponse {
  cred: string;
  userId: string;
  token: string;
}

export interface AppBindingRole {
  serverId: string;
  serverType: string;
  serverName: string;
  roleId: string;
  nickname: string;
  level: number;
  isDefault: boolean;
  isBanned: boolean;
}

export interface AppBindingPlayer {
  uid: string;
  isOfficial: boolean;
  isDefault: boolean;
  channelMasterId: string;
  channelName: string;
  nickName: string;
  isDelete: boolean;
  gameName: string;
  gameId: number;
  roles: AppBindingRole[];
  defaultRole?: AppBindingRole;
}

export interface BindingResponse {
  list: Array<{
    appCode: string;
    bindingList: AppBindingPlayer[];
  }>;
}

export interface ArknightsAttendanceRecord {
  ts: string;
}

export interface ArknightsAttendanceStatus {
  currentTs: string;
  calendar: any[];
  records: ArknightsAttendanceRecord[];
  resourceInfoMap: Record<string, { name: string; type: string }>;
}

export interface ArknightsAttendanceAwards {
  ts: string;
  awards: Array<{
    resource: { id: string; name: string; type: string };
    count: number;
  }>;
}

export interface EndfieldAttendanceStatus {
  currentTs: string;
  calendar: any[];
  first: any[];
  hasToday: boolean;
  resourceInfoMap: Record<string, { name: string; count?: number }>;
}

export interface EndfieldAttendanceAwards {
  awardIds: Array<{ id: string }>;
  resourceInfoMap: Record<string, { name: string; count?: number }>;
  tomorrowAwardIds: Array<{ id: string }>;
  ts: string;
}

// ==================== HTTP 客户端 ====================

function createClient(): AxiosInstance {
  return axios.create({
    baseURL: SKLAND_BASE_URL,
    timeout: 15000,
  });
}

// ==================== API 函数 ====================

/**
 * 解析 OAuth token - 支持原始 token 或完整 JSON 响应
 */
function parseOAuthToken(input: string): string {
  const token = input.trim();
  try {
    const parsed = JSON.parse(token);
    if (typeof parsed?.data?.content === 'string') return parsed.data.content;
  } catch {}
  return token;
}

/**
 * 鹰角 OAuth token → authorize code
 */
export async function grantAuthorizeCode(token: string, dId: string): Promise<GrantAuthorizeCodeResponse> {
  log.info('获取 authorize code');

  const response = await axios.post(
    `${HYPERGRYPH_URL}/user/oauth2/v2/grant`,
    {
      appCode: SKLAND_APP_CODE,
      token: parseOAuthToken(token),
      type: 0,
    },
    {
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Linux; Android 12; SM-A5560 Build/V417IR; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/101.0.4951.61 Safari/537.36; SKLand/1.52.1',
        'dId': dId,
        'x-requested-with': 'com.hypergryph.skland',
      },
      timeout: 10000,
    },
  );

  const data = response.data;
  if (data.status !== 0 || !data.data) {
    throw new Error(`获取 authorize code 失败: ${data.msg || data.message || '未知错误'}`);
  }

  return {
    code: data.data.code,
    uid: data.data.uid,
  };
}

/**
 * authorize code → cred + token
 */
export async function generateCredByCode(code: string, dId: string): Promise<GenerateCredResponse> {
  log.info('换取 cred 和 token');

  const url = `${SKLAND_BASE_URL}/web/v1/user/auth/generate_cred_by_code`;
  const body = { code, kind: 1 };

  // 注意: 这个端点不需要签名，只需要基本头信息
  const timestamp = String(Math.floor(Date.now() / 1000));
  const response = await axios.post(url, body, {
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
      'Referer': 'https://www.skland.com/',
      'Origin': 'https://www.skland.com',
      'dId': dId,
      'platform': '3',
      'timestamp': timestamp,
      'vName': '1.0.0',
    },
    timeout: 10000,
  });

  const data: SklandResponse = response.data;
  if (data.code !== 0) {
    throw new Error(`换取 cred 失败: ${data.message}`);
  }

  return {
    cred: data.data.cred,
    userId: data.data.userId,
    token: data.data.token,
  };
}

/**
 * 刷新 access token
 */
export async function refreshTokenApi(
  cred: string,
  token: string,
  dId: string,
): Promise<{ token: string }> {
  log.info('刷新 token');

  const url = `${SKLAND_BASE_URL}/web/v1/auth/refresh`;
  const headers = await buildSignedHeaders(token, url, undefined, dId, cred);

  const response = await axios.get(url, { headers, timeout: 10000 });
  const data: SklandResponse = response.data;

  if (data.code !== 0) {
    throw new Error(`刷新 token 失败: ${data.message}`);
  }

  return { token: data.data.token };
}

/**
 * 获取所有绑定的游戏角色
 */
export async function getBinding(
  cred: string,
  token: string,
  dId: string,
): Promise<BindingResponse> {
  log.info('获取绑定角色');

  const url = `${SKLAND_BASE_URL}/api/v1/game/player/binding`;
  const headers = await buildSignedHeaders(token, url, undefined, dId, cred);

  const response = await axios.get(url, { headers, timeout: 10000 });
  const data: SklandResponse = response.data;

  if (data.code !== 0) {
    throw new Error(`获取绑定角色失败: ${data.message}`);
  }

  return data.data;
}

/**
 * 获取明日方舟签到状态
 */
export async function getArknightsAttendanceStatus(
  uid: string,
  gameId: number,
  cred: string,
  token: string,
  dId: string,
): Promise<ArknightsAttendanceStatus> {
  const url = `${SKLAND_BASE_URL}/api/v1/game/attendance?uid=${uid}&gameId=${gameId}`;
  const headers = await buildSignedHeaders(token, url, undefined, dId, cred);

  const response = await axios.get(url, { headers, timeout: 10000 });
  const data: SklandResponse = response.data;

  if (data.code !== 0) {
    throw new Error(`获取签到状态失败: ${data.message}`);
  }

  return data.data;
}

/**
 * 执行明日方舟签到
 */
export async function doArknightsAttendance(
  uid: string,
  gameId: number,
  cred: string,
  token: string,
  dId: string,
): Promise<ArknightsAttendanceAwards> {
  log.info(`执行明日方舟签到: uid=${uid}, gameId=${gameId}`);

  const url = `${SKLAND_BASE_URL}/api/v1/game/attendance`;
  const body = { uid, gameId };
  const headers = await buildSignedHeaders(token, url, body, dId, cred);

  const response = await axios.post(url, body, { headers, timeout: 10000 });
  const data: SklandResponse = response.data;

  if (data.code !== 0) {
    throw new Error(`签到失败: ${data.message}`);
  }

  return data.data;
}

/**
 * 获取终末地签到状态
 */
export async function getEndfieldAttendanceStatus(
  skGameRole: string,
  cred: string,
  token: string,
  dId: string,
): Promise<EndfieldAttendanceStatus> {
  const url = `${SKLAND_BASE_URL}/api/v1/game/endfield/attendance`;
  const headers = {
    ...(await buildSignedHeaders(token, url, undefined, dId, cred)),
    'sk-game-role': skGameRole,
  };

  const response = await axios.get(url, { headers, timeout: 10000 });
  const data: SklandResponse = response.data;

  if (data.code !== 0) {
    throw new Error(`获取终末地签到状态失败: ${data.message}`);
  }

  return data.data;
}

/**
 * 执行终末地签到
 */
export async function doEndfieldAttendance(
  skGameRole: string,
  cred: string,
  token: string,
  dId: string,
): Promise<EndfieldAttendanceAwards> {
  log.info(`执行终末地签到: role=${skGameRole}`);

  const url = `${SKLAND_BASE_URL}/api/v1/game/endfield/attendance`;
  const headers = {
    ...(await buildSignedHeaders(token, url, undefined, dId, cred)),
    'sk-game-role': skGameRole,
    'referer': 'https://game.skland.com/',
    'origin': 'https://game.skland.com/',
  };

  const response = await axios.post(url, undefined, { headers, timeout: 10000 });
  const data: SklandResponse = response.data;

  if (data.code !== 0) {
    throw new Error(`终末地签到失败: ${data.message}`);
  }

  return data.data;
}

// ==================== 工具函数 ====================

/**
 * 判断今日是否已签到（明日方舟）
 */
export function isArknightsAttendedToday(status: ArknightsAttendanceStatus): boolean {
  const todayInShanghai = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());

  return status.records.some((record) => {
    const recordDate = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Shanghai',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date(Number(record.ts) * 1000));
    return recordDate === todayInShanghai;
  });
}

/**
 * 格式化明日方舟奖励
 */
export function formatArknightsAwards(awards: ArknightsAttendanceAwards['awards']): string {
  return awards.map(a => `「${a.resource.name}」${a.count}个`).join('、');
}

/**
 * 格式化终末地奖励
 */
export function formatEndfieldAwards(
  awardIds: EndfieldAttendanceAwards['awardIds'],
  resourceInfoMap: EndfieldAttendanceAwards['resourceInfoMap'],
): string {
  return awardIds.map(a => {
    const award = resourceInfoMap[a.id];
    return award ? `「${award.name}」${award.count ?? 1}个` : '「未知奖励」1个';
  }).join('、');
}

/**
 * 构建终末地 sk-game-role header
 * 格式: {gameId}_{roleId}_{serverId}
 */
export function buildSkGameRole(gameId: number, roleId: string, serverId: string): string {
  return `${gameId}_${roleId}_${serverId}`;
}
