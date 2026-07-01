import { NotificationEvent, NotificationSource } from '@/generated/prisma/enums';

export interface NotifyContext {
  userId: string;
  accountName: string;
  platform: string;
  taskType: string;
  event: NotificationEvent;
  message: string;
  reward?: string;
  source: NotificationSource;
}

export interface NotifyProvider {
  send(target: Record<string, any>, ctx: NotifyContext): Promise<void>;
}

/**
 * 单任务通知消息
 */
export function formatNotifyMessage(ctx: NotifyContext): string {
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
  const label = hasFailure ? '签到完成（有失败）' : '签到全部成功';

  let text = `${icon} ${label}\n`;
  text += `账号：${accountName} (${platform})\n`;
  text += `来源：${sourceLabel}\n`;

  const parts: string[] = [];
  if (success > 0) parts.push(`成功 ${success} 个`);
  if (failed > 0) parts.push(`失败 ${failed} 个`);
  if (captcha > 0) parts.push(`验证码 ${captcha} 个`);
  if (skipped > 0) parts.push(`跳过 ${skipped} 个`);
  text += `结果：${parts.join('，')}\n`;

  // 列出失败的任务详情
  const failures = results.filter((r) => r.status === 'FAILED' || r.status === 'CAPTCHA');
  if (failures.length > 0) {
    text += `\n失败详情：`;
    failures.forEach((r) => {
      text += `\n· ${r.taskType}：${r.message}`;
    });
  }

  // 列出获得的奖励
  const rewards = results.filter((r) => r.reward).map((r) => r.reward);
  if (rewards.length > 0) {
    text += `\n奖励：${rewards.join('，')}`;
  }

  return { event, message: text.trim() };
}
