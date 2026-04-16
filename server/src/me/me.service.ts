import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseError } from 'pg';

import { DbService } from '../db/db.service';

type PrefsRow = { region: string; providers: unknown };

type ProfileRow = {
  slug: string | null;
  enabled: boolean;
  visibility: 'private' | 'unlisted' | 'public';
  sections: unknown;
  about: string | null;
  notes: string | null;
  plans: string | null;
};

export type PublicProfilePayload = {
  slug: string | null;
  enabled: boolean;
  visibility: 'private' | 'unlisted' | 'public';
  sections: {
    favorites: boolean;
    diary: boolean;
    watchlist: boolean;
  };
  content: {
    about: string;
    notes: string;
    plans: string;
  };
};

@Injectable()
export class MeService {
  constructor(private readonly db: DbService) {}

  async listMyFeatureRefreshSeeds(
    userId: string,
    limit: number,
  ): Promise<number[]> {
    const rows = await this.db.query<{ tmdb_id: number }>(
      `
      with blocked as (
        select tmdb_id
        from feedback
        where user_id = $1
          and value in ('dislike','hide')
      ),
      liked as (
        select tmdb_id, updated_at as ts
        from feedback
        where user_id = $1 and value = 'like'
      ),
      fav as (
        select tmdb_id, created_at as ts
        from favorites
        where user_id = $1
      ),
      seeds as (
        select tmdb_id, ts from liked
        union all
        select tmdb_id, ts from fav
      )
      select distinct on (s.tmdb_id) s.tmdb_id
      from seeds s
      left join blocked b on b.tmdb_id = s.tmdb_id
      where b.tmdb_id is null
      order by s.tmdb_id, s.ts desc
      limit $2
      `,
      [userId, limit],
    );
    return rows.map((r) => r.tmdb_id);
  }

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

  async getPublicProfile(userId: string): Promise<PublicProfilePayload> {
    const rows = await this.db.query<ProfileRow>(
      `select slug, enabled, visibility, sections, about, notes, plans
       from public_profiles
       where user_id = $1`,
      [userId],
    );
    const r = rows[0];
    if (!r) {
      return {
        slug: null,
        enabled: false,
        visibility: 'private',
        sections: { favorites: false, diary: false, watchlist: false },
        content: { about: '', notes: '', plans: '' },
      };
    }
    const sec = this.normalizeSections(r.sections);
    return {
      slug: r.slug,
      enabled: r.enabled,
      visibility: r.visibility,
      sections: sec,
      content: {
        about: (r.about ?? '').trim(),
        notes: (r.notes ?? '').trim(),
        plans: (r.plans ?? '').trim(),
      },
    };
  }

  async putPublicProfile(
    userId: string,
    input: {
      slug: string | null;
      enabled: boolean;
      visibility: 'private' | 'unlisted' | 'public';
      sections: {
        favorites: boolean;
        diary: boolean;
        watchlist: boolean;
      };
      content?: {
        about?: string;
        notes?: string;
        plans?: string;
      };
    },
  ): Promise<void> {
    const slug = input.slug === null ? null : input.slug.trim().toLowerCase();
    const about = (input.content?.about ?? '').trim();
    const notes = (input.content?.notes ?? '').trim();
    const plans = (input.content?.plans ?? '').trim();
    try {
      await this.db.exec(
        `insert into public_profiles(user_id, slug, enabled, visibility, sections, about, notes, plans, updated_at)
         values ($1, $2, $3, $4, $5::jsonb, $6, $7, $8, now())
         on conflict (user_id)
         do update set
           slug = excluded.slug,
           enabled = excluded.enabled,
           visibility = excluded.visibility,
           sections = excluded.sections,
           about = excluded.about,
           notes = excluded.notes,
           plans = excluded.plans,
           updated_at = now()`,
        [
          userId,
          slug,
          input.enabled,
          input.visibility,
          JSON.stringify(input.sections),
          about || null,
          notes || null,
          plans || null,
        ],
      );
    } catch (e) {
      if (e instanceof DatabaseError && e.code === '23505') {
        throw new ConflictException('Slug is already taken');
      }
      throw e;
    }
  }

  async getPublicViewBySlug(slug: string): Promise<Record<string, unknown>> {
    const rows = await this.db.query<ProfileRow & { user_id: string }>(
      `select user_id, slug, enabled, visibility, sections, about, notes, plans
       from public_profiles
       where lower(slug) = lower($1)
         and enabled = true
         and visibility in ('unlisted', 'public')`,
      [slug],
    );
    const row = rows[0];
    if (!row) {
      throw new NotFoundException('Profile not found');
    }

    const sec = this.normalizeSections(row.sections);
    const out: Record<string, unknown> = {
      slug: row.slug,
      visibility: row.visibility,
      content: {
        about: (row.about ?? '').trim(),
        notes: (row.notes ?? '').trim(),
        plans: (row.plans ?? '').trim(),
      },
    };

    if (sec.favorites) {
      const fav = await this.db.query<{ tmdb_id: number }>(
        `select tmdb_id from favorites where user_id = $1 order by created_at desc limit 200`,
        [row.user_id],
      );
      out.favorites = { tmdbIds: fav.map((x) => x.tmdb_id) };
    }

    if (sec.diary) {
      const c = await this.db.query<{ n: string }>(
        `select count(*)::text as n from diary_entries where user_id = $1`,
        [row.user_id],
      );
      out.diary = { entryCount: Number(c[0]?.n ?? 0) };
    }

    if (sec.watchlist) {
      const ws = await this.db.query<{ tmdb_id: number }>(
        `select tmdb_id from watch_state
         where user_id = $1 and status <> 'hidden'
         order by updated_at desc
         limit 200`,
        [row.user_id],
      );
      out.watchlist = { tmdbIds: ws.map((x) => x.tmdb_id) };
    }

    return out;
  }

  private normalizeSections(raw: unknown): {
    favorites: boolean;
    diary: boolean;
    watchlist: boolean;
  } {
    if (!raw || typeof raw !== 'object') {
      return { favorites: false, diary: false, watchlist: false };
    }
    const o = raw as Record<string, unknown>;
    return {
      favorites: Boolean(o.favorites),
      diary: Boolean(o.diary),
      watchlist: Boolean(o.watchlist),
    };
  }
}
