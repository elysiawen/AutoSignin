import axios, { AxiosError } from 'axios';
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
 * 严格对照原 MihoyoBBSTools 项目 cloudgames.py。
 * 云游戏使用 combo_token 独立认证，使用全新的 axios 实例，不携带米游社 Cookie/DS 等 headers。
 */
export async function executeCloudGameCheckin(
  _client: unknown,
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
    // 对照 setting.py: cloud_genshin_sgin / cloud_zzz_sgin
    const url = gameType === 'genshin'
      ? 'https://api-cloudgame.mihoyo.com/hk4e_cg_cn/wallet/wallet/get'
      : 'https://cg-nap-api.mihoyo.com/nap_cn/cg/wallet/wallet/get';
    const coinName = gameType === 'genshin' ? '米云币' : '邦邦点';

    // 云游戏使用全新的 axios 实例（对照原项目 http = get_new_session()，独立 Session，无预置 headers）
    const cloudClient = axios.create({ timeout: 30000 });

    // 对照原项目 CloudGenshin.__init__ / CloudZZZ.__init__ 的 headers
    // CloudGenshin 有 Referer，CloudZZZ 没有
    const headers: Record<string, string> = {
      'Host': gameType === 'genshin' ? 'api-cloudgame.mihoyo.com' : 'cg-nap-api.mihoyo.com',
      'Accept': '*/*',
      'x-rpc-combo_token': comboToken,
      'Accept-Encoding': 'gzip, deflate',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/99.0.4844.84 Safari/537.36',
    };
    // CloudGenshin 有 Referer
    if (gameType === 'genshin') {
      headers['Referer'] = 'https://app.mihoyo.com';
    }

    log.debug(`请求 URL: ${url}`);

    // 对照原项目 sign_account(): req = http.get(url=self.sign_url, headers=self.headers)
    const response = await cloudClient.get(url, { headers });
    const data = response.data;

    log.debug('云游戏签到响应', { retcode: data.retcode, message: data.message });

    // 对照原项目 sign_account() 逻辑
    if (data.retcode === 0) {
      const freeTime = parseInt(data.data.free_time.free_time);
      const sendFreeTime = parseInt(data.data.free_time.send_freetime);

      let success = false;
      let resultMsg = '';
      let gainedTime = 0; // 记录实际获得的免费时长

      if (sendFreeTime > 0) {
        log.info(`签到成功，已获得 ${sendFreeTime} 分钟免费时长`);
        resultMsg = `签到成功，已获得 ${sendFreeTime} 分钟免费时长\n`;
        success = true;
        gainedTime = sendFreeTime;
      } else {
        // 对照原项目：如果 free_time < 600，等待 3-6 秒后重试
        if (freeTime < 600) {
          await sleep(randomInt(3, 6) * 1000);
          const data2 = (await cloudClient.get(url, { headers })).data;
          if (data2.retcode === 0) {
            const freeTime2 = parseInt(data2.data.free_time.free_time);
            if (freeTime2 > freeTime) {
              const getFreeTime = freeTime2 - freeTime;
              log.info(`签到成功，已获得 ${getFreeTime} 分钟免费时长`);
              resultMsg = `签到成功，已获得 ${getFreeTime} 分钟免费时长\n`;
              success = true;
              gainedTime = getFreeTime;
            } else {
              log.info('签到失败，未获得免费时长，可能是已经签到过了或者超出免费时长上限');
              resultMsg = '签到失败，未获得免费时长，可能是已经签到过了或者超出免费时长上限\n';
            }
          }
        }
      }

      // 对照原项目 line 47-48：retcode==0 时总是附带 stats
      const currentFreeTime = formatMinutes(parseInt(data.data.free_time.free_time));
      const playCard = data.data.play_card.short_msg;
      const coinNum = data.data.coin.coin_num;
      resultMsg += `你当前拥有免费时长 ${currentFreeTime}，畅玩卡状态为 ${playCard}，拥有${coinName} ${coinNum} 枚`;

      log.info(resultMsg);

      return {
        success,
        message: resultMsg,
        reward: success ? `免费时长 +${gainedTime} 分钟` : undefined,
      };
    }

    // 对照原项目：retcode == -100 token 失效/防沉迷
    if (data.retcode === -100) {
      log.warn(`${gameName} token 失效/防沉迷`);
      return {
        success: false,
        message: `${gameName} token 失效/防沉迷，请重新获取`,
      };
    }

    // 对照原项目：其他 retcode 失败
    log.warn(`${gameName} 签到失败`, { retcode: data.retcode, message: data.message });
    return {
      success: false,
      message: data.message || `${gameName} 签到失败`,
    };
  } catch (error: any) {
    // 对照原项目 except Exception as e
    if (error instanceof AxiosError) {
      log.error(`${gameName} 签到网络错误`, {
        code: error.code,
        message: error.message,
        status: error.response?.status,
      });
    } else {
      log.error(`${gameName} 签到异常: ${error.message}`);
    }
    return {
      success: false,
      message: `${gameName} 签到失败: ${error.message}`,
    };
  }
}
