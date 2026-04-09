import { Injectable, effect, inject } from '@angular/core';

import { ErrorNotifierService } from '@core/error-notifier.service';
import { AuthService } from '@features/auth/auth.service';
import { ReleaseSubscriptionsService } from './release-subscriptions.service';

@Injectable({ providedIn: 'root' })
export class ReleaseReminderService {
  private readonly auth = inject(AuthService);
  private readonly subs = inject(ReleaseSubscriptionsService);
  private readonly banner = inject(ErrorNotifierService);

  constructor() {
    // On every login/subscription change, check if something is due today.
    effect(() => {
      const u = this.auth.user();
      if (!u) return;

      const today = yyyyMmDd(new Date());
      const due = this.subs
        .mySubscriptions()
        .filter((s) => s.releaseDate === today && !s.lastNotifiedAt);

      if (!due.length) return;

      const first = due[0]!;
      const msg = `Сегодня релиз: ${first.title}. Откройте «Уведомления», чтобы управлять каналами.`;

      // In-app channel uses banner. Others are "local" (require app open).
      if (first.channels.inApp) {
        this.banner.show(msg, () => {});
      }

      if (first.channels.webPush) {
        void this.tryNotify(first.title);
      }

      if (first.channels.email) {
        // MVP: open mail client (no backend).
        this.tryMailTo(first.title);
      }

      due.forEach((s) => this.subs.markNotified(s.id));
    });
  }

  private async tryNotify(title: string): Promise<void> {
    if (!('Notification' in window)) return;
    const perm = await Notification.requestPermission();
    if (perm !== 'granted') return;
    new Notification('Movie Discovery', { body: `Вышло: ${title}` });
  }

  private tryMailTo(title: string): void {
    const email = this.auth.user()?.email;
    const subject = encodeURIComponent('Movie Discovery — релиз сегодня');
    const body = encodeURIComponent(`Сегодня релиз: ${title}`);
    const to = encodeURIComponent(email ?? '');
    window.open(`mailto:${to}?subject=${subject}&body=${body}`, '_blank', 'noopener,noreferrer');
  }
}

function yyyyMmDd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

