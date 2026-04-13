import { Injectable } from '@nestjs/common';

import { DbService } from '../db/db.service';

type ReminderRow = {
  id: string;
  tmdb_id: number;
  media_type: 'movie';
  reminder_type: string;
  reminder_window: unknown;
  channels: Record<string, boolean>;
  last_notified_at: string | null;
  created_at: string;
};

@Injectable()
export class ReleaseRemindersService {
  constructor(private readonly db: DbService) {}

  async list(userId: string) {
    const rows = await this.db.query<ReminderRow>(
      `select id, tmdb_id, media_type, reminder_type, reminder_window, channels, last_notified_at, created_at
       from release_reminders
       where user_id = $1
       order by created_at desc`,
      [userId],
    );
    return rows.map((r) => ({
      id: r.id,
      tmdbId: r.tmdb_id,
      mediaType: r.media_type as 'movie',
      reminderType: r.reminder_type as
        | 'theatrical'
        | 'digital'
        | 'physical'
        | 'any',
      window: r.reminder_window as { daysBefore: number },
      channels: r.channels,
      lastNotifiedAt: r.last_notified_at,
      createdAt: r.created_at,
    }));
  }

  async create(
    userId: string,
    input: {
      tmdbId: number;
      mediaType: 'movie';
      reminderType: 'theatrical' | 'digital' | 'physical' | 'any';
      window: { daysBefore: number };
      channels: Record<string, boolean>;
    },
  ) {
    const rows = await this.db.query<ReminderRow>(
      `insert into release_reminders(user_id, tmdb_id, media_type, reminder_type, reminder_window, channels)
       values ($1, $2, $3, $4, $5::jsonb, $6::jsonb)
       returning id, tmdb_id, media_type, reminder_type, reminder_window, channels, last_notified_at, created_at`,
      [
        userId,
        input.tmdbId,
        input.mediaType,
        input.reminderType,
        JSON.stringify(input.window),
        JSON.stringify(input.channels),
      ],
    );
    const r = rows[0];
    return {
      id: r.id,
      tmdbId: r.tmdb_id,
      mediaType: r.media_type as 'movie',
      reminderType: r.reminder_type as
        | 'theatrical'
        | 'digital'
        | 'physical'
        | 'any',
      window: r.reminder_window as { daysBefore: number },
      channels: r.channels,
      lastNotifiedAt: r.last_notified_at,
      createdAt: r.created_at,
    };
  }

  async remove(userId: string, id: string): Promise<void> {
    await this.db.exec(
      `delete from release_reminders where id = $1 and user_id = $2`,
      [id, userId],
    );
  }
}
