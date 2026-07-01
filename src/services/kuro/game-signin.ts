/**
 * 库街区游戏签到模块
 * 支持鸣潮和战双的签到
 */

import { KuroHttpClient } from './client';
import { API, GameType, GAME_SERVER_IDS, ErrorCode, getGameName } from './api';
import { createLogger } from '@/lib/logger';
import { sleep, randomInt } from '@/services/mihoyo/crypto';

const log = createLogger('库街区游戏签到');

/**
 * 签到结果接口
 */
export interface GameCheckinResult {
  success: boolean;
  message: string;
  reward?: string;
}

/**
 * 获取签到奖励信息
 */
async function getSignReward(
  client: KuroHttpClient,
  gameType: GameType,
  roleId: string,
  userId: string
): Promise<string | null> {
  try {
    const data = {
      gameId: gameType,
      serverId: GAME_SERVER_IDS[gameType],
      roleId,
      userId,
    };

    const response = await client.gamePost(API.GAME_SIGN_RECORD, data);

    if (response.success && response.data) {
      if (Array.isArray(response.data) && response.data.length > 0) {
        return response.data[0].goodsName || '未知奖励';
      }
    }

    return null;
  } catch (error: any) {
    log.error('获取签到奖励失败', error.message);
    return null;
  }
}

/**
 * 检查可补签次数
 */
async function checkReplenishCount(
  client: KuroHttpClient,
  gameType: GameType,
  roleId: string,
  userId: string
): Promise<number> {
  try {
    const data = {
      gameId: gameType,
      serverId: GAME_SERVER_IDS[gameType],
      roleId,
      userId,
    };

    const response = await client.gamePost(API.GAME_SIGN_INIT, data);

    if (response.success && response.data) {
      return response.data.omissionNum || 0;
    }

    return 0;
  } catch (error: any) {
    log.error('检查补签次数失败', error.message);
    return 0;
  }
}

/**
 * 执行补签
 */
async function replenishSign(
  client: KuroHttpClient,
  gameType: GameType,
  roleId: string,
  userId: string,
  month: string
): Promise<GameCheckinResult> {
  try {
    const data = {
      gameId: gameType,
      serverId: GAME_SERVER_IDS[gameType],
      roleId,
      userId,
      reqMonth: month,
    };

    const response = await client.gamePost(API.GAME_REPLENISH_SIGN, data);

    if (response.code === ErrorCode.SUCCESS) {
      const reward = await getSignReward(client, gameType, roleId, userId);
      let message = `${getGameName(gameType)} 补签成功`;
      if (reward) {
        message += `，补签奖励: ${reward}`;
      }
      return { success: true, message, reward: reward || undefined };
    }

    return {
      success: false,
      message: `${getGameName(gameType)} 补签失败: ${response.message}`,
    };
  } catch (error: any) {
    return {
      success: false,
      message: `${getGameName(gameType)} 补签失败: ${error.message}`,
    };
  }
}

/**
 * 执行游戏签到
 */
export async function executeKuroGameCheckin(
  token: string,
  gameType: GameType,
  roleId: string,
  userId: string,
  options?: {
    devcode?: string;
    distinctId?: string;
    autoReplenish?: boolean;
  }
): Promise<GameCheckinResult> {
  const gameName = getGameName(gameType);
  log.info(`开始执行 ${gameName} 签到`);

  const client = new KuroHttpClient(
    token,
    options?.devcode,
    options?.distinctId
  );

  try {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, '0');

    const data = {
      gameId: gameType,
      serverId: GAME_SERVER_IDS[gameType],
      roleId,
      userId,
      reqMonth: month,
    };

    log.info(`${gameName} 签到请求`, { roleId, userId });
    const response = await client.gamePost(API.GAME_SIGN_IN, data);

    // 处理签到结果
    if (response.code === ErrorCode.SUCCESS) {
      const reward = await getSignReward(client, gameType, roleId, userId);
      let message = `${gameName} 签到成功`;
      if (reward) {
        message += `，签到奖励: ${reward}`;
      }
      log.info(message);
      return { success: true, message, reward: reward || undefined };
    }

    if (response.code === ErrorCode.ALREADY_SIGNED) {
      const reward = await getSignReward(client, gameType, roleId, userId);
      let message = `${gameName} 今天已签到`;
      if (reward) {
        message += `，签到奖励: ${reward}`;
      }
      log.info(message);
      return { success: true, message, reward: reward || undefined };
    }

    if (response.code === ErrorCode.USER_INFO_ERROR) {
      log.error(`${gameName} 签到失败: 用户信息异常`);
      return {
        success: false,
        message: '用户信息异常',
      };
    }

    if (response.code === ErrorCode.LOGIN_EXPIRED) {
      log.error(`${gameName} 签到失败: 登录已过期`);
      return {
        success: false,
        message: '登录已过期，请重新获取 token',
      };
    }

    // 其他错误
    log.error(`${gameName} 签到失败`, { code: response.code, message: response.message });
    return {
      success: false,
      message: response.message || '签到失败',
    };
  } catch (error: any) {
    log.error(`${gameName} 签到异常`, error.message);
    return {
      success: false,
      message: error.message || '签到异常',
    };
  }
}
