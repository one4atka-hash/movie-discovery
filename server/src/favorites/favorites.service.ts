import { Injectable } from '@nestjs/common';

import { DbService } from '../db/db.service';

type FavoriteRow = { tmdb_id: number; created_at: string };

@Injectable()
export class FavoritesService {
  constructor(private readonly db: DbService) {}

  async list(userId: string): Promise<{ tmdbId: number; createdAt: string }[]> {
    const rows = await this.db.query<FavoriteRow>(
      `select tmdb_id, created_at
       from favorites
       where user_id = $1
       order by created_at desc`,
      [userId]
    );
    return rows.map((r) => ({ tmdbId: r.tmdb_id, createdAt: r.created_at }));
  }

  async add(userId: string, tmdbId: number): Promise<void> {
    await this.db.exec(
      `insert into favorites(user_id, tmdb_id)
       values ($1, $2)
       on conflict do nothing`,
      [userId, tmdbId]
    );
  }

  async remove(userId: string, tmdbId: number): Promise<void> {
    await this.db.exec(`delete from favorites where user_id = $1 and tmdb_id = $2`, [userId, tmdbId]);
  }
}

