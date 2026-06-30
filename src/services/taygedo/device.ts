/**
 * 塔吉多设备身份生成
 */

import crypto from 'crypto';

export interface DeviceIdentity {
  deviceId: string;
  openudid: string;
  vendorid: string;
}

/**
 * 生成随机设备身份
 */
export function generateDeviceIdentity(): DeviceIdentity {
  return {
    deviceId: crypto.randomBytes(16).toString('hex'),
    openudid: crypto.randomUUID().toUpperCase(),
    vendorid: crypto.randomUUID().toUpperCase(),
  };
}

/**
 * 确保账号有设备身份，没有则自动生成
 */
export function ensureDevice(extra: Record<string, any>): DeviceIdentity {
  if (extra.deviceId && extra.openudid && extra.vendorid) {
    return {
      deviceId: extra.deviceId,
      openudid: extra.openudid,
      vendorid: extra.vendorid,
    };
  }
  const generated = generateDeviceIdentity();
  return {
    deviceId: extra.deviceId || generated.deviceId,
    openudid: extra.openudid || generated.openudid,
    vendorid: extra.vendorid || generated.vendorid,
  };
}
