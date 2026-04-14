import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { z } from 'zod';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, type AuthedUser } from '../auth/current-user.decorator';
import { ZodBodyPipe } from '../common/zod-body.pipe';
import { AlertRulesService } from './alert-rules.service';
import { NotificationsService } from './notifications.service';
import { buildIcsCalendar } from './ics.util';
import {
  IdParamSchema,
  PaginationSchema,
  UpsertAlertRuleSchema,
} from './alerts.schemas';

@UseGuards(JwtAuthGuard)
@Controller('alert-rules')
export class AlertRulesController {
  constructor(
    private readonly rules: AlertRulesService,
    private readonly notifications: NotificationsService,
  ) {}

  @Get()
  async list(@CurrentUser() u: AuthedUser) {
    return await this.rules.list(u.id);
  }

  @Post()
  async upsert(
    @CurrentUser() u: AuthedUser,
    @Body(new ZodBodyPipe(UpsertAlertRuleSchema))
    body: z.infer<typeof UpsertAlertRuleSchema>,
  ) {
    const out = await this.rules.upsert(u.id, {
      id: body.id,
      name: body.name,
      enabled: body.enabled ?? true,
      filters: body.filters ?? {},
      channels: body.channels,
      quietHours: body.quietHours ?? null,
    });
    return { ok: true, id: out.id };
  }

  @Delete(':id')
  async remove(
    @CurrentUser() u: AuthedUser,
    @Param(new ZodBodyPipe(IdParamSchema)) p: z.infer<typeof IdParamSchema>,
  ) {
    await this.rules.remove(u.id, p.id);
    return { ok: true };
  }

  @Get(':id/calendar.ics')
  @Header('Content-Type', 'text/calendar; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="alert-rule.ics"')
  async calendarIcs(
    @CurrentUser() u: AuthedUser,
    @Param(new ZodBodyPipe(IdParamSchema)) p: z.infer<typeof IdParamSchema>,
    @Query(new ZodBodyPipe(PaginationSchema))
    q: z.infer<typeof PaginationSchema>,
  ) {
    const rule = await this.rules.get(u.id, p.id);
    if (!rule) {
      // Avoid leaking ids across users
      return buildIcsCalendar({
        prodId: '-//movie-discovery//alerts//EN',
        name: 'Alert rule',
        events: [],
      });
    }

    const items = await this.notifications.listByRule(u.id, rule.id, q.limit);
    return buildIcsCalendar({
      prodId: '-//movie-discovery//alerts//EN',
      name: `Alert rule · ${rule.name}`,
      events: items.map((n) => ({
        uid: n.id,
        dtstamp: new Date(n.createdAt),
        dtstart: new Date(n.createdAt),
        summary: n.title,
        description: n.body ?? null,
      })),
    });
  }
}
