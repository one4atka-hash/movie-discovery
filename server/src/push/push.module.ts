import { Module } from '@nestjs/common';

import { PushDeliveryService } from './push-delivery.service';
import { PushDevController } from './push-dev.controller';
import { PushPublicController } from './push-public.controller';
import { PushSubscriptionsController } from './push-subscriptions.controller';
import { PushSubscriptionsService } from './push-subscriptions.service';

@Module({
  controllers: [
    PushPublicController,
    PushSubscriptionsController,
    PushDevController,
  ],
  providers: [PushSubscriptionsService, PushDeliveryService],
  exports: [PushSubscriptionsService, PushDeliveryService],
})
export class PushModule {}
