import { Module } from '@nestjs/common';

import { ReleaseRemindersController } from './release-reminders.controller';
import { ReleaseRemindersService } from './release-reminders.service';

@Module({
  controllers: [ReleaseRemindersController],
  providers: [ReleaseRemindersService],
})
export class ReleaseRemindersModule {}
