import { Injectable, Logger } from '@nestjs/common';
import nodemailer from 'nodemailer';
import Handlebars from 'handlebars';
import { VERIFY_EMAIL_TEMPLATE } from './templates/verify-email.hbs';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private verifyEmailTemplate?: HandlebarsTemplateDelegate;

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
      this.verifyEmailTemplate = Handlebars.compile(VERIFY_EMAIL_TEMPLATE, { noEscape: true });
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

  async sendEmailVerificationCode(toEmail: string, code: string, verifyLink?: string): Promise<void> {
    const host = process.env.SMTP_HOST;
    const port = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : undefined;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const from = process.env.MAIL_FROM || 'no-reply@traffic.local';

    // Dev-friendly fallback: if SMTP isn't configured, log the URL so the flow can still be tested.
    if (!host || !port || !user || !pass) {
      this.logger.warn(
        `SMTP not configured (SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASS). Verification code for ${toEmail}: ${code}`,
      );
      return;
    }

    const secure = (process.env.SMTP_SECURE ?? '').toLowerCase() === 'true' || port === 465;

    // Google App Passwords are often shown with spaces. Normalize to be safe.
    const normalizedPass = String(pass).replace(/\s+/g, '');

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass: normalizedPass },
      connectionTimeout: 15_000,
      greetingTimeout: 15_000,
    });

    try {

      const randomId = require('crypto').randomUUID();
      const html = this.renderVerifyEmailHtml({
        code,
        ttlMinutes: 10,
        verifyLink,
        randomId,
      });

      const info = await transporter.sendMail({
        from,
        to: toEmail,
        subject: 'Traffic Monitor - Email verification code',
        text: `${this.getAppName()} email verification code: ${code}\n\nThis code expires soon. If you didn't request this, you can ignore this email.`,
        html,
      });

      const response = (info as any)?.response ? String((info as any).response) : '';
      const messageId = (info as any)?.messageId ? String((info as any).messageId) : '';
      this.logger.log(`Verification email accepted by SMTP. to=${toEmail} messageId=${messageId} response=${response}`);
    } catch (err: any) {
      this.logger.error(
        `Failed to send verification email to ${toEmail}. ${err?.message || err}`,
        err?.stack,
      );
      throw err;
    }
  }
}
