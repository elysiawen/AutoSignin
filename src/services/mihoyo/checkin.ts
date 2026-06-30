import { AxiosInstance, AxiosError } from 'axios';
import { API, ACT_IDS, GAME_ID_TO_CONFIG } from './api';
import { generateDS, getUserAgent, sleep, randomInt, MIHYO_BBS_VERSION, CLIENT_TYPE_WEB } from './crypto';
import { refreshCookieToken, updateCookieInString } from './auth';
import { createLogger } from '@/lib/logger';

const log = createLogger('米哈游签到');

export interface CheckinResult {
  success: boolean;
  message: string;
  reward?: string;
  signDays?: number;
}

export interface GameAccount {
  name: string;
  uid: string;
  region: string;
}

/**
 * 生成游戏签到通用 headers（对照原项目 setting.headers + 各游戏的 set_headers）
 */
function getGameHeaders(
  cookie: string,
  gameName?: string,
  actId?: string
): any {
  const headers: any = {
    'Accept': 'application/json, text/plain, */*',
    'DS': generateDS(true),
    'x-rpc-channel': 'miyousheluodi',
    'Origin': 'https://webstatic.mihoyo.com',
    'x-rpc-app_version': MIHYO_BBS_VERSION,
    'User-Agent': `Mozilla/5.0 (Linux; Android 12; Unspecified Device) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/103.0.5060.129 Mobile Safari/537.36 miHoYoBBS/${MIHYO_BBS_VERSION}`,
    'x-rpc-client_type': CLIENT_TYPE_WEB,
    'Referer': 'https://act.mihoyo.com/',
    'Accept-Encoding': 'gzip, deflate',
    'Accept-Language': 'zh-CN,en-US;q=0.8',
    'X-Requested-With': 'com.mihoyo.hyperion',
    'Cookie': cookie,
  };

  // 根据游戏设置不同的 Referer 和 Origin
  switch (gameName) {
    case 'honkai2':
      headers['Referer'] = `https://webstatic.mihoyo.com/bbs/event/signin/bh2/index.html?bbs_auth_required=true&act_id=${actId}&bbs_presentation_style=fullscreen&utm_source=bbs&utm_medium=mys&utm_campaign=icon`;
      break;
    case 'honkai3rd':
      headers['Referer'] = `https://webstatic.mihoyo.com/bbs/event/signin/bh3/index.html?bbs_auth_required=true&act_id=${actId}&bbs_presentation_style=fullscreen&utm_source=bbs&utm_medium=mys&utm_campaign=icon`;
      break;
    case 'tears_of_themis':
      headers['Referer'] = `https://webstatic.mihoyo.com/bbs/event/signin/nxx/index.html?bbs_auth_required=true&bbs_presentation_style=fullscreen&act_id=${actId}`;
      break;
    case 'genshin':
      headers['Origin'] = 'https://act.mihoyo.com';
      headers['x-rpc-signgame'] = 'hk4e';
      break;
    case 'honkai_sr':
      headers['Origin'] = 'https://act.mihoyo.com';
      break;
    case 'zzz':
      headers['Origin'] = 'https://act.mihoyo.com';
      headers['X-Rpc-Signgame'] = 'zzz';
      break;
  }

  return headers;
}

/**
 * 获取游戏账号列表
 */
export async function getGameAccountList(
  client: AxiosInstance,
  gameId: string,
  stoken?: string,
  uid?: string,
  mid?: string,
  retryCount: number = 0
): Promise<GameAccount[]> {
  log.info(`获取游戏账号列表, gameId: ${gameId}`);

  try {
    const response = await client.get(API.ACCOUNT_INFO, {
      params: { game_biz: gameId },
      headers: { DS: generateDS(true) },
    });

    const data = response.data;
    log.debug('获取账号列表响应', { retcode: data.retcode, message: data.message });

    // 如果返回 -100，尝试刷新 cookie
    if (data.retcode === -100 && stoken && uid && retryCount === 0) {
      log.warn('Cookie 可能过期，尝试刷新...');
      const newCookieToken = await refreshCookieToken(client, stoken, uid, mid);
      if (newCookieToken) {
        const currentCookie = client.defaults.headers['Cookie'] as string;
        const updatedCookie = updateCookieInString(currentCookie, newCookieToken);
        client.defaults.headers['Cookie'] = updatedCookie;
        return getGameAccountList(client, gameId, stoken, uid, mid, 1);
      }
    }

    if (data.retcode !== 0) {
      log.error('获取账号列表失败', { retcode: data.retcode, message: data.message });
      throw new Error(data.message || '获取账号列表失败');
    }

    const accounts = data.data.list.map((item: any) => ({
      name: item.nickname,
      uid: item.game_uid,
      region: item.region,
    }));

    log.info(`找到 ${accounts.length} 个游戏账号`, accounts);
    return accounts;
  } catch (error: any) {
    if (error instanceof AxiosError) {
      log.error('获取游戏账号列表网络错误', {
        code: error.code,
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
      });
    } else {
      log.error('获取游戏账号列表失败:', error.message);
    }
    throw error;
  }
}

