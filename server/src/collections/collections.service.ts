import { Injectable } from '@nestjs/common';

import { DbService } from '../db/db.service';

type CollectionRow = {
  id: string;
  name: string;
  description: string | null;
  visibility: 'private' | 'unlisted' | 'public';
  created_at: string;
  updated_at: string;
};

type ItemRow = {
  id: string;
  collection_id: string;
  tmdb_id: number | null;
  title: string;
  note: string | null;
  created_at: string;
};

@Injectable()
export class CollectionsService {
  constructor(private readonly db: DbService) {}

  async list(userId: string) {
    const cols = await this.db.query<CollectionRow>(
      `select id, name, description, visibility, created_at, updated_at
       from collections
       where user_id = $1
       order by updated_at desc`,
      [userId],
    );

    const items = await this.db.query<ItemRow>(
      `select i.id, i.collection_id, i.tmdb_id, i.title, i.note, i.created_at
       from collection_items i
       join collections c on c.id = i.collection_id
       where c.user_id = $1
       order by i.created_at desc`,
      [userId],
    );

    const byCollection = new Map<string, ItemRow[]>();
    for (const it of items) {
      const arr = byCollection.get(it.collection_id) ?? [];
      arr.push(it);
      byCollection.set(it.collection_id, arr);
    }

    return cols.map((c) => ({
      id: c.id,
      name: c.name,
      description: c.description,
      visibility: c.visibility,
      items: (byCollection.get(c.id) ?? []).map((it) => ({
        id: it.id,
        tmdbId: it.tmdb_id,
        title: it.title,
        note: it.note,
        createdAt: it.created_at,
      })),
      createdAt: c.created_at,
      updatedAt: c.updated_at,
    }));
  }

  async upsert(
    userId: string,
    input: {
      id?: string;
      name: string;
      description: string | null;
      visibility: 'private' | 'unlisted' | 'public';
    },
  ) {
    const rows = await this.db.query<{ id: string }>(
      `insert into collections(id, user_id, name, description, visibility)
       values (coalesce($1::uuid, gen_random_uuid()), $2::uuid, $3, $4, $5)
       on conflict (id)
       do update set
         name = excluded.name,
         description = excluded.description,
         visibility = excluded.visibility,
         updated_at = now()
       where collections.user_id = excluded.user_id
       returning id`,
      [
        input.id ?? null,
        userId,
        input.name,
        input.description,
        input.visibility,
      ],
    );
    return { id: rows[0]?.id ?? '' };
  }

  async remove(userId: string, id: string): Promise<void> {
    await this.db.exec(
      `delete from collections where user_id = $1 and id = $2`,
      [userId, id],
    );
  }

  async addItem(
    userId: string,
    collectionId: string,
    input: { tmdbId: number | null; title: string; note: string | null },
  ) {
    const rows = await this.db.query<{ id: string }>(
      `insert into collection_items(collection_id, tmdb_id, title, note)
       select c.id, $2, $3, $4
       from collections c
       where c.user_id = $1 and c.id = $5
       returning id`,
      [userId, input.tmdbId, input.title, input.note, collectionId],
    );
    return { id: rows[0]?.id ?? '' };
  }

  async removeItem(
    userId: string,
    collectionId: string,
    itemId: string,
  ): Promise<void> {
    await this.db.exec(
      `delete from collection_items i
       using collections c
       where i.collection_id = c.id
         and c.user_id = $1
         and c.id = $2
         and i.id = $3`,
      [userId, collectionId, itemId],
    );
  }
}
