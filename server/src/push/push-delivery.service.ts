import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { sendNotification, WebPushError } from 'web-push';
import type { PushSubscription } from 'web-push';

import { PushSubscriptionsService } from './push-subscriptions.service';

@Injectable()
export class PushDeliveryService {
  constructor(
    private readonly config: ConfigService,
    private readonly subs: PushSubscriptionsService,
  ) {}

  /** True when subject + both VAPID keys are non-empty (required for outbound Web Push). */
  vapidConfigured(): boolean {
    const subject = this.config.get<string>('VAPID_SUBJECT')?.trim();
    const publicKey = this.config.get<string>('VAPID_PUBLIC_KEY')?.trim();
    const privateKey = this.config.get<string>('VAPID_PRIVATE_KEY')?.trim();
    return Boolean(subject && publicKey && privateKey);
  }

  /**
   * Sends JSON `{ title, body }` to all stored subscriptions for the user.
   * Removes subscriptions that the push service reports as gone (404/410).
   */
  async sendToUser(
    userId: string,
    title: string,
    body: string,
  ): Promise<{ sent: number; removed: number; errors: string[] }> {
    const subject = this.config.get<string>('VAPID_SUBJECT')?.trim() ?? '';
    const publicKey = this.config.get<string>('VAPID_PUBLIC_KEY')?.trim() ?? '';
    const privateKey =
      this.config.get<string>('VAPID_PRIVATE_KEY')?.trim() ?? '';
    if (!subject || !publicKey || !privateKey) {
      return {
        sent: 0,
        removed: 0,
        errors: [
          'VAPID not fully configured (VAPID_SUBJECT + VAPID_PUBLIC_KEY + VAPID_PRIVATE_KEY)',
        ],
      };
    }

    const list = await this.subs.listForWebPushDelivery(userId);
    if (list.length === 0) {
      return { sent: 0, removed: 0, errors: [] };
    }

    const payload = JSON.stringify({ title, body });
    let sent = 0;
    let removed = 0;
    const errors: string[] = [];

    for (const row of list) {
      const subscription: PushSubscription = {
        endpoint: row.endpoint,
        expirationTime: null,
        keys: row.keys,
      };
      try {
        await sendNotification(subscription, payload, {
          TTL: 86_400,
          vapidDetails: { subject, publicKey, privateKey },
        });
        sent++;
      } catch (e: unknown) {
        if (
          e instanceof WebPushError &&
          (e.statusCode === 410 || e.statusCode === 404)
        ) {
          await this.subs.deleteById(userId, row.id);
          removed++;
        } else if (e instanceof WebPushError) {
          errors.push(`HTTP ${e.statusCode}: ${e.message}`);
        } else if (e instanceof Error) {
          errors.push(e.message);
        } else {
          errors.push('Unknown error');
        }
      }
    }

    return { sent, removed, errors };
  }
}
