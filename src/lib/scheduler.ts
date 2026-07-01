import cron, { ScheduledTask } from 'node-cron';
import prisma from './prisma';
import { executeTask } from '@/services/task-executor';
import { createLogger, initLogContextAsync, getFormattedLogs } from './logger';
import { sendNotification, formatSummaryMessage, type TaskResultSummary } from '@/services/notification';
import { NotificationSource } from '@/generated/prisma/enums';

const log = createLogger('定时任务');

// ==================== 全局异常处理 ====================

process.on('uncaughtException', (error) => {
  console.error('[全局] 未捕获的异常:', error.message);
  console.error('[全局] 堆栈:', error.stack);
});

process.on('unhandledRejection', (reason) => {
  const err = reason instanceof Error ? reason : new Error(String(reason));
  console.error('[全局] 未处理的 Promise 拒绝:', err.message);
  console.error('[全局] 堆栈:', err.stack);
});

// 存储所有活跃的 cron 任务（按账号ID）
const scheduledTasks = new Map<string, ScheduledTask>();

// 默认 cron 表达式：每天凌晨 0:05
const DEFAULT_CRON = '5 0 * * *';

/**
 * 初始化定时任务调度器（服务启动时自动调用）
 */
export async function initScheduler() {
  log.info('初始化定时任务调度器...');

  try {
    // 获取所有启用的账号（有 cronExpr 的）
    const accounts = await prisma.account.findMany({
      where: {
        isActive: true,
        cronExpr: { not: null },
      },
      include: {
        tasks: true,
      },
    });

    log.info(`找到 ${accounts.length} 个启用的账号`);

    // 为每个账号创建 cron 调度
    for (const account of accounts) {
      if (account.tasks.length > 0) {
        await scheduleAccount(account);
      }
    }

    log.info('定时任务调度器初始化完成');
  } catch (error: any) {
    log.error('初始化调度器失败', { error: error.message });
  }
}

/**
 * 调度单个账号的所有任务
 */
export async function scheduleAccount(account: any) {
  const cronExpr = account.cronExpr || DEFAULT_CRON;

  // 验证 cron 表达式
  if (!cron.validate(cronExpr)) {
    log.error(`无效的 cron 表达式: ${cronExpr}, accountId: ${account.id}`);
    return;
  }

  // 如果已存在，先停止
  if (scheduledTasks.has(account.id)) {
    scheduledTasks.get(account.id)?.stop();
    scheduledTasks.delete(account.id);
  }

  // 创建新的 cron 任务
  const scheduledTask = cron.schedule(cronExpr, async () => {
    log.info(`执行账号定时任务: ${account.name}, accountId: ${account.id}`);

    // 检查账号是否仍然启用
    const currentAccount = await prisma.account.findUnique({
      where: { id: account.id },
    });

    if (!currentAccount || !currentAccount.isActive) {
      log.info(`账号 ${account.name} 已禁用，跳过执行`);
      unscheduleAccount(account.id);
      return;
    }

    // 按顺序执行该账号下的所有任务
    const taskResults: TaskResultSummary[] = [];

    for (const task of account.tasks) {
      log.info(`执行任务: ${task.type}, taskId: ${task.id}`);

      await initLogContextAsync(async () => {
        try {
          const startTime = Date.now();
          const result = await executeTask({ ...task, account }, 'auto');
          const duration = Date.now() - startTime;
          const fullLogs = getFormattedLogs();
          const message = `[自动] ${result.message}`;

          await prisma.taskLog.create({
            data: {
              userId: task.userId,
              taskId: task.id,
              status: result.status,
              message,
              details: fullLogs || null,
              reward: result.reward || null,
              duration,
            },
          });

          taskResults.push({
            taskType: task.type,
            status: result.status,
            message: result.message,
            reward: result.reward,
          });

          log.info(`任务完成: ${task.type}, status: ${result.status}`);
        } catch (error: any) {
          log.error(`任务失败: ${task.type}`, { error: error.message });
          const fullLogs = getFormattedLogs();
          await prisma.taskLog.create({
            data: {
              userId: task.userId,
              taskId: task.id,
              status: 'FAILED',
              message: `[自动] ${error.message || '执行任务时发生错误'}`,
              details: fullLogs || null,
            },
          });

          taskResults.push({
            taskType: task.type,
            status: 'FAILED',
            message: error.message || '执行任务时发生错误',
          });
        }
      });

      // 任务之间等待随机时间
      await new Promise(resolve => setTimeout(resolve, Math.random() * 3000 + 1000));
    }

    // 所有任务执行完毕，发送汇总通知
    if (taskResults.length > 0) {
      const { event, message } = formatSummaryMessage(account.name, account.platform, NotificationSource.AUTO, taskResults);
      sendNotification({
        userId: account.userId,
        accountName: account.name,
        platform: account.platform,
        taskType: `${taskResults.length} 个任务`,
        event,
        message,
        source: NotificationSource.AUTO,
        rawMessage: true,
      }).catch((e) => log.warn('通知发送异常', { error: e.message }));
    }

    log.info(`账号任务执行完成: ${account.name}`);
  }, {
    timezone: 'Asia/Shanghai',
  });

  scheduledTasks.set(account.id, scheduledTask);
  log.info(`已调度账号: ${account.name}, cron: ${cronExpr}, 任务数: ${account.tasks.length}`);
}

