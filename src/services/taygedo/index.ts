/**
 * 塔吉多签到服务 - 主入口
 * 提供各类签到任务的执行函数
 */

import { Account } from '@/generated/prisma/client';
import { decrypt, encrypt } from '@/lib/utils';
import { createLogger } from '@/lib/logger';
import prisma from '@/lib/prisma';
import { sleep, randomInt } from '@/services/mihoyo/crypto';
import { ensureTaygedoDevice, type TaygedoDeviceConfig } from '@/tools/device';
import {
  createTaygedoClient,
  loginWithPassword,
  userCenterLogin,
  refreshToken as refreshTokenApi,
  appSignin,
  getGameRoles,
  getGameRecordCards,
  gameSignin,
  getSigninState,
  getSigninRewards,
  bbsSignin,
  getUserTasks,
  getRecommendPosts,
  getPostFull,
  likePost,
  sharePost,
  getUserCoinTaskState,
  cloudGetUserInfo,
  TAYGEDO_GAME_IDS,
} from './api';

const log = createLogger('塔吉多签到');

export interface TaygedoResult {
  success: boolean;
  message: string;
  reward?: string;
}

/**
 * 获取或刷新 accessToken
 * 策略与上游一致：优先密码登录重建 → refreshToken 刷新 → laohuToken 换取
 */
async function ensureSession(
  account: Account,
  extra: Record<string, any>,
  deviceId: string,
): Promise<{ accessToken: string; uid: string; updatedExtra: Record<string, any> }> {
  const client = createTaygedoClient();

  // 1. 如果已有 accessToken，先探测是否有效
  if (extra.accessToken) {
    try {
      await getGameRoles(client, extra.accessToken, extra.uid, deviceId, '1256');
      return { accessToken: extra.accessToken, uid: extra.uid, updatedExtra: extra };
    } catch {
      log.info('accessToken 已失效，需要重建/刷新 session...');
    }
  }

  // 2. 优先尝试用手机号+密码重新登录（与上游一致，密码登录最可靠）
  if (extra.phone && extra.password) {
    try {
      log.info('使用手机号+密码重新登录...');
      const login = await loginWithPassword(client, extra.phone, extra.password, deviceId);
      const ucLogin = await userCenterLogin(client, login.token, login.userId, deviceId);
      const { password: _, ...extraWithoutPassword } = extra;
      const updatedExtra = {
        ...extraWithoutPassword,
        accessToken: ucLogin.accessToken,
        refreshToken: ucLogin.refreshToken,
        uid: ucLogin.uid,
        laohuToken: login.token,
        laohuUserId: login.userId,
      };
      await saveAccountExtra(account.id, updatedExtra);
      log.info('重新登录成功');
      return { accessToken: ucLogin.accessToken, uid: ucLogin.uid, updatedExtra };
    } catch {
      log.warn('密码登录失败，回退到 refreshToken...');
    }
  }

  // 3. 尝试用 refreshToken 刷新
  if (extra.refreshToken) {
    try {
      const refreshed = await refreshTokenApi(client, extra.refreshToken, deviceId);
      const updatedExtra = {
        ...extra,
        accessToken: refreshed.accessToken,
        refreshToken: refreshed.refreshToken,
        uid: refreshed.uid || extra.uid,
      };
      await saveAccountExtra(account.id, updatedExtra);
      log.info('token 刷新成功');
      return { accessToken: refreshed.accessToken, uid: updatedExtra.uid, updatedExtra };
    } catch (error: any) {
      if (error.message.includes('REFRESH_REJECTED_402')) {
        log.warn('refreshToken 已失效');
      } else {
        log.error('刷新 token 失败', { error: error.message });
      }
    }
  }

  // 4. 尝试用 laohuToken 重新换取
  if (extra.laohuToken && extra.laohuUserId) {
    try {
      log.info('使用 laohuToken 重新换取 tokens...');
      const ucLogin = await userCenterLogin(client, extra.laohuToken, extra.laohuUserId, deviceId);
      const updatedExtra = {
        ...extra,
        accessToken: ucLogin.accessToken,
        refreshToken: ucLogin.refreshToken,
        uid: ucLogin.uid,
      };
      await saveAccountExtra(account.id, updatedExtra);
      log.info('重新换取成功');
      return { accessToken: ucLogin.accessToken, uid: ucLogin.uid, updatedExtra };
    } catch (error: any) {
      log.error('laohuToken 换取失败', { error: error.message });
    }
  }

  throw new Error('无法获取有效的登录状态，请重新配置账号');
}

