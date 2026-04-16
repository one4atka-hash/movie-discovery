import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map } from 'rxjs';

import { ServerCinemaApiService } from '@core/server-cinema-api.service';
import { I18nService } from '@shared/i18n/i18n.service';

@Component({
  selector: 'app-public-profile-page',
  standalone: true,
  imports: [CommonModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="page">
      <a class="back" routerLink="/">{{ i18n.t('publicProfile.back') }}</a>

      @if (error(); as err) {
        <p class="err" role="alert">{{ err }}</p>
      } @else if (data(); as d) {
        <header class="head">
          <h1 class="title">@{{ d['slug'] }}</h1>
          <p class="muted">{{ d['visibility'] }}</p>
        </header>

        @if (asContent(d); as c) {
          <section class="block">
            <h2 class="block__title">{{ i18n.t('publicProfile.aboutTitle') }}</h2>
            @if (c.about) {
              <p class="para">{{ c.about }}</p>
            } @else {
              <p class="muted">{{ i18n.t('publicProfile.aboutEmpty') }}</p>
            }
          </section>

          <section class="block">
            <h2 class="block__title">{{ i18n.t('publicProfile.notesTitle') }}</h2>
            @if (c.notes) {
              <p class="para">{{ c.notes }}</p>
            } @else {
              <p class="muted">{{ i18n.t('publicProfile.notesEmpty') }}</p>
            }
          </section>

          <section class="block">
            <h2 class="block__title">{{ i18n.t('publicProfile.plansTitle') }}</h2>
            @if (c.plans) {
              <p class="para">{{ c.plans }}</p>
            } @else {
              <p class="muted">{{ i18n.t('publicProfile.plansEmpty') }}</p>
            }
          </section>
        }

        @if (d['favorites']; as fav) {
          <section class="block">
            <h2 class="block__title">{{ i18n.t('publicProfile.favorites') }}</h2>
            <ul class="list">
              <li *ngFor="let id of asIds(fav, 'tmdbIds')">
                <a [routerLink]="['/movie', id]">TMDB {{ id }}</a>
              </li>
            </ul>
          </section>
        }

        @if (d['diary']; as di) {
          <section class="block">
            <h2 class="block__title">{{ i18n.t('publicProfile.diary') }}</h2>
            <p class="muted">
              {{ i18n.t('publicProfile.entries') }}: {{ asCount(di, 'entryCount') }}
            </p>
          </section>
        }

        @if (d['watchlist']; as wl) {
          <section class="block">
            <h2 class="block__title">{{ i18n.t('publicProfile.watchlist') }}</h2>
            <ul class="list">
              <li *ngFor="let id of asIds(wl, 'tmdbIds')">
                <a [routerLink]="['/movie', id]">TMDB {{ id }}</a>
              </li>
            </ul>
          </section>
        }
      } @else {
        <p class="muted">{{ i18n.t('publicProfile.loading') }}</p>
      }
    </section>
  `,
  styles: [
    `
      .page {
        padding: 1rem 0 2rem;
        max-width: 720px;
      }
      .back {
        display: inline-block;
        margin-bottom: 1rem;
        text-decoration: none;
        color: var(--text-muted);
      }
      .head {
        margin-bottom: 1.25rem;
      }
      .title {
        margin: 0 0 0.35rem;
      }
      .err {
        color: var(--accent, #f87171);
        margin: 0.5rem 0;
      }
      .block {
        margin-top: 1rem;
        padding: 0.85rem 1rem;
        border-radius: var(--radius-lg);
        border: 1px solid var(--border-subtle);
        background: color-mix(in srgb, var(--bg-elevated) 65%, transparent);
      }
      .block__title {
        margin: 0 0 0.5rem;
        font-size: 1rem;
      }
      .list {
        margin: 0;
        padding-left: 1.1rem;
      }
      .para {
        margin: 0;
        line-height: 1.55;
        white-space: pre-wrap;
      }
    `,
  ],
})
export class PublicProfilePageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(ServerCinemaApiService);
  readonly i18n = inject(I18nService);

  readonly slug = toSignal(
    this.route.paramMap.pipe(
      map((pm) => {
        const s = (pm.get('slug') ?? '').trim();
        return s.length ? s : undefined;
      }),
    ),
    { initialValue: undefined as string | undefined },
  );

  readonly data = signal<Record<string, unknown> | undefined>(undefined);
  readonly error = signal<string | null>(null);

  constructor() {
    effect(() => {
      const s = this.slug();
      if (s === undefined) return;
      if (!s) {
        untracked(() => this.error.set(this.i18n.t('publicProfile.badSlug')));
        return;
      }
      untracked(() => {
        this.data.set(undefined);
        this.error.set(null);
        this.api.getPublicUserBySlug(s).subscribe({
          next: (r) => {
            if (!r) {
              this.error.set(this.i18n.t('publicProfile.notFound'));
              return;
            }
            this.data.set(r);
          },
        });
      });
    });
  }

  asIds(block: unknown, key: string): number[] {
    if (!block || typeof block !== 'object') return [];
    const v = (block as Record<string, unknown>)[key];
    if (!Array.isArray(v)) return [];
    return v.filter((x): x is number => typeof x === 'number');
  }

  asCount(block: unknown, key: string): number {
    if (!block || typeof block !== 'object') return 0;
    const v = (block as Record<string, unknown>)[key];
    return typeof v === 'number' ? v : 0;
  }

  asContent(d: Record<string, unknown>): { about: string; notes: string; plans: string } | null {
    const raw = d['content'];
    if (!raw || typeof raw !== 'object') return null;
    const o = raw as Record<string, unknown>;
    const about = typeof o['about'] === 'string' ? o['about'] : '';
    const notes = typeof o['notes'] === 'string' ? o['notes'] : '';
    const plans = typeof o['plans'] === 'string' ? o['plans'] : '';
    return { about: about.trim(), notes: notes.trim(), plans: plans.trim() };
  }
}
