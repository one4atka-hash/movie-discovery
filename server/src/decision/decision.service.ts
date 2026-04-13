import * as crypto from 'node:crypto';

import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { DbService } from '../db/db.service';

type SessionRow = {
  id: string;
  user_id: string;
  mode: 'top5' | 'roulette';
  constraints: unknown;
  created_at: string;
};

type CandidateRow = {
  session_id: string;
  tmdb_id: number;
  score: number;
  explain: unknown;
};

@Injectable()
export class DecisionService {
  constructor(private readonly db: DbService) {}

  /**
   * MVP: derive candidates from existing user signals (favorites + likes),
   * store them for reproducible sessions.
   */
  async createSession(
    userId: string,
    input: { mode: 'top5' | 'roulette'; constraints: Record<string, unknown> },
  ) {
    const session = await this.db.query<{ id: string; created_at: string }>(
      `insert into decision_sessions(user_id, mode, constraints)
       values ($1, $2, $3::jsonb)
       returning id, created_at`,
      [userId, input.mode, JSON.stringify(input.constraints ?? {})],
    );

    const id = session[0].id;

    // Candidates: favorites + liked feedback, minus hidden/disliked feedback.
    const rows = await this.db.query<{ tmdb_id: number; weight: number }>(
      `
      with fav as (
        select tmdb_id, 1.0::real as weight
        from favorites
        where user_id = $1
      ),
      liked as (
        select tmdb_id, 1.2::real as weight
        from feedback
        where user_id = $1 and value = 'like'
      ),
      blocked as (
        select tmdb_id
        from feedback
        where user_id = $1 and value in ('dislike','hide')
      ),
      unioned as (
        select * from fav
        union all
        select * from liked
      )
      select u.tmdb_id, max(u.weight) as weight
      from unioned u
      where u.tmdb_id not in (select tmdb_id from blocked)
      group by u.tmdb_id
      order by weight desc, u.tmdb_id desc
      limit 20
      `,
      [userId],
    );

    const candidates = rows.map((r, i) => ({
      tmdbId: r.tmdb_id,
      score: Number.isFinite(r.weight) ? r.weight - i * 0.01 : 0,
      explain: [
        {
          key: 'decision.seed',
          params: { source: r.weight >= 1.2 ? 'like' : 'favorite' },
        },
      ],
    }));

    for (const c of candidates) {
      await this.db.exec(
        `insert into decision_candidates(session_id, tmdb_id, score, explain)
         values ($1, $2, $3, $4::jsonb)
         on conflict do nothing`,
        [id, c.tmdbId, c.score, JSON.stringify(c.explain)],
      );
    }

    return {
      id,
      mode: input.mode,
      constraints: input.constraints ?? {},
      createdAt: session[0].created_at,
      candidates,
    };
  }

  async getSession(userId: string, id: string) {
    const s = await this.db.query<SessionRow>(
      `select id, user_id, mode, constraints, created_at
       from decision_sessions
       where id = $1 and user_id = $2`,
      [id, userId],
    );
    if (!s[0]) throw new NotFoundException('Decision session not found');

    const cs = await this.db.query<CandidateRow>(
      `select session_id, tmdb_id, score, explain
       from decision_candidates
       where session_id = $1
       order by score desc, tmdb_id desc`,
      [id],
    );

    return {
      id: s[0].id,
      mode: s[0].mode,
      constraints: (s[0].constraints ?? {}) as Record<string, unknown>,
      createdAt: s[0].created_at,
      candidates: cs.map((r) => ({
        tmdbId: r.tmdb_id,
        score: r.score,
        explain: (r.explain ?? []) as unknown[],
      })),
    };
  }

  async pick(userId: string, sessionId: string, tmdbId: number) {
    // Ensure session belongs to user.
    const s = await this.db.query<{ id: string }>(
      `select id from decision_sessions where id = $1 and user_id = $2`,
      [sessionId, userId],
    );
    if (!s[0]) throw new NotFoundException('Decision session not found');

    await this.db.exec(
      `insert into decision_picks(session_id, user_id, tmdb_id)
       values ($1, $2, $3)`,
      [sessionId, userId, tmdbId],
    );

    return { ok: true };
  }

