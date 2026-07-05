import nodemailer from 'nodemailer';
import { createLogger } from '@/lib/logger';
import { NotifyProvider, NotifyContext, formatNotifyMessage } from './types';

const log = createLogger('Email通知');

// SMTP transporter singleton, same as src/lib/email.ts
let transporter: nodemailer.Transporter | null | undefined;

function getTransporter(): nodemailer.Transporter | null {
  if (transporter !== undefined) return transporter;

  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT) || 465;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    log.warn('SMTP not configured — email notifications will not be sent');
    transporter = null;
    return null;
  }

  transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
  return transporter;
}

export class EmailProvider implements NotifyProvider {
  async send(target: Record<string, any>, ctx: NotifyContext): Promise<void> {
    const email = target.email;

    if (!email) {
      throw new Error('Email: email address is required');
    }

    const t = getTransporter();
    if (!t) {
      throw new Error('邮件服务未配置');
    }

    const from = process.env.SMTP_FROM || process.env.SMTP_USER!;
    const text = formatNotifyMessage(ctx);

    let subject: string;
    if (ctx.event === 'SUCCESS') {
      subject = `✅ 签到成功 - ${ctx.accountName} (${ctx.platform})`;
    } else if (ctx.event === 'FAILED') {
      subject = `❌ 签到失败 - ${ctx.accountName} (${ctx.platform})`;
    } else {
      subject = `🧩 触发验证码 - ${ctx.accountName} (${ctx.platform})`;
    }

    const htmlBody = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\n/g, '<br>');

    await t.sendMail({
      from,
      to: email,
      subject: `【AutoSignin】${subject}`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; background: #fafafa; border-radius: 12px;">
          <h3 style="color: #1a1a1a; margin-bottom: 16px;">${subject}</h3>
          <div style="background: #fff; border-radius: 8px; padding: 20px; line-height: 1.8; color: #333; font-size: 14px;">
            ${htmlBody}
          </div>
        </div>
      `,
    });

    log.info(`Notification email sent to ${email}`);
  }
}
