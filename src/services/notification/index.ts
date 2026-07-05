import prisma from '@/lib/prisma';
import { createLogger } from '@/lib/logger';
import { NotificationEvent, NotificationSource } from '@/generated/prisma/enums';
import { NotifyContext, NotifyProvider, formatSummaryMessage, type TaskResultSummary } from './types';
import { TelegramProvider } from './telegram';
import { DiscordProvider } from './discord';
import { OneBotProvider } from './onebot';
import { FeishuProvider } from './feishu';
import { DingTalkProvider } from './dingtalk';
import { EmailProvider } from './email';

const log = createLogger('通知服务');

const providers: Record<string, NotifyProvider> = {
  TELEGRAM: new TelegramProvider(),
  DISCORD: new DiscordProvider(),
  ONEBOT: new OneBotProvider(),
  FEISHU: new FeishuProvider(),
  DINGTALK: new DingTalkProvider(),
  EMAIL: new EmailProvider(),
};

/**
 * 向用户的所有匹配绑定发送通知
 *
 * 用法：
 *   await sendNotification({ userId, accountName, platform, taskType, event: 'FAILED', message, source: 'auto' })
 */
export async function sendNotification(ctx: NotifyContext): Promise<void> {
  try {
    // 查找该用户启用了且匹配事件的绑定
    const bindings = await prisma.notificationBinding.findMany({
      where: {
        userId: ctx.userId,
        enabled: true,
        channel: { enabled: true },
      },
      include: { channel: true },
    });

    if (bindings.length === 0) return;

    const matchingBindings = bindings.filter((b) => {
      const events = b.events as NotificationEvent[];
      const sources = b.sources as NotificationSource[];
      return events.includes(ctx.event) && sources.includes(ctx.source);
    });

    if (matchingBindings.length === 0) return;

    log.info(`推送通知: ${ctx.accountName} ${ctx.event} → ${matchingBindings.length} 个渠道`);

    // 并发发送到所有匹配的渠道
    const results = await Promise.allSettled(
      matchingBindings.map(async (binding) => {
        const provider = providers[binding.channel.provider];
        if (!provider) {
          log.warn(`未知的通知 provider: ${binding.channel.provider}`);
          return;
        }

        // 合并渠道配置和用户目标配置
        const target = {
          ...(binding.channel.config as Record<string, any>),
          ...(binding.target as Record<string, any>),
        };

        await provider.send(target, ctx);
        log.info(`通知发送成功: ${binding.channel.provider} → ${binding.channel.name}`);
      })
    );

    // 记录失败的发送
    results.forEach((result, i) => {
      if (result.status === 'rejected') {
        log.error(`通知发送失败: ${matchingBindings[i].channel.provider}`, {
          error: result.reason?.message || result.reason,
        });
      }
    });
  } catch (error: any) {
    log.error('通知服务异常', { error: error.message });
  }
}

export type { NotifyContext } from './types';
export { formatSummaryMessage, type TaskResultSummary } from './types';
