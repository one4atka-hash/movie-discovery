import { Injectable, effect, inject } from '@angular/core';

import { buildMailtoHref } from '@core/mailto.util';
import { ConfigService } from '@core/config.service';
import { ErrorNotifierService } from '@core/error-notifier.service';
import { AuthService } from '@features/auth/auth.service';
import { I18nService } from '@shared/i18n/i18n.service';

import {
  ReleaseSubscriptionsService,
  type ReleaseSubscription,
} from './release-subscriptions.service';

@Injectable({ providedIn: 'root' })
export class ReleaseReminderService {
  private readonly auth = inject(AuthService);
  private readonly subs = inject(ReleaseSubscriptionsService);
  private readonly banner = inject(ErrorNotifierService);
  private readonly config = inject(ConfigService);
  private readonly i18n = inject(I18nService);

  constructor() {
    effect(() => {
      const u = this.auth.user();
      if (!u) return;

      const today = yyyyMmDd(new Date());
      const due = this.subs
        .mySubscriptions()
        .filter((s) => s.releaseDate === today && s.lastNotifiedAt == null);

      if (!due.length) return;

      const snapshot = due.map((s) => ({ ...s }));
      due.forEach((s) => this.subs.markNotified(s.id));

      const inApp = snapshot.filter((s) => s.channels.inApp);
      if (inApp.length) {
        const titles = inApp.map((s) => `«${s.title}»`).join(', ');
        this.banner.show(
          this.i18n.t('reminders.inAppBanner').replace('{{titles}}', titles),
          () => {},
        );
      }

      const pushSubs = snapshot.filter((s) => s.channels.webPush);
      if (pushSubs.length) {
        void this.sendWebPushBatch(pushSubs);
      }

      const emailSubs = snapshot.filter((s) => s.channels.email);
      if (emailSubs.length && u.email?.trim()) {
        void this.sendEmailChannel(u.email.trim(), emailSubs);
      }
    });
  }

  private async sendWebPushBatch(subs: readonly ReleaseSubscription[]): Promise<void> {
    if (!('Notification' in window)) return;
    let perm = Notification.permission;
    if (perm === 'default') {
      perm = await Notification.requestPermission();
    }
    if (perm !== 'granted') return;

    const titles = subs.map((s) => s.title);
    const body =
      titles.length === 1
        ? this.i18n.t('reminders.pushBodyOne').replace('{{title}}', titles[0]!)
        : this.i18n
            .t('reminders.pushBodyMany')
            .replace('{{count}}', String(titles.length))
            .replace('{{titles}}', titles.join(', '));

    new Notification(this.i18n.t('reminders.pushTitle'), { body });
  }

  private async sendEmailChannel(
    userEmail: string,
    subs: readonly ReleaseSubscription[],
  ): Promise<void> {
    const lines = subs.map((s) => `• ${s.title} (TMDB ${s.tmdbId}, ${s.releaseDate})`);
    const text = [
      this.i18n.t('reminders.emailIntro'),
      '',
      ...lines,
      '',
      this.i18n.t('reminders.emailFooter'),
    ].join('\n');

    const subject =
      subs.length === 1
        ? this.i18n.t('reminders.emailSubjectOne').replace('{{title}}', subs[0]!.title)
        : this.i18n.t('reminders.emailSubjectMany').replace('{{count}}', String(subs.length));

    const webhook = this.config.releaseAlert.webhookUrl;
    if (webhook) {
      try {
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        const sec = this.config.releaseAlert.webhookSecret;
        if (sec) headers['X-Webhook-Secret'] = sec;

        const res = await fetch(webhook, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            type: 'release_alert',
            to: userEmail,
            subject,
            text,
            movies: subs.map((s) => ({
              tmdbId: s.tmdbId,
              title: s.title,
              releaseDate: s.releaseDate,
            })),
          }),
        });
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        return;
      } catch (e) {
        console.warn('[ReleaseReminder] Webhook failed, falling back to mailto', e);
      }
    }

    const href = buildMailtoHref(userEmail, subject, text);
    if (!href) return;
    try {
      window.location.assign(href);
    } catch {
      window.open(href, '_blank', 'noopener,noreferrer');
    }
  }
}

function yyyyMmDd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
