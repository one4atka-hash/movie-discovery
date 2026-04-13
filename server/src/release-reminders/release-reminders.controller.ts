import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { z } from 'zod';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, type AuthedUser } from '../auth/current-user.decorator';
import { ZodBodyPipe } from '../common/zod-body.pipe';
import {
  CreateReleaseReminderSchema,
  ReleaseReminderIdParamSchema,
} from './release-reminders.schemas';
import { ReleaseRemindersService } from './release-reminders.service';

@UseGuards(JwtAuthGuard)
@Controller('release-reminders')
export class ReleaseRemindersController {
  constructor(private readonly svc: ReleaseRemindersService) {}

  @Get()
  async list(@CurrentUser() u: AuthedUser) {
    const items = await this.svc.list(u.id);
    return { items };
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
