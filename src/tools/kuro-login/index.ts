/**
 * 库街区 Token 获取工具（方法二）
 *
 * 流程：
 * 1. 用户在 https://www.kurobbs.com/mc/home/ 手动获取验证码（不要点登录）
 * 2. 调用 kuroSdkLogin(phone, code) 获取 token
 *
 * 基于 Kuro_login 项目: https://github.com/mxyooR/Kuro_login
 */

import crypto from 'crypto';
import axios from 'axios';

export interface KuroLoginResult {
  token: string;
  userId: string;
  devcode: string;
  distinctId: string;
  roleId: string;
  roleName: string;
}

/**
 * 库街区 SDK 登录
 * @param mobile 手机号
 * @param code 短信验证码
 * @returns 登录结果，包含 token、userId、设备信息、角色信息
 */
export async function kuroSdkLogin(mobile: string, code: string): Promise<KuroLoginResult> {
  const devcode = crypto.randomBytes(20).toString('hex');
  const distinctId = crypto.randomUUID().replace(/-/g, '');

  // 1. SDK 登录，获取 token
  const loginResponse = await axios.post(
    'https://api.kurobbs.com/user/sdkLogin',
    new URLSearchParams({
      code,
      devCode: devcode,
      gameList: '',
      mobile,
    }).toString(),
    {
      headers: {
        'osversion': 'Android',
        'devcode': devcode,
        'distinct_id': distinctId,
        'countrycode': 'CN',
        'ip': '10.0.2.233',
        'model': '2211133C',
        'source': 'android',
        'lang': 'zh-Hans',
        'version': '1.0.9',
        'versioncode': '1090',
        'content-type': 'application/x-www-form-urlencoded',
        'accept-encoding': 'gzip',
        'user-agent': 'okhttp/3.10.0',
      },
      timeout: 15000,
    },
  );

  const loginData = loginResponse.data;
  if (loginData.code !== 200) {
    throw new Error(loginData.msg || '登录失败');
  }

  const { token, userId } = loginData.data;

  // 2. 尝试获取游戏角色信息
  let roleId = '';
  let roleName = '';

  try {
    const gameResponse = await axios.post(
      'https://api.kurobbs.com/gamer/widget/game3/getData',
      new URLSearchParams({ type: '1', sizeType: '2' }).toString(),
      {
        headers: {
          'Host': 'api.kurobbs.com',
          'devcode': devcode,
          'source': 'android',
          'version': '2.2.0',
          'versioncode': '2200',
          'token': token,
          'osversion': 'Android',
          'countrycode': 'CN',
          'model': 'MIX 2',
          'lang': 'zh-Hans',
          'content-type': 'application/x-www-form-urlencoded',
          'user-agent': 'okhttp/3.11.0',
        },
        timeout: 10000,
      },
    );

    if (gameResponse.data.code === 200 && gameResponse.data.data) {
      roleId = gameResponse.data.data.roleId || '';
      roleName = gameResponse.data.data.roleName || '';
    }
  } catch {
    // 获取角色信息失败不影响登录
  }

  return {
    token,
    userId: String(userId),
    devcode,
    distinctId,
    roleId,
    roleName,
  };
}
