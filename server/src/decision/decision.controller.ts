import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { z } from 'zod';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, type AuthedUser } from '../auth/current-user.decorator';
import { ZodBodyPipe } from '../common/zod-body.pipe';
import {
  CreateDecisionSessionSchema,
  DecisionSessionIdParamSchema,
  PickDecisionSchema,
} from './decision.schemas';
import { DecisionService } from './decision.service';

@UseGuards(JwtAuthGuard)
@Controller('decision-sessions')
export class DecisionController {
  constructor(private readonly svc: DecisionService) {}

  @Post()
  async create(
    @CurrentUser() u: AuthedUser,
    @Body(new ZodBodyPipe(CreateDecisionSessionSchema))
    body: z.infer<typeof CreateDecisionSessionSchema>,
  ) {
    return await this.svc.createSession(u.id, {
      mode: body.mode ?? 'top5',
      constraints: body.constraints ?? {},
    });
  }

  @Get(':id')
  async get(
    @CurrentUser() u: AuthedUser,
    @Param(new ZodBodyPipe(DecisionSessionIdParamSchema))
    p: z.infer<typeof DecisionSessionIdParamSchema>,
  ) {
    return await this.svc.getSession(u.id, p.id);
  }

  @Post(':id/pick')
  async pick(
    @CurrentUser() u: AuthedUser,
    @Param(new ZodBodyPipe(DecisionSessionIdParamSchema))
    p: z.infer<typeof DecisionSessionIdParamSchema>,
    @Body(new ZodBodyPipe(PickDecisionSchema))
    body: z.infer<typeof PickDecisionSchema>,
  ) {
    await this.svc.pick(u.id, p.id, body.tmdbId);
    return { ok: true };
  }
}
