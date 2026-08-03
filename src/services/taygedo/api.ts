/**
 * 塔吉多 API 客户端
 * 移植自 taygedo-auto-attendance，适配 axios
 */

import axios, { AxiosInstance } from 'axios';
import crypto from 'crypto';
import { buildNativeRequest, buildH5Request, TAYGEDO_BASE_URL, TAYGEDO_APP_VER, makeDs } from './protocol';
import { createLogger } from '@/lib/logger';

const log = createLogger('塔吉多API');

const LAOHU_BASE_URL = 'https://user.laohu.com';
const LAOHU_SECRET = '89155cc4e8634ec5b1b6364013b23e3e';
const LAOHU_APP_ID = '10550';
const LAOHU_CHANNEL_ID = '1';
const LAOHU_VERSION_CODE = '17';
const LAOHU_SDK_VERSION = '4.327.0';
const LAOHU_DEVICE_MODEL = 'Pixel 6';
const LAOHU_DEVICE_SYS = '14';
const LAOHU_USER_AGENT = 'LaohuSDK/4.327.0 (android os 14;mobile  manufacturer Google; model Pixel 6) ';
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

export interface GameRecordCard {
  gameId: string;
  gameName?: string;
  roleId?: string;
  roleName?: string;
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
 * ECB does not use an IV. Node.js accepts null but workerd compatibility
 * layer rejects it, while a zero-length buffer works in both runtimes.
 */
function aesBase64Encode(value: string): string {
  const key = Buffer.from(LAOHU_SECRET.slice(-16), 'utf8');
  const cipher = crypto.createCipheriv('aes-128-ecb', key, Buffer.alloc(0));
  cipher.setAutoPadding(true);
  return Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]).toString('base64');
}

function signedLaohuBody(
  data: Record<string, string>,
  options: { includeEmpty?: boolean } = {},
): string {
  const withSign = { ...data, sign: laohuSign(data) };
  if (options.includeEmpty) {
    return new URLSearchParams(withSign).toString();
  }
  // 过滤空值（短信验证码相关接口需要）
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(withSign)) {
    if (value !== '') {
      params.set(key, value);
    }
  }
  return params.toString();
}

/**
 * 老虎平台 Android 基础参数
 */
function laohuAndroidBaseParams(
  deviceId: string,
  timestamp: string,
  versionField: 'version' | 'versionCode',
): Record<string, string> {
  const base: Record<string, string> = {
    adm: '',
    appId: LAOHU_APP_ID,
    bid: 'com.pwrd.htassistant',
    channelId: LAOHU_CHANNEL_ID,
    deviceId,
    deviceModel: LAOHU_DEVICE_MODEL,
    deviceName: LAOHU_DEVICE_MODEL,
    deviceSys: LAOHU_DEVICE_SYS,
    deviceType: LAOHU_DEVICE_MODEL,
    idfa: '',
    sdkVersion: LAOHU_SDK_VERSION,
    t: timestamp,
  };
  if (versionField === 'versionCode') {
    return { ...base, imei: '', versionCode: LAOHU_VERSION_CODE };
  }
  return { ...base, mac: '', version: LAOHU_VERSION_CODE };
}

/**
 * 发送短信验证码
 */
export async function sendCaptcha(
  client: AxiosInstance,
  phone: string,
  deviceId: string,
): Promise<void> {
  log.info('发送短信验证码...');

  const body = signedLaohuBody({
    ...laohuAndroidBaseParams(deviceId, String(Math.floor(Date.now() / 1000)), 'versionCode'),
    areaCodeId: '1',
    cellphone: phone,
    type: '16',
  }, { includeEmpty: false });

  const response = await client.post(`${LAOHU_BASE_URL}/m/newApi/sendPhoneCaptchaWithOutLogin`, body, {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
      'User-Agent': LAOHU_USER_AGENT,
    },
    validateStatus: () => true,
  });

  const data = response.data;
  const sendingAlreadyAccepted = response.status === 200
    && data.code === 1
    && [data.message, data.msg].some((m: unknown) => typeof m === 'string' && m.includes('短信正在发送'));
  if (response.status !== 200 || (data.code !== 0 && !sendingAlreadyAccepted)) {
    throw new Error(data.message || data.msg || '发送短信验证码请求失败');
  }
}

/**
 * 校验短信验证码
 */
