import { ConflictException, Injectable } from '@nestjs/common';

import { DbService } from '../db/db.service';

type WatchRow = {
  tmdb_id: number;
  status: 'want' | 'watching' | 'watched' | 'dropped' | 'hidden';
  progress: unknown;
  updated_at: string;
};

@Injectable()
export class WatchStateService {
  constructor(private readonly db: DbService) {}

  async list(userId: string) {
    const rows = await this.db.query<WatchRow>(
      `select tmdb_id, status, progress, updated_at
       from watch_state
       where user_id = $1
       order by updated_at desc`,
      [userId],
    );
    return rows.map((r) => ({
      tmdbId: r.tmdb_id,
      status: r.status,
      progress: r.progress ?? null,
      updatedAt: r.updated_at,
    }));
  }

  async put(
    userId: string,
    tmdbId: number,
    input: {
      status: WatchRow['status'];
      progress: unknown;
      ifUnmodifiedSince?: string | null;
    },
  ) {
    if (input.ifUnmodifiedSince) {
      const existing = await this.db.query<{ updated_at: string }>(
        `select updated_at from watch_state where user_id = $1 and tmdb_id = $2`,
        [userId, tmdbId],
      );
      const cur = existing[0]?.updated_at;
      if (
        cur &&
        new Date(cur).getTime() > new Date(input.ifUnmodifiedSince).getTime()
      ) {
        throw new ConflictException('Watch state has been updated');
      }
    }

    const rows = await this.db.query<{ updated_at: string }>(
      `insert into watch_state(user_id, tmdb_id, status, progress)
       values ($1, $2, $3, $4::jsonb)
       on conflict (user_id, tmdb_id)
       do update set status = excluded.status, progress = excluded.progress, updated_at = now()
       returning updated_at`,
      [
        userId,
        tmdbId,
        input.status,
        input.progress ? JSON.stringify(input.progress) : null,
      ],
    );

    return { updatedAt: rows[0]?.updated_at ?? new Date().toISOString() };
  }

  async bulkPut(
    userId: string,
    items: Array<{
      tmdbId: number;
      status: WatchRow['status'];
      progress: unknown;
    }>,
  ): Promise<{ items: { tmdbId: number; updatedAt: string }[] }> {
    const out: { tmdbId: number; updatedAt: string }[] = [];
    for (const it of items) {
      const row = await this.put(userId, it.tmdbId, {
        status: it.status,
        progress: it.progress ?? null,
      });
      out.push({ tmdbId: it.tmdbId, updatedAt: row.updatedAt });
    }
    return { items: out };
  }

  async remove(userId: string, tmdbId: number): Promise<void> {
    await this.db.exec(
      `delete from watch_state where user_id = $1 and tmdb_id = $2`,
      [userId, tmdbId],
    );
  }
}
