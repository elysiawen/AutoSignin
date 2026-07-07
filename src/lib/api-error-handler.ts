import { NextRequest, NextResponse } from 'next/server';
import { createLogger } from './logger';

const log = createLogger('API');

/**
 * 已知的业务异常，可安全返回 message 给客户端
 */
export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number = 400) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

/**
 * 从 Prisma / 未知错误中提取安全的错误信息
 */
function sanitizeError(error: unknown): { message: string; status: number } {
  // 业务异常 — message 是安全的
  if (error instanceof ApiError) {
    return { message: error.message, status: error.status };
  }

  // Prisma 常见错误
  if (error && typeof error === 'object' && 'code' in error) {
    const code = (error as any).code;
    switch (code) {
      case 'P2002':
        return { message: '数据重复，请勿重复提交', status: 409 };
      case 'P2025':
        return { message: '记录不存在', status: 404 };
      case 'P2003':
        return { message: '关联数据不存在', status: 400 };
    }
  }

  // 其它未知错误 — 不泄露内部信息
  return { message: '服务器内部错误，请稍后重试', status: 500 };
}

type RouteHandler = (
  request: NextRequest,
  context?: any
) => Promise<NextResponse>;

/**
 * 包装 API 路由处理函数，统一捕获异常并返回安全响应。
 *
 * 用法：
 *   export const GET = withErrorHandling(async (req) => { ... });
 *   export const POST = withErrorHandling(async (req) => { ... });
 */
export function withErrorHandling(handler: RouteHandler): RouteHandler {
  return async (request: NextRequest, context?: any) => {
    try {
      return await handler(request, context);
    } catch (error) {
      const { message, status } = sanitizeError(error);

      if (error instanceof ApiError) {
        // 预期内的业务报错（频率限制、参数校验、SMTP未配置等）— warn 级别，不打堆栈
        log.warn(`${request.method} ${request.nextUrl.pathname} → ${status}: ${message}`);
      } else {
        // 未预期的异常 — error 级别，打完整信息
        const errObj = error instanceof Error ? error : new Error(String(error));
        log.error(`${request.method} ${request.nextUrl.pathname} → ${status}`, {
          error: errObj.message,
          stack: process.env.NODE_ENV === 'production' ? undefined : errObj.stack,
        });
      }

      return NextResponse.json({ error: message }, { status });
    }
  };
}
