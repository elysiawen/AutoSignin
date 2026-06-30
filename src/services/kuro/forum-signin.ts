/**
 * 库街区论坛任务模块
 * 包含签到、浏览帖子、点赞、分享任务
 */

import { KuroHttpClient } from './client';
import { API, TaskType } from './api';
import { createLogger } from '@/lib/logger';
import { sleep, randomInt } from '@/services/mihoyo/crypto';

const log = createLogger('库街区论坛任务');

/**
 * 论坛任务结果接口
 */
export interface ForumTaskResult {
  success: boolean;
  message: string;
  goldInfo?: {
    todayGain: number;
    total: number;
  };
}

/**
 * 获取帖子列表
 */
async function getForumList(client: KuroHttpClient): Promise<any[]> {
  try {
    const data = {
      forumId: '9',
      gameId: '3',
      pageIndex: '1',
      pageSize: '20',
      searchType: '3',
      timeType: '0',
    };

    const response = await client.bbsPost(API.FORUM_LIST, data);

    if (response.success && response.data) {
      const posts = response.data.postList || [];
      log.info(`获取到 ${posts.length} 篇帖子`);
      return posts;
    }

    log.error('获取帖子列表失败', response.message);
    return [];
  } catch (error: any) {
    log.error('获取帖子列表失败', error.message);
    return [];
  }
}

/**
 * 浏览帖子（获取帖子详情）
 */
async function viewPost(client: KuroHttpClient, postId: string): Promise<boolean> {
  try {
    const data = {
      isOnlyPublisher: '0',
      postId,
      showOrderTyper: '2',
    };

    const response = await client.bbsPost(API.FORUM_POST_DETAIL, data);
    return response.success;
  } catch (error: any) {
    log.error(`浏览帖子失败: ${postId}`, error.message);
    return false;
  }
}

/**
 * 点赞帖子
 */
async function likePost(
  client: KuroHttpClient,
  postId: string,
  userId: string
): Promise<boolean> {
  try {
    const data = {
      forumId: 11,
      gameId: 3,
      likeType: 1,
      operateType: 1,
      postCommentId: '',
      postCommentReplyId: '',
      postId,
      postType: 1,
      toUserId: userId,
    };

    const response = await client.bbsPost(API.FORUM_LIKE, data);
    return response.success;
  } catch (error: any) {
    log.error(`点赞帖子失败: ${postId}`, error.message);
    return false;
  }
}

/**
 * 分享帖子
 */
async function sharePost(client: KuroHttpClient): Promise<boolean> {
  try {
    const data = { gameId: 3 };
    const response = await client.bbsPost(API.TASK_SHARE, data);
    return response.success;
  } catch (error: any) {
    log.error('分享帖子失败', error.message);
    return false;
  }
}

/**
 * 论坛签到
 */
async function forumSignIn(client: KuroHttpClient): Promise<boolean> {
  try {
    const data = { gameId: '2' };
    const response = await client.bbsPost(API.USER_SIGN_IN, data);
    return response.success;
  } catch (error: any) {
    log.error('论坛签到失败', error.message);
    return false;
  }
}

/**
 * 获取任务列表
 */
async function getTaskList(client: KuroHttpClient): Promise<any[]> {
  try {
    const data = { gameId: '0' };
    const response = await client.bbsPost(API.TASK_PROCESS, data);

    if (response.success && response.data) {
      return response.data.dailyTask || [];
    }

    return [];
  } catch (error: any) {
    log.error('获取任务列表失败', error.message);
    return [];
  }
}

/**
 * 获取金币总数
 */
async function getTotalGold(client: KuroHttpClient): Promise<number | null> {
  try {
    const response = await client.bbsPost(API.GOLD_TOTAL);

    if (response.success && response.data) {
      return response.data.goldNum || 0;
    }

    return null;
  } catch (error: any) {
    log.error('获取金币总数失败', error.message);
    return null;
  }
}

/**
 * 执行论坛每日任务
 */
export async function executeKuroForumTasks(
  token: string,
  options?: {
    devcode?: string;
    distinctId?: string;
  }
): Promise<ForumTaskResult> {
  log.info('开始执行库街区论坛任务');

  const client = new KuroHttpClient(
    token,
    options?.devcode,
    options?.distinctId
  );

  try {
    const messages: string[] = [];

    // 获取任务列表
    const tasks = await getTaskList(client);
    if (tasks.length === 0) {
      log.error('获取任务列表失败');
      return {
        success: false,
        message: '获取任务列表失败',
      };
    }

    // 遍历未完成的任务
    for (const task of tasks) {
      // process 为 1 表示已完成
      if (task.process === 1) {
        continue;
      }

      const remark = task.remark || '';
      log.info(`处理任务: ${remark}`);

      let taskResult = '';

      if (remark === TaskType.SIGN_IN) {
        // 签到任务
        const result = await forumSignIn(client);
        taskResult = result ? '签到成功' : '签到失败';
      } else if (remark === TaskType.VIEW_POSTS) {
        // 浏览帖子任务
        const posts = await getForumList(client);
        let viewCount = 0;
        for (const post of posts.slice(0, 3)) {
          if (await viewPost(client, post.postId)) {
            viewCount++;
          }
          await sleep(randomInt(1, 3) * 1000);
        }
        taskResult = `已浏览 ${viewCount}/3 篇帖子`;
      } else if (remark === TaskType.LIKE_POSTS) {
        // 点赞任务
        const posts = await getForumList(client);
        let likeCount = 0;
        for (const post of posts.slice(0, 5)) {
          if (await likePost(client, post.postId, post.userId)) {
            likeCount++;
          }
          await sleep(randomInt(1, 3) * 1000);
        }
        taskResult = `已点赞 ${likeCount}/5 次`;
      } else if (remark === TaskType.SHARE_POST) {
        // 分享任务
        const result = await sharePost(client);
        taskResult = result ? '分享成功' : '分享失败';
      }

      if (taskResult) {
        messages.push(`${remark}: ${taskResult}`);
      }

      await sleep(randomInt(1, 3) * 1000);
    }

    // 获取任务完成情况
    const finalTasks = await getTaskList(client);
    let goldInfo: { todayGain: number; total: number } | undefined;

    if (finalTasks.length > 0) {
      const todayGain = finalTasks
        .filter((t) => t.process === 1)
        .reduce((sum, t) => sum + (t.gainGold || 0), 0);

      const totalGold = await getTotalGold(client);

      goldInfo = {
        todayGain,
        total: totalGold || 0,
      };

      const summary = `今日任务已完成，总计获取金币: ${todayGain}`;
      const totalStr = totalGold !== null ? `；现在剩余：${totalGold} 金币` : '';
      messages.push(summary + totalStr);
      log.info(summary + totalStr);
    }

    log.info('论坛任务执行完成');
    return {
      success: true,
      message: messages.join('\n'),
      goldInfo,
    };
  } catch (error: any) {
    log.error('论坛任务执行失败', error.message);
    return {
      success: false,
      message: `论坛任务执行失败: ${error.message}`,
    };
  }
}
