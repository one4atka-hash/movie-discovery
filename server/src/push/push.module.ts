import { Module } from '@nestjs/common';

import { PushPublicController } from './push-public.controller';
import { PushSubscriptionsController } from './push-subscriptions.controller';
import { PushSubscriptionsService } from './push-subscriptions.service';

@Module({
  controllers: [PushPublicController, PushSubscriptionsController],
  providers: [PushSubscriptionsService],
})
export class PushModule {}
