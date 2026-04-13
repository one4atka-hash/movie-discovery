import { Body, Controller, Get, HttpCode, Param, Post } from '@nestjs/common';
import { z } from 'zod';

import { ZodBodyPipe } from '../common/zod-body.pipe';
import {
  PublicTokenParamSchema,
  PublicVoteBodySchema,
} from './decision.schemas';
import { DecisionService } from './decision.service';

/** Anonymous group voting via share link (rate-limited globally by ThrottlerGuard). */
@Controller('public/decision-sessions')
export class PublicDecisionController {
  constructor(private readonly svc: DecisionService) {}

  @Get(':token/results')
  async results(
    @Param(new ZodBodyPipe(PublicTokenParamSchema))
    p: z.infer<typeof PublicTokenParamSchema>,
  ) {
    return await this.svc.getPublicResults(p.token);
  }

  @Post(':token/vote')
  @HttpCode(201)
  async vote(
    @Param(new ZodBodyPipe(PublicTokenParamSchema))
    p: z.infer<typeof PublicTokenParamSchema>,
    @Body(new ZodBodyPipe(PublicVoteBodySchema))
    body: z.infer<typeof PublicVoteBodySchema>,
  ) {
    await this.svc.votePublic(p.token, body.voterKey, body.tmdbId);
    return { ok: true };
  }

  @Get(':token')
  async get(
    @Param(new ZodBodyPipe(PublicTokenParamSchema))
    p: z.infer<typeof PublicTokenParamSchema>,
  ) {
    return await this.svc.getPublicSession(p.token);
  }
}
