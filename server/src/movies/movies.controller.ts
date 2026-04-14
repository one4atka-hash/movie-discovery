import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { z } from 'zod';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, type AuthedUser } from '../auth/current-user.decorator';
import { ZodBodyPipe } from '../common/zod-body.pipe';
import {
  MovieReleasesQuerySchema,
  CreateEmbeddingsJobSchema,
  MovieFeatureJobIdParamSchema,
  MoviesTmdbIdParamSchema,
  RefreshFeaturesBatchSchema,
  RefreshFeaturesQuerySchema,
} from './movies.schemas';
import { MovieFeatureJobsService } from './movie-feature-jobs.service';
import { MoviesService } from './movies.service';

@UseGuards(JwtAuthGuard)
@Controller('movies')
export class MoviesController {
  constructor(
    private readonly svc: MoviesService,
    private readonly jobs: MovieFeatureJobsService,
  ) {}

  @Get(':tmdbId/features/refresh')
  async refreshFeatures(
    @Param(new ZodBodyPipe(MoviesTmdbIdParamSchema))
    p: z.infer<typeof MoviesTmdbIdParamSchema>,
    @Query(new ZodBodyPipe(RefreshFeaturesQuerySchema))
    q: z.infer<typeof RefreshFeaturesQuerySchema>,
  ) {
    return await this.svc.refreshMovieFeatures(p.tmdbId, {
      language: q.language || undefined,
    });
  }

  @Post('features/refresh-batch')
  async refreshFeaturesBatch(
    @Body(new ZodBodyPipe(RefreshFeaturesBatchSchema))
    body: z.infer<typeof RefreshFeaturesBatchSchema>,
  ) {
    return await this.svc.refreshMovieFeaturesBatch(body.tmdbIds, {
      language: body.language || undefined,
    });
  }

  @Post('features/embeddings/jobs')
  async createEmbeddingsJob(
    @CurrentUser() u: AuthedUser,
    @Body(new ZodBodyPipe(CreateEmbeddingsJobSchema))
    body: z.infer<typeof CreateEmbeddingsJobSchema>,
  ) {
    const out = await this.jobs.createEmbeddingsJob(u.id, {
      tmdbIds: body.tmdbIds,
    });
    return { ok: true, id: out.id };
  }

  @Get('features/embeddings/jobs/:id')
  async getEmbeddingsJob(
    @CurrentUser() u: AuthedUser,
    @Param(new ZodBodyPipe(MovieFeatureJobIdParamSchema))
    p: z.infer<typeof MovieFeatureJobIdParamSchema>,
  ) {
    const job = await this.jobs.getJob(u.id, p.id);
    return { ok: true, job };
  }

  @Get(':tmdbId/editions')
  async editions(
    @Param(new ZodBodyPipe(MoviesTmdbIdParamSchema))
    p: z.infer<typeof MoviesTmdbIdParamSchema>,
  ) {
    return await this.svc.getEditions(p.tmdbId);
  }

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
