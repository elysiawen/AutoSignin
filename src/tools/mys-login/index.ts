/**
 * 米游社手机号验证码登录工具
 *
 * 流程：
 * 1. 用户输入手机号，调用 createLoginCaptcha 发送短信（可能触发极验）
 * 2. 用户输入验证码，调用 loginByMobileCaptcha 登录
 * 3. 获取 stoken、ltoken、cookie_token 等
 *
 * 基于 TeyvatGuide 项目: https://github.com/BTMuli/TeyvatGuide
 */

import crypto from 'crypto';
import axios from 'axios';
import { md5 } from 'js-md5';
import { type MiyousheDeviceConfig, generateMiyousheDevice } from '@/tools/device';

// ==================== 类型定义 ====================

export interface MysLoginResult {
  /** 账号 ID */
  accountId: string;
  /** 用户 mid */
  mid: string;
  /** SToken (高权限，可用于打卡) */
  stoken: string;
  /** LToken */
  ltoken: string;
  /** Cookie Token */
  cookieToken: string;
  /** 登录 ticket */
  loginTicket: string;
  /** 用户信息 */
  userInfo: {
    accountName: string;
    email: string;
    mobile: string;
  };
}

export interface GeetestData {
  gt: string;
  challenge: string;
  new_captcha: number;
  success: number;
}

export interface GeetestResult {
  geetest_challenge: string;
  geetest_validate: string;
  geetest_seccode: string;
}

// ==================== 配置常量 ====================

const PASSPORT_API = 'https://passport-api.mihoyo.com/';
const BBS_API = 'https://bbs-api.miyoushe.com/';

const BBS_VERSION = '2.109.0';
const BBS_UA = `Mozilla/5.0 (Windows NT 10.0; Win64; x64) miHoYoBBS/${BBS_VERSION}`;

// Salt 值用于 DS 签名
const SALT_MAP: Record<string, string> = {
  X4: 'xV8v4Qu54lUKrEYFZkJhB8cuOh9Asafs',
  X6: 't0qEgfub6cvueAPgR5m9aQWWVciEer7v',
  K2: '47f15f1b66bee46b816115d8e8e6ebb6',
};

