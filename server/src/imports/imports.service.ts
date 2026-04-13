import { Injectable, NotFoundException } from '@nestjs/common';
import { z } from 'zod';

import { DbService } from '../db/db.service';

type ImportJobRow = {
  id: string;
  user_id: string;
  kind: 'diary' | 'watch_state' | 'favorites';
  format: 'json' | 'csv';
  status: 'created' | 'uploaded' | 'parsed' | 'preview' | 'applied' | 'failed';
  error: string | null;
  meta: unknown;
  payload: string | null;
  created_at: string;
  updated_at: string;
};

@Injectable()
export class ImportsService {
  constructor(private readonly db: DbService) {}

  async create(
    userId: string,
    input: {
      kind: ImportJobRow['kind'];
      format: ImportJobRow['format'];
      payload?: string | null;
    },
  ) {
    const rows = await this.db.query<{ id: string; created_at: string }>(
      `insert into import_jobs(user_id, kind, format, status, meta, payload)
       values ($1, $2, $3, $4, $5::jsonb, $6)
       returning id, created_at`,
      [
        userId,
        input.kind,
        input.format,
        input.payload ? 'uploaded' : 'created',
        JSON.stringify({
          hasPayload: Boolean(input.payload),
          bytes: input.payload?.length ?? 0,
        }),
        input.payload ?? null,
      ],
    );
    return { id: rows[0].id, createdAt: rows[0].created_at };
  }

  async get(userId: string, id: string) {
    const rows = await this.db.query<ImportJobRow>(
      `select id, user_id, kind, format, status, error, meta, payload, created_at, updated_at
       from import_jobs
       where id = $1 and user_id = $2`,
      [id, userId],
    );
    const r = rows[0];
    if (!r) throw new NotFoundException('Import job not found');
    return {
      id: r.id,
      kind: r.kind,
      format: r.format,
      status: r.status,
      error: r.error,
      meta: r.meta ?? null,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    };
  }

  async apply(userId: string, id: string): Promise<{ ok: true }> {
    const rows = await this.db.query<ImportJobRow>(
      `select id, user_id, kind, format, status, error, meta, payload, created_at, updated_at
       from import_jobs
       where id = $1 and user_id = $2`,
      [id, userId],
    );
    const r = rows[0];
    if (!r) throw new NotFoundException('Import job not found');

    if (!r.payload || !r.payload.trim()) {
      await this.db.exec(
        `update import_jobs set status = 'failed', error = 'Missing payload', updated_at = now()
         where id = $1 and user_id = $2`,
        [id, userId],
      );
      return { ok: true };
    }

    if (r.kind === 'diary' && r.format === 'json') {
      const parsed = ImportDiaryJsonSchema.safeParse(safeJsonParse(r.payload));
      if (!parsed.success) {
        await this.db.exec(
          `update import_jobs set status = 'failed', error = 'Invalid diary JSON', updated_at = now()
           where id = $1 and user_id = $2`,
          [id, userId],
        );
        return { ok: true };
      }

      const items = parsed.data.items;
      for (const it of items) {
        await this.db.exec(
          `insert into diary_entries(user_id, tmdb_id, title, watched_at, location, provider_key, rating, tags, note)
           values ($1, $2, $3, $4::date, $5, $6, $7, $8::jsonb, $9)`,
          [
            userId,
            it.tmdbId ?? null,
            it.title,
            it.watchedAt,
            it.location,
            it.providerKey ?? null,
            it.rating ?? null,
            it.tags ? JSON.stringify(it.tags) : null,
            it.note ?? null,
          ],
        );
      }

      await this.db.exec(
        `update import_jobs
         set status = 'applied', error = null,
             meta = jsonb_set(coalesce(meta, '{}'::jsonb), '{applied}', $3::jsonb, true),
             updated_at = now()
         where id = $1 and user_id = $2`,
        [id, userId, JSON.stringify({ kind: 'diary', items: items.length })],
      );

      return { ok: true };
    }

    if (r.kind === 'watch_state' && r.format === 'json') {
      const parsed = ImportWatchStateJsonSchema.safeParse(
        safeJsonParse(r.payload),
      );
      if (!parsed.success) {
        await this.db.exec(
          `update import_jobs set status = 'failed', error = 'Invalid watch_state JSON', updated_at = now()
           where id = $1 and user_id = $2`,
          [id, userId],
        );
        return { ok: true };
      }

      const items = parsed.data.items;
      for (const it of items) {
        await this.db.exec(
          `insert into watch_state(user_id, tmdb_id, status, progress)
           values ($1, $2, $3, $4::jsonb)
           on conflict (user_id, tmdb_id)
           do update set status = excluded.status, progress = excluded.progress, updated_at = now()`,
          [
            userId,
            it.tmdbId,
            it.status,
            it.progress ? JSON.stringify(it.progress) : null,
          ],
        );
      }

      await this.db.exec(
        `update import_jobs
         set status = 'applied', error = null,
             meta = jsonb_set(coalesce(meta, '{}'::jsonb), '{applied}', $3::jsonb, true),
             updated_at = now()
         where id = $1 and user_id = $2`,
        [
          id,
          userId,
          JSON.stringify({ kind: 'watch_state', items: items.length }),
        ],
      );

      return { ok: true };
    }

    await this.db.exec(
      `update import_jobs
       set status = 'applied', error = null, updated_at = now()
       where id = $1 and user_id = $2`,
      [id, userId],
    );
    return { ok: true };
  }
}

const ImportDiaryJsonSchema = z.object({
  items: z
    .array(
      z
        .object({
          tmdbId: z.number().int().positive().optional().nullable(),
          title: z.string().trim().min(1).max(200),
          watchedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
          location: z.enum(['cinema', 'streaming', 'home']),
          providerKey: z.string().trim().max(80).optional().nullable(),
          rating: z.number().min(0).max(10).optional().nullable(),
          tags: z
            .array(z.string().trim().min(1).max(40))
            .max(30)
            .optional()
            .nullable(),
          note: z.string().max(2000).optional().nullable(),
        })
        .strict(),
    )
    .max(500),
});

const ImportWatchStateJsonSchema = z.object({
  items: z
    .array(
      z
        .object({
          tmdbId: z.number().int().positive(),
          status: z.enum(['want', 'watching', 'watched', 'dropped', 'hidden']),
          progress: z
            .object({
              minutes: z.number().int().nonnegative().optional().nullable(),
              pct: z.number().min(0).max(100).optional().nullable(),
            })
            .strict()
            .optional()
            .nullable(),
        })
        .strict(),
    )
    .max(2000),
});

function safeJsonParse(s: string): unknown {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}
