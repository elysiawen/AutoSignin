/**
 * 米游社扫码登录工具
 *
 * 流程：
 * 1. 调用 createQrLogin 获取二维码 URL 和 ticket
 * 2. 轮询 queryQrLoginStatus 等待用户扫码确认
 * 3. 确认后获取 stoken，再补充 ltoken 和 cookie_token
 *
 * 基于 TeyvatGuide 项目: https://github.com/BTMuli/TeyvatGuide
 * 注意：扫码登录获取的 stoken 无法用于米社打卡
 */

import crypto from 'crypto';
import axios from 'axios';
import { type MiyousheDeviceConfig, generateMiyousheDevice } from '@/tools/device';

// ==================== 配置常量 ====================

const PASSPORT_API = 'https://passport-api.mihoyo.com/';
const HYP_VERSION = '1.3.3.182';

// 默认设备信息（仅在未传入 device 参数时使用）
const DEFAULT_DEVICE = generateMiyousheDevice();

// ==================== 类型定义 ====================

export interface QrLoginCreateResult {
  url: string;
  ticket: string;
}

export type QrLoginStatus = 'Created' | 'Scanned' | 'Confirmed';

export interface QrLoginQueryResult {
  status: QrLoginStatus;
  // 仅 Confirmed 时有值
  stoken?: string;
  accountId?: string;
  mid?: string;
}

export interface QrLoginFullResult {
  accountId: string;
  mid: string;
  stoken: string;
  ltoken: string;
  cookieToken: string;
  userInfo: {
    accountName: string;
    email: string;
    mobile: string;
  };
}

// ==================== API 调用 ====================

/**
 * 创建扫码登录二维码
 * @returns 二维码 URL 和 ticket
 */
export async function createQrLogin(device?: MiyousheDeviceConfig): Promise<QrLoginCreateResult> {
  const d = device || DEFAULT_DEVICE;
  const response = await axios.post(
    `${PASSPORT_API}account/ma-cn-passport/app/createQRLogin`,
    {},
    {
      headers: {
        'x-rpc-device_id': d.device_id,
        'user-agent': `HYPContainer/${HYP_VERSION}`,
        'x-rpc-app_id': 'ddxf5dufpuyo',
        'x-rpc-client_type': '3',
      },
      timeout: 15000,
    },
  );

  const data = response.data;
  if (data.retcode !== 0) {
    throw new Error(data.message || '创建二维码失败');
  }

  return {
    url: data.data.url,
    ticket: data.data.ticket,
  };
}

/**
 * 查询扫码登录状态
 * @param ticket 二维码 ticket
 * @returns 登录状态，确认时包含 stoken 等信息
 */
export async function queryQrLoginStatus(ticket: string, device?: MiyousheDeviceConfig): Promise<QrLoginQueryResult> {
  const d = device || DEFAULT_DEVICE;
  const response = await axios.post(
    `${PASSPORT_API}account/ma-cn-passport/app/queryQRLoginStatus`,
    { ticket },
    {
      headers: {
        'x-rpc-device_id': d.device_id,
        'user-agent': `HYPContainer/${HYP_VERSION}`,
        'x-rpc-app_id': 'ddxf5dufpuyo',
        'x-rpc-client_type': '3',
      },
      timeout: 15000,
    },
  );

  const data = response.data;
  if (data.retcode !== 0) {
    // retcode -106 表示二维码过期
    const error = new Error(data.message || '查询登录状态失败') as Error & { retcode: number };
    error.retcode = data.retcode;
    throw error;
  }

  const status: QrLoginStatus = data.data.status;

  if (status === 'Confirmed') {
    return {
      status,
      stoken: data.data.tokens[0].token,
      accountId: data.data.user_info.aid,
      mid: data.data.user_info.mid,
    };
  }

  return { status };
}
