import { Injectable } from '@nestjs/common';

import { DbService } from '../db/db.service';

type FeedbackRow = { tmdb_id: number; value: 'like' | 'dislike' | 'hide' | 'neutral'; updated_at: string };
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
    items: { tmdbId: number; score: number; reason: string }[];
    meta: { mode: 'mvp'; generatedAt: string };
  }> {
    const [fav, fb] = await Promise.all([
      this.db.query<FavoriteRow>(
        `select tmdb_id, created_at
         from favorites
         where user_id = $1
         order by created_at desc`,
        [userId]
      ),
      this.db.query<FeedbackRow>(
        `select tmdb_id, value, updated_at
         from feedback
         where user_id = $1`,
        [userId]
      )
    ]);

    const blocked = new Set<number>(fb.filter((r) => r.value === 'dislike' || r.value === 'hide').map((r) => r.tmdb_id));
    const liked = new Set<number>(fb.filter((r) => r.value === 'like').map((r) => r.tmdb_id));

    const seeds = [...liked, ...fav.map((r) => r.tmdb_id)].filter((id) => !blocked.has(id));

    // Placeholder: in the next iteration we will expand seeds -> candidates via TMDB and/or ANN.
    const unique = [...new Set(seeds)].slice(0, 20);

    return {
      items: unique.map((tmdbId, i) => ({
        tmdbId,
        score: 1 - i / Math.max(1, unique.length),
        reason: 'Seed item (MVP): will expand via embeddings + ANN'
      })),
      meta: { mode: 'mvp', generatedAt: new Date().toISOString() }
    };
  }
}

