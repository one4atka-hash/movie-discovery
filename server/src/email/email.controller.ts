import { Controller, Post, UseGuards } from '@nestjs/common';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, type AuthedUser } from '../auth/current-user.decorator';
import { EmailSmtpService } from './email-smtp.service';

@UseGuards(JwtAuthGuard)
@Controller('email')
export class EmailController {
  constructor(private readonly smtp: EmailSmtpService) {}

  /** User-facing: send a plain-text test message to the signed-in user email. */
  @Post('send-test')
  async sendTest(@CurrentUser() u: AuthedUser) {
    if (!this.smtp.isConfigured()) {
      return { ok: false, error: 'SMTP not configured' };
    }
    const to = u.email?.trim();
    if (!to) {
      return { ok: false, error: 'No email on account' };
    }
    await this.smtp.sendMail({
      to,
      subject: 'Movie Discovery — email test',
      text: 'If you receive this, email notifications can reach your inbox.',
    });
    return { ok: true };
  }
}
