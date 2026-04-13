import { Module } from '@nestjs/common';

import { PushModule } from '../push/push.module';

import { AlertRulesController } from './alert-rules.controller';
import { AlertRulesService } from './alert-rules.service';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { AlertsDevController } from './alerts-dev.controller';

@Module({
  imports: [PushModule],
  controllers: [
    AlertRulesController,
    NotificationsController,
    AlertsDevController,
  ],
  providers: [AlertRulesService, NotificationsService],
  exports: [AlertRulesService, NotificationsService],
})
export class AlertsModule {}
