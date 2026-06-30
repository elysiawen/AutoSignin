import axios, { AxiosInstance } from 'axios';
import { API, FORUM_LIST } from './api';
import { generateDS, generateDS2, sleep, randomInt, MIHYO_BBS_VERSION } from './crypto';

/**
 * 创建使用 stoken cookie 的客户端（用于签到/看帖/点赞/分享）
 */
function createMihoyoStokenClient(
  stokenCookie: string,
  deviceId?: string,
  deviceName?: string,
  deviceModel?: string,
): AxiosInstance {
  return axios.create({
    timeout: 30000,
    headers: {
      'DS': generateDS(false),
      'cookie': stokenCookie,
      'x-rpc-client_type': '2',
      'x-rpc-app_version': MIHYO_BBS_VERSION,
      'x-rpc-sys_version': '12',
      'x-rpc-channel': 'miyousheluodi',
      'x-rpc-h265_supported': '1',
      'Referer': 'https://app.mihoyo.com',
      'x-rpc-verify_key': 'bll8iq97cem8',
      'x-rpc-csm_source': 'discussion',
      'Content-Type': 'application/json; charset=UTF-8',
      'Host': 'bbs-api.miyoushe.com',
      'Connection': 'Keep-Alive',
      'Accept-Encoding': 'gzip',
      'User-Agent': 'okhttp/4.9.3',
      ...(deviceId ? { 'x-rpc-device_id': deviceId } : {}),
      ...(deviceName ? { 'x-rpc-device_name': deviceName } : {}),
      ...(deviceModel ? { 'x-rpc-device_model': deviceModel } : {}),
    },
  });
}

/**
 * 创建用于获取任务列表的客户端（使用普通 cookie）
 */
function createMihoyoTaskListClient(cookie: string): AxiosInstance {
  return axios.create({
    timeout: 30000,
    headers: {
      'Accept': 'application/json, text/plain, */*',
      'Origin': 'https://webstatic.mihoyo.com',
      'User-Agent': `Mozilla/5.0 (Linux; Android 12; Unspecified Device) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/103.0.5060.129 Mobile Safari/537.36 miHoYoBBS/${MIHYO_BBS_VERSION}`,
      'Referer': 'https://webstatic.mihoyo.com',
      'Accept-Encoding': 'gzip, deflate',
      'Accept-Language': 'zh-CN,en-US;q=0.8',
      'X-Requested-With': 'com.mihoyo.hyperion',
      'Cookie': cookie,
    },
  });
}

export interface BbsTaskResult {
  success: boolean;
  message: string;
  coinsInfo?: {
    todayGet: number;
    todayHaveGet: number;
    total: number;
  };
}

interface TaskState {
  [key: string]: boolean | number;
  sign: boolean;
  read: boolean;
  readNum: number;
  like: boolean;
  likeNum: number;
  share: boolean;
}

interface PostInfo {
  postId: string;
  subject: string;
}

/**
 * 获取任务列表
 */
