import { NotifyProvider, NotifyContext, formatNotifyMessage } from './types';

export class DiscordProvider implements NotifyProvider {
  async send(target: Record<string, any>, ctx: NotifyContext): Promise<void> {
    const webhookUrl = target.webhookUrl;

    if (!webhookUrl) {
      throw new Error('Discord: webhookUrl is required');
    }

    const text = formatNotifyMessage(ctx);

    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: text }),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Discord webhook error ${res.status}: ${body}`);
    }
  }
}
