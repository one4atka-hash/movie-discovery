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

const TmdbMovieDetailsSchema = z.object({
  id: z.number(),
  title: z.string().optional().nullable(),
  overview: z.string().optional().nullable(),
  original_language: z.string().optional().nullable(),
  genres: z
    .array(
      z.object({
        id: z.number(),
        name: z.string().optional().nullable(),
      }),
    )
    .optional()
    .nullable(),
});

const TmdbCreditsSchema = z.object({
  id: z.number().optional(),
  cast: z.array(z.unknown()).optional().nullable(),
  crew: z.array(z.unknown()).optional().nullable(),
});

const TmdbKeywordsSchema = z.object({
  id: z.number().optional(),
  keywords: z.array(z.unknown()).optional().nullable(),
  results: z.array(z.unknown()).optional().nullable(), // some TMDB shapes use `results`
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
   * Minimal TMDB "feature cache" v1: fetch details + credits + keywords and upsert into `movie_features`.
   * Embeddings are intentionally out of scope for this step.
   */
  async refreshMovieFeatures(
    tmdbId: number,
    opts?: { language?: string | undefined },
  ): Promise<{
    ok: true;
    tmdbId: number;
    updatedAt: string;
  }> {
    const apiKey = (this.config.get<string>('TMDB_API_KEY') ?? '').trim();
    if (!apiKey) {
      throw new ServiceUnavailableException('TMDB is not configured');
    }

    const baseUrl = (
      this.config.get<string>('TMDB_BASE_URL') ?? 'https://api.themoviedb.org/3'
    )
      .trim()
      .replace(/\/+$/, '');

    const language = (opts?.language ?? '').trim();

    const urlDetails = new URL(`${baseUrl}/movie/${tmdbId}`);
    urlDetails.searchParams.set('api_key', apiKey);
    if (language) urlDetails.searchParams.set('language', language);

    const urlCredits = new URL(`${baseUrl}/movie/${tmdbId}/credits`);
    urlCredits.searchParams.set('api_key', apiKey);

    const urlKeywords = new URL(`${baseUrl}/movie/${tmdbId}/keywords`);
    urlKeywords.searchParams.set('api_key', apiKey);

    const [resDetails, resCredits, resKeywords] = await Promise.all([
      fetch(urlDetails.toString(), {
        headers: { accept: 'application/json' },
      }),
      fetch(urlCredits.toString(), {
        headers: { accept: 'application/json' },
      }),
      fetch(urlKeywords.toString(), {
        headers: { accept: 'application/json' },
      }),
    ]);

    if (!resDetails.ok || !resCredits.ok || !resKeywords.ok) {
      throw new ServiceUnavailableException('TMDB request failed');
    }

    const [jsonDetails, jsonCredits, jsonKeywords] = await Promise.all([
      resDetails.json() as Promise<unknown>,
      resCredits.json() as Promise<unknown>,
      resKeywords.json() as Promise<unknown>,
    ]);

    const details = TmdbMovieDetailsSchema.safeParse(jsonDetails);
    const credits = TmdbCreditsSchema.safeParse(jsonCredits);
    const keywords = TmdbKeywordsSchema.safeParse(jsonKeywords);
    if (!details.success || !credits.success || !keywords.success) {
      throw new ServiceUnavailableException('Unexpected TMDB payload');
    }

    const kw = keywords.data.keywords ?? keywords.data.results ?? [];
    const updatedAt = new Date().toISOString();
    await this.db.exec(
      `insert into movie_features(
         tmdb_id, title, overview, genres, "cast", crew, keywords, lang, updated_at
       )
       values ($1, $2, $3, $4::jsonb, $5::jsonb, $6::jsonb, $7::jsonb, $8, $9::timestamptz)
       on conflict (tmdb_id)
       do update set
         title = excluded.title,
         overview = excluded.overview,
         genres = excluded.genres,
         "cast" = excluded."cast",
         crew = excluded.crew,
         keywords = excluded.keywords,
         lang = excluded.lang,
         updated_at = excluded.updated_at`,
      [
        tmdbId,
        (details.data.title ?? '').trim() || null,
        details.data.overview ?? null,
        JSON.stringify(details.data.genres ?? []),
        JSON.stringify(credits.data.cast ?? []),
        JSON.stringify(credits.data.crew ?? []),
        JSON.stringify(kw ?? []),
        (details.data.original_language ?? language ?? null) as string | null,
        updatedAt,
      ],
    );

    return { ok: true, tmdbId, updatedAt };
  }

  async refreshMovieFeaturesBatch(
    tmdbIds: readonly number[],
    opts?: { language?: string | undefined },
  ): Promise<{
    ok: true;
    items: { tmdbId: number; ok: true; updatedAt: string }[];
    errors: { tmdbId: number; error: string }[];
  }> {
    // Keep sequential to avoid rate-limit spikes and to keep DB writes predictable.
    const items: { tmdbId: number; ok: true; updatedAt: string }[] = [];
    const errors: { tmdbId: number; error: string }[] = [];
    for (const id of tmdbIds) {
      try {
        const r = await this.refreshMovieFeatures(id, opts);
        items.push({ tmdbId: r.tmdbId, ok: true, updatedAt: r.updatedAt });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        errors.push({ tmdbId: id, error: msg });
      }
    }
    return { ok: true, items, errors };
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