/**
 * 获取签到奖励列表
 */
export async function getCheckinRewards(
  client: AxiosInstance,
  actId: string,
  cookie: string,
  gameName?: string
): Promise<any[]> {
  const isZzz = gameName === 'zzz';
  const url = isZzz ? API.ZZZ_CHECKIN_REWARDS : API.CN_GAME_CHECKIN_REWARDS;
  log.info(`获取签到奖励列表, actId: ${actId}, url: ${url}`);

  try {
    // 使用完整的 headers
    const headers = getGameHeaders(cookie, gameName, actId);

    const response = await client.get(url, {
      params: { act_id: actId },
      headers,
    });

    const data = response.data;
    log.debug('获取奖励列表响应', { retcode: data.retcode });

    if (data.retcode === 0) {
      log.info(`获取到 ${data.data.awards.length} 个奖励`);
      return data.data.awards;
    }

    log.error('获取奖励列表失败', { retcode: data.retcode, message: data.message });
    throw new Error(data.message || '获取签到奖励列表失败');
  } catch (error: any) {
    if (error instanceof AxiosError) {
      log.error('获取奖励列表网络错误', {
        code: error.code,
        message: error.message,
        status: error.response?.status,
      });
    } else {
      log.error('获取签到奖励列表失败:', error.message);
    }
    throw error;
  }
}

/**
 * 检查是否已签到
 */
export async function isSignedIn(
  client: AxiosInstance,
  actId: string,
  region: string,
  uid: string,
  cookie: string,
  gameName?: string
): Promise<{ isSign: boolean; totalSignDay: number; firstBind: boolean }> {
  const isZzz = gameName === 'zzz';
  const url = isZzz ? API.ZZZ_IS_SIGN : API.CN_GAME_IS_SIGN;
  log.info(`检查签到状态, uid: ${uid}, region: ${region}`);

  try {
    // 使用完整的 headers
    const headers = getGameHeaders(cookie, gameName, actId);

    const response = await client.get(url, {
      params: { act_id: actId, region, uid },
      headers,
    });

    const data = response.data;
    log.debug('签到状态响应', { retcode: data.retcode, data: data.data });

    if (data.retcode !== 0) {
      log.error('获取签到信息失败', { retcode: data.retcode, message: data.message });
      throw new Error(data.message || '获取签到信息失败');
    }

    const result = {
      isSign: data.data.is_sign,
      totalSignDay: data.data.total_sign_day,
      firstBind: data.data.first_bind,
    };

    log.info(`签到状态: ${result.isSign ? '已签到' : '未签到'}, 已签到 ${result.totalSignDay} 天`);
    return result;
  } catch (error: any) {
    if (error instanceof AxiosError) {
      log.error('检查签到状态网络错误', {
        code: error.code,
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
      });
    } else {
      log.error('检查签到状态失败:', error.message);
    }
    throw error;
  }
}

/**
 * 执行签到
 */
export async function performSignIn(
  client: AxiosInstance,
  actId: string,
  region: string,
  uid: string,
  cookie: string,
  gameName?: string
): Promise<{ success: boolean; message: string }> {
  const isZzz = gameName === 'zzz';
  const url = isZzz ? API.ZZZ_SIGN : API.CN_GAME_SIGN;
  log.info(`执行签到, uid: ${uid}, region: ${region}, url: ${url}`);

  try {
    // 使用完整的 headers
    const headers = getGameHeaders(cookie, gameName, actId);

    const response = await client.post(
      url,
      { act_id: actId, region, uid },
      { headers }
    );

    const data = response.data;
    log.debug('签到响应', { retcode: data.retcode, data: data.data });

    if (data.retcode === 0 && data.data.success === 0) {
      log.info('签到成功');
      return { success: true, message: '签到成功' };
    }

    if (data.retcode === -5003) {
      log.info('今天已经签到过了');
      return { success: true, message: '今天已经签到过了' };
    }

    // 检查是否需要验证码
    if (data.retcode === 0 && data.data.success !== 0) {
      log.warn('触发验证码', { gt: data.data.gt, challenge: data.data.challenge });
      return {
        success: false,
        message: '触发验证码，本次签到失败',
      };
    }

    log.warn('签到失败', { retcode: data.retcode, message: data.message });
    return {
      success: false,
      message: data.message || '签到失败',
    };
  } catch (error: any) {
    if (error instanceof AxiosError) {
      log.error('签到请求网络错误', {
        code: error.code,
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
      });

      if (error.response?.status === 429) {
        return {
          success: false,
          message: '请求过于频繁，请稍后再试',
        };
      }
    } else {
      log.error('执行签到失败:', error.message);
    }
    return {
      success: false,
      message: error.message || '签到请求失败',
    };
  }
}

