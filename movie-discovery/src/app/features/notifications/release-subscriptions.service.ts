import { Injectable, computed, effect, inject, signal, untracked } from '@angular/core';
import { catchError, forkJoin, of } from 'rxjs';

import { StorageService } from '@core/storage.service';
import { AuthService } from '@features/auth/auth.service';
import { I18nService } from '@shared/i18n/i18n.service';
import { MovieService } from '@features/movies/data-access/services/movie.service';

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
  private readonly i18n = inject(I18nService);
  private readonly moviesApi = inject(MovieService);

  private readonly _all = signal<ReleaseSubscription[]>(
    this.storage.get<ReleaseSubscription[]>(KEY, []) ?? [],
  );
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

    // Refresh stored titles when TMDB locale changes so lists match selected language.
    // (TMDB videos are excluded elsewhere; movie details support language.)
    let n = 0;
    effect(() => {
      const u = this.auth.user();
      const loc = this.i18n.tmdbLocale();
      const subs = this.mySubscriptions();
      if (!u) return;
      if (n++ === 0) return;
      untracked(() => this.refreshTitles(u.id, loc, subs));
    });
  }

  upsert(sub: Omit<ReleaseSubscription, 'id' | 'userId' | 'createdAt'>): ReleaseSubscription {
    const u = this.auth.user();
    if (!u) throw new Error('Нужен вход в аккаунт.');

    const existing = this._all().find(
      (x) => x.userId === u.id && x.tmdbId === sub.tmdbId && x.mediaType === sub.mediaType,
    );
    const now = Date.now();
    const next: ReleaseSubscription = existing
      ? { ...existing, ...sub }
      : {
          id: crypto.randomUUID(),
          userId: u.id,
          createdAt: now,
          ...sub,
        };

    this._all.set(
      existing ? this._all().map((x) => (x.id === next.id ? next : x)) : [...this._all(), next],
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

  private refreshTitles(
    userId: string,
    _locale: string,
    subs: readonly ReleaseSubscription[],
  ): void {
    const ids = [
      ...new Set(subs.map((s) => s.tmdbId).filter((id) => Number.isFinite(id) && id > 0)),
    ];
    if (!ids.length) return;

    forkJoin(
      ids.map((id) => this.moviesApi.getMovie(id).pipe(catchError(() => of(null)))),
    ).subscribe((movies) => {
      const titleById = new Map<number, string>();
      for (const m of movies) {
        if (!m) continue;
        const t = (m.title ?? '').trim();
        if (t) titleById.set(m.id, t);
      }
      if (!titleById.size) return;

      this._all.set(
        this._all().map((s) => {
          if (s.userId !== userId) return s;
          const t = titleById.get(s.tmdbId);
          return t ? { ...s, title: t } : s;
        }),
      );
    });
  }
}
