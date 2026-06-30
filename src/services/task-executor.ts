import { Task, Account } from '@/generated/prisma/client';
import { TaskType } from '@/generated/prisma/enums';
import { decrypt } from '@/lib/utils';
import { createLogger } from '@/lib/logger';
import prisma from '@/lib/prisma';
import { sleep, randomInt } from './mihoyo/crypto';
import { createMihoyoClient, createHoyolabClient, ACT_IDS } from './mihoyo/api';
import { executeGameCheckin, executeOsCheckin } from './mihoyo/checkin';
import { executeBbsTasks } from './mihoyo/bbs';
import { executeCloudGameCheckin } from './mihoyo/cloudgames';
import { executeKuroGameCheckin, executeKuroForumTasks, GameType, createKuroClient } from './kuro';
import {
  executeTaygedoSignin,
  executeTaygedoGameSignin,
  executeTaygedoCoins,
  executeTaygedoCloud,
} from './taygedo';

const log = createLogger('任务执行器');

export interface TaskResult {
  status: 'SUCCESS' | 'FAILED' | 'SKIPPED' | 'CAPTCHA';
  message: string;
  reward?: string;
  source?: 'manual' | 'auto'; // 来源：手动或自动
}

/**
 * 执行任务
 */
export async function executeTask(
  task: Task & { account: Account },
  source: 'manual' | 'auto' = 'manual'
): Promise<TaskResult> {
  const { type, account } = task;

  const sourceLabel = source === 'auto' ? '自动' : '手动';
  log.info(`开始执行任务: ${type} [${sourceLabel}]`);
  log.info(`账号: ${account.name} (${account.platform})`);

  try {
    // 解密 Cookie
    log.debug('解密 Cookie...');
    const cookie = decrypt(account.cookie);
    const stoken: string | undefined = account.stoken ? decrypt(account.stoken) : undefined;

    // 从 cookie 中提取 uid 和 mid
    const uidMatch = cookie.match(/(account_id|ltuid|login_uid|ltuid_v2|account_id_v2)=(\d+)/);
    const uid: string | undefined = uidMatch ? uidMatch[2] : account.uid || undefined;
    const midMatch = cookie.match(/(account_mid_v2|ltmid_v2|mid)=(.*?)(?:;|$)/);
    const mid: string | undefined = midMatch ? midMatch[2] : (account.mid || undefined);

    // 根据平台创建客户端
    const isOs = type.endsWith('_OS');
    log.info(`平台类型: ${isOs ? '国际服' : '国服'}`);

    const client = isOs
      ? createHoyolabClient(cookie)
      : createMihoyoClient(cookie, uid);

    // 根据任务类型执行
    let result: TaskResult;

    switch (type) {
      // 米游社社区任务
      case 'MIYOUSHE_CHECKIN':
      case 'MIYOUSHE_READ':
      case 'MIYOUSHE_LIKE':
      case 'MIYOUSHE_SHARE':
      case 'MIYOUSHE_COINS':
        log.info('执行米游社社区任务');
        result = await executeMihoyobbsTask(client, cookie, stoken, type);
        break;

      // 国服游戏签到
      case 'GENSHIN_CN':
        log.info('执行原神国服签到');
        result = await executeCnGameCheckin(client, 'genshin', ACT_IDS.GENSHIN, stoken, uid, mid, cookie);
        break;
      case 'HONKAI2_CN':
        log.info('执行崩坏2签到');
        result = await executeCnGameCheckin(client, 'honkai2', ACT_IDS.HONKAI2, stoken, uid, mid, cookie);
        break;
      case 'HONKAI3RD_CN':
        log.info('执行崩坏3签到');
        result = await executeCnGameCheckin(client, 'honkai3rd', ACT_IDS.HONKAI3RD, stoken, uid, mid, cookie);
        break;
      case 'TEARS_OF_THEMIS_CN':
        log.info('执行未定事件簿签到');
        result = await executeCnGameCheckin(client, 'tears_of_themis', ACT_IDS.TEARSOFTHEMIS, stoken, uid, mid, cookie);
        break;
      case 'HONKAI_SR_CN':
        log.info('执行星穹铁道签到');
        result = await executeCnGameCheckin(client, 'honkai_sr', ACT_IDS.HONKAI_SR, stoken, uid, mid, cookie);
        break;
      case 'ZZZ_CN':
        log.info('执行绝区零签到');
        result = await executeCnGameCheckin(client, 'zzz', ACT_IDS.ZZZ, stoken, uid, mid, cookie);
        break;

      // 国际服游戏签到
      case 'GENSHIN_OS':
        log.info('执行原神国际服签到');
        result = await executeOsGameCheckin(client, '原神', 'https://sg-hk4e-api.hoyolab.com/event/sol', ACT_IDS.OS_GENSHIN, cookie);
        break;
      case 'HONKAI3RD_OS':
        log.info('执行崩坏3国际服签到');
        result = await executeOsGameCheckin(client, '崩坏3', 'https://sg-public-api.hoyolab.com/event/mani', ACT_IDS.OS_HONKAI3RD, cookie);
        break;
      case 'HONKAI_SR_OS':
        log.info('执行星穹铁道国际服签到');
        result = await executeOsGameCheckin(client, '崩坏：星穹铁道', 'https://sg-public-api.hoyolab.com/event/luna/os', ACT_IDS.OS_HONKAI_SR, cookie);
        break;
      case 'ZZZ_OS':
        log.info('执行绝区零国际服签到');
        result = await executeOsGameCheckin(client, '绝区零', 'https://sg-act-nap-api.hoyolab.com/event/luna/zzz/os', ACT_IDS.OS_ZZZ, cookie);
        break;

      // 云游戏签到（需要 combo_token）
      case 'CLOUD_GENSHIN': {
        log.info('执行云原神签到');
        const extraData = account.extra as any;
        const comboToken = extraData?.cloud_genshin_token;
        const cloudResult = await executeCloudGameCheckin(client, '云原神', 'genshin', comboToken);
        result = {
          status: cloudResult.success ? 'SUCCESS' : 'FAILED',
          message: cloudResult.message,
          reward: cloudResult.reward,
        };
        break;
      }
      case 'CLOUD_ZZZ': {
        log.info('执行云绝区零签到');
        const extraDataZzz = account.extra as any;
        const comboTokenZzz = extraDataZzz?.cloud_zzz_token;
        const cloudResultZzz = await executeCloudGameCheckin(client, '云绝区零', 'zzz', comboTokenZzz);
        result = {
          status: cloudResultZzz.success ? 'SUCCESS' : 'FAILED',
          message: cloudResultZzz.message,
          reward: cloudResultZzz.reward,
        };
        break;
      }

      // 库街区任务
      case 'KUJIEQU_WUWA': {
        log.info('执行鸣潮签到');
        const kuroToken = decrypt(account.cookie);
        const kuroExtra = account.extra as any || {};
        let wuwaRoleId = kuroExtra?.wwroleId;
        let kuroUserId = kuroExtra?.kuroUserId;
        const devcode = kuroExtra?.devcode;
        const distinctId = kuroExtra?.distinct_id;
        let needUpdate = false;

        // 自动获取用户ID
        if (!kuroUserId) {
          log.info('用户ID未配置，自动获取...');
          const kuroClient = createKuroClient(kuroToken, devcode, distinctId);
          kuroUserId = await kuroClient.getUserId();
          if (!kuroUserId) {
            result = {
              status: 'FAILED',
              message: '获取库街区用户ID失败，请手动配置',
            };
            break;
          }
          log.info(`自动获取用户ID成功: ${kuroUserId}`);
          needUpdate = true;
        }

        // 自动获取鸣潮角色ID
        if (!wuwaRoleId) {
          log.info('鸣潮角色ID未配置，自动获取...');
          const kuroClient = createKuroClient(kuroToken, devcode, distinctId);
          wuwaRoleId = await kuroClient.getGameRoleId(GameType.WUWA);
          if (!wuwaRoleId) {
            result = {
              status: 'FAILED',
              message: '获取鸣潮角色ID失败，请手动配置或确保已绑定鸣潮账号',
            };
            break;
          }
          log.info(`自动获取鸣潮角色ID成功: ${wuwaRoleId}`);
          needUpdate = true;
        }

        // 保存到数据库
        if (needUpdate) {
          await prisma.account.update({
            where: { id: account.id },
            data: {
              extra: {
                ...kuroExtra,
                kuroUserId,
                wwroleId: wuwaRoleId,
              },
            },
          });
          log.info('已自动保存用户ID和角色ID到数据库');
        }

        const wuwaResult = await executeKuroGameCheckin(
          kuroToken,
          GameType.WUWA,
          wuwaRoleId,
          kuroUserId,
          { devcode, distinctId }
        );
        result = {
          status: wuwaResult.success ? 'SUCCESS' : 'FAILED',
          message: wuwaResult.message,
          reward: wuwaResult.reward,
        };
        break;
      }

      case 'KUJIEQU_PGR': {
        log.info('执行战双签到');
        const kuroTokenPgr = decrypt(account.cookie);
        const kuroExtraPgr = account.extra as any || {};
        let pgrRoleId = kuroExtraPgr?.pgrRoleId;
        let kuroUserIdPgr = kuroExtraPgr?.kuroUserId;
        const devcodePgr = kuroExtraPgr?.devcode;
        const distinctIdPgr = kuroExtraPgr?.distinct_id;
        let needUpdatePgr = false;

        // 自动获取用户ID
        if (!kuroUserIdPgr) {
          log.info('用户ID未配置，自动获取...');
          const kuroClientPgr = createKuroClient(kuroTokenPgr, devcodePgr, distinctIdPgr);
          kuroUserIdPgr = await kuroClientPgr.getUserId();
          if (!kuroUserIdPgr) {
            result = {
              status: 'FAILED',
              message: '获取库街区用户ID失败，请手动配置',
            };
            break;
          }
          log.info(`自动获取用户ID成功: ${kuroUserIdPgr}`);
          needUpdatePgr = true;
        }

        // 自动获取战双角色ID
        if (!pgrRoleId) {
          log.info('战双角色ID未配置，自动获取...');
          const kuroClientPgr = createKuroClient(kuroTokenPgr, devcodePgr, distinctIdPgr);
          pgrRoleId = await kuroClientPgr.getGameRoleId(GameType.PGR);
          if (!pgrRoleId) {
            result = {
              status: 'FAILED',
              message: '获取战双角色ID失败，请手动配置或确保已绑定战双账号',
            };
            break;
          }
          log.info(`自动获取战双角色ID成功: ${pgrRoleId}`);
          needUpdatePgr = true;
        }

        // 保存到数据库
        if (needUpdatePgr) {
          await prisma.account.update({
            where: { id: account.id },
            data: {
              extra: {
                ...kuroExtraPgr,
                kuroUserId: kuroUserIdPgr,
                pgrRoleId,
              },
            },
          });
          log.info('已自动保存用户ID和角色ID到数据库');
        }

        const pgrResult = await executeKuroGameCheckin(
          kuroTokenPgr,
          GameType.PGR,
          pgrRoleId,
          kuroUserIdPgr,
          { devcode: devcodePgr, distinctId: distinctIdPgr }
        );
        result = {
          status: pgrResult.success ? 'SUCCESS' : 'FAILED',
          message: pgrResult.message,
          reward: pgrResult.reward,
        };
        break;
      }

      case 'KUJIEQU_FORUM': {
        log.info('执行库街区论坛任务');
        const kuroTokenForum = decrypt(account.cookie);
        const kuroExtraForum = account.extra as any;
        const devcodeForum = kuroExtraForum?.devcode;
        const distinctIdForum = kuroExtraForum?.distinct_id;

        const forumResult = await executeKuroForumTasks(kuroTokenForum, {
          devcode: devcodeForum,
          distinctId: distinctIdForum,
        });

        let goldMessage = '';
        if (forumResult.goldInfo) {
          goldMessage = `，今日获得 ${forumResult.goldInfo.todayGain} 金币，共 ${forumResult.goldInfo.total} 金币`;
        }

        result = {
          status: forumResult.success ? 'SUCCESS' : 'FAILED',
          message: forumResult.message + goldMessage,
          reward: goldMessage ? `金币 +${forumResult.goldInfo?.todayGain}` : undefined,
        };
        break;
      }

      // 塔吉多任务
      case 'TAYGEDO_SIGNIN': {
        log.info('执行塔吉多 APP 社区签到');
        const taygedoResult = await executeTaygedoSignin(account);
        result = {
          status: taygedoResult.success ? 'SUCCESS' : 'FAILED',
          message: taygedoResult.message,
          reward: taygedoResult.reward,
        };
        break;
      }

      case 'TAYGEDO_GAMESIGNIN': {
        log.info('执行塔吉多游戏签到');
        const taygedoGameResult = await executeTaygedoGameSignin(account);
        result = {
          status: taygedoGameResult.success ? 'SUCCESS' : 'FAILED',
          message: taygedoGameResult.message,
          reward: taygedoGameResult.reward,
        };
        break;
      }

      case 'TAYGEDO_COINS': {
        log.info('执行塔吉多金币任务');
        const taygedoCoinsResult = await executeTaygedoCoins(account);
        result = {
          status: taygedoCoinsResult.success ? 'SUCCESS' : 'FAILED',
          message: taygedoCoinsResult.message,
          reward: taygedoCoinsResult.reward,
        };
        break;
      }

      case 'TAYGEDO_CLOUD': {
        log.info('执行塔吉多云异环时长签到');
        const taygedoCloudResult = await executeTaygedoCloud(account);
        result = {
          status: taygedoCloudResult.success ? 'SUCCESS' : 'FAILED',
          message: taygedoCloudResult.message,
          reward: taygedoCloudResult.reward,
        };
        break;
      }

      default:
        log.error(`未知的任务类型: ${type}`);
        result = {
          status: 'FAILED',
          message: `未知的任务类型: ${type}`,
        };
    }

    // 添加来源标记
    result.source = source;
    log.info(`任务执行完成`, { status: result.status, message: result.message, source });
    return result;
  } catch (error: any) {
    log.error(`执行任务异常`, {
      type,
      message: error.message,
      stack: error.stack,
    });
    return {
      status: 'FAILED',
      message: error.message || '执行任务时发生错误',
      source,
    };
  }
}

