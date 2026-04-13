import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { z } from 'zod';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, type AuthedUser } from '../auth/current-user.decorator';
import { truthy } from '../config/env.schema';
import { ZodBodyPipe } from '../common/zod-body.pipe';
import { PushDeliveryService } from './push-delivery.service';
import { PushDevSendSelfSchema } from './push.schemas';

@UseGuards(JwtAuthGuard)
@Controller('push')
export class PushDevController {
  constructor(
    private readonly delivery: PushDeliveryService,
    private readonly config: ConfigService,
  ) {}

  /** Dev-only: send a Web Push to the caller's stored browser subscriptions. */
  @Post('dev/send-self')
  async sendSelf(
    @CurrentUser() u: AuthedUser,
    @Body(new ZodBodyPipe(PushDevSendSelfSchema))
    body: z.infer<typeof PushDevSendSelfSchema>,
  ) {
    if (!truthy(this.config.get<string>('DEV_PUSH_SEND_ENABLED'))) {
      return { ok: false, error: 'Disabled' };
    }
    if (!this.delivery.vapidConfigured()) {
      return { ok: false, error: 'VAPID not configured' };
    }
    const title = body.title?.trim() || 'Movie Discovery';
    const text = body.body ?? 'Test push from server';
    const out = await this.delivery.sendToUser(u.id, title, text);
    return { ok: true, ...out };
  }
}