  async createShareLink(
    userId: string,
    sessionId: string,
  ): Promise<{
    token: string;
    sharePath: string;
  }> {
    const found = await this.db.query<{
      id: string;
      share_token: string | null;
    }>(
      `select id, share_token from decision_sessions where id = $1 and user_id = $2`,
      [sessionId, userId],
    );
    if (!found[0]) throw new NotFoundException('Decision session not found');

    if (found[0].share_token) {
      const token = found[0].share_token;
      return {
        token,
        sharePath: `/api/public/decision-sessions/${token}`,
      };
    }

    const token = crypto.randomBytes(24).toString('hex');
    await this.db.exec(
      `update decision_sessions set share_token = $1 where id = $2 and user_id = $3`,
      [token, sessionId, userId],
    );
    return {
      token,
      sharePath: `/api/public/decision-sessions/${token}`,
    };
  }

  async getPublicSession(shareToken: string): Promise<{
    id: string;
    mode: 'top5' | 'roulette';
    constraints: Record<string, unknown>;
    createdAt: string;
    candidates: {
      tmdbId: number;
      score: number;
      explain: unknown[];
    }[];
  }> {
    const s = await this.db.query<SessionRow>(
      `select id, user_id, mode, constraints, created_at
       from decision_sessions
       where share_token = $1`,
      [shareToken],
    );
    if (!s[0]) throw new NotFoundException('Session not found');

    return this.loadSessionForPublic(s[0].id, s[0]);
  }

  async votePublic(
    shareToken: string,
    voterKey: string,
    tmdbId: number,
  ): Promise<void> {
    const s = await this.db.query<{ id: string }>(
      `select id from decision_sessions where share_token = $1`,
      [shareToken],
    );
    if (!s[0]) throw new NotFoundException('Session not found');
    const sessionId = s[0].id;

    const cand = await this.db.query<{ ok: string }>(
      `select 1::text as ok
       from decision_candidates
       where session_id = $1 and tmdb_id = $2`,
      [sessionId, tmdbId],
    );
    if (!cand[0]) {
      throw new BadRequestException('tmdbId is not a candidate');
    }

    await this.db.exec(
      `insert into decision_session_votes(session_id, tmdb_id, voter_key)
       values ($1, $2, $3)
       on conflict (session_id, voter_key)
       do update set tmdb_id = excluded.tmdb_id, created_at = now()`,
      [sessionId, tmdbId, voterKey],
    );
  }

  async getPublicResults(shareToken: string): Promise<{
    tallies: { tmdbId: number; votes: number }[];
    winner: { tmdbId: number; votes: number } | null;
  }> {
    const s = await this.db.query<{ id: string }>(
      `select id from decision_sessions where share_token = $1`,
      [shareToken],
    );
    if (!s[0]) throw new NotFoundException('Session not found');
    const sessionId = s[0].id;

    const rows = await this.db.query<{ tmdb_id: number; votes: string }>(
      `select tmdb_id, count(*)::text as votes
       from decision_session_votes
       where session_id = $1
       group by tmdb_id
       order by count(*) desc, tmdb_id asc`,
      [sessionId],
    );

    const tallies = rows.map((r) => ({
      tmdbId: r.tmdb_id,
      votes: Number(r.votes),
    }));
    const winner =
      tallies[0] && tallies[0].votes > 0
        ? { tmdbId: tallies[0].tmdbId, votes: tallies[0].votes }
        : null;

    return { tallies, winner };
  }

  private async loadSessionForPublic(
    id: string,
    row: SessionRow,
  ): Promise<{
    id: string;
    mode: 'top5' | 'roulette';
    constraints: Record<string, unknown>;
    createdAt: string;
    candidates: {
      tmdbId: number;
      score: number;
      explain: unknown[];
    }[];
  }> {
    const cs = await this.db.query<CandidateRow>(
      `select session_id, tmdb_id, score, explain
       from decision_candidates
       where session_id = $1
       order by score desc, tmdb_id desc`,
      [id],
    );

    return {
      id: row.id,
      mode: row.mode,
      constraints: (row.constraints ?? {}) as Record<string, unknown>,
      createdAt: row.created_at,
      candidates: cs.map((r) => ({
        tmdbId: r.tmdb_id,
        score: r.score,
        explain: (r.explain ?? []) as unknown[],
      })),
    };
  }
}
