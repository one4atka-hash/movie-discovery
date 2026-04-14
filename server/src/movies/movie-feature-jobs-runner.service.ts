import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { truthy } from '../config/env.schema';
import { DbService } from '../db/db.service';

import { MovieFeatureJobsService } from './movie-feature-jobs.service';
import { toPgVectorLiteral } from './embeddings.util';
import { EmbeddingsService } from './embeddings.service';

@Injectable()
export class MovieFeatureJobsRunnerService {
  constructor(
    private readonly config: ConfigService,
    private readonly jobs: MovieFeatureJobsService,
    private readonly db: DbService,
    private readonly embeddings: EmbeddingsService,
  ) {}

  async runEmbeddingsJob(
    userId: string,
    jobId: string,
  ): Promise<{
    ok: true;
    status: 'queued' | 'failed' | 'running' | 'completed';
  }> {
    const started = await this.jobs.markRunning(userId, jobId);
    if (!started.ok) {
      const job = await this.jobs.getJob(userId, jobId);
      return { ok: true, status: job?.status ?? 'failed' };
    }

    const enabled =
      truthy(this.config.get<string>('EMBEDDINGS_ENABLED')) ||
      truthy(process.env.EMBEDDINGS_ENABLED);
    if (!enabled) {
      await this.jobs.markFailed(
        userId,
        jobId,
        'Embeddings pipeline is disabled',
      );
      return { ok: true, status: 'failed' };
    }

    const job = await this.jobs.getJob(userId, jobId);
    const tmdbIds = job?.tmdbIds ?? [];
    if (!tmdbIds.length) {
      await this.jobs.markCompleted(userId, jobId);
      return { ok: true, status: 'completed' };
    }

    const rows = await this.db.query<{
      tmdb_id: number;
      title: string | null;
      overview: string | null;
      lang: string | null;
    }>(
      `select tmdb_id, title, overview, lang
       from movie_features
       where tmdb_id = any($1::bigint[])`,
      [tmdbIds],
    );

    const byId = new Map<number, (typeof rows)[number]>();
    for (const r of rows) byId.set(r.tmdb_id, r);

    let missing = 0;
    let embedFailures = 0;
    await this.jobs.setTotals(userId, jobId, tmdbIds.length);

    const seeds = tmdbIds
      .map((id) => {
        const r = byId.get(id);
        if (!r) {
          missing += 1;
          return null;
        }
        return {
          tmdbId: id,
          title: r.title,
          overview: r.overview,
          lang: r.lang,
        };
      })
      .filter(
        (
          x,
        ): x is {
          tmdbId: number;
          title: string | null;
          overview: string | null;
          lang: string | null;
        } => Boolean(x),
      );

    const chunkSize = 32;
    for (let i = 0; i < seeds.length; i += chunkSize) {
      const chunk = seeds.slice(i, i + chunkSize);
      const res = await this.embeddings.embedMovieFeatures(chunk);
      if (!Array.isArray(res)) {
        embedFailures += chunk.length;
        await this.jobs.addProgress(userId, jobId, {
          processed: chunk.length,
          failed: chunk.length,
        });
        continue;
      }

      const vecById = new Map(res.map((r) => [r.tmdbId, r.vector] as const));
      let processed = 0;
      let failed = 0;
      for (const s of chunk) {
        const emb = vecById.get(s.tmdbId);
        if (!emb) {
          embedFailures += 1;
          processed += 1;
          failed += 1;
          continue;
        }
        const lit = toPgVectorLiteral(emb);
        await this.db.exec(
          `update movie_features
           set embedding = $2::vector, updated_at = now()
           where tmdb_id = $1`,
          [s.tmdbId, lit],
        );
        processed += 1;
      }
      await this.jobs.addProgress(userId, jobId, { processed, failed });
    }

    if (missing) {
      await this.jobs.markFailed(
        userId,
        jobId,
        `Missing movie_features rows for ${missing} tmdbId(s)`,
      );
      return { ok: true, status: 'failed' };
    }

    if (embedFailures) {
      await this.jobs.markFailed(
        userId,
        jobId,
        `Failed to embed ${embedFailures} tmdbId(s)`,
      );
      return { ok: true, status: 'failed' };
    }

    await this.jobs.markCompleted(userId, jobId);
    return { ok: true, status: 'completed' };
  }
}
