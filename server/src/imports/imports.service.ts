import { Injectable, NotFoundException } from '@nestjs/common';

import { DbService } from '../db/db.service';

type ImportJobRow = {
  id: string;
  user_id: string;
  kind: 'diary' | 'watch_state' | 'favorites';
  format: 'json' | 'csv';
  status: 'created' | 'uploaded' | 'parsed' | 'preview' | 'applied' | 'failed';
  error: string | null;
  meta: unknown;
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
      `insert into import_jobs(user_id, kind, format, status, meta)
       values ($1, $2, $3, $4, $5::jsonb)
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
      ],
    );
    return { id: rows[0].id, createdAt: rows[0].created_at };
  }

  async get(userId: string, id: string) {
    const rows = await this.db.query<ImportJobRow>(
      `select id, user_id, kind, format, status, error, meta, created_at, updated_at
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
}