/**
 * 执行游戏签到（完整流程）
 */
export async function executeGameCheckin(
  client: AxiosInstance,
  gameName: string,
  actId: string,
  stoken?: string,
  uid?: string,
  mid?: string,
  cookie?: string
): Promise<CheckinResult> {
  const isZzz = gameName === 'zzz';
  log.info(`开始执行 ${gameName} 签到任务`);

  try {
    // 获取游戏账号列表
    const gameId = Object.entries(GAME_ID_TO_CONFIG).find(
      ([_, configName]) => configName === gameName
    )?.[0];

    if (!gameId) {
      log.error(`未知的游戏类型: ${gameName}`);
      return {
        success: false,
        message: `未知的游戏类型: ${gameName}`,
      };
    }

    log.info(`游戏ID: ${gameId}`);
    const accounts = await getGameAccountList(client, gameId, stoken, uid, mid);

    if (accounts.length === 0) {
      log.warn('没有找到绑定的游戏账号');
      return {
        success: false,
        message: '没有找到绑定的游戏账号',
      };
    }

    const results: string[] = [];
    let allSuccess = true;

    // 获取签到奖励列表（提前获取，用于显示奖励信息）
    let rewards: any[] = [];
    try {
      rewards = await getCheckinRewards(client, actId, cookie || '', gameName);
    } catch (e) {
      log.warn('获取奖励列表失败，将不显示奖励信息');
    }

    for (const account of accounts) {
      log.info(`处理账号: ${account.name} (${account.uid})`);

      // 等待随机时间，避免触发风控
      const waitTime = randomInt(2, 8) * 1000;
      log.debug(`等待 ${waitTime}ms`);
      await sleep(waitTime);

      // 检查是否已签到
      const signInfo = await isSignedIn(
        client,
        actId,
        account.region,
        account.uid,
        cookie || '',
        gameName
      );

      if (signInfo.firstBind) {
        log.warn(`${account.name}: 首次绑定，需要手动签到一次`);
        results.push(`${account.name}: 请先手动签到一次`);
        continue;
      }

      if (signInfo.isSign) {
        // 已签到，显示今天的奖励
        const todayReward = rewards[signInfo.totalSignDay - 1];
        const rewardStr = todayReward ? `，今天获得的奖励是「${todayReward.name}」x${todayReward.cnt}` : '';
        log.info(`${account.name}: 今天已经签到过了${rewardStr}`);
        results.push(`${account.name}: 今天已经签到过了${rewardStr}`);
        continue;
      }

      // 执行签到
      const signWaitTime = randomInt(2, 8) * 1000;
      log.debug(`等待 ${signWaitTime}ms 后执行签到`);
      await sleep(signWaitTime);

      const result = await performSignIn(
        client,
        actId,
        account.region,
        account.uid,
        cookie || '',
        gameName
      );

      if (result.success) {
        // 获取签到获得的奖励
        const todayReward = rewards[signInfo.totalSignDay];
        const rewardStr = todayReward ? `，获得「${todayReward.name}」x${todayReward.cnt}` : '';
        log.info(`${account.name}: 签到成功${rewardStr}`);
        results.push(`${account.name}: 签到成功${rewardStr}`);
      } else {
        allSuccess = false;
        log.warn(`${account.name}: ${result.message}`);
        results.push(`${account.name}: ${result.message}`);
      }
    }

    // 提取奖励信息
    const rewardMessages = results.filter(r => r.includes('获得') || r.includes('奖励'));
    const rewardStr = rewardMessages.length > 0
      ? rewardMessages.map(r => {
          const match = r.match(/「(.+?)」x(\d+)/);
          return match ? `${match[1]}x${match[2]}` : '';
        }).filter(Boolean).join('、')
      : undefined;

    const finalResult = {
      success: allSuccess,
      message: results.join('\n'),
      reward: rewardStr,
    };

    log.info(`${gameName} 签到任务完成`, finalResult);
    return finalResult;
  } catch (error: any) {
    log.error(`${gameName} 签到任务异常`, {
      message: error.message,
      stack: error.stack,
    });
    return {
      success: false,
      message: `签到失败: ${error.message}`,
    };
  }
}