/**
 * 保存账号 extra 到数据库
 */
async function saveAccountExtra(accountId: string, extra: Record<string, any>) {
  await prisma.account.update({
    where: { id: accountId },
    data: { extra },
  });
}

/**
 * 判断是否是"已签到"错误
 */
function isAlreadySignedError(error: unknown): boolean {
  return error instanceof Error && /已.*签到|签到.*过|重复签到|already.*sign/i.test(error.message);
}

/**
 * 判断是否是认证错误
 */
function isAuthError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return /登录|token|未授权|过期|失效|invalid_token|HTTP 40[123]/i.test(error.message);
}

// ==================== 任务执行函数 ====================

/**
 * 执行 APP 社区签到
 * 支持认证错误自动恢复：签到失败时如果检测到认证错误，自动重建 session 后重试
 */
export async function executeTaygedoSignin(account: Account): Promise<TaygedoResult> {
  log.info('执行塔吉多 APP 社区签到');

  const extra = (account.extra as any) || {};
  const device = await ensureTaygedoDevice(account.userId);

  let { accessToken, uid, updatedExtra } = await ensureSession(account, extra, device.deviceId);
  const client = createTaygedoClient();
  let currentExtra = updatedExtra;

  try {
    const result = await appSignin(client, accessToken, uid, device.deviceId);
    return {
      success: true,
      message: `签到成功，获得 ${result.goldCoin} 金币，${result.exp} 经验`,
      reward: `金币+${result.goldCoin} 经验+${result.exp}`,
    };
  } catch (error: any) {
    if (isAlreadySignedError(error)) {
      return { success: true, message: '今日已签到' };
    }
    // 认证错误时自动重建 session 并重试一次
    if (isAuthError(error)) {
      log.info('检测到认证错误，尝试重建 session 后重试...');
      try {
        const rebuilt = await ensureSession(account, currentExtra, device.deviceId);
        accessToken = rebuilt.accessToken;
        uid = rebuilt.uid;
        currentExtra = rebuilt.updatedExtra;
        const retryClient = createTaygedoClient();
        const result = await appSignin(retryClient, accessToken, uid, device.deviceId);
        return {
          success: true,
          message: `签到成功（重试），获得 ${result.goldCoin} 金币，${result.exp} 经验`,
          reward: `金币+${result.goldCoin} 经验+${result.exp}`,
        };
      } catch (retryError: any) {
        if (isAlreadySignedError(retryError)) {
          return { success: true, message: '今日已签到' };
        }
        throw retryError;
      }
    }
    throw error;
  }
}

/**
 * 获取所有游戏角色（含 getGameRecordCards 后备）
 */
async function getAllGameRoles(
  client: ReturnType<typeof createTaygedoClient>,
  accessToken: string,
  uid: string,
  deviceId: string,
): Promise<Array<{ gameId: string; roleId: string; roleName?: string }>> {
  const roles: Array<{ gameId: string; roleId: string; roleName?: string }> = [];
  const seenRoleIds = new Set<string>();

  // 先尝试各游戏的 getGameRoles
  for (const gameId of TAYGEDO_GAME_IDS) {
    try {
      const gameRoles = await getGameRoles(client, accessToken, uid, deviceId, gameId);
      for (const role of gameRoles) {
        if (!role.roleId || seenRoleIds.has(role.roleId)) continue;
        seenRoleIds.add(role.roleId);
        roles.push({ gameId, roleId: role.roleId, roleName: role.roleName });
      }
    } catch {
      log.warn(`获取游戏 ${gameId} 角色失败`);
    }
  }

  // 如果 getGameRoles 全部返回空，回退到 getGameRecordCards
  if (roles.length === 0) {
    log.info('getGameRoles 返回空，尝试 getGameRecordCards...');
    try {
      const cards = await getGameRecordCards(client, accessToken, uid, deviceId);
      for (const card of cards) {
        if (!card.roleId || seenRoleIds.has(card.roleId)) continue;
        seenRoleIds.add(card.roleId);
        roles.push({
          gameId: card.gameId,
          roleId: card.roleId,
          roleName: card.roleName ?? card.gameName,
        });
      }
    } catch {
      log.warn('getGameRecordCards 也失败了');
    }
  }

  return roles;
}

/**
 * 执行游戏签到（自动签所有绑定的游戏）
 * 支持认证错误自动恢复和 getGameRecordCards 后备
 */
