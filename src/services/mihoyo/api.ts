import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import {
  generateDS,
  generateDS2,
  MIHYO_BBS_VERSION,
  CLIENT_TYPE,
  CLIENT_TYPE_WEB,
} from './crypto';

// API 端点（从 setting.py 提取）
export const API = {
  // 通用设置
  BBS: 'https://bbs-api.miyoushe.com',
  WEB: 'https://api-takumi.mihoyo.com',
  PASSPORT: 'https://passport-api.mihoyo.com',

  // 米游社 API
  BBS_TASKS_LIST: 'https://bbs-api.miyoushe.com/apihub/wapi/getUserMissionsState',
  BBS_SIGN_URL: 'https://bbs-api.miyoushe.com/apihub/app/api/signIn',
  BBS_POST_LIST: 'https://bbs-api.miyoushe.com/post/api/getForumPostList',
  BBS_POST_DETAIL: 'https://bbs-api.miyoushe.com/post/api/getPostFull',
  BBS_SHARE_URL: 'https://bbs-api.miyoushe.com/apihub/api/getShareConf',
  BBS_LIKE_URL: 'https://bbs-api.miyoushe.com/apihub/sapi/upvotePost',
  BBS_GET_CAPTCHA: 'https://bbs-api.miyoushe.com/misc/api/createVerification?is_high=true',
  BBS_CAPTCHA_VERIFY: 'https://bbs-api.miyoushe.com/misc/api/verifyVerification',

  // 账号相关
  ACCOUNT_INFO: 'https://api-takumi.mihoyo.com/binding/api/getUserGameRolesByCookie',
  GET_TOKEN_BY_STOKEN: 'https://passport-api.mihoyo.com/account/ma-cn-session/app/getTokenBySToken',
  GET_COOKIE_TOKEN_BY_STOKEN: 'https://api-takumi.mihoyo.com/auth/api/getCookieAccountInfoBySToken',
  GET_MULTI_TOKEN: 'https://api-takumi.mihoyo.com/auth/api/getMultiTokenByLoginTicket',

  // 国服游戏签到
  CN_GAME_CHECKIN_REWARDS: 'https://api-takumi.mihoyo.com/event/luna/home?lang=zh-cn',
  CN_GAME_IS_SIGN: 'https://api-takumi.mihoyo.com/event/luna/info?lang=zh-cn',
  CN_GAME_SIGN: 'https://api-takumi.mihoyo.com/event/luna/sign',

  // 绝区零专用 API
  ZZZ_CHECKIN_REWARDS: 'https://act-nap-api.mihoyo.com/event/luna/zzz/home?lang=zh-cn',
  ZZZ_IS_SIGN: 'https://act-nap-api.mihoyo.com/event/luna/zzz/info?lang=zh-cn',
  ZZZ_SIGN: 'https://act-nap-api.mihoyo.com/event/luna/zzz/sign',

  // 云游戏 API
  CLOUD_GENSHIN_SIGN: 'https://api-cloudgame.mihoyo.com/hk4e_cg_cn/wallet/wallet/get',
  CLOUD_ZZZ_SIGN: 'https://cg-nap-api.mihoyo.com/nap_cn/cg/wallet/wallet/get',

  // 国际服 API
  OS_GENSHIN: 'https://sg-hk4e-api.hoyolab.com/event/sol',
  OS_HONKAI_SR: 'https://sg-public-api.hoyolab.com/event/luna/os',
  OS_HONKAI3RD: 'https://sg-public-api.hoyolab.com/event/mani',
  OS_TEARSOFTHEMIS: 'https://sg-public-api.hoyolab.com/event/luna/os',
  OS_ZZZ: 'https://sg-act-nap-api.hoyolab.com/event/luna/zzz/os',
};

// 游戏签到 act_id（从 setting.py 提取）
export const ACT_IDS = {
  HONKAI2: 'e202203291431091',
  HONKAI3RD: 'e202306201626331',
  TEARSOFTHEMIS: 'e202202251749321',
  GENSHIN: 'e202311201442471',
  HONKAI_SR: 'e202304121516551',
  ZZZ: 'e202406242138391',
  // 国际服
  OS_GENSHIN: 'e202102251931481',
  OS_HONKAI_SR: 'e202303301540311',
  OS_HONKAI3RD: 'e202110291205111',
  OS_TEARSOFTHEMIS: 'e202202281857121',
  OS_ZZZ: 'e202406031448091',
};

// 米游社分区列表
export const FORUM_LIST: Record<number, { id: string; forumId: string; name: string }> = {
  1: { id: '1', forumId: '1', name: '崩坏3' },
  2: { id: '2', forumId: '26', name: '原神' },
  3: { id: '3', forumId: '30', name: '崩坏2' },
  4: { id: '4', forumId: '37', name: '未定事件簿' },
  5: { id: '5', forumId: '34', name: '大别野' },
  6: { id: '6', forumId: '52', name: '崩坏：星穹铁道' },
  8: { id: '8', forumId: '57', name: '绝区零' },
};

// 游戏 ID 到配置名的映射
export const GAME_ID_TO_CONFIG: Record<string, string> = {
  bh2_cn: 'honkai2',
  bh3_cn: 'honkai3rd',
  nxx_cn: 'tears_of_themis',
  hk4e_cn: 'genshin',
  hkrpg_cn: 'honkai_sr',
  nap_cn: 'zzz',
};

/**
 * 创建米游社 API 客户端
 */
export function createMihoyoClient(cookie: string, deviceId?: string): AxiosInstance {
  const client = axios.create({
    timeout: 30000,
    headers: {
      'Accept': 'application/json, text/plain, */*',
      'Origin': 'https://webstatic.mihoyo.com',
      'x-rpc-app_version': MIHYO_BBS_VERSION,
      'User-Agent': `Mozilla/5.0 (Linux; Android 12; Unspecified Device) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/103.0.5060.129 Mobile Safari/537.36 miHoYoBBS/${MIHYO_BBS_VERSION}`,
      'x-rpc-client_type': CLIENT_TYPE_WEB,
      'Accept-Encoding': 'gzip, deflate',
      'Accept-Language': 'zh-CN,en-US;q=0.8',
      'X-Requested-With': 'com.mihoyo.hyperion',
      'Cookie': cookie,
    },
  });

  if (deviceId) {
    client.defaults.headers['x-rpc-device_id'] = deviceId;
  }

  return client;
}

/**
 * 创建国际服 API 客户端
 */
export function createHoyolabClient(cookie: string): AxiosInstance {
  return axios.create({
    timeout: 30000,
    headers: {
      'Referer': 'https://act.hoyolab.com/',
      'Accept-Encoding': 'gzip, deflate, br',
      'Cookie': cookie,
    },
  });
}
