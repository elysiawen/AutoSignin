/**
 * 森空岛签到服务 - 主入口
 * 提供明日方舟和终末地的签到任务执行函数
 */

import { Account } from '@/generated/prisma/client';
import { decrypt } from '@/lib/utils';
import { createLogger } from '@/lib/logger';
import prisma from '@/lib/prisma';
import { sleep, randomInt } from '@/services/mihoyo/crypto';
import { ensureSklandDevice } from '@/tools/device';
import {
  grantAuthorizeCode,
  generateCredByCode,
  refreshTokenApi,
  getBinding,
  getArknightsAttendanceStatus,
  doArknightsAttendance,
  isArknightsAttendedToday,
  formatArknightsAwards,
  getEndfieldAttendanceStatus,
  doEndfieldAttendance,
  formatEndfieldAwards,
  buildSkGameRole,
  type AppBindingPlayer,
} from './api';
import { getDid } from './crypto';

const log = createLogger('森空岛签到');

export interface SklandResult {
  success: boolean;
  message: string;
  reward?: string;
}

interface SklandSession {
  cred: string;
  token: string;
  userId: string;
  dId: string;
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
 * 获取或建立森空岛会话
 * 优先使用已有 cred+token，过期则用鹰角 token 重新换取
 */
async function ensureSession(account: Account): Promise<SklandSession> {
  const extra = (account.extra as any) || {};
  const hgToken = decrypt(account.cookie);

  // 获取设备ID
  const device = await ensureSklandDevice(account.userId);
  let dId = device.deviceId;

  // 如果设备ID为空，重新获取
  if (!dId) {
    log.info('设备ID为空，正在获取...');
    dId = await getDid();
    await prisma.device.update({
      where: { userId_platform: { userId: account.userId, platform: 'SKLAND' } },
      data: { config: { deviceId: dId } },
    });
  }

  // 1. 尝试使用现有 cred+token
  if (extra.cred && extra.token) {
    try {
      // 简单测试 token 是否有效（用获取绑定角色来测试）
      await getBinding(extra.cred, extra.token, dId);
      return { cred: extra.cred, token: extra.token, userId: extra.sklandUserId, dId };
    } catch {
      log.info('token 已失效，尝试刷新...');
    }

    // 2. 尝试用 refreshToken 刷新
    try {
      const refreshed = await refreshTokenApi(extra.cred, extra.token, dId);
      const updatedExtra = {
        ...extra,
        token: refreshed.token,
      };
      await saveAccountExtra(account.id, updatedExtra);
      log.info('token 刷新成功');
      return { cred: extra.cred, token: refreshed.token, userId: extra.sklandUserId, dId };
    } catch (error: any) {
      log.warn('token 刷新失败', { error: error.message });
    }
  }

  // 3. 用鹰角 token 重新换取
  log.info('使用鹰角 token 重新换取凭证...');
  try {
    const { code } = await grantAuthorizeCode(hgToken, dId);
    const credResult = await generateCredByCode(code, dId);

    const updatedExtra = {
      ...extra,
      cred: credResult.cred,
      token: credResult.token,
      sklandUserId: credResult.userId,
    };
    await saveAccountExtra(account.id, updatedExtra);
    log.info('凭证换取成功');

    return {
      cred: credResult.cred,
      token: credResult.token,
      userId: credResult.userId,
      dId,
    };
  } catch (error: any) {
    throw new Error(`无法建立森空岛会话: ${error.message}`);
  }
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
 * 执行明日方舟签到（自动签所有绑定的方舟角色）
 */
export async function executeSklandArknightsAttendance(account: Account): Promise<SklandResult> {
  log.info('执行森空岛明日方舟签到');

  const session = await ensureSession(account);
  const bindingData = await getBinding(session.cred, session.token, session.dId);

  // 筛选明日方舟角色 (gameId=1, appCode='arknights')
  const arknightsBinding = bindingData.list.find(b => b.appCode === 'arknights');
  if (!arknightsBinding || arknightsBinding.bindingList.length === 0) {
    return { success: true, message: '未绑定明日方舟角色' };
  }

  const results: string[] = [];
  const rewards: string[] = [];

  for (const character of arknightsBinding.bindingList) {
    const label = `${character.gameName}/${character.nickName || character.uid}`;

    try {
      // 检查签到状态
      const status = await getArknightsAttendanceStatus(
        character.uid,
        character.gameId,
        session.cred,
        session.token,
        session.dId,
      );

      if (isArknightsAttendedToday(status)) {
        results.push(`${label}: 今日已签到`);
        continue;
      }

      await sleep(randomInt(1, 2) * 1000);

      // 执行签到
      const awardData = await doArknightsAttendance(
        character.uid,
        character.gameId,
        session.cred,
        session.token,
        session.dId,
      );

      const awardStr = formatArknightsAwards(awardData.awards);
      results.push(`${label}: 签到成功，获得 ${awardStr}`);
      rewards.push(awardStr);
    } catch (error: any) {
      if (isAlreadySignedError(error)) {
        results.push(`${label}: 今日已签到`);
      } else {
        log.error(`${label} 签到失败`, { error: error.message });
        results.push(`${label}: 签到失败 - ${error.message}`);
      }
    }

    await sleep(randomInt(1, 3) * 1000);
  }

  if (results.length === 0) {
    return { success: true, message: '无绑定明日方舟角色' };
  }

  const allSuccess = results.every(r => r.includes('签到成功') || r.includes('已签到'));
  return {
    success: allSuccess,
    message: results.join('\n'),
    reward: rewards.length > 0 ? rewards.join('、') : undefined,
  };
}

/**
 * 执行终末地签到（自动签所有绑定的终末地角色）
 * 终末地按单个 role 签到，每个 role 需要独立签到
 */
export async function executeSklandEndfieldAttendance(account: Account): Promise<SklandResult> {
  log.info('执行森空岛终末地签到');

  const session = await ensureSession(account);
  const bindingData = await getBinding(session.cred, session.token, session.dId);

  // 筛选终末地角色 (gameId=3, appCode='endfield')
  const endfieldBinding = bindingData.list.find(b => b.appCode === 'endfield');
  if (!endfieldBinding || endfieldBinding.bindingList.length === 0) {
    return { success: true, message: '未绑定终末地角色' };
  }

  const results: string[] = [];
  const rewards: string[] = [];

  // 终末地按单个 role 展开签到
  for (const player of endfieldBinding.bindingList) {
    const roles = player.roles.length > 0 ? player.roles : [];

    if (roles.length === 0) {
      const label = `${player.gameName}/${player.nickName || player.uid}`;
      results.push(`${label}: 无可用角色，跳过`);
      continue;
    }

    for (const role of roles) {
      const label = `${player.gameName}/${role.nickname || role.roleId}(${role.serverName})`;
      const skGameRole = buildSkGameRole(player.gameId, role.roleId, role.serverId);

      try {
        // 检查签到状态
        const status = await getEndfieldAttendanceStatus(
          skGameRole,
          session.cred,
          session.token,
          session.dId,
        );

        if (status.hasToday) {
          results.push(`${label}: 今日已签到`);
          continue;
        }

        await sleep(randomInt(1, 2) * 1000);

        // 执行签到
        const awardData = await doEndfieldAttendance(
          skGameRole,
          session.cred,
          session.token,
          session.dId,
        );

        const awardStr = formatEndfieldAwards(awardData.awardIds, awardData.resourceInfoMap);
        results.push(`${label}: 签到成功，获得 ${awardStr}`);
        rewards.push(awardStr);
      } catch (error: any) {
        if (isAlreadySignedError(error)) {
          results.push(`${label}: 今日已签到`);
        } else {
          log.error(`${label} 签到失败`, { error: error.message });
          results.push(`${label}: 签到失败 - ${error.message}`);
        }
      }

      await sleep(randomInt(1, 3) * 1000);
    }
  }

  if (results.length === 0) {
    return { success: true, message: '无绑定终末地角色' };
  }

  const allSuccess = results.every(r => r.includes('签到成功') || r.includes('已签到'));
  return {
    success: allSuccess,
    message: results.join('\n'),
    reward: rewards.length > 0 ? rewards.join('、') : undefined,
  };
}
