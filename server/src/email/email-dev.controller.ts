import { Controller, Post, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, type AuthedUser } from '../auth/current-user.decorator';
import { truthy } from '../config/env.schema';
import { EmailSmtpService } from './email-smtp.service';

@UseGuards(JwtAuthGuard)
@Controller('email')
export class EmailDevController {
  constructor(
    private readonly smtp: EmailSmtpService,
    private readonly config: ConfigService,
  ) {}

  /** Dev-only: send a plain-text test message to the JWT user email. */
  @Post('dev/send-test')
  async sendTest(@CurrentUser() u: AuthedUser) {
    if (!truthy(this.config.get<string>('DEV_EMAIL_SEND_ENABLED'))) {
      return { ok: false, error: 'Disabled' };
    }
    if (!this.smtp.isConfigured()) {
      return { ok: false, error: 'SMTP not configured' };
    }
    const to = u.email?.trim();
    if (!to) {
      return { ok: false, error: 'No email on account' };
    }
    await this.smtp.sendMail({
      to,
      subject: 'Movie Discovery — SMTP test',
      text: 'If you receive this, outbound SMTP from the Movie Discovery API is working.',
    });
    return { ok: true };
  }
}
