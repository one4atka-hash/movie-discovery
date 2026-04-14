import { Injectable } from '@nestjs/common';

import { DbService } from '../db/db.service';

type JobRow = {
  id: string;
  user_id: string;
  kind: 'embeddings';
  status: 'queued' | 'running' | 'completed' | 'failed';
  tmdb_ids: unknown;
  processed_count: number;
  failed_count: number;
  total_count: number;
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
    const total = [...new Set(input.tmdbIds)].filter(
      (n) => Number.isFinite(n) && n > 0,
    ).length;
    const rows = await this.db.query<{ id: string }>(
      `insert into movie_feature_jobs(user_id, kind, status, tmdb_ids, total_count)
       values ($1, 'embeddings', 'queued', $2::jsonb, $3)
       returning id`,
      [userId, JSON.stringify([...input.tmdbIds]), total],
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
    progress: { processed: number; failed: number; total: number };
    createdAt: string;
    startedAt: string | null;
    finishedAt: string | null;
    error: string | null;
  } | null> {
    const rows = await this.db.query<JobRow>(
      `select id, user_id, kind, status, tmdb_ids,
              processed_count, failed_count, total_count,
              created_at, started_at, finished_at, error
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
      progress: {
        processed: Number(r.processed_count ?? 0),
        failed: Number(r.failed_count ?? 0),
        total: Number(r.total_count ?? tmdbIds.length),
      },
      createdAt: r.created_at,
      startedAt: r.started_at,
      finishedAt: r.finished_at,
      error: r.error,
    };
  }

  async markRunning(userId: string, id: string): Promise<{ ok: boolean }> {
    const rows = await this.db.query<{ ok: boolean }>(
      `update movie_feature_jobs
       set status = 'running', started_at = coalesce(started_at, now())
       where user_id = $1 and id = $2 and status = 'queued'
       returning true as ok`,
      [userId, id],
    );
    return { ok: Boolean(rows[0]?.ok) };
  }

  async markFailed(userId: string, id: string, error: string): Promise<void> {
    await this.db.exec(
      `update movie_feature_jobs
       set status = 'failed', finished_at = now(), error = $3
       where user_id = $1 and id = $2`,
      [userId, id, error],
    );
  }

  async markCompleted(userId: string, id: string): Promise<void> {
    await this.db.exec(
      `update movie_feature_jobs
       set status = 'completed', finished_at = now(), error = null
       where user_id = $1 and id = $2`,
      [userId, id],
    );
  }

  async setTotals(userId: string, id: string, total: number): Promise<void> {
    await this.db.exec(
      `update movie_feature_jobs
       set total_count = $3
       where user_id = $1 and id = $2`,
      [userId, id, Math.max(0, Math.trunc(total))],
    );
  }

  async addProgress(
    userId: string,
    id: string,
    delta: { processed: number; failed: number },
  ): Promise<void> {
    await this.db.exec(
      `update movie_feature_jobs
       set processed_count = processed_count + $3,
           failed_count = failed_count + $4
       where user_id = $1 and id = $2`,
      [
        userId,
        id,
        Math.max(0, Math.trunc(delta.processed)),
        Math.max(0, Math.trunc(delta.failed)),
      ],
    );
  }
}
