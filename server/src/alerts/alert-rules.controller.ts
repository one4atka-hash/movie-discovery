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
import { AlertRulesService } from './alert-rules.service';
import { IdParamSchema, UpsertAlertRuleSchema } from './alerts.schemas';

@UseGuards(JwtAuthGuard)
@Controller('alert-rules')
export class AlertRulesController {
  constructor(private readonly rules: AlertRulesService) {}

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
}
