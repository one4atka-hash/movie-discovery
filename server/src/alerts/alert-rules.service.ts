import { Injectable } from '@nestjs/common';

import { DbService } from '../db/db.service';

export type AlertRuleRow = {
  id: string;
  name: string;
  enabled: boolean;
  filters: unknown;
  channels: unknown;
  quiet_hours: unknown;
  created_at: string;
  updated_at: string;
};

@Injectable()
export class AlertRulesService {
  constructor(private readonly db: DbService) {}

  async list(userId: string) {
    const rows = await this.db.query<AlertRuleRow>(
      `select id, name, enabled, filters, channels, quiet_hours, created_at, updated_at
       from alert_rules
       where user_id = $1
       order by updated_at desc`,
      [userId],
    );
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      enabled: r.enabled,
      filters: r.filters ?? {},
      channels: r.channels ?? {},
      quietHours: r.quiet_hours ?? null,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));
  }

  async upsert(
    userId: string,
    input: {
      id?: string;
      name: string;
      enabled: boolean;
      filters: unknown;
      channels: unknown;
      quietHours: unknown;
    },
  ) {
    const rows = await this.db.query<{ id: string }>(
      `insert into alert_rules(id, user_id, name, enabled, filters, channels, quiet_hours)
       values (coalesce($1::uuid, gen_random_uuid()), $2::uuid, $3, $4, $5::jsonb, $6::jsonb, $7::jsonb)
       on conflict (id)
       do update set
         name = excluded.name,
         enabled = excluded.enabled,
         filters = excluded.filters,
         channels = excluded.channels,
         quiet_hours = excluded.quiet_hours,
         updated_at = now()
       where alert_rules.user_id = excluded.user_id
       returning id`,
      [
        input.id ?? null,
        userId,
        input.name,
        input.enabled,
        JSON.stringify(input.filters ?? {}),
        JSON.stringify(input.channels ?? {}),
        input.quietHours ? JSON.stringify(input.quietHours) : null,
      ],
    );
    return { id: rows[0]?.id ?? '' };
  }

  async remove(userId: string, id: string): Promise<void> {
    await this.db.exec(
      `delete from alert_rules where user_id = $1 and id = $2`,
      [userId, id],
    );
  }
}
