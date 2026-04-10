import { Injectable } from '@nestjs/common';

import { DbService } from '../db/db.service';

type SubRow = {
  id: string;
  tmdb_id: number;
  media_type: 'movie';
  release_date: string;
  channels: Record<string, boolean>;
  created_at: string;
  last_notified_at: string | null;
};

@Injectable()
export class SubscriptionsService {
  constructor(private readonly db: DbService) {}

  async list(userId: string): Promise<
    {
      id: string;
      tmdbId: number;
      mediaType: 'movie';
      releaseDate: string;
      channels: Record<string, boolean>;
      createdAt: string;
      lastNotifiedAt: string | null;
    }[]
  > {
    const rows = await this.db.query<SubRow>(
      `select id, tmdb_id, media_type, release_date::text as release_date, channels, created_at, last_notified_at
       from release_subscriptions
       where user_id = $1
       order by release_date asc`,
      [userId]
    );
    return rows.map((r) => ({
      id: r.id,
      tmdbId: r.tmdb_id,
      mediaType: r.media_type,
      releaseDate: r.release_date,
      channels: r.channels,
      createdAt: r.created_at,
      lastNotifiedAt: r.last_notified_at
    }));
  }

  async upsert(
    userId: string,
    input: { tmdbId: number; mediaType: 'movie'; releaseDate: string; channels: Record<string, boolean> }
  ): Promise<{ id: string }> {
    const rows = await this.db.query<{ id: string }>(
      `insert into release_subscriptions(user_id, tmdb_id, media_type, release_date, channels)
       values ($1, $2, $3, $4::date, $5::jsonb)
       on conflict (user_id, tmdb_id, media_type)
       do update set release_date = excluded.release_date, channels = excluded.channels
       returning id`,
      [userId, input.tmdbId, input.mediaType, input.releaseDate, JSON.stringify(input.channels)]
    );
    return { id: rows[0].id };
  }

  async remove(userId: string, id: string): Promise<void> {
    await this.db.exec(`delete from release_subscriptions where id = $1 and user_id = $2`, [id, userId]);
  }
}

