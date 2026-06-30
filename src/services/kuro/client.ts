/**
 * 库街区 HTTP 客户端封装
 */

import axios, { AxiosInstance, AxiosResponse } from 'axios';
import {
  BBS_HEADERS_TEMPLATE,
  GAME_HEADERS_TEMPLATE,
  USER_INFO_HEADERS_TEMPLATE,
} from './api';
import { createLogger } from '@/lib/logger';

const log = createLogger('库街区客户端');

/**
 * API 响应接口
 */
export interface ApiResponse {
  success: boolean;
  code: number;
  message: string;
  data?: any;
}

/**
 * 解析 API 响应
 */
function parseResponse(response: AxiosResponse): ApiResponse {
  const data = response.data;
  const code = data.code || 0;
  return {
    success: code === 200,
    code,
    message: data.msg || '',
    data: data.data,
  };
}

/**
 * 创建库街区 HTTP 客户端
 */
export function createKuroClient(
  token: string,
  devcode?: string,
  distinctId?: string
): KuroHttpClient {
  return new KuroHttpClient(token, devcode, distinctId);
}

/**
 * 库街区 HTTP 客户端类
 */
export class KuroHttpClient {
  private token: string;
  private devcode: string;
  private distinctId: string;
  private ip: string;

  constructor(token: string, devcode?: string, distinctId?: string) {
    this.token = token;
    this.devcode = devcode || '';
    this.distinctId = distinctId || '';
    this.ip = this.getLocalIp();
  }

  /**
   * 获取本机 IP（模拟）
   */
  private getLocalIp(): string {
    return '10.0.2.233';
  }

  /**
   * 获取论坛请求头
   */
  private getBbsHeaders(): Record<string, string> {
    return {
      ...BBS_HEADERS_TEMPLATE,
      'Cookie': `user_token=${this.token}`,
      'Ip': this.ip,
      'distinct_id': this.distinctId,
      'devCode': this.devcode,
      'token': this.token,
    };
  }

  /**
   * 获取游戏签到请求头
   */
  private getGameHeaders(): Record<string, string> {
    return {
      ...GAME_HEADERS_TEMPLATE,
      'devCode': `${this.ip}, Mozilla/5.0 (iPhone; CPU iPhone OS 17_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) KuroGameBox/2.2.0`,
      'token': this.token,
    };
  }

  /**
   * 获取用户信息请求头
   */
  private getUserInfoHeaders(): Record<string, string> {
    return {
      ...USER_INFO_HEADERS_TEMPLATE,
      'devcode': this.devcode,
      'distinct_id': this.distinctId,
      'token': this.token,
    };
  }

  /**
   * 论坛 POST 请求
   */
  async bbsPost(url: string, data?: Record<string, any>): Promise<ApiResponse> {
    try {
      log.debug(`论坛请求: ${url}`, data);
      // 使用 URLSearchParams 发送 form data 格式
      const params = new URLSearchParams();
      if (data) {
        Object.entries(data).forEach(([key, value]) => {
          params.append(key, String(value));
        });
      }
      const response = await axios.post(url, params.toString(), {
        headers: this.getBbsHeaders(),
        timeout: 30000,
      });
      const result = parseResponse(response);
      log.debug(`论坛响应:`, result);
      return result;
    } catch (error: any) {
      log.error(`论坛请求失败: ${url}`, error.message);
      return {
        success: false,
        code: -1,
        message: error.message || '请求失败',
      };
    }
  }

  /**
   * 游戏签到 POST 请求
   */
  async gamePost(url: string, data?: Record<string, any>): Promise<ApiResponse> {
    try {
      log.debug(`游戏请求: ${url}`, data);
      // 使用 URLSearchParams 发送 form data 格式
      const params = new URLSearchParams();
      if (data) {
        Object.entries(data).forEach(([key, value]) => {
          params.append(key, String(value));
        });
      }
      const body = params.toString();
      const headers = {
        ...this.getGameHeaders(),
        'Content-Type': 'application/x-www-form-urlencoded',
      };
      log.debug(`请求体:`, body);
      log.debug(`请求头:`, headers);
      const response = await axios.post(url, body, {
        headers,
        timeout: 30000,
      });
      const result = parseResponse(response);
      log.debug(`游戏响应:`, result);
      return result;
    } catch (error: any) {
      log.error(`游戏请求失败: ${url}`, error.message);
      return {
        success: false,
        code: -1,
        message: error.message || '请求失败',
      };
    }
  }

  /**
   * 用户信息 POST 请求
   */
  async userInfoPost(url: string, data?: Record<string, any>): Promise<ApiResponse> {
    try {
      log.debug(`用户信息请求: ${url}`, data);
      // 使用 URLSearchParams 发送 form data 格式
      const params = new URLSearchParams();
      if (data) {
        Object.entries(data).forEach(([key, value]) => {
          params.append(key, String(value));
        });
      }
      const response = await axios.post(url, params.toString(), {
        headers: this.getUserInfoHeaders(),
        timeout: 30000,
      });
      const result = parseResponse(response);
      log.debug(`用户信息响应:`, result);
      return result;
    } catch (error: any) {
      log.error(`用户信息请求失败: ${url}`, error.message);
      return {
        success: false,
        code: -1,
        message: error.message || '请求失败',
      };
    }
  }

  /**
   * 获取用户 ID
   */
  async getUserId(): Promise<string | null> {
    const response = await this.userInfoPost('https://api.kurobbs.com/user/mineV2');
    if (response.success && response.data) {
      return response.data.mine?.userId || null;
    }
    return null;
  }

  /**
   * 获取游戏角色 ID
   */
  async getGameRoleId(gameId: string): Promise<string | null> {
    const response = await this.userInfoPost(
      'https://api.kurobbs.com/user/role/findRoleList',
      { gameId }
    );
    if (response.success && response.data && response.data.length > 0) {
      return response.data[0].roleId || null;
    }
    return null;
  }
}
