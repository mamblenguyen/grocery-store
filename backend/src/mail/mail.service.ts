import { Global, Injectable, Logger, Module } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

/** Gửi email qua SMTP (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, MAIL_FROM). Chưa cấu hình → ghi ra log. */
@Injectable()
export class MailService {
  private readonly log = new Logger('Mail');
  private transporter = process.env.SMTP_HOST
    ? nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT) || 587,
        secure: Number(process.env.SMTP_PORT) === 465,
        auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
      })
    : null;

  get configured() {
    return !!this.transporter;
  }

  async send(to: string, subject: string, html: string) {
    if (!this.transporter) {
      this.log.warn(`[CHƯA CẤU HÌNH SMTP] Email tới ${to} – ${subject}\n${html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')}`);
      return false;
    }
    try {
      await this.transporter.sendMail({ from: process.env.MAIL_FROM || process.env.SMTP_USER, to, subject, html });
      return true;
    } catch (e) {
      this.log.error(`Gửi email thất bại: ${(e as Error).message}`);
      return false;
    }
  }
}

@Global()
@Module({ providers: [MailService], exports: [MailService] })
export class MailModule {}
