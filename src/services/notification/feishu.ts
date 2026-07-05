import { NotifyProvider, NotifyContext, formatNotifyMessage } from './types';

export class FeishuProvider implements NotifyProvider {
  async send(target: Record<string, any>, ctx: NotifyContext): Promise<void> {
    const webhookUrl = target.webhookUrl;

    if (!webhookUrl) {
      throw new Error('Feishu: webhookUrl is required');
    }

    const text = formatNotifyMessage(ctx);

    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        msg_type: 'text',
        content: { text },
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Feishu webhook error ${res.status}: ${body}`);
    }
  }
}
