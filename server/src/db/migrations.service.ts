import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool } from 'pg';
import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';

type AppliedRow = { name: string; sha256: string };

@Injectable()
export class MigrationsService implements OnModuleInit {
  constructor(
    private readonly pool: Pool,
    private readonly config: ConfigService,
  ) {}

  async onModuleInit(): Promise<void> {
    const enabled = (
      this.config.get<string>('DB_RUN_MIGRATIONS') ?? ''
    ).toLowerCase();
    if (!['1', 'true', 'yes', 'on'].includes(enabled)) return;
    await this.run();
  }

  private async run(): Promise<void> {
    await this.pool.query(`
      create table if not exists schema_migrations (
        name text primary key,
        sha256 text not null,
        applied_at timestamptz not null default now()
      );
    `);

    // Prefer explicit path; fallback to /app/migrations in container and then to cwd.
    const dir =
      this.config.get<string>('MIGRATIONS_DIR') ||
      path.resolve(__dirname, '..', '..', 'migrations');
    if (!fs.existsSync(dir)) return;
    const files = fs
      .readdirSync(dir)
      .filter((f) => f.endsWith('.sql'))
      .sort((a, b) => a.localeCompare(b));

    const lockKey = 9_740_313; // arbitrary constant for this app
    await this.pool.query('select pg_advisory_lock($1)', [lockKey]);
    try {
      const applied = await this.pool.query<AppliedRow>(
        'select name, sha256 from schema_migrations',
      );
      const appliedMap = new Map(applied.rows.map((r) => [r.name, r.sha256]));

      for (const f of files) {
        const full = path.join(dir, f);
        const sql = fs.readFileSync(full, 'utf8');
        const sha256 = crypto
          .createHash('sha256')
          .update(sql, 'utf8')
          .digest('hex');

        const already = appliedMap.get(f);
        if (already) {
          if (already !== sha256) {
            throw new Error(`Migration checksum changed for ${f}`);
          }
          continue;
        }

        const client = await this.pool.connect();
        try {
          await client.query('begin');
          await client.query(sql);
          await client.query(
            'insert into schema_migrations(name, sha256) values($1, $2)',
            [f, sha256],
          );
          await client.query('commit');
        } catch (e) {
          await client.query('rollback');
          throw e;
        } finally {
          client.release();
        }
      }
    } finally {
      await this.pool.query('select pg_advisory_unlock($1)', [lockKey]);
    }
  }
}
