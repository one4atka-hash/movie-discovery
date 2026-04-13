import { Module } from '@nestjs/common';

import { StreamingModule } from '../streaming/streaming.module';
import { AvailabilityCronService } from './availability-cron.service';
import { AvailabilityController } from './availability.controller';
import { AvailabilityService } from './availability.service';

@Module({
  imports: [StreamingModule],
  controllers: [AvailabilityController],
  providers: [AvailabilityService, AvailabilityCronService],
})
export class AvailabilityModule {}
