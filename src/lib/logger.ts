import { AsyncLocalStorage } from 'node:async_hooks';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  module: string;
  message: string;
  data?: any;
}

// 请求级别的日志存储，每个请求有独立的日志数组
const logStorage = new AsyncLocalStorage<LogEntry[]>();

/**
 * 初始化一个新的日志上下文（在请求处理开始时调用）
 */
export function initLogContext<T>(fn: () => T): T {
  return logStorage.run([], fn);
}

/**
 * 异步版本
 */
export async function initLogContextAsync<T>(fn: () => Promise<T>): Promise<T> {
  return logStorage.run([], fn);
}

/**
 * 获取当前请求的日志数组
 */
function getCurrentLogs(): LogEntry[] | undefined {
  return logStorage.getStore();
}

class Logger {
  private module: string;

  constructor(module: string) {
    this.module = module;
  }

  private log(level: LogLevel, message: string, data?: any) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      module: this.module,
      message,
      data,
    };

    // 添加到当前请求的日志上下文（如果存在）
    const logs = getCurrentLogs();
    if (logs) {
      logs.push(entry);
    }

    // 同时输出到控制台
    const prefix = `[${entry.timestamp}] [${level.toUpperCase()}] [${this.module}]`;
    switch (level) {
      case 'debug':
        console.debug(prefix, message, data || '');
        break;
      case 'info':
        console.info(prefix, message, data || '');
        break;
      case 'warn':
        console.warn(prefix, message, data || '');
        break;
      case 'error':
        console.error(prefix, message, data || '');
        break;
    }

    return entry;
  }

  debug(message: string, data?: any) {
    return this.log('debug', message, data);
  }

  info(message: string, data?: any) {
    return this.log('info', message, data);
  }

  warn(message: string, data?: any) {
    return this.log('warn', message, data);
  }

  error(message: string, data?: any) {
    return this.log('error', message, data);
  }
}

export function createLogger(module: string) {
  return new Logger(module);
}

/**
 * 清空当前请求的日志
 */
export function clearLogs() {
  const logs = getCurrentLogs();
  if (logs) {
    logs.length = 0;
  }
}

/**
 * 获取当前请求的所有日志
 */
export function getAllLogs(): LogEntry[] {
  const logs = getCurrentLogs();
  return logs ? [...logs] : [];
}

/**
 * 获取当前请求的格式化日志
 */
export function getFormattedLogs(): string {
  const logs = getCurrentLogs();
  if (!logs || logs.length === 0) return '';

  return logs.map(entry => {
    const prefix = `[${entry.timestamp}] [${entry.level.toUpperCase()}] [${entry.module}]`;
    const dataStr = entry.data ? ` ${typeof entry.data === 'object' ? JSON.stringify(entry.data, null, 2) : entry.data}` : '';
    return `${prefix} ${entry.message}${dataStr}`;
  }).join('\n');
}

export default Logger;
