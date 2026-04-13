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
}
