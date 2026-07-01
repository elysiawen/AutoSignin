/**
 * 设备信息管理（通用）
 *
 * 每个用户每个平台一个设备身份，config 字段存储平台特定数据。
 * - 米游社: { device_id, product, device_name, seed_id, seed_time, device_fp }
 * - 库街区: { devcode, distinct_id }
 * - 其他平台: 按需扩展
 *
 * 基于 TeyvatGuide 项目: https://github.com/BTMuli/TeyvatGuide
 */

import crypto from 'crypto';
import axios from 'axios';
import prisma from '@/lib/prisma';
import type { Platform } from '@/generated/prisma/enums';

// ==================== 米游社设备类型 ====================

export interface MiyousheDeviceConfig {
  device_id: string;
  product: string;
  device_name: string;
  seed_id: string;
  seed_time: string;
  device_fp: string;
}

// ==================== 库街区设备类型 ====================

export interface KuroDeviceConfig {
  devcode: string;
  distinct_id: string;
}

// ==================== 塔吉多设备类型 ====================

export interface TaygedoDeviceConfig {
  deviceId: string;
  openudid: string;
  vendorid: string;
}

// ==================== 工具函数 ====================

function getRandomString(length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

// ==================== 米游社设备 ====================

export function generateMiyousheDevice(): MiyousheDeviceConfig {
  return {
    device_id: crypto.randomUUID(),
    product: getRandomString(6),
    device_name: getRandomString(12),
    seed_id: crypto.randomUUID(),
    seed_time: Date.now().toString(),
    device_fp: '0000000000000',
  };
}

export async function fetchDeviceFp(device: MiyousheDeviceConfig): Promise<string> {
  const extFields = {
    proxyStatus: 0,
    isRoot: 0,
    romCapacity: '512',
    deviceName: device.device_name,
    productName: device.product,
    romRemain: '512',
    hostname: 'dg02-pool03-kvm87',
    screenSize: '1440x2905',
    isTablet: 0,
    aaid: '',
    model: device.device_name,
    brand: 'Xiaomi',
    hardware: 'qcom',
    deviceType: 'OP5913L1',
    devId: 'unknown',
    serialNumber: 'unknown',
    sdCardCapacity: 512215,
    buildTime: '1693626947000',
    buildUser: 'android-build',
    simState: '5',
    ramRemain: '239814',
    appUpdateTimeDiff: 1702604034882,
    deviceInfo: `XiaoMi ${device.device_name} OP5913L1:13 SKQ1.221119.001 T.118e6c7-5aa23-73911:user release-keys`,
    vaid: '',
    buildType: 'user',
    sdkVersion: '34',
    ui_mode: 'UI_MODE_TYPE_NORMAL',
    isMockLocation: 0,
    cpuType: 'arm64-v8a',
    isAirMode: 0,
    ringMode: 2,
    chargeStatus: 1,
    manufacturer: 'XiaoMi',
    emulatorStatus: 0,
    appMemory: '512',
    osVersion: '14',
    vendor: 'unknown',
    accelerometer: '1.4883357x9.80665x-0.1963501',
    sdRemain: 239600,
    buildTags: 'release-keys',
    packageName: 'com.mihoyo.hyperion',
    networkType: 'WiFi',
    oaid: '',
    debugStatus: 1,
    ramCapacity: '469679',
    magnetometer: '20.081251x-27.457501x2.1937501',
    display: `${device.product}_13.1.0.181(CN01)`,
    appInstallTimeDiff: 1688455751496,
    packageVersion: '2.20.1',
    gyroscope: '0.030226856x-0.014647375x-0.0013732915',
    batteryStatus: 100,
    hasKeyboard: 0,
    board: 'taro',
  };

  try {
    const response = await axios.post(
      'https://public-data-api.mihoyo.com/device-fp/api/getFp',
      {
        device_id: device.device_id,
        seed_id: device.seed_id,
        platform: '2',
        seed_time: device.seed_time,
        ext_fields: JSON.stringify(extFields),
        app_name: 'bbs_cn',
        bbs_device_id: device.device_id,
        device_fp: device.device_fp,
      },
      {
        headers: {
          'user-agent': 'Mozilla/5.0 (Linux; Android 12) Mobile miHoYoBBS/2.109.0',
          'x-rpc-app_version': '2.109.0',
          'x-rpc-client_type': '5',
          'x-requested-with': 'com.mihoyo.hyperion',
          'Referer': 'https://webstatic.mihoyo.com/',
        },
        timeout: 10000,
      },
    );

    const data = response.data;
    if (data.retcode === 0 && data.data?.device_fp) {
      return data.data.device_fp;
    }
    console.warn('获取设备指纹失败，使用默认值:', data.message);
    return '0000000000000';
  } catch (e) {
    console.warn('获取设备指纹异常，使用默认值:', e);
    return '0000000000000';
  }
}

// ==================== 库街区设备 ====================

export function generateKuroDevice(): KuroDeviceConfig {
  return {
    devcode: crypto.randomBytes(20).toString('hex'),
    distinct_id: crypto.randomUUID().replace(/-/g, ''),
  };
}

// ==================== 塔吉多设备 ====================

export function generateTaygedoDevice(): TaygedoDeviceConfig {
  return {
    deviceId: crypto.randomBytes(16).toString('hex'),
    openudid: crypto.randomUUID().toUpperCase(),
    vendorid: crypto.randomUUID().toUpperCase(),
  };
}

// ==================== 通用接口 ====================

type DeviceConfigMap = {
  MIYOUSHE: MiyousheDeviceConfig;
  HOYOLAB: MiyousheDeviceConfig;
  KUJIEQU: KuroDeviceConfig;
  TAYGEDO: TaygedoDeviceConfig;
  YIHUAN: Record<string, any>;
};

/**
 * 从数据库读取设备信息，没有则生成并保存
 */
export async function ensureDevice<T extends Platform>(
  userId: string,
  platform: T,
  generator: () => DeviceConfigMap[T] | Promise<DeviceConfigMap[T]>,
): Promise<DeviceConfigMap[T]> {
  const existing = await prisma.device.findUnique({
    where: { userId_platform: { userId, platform } },
  });

  if (existing) {
    return existing.config as DeviceConfigMap[T];
  }

  const config = await generator();

  await prisma.device.create({
    data: {
      userId,
      platform,
      config: config as any,
    },
  });

  return config;
}

/**
 * 确保米游社设备信息存在（生成 + 获取真实指纹）
 */
export async function ensureMiyousheDevice(userId: string): Promise<MiyousheDeviceConfig> {
  return ensureDevice(userId, 'MIYOUSHE', async () => {
    const device = generateMiyousheDevice();
    device.device_fp = await fetchDeviceFp(device);
    return device;
  });
}

/**
 * 确保库街区设备信息存在
 */
export async function ensureKuroDevice(userId: string): Promise<KuroDeviceConfig> {
  return ensureDevice(userId, 'KUJIEQU', () => generateKuroDevice());
}

/**
 * 确保塔吉多设备信息存在
 */
export async function ensureTaygedoDevice(userId: string): Promise<TaygedoDeviceConfig> {
  return ensureDevice(userId, 'TAYGEDO', () => generateTaygedoDevice());
}
