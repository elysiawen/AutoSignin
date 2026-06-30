/**
 * 库街区 API 端点和常量定义
 */

// API 端点
export const API = {
  // 用户相关
  USER_MINE: 'https://api.kurobbs.com/user/mineV2',
  USER_SIGN_IN: 'https://api.kurobbs.com/user/signIn',
  USER_ROLE_LIST: 'https://api.kurobbs.com/user/role/findRoleList',

  // 论坛相关
  FORUM_LIST: 'https://api.kurobbs.com/forum/list',
  FORUM_POST_DETAIL: 'https://api.kurobbs.com/forum/getPostDetail',
  FORUM_LIKE: 'https://api.kurobbs.com/forum/like',

  // 任务相关
  TASK_PROCESS: 'https://api.kurobbs.com/encourage/level/getTaskProcess',
  TASK_SHARE: 'https://api.kurobbs.com/encourage/level/shareTask',

  // 金币相关
  GOLD_TOTAL: 'https://api.kurobbs.com/encourage/gold/getTotalGold',

  // 游戏签到相关
  GAME_SIGN_IN: 'https://api.kurobbs.com/encourage/signIn/v2',
  GAME_SIGN_RECORD: 'https://api.kurobbs.com/encourage/signIn/queryRecordV2',
  GAME_SIGN_INIT: 'https://api.kurobbs.com/encourage/signIn/initSignInV2',
  GAME_REPLENISH_SIGN: 'https://api.kurobbs.com/encourage/signIn/repleSigInV2',
} as const;

/**
 * 游戏类型枚举
 */
export enum GameType {
  /** 战双帕弥什 */
  PGR = '2',
  /** 鸣潮 */
  WUWA = '3',
}

/**
 * 获取游戏中文名称
 */
export function getGameName(gameType: GameType): string {
  const names: Record<GameType, string> = {
    [GameType.PGR]: '战双',
    [GameType.WUWA]: '鸣潮',
  };
  return names[gameType];
}

/**
 * 游戏服务器 ID
 */
export const GAME_SERVER_IDS: Record<GameType, string> = {
  [GameType.PGR]: '1000',
  [GameType.WUWA]: '76402e5b20be2c39f095a152090afddc',
};

/**
 * 错误码枚举
 */
export enum ErrorCode {
  SUCCESS = 200,
  ALREADY_SIGNED = 1511,
  USER_INFO_ERROR = 1513,
  LOGIN_EXPIRED = 220,
}

/**
 * 任务类型枚举
 */
export enum TaskType {
  SIGN_IN = '用户签到',
  VIEW_POSTS = '浏览3篇帖子',
  LIKE_POSTS = '点赞5次',
  SHARE_POST = '分享1次帖子',
}

/**
 * 请求头模板 - 论坛请求
 */
export const BBS_HEADERS_TEMPLATE: Record<string, string> = {
  'Accept': '*/*',
  'Accept-Language': 'zh-CN,zh-Hans;q=0.9',
  'Accept-Encoding': 'gzip, deflate, br',
  'Connection': 'keep-alive',
  'Host': 'api.kurobbs.com',
  'source': 'ios',
  'lang': 'zh-Hans',
  'User-Agent': 'KuroGameBox/48 CFNetwork/1492.0.1 Darwin/23.3.0',
  'channelId': '1',
  'channel': 'appstore',
  'version': '2.2.0',
  'model': 'iPhone15,2',
  'osVersion': '17.3',
  'Content-Type': 'application/x-www-form-urlencoded; charset=utf-8',
};

/**
 * 请求头模板 - 游戏签到请求
 */
export const GAME_HEADERS_TEMPLATE: Record<string, string> = {
  'Accept': 'application/json, text/plain, */*',
  'Accept-Language': 'zh-CN,zh-Hans;q=0.9',
  'Accept-Encoding': 'gzip, deflate, br',
  'Connection': 'keep-alive',
  'Host': 'api.kurobbs.com',
  'Sec-Fetch-Site': 'same-site',
  'Sec-Fetch-Mode': 'cors',
  'Origin': 'https://web-static.kurobbs.com',
  'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) KuroGameBox/2.2.0',
  'source': 'ios',
};

/**
 * 请求头模板 - 用户信息请求
 */
export const USER_INFO_HEADERS_TEMPLATE: Record<string, string> = {
  'osversion': 'Android',
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
};