export async function checkCaptcha(
  client: AxiosInstance,
  phone: string,
  captcha: string,
  deviceId: string,
): Promise<void> {
  log.info('校验短信验证码...');

  const body = signedLaohuBody({
    ...laohuAndroidBaseParams(deviceId, String(Math.floor(Date.now() / 1000)), 'versionCode'),
    captcha,
    cellphone: phone,
  }, { includeEmpty: false });

  const response = await client.post(`${LAOHU_BASE_URL}/m/newApi/checkPhoneCaptchaWithOutLogin`, body, {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
      'User-Agent': LAOHU_USER_AGENT,
    },
    validateStatus: () => true,
  });

  const data = response.data;
  if (response.status !== 200 || data.code !== 0) {
    throw new Error(data.message || data.msg || '短信验证码校验请求失败');
  }
}

/**
 * 短信验证码登录老虎平台
 */
export async function loginWithCaptcha(
  client: AxiosInstance,
  phone: string,
  captcha: string,
  deviceId: string,
): Promise<LoginResult> {
  log.info('短信验证码登录老虎平台...');

  // 先校验验证码
  await checkCaptcha(client, phone, captcha, deviceId);

  const body = signedLaohuBody({
    ...laohuAndroidBaseParams(deviceId, String(Date.now()), 'version'),
    areaCodeId: '1',
    captcha: aesBase64Encode(captcha),
    cellphone: aesBase64Encode(phone),
    type: '16',
  }, { includeEmpty: true });

  const response = await client.post(`${LAOHU_BASE_URL}/openApi/sms/new/login`, body, {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
      'User-Agent': LAOHU_USER_AGENT,
    },
    validateStatus: () => true,
  });

  const data = response.data;
  const userId = data.result?.userId !== undefined && data.result?.userId !== null
    ? String(data.result.userId).trim() || undefined
    : undefined;
  if (response.status !== 200 || data.code !== 0 || !data.result?.token || !userId) {
    throw new Error(data.message || data.msg || '短信验证码登录请求失败');
  }

  log.info('老虎平台短信登录成功');
  return {
    token: data.result.token,
    userId,
  };
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
      'robot-auth-type': '2',
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
 * 支持双 profile 回退：先尝试 official profile，失败后回退到 compat-1.1.0
 */
