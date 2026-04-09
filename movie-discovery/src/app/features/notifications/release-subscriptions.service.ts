import { Injectable, computed, effect, inject, signal } from '@angular/core';

import { StorageService } from '@core/storage.service';
import { AuthService } from '@features/auth/auth.service';

export type NotificationChannel = 'inApp' | 'webPush' | 'email' | 'calendar';

export interface ReleaseSubscription {
  readonly id: string;
  readonly userId: string;
  readonly tmdbId: number;
  readonly mediaType: 'movie';
  readonly title: string;
  readonly posterPath?: string | null;
  /** YYYY-MM-DD from TMDB */
  readonly releaseDate: string;
  readonly channels: Record<NotificationChannel, boolean>;
  readonly createdAt: number;
  readonly lastNotifiedAt?: number;
}

const KEY = 'release.subscriptions.v1';

@Injectable({ providedIn: 'root' })
export class ReleaseSubscriptionsService {
  private readonly storage = inject(StorageService);
  private readonly auth = inject(AuthService);

  private readonly _all = signal<ReleaseSubscription[]>(this.storage.get<ReleaseSubscription[]>(KEY, []) ?? []);
  readonly all = this._all.asReadonly();

  readonly mySubscriptions = computed(() => {
    const u = this.auth.user();
    if (!u) return [];
    return this._all()
      .filter((s) => s.userId === u.id)
      .sort((a, b) => a.releaseDate.localeCompare(b.releaseDate));
  });

  constructor() {
    effect(() => {
      this.storage.set(KEY, this._all());
    });
  }

  upsert(sub: Omit<ReleaseSubscription, 'id' | 'userId' | 'createdAt'>): ReleaseSubscription {
    const u = this.auth.user();
    if (!u) throw new Error('Нужен вход в аккаунт.');

    const existing = this._all().find((x) => x.userId === u.id && x.tmdbId === sub.tmdbId && x.mediaType === sub.mediaType);
    const now = Date.now();
    const next: ReleaseSubscription = existing
      ? { ...existing, ...sub }
      : {
          id: crypto.randomUUID(),
          userId: u.id,
          createdAt: now,
          ...sub
        };

    this._all.set(
      existing ? this._all().map((x) => (x.id === next.id ? next : x)) : [...this._all(), next]
    );
    return next;
  }

  remove(id: string): void {
    const u = this.auth.user();
    if (!u) throw new Error('Нужен вход в аккаунт.');
    this._all.set(this._all().filter((s) => !(s.id === id && s.userId === u.id)));
  }

  markNotified(id: string): void {
    const now = Date.now();
    this._all.set(this._all().map((s) => (s.id === id ? { ...s, lastNotifiedAt: now } : s)));
  }
}

