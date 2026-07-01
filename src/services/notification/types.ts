import { NotificationEvent, NotificationSource } from '@/generated/prisma/enums';
import { taskTypeNames } from '@/lib/icons';

export interface NotifyContext {
  userId: string;
  accountName: string;
  platform: string;
  taskType: string;
  event: NotificationEvent;
  message: string;
  reward?: string;
  source: NotificationSource;
  rawMessage?: boolean; // true 时直接使用 message，不再经过 formatNotifyMessage 包装
}

export interface NotifyProvider {
  send(target: Record<string, any>, ctx: NotifyContext): Promise<void>;
}

/**
 * 单任务通知消息
 * 如果 ctx.rawMessage 为 true，直接返回 message（用于汇总通知）
 */
export function formatNotifyMessage(ctx: NotifyContext): string {
  if (ctx.rawMessage) {
    return ctx.message;
  }

  const icon = ctx.event === 'SUCCESS' ? '✅' : ctx.event === 'FAILED' ? '❌' : '🧩';
  const eventLabel = ctx.event === 'SUCCESS' ? '签到成功' : ctx.event === 'FAILED' ? '签到失败' : '触发验证码';
  const sourceLabel = ctx.source === NotificationSource.AUTO ? '定时' : '手动';

  let text = `${icon} ${eventLabel}\n`;
  text += `账号：${ctx.accountName} (${ctx.platform})\n`;
  text += `任务：${ctx.taskType}\n`;
  text += `来源：${sourceLabel}\n`;

  if (ctx.reward) {
    text += `奖励：${ctx.reward}\n`;
  }

  if (ctx.message) {
    text += `详情：${ctx.message}`;
  }

  return text.trim();
}

export interface TaskResultSummary {
  taskType: string;
  status: string;
  message: string;
  reward?: string;
}

/**
 * 汇总通知消息（一个账号所有任务执行完毕后）
 */
export function formatSummaryMessage(
  accountName: string,
  platform: string,
  source: NotificationSource,
  results: TaskResultSummary[]
): { event: NotificationEvent; message: string } {
  const sourceLabel = source === NotificationSource.AUTO ? '定时' : '手动';
  const success = results.filter((r) => r.status === 'SUCCESS').length;
  const failed = results.filter((r) => r.status === 'FAILED').length;
  const captcha = results.filter((r) => r.status === 'CAPTCHA').length;
  const skipped = results.filter((r) => r.status === 'SKIPPED').length;

  // 整体状态：有失败或验证码则为失败，否则成功
  const hasFailure = failed > 0 || captcha > 0;
  const event: NotificationEvent = hasFailure ? 'FAILED' : 'SUCCESS';
  const icon = hasFailure ? '❌' : '✅';
  const label = hasFailure ? '签到完成（有失败）' : '签到成功';

  // 当前时间
  const now = new Date();
  const time = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

  // 头部
  let text = `${icon} ${label} [${sourceLabel}]（${time}）\n`;
  text += `账号：${accountName} (${platform})\n`;

  // 结果统计
  const parts: string[] = [];
  if (success > 0) parts.push(`成功 ${success} 个`);
  if (failed > 0) parts.push(`失败 ${failed} 个`);
  if (captcha > 0) parts.push(`验证码 ${captcha} 个`);
  if (skipped > 0) parts.push(`跳过 ${skipped} 个`);
  text += `结果：${parts.join('，')}\n`;

  // 分隔线 + 每个任务详情
  text += `-----------------------------------\n`;
  results.forEach((r) => {
    const name = taskTypeNames[r.taskType] || r.taskType;
    // 去掉 [手动]/[自动] 前缀
    const rawMessage = (r.message || '').replace(/^\[(手动|自动)\]\s*/, '');
    let icon: string;
    let detail: string;
    if (r.reward) {
      icon = '🎁';
      detail = r.reward;
    } else if (r.status === 'FAILED') {
      icon = '❌';
      detail = rawMessage || '执行失败';
    } else if (r.status === 'SKIPPED') {
      icon = '⏭';
      detail = rawMessage || '已跳过';
    } else {
      icon = '✅';
      detail = '成功';
    }
    text += `${name}：${icon} ${detail}\n`;
  });

  return { event, message: text.trim() };
}
