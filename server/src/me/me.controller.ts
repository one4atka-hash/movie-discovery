import {
  Body,
  Controller,
  Get,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { z } from 'zod';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, type AuthedUser } from '../auth/current-user.decorator';
import { ZodBodyPipe } from '../common/zod-body.pipe';
import { MovieFeatureJobsService } from '../movies/movie-feature-jobs.service';
import { MoviesService } from '../movies/movies.service';
import { MeService } from './me.service';
import { PublicProfilePutSchema } from './public-profile.schemas';
import { StreamingPrefsSchema } from './streaming-prefs.schemas';

@UseGuards(JwtAuthGuard)
@Controller('me')
export class MeController {
  constructor(
    private readonly me: MeService,
    private readonly movies: MoviesService,
    private readonly jobs: MovieFeatureJobsService,
  ) {}

  @Get('public-profile')
  async getPublicProfile(@CurrentUser() u: AuthedUser) {
    return await this.me.getPublicProfile(u.id);
  }

  @Put('public-profile')
  async putPublicProfile(
    @CurrentUser() u: AuthedUser,
    @Body(new ZodBodyPipe(PublicProfilePutSchema))
    body: z.infer<typeof PublicProfilePutSchema>,
  ) {
    await this.me.putPublicProfile(u.id, body);
    return { ok: true };
  }

  @Get('streaming-prefs')
  async getStreamingPrefs(@CurrentUser() u: AuthedUser) {
    return await this.me.getStreamingPrefs(u.id);
  }

  @Put('streaming-prefs')
  async putStreamingPrefs(
    @CurrentUser() u: AuthedUser,
    @Body(new ZodBodyPipe(StreamingPrefsSchema))
    body: z.infer<typeof StreamingPrefsSchema>,
  ) {
    await this.me.putStreamingPrefs(u.id, body);
    return { ok: true };
  }

  @Post('movie-features/refresh')
  async refreshMyMovieFeatures(
    @CurrentUser() u: AuthedUser,
    @Body(
      new ZodBodyPipe(
        z.object({
          limit: z.number().int().min(1).max(50).optional(),
          language: z.string().trim().optional().default(''),
        }),
      ),
    )
    body: { limit?: number; language?: string },
  ) {
    const limit = body.limit ?? 30;
    const ids = await this.me.listMyFeatureRefreshSeeds(u.id, limit);
    return await this.movies.refreshMovieFeaturesBatch(ids, {
      language: body.language?.trim() || undefined,
    });
  }

  @Post('movie-features/embeddings/jobs')
  async createMyEmbeddingsJob(
    @CurrentUser() u: AuthedUser,
    @Body(
      new ZodBodyPipe(
        z.object({
          limit: z.number().int().min(1).max(200).optional(),
        }),
      ),
    )
    body: { limit?: number },
  ) {
    const limit = body.limit ?? 50;
    const ids = await this.me.listMyFeatureRefreshSeeds(u.id, limit);
    const out = await this.jobs.createEmbeddingsJob(u.id, { tmdbIds: ids });
    return { ok: true, id: out.id, tmdbIds: ids };
  }

  @Get('movie-features/embeddings/seeds')
  async getMyEmbeddingsSeeds(
    @CurrentUser() u: AuthedUser,
    @Query(
      new ZodBodyPipe(
        z.object({
          limit: z.coerce.number().int().min(1).max(200).optional().default(50),
        }),
      ),
    )
    q: { limit: number },
  ) {
    const ids = await this.me.listMyFeatureRefreshSeeds(u.id, q.limit);
    return { ok: true, tmdbIds: ids };
  }
}
