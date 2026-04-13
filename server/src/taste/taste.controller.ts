import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { z } from 'zod';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, type AuthedUser } from '../auth/current-user.decorator';
import { ZodBodyPipe } from '../common/zod-body.pipe';
import { SimilarToQuerySchema } from './taste.schemas';
import { TasteService } from './taste.service';

@UseGuards(JwtAuthGuard)
@Controller('auto-collections')
export class AutoCollectionsController {
  constructor(private readonly taste: TasteService) {}

  @Get()
  async list(@CurrentUser() u: AuthedUser) {
    return await this.taste.getAutoCollections(u.id);
  }
}

@UseGuards(JwtAuthGuard)
@Controller('taste')
export class TasteController {
  constructor(private readonly taste: TasteService) {}

  @Get('summary')
  async summary(@CurrentUser() u: AuthedUser) {
    return await this.taste.getTasteSummary(u.id);
  }

  @Get('similar-to')
  async similarTo(
    @CurrentUser() u: AuthedUser,
    @Query(new ZodBodyPipe(SimilarToQuerySchema))
    q: z.infer<typeof SimilarToQuerySchema>,
  ) {
    return await this.taste.getSimilarTo(u.id, q.tmdbId);
  }
}
