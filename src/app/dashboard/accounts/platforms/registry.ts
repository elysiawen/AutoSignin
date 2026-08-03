import type { PlatformConfig } from './types';
import { miyoushePlatform } from './miyoushe';
import { hoyolabPlatform } from './hoyolab';
import { kujiequPlatform } from './kujiequ';
import { taygedoPlatform } from './taygedo';
import { sklandPlatform } from './skland';

/** 所有平台配置 */
export const platforms: PlatformConfig[] = [
  miyoushePlatform,
  hoyolabPlatform,
  kujiequPlatform,
  taygedoPlatform,
  sklandPlatform,
];

/** 根据 ID 获取平台配置 */
export function getPlatform(id: string): PlatformConfig | undefined {
  return platforms.find((p) => p.id === id);
}
