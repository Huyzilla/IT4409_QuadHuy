import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import nodemailer from 'nodemailer';
import Handlebars from 'handlebars';
import { VERIFY_EMAIL_TEMPLATE } from './templates/verify-email.hbs';

@Injectable()
export class MailService implements OnModuleInit {
  private readonly logger = new Logger(MailService.name);
  private verifyEmailTemplate?: HandlebarsTemplateDelegate;

  onModuleInit() {
    const resendEnabled = Boolean((process.env.RESEND_API_KEY || '').trim());
    const smtpEnabled = Boolean(
      process.env.SMTP_HOST &&
        process.env.SMTP_PORT &&
        process.env.SMTP_USER &&
        process.env.SMTP_PASS,
    );
    const from = (process.env.MAIL_FROM || '').trim() || 'no-reply@traffic.local';
    const nodeEnv = (process.env.NODE_ENV || '').trim() || 'unknown';

    // Don't log secrets. Only log booleans + from.
    this.logger.log(
      `Mail config: env=${nodeEnv} resend=${resendEnabled} smtp=${smtpEnabled} from=${from}`,
    );
  }

  private getAppName(): string {
    return process.env.APP_NAME || 'Traffic Monitor';
  }

  private renderVerifyEmailHtml(input: {
    code: string;
    recipient?: string;
    ttlMinutes: number;
    verifyLink?: string;
    randomId?: string;
  }): string {
    if (!this.verifyEmailTemplate) {
      this.verifyEmailTemplate = Handlebars.compile(VERIFY_EMAIL_TEMPLATE, {
        noEscape: true,
      });
    }
    return this.verifyEmailTemplate({
      appName: this.getAppName(),
      code: input.code,
      recipient: input.recipient,
      ttlMinutes: input.ttlMinutes,
      verifyLink: input.verifyLink,
      randomId: input.randomId,
    });
  }

  async sendEmailVerificationCode(
    toEmail: string,
    code: string,
    verifyLink?: string,
  ): Promise<void> {
    // Prefer Resend (HTTP API) in hosted environments (Render frequently blocks outbound SMTP).
    const resendApiKey = (process.env.RESEND_API_KEY || '').trim();

    const host = process.env.SMTP_HOST;
    const port = process.env.SMTP_PORT
      ? Number(process.env.SMTP_PORT)
      : undefined;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const from = process.env.MAIL_FROM || 'no-reply@traffic.local';

    const isProd = (process.env.NODE_ENV || '').toLowerCase() === 'production';
    const hasSmtp = Boolean(host && port && user && pass);
    const hasResend = Boolean(resendApiKey);

    // Dev-friendly fallback: if SMTP isn't configured, log the URL so the flow can still be tested.
    if (!hasSmtp && !hasResend) {
      if (isProd) {
        this.logger.warn(
          `No email provider configured (set RESEND_API_KEY or SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASS). Unable to send verification email to ${toEmail}.`,
        );
      } else {
        this.logger.warn(
          `No email provider configured (set RESEND_API_KEY or SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASS). Verification code for ${toEmail}: ${code}`,
        );
      }
      return;
    }

    if (!hasSmtp && hasResend) {
      this.logger.log(
        `SMTP not configured; sending verification email via Resend. to=${toEmail}`,
      );
    }

    const secure =
      (process.env.SMTP_SECURE ?? '').toLowerCase() === 'true' || port === 465;

    // Google App Passwords are often shown with spaces. Normalize to be safe.
    const normalizedPass = String(pass || '').replace(/\s+/g, '');

    const randomId = require('crypto').randomUUID();
    const html = this.renderVerifyEmailHtml({
      code,
      ttlMinutes: 10,
      verifyLink,
      randomId,
    });
    const subject = 'Traffic Monitor - Email verification code';
    const text = `${this.getAppName()} email verification code: ${code}\n\nThis code expires soon. If you didn't request this, you can ignore this email.`;

    if (hasResend) {
      await this.sendViaResend({
        apiKey: resendApiKey,
        from,
        to: toEmail,
        subject,
        html,
        text,
      });
      return;
    }

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass: normalizedPass },
      connectionTimeout: 15_000,
      greetingTimeout: 15_000,
    });

    try {
      const info = await transporter.sendMail({
        from,
        to: toEmail,
        subject,
        text,
        html,
      });

      const response = (info as any)?.response
        ? String((info as any).response)
        : '';
      const messageId = (info as any)?.messageId
        ? String((info as any).messageId)
        : '';
      this.logger.log(
        `Verification email accepted by SMTP. to=${toEmail} messageId=${messageId} response=${response}`,
      );
    } catch (err: any) {
      this.logger.error(
        `Failed to send verification email to ${toEmail}. ${err?.message || err}`,
        err?.stack,
      );
      throw err;
    }
  }

  private async sendViaResend(input: {
    apiKey: string;
    from: string;
    to: string;
    subject: string;
    html: string;
    text: string;
  }): Promise<void> {
    // Node 18+ has global fetch; Render uses modern Node, so no extra dependency needed.
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${input.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: input.from,
        to: [input.to],
        subject: input.subject,
        html: input.html,
        text: input.text,
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      this.logger.error(
        `Resend rejected email. status=${res.status} body=${body}`,
      );
      throw new Error(`Resend sendMail failed: HTTP ${res.status}`);
    }

    const json: any = await res.json().catch(() => null);
    const id = json?.id ? String(json.id) : '';
    this.logger.log(`Verification email accepted by Resend. to=${input.to} id=${id}`);
  }
}
