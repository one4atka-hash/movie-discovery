import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

import { AuthService } from '@features/auth/auth.service';
import { MovieService } from '@features/movies/data-access/services/movie.service';
import { friendlyHttpErrorMessage } from '@core/http-error.util';
import { ReleaseSubscriptionsService, NotificationChannel } from './release-subscriptions.service';
import { I18nService } from '@shared/i18n/i18n.service';

@Component({
  selector: 'app-notifications-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="page">
      <header class="head">
        <div>
          <h1 class="title">{{ i18n.t('notifications.title') }}</h1>
          <p class="sub">{{ i18n.t('notifications.subtitle') }}</p>
        </div>
        <div class="head__actions">
          <a class="btn" routerLink="/search">{{ i18n.t('notifications.addFromSearch') }}</a>
          <button class="btn" type="button" (click)="logout()">{{ i18n.t('account.logout') }}</button>
        </div>
      </header>

      <div class="create card">
        <h2 class="cardTitle">{{ i18n.t('notifications.addById') }}</h2>
        <div class="row">
          <input class="input" [formControl]="tmdbId" placeholder="Например: 550" inputmode="numeric">
          <button class="btn btn--primary" type="button" (click)="loadMovie()">{{ i18n.t('notifications.load') }}</button>
        </div>
        <p class="err" *ngIf="createError()">{{ createError() }}</p>

        <div class="movie" *ngIf="loadedTitle() as t">
          <div class="movie__head">
            <div class="movie__left">
              <div class="thumb" [class.thumb--empty]="!loadedPosterPath()">
                <img *ngIf="loadedPosterPath() as pp" [src]="posterUrl(pp)" alt="" loading="lazy" decoding="async">
              </div>
              <div class="movie__meta">
                <strong>{{ t }}</strong>
                <span class="muted">релиз: {{ loadedReleaseDate() || '—' }}</span>
              </div>
            </div>
          </div>

          <div class="channels">
            <label class="chk"><input type="checkbox" [checked]="channel('inApp')" (change)="setChannel('inApp',$event)"> In-app</label>
            <label class="chk"><input type="checkbox" [checked]="channel('webPush')" (change)="setChannel('webPush',$event)"> Web Push</label>
            <label class="chk"><input type="checkbox" [checked]="channel('email')" (change)="setChannel('email',$event)"> Email</label>
            <label class="chk"><input type="checkbox" [checked]="channel('calendar')" (change)="setChannel('calendar',$event)"> Calendar</label>
          </div>

          <div class="row">
            <button class="btn btn--primary" type="button" (click)="save()">{{ i18n.t('notifications.save') }}</button>
            <button class="btn" type="button" (click)="downloadIcs()" [disabled]="!channel('calendar')">{{ i18n.t('notifications.downloadIcs') }}</button>
          </div>

          <p class="hint" *ngIf="channel('email')">
            Email-канал в этом MVP работает как «письмо по запросу» (открывается mailto в день релиза при запуске приложения).
            Для реальной автоматической рассылки нужен сервер/провайдер.
          </p>
        </div>
      </div>

      <section class="list">
        <h2 class="sectionTitle">{{ i18n.t('notifications.mySubs') }}</h2>

        <p class="muted" *ngIf="!subs().length">{{ i18n.t('notifications.empty') }}</p>

        <div class="subs" *ngIf="subs().length">
          <article class="subCard" *ngFor="let s of subs(); trackBy: trackById">
            <div class="subCard__head">
              <div class="subCard__left">
                <div class="thumb thumb--sm" [class.thumb--empty]="!s.posterPath">
                  <img *ngIf="s.posterPath as sp" [src]="posterUrl(sp)" alt="" loading="lazy" decoding="async">
                </div>
                <div class="subCard__t">
                  <strong class="subCard__title">{{ s.title }}</strong>
                  <span class="subCard__date">{{ s.releaseDate || '—' }}</span>
                </div>
              </div>
            </div>
            <div class="subCard__meta">
              <span class="pill" *ngIf="s.channels.inApp">In-app</span>
              <span class="pill" *ngIf="s.channels.webPush">Web Push</span>
              <span class="pill" *ngIf="s.channels.email">Email</span>
              <span class="pill" *ngIf="s.channels.calendar">Calendar</span>
            </div>
            <div class="subCard__actions">
              <a class="btn" [routerLink]="['/movie', s.tmdbId]">{{ i18n.t('notifications.open') }}</a>
              <button class="btn" type="button" (click)="remove(s.id)">{{ i18n.t('notifications.remove') }}</button>
            </div>
          </article>
        </div>
      </section>
    </section>
  `,
  styles: [
    `
      .page { padding: 1rem 0 2rem; display: grid; gap: 1rem; }
      .head { display:flex; justify-content:space-between; gap:1rem; flex-wrap:wrap; align-items:flex-end; }
      .title { margin:0 0 0.25rem; }
      .sub { margin:0; color:var(--text-muted); max-width:72ch; line-height:1.5; }
      .head__actions { display:flex; gap:0.6rem; flex-wrap:wrap; }

      .card { border-radius: 16px; border: 1px solid var(--border-subtle); background: rgba(255,255,255,0.03); padding: 0.9rem; }
      .cardTitle { margin: 0 0 0.7rem; font-size: 1.05rem; }
      .row { display:flex; gap:0.6rem; flex-wrap:wrap; align-items:center; }
      .input { flex: 1 1 220px; padding: 0.75rem 0.85rem; border-radius: 14px; border: 1px solid var(--border-subtle); background: var(--bg-elevated); color: var(--text); outline: none; }
      .input:focus { border-color: rgba(255,195,113,0.45); box-shadow: 0 0 0 4px rgba(255,195,113,0.12); }
      .err { margin: 0.65rem 0 0; color: #ffc371; }
      .hint { margin: 0.65rem 0 0; color: var(--text-muted); font-size: 0.9rem; line-height: 1.5; }
      .movie { margin-top: 0.85rem; display:grid; gap:0.75rem; }
      .movie__head { display:flex; gap:0.75rem; flex-wrap:wrap; align-items:baseline; justify-content:space-between; }
      .movie__left { display:flex; gap:0.75rem; align-items:center; }
      .movie__meta { display:grid; gap:0.15rem; }

      .thumb {
        width: 52px;
        height: 78px;
        border-radius: 10px;
        border: 1px solid var(--border-subtle);
        overflow: hidden;
        background: rgba(255,255,255,0.04);
        flex: 0 0 auto;
      }
      .thumb--sm { width: 42px; height: 63px; border-radius: 10px; }
      .thumb--empty { background: linear-gradient(145deg, rgba(255, 107, 107, 0.2), rgba(255, 195, 113, 0.12)); }
      .thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }

      .channels { display:flex; gap:0.8rem; flex-wrap:wrap; }
      .chk { display:inline-flex; gap:0.45rem; align-items:center; color: var(--text-muted); }

      .sectionTitle { margin: 0; font-size: 1.05rem; }
      .list { display:grid; gap:0.6rem; }
      .subs { display:grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap:0.8rem; }
      .subCard { border-radius: 16px; border: 1px solid var(--border-subtle); background: rgba(255,255,255,0.03); padding: 0.85rem; display:grid; gap:0.65rem; }
      .subCard__head { display:flex; justify-content:space-between; gap:0.8rem; align-items:baseline; flex-wrap:wrap; }
      .subCard__left { display:flex; gap:0.65rem; align-items:center; }
      .subCard__t { display:grid; gap:0.15rem; }
      .subCard__title { line-height: 1.25; }
      .subCard__date { color: var(--text-muted); font-size: 0.9rem; }
      .subCard__meta { display:flex; gap:0.4rem; flex-wrap:wrap; }
      .pill { border:1px solid var(--border-subtle); border-radius:9999px; padding:0.2rem 0.55rem; font-size:0.82rem; color: var(--text-muted); background: rgba(255,255,255,0.03); }
      .subCard__actions { display:flex; gap:0.6rem; flex-wrap:wrap; }
      .muted { margin:0; color: var(--text-muted); line-height: 1.5; }

      .btn { border-radius: 9999px; border: 1px solid var(--border-subtle); background: rgba(255,255,255,0.05); color: var(--text); padding: 0.55rem 0.9rem; cursor: pointer; font: inherit; text-decoration:none; display:inline-flex; align-items:center; justify-content:center; transition: transform 0.15s ease, background 0.15s ease, border-color 0.15s ease; }
      .btn:hover { transform: translateY(-1px); background: rgba(255,255,255,0.08); border-color: rgba(255,255,255,0.14); }
      .btn--primary { border-color: rgba(255,195,113,0.45); background: rgba(255,195,113,0.14); }
    `
  ]
})
export class NotificationsPageComponent {
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly movies = inject(MovieService);
  private readonly subsSvc = inject(ReleaseSubscriptionsService);
  readonly i18n = inject(I18nService);

  readonly subs = computed(() => this.subsSvc.mySubscriptions());

  readonly tmdbId = new FormControl('', { nonNullable: true });
  readonly createError = signal<string | null>(null);

  private readonly _loaded = signal<{ id: number; title: string; releaseDate: string; posterPath?: string | null } | null>(null);
  readonly loadedTitle = computed(() => this._loaded()?.title ?? null);
  readonly loadedReleaseDate = computed(() => this._loaded()?.releaseDate ?? '');
  readonly loadedPosterPath = computed(() => this._loaded()?.posterPath ?? null);

  private readonly _channels = signal<Record<NotificationChannel, boolean>>({
    inApp: true,
    webPush: false,
    email: false,
    calendar: true
  });

  constructor() {
    effect(() => {
      const q = this.route.snapshot.queryParamMap;
      const idStr = q.get('tmdbId');
      if (idStr && Number.isFinite(Number(idStr))) {
        this.tmdbId.setValue(String(Number(idStr)));
        this.loadMovie();
        void this.router.navigate([], { queryParams: { tmdbId: null }, queryParamsHandling: 'merge' });
      }
    });
  }

  logout(): void {
    this.auth.logout();
    void this.router.navigateByUrl('/');
  }

  channel(c: NotificationChannel): boolean {
    return Boolean(this._channels()[c]);
  }

  setChannel(c: NotificationChannel, ev: Event): void {
    const checked = (ev.target as HTMLInputElement).checked;
    this._channels.set({ ...this._channels(), [c]: checked });
  }

  loadMovie(): void {
    this.createError.set(null);
    this._loaded.set(null);

    const id = Number(this.tmdbId.value);
    if (!Number.isFinite(id) || id <= 0) {
      this.createError.set('Введите корректный TMDB id.');
      return;
    }

    this.movies.getMovie(id).subscribe({
      next: (m) => {
        this._loaded.set({
          id: m.id,
          title: m.title,
          releaseDate: m.release_date ?? '',
          posterPath: m.poster_path
        });
      },
      error: (err: unknown) => {
        this.createError.set(friendlyHttpErrorMessage(err, 'Фильм'));
      }
    });
  }

  save(): void {
    this.createError.set(null);
    const loaded = this._loaded();
    if (!loaded) {
      this.createError.set('Сначала загрузите фильм.');
      return;
    }
    if (!loaded.releaseDate) {
      this.createError.set('У фильма нет даты релиза (release_date).');
      return;
    }
    this.subsSvc.upsert({
      tmdbId: loaded.id,
      mediaType: 'movie',
      title: loaded.title,
      releaseDate: loaded.releaseDate,
      posterPath: loaded.posterPath ?? null,
      channels: this._channels()
    });
    void this.maybeSendSampleNotification(loaded.title);
    this._loaded.set(null);
    this.tmdbId.setValue('');
  }

  remove(id: string): void {
    this.subsSvc.remove(id);
  }

  private async maybeSendSampleNotification(title: string): Promise<void> {
    if (!this.channel('webPush')) return;
    if (!('Notification' in window)) return;
    const perm = await Notification.requestPermission();
    if (perm !== 'granted') return;
    new Notification('Movie Discovery', { body: `Пример уведомления: релиз будет в день выхода — ${title}` });
  }

  downloadIcs(): void {
    const loaded = this._loaded();
    if (!loaded?.releaseDate) return;
    const ics = buildIcs({
      title: `Release: ${loaded.title}`,
      date: loaded.releaseDate
    });
    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `release-${loaded.id}.ics`;
    a.click();
    URL.revokeObjectURL(url);
  }

  posterUrl(path: string): string {
    return `/imgtmdb/w92${path}`;
  }

  trackById(_: number, s: { id: string }): string {
    return s.id;
  }
}

function buildIcs(input: { title: string; date: string }): string {
  const dt = input.date.replace(/-/g, '');
  const uid = `${crypto.randomUUID()}@movie-discovery`;
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//MovieDiscovery//ReleaseReminder//EN',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${dt}T090000Z`,
    `DTSTART;VALUE=DATE:${dt}`,
    `SUMMARY:${escapeIcs(input.title)}`,
    'END:VEVENT',
    'END:VCALENDAR',
    ''
  ].join('\r\n');
}

function escapeIcs(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
}

