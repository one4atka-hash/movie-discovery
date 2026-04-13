import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { z } from 'zod';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, type AuthedUser } from '../auth/current-user.decorator';
import { ZodBodyPipe } from '../common/zod-body.pipe';
import { RecommendationsService } from './recommendations.service';
import { RecommendFeedbackSchema } from './recommendations.schemas';

@UseGuards(JwtAuthGuard)
@Controller('recommendations')
export class RecommendationsController {
  constructor(private readonly recs: RecommendationsService) {}

  @Get()
  async get(@CurrentUser() u: AuthedUser) {
    return await this.recs.recommendForUser(u.id);
  }

  @Post('feedback')
  async feedback(
    @CurrentUser() u: AuthedUser,
    @Body(new ZodBodyPipe(RecommendFeedbackSchema))
    body: z.infer<typeof RecommendFeedbackSchema>,
  ) {
    await this.recs.applyFeedback(u.id, body);
    return { ok: true };
  }
}
