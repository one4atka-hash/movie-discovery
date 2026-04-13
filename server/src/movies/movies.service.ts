import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { z } from 'zod';

import { DbService } from '../db/db.service';

import {
  type MovieEditionItem,
  heuristicEditionsFromPayload,
  mergeHeuristicWithManual,
} from './movie-editions-from-snapshot.util';

const TmdbReleaseDatesResponseSchema = z.object({
  id: z.number().optional(),
  results: z.array(
    z.object({
      iso_3166_1: z.string(),
      release_dates: z.array(z.unknown()),
    }),
  ),
});

@Injectable()
export class MoviesService {
  constructor(
    private readonly config: ConfigService,
    private readonly db: DbService,
  ) {}

  async getReleaseDates(
    tmdbId: number,
    regionFilter: string | undefined,
  ): Promise<{
    tmdbId: number;
    cached: boolean;
    fetchedAt: string;
    region: string | null;
    results: { iso31661: string; releaseDates: unknown[] }[];
  }> {
    const ttlMs = Number(
      this.config.get<string>('MOVIE_RELEASES_CACHE_TTL_MS') ?? 86_400_000,
    );

    const cached = await this.db.query<{
      payload: unknown;
      fetched_at: string;
    }>(
      `select payload, fetched_at from movie_release_snapshots where tmdb_id = $1`,
      [tmdbId],
    );

    const now = Date.now();
    let payload: unknown;
    let fetchedAt!: string;
    let fromCache = false;

    if (cached[0]) {
      const age = now - new Date(cached[0].fetched_at).getTime();
      if (age < ttlMs) {
        payload = cached[0].payload;
        fetchedAt = cached[0].fetched_at;
        fromCache = true;
      }
    }

    if (!fromCache) {
      payload = await this.fetchReleaseDatesFromTmdb(tmdbId);
      fetchedAt = new Date().toISOString();
      await this.db.exec(
        `insert into movie_release_snapshots(tmdb_id, payload, fetched_at)
         values ($1, $2::jsonb, $3::timestamptz)
         on conflict (tmdb_id)
         do update set payload = excluded.payload, fetched_at = excluded.fetched_at`,
        [tmdbId, JSON.stringify(payload), fetchedAt],
      );
    }

    const parsed = TmdbReleaseDatesResponseSchema.safeParse(payload);
    if (!parsed.success) {
      return {
        tmdbId,
        cached: fromCache,
        fetchedAt,
        region: regionFilter && regionFilter.length === 2 ? regionFilter : null,
        results: [],
      };
    }

    let results = parsed.data.results.map((r) => ({
      iso31661: r.iso_3166_1,
      releaseDates: r.release_dates,
    }));

    const rf = regionFilter?.trim();
    if (rf && /^[A-Z]{2}$/.test(rf)) {
      results = results.filter((r) => r.iso31661 === rf);
    }

    return {
      tmdbId,
      cached: fromCache,
      fetchedAt,
      region: rf && /^[A-Z]{2}$/.test(rf) ? rf : null,
      results,
    };
  }

  private async fetchReleaseDatesFromTmdb(tmdbId: number): Promise<unknown> {
    const apiKey = (this.config.get<string>('TMDB_API_KEY') ?? '').trim();
    if (!apiKey) {
      throw new ServiceUnavailableException('TMDB is not configured');
    }

    const baseUrl = (
      this.config.get<string>('TMDB_BASE_URL') ?? 'https://api.themoviedb.org/3'
    )
      .trim()
      .replace(/\/+$/, '');

    const url = new URL(`${baseUrl}/movie/${tmdbId}/release_dates`);
    url.searchParams.set('api_key', apiKey);

    const res = await fetch(url.toString(), {
      headers: { accept: 'application/json' },
    });
    if (!res.ok) {
      throw new ServiceUnavailableException('TMDB request failed');
    }

    const json = (await res.json()) as unknown;
    const parsed = TmdbReleaseDatesResponseSchema.safeParse(json);
    if (!parsed.success) {
      throw new ServiceUnavailableException('Unexpected TMDB payload');
    }
    return json;
  }

  /**
   * Edition list: TMDB release-type heuristics from cached release_dates snapshot,
   * merged with optional `movie_editions` manual rows (same edition_key overrides label/sort).
   */
  async getEditions(tmdbId: number): Promise<{
    tmdbId: number;
    items: MovieEditionItem[];
  }> {
    await this.getReleaseDates(tmdbId, undefined);

    const snap = await this.db.query<{ payload: unknown }>(
      `select payload from movie_release_snapshots where tmdb_id = $1`,
      [tmdbId],
    );
    const payload = snap[0]?.payload ?? null;

    const manual = await this.db.query<{
      edition_key: string;
      label: string;
      sort_order: number;
      meta: unknown;
    }>(
      `select edition_key, label, sort_order, meta from movie_editions where tmdb_id = $1 order by sort_order, edition_key`,
      [tmdbId],
    );

    const h = heuristicEditionsFromPayload(payload);
    const items =
      manual.length === 0 && h.length === 0
        ? []
        : mergeHeuristicWithManual(h, manual);

    return { tmdbId, items };
  }
}