/**
 * 国际服签到
 */
export async function executeOsCheckin(
  client: AxiosInstance,
  gameName: string,
  baseUrl: string,
  actId: string,
  cookie: string
): Promise<CheckinResult> {
  log.info(`开始执行 ${gameName} 国际服签到`);

  try {
    const lang = 'zh-cn';
    const rewardUrl = `${baseUrl}/home?lang=${lang}&act_id=${actId}`;
    const infoUrl = `${baseUrl}/info?lang=${lang}&act_id=${actId}`;
    const signUrl = `${baseUrl}/sign?lang=${lang}`;

    log.debug('API URLs', { rewardUrl, infoUrl, signUrl });

    // 国际服 headers
    const headers: any = {
      'Referer': 'https://act.hoyolab.com/',
      'Accept-Encoding': 'gzip, deflate, br',
      'Cookie': cookie,
    };

    if (actId === ACT_IDS.OS_ZZZ) {
      headers['x-rpc-signgame'] = 'zzz';
    }

    // 获取签到信息
    log.info('获取签到信息...');
    const infoResponse = await client.get(infoUrl, { headers });
    const infoData = infoResponse.data;

    log.debug('签到信息响应', { retcode: infoData.retcode, data: infoData.data });

    if (infoData.retcode !== 0) {
      log.error('获取签到信息失败', { message: infoData.message });
      return {
        success: false,
        message: infoData.message || '获取签到信息失败',
      };
    }

    const { is_sign, total_sign_day, first_bind } = infoData.data;
    log.info(`签到状态: ${is_sign ? '已签到' : '未签到'}, 已签到 ${total_sign_day} 天`);

    if (is_sign) {
      // 获取今天的奖励
      try {
        const rewardResponse = await client.get(rewardUrl, { headers });
        const rewardData = rewardResponse.data;
        const reward = rewardData.data?.awards?.[total_sign_day - 1];
        const rewardStr = reward ? `，今天获得的奖励是「${reward.name}」x${reward.cnt}` : '';
        log.info(`今天已经签到过了${rewardStr}`);
        return {
          success: true,
          message: `今天已经签到过了${rewardStr}`,
        };
      } catch (e) {
        log.info('今天已经签到过了');
        return {
          success: true,
          message: '今天已经签到过了',
        };
      }
    }

    if (first_bind) {
      log.warn('首次绑定，需要手动签到一次');
      return {
        success: false,
        message: '请先手动签到一次',
      };
    }

    // 等待随机时间
    const waitTime = randomInt(2, 10) * 1000;
    log.debug(`等待 ${waitTime}ms`);
    await sleep(waitTime);

    // 执行签到
    log.info('执行签到...');
    const signResponse = await client.post(signUrl, { act_id: actId }, { headers });
    const signData = signResponse.data;

    log.debug('签到响应', { retcode: signData.retcode, message: signData.message });

    if (signData.retcode === -5003) {
      log.info('签到响应: 今天已经签到过了');
      return {
        success: true,
        message: '今天已经签到过了',
      };
    }

    if (signData.retcode !== 0) {
      log.error('签到失败', { retcode: signData.retcode, message: signData.message });
      return {
        success: false,
        message: signData.message || '签到失败',
      };
    }

    // 获取奖励信息
    log.info('获取奖励信息...');
    const rewardResponse = await client.get(rewardUrl, { headers });
    const rewardData = rewardResponse.data;
    const reward = rewardData.data?.awards?.[total_sign_day];

    const rewardStr = reward ? `「${reward.name}」x${reward.cnt}` : '';
    log.info(`签到成功，获得 ${rewardStr}`);

    return {
      success: true,
      message: '签到成功',
      reward: rewardStr || undefined,
      signDays: total_sign_day + 1,
    };
  } catch (error: any) {
    if (error instanceof AxiosError) {
      log.error('国际服签到网络错误', {
        code: error.code,
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
      });
    } else {
      log.error('国际服签到异常', {
        message: error.message,
        stack: error.stack,
      });
    }
    return {
      success: false,
      message: `签到失败: ${error.message}`,
    };
  }
}
