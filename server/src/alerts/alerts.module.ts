import { Module } from '@nestjs/common';

import { AlertRulesController } from './alert-rules.controller';
import { AlertRulesService } from './alert-rules.service';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { AlertsDevController } from './alerts-dev.controller';

@Module({
  controllers: [
    AlertRulesController,
    NotificationsController,
    AlertsDevController,
  ],
  providers: [AlertRulesService, NotificationsService],
})
export class AlertsModule {}
