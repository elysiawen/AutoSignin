import { NotifyProvider, NotifyContext, formatNotifyMessage } from './types';

export class TelegramProvider implements NotifyProvider {
  async send(target: Record<string, any>, ctx: NotifyContext): Promise<void> {
    const botToken = target.botToken;
    const chatId = target.chatId;

    if (!botToken || !chatId) {
      throw new Error('Telegram: botToken and chatId are required');
    }

    const text = formatNotifyMessage(ctx);
    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Telegram API error ${res.status}: ${body}`);
    }
  }
}
