import { Injectable } from '@nestjs/common';

import { DbService } from '../db/db.service';

type PrefsRow = { region: string; providers: unknown };

@Injectable()
export class MeService {
  constructor(private readonly db: DbService) {}

  async getStreamingPrefs(
    userId: string,
  ): Promise<{ region: string; providers: string[] }> {
    const rows = await this.db.query<PrefsRow>(
      `select region, providers
       from user_streaming_prefs
       where user_id = $1`,
      [userId],
    );
    const row = rows[0];
    if (!row) return { region: 'US', providers: [] };
    return {
      region: (row.region ?? 'US').toString().trim().toUpperCase(),
      providers: Array.isArray(row.providers)
        ? (row.providers as unknown[])
            .filter((x) => typeof x === 'string')
            .map((x) => x.trim())
            .filter(Boolean)
        : [],
    };
  }

  async putStreamingPrefs(
    userId: string,
    prefs: { region: string; providers: readonly string[] },
  ): Promise<void> {
    await this.db.exec(
      `insert into user_streaming_prefs(user_id, region, providers)
       values ($1, $2, $3::jsonb)
       on conflict (user_id)
       do update set region = excluded.region, providers = excluded.providers, updated_at = now()`,
      [userId, prefs.region, JSON.stringify([...prefs.providers])],
    );
  }
}
