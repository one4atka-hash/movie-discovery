import { Injectable } from '@nestjs/common';

import { DbService } from '../db/db.service';

type JobRow = {
  id: string;
  user_id: string;
  kind: 'embeddings';
  status: 'queued' | 'running' | 'completed' | 'failed';
  tmdb_ids: unknown;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
  error: string | null;
};

@Injectable()
export class MovieFeatureJobsService {
  constructor(private readonly db: DbService) {}

  async createEmbeddingsJob(
    userId: string,
    input: { tmdbIds: readonly number[] },
  ): Promise<{ id: string }> {
    const rows = await this.db.query<{ id: string }>(
      `insert into movie_feature_jobs(user_id, kind, status, tmdb_ids)
       values ($1, 'embeddings', 'queued', $2::jsonb)
       returning id`,
      [userId, JSON.stringify([...input.tmdbIds])],
    );
    return { id: rows[0]?.id ?? '' };
  }

  async getJob(
    userId: string,
    id: string,
  ): Promise<{
    id: string;
    kind: 'embeddings';
    status: JobRow['status'];
    tmdbIds: number[];
    createdAt: string;
    startedAt: string | null;
    finishedAt: string | null;
    error: string | null;
  } | null> {
    const rows = await this.db.query<JobRow>(
      `select id, user_id, kind, status, tmdb_ids, created_at, started_at, finished_at, error
       from movie_feature_jobs
       where user_id = $1 and id = $2
       limit 1`,
      [userId, id],
    );
    const r = rows[0];
    if (!r) return null;
    const tmdbIds = Array.isArray(r.tmdb_ids)
      ? (r.tmdb_ids as unknown[])
          .map((x) => (typeof x === 'number' ? x : Number(x)))
          .filter((n) => Number.isFinite(n) && n > 0)
      : [];
    return {
      id: r.id,
      kind: 'embeddings',
      status: r.status,
      tmdbIds,
      createdAt: r.created_at,
      startedAt: r.started_at,
      finishedAt: r.finished_at,
      error: r.error,
    };
  }
}
