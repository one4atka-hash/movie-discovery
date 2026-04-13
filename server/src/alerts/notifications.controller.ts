import { Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { z } from 'zod';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, type AuthedUser } from '../auth/current-user.decorator';
import { ZodBodyPipe } from '../common/zod-body.pipe';
import { IdParamSchema, PaginationSchema } from './alerts.schemas';
import { NotificationsService } from './notifications.service';

@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly svc: NotificationsService) {}

  @Get()
  async list(
    @CurrentUser() u: AuthedUser,
    @Query(new ZodBodyPipe(PaginationSchema))
    q: z.infer<typeof PaginationSchema>,
  ) {
    const items = await this.svc.list(u.id, q.limit);
    return { items };
  }

  @Post(':id/read')
  async markRead(
    @CurrentUser() u: AuthedUser,
    @Param(new ZodBodyPipe(IdParamSchema)) p: z.infer<typeof IdParamSchema>,
  ) {
    await this.svc.markRead(u.id, p.id);
    return { ok: true };
  }
}
