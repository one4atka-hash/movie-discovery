import { Controller, Post, UseGuards } from '@nestjs/common';

import { ConfigService } from '@nestjs/config';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, type AuthedUser } from '../auth/current-user.decorator';
import { PushDeliveryService } from '../push/push-delivery.service';
import { truthy } from '../config/env.schema';
import { AlertRulesService } from './alert-rules.service';
import {
  NotificationsService,
  SAMPLE_ALERT_BODY,
  SAMPLE_ALERT_TITLE,
} from './notifications.service';

@UseGuards(JwtAuthGuard)
@Controller('alerts')
export class AlertsDevController {
  constructor(
    private readonly notifications: NotificationsService,
    private readonly config: ConfigService,
    private readonly rules: AlertRulesService,
    private readonly pushDelivery: PushDeliveryService,
  ) {}

  @Post('run')
  async run(@CurrentUser() u: AuthedUser) {
    // Dev-only: provide a way to generate an inbox item from current user context.
    if (!truthy(this.config.get<string>('DEV_ALERTS_ENABLED'))) {
      return { ok: false, error: 'Disabled' };
    }
    // Tie the sample notification to the most recently updated enabled rule (if any),
    // so the user can test calendar export.
    const enabledRuleId = (await this.rules.list(u.id)).find(
      (r) => r.enabled,
    )?.id;
    await this.notifications.insertSample(u.id, enabledRuleId ?? null);
    if (
      this.pushDelivery.vapidConfigured() &&
      (await this.rules.userHasEnabledWebPush(u.id))
    ) {
      await this.pushDelivery.sendToUser(
        u.id,
        SAMPLE_ALERT_TITLE,
        SAMPLE_ALERT_BODY,
      );
    }
    return { ok: true };
  }
}
