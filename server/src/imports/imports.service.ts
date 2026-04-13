import { Injectable, NotFoundException } from '@nestjs/common';
import { z } from 'zod';

import { DbService } from '../db/db.service';
import { parseLetterboxdDiaryCsv } from './csv/letterboxd-diary.util';

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

const ImportMappedDiaryItemSchema = z
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
  .strict();

const ImportMappedWatchStateItemSchema = z
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
  .strict();

const ImportMappedFavoriteItemSchema = z
  .object({
    tmdbId: z.number().int().positive(),
  })
  .strict();

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

    const previewRows = await this.db.query<{
      mapped: unknown;
    }>(
      `select mapped
       from import_job_rows
       where job_id = $1 and status = 'ok'
       order by row_n asc`,
      [id],
    );

    const canApplyFromPreview = previewRows.length > 0;
    if (!canApplyFromPreview && (!r.payload || !r.payload.trim())) {
      await this.db.exec(
        `update import_jobs set status = 'failed', error = 'Missing payload', updated_at = now()
         where id = $1 and user_id = $2`,
        [id, userId],
      );
      return { ok: true };
    }

    const payload = r.payload ?? '';

    if (canApplyFromPreview && r.kind === 'diary') {
      const mappedItems: z.infer<typeof ImportMappedDiaryItemSchema>[] = [];
      for (const pr of previewRows) {
        const parsed = ImportMappedDiaryItemSchema.safeParse(pr.mapped);
        if (!parsed.success) continue;
        mappedItems.push(parsed.data);
      }

      for (const it of mappedItems) {
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
        [
          id,
          userId,
          JSON.stringify({
            kind: 'diary_preview',
            items: mappedItems.length,
          }),
        ],
      );

      return { ok: true };
    }

    if (canApplyFromPreview && r.kind === 'watch_state') {
      const mappedItems: z.infer<typeof ImportMappedWatchStateItemSchema>[] =
        [];
      for (const pr of previewRows) {
        const parsed = ImportMappedWatchStateItemSchema.safeParse(pr.mapped);
        if (!parsed.success) continue;
        mappedItems.push(parsed.data);
      }

      for (const it of mappedItems) {
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
          JSON.stringify({
            kind: 'watch_state_preview',
            items: mappedItems.length,
          }),
        ],
      );

      return { ok: true };
    }

    if (canApplyFromPreview && r.kind === 'favorites') {
      const mappedItems: z.infer<typeof ImportMappedFavoriteItemSchema>[] = [];
      for (const pr of previewRows) {
        const parsed = ImportMappedFavoriteItemSchema.safeParse(pr.mapped);
        if (!parsed.success) continue;
        mappedItems.push(parsed.data);
      }

      for (const it of mappedItems) {
        await this.db.exec(
          `insert into favorites(user_id, tmdb_id)
           values ($1, $2)
           on conflict (user_id, tmdb_id) do nothing`,
          [userId, it.tmdbId],
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
          JSON.stringify({
            kind: 'favorites_preview',
            items: mappedItems.length,
          }),
        ],
      );

      return { ok: true };
    }

    if (r.kind === 'diary' && r.format === 'json') {
      const parsed = ImportDiaryJsonSchema.safeParse(safeJsonParse(payload));
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

    if (r.kind === 'diary' && r.format === 'csv') {
      const rows = parseLetterboxdDiaryCsv(payload);
      if (rows.length === 0) {
        await this.db.exec(
          `update import_jobs set status = 'failed', error = 'Unsupported diary CSV', updated_at = now()
           where id = $1 and user_id = $2`,
          [id, userId],
        );
        return { ok: true };
      }

      for (const it of rows) {
        await this.db.exec(
          `insert into diary_entries(user_id, tmdb_id, title, watched_at, location, provider_key, rating, tags, note)
           values ($1, $2, $3, $4::date, $5, $6, $7, $8::jsonb, $9)`,
          [
            userId,
            null,
            it.title,
            it.watchedAt,
            'home',
            null,
            it.rating10,
            it.tags.length ? JSON.stringify(it.tags) : null,
            null,
          ],
        );
      }

      await this.db.exec(
        `update import_jobs
         set status = 'applied', error = null,
             meta = jsonb_set(coalesce(meta, '{}'::jsonb), '{applied}', $3::jsonb, true),
             updated_at = now()
         where id = $1 and user_id = $2`,
        [id, userId, JSON.stringify({ kind: 'diary_csv', items: rows.length })],
      );

      return { ok: true };
    }

    if (r.kind === 'watch_state' && r.format === 'json') {
      const parsed = ImportWatchStateJsonSchema.safeParse(
        safeJsonParse(payload),
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

    if (r.kind === 'favorites' && r.format === 'json') {
      const parsed = ImportFavoritesJsonSchema.safeParse(
        safeJsonParse(payload),
      );
      if (!parsed.success) {
        await this.db.exec(
          `update import_jobs set status = 'failed', error = 'Invalid favorites JSON', updated_at = now()
           where id = $1 and user_id = $2`,
          [id, userId],
        );
        return { ok: true };
      }

      const items = parsed.data.items;
      for (const tmdbId of items) {
        await this.db.exec(
          `insert into favorites(user_id, tmdb_id)
           values ($1, $2)
           on conflict (user_id, tmdb_id) do nothing`,
          [userId, tmdbId],
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
          JSON.stringify({ kind: 'favorites', items: items.length }),
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

  async preview(
    userId: string,
    id: string,
  ): Promise<{
    ok: true;
    totalRows: number;
    okRows: number;
    errorRows: number;
  }> {
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
      return { ok: true, totalRows: 0, okRows: 0, errorRows: 0 };
    }

    await this.db.exec(`delete from import_job_rows where job_id = $1`, [id]);

    const collected: {
      raw: unknown;
      mapped: unknown;
      status: 'ok' | 'error';
      error?: string;
    }[] = [];

    if (r.kind === 'diary' && r.format === 'json') {
      const parsed = ImportDiaryJsonSchema.safeParse(safeJsonParse(r.payload));
      if (!parsed.success) {
        collected.push({
          raw: null,
          mapped: null,
          status: 'error',
          error: 'Invalid diary JSON',
        });
      } else {
        for (const it of parsed.data.items) {
          collected.push({
            raw: it,
            mapped: {
              tmdbId: it.tmdbId ?? null,
              title: it.title,
              watchedAt: it.watchedAt,
              location: it.location,
              providerKey: it.providerKey ?? null,
              rating: it.rating ?? null,
              tags: it.tags ?? [],
              note: it.note ?? null,
            },
            status: 'ok',
          });
        }
      }
    } else if (r.kind === 'diary' && r.format === 'csv') {
      const parsed = parseLetterboxdDiaryCsv(r.payload);
      if (!parsed.length) {
        collected.push({
          raw: null,
          mapped: null,
          status: 'error',
          error: 'Unsupported diary CSV',
        });
      } else {
        for (const it of parsed) {
          collected.push({
            raw: it,
            mapped: {
              tmdbId: null,
              title: it.title,
              watchedAt: it.watchedAt,
              location: 'home',
              providerKey: null,
              rating: it.rating10,
              tags: it.tags,
              note: null,
            },
            status: 'ok',
          });
        }
      }
    } else if (r.kind === 'watch_state' && r.format === 'json') {
      const parsed = ImportWatchStateJsonSchema.safeParse(
        safeJsonParse(r.payload),
      );
      if (!parsed.success) {
        collected.push({
          raw: null,
          mapped: null,
          status: 'error',
          error: 'Invalid watch_state JSON',
        });
      } else {
        for (const it of parsed.data.items) {
          collected.push({
            raw: it,
            mapped: {
              tmdbId: it.tmdbId,
              status: it.status,
              progress: it.progress ?? null,
            },
            status: 'ok',
          });
        }
      }
    } else if (r.kind === 'favorites' && r.format === 'json') {
      const parsed = ImportFavoritesJsonSchema.safeParse(
        safeJsonParse(r.payload),
      );
      if (!parsed.success) {
        collected.push({
          raw: null,
          mapped: null,
          status: 'error',
          error: 'Invalid favorites JSON',
        });
      } else {
        for (const tmdbId of parsed.data.items) {
          collected.push({
            raw: tmdbId,
            mapped: { tmdbId },
            status: 'ok',
          });
        }
      }
    } else {
      collected.push({
        raw: null,
        mapped: null,
        status: 'error',
        error: 'Unsupported import kind/format',
      });
    }

    let okRows = 0;
    let errorRows = 0;
    for (let i = 0; i < collected.length; i++) {
      const it = collected[i];
      const rowStatus = it.status === 'ok' ? 'ok' : 'error';
      if (it.status === 'ok') okRows++;
      else errorRows++;
      await this.db.exec(
        `insert into import_job_rows(job_id, row_n, raw, mapped, status, error)
         values ($1, $2, $3::jsonb, $4::jsonb, $5, $6)`,
        [
          id,
          i + 1,
          it.raw ? JSON.stringify(it.raw) : null,
          it.mapped ? JSON.stringify(it.mapped) : null,
          rowStatus,
          it.error ?? null,
        ],
      );
    }

    await this.db.exec(
      `update import_jobs
       set status = 'preview', error = null,
           meta = jsonb_set(coalesce(meta, '{}'::jsonb), '{preview}', $3::jsonb, true),
           updated_at = now()
       where id = $1 and user_id = $2`,
      [
        id,
        userId,
        JSON.stringify({ totalRows: collected.length, okRows, errorRows }),
      ],
    );

    return { ok: true, totalRows: collected.length, okRows, errorRows };
  }

  async rows(
    userId: string,
    id: string,
    input: { offset: number; limit: number },
  ): Promise<{
    ok: true;
    offset: number;
    limit: number;
    total: number;
    rows: {
      rowN: number;
      status: 'pending' | 'ok' | 'conflict' | 'error';
      mapped: unknown;
      error: string | null;
    }[];
  }> {
    const jobs = await this.db.query<Pick<ImportJobRow, 'id'>>(
      `select id from import_jobs where id = $1 and user_id = $2`,
      [id, userId],
    );
    if (!jobs[0]) throw new NotFoundException('Import job not found');

    const totalRows = await this.db.query<{ total: number }>(
      `select count(*)::int as total from import_job_rows where job_id = $1`,
      [id],
    );
    const total = totalRows[0]?.total ?? 0;

    const rows = await this.db.query<{
      row_n: number;
      status: 'pending' | 'ok' | 'conflict' | 'error';
      mapped: unknown;
      error: string | null;
    }>(
      `select row_n, status, mapped, error
       from import_job_rows
       where job_id = $1
       order by row_n asc
       offset $2
       limit $3`,
      [id, input.offset, input.limit],
    );

    return {
      ok: true,
      offset: input.offset,
      limit: input.limit,
      total,
      rows: rows.map((r) => ({
        rowN: r.row_n,
        status: r.status,
        mapped: r.mapped ?? null,
        error: r.error,
      })),
    };
  }

  async conflicts(
    userId: string,
    id: string,
    input: { offset: number; limit: number },
  ): Promise<{
    ok: true;
    offset: number;
    limit: number;
    total: number;
    conflicts: {
      id: string;
      entity: string;
      key: string;
      server: unknown;
      incoming: unknown;
      resolution: unknown;
      createdAt: string;
    }[];
  }> {
    const jobs = await this.db.query<Pick<ImportJobRow, 'id'>>(
      `select id from import_jobs where id = $1 and user_id = $2`,
      [id, userId],
    );
    if (!jobs[0]) throw new NotFoundException('Import job not found');

    const totalRows = await this.db.query<{ total: number }>(
      `select count(*)::int as total from import_conflicts where job_id = $1`,
      [id],
    );
    const total = totalRows[0]?.total ?? 0;

    const rows = await this.db.query<{
      id: string;
      entity: string;
      key: string;
      server: unknown;
      incoming: unknown;
      resolution: unknown;
      created_at: string;
    }>(
      `select id, entity, key, server, incoming, resolution, created_at
       from import_conflicts
       where job_id = $1
       order by created_at asc
       offset $2
       limit $3`,
      [id, input.offset, input.limit],
    );

    return {
      ok: true,
      offset: input.offset,
      limit: input.limit,
      total,
      conflicts: rows.map((r) => ({
        id: r.id,
        entity: r.entity,
        key: r.key,
        server: r.server ?? null,
        incoming: r.incoming ?? null,
        resolution: r.resolution ?? null,
        createdAt: r.created_at,
      })),
    };
  }

  async resolveRow(
    userId: string,
    id: string,
    rowN: number,
    input: {
      status?: 'pending' | 'ok' | 'conflict' | 'error';
      mapped?: unknown;
      error?: string | null;
    },
  ): Promise<{ ok: true }> {
    const jobs = await this.db.query<Pick<ImportJobRow, 'id'>>(
      `select id from import_jobs where id = $1 and user_id = $2`,
      [id, userId],
    );
    if (!jobs[0]) throw new NotFoundException('Import job not found');

    const existing = await this.db.query<{ job_id: string }>(
      `select job_id from import_job_rows where job_id = $1 and row_n = $2`,
      [id, rowN],
    );
    if (!existing[0]) throw new NotFoundException('Import row not found');

    const setParts: string[] = [];
    const params: unknown[] = [id, rowN];
    let n = 2;

    if (input.status !== undefined) {
      n++;
      setParts.push(`status = $${n}`);
      params.push(input.status);
    }
    if (input.mapped !== undefined) {
      n++;
      setParts.push(`mapped = $${n}::jsonb`);
      params.push(input.mapped === null ? null : JSON.stringify(input.mapped));
    }
    if (input.error !== undefined) {
      n++;
      setParts.push(`error = $${n}`);
      params.push(input.error ?? null);
    }

    if (setParts.length === 0) return { ok: true };

    await this.db.exec(
      `update import_job_rows
       set ${setParts.join(', ')}
       where job_id = $1 and row_n = $2`,
      params,
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

const ImportFavoritesJsonSchema = z.object({
  items: z.array(z.number().int().positive()).max(5000),
});

function safeJsonParse(s: string): unknown {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}