// RSA 公钥用于加密手机号
const RSA_PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDDvekdPMHN3AYhm/vktJT+YJr7cI5DcsNKqdsx5DZX0gDuWFuIjzdwButrIYPNmRJ1G8ybDIF7oDW2eEpm5sMbL9zs
9ExXCdvqrn51qELbqj0XxtMTIpaCHFSI50PfPpTFV9Xt/hmyVwokoOXFlAEgCn+Q
CgGs52bFoYMtyi+xEQIDAQAB
-----END PUBLIC KEY-----`;

// ==================== 工具函数 ====================

// 默认设备信息（仅在未传入 device 参数时使用，每次运行随机生成）
const DEFAULT_DEVICE = generateMiyousheDevice();

/**
 * 获取设备信息
 * 优先使用传入的持久化设备信息，否则使用默认的随机设备信息
 */
function getDeviceInfo(device?: MiyousheDeviceConfig): MiyousheDeviceConfig {
  return device || DEFAULT_DEVICE;
}

/**
 * RSA 加密
 */
function rsaEncrypt(data: string): string {
  const buffer = Buffer.from(data, 'utf-8');
  const encrypted = crypto.publicEncrypt(
    {
      key: RSA_PUBLIC_KEY,
      padding: crypto.constants.RSA_PKCS1_PADDING,
    },
    buffer,
  );
  return encrypted.toString('base64');
}

/**
 * 生成随机字符串
 */
function getRandomString(length: number): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * 生成随机数
 */
function getRandomNumber(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1) + min);
}

/**
 * 参数转查询字符串（按 key 排序）
 */
function transParams(obj: Record<string, any>): string {
  const keys = Object.keys(obj).sort();
  return keys.map((key) => `${key}=${obj[key]}`).join('&');
}

/**
 * Cookie 对象转字符串
 */
function transCookie(cookie: Record<string, string>): string {
  return Object.keys(cookie)
    .sort()
    .map((key) => `${key}=${cookie[key]}`)
    .join('; ');
}

/**
 * 生成 DS 签名
 */
function getDS(method: string, data: string, saltType: string = 'X4'): string {
  const salt = SALT_MAP[saltType] || SALT_MAP.X4;
  const time = Math.floor(Date.now() / 1000).toString();
  const random = getRandomNumber(100000, 200000).toString();
  const body = method === 'GET' ? '' : data;
  const query = method === 'GET' ? data : '';
  const hashStr = `salt=${salt}&t=${time}&r=${random}&b=${body}&q=${query}`;
  const md5Str = md5(hashStr);
  return `${time},${random},${md5Str}`;
}

/**
 * 生成请求头
 */
function getRequestHeader(
  cookie: Record<string, string>,
  method: string,
  data: Record<string, any> | string,
  saltType: string = 'X4',
  device?: MiyousheDeviceConfig,
) {
  const dataStr = typeof data === 'string' ? data : transParams(data);
  const deviceInfo = getDeviceInfo(device);

  return {
    'user-agent': BBS_UA,
    'x-rpc-app_version': BBS_VERSION,
    'x-rpc-client_type': '5',
    'x-requested-with': 'com.mihoyo.hyperion',
    referer: 'https://webstatic.mihoyo.com',
    'x-rpc-device_id': deviceInfo.device_id,
    'x-rpc-device_fp': deviceInfo.device_fp,
    ds: getDS(method, dataStr, saltType),
    cookie: transCookie(cookie),
  };
}

// ==================== API 调用 ====================

/**
 * 发送短信验证码
 * @param phone 手机号
 * @param aigis 极验验证数据（可选，用于重试）
 * @returns { action_type, geetest? }
 */
export async function createLoginCaptcha(
  phone: string,
  aigis?: string,
  device?: MiyousheDeviceConfig,
): Promise<{ actionType?: string; geetest?: GeetestData; aigisSession?: string }> {
  const body = {
    area_code: rsaEncrypt('+86'),
    mobile: rsaEncrypt(phone),
  };

  const deviceInfo = getDeviceInfo(device);

  const headers: Record<string, string> = {
    'x-rpc-aigis': aigis || '',
    'x-rpc-app_version': BBS_VERSION,
    'x-rpc-client_type': '2',
    'x-rpc-app_id': 'bll8iq97cem8',
    'x-rpc-device_fp': deviceInfo.device_fp,
    'x-rpc-device_name': deviceInfo.device_name,
    'x-rpc-device_id': deviceInfo.device_id,
    'x-rpc-device_model': deviceInfo.product,
    'user-agent': BBS_UA,
    'content-type': 'application/json',
    referer: 'https://user.miyoushe.com/',
    'x-rpc-game_biz': 'hk4e_cn',
  };

  console.log('createLoginCaptcha 请求:', { phone: phone.substring(0, 3) + '****', aigis: aigis ? aigis.substring(0, 50) + '...' : '无' });

  const response = await axios.post(
    `${PASSPORT_API}account/ma-cn-verifier/verifier/createLoginCaptcha`,
    body,
    {
      headers,
      timeout: 15000,
      // 打印完整请求头用于调试
      transformRequest: [(data, headers) => {
        console.log('请求头 x-rpc-aigis:', headers['x-rpc-aigis']);
        return JSON.stringify(data);
      }],
    },
  );

  const data = response.data;
  console.log('createLoginCaptcha 响应:', { retcode: data.retcode, message: data.message });

  // 检查是否需要极验验证
  if (data.retcode !== 0) {
    const aigisHeader = response.headers['x-rpc-aigis'];
    if (aigisHeader) {
      const aigisData = JSON.parse(aigisHeader);
      console.log('需要极验验证:', aigisData);
      return {
        geetest: JSON.parse(aigisData.data),
        aigisSession: aigisData.session_id,
      };
    }
    throw new Error(data.message || '发送验证码失败');
  }

  return { actionType: data.data.action_type };
}

/**
 * 使用验证码登录
 * @param phone 手机号
 * @param captcha 验证码
 * @param actionType 操作类型
 * @param aigis 极验验证数据（可选）
 * @returns 登录结果，如果需要极验验证则返回 needGeetest
 */
export async function loginByMobileCaptcha(
  phone: string,
  captcha: string,
  actionType: string,
  aigis?: string,
  device?: MiyousheDeviceConfig,
): Promise<{
  stoken?: string;
  accountId?: string;
  mid?: string;
  loginTicket?: string;
  needGeetest?: boolean;
  geetest?: GeetestData;
  aigisSession?: string;
}> {
  const body = {
    area_code: rsaEncrypt('+86'),
    mobile: rsaEncrypt(phone),
    action_type: actionType,
    captcha,
  };

  const deviceInfo = getDeviceInfo(device);

  const headers: Record<string, string> = {
    'x-rpc-aigis': aigis || '',
    'x-rpc-app_version': BBS_VERSION,
    'x-rpc-client_type': '2',
    'x-rpc-app_id': 'bll8iq97cem8',
    'x-rpc-device_fp': deviceInfo.device_fp,
    'x-rpc-device_name': deviceInfo.device_name,
    'x-rpc-device_id': deviceInfo.device_id,
    'x-rpc-device_model': deviceInfo.product,
    'user-agent': BBS_UA,
  };

  const response = await axios.post(
    `${PASSPORT_API}account/ma-cn-passport/app/loginByMobileCaptcha`,
    body,
    { headers, timeout: 15000 },
  );

  const data = response.data;

  // 检查是否需要极验验证
  if (data.retcode !== 0) {
    const aigisHeader = response.headers['x-rpc-aigis'];
    if (aigisHeader) {
      const aigisData = JSON.parse(aigisHeader);
      return {
        needGeetest: true,
        geetest: JSON.parse(aigisData.data),
        aigisSession: aigisData.session_id,
      };
    }
    throw new Error(data.message || '登录失败');
  }

  return {
    stoken: data.data.token.token,
    accountId: data.data.user_info.aid,
    mid: data.data.user_info.mid,
    loginTicket: data.data.login_ticket,
  };
}

/**
 * 通过 stoken 获取 ltoken
 */
export async function getLToken(stoken: string, mid: string, device?: MiyousheDeviceConfig): Promise<string> {
  const cookie = { stoken, mid };
  const params = { stoken };
  const headers = getRequestHeader(cookie, 'GET', params, 'X4', device);

  const response = await axios.get(`${PASSPORT_API}account/auth/api/getLTokenBySToken`, {
    headers,
    params,
    timeout: 15000,
  });

  if (response.data.retcode !== 0) {
    throw new Error(response.data.message || '获取 LToken 失败');
  }

  return response.data.data.ltoken;
}

/**
 * 通过 stoken 获取 cookie_token
 */
export async function getCookieToken(stoken: string, mid: string, device?: MiyousheDeviceConfig): Promise<string> {
  const cookie = { stoken, mid };
  const params = { stoken };
  const headers = getRequestHeader(cookie, 'GET', params, 'X4', device);

  const response = await axios.get(`${PASSPORT_API}account/auth/api/getCookieAccountInfoBySToken`, {
    headers,
    params,
    timeout: 15000,
  });

  if (response.data.retcode !== 0) {
    throw new Error(response.data.message || '获取 CookieToken 失败');
  }

  return response.data.data.cookie_token;
}

// ==================== 完整登录流程 ====================

/**
 * 完整的米游社登录流程
 *
 * @param phone 手机号
 * @param captcha 验证码
 * @param actionType 操作类型（从 createLoginCaptcha 获取）
 * @param aigis 极验验证数据（可选）
 * @returns 完整的登录结果，包含所有 Token，如果需要极验则返回 needGeetest
 */
export async function mysLogin(
  phone: string,
  captcha: string,
  actionType: string,
  aigis?: string,
  device?: MiyousheDeviceConfig,
): Promise<MysLoginResult & { needGeetest?: boolean; geetest?: GeetestData; aigisSession?: string }> {
  // 1. 登录获取 stoken
  const loginResult = await loginByMobileCaptcha(phone, captcha, actionType, aigis, device);

  // 检查是否需要极验验证
  if (loginResult.needGeetest) {
    return {
      needGeetest: true,
      geetest: loginResult.geetest,
      aigisSession: loginResult.aigisSession,
      accountId: '',
      mid: '',
      stoken: '',
      ltoken: '',
      cookieToken: '',
      loginTicket: '',
      userInfo: { accountName: '', email: '', mobile: '' },
    };
  }

  // 2. 获取 ltoken
  const ltoken = await getLToken(loginResult.stoken!, loginResult.mid!, device);

  // 3. 获取 cookie_token
  const cookieToken = await getCookieToken(loginResult.stoken!, loginResult.mid!, device);

  return {
    accountId: loginResult.accountId!,
    mid: loginResult.mid!,
    stoken: loginResult.stoken!,
    ltoken,
    cookieToken,
    loginTicket: loginResult.loginTicket!,
    userInfo: {
      accountName: '',
      email: '',
      mobile: phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2'),
    },
  };
}
