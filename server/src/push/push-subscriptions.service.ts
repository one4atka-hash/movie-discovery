import { Injectable, NotFoundException } from '@nestjs/common';

import { DbService } from '../db/db.service';

@Injectable()
export class PushSubscriptionsService {
  constructor(private readonly db: DbService) {}

  async list(
    userId: string,
  ): Promise<{ id: string; endpoint: string; createdAt: string }[]> {
    const rows = await this.db.query<{
      id: string;
      endpoint: string;
      created_at: string;
    }>(
      `select id, endpoint, created_at
       from push_subscriptions
       where user_id = $1
       order by created_at desc`,
      [userId],
    );
    return rows.map((r) => ({
      id: r.id,
      endpoint: r.endpoint,
      createdAt: r.created_at,
    }));
  }

  async subscribe(
    userId: string,
    input: { endpoint: string; keys: { p256dh: string; auth: string } },
  ): Promise<{ id: string }> {
    const rows = await this.db.query<{ id: string }>(
      `insert into push_subscriptions(user_id, endpoint, p256dh, auth)
       values ($1, $2, $3, $4)
       on conflict (user_id, endpoint)
       do update set
         p256dh = excluded.p256dh,
         auth = excluded.auth,
         updated_at = now()
       returning id`,
      [userId, input.endpoint, input.keys.p256dh, input.keys.auth],
    );
    return { id: rows[0].id };
  }

  async remove(userId: string, id: string): Promise<void> {
    const rows = await this.db.query<{ id: string }>(
      `delete from push_subscriptions where id = $1 and user_id = $2 returning id`,
      [id, userId],
    );
    if (rows.length === 0) throw new NotFoundException();
  }

  /** Keys for `web-push` / delivery (same shape as browser PushSubscription JSON). */
  async listForWebPushDelivery(userId: string): Promise<
    {
      id: string;
      endpoint: string;
      keys: { p256dh: string; auth: string };
    }[]
  > {
    const rows = await this.db.query<{
      id: string;
      endpoint: string;
      p256dh: string;
      auth: string;
    }>(
      `select id, endpoint, p256dh, auth
       from push_subscriptions
       where user_id = $1`,
      [userId],
    );
    return rows.map((r) => ({
      id: r.id,
      endpoint: r.endpoint,
      keys: { p256dh: r.p256dh, auth: r.auth },
    }));
  }

  /** Remove a subscription invalidated at the push endpoint (410/404). */
  async deleteById(userId: string, subscriptionId: string): Promise<void> {
    await this.db.query(
      `delete from push_subscriptions where id = $1 and user_id = $2`,
      [subscriptionId, userId],
    );
  }
}
