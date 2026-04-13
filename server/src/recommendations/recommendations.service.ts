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

  private async loadSignals(userId: string): Promise<{
    fav: FavoriteRow[];
    fb: FeedbackRow[];
    blocked: Set<number>;
    liked: Set<number>;
    favoriteIds: Set<number>;
    rawSeeds: number[];
    unique: number[];
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
    const favoriteIds = new Set<number>(fav.map((r) => r.tmdb_id));

    const rawSeeds = [...liked, ...fav.map((r) => r.tmdb_id)].filter(
      (id) => !blocked.has(id),
    );

    // Placeholder: in the next iteration we will expand seeds -> candidates via TMDB and/or ANN.
    const unique = [...new Set(rawSeeds)].slice(0, 20);

    return { fav, fb, blocked, liked, favoriteIds, rawSeeds, unique };
  }

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
    const { unique } = await this.loadSignals(userId);

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

  /**
   * Debug-oriented quality signals for the current MVP ranker (deterministic, cheap).
   */
  async metricsForUser(userId: string): Promise<{
    diversity: number;
    novelty: number;
    coverage: number;
    counts: {
      rawSeeds: number;
      uniqueCandidates: number;
      blocked: number;
      favorites: number;
      feedbackRows: number;
    };
    meta: { mode: 'mvp'; generatedAt: string };
  }> {
    const { fb, blocked, favoriteIds, rawSeeds, unique } =
      await this.loadSignals(userId);

    const rawSeedsLen = rawSeeds.length;
    const uniqueLen = unique.length;

    // Duplicate removal within the seed pool (1 = all unique before dedupe).
    const diversity =
      uniqueLen === 0 ? 1 : uniqueLen / Math.max(1, rawSeedsLen);

    // Share of the slate not sourced from favorites alone (taste expansion vs library).
    const notOnlyFromFavorites =
      uniqueLen === 0
        ? 1
        : unique.filter((id) => !favoriteIds.has(id)).length / uniqueLen;
    const novelty = notOnlyFromFavorites;

    // How full the capped slate is (target cap = 20).
    const coverage = Math.min(1, uniqueLen / 20);

    return {
      diversity,
      novelty,
      coverage,
      counts: {
        rawSeeds: rawSeedsLen,
        uniqueCandidates: uniqueLen,
        blocked: blocked.size,
        favorites: favoriteIds.size,
        feedbackRows: fb.length,
      },
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
