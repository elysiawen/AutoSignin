import { NotifyProvider, NotifyContext, formatNotifyMessage } from './types';

export class OneBotProvider implements NotifyProvider {
  async send(target: Record<string, any>, ctx: NotifyContext): Promise<void> {
    const apiUrl = target.apiUrl;
    const targetType = target.targetType; // 'private' | 'group'
    const targetId = target.targetId;
    const accessToken = target.accessToken;

    if (!apiUrl || !targetType || !targetId) {
      throw new Error('OneBot: apiUrl, targetType, and targetId are required');
    }

    const text = formatNotifyMessage(ctx);
    const endpoint = targetType === 'group' ? 'send_group_msg' : 'send_private_msg';
    const url = `${apiUrl.replace(/\/$/, '')}/${endpoint}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }

    const body: Record<string, any> = {
      message: text,
    };
    if (targetType === 'group') {
      body.group_id = Number(targetId);
    } else {
      body.user_id = Number(targetId);
    }

    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const resBody = await res.text();
      throw new Error(`OneBot API error ${res.status}: ${resBody}`);
    }
  }
}
