import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { z } from 'zod';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, type AuthedUser } from '../auth/current-user.decorator';
import { FeedbackService } from './feedback.service';
import { ZodBodyPipe } from '../common/zod-body.pipe';

const UpsertSchema = z.object({
  tmdbId: z.number().int().positive(),
  value: z.enum(['like', 'dislike', 'hide', 'neutral']),
  reason: z.string().max(280).optional()
});

@UseGuards(JwtAuthGuard)
@Controller('feedback')
export class FeedbackController {
  constructor(private readonly feedback: FeedbackService) {}

  @Get()
  async list(@CurrentUser() u: AuthedUser) {
    return await this.feedback.list(u.id);
  }

  @Post()
  async upsert(
    @CurrentUser() u: AuthedUser,
    @Body(new ZodBodyPipe(UpsertSchema)) body: z.infer<typeof UpsertSchema>
  ) {
    await this.feedback.upsert(u.id, body);
    return { ok: true };
  }
}

