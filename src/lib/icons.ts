/**
 * 图标路径统一管理
 */

// 平台图标
export const platformIcons: Record<string, string | null> = {
  MIYOUSHE: '/icons/miyoushe.webp',
  HOYOLAB: '/icons/hoyolab.png',
  KUJIEQU: '/icons/kurobbs.webp',
  TAYGEDO: '/icons/taygedo.webp',
  SKLAND: '/icons/skland.webp',
  YIHUAN: null,
};

// 任务类型图标
export const taskTypeIcons: Record<string, string> = {
  // 米游社任务
  MIYOUSHE_CHECKIN: '/icons/miyoushe.webp',
  MIYOUSHE_READ: '/icons/miyoushe.webp',
  MIYOUSHE_LIKE: '/icons/miyoushe.webp',
  MIYOUSHE_SHARE: '/icons/miyoushe.webp',
  MIYOUSHE_COINS: '/icons/miyoushe.webp',

  // 国服游戏签到
  GENSHIN_CN: '/icons/genshin.webp',
  HONKAI2_CN: '/icons/bh2.webp',
  HONKAI3RD_CN: '/icons/bh3.webp',
  TEARS_OF_THEMIS_CN: '/icons/miyoushe.webp',
  HONKAI_SR_CN: '/icons/hsr.webp',
  ZZZ_CN: '/icons/zzz.webp',

  // 国际服游戏签到
  GENSHIN_OS: '/icons/genshin.webp',
  HONKAI3RD_OS: '/icons/bh3.webp',
  HONKAI_SR_OS: '/icons/hsr.webp',
  ZZZ_OS: '/icons/zzz.webp',

  // 云游戏签到
  CLOUD_GENSHIN: '/icons/cloud_genshin.webp',
  CLOUD_ZZZ: '/icons/cloud_zzz.webp',

  // 库街区任务
  KUJIEQU_WUWA: '/icons/ww.webp',
  KUJIEQU_PGR: '/icons/zs.webp',
  KUJIEQU_FORUM: '/icons/kurobbs.webp',

  // 塔吉多任务
  TAYGEDO_SIGNIN: '/icons/taygedo.webp',
  TAYGEDO_GAMESIGNIN: '/icons/taygedo.webp',
  TAYGEDO_COINS: '/icons/taygedo.webp',
  TAYGEDO_CLOUD: '/icons/taygedo.webp',

  // 森空岛任务
  SKLAND_ARKNIGHTS: '/icons/arknights.webp',
  SKLAND_ENDFIELD: '/icons/endfield.webp',
};

// 平台颜色
export const platformColors: Record<string, string> = {
  MIYOUSHE: 'bg-blue-500',
  HOYOLAB: 'bg-purple-500',
  KUJIEQU: 'bg-green-500',
  TAYGEDO: 'bg-cyan-500',
  SKLAND: 'bg-orange-500',
  YIHUAN: 'bg-orange-500',
};

// 任务类型颜色
export const taskTypeColors: Record<string, string> = {
  // 米游社任务
  MIYOUSHE_CHECKIN: 'bg-blue-500',
  MIYOUSHE_READ: 'bg-cyan-500',
  MIYOUSHE_LIKE: 'bg-pink-500',
  MIYOUSHE_SHARE: 'bg-purple-500',
  MIYOUSHE_COINS: 'bg-amber-500',

  // 国服游戏签到
  GENSHIN_CN: 'bg-yellow-500',
  HONKAI2_CN: 'bg-red-500',
  HONKAI3RD_CN: 'bg-indigo-500',
  TEARS_OF_THEMIS_CN: 'bg-rose-500',
  HONKAI_SR_CN: 'bg-sky-500',
  ZZZ_CN: 'bg-teal-500',

  // 国际服游戏签到
  GENSHIN_OS: 'bg-yellow-500',
  HONKAI3RD_OS: 'bg-indigo-500',
  HONKAI_SR_OS: 'bg-sky-500',
  ZZZ_OS: 'bg-teal-500',

  // 云游戏签到
  CLOUD_GENSHIN: 'bg-orange-500',
  CLOUD_ZZZ: 'bg-lime-500',

  // 库街区任务
  KUJIEQU_WUWA: 'bg-emerald-500',
  KUJIEQU_PGR: 'bg-violet-500',
  KUJIEQU_FORUM: 'bg-green-500',

  // 塔吉多任务
  TAYGEDO_SIGNIN: 'bg-cyan-500',
  TAYGEDO_GAMESIGNIN: 'bg-teal-500',
  TAYGEDO_COINS: 'bg-amber-500',
  TAYGEDO_CLOUD: 'bg-sky-500',

  // 森空岛任务
  SKLAND_ARKNIGHTS: 'bg-blue-600',
  SKLAND_ENDFIELD: 'bg-purple-600',
};

// 平台名称
export const platformNames: Record<string, string> = {
  MIYOUSHE: '米游社（国服）',
  HOYOLAB: 'HoYoLAB（国际服）',
  KUJIEQU: '库街区',
  TAYGEDO: '塔吉多',
  SKLAND: '森空岛',
  YIHUAN: '异环',
};

// 任务类型名称
export const taskTypeNames: Record<string, string> = {
  // 米游社任务
  MIYOUSHE_CHECKIN: '米游社签到',
  MIYOUSHE_READ: '米游社看帖',
  MIYOUSHE_LIKE: '米游社点赞',
  MIYOUSHE_SHARE: '米游社分享',
  MIYOUSHE_COINS: '米游社获取米游币',

  // 国服游戏签到
  GENSHIN_CN: '原神',
  HONKAI2_CN: '崩坏2',
  HONKAI3RD_CN: '崩坏3',
  TEARS_OF_THEMIS_CN: '未定事件簿',
  HONKAI_SR_CN: '星穹铁道',
  ZZZ_CN: '绝区零',

  // 国际服游戏签到
  GENSHIN_OS: '原神（国际服）',
  HONKAI3RD_OS: '崩坏3（国际服）',
  HONKAI_SR_OS: '星穹铁道（国际服）',
  ZZZ_OS: '绝区零（国际服）',

  // 云游戏签到
  CLOUD_GENSHIN: '云原神',
  CLOUD_ZZZ: '云绝区零',

  // 库街区任务
  KUJIEQU_WUWA: '鸣潮',
  KUJIEQU_PGR: '战双帕弥什',
  KUJIEQU_FORUM: '库街区论坛任务',

  // 塔吉多任务
  TAYGEDO_SIGNIN: '塔吉多社区签到',
  TAYGEDO_GAMESIGNIN: '塔吉多游戏签到',
  TAYGEDO_COINS: '塔吉多金币任务',
  TAYGEDO_CLOUD: '云异环时长签到',

  // 森空岛任务
  SKLAND_ARKNIGHTS: '明日方舟签到',
  SKLAND_ENDFIELD: '终末地签到',
};