/**
 * 执行米游社社区任务
 */
async function executeMihoyobbsTask(
  client: any,
  cookie: string,
  stoken: string | undefined,
  taskType: TaskType
): Promise<TaskResult> {
  if (!stoken) {
    log.error('未配置 Stoken');
    return {
      status: 'FAILED',
      message: '未配置 Stoken，无法执行米游社任务',
    };
  }

  // 构建 stoken cookie
  const uidMatch = cookie.match(/account_id=(\d+)/);
  const uid = uidMatch ? uidMatch[1] : '';

  if (!uid) {
    log.error('Cookie 中未找到 account_id');
    return {
      status: 'FAILED',
      message: 'Cookie 格式错误，缺少 account_id',
    };
  }

  const stokenCookie = `stuid=${uid};stoken=${stoken}`;
  log.debug('构建 stoken cookie', { uid });

  // 默认签到的社区列表
  const forumIds = [5, 2]; // 大别野、原神

  const options = {
    doSign: taskType === 'MIYOUSHE_CHECKIN' || taskType === 'MIYOUSHE_COINS',
    doRead: taskType === 'MIYOUSHE_READ' || taskType === 'MIYOUSHE_COINS',
    doLike: taskType === 'MIYOUSHE_LIKE' || taskType === 'MIYOUSHE_COINS',
    doShare: taskType === 'MIYOUSHE_SHARE' || taskType === 'MIYOUSHE_COINS',
    cookie: cookie, // 传递普通 cookie 用于获取任务列表
  };

  log.info('执行米游社任务', { taskType, options });

  const result = await executeBbsTasks(stokenCookie, forumIds, options);

  return {
    status: result.success ? 'SUCCESS' : 'FAILED',
    message: result.message,
    reward: result.coinsInfo
      ? `今日获得 ${result.coinsInfo.todayHaveGet} 米游币，共 ${result.coinsInfo.total} 米游币`
      : undefined,
  };
}

/**
 * 执行国服游戏签到
 */
async function executeCnGameCheckin(
  client: any,
  gameName: string,
  actId: string,
  stoken?: string,
  uid?: string,
  mid?: string,
  cookie?: string
): Promise<TaskResult> {
  log.info(`执行国服游戏签到: ${gameName}, actId: ${actId}`);

  const result = await executeGameCheckin(client, gameName, actId, stoken, uid, mid, cookie);

  return {
    status: result.success ? 'SUCCESS' : 'FAILED',
    message: result.message,
    reward: result.reward,
  };
}

/**
 * 执行国际服游戏签到
 */
async function executeOsGameCheckin(
  client: any,
  gameName: string,
  baseUrl: string,
  actId: string,
  cookie?: string
): Promise<TaskResult> {
  log.info(`执行国际服游戏签到: ${gameName}, baseUrl: ${baseUrl}`);

  const result = await executeOsCheckin(client, gameName, baseUrl, actId, cookie || '');

  return {
    status: result.success ? 'SUCCESS' : 'FAILED',
    message: result.message,
    reward: result.reward,
  };
}
