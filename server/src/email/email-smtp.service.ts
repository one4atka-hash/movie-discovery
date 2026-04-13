import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer from 'nodemailer';

import { truthy } from '../config/env.schema';

@Injectable()
export class EmailSmtpService {
  constructor(private readonly config: ConfigService) {}

  /** True when `SMTP_HOST` is non-empty. */
  isConfigured(): boolean {
    const host = this.config.get<string>('SMTP_HOST')?.trim();
    return Boolean(host);
  }

  async sendMail(input: {
    to: string;
    subject: string;
    text: string;
  }): Promise<void> {
    const host = this.config.get<string>('SMTP_HOST')?.trim() ?? '';
    if (!host) {
      throw new Error('SMTP_HOST is not set');
    }
    const port = Number(this.config.get('SMTP_PORT') ?? 587);
    const secure = truthy(this.config.get<string>('SMTP_SECURE'));
    const user = this.config.get<string>('SMTP_USER')?.trim() ?? '';
    const pass = this.config.get<string>('SMTP_PASS') ?? '';
    const from =
      this.config.get<string>('SMTP_FROM')?.trim() ||
      user ||
      'noreply@localhost';

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: user ? { user, pass } : undefined,
    });

    await transporter.sendMail({
      from,
      to: input.to,
      subject: input.subject,
      text: input.text,
    });
  }
}