export async function executeTaygedoGameSignin(account: Account): Promise<TaygedoResult> {
  log.info('执行塔吉多游戏签到');

  const extra = (account.extra as any) || {};
  const device = await ensureTaygedoDevice(account.userId);

  let { accessToken, uid, updatedExtra } = await ensureSession(account, extra, device.deviceId);
  let client = createTaygedoClient();
  let currentExtra = updatedExtra;
  let retried = false;

  const doSignin = async (): Promise<TaygedoResult> => {
    const results: string[] = [];
    const roles = await getAllGameRoles(client, accessToken, uid, device.deviceId);

    if (roles.length === 0) {
      return { success: true, message: '无绑定游戏角色' };
    }

    for (const role of roles) {
      try {
        await gameSignin(client, accessToken, role.roleId, role.gameId);
        const state = await getSigninState(client, accessToken, role.gameId);
        const rewards = await getSigninRewards(client, accessToken, role.gameId);
        const reward = rewards[state.days - 1];
        const rewardStr = reward ? `，奖励「${reward.name}」x${reward.num}` : '';
        results.push(`游戏${role.gameId}/${role.roleName || role.roleId}: 签到成功，第${state.days}天${rewardStr}`);
      } catch (error: any) {
        if (isAlreadySignedError(error)) {
          results.push(`游戏${role.gameId}/${role.roleName || role.roleId}: 今日已签到`);
        } else if (!retried && isAuthError(error)) {
          // 认证错误，触发重试
          throw error;
        } else {
          results.push(`游戏${role.gameId}/${role.roleName || role.roleId}: ${error.message}`);
        }
      }
      await sleep(randomInt(1, 3) * 1000);
    }

    // 提取奖励信息
    const rewardParts = results
      .filter(r => r.includes('奖励「'))
      .map(r => {
        const match = r.match(/奖励「(.+?)」x(\d+)/);
        return match ? `${match[1]}x${match[2]}` : '';
      })
      .filter(Boolean);

    const allSuccess = results.every(r => r.includes('签到成功') || r.includes('已签到'));
    return {
      success: allSuccess,
      message: results.join('\n'),
      reward: rewardParts.length > 0 ? rewardParts.join('、') : undefined,
    };
  };

  try {
    return await doSignin();
  } catch (error: any) {
    if (isAuthError(error) && !retried) {
      log.info('检测到认证错误，尝试重建 session 后重试游戏签到...');
      retried = true;
      const rebuilt = await ensureSession(account, currentExtra, device.deviceId);
      accessToken = rebuilt.accessToken;
      uid = rebuilt.uid;
      currentExtra = rebuilt.updatedExtra;
      client = createTaygedoClient();
      return await doSignin();
    }
    throw error;
  }
}

/**
 * 执行金币任务（BBS签到+浏览+点赞+分享）
 * 支持认证错误自动恢复
 */
