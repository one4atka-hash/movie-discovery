import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { z } from 'zod';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, type AuthedUser } from '../auth/current-user.decorator';
import { ZodBodyPipe } from '../common/zod-body.pipe';
import { PushSubIdParamSchema, PushSubscribeSchema } from './push.schemas';
import { PushSubscriptionsService } from './push-subscriptions.service';

@UseGuards(JwtAuthGuard)
@Controller('push')
export class PushSubscriptionsController {
  constructor(private readonly push: PushSubscriptionsService) {}

  @Get('subscriptions')
  async list(@CurrentUser() u: AuthedUser) {
    const items = await this.push.list(u.id);
    return { items };
  }

  @Post('subscribe')
  async subscribe(
    @CurrentUser() u: AuthedUser,
    @Body(new ZodBodyPipe(PushSubscribeSchema))
    body: z.infer<typeof PushSubscribeSchema>,
  ) {
    const out = await this.push.subscribe(u.id, body);
    return { ok: true, id: out.id };
  }

  @Delete('subscriptions/:id')
  async remove(
    @CurrentUser() u: AuthedUser,
    @Param(new ZodBodyPipe(PushSubIdParamSchema))
    p: z.infer<typeof PushSubIdParamSchema>,
  ) {
    await this.push.remove(u.id, p.id);
    return { ok: true };
  }
}
