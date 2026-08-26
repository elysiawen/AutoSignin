/**
 * 认证登录方式开关
 *
 * 两个开关分别控制 OAuth（通行证）登录和账号密码登录是否可用。
 *
 * 默认行为（环境变量未配置时）：
 *   - AUTH_OAUTH_ENABLED:   默认关闭，只有显式设为 "true" 才启用通行证登录
 *   - AUTH_PASSWORD_ENABLED: 默认开启，只有显式设为 "false" 才关闭账号密码登录
 *
 * 注意：不允许两者同时关闭，若配置失误导致两者都关闭，将兜底启用账号密码登录。
 */

export const AUTH_OAUTH_ENABLED = 'AUTH_OAUTH_ENABLED';
export const AUTH_PASSWORD_ENABLED = 'AUTH_PASSWORD_ENABLED';

const isTrue = (v: string | undefined): boolean => v === 'true';

/**
 * 账号密码登录：默认开启，只有显式 "false" 才关闭。
 */
const isPasswordEnabled = (v: string | undefined): boolean => v === undefined || v === 'true';

/**
 * 计算最终生效的登录开关状态。
 *
 * @returns { oauth, password }
 * - oauth：通行证登录是否可用（默认关闭，需显式 AUTH_OAUTH_ENABLED=true）
 * - password：账号密码登录是否可用（默认开启，需显式 AUTH_PASSWORD_ENABLED=false）
 * 兜底：如果两者都关闭，则强制启用账号密码登录。
 */
export function resolveAuthFlags(): { oauth: boolean; password: boolean } {
  const oauth = isTrue(process.env[AUTH_OAUTH_ENABLED]);
  let password = isPasswordEnabled(process.env[AUTH_PASSWORD_ENABLED]);

  // 兜底：不允许同时关闭
  if (!oauth && !password) {
    password = true;
  }

  return { oauth, password };
}
