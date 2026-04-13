import { Controller, Post, UseGuards } from '@nestjs/common';

import { ConfigService } from '@nestjs/config';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, type AuthedUser } from '../auth/current-user.decorator';
import { NotificationsService } from './notifications.service';
import { truthy } from '../config/env.schema';

@UseGuards(JwtAuthGuard)
@Controller('alerts')
export class AlertsDevController {
  constructor(
    private readonly notifications: NotificationsService,
    private readonly config: ConfigService,
  ) {}

  @Post('run')
  async run(@CurrentUser() u: AuthedUser) {
    // Dev-only: provide a way to generate an inbox item from current user context.
    if (!truthy(this.config.get<string>('DEV_ALERTS_ENABLED'))) {
      return { ok: false, error: 'Disabled' };
    }
    await this.notifications.insertSample(u.id);
    return { ok: true };
  }
}
