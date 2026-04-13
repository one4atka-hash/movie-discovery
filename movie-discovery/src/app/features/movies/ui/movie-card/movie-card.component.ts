import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { CommonModule } from '@angular/common';

import { Movie } from '../../data-access/models/movie.model';
import { FavoritesService } from '../../data-access/services/favorites.service';
import {
  MovieReactionsService,
  type MovieReaction,
} from '../../data-access/services/movie-reactions.service';
import { tmdbImg, tmdbPosterSrcSet } from '@core/tmdb-images';
import { I18nService } from '@shared/i18n/i18n.service';
import { ReleaseSubscriptionsService } from '@features/notifications/release-subscriptions.service';
import { AuthService } from '@features/auth/auth.service';
import { WatchStateService } from '@features/watchlist/watch-state.service';

@Component({
  selector: 'app-movie-card',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article class="card" [attr.data-tmdb-id]="movie().id" data-testid="movie-card">
      <div class="card__poster" [class.card__poster--empty]="!movie().poster_path">
        <img
          *ngIf="movie().poster_path as p"
          class="card__img"
          [src]="posterUrl(p)"
          [attr.srcset]="posterSrcSet(p)"
          sizes="(max-width: 520px) 45vw, (max-width: 980px) 22vw, 160px"
          [alt]="movie().title"
          referrerpolicy="no-referrer"
          loading="lazy"
          decoding="async"
        />

        <div class="card__overlay">
          <div class="card__overlayInner">
            <div class="card__titleWrap">
              <div class="card__title">{{ movie().title }}</div>
            </div>
            <div class="card__meta">
              <span class="card__muted">{{ movie().release_date || '—' }}</span>
              <span class="card__rating">{{ movie().vote_average | number: '1.1-1' }}</span>
            </div>
            <div class="card__providers" *ngIf="providersShort().length">
              <span class="prov" *ngFor="let p of providersShort(); trackBy: trackByText">{{
                p
              }}</span>
            </div>
            <div class="card__overview" *ngIf="movie().overview">
              {{ movie().overview }}
            </div>
            <div class="card__actions">
              <button
                class="chip chip--heart"
                type="button"
                [class.chip--active]="isLiked()"
                [attr.aria-pressed]="isLiked()"
                (click)="onToggleLike($event)"
                [title]="likeTitle()"
              >
                <span class="chip__heart" aria-hidden="true">
                  <svg
                    *ngIf="!isLiked()"
                    viewBox="0 0 24 24"
                    width="18"
                    height="18"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  >
                    <path
                      d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
                    />
                  </svg>
                  <svg
                    *ngIf="isLiked()"
                    viewBox="0 0 24 24"
                    width="18"
                    height="18"
                    fill="currentColor"
                  >
                    <path
                      d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
                    />
                  </svg>
                </span>
              </button>
              <button
                class="chip"
                type="button"
                [class.chip--active]="reaction() === 'dislike'"
                [attr.aria-pressed]="reaction() === 'dislike'"
                (click)="onToggleReaction($event, 'dislike')"
                title="Дизлайк"
              >
                👎
              </button>
              <button
                class="chip"
                type="button"
                [disabled]="!canSubscribe()"
                [attr.aria-disabled]="!canSubscribe()"
                (click)="onToggleSubscription($event)"
                [title]="subscriptionTitle()"
              >
                🔔
              </button>
              <button
                class="chip"
                type="button"
                data-testid="movie-card-watch-cycle"
                [class.chip--active]="!!watchStatus()"
                [attr.aria-pressed]="!!watchStatus()"
                (click)="onCycleStatus($event)"
                [title]="statusTitle()"
              >
                {{ statusEmoji() }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </article>
  `,
  styles: [
    `
      .card {
        display: grid;
        background: var(--bg-elevated);
        border: 1px solid var(--border-subtle);
        border-radius: var(--radius-md);
        overflow: hidden;
        transition:
          transform var(--duration-normal) var(--ease-out),
          box-shadow var(--duration-normal) var(--ease-out),
          border-color var(--duration-normal) var(--ease-out);
      }

      .card:hover,
      .card:focus-within {
        transform: translateY(-3px);
        box-shadow: var(--shadow-card);
        border-color: var(--border-strong);
      }

      .card__poster {
        aspect-ratio: 2 / 3;
        background: rgba(255, 255, 255, 0.04);
        position: relative;
        overflow: hidden;
      }

      .card__poster--empty {
        background: linear-gradient(
          135deg,
          color-mix(in srgb, var(--accent) 22%, transparent),
          color-mix(in srgb, var(--accent-secondary) 16%, transparent)
        );
      }

      .card__img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
        transform: scale(1);
        transition: transform var(--duration-normal) var(--ease-out);
      }

      .card:hover .card__img,
      .card:focus-within .card__img {
        transform: scale(1.04);
      }

      .card {
        --card-ease: cubic-bezier(0.2, 0.85, 0.2, 1);
        --card-dur: 260ms;
      }

      .chip {
        width: 36px;
        height: 36px;
        border-radius: var(--radius-full);
        border: 1px solid color-mix(in srgb, var(--border-strong) 80%, transparent);
        background: color-mix(in srgb, #000 52%, transparent);
        color: rgba(255, 255, 255, 0.92);
        cursor: pointer;
        font-size: 16px;
        line-height: 1;
        display: grid;
        place-items: center;
        backdrop-filter: blur(6px);
        transition:
          transform var(--card-dur) var(--card-ease),
          background var(--card-dur) var(--card-ease),
          border-color var(--card-dur) var(--card-ease),
          opacity var(--card-dur) var(--card-ease);
      }

      .chip:hover:not(:disabled) {
        transform: translateY(-1px);
        background: color-mix(in srgb, #000 62%, transparent);
        border-color: var(--border-strong);
      }

      .chip--active {
        border-color: color-mix(in srgb, var(--accent-secondary) 55%, var(--border-strong));
        background: color-mix(in srgb, var(--accent-secondary) 18%, rgba(0, 0, 0, 0.55));
      }

      .chip:disabled {
        opacity: 0.4;
        cursor: not-allowed;
      }

      .chip--heart {
        flex: 0 0 auto;
      }

      .chip__heart {
        display: grid;
        place-items: center;
      }

      .chip__heart svg {
        display: block;
      }

      .card__overlay {
        position: absolute;
        left: 0;
        right: 0;
        top: 0;
        bottom: 0;
        z-index: 1;
        color: #fff;
        isolation: isolate;
        display: flex;
        align-items: flex-end;
        background: transparent;
      }

      .card__overlayInner {
        width: 100%;
        display: grid;
        gap: 0.35rem;
        padding: 0.8rem 0.75rem 0.85rem;
        transform: translateY(0);
        /* Reveal from bottom “behind the edge” */
        --collapsed-h: 74px;
        clip-path: inset(calc(100% - var(--collapsed-h)) 0 0 0 round 0px);
        transition: clip-path var(--card-dur) var(--card-ease);
        position: relative;
        max-height: 100%;
      }

      /* Darkening only for the sliding text panel (not the whole card). */
      .card__overlayInner::before {
        content: '';
        position: absolute;
        inset: 0;
        background: linear-gradient(
          to top,
          color-mix(in srgb, #000 94%, transparent),
          color-mix(in srgb, #000 62%, transparent) 55%,
          transparent
        );
        opacity: 0;
        z-index: -1;
        transition: opacity var(--card-dur) var(--card-ease);
      }

      .card__titleWrap {
        position: relative;
        padding: 0.25rem 0;
      }

      /* Small always-on gradient under the title row only */
      .card__titleWrap::before {
        content: '';
        position: absolute;
        left: -0.75rem;
        right: -0.75rem;
        bottom: -0.55rem;
        top: -0.35rem;
        background: linear-gradient(to top, color-mix(in srgb, #000 70%, transparent), transparent);
        opacity: 1;
        z-index: -1;
      }

      .card__actions {
        display: flex;
        gap: 0.4rem;
        justify-content: flex-start;
        flex-wrap: wrap;
        opacity: 0;
        transform: translateY(10px);
        transition:
          opacity var(--card-dur) var(--card-ease),
          transform var(--card-dur) var(--card-ease);
      }

      .card__title {
        font-weight: 600;
        font-size: 0.95rem;
        line-height: 1.25;
        letter-spacing: -0.02em;
        text-shadow: 0 10px 24px rgba(0, 0, 0, 0.45);
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }

      .card__meta {
        display: flex;
        justify-content: space-between;
        gap: 0.75rem;
        align-items: baseline;
        opacity: 0;
        transform: translateY(6px);
        transition:
          opacity var(--card-dur) var(--card-ease),
          transform var(--card-dur) var(--card-ease);
      }

      .card__providers {
        display: flex;
        flex-wrap: wrap;
        gap: 0.35rem;
        opacity: 0;
        transform: translateY(10px);
        transition:
          opacity var(--card-dur) var(--card-ease),
          transform var(--card-dur) var(--card-ease);
      }

      .prov {
        font-size: 12px;
        line-height: 1;
        padding: 0.28rem 0.5rem;
        border-radius: var(--radius-full);
        border: 1px solid color-mix(in srgb, var(--border-strong) 70%, transparent);
        background: color-mix(in srgb, #000 48%, transparent);
        color: rgba(255, 255, 255, 0.92);
        backdrop-filter: blur(6px);
        white-space: nowrap;
      }

      .card__muted {
        color: rgba(255, 255, 255, 0.72);
        font-size: 0.9rem;
        text-shadow: 0 10px 24px rgba(0, 0, 0, 0.45);
      }

      .card__rating {
        color: color-mix(in srgb, var(--accent-secondary) 82%, white);
        font-variant-numeric: tabular-nums;
        font-weight: 600;
        font-size: 0.88rem;
        text-shadow: 0 10px 24px rgba(0, 0, 0, 0.45);
      }

      .card__overview {
        opacity: 0;
        transform: translateY(10px);
        transition:
          opacity var(--card-dur) var(--card-ease),
          transform var(--card-dur) var(--card-ease);
        color: rgba(255, 255, 255, 0.78);
        font-size: 0.86rem;
        line-height: 1.35;
        text-shadow: 0 10px 24px rgba(0, 0, 0, 0.45);
        display: -webkit-box;
        -webkit-line-clamp: 6;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }

      .card:hover .card__overlay,
      .card:focus-within .card__overlay {
        background: transparent;
      }

      .card:hover .card__overlayInner::before,
      .card:focus-within .card__overlayInner::before {
        opacity: 1;
      }

      .card:hover .card__overlayInner,
      .card:focus-within .card__overlayInner {
        clip-path: inset(0 0 0 0 round 0px);
      }

      .card:hover .card__actions,
      .card:focus-within .card__actions {
        opacity: 1;
        transform: translateY(0);
      }

      .card:hover .card__meta,
      .card:focus-within .card__meta,
      .card:hover .card__providers,
      .card:focus-within .card__providers,
      .card:hover .card__overview,
      .card:focus-within .card__overview {
        opacity: 1;
        transform: translateY(0);
      }

      @supports not (clip-path: inset(1px)) {
        /* Fallback: old behavior (no reveal animation) */
        .card__overlayInner {
          clip-path: none;
        }
      }

      @media (prefers-reduced-motion: reduce) {
        .card,
        .card__img,
        .card__overlay,
        .card__overlayInner,
        .card__actions,
        .card__meta,
        .card__overview {
          transition: none !important;
        }
      }
    `,
  ],
})
export class MovieCardComponent {
  readonly i18n = inject(I18nService);
  private readonly favorites = inject(FavoritesService);
  private readonly reactions = inject(MovieReactionsService);
  private readonly subs = inject(ReleaseSubscriptionsService);
  private readonly auth = inject(AuthService);
  private readonly watchState = inject(WatchStateService);
  readonly movie = input.required<Movie>();
  /** Optional “my services” providers (already matched by caller). */
  readonly providers = input<readonly string[] | null>(null);

  readonly reaction = computed(() => this.reactions.reactionFor(this.movie().id)());
  readonly watchStatus = computed(() => this.watchState.getStatus(this.movie().id));
  readonly providersShort = computed(() => (this.providers() ?? []).slice(0, 3));

  isLiked(): boolean {
    return this.favorites.has(this.movie().id) || this.reaction() === 'like';
  }

  isFavorite(): boolean {
    return this.favorites.has(this.movie().id);
  }

  onToggleFavorite(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.favorites.toggle(this.movie());
  }

  likeTitle(): string {
    return this.isLiked() ? 'Убрать из избранного' : 'В избранное';
  }

  onToggleLike(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();

    if (this.isLiked()) {
      // Clear both "favorite" and "like".
      if (this.favorites.has(this.movie().id)) this.favorites.remove(this.movie().id);
      this.reactions.clear(this.movie().id);
      return;
    }

    // Set both: favorites is the primary UI concept; reaction powers "dislike" & future recs.
    this.favorites.add(this.movie());
    this.reactions.toggle(this.movie().id, 'like');
  }

  onToggleReaction(event: MouseEvent, next: Exclude<MovieReaction, null>): void {
    event.preventDefault();
    event.stopPropagation();

    // Dislike conflicts with "liked/favorite": keep state consistent.
    if (next === 'dislike') {
      if (this.favorites.has(this.movie().id)) this.favorites.remove(this.movie().id);
      this.reactions.toggle(this.movie().id, 'dislike');
      return;
    }

    this.reactions.toggle(this.movie().id, next);
  }

  canSubscribe(): boolean {
    return Boolean(this.auth.user() && (this.movie().release_date ?? '').trim().length);
  }

  subscriptionTitle(): string {
    if (!this.auth.user()) return 'Войти, чтобы подписаться';
    if (!(this.movie().release_date ?? '').trim()) return 'Нет даты релиза';
    return 'Подписаться на релиз';
  }

  onToggleSubscription(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();

    // For now: upsert with default channels. (Removing from card can be added later.)
    this.subs.upsert({
      tmdbId: this.movie().id,
      mediaType: 'movie',
      title: this.movie().title,
      posterPath: this.movie().poster_path,
      releaseDate: this.movie().release_date,
      channels: {
        inApp: true,
        webPush: false,
        email: false,
        calendar: false,
      },
    });
  }

  statusEmoji = computed(() => {
    const s = this.watchStatus();
    if (!s) return '👀';
    if (s === 'want') return '👀';
    if (s === 'watching') return '▶';
    if (s === 'watched') return '✅';
    if (s === 'dropped') return '⏸';
    return '🙈';
  });

  statusTitle = computed(() => {
    const s = this.watchStatus();
    if (!s) return 'Статус: не задан (нажмите, чтобы поставить)';
    if (s === 'want') return 'Статус: хочу посмотреть (нажмите для следующего)';
    if (s === 'watching') return 'Статус: смотрю (нажмите для следующего)';
    if (s === 'watched') return 'Статус: посмотрел (нажмите для следующего)';
    if (s === 'dropped') return 'Статус: брошено (нажмите для следующего)';
    return 'Статус: скрыто (нажмите для следующего)';
  });

  trackByText(_: number, s: string): string {
    return s;
  }

  onCycleStatus(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.watchState.cycle(this.movie());
  }

  posterUrl(path: string): string {
    return tmdbImg(185, path);
  }

  posterSrcSet(path: string): string {
    return tmdbPosterSrcSet(path);
  }
}
