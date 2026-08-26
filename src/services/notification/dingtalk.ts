import crypto from 'crypto';
import { NotifyProvider, NotifyContext, formatNotifyMessage } from './types';

function computeDingTalkSign(secret: string): { timestamp: string; sign: string } {
  const timestamp = Date.now().toString();
  const stringToSign = `${timestamp}\n${secret}`;
  const hmac = crypto.createHmac('sha256', Buffer.from(secret, 'utf-8'));
  hmac.update(Buffer.from(stringToSign, 'utf-8'));
  const signData = hmac.digest('base64');
  const sign = encodeURIComponent(signData);
  return { timestamp, sign };
}

function buildWebhookUrl(webhookUrl: string, secret?: string): string {
  if (!secret) return webhookUrl;
  const { timestamp, sign } = computeDingTalkSign(secret);
  const separator = webhookUrl.includes('?') ? '&' : '?';
  return `${webhookUrl}${separator}timestamp=${timestamp}&sign=${sign}`;
}

export class DingTalkProvider implements NotifyProvider {
  async send(target: Record<string, any>, ctx: NotifyContext): Promise<void> {
    const webhookUrl = target.webhookUrl;
    const secret: string | undefined = target.secret;

    if (!webhookUrl) {
      throw new Error('DingTalk: webhookUrl is required');
    }

    const finalUrl = buildWebhookUrl(webhookUrl, secret);
    const text = formatNotifyMessage(ctx);

    const res = await fetch(finalUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        msgtype: 'text',
        text: { content: text },
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`DingTalk webhook error ${res.status}: ${body}`);
    }
  }
}
