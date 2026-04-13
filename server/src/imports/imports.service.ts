import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
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
  constructor(
    private readonly db: DbService,
    private readonly config: ConfigService,
  ) {}

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
    conflictRows: number;
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
      return {
        ok: true,
        totalRows: 0,
        okRows: 0,
        conflictRows: 0,
        errorRows: 0,
      };
    }

    await this.db.exec(`delete from import_job_rows where job_id = $1`, [id]);
    await this.db.exec(`delete from import_conflicts where job_id = $1`, [id]);

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

    // Worker-like step (MVP): resolve missing tmdbId for diary rows via TMDB search (rate-limited).
    // Optional dependency: if TMDB_API_KEY is not configured, we skip silently.
    const tmdbResolveStats = await this.resolveDiaryTmdbIds(collected);

    const existingWatch = new Map<
      number,
      { status: string; progress: unknown }
    >();
    if (r.kind === 'watch_state') {
      const existing = await this.db.query<{
        tmdb_id: number;
        status: string;
        progress: unknown;
      }>(
        `select tmdb_id, status, progress
         from watch_state
         where user_id = $1`,
        [userId],
      );
      for (const e of existing) {
        existingWatch.set(Number(e.tmdb_id), {
          status: e.status,
          progress: e.progress ?? null,
        });
      }
    }

    let okRows = 0;
    let conflictRows = 0;
    let errorRows = 0;
    for (let i = 0; i < collected.length; i++) {
      const it = collected[i];
      let rowStatus: 'ok' | 'error' | 'conflict' =
        it.status === 'ok' ? 'ok' : 'error';

      if (rowStatus === 'ok' && r.kind === 'watch_state') {
        const tmdbId = (it.mapped as { tmdbId?: number } | null)?.tmdbId;
        if (typeof tmdbId === 'number') {
          const server = existingWatch.get(tmdbId);
          if (server) {
            const incoming = it.mapped ?? null;
            const serverComparable = {
              tmdbId,
              status: server.status,
              progress: server.progress ?? null,
            };
            if (JSON.stringify(serverComparable) !== JSON.stringify(incoming)) {
              rowStatus = 'conflict';
              await this.db.exec(
                `insert into import_conflicts(job_id, entity, key, server, incoming, resolution)
                 values ($1, $2, $3, $4::jsonb, $5::jsonb, null)`,
                [
                  id,
                  'watch_state',
                  String(tmdbId),
                  JSON.stringify(serverComparable),
                  JSON.stringify(incoming),
                ],
              );
            }
          }
        }
      }

      if (rowStatus === 'ok') okRows++;
      else if (rowStatus === 'conflict') conflictRows++;
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
        JSON.stringify({
          totalRows: collected.length,
          okRows,
          conflictRows,
          errorRows,
          tmdbResolved: tmdbResolveStats.resolved,
          tmdbResolveAttempts: tmdbResolveStats.attempted,
          tmdbResolveSkipped: tmdbResolveStats.skipped,
        }),
      ],
    );

    return {
      ok: true,
      totalRows: collected.length,
      okRows,
      conflictRows,
      errorRows,
    };
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
      rowN: number | null;
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
      row_n: number | null;
      server: unknown;
      incoming: unknown;
      resolution: unknown;
      created_at: string;
    }>(
      `select c.id, c.entity, c.key,
              r.row_n,
              c.server, c.incoming, c.resolution, c.created_at
       from import_conflicts c
       left join import_job_rows r
         on r.job_id = c.job_id
        and r.status = 'conflict'
        and (r.mapped->>'tmdbId') = c.key
       where c.job_id = $1
       order by c.created_at asc
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
        rowN: r.row_n,
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

    if (
      input.status === 'ok' &&
      input.mapped &&
      typeof input.mapped === 'object'
    ) {
      const tmdbId = (input.mapped as { tmdbId?: unknown }).tmdbId;
      if (typeof tmdbId === 'number' && Number.isFinite(tmdbId) && tmdbId > 0) {
        await this.db.exec(
          `update import_conflicts
           set resolution = $3::jsonb
           where job_id = $1 and entity = 'watch_state' and key = $2 and resolution is null`,
          [id, String(tmdbId), JSON.stringify(input.mapped)],
        );
      }
    }

    return { ok: true };
  }

  private async resolveDiaryTmdbIds(
    collected: {
      raw: unknown;
      mapped: unknown;
      status: 'ok' | 'error';
      error?: string;
    }[],
  ): Promise<{ attempted: number; resolved: number; skipped: number }> {
    // Only useful for diary rows where tmdbId may be missing.
    const apiKey = (this.config.get<string>('TMDB_API_KEY') ?? '').trim();
    if (!apiKey)
      return { attempted: 0, resolved: 0, skipped: collected.length };

    const baseUrl = (
      this.config.get<string>('TMDB_BASE_URL') ?? 'https://api.themoviedb.org/3'
    )
      .trim()
      .replace(/\/+$/, '');

    const cache = new Map<string, number | null>();
    let attempted = 0;
    let resolved = 0;
    let skipped = 0;
    let lastFetchAt = 0;

    for (const row of collected) {
      if (row.status !== 'ok') {
        skipped++;
        continue;
      }

      const mapped = row.mapped as
        | { tmdbId?: unknown; title?: unknown }
        | null
        | undefined;
      if (!mapped || typeof mapped !== 'object') {
        skipped++;
        continue;
      }

      const tmdbId = mapped.tmdbId;
      const title = mapped.title;
      if (typeof tmdbId === 'number' && Number.isFinite(tmdbId) && tmdbId > 0) {
        skipped++;
        continue;
      }
      if (typeof title !== 'string' || !title.trim()) {
        skipped++;
        continue;
      }

      // Optional year hint comes from Letterboxd CSV raw row.
      const year =
        typeof (row.raw as { year?: unknown } | null)?.year === 'number'
          ? ((row.raw as { year?: unknown }).year as number)
          : null;

      const cacheKey = `${title.trim().toLowerCase()}|${year ?? ''}`;
      attempted++;

      let found = cache.get(cacheKey);
      if (found === undefined) {
        const now = Date.now();
        const minGapMs = 250;
        const waitMs = Math.max(0, minGapMs - (now - lastFetchAt));
        if (waitMs > 0) await sleep(waitMs);

        found = await this.tmdbSearchMovieId(baseUrl, apiKey, title, year);
        cache.set(cacheKey, found);
        lastFetchAt = Date.now();
      }

      if (typeof found === 'number' && found > 0) {
        (mapped as Record<string, unknown>).tmdbId = found;
        resolved++;
      }
    }

    return { attempted, resolved, skipped };
  }

  private async tmdbSearchMovieId(
    baseUrl: string,
    apiKey: string,
    title: string,
    year: number | null,
  ): Promise<number | null> {
    const url = new URL(`${baseUrl}/search/movie`);
    url.searchParams.set('api_key', apiKey);
    url.searchParams.set('query', title);
    url.searchParams.set('include_adult', 'false');
    if (typeof year === 'number' && Number.isFinite(year) && year > 1800) {
      url.searchParams.set('year', String(Math.trunc(year)));
    }

    const res = await fetch(url.toString(), {
      headers: { accept: 'application/json' },
    });
    if (!res.ok) return null;
    const json = (await res.json()) as unknown;

    const parsed = z
      .object({
        results: z
          .array(z.object({ id: z.number().int().positive() }).passthrough())
          .default([]),
      })
      .passthrough()
      .safeParse(json);
    if (!parsed.success) return null;
    return parsed.data.results[0]?.id ?? null;
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

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
