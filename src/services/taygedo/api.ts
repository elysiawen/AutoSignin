/**
 * 塔吉多 API 客户端
 * 移植自 taygedo-auto-attendance，适配 axios
 */

import axios, { AxiosInstance } from 'axios';
import crypto from 'crypto';
import { buildNativeRequest, buildH5Request, TAYGEDO_BASE_URL } from './protocol';
import { createLogger } from '@/lib/logger';

const log = createLogger('塔吉多API');

const LAOHU_BASE_URL = 'https://user.laohu.com';
const LAOHU_SECRET = '89155cc4e8634ec5b1b6364013b23e3e';
const CLOUD_APP_ID = '10597';
const CLOUD_APP_KEY = 'f1b7f11fc3774f898e387368cce4da04';
const CLOUD_CHANNEL_ID = '9';
const CLOUD_BID = 'com.pwrd.cloud.yh.laohu';
const CLOUD_SDK_VERSION = '1.34.0';
const CLOUD_APP_VERSION = '1.1.0';

// 塔吉多支持的游戏 ID
export const TAYGEDO_GAME_IDS = ['1256', '1257', '1289'] as const;

export interface LoginResult {
  token: string;
  userId: string;
}

export interface UserCenterLoginResult {
  accessToken: string;
  refreshToken: string;
  uid: string;
}

export interface RefreshTokenResult {
  accessToken: string;
  refreshToken: string;
  uid?: string;
}

export interface GameRole {
  roleId: string;
  roleName?: string;
}

export interface CoinTask {
  code: string;
  completeTimes: number;
  limitTimes: number;
}

export interface RecommendPost {
  postId: string;
  selfOperation?: { liked?: boolean };
}

export interface CoinState {
  todayCoin?: number;
  limitCoin?: number;
}

export interface CloudDurationResult {
  gave: number;
  remained?: number;
}

/**
 * 创建塔吉多 API 客户端
 */
export function createTaygedoClient(): AxiosInstance {
  return axios.create({
    timeout: 30000,
    headers: {
      'Accept': 'application/json',
      'User-Agent': 'okhttp/4.12.0',
    },
  });
}

// ==================== 老虎平台登录 ====================

/**
 * 老虎平台签名
 */
function laohuSign(data: Record<string, string>): string {
  const values = Object.keys(data).sort().map(key => data[key]).join('');
  return crypto.createHash('md5').update(`${values}${LAOHU_SECRET}`, 'utf8').digest('hex');
}

/**
 * AES-128-ECB 加密
 */
function aesBase64Encode(value: string): string {
  const key = Buffer.from(LAOHU_SECRET.slice(-16), 'utf8');
  const cipher = crypto.createCipheriv('aes-128-ecb', key, null);
  cipher.setAutoPadding(true);
  return Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]).toString('base64');
}

function signedLaohuBody(data: Record<string, string>): string {
  const withSign = { ...data, sign: laohuSign(data) };
  return new URLSearchParams(withSign).toString();
}

/**
 * 密码登录老虎平台
 */