/**
 * 停止账号调度
 */
export function unscheduleAccount(accountId: string) {
  const scheduledTask = scheduledTasks.get(accountId);
  if (scheduledTask) {
    scheduledTask.stop();
    scheduledTasks.delete(accountId);
    log.info(`已停止账号调度: ${accountId}`);
  }
}

/**
 * 重新调度账号
 */
export async function rescheduleAccount(accountId: string) {
  // 先停止
  unscheduleAccount(accountId);

  // 获取账号信息
  const account = await prisma.account.findUnique({
    where: { id: accountId },
    include: { tasks: true },
  });

  if (account && account.isActive && account.cronExpr && account.tasks.length > 0) {
    await scheduleAccount(account);
  }
}

/**
 * 获取调度器状态
 * 如果内存中没有活跃任务，从数据库查询（兼容热重载/首次请求）
 */
export async function getSchedulerStatus() {
  const activeAccounts = Array.from(scheduledTasks.keys());

  if (activeAccounts.length > 0) {
    return {
      activeCount: activeAccounts.length,
      accountIds: activeAccounts,
      source: 'scheduler' as const,
    };
  }

  // 内存为空，从数据库查询实际配置了定时任务的账号
  try {
    const accounts = await prisma.account.findMany({
      where: {
        isActive: true,
        cronExpr: { not: null },
      },
      select: { id: true },
    });

    return {
      activeCount: accounts.length,
      accountIds: accounts.map((a) => a.id),
      source: 'database' as const,
    };
  } catch {
    return {
      activeCount: 0,
      accountIds: [] as string[],
      source: 'database' as const,
    };
  }
}

/**
 * 手动执行指定账号的所有任务
 */
export async function executeAccountTasks(accountId: string) {
  log.info(`手动执行账号任务: ${accountId}`);

  const account = await prisma.account.findUnique({
    where: { id: accountId },
    include: { tasks: true },
  });

  if (!account) {
    throw new Error('账号不存在');
  }

  const results: Array<{ taskId: string; type: string; status: string; message: string }> = [];
  const taskResults: TaskResultSummary[] = [];

  for (const task of account.tasks) {
    await initLogContextAsync(async () => {
      try {
        const startTime = Date.now();
        const result = await executeTask({ ...task, account }, 'manual');
        const duration = Date.now() - startTime;
        const fullLogs = getFormattedLogs();
        const message = `[手动] ${result.message}`;

        await prisma.taskLog.create({
          data: {
            userId: task.userId,
            taskId: task.id,
            status: result.status,
            message,
            details: fullLogs || null,
            reward: result.reward || null,
            duration,
          },
        });

        results.push({
          taskId: task.id,
          type: task.type,
          status: result.status,
          message: result.message,
        });

        taskResults.push({
          taskType: task.type,
          status: result.status,
          message: result.message,
          reward: result.reward,
        });
      } catch (error: any) {
        results.push({
          taskId: task.id,
          type: task.type,
          status: 'FAILED',
          message: error.message,
        });

        taskResults.push({
          taskType: task.type,
          status: 'FAILED',
          message: error.message,
        });
      }
    });

    // 任务之间等待
    await new Promise(resolve => setTimeout(resolve, Math.random() * 3000 + 1000));
  }

  // 所有任务执行完毕，发送汇总通知
  if (taskResults.length > 0) {
    const { event, message } = formatSummaryMessage(account.name, account.platform, NotificationSource.MANUAL, taskResults);
    sendNotification({
      userId: account.userId,
      accountName: account.name,
      platform: account.platform,
      taskType: `${taskResults.length} 个任务`,
      event,
      message,
      source: NotificationSource.MANUAL,
      rawMessage: true,
    }).catch((e) => log.warn('通知发送异常', { error: e.message }));
  }

  log.info(`账号任务执行完成: ${account.name}, 共 ${results.length} 个任务`);
  return results;
}

/**
 * 手动执行所有活跃账号的任务
 */
export async function executeAllTasks() {
  log.info('手动执行所有活跃账号任务...');

  const accounts = await prisma.account.findMany({
    where: { isActive: true },
    include: { tasks: true },
  });

  const allResults = [];

  for (const account of accounts) {
    if (account.tasks.length === 0) continue;

    const results = await executeAccountTasks(account.id);
    allResults.push(...results);
  }

  log.info(`所有任务执行完成，共 ${allResults.length} 个任务`);
  return allResults;
}