export async function executeTaygedoCoins(account: Account): Promise<TaygedoResult> {
  log.info('执行塔吉多金币任务');

  const extra = (account.extra as any) || {};
  const device = await ensureTaygedoDevice(account.userId);

  let { accessToken, uid } = await ensureSession(account, extra, device.deviceId);
  let client = createTaygedoClient();
  let retried = false;

  const doCoins = async (): Promise<TaygedoResult> => {
    const messages: string[] = [];
    const errors: string[] = [];

    // 获取任务状态
    const tasks = await getUserTasks(client, accessToken, uid, device.deviceId);
    const remaining = (code: string, fallback: number) => {
      const task = tasks.find(t => t.code === code);
      return task ? Math.max(0, task.limitTimes - task.completeTimes) : fallback;
    };

    const bbsTarget = remaining('signin_c', 1);
    const browseTarget = remaining('browse_post_c', 5);
    const likeTarget = remaining('like_post_c', 5);
    const shareTarget = remaining('share', 1);

    // BBS 签到
    if (bbsTarget > 0) {
      try {
        await bbsSignin(client, accessToken, uid, device.deviceId);
        messages.push('BBS签到: 成功');
      } catch (error: any) {
        if (isAlreadySignedError(error)) {
          messages.push('BBS签到: 已签到');
        } else if (!retried && isAuthError(error)) {
          throw error;
        } else {
          errors.push(`BBS签到: ${error.message}`);
        }
      }
    }

    // 获取帖子列表
    const posts = (browseTarget > 0 || likeTarget > 0 || shareTarget > 0)
      ? await getRecommendPosts(client, accessToken, uid, device.deviceId, 20)
      : [];

    const browsedPosts: typeof posts = [];

    // 浏览帖子
    for (const post of posts) {
      if (browsedPosts.length >= browseTarget) break;
      await sleep(randomInt(500, 1500));
      try {
        const fullPost = await getPostFull(client, accessToken, uid, device.deviceId, post.postId);
        browsedPosts.push(fullPost);
      } catch (error: any) {
        if (!retried && isAuthError(error)) throw error;
        errors.push(`浏览帖子 ${post.postId}: ${error.message}`);
      }
    }
    if (browseTarget > 0) {
      messages.push(`浏览帖子: ${browsedPosts.length}/${browseTarget}`);
    }

    // 点赞帖子
    let likeCount = 0;
    const likeCandidates = [...browsedPosts, ...posts];
    const seenPostIds = new Set<string>();
    for (const post of likeCandidates) {
      if (likeCount >= likeTarget) break;
      if (seenPostIds.has(post.postId)) continue;
      seenPostIds.add(post.postId);
      if (post.selfOperation?.liked) continue;

      await sleep(randomInt(500, 1000));
      try {
        await likePost(client, accessToken, uid, device.deviceId, post.postId);
        likeCount++;
      } catch (error: any) {
        if (!retried && isAuthError(error)) throw error;
        errors.push(`点赞 ${post.postId}: ${error.message}`);
      }
    }
    if (likeTarget > 0) {
      messages.push(`点赞: ${likeCount}/${likeTarget}`);
    }

    // 分享帖子
    if (shareTarget > 0) {
      const sharePostItem = browsedPosts[0] ?? posts[0];
      if (sharePostItem) {
        try {
          await sharePost(client, accessToken, uid, device.deviceId, sharePostItem.postId);
          messages.push('分享: 成功');
        } catch (error: any) {
          if (!retried && isAuthError(error)) throw error;
          errors.push(`分享: ${error.message}`);
        }
      }
    }

    // 获取金币状态
    const coinState = await getUserCoinTaskState(client, accessToken);
    if (coinState.todayCoin !== undefined) {
      messages.push(`今日金币: ${coinState.todayCoin}/${coinState.limitCoin ?? '?'}`);
    }

    if (errors.length > 0) {
      messages.push(`错误: ${errors.join('；')}`);
    }

    return {
      success: errors.length === 0,
      message: messages.join('\n'),
      reward: coinState.todayCoin !== undefined ? `金币 ${coinState.todayCoin}/${coinState.limitCoin ?? '?'}` : undefined,
    };
  };

  try {
    return await doCoins();
  } catch (error: any) {
    if (isAuthError(error) && !retried) {
      log.info('检测到认证错误，尝试重建 session 后重试金币任务...');
      retried = true;
      const rebuilt = await ensureSession(account, extra, device.deviceId);
      accessToken = rebuilt.accessToken;
      uid = rebuilt.uid;
      client = createTaygedoClient();
      return await doCoins();
    }
    throw error;
  }
}

/**
 * 执行云异环时长签到
 */
export async function executeTaygedoCloud(account: Account): Promise<TaygedoResult> {
  log.info('执行塔吉多云异环时长签到');

  const extra = (account.extra as any) || {};
  const device = await ensureTaygedoDevice(account.userId);

  let laohuToken = extra.laohuToken;
  let laohuUserId = extra.laohuUserId;

  // 如果没有 laohuToken，尝试用密码登录获取
  if (!laohuToken || !laohuUserId) {
    if (extra.phone && extra.password) {
      const client = createTaygedoClient();
      try {
        const login = await loginWithPassword(client, extra.phone, extra.password, device.deviceId);
        laohuToken = login.token;
        laohuUserId = login.userId;
        await saveAccountExtra(account.id, {
          ...extra,
          laohuToken,
          laohuUserId,
        });
      } catch (error: any) {
        return { success: false, message: `获取老虎凭证失败: ${error.message}` };
      }
    } else {
      return {
        success: false,
        message: '缺少 laohuToken/laohuUserId，请配置手机号+密码或手动填入',
      };
    }
  }

  const client = createTaygedoClient();
  try {
    const result = await cloudGetUserInfo(client, laohuToken, laohuUserId, device.deviceId);
    const remainedStr = result.remained !== undefined ? `，剩余 ${result.remained} 分钟` : '';

    if (result.gave > 0) {
      return {
        success: true,
        message: `签到成功，获得 ${result.gave} 分钟免费时长${remainedStr}`,
        reward: `免费时长 +${result.gave}分钟`,
      };
    } else {
      return {
        success: true,
        message: `今日已领取${remainedStr}`,
      };
    }
  } catch (error: any) {
    return { success: false, message: `云异环签到失败: ${error.message}` };
  }
}
