import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { z } from 'zod';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, type AuthedUser } from '../auth/current-user.decorator';
import { ZodBodyPipe } from '../common/zod-body.pipe';
import { truthy } from '../config/env.schema';
import { ReleaseRemindersCronService } from './release-reminders-cron.service';
import {
  CreateReleaseReminderSchema,
  DevTickSchema,
  ReleaseReminderIdParamSchema,
} from './release-reminders.schemas';
import { ReleaseRemindersService } from './release-reminders.service';

@UseGuards(JwtAuthGuard)
@Controller('release-reminders')
export class ReleaseRemindersController {
  constructor(
    private readonly svc: ReleaseRemindersService,
    private readonly cron: ReleaseRemindersCronService,
    private readonly config: ConfigService,
  ) {}

  @Get()
  async list(@CurrentUser() u: AuthedUser) {
    const items = await this.svc.list(u.id);
    return { items };
  }

  /** Dev/test: run one cron evaluation (optional fixed “today”). */
  @Post('dev/tick')
  @HttpCode(200)
  async devTick(
    @CurrentUser() _u: AuthedUser,
    @Body(new ZodBodyPipe(DevTickSchema)) body: z.infer<typeof DevTickSchema>,
  ) {
    if (!truthy(this.config.get<string>('DEV_ALERTS_ENABLED'))) {
      return { ok: false as const, error: 'Disabled' };
    }
    let now: Date | undefined;
    if (body.nowIso != null && body.nowIso !== '') {
      const d = new Date(body.nowIso);
      if (Number.isNaN(d.getTime())) {
        throw new BadRequestException('Invalid nowIso');
      }
      now = d;
    }
    const r = await this.cron.tick(body.todayYmd, now);
    return { ok: true as const, ...r };
  }

  @Post()
  @HttpCode(201)
  async create(
    @CurrentUser() u: AuthedUser,
    @Body(new ZodBodyPipe(CreateReleaseReminderSchema))
    body: z.infer<typeof CreateReleaseReminderSchema>,
  ) {
    const reminder = await this.svc.create(u.id, body);
    return { ok: true, reminder };
  }

  @Delete(':id')
  async remove(
    @CurrentUser() u: AuthedUser,
    @Param(new ZodBodyPipe(ReleaseReminderIdParamSchema))
    p: z.infer<typeof ReleaseReminderIdParamSchema>,
  ) {
    await this.svc.remove(u.id, p.id);
    return { ok: true };
  }
}