export async function loginWithPassword(
  client: AxiosInstance,
  phone: string,
  password: string,
  deviceId: string,
): Promise<LoginResult> {
  log.info('密码登录老虎平台...');

  const body = signedLaohuBody({
    deviceType: 'LGE-AN10',
    idfa: '',
    sign: '',
    adm: '',
    deviceId,
    version: '1',
    deviceName: 'LGE-AN10',
    mac: '',
    t: String(Date.now()),
    appId: '10550',
    deviceSys: '12',
    username: aesBase64Encode(phone),
    password: aesBase64Encode(password),
    deviceModel: 'LGE-AN10',
    sdkVersion: '4.129.0',
    bid: 'com.pwrd.htassistant',
    channelId: '1',
  });

  const response = await client.post(`${LAOHU_BASE_URL}/openApi/secureLogin`, body, {
    headers: {
      'platform': 'android',
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  });

  const data = response.data;
  if (data.code !== 0 || !data.result?.token || data.result.userId === undefined) {
    throw new Error(data.message || data.msg || '账号密码登录失败');
  }

  log.info('老虎平台登录成功');
  return {
    token: data.result.token,
    userId: String(data.result.userId),
  };
}

/**
 * 用老虎 token 换取塔吉多 tokens
 */
export async function userCenterLogin(
  client: AxiosInstance,
  token: string,
  userId: string,
  deviceId: string,
): Promise<UserCenterLoginResult> {
  log.info('换取塔吉多 tokens...');

  const response = await client.post(
    `${TAYGEDO_BASE_URL}/usercenter/api/login`,
    new URLSearchParams({ token, userIdentity: userId, appId: '10551' }).toString(),
    {
      headers: {
        'platform': 'android',
        'deviceid': deviceId,
        'authorization': '',
        'appversion': '1.1.0',
        'uid': '10000000',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    },
  );

  const data = response.data;
  if (data.code !== 0 || !data.data?.accessToken || !data.data?.refreshToken) {
    throw new Error(data.msg || '塔吉多登录失败');
  }

  log.info('塔吉多登录成功');
  return {
    accessToken: data.data.accessToken,
    refreshToken: data.data.refreshToken,
    uid: String(data.data.uid),
  };
}

/**
 * 刷新 token
 */
export async function refreshToken(
  client: AxiosInstance,
  refreshTk: string,
  deviceId: string,
): Promise<RefreshTokenResult> {
  log.info('刷新塔吉多 token...');

  try {
    const response = await client.post(
      `${TAYGEDO_BASE_URL}/usercenter/api/refreshToken`,
      null,
      {
        headers: {
          'authorization': refreshTk,
          'deviceid': deviceId,
          'appversion': '1.1.0',
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      },
    );

    const data = response.data;
    if (data.code !== 0 || !data.data?.accessToken || !data.data?.refreshToken) {
      throw new Error(data.msg || '刷新 token 失败');
    }

    return {
      accessToken: data.data.accessToken,
      refreshToken: data.data.refreshToken,
      uid: data.data.uid !== undefined ? String(data.data.uid) : undefined,
    };
  } catch (error: any) {
    if (error.response?.status === 402) {
      throw new Error('REFRESH_REJECTED_402: refreshToken 已失效，请重新登录');
    }
    throw error;
  }
}

// ==================== 签到相关 ====================

/**
 * APP 社区签到
 */
export async function appSignin(
  client: AxiosInstance,
  accessToken: string,
  uid: string,
  deviceId: string,
): Promise<{ exp: number; goldCoin: number }> {
  log.info('执行 APP 社区签到...');

  const response = await client.post(
    `${TAYGEDO_BASE_URL}/apihub/api/signin`,
    'communityId=1',
    {
      headers: {
        'authorization': accessToken,
        'uid': uid,
        'deviceid': deviceId,
        'appversion': '1.1.0',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    },
  );

  const data = response.data;
  if (data.code !== 0) {
    throw new Error(data.msg || 'APP 签到失败');
  }

  return { exp: data.data?.exp ?? 0, goldCoin: data.data?.goldCoin ?? 0 };
}

/**
 * 获取游戏角色列表
 */
export async function getGameRoles(
  client: AxiosInstance,
  accessToken: string,
  uid: string,
  deviceId: string,
  gameId: string,
): Promise<GameRole[]> {
  const response = await client.get(
    `${TAYGEDO_BASE_URL}/usercenter/api/v2/getGameRoles?gameId=${encodeURIComponent(gameId)}`,
    {
      headers: {
        'platform': 'android',
        'authorization': accessToken,
        'uid': uid,
        'deviceid': deviceId,
        'appversion': '1.1.0',
      },
    },
  );

  const data = response.data;
  if (data.code !== 0 || !Array.isArray(data.data?.roles)) {
    return [];
  }

  return data.data.roles
    .filter((r: any) => r.roleId !== undefined)
    .map((r: any) => ({ roleId: String(r.roleId), roleName: r.roleName }));
}

/**
 * 游戏签到
 */
export async function gameSignin(
  client: AxiosInstance,
  accessToken: string,
  roleId: string,
  gameId: string,
): Promise<void> {
  log.info(`游戏签到: gameId=${gameId}, roleId=${roleId}`);

  const req = buildH5Request({
    accessToken,
    method: 'POST',
    path: '/apihub/awapi/sign',
    body: { roleId, gameId },
  });

  const response = await client.post(req.url, req.body, { headers: req.headers });
  const data = response.data;
  if (data.code !== 0) {
    throw new Error(data.msg || '游戏签到失败');
  }
}

/**
 * 获取签到状态
 */
export async function getSigninState(
  client: AxiosInstance,
  accessToken: string,
  gameId: string,
): Promise<{ days: number }> {
  const req = buildH5Request({
    accessToken,
    method: 'GET',
    path: '/apihub/awapi/signin/state',
    query: { gameId },
  });

  const response = await client.get(req.url, { headers: req.headers });
  const data = response.data;
  if (data.code !== 0 || typeof data.data?.days !== 'number') {
    throw new Error(data.msg || '获取签到状态失败');
  }
  return { days: data.data.days };
}

/**
 * 获取签到奖励列表
 */
export async function getSigninRewards(
  client: AxiosInstance,
  accessToken: string,
  gameId: string,
): Promise<Array<{ name: string; num: number }>> {
  const req = buildH5Request({
    accessToken,
    method: 'GET',
    path: '/apihub/awapi/sign/rewards',
    query: { gameId },
  });

  const response = await client.get(req.url, { headers: req.headers });
  const data = response.data;
  if (data.code !== 0 || !Array.isArray(data.data)) {
    return [];
  }
  return data.data;
}

// ==================== 金币任务 ====================

/**
 * BBS 金币签到
 */
export async function bbsSignin(
  client: AxiosInstance,
  accessToken: string,
  uid: string,
  deviceId: string,
): Promise<void> {
  log.info('BBS 金币签到...');

  const req = buildNativeRequest({
    accessToken, uid, deviceId,
    method: 'POST',
    path: '/apihub/api/signin',
    body: { communityId: 2 },
  });

  const response = await client.post(req.url, req.body, { headers: req.headers });
  const data = response.data;
  if (data.code !== 0) {
    throw new Error(data.msg || 'BBS 签到失败');
  }
}

/**
 * 获取金币任务状态
 */
export async function getUserTasks(
  client: AxiosInstance,
  accessToken: string,
  uid: string,
  deviceId: string,
): Promise<CoinTask[]> {
  const req = buildNativeRequest({
    accessToken, uid, deviceId,
    method: 'GET',
    path: '/apihub/api/getUserTasks',
    query: { gid: 1 },
  });

  const response = await client.get(req.url, { headers: req.headers });
  const data = response.data;
  if (data.code !== 0 || !Array.isArray(data.data?.task_list1)) {
    return [];
  }

  return data.data.task_list1.map((t: any) => ({
    code: String(t.code ?? t.taskKey ?? ''),
    completeTimes: Number(t.completeTimes) || 0,
    limitTimes: Number(t.limitTimes) || 0,
  })).filter((t: CoinTask) => t.code);
}

/**
 * 获取推荐帖子
 */
export async function getRecommendPosts(
  client: AxiosInstance,
  accessToken: string,
  uid: string,
  deviceId: string,
  count = 20,
): Promise<RecommendPost[]> {
  const req = buildNativeRequest({
    accessToken, uid, deviceId,
    method: 'GET',
    path: '/bbs/api/getRecommendPostList',
    query: { communityId: 2, count, page: 1 },
  });

  const response = await client.get(req.url, { headers: req.headers });
  const data = response.data;
  if (data.code !== 0) {
    return [];
  }

  const rawList = Array.isArray(data.data) ? data.data
    : Array.isArray(data.data?.list) ? data.data.list
    : Array.isArray(data.data?.posts) ? data.data.posts
    : [];

  return rawList
    .filter((p: any) => p.postId !== undefined || p.id !== undefined)
    .map((p: any) => ({
      postId: String(p.postId ?? p.id),
      selfOperation: p.selfOperation ? { liked: !!p.selfOperation.liked } : undefined,
    }));
}

/**
 * 获取帖子详情
 */
export async function getPostFull(
  client: AxiosInstance,
  accessToken: string,
  uid: string,
  deviceId: string,
  postId: string,
): Promise<RecommendPost> {
  const req = buildNativeRequest({
    accessToken, uid, deviceId,
    method: 'GET',
    path: '/bbs/api/getPostFull',
    query: { postId },
  });

  const response = await client.get(req.url, { headers: req.headers });
  const data = response.data;
  if (data.code !== 0) {
    throw new Error(data.msg || '获取帖子详情失败');
  }

  const post = data.data;
  const postIdVal = post?.postId ?? post?.post?.postId ?? postId;
  const liked = post?.selfOperation?.liked ?? post?.post?.selfOperation?.liked;
  return {
    postId: String(postIdVal),
    selfOperation: { liked: !!liked },
  };
}

/**
 * 点赞帖子
 */
export async function likePost(
  client: AxiosInstance,
  accessToken: string,
  uid: string,
  deviceId: string,
  postId: string,
): Promise<void> {
  const req = buildNativeRequest({
    accessToken, uid, deviceId,
    method: 'POST',
    path: '/bbs/api/post/like',
    body: { postId },
  });

  const response = await client.post(req.url, req.body, { headers: req.headers });
  const data = response.data;
  if (data.code !== 0) {
    throw new Error(data.msg || '点赞失败');
  }
}

/**
 * 分享帖子
 */
export async function sharePost(
  client: AxiosInstance,
  accessToken: string,
  uid: string,
  deviceId: string,
  postId: string,
  platform = 'qq',
): Promise<void> {
  const req = buildNativeRequest({
    accessToken, uid, deviceId,
    method: 'POST',
    path: '/bbs/api/post/share',
    body: { platform, postId },
  });

  const response = await client.post(req.url, req.body, { headers: req.headers });
  const data = response.data;
  if (data.code !== 0) {
    throw new Error(data.msg || '分享失败');
  }
}

/**
 * 获取今日金币状态
 */
export async function getUserCoinTaskState(
  client: AxiosInstance,
  accessToken: string,
): Promise<CoinState> {
  const req = buildH5Request({
    accessToken,
    method: 'GET',
    path: '/apihub/api/getUserCoinTaskState',
  });

  const response = await client.get(req.url, { headers: req.headers });
  const data = response.data;
  if (data.code !== 0) {
    return {};
  }
  return {
    todayCoin: data.data?.todayCoin,
    limitCoin: data.data?.limitCoin,
  };
}

// ==================== 云游戏 ====================

/**
 * 云异环时长签到
 */
export async function cloudGetUserInfo(
  client: AxiosInstance,
  laohuToken: string,
  laohuUserId: string,
  deviceId: string,
): Promise<CloudDurationResult> {
  log.info('云异环时长签到...');

  const data: Record<string, string> = {
    appId: CLOUD_APP_ID,
    deviceId,
    deviceType: 'Pixel 8',
    deviceName: 'Pixel 8',
    t: String(Math.floor(Date.now() / 1000)),
    channelId: CLOUD_CHANNEL_ID,
    deviceModel: 'Pixel 8',
    deviceSys: '14',
    version: CLOUD_APP_VERSION,
    sdkVersion: CLOUD_SDK_VERSION,
    network: 'wifi',
    bid: CLOUD_BID,
    provider: '0',
    idfa: '',
    userId: laohuUserId,
    token: laohuToken,
  };

  // 云游戏签名
  const values = Object.keys(data).sort().map(key => data[key]).join('');
  const sign = crypto.createHash('md5').update(`${values}${CLOUD_APP_KEY}`, 'utf8').digest('hex');
  const body = new URLSearchParams({ ...data, sign }).toString();

  const response = await client.post(`${LAOHU_BASE_URL}/cloud/game/getUserInfo`, body, {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'okhttp/3.12.1',
      'Host': 'user.laohu.com',
    },
  });

  const result = response.data;
  if (result.code !== 0) {
    throw new Error(result.message || result.msg || '云异环时长签到失败');
  }

  const gave = Number(result.result?.perDayFirstLoginGiveDuration) || 0;
  const remained = result.result?.remainedDuration !== undefined
    ? Number(result.result.remainedDuration)
    : undefined;

  return { gave, remained };
}