export async function getTasksList(
  client: AxiosInstance,
  cookie: string
): Promise<{
  taskState: TaskState;
  coinsInfo: { todayGet: number; todayHaveGet: number; total: number };
}> {
  try {
    const response = await client.get(API.BBS_TASKS_LIST, {
      params: { point_sn: 'myb' },
      headers: {
        Cookie: cookie,
      },
    });

    const data = response.data;

    if (data.retcode === -100) {
      throw new Error('Cookie 已过期');
    }

    if (data.retcode !== 0) {
      throw new Error(data.message || '获取任务列表失败');
    }

    const taskState: TaskState = {
      sign: false,
      read: false,
      readNum: 3,
      like: false,
      likeNum: 5,
      share: false,
    };

    const todayGet = data.data.can_get_points;
    const todayHaveGet = data.data.already_received_points;
    const total = data.data.total_points;

    if (todayGet === 0) {
      // 所有任务已完成
      taskState.sign = true;
      taskState.read = true;
      taskState.like = true;
      taskState.share = true;
    } else {
      const missions = data.data.states || [];
      const taskMap: Record<number, { attr: keyof TaskState; done: string; numAttr?: keyof TaskState }> = {
        58: { attr: 'sign', done: 'is_get_award' },
        59: { attr: 'read', done: 'is_get_award', numAttr: 'readNum' },
        60: { attr: 'like', done: 'is_get_award', numAttr: 'likeNum' },
        61: { attr: 'share', done: 'is_get_award' },
      };

      for (const taskId of Object.keys(taskMap)) {
        const mission = missions.find((m: any) => m.mission_id === parseInt(taskId));
        const task = taskMap[parseInt(taskId)];

        if (mission && mission[task.done]) {
          taskState[task.attr] = true;
        } else if (mission && task.numAttr) {
          const remaining = (taskState[task.numAttr] as number) - mission.happened_times;
          (taskState[task.numAttr] as number) = Math.max(0, remaining);
        }
      }
    }

    return {
      taskState,
      coinsInfo: { todayGet, todayHaveGet, total },
    };
  } catch (error: any) {
    console.error('获取任务列表失败:', error.message);
    throw error;
  }
}

/**
 * 获取帖子列表
 */
export async function getPostList(
  client: AxiosInstance,
  forumId: string,
  count: number = 5
): Promise<PostInfo[]> {
  try {
    const response = await client.get(API.BBS_POST_LIST, {
      params: {
        forum_id: forumId,
        is_good: false,
        is_hot: false,
        page_size: 20,
        sort_type: 1,
      },
      headers: {
        DS: generateDS(true),
      },
    });

    const data = response.data;
    if (data.retcode !== 0) {
      throw new Error(data.message || '获取帖子列表失败');
    }

    const posts = data.data.list || [];
    const selected: PostInfo[] = [];

    // 随机选择帖子
    while (selected.length < count && posts.length > 0) {
      const index = randomInt(0, posts.length - 1);
      const post = posts[index];
      const postId = post.post.post_id;
      const subject = post.post.subject;

      if (!selected.find((p) => p.postId === postId)) {
        selected.push({ postId, subject });
      }
    }

    return selected;
  } catch (error: any) {
    console.error('获取帖子列表失败:', error.message);
    throw error;
  }
}

/**
 * 执行社区签到
 */
export async function signForum(
  client: AxiosInstance,
  gids: string
): Promise<{ success: boolean; message: string }> {
  try {
    const body = JSON.stringify({ gids });
    const response = await client.post(
      API.BBS_SIGN_URL,
      body,
      {
        headers: {
          DS: generateDS2('', body),
          'Content-Type': 'application/json; charset=UTF-8',
        },
      }
    );

    const data = response.data;

    if (data.retcode === 1034) {
      return { success: false, message: '触发验证码' };
    }

    if (data.retcode === 0) {
      return { success: true, message: data.message || '签到成功' };
    }

    if (data.retcode === -100) {
      throw new Error('Cookie 已过期');
    }

    return { success: false, message: data.message || '签到失败' };
  } catch (error: any) {
    console.error('社区签到失败:', error.message);
    return { success: false, message: error.message };
  }
}

/**
 * 阅读帖子
 */
export async function readPost(
  client: AxiosInstance,
  postId: string
): Promise<boolean> {
  try {
    const response = await client.get(API.BBS_POST_DETAIL, {
      params: { post_id: postId },
      headers: { DS: generateDS(true) },
    });

    return response.data.message === 'OK';
  } catch (error) {
    return false;
  }
}

/**
 * 点赞帖子
 */
export async function likePost(
  client: AxiosInstance,
  postId: string,
  isCancel: boolean = false
): Promise<boolean> {
  try {
    const response = await client.post(
      API.BBS_LIKE_URL,
      { post_id: postId, is_cancel: isCancel },
      {
        headers: { DS: generateDS(true) },
      }
    );

    return response.data.message === 'OK';
  } catch (error) {
    return false;
  }
}

