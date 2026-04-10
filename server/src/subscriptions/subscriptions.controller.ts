import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { z } from 'zod';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, type AuthedUser } from '../auth/current-user.decorator';
import { SubscriptionsService } from './subscriptions.service';
import { ZodBodyPipe } from '../common/zod-body.pipe';

const ChannelsSchema = z
  .object({
    inApp: z.boolean().optional(),
    webPush: z.boolean().optional(),
    email: z.boolean().optional(),
    calendar: z.boolean().optional()
  })
  .strict()
  .transform((c) => ({
    inApp: Boolean(c.inApp),
    webPush: Boolean(c.webPush),
    email: Boolean(c.email),
    calendar: Boolean(c.calendar)
  }));

const UpsertSchema = z.object({
  tmdbId: z.number().int().positive(),
  mediaType: z.literal('movie'),
  releaseDate: z.string().regex(/^\\d{4}-\\d{2}-\\d{2}$/),
  channels: ChannelsSchema
});

const RemoveSchema = z.object({ id: z.string().uuid() });

@UseGuards(JwtAuthGuard)
@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly subs: SubscriptionsService) {}

  @Get()
  async list(@CurrentUser() u: AuthedUser) {
    return await this.subs.list(u.id);
  }

  @Post()
  async upsert(
    @CurrentUser() u: AuthedUser,
    @Body(new ZodBodyPipe(UpsertSchema)) body: z.infer<typeof UpsertSchema>
  ) {
    const sub = await this.subs.upsert(u.id, body);
    return { ok: true, sub };
  }

  @Delete(':id')
  async remove(@CurrentUser() u: AuthedUser, @Param(new ZodBodyPipe(RemoveSchema)) p: z.infer<typeof RemoveSchema>) {
    await this.subs.remove(u.id, p.id);
    return { ok: true };
  }
}

