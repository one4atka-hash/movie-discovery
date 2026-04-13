import { Module } from '@nestjs/common';

import { AlertsModule } from '../alerts/alerts.module';
import { EmailModule } from '../email/email.module';
import { PushModule } from '../push/push.module';

import { ReleaseRemindersCronService } from './release-reminders-cron.service';
import { ReleaseRemindersController } from './release-reminders.controller';
import { ReleaseRemindersService } from './release-reminders.service';

@Module({
  imports: [AlertsModule, PushModule, EmailModule],
  controllers: [ReleaseRemindersController],
  providers: [ReleaseRemindersService, ReleaseRemindersCronService],
})
export class ReleaseRemindersModule {}
