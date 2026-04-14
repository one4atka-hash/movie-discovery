import { Injectable } from '@nestjs/common';

import { DbService } from '../db/db.service';
import { aggregateGenreCounts, countsToWeights } from './taste-genre.util';

type WatchStatus = 'want' | 'watching' | 'watched' | 'dropped' | 'hidden';

@Injectable()
export class TasteService {
  constructor(private readonly db: DbService) {}

  async getAutoCollections(userId: string): Promise<{
    collections: {
      id: string;
      kind: 'favorites' | 'diary' | 'watch_status';
      title: string;
      watchStatus?: WatchStatus;
      items: { tmdbId: number; title: string | null }[];
      itemCount: number;
    }[];
  }> {
    const [favRows, diaryRows, wsRows] = await Promise.all([
      this.db.query<{ tmdb_id: number; title: string | null }>(
        `select f.tmdb_id, mf.title
         from favorites f
         left join movie_features mf on mf.tmdb_id = f.tmdb_id
         where f.user_id = $1::uuid
         order by f.created_at desc`,
        [userId],
      ),
      this.db.query<{ tmdb_id: number; title: string }>(
        `select distinct on (d.tmdb_id) d.tmdb_id, d.title
         from diary_entries d
         where d.user_id = $1::uuid and d.tmdb_id is not null
         order by d.tmdb_id, d.watched_at desc`,
        [userId],
      ),
      this.db.query<{ tmdb_id: number; status: WatchStatus }>(
        `select tmdb_id, status
         from watch_state
         where user_id = $1::uuid
         order by updated_at desc`,
        [userId],
      ),
    ]);

    const byStatus = new Map<
      WatchStatus,
      { tmdbId: number; title: string | null }[]
    >();
    const statusOrder: WatchStatus[] = [
      'want',
      'watching',
      'watched',
      'dropped',
      'hidden',
    ];
    for (const s of statusOrder) byStatus.set(s, []);

    const wsIds = [...new Set(wsRows.map((r) => r.tmdb_id))];
    const titleRows =
      wsIds.length > 0
        ? await this.db.query<{ tmdb_id: number; title: string | null }>(
            `select tmdb_id, title from movie_features where tmdb_id = any($1::bigint[])`,
            [wsIds],
          )
        : [];
    const titleById = new Map(
      titleRows.map((t) => [t.tmdb_id, t.title] as const),
    );

    for (const r of wsRows) {
      const arr = byStatus.get(r.status);
      if (arr)
        arr.push({
          tmdbId: r.tmdb_id,
          title: titleById.get(r.tmdb_id) ?? null,
        });
    }

    const collections: {
      id: string;
      kind: 'favorites' | 'diary' | 'watch_status';
      title: string;
      watchStatus?: WatchStatus;
      items: { tmdbId: number; title: string | null }[];
      itemCount: number;
    }[] = [
      {
        id: 'auto:favorites',
        kind: 'favorites',
        title: 'Favorites',
        items: favRows.map((r) => ({
          tmdbId: r.tmdb_id,
          title: r.title,
        })),
        itemCount: favRows.length,
      },
      {
        id: 'auto:diary',
        kind: 'diary',
        title: 'Diary (movies)',
        items: diaryRows.map((r) => ({
          tmdbId: r.tmdb_id,
          title: r.title,
        })),
        itemCount: diaryRows.length,
      },
    ];

    const labels: Record<WatchStatus, string> = {
      want: 'Watchlist: Want',
      watching: 'Watchlist: Watching',
      watched: 'Watchlist: Watched',
      dropped: 'Watchlist: Dropped',
      hidden: 'Watchlist: Hidden',
    };

    for (const st of statusOrder) {
      const items = byStatus.get(st) ?? [];
      collections.push({
        id: `auto:watch:${st}`,
        kind: 'watch_status',
        title: labels[st],
        watchStatus: st,
        items,
        itemCount: items.length,
      });
    }

    return { collections };
  }

  async getTasteSummary(userId: string): Promise<{
    counts: {
      favorites: number;
      diaryEntries: number;
      watchState: Record<WatchStatus, number>;
    };
    topGenres: { id: number; name: string; weight: number }[];
  }> {
    const [favCount, diaryCount, wsCounts, genreRows] = await Promise.all([
      this.db.query<{ n: string }>(
        `select count(*)::text as n from favorites where user_id = $1::uuid`,
        [userId],
      ),
      this.db.query<{ n: string }>(
        `select count(*)::text as n from diary_entries where user_id = $1::uuid`,
        [userId],
      ),
      this.db.query<{ status: WatchStatus; n: string }>(
        `select status, count(*)::text as n
         from watch_state
         where user_id = $1::uuid
         group by status`,
        [userId],
      ),
      this.db.query<{ genres: unknown }>(
        `select mf.genres
         from movie_features mf
         where mf.tmdb_id in (
           select tmdb_id from favorites where user_id = $1::uuid
           union
           select tmdb_id from diary_entries where user_id = $1::uuid and tmdb_id is not null
           union
           select tmdb_id from watch_state where user_id = $1::uuid
         )`,
        [userId],
      ),
    ]);

    const watchState: Record<WatchStatus, number> = {
      want: 0,
      watching: 0,
      watched: 0,
      dropped: 0,
      hidden: 0,
    };
    for (const r of wsCounts) {
      watchState[r.status] = Number(r.n);
    }

    const genreArrays = genreRows.map((r) => r.genres);
    const topGenres = countsToWeights(aggregateGenreCounts(genreArrays));

    return {
      counts: {
        favorites: Number(favCount[0]?.n ?? 0),
        diaryEntries: Number(diaryCount[0]?.n ?? 0),
        watchState,
      },
      topGenres,
    };
  }

  async getSimilarTo(
    userId: string,
    tmdbId: number,
  ): Promise<{
    source: 'embedding' | 'favorites_fallback';
    items: { tmdbId: number; title: string | null }[];
  }> {
    const emb = await this.db.query<{ ok: string }>(
      `select 1::text as ok
       from movie_features
       where tmdb_id = $1 and embedding is not null
       limit 1`,
      [tmdbId],
    );

    if (emb.length > 0) {
      const rows = await this.db.query<{
        tmdb_id: number;
        title: string | null;
      }>(
        `select mf2.tmdb_id, mf2.title
         from movie_features mf1, movie_features mf2
         where mf1.tmdb_id = $1
           and mf1.embedding is not null
           and mf2.tmdb_id <> mf1.tmdb_id
           and mf2.embedding is not null
         order by mf1.embedding <=> mf2.embedding
         limit 10`,
        [tmdbId],
      );
      if (rows.length > 0) {
        return {
          source: 'embedding',
          items: rows.map((r) => ({
            tmdbId: r.tmdb_id,
            title: r.title,
          })),
        };
      }
    }

    const fb = await this.db.query<{ tmdb_id: number; title: string | null }>(
      `select f.tmdb_id, mf.title
       from favorites f
       left join movie_features mf on mf.tmdb_id = f.tmdb_id
       where f.user_id = $1::uuid and f.tmdb_id <> $2
       order by f.created_at desc
       limit 10`,
      [userId, tmdbId],
    );

    return {
      source: 'favorites_fallback',
      items: fb.map((r) => ({ tmdbId: r.tmdb_id, title: r.title })),
    };
  }
}
