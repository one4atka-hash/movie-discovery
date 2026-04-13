import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { z } from 'zod';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ZodBodyPipe } from '../common/zod-body.pipe';
import {
  MovieReleasesQuerySchema,
  MoviesTmdbIdParamSchema,
} from './movies.schemas';
import { MoviesService } from './movies.service';

@UseGuards(JwtAuthGuard)
@Controller('movies')
export class MoviesController {
  constructor(private readonly svc: MoviesService) {}

  @Get(':tmdbId/releases')
  async releases(
    @Param(new ZodBodyPipe(MoviesTmdbIdParamSchema))
    p: z.infer<typeof MoviesTmdbIdParamSchema>,
    @Query(new ZodBodyPipe(MovieReleasesQuerySchema))
    q: z.infer<typeof MovieReleasesQuerySchema>,
  ) {
    const region = q.region && q.region.length === 2 ? q.region : undefined;
    return await this.svc.getReleaseDates(p.tmdbId, region);
  }
}
