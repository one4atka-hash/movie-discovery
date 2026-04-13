import { Injectable } from '@nestjs/common';

import { DbService } from '../db/db.service';

export type NotificationRow = {
  id: string;
  type: 'info' | 'release' | 'availability' | 'digest';
  title: string;
  body: string | null;
  tmdb_id: number | null;
  payload: unknown;
  created_at: string;
  read_at: string | null;
  rule_id: string | null;
};

@Injectable()
export class NotificationsService {
  constructor(private readonly db: DbService) {}

  async list(userId: string, limit: number) {
    const rows = await this.db.query<NotificationRow>(
      `select id, type, title, body, tmdb_id, payload, created_at, read_at, rule_id
       from notifications
       where user_id = $1
       order by created_at desc
       limit $2`,
      [userId, limit],
    );

    return rows.map((r) => ({
      id: r.id,
      type: r.type,
      title: r.title,
      body: r.body,
      tmdbId: r.tmdb_id,
      payload: r.payload ?? {},
      createdAt: r.created_at,
      readAt: r.read_at,
      ruleId: r.rule_id,
    }));
  }

  async markRead(userId: string, id: string): Promise<void> {
    await this.db.exec(
      `update notifications
       set read_at = coalesce(read_at, now())
       where user_id = $1 and id = $2`,
      [userId, id],
    );
  }

  async insertSample(userId: string): Promise<void> {
    await this.db.exec(
      `insert into notifications(user_id, type, title, body, payload)
       values ($1, 'info', 'Sample alert', 'Dev-only sample notification', '{"why":"manual run"}'::jsonb)`,
      [userId],
    );
  }

  async insertReleaseReminderNotification(
    userId: string,
    input: {
      tmdbId: number;
      title: string;
      body: string | null;
      payload: Record<string, unknown>;
    },
  ): Promise<void> {
    await this.db.exec(
      `insert into notifications(user_id, type, title, body, tmdb_id, payload)
       values ($1, 'release', $2, $3, $4, $5::jsonb)`,
      [
        userId,
        input.title,
        input.body,
        input.tmdbId,
        JSON.stringify(input.payload),
      ],
    );
  }
}
