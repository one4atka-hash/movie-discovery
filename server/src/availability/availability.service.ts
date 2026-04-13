import { Injectable } from '@nestjs/common';

import { DbService } from '../db/db.service';
import {
  type AvailabilitySnapshot,
  diffAvailability,
} from './availability-diff.util';

function normRegion(v: string): string {
  const s = (v ?? '').trim().toUpperCase();
  return /^[A-Z]{2}$/.test(s) ? s : 'US';
}

function parseProviders(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((x): x is string => typeof x === 'string');
}

@Injectable()
export class AvailabilityService {
  constructor(private readonly db: DbService) {}

  async track(userId: string, tmdbId: number, region: string): Promise<void> {
    const r = normRegion(region);
    await this.db.exec(
      `insert into availability_track(user_id, tmdb_id, region)
       values ($1::uuid, $2, $3)
       on conflict do nothing`,
      [userId, tmdbId, r],
    );
  }

  /**
   * Upsert snapshot; if it differs from the previous snapshot, emit one event per tracking user.
   * Intended to be called by a cron/worker after fetching watch providers from TMDB.
   */
  async ingestSnapshot(input: {
    tmdbId: number;
    region: string;
    providers: string[];
    fetchedAt?: string;
  }): Promise<{ diffEmitted: boolean; eventsCreated: number }> {
    const region = normRegion(input.region);
    const fetchedAt = input.fetchedAt ?? new Date().toISOString();

    const prevRows = await this.db.query<{
      providers: unknown;
      fetched_at: string;
    }>(
      `select providers, fetched_at
       from availability_snapshots
       where tmdb_id = $1 and region = $2`,
      [input.tmdbId, region],
    );

    const prevSnap: AvailabilitySnapshot = {
      tmdbId: input.tmdbId,
      region,
      providers: prevRows[0] ? parseProviders(prevRows[0].providers) : [],
      fetchedAt: prevRows[0]?.fetched_at ?? '1970-01-01T00:00:00.000Z',
    };

    const nextSnap: AvailabilitySnapshot = {
      tmdbId: input.tmdbId,
      region,
      providers: input.providers,
      fetchedAt,
    };

    const diff = diffAvailability(prevSnap, nextSnap);

    await this.db.exec(
      `insert into availability_snapshots(tmdb_id, region, providers, fetched_at)
       values ($1, $2, $3::jsonb, $4::timestamptz)
       on conflict (tmdb_id, region)
       do update set
         providers = excluded.providers,
         fetched_at = excluded.fetched_at`,
      [input.tmdbId, region, JSON.stringify(nextSnap.providers), fetchedAt],
    );

    if (!diff) {
      return { diffEmitted: false, eventsCreated: 0 };
    }

    const trackers = await this.db.query<{ user_id: string }>(
      `select user_id from availability_track
       where tmdb_id = $1 and region = $2`,
      [input.tmdbId, region],
    );

    let eventsCreated = 0;
    for (const t of trackers) {
      await this.db.exec(
        `insert into availability_events(
           user_id, tmdb_id, region, type,
           added_providers, removed_providers, created_at
         )
         values ($1::uuid, $2, $3, $4, $5::jsonb, $6::jsonb, $7::timestamptz)`,
        [
          t.user_id,
          input.tmdbId,
          region,
          diff.type,
          JSON.stringify(diff.addedProviders),
          JSON.stringify(diff.removedProviders),
          diff.at,
        ],
      );
      eventsCreated += 1;
    }

    return { diffEmitted: true, eventsCreated };
  }

  async listEvents(userId: string, sinceIso: string) {
    const rows = await this.db.query<{
      id: string;
      tmdb_id: number;
      region: string;
      type: string;
      added_providers: unknown;
      removed_providers: unknown;
      created_at: string;
    }>(
      `select id, tmdb_id, region, type, added_providers, removed_providers, created_at
       from availability_events
       where user_id = $1::uuid and created_at >= $2::timestamptz
       order by created_at desc
       limit 500`,
      [userId, sinceIso],
    );

    return rows.map((r) => ({
      id: r.id,
      tmdbId: r.tmdb_id,
      region: r.region,
      type: r.type,
      addedProviders: parseProviders(r.added_providers),
      removedProviders: parseProviders(r.removed_providers),
      createdAt: r.created_at,
    }));
  }
}
