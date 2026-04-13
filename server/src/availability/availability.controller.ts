import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { z } from 'zod';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, type AuthedUser } from '../auth/current-user.decorator';
import { ZodBodyPipe } from '../common/zod-body.pipe';
import {
  AvailabilityEventsQuerySchema,
  AvailabilityIngestSchema,
  AvailabilityTrackSchema,
} from './availability.schemas';
import { AvailabilityService } from './availability.service';

@UseGuards(JwtAuthGuard)
@Controller('availability')
export class AvailabilityController {
  constructor(private readonly svc: AvailabilityService) {}

  @Get('events')
  async events(
    @CurrentUser() u: AuthedUser,
    @Query(new ZodBodyPipe(AvailabilityEventsQuerySchema))
    q: z.infer<typeof AvailabilityEventsQuerySchema>,
  ) {
    const items = await this.svc.listEvents(u.id, q.since);
    return { items };
  }

  @Post('track')
  async track(
    @CurrentUser() u: AuthedUser,
    @Body(new ZodBodyPipe(AvailabilityTrackSchema))
    body: z.infer<typeof AvailabilityTrackSchema>,
  ) {
    await this.svc.track(u.id, body.tmdbId, body.region);
    return { ok: true };
  }

  /** Worker/cron: push a fresh provider list; diff → per-user events for trackers. */
  @Post('ingest')
  async ingest(
    @Body(new ZodBodyPipe(AvailabilityIngestSchema))
    body: z.infer<typeof AvailabilityIngestSchema>,
  ) {
    const out = await this.svc.ingestSnapshot({
      tmdbId: body.tmdbId,
      region: body.region,
      providers: body.providers,
      fetchedAt: body.fetchedAt,
    });
    return { ok: true, ...out };
  }
}
