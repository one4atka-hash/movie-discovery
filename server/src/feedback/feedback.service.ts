import { Injectable } from '@nestjs/common';

import { DbService } from '../db/db.service';

export type FeedbackValue = 'like' | 'dislike' | 'hide' | 'neutral';

type FeedbackRow = {
  tmdb_id: number;
  value: FeedbackValue;
  reason: string | null;
  updated_at: string;
};

@Injectable()
export class FeedbackService {
  constructor(private readonly db: DbService) {}

  async list(userId: string): Promise<{ tmdbId: number; value: FeedbackValue; reason: string | null; updatedAt: string }[]> {
    const rows = await this.db.query<FeedbackRow>(
      `select tmdb_id, value, reason, updated_at
       from feedback
       where user_id = $1
       order by updated_at desc`,
      [userId]
    );
    return rows.map((r) => ({ tmdbId: r.tmdb_id, value: r.value, reason: r.reason, updatedAt: r.updated_at }));
  }

  async upsert(
    userId: string,
    input: { tmdbId: number; value: FeedbackValue; reason?: string }
  ): Promise<void> {
    await this.db.exec(
      `insert into feedback(user_id, tmdb_id, value, reason)
       values ($1, $2, $3, $4)
       on conflict (user_id, tmdb_id)
       do update set value = excluded.value, reason = excluded.reason, updated_at = now()`,
      [userId, input.tmdbId, input.value, input.reason ?? null]
    );
  }
}

