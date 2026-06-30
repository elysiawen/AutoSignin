import { AxiosInstance, AxiosError } from 'axios';
import { sleep, randomInt, formatMinutes } from './crypto';
import { createLogger } from '@/lib/logger';

const log = createLogger('云游戏签到');

export interface CloudCheckinResult {
  success: boolean;
  message: string;
  reward?: string;
}

/**
 * 执行云游戏签到
 * 注意：云游戏使用 combo_token，不是普通 cookie
 */
export async function executeCloudGameCheckin(
  client: AxiosInstance,
  gameName: string,
  gameType: 'genshin' | 'zzz',
  comboToken?: string
): Promise<CloudCheckinResult> {
  log.info(`执行云游戏签到: ${gameName}`);

  if (!comboToken) {
    log.error('未配置 combo_token');
    return {
      success: false,
      message: `${gameName} 签到失败：需要配置 combo_token`,
    };
  }

  try {
    const host = gameType === 'genshin' ? 'api-cloudgame.mihoyo.com' : 'cg-nap-api.mihoyo.com';
    const url = gameType === 'genshin'
      ? 'https://api-cloudgame.mihoyo.com/hk4e_cg_cn/wallet/wallet/get'
      : 'https://cg-nap-api.mihoyo.com/nap_cn/cg/wallet/wallet/get';
    const coinName = gameType === 'genshin' ? '米云币' : '邦邦点';

    log.debug(`请求 URL: ${url}`);

    // 云游戏使用独立的 headers（对照原项目）
    const headers: any = {
      'Host': host,
      'Accept': '*/*',
      'Referer': 'https://app.mihoyo.com',
      'x-rpc-combo_token': comboToken,
      'Accept-Encoding': 'gzip, deflate',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/99.0.4844.84 Safari/537.36',
    };

    const response = await client.get(url, { headers });
    const data = response.data;

    log.debug('云游戏签到响应', { retcode: data.retcode, message: data.message });

    if (data.retcode === 0) {
      const freeTimeData = data.data?.free_time;
      if (freeTimeData) {
        const freeTime = parseInt(freeTimeData.free_time || '0');
        const sendFreeTime = parseInt(freeTimeData.send_freetime || '0');

        if (sendFreeTime > 0) {
          // 签到成功，获得了免费时长
          log.info(`${gameName} 签到成功，已获得 ${sendFreeTime} 分钟免费时长`);
          return {
            success: true,
            message: `${gameName} 签到成功，已获得 ${sendFreeTime} 分钟免费时长`,
            reward: `免费时长 ${sendFreeTime} 分钟`,
          };
        } else {
          // 未获得免费时长，可能是已签到或超出上限
          // 对照原项目：如果 free_time < 600，等待后重新检查
          if (freeTime < 600) {
            await sleep(randomInt(3, 6) * 1000);
            const response2 = await client.get(url, { headers });
            const data2 = response2.data;
            if (data2.retcode === 0) {
              const freeTime2 = parseInt(data2.data?.free_time?.free_time || '0');
              if (freeTime2 > freeTime) {
                const getTime = freeTime2 - freeTime;
                log.info(`${gameName} 签到成功，已获得 ${getTime} 分钟免费时长`);
                return {
                  success: true,
                  message: `${gameName} 签到成功，已获得 ${getTime} 分钟免费时长`,
                  reward: `免费时长 ${getTime} 分钟`,
                };
              }
            }
          }

          // 构建详细信息
          const playCard = data.data?.play_card?.short_msg || '未知';
          const coinNum = data.data?.coin?.coin_num || '0';
          const freeTimeStr = formatMinutes(freeTime);

          log.info(`${gameName} 签到失败，未获得免费时长`);
          return {
            success: false,
            message: `${gameName} 签到失败，可能是已签到或超出免费时长上限\n当前拥有免费时长 ${freeTimeStr}，畅玩卡状态为 ${playCard}，拥有${coinName} ${coinNum} 枚`,
          };
        }
      }

      log.info(`${gameName} 签到成功`);
      return {
        success: true,
        message: `${gameName} 签到成功`,
      };
    } else if (data.retcode === -100) {
      log.error(`${gameName} token 失效`);
      return {
        success: false,
        message: `${gameName} combo_token 失效，请重新获取`,
      };
    }

    log.warn(`${gameName} 签到失败`, { retcode: data.retcode, message: data.message });
    return {
      success: false,
      message: data.message || `${gameName} 签到失败`,
    };
  } catch (error: any) {
    if (error instanceof AxiosError) {
      log.error(`${gameName} 签到网络错误`, {
        code: error.code,
        message: error.message,
        status: error.response?.status,
      });
    } else {
      log.error(`${gameName} 签到异常`, {
        message: error.message,
      });
    }
    return {
      success: false,
      message: `${gameName} 签到失败: ${error.message}`,
    };
  }
}
