import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { z } from 'zod';

import { AlertRulesService } from '../alerts/alert-rules.service';
import { isInQuietHours } from '../alerts/alerts-matcher';
import { NotificationsService } from '../alerts/notifications.service';
import { truthy } from '../config/env.schema';
import { DbService } from '../db/db.service';

import { releaseDateYmdFromSnapshot } from './release-dates-from-snapshot.util';
import {
  reminderTriggerDate,
  shouldEnqueueReminder,
} from './release-reminders-window.util';

const WindowShape = z.object({
  daysBefore: z.number().int().min(0).max(365),
});

type ReminderJoinRow = {
  id: string;
  user_id: string;
  tmdb_id: number;
  reminder_type: string;
  reminder_window: unknown;
  channels: Record<string, boolean>;
  last_notified_at: string | null;
  payload: unknown;
};

@Injectable()
export class ReleaseRemindersCronService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly log = new Logger(ReleaseRemindersCronService.name);
  private timer?: NodeJS.Timeout;

  constructor(
    private readonly config: ConfigService,
    private readonly db: DbService,
    private readonly notifications: NotificationsService,
    private readonly alertRules: AlertRulesService,
  ) {}

  onModuleInit(): void {
    if (!truthy(this.config.get<string>('RELEASE_REMINDERS_CRON_ENABLED')))
      return;

    const ms = Number(
      this.config.get<string>('RELEASE_REMINDERS_CRON_INTERVAL_MS') ??
        86_400_000,
    );
    this.log.log(`Release reminders cron scheduled every ${ms} ms`);
    void this.tick();
    this.timer = setInterval(() => void this.tick(), ms);
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  /**
   * Evaluates all reminders against cached TMDB snapshots and enqueues in-app notifications.
   * @param todayYmdOverride for tests / dev tick (UTC YYYY-MM-DD).
   */
  async tick(
    todayYmdOverride?: string,
    nowOverride?: Date,
  ): Promise<{
    processed: number;
    enqueued: number;
  }> {
    const region = (this.config.get<string>('RELEASE_REMINDERS_REGION') ?? 'US')
      .trim()
      .toUpperCase();
    const todayYmd = todayYmdOverride ?? new Date().toISOString().slice(0, 10);
    const now = nowOverride ?? new Date();

    const rows = await this.db.query<ReminderJoinRow>(
      `select r.id, r.user_id, r.tmdb_id, r.reminder_type, r.reminder_window, r.channels, r.last_notified_at, s.payload
       from release_reminders r
       left join movie_release_snapshots s on s.tmdb_id = r.tmdb_id`,
    );

    const userIds = [...new Set(rows.map((r) => r.user_id))];
    const quietByUser =
      await this.alertRules.getEffectiveQuietHoursForUsers(userIds);

    let enqueued = 0;
    for (const row of rows) {
      const win = WindowShape.safeParse(row.reminder_window);
      if (!win.success) continue;

      const ch = row.channels ?? {};
      if (!ch.inApp) continue;

      if (!row.payload) continue;

      const rt = row.reminder_type as
        | 'theatrical'
        | 'digital'
        | 'physical'
        | 'any';
      const releaseYmd = releaseDateYmdFromSnapshot(row.payload, region, rt);
      if (!releaseYmd) continue;

      const daysBefore = win.data.daysBefore;
      const triggerYmd = reminderTriggerDate(releaseYmd, daysBefore);

      const lastYmd = row.last_notified_at
        ? new Date(row.last_notified_at).toISOString().slice(0, 10)
        : null;

      if (
        !shouldEnqueueReminder({
          todayYmd,
          releaseDateYmd: releaseYmd,
          daysBefore,
          lastNotifiedOnYmd: lastYmd,
        })
      ) {
        continue;
      }

      const qh = quietByUser.get(row.user_id);
      if (qh && isInQuietHours(now, qh)) {
        continue;
      }

      const titleRow = await this.db.query<{ title: string | null }>(
        `select title from movie_features where tmdb_id = $1 limit 1`,
        [row.tmdb_id],
      );
      const movieTitle = titleRow[0]?.title?.trim() || `Movie ${row.tmdb_id}`;

      await this.notifications.insertReleaseReminderNotification(row.user_id, {
        tmdbId: row.tmdb_id,
        title: `Release reminder · ${movieTitle}`,
        body:
          daysBefore === 0
            ? `Release day (${region}) for your ${rt} track.`
            : `${daysBefore} day(s) before release (${region}, ${rt}).`,
        payload: {
          kind: 'release_reminder',
          reminderId: row.id,
          reminderType: rt,
          region,
          releaseDateYmd: releaseYmd,
          triggerYmd,
        },
      });

      await this.db.exec(
        `update release_reminders set last_notified_at = now() where id = $1`,
        [row.id],
      );
      enqueued += 1;
    }

    return { processed: rows.length, enqueued };
  }
}
