import nodemailer from 'nodemailer';
import { createLogger } from './logger';

const log = createLogger('Email');

function createTransporter() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT) || 465;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    log.warn('SMTP not configured — emails will not be sent');
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465, // true for 465 (TLS), false for 587 (STARTTLS)
    auth: { user, pass },
  });
}

// Singleton — created once on first use
let transporter: nodemailer.Transporter | null | undefined;

function getTransporter() {
  if (transporter === undefined) {
    transporter = createTransporter();
  }
  return transporter;
}

export async function sendVerificationEmail(
  email: string,
  code: string
): Promise<void> {
  const t = getTransporter();
  if (!t) {
    log.error('Cannot send email: SMTP transporter not configured');
    throw new Error('邮件服务未配置');
  }

  const from = process.env.SMTP_FROM || process.env.SMTP_USER!;

  await t.sendMail({
    from,
    to: email,
    subject: '【AutoSignin】邮箱验证码',
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
        <h2 style="color: #1a1a1a; margin-bottom: 16px;">邮箱验证码</h2>
        <p style="color: #555; line-height: 1.6;">
          您正在进行账号注册，验证码为：
        </p>
        <div style="background: #f5f5f5; border-radius: 8px; padding: 16px; text-align: center; margin: 24px 0;">
          <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #1a1a1a;">
            ${code}
          </span>
        </div>
        <p style="color: #999; font-size: 13px; line-height: 1.6;">
          验证码 5 分钟内有效。如果这不是您的操作，请忽略此邮件。
        </p>
      </div>
    `,
  });

  log.info(`Verification email sent to ${email}`);
}
