/**
 * Next.js instrumentation hook
 * 服务器启动时自动初始化调度器
 */
export async function register() {
  // 只在 Node.js 运行时执行
  if (process.env.NEXT_RUNTIME === 'edge') {
    return;
  }

  // 同步导入，确保在服务器启动时执行
  try {
    const { initScheduler } = await import('./lib/scheduler');
    console.log('[启动] 初始化定时任务调度器...');
    await initScheduler();
    console.log('[启动] 调度器初始化完成');
  } catch (error) {
    console.error('[启动] 调度器初始化失败:', error);
  }
}