export async function userCenterLogin(
  client: AxiosInstance,
  token: string,
  userId: string,
  deviceId: string,
): Promise<UserCenterLoginResult> {
  log.info('换取塔吉多 tokens...');

  // 先尝试 official profile
  let response = await client.post(
    `${TAYGEDO_BASE_URL}/usercenter/api/login`,
    new URLSearchParams({ token, userIdentity: userId, appId: '10551' }).toString(),
    {
      headers: {
        'Accept': 'application/json, text/plain, */*',
        'Authorization': '',
        'appVersion': TAYGEDO_APP_VER,
        'platform': 'android',
        'uid': '0',
        'debug-uid': '3',
        'deviceId': deviceId,
        'ds': makeDs(),
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'okhttp/4.12.0',
      },
      validateStatus: () => true,
    },
  );

  let data = response.data;
  log.info(`[taygedo-login] userCenterLogin profile=official HTTP=${response.status} code=${data.code}`);

  // 如果 official profile 返回系统错误，尝试 compat-1.1.0
  if (response.status === 200 && data.code === 1 && (data.message ?? data.msg)?.trim() === '系统错误') {
    log.info('[taygedo-login] userCenterLogin 回退到 profile=compat-1.1.0');
    try {
      response = await client.post(
        `${TAYGEDO_BASE_URL}/usercenter/api/login`,
        new URLSearchParams({ token, userIdentity: userId, appId: '10551' }).toString(),
        {
          headers: {
            'authorization': '',
            'appversion': '1.1.0',
            'platform': 'android',
            'uid': '10000000',
            'deviceid': deviceId,
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': 'okhttp/4.12.0',
          },
          validateStatus: () => true,
        },
      );
      data = response.data;
      log.info(`[taygedo-login] userCenterLogin profile=compat-1.1.0 HTTP=${response.status} code=${data.code}`);
    } catch {
      log.warn('[taygedo-login] userCenterLogin profile=compat-1.1.0 unavailable');
    }
  }

  if (response.status !== 200 || data.code !== 0 || !data.data?.accessToken || !data.data?.refreshToken || data.data.uid === undefined) {
    throw new Error(data.msg || data.message || '塔吉多登录失败');
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

  const response = await client.post(
    `${TAYGEDO_BASE_URL}/usercenter/api/refreshToken`,
    null,
    {
      headers: {
        'authorization': refreshTk,
        'deviceid': deviceId,
        'appversion': '1.1.0',
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'okhttp/4.12.0',
      },
      validateStatus: () => true,
    },
  );

  if (response.status === 402) {
    throw new Error('REFRESH_REJECTED_402: refreshToken 已失效，请重新登录');
  }

  const data = response.data;
  if (response.status !== 200 || data.code !== 0 || !data.data?.accessToken || !data.data?.refreshToken) {
    throw new Error(data.msg || '刷新 token 失败');
  }

  return {
    accessToken: data.data.accessToken,
    refreshToken: data.data.refreshToken,
    uid: data.data.uid !== undefined ? String(data.data.uid) : undefined,
  };
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
 * 获取游戏记录卡（当 getGameRoles 返回空时作为后备）
 */
export async function getGameRecordCards(
  client: AxiosInstance,
  accessToken: string,
  uid: string,
  deviceId: string,
): Promise<GameRecordCard[]> {
  const req = buildNativeRequest({
    accessToken, uid, deviceId,
    method: 'GET',
    path: '/apihub/api/getGameRecordCard',
    query: { uid },
  });

  const response = await client.get(req.url, { headers: req.headers });
  const data = response.data;
  if (data.code !== 0 || !Array.isArray(data.data)) {
    return [];
  }

  return data.data
    .filter((card: any) => card.gameId !== undefined)
    .map((card: any) => {
      const bindRoleInfo = card.bindRoleInfo && typeof card.bindRoleInfo === 'object' ? card.bindRoleInfo : undefined;
      return {
        gameId: String(card.gameId),
        ...(typeof card.gameName === 'string' ? { gameName: card.gameName } : {}),
        ...(bindRoleInfo?.roleId !== undefined ? { roleId: String(bindRoleInfo.roleId) } : {}),
        ...(typeof bindRoleInfo?.roleName === 'string' ? { roleName: bindRoleInfo.roleName } : {}),
      };
    });
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
  page = 1,
): Promise<RecommendPost[]> {
  const req = buildNativeRequest({
    accessToken, uid, deviceId,
    method: 'GET',
    path: '/bbs/api/getRecommendPostList',
    query: { communityId: 2, count, page },
  });

  const response = await client.get(req.url, { headers: req.headers });
  const data = response.data;

  const rawList = Array.isArray(data.data) ? data.data
    : Array.isArray(data.data?.list) ? data.data.list
    : Array.isArray(data.data?.posts) ? data.data.posts
    : undefined;

  if (data.code !== 0 || !rawList) {
    throw new Error(data.msg || '获取推荐帖子列表失败');
  }

  return rawList
    .filter((p: any) => typeof p === 'object' && p !== null && !Array.isArray(p))
    .map((p: any) => {
      const postId = p.postId ?? p.id;
      if (postId === undefined) return undefined;
      const selfOp = p.selfOperation && typeof p.selfOperation === 'object' ? p.selfOperation : undefined;
      return {
        postId: String(postId),
        ...(selfOp ? { selfOperation: { liked: typeof selfOp.liked === 'boolean' ? selfOp.liked : undefined } } : {}),
      };
    })
    .filter((p: RecommendPost | undefined): p is RecommendPost => p !== undefined);
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

  // 先尝试直接解析
  let post = toRecommendPost(data.data);
  if (post) {
    if (data.code !== 0) {
      throw new Error(data.msg || '获取帖子详情失败');
    }
    return post;
  }

  // 从 data.data.post 中回退提取
  const rawPost = data.data;
  if (typeof rawPost?.post === 'object' && rawPost.post !== null && !Array.isArray(rawPost.post)) {
    const fallback = toRecommendPost({
      postId,
      selfOperation: rawPost.selfOperation,
      ...rawPost.post,
    });
    if (fallback) {
      if (data.code !== 0) {
        throw new Error(data.msg || '获取帖子详情失败');
      }
      return fallback;
    }
  }

  throw new Error(data.msg || '获取帖子详情失败');
}

function toRecommendPost(value: any): RecommendPost | undefined {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return undefined;
  }
  const postId = value.postId ?? value.id;
  if (postId === undefined) return undefined;
  const selfOp = value.selfOperation && typeof value.selfOperation === 'object' ? value.selfOperation : undefined;
  return {
    postId: String(postId),
    ...(selfOp ? { selfOperation: { liked: typeof selfOp.liked === 'boolean' ? selfOp.liked : undefined } } : {}),
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
