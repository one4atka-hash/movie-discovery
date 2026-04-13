import { Injectable } from '@nestjs/common';

import { DbService } from '../db/db.service';
import { buildExplain } from './recommendations-explain.util';

type FeedbackRow = {
  tmdb_id: number;
  value: 'like' | 'dislike' | 'hide' | 'neutral';
  updated_at: string;
};
type FavoriteRow = { tmdb_id: number; created_at: string };

@Injectable()
export class RecommendationsService {
  constructor(private readonly db: DbService) {}

  /**
   * MVP endpoint:
   * - later: ANN over embeddings + rerank
   * - now: return a stable payload with room for scores/explanations
   */
  async recommendForUser(userId: string): Promise<{
    items: {
      tmdbId: number;
      score: number;
      explain: { key: string; params?: Record<string, string> }[];
    }[];
    meta: { mode: 'mvp'; generatedAt: string };
  }> {
    const [fav, fb] = await Promise.all([
      this.db.query<FavoriteRow>(
        `select tmdb_id, created_at
         from favorites
         where user_id = $1
         order by created_at desc`,
        [userId],
      ),
      this.db.query<FeedbackRow>(
        `select tmdb_id, value, updated_at
         from feedback
         where user_id = $1`,
        [userId],
      ),
    ]);

    const blocked = new Set<number>(
      fb
        .filter((r) => r.value === 'dislike' || r.value === 'hide')
        .map((r) => r.tmdb_id),
    );
    const liked = new Set<number>(
      fb.filter((r) => r.value === 'like').map((r) => r.tmdb_id),
    );

    const seeds = [...liked, ...fav.map((r) => r.tmdb_id)].filter(
      (id) => !blocked.has(id),
    );

    // Placeholder: in the next iteration we will expand seeds -> candidates via TMDB and/or ANN.
    const unique = [...new Set(seeds)].slice(0, 20);

    return {
      items: unique.map((tmdbId, i) => ({
        tmdbId,
        score: 1 - i / Math.max(1, unique.length),
        explain: buildExplain(
          { seedCount: unique.length, mode: 'mvp' },
          { maxItems: 4 },
        ),
      })),
      meta: { mode: 'mvp', generatedAt: new Date().toISOString() },
    };
  }

  async applyFeedback(
    userId: string,
    input: { tmdbId: number; action: 'more' | 'less' | 'hide' },
  ): Promise<void> {
    const value =
      input.action === 'hide'
        ? 'hide'
        : input.action === 'less'
          ? 'dislike'
          : 'like';
    const reason = `recs:${input.action}`;
    await this.db.exec(
      `insert into feedback(user_id, tmdb_id, value, reason)
       values ($1, $2, $3, $4)
       on conflict (user_id, tmdb_id)
       do update set value = excluded.value, reason = excluded.reason, updated_at = now()`,
      [userId, input.tmdbId, value, reason],
    );
  }
}
