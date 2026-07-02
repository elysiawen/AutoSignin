/**
 * 内存频率限制器
 * 通过 globalThis 共享存储，避免 Next.js 分包导致多实例限流失效
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const GLOBAL_KEY = Symbol.for('autosign.rateLimiter');
const store: Map<string, RateLimitEntry> =
  ((globalThis as any)[GLOBAL_KEY] as Map<string, RateLimitEntry>) ??
  ((globalThis as any)[GLOBAL_KEY] = new Map<string, RateLimitEntry>());

// 每 5 分钟清理一次过期条目（用 Symbol 防多实例重复注册定时器）
const CLEANUP_KEY = Symbol.for('autosign.rateLimiter.cleanup');
if (!(globalThis as any)[CLEANUP_KEY]) {
  (globalThis as any)[CLEANUP_KEY] = true;
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store) {
      if (now > entry.resetAt) {
        store.delete(key);
      }
    }
  }, 5 * 60 * 1000);
}

export interface RateLimitOptions {
  /** 时间窗口（毫秒），默认 15 分钟 */
  windowMs?: number;
  /** 窗口内最大请求数，默认 5 */
  max?: number;
}

/**
 * 检查是否超出频率限制
 * @returns { limited: true } 表示被限制
 */
export function checkRateLimit(
  key: string,
  options: RateLimitOptions = {}
): { limited: boolean; remaining: number; resetAt: number } {
  const { windowMs = 15 * 60 * 1000, max = 5 } = options;
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    const resetAt = now + windowMs;
    store.set(key, { count: 1, resetAt });
    return { limited: false, remaining: max - 1, resetAt };
  }

  entry.count++;

  if (entry.count > max) {
    return { limited: true, remaining: 0, resetAt: entry.resetAt };
  }

  return { limited: false, remaining: max - entry.count, resetAt: entry.resetAt };
}