/**
 * 分享帖子
 */
export async function sharePost(
  client: AxiosInstance,
  postId: string
): Promise<boolean> {
  try {
    const response = await client.get(API.BBS_SHARE_URL, {
      params: { entity_id: postId, entity_type: 1 },
      headers: { DS: generateDS(true) },
    });

    return response.data.message === 'OK';
  } catch (error) {
    return false;
  }
}

/**
 * 执行米游社任务（完整流程）
 */
export async function executeBbsTasks(
  stokenCookie: string,
  forumIds: number[],
  options: {
    doSign?: boolean;
    doRead?: boolean;
    doLike?: boolean;
    doShare?: boolean;
    cookie?: string; // 普通 cookie，用于获取任务列表
    deviceId?: string;
    deviceName?: string;
    deviceModel?: string;
  } = {}
): Promise<BbsTaskResult> {
  const { doSign = true, doRead = true, doLike = true, doShare = true, cookie, deviceId, deviceName, deviceModel } = options;

  try {
    // 创建使用 stoken cookie 的客户端（用于签到/看帖/点赞/分享）
    const stokenClient = createMihoyoStokenClient(stokenCookie, deviceId, deviceName, deviceModel);

    // 获取任务状态（使用普通 cookie）
    const taskListCookie = cookie || stokenCookie;
    const taskListClient = createMihoyoTaskListClient(taskListCookie);
    const { taskState, coinsInfo } = await getTasksList(taskListClient, taskListCookie);

    // 如果所有任务都完成了
    if (taskState.sign && taskState.read && taskState.like && taskState.share) {
      return {
        success: true,
        message: '今天已经全部完成了',
        coinsInfo,
      };
    }

    const results: string[] = [];
    let hasError = false;

    // 社区签到（使用 stoken client）
    if (doSign && !taskState.sign) {
      for (const forumId of forumIds) {
        const forum = FORUM_LIST[forumId];
        if (!forum) continue;

        await sleep(randomInt(3, 8) * 1000);
        const result = await signForum(stokenClient, forum.id);
        if (!result.success) hasError = true;
        results.push(`${forum.name}: ${result.message}`);
      }
    }

    // 获取帖子列表（使用 stoken client）
    const forumId = FORUM_LIST[forumIds[0]]?.forumId || '26';
    const maxPosts = Math.max(taskState.readNum, taskState.likeNum);
    let posts: PostInfo[] = [];

    if ((doRead && !taskState.read) || (doLike && !taskState.like) || (doShare && !taskState.share)) {
      posts = await getPostList(stokenClient, forumId, maxPosts);
    }

    // 执行帖子相关任务（使用 stoken client）
    for (const post of posts) {
      // 阅读
      if (doRead && !taskState.read && taskState.readNum > 0) {
        await sleep(randomInt(3, 8) * 1000);
        await readPost(stokenClient, post.postId);
        taskState.readNum--;
      }

      // 点赞
      if (doLike && !taskState.like && taskState.likeNum > 0) {
        await sleep(randomInt(3, 8) * 1000);
        await likePost(stokenClient, post.postId);
        taskState.likeNum--;
      }

      // 分享
      if (doShare && !taskState.share) {
        await sleep(randomInt(3, 8) * 1000);
        await sharePost(stokenClient, post.postId);
        taskState.share = true;
      }
    }

    // 重新获取任务状态
    const finalState = await getTasksList(taskListClient, taskListCookie);

    return {
      success: !hasError,
      message: results.join('\n') || '任务执行完成',
      coinsInfo: finalState.coinsInfo,
    };
  } catch (error: any) {
    return {
      success: false,
      message: `米游社任务失败: ${error.message}`,
    };
  }
}
