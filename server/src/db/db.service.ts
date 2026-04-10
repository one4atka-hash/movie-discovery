import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { Pool } from 'pg';

@Injectable()
export class DbService implements OnModuleDestroy {
  constructor(private readonly pool: Pool) {}

  async query<T = unknown>(sql: string, params: readonly unknown[] = []): Promise<T[]> {
    const res = await this.pool.query(sql, [...params]);
    return res.rows as T[];
  }

  async exec(sql: string, params: readonly unknown[] = []): Promise<void> {
    await this.pool.query(sql, [...params]);
  }

  async onModuleDestroy(): Promise<void> {
    await this.pool.end();
  }
}

