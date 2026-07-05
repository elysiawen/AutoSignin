import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { TelegramProvider } from '@/services/notification/telegram';
import { DiscordProvider } from '@/services/notification/discord';
import { OneBotProvider } from '@/services/notification/onebot';
import { FeishuProvider } from '@/services/notification/feishu';
import { DingTalkProvider } from '@/services/notification/dingtalk';
import { EmailProvider } from '@/services/notification/email';
import { NotifyContext } from '@/services/notification/types';
import { NotificationSource } from '@/generated/prisma/enums';

const providers: Record<string, { send: (target: Record<string, any>, ctx: NotifyContext) => Promise<void> }> = {
  TELEGRAM: new TelegramProvider(),
  DISCORD: new DiscordProvider(),
  ONEBOT: new OneBotProvider(),
  FEISHU: new FeishuProvider(),
  DINGTALK: new DingTalkProvider(),
  EMAIL: new EmailProvider(),
};

const TEST_CTX: NotifyContext = {
  userId: '',
  accountName: '测试账号',
  platform: 'TEST',
  taskType: 'GENSHIN_CN',
  event: 'SUCCESS',
  message: '这是一条测试通知，如果你看到了这条消息，说明通知配置正确！',
  reward: '原石 x60',
  source: NotificationSource.MANUAL,
};

/**
 * POST /api/notifications/test
 * 发送测试通知
 * Body: { channelId, target }
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const body = await request.json();
    const { channelId, target } = body;

    if (!channelId || !target) {
      return NextResponse.json({ error: '渠道和目标不能为空' }, { status: 400 });
    }

    const channel = await prisma.notificationChannel.findFirst({
      where: { id: channelId, enabled: true },
    });
    if (!channel) {
      return NextResponse.json({ error: '通知渠道不存在或已禁用' }, { status: 404 });
    }

    const provider = providers[channel.provider];
    if (!provider) {
      return NextResponse.json({ error: '不支持的渠道类型' }, { status: 400 });
    }

    // 合并渠道配置和用户目标
    const mergedTarget = {
      ...(channel.config as Record<string, any>),
      ...target,
    };

    await provider.send(mergedTarget, TEST_CTX);

    return NextResponse.json({ message: '测试消息发送成功' });
  } catch (error: any) {
    console.error('Send test notification error:', error);
    return NextResponse.json({ error: error.message || '测试发送失败' }, { status: 500 });
  }
}
