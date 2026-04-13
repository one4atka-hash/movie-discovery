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

type DiaryStatsRow = {
  total: number;
  rated_count: number;
  avg_rating: number | null;
  cinema_count: number;
  streaming_count: number;
  home_count: number;
};

@Injectable()
export class DiaryService {
  constructor(private readonly db: DbService) {}

  async list(
    userId: string,
    q: { from?: string; to?: string },
  ): Promise<
    {
      id: string;
      tmdbId: number | null;
      title: string;
      watchedAt: string;
      location: 'cinema' | 'streaming' | 'home';
      providerKey: string | null;
      rating: number | null;
      tags: string[];
      note: string | null;
      createdAt: string;
      updatedAt: string;
    }[]
  > {
    const where: string[] = ['user_id = $1'];
    const params: unknown[] = [userId];
    if (q.from) {
      params.push(q.from);
      where.push(`watched_at >= $${params.length}::date`);
    }
    if (q.to) {
      params.push(q.to);
      where.push(`watched_at <= $${params.length}::date`);
    }

    const rows = await this.db.query<DiaryRow>(
      `select id, tmdb_id, title, watched_at::text as watched_at, location, provider_key, rating, tags, note, created_at, updated_at
       from diary_entries
       where ${where.join(' and ')}
       order by watched_at desc, updated_at desc`,
      params,
    );

    return rows.map((r) => ({
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
  }

  async create(
    userId: string,
    input: {
      tmdbId: number | null;
      title: string;
      watchedAt: string;
      location: 'cinema' | 'streaming' | 'home';
      providerKey: string | null;
      rating: number | null;
      tags: readonly string[] | null;
      note: string | null;
    },
  ): Promise<{ id: string }> {
    const rows = await this.db.query<{ id: string }>(
      `insert into diary_entries(user_id, tmdb_id, title, watched_at, location, provider_key, rating, tags, note)
       values ($1, $2, $3, $4::date, $5, $6, $7, $8::jsonb, $9)
       returning id`,
      [
        userId,
        input.tmdbId,
        input.title,
        input.watchedAt,
        input.location,
        input.providerKey,
        input.rating,
        input.tags ? JSON.stringify([...input.tags]) : null,
        input.note,
      ],
    );
    return { id: rows[0].id };
  }

  async update(
    userId: string,
    id: string,
    input: {
      tmdbId: number | null;
      title: string;
      watchedAt: string;
      location: 'cinema' | 'streaming' | 'home';
      providerKey: string | null;
      rating: number | null;
      tags: readonly string[] | null;
      note: string | null;
    },
  ): Promise<void> {
    await this.db.exec(
      `update diary_entries
       set tmdb_id = $3,
           title = $4,
           watched_at = $5::date,
           location = $6,
           provider_key = $7,
           rating = $8,
           tags = $9::jsonb,
           note = $10,
           updated_at = now()
       where user_id = $1 and id = $2`,
      [
        userId,
        id,
        input.tmdbId,
        input.title,
        input.watchedAt,
        input.location,
        input.providerKey,
        input.rating,
        input.tags ? JSON.stringify([...input.tags]) : null,
        input.note,
      ],
    );
  }

  async remove(userId: string, id: string): Promise<void> {
    await this.db.exec(
      `delete from diary_entries where user_id = $1 and id = $2`,
      [userId, id],
    );
  }

  async stats(
    userId: string,
    year: number,
  ): Promise<{
    year: number;
    total: number;
    ratedCount: number;
    avgRating: number | null;
    byLocation: { cinema: number; streaming: number; home: number };
    topTags: { tag: string; count: number }[];
  }> {
    const y = Math.trunc(year);
    const from = `${y}-01-01`;
    const to = `${y}-12-31`;

    const [base] = await this.db.query<DiaryStatsRow>(
      `
      select
        count(*)::int as total,
        count(rating)::int as rated_count,
        avg(rating)::float as avg_rating,
        sum(case when location = 'cinema' then 1 else 0 end)::int as cinema_count,
        sum(case when location = 'streaming' then 1 else 0 end)::int as streaming_count,
        sum(case when location = 'home' then 1 else 0 end)::int as home_count
      from diary_entries
      where user_id = $1 and watched_at >= $2::date and watched_at <= $3::date
      `,
      [userId, from, to],
    );

    const tags = await this.db.query<{ tag: string; count: number }>(
      `
      select
        t.tag as tag,
        count(*)::int as count
      from diary_entries e
      cross join lateral jsonb_array_elements_text(coalesce(e.tags, '[]'::jsonb)) as t(tag)
      where e.user_id = $1 and e.watched_at >= $2::date and e.watched_at <= $3::date
      group by t.tag
      order by count desc, tag asc
      limit 10
      `,
      [userId, from, to],
    );

    const avg =
      typeof base?.avg_rating === 'number' && Number.isFinite(base.avg_rating)
        ? Math.round(base.avg_rating * 10) / 10
        : null;

    return {
      year: y,
      total: base?.total ?? 0,
      ratedCount: base?.rated_count ?? 0,
      avgRating: avg,
      byLocation: {
        cinema: base?.cinema_count ?? 0,
        streaming: base?.streaming_count ?? 0,
        home: base?.home_count ?? 0,
      },
      topTags: tags.map((r) => ({ tag: r.tag, count: r.count })),
    };
  }
}
