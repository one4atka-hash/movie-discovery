import { Injectable } from '@nestjs/common';

import { DbService } from '../db/db.service';

type DiaryRow = {
  id: string;
  tmdb_id: number | null;
  title: string;
  watched_at: string;
  location: 'cinema' | 'streaming' | 'home';
  provider_key: string | null;
  rating: number | null;
  tags: unknown;
  note: string | null;
  created_at: string;
  updated_at: string;
};

type WatchRow = {
  tmdb_id: number;
  status: 'want' | 'watching' | 'watched' | 'dropped' | 'hidden';
  progress: unknown;
  updated_at: string;
};

type FavoriteRow = { tmdb_id: number; created_at: string };

@Injectable()
export class ExportsService {
  constructor(private readonly db: DbService) {}

  async export(
    userId: string,
    input: {
      kind: 'diary' | 'watch_state' | 'favorites';
      format: 'json' | 'csv';
      year?: number;
    },
  ): Promise<{ filename: string; contentType: string; body: string }> {
    if (input.kind === 'diary') {
      return await this.exportDiary(userId, input.format, input.year);
    }
    if (input.kind === 'watch_state') {
      return await this.exportWatchState(userId, input.format);
    }
    return await this.exportFavorites(userId, input.format);
  }

  private async exportDiary(
    userId: string,
    format: 'json' | 'csv',
    year?: number,
  ) {
    const y = year ? Math.trunc(year) : null;
    const from = y ? `${y}-01-01` : null;
    const to = y ? `${y}-12-31` : null;

    const where: string[] = ['user_id = $1'];
    const params: unknown[] = [userId];
    if (from && to) {
      params.push(from);
      where.push(`watched_at >= $${params.length}::date`);
      params.push(to);
      where.push(`watched_at <= $${params.length}::date`);
    }

    const rows = await this.db.query<DiaryRow>(
      `select id, tmdb_id, title, watched_at::text as watched_at, location, provider_key, rating, tags, note, created_at, updated_at
       from diary_entries
       where ${where.join(' and ')}
       order by watched_at desc, updated_at desc`,
      params,
    );

    const items = rows.map((r) => ({
      id: r.id,
      tmdbId: r.tmdb_id,
      title: r.title,
      watchedAt: r.watched_at,
      location: r.location,
      providerKey: r.provider_key,
      rating: r.rating,
      tags: Array.isArray(r.tags)
        ? (r.tags as unknown[])
            .filter((x) => typeof x === 'string')
            .map((x) => x.trim())
            .filter(Boolean)
        : [],
      note: r.note,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));

    const suffix = y ? `${y}` : 'all';
    if (format === 'json') {
      return {
        filename: `diary_${suffix}.json`,
        contentType: 'application/json; charset=utf-8',
        body: JSON.stringify({ items }, null, 2),
      };
    }

    const header = [
      'id',
      'tmdbId',
      'title',
      'watchedAt',
      'location',
      'providerKey',
      'rating',
      'tags',
      'note',
      'createdAt',
      'updatedAt',
    ];
    const csv = [
      header.join(','),
      ...items.map((it) =>
        [
          it.id,
          it.tmdbId ?? '',
          csvCell(it.title),
          it.watchedAt,
          it.location,
          it.providerKey ?? '',
          it.rating ?? '',
          csvCell(it.tags.join('|')),
          csvCell(it.note ?? ''),
          it.createdAt,
          it.updatedAt,
        ].join(','),
      ),
    ].join('\n');

    return {
      filename: `diary_${suffix}.csv`,
      contentType: 'text/csv; charset=utf-8',
      body: csv,
    };
  }

  private async exportWatchState(userId: string, format: 'json' | 'csv') {
    const rows = await this.db.query<WatchRow>(
      `select tmdb_id, status, progress, updated_at
       from watch_state
       where user_id = $1
       order by updated_at desc`,
      [userId],
    );
    const items = rows.map((r) => ({
      tmdbId: r.tmdb_id,
      status: r.status,
      progress: r.progress ?? null,
      updatedAt: r.updated_at,
    }));

    if (format === 'json') {
      return {
        filename: `watch_state_all.json`,
        contentType: 'application/json; charset=utf-8',
        body: JSON.stringify({ items }, null, 2),
      };
    }

    const header = ['tmdbId', 'status', 'progress', 'updatedAt'];
    const csv = [
      header.join(','),
      ...items.map((it) =>
        [
          it.tmdbId,
          it.status,
          csvCell(it.progress ? JSON.stringify(it.progress) : ''),
          it.updatedAt,
        ].join(','),
      ),
    ].join('\n');

    return {
      filename: `watch_state_all.csv`,
      contentType: 'text/csv; charset=utf-8',
      body: csv,
    };
  }

  private async exportFavorites(userId: string, format: 'json' | 'csv') {
    const rows = await this.db.query<FavoriteRow>(
      `select tmdb_id, created_at
       from favorites
       where user_id = $1
       order by created_at desc`,
      [userId],
    );
    const items = rows.map((r) => ({
      tmdbId: r.tmdb_id,
      createdAt: r.created_at,
    }));

    if (format === 'json') {
      return {
        filename: `favorites_all.json`,
        contentType: 'application/json; charset=utf-8',
        body: JSON.stringify({ items }, null, 2),
      };
    }

    const header = ['tmdbId', 'createdAt'];
    const csv = [
      header.join(','),
      ...items.map((it) => [it.tmdbId, it.createdAt].join(',')),
    ].join('\n');
    return {
      filename: `favorites_all.csv`,
      contentType: 'text/csv; charset=utf-8',
      body: csv,
    };
  }
}

function csvCell(v: string): string {
  const s = String(v ?? '');
  if (!/[,"\n\r]/.test(s)) return s;
  return `"${s.replaceAll('"', '""')}"`;
}
